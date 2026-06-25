"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

type Props = {
  text: string;
  className?: string;
};

export function GlitchText({ text, className = "" }: Props) {
  const [isGlitching, setIsGlitching] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;

    let timeout: ReturnType<typeof setTimeout>;
    const glitch = () => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 280);
      timeout = setTimeout(glitch, 5000 + Math.random() * 5000);
    };
    timeout = setTimeout(glitch, 3000);
    return () => clearTimeout(timeout);
  }, [reduce]);

  return (
    <span className={`glitch-text ${isGlitching ? "is-glitching" : ""} ${className}`}>
      {text}
    </span>
  );
}
