"use client";

import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "./Reveal";

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

        {/* right — coverage diagram */}
        <div className="flex items-center md:col-span-5">
          <Reveal delay={0.12}>
            <div className="w-full border border-line bg-bg p-5">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  Signal
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  Who reads it
                </span>
              </div>
              <div className="divide-y divide-line">
                {LAYERS.map((l, i) => (
                  <motion.div
                    key={l.label}
                    initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.1 }}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${l.covered ? "bg-ink-soft/40" : "bg-gold"}`}
                      />
                      <span className={`text-xs ${l.covered ? "text-ink-soft" : "font-semibold text-ink"}`}>
                        {l.label}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-medium ${l.covered ? "text-ink-soft" : "text-gold-dark"}`}
                    >
                      {l.covered ? "existing tools" : "only CARLI"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
