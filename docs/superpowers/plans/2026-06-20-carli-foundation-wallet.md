# CARLI Foundation + Wallet Dossier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared infrastructure layer (Supabase, cache, rate limit, OpenRouter wrapper, API envelope) and implement the `/api/investigate/wallet` endpoint end-to-end with a working UI verdict card.

**Architecture:** Next.js API routes on Vercel act as the backend — no separate FastAPI service. Supabase Postgres handles cache (24h TTL), rate limiting (5/day per IP), and agent sessions. OpenRouter calls `google/gemini-2.0-flash-001` for reasoning. Data flows: client → Next.js route → fan-out data fetchers (async Promise.all) → normalize evidence → Gemini verdict → cache → return ApiResponse.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (postgres + supabase-js), OpenRouter API (`google/gemini-2.0-flash-001`), Dune Analytics API (free key), Solscan API, Helius API, Etherscan API.

## Global Constraints

- TypeScript strict mode — no `any`, no implicit `any`
- All API keys live server-side only — never in client components or `NEXT_PUBLIC_` except `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- All API route handlers return `ApiResponse<T>` envelope (defined in Task 1)
- Rate limit: 5 investigations per IP per day — enforced in every `/api/investigate/*` route
- Cache TTL: 24 hours — keyed by normalized input
- Animations: `transform` + `opacity` only — no layout property animations
- One gold accent (`#A07E4A`) per view max
- `prefers-reduced-motion` respected in all animated components
- Gemini model string: `google/gemini-2.0-flash-001` — hardcoded in `lib/openrouter.ts`
- Verdict JSON from LLM: parse defensively — wrap in try/catch, return error if malformed
- **No Supabase CLI** — all SQL run manually via Supabase dashboard → SQL Editor
- **No auth / no login** — fully anonymous, identity = IP address only
- **No auto-commit** — do NOT run git commit automatically; commit only when user explicitly asks

---

## File Map

```
Charli/
  lib/
    types.ts                    ← shared TypeScript types (ApiResponse, verdict shapes)
    supabase.ts                 ← Supabase server client (service role)
    cache.ts                    ← get/set cache via Supabase postgres
    rate-limit.ts               ← check + increment rate limit via Supabase postgres
    openrouter.ts               ← OpenRouter fetch wrapper (Gemini 2.0 Flash)
    data/
      chain-detect.ts           ← detect Solana vs EVM from address string
      dune.ts                   ← Dune Analytics API queries (wallet activity)
      solscan.ts                ← Solscan API (Solana balance + tx history)
      helius.ts                 ← Helius API (Solana enrichment fallback)
      etherscan.ts              ← Etherscan API (EVM balance + tx history)
    prompts/
      wallet.ts                 ← system prompt + evidence formatter for wallet verdict
  app/
    api/
      investigate/
        wallet/
          route.ts              ← POST handler: validate → rate limit → cache check → fetch → verdict → cache set
    (app)/
      wallet/
        page.tsx                ← wallet investigasi UI page
  components/
    WalletVerdictCard.tsx       ← renders verdict (level badge, signals, classification)
    RateLimitBanner.tsx         ← shows remaining investigations + reset time
  supabase/
    migrations/
      001_foundation.sql        ← cache + rate_limits + agent_sessions tables
```

---

## Task 1: Shared Types

**Files:**
- Create: `lib/types.ts`

**Interfaces:**
- Produces: `ApiResponse<T>`, `WalletVerdict`, `Signal`, `RateLimitMeta` — used by every subsequent task

- [ ] **Step 1: Create `lib/types.ts`**

```typescript
// lib/types.ts

export type RateLimitMeta = {
  remaining: number;
  resetAt: string; // ISO date string (midnight of next day UTC)
};

export type ApiMeta = {
  cached: boolean;
  tookMs: number;
  ratelimit: RateLimitMeta;
};

export type ApiResponse<T> =
  | { ok: true; data: T; meta: ApiMeta }
  | { ok: false; error: { code: string; message: string }; meta: ApiMeta };

export type SignalDirection = 'ok' | 'warn' | 'bad';
export type Confidence = 'TENTATIVE' | 'FIRM' | 'CONFIRMED';
export type WalletLevel = 'CLEAN' | 'WATCH' | 'FLAGGED';
export type WalletClassification = 'dev' | 'whale' | 'flipper' | 'fresh' | 'mixed';
export type Chain = 'solana' | 'evm';

export type Signal = {
  label: string;
  value: string;
  direction: SignalDirection;
};

export type LinkedProject = {
  name: string;
  role: string;
  note: string;
};

export type WalletVerdict = {
  address: string;
  chain: Chain;
  level: WalletLevel;
  confidence: Confidence;
  classification: WalletClassification;
  summary: string;
  balanceUsd: number | null;
  firstSeen: string | null; // ISO
  lastActive: string | null; // ISO
  linkedProjects: LinkedProject[];
  signals: Signal[];
};
```


---

## Task 2: Supabase Setup + Database Schema

**Files:**
- Create: `supabase/migrations/001_foundation.sql`
- Create: `lib/supabase.ts`

**Interfaces:**
- Produces: `supabaseAdmin` client — used by `cache.ts` and `rate-limit.ts`

- [ ] **Step 1: Install Supabase client**

```bash
cd Charli && npm install @supabase/supabase-js
```

Expected: package added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Create migration SQL**

```sql
-- supabase/migrations/001_foundation.sql

-- Cache table
CREATE TABLE IF NOT EXISTS cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cache_key_idx ON cache(key);
CREATE INDEX IF NOT EXISTS cache_expires_idx ON cache(expires_at);

-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, date)
);

-- Agent sessions table (used by Plan 4 - Agent Mode)
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS agent_sessions_session_id_idx ON agent_sessions(session_id);
```

- [ ] **Step 3: Run migration in Supabase dashboard**

Go to Supabase project → SQL Editor → paste content of `001_foundation.sql` → Run.
Verify: 3 tables created (cache, rate_limits, agent_sessions).

- [ ] **Step 4: Add env vars to `.env.local`**

```bash
# .env.local (add these lines)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get values from Supabase dashboard → Settings → API.

- [ ] **Step 5: Create `lib/supabase.ts`**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

// Server-side only — service role bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
```


---

## Task 3: Cache Layer

**Files:**
- Create: `lib/cache.ts`

**Interfaces:**
- Consumes: `supabaseAdmin` from `lib/supabase.ts`
- Produces: `getCache(key)` → `unknown | null`, `setCache(key, payload)` → `void`

- [ ] **Step 1: Create `lib/cache.ts`**

```typescript
// lib/cache.ts
import { supabaseAdmin } from './supabase';

const CACHE_TTL_HOURS = 24;

export async function getCache(key: string): Promise<unknown | null> {
  const { data, error } = await supabaseAdmin
    .from('cache')
    .select('payload, expires_at')
    .eq('key', key)
    .single();

  if (error || !data) return null;

  const isExpired = new Date(data.expires_at) < new Date();
  if (isExpired) {
    // Lazy delete — don't await, fire-and-forget
    supabaseAdmin.from('cache').delete().eq('key', key);
    return null;
  }

  return data.payload;
}

export async function setCache(key: string, payload: unknown): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  await supabaseAdmin.from('cache').upsert(
    { key, payload, expires_at: expiresAt.toISOString() },
    { onConflict: 'key' }
  );
}
```


---

## Task 4: Rate Limit Layer

**Files:**
- Create: `lib/rate-limit.ts`

**Interfaces:**
- Consumes: `supabaseAdmin` from `lib/supabase.ts`
- Produces: `checkRateLimit(ip)` → `{ allowed: boolean; remaining: number; resetAt: string }`

- [ ] **Step 1: Create `lib/rate-limit.ts`**

```typescript
// lib/rate-limit.ts
import { supabaseAdmin } from './supabase';

const DAILY_LIMIT = 5;

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string; // ISO — midnight UTC next day
};

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Midnight UTC tomorrow
  const resetAt = new Date();
  resetAt.setUTCHours(24, 0, 0, 0);
  const resetAtIso = resetAt.toISOString();

  // Atomic upsert: insert with count=1 or increment existing
  const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
    p_ip: ip,
    p_date: today,
    p_limit: DAILY_LIMIT,
  });

  if (error) {
    // Fail open — allow if DB error (don't block users on infra issues)
    console.error('[rate-limit] DB error:', error.message);
    return { allowed: true, remaining: DAILY_LIMIT, resetAt: resetAtIso };
  }

  const count: number = data as number;
  const allowed = count <= DAILY_LIMIT;
  const remaining = Math.max(0, DAILY_LIMIT - count);

  return { allowed, remaining, resetAt: resetAtIso };
}
```

- [ ] **Step 2: Add Postgres function via Supabase SQL Editor**

```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_ip TEXT,
  p_date DATE,
  p_limit INTEGER
) RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO rate_limits (ip, date, count)
  VALUES (p_ip, p_date, 1)
  ON CONFLICT (ip, date)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;
```

Run in Supabase dashboard → SQL Editor → Run. Verify: function created successfully.


---

## Task 5: OpenRouter / Gemini Wrapper

**Files:**
- Create: `lib/openrouter.ts`

**Interfaces:**
- Produces: `callLLM(systemPrompt, userContent)` → `string` (raw LLM text output)

- [ ] **Step 1: Add env var to `.env.local`**

```bash
# .env.local
OPENROUTER_API_KEY=your-openrouter-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Get OpenRouter key from openrouter.ai → Keys.

- [ ] **Step 2: Create `lib/openrouter.ts`**

```typescript
// lib/openrouter.ts

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function callLLM(
  systemPrompt: string,
  userContent: string,
  timeoutMs = 30_000
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(OPENROUTER_URL, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'CARLI',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${body}`);
    }

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Empty response from LLM');
    return text;
  } finally {
    clearTimeout(timer);
  }
}
```


---

## Task 6: Chain Detection Utility

**Files:**
- Create: `lib/data/chain-detect.ts`

**Interfaces:**
- Produces: `detectChain(address)` → `Chain | null` — used in wallet route handler

- [ ] **Step 1: Create `lib/data/chain-detect.ts`**

```typescript
// lib/data/chain-detect.ts
import type { Chain } from '../types';

// Solana: base58, 32-44 chars, no 0/O/I/l
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// EVM: 0x prefix + 40 hex chars
const EVM_RE = /^0x[0-9a-fA-F]{40}$/;

export function detectChain(address: string): Chain | null {
  const trimmed = address.trim();
  if (EVM_RE.test(trimmed)) return 'evm';
  if (SOLANA_RE.test(trimmed)) return 'solana';
  return null;
}
```


---

## Task 7: Wallet Data Fetchers

**Files:**
- Create: `lib/data/solscan.ts`
- Create: `lib/data/helius.ts`
- Create: `lib/data/etherscan.ts`
- Create: `lib/data/dune.ts`

**Interfaces:**
- Produces:
  - `fetchSolscanWallet(address)` → `SolscanWalletData`
  - `fetchHeliusWallet(address)` → `HeliusWalletData`
  - `fetchEtherscanWallet(address)` → `EtherscanWalletData`
  - `fetchDuneWalletActivity(address)` → `DuneWalletData`
- All return partial data + `null` fields on error (graceful degradation)

- [ ] **Step 1: Add env vars to `.env.local`**

```bash
# .env.local
SOLSCAN_API_KEY=your-solscan-key
HELIUS_API_KEY=your-helius-key
ETHERSCAN_API_KEY=your-etherscan-key
DUNE_API_KEY=your-dune-key
```

Get free keys: Solscan (solscan.io/apis), Helius (helius.dev), Etherscan (etherscan.io/apis), Dune (dune.com/settings/api).

- [ ] **Step 2: Create `lib/data/solscan.ts`**

```typescript
// lib/data/solscan.ts

export type SolscanWalletData = {
  balanceSol: number | null;
  balanceUsd: number | null;
  firstTxTime: string | null; // ISO
  lastTxTime: string | null;  // ISO
  txCount: number | null;
};

const BASE = 'https://pro-api.solscan.io/v2.0';

async function solscanFetch(path: string): Promise<unknown> {
  const key = process.env.SOLSCAN_API_KEY;
  if (!key) throw new Error('Missing SOLSCAN_API_KEY');

  const res = await fetch(`${BASE}${path}`, {
    headers: { token: key },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Solscan ${res.status}`);
  return res.json();
}

export async function fetchSolscanWallet(address: string): Promise<SolscanWalletData> {
  try {
    const [account, txList] = await Promise.all([
      solscanFetch(`/account/${address}`),
      solscanFetch(`/account/transactions?address=${address}&page=1&page_size=10&sort_by=block_time&sort_order=asc`),
    ]);

    const acc = account as Record<string, unknown>;
    const txs = (txList as { data?: Array<{ block_time?: number }> }).data ?? [];

    const balanceLamports = (acc.lamports as number | undefined) ?? null;
    const balanceSol = balanceLamports !== null ? balanceLamports / 1e9 : null;
    const solPrice = (acc.sol_price as number | undefined) ?? null;
    const balanceUsd = balanceSol !== null && solPrice !== null ? balanceSol * solPrice : null;

    const firstTx = txs[0]?.block_time;
    const firstTxTime = firstTx ? new Date(firstTx * 1000).toISOString() : null;

    // Fetch last tx separately (sort desc)
    const lastTxRes = await solscanFetch(
      `/account/transactions?address=${address}&page=1&page_size=1&sort_by=block_time&sort_order=desc`
    );
    const lastTxs = (lastTxRes as { data?: Array<{ block_time?: number }> }).data ?? [];
    const lastTx = lastTxs[0]?.block_time;
    const lastTxTime = lastTx ? new Date(lastTx * 1000).toISOString() : null;

    return { balanceSol, balanceUsd, firstTxTime, lastTxTime, txCount: null };
  } catch (err) {
    console.error('[solscan] fetch error:', (err as Error).message);
    return { balanceSol: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null };
  }
}
```

- [ ] **Step 3: Create `lib/data/helius.ts`**

```typescript
// lib/data/helius.ts

export type HeliusWalletData = {
  balanceUsd: number | null;
  firstTxTime: string | null;
  lastTxTime: string | null;
};

export async function fetchHeliusWallet(address: string): Promise<HeliusWalletData> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return { balanceUsd: null, firstTxTime: null, lastTxTime: null };

  try {
    const res = await fetch(
      `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=1&type=TRANSFER`
    );
    if (!res.ok) throw new Error(`Helius ${res.status}`);
    const txs = (await res.json()) as Array<{ timestamp?: number }>;
    const lastTxTime = txs[0]?.timestamp
      ? new Date(txs[0].timestamp * 1000).toISOString()
      : null;
    return { balanceUsd: null, firstTxTime: null, lastTxTime };
  } catch (err) {
    console.error('[helius] fetch error:', (err as Error).message);
    return { balanceUsd: null, firstTxTime: null, lastTxTime: null };
  }
}
```

- [ ] **Step 4: Create `lib/data/etherscan.ts`**

```typescript
// lib/data/etherscan.ts

export type EtherscanWalletData = {
  balanceWei: string | null;
  balanceUsd: number | null;
  firstTxTime: string | null;
  lastTxTime: string | null;
  txCount: number | null;
};

const BASE = 'https://api.etherscan.io/api';

export async function fetchEtherscanWallet(address: string): Promise<EtherscanWalletData> {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) return { balanceWei: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null };

  try {
    const [balRes, txRes] = await Promise.all([
      fetch(`${BASE}?module=account&action=balance&address=${address}&tag=latest&apikey=${key}`).then(r => r.json()),
      fetch(`${BASE}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=5&sort=asc&apikey=${key}`).then(r => r.json()),
    ]);

    const balanceWei: string | null = balRes?.result ?? null;
    const txs = (txRes?.result as Array<{ timeStamp?: string }> | undefined) ?? [];

    const firstTx = txs[0]?.timeStamp;
    const firstTxTime = firstTx ? new Date(parseInt(firstTx) * 1000).toISOString() : null;

    // Last tx — fetch desc
    const lastTxRes = await fetch(
      `${BASE}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc&apikey=${key}`
    ).then(r => r.json());
    const lastTxs = (lastTxRes?.result as Array<{ timeStamp?: string }> | undefined) ?? [];
    const lastTx = lastTxs[0]?.timeStamp;
    const lastTxTime = lastTx ? new Date(parseInt(lastTx) * 1000).toISOString() : null;

    return { balanceWei, balanceUsd: null, firstTxTime, lastTxTime, txCount: null };
  } catch (err) {
    console.error('[etherscan] fetch error:', (err as Error).message);
    return { balanceWei: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null };
  }
}
```

- [ ] **Step 5: Create `lib/data/dune.ts`**

```typescript
// lib/data/dune.ts
// Queries Dune Analytics for Pump.fun wallet profitability

export type DuneWalletData = {
  totalProfitUsd: number | null;
  tradeCount: number | null;
  classification: 'dev' | 'whale' | 'flipper' | 'fresh' | 'mixed' | null;
};

// Dune query ID for wallet activity on Pump.fun / PumpSwap
// Use public query: https://dune.com/queries/3306925 (pumpfun trader stats)
const DUNE_QUERY_ID = '3306925';

export async function fetchDuneWalletActivity(address: string): Promise<DuneWalletData> {
  const key = process.env.DUNE_API_KEY;
  if (!key) return { totalProfitUsd: null, tradeCount: null, classification: null };

  try {
    // Execute query with parameter
    const execRes = await fetch(`https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/execute`, {
      method: 'POST',
      headers: { 'X-Dune-API-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_parameters: { wallet_address: address } }),
    });
    if (!execRes.ok) throw new Error(`Dune execute ${execRes.status}`);
    const { execution_id } = await execRes.json() as { execution_id: string };

    // Poll for result (max 20s)
    let result: Record<string, unknown> | null = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.dune.com/api/v1/execution/${execution_id}/results`, {
        headers: { 'X-Dune-API-Key': key },
      });
      if (!statusRes.ok) continue;
      const statusJson = await statusRes.json() as Record<string, unknown>;
      if (statusJson.state === 'QUERY_STATE_COMPLETED') {
        result = statusJson;
        break;
      }
    }

    if (!result) return { totalProfitUsd: null, tradeCount: null, classification: null };

    const rows = (result as { result?: { rows?: Array<Record<string, unknown>> } }).result?.rows ?? [];
    if (rows.length === 0) return { totalProfitUsd: null, tradeCount: null, classification: 'fresh' };

    const row = rows[0];
    const totalProfitUsd = (row.total_profit_usd as number | null) ?? null;
    const tradeCount = (row.trade_count as number | null) ?? null;

    // Simple classification heuristic
    let classification: DuneWalletData['classification'] = 'mixed';
    if (!tradeCount || tradeCount === 0) classification = 'fresh';
    else if (tradeCount > 100 && totalProfitUsd !== null && totalProfitUsd > 10000) classification = 'whale';
    else if (tradeCount > 50) classification = 'flipper';

    return { totalProfitUsd, tradeCount, classification };
  } catch (err) {
    console.error('[dune] fetch error:', (err as Error).message);
    return { totalProfitUsd: null, tradeCount: null, classification: null };
  }
}
```


---

## Task 8: Wallet Verdict Prompt

**Files:**
- Create: `lib/prompts/wallet.ts`

**Interfaces:**
- Consumes: `SolscanWalletData`, `HeliusWalletData`, `EtherscanWalletData`, `DuneWalletData`, `Chain` from earlier tasks
- Produces: `WALLET_SYSTEM_PROMPT` string, `buildWalletEvidence(...)` → `string`

- [ ] **Step 1: Create `lib/prompts/wallet.ts`**

```typescript
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

  return `
Wallet address: ${address}
Chain: ${chain}
Balance: ${balance}
First transaction: ${firstSeen ?? 'unknown'}
Last active: ${lastActive ?? 'unknown'}
Pump.fun trade count: ${dune.tradeCount ?? 'no data'}
Pump.fun total profit: $${dune.totalProfitUsd ?? 'no data'} USD
Suggested classification from trading patterns: ${dune.classification ?? 'unknown'}
`.trim();
}
```


---

## Task 9: Wallet API Route

**Files:**
- Create: `app/api/investigate/wallet/route.ts`

**Interfaces:**
- Consumes: all previous tasks (types, cache, rate-limit, openrouter, chain-detect, all fetchers, wallet prompt)
- Produces: `POST /api/investigate/wallet` → `ApiResponse<WalletVerdict>`

- [ ] **Step 1: Create `app/api/investigate/wallet/route.ts`**

```typescript
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

  // Parse body
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

  // Detect chain
  const chain = detectChain(address);
  if (!chain) {
    return NextResponse.json({
      ok: false,
      error: { code: 'INVALID_ADDRESS', message: 'Address format not recognized as Solana or EVM' },
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
  const cacheKey = `wallet:${address.toLowerCase()}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      ok: true,
      data: cached as WalletVerdict,
      meta: { cached: true, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<WalletVerdict>);
  }

  // Fan-out data fetch (all concurrent, each has its own try/catch)
  const [solscan, helius, etherscan, dune] = await Promise.all([
    chain === 'solana' ? fetchSolscanWallet(address) : Promise.resolve({ balanceSol: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null }),
    chain === 'solana' ? fetchHeliusWallet(address) : Promise.resolve({ balanceUsd: null, firstTxTime: null, lastTxTime: null }),
    chain === 'evm' ? fetchEtherscanWallet(address) : Promise.resolve({ balanceWei: null, balanceUsd: null, firstTxTime: null, lastTxTime: null, txCount: null }),
    fetchDuneWalletActivity(address),
  ]);

  // Build evidence + call LLM
  const evidence = buildWalletEvidence(address, chain, solscan, helius, etherscan, dune);
  let verdict: WalletVerdict;
  try {
    const raw = await callLLM(WALLET_SYSTEM_PROMPT, evidence);
    // Strip markdown fences if present
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean) as Omit<WalletVerdict, 'address' | 'chain'>;
    verdict = { ...parsed, address, chain };
  } catch (err) {
    console.error('[wallet route] LLM parse error:', (err as Error).message);
    return NextResponse.json({
      ok: false,
      error: { code: 'LLM_ERROR', message: 'Failed to generate verdict' },
      meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
    } satisfies ApiResponse<never>, { status: 500 });
  }

  // Cache result
  await setCache(cacheKey, verdict);

  return NextResponse.json({
    ok: true,
    data: verdict,
    meta: { cached: false, tookMs: Date.now() - start, ratelimit: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt } },
  } satisfies ApiResponse<WalletVerdict>);
}
```

- [ ] **Step 2: Test endpoint locally**

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/investigate/wallet \
  -H "Content-Type: application/json" \
  -d '{"address":"So11111111111111111111111111111111111111112"}'
```

Expected: JSON with `ok: true`, `data.level` one of CLEAN/WATCH/FLAGGED, `data.signals` array.


---

## Task 10: Wallet Verdict UI

**Files:**
- Create: `components/WalletVerdictCard.tsx`
- Create: `components/RateLimitBanner.tsx`
- Create: `app/(app)/wallet/page.tsx`

**Interfaces:**
- Consumes: `WalletVerdict`, `ApiResponse<WalletVerdict>` from `lib/types.ts`
- Produces: working `/wallet` page with input + verdict display

- [ ] **Step 1: Create `components/RateLimitBanner.tsx`**

```typescript
// components/RateLimitBanner.tsx
'use client';

type Props = {
  remaining: number;
  resetAt: string;
};

export function RateLimitBanner({ remaining, resetAt }: Props) {
  const resetDate = new Date(resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="text-xs text-ink-soft tabular-nums">
      {remaining} investigation{remaining !== 1 ? 's' : ''} remaining today
      {remaining === 0 && ` — resets at ${resetDate}`}
    </div>
  );
}
```

- [ ] **Step 2: Create `components/WalletVerdictCard.tsx`**

```typescript
// components/WalletVerdictCard.tsx
'use client';

import type { WalletVerdict } from '@/lib/types';

const LEVEL_STYLES: Record<WalletVerdict['level'], string> = {
  CLEAN: 'text-green-700 bg-green-50 border-green-200',
  WATCH: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  FLAGGED: 'text-red-700 bg-red-50 border-red-200',
};

const DIRECTION_STYLES = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  bad: 'text-red-600',
};

const DIRECTION_ICON = { ok: '✓', warn: '⚠', bad: '✗' };

type Props = { verdict: WalletVerdict };

export function WalletVerdictCard({ verdict }: Props) {
  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-soft font-mono break-all">{verdict.address}</p>
          <p className="text-xs text-ink-soft uppercase tracking-widest mt-1">
            {verdict.chain} · {verdict.classification}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 border rounded-sm uppercase tracking-widest whitespace-nowrap ${LEVEL_STYLES[verdict.level]}`}>
          {verdict.level}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-ink text-pretty">{verdict.summary}</p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs tabular-nums text-ink-soft">
        {verdict.balanceUsd !== null && (
          <span>Balance: ${verdict.balanceUsd.toLocaleString()}</span>
        )}
        {verdict.firstSeen && (
          <span>First seen: {new Date(verdict.firstSeen).toLocaleDateString()}</span>
        )}
        {verdict.lastActive && (
          <span>Last active: {new Date(verdict.lastActive).toLocaleDateString()}</span>
        )}
        <span>Confidence: {verdict.confidence}</span>
      </div>

      {/* Signals */}
      <div className="space-y-1 border-t border-line pt-4">
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

