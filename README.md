# CARLI

### AI-Powered Crypto Intelligence — Due Diligence in Seconds, Not Hours

<p align="center">
  <strong>98.6% of tokens on pump.fun end in a rug or dump.</strong><br>
  CARLI is the AI agent that tells you <em>before</em> you ape in.
</p>

---

## The Problem

Crypto is the fastest-moving market in the world — and the most dangerous.

- **50,000+ new tokens launch daily** across Solana, Ethereum, and L2s
- **$100B+ lost to rug pulls and scams** since 2020 (Chainalysis)
- Traders spend **hours per day** manually cross-referencing wallets, X accounts, and contracts
- Existing tools (Bubble Maps, DEX screeners) show *what* happened on-chain — **nobody shows *who* is behind it**
- AI tools can read smart contracts. **CARLI reads intent** — connecting on-chain behavior to social narratives

**The gap:** No product fuses on-chain data + social intelligence + AI reasoning into a single, instant verdict.

---

## The Solution

CARLI is an AI OSINT agent that investigates any crypto entity — wallet, project, or X account — and returns a structured risk verdict in seconds.

**How it works:**

1. User inputs a wallet address, contract, domain, or X handle
2. CARLI fans out to **real-time data sources** (Solana RPC, Etherscan, WHOIS, X syndication)
3. Claude's reasoning engine synthesizes raw evidence into a human-readable verdict with confidence scores
4. Structured result renders as a shareable report card

**Four core products:**

| Module | Input | Output |
|--------|-------|--------|
| **Wallet Dossier** | Any wallet address | Balance, tx history, funding source, linked projects, activity patterns |
| **Project OSINT** | Contract / domain / token name | Risk score (0-100), deployer verification, domain age, rug pattern flags |
| **X Account Intel** | X handle | Account age, follower trajectory, username history, crypto mention patterns |
| **Agent Mode** | Natural language chat | Open-ended investigation — paste anything, ask follow-ups, get synthesized answers |

All data is **public, on-chain, and real-time**. No logins. No subscriptions. No scraped private data.

---

## Market Opportunity

### Who pays for this?

| Segment | Pain | Willingness to Pay |
|---------|------|--------------------|
| **Active traders** (10M+ monthly on Solana DEXs alone) | Hours of manual research per trade | $20-50/mo for unlimited lookups |
| **DeFi protocols & DAOs** | Pre-launch due diligence on partners/tokens | $500-2K/mo API access |
| **Venture funds** | Screening deal flow at scale | $5K-20K/mo enterprise contracts |
| **Compliance / RegTech teams** | OSINT for KYC/AML workflows | $10K+/mo institutional tier |

### Market sizing

- **TAM:** $50B+ in annual crypto trading fees; 5-10% allocated to research and risk tooling = **$2.5-5B**
- **SAM:** On-chain intelligence + crypto OSINT tools = **$500M-1B** (growing 40%+ YoY)
- **SOM (Year 1-2):** 10K-50K paying users × $30/mo avg = **$3.6-18M ARR**

---

## Why CARLI Wins

### What exists today

| Tool | On-chain data | Social intel | AI reasoning | Instant verdict | API |
|------|:---:|:---:|:---:|:---:|:---:|
| Bubble Maps | ✅ | ✗ | ✗ | ✗ | Limited |
| DEX Screener | ✅ | ✗ | ✗ | ✗ | ✅ |
| TokenSniffer | ✅ | ✗ | Partial | ✅ | ✅ |
| Manual research | ✅ | ✅ | ✅ | ✗ | ✗ |
| **CARLI** | **✅** | **✅** | **✅** | **✅** | **✅** |

### Competitive moat

1. **Data fusion** — The hard part isn't accessing blockchain data. It's connecting a deployer wallet → the X account that shilled it → the domain registered 3 days before launch. CARLI does this automatically.
2. **Claude reasoning layer** — Not pattern matching. LLM-driven analysis that reads project copy against manipulation playbooks, detects narrative fraud, and explains its reasoning.
3. **Network effects** — Every investigation enriches the dataset. Repeated lookups on scam wallets build a reputation graph that compounds over time.
4. **Speed to market** — Landing page and 3/4 investigation modules live. Agent Mode in development. First-mover advantage in AI-native crypto OSINT.

---

## Business Model

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | 5 investigations/day, basic verdicts |
| **Pro** | $29/mo | Unlimited investigations, Agent Mode, exportable reports, API access |
| **Enterprise** | Custom | Dedicated API, bulk lookups, custom integrations, SLA |

**Additional revenue streams:**
- **API licensing** to DeFi protocols, wallets, and portfolio trackers (embed CARLI verdicts)
- **Data licensing** — aggregated risk scores and wallet reputation data
- **White-label** — embeddable investigation widget for exchanges and launchpads

---

## Product Status

### What's built (live)

- ✅ Landing page — polished, production-ready (Next.js 14, TypeScript, Tailwind)
- ✅ Wallet investigation — Solana + EVM, full tx history, funding path analysis
- ✅ Project OSINT — token contract analysis, domain WHOIS, rug pattern detection
- ✅ X Account Intel — account age, growth anomalies, username history
- ✅ Verdict cards — structured, shareable, real-time streaming
- ✅ Backend architecture — 12+ data source integrations (Helius, Etherscan, Dune, crt.sh, WHOIS, X syndication, RugCheck, SolSniffer, DexScreener)

### In development

- 🔄 Agent Mode — chat-based investigation with tool-calling Claude
- 🔄 Supabase auth + session persistence
- 🔄 Redis caching layer (24h TTL per entity)
- 🔄 Rate limiting + usage metering

### Tech stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, React Three Fiber (3D), motion/react
- **Backend:** Node.js + API routes, OpenRouter (Claude), Supabase (cache/auth)
- **Data:** Helius RPC (Solana), Etherscan, Dune Analytics, WHOIS, crt.sh, X syndication, RugCheck, SolSniffer, DexScreener
- **Infrastructure:** Vercel (frontend), Supabase (DB/cache)

---

## Roadmap

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| **Phase 1** | Now | Wallet + Project + X Account investigation (live) |
| **Phase 2** | Q3 2026 | Agent Mode launch, Supabase auth, Redis caching |
| **Phase 3** | Q4 2026 | API access for institutional clients, usage-based pricing |
| **Phase 4** | Q1 2027 | Predictive risk scoring — ML on historical rug patterns |
| **Phase 5** | Q2 2027 | Multi-chain expansion (Polygon, Arbitrum, Base, BSC) |

---

## The Ask

CARLI is raising to:

1. **Scale infrastructure** — Redis caching, rate limiting, multi-chain data pipelines
2. **Grow the team** — Backend engineer, ML engineer for predictive scoring, BD for institutional sales
3. **Go to market** — Trader community partnerships, exchange integrations, content marketing

---

## Team

**Caesar** — Founder & Product Lead
- Crypto-native researcher and builder
- Designed CARLI's investigation methodology, copy, and visual identity

---

## Links

- **Live demo:** [carli.id](https://carli.id) *(coming soon)*
- **Technical architecture:** See `DEV_BRIEF.md` in this repo
- **Contact:** [caesar@carli.id](mailto:caesar@carli.id)

---

<p align="center">
  <em>CARLI — Read the trail. Beat the rug.</em>
</p>
