// lib/data/dune.ts
// Pump.fun enrichment — optional, not used as primary wallet data.
// If wallet has no pump.fun activity, callers should omit this section entirely.

export type DuneWalletData = {
  totalProfitUsd: number | null;
  tradeCount: number | null;
  classification: 'dev' | 'whale' | 'flipper' | 'fresh' | 'mixed' | null;
};

export async function fetchDuneWalletActivity(_address: string): Promise<DuneWalletData> {
  // Disabled — no public pump.fun query available.
  // When kukapay/pumpfun-wallets-mcp is integrated, wire it here.
  return { totalProfitUsd: null, tradeCount: null, classification: null };
}
