"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./Reveal";
import { EvidenceOrbit } from "./animations/EvidenceOrbit";
import { XAccountIcon } from "./icons/XAccountIcon";
import { WalletIcon } from "./icons/WalletIcon";
import { ProjectIcon } from "./icons/ProjectIcon";
import { AgentIcon } from "./icons/AgentIcon";

const CAPABILITIES = [
  {
    no: "I",
    label: "SOCIAL OSINT",
    name: "X Account Intel",
    inputs: "@handle",
    body: "Account age against follower growth, engagement authenticity, posting behavior, and whether this account has any crypto history at all. Classifies account type first, then verdict: official, unverified, mismatch, or impersonation.",
    status: "Live",
    Icon: XAccountIcon,
    preview: ["verdict: LIKELY OFFICIAL", "confidence: FIRM", "signals: 6 analyzed"],
  },
  {
    no: "II",
    label: "ON-CHAIN OSINT",
    name: "Wallet Dossier",
    inputs: "Solana · EVM address",
    body: "Behavior pulled from public chain data via Helius and Etherscan. Dev wallet, whale, or flipper. Funding source, transaction history, and connected projects. An interpretation layer on top of the explorer, not another raw feed.",
    status: "Live",
    Icon: WalletIcon,
    preview: ["classification: whale", "confidence: CONFIRMED", "signals: 5 analyzed"],
  },
  {
    no: "III",
    label: "TARGET PROFILING",
    name: "Project OSINT Report",
    inputs: "name · contract · domain",
    body: "Domain age and registration, linked social accounts, team identity signals, and connected wallets, scored end to end: safe, DYOR, high risk, or likely rug. Narrative analysis detects manipulation patterns. Built to be shared as a card.",
    status: "Live",
    Icon: ProjectIcon,
    preview: ["verdict: HIGH_RISK", "risk score: 65/100", "findings: 7 analyzed"],
  },
  {
    no: "IV",
    label: "FREE INVESTIGATION",
    name: "Agent Mode",
    inputs: "free-form chat",
    body: "Talk to CARLI directly. \"Check this account before I buy.\" It runs the full investigation conversationally and synthesizes one answer instead of handing you ten dashboards.",
    status: "Live",
    Icon: AgentIcon,
    preview: ["mode: conversational", "tools: 3 available", "synthesis: one answer"],
  },
];

export function Capabilities() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section id="capabilities" className="relative border-y border-line bg-surface py-20 md:py-28">
      <EvidenceOrbit className="absolute inset-0 hidden md:block" />

      <div className="shell relative">
        <Reveal>
          <div className="mb-12 md:mb-16">
            <p className="eyebrow mb-3">The instruments</p>
            <h2 className="max-w-[20ch] text-balance text-[clamp(1.8rem,4.5vw,3rem)] font-bold uppercase leading-[1.02] tracking-[-0.01em]">
              Not a chatbot. An investigator.
            </h2>
            <p className="mt-5 max-w-lg text-pretty leading-relaxed text-ink-soft">
              Four instruments, one directive: tell you what something really is
              before your money is in it. Real data, read by Claude, returned as
              a verdict you can act on.
            </p>
          </div>
        </Reveal>

        <div className="border-t border-ink/15">
          {CAPABILITIES.map((c) => (
            <Reveal key={c.no} delay={0.03}>
              <article
                className="group relative grid grid-cols-1 items-start gap-4 border-b border-ink/15 py-7 transition-colors md:grid-cols-12 md:gap-8 md:py-8 md:hover:bg-bg"
                onMouseEnter={() => setHovered(c.no)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-baseline gap-4 md:col-span-3">
                  <span className="figure text-sm font-bold text-gold-dark transition-transform group-hover:scale-110">
                    {c.no}
                  </span>
                  <div>
                    {'label' in c && (
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">[ {c.label} ]</span>
                    )}
                    <h3 className="text-lg font-bold text-ink md:text-xl">
                      {c.name}
                    </h3>
                    <code className="mt-1 block text-xs font-medium tracking-tight text-ink-soft">
                      {c.inputs}
                    </code>
                  </div>
                </div>

                <p className="text-pretty text-sm leading-relaxed text-ink-soft md:col-span-5">
                  {c.body}
                </p>

                <div className="hidden items-center justify-center border border-line bg-bg p-2 transition-colors group-hover:border-gold/40 md:col-span-2 md:flex">
                  <c.Icon />
                </div>

                <div className="md:col-span-2 md:text-right">
                  <AnimatePresence mode="wait">
                    {hovered === c.no ? (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.2 }}
                        className="ml-auto inline-block border border-gold/30 bg-surface px-3 py-2 text-left font-mono text-[10px] leading-relaxed text-ink-soft md:text-right"
                      >
                        {c.preview.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.span
                        key="status"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink"
                      >
                        <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" />
                        {c.status}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
