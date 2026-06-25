"use client";

import { useEffect, useState } from "react";

const CHARS = ["·", "+", "—", "|", "·", "·"];

type Cell = { char: string; gold: boolean; delay: number };

function buildGrid(cols: number, rows: number): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const isNode = Math.random() < 0.08;
    cells.push({
      char: isNode ? "+" : CHARS[Math.floor(Math.random() * CHARS.length)],
      gold: isNode,
      delay: Math.random() * 4,
    });
  }
  return cells;
}

const COLS = 36;
const ROWS = 10;

export function AsciiPattern({ className = "" }: { className?: string }) {
  const [cells, setCells] = useState<Cell[] | null>(null);

  useEffect(() => {
    setCells(buildGrid(COLS, ROWS));
  }, []);

  if (!cells) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none font-mono text-[10px] leading-[1.8] text-ink/20 ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
      }}
    >
      {cells.map((c, i) => (
        <span
          key={i}
          className={c.gold ? "ascii-node text-gold" : undefined}
          style={c.gold ? { animationDelay: `${c.delay}s` } : undefined}
        >
          {c.char}
        </span>
      ))}
    </div>
  );
}
