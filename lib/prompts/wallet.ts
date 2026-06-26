// lib/prompts/wallet.ts
import type { Chain } from '../types';
import type { HeliusWalletData } from '../data/helius';
import type { EtherscanWalletData } from '../data/etherscan';
import type { DuneWalletData } from '../data/dune';

export const WALLET_SYSTEM_PROMPT = `You are CARLI — a crypto intelligence analyst. You receive wallet evidence and return a verdict as a JSON object. No prose, no markdown fences, just raw JSON.

CRITICAL: Output ONLY in English. All text fields (summary, signal values, etc) must be in English. Never output Indonesian or any other language.

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

Scoring rules:
- Wallet age < 7 days → +20 risk, flag "Fresh wallet (< 7 days)"
- Funded by known flagged cluster → +35 risk
- Average hold time < 1 hour → +15 risk, flag "Extreme flipper pattern"
- Balance < $1 and age < 14 days → +10 risk
- Age > 180 days → -10 risk (trust signal)
- Tx count > 500 → -5 risk (organic activity)
- Normal DeFi usage (Jupiter, Raydium, Uniswap) → -5 risk

Confidence:
- TENTATIVE: fresh wallet, few transactions
- FIRM: multiple corroborating signals
- CONFIRMED: clear on-chain evidence

Rules:
- CLEAN: score ≤ 5, no red flags
- WATCH: score 6-30, some suspicious signals
- FLAGGED: score > 30, strong evidence of scam/rug
- If data is missing (null), lower confidence, don't fabricate
- signals array: 3-6 items, cover the most important findings
- summary: 1-2 sentences max, direct`;

export function buildWalletEvidence(
  address: string,
  chain: Chain,
  helius: HeliusWalletData,
  etherscan: EtherscanWalletData,
  dune: DuneWalletData,
): string {
  if (chain === 'solana') {
    const parts = [
      `Wallet address: ${address}`,
      `Chain: Solana`,
      `Balance: ${helius.balanceSol !== null ? `${helius.balanceSol.toFixed(4)} SOL (~$${helius.balanceUsd ?? 'unknown'} USD)` : 'unknown'}`,
      `Token holdings: ${helius.tokenHoldings ? `${helius.tokenHoldings.length} SPL tokens` : 'unknown'}`,
      `First transaction: ${helius.firstTxTime ?? 'unknown'}`,
      `Last active: ${helius.lastTxTime ?? 'unknown'}`,
      `Transaction count: ${helius.txCount !== null ? `~${helius.txCount}+` : 'unknown'}`,
      `Funded by: ${helius.fundedBy ?? 'unknown'}`,
    ];

    // Pump.fun enrichment — only show if data exists
    if (dune.tradeCount !== null || dune.totalProfitUsd !== null) {
      parts.push(`Pump.fun trades: ${dune.tradeCount ?? 'unknown'}`);
      parts.push(`Pump.fun profit: $${dune.totalProfitUsd ?? 'unknown'} USD`);
    }

    return parts.join('\n');
  }

  // EVM
  const parts = [
    `Wallet address: ${address}`,
    `Chain: EVM (Ethereum)`,
    `Balance: ${etherscan.balanceWei !== null ? `${etherscan.balanceWei} wei` : 'unknown'}`,
    `ERC-20 tokens: ${etherscan.erc20Tokens ? `${etherscan.erc20Tokens.length} tokens` : 'unknown'}`,
    `First transaction: ${etherscan.firstTxTime ?? 'unknown'}`,
    `Last active: ${etherscan.lastTxTime ?? 'unknown'}`,
    `Transaction count: ${etherscan.txCount ?? 'unknown'}`,
    `Funded by: ${etherscan.fundedBy ?? 'unknown'}`,
  ];

  return parts.join('\n');
}
