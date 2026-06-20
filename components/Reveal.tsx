"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Distance in px the element travels up while fading in. */
  y?: number;
}

/**
 * Fades content up into view the first time it enters the viewport.
 * Animates only transform + opacity (compositor-safe). Honors reduced motion.
 */
export function Reveal({ children, delay = 0, className, y = 24 }: RevealProps) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: reduce
      ? { opacity: 0 }
      : { opacity: 0, transform: `translateY(${y}px)` },
    shown: reduce
      ? { opacity: 1 }
      : { opacity: 1, transform: "translateY(0px)" },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
