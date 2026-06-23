// app/api/investigate/x-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, XAccountVerdict, XDataSources, DataSourceStatus } from '@/lib/types';
import { getCache, setCache } from '@/lib/cache';
import { checkRateLimit } from '@/lib/rate-limit';
import { callLLM } from '@/lib/openrouter';
import { fetchTwitterProfile } from '@/lib/data/twitter-syndication';
import { fetchUsernameHistory } from '@/lib/data/memory-lol';
import {
  X_ACCOUNT_SYSTEM_PROMPT,
  buildXAccountEvidence,
  computeCompleteness,
} from '@/lib/prompts/x-account';

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  let handle: string;
  try {
    const body = await req.json() as { handle?: unknown };
    if (typeof body.handle !== 'string' || body.handle.trim().length === 0) throw new Error();
    handle = body.handle.trim().replace(/^(check\s+)?@?/i, '');
  } catch {
    return NextResponse.json({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'handle is required and must be a string' },
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

  const cacheKey = `x:${handle.toLowerCase()}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      ok: true,
      data: cached as XAccountVerdict,
      meta: { cached: true, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<XAccountVerdict>);
  }

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

  const evidence = buildXAccountEvidence(handle, twitterResult.data, memory, completeness);

  // Base fields filled from real fetched data (LLM can't override these facts).
  const baseMetrics = {
    accountAgeDays: twitterResult.data?.accountAgeDays ?? null,
    followers: twitterResult.data?.followers ?? null,
    following: twitterResult.data?.following ?? null,
    usernameChanges: memoryAvailable ? memory.totalChanges : null,
    firstCryptoMentionDays: null,
  };
  const displayName = twitterResult.data?.displayName ?? null;
  const isVerified = (twitterResult.data?.isVerified || twitterResult.data?.isBlueVerified) ?? false;

  let verdict: XAccountVerdict;
  try {
    const raw = await callLLM(X_ACCOUNT_SYSTEM_PROMPT, evidence);
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean) as Omit<XAccountVerdict, 'handle' | 'dataSources' | 'dataCompleteness' | 'displayName' | 'isVerified'>;

    verdict = {
      ...parsed,
      handle,
      displayName,
      isVerified,
      metrics: { ...parsed.metrics, ...baseMetrics },
      dataSources,
      dataCompleteness: completeness,
    };

    // Safeguard: minimal data can never be a RED_FLAG.
    if (completeness === 'minimal') {
      verdict.level = 'UNVERIFIABLE';
      verdict.confidence = 'UNKNOWN';
      verdict.redFlags = [];
    }
  } catch (err) {
    console.error('[x-account route] LLM parse error:', (err as Error).message);
    // Graceful fallback verdict instead of 500.
    verdict = {
      handle,
      displayName,
      isVerified,
      level: completeness === 'minimal' ? 'UNVERIFIABLE' : 'DYOR',
      confidence: 'UNKNOWN',
      summary:
        completeness === 'minimal'
          ? 'Could not retrieve enough public data to assess this account.'
          : 'Analysis engine unavailable. Showing raw fetched data only.',
      metrics: baseMetrics,
      signals: [],
      redFlags: [],
      dataSources,
      dataCompleteness: completeness,
    };
  }

  await setCache(cacheKey, verdict);

  return NextResponse.json({
    ok: true,
    data: verdict,
    meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
  } satisfies ApiResponse<XAccountVerdict>);
}
