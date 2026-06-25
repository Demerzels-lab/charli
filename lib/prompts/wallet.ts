// lib/prompts/wallet.ts
import type { Chain } from '../types';
import type { SolscanWalletData } from '../data/solscan';
import type { HeliusWalletData } from '../data/helius';
import type { EtherscanWalletData } from '../data/etherscan';
import type { DuneWalletData } from '../data/dune';

export const WALLET_SYSTEM_PROMPT = `You are CARLI — a crypto intelligence analyst. You receive wallet evidence and return a verdict as a JSON object. No prose, no markdown fences, just raw JSON.

Output this exact shape:
{
  "level": "CLEAN" | "WATCH" | "FLAGGED",
  "confidence": "TENTATIVE" | "FIRM" | "CONFIRMED",
  "classification": "dev" | "whale" | "flipper" | "fresh" | "mixed",
  "summary": "<1-2 sentences, CARLI voice — direct, intelligence-style>",
  "balanceUsd": <number or null>,
  "firstSeen": "<ISO string or null>",
  "lastActive": "<ISO string or null>",
  "linkedProjects": [],
  "signals": [
    { "label": "<signal name>", "value": "<human-readable finding>", "direction": "ok" | "warn" | "bad" }
  ]
}

Rules:
- CLEAN: no red flags, normal activity
- WATCH: some suspicious signals but not conclusive
- FLAGGED: strong evidence of scam/rug/manipulation
- If data is missing (null), lower confidence, don't fabricate
- signals array: 3-6 items, cover the most important findings
- summary: 1-2 sentences max, direct`;

export function buildWalletEvidence(
  address: string,
  chain: Chain,
  solscan: SolscanWalletData,
  helius: HeliusWalletData,
  etherscan: EtherscanWalletData,
  dune: DuneWalletData
): string {
  const balance = chain === 'solana'
    ? `${solscan.balanceSol ?? 'unknown'} SOL (~$${solscan.balanceUsd ?? 'unknown'} USD)`
    : `(EVM — balance in wei: ${etherscan.balanceWei ?? 'unknown'})`;

  const firstSeen = chain === 'solana' ? solscan.firstTxTime : etherscan.firstTxTime;
  const lastActive = chain === 'solana'
    ? (solscan.lastTxTime ?? helius.lastTxTime)
    : etherscan.lastTxTime;

  const tokenHoldings = chain === 'solana' && solscan.tokenCount !== null
    ? `${solscan.tokenCount} distinct SPL token${solscan.tokenCount === 1 ? '' : 's'} held`
    : 'unknown';

  return `
Wallet address: ${address}
Chain: ${chain}
Balance: ${balance}
Token holdings: ${tokenHoldings}
First transaction: ${firstSeen ?? 'unknown'}
Last active: ${lastActive ?? 'unknown'}
Pump.fun trade count: ${dune.tradeCount ?? 'no data'}
Pump.fun total profit: $${dune.totalProfitUsd ?? 'no data'} USD
Suggested classification from trading patterns: ${dune.classification ?? 'unknown'}
`.trim();
}
