// lib/prompts/x-account.ts
import type { TwitterProfile } from '../data/twitter-syndication';
import type { MemoryLolData } from '../data/memory-lol';
import type { DataCompleteness } from '../types';

export const X_ACCOUNT_SYSTEM_PROMPT = `You are CARLI — a crypto intelligence analyst specializing in social media account analysis. You detect fake engagement, hijacked accounts, and coordinated scam promotion. Return a verdict as raw JSON only. No prose, no markdown fences.

Output this exact shape:
{
  "level": "LEGIT" | "DYOR" | "RED_FLAG" | "UNVERIFIABLE",
  "confidence": "UNKNOWN" | "TENTATIVE" | "FIRM" | "CONFIRMED",
  "summary": "<1-2 sentences, CARLI voice — direct, intelligence-style>",
  "metrics": {
    "accountAgeDays": <number or null>,
    "followers": <number or null>,
    "following": <number or null>,
    "usernameChanges": <number or null>,
    "firstCryptoMentionDays": null
  },
  "signals": [
    { "label": "<signal name>", "value": "<finding>", "direction": "ok" | "warn" | "bad" }
  ],
  "redFlags": ["<flag string>", ...]
}

CRITICAL — MISSING DATA IS NOT A RED FLAG:
- Absence of data (unknown followers, unknown age, empty bio in evidence) is NOT suspicious by itself. It means we could not fetch it.
- NEVER output RED_FLAG because data is missing. Missing data → UNVERIFIABLE with confidence UNKNOWN.
- Only flag PATTERNS that exist in AVAILABLE data, never the absence of data.

LEVEL RULES:
- UNVERIFIABLE: data completeness is "minimal" (no profile data fetched). confidence MUST be UNKNOWN. summary states we could not retrieve enough public data to assess. redFlags MUST be empty. signals describe only what IS known.
- LEGIT: profile data available AND shows consistent identity, organic signals, no suspicious patterns. A verified account (verified or blue verified) with large established following and old account age is strong LEGIT evidence.
- DYOR: profile data available but mixed signals — some concerns, not conclusive.
- RED_FLAG: profile data available AND shows concrete suspicious patterns: >3 username changes, young account (<90 days) with explosive follower count, account age inconsistent with crypto pivot, clear impersonation (name mimics a famous figure but tiny/new account).

VERIFIED ACCOUNT GUIDANCE:
- If isVerified or isBlueVerified is true AND followers are in the millions AND account is years old → this is almost certainly a legitimate established account. Output LEGIT with FIRM/CONFIRMED confidence. Do not flag it.

CONFIDENCE:
- UNKNOWN: minimal data
- TENTATIVE: partial data
- FIRM: full data, clear assessment
- CONFIRMED: full data + verified status corroborates

SIGNALS:
- 3-6 items, specific about dates and numbers from available data
- direction "ok" = reassuring, "warn" = mild concern, "bad" = genuine red flag
- usernameChanges: use number from evidence; if "no history found" return null not 0
- firstCryptoMentionDays: always null`;

export function computeCompleteness(
  twitterAvailable: boolean,
  memoryAvailable: boolean
): DataCompleteness {
  if (twitterAvailable && memoryAvailable) return 'full';
  if (twitterAvailable || memoryAvailable) return 'partial';
  return 'minimal';
}

export function buildXAccountEvidence(
  handle: string,
  twitter: TwitterProfile | null,
  memory: MemoryLolData,
  completeness: DataCompleteness
): string {
  const cryptoKeywords = ['crypto', 'nft', 'token', 'defi', 'web3', 'bitcoin', 'eth', 'sol', 'pump', 'moon', 'coin', 'dex', 'yield'];
  const bioHasCrypto = twitter?.bio
    ? cryptoKeywords.some(kw => twitter.bio!.toLowerCase().includes(kw))
    : false;

  const usernameHistoryStr = memory.usernameHistory.length > 0
    ? memory.usernameHistory.map(u =>
        `  - @${u.handle}${u.activeFrom ? ` (from ${u.activeFrom}` : ''}${u.activeTo ? ` to ${u.activeTo})` : u.activeFrom ? ')' : ''}`
      ).join('\n')
    : '  No history found';

  const profileBlock = twitter
    ? `Display name: ${twitter.displayName ?? 'unknown'}
Account age: ${twitter.accountAgeDays !== null ? `${twitter.accountAgeDays} days` : 'unknown'}
Account created: ${twitter.createdAt ?? 'unknown'}
Followers: ${twitter.followers !== null ? twitter.followers.toLocaleString() : 'unknown'}
Following: ${twitter.following !== null ? twitter.following.toLocaleString() : 'unknown'}
Tweet count: ${twitter.tweetCount !== null ? twitter.tweetCount.toLocaleString() : 'unknown'}
Verified (legacy): ${twitter.isVerified ? 'yes' : 'no'}
Blue verified: ${twitter.isBlueVerified ? 'yes' : 'no'}
Bio: ${twitter.bio ?? 'none'}
Bio contains crypto keywords: ${bioHasCrypto ? 'yes' : 'no'}`
    : 'PROFILE DATA UNAVAILABLE — could not fetch from Twitter. Do NOT treat this as suspicious.';

  return `
Handle: @${handle}
Data completeness: ${completeness}

--- Twitter profile ---
${profileBlock}

--- Username history (memory.lol archive) ---
Total username changes: ${memory.usernameHistory.length > 0 ? memory.totalChanges : 'no history found in archive'}
${usernameHistoryStr}

Analyze using AVAILABLE data only. If completeness is "minimal", return UNVERIFIABLE / UNKNOWN with empty redFlags.
`.trim();
}
