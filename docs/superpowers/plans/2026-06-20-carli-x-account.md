# CARLI X Account Intel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `/api/investigate/x-account` endpoint — fetches X profile data via Nitter (free, no API key), username change history via memory.lol (free archive), and uses Gemini to produce a LEGIT/DYOR/RED_FLAG verdict with fake-engagement and account-hijack signals.

**Architecture:** Reuses Foundation layer from Plan 1 (cache, rate-limit, OpenRouter wrapper, ApiResponse envelope). Two new data fetchers: Nitter public instance (scrape profile HTML) and memory.lol JSON API (username history). All data public, no login, no X API key required.

**Tech Stack:** Next.js 14 API routes, TypeScript, Supabase (cache/rate-limit from Plan 1), OpenRouter → `google/gemini-2.0-flash-001`, Nitter public instance (html parse via `node-html-parser`), memory.lol (free JSON API).

## Global Constraints

- TypeScript strict mode — no `any`, no implicit `any`
- All handlers return `ApiResponse<T>` envelope
- Rate limit enforced — reuse `checkRateLimit` from Plan 1
- Cache 24h — reuse `getCache`/`setCache` from Plan 1
- **No X API key** — Nitter + memory.lol only
- **No Supabase CLI** — SQL run manually via Supabase dashboard
- **No auth / no login** — anonymous, IP-based rate limit only
- **No auto-commit**
- Graceful degradation: if Nitter fails (instance down), return null fields — don't fail whole request
- Nitter instance to use: `https://nitter.poast.org` (change to any live public instance if down — check nitter.net/status)

---

## File Map

```
Charli/
  lib/
    types.ts                      ← ADD: XAccountVerdict, XAccountLevel, XMetrics types
    data/
      nitter.ts                   ← NEW: scrape X profile from Nitter public instance
      memory-lol.ts               ← NEW: fetch username change history from memory.lol
    prompts/
      x-account.ts                ← NEW: system prompt + evidence builder for X verdict
  app/
    api/
      investigate/
        x-account/
          route.ts                ← NEW: POST handler
    (app)/
      x-account/
        page.tsx                  ← NEW: X account investigasi UI page
  components/
    XVerdictCard.tsx              ← NEW: renders X account verdict
```

---

## Task 1: Extend Shared Types for X Account

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `XAccountVerdict`, `XAccountLevel`, `XMetrics` — consumed by Tasks 4, 5, 6

- [ ] **Step 1: Add X account types to `lib/types.ts`**

Open `lib/types.ts` and append:

```typescript
// --- X Account types ---

export type XAccountLevel = 'LEGIT' | 'DYOR' | 'RED_FLAG';

export type XMetrics = {
  accountAgeDays: number | null;
  followers: number | null;
  following: number | null;
  usernameChanges: number | null;
  firstCryptoMentionDays: number | null; // days ago, null = never mentioned crypto
};

export type XAccountVerdict = {
  handle: string;
  level: XAccountLevel;
  confidence: Confidence;
  summary: string;
  metrics: XMetrics;
  signals: Signal[];
  redFlags: string[];
};
```

---

## Task 2: Nitter Profile Fetcher

**Files:**
- Create: `lib/data/nitter.ts`

**Interfaces:**
- Produces: `fetchNitterProfile(handle)` → `NitterProfile`

- [ ] **Step 1: Install html parser**

```bash
cd Charli && npm install node-html-parser
```

- [ ] **Step 2: Create `lib/data/nitter.ts`**

