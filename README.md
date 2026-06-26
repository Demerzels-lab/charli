# CARLI — Crypto OSINT Intelligence Agent

**The due diligence platform for crypto traders and researchers.**

In crypto markets, **nobody scams in a vacuum**. They leave a trail: a wallet, an X account, a domain, a pattern. CARLI reads these trails the way an analyst would—synthesizing on-chain data, social signals, and account histories to answer one question: *is this legitimate?*

## The Problem

- **98.6% of tokens on pump.fun end in a rug or dump** (Solana Token Sniffer data)
- **50K+ new tokens launch daily** across Solana, Ethereum, and layer-2s
- Existing tools (Bubble Maps, blockchain screeners) show *what* happened, not *who* is behind it
- Traders spend hours manually cross-referencing wallets, X accounts, and domain registrations
- AI tools can read code. **CARLI reads intent** — connecting on-chain behavior to social narratives

## The Solution: CARLI

CARLI is an AI-powered OSINT agent that investigates crypto projects and wallets by:

1. **Wallet Dossier** — Full transaction history, funding source, linked projects, activity patterns
2. **Project OSINT** — Token contract analysis, deployer verification, domain registration age, rug pattern detection
3. **X Account Intel** — Account age, follower growth trajectory, username history, verification status, crypto mention patterns
4. **Agent Mode** — Chat-based investigation: paste a wallet/project/handle, ask follow-up questions, get synthesized verdicts

All data is **public, on-chain, and real-time**. CARLI chains Claude's reasoning over Helius (Solana) and Etherscan APIs, returning structured verdicts with confidence scores.

## Market Opportunity

- **Crypto traders**: 10M+ active on Solana DEXs alone (monthly)
- **DeFi protocols**: need pre-launch due diligence on partners
- **Venture firms**: screening tokenomics + team legitimacy at scale
- **Compliance teams**: OSINT for KYC/AML workflows

TAM: $50B+ in crypto trading fees annually, 5–10% allocated to research/risk mitigation.

## Features

### Core Capabilities
- **Wallet investigation**: balance, tx history, funding path, activity heatmap
- **Project risk scoring**: tokenomics red flags, rug pattern detection, domain age
- **Account profiling**: growth anomalies, credential verification, social network analysis
- **Cross-reference linking**: connect deployer → token → social accounts → ecosystem

### Technical Edge
- **Real-time on-chain data** via Helius (Solana) + Etherscan (EVM)
- **Social signal integration** via X API + domain WHOIS
- **Claude-powered reasoning** — structured verdicts with explanations
- **No UI lock-in** — API-first, chat-based, scriptable

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Three Fiber (3D)
- **Backend**: Node.js, OpenRouter (Claude API), Supabase (cache/auth)
- **Data**: Helius RPC (Solana), Etherscan API, Dune Analytics (enrichment)
- **UI/UX**: motion/react (animations), custom verdict cards, real-time streaming

## Getting Started

```bash
# Install
npm install

# Development
npm run dev          # http://localhost:3000
HELIUS_API_KEY=...  # Set Solana RPC key
ETHERSCAN_API_KEY=...  # Set EVM RPC key

# Production
npm run build
npm start
```

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENROUTER_API_KEY=...       # Claude API access
HELIUS_API_KEY=...            # Solana blockchain data
ETHERSCAN_API_KEY=...         # EVM blockchain data
```

## Roadmap

**Phase 1 (Live)**: Wallet + Project + X Account investigation  
**Phase 2**: Agent Mode chat (open-ended OSINT)  
**Phase 3**: API access for institutional clients  
**Phase 4**: Predictive risk scoring (ML on historical rug patterns)  
**Phase 5**: Multi-chain expansion (Polygon, Arbitrum, Base)

## Why CARLI Wins

| Feature | Competitors | CARLI |
|---------|-------------|-------|
| Wallet analysis | ✓ (Bubble Maps) | ✓ + funding path + linked projects |
| Account verification | ✓ (manual) | ✓ Automated + growth anomaly detection |
| Rug pattern detection | ✗ | ✓ (Claude reasoning) |
| Social + on-chain fusion | ✗ | ✓ (core feature) |
| API access | Limited | ✓ (future) |

## License

Proprietary. Crypto OSINT research — licensed for non-commercial research under fair use.

---

**Questions?** This repo contains the full landing page and Agent Mode chat. For backend architecture, deployment, or partnership inquiries, see `DEV_BRIEF.md`.
