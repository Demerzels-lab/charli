"use client";

import { Reveal } from "./Reveal";

const CAPABILITIES = [
  {
    no: "I",
    name: "X Account Intel",
    inputs: "@handle",
    body: "Account age against follower growth, engagement authenticity, posting behavior, and whether this account has any crypto history at all. Returns a clear read: legit, do your own research, or red flag.",
    status: "Live",
  },
  {
    no: "II",
    name: "Wallet Dossier",
    inputs: "Solana · EVM address",
    body: "Behavior pulled from public chain data. Dev wallet, whale, or flipper. Past project participation and funding patterns. An interpretation layer on top of the explorer, not another raw feed.",
    status: "Live",
  },
  {
    no: "III",
    name: "Project OSINT Report",
    inputs: "name · contract · domain",
    body: "Domain age and registration, linked social accounts, team identity signals, and connected wallets, scored end to end: safe, DYOR, high risk, or likely rug. Built to be shared as a card.",
    status: "Live",
  },
  {
    no: "IV",
    name: "Agent Mode",
    inputs: "free-form chat",
    body: "Talk to CARLI directly. \u201cCheck this account before I buy.\u201d It runs the full investigation conversationally and synthesizes one answer instead of handing you ten dashboards.",
    status: "Live",
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="border-y border-line bg-surface py-20 md:py-28">
      <div className="shell">
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
              <article className="group grid grid-cols-1 items-start gap-4 border-b border-ink/15 py-7 md:grid-cols-12 md:gap-8 md:py-8">
                <div className="flex items-baseline gap-4 md:col-span-4">
                  <span className="figure text-sm font-bold text-gold-dark">
                    {c.no}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-ink md:text-xl">
                      {c.name}
                    </h3>
                    <code className="mt-1 block text-xs font-medium tracking-tight text-ink-soft">
                      {c.inputs}
                    </code>
                  </div>
                </div>

                <p className="text-pretty text-sm leading-relaxed text-ink-soft md:col-span-7">
                  {c.body}
                </p>

                <div className="md:col-span-1 md:text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
                    <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" />
                    {c.status}
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
