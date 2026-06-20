// lib/prompts/x-account.ts
import type { NitterProfile } from '../data/nitter';
import type { MemoryLolData } from '../data/memory-lol';

export const X_ACCOUNT_SYSTEM_PROMPT = `You are CARLI — a crypto intelligence analyst specializing in social media account analysis. You detect fake engagement, hijacked accounts, and coordinated scam promotion. Return a verdict as raw JSON only. No prose, no markdown fences.

Output this exact shape:
{
  "level": "LEGIT" | "DYOR" | "RED_FLAG",
  "confidence": "TENTATIVE" | "FIRM" | "CONFIRMED",
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

Rules:
- LEGIT: consistent identity, organic growth signals, no suspicious patterns
- DYOR: mixed signals — some concerns but not conclusive
- RED_FLAG: high username change count (>3 changes), new account with explosive follower growth, account age doesn't match crypto history, clear hijack/impersonation pattern
- Problem 01 (fake engagement): very high follower/following ratio on a young account is a warning sign
- Problem 02 (hijacked account): many username changes + sudden pivot to crypto = red flag
- signals: 3-6 items, be specific about dates and numbers
- redFlags: only concrete red flags, empty array if none
- firstCryptoMentionDays: always return null
- usernameChanges: use the number provided in evidence; if "no history found" return null not 0`;

export function buildXAccountEvidence(
  handle: string,
  nitter: NitterProfile,
  memory: MemoryLolData
): string {
  const usernameHistoryStr = memory.usernameHistory.length > 0
    ? memory.usernameHistory.map(u =>
        `  - @${u.handle}${u.activeFrom ? ` (from ${u.activeFrom}` : ''}${u.activeTo ? ` to ${u.activeTo})` : u.activeFrom ? ')' : ''}`
      ).join('\n')
    : '  No history found';

  const cryptoKeywords = ['crypto', 'nft', 'token', 'defi', 'web3', 'bitcoin', 'eth', 'sol', 'pump', 'moon', 'coin', 'dex', 'yield'];
  const bioHasCrypto = nitter.bio
    ? cryptoKeywords.some(kw => nitter.bio!.toLowerCase().includes(kw))
    : false;

  return `
Handle: @${handle}
Display name: ${nitter.displayName ?? 'unknown'}
Account age: ${nitter.accountAgeDays !== null ? `${nitter.accountAgeDays} days` : 'unknown'}
Followers: ${nitter.followers !== null ? nitter.followers.toLocaleString() : 'unknown'}
Following: ${nitter.following !== null ? nitter.following.toLocaleString() : 'unknown'}
Tweet count: ${nitter.tweetCount !== null ? nitter.tweetCount.toLocaleString() : 'unknown'}
Verified: ${nitter.isVerified ? 'yes' : 'no'}
Bio: ${nitter.bio ?? 'none'}
Bio contains crypto keywords: ${bioHasCrypto ? 'yes' : 'no'}
Total username changes: ${memory.totalChanges} (${memory.usernameHistory.length > 0 ? 'history available' : 'no history found in archive'})
Username history:
${usernameHistoryStr}
`.trim();
}
