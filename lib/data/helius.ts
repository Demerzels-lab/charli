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
