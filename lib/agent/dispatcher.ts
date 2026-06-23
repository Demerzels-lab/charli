// lib/agent/dispatcher.ts
import { callLLM } from '../openrouter';
import { detectChain } from '../data/chain-detect';
import { fetchSolscanWallet } from '../data/solscan';
import { fetchHeliusWallet } from '../data/helius';
import { fetchEtherscanWallet } from '../data/etherscan';
import { fetchDuneWalletActivity } from '../data/dune';
import { fetchSolsnifferRisk } from '../data/solsniffer';
import { fetchCrtshDomainAge } from '../data/crtsh';
import { fetchWhoisDomain } from '../data/whois';
import { classifyProjectInput } from '../data/input-classifier';
import { fetchTwitterProfile } from '../data/twitter-syndication';
import { fetchUsernameHistory } from '../data/memory-lol';
import { WALLET_SYSTEM_PROMPT, buildWalletEvidence } from '../prompts/wallet';
import { PROJECT_SYSTEM_PROMPT, buildProjectEvidence } from '../prompts/project';
import { X_ACCOUNT_SYSTEM_PROMPT, buildXAccountEvidence, computeCompleteness } from '../prompts/x-account';
import type { AgentIntent, AgentMessage, WalletVerdict, ProjectVerdict, XAccountVerdict, XDataSources, DataSourceStatus } from '../types';

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a crypto investigation tool. Given the latest user message, classify the intent as JSON.

Output ONLY this JSON (no prose, no fences):
{
  "type": "wallet" | "project" | "x-account" | "chat",
  "value": "<extracted value or null>"
}

Rules:
- "wallet": user provides a blockchain wallet address (Solana base58 or EVM 0x...). value = the address.
- "project": user asks about a token, project, contract, or domain. value = the token name, contract, or domain.
- "x-account": user asks about a Twitter/X handle or account. value = the handle (without @).
- "chat": general question, no specific target to investigate. value = null.
Only extract if the user clearly provides or asks about a specific target.`;

export async function detectIntent(messages: AgentMessage[]): Promise<AgentIntent> {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMessage) return { type: 'chat' };

  try {
    const raw = await callLLM(INTENT_SYSTEM_PROMPT, lastUserMessage.content);
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean) as { type: string; value: string | null };

    if (parsed.type === 'wallet' && parsed.value) return { type: 'wallet', address: parsed.value };
    if (parsed.type === 'project' && parsed.value) return { type: 'project', query: parsed.value };
    if (parsed.type === 'x-account' && parsed.value) return { type: 'x-account', handle: parsed.value };
    return { type: 'chat' };
  } catch {
    return { type: 'chat' };
  }
}

export async function dispatchInvestigation(
  intent: AgentIntent
): Promise<WalletVerdict | ProjectVerdict | XAccountVerdict | null> {
  if (intent.type === 'chat') return null;

  if (intent.type === 'wallet') {
    const { address } = intent;
    const chain = detectChain(address);
    if (!chain) return null;

    const [solscan, helius, etherscan, dune] = await Promise.all([
      chain === 'solana' ? fetchSolscanWallet(address) : Promise.resolve({ balanceSol: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null }),
      chain === 'solana' ? fetchHeliusWallet(address) : Promise.resolve({ balanceUsd: null, firstTxTime: null, lastTxTime: null }),
      chain === 'evm' ? fetchEtherscanWallet(address) : Promise.resolve({ balanceWei: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null }),
      fetchDuneWalletActivity(address),
    ]);
    const evidence = buildWalletEvidence(address, chain, solscan, helius, etherscan, dune);
    const raw = await callLLM(WALLET_SYSTEM_PROMPT, evidence);
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean) as Omit<WalletVerdict, 'address' | 'chain'>;
    return { ...parsed, address, chain };
  }

  if (intent.type === 'project') {
    const { query } = intent;
    const resolvedAs = classifyProjectInput(query);
    const isContract = resolvedAs === 'contract';
    const domainQuery = resolvedAs === 'domain' ? query : resolvedAs === 'name' ? `${query}.com` : null;
    const [solsniffer, crtsh, whois] = await Promise.all([
      isContract ? fetchSolsnifferRisk(query) : Promise.resolve({ snifScore: null, mintAuthorityRisk: null, freezeAuthorityRisk: null, holderConcentrationPct: null, auditStatus: null, isHoneypot: null }),
      domainQuery ? fetchCrtshDomainAge(domainQuery) : Promise.resolve({ firstIssuedAt: null, certCount: null }),
      domainQuery ? fetchWhoisDomain(domainQuery) : Promise.resolve({ createdAt: null, registrar: null, ageDays: null }),
    ]);
    const evidence = buildProjectEvidence(query, resolvedAs, solsniffer, crtsh, whois);
    const raw = await callLLM(PROJECT_SYSTEM_PROMPT, evidence);
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const partial = JSON.parse(clean) as Omit<ProjectVerdict, 'query' | 'resolvedAs'>;
    return {
      ...partial, query, resolvedAs,
      domain: (whois.createdAt || whois.ageDays !== null)
        ? { ageDays: whois.ageDays, registrar: whois.registrar, createdAt: whois.createdAt }
        : undefined,
    };
  }

  if (intent.type === 'x-account') {
    const { handle } = intent;
    const [twitterResult, memory] = await Promise.all([
      fetchTwitterProfile(handle),
      fetchUsernameHistory(handle),
    ]);

    const twitterAvailable = twitterResult.source === 'available';
    const memoryAvailable = memory.usernameHistory.length > 0;
    const completeness = computeCompleteness(twitterAvailable, memoryAvailable);

    const dataSources: XDataSources = {
      twitter: twitterResult.source as DataSourceStatus,
      memoryLol: memoryAvailable ? 'available' : 'no_data',
    };
    const baseMetrics = {
      accountAgeDays: twitterResult.data?.accountAgeDays ?? null,
      followers: twitterResult.data?.followers ?? null,
      following: twitterResult.data?.following ?? null,
      usernameChanges: memoryAvailable ? memory.totalChanges : null,
      firstCryptoMentionDays: null,
    };
    const displayName = twitterResult.data?.displayName ?? null;
    const isVerified = (twitterResult.data?.isVerified || twitterResult.data?.isBlueVerified) ?? false;

    const evidence = buildXAccountEvidence(handle, twitterResult.data, memory, completeness);
    const raw = await callLLM(X_ACCOUNT_SYSTEM_PROMPT, evidence);
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean) as Omit<XAccountVerdict, 'handle' | 'dataSources' | 'dataCompleteness' | 'displayName' | 'isVerified'>;

    const verdict: XAccountVerdict = {
      ...parsed,
      handle,
      displayName,
      isVerified,
      metrics: { ...parsed.metrics, ...baseMetrics },
      dataSources,
      dataCompleteness: completeness,
    };
    if (completeness === 'minimal') {
      verdict.level = 'UNVERIFIABLE';
      verdict.confidence = 'UNKNOWN';
      verdict.redFlags = [];
    }
    return verdict;
  }

  return null;
}
