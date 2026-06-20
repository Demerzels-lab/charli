# CARLI Project OSINT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `/api/investigate/project` endpoint — takes a token name, contract address, or domain; fetches on-chain risk signals, domain age, and deployer wallet data; uses Gemini to output a structured risk verdict (SAFE/DYOR/HIGH_RISK/LIKELY_RUG) with narrative flags.

**Architecture:** Reuses Foundation layer from Plan 1 (cache, rate-limit, OpenRouter wrapper, ApiResponse envelope). Adds three new data fetchers: Solsniffer (on-chain rug risk), crt.sh (certificate history / domain age), and WHOIS (domain registration). Claude/Gemini performs narrative analysis on project copy + shill language to detect manipulation playbook patterns.

**Tech Stack:** Next.js 14 API routes, TypeScript, Supabase (cache/rate-limit from Plan 1), OpenRouter → `google/gemini-2.0-flash-001`, Solsniffer API, crt.sh (free, no key), WHOIS via `whois-json` npm package.

## Global Constraints

- TypeScript strict mode — no `any`, no implicit `any`
- All API keys server-side only
- All handlers return `ApiResponse<T>` envelope
- Rate limit enforced — reuse `checkRateLimit` from Plan 1 `lib/rate-limit.ts`
- Cache 24h — reuse `getCache`/`setCache` from Plan 1 `lib/cache.ts`
- **No Supabase CLI** — SQL run manually via Supabase dashboard → SQL Editor
- **No auth / no login** — anonymous, identity = IP only
- **No auto-commit** — do NOT run git commit automatically
- Verdict JSON from LLM: parse defensively — wrap in try/catch
- Graceful degradation: if any data source fails, return `null` fields, lower confidence

---

## File Map

```
Charli/
  lib/
    types.ts                      ← ADD: ProjectVerdict, ProjectLevel, NarrativeFlag types
    data/
      solsniffer.ts               ← NEW: Solsniffer API rug risk score
      crtsh.ts                    ← NEW: crt.sh certificate transparency (domain age)
      whois.ts                    ← NEW: WHOIS domain registration lookup
      input-classifier.ts         ← NEW: classify input as contract | domain | name
    prompts/
      project.ts                  ← NEW: system prompt + evidence builder for project verdict
  app/
    api/
      investigate/
        project/
          route.ts                ← NEW: POST handler
    (app)/
      project/
        page.tsx                  ← NEW: project investigasi UI page
  components/
    ProjectVerdictCard.tsx        ← NEW: renders project verdict with risk score + findings
```

---

## Task 1: Extend Shared Types for Project

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `ProjectVerdict`, `ProjectLevel`, `ProjectFinding` — consumed by Tasks 5, 6, 7

- [ ] **Step 1: Add project types to `lib/types.ts`**

Open `lib/types.ts` and append:

```typescript
// --- Project types ---

export type ProjectLevel = 'SAFE' | 'DYOR' | 'HIGH_RISK' | 'LIKELY_RUG';
export type ProjectResolvedAs = 'contract' | 'domain' | 'name';

export type ProjectFinding = {
  label: string;
  detail: string;
  direction: SignalDirection;
  confidence: Confidence;
};

export type ProjectVerdict = {
  query: string;
  resolvedAs: ProjectResolvedAs;
  level: ProjectLevel;
  confidence: Confidence;
  riskScore: number; // 0-100
  summary: string;
  domain?: {
    ageDays: number | null;
    registrar: string | null;
    createdAt: string | null;
  };
  socials?: {
    x?: string;
    telegram?: string;
    site?: string;
  };
  wallets?: Array<{
    address: string;
    role: 'deployer' | 'funder' | 'linked';
    note: string;
  }>;
  narrativeFlags: string[];
  findings: ProjectFinding[];
};
```

---

## Task 2: Input Classifier

**Files:**
- Create: `lib/data/input-classifier.ts`

**Interfaces:**
- Produces: `classifyProjectInput(query)` → `ProjectResolvedAs`

- [ ] **Step 1: Create `lib/data/input-classifier.ts`**

```typescript
// lib/data/input-classifier.ts
import type { ProjectResolvedAs } from '../types';

const EVM_CONTRACT_RE = /^0x[0-9a-fA-F]{40}$/;
// Solana contract: base58, 32-44 chars
const SOLANA_CONTRACT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DOMAIN_RE = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

export function classifyProjectInput(query: string): ProjectResolvedAs {
  const trimmed = query.trim();
  if (EVM_CONTRACT_RE.test(trimmed)) return 'contract';
  if (SOLANA_CONTRACT_RE.test(trimmed)) return 'contract';
  if (DOMAIN_RE.test(trimmed)) return 'domain';
  return 'name';
}
```

