// components/XVerdictCard.tsx
'use client';

import type { XAccountVerdict } from '@/lib/types';

const LEVEL_STYLES: Record<XAccountVerdict['level'], string> = {
  LEGIT: 'text-green-700 bg-green-50 border-green-200',
  DYOR: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  RED_FLAG: 'text-red-700 bg-red-50 border-red-200',
};

const DIRECTION_STYLES = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  bad: 'text-red-600',
};

const DIRECTION_ICON = { ok: '✓', warn: '⚠', bad: '✗' };

type Props = { verdict: XAccountVerdict };

export function XVerdictCard({ verdict }: Props) {
  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">@{verdict.handle}</p>
          <p className="text-xs text-ink-soft uppercase tracking-widest mt-1">
            X Account · {verdict.confidence}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 border rounded-sm uppercase tracking-widest whitespace-nowrap ${LEVEL_STYLES[verdict.level]}`}>
          {verdict.level.replace('_', ' ')}
        </span>
      </div>

      <p className="text-sm text-ink text-pretty">{verdict.summary}</p>

      <div className="grid grid-cols-2 gap-2 text-xs tabular-nums text-ink-soft border-t border-line pt-3">
        {verdict.metrics.accountAgeDays !== null && (
          <span>Age: {verdict.metrics.accountAgeDays} days</span>
        )}
        {verdict.metrics.followers !== null && (
          <span>Followers: {verdict.metrics.followers.toLocaleString()}</span>
        )}
        {verdict.metrics.following !== null && (
          <span>Following: {verdict.metrics.following.toLocaleString()}</span>
        )}
        {verdict.metrics.usernameChanges !== null && (
          <span className={verdict.metrics.usernameChanges > 3 ? 'text-red-600 font-medium' : ''}>
            Username changes: {verdict.metrics.usernameChanges}
          </span>
        )}
      </div>

      {verdict.redFlags.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-xs text-ink-soft uppercase tracking-widest mb-2">Red flags</p>
          <div className="flex flex-wrap gap-1">
            {verdict.redFlags.map((flag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-sm">
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1 border-t border-line pt-3">
        {verdict.signals.map((signal, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className={`w-4 shrink-0 font-mono ${DIRECTION_STYLES[signal.direction]}`}>
              {DIRECTION_ICON[signal.direction]}
            </span>
            <span className="text-ink-soft">{signal.label}:</span>
            <span className="text-ink">{signal.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
