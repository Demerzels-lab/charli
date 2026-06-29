"use client";

import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { Reveal } from "./Reveal";

const Carli3DAvatar = dynamic(() => import("./Carli3DAvatar").then(m => m.Carli3DAvatar), { ssr: false });

const LAYERS = [
  { label: "Bubble maps", sees: "the wallets", covered: true },
  { label: "Screeners", sees: "the volume", covered: true },
  { label: "The account behind the launch", sees: "—", covered: false },
  { label: "The story being sold", sees: "—", covered: false },
];

export function Manifesto() {
  const reduce = useReducedMotion();

  return (
    <section className="border-y border-line bg-surface py-20 md:py-28">
      <div className="shell grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-16">
        {/* left — text */}
        <div className="md:col-span-7">
          <Reveal>
            <p className="eyebrow mb-8">The premise</p>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="max-w-[20ch] text-balance text-[clamp(1.9rem,5vw,3.6rem)] font-bold uppercase leading-[1.02] tracking-[-0.01em] text-ink">
              Nobody scams in a{" "}
              <span className="text-gold">vacuum.</span> They leave a wallet, a
              handle, a pattern.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-lg text-pretty leading-relaxed text-ink-soft">
              Bubble maps see the wallets. Screeners see the volume. Neither reads
              the account behind the launch or the story being sold. That gap is
              where the money disappears. CARLI works in that gap.
            </p>
          </Reveal>
        </div>

        {/* right — animated avatar */}
        <div className="flex items-center justify-center md:col-span-5">
          <Reveal delay={0.12}>
            <Carli3DAvatar size={450} />
          </Reveal>
        </div>
      </div>

      {/* Token section */}
      <div className="shell mt-20 border-t border-line pt-20 md:mt-28 md:pt-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-7">
            <Reveal>
              <p className="eyebrow mb-8">The token</p>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="max-w-[20ch] text-balance text-[clamp(1.9rem,5vw,3.6rem)] font-bold uppercase leading-[1.02] tracking-[-0.01em] text-ink">
                Built by researchers, for researchers.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-lg text-pretty leading-relaxed text-ink-soft">
                CARLI stays free, rate-limited per user. $CARLI aligns the people
                who benefit from the tool with the tool itself. Every rug that
                goes viral is a reason CARLI exists.
              </p>
            </Reveal>
          </div>
          <div className="flex items-center md:col-span-5">
            <Reveal delay={0.12}>
              <div className="border border-line rounded px-4 py-3 inline-flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-xs uppercase tracking-wider text-ink-soft">Coming soon • $CARLI on pump.fun</p>
                  <code className="text-xs font-mono text-ink-soft">
                    Cmr3ie84TCoc4iZG3w591FuueYx9zhFAe3X95DhEpump
                  </code>
                </div>
                <button className="shrink-0 px-3 py-1 text-xs uppercase tracking-wider border border-ink text-ink hover:bg-ink hover:text-bg transition-colors whitespace-nowrap">
                  Copy
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