```typescript
// lib/data/nitter.ts
import { parse } from 'node-html-parser';

export type NitterProfile = {
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  followers: number | null;
  following: number | null;
  joinedRaw: string | null;    // raw string e.g. "March 2019"
  accountAgeDays: number | null;
  tweetCount: number | null;
  isVerified: boolean;
};

// Change this to any live Nitter instance — check https://status.d420.de/
const NITTER_BASE = 'https://nitter.poast.org';

function parseCount(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '').trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function parseJoinDate(raw: string | null): number | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function fetchNitterProfile(handle: string): Promise<NitterProfile> {
  const cleanHandle = handle.replace(/^@/, '');
  const empty: NitterProfile = {
    displayName: null, handle: null, bio: null, followers: null,
    following: null, joinedRaw: null, accountAgeDays: null, tweetCount: null, isVerified: false,
  };

  try {
    const res = await fetch(`${NITTER_BASE}/${cleanHandle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CARLI/1.0; research tool)',
        Accept: 'text/html',
      },
      next: { revalidate: 0 },
    });

    if (res.status === 404) return empty;
    if (!res.ok) throw new Error(`Nitter ${res.status}`);

    const html = await res.text();
    const root = parse(html);

    const displayName = root.querySelector('.profile-card-fullname')?.text?.trim() ?? null;
    const bio = root.querySelector('.profile-bio')?.text?.trim() ?? null;
    const joinedRaw = root.querySelector('.profile-joindate span')?.getAttribute('title') ?? null;
    const isVerified = root.querySelector('.icon-ok.verified-icon') !== null;

    // Stats: followers, following, tweets
    const statEntries = root.querySelectorAll('.profile-stat-num');
    const tweets = parseCount(statEntries[0]?.text);
    const following = parseCount(statEntries[1]?.text);
    const followers = parseCount(statEntries[2]?.text);

    return {
      displayName,
      handle: cleanHandle,
      bio,
      followers,
      following,
      joinedRaw,
      accountAgeDays: parseJoinDate(joinedRaw),
      tweetCount: tweets,
      isVerified,
    };
  } catch (err) {
    console.error('[nitter] fetch error:', (err as Error).message);
    return empty;
  }
}
```

---

## Task 3: memory.lol Username History Fetcher

**Files:**
- Create: `lib/data/memory-lol.ts`

**Interfaces:**
- Produces: `fetchUsernameHistory(handle)` → `MemoryLolData`

- [ ] **Step 1: Create `lib/data/memory-lol.ts`**

```typescript
// lib/data/memory-lol.ts
// memory.lol archives Twitter/X username changes.
// Free, no auth required. Returns historical handles for a given account.

export type UsernameEntry = {
  handle: string;
  activeFrom: string | null; // ISO or raw date string
  activeTo: string | null;
};

export type MemoryLolData = {
  userId: string | null;
  usernameHistory: UsernameEntry[];
  totalChanges: number;
};

export async function fetchUsernameHistory(handle: string): Promise<MemoryLolData> {
  const cleanHandle = handle.replace(/^@/, '');
  const empty: MemoryLolData = { userId: null, usernameHistory: [], totalChanges: 0 };

  try {
    const res = await fetch(
      `https://memory.lol/v1/tw/${encodeURIComponent(cleanHandle)}`,
      { next: { revalidate: 0 } }
    );
    if (res.status === 404) return empty;
    if (!res.ok) throw new Error(`memory.lol ${res.status}`);

    const json = await res.json() as Record<string, unknown>;

    // Response shape: { "accounts": [{ "id": "...", "usernames": [["handle", "from", "to"], ...] }] }
    const accounts = (json.accounts as Array<{ id?: string; usernames?: Array<[string, string?, string?]> }> | undefined) ?? [];
    if (!accounts.length) return empty;

    const account = accounts[0];
    const usernameHistory: UsernameEntry[] = (account.usernames ?? []).map(([h, from, to]) => ({
      handle: h,
      activeFrom: from ?? null,
      activeTo: to ?? null,
    }));

    return {
      userId: account.id ?? null,
      usernameHistory,
      totalChanges: Math.max(0, usernameHistory.length - 1),
    };
  } catch (err) {
    console.error('[memory.lol] fetch error:', (err as Error).message);
    return empty;
  }
}
```

---

## Task 4: X Account Verdict Prompt

**Files:**
- Create: `lib/prompts/x-account.ts`

**Interfaces:**
- Consumes: `NitterProfile`, `MemoryLolData`
- Produces: `X_ACCOUNT_SYSTEM_PROMPT` string, `buildXAccountEvidence(...)` → `string`

- [ ] **Step 1: Create `lib/prompts/x-account.ts`**

```typescript
// lib/prompts/x-account.ts
import type { NitterProfile } from '../data/nitter';
import type { MemoryLolData } from '../data/memory-lol';

