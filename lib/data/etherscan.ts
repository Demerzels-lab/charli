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
