// lib/data/dune.ts

export type DuneWalletData = {
  totalProfitUsd: number | null;
  tradeCount: number | null;
  classification: 'dev' | 'whale' | 'flipper' | 'fresh' | 'mixed' | null;
};

export async function fetchDuneWalletActivity(_address: string): Promise<DuneWalletData> {
  // Disabled — no public pump.fun query available.
  return { totalProfitUsd: null, tradeCount: null, classification: null };
}
