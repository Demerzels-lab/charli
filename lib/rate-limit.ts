// lib/rate-limit.ts
import { supabaseAdmin } from './supabase';

const DAILY_LIMIT = 5;

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
};

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const today = new Date().toISOString().split('T')[0];

  const resetAt = new Date();
  resetAt.setUTCHours(24, 0, 0, 0);
  const resetAtIso = resetAt.toISOString();

  const { data, error } = await supabaseAdmin.rpc('increment_rate_limit', {
    p_ip: ip,
    p_date: today,
    p_limit: DAILY_LIMIT,
  });

  if (error) {
    console.error('[rate-limit] DB error:', error.message);
    return { allowed: true, remaining: DAILY_LIMIT, resetAt: resetAtIso };
  }

  const count: number = data as number;
  const allowed = count <= DAILY_LIMIT;
  const remaining = Math.max(0, DAILY_LIMIT - count);

  return { allowed, remaining, resetAt: resetAtIso };
}
