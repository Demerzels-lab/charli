// components/ProjectVerdictCard.tsx
'use client';

import type { ProjectVerdict } from '@/lib/types';

const LEVEL_STYLES: Record<ProjectVerdict['level'], string> = {
  SAFE: 'text-green-700 bg-green-50 border-green-200',
  DYOR: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  HIGH_RISK: 'text-orange-700 bg-orange-50 border-orange-200',
  LIKELY_RUG: 'text-red-700 bg-red-50 border-red-200',
};

const DIRECTION_STYLES = {
  ok: 'text-green-600',
  warn: 'text-yellow-600',
  bad: 'text-red-600',
};

const DIRECTION_ICON = { ok: '✓', warn: '⚠', bad: '✗' };

type Props = { verdict: ProjectVerdict };

export function ProjectVerdictCard({ verdict }: Props) {
  return (
    <div className="border border-line rounded-sm bg-surface p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          {verdict.tokenName ? (
            <>
              <p className="text-sm font-semibold text-ink">{verdict.tokenName} {verdict.tokenSymbol ? `(${verdict.tokenSymbol})` : ''}</p>
              <p className="text-xs text-ink-soft font-mono break-all mt-0.5">{verdict.query}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-ink break-all">{verdict.query}</p>
          )}
          <p className="text-xs text-ink-soft uppercase tracking-widest mt-1">
            {verdict.resolvedAs}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-semibold px-2 py-1 border rounded-sm uppercase tracking-widest whitespace-nowrap ${LEVEL_STYLES[verdict.level]}`}>
            {verdict.level.replace('_', ' ')}
          </span>
          <span className="text-xs tabular-nums text-ink-soft">
            Risk: {verdict.riskScore}/100
          </span>
        </div>
      </div>

      <p className="text-sm text-ink text-pretty">{verdict.summary}</p>

      {/* token stats */}
      {(verdict.marketCap != null || verdict.liquidityUsd != null) && (
        <div className="grid grid-cols-2 gap-2 text-xs tabular-nums text-ink-soft border-t border-line pt-3">
          {verdict.marketCap != null && <span>Market cap: ${verdict.marketCap.toLocaleString()}</span>}
          {verdict.liquidityUsd != null && <span>Liquidity: ${verdict.liquidityUsd.toFixed(0)}</span>}
          {verdict.deployer && <span className="col-span-2 font-mono truncate">Deployer: {verdict.deployer}</span>}
        </div>
      )}

      {/* socials */}
      {verdict.socials && (verdict.socials.site || verdict.socials.telegram || verdict.socials.x) && (
        <div className="flex flex-wrap gap-3 text-xs text-ink-soft border-t border-line pt-3">
          {verdict.socials.site && <span>Web: {verdict.socials.site}</span>}
          {verdict.socials.telegram && <span>TG: @{verdict.socials.telegram}</span>}
          {verdict.socials.x && <span>X: {verdict.socials.x}</span>}
        </div>
      )}

      {verdict.domain && (
        <div className="text-xs tabular-nums text-ink-soft space-y-0.5 border-t border-line pt-3">
          {verdict.domain.ageDays !== null && (
            <p>Domain age: {verdict.domain.ageDays} days</p>
          )}
          {verdict.domain.registrar && <p>Registrar: {verdict.domain.registrar}</p>}
          {verdict.domain.createdAt && (
            <p>Registered: {new Date(verdict.domain.createdAt).toLocaleDateString()}</p>
          )}
        </div>
      )}

      {verdict.narrativeFlags.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-xs text-ink-soft uppercase tracking-widest mb-2">Manipulation signals</p>
          <div className="flex flex-wrap gap-1">
            {verdict.narrativeFlags.map((flag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-sm">
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1 border-t border-line pt-3">
        {verdict.findings.map((finding, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className={`w-4 shrink-0 font-mono ${DIRECTION_STYLES[finding.direction]}`}>
              {DIRECTION_ICON[finding.direction]}
            </span>
            <span className="text-ink-soft">{finding.label}:</span>
            <span className="text-ink">{finding.detail}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-soft">Confidence: {verdict.confidence}</p>
    </div>
  );
}
