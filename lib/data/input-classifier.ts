// lib/data/input-classifier.ts
import type { ProjectResolvedAs } from '../types';

const EVM_CONTRACT_RE = /^0x[0-9a-fA-F]{40}$/;
const SOLANA_CONTRACT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DOMAIN_RE = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

export function classifyProjectInput(query: string): ProjectResolvedAs {
  const trimmed = query.trim();
  if (EVM_CONTRACT_RE.test(trimmed)) return 'contract';
  if (SOLANA_CONTRACT_RE.test(trimmed)) return 'contract';
  if (DOMAIN_RE.test(trimmed)) return 'domain';
  return 'name';
}
