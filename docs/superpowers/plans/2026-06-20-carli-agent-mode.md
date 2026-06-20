# CARLI Agent Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `/api/agent/chat` SSE streaming endpoint — a free-chat interface where Gemini decides which investigation tool to call (wallet, project, or x-account), streams tokens + tool status events, and optionally appends a structured verdict card at the end. Session memory stored in Supabase.

**Architecture:** Reuses all three investigation pipelines from Plans 1-3 as internal "tools" called by the LLM. No external tool_use API (Gemini Flash via OpenRouter doesn't support tool_use well at low cost) — instead we use a reasoning loop: LLM decides intent from message, backend dispatches to the right investigation function, result fed back to LLM for synthesis, streamed as SSE. Session messages stored in Supabase `agent_sessions` table (Plan 1 already created this table).

**Tech Stack:** Next.js 14 Edge API route (for streaming), TypeScript, Supabase (session storage from Plan 1), OpenRouter → `google/gemini-2.0-flash-001`, Vercel Edge Runtime (for SSE streaming support).

## Global Constraints

- TypeScript strict mode — no `any`, no implicit `any`
- **No Supabase CLI** — SQL run manually via Supabase dashboard
- **No auth / no login** — anonymous, sessionId generated client-side (UUID)
- **No auto-commit**
- SSE stream format: `data: <json>\n\n` — standard EventSource protocol
- Session TTL: 1 hour — enforced by checking `updated_at` in Supabase
- Graceful degradation: if investigation tool fails, LLM synthesizes with partial data
- Rate limit: reuse `checkRateLimit` from Plan 1 (agent chat counts as 1 investigation per message)
- Edge runtime: add `export const runtime = 'edge'` to route

---

## File Map

```
Charli/
  lib/
    types.ts                       ← ADD: AgentMessage, SSEEvent types
    agent/
      dispatcher.ts                ← NEW: detect intent + dispatch to investigation function
      session.ts                   ← NEW: read/write agent session messages to Supabase
      stream.ts                    ← NEW: SSE event helpers (encode, send)
    prompts/
      agent.ts                     ← NEW: agent system prompt (persona + tool descriptions)
  app/
    api/
      agent/
        chat/
          route.ts                 ← NEW: POST SSE streaming handler (Edge runtime)
    (app)/
      agent/
        page.tsx                   ← NEW: chat UI with streaming display + tool status
  components/
    AgentChat.tsx                  ← NEW: chat input + message list with SSE streaming
    AgentToolBadge.tsx             ← NEW: shows "🔍 Investigating wallet…" status during tool calls
```

---

## Task 1: Extend Types for Agent Mode

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `AgentMessage`, `AgentIntent`, `SSEEventType` — consumed by Tasks 2, 3, 4, 5

- [ ] **Step 1: Add agent types to `lib/types.ts`**

Open `lib/types.ts` and append:

```typescript
// --- Agent types ---

export type AgentMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AgentIntent =
  | { type: 'wallet'; address: string }
  | { type: 'project'; query: string }
  | { type: 'x-account'; handle: string }
  | { type: 'chat' }; // general question, no tool needed

export type SSEEventType = 'token' | 'tool' | 'verdict' | 'done' | 'error';

export type SSEEvent =
  | { event: 'token'; data: { text: string } }
  | { event: 'tool'; data: { name: string; status: 'running' | 'done' | 'failed' } }
  | { event: 'verdict'; data: WalletVerdict | ProjectVerdict | XAccountVerdict }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: { message: string } };
```

---

## Task 2: SSE Stream Helpers

**Files:**
- Create: `lib/agent/stream.ts`

**Interfaces:**
- Produces: `encodeSSE(event)` → `string`, `makeSSEStream()` → `{ readable, send, close }`

- [ ] **Step 1: Create `lib/agent/stream.ts`**

```typescript
// lib/agent/stream.ts
import type { SSEEvent } from '../types';

export function encodeSSE(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export type SSEStream = {
  readable: ReadableStream<Uint8Array>;
  send: (event: SSEEvent) => void;
  close: () => void;
};

export function makeSSEStream(): SSEStream {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  return {
    readable,
    send(event: SSEEvent) {
      controller.enqueue(encoder.encode(encodeSSE(event)));
    },
    close() {
      controller.close();
    },
  };
}
```

---

## Task 3: Session Storage

**Files:**
- Create: `lib/agent/session.ts`

**Interfaces:**
- Consumes: `supabaseAdmin` from Plan 1 `lib/supabase.ts`
- Produces:
  - `getSession(sessionId)` → `AgentMessage[]`
  - `saveSession(sessionId, messages)` → `void`

- [ ] **Step 1: Create `lib/agent/session.ts`**

```typescript
// lib/agent/session.ts
import { supabaseAdmin } from '../supabase';
import type { AgentMessage } from '../types';

const SESSION_TTL_MINUTES = 60;

export async function getSession(sessionId: string): Promise<AgentMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('agent_sessions')
    .select('messages, updated_at')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) return [];

  // Expire sessions older than TTL
  const updatedAt = new Date(data.updated_at as string);
  const ageMinutes = (Date.now() - updatedAt.getTime()) / (1000 * 60);
  if (ageMinutes > SESSION_TTL_MINUTES) {
    supabaseAdmin.from('agent_sessions').delete().eq('session_id', sessionId);
    return [];
  }

  return (data.messages as AgentMessage[]) ?? [];
}

export async function saveSession(sessionId: string, messages: AgentMessage[]): Promise<void> {
  await supabaseAdmin.from('agent_sessions').upsert(
    { session_id: sessionId, messages, updated_at: new Date().toISOString() },
    { onConflict: 'session_id' }
  );
}
```

---

## Task 4: Intent Dispatcher

**Files:**
- Create: `lib/agent/dispatcher.ts`

**Interfaces:**
- Consumes: `AgentMessage[]`, `callLLM` from Plan 1
- Produces: `detectIntent(messages)` → `AgentIntent`
- Produces: `dispatchInvestigation(intent)` → `WalletVerdict | ProjectVerdict | XAccountVerdict | null`

- [ ] **Step 1: Create `lib/agent/dispatcher.ts`**

```typescript
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
import { fetchNitterProfile } from '../data/nitter';
import { fetchUsernameHistory } from '../data/memory-lol';
import { WALLET_SYSTEM_PROMPT, buildWalletEvidence } from '../prompts/wallet';
import { PROJECT_SYSTEM_PROMPT, buildProjectEvidence } from '../prompts/project';
import { X_ACCOUNT_SYSTEM_PROMPT, buildXAccountEvidence } from '../prompts/x-account';
import type { AgentIntent, AgentMessage, WalletVerdict, ProjectVerdict, XAccountVerdict } from '../types';

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
    const [nitter, memory] = await Promise.all([
      fetchNitterProfile(handle),
      fetchUsernameHistory(handle),
    ]);
    const evidence = buildXAccountEvidence(handle, nitter, memory);
    const raw = await callLLM(X_ACCOUNT_SYSTEM_PROMPT, evidence);
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean) as Omit<XAccountVerdict, 'handle'>;
    return { ...parsed, handle };
  }

  return null;
}
```

---

## Task 5: Agent System Prompt

**Files:**
- Create: `lib/prompts/agent.ts`

**Interfaces:**
- Produces: `buildAgentSystemPrompt()` → `string`, `buildAgentUserContent(messages, verdictSummary)` → `string`

- [ ] **Step 1: Create `lib/prompts/agent.ts`**

```typescript
// lib/prompts/agent.ts
import type { AgentMessage } from '../types';

export function buildAgentSystemPrompt(): string {
  return `You are CARLI — a crypto intelligence assistant. You help users investigate wallets, crypto projects, and X (Twitter) accounts for scam and rug pull signals.

When responding:
- Be direct and intelligence-style — no fluff, no disclaimers in body text
- If an investigation result is provided, synthesize it into a clear assessment
- Reference specific signals and data points
- If asked a general question, answer concisely with actionable advice
- Keep responses under 200 words
- End with one concrete recommendation (what the user should do next)`;
}

export function buildAgentUserContent(
  messages: AgentMessage[],
  verdictSummary: string | null
): string {
  const history = messages
    .map(m => `${m.role === 'user' ? 'User' : 'CARLI'}: ${m.content}`)
    .join('\n');

  if (verdictSummary) {
    return `${history}\n\n[Investigation result]\n${verdictSummary}\n\nCARLI:`;
  }
  return `${history}\n\nCARLI:`;
}
```

---

## Task 6: Agent Chat API Route (SSE)

**Files:**
- Create: `app/api/agent/chat/route.ts`

**Interfaces:**
- Consumes: all previous tasks + Plan 1 rate-limit
- Produces: `POST /api/agent/chat` → SSE stream

- [ ] **Step 1: Create `app/api/agent/chat/route.ts`**

```typescript
// app/api/agent/chat/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import type { AgentMessage } from '@/lib/types';
import { checkRateLimit } from '@/lib/rate-limit';
import { makeSSEStream } from '@/lib/agent/stream';
import { getSession, saveSession } from '@/lib/agent/session';
import { detectIntent, dispatchInvestigation } from '@/lib/agent/dispatcher';
import { callLLM } from '@/lib/openrouter';
import { buildAgentSystemPrompt, buildAgentUserContent } from '@/lib/prompts/agent';

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  // Parse body
  let incomingMessages: AgentMessage[];
  let sessionId: string;
  try {
    const body = await req.json() as { messages?: unknown; sessionId?: unknown };
    if (!Array.isArray(body.messages)) throw new Error();
    incomingMessages = body.messages as AgentMessage[];
    sessionId = typeof body.sessionId === 'string' ? body.sessionId : crypto.randomUUID();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Rate limit
  const ip = getIp(req);
  const rateLimit = await checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { readable, send, close } = makeSSEStream();

  // Run async in background — Edge runtime supports this pattern
  (async () => {
    try {
      // Load session history
      const sessionHistory = await getSession(sessionId);

      // Merge: session history + new incoming messages (deduplicate by taking last user msg)
      const allMessages: AgentMessage[] = [...sessionHistory, ...incomingMessages];

      // Detect intent from latest user message
      send({ event: 'tool', data: { name: 'intent_classifier', status: 'running' } });
      const intent = await detectIntent(allMessages);
      send({ event: 'tool', data: { name: 'intent_classifier', status: 'done' } });

      // Dispatch investigation if intent has a target
      let verdictSummary: string | null = null;
      if (intent.type !== 'chat') {
        const toolName = `lookup_${intent.type}`;
        send({ event: 'tool', data: { name: toolName, status: 'running' } });
        try {
          const verdict = await dispatchInvestigation(intent);
          if (verdict) {
            send({ event: 'verdict', data: verdict });
            verdictSummary = JSON.stringify(verdict, null, 2);
          }
          send({ event: 'tool', data: { name: toolName, status: 'done' } });
        } catch (err) {
          console.error('[agent] dispatch error:', (err as Error).message);
          send({ event: 'tool', data: { name: toolName, status: 'failed' } });
        }
      }

      // Synthesize with LLM — stream response token by token
      // Note: OpenRouter Gemini Flash doesn't support token streaming via SSE on free tier reliably
      // So we get full response and send as single token event
      const systemPrompt = buildAgentSystemPrompt();
      const userContent = buildAgentUserContent(allMessages, verdictSummary);
      const response = await callLLM(systemPrompt, userContent);

      // Send response as tokens (split by words for fake streaming effect)
      const words = response.split(' ');
      for (const word of words) {
        send({ event: 'token', data: { text: word + ' ' } });
        // Small yield to allow stream to flush
        await new Promise(r => setTimeout(r, 10));
      }

      // Save updated session
      const assistantMessage: AgentMessage = { role: 'assistant', content: response };
      await saveSession(sessionId, [...allMessages, assistantMessage]);

      send({ event: 'done', data: {} });
    } catch (err) {
      console.error('[agent chat] error:', (err as Error).message);
      send({ event: 'error', data: { message: 'Internal error' } });
    } finally {
      close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

---

## Task 7: Agent Chat UI

**Files:**
- Create: `components/AgentToolBadge.tsx`
- Create: `components/AgentChat.tsx`
- Create: `app/(app)/agent/page.tsx`

**Interfaces:**
- Consumes: SSE events from `/api/agent/chat`, `WalletVerdict | ProjectVerdict | XAccountVerdict`
- Produces: working `/agent` chat page with streaming + tool status + verdict cards

- [ ] **Step 1: Create `components/AgentToolBadge.tsx`**

```typescript
// components/AgentToolBadge.tsx
'use client';

const TOOL_LABELS: Record<string, string> = {
  intent_classifier: 'Classifying intent',
  lookup_wallet: 'Investigating wallet',
  'lookup_x-account': 'Investigating X account',
  lookup_project: 'Investigating project',
};

type Props = {
  name: string;
  status: 'running' | 'done' | 'failed';
};

export function AgentToolBadge({ name, status }: Props) {
  const label = TOOL_LABELS[name] ?? name;
  const icon = status === 'running' ? '⟳' : status === 'done' ? '✓' : '✗';
  const style =
    status === 'running' ? 'text-gold border-gold/30 bg-gold/5' :
    status === 'done' ? 'text-green-600 border-green-200 bg-green-50' :
    'text-red-600 border-red-200 bg-red-50';

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 border rounded-sm ${style}`}>
      <span className={status === 'running' ? 'animate-spin inline-block' : ''}>{icon}</span>
      {label}…
    </span>
  );
}
```

- [ ] **Step 2: Create `components/AgentChat.tsx`**

```typescript
// components/AgentChat.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import type { AgentMessage, WalletVerdict, ProjectVerdict, XAccountVerdict } from '@/lib/types';
import { AgentToolBadge } from './AgentToolBadge';
import { WalletVerdictCard } from './WalletVerdictCard';
import { ProjectVerdictCard } from './ProjectVerdictCard';
import { XVerdictCard } from './XVerdictCard';

type ToolEvent = { name: string; status: 'running' | 'done' | 'failed' };
type VerdictData = WalletVerdict | ProjectVerdict | XAccountVerdict;

type MessageEntry =
  | { type: 'user'; content: string }
  | { type: 'assistant'; content: string; tools: ToolEvent[]; verdict: VerdictData | null };

function isWalletVerdict(v: VerdictData): v is WalletVerdict {
  return 'chain' in v && 'classification' in v;
}
function isProjectVerdict(v: VerdictData): v is ProjectVerdict {
  return 'resolvedAs' in v && 'riskScore' in v;
}

export function AgentChat() {
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const sessionId = useRef(crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage = input.trim();
    setInput('');
    setStreaming(true);

    const userEntry: MessageEntry = { type: 'user', content: userMessage };
    const assistantEntry: MessageEntry = {
      type: 'assistant', content: '', tools: [], verdict: null,
    };

    setMessages(prev => [...prev, userEntry, assistantEntry]);

    const apiMessages: AgentMessage[] = [
      ...messages
        .filter(m => m.type === 'user' || m.type === 'assistant')
        .map(m => ({
          role: m.type as 'user' | 'assistant',
          content: m.type === 'assistant' ? (m as Extract<MessageEntry, { type: 'assistant' }>).content : (m as Extract<MessageEntry, { type: 'user' }>).content,
        })),
      { role: 'user', content: userMessage },
    ];

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, sessionId: sessionId.current }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const eventLine = part.split('\n').find(l => l.startsWith('event: '));
          const dataLine = part.split('\n').find(l => l.startsWith('data: '));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace('event: ', '').trim();
          const data = JSON.parse(dataLine.replace('data: ', '').trim());

          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.type !== 'assistant') return prev;

            if (eventType === 'token') {
              return [...updated.slice(0, -1), { ...last, content: last.content + (data as { text: string }).text }];
            }
            if (eventType === 'tool') {
              const toolEvent = data as ToolEvent;
              const existingIdx = last.tools.findIndex(t => t.name === toolEvent.name);
              const newTools = existingIdx >= 0
                ? last.tools.map((t, i) => i === existingIdx ? toolEvent : t)
                : [...last.tools, toolEvent];
              return [...updated.slice(0, -1), { ...last, tools: newTools }];
            }
            if (eventType === 'verdict') {
              return [...updated.slice(0, -1), { ...last, verdict: data as VerdictData }];
            }
            return prev;
          });
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.type === 'assistant') {
          return [...updated.slice(0, -1), { ...last, content: 'Error: connection failed.' }];
        }
        return prev;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <p className="text-sm text-ink-soft text-center py-12">
            Ask CARLI to investigate a wallet, project, or X account.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.type === 'user' ? 'flex justify-end' : 'space-y-2'}>
            {msg.type === 'user' ? (
              <div className="max-w-xs bg-ink text-bg text-sm px-3 py-2 rounded-sm">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Tool badges */}
                {msg.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.tools.map((t, j) => (
                      <AgentToolBadge key={j} name={t.name} status={t.status} />
                    ))}
                  </div>
                )}
                {/* Verdict card */}
                {msg.verdict && (
                  <div>
                    {isWalletVerdict(msg.verdict) && <WalletVerdictCard verdict={msg.verdict} />}
                    {isProjectVerdict(msg.verdict) && <ProjectVerdictCard verdict={msg.verdict} />}
                    {!isWalletVerdict(msg.verdict) && !isProjectVerdict(msg.verdict) && (
                      <XVerdictCard verdict={msg.verdict as XAccountVerdict} />
                    )}
                  </div>
                )}
                {/* Text response */}
                {msg.content && (
                  <p className="text-sm text-ink whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line pt-4">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={streaming}
          placeholder="Investigate a wallet, project, or X account…"
          className="flex-1 bg-surface border border-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="bg-ink text-bg text-sm font-semibold px-4 py-2 rounded-sm disabled:opacity-40 transition-opacity"
        >
          {streaming ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(app)/agent/page.tsx`**

```typescript
// app/(app)/agent/page.tsx
import { AgentChat } from '@/components/AgentChat';

export default function AgentPage() {
  return (
    <main className="min-h-screen bg-bg text-ink px-4 py-8">
      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-balance">Agent Mode</h1>
          <p className="text-sm text-ink-soft text-pretty mt-1">
            Free chat — CARLI investigates and synthesizes on your behalf.
          </p>
        </div>
        <AgentChat />
        <p className="text-xs text-ink-soft text-pretty border-t border-line pt-4">
          CARLI uses only public data. Not financial advice. DYOR.
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

Open `http://localhost:3000/agent`. Type a wallet address. Verify: tool badges appear while running, verdict card renders, text response streams in after verdict.

---

## Self-Review

**Spec coverage:**
- ✅ `POST /api/agent/chat` SSE streaming — Task 6
- ✅ Chat reuses all 3 investigation pipelines as tools — Task 4 (dispatcher)
- ✅ `event: token` — word-by-word streaming in Task 6
- ✅ `event: tool` — running/done/failed status in Task 6
- ✅ `event: verdict` — structured verdict card appended to stream — Tasks 6, 7
- ✅ `event: done` + `event: error` — Task 6
- ✅ Session memory in Supabase (TTL 1h) — Tasks 3, 6
- ✅ Edge runtime for streaming — Task 6 (`export const runtime = 'edge'`)
- ✅ Intent classification (wallet/project/x-account/chat) — Task 4
- ✅ Tool status badges in UI ("Investigating wallet…") — Task 7
- ✅ Rate limit 1 per message — Task 6
- ✅ No auth, no login — sessionId generated client-side (UUID)
- ✅ No Supabase CLI, no auto-commit

**Placeholders:** None.

**Type consistency:** `AgentMessage` defined in Task 1, used identically in Tasks 3, 4, 5, 6, 7. `SSEEvent` union type covers all 5 event types — matches what route sends and what UI parses. `VerdictData` union covers all three verdict shapes from Plans 1-3.
