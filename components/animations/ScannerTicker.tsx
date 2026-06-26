"use client";

type Signal = {
  label: string;
  text: string;
  tone: "neutral" | "bad" | "good";
};

const SIGNALS: Signal[] = [
  { label: "SCANNING", text: "@CryptoAlpha99", tone: "neutral" },
  { label: "FLAGGED", text: "wallet HiBn...9kRm", tone: "bad" },
  { label: "ANALYZING", text: "narrative moonbase.wtf", tone: "neutral" },
  { label: "LIKELY RUG", text: "rug pattern detected", tone: "bad" },
  { label: "LIKELY OFFICIAL", text: "@0xResearchDAO", tone: "good" },
  { label: "HIGH RISK", text: "domain age: 2 days", tone: "bad" },
  { label: "RUNNING", text: "cross_reference signals", tone: "neutral" },
  { label: "IMPERSONATION", text: "handle mimics @elonmusk", tone: "bad" },
];

const TONE_CLASS: Record<Signal["tone"], string> = {
  neutral: "text-ink-soft",
  bad: "text-red-700",
  good: "text-gold-dark",
};

function TickerItems() {
  return (
    <>
      {SIGNALS.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-2 px-6 text-[11px] uppercase tracking-[0.1em]">
          <span className={`font-semibold ${TONE_CLASS[s.tone]}`}>[ {s.label} ]</span>
          <span className="text-ink-soft">{s.text}</span>
          <span className="text-line">·</span>
        </span>
      ))}
    </>
  );
}

export function ScannerTicker() {
  return (
    <div className="overflow-hidden border-y border-line bg-surface py-3">
      <div className="ticker-track">
        <TickerItems />
        <TickerItems />
      </div>
    </div>
  );
}