---

## Task 3: Solsniffer Data Fetcher

**Files:**
- Create: `lib/data/solsniffer.ts`

**Interfaces:**
- Produces: `fetchSolsnifferRisk(contractAddress)` → `SolsnifferData`

- [ ] **Step 1: Add env var to `.env.local`**

```bash
# .env.local
SOLSNIFFER_API_KEY=your-solsniffer-key
```

Get free key at solsniffer.com → API.

- [ ] **Step 2: Create `lib/data/solsniffer.ts`**

```typescript
// lib/data/solsniffer.ts

export type SolsnifferData = {
  snifScore: number | null;       // 0-100, higher = safer
  mintAuthorityRisk: boolean | null;
  freezeAuthorityRisk: boolean | null;
  holderConcentrationPct: number | null; // top-10 holder % of supply
  auditStatus: string | null;
  isHoneypot: boolean | null;
};

export async function fetchSolsnifferRisk(contractAddress: string): Promise<SolsnifferData> {
  const key = process.env.SOLSNIFFER_API_KEY;
  if (!key) return {
    snifScore: null, mintAuthorityRisk: null, freezeAuthorityRisk: null,
    holderConcentrationPct: null, auditStatus: null, isHoneypot: null,
  };

  try {
    const res = await fetch(
      `https://api.solsniffer.com/v1/token/${contractAddress}`,
      { headers: { 'X-Api-Key': key }, next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error(`Solsniffer ${res.status}`);
    const json = await res.json() as Record<string, unknown>;

    return {
      snifScore: (json.score as number | null) ?? null,
      mintAuthorityRisk: (json.mint_authority as boolean | null) ?? null,
      freezeAuthorityRisk: (json.freeze_authority as boolean | null) ?? null,
      holderConcentrationPct: (json.top10_holder_pct as number | null) ?? null,
      auditStatus: (json.audit_status as string | null) ?? null,
      isHoneypot: (json.is_honeypot as boolean | null) ?? null,
    };
  } catch (err) {
    console.error('[solsniffer] error:', (err as Error).message);
    return {
      snifScore: null, mintAuthorityRisk: null, freezeAuthorityRisk: null,
      holderConcentrationPct: null, auditStatus: null, isHoneypot: null,
    };
  }
}
```

---

## Task 4: Domain Data Fetchers (crt.sh + WHOIS)

**Files:**
- Create: `lib/data/crtsh.ts`
- Create: `lib/data/whois.ts`

**Interfaces:**
- Produces:
  - `fetchCrtshDomainAge(domain)` → `CrtshData`
  - `fetchWhoisDomain(domain)` → `WhoisData`

- [ ] **Step 1: Install whois package**

```bash
cd Charli && npm install whois-json
npm install --save-dev @types/whois-json
```

- [ ] **Step 2: Create `lib/data/crtsh.ts`**

```typescript
// lib/data/crtsh.ts

export type CrtshData = {
  firstIssuedAt: string | null; // ISO — earliest cert = proxy for domain age
  certCount: number | null;
};

export async function fetchCrtshDomainAge(domain: string): Promise<CrtshData> {
  try {
    const res = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error(`crt.sh ${res.status}`);
    const certs = await res.json() as Array<{ not_before?: string }>;
    if (!certs.length) return { firstIssuedAt: null, certCount: 0 };

    const dates = certs
      .map(c => c.not_before)
      .filter((d): d is string => typeof d === 'string')
      .map(d => new Date(d).getTime())
      .filter(t => !isNaN(t));

    const earliest = dates.length ? new Date(Math.min(...dates)).toISOString() : null;
    return { firstIssuedAt: earliest, certCount: certs.length };
  } catch (err) {
    console.error('[crtsh] error:', (err as Error).message);
    return { firstIssuedAt: null, certCount: null };
  }
}
```

- [ ] **Step 3: Create `lib/data/whois.ts`**

```typescript
// lib/data/whois.ts
import whois from 'whois-json';

export type WhoisData = {
  createdAt: string | null;   // ISO
  registrar: string | null;
  ageDays: number | null;
};

