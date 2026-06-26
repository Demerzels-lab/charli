"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";
import { AsciiPattern } from "./animations/AsciiPattern";

const CA = "Coming soon · $CARLI on pump.fun";

export function Closing() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CA);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {/* token strip */}
      <section id="token" className="border-y border-line bg-ink py-16 text-bg md:py-20">
        <div className="shell">
          <Reveal>
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
                  The token
                </p>
                <h2 className="mt-4 max-w-[16ch] text-balance text-[clamp(1.6rem,4vw,2.6rem)] font-bold uppercase leading-[1.05]">
                  Built by researchers, for researchers.
                </h2>
                <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-bg/70">
                  CARLI stays free, rate-limited per user. $CARLI aligns the
                  people who benefit from the tool with the tool itself. Every
                  rug that goes viral is a reason CARLI exists.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="group flex shrink-0 items-center justify-between gap-4 border border-bg/25 px-5 py-4 text-left transition-colors hover:border-gold"
                aria-label="Copy contract address"
              >
                <span className="figure text-sm font-medium text-bg/90">
                  {copied ? "Copied to clipboard" : CA}
                </span>
                <span
                  className="text-xs font-semibold uppercase tracking-wider text-gold"
                  aria-hidden="true"
                >
                  {copied ? "✓" : "Copy"}
                </span>
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* final CTA */}
      <section id="enter" className="relative overflow-hidden py-24 text-center md:py-36">
        <AsciiPattern className="absolute inset-0" />
        <div className="shell relative">
          <Reveal>
            <p className="eyebrow mb-8">Run your DYOR</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mx-auto max-w-[14ch] text-balance text-[clamp(2.4rem,7vw,5.5rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em]">
              Check it before you{" "}
              <span className="text-gold">ape.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-7 max-w-md text-pretty leading-relaxed text-ink-soft">
              Paste an account, a wallet, or a project. Get a verdict in seconds.
              The trail is already there. CARLI just reads it.
            </p>
            <p className="mt-3 text-xs text-ink-soft/70 tracking-wide">No logins. No subscriptions. Public data only.</p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/agent"
                className="group inline-flex items-center gap-2 bg-ink px-8 py-4 text-sm font-semibold uppercase tracking-wider text-bg transition-colors hover:bg-gold-dark"
              >
                Enter CARLI
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </a>
              <a
                href="#problem"
                className="inline-flex items-center gap-2 border border-ink/30 px-8 py-4 text-sm font-semibold uppercase tracking-wider text-ink transition-colors hover:border-ink"
              >
                See what it catches
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