- [ ] **Step 3: Create `app/(app)/wallet/page.tsx`**

```typescript
// app/(app)/wallet/page.tsx
'use client';

import { useState } from 'react';
import type { ApiResponse, WalletVerdict } from '@/lib/types';
import { WalletVerdictCard } from '@/components/WalletVerdictCard';
import { RateLimitBanner } from '@/components/RateLimitBanner';

export default function WalletPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse<WalletVerdict> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/investigate/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      });
      const json = await res.json() as ApiResponse<WalletVerdict>;
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
          <h1 className="text-2xl font-bold text-balance">Wallet Dossier</h1>
          <p className="text-sm text-ink-soft text-pretty mt-1">
            Enter a Solana or EVM wallet address to investigate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="0x... or Solana address"
            className="w-full bg-surface border border-line rounded-sm px-3 py-2 text-sm font-mono text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="w-full bg-ink text-bg text-sm font-semibold py-2 rounded-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Investigating…' : 'Investigate'}
          </button>
        </form>

        {result && (
          <div className="space-y-3">
            {result.ok ? (
              <WalletVerdictCard verdict={result.data} />
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
              {result.meta.cached ? 'Cached result · ' : ''}{result.meta.tookMs}ms
            </p>
          </div>
        )}

        <p className="text-xs text-ink-soft text-pretty border-t border-line pt-4">
          CARLI uses only public on-chain data for research purposes. Not financial advice. DYOR.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Test in browser**

```bash
npm run dev
```

Open `http://localhost:3000/wallet`. Enter a known Solana address (e.g., `5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1`). Verify: verdict card renders with level badge, signals, summary.


---

## Self-Review

**Spec coverage:**
- ✅ `/api/investigate/wallet` — Task 9
- ✅ Chain auto-detect Solana/EVM — Task 6
- ✅ Balance, first/last activity, classification — Tasks 7, 8, 9
- ✅ Gemini verdict via OpenRouter — Tasks 5, 8, 9
- ✅ Redis → Supabase cache 24h — Tasks 2, 3
- ✅ Rate limit 5/day per IP — Tasks 2, 4
- ✅ `ApiResponse<T>` envelope — Task 1
- ✅ Graceful degradation (null fields, fail-open on DB error) — Tasks 7, 9
- ✅ Disclaimer/ToS copy — Task 10
- ✅ UI renders verdict card — Task 10
- ✅ Animations transform+opacity only, no layout props — Task 10 (no animation added, correct)
- ✅ Keys server-side only — Tasks 5, 7, 9 (all env vars server-side)

**Placeholders:** None found.

**Type consistency:** `WalletVerdict` defined in Task 1, consumed in Tasks 8, 9, 10 with identical shape. `ApiResponse<T>` used consistently. `Chain` type used in Tasks 6, 7, 8, 9.
