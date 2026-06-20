// app/api/investigate/x-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, XAccountVerdict } from '@/lib/types';
import { getCache, setCache } from '@/lib/cache';
import { checkRateLimit } from '@/lib/rate-limit';
import { callLLM } from '@/lib/openrouter';
import { fetchNitterProfile } from '@/lib/data/nitter';
import { fetchUsernameHistory } from '@/lib/data/memory-lol';
import { X_ACCOUNT_SYSTEM_PROMPT, buildXAccountEvidence } from '@/lib/prompts/x-account';

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
    handle = body.handle.trim().replace(/^@/, '');
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

  const [nitter, memory] = await Promise.all([
    fetchNitterProfile(handle),
    fetchUsernameHistory(handle),
  ]);

  const evidence = buildXAccountEvidence(handle, nitter, memory);

  let verdict: XAccountVerdict;
  try {
    const raw = await callLLM(X_ACCOUNT_SYSTEM_PROMPT, evidence);
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean) as Omit<XAccountVerdict, 'handle'>;
    verdict = { ...parsed, handle };
  } catch (err) {
    console.error('[x-account route] LLM parse error:', (err as Error).message);
    return NextResponse.json({
      ok: false,
      error: { code: 'LLM_ERROR', message: 'Failed to generate verdict' },
      meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<never>, { status: 500 });
  }

  await setCache(cacheKey, verdict);

  return NextResponse.json({
    ok: true,
    data: verdict,
    meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
  } satisfies ApiResponse<XAccountVerdict>);
}
