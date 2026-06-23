// lib/data/twitter-syndication.ts
// Free, no-login Twitter profile data via community embed proxies (fxtwitter / vxtwitter).
// These are the proxies behind Discord/Telegram embeds — built to be hit from anywhere,
// including datacenter IPs. Twitter's own endpoints (syndication, guest GraphQL) 429/block
// cloud IPs; these proxies do not.

export type TwitterProfile = {
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  followers: number | null;
  following: number | null;
  tweetCount: number | null;
  createdAt: string | null;
  accountAgeDays: number | null;
  isVerified: boolean;
  isBlueVerified: boolean;
  profileImageUrl: string | null;
};

export type TwitterFetchResult = {
  data: TwitterProfile | null;
  source: 'available' | 'not_found' | 'failed';
  reason?: string;
};

function ageDaysFrom(createdAt: string | null | undefined): number | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// --- fxtwitter: richest payload (joined + verification) ---
type FxUser = {
  screen_name?: string;
  name?: string;
  description?: string;
  raw_description?: { text?: string };
  followers?: number;
  following?: number;
  tweets?: number;
  joined?: string;
  verification?: { verified?: boolean; type?: string };
  avatar_url?: string;
};

async function fetchFx(handle: string): Promise<TwitterProfile | null> {
  const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) return null;
  const json = await res.json() as { code?: number; user?: FxUser };
  if (json.code !== 200 || !json.user?.screen_name) return null;
  const u = json.user;
  const verified = u.verification?.verified ?? false;
  return {
    displayName: u.name ?? null,
    handle: u.screen_name ?? handle,
    bio: u.raw_description?.text ?? u.description ?? null,
    followers: u.followers ?? null,
    following: u.following ?? null,
    tweetCount: u.tweets ?? null,
    createdAt: u.joined ?? null,
    accountAgeDays: ageDaysFrom(u.joined),
    isVerified: verified,
    isBlueVerified: verified,
    profileImageUrl: u.avatar_url ?? null,
  };
}

// --- vxtwitter: fallback (has created_at, no verification) ---
type VxUser = {
  screen_name?: string;
  name?: string;
  description?: string;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  created_at?: string;
  profile_image_url?: string;
};

async function fetchVx(handle: string): Promise<TwitterProfile | null> {
  const res = await fetch(`https://api.vxtwitter.com/${encodeURIComponent(handle)}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) return null;
  const u = await res.json() as VxUser;
  if (!u.screen_name) return null;
  return {
    displayName: u.name ?? null,
    handle: u.screen_name ?? handle,
    bio: u.description ?? null,
    followers: u.followers_count ?? null,
    following: u.following_count ?? null,
    tweetCount: u.tweet_count ?? null,
    createdAt: u.created_at ?? null,
    accountAgeDays: ageDaysFrom(u.created_at),
    isVerified: false,
    isBlueVerified: false,
    profileImageUrl: u.profile_image_url ?? null,
  };
}

export async function fetchTwitterProfile(handle: string): Promise<TwitterFetchResult> {
  const cleanHandle = handle.replace(/^@/, '');

  // Try fxtwitter (richest), fall back to vxtwitter.
  for (const [name, fn] of [['fxtwitter', fetchFx], ['vxtwitter', fetchVx]] as const) {
    try {
      const data = await fn(cleanHandle);
      if (data) return { data, source: 'available' };
    } catch (err) {
      console.error(`[twitter] ${name} ${cleanHandle} → ${(err as Error).message}`);
    }
  }

  return { data: null, source: 'failed', reason: 'all twitter proxies failed or handle not found' };
}
