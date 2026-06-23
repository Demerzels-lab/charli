// app/api/investigate/project/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, ProjectVerdict } from '@/lib/types';
import { getCache, setCache } from '@/lib/cache';
import { checkRateLimit } from '@/lib/rate-limit';
import { callLLM } from '@/lib/openrouter';
import { classifyProjectInput } from '@/lib/data/input-classifier';
import { fetchSolsnifferRisk } from '@/lib/data/solsniffer';
import { fetchCrtshDomainAge } from '@/lib/data/crtsh';
import { fetchWhoisDomain } from '@/lib/data/whois';
import { PROJECT_SYSTEM_PROMPT, buildProjectEvidence } from '@/lib/prompts/project';

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  let query: string;
  try {
    const body = await req.json() as { query?: unknown };
    if (typeof body.query !== 'string' || body.query.trim().length === 0) throw new Error();
    query = body.query.trim();
  } catch {
    return NextResponse.json({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'query is required and must be a string' },
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

  const cacheKey = `project:${query.toLowerCase()}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      ok: true,
      data: cached as ProjectVerdict,
      meta: { cached: true, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<ProjectVerdict>);
  }

  const resolvedAs = classifyProjectInput(query);
  const isContract = resolvedAs === 'contract';
  const domainQuery = resolvedAs === 'domain' ? query : resolvedAs === 'name' ? `${query}.com` : null;

  const [solsniffer, crtsh, whois] = await Promise.all([
    isContract ? fetchSolsnifferRisk(query) : Promise.resolve({
      snifScore: null, tokenName: null, tokenSymbol: null, tokenImg: null,
      mintAuthorityRisk: null, freezeAuthorityRisk: null, lpBurned: null,
      top10HoldersRisk: null, holderConcentrationPct: null, auditStatus: null,
      isHoneypot: null, marketCap: null, deployer: null,
      website: null, telegram: null, twitter: null, liquidityUsd: null, deployTime: null,
    }),
    domainQuery ? fetchCrtshDomainAge(domainQuery) : Promise.resolve({ firstIssuedAt: null, certCount: null }),
    domainQuery ? fetchWhoisDomain(domainQuery) : Promise.resolve({ createdAt: null, registrar: null, ageDays: null }),
  ]);

  const evidence = buildProjectEvidence(query, resolvedAs, solsniffer, crtsh, whois);
  let partialVerdict: Omit<ProjectVerdict, 'query' | 'resolvedAs'>;
  try {
    const raw = await callLLM(PROJECT_SYSTEM_PROMPT, evidence);
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    partialVerdict = JSON.parse(clean) as Omit<ProjectVerdict, 'query' | 'resolvedAs'>;
  } catch (err) {
    console.error('[project route] LLM parse error:', (err as Error).message);
    return NextResponse.json({
      ok: false,
      error: { code: 'LLM_ERROR', message: 'Failed to generate verdict' },
      meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<never>, { status: 500 });
  }

  const verdict: ProjectVerdict = {
    ...partialVerdict,
    query,
    resolvedAs,
    tokenName: solsniffer.tokenName,
    tokenSymbol: solsniffer.tokenSymbol,
    tokenImg: solsniffer.tokenImg,
    marketCap: solsniffer.marketCap,
    deployer: solsniffer.deployer,
    liquidityUsd: solsniffer.liquidityUsd,
    domain: (whois.createdAt || whois.ageDays !== null)
      ? { ageDays: whois.ageDays, registrar: whois.registrar, createdAt: whois.createdAt }
      : undefined,
    socials: (solsniffer.website || solsniffer.telegram || solsniffer.twitter)
      ? { site: solsniffer.website ?? undefined, telegram: solsniffer.telegram ?? undefined, x: solsniffer.twitter ?? undefined }
      : partialVerdict.socials,
  };

  await setCache(cacheKey, verdict);

  return NextResponse.json({
    ok: true,
    data: verdict,
    meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
  } satisfies ApiResponse<ProjectVerdict>);
}