export const X_ACCOUNT_SYSTEM_PROMPT = `You are CARLI — a crypto intelligence analyst specializing in social media account analysis. You detect fake engagement, hijacked accounts, and coordinated scam promotion. Return a verdict as raw JSON only. No prose, no markdown fences.

Output this exact shape:
{
  "level": "LEGIT" | "DYOR" | "RED_FLAG",
  "confidence": "TENTATIVE" | "FIRM" | "CONFIRMED",
  "summary": "<1-2 sentences, CARLI voice — direct, intelligence-style>",
  "metrics": {
    "accountAgeDays": <number or null>,
    "followers": <number or null>,
    "following": <number or null>,
    "usernameChanges": <number or null>,
    "firstCryptoMentionDays": null
  },
  "signals": [
    { "label": "<signal name>", "value": "<finding>", "direction": "ok" | "warn" | "bad" }
  ],
  "redFlags": ["<flag string>", ...]
}

Rules:
- LEGIT: consistent identity, organic growth signals, no suspicious patterns
- DYOR: mixed signals — some concerns but not conclusive
- RED_FLAG: high username change count (>3 changes), new account with explosive follower growth, account age doesn't match crypto history, clear hijack/impersonation pattern
- Problem 01 (fake engagement): very high follower/following ratio on a young account is a warning sign
- Problem 02 (hijacked account): many username changes + sudden pivot to crypto = red flag
- signals: 3-6 items, be specific about dates and numbers
- redFlags: only concrete red flags, empty array if none
- firstCryptoMentionDays: always return null — bio scraping only, we can't access tweet history
- usernameChanges: use the number provided in evidence; if "no history found" return null not 0`;

export function buildXAccountEvidence(
  handle: string,
  nitter: NitterProfile,
  memory: MemoryLolData
): string {
  const usernameHistoryStr = memory.usernameHistory.length > 0
    ? memory.usernameHistory.map(u =>
        `  - @${u.handle}${u.activeFrom ? ` (from ${u.activeFrom}` : ''}${u.activeTo ? ` to ${u.activeTo})` : u.activeFrom ? ')' : ''}`
      ).join('\n')
    : '  No history found';

  const cryptoKeywords = ['crypto', 'nft', 'token', 'defi', 'web3', 'bitcoin', 'eth', 'sol', 'pump', 'moon', 'coin', 'dex', 'yield'];
  const bioHasCrypto = nitter.bio
    ? cryptoKeywords.some(kw => nitter.bio!.toLowerCase().includes(kw))
    : false;

  return `
Handle: @${handle}
Display name: ${nitter.displayName ?? 'unknown'}
Account age: ${nitter.accountAgeDays !== null ? `${nitter.accountAgeDays} days` : 'unknown'}
Followers: ${nitter.followers !== null ? nitter.followers.toLocaleString() : 'unknown'}
Following: ${nitter.following !== null ? nitter.following.toLocaleString() : 'unknown'}
Tweet count: ${nitter.tweetCount !== null ? nitter.tweetCount.toLocaleString() : 'unknown'}
Verified: ${nitter.isVerified ? 'yes' : 'no'}
Bio: ${nitter.bio ?? 'none'}
Bio contains crypto keywords: ${bioHasCrypto ? 'yes' : 'no'}
Total username changes: ${memory.totalChanges} (${memory.usernameHistory.length > 0 ? 'history available' : 'no history found in archive'})
Username history:
${usernameHistoryStr}
`.trim();
}
```

---

## Task 5: X Account API Route

**Files:**
- Create: `app/api/investigate/x-account/route.ts`

**Interfaces:**
- Consumes: all previous tasks in this plan + Plan 1 (cache, rate-limit, openrouter, types)
- Produces: `POST /api/investigate/x-account` → `ApiResponse<XAccountVerdict>`

- [ ] **Step 1: Create `app/api/investigate/x-account/route.ts`**

```typescript
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

  // Fan-out: Nitter + memory.lol concurrent
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
```

- [ ] **Step 2: Test endpoint locally**

```bash
npm run dev
curl -X POST http://localhost:3000/api/investigate/x-account \
  -H "Content-Type: application/json" \
  -d '{"handle":"elonmusk"}'
```

Expected: JSON with `ok: true`, `data.level` one of LEGIT/DYOR/RED_FLAG, `data.metrics` with accountAgeDays and followers, `data.signals` array.

---

## Task 6: X Account Verdict UI

**Files:**
- Create: `components/XVerdictCard.tsx`
- Create: `app/(app)/x-account/page.tsx`

**Interfaces:**
- Consumes: `XAccountVerdict` from `lib/types.ts`
- Produces: working `/x-account` page

- [ ] **Step 1: Create `components/XVerdictCard.tsx`**

```typescript
// components/XVerdictCard.tsx
'use client';

import type { XAccountVerdict } from '@/lib/types';

const LEVEL_STYLES: Record<XAccountVerdict['level'], string> = {
  LEGIT: 'text-green-700 bg-green-50 border-green-200',
  DYOR: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  RED_FLAG: 'text-red-700 bg-red-50 border-red-200',
};

const DIRECTION_STYLES = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  bad: 'text-red-600',
};

const DIRECTION_ICON = { ok: '✓', warn: '⚠', bad: '✗' };

type Props = { verdict: XAccountVerdict };