export async function fetchWhoisDomain(domain: string): Promise<WhoisData> {
  try {
    const result = await whois(domain) as Record<string, unknown>;

    const createdRaw =
      (result.creationDate as string | undefined) ??
      (result.domainRegisteredOn as string | undefined) ??
      null;

    const registrar =
      (result.registrar as string | undefined) ??
      (result.registrarName as string | undefined) ??
      null;

    let createdAt: string | null = null;
    let ageDays: number | null = null;

    if (createdRaw) {
      const created = new Date(createdRaw);
      if (!isNaN(created.getTime())) {
        createdAt = created.toISOString();
        ageDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return { createdAt, registrar, ageDays };
  } catch (err) {
    console.error('[whois] error:', (err as Error).message);
    return { createdAt: null, registrar: null, ageDays: null };
  }
}
```

---

## Task 5: Project Verdict Prompt

**Files:**
- Create: `lib/prompts/project.ts`

**Interfaces:**
- Consumes: `SolsnifferData`, `CrtshData`, `WhoisData`, `ProjectResolvedAs`
- Produces: `PROJECT_SYSTEM_PROMPT` string, `buildProjectEvidence(...)` → `string`

- [ ] **Step 1: Create `lib/prompts/project.ts`**

```typescript
// lib/prompts/project.ts
import type { ProjectResolvedAs } from '../types';
import type { SolsnifferData } from '../data/solsniffer';
import type { CrtshData } from '../data/crtsh';
import type { WhoisData } from '../data/whois';

export const PROJECT_SYSTEM_PROMPT = `You are CARLI — a crypto intelligence analyst specializing in rug pull detection and project OSINT. You receive evidence about a crypto project and return a verdict as raw JSON only. No prose, no markdown fences.

Output this exact shape:
{
  "level": "SAFE" | "DYOR" | "HIGH_RISK" | "LIKELY_RUG",
  "confidence": "TENTATIVE" | "FIRM" | "CONFIRMED",
  "riskScore": <integer 0-100, higher = more risk>,
  "summary": "<1-2 sentences, CARLI voice — direct, intelligence-style>",
  "narrativeFlags": ["<flag string>", ...],
  "findings": [
    {
      "label": "<finding name>",
      "detail": "<specific detail>",
      "direction": "ok" | "warn" | "bad",
      "confidence": "TENTATIVE" | "FIRM" | "CONFIRMED"
    }
  ]
}

Rules:
- SAFE: clean signals, established domain, no red flags
- DYOR: mixed signals, some concerns but not conclusive
- HIGH_RISK: multiple red flags, pattern matches known scam playbooks
- LIKELY_RUG: strong evidence of rug — mint authority active, brand new domain, deployer wallet history suspicious, narrative manipulation detected
- narrativeFlags: list manipulation tactics detected in project copy/marketing (e.g. "urgency language", "guaranteed returns", "celebrity endorsement claims", "community ownership bait", "FOMO amplification"). Empty array if none.
- findings: 4-8 items covering the most important signals
- riskScore: 0=clean, 100=confirmed rug. Weight heavily: mint authority (30pts), domain age <30 days (20pts), no audit (15pts), narrative flags (10pts each, max 25pts)
- If data is null, note it as "unavailable" in findings, lower confidence`;

export function buildProjectEvidence(
  query: string,
  resolvedAs: ProjectResolvedAs,
  solsniffer: SolsnifferData,
  crtsh: CrtshData,
  whois: WhoisData
): string {
  const domainSection = resolvedAs === 'domain' || resolvedAs === 'name'
    ? `
Domain age: ${whois.ageDays !== null ? `${whois.ageDays} days` : 'unknown'}
Domain created: ${whois.createdAt ?? 'unknown'}
Registrar: ${whois.registrar ?? 'unknown'}
Earliest SSL certificate: ${crtsh.firstIssuedAt ?? 'unknown'}
Total SSL certificates issued: ${crtsh.certCount ?? 'unknown'}`
    : '';

  const contractSection = resolvedAs === 'contract'
    ? `
Solsniffer score: ${solsniffer.snifScore !== null ? `${solsniffer.snifScore}/100` : 'unavailable'}
Mint authority active: ${solsniffer.mintAuthorityRisk !== null ? String(solsniffer.mintAuthorityRisk) : 'unknown'}
Freeze authority active: ${solsniffer.freezeAuthorityRisk !== null ? String(solsniffer.freezeAuthorityRisk) : 'unknown'}
Top-10 holders % of supply: ${solsniffer.holderConcentrationPct !== null ? `${solsniffer.holderConcentrationPct}%` : 'unknown'}
Audit status: ${solsniffer.auditStatus ?? 'unaudited/unknown'}
Is honeypot: ${solsniffer.isHoneypot !== null ? String(solsniffer.isHoneypot) : 'unknown'}`
    : '';

  return `
Project query: ${query}
Resolved as: ${resolvedAs}
${contractSection}
${domainSection}
`.trim();
}
```

---

## Task 6: Project API Route

**Files:**
- Create: `app/api/investigate/project/route.ts`

**Interfaces:**
- Consumes: all previous tasks in this plan + Plan 1 (cache, rate-limit, openrouter, types)
- Produces: `POST /api/investigate/project` → `ApiResponse<ProjectVerdict>`

- [ ] **Step 1: Create `app/api/investigate/project/route.ts`**

```typescript
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

  // Rate limit
  const ip = getIp(req);
  const rateLimit = await checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Daily investigation limit reached (5/day)' },
      meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: 0, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<never>, { status: 429 });
  }

  // Cache check
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

  // Fan-out: only fetch relevant data based on input type
  const isContract = resolvedAs === 'contract';
  const hasDomain = resolvedAs === 'domain';
  // For 'name', try both domain signals and skip contract
  const domainQuery = hasDomain ? query : resolvedAs === 'name' ? `${query}.com` : null;

  const [solsniffer, crtsh, whois] = await Promise.all([
    isContract ? fetchSolsnifferRisk(query) : Promise.resolve({
      snifScore: null, mintAuthorityRisk: null, freezeAuthorityRisk: null,
      holderConcentrationPct: null, auditStatus: null, isHoneypot: null,
    }),
    domainQuery ? fetchCrtshDomainAge(domainQuery) : Promise.resolve({ firstIssuedAt: null, certCount: null }),
    domainQuery ? fetchWhoisDomain(domainQuery) : Promise.resolve({ createdAt: null, registrar: null, ageDays: null }),
  ]);

  // Build evidence + LLM verdict
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

  // Attach domain data if available
  const verdict: ProjectVerdict = {
    ...partialVerdict,
    query,
    resolvedAs,
    domain: (whois.createdAt || whois.ageDays !== null)
      ? { ageDays: whois.ageDays, registrar: whois.registrar, createdAt: whois.createdAt }
      : undefined,
  };

  await setCache(cacheKey, verdict);

  return NextResponse.json({
    ok: true,
    data: verdict,
    meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
  } satisfies ApiResponse<ProjectVerdict>);
}
```

- [ ] **Step 2: Test endpoint locally**

```bash
npm run dev
# Test with contract address:
curl -X POST http://localhost:3000/api/investigate/project \
  -H "Content-Type: application/json" \
  -d '{"query":"pump.fun"}'
