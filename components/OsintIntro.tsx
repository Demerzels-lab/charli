"use client";

import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "./Reveal";

const SOURCES = [
  { label: "On-chain transactions", note: "wallets, transfers, contracts" },
  { label: "Domain registrations", note: "WHOIS, SSL certificate history" },
  { label: "Account histories", note: "age, username changes, growth" },
  { label: "Social signals", note: "bios, links, posting behavior" },
];

export function OsintIntro() {
  const reduce = useReducedMotion();

  return (
    <section id="osint" className="py-20 md:py-28">
      <div className="shell grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-16">
        {/* left — explanation */}
        <div className="md:col-span-6">
          <Reveal>
            <p className="eyebrow mb-4">First, the basics</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-[18ch] text-balance text-[clamp(1.8rem,4.5vw,3rem)] font-bold uppercase leading-[1.05] tracking-[-0.01em]">
              What is <span className="text-gold">OSINT?</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-pretty leading-relaxed text-ink-soft">
              <strong className="text-ink">Open-Source Intelligence</strong> is
              the practice of drawing conclusions from public records — data
              anyone can access, but few know how to read together.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-4 text-pretty leading-relaxed text-ink-soft">
              A field analyst doesn&apos;t hack anyone. They pull the registration
              date here, the account age there, the funding trail underneath, and
              read the pattern the pieces form. CARLI does exactly that for crypto
              — at machine speed, with Claude reading intent.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 inline-block border-l-2 border-gold pl-4 text-sm font-medium text-ink">
              No logins. No private data. No breach corpus. Only what is already
              public.
            </p>
          </Reveal>
        </div>

        {/* right — animated signal-to-verdict diagram */}
        <div className="md:col-span-6">
          <Reveal delay={0.1}>
            <div className="relative border border-line bg-surface p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                Public signals → one verdict
              </p>

              <div className="mt-5 space-y-2.5">
                {SOURCES.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={reduce ? { opacity: 1 } : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.12 }}
                    className="flex items-center gap-3 border border-line bg-bg px-3 py-2.5"
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-gold" />
                    <div>
                      <p className="text-xs font-semibold text-ink">{s.label}</p>
                      <p className="text-[11px] text-ink-soft">{s.note}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* connector */}
              <div className="my-3 flex justify-center">
                <span className="text-ink-soft">↓</span>
              </div>

              <motion.div
                initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="border border-gold/40 bg-bg px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                    CARLI verdict
                  </span>
                  <span className="border border-gold/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-dark">
                    Evidence attached
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-ink-soft">
                  level · confidence · signals
                </p>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
