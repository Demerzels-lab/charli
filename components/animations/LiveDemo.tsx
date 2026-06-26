"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { XAccountVerdict } from "@/lib/types";
import { XVerdictCard } from "../XVerdictCard";

const EXAMPLES: Array<{ label: string; query: string; delayMs: number; verdict: XAccountVerdict }> = [
  {
    label: "@elonmusk",
    query: "check @elonmusk",
    delayMs: 1400,
    verdict: {
      handle: "elonmusk",
      displayName: "Elon Musk",
      accountType: "PUBLIC_FIGURE",
      level: "LIKELY_OFFICIAL",
      confidence: "CONFIRMED",
      summary: "Verified account, 13+ years old, established public figure. No coordinated promotion patterns detected.",
      isVerified: true,
      metrics: { accountAgeDays: 5100, followers: 218000000, following: 900, followerGrowthRate: 42745, engagementRate: null, usernameChanges: 0, firstCryptoMentionDays: null, verification: "Legacy + Blue" },
      impersonationSignals: { nameMatchesKnownEntity: false, caMismatch: null, visualMimicry: false },
      tokenCrossCheck: null,
      signals: [
        { label: "Account age", value: "14 years, predates crypto entirely", direction: "ok" },
        { label: "Verification", value: "Blue verified + legacy verified", direction: "ok" },
        { label: "Username history", value: "No changes on record", direction: "ok" },
      ],
      redFlags: [],
      dataSources: { twitter: "available", memoryLol: "available" },
      dataCompleteness: "full",
    },
  },
  {
    label: "@freshmint99",
    query: "check @freshmint99",
    delayMs: 1800,
    verdict: {
      handle: "freshmint99",
      displayName: "Fresh Mint",
      accountType: "PROJECT_CRYPTO",
      level: "UNVERIFIED",
      confidence: "FIRM",
      summary: "Account created 6 days ago, already promoting a token launch. Classic pump account pattern.",
      isVerified: false,
      metrics: { accountAgeDays: 6, followers: 14200, following: 12, followerGrowthRate: 2366.7, engagementRate: null, usernameChanges: 3, firstCryptoMentionDays: 0, verification: null },
      impersonationSignals: { nameMatchesKnownEntity: false, caMismatch: null, visualMimicry: false },
      tokenCrossCheck: null,
      signals: [
        { label: "Account age", value: "6 days old, explosive follower growth", direction: "warn" },
        { label: "Username changes", value: "3 changes in under a week", direction: "bad" },
        { label: "Crypto mentions", value: "First post was already a token shill", direction: "warn" },
      ],
      redFlags: ["Rapid username churn"],
      dataSources: { twitter: "available", memoryLol: "available" },
      dataCompleteness: "full",
    },
  },
];

export function LiveDemo() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");

  const run = (idx: number) => {
    setActiveIdx(idx);
    setPhase("scanning");
    window.setTimeout(() => setPhase("done"), EXAMPLES[idx].delayMs);
  };

  const reset = () => {
    setPhase("idle");
    setActiveIdx(null);
  };

  return (
    <div className="mt-8 border border-gold/30 bg-surface/60 p-5">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-gold" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Try it — click an example, no signup
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex, i) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => run(i)}
            disabled={phase === "scanning"}
            className={`group relative border px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-40 ${
              phase === "idle"
                ? "border-gold/50 text-ink animate-demo-pulse"
                : "border-ink/20 text-ink-soft hover:border-gold hover:text-ink"
            }`}
          >
            <span aria-hidden="true" className="mr-1.5 text-gold-dark">▶</span>
            {ex.query}
          </button>
        ))}
        {phase === "done" && (
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1.5 text-xs text-ink-soft underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {phase === "scanning" && activeIdx !== null && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 font-mono text-xs text-ink-soft"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-gold" />
            Analyzing {EXAMPLES[activeIdx].query}...
          </motion.div>
        )}
        {phase === "done" && activeIdx !== null && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative mt-4"
          >
            <XVerdictCard verdict={EXAMPLES[activeIdx].verdict} />
            <p className="mt-2 text-[11px] text-ink-soft">
              Sample output — run a real investigation in Agent Mode.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
