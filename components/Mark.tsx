interface MarkProps {
  className?: string;
  size?: number;
}

/**
 * CARLI mark — a geometric "eye/lens in a quadrant" glyph that nods to the
 * tile motifs in the brand reference. Charcoal structure, one gold quadrant.
 * Purely decorative; callers provide an accessible label on the wrapping link.
 */
export function Mark({ className, size = 28 }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* gold quadrant (top-left) */}
      <path d="M16 2A14 14 0 0 0 2 16h14V2Z" className="fill-gold" />
      {/* charcoal quadrants */}
      <path d="M16 2A14 14 0 0 1 30 16H16V2Z" className="fill-ink" />
      <path d="M2 16a14 14 0 0 0 14 14V16H2Z" className="fill-ink" />
      <path
        d="M30 16A14 14 0 0 1 16 30V16h14Z"
        className="fill-ink"
        opacity="0.86"
      />
      {/* lens / observer iris */}
      <circle cx="16" cy="16" r="5.5" className="fill-bg" />
      <circle cx="16" cy="16" r="2.4" className="fill-ink" />
    </svg>
  );
}
