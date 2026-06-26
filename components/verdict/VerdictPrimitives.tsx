// components/verdict/VerdictPrimitives.tsx
// Shared building blocks for all verdict cards per WALLET FIX BRIEF §2.

import type { ReactNode } from 'react';

// --- Section header (gold uppercase label) ---
export function VerdictSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">{label}</p>
      {children}
    </div>
  );
}

// --- Data row: label (fixed 140px) + value ---
export function DataRow({ label, children, icon }: { label: string; children: ReactNode; icon?: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  const iconMap = { ok: '✓', warn: '⚠', bad: '✕', neutral: '·' };
  const colorMap = { ok: 'text-green-600', warn: 'text-amber-600', bad: 'text-red-600', neutral: 'text-ink-soft/60' };
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-line/50 text-[13px] last:border-0 min-w-0">
      <span className="text-ink-soft flex items-center gap-1.5 min-w-0">
        {icon && <span className={`font-mono text-xs shrink-0 ${colorMap[icon]}`}>{iconMap[icon]}</span>}
        <span className="truncate">{label}</span>
      </span>
      <span className="font-semibold text-ink min-w-0 break-all">{children}</span>
    </div>
  );
}

// --- Verdict badge (large, colored, prominent) ---
const VERDICT_COLORS: Record<string, string> = {
  // Wallet
  CLEAN: 'border-[#2D6B4A] text-[#2D6B4A] bg-[#2D6B4A]/5',
  WATCH: 'border-[#A07E4A] text-[#A07E4A] bg-[#A07E4A]/5',
  FLAGGED: 'border-[#8B2C2C] text-[#8B2C2C] bg-[#8B2C2C]/5',
  // Project
  SAFE: 'border-[#2D6B4A] text-[#2D6B4A] bg-[#2D6B4A]/5',
  DYOR: 'border-[#A07E4A] text-[#A07E4A] bg-[#A07E4A]/5',
  HIGH_RISK: 'border-[#B45309] text-[#B45309] bg-[#B45309]/5',
  LIKELY_RUG: 'border-[#8B2C2C] text-[#8B2C2C] bg-[#8B2C2C]/5',
  // X Account (new)
  LIKELY_OFFICIAL: 'border-[#2D6B4A] text-[#2D6B4A] bg-[#2D6B4A]/5',
  UNVERIFIED: 'border-[#A07E4A] text-[#A07E4A] bg-[#A07E4A]/5',
  MISMATCH: 'border-[#B45309] text-[#B45309] bg-[#B45309]/5',
  IMPERSONATION: 'border-[#8B2C2C] text-[#8B2C2C] bg-[#8B2C2C]/5',
  INFORMATIONAL: 'border-ink-soft/30 text-ink-soft bg-ink-soft/5',
  // Fallback
  UNVERIFIABLE: 'border-ink-soft/30 text-ink-soft bg-ink-soft/5',
};

export function VerdictBadge({ level }: { level: string }) {
  const colors = VERDICT_COLORS[level] ?? VERDICT_COLORS.UNVERIFIABLE;
  return (
    <span className={`text-sm font-bold px-3 py-1.5 border-2 rounded-sm uppercase tracking-widest whitespace-nowrap ${colors}`}>
      {level.replace(/_/g, ' ')}
    </span>
  );
}

// --- Confidence pill ---
const CONFIDENCE_COLORS: Record<string, string> = {
  CONFIRMED: 'text-[#2D6B4A] border-[#2D6B4A]/30',
  FIRM: 'text-[#A07E4A] border-[#A07E4A]/30',
  TENTATIVE: 'text-ink-soft border-ink-soft/30',
  UNKNOWN: 'text-ink-soft/60 border-ink-soft/20',
};

export function ConfidencePill({ level }: { level: string }) {
  const colors = CONFIDENCE_COLORS[level] ?? CONFIDENCE_COLORS.UNKNOWN;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 border rounded-sm uppercase tracking-wider ${colors}`}>
      {level}
    </span>
  );
}

// --- Signal row ---
export function SignalRow({ label, value, direction }: { label: string; value: string; direction: 'ok' | 'warn' | 'bad' }) {
  const iconMap = { ok: '✓', warn: '⚠', bad: '✕' };
  const colorMap = { ok: 'text-green-600', warn: 'text-amber-600', bad: 'text-red-600' };
  return (
    <div className="flex items-start gap-2 py-1.5 text-[13px] min-w-0">
      <span className={`font-mono text-xs w-4 shrink-0 ${colorMap[direction]}`}>{iconMap[direction]}</span>
      <span className="text-ink-soft shrink-0">{label}:</span>
      <span className="text-ink font-medium min-w-0 break-words">{value}</span>
    </div>
  );
}
