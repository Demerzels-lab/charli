# CARLI SDD Progress Ledger

## Plan 1: Foundation + Wallet Dossier — COMPLETE

- [x] Task 1: Shared Types — lib/types.ts
- [x] Task 2: Supabase Setup — lib/supabase.ts + supabase/migrations/001_foundation.sql
- [x] Task 3: Cache Layer — lib/cache.ts
- [x] Task 4: Rate Limit Layer — lib/rate-limit.ts
- [x] Task 5: OpenRouter Wrapper — lib/openrouter.ts
- [x] Task 6: Chain Detection — lib/data/chain-detect.ts
- [x] Task 7: Wallet Data Fetchers — lib/data/solscan.ts, helius.ts, etherscan.ts, dune.ts
- [x] Task 8: Wallet Verdict Prompt — lib/prompts/wallet.ts
- [x] Task 9: Wallet API Route — app/api/investigate/wallet/route.ts
- [x] Task 10: Wallet Verdict UI — components/WalletVerdictCard.tsx, RateLimitBanner.tsx, app/(app)/wallet/page.tsx

## Plan 2: Project OSINT — COMPLETE

- [x] Task 1: Input Classifier — lib/data/input-classifier.ts
- [x] Task 2: Project Data Fetchers — lib/data/solsniffer.ts, crtsh.ts, whois.ts
- [x] Task 3: Project Verdict Prompt — lib/prompts/project.ts
- [x] Task 4: Project API Route — app/api/investigate/project/route.ts
- [x] Task 5: Project Verdict UI — components/ProjectVerdictCard.tsx, app/(app)/project/page.tsx

## Plan 3: X Account Intel — COMPLETE

- [x] Task 1: Nitter Scraper — lib/data/nitter.ts
- [x] Task 2: memory.lol Fetcher — lib/data/memory-lol.ts
- [x] Task 3: X Account Prompt — lib/prompts/x-account.ts
- [x] Task 4: X Account API Route — app/api/investigate/x-account/route.ts
- [x] Task 5: X Verdict UI — components/XVerdictCard.tsx, app/(app)/x-account/page.tsx

## Plan 4: Agent Mode — COMPLETE

- [x] Task 1: SSE Stream Helpers — lib/agent/stream.ts
- [x] Task 2: Session Layer — lib/agent/session.ts
- [x] Task 3: Intent Dispatcher — lib/agent/dispatcher.ts
- [x] Task 4: Agent Prompt — lib/prompts/agent.ts
- [x] Task 5: Agent Chat Route — app/api/agent/chat/route.ts (Edge runtime, SSE)
- [x] Task 6: AgentToolBadge — components/AgentToolBadge.tsx
- [x] Task 7: AgentChat + Agent Page — components/AgentChat.tsx, app/(app)/agent/page.tsx