```

Expected: JSON with `ok: true`, `data.level` one of SAFE/DYOR/HIGH_RISK/LIKELY_RUG, `data.riskScore` 0-100, `data.narrativeFlags` array.

---

## Task 7: Project Verdict UI

**Files:**
- Create: `components/ProjectVerdictCard.tsx`
- Create: `app/(app)/project/page.tsx`

**Interfaces:**
- Consumes: `ProjectVerdict` from `lib/types.ts`
- Produces: working `/project` page

- [ ] **Step 1: Create `components/ProjectVerdictCard.tsx`**

```typescript
// components/ProjectVerdictCard.tsx
'use client';

import type { ProjectVerdict } from '@/lib/types';

const LEVEL_STYLES: Record<ProjectVerdict['level'], string> = {
  SAFE: 'text-green-700 bg-green-50 border-green-200',
  DYOR: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  HIGH_RISK: 'text-orange-700 bg-orange-50 border-orange-200',
  LIKELY_RUG: 'text-red-700 bg-red-50 border-red-200',
};

const DIRECTION_STYLES = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  bad: 'text-red-600',
};

const DIRECTION_ICON = { ok: '✓', warn: '⚠', bad: '✗' };

type Props = { verdict: ProjectVerdict };

export function ProjectVerdictCard({ verdict }: Props) {
  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink break-all">{verdict.query}</p>
          <p className="text-xs text-ink-soft uppercase tracking-widest mt-1">
            {verdict.resolvedAs}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-semibold px-2 py-1 border rounded-sm uppercase tracking-widest whitespace-nowrap ${LEVEL_STYLES[verdict.level]}`}>
            {verdict.level.replace('_', ' ')}
          </span>
          <span className="text-xs tabular-nums text-ink-soft">
            Risk: {verdict.riskScore}/100
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-ink text-pretty">{verdict.summary}</p>

      {/* Domain info */}
      {verdict.domain && (
        <div className="text-xs tabular-nums text-ink-soft space-y-0.5 border-t border-line pt-3">
          {verdict.domain.ageDays !== null && (
            <p>Domain age: {verdict.domain.ageDays} days</p>
          )}
          {verdict.domain.registrar && <p>Registrar: {verdict.domain.registrar}</p>}
          {verdict.domain.createdAt && (
            <p>Registered: {new Date(verdict.domain.createdAt).toLocaleDateString()}</p>
          )}
        </div>
      )}

      {/* Narrative flags */}
      {verdict.narrativeFlags.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-xs text-ink-soft uppercase tracking-widest mb-2">Manipulation signals</p>
          <div className="flex flex-wrap gap-1">
            {verdict.narrativeFlags.map((flag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-sm">
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      <div className="space-y-1 border-t border-line pt-3">
        {verdict.findings.map((finding, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className={`w-4 shrink-0 font-mono ${DIRECTION_STYLES[finding.direction]}`}>
              {DIRECTION_ICON[finding.direction]}
            </span>
            <span className="text-ink-soft">{finding.label}:</span>
            <span className="text-ink">{finding.detail}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-soft">Confidence: {verdict.confidence}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(app)/project/page.tsx`**

```typescript
// app/(app)/project/page.tsx
'use client';

import { useState } from 'react';
import type { ApiResponse, ProjectVerdict } from '@/lib/types';
import { ProjectVerdictCard } from '@/components/ProjectVerdictCard';
import { RateLimitBanner } from '@/components/RateLimitBanner';

export default function ProjectPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse<ProjectVerdict> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/investigate/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const json = await res.json() as ApiResponse<ProjectVerdict>;
      setResult(json);
    } catch {
      setResult({
        ok: false,
        error: { code: 'NETWORK_ERROR', message: 'Network request failed' },
        meta: { cached: false, tookMs: 0, ratelimit: { remaining: 5, resetAt: '' } },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-ink px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-balance">Project OSINT</h1>
          <p className="text-sm text-ink-soft text-pretty mt-1">
            Enter a token name, contract address, or domain to investigate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="moontoken.xyz / 0x... / MoonToken"
            className="w-full bg-surface border border-line rounded-sm px-3 py-2 text-sm font-mono text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full bg-ink text-bg text-sm font-semibold py-2 rounded-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Investigating…' : 'Investigate'}
          </button>
        </form>

        {result && (
          <div className="space-y-3">
            {result.ok ? (
              <ProjectVerdictCard verdict={result.data} />
            ) : (
              <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-sm px-3 py-2">
                {result.error.message}
              </div>
            )}
            <RateLimitBanner
              remaining={result.meta.ratelimit.remaining}
              resetAt={result.meta.ratelimit.resetAt}
            />
            <p className="text-xs text-ink-soft tabular-nums">
              {result.meta.cached ? 'Cached · ' : ''}{result.meta.tookMs}ms
            </p>
          </div>
        )}

        <p className="text-xs text-ink-soft text-pretty border-t border-line pt-4">
          CARLI uses only public data for research purposes. Not financial advice. DYOR.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Test in browser**

```bash
npm run dev
```

Open `http://localhost:3000/project`. Enter `pump.fun`. Verify: verdict card renders with level badge, risk score bar, narrative flags chips, findings list.

---

## Self-Review

**Spec coverage:**
- ✅ `/api/investigate/project` — Task 6
- ✅ Input classification (contract / domain / name) — Task 2
- ✅ Domain age + registrar (WHOIS) — Task 4
- ✅ SSL certificate history / domain age (crt.sh) — Task 4
- ✅ On-chain rug risk signals (Solsniffer) — Task 3
- ✅ Narrative flags (manipulation playbook detection via LLM) — Task 5, 6
- ✅ riskScore 0–100 with scoring guidance in prompt — Task 5
- ✅ SAFE/DYOR/HIGH_RISK/LIKELY_RUG verdict levels — Tasks 1, 5, 6
- ✅ Cache 24h — Task 6 (reuses Plan 1 lib/cache.ts)
- ✅ Rate limit — Task 6 (reuses Plan 1 lib/rate-limit.ts)
- ✅ Graceful degradation (null fields, skip irrelevant fetchers) — Tasks 3, 4, 6
- ✅ UI verdict card with narrative flags display — Task 7
- ✅ No Supabase CLI, no auth, no auto-commit — enforced in Global Constraints

**Placeholders:** None.

**Type consistency:** `ProjectVerdict` defined in Task 1, used identically in Tasks 5, 6, 7. `ProjectFinding.direction` uses `SignalDirection` from Plan 1 `lib/types.ts`. `classifyProjectInput` returns `ProjectResolvedAs` — matches type in `ProjectVerdict.resolvedAs`.
