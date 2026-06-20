// components/RateLimitBanner.tsx
'use client';

type Props = {
  remaining: number;
  resetAt: string;
};

export function RateLimitBanner({ remaining, resetAt }: Props) {
  const resetDate = resetAt ? new Date(resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="text-xs text-ink-soft tabular-nums">
      {remaining} investigation{remaining !== 1 ? 's' : ''} remaining today
      {remaining === 0 && resetDate && ` — resets at ${resetDate}`}
    </div>
  );
}
