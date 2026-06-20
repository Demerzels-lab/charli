// lib/cache.ts
import { supabaseAdmin } from './supabase';

const CACHE_TTL_HOURS = 24;

export async function getCache(key: string): Promise<unknown | null> {
  const { data, error } = await supabaseAdmin
    .from('cache')
    .select('payload, expires_at')
    .eq('key', key)
    .single();

  if (error || !data) return null;

  const isExpired = new Date(data.expires_at) < new Date();
  if (isExpired) {
    supabaseAdmin.from('cache').delete().eq('key', key);
    return null;
  }

  return data.payload;
}

export async function setCache(key: string, payload: unknown): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  await supabaseAdmin.from('cache').upsert(
    { key, payload, expires_at: expiresAt.toISOString() },
    { onConflict: 'key' }
  );
}
