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
    const [balanceRes, txsDesc, txsAsc] = await Promise.all([
      fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
      }).then(r => r.json()) as Promise<{ result?: { value?: number } }>,
      fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=1`),
      fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=100`),
    ]);

    const lamports = balanceRes?.result?.value ?? null;
    const SOL_PRICE = 150; // rough estimate
    const balanceUsd = lamports !== null ? (lamports / 1e9) * SOL_PRICE : null;

    const lastTxs = txsDesc.ok ? (await txsDesc.json()) as Array<{ timestamp?: number }> : [];
    const allTxs = txsAsc.ok ? (await txsAsc.json()) as Array<{ timestamp?: number }> : [];

    const lastTxTime = lastTxs[0]?.timestamp
      ? new Date(lastTxs[0].timestamp * 1000).toISOString()
      : null;

    const sorted = allTxs.filter(t => t.timestamp).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    const firstTxTime = sorted[0]?.timestamp
      ? new Date(sorted[0].timestamp * 1000).toISOString()
      : null;

    return { balanceUsd, firstTxTime, lastTxTime };
  } catch (err) {
    console.error('[helius] fetch error:', (err as Error).message);
    return { balanceUsd: null, firstTxTime: null, lastTxTime: null };
  }
}
