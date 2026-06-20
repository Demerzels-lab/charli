// lib/data/chain-detect.ts
import type { Chain } from '../types';

const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_RE = /^0x[0-9a-fA-F]{40}$/;

export function detectChain(address: string): Chain | null {
  const trimmed = address.trim();
  if (EVM_RE.test(trimmed)) return 'evm';
  if (SOLANA_RE.test(trimmed)) return 'solana';
  return null;
}