export function XVerdictCard({ verdict }: Props) {
  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">@{verdict.handle}</p>
          <p className="text-xs text-ink-soft uppercase tracking-widest mt-1">
            X Account · {verdict.confidence}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 border rounded-sm uppercase tracking-widest whitespace-nowrap ${LEVEL_STYLES[verdict.level]}`}>
          {verdict.level.replace('_', ' ')}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-ink text-pretty">{verdict.summary}</p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs tabular-nums text-ink-soft border-t border-line pt-3">
        {verdict.metrics.accountAgeDays !== null && (
          <span>Age: {verdict.metrics.accountAgeDays} days</span>
        )}
        {verdict.metrics.followers !== null && (
          <span>Followers: {verdict.metrics.followers.toLocaleString()}</span>
        )}
        {verdict.metrics.following !== null && (
          <span>Following: {verdict.metrics.following.toLocaleString()}</span>
        )}
        {verdict.metrics.usernameChanges !== null && (
          <span className={verdict.metrics.usernameChanges > 3 ? 'text-red-600 font-medium' : ''}>
            Username changes: {verdict.metrics.usernameChanges}
          </span>
        )}
      </div>

      {/* Red flags */}
      {verdict.redFlags.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-xs text-ink-soft uppercase tracking-widest mb-2">Red flags</p>
          <div className="flex flex-wrap gap-1">
            {verdict.redFlags.map((flag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-sm">
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Signals */}
      <div className="space-y-1 border-t border-line pt-3">
        {verdict.signals.map((signal, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className={`w-4 shrink-0 font-mono ${DIRECTION_STYLES[signal.direction]}`}>
              {DIRECTION_ICON[signal.direction]}
            </span>
            <span className="text-ink-soft">{signal.label}:</span>
            <span className="text-ink">{signal.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(app)/x-account/page.tsx`**

```typescript
// app/(app)/x-account/page.tsx
'use client';

import { useState } from 'react';
import type { ApiResponse, XAccountVerdict } from '@/lib/types';
import { XVerdictCard } from '@/components/XVerdictCard';
import { RateLimitBanner } from '@/components/RateLimitBanner';

export default function XAccountPage() {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse<XAccountVerdict> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/investigate/x-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.trim() }),
      });
      const json = await res.json() as ApiResponse<XAccountVerdict>;
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
          <h1 className="text-2xl font-bold text-balance">X Account Intel</h1>
          <p className="text-sm text-ink-soft text-pretty mt-1">
            Enter an X (Twitter) handle to investigate for fake engagement and account history.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="@handle or handle"
            className="w-full bg-surface border border-line rounded-sm px-3 py-2 text-sm font-mono text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={loading || !handle.trim()}
            className="w-full bg-ink text-bg text-sm font-semibold py-2 rounded-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Investigating…' : 'Investigate'}
          </button>
        </form>

        {result && (
          <div className="space-y-3">
            {result.ok ? (
              <XVerdictCard verdict={result.data} />
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
          CARLI uses only public data (Nitter, memory.lol) for research purposes. Not financial advice. DYOR.
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

Open `http://localhost:3000/x-account`. Enter a handle. Verify: verdict card renders with level badge, metrics grid (highlight username changes >3 in red), signals list, red flags chips.

---

## Self-Review

**Spec coverage:**
- ✅ `/api/investigate/x-account` — Task 5
- ✅ Handle resolution → profile via Nitter (no X API key) — Task 2
- ✅ Username change history via memory.lol — Task 3
- ✅ Account age, followers, following in metrics — Tasks 2, 4
- ✅ Problem 01 (fake engagement — follower/following ratio on young account) — Task 4 prompt
- ✅ Problem 02 (hijacked account — many username changes + crypto pivot) — Tasks 3, 4 prompt
- ✅ LEGIT/DYOR/RED_FLAG verdict levels — Tasks 1, 4, 5
- ✅ Graceful degradation (Nitter down → null fields, still runs) — Tasks 2, 3, 5
- ✅ Cache 24h — Task 5
- ✅ Rate limit — Task 5
- ✅ No X API key — Nitter + memory.lol only (global constraint)
- ✅ No auth, no login — anonymous IP rate limit
- ✅ No auto-commit

**Placeholders:** None.

**Type consistency:** `XAccountVerdict` defined in Task 1, used identically in Tasks 4, 5, 6. `Signal` type reused from Plan 1 `lib/types.ts`. `XMetrics.firstCryptoMentionDays` always `null` — documented in prompt + type (tweet history inaccessible without X API).
