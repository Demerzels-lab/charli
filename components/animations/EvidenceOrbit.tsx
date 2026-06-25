"use client";

const BADGES_A = ["SOL", "ETH", "WHOIS"];
const BADGES_B = ["X", "crt.sh", "DUNE"];

const PATH_A = "M 100,300 Q 400,50 700,300 T 1300,300";
const PATH_B = "M 200,100 Q 500,400 800,100 T 1400,100";

function Badge({
  label,
  path,
  variant,
  delaySeconds,
}: {
  label: string;
  path: string;
  variant: "a" | "b";
  delaySeconds: number;
}) {
  return (
    <div
      className={`orbit-badge ${variant === "b" ? "orbit-badge--b" : ""} absolute border border-gold/30 bg-surface/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-soft`}
      style={{ offsetPath: `path('${path}')`, animationDelay: `-${delaySeconds}s` } as React.CSSProperties}
    >
      [ {label} ]
    </div>
  );
}

export function EvidenceOrbit({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none overflow-hidden opacity-60 ${className}`} aria-hidden="true">
      {BADGES_A.map((label, i) => (
        <Badge key={label} label={label} path={PATH_A} variant="a" delaySeconds={i * 8} />
      ))}
      {BADGES_B.map((label, i) => (
        <Badge key={label} label={label} path={PATH_B} variant="b" delaySeconds={i * 10} />
      ))}
    </div>
  );
}
