"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

type Props = {
  value: string;
  className?: string;
};

/** Parses "98.6%", "50K+", "10s" into a numeric target + suffix, animates the number up. */
function parseValue(value: string): { target: number; prefix: string; suffix: string; decimals: number } {
  const match = value.match(/^([^\d.]*)([\d.]+)(.*)$/);
  if (!match) return { target: 0, prefix: "", suffix: value, decimals: 0 };
  const [, prefix, numStr, suffix] = match;
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  return { target: parseFloat(numStr), prefix, suffix, decimals };
}

export function CountUp({ value, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView || reduce) {
      setDisplay(value);
      return;
    }
    const { target, prefix, suffix, decimals } = parseValue(value);
    const duration = 900;
    const start = performance.now();

    let frameId: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setDisplay(`${prefix}${current.toFixed(decimals)}${suffix}`);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
