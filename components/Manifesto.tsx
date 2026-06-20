import { Reveal } from "./Reveal";

export function Manifesto() {
  return (
    <section className="border-y border-line bg-surface py-20 md:py-28">
      <div className="shell">
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
    </section>
  );
}
