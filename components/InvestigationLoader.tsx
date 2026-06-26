// components/InvestigationLoader.tsx
'use client';

import { useState, useEffect } from 'react';

type Step = { label: string; delay: number };

const WALLET_STEPS: Step[] = [
  { label: 'Detecting chain...', delay: 0 },
  { label: 'Reading transaction history', delay: 2000 },
  { label: 'Tracing funding source', delay: 5000 },
  { label: 'Classifying behavior', delay: 8000 },
  { label: 'Generating dossier', delay: 12000 },
];

const PROJECT_STEPS: Step[] = [
  { label: 'Resolving contract address...', delay: 0 },
  { label: 'Fetching on-chain data', delay: 2000 },
  { label: 'Checking domain registration', delay: 5000 },
  { label: 'Analyzing narrative', delay: 8000 },
  { label: 'Generating verdict', delay: 12000 },
];

const XACCOUNT_STEPS: Step[] = [
  { label: 'Fetching account profile...', delay: 0 },
  { label: 'Detecting account type', delay: 2000 },
  { label: 'Scanning bio for CA', delay: 4000 },
  { label: 'Running token cross-check', delay: 7000 },
  { label: 'Checking impersonation signals', delay: 10000 },
  { label: 'Generating verdict', delay: 14000 },
];

const STEP_SETS: Record<string, Step[]> = {
  wallet: WALLET_STEPS,
  project: PROJECT_STEPS,
  'x-account': XACCOUNT_STEPS,
};

type Props = { type: 'wallet' | 'project' | 'x-account' };

export function InvestigationLoader({ type }: Props) {
  const steps = STEP_SETS[type] ?? WALLET_STEPS;
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timers = steps.map((step, i) =>
      setTimeout(() => setActiveIdx(i), step.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [steps]);

  return (
    <div className="border border-line rounded-sm bg-surface p-5 space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold mb-3">
        Investigating
      </p>
      {steps.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className={`font-mono text-xs w-4 ${
                done ? 'text-green-600' : active ? 'text-gold animate-pulse' : 'text-ink-soft/40'
              }`}
            >
              {done ? '✓' : active ? '▸' : '·'}
            </span>
            <span className={done ? 'text-ink-soft' : active ? 'text-ink font-medium' : 'text-ink-soft/40'}>
              {step.label}
              {done && ' ✓'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
