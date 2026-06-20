// lib/data/nitter.ts
import { parse } from 'node-html-parser';

export type NitterProfile = {
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  followers: number | null;
  following: number | null;
  joinedRaw: string | null;
  accountAgeDays: number | null;
  tweetCount: number | null;
  isVerified: boolean;
};

const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
];

function parseCount(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '').trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function parseJoinDate(raw: string | null): number | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function fetchNitterProfile(handle: string): Promise<NitterProfile> {
  const cleanHandle = handle.replace(/^@/, '');
  const empty: NitterProfile = {
    displayName: null, handle: null, bio: null, followers: null,
    following: null, joinedRaw: null, accountAgeDays: null, tweetCount: null, isVerified: false,
  };

  try {
    let res: Response | null = null;
    for (const base of NITTER_INSTANCES) {
      try {
        const r = await fetch(`${base}/${cleanHandle}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CARLI/1.0; research tool)',
            Accept: 'text/html',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (r.status === 404) return empty;
        if (r.ok) { res = r; break; }
      } catch { continue; }
    }
    if (!res) throw new Error('All Nitter instances failed');

    const html = await res.text();
    const root = parse(html);

    const displayName = root.querySelector('.profile-card-fullname')?.text?.trim() ?? null;
    const bio = root.querySelector('.profile-bio')?.text?.trim() ?? null;
    const joinedRaw = root.querySelector('.profile-joindate span')?.getAttribute('title') ?? null;
    const isVerified = root.querySelector('.icon-ok.verified-icon') !== null;

    const statEntries = root.querySelectorAll('.profile-stat-num');
    const tweets = parseCount(statEntries[0]?.text);
    const following = parseCount(statEntries[1]?.text);
    const followers = parseCount(statEntries[2]?.text);

    return {
      displayName,
      handle: cleanHandle,
      bio,
      followers,
      following,
      joinedRaw,
      accountAgeDays: parseJoinDate(joinedRaw),
      tweetCount: tweets,
      isVerified,
    };
  } catch (err) {
    console.error('[nitter] fetch error:', (err as Error).message);
    return empty;
  }
}
