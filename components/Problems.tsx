"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Reveal } from "./Reveal";

const PROBLEMS = [
  {
    no: "01",
    tag: "Viral · Mar 2026",
    title: "Fake accounts manufacture panic, then sell you a coin",
    body: "Networks of bought X accounts post fabricated breaking news to farm reach, then pivot straight into pump-and-dumps. One account in a recent network had changed its username sixteen times in two years. That history is public. CARLI reads it in seconds, not the days it takes a human investigator.",
    stat: "16",
    statLabel: "username changes on a single scam account",
  },
  {
    no: "02",
    tag: "Ongoing threat",
    title: "Real accounts get hijacked and turned into shills",
    body: "A verified account with hundreds of thousands of followers gets phished, then drops a memecoin minutes later. By the time anyone notices, the token has already pumped and dumped. The tell is simple: did this account ever talk about crypto before today? CARLI checks that instantly, before you ape.",
    stat: "$100M+",
    statLabel: "market caps hijacked accounts have reached before discovery",
  },
  {
    no: "03",
    tag: "Invisible to every tool",
    title: "The scam is in the story, not just the chart",
    body: "Modern rug pulls run on narrative. A dying dev, fees going to family, a cause you can't say no to, then the wallet empties. No bubble map or screener can read whether a project's story follows the manipulation playbook. Reading intent from language is exactly what an AI agent can do, and tooling cannot.",
    stat: "0",
    statLabel: "existing tools that analyze narrative manipulation",
  },
  {
    no: "04",
    tag: "The scale problem",
    title: "There is far more to check than any human can keep up with",
    body: "Tens of thousands of tokens launch daily and the overwhelming majority end badly. The on-chain side has tooling. The social side, account age, coordinated shilling, posting behavior, crypto history, is still checked by hand, one tab at a time. CARLI is the layer that has been missing.",
    stat: "97K",
    statLabel: "of 7M+ tokens kept even $1K in liquidity",
  },
];

function ParallaxNumber({ no }: { no: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className="figure text-5xl font-extrabold leading-none text-ink/15 transition-colors group-hover:text-gold md:text-6xl"
    >
      {no}
    </motion.div>
  );
}

export function Problems() {
  return (
    <section id="problem" className="py-20 md:py-28">
      <div className="shell">
        <Reveal>
          <div className="mb-14 flex flex-col gap-4 border-b border-line pb-8 md:mb-20 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow mb-3">What CARLI is for</p>
              <h2 className="max-w-[18ch] text-balance text-[clamp(1.8rem,4.5vw,3rem)] font-bold uppercase leading-[1.02] tracking-[-0.01em]">
                Four ways the money disappears
              </h2>
            </div>
            <p className="max-w-sm text-pretty text-sm leading-relaxed text-ink-soft">
              Each of these is a live pattern on X and pump.fun right now. Each
              one is something CARLI is built to catch.
            </p>
          </div>
        </Reveal>

        <div className="flex flex-col">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.no} delay={0.04}>
              <article
                className={`group grid grid-cols-1 gap-6 py-10 md:grid-cols-12 md:gap-10 md:py-12 ${
                  i !== 0 ? "border-t border-line" : ""
                }`}
              >
                {/* number + tag */}
                <div className="md:col-span-3">
                  <ParallaxNumber no={p.no} />
                  <p className="eyebrow mt-4">{p.tag}</p>
                </div>

                {/* statement + body */}
                <div className="md:col-span-6">
                  <h3 className="text-balance text-xl font-bold leading-snug text-ink md:text-2xl">
                    {p.title}
                  </h3>
                  <p className="mt-4 text-pretty leading-relaxed text-ink-soft">
                    {p.body}
                  </p>
                </div>

                {/* data point — highlighted */}
                <div className="md:col-span-3 md:text-right">
                  <div className="inline-block border-l-2 border-gold pl-4 md:border-l-0 md:border-r-2 md:pl-0 md:pr-4">
                    <div className="figure text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                      {p.stat}
                    </div>
                    <div className="mt-2 max-w-[22ch] text-xs leading-snug text-ink-soft md:ml-auto">
                      {p.statLabel}
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
