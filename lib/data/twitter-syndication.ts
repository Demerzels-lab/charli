// lib/data/twitter-syndication.ts
// Free, no-login Twitter profile data via the public guest-token GraphQL path.
// This is the unauthenticated path used by logged-out web/embeds. Unlike the
// syndication CDN (which 429s datacenter IPs), the guest path works from Vercel.

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

// Public guest bearer token used by Twitter's own logged-out web client.
const GUEST_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const USER_QUERY_ID = 'G3KGOASz96M-Qu0nwmGXNg';

const FEATURES = {
  hidden_profile_likes_enabled: false,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  subscriptions_verification_info_is_identity_verified_enabled: false,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
};

type LegacyUser = {
  name?: string;
  screen_name?: string;
  description?: string;
  followers_count?: number;
  friends_count?: number;
  statuses_count?: number;
  created_at?: string;
  verified?: boolean;
  profile_image_url_https?: string;
};

function ageDaysFrom(createdAt: string | undefined): number | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function getGuestToken(): Promise<string | null> {
  try {
    const res = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GUEST_BEARER}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { guest_token?: string };
    return json.guest_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchTwitterProfile(handle: string): Promise<TwitterFetchResult> {
  const cleanHandle = handle.replace(/^@/, '');

  try {
    const guestToken = await getGuestToken();
    if (!guestToken) {
      console.error(`[twitter-syndication] ${cleanHandle} → guest token failed`);
      return { data: null, source: 'failed', reason: 'guest token activation failed' };
    }

    const variables = encodeURIComponent(
      JSON.stringify({ screen_name: cleanHandle, withSafetyModeUserFields: true })
    );
    const features = encodeURIComponent(JSON.stringify(FEATURES));
    const url = `https://api.twitter.com/graphql/${USER_QUERY_ID}/UserByScreenName?variables=${variables}&features=${features}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GUEST_BEARER}`,
        'x-guest-token': guestToken,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[twitter-syndication] ${cleanHandle} → HTTP ${res.status}`);
      return { data: null, source: 'failed', reason: `graphql ${res.status}` };
    }

    const json = await res.json() as {
      data?: { user?: { result?: { legacy?: LegacyUser; is_blue_verified?: boolean; __typename?: string } } };
    };

    const result = json.data?.user?.result;
    if (!result || result.__typename === 'UserUnavailable' || !result.legacy) {
      return { data: null, source: 'not_found', reason: 'user not found' };
    }

    const l = result.legacy;
    const profile: TwitterProfile = {
      displayName: l.name ?? null,
      handle: l.screen_name ?? cleanHandle,
      bio: l.description ?? null,
      followers: l.followers_count ?? null,
      following: l.friends_count ?? null,
      tweetCount: l.statuses_count ?? null,
      createdAt: l.created_at ?? null,
      accountAgeDays: ageDaysFrom(l.created_at),
      isVerified: l.verified ?? false,
      isBlueVerified: result.is_blue_verified ?? false,
      profileImageUrl: l.profile_image_url_https ?? null,
    };

    return { data: profile, source: 'available' };
  } catch (err) {
    console.error(`[twitter-syndication] ${cleanHandle} → ${(err as Error).message}`);
    return { data: null, source: 'failed', reason: (err as Error).message };
  }
}
