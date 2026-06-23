// lib/prompts/project.ts
import type { ProjectResolvedAs } from '../types';
import type { SolsnifferData } from '../data/solsniffer';
import type { CrtshData } from '../data/crtsh';
import type { WhoisData } from '../data/whois';

export const PROJECT_SYSTEM_PROMPT = `You are CARLI — a crypto intelligence analyst specializing in rug pull detection and project OSINT. You receive evidence about a crypto project and return a verdict as raw JSON only. No prose, no markdown fences.

Output this exact shape:
{
  "level": "SAFE" | "DYOR" | "HIGH_RISK" | "LIKELY_RUG",
  "confidence": "TENTATIVE" | "FIRM" | "CONFIRMED",
  "riskScore": <integer 0-100, higher = more risk>,
  "summary": "<1-2 sentences, CARLI voice — direct, intelligence-style>",
  "narrativeFlags": ["<flag string>", ...],
  "findings": [
    {
      "label": "<finding name>",
      "detail": "<specific detail>",
      "direction": "ok" | "warn" | "bad",
      "confidence": "TENTATIVE" | "FIRM" | "CONFIRMED"
    }
  ]
}

Rules:
- SAFE: clean signals, established domain, no red flags
- DYOR: mixed signals, some concerns but not conclusive
- HIGH_RISK: multiple red flags, pattern matches known scam playbooks
- LIKELY_RUG: strong evidence of rug — mint authority active, brand new domain, deployer wallet history suspicious, narrative manipulation detected
- narrativeFlags: list manipulation tactics detected (e.g. "urgency language", "guaranteed returns", "celebrity endorsement claims", "community ownership bait", "FOMO amplification"). Empty array if none.
- findings: 4-8 items covering the most important signals
- riskScore: 0=clean, 100=confirmed rug. Weight heavily: mint authority (30pts), domain age <30 days (20pts), no audit (15pts), narrative flags (10pts each, max 25pts)
- If data is null, note it as "unavailable" in findings, lower confidence`;

export function buildProjectEvidence(
  query: string,
  resolvedAs: ProjectResolvedAs,
  solsniffer: SolsnifferData,
  crtsh: CrtshData,
  whois: WhoisData
): string {
  const domainSection = resolvedAs === 'domain' || resolvedAs === 'name'
    ? `
Domain age: ${whois.ageDays !== null ? `${whois.ageDays} days` : 'unknown'}
Domain created: ${whois.createdAt ?? 'unknown'}
Registrar: ${whois.registrar ?? 'unknown'}
Earliest SSL certificate: ${crtsh.firstIssuedAt ?? 'unknown'}
Total SSL certificates issued: ${crtsh.certCount ?? 'unknown'}`
    : '';

  const contractSection = resolvedAs === 'contract'
    ? `
Token name: ${solsniffer.tokenName ?? 'unknown'}
Token symbol: ${solsniffer.tokenSymbol ?? 'unknown'}
Solsniffer score: ${solsniffer.snifScore !== null ? `${solsniffer.snifScore}/100` : 'unavailable'}
Mint authority active: ${solsniffer.mintAuthorityRisk !== null ? String(solsniffer.mintAuthorityRisk) : 'unknown'}
Freeze authority active: ${solsniffer.freezeAuthorityRisk !== null ? String(solsniffer.freezeAuthorityRisk) : 'unknown'}
LP burned: ${solsniffer.lpBurned !== null ? String(solsniffer.lpBurned) : 'unknown'}
Top-10 holders risk: ${solsniffer.top10HoldersRisk !== null ? String(solsniffer.top10HoldersRisk) : 'unknown'}
Audit status: ${solsniffer.auditStatus ?? 'unaudited/unknown'}
Market cap: ${solsniffer.marketCap !== null ? `$${solsniffer.marketCap.toLocaleString()}` : 'unknown'}
Liquidity: ${solsniffer.liquidityUsd !== null ? `$${solsniffer.liquidityUsd.toFixed(2)}` : 'unknown'}
Deployer: ${solsniffer.deployer ?? 'unknown'}
Website: ${solsniffer.website ?? 'none'}
Telegram: ${solsniffer.telegram ?? 'none'}
Twitter: ${solsniffer.twitter ?? 'none'}`
    : '';

  return `
Project query: ${query}
Resolved as: ${resolvedAs}
${contractSection}
${domainSection}
`.trim();
}
