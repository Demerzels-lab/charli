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
            <Carli3DAvatar size={200} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
