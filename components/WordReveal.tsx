"use client";

import { motion, useReducedMotion } from "motion/react";

interface WordRevealProps {
  text: string;
  className?: string;
  /** Delay before the whole sequence starts (seconds). */
  startDelay?: number;
  /** Per-word stagger (seconds). */
  stagger?: number;
  /** Optional set of words (by index) to paint in gold. */
  accentIndices?: number[];
}

/**
 * Reveals a headline one word at a time on mount.
 * Each word rises + fades (transform/opacity only). Reduced motion shows it instantly.
 */
export function WordReveal({
  text,
  className,
  startDelay = 0.15,
  stagger = 0.08,
  accentIndices = [],
}: WordRevealProps) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const accent = new Set(accentIndices);

  if (reduce) {
    return (
      <span className={className}>
        {words.map((w, i) => (
          <span key={i} className={accent.has(i) ? "text-gold" : undefined}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-baseline"
          aria-hidden="true"
        >
          <motion.span
            className={`inline-block ${accent.has(i) ? "text-gold" : ""}`}
            initial={{ transform: "translateY(110%)" }}
            animate={{ transform: "translateY(0%)" }}
            transition={{
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
              delay: startDelay + i * stagger,
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
