"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type Streak = {
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
  color: string;
};

export function SignalStreaks({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let streaks: Streak[] = [];
    let frameId: number;

    const makeStreaks = () => {
      streaks = Array.from({ length: 28 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 8 + Math.random() * 40,
        speed: 0.3 + Math.random() * 1.2,
        opacity: 0.05 + Math.random() * 0.1,
        color: Math.random() > 0.7 ? "160,126,74" : "43,43,46",
      }));
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      makeStreaks();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of streaks) {
        s.x -= s.speed;
        if (s.x + s.len < 0) s.x = width + Math.random() * 100;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.len, s.y);
        ctx.strokeStyle = `rgba(${s.color}, ${s.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      frameId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, [reduce]);

  if (reduce) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 120px)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 120px)",
      }}
    />
  );
}
