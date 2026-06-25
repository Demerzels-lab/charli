"use client";

import { motion, useReducedMotion } from "motion/react";
import { WordReveal } from "./WordReveal";

const STATS = [
  { value: "98.6%", label: "of pump.fun tokens end in a rug or dump" },
  { value: "50K+", label: "new tokens launched every single day" },
  { value: "10s", label: "for CARLI to read what takes humans days" },
];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="top"
      className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24"
    >
      <div className="shell">
        {/* eyebrow */}
        <motion.p
          className="eyebrow mb-6"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          The crypto OSINT agent · 2026
        </motion.p>

        {/* headline — word by word */}
        <h1 className="max-w-[16ch] text-balance text-[clamp(2.6rem,8vw,6.4rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em]">
          <WordReveal
            text="The chain talks. CARLI listens."
            accentIndices={[3]}
            glitchIndices={[3]}
            startDelay={0.2}
            stagger={0.09}
          />
        </h1>

        {/* sub-statement */}
        <motion.div
          className="mt-8 max-w-xl text-pretty text-base leading-relaxed text-ink-soft md:text-lg"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.7 }}
        >
          <p className="font-semibold text-ink">
            Every wallet, every account, every launch leaves a trail.
          </p>
          <p className="mt-2">
            CARLI pulls the on-chain history and the social signals together,
            then lets Claude read the story behind them. The research you used to
            do across ten tabs, in one answer.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          className="mt-9 flex flex-wrap items-center gap-3"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.85 }}
        >
          <a
            href="#enter"
            className="group inline-flex items-center gap-2 bg-ink px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-bg transition-colors hover:bg-gold-dark"
          >
            Run an investigation
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
          <a
            href="#method"
            className="inline-flex items-center gap-2 border border-ink/30 px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-ink transition-colors hover:border-ink"
          >
            How it reads the chain
          </a>
        </motion.div>

        {/* stat bar */}
        <motion.dl
          className="mt-16 grid grid-cols-1 gap-px overflow-hidden border border-line bg-line sm:grid-cols-3"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 1 }}
        >
          {STATS.map((s) => (
            <div key={s.value} className="bg-bg p-6">
              <dt className="figure text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                {s.value}
              </dt>
              <dd className="mt-2 text-[13px] leading-snug text-ink-soft">
                {s.label}
              </dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
