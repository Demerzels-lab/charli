"use client";

import { Reveal } from "./Reveal";

const PIPELINE = [
  {
    step: "01",
    title: "Intake & parse",
    code: "detect_input_type()",
    body: "You paste a handle, an address, a contract, or just a sentence. CARLI classifies the input and decides which instruments to fire. No forms, no choosing the right tool yourself.",
  },
  {
    step: "02",
    title: "Live tool calls",
    code: "claude.tool_use → [ chain, social, domain ]",
    body: "Claude chains real API calls in a single turn. On-chain reads from Solscan and Etherscan, social signals from the account graph, domain and registration from crt.sh and WHOIS. Live data, not cached guesses.",
  },
  {
    step: "03",
    title: "Cross-reference",
    code: "correlate(signals)",
    body: "The wallet that funded the deployer, the account that shilled it, the domain registered the same week. Individually these are noise. Linked together they are a pattern, and the pattern is the finding.",
  },
  {
    step: "04",
    title: "Reason over intent",
    code: "extended_thinking()",
    body: "For the hard part, the narrative, Claude reads the actual language of the project and the account against known manipulation playbooks. This is the step no screener can do, because it is about meaning, not metrics.",
  },
  {
    step: "05",
    title: "Score & synthesize",
    code: "verdict := { level, confidence, evidence }",
    body: "Every finding gets a confidence grade, tentative, firm, or confirmed, with the evidence attached. The output is one structured verdict, scannable in seconds, not a wall of raw data to interpret yourself.",
  },
];

export function Method() {
  return (
    <section id="method" className="py-20 md:py-28">
      <div className="shell">
        <Reveal>
          <div className="mb-12 md:mb-16">
            <p className="eyebrow mb-3">Under the hood</p>
            <h2 className="max-w-[22ch] text-balance text-[clamp(1.8rem,4.5vw,3rem)] font-bold uppercase leading-[1.02] tracking-[-0.01em]">
              How Claude actually runs the recon
            </h2>
            <p className="mt-5 max-w-xl text-pretty leading-relaxed text-ink-soft">
              CARLI is an agent, not a wrapper. Each investigation is a chain of
              real tool calls that Claude orchestrates and then reasons over. The
              instrument does not describe the path. It walks it.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-px overflow-hidden border border-line bg-line lg:grid-cols-5">
          {PIPELINE.map((p) => (
            <Reveal key={p.step} delay={0.04} className="h-full">
              <div className="flex h-full flex-col bg-bg p-6 lg:p-7">
                <div className="figure mb-5 text-sm font-bold text-gold-dark">
                  {p.step}
                </div>
                <h3 className="text-base font-bold text-ink">{p.title}</h3>
                <code className="mt-3 block break-words rounded-sm bg-surface px-2.5 py-2 text-[11px] font-medium leading-relaxed text-ink">
                  {p.code}
                </code>
                <p className="mt-4 text-pretty text-[13px] leading-relaxed text-ink-soft">
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* footnote on data ethics */}
        <Reveal delay={0.05}>
          <div className="mt-10 flex flex-col gap-3 border-l-2 border-gold pl-5 md:flex-row md:items-center md:gap-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-ink">
              Public data only
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
              CARLI reads what is already open: on-chain records, public accounts,
              registration data. No breach corpus, no private scraping. It is a
              due-diligence instrument, not a surveillance one.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
