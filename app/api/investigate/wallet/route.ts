// app/api/investigate/wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, WalletVerdict } from '@/lib/types';
import { getCache, setCache } from '@/lib/cache';
import { checkRateLimit } from '@/lib/rate-limit';
import { callLLM } from '@/lib/openrouter';
import { detectChain } from '@/lib/data/chain-detect';
import { fetchSolscanWallet } from '@/lib/data/solscan';
import { fetchHeliusWallet } from '@/lib/data/helius';
import { fetchEtherscanWallet } from '@/lib/data/etherscan';
import { fetchDuneWalletActivity } from '@/lib/data/dune';
import { WALLET_SYSTEM_PROMPT, buildWalletEvidence } from '@/lib/prompts/wallet';

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  let address: string;
  try {
    const body = await req.json() as { address?: unknown };
    if (typeof body.address !== 'string' || body.address.trim().length === 0) {
      throw new Error('invalid');
    }
    address = body.address.trim();
  } catch {
    return NextResponse.json({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'address is required and must be a string' },
      meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: 5, resetAt: '' } },
    } satisfies ApiResponse<never>, { status: 400 });
  }

  const chain = detectChain(address);
  if (!chain) {
    return NextResponse.json({
      ok: false,
      error: { code: 'INVALID_ADDRESS', message: 'Address format not recognized as Solana or EVM' },
      meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: 5, resetAt: '' } },
    } satisfies ApiResponse<never>, { status: 400 });
  }

  const ip = getIp(req);
  const rateLimit = await checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Daily investigation limit reached (5/day)' },
      meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: 0, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<never>, { status: 429 });
  }

  const cacheKey = `wallet:${address.toLowerCase()}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      ok: true,
      data: cached as WalletVerdict,
      meta: { cached: true, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<WalletVerdict>);
  }

  const [solscan, helius, etherscan, dune] = await Promise.all([
    chain === 'solana' ? fetchSolscanWallet(address) : Promise.resolve({ balanceSol: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null, tokenCount: null }),
    chain === 'solana' ? fetchHeliusWallet(address) : Promise.resolve({ balanceUsd: null, firstTxTime: null, lastTxTime: null }),
    chain === 'evm' ? fetchEtherscanWallet(address) : Promise.resolve({ balanceWei: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null }),
    fetchDuneWalletActivity(address),
  ]);

  // Detect data completeness — all null means no API keys configured.
  const hasOnChainData = chain === 'solana'
    ? (solscan.balanceSol !== null || solscan.tokenCount !== null || solscan.lastTxTime !== null || helius.firstTxTime !== null || helius.lastTxTime !== null)
    : (etherscan.balanceWei !== null || etherscan.txCount !== null);
  const hasDuneData = dune.tradeCount !== null || dune.totalProfitUsd !== null;
  const dataMinimal = !hasOnChainData && !hasDuneData;

  let verdict: WalletVerdict;

  if (dataMinimal) {
    verdict = {
      address,
      chain,
      level: 'UNVERIFIABLE',
      confidence: 'UNKNOWN',
      classification: 'fresh',
      summary: 'No on-chain data could be retrieved — API keys not configured. Verdict is UNVERIFIABLE; absence of data is not evidence of wrongdoing.',
      balanceUsd: null,
      firstSeen: null,
      lastActive: null,
      linkedProjects: [],
      signals: [
        { label: 'Data sources', value: 'No blockchain API keys configured (Solscan/Helius/Etherscan/Dune)', direction: 'warn' },
        { label: 'Address format', value: `Valid ${chain} address`, direction: 'ok' },
      ],
    };
  } else {
    const evidence = buildWalletEvidence(address, chain, solscan, helius, etherscan, dune);
    try {
      const raw = await callLLM(WALLET_SYSTEM_PROMPT, evidence);
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean) as Omit<WalletVerdict, 'address' | 'chain'>;
      verdict = { ...parsed, address, chain };
    } catch (err) {
      console.error('[wallet route] LLM parse error:', (err as Error).message);
      verdict = {
        address,
        chain,
        level: 'UNVERIFIABLE',
        confidence: 'UNKNOWN',
        classification: 'mixed',
        summary: 'Analysis engine unavailable. Raw data fetched but could not generate verdict.',
        balanceUsd: null,
        firstSeen: null,
        lastActive: null,
        linkedProjects: [],
        signals: [],
      };
    }
  }

  await setCache(cacheKey, verdict);

  return NextResponse.json({
    ok: true,
    data: verdict,
    meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
  } satisfies ApiResponse<WalletVerdict>);
}
