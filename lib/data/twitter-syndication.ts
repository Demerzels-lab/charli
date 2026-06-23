// lib/data/twitter-syndication.ts
// Twitter's own embed/syndication CDN — free, no auth, no login, pure JSON.
// Works server-side on Vercel (no HTML parser, no ESM module conflicts).

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

const SYNDICATION_URL = 'https://syndication.twitter.com/srv/timeline-profile/screen-name';

type RawUser = {
  name?: string;
  screen_name?: string;
  description?: string;
  followers_count?: number;
  friends_count?: number;
  statuses_count?: number;
  created_at?: string;
  verified?: boolean;
  is_blue_verified?: boolean;
  profile_image_url_https?: string;
};

function ageDaysFrom(createdAt: string | undefined): number | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export async function fetchTwitterProfile(handle: string): Promise<TwitterFetchResult> {
  const cleanHandle = handle.replace(/^@/, '');

  try {
    const res = await fetch(`${SYNDICATION_URL}/${encodeURIComponent(cleanHandle)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { data: null, source: 'failed', reason: `syndication ${res.status}` };
    }

    const html = await res.text();

    // Extract embedded Next.js JSON payload.
    const match = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!match) {
      return { data: null, source: 'not_found', reason: 'no embedded data — handle may not exist' };
    }

    const json = JSON.parse(match[1]) as {
      props?: {
        pageProps?: {
          timeline?: { entries?: Array<{ content?: { tweet?: { user?: RawUser } } }> };
        };
      };
    };

    const entries = json.props?.pageProps?.timeline?.entries ?? [];
    let user: RawUser | undefined;
    for (const e of entries) {
      const u = e.content?.tweet?.user;
      if (u?.screen_name?.toLowerCase() === cleanHandle.toLowerCase()) {
        user = u;
        break;
      }
    }
    // Fallback: first available user object.
    if (!user) user = entries[0]?.content?.tweet?.user;

    if (!user || !user.screen_name) {
      return { data: null, source: 'not_found', reason: 'profile not present in timeline' };
    }

    const profile: TwitterProfile = {
      displayName: user.name ?? null,
      handle: user.screen_name ?? cleanHandle,
      bio: user.description ?? null,
      followers: user.followers_count ?? null,
      following: user.friends_count ?? null,
      tweetCount: user.statuses_count ?? null,
      createdAt: user.created_at ?? null,
      accountAgeDays: ageDaysFrom(user.created_at),
      isVerified: user.verified ?? false,
      isBlueVerified: user.is_blue_verified ?? false,
      profileImageUrl: user.profile_image_url_https ?? null,
    };

    return { data: profile, source: 'available' };
  } catch (err) {
    return { data: null, source: 'failed', reason: (err as Error).message };
  }
}
