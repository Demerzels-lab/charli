"use client";

import { useEffect, useState } from "react";

const LINES = ["> checking @handle...", "> 4 signals found", "> verdict: LEGIT"];

export function AgentIcon() {
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((v) => (v >= LINES.length ? 1 : v + 1));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg width="80" height="60" viewBox="0 0 80 60" aria-hidden="true">
      <rect x="2" y="6" width="76" height="48" rx="2" fill="none" stroke="#A07E4A" strokeWidth="1" opacity="0.3" />
      {LINES.slice(0, visible).map((line, i) => (
        <text key={i} x="8" y={20 + i * 12} fontSize="7" fontFamily="monospace" fill="#54524F">
          {line}
        </text>
      ))}
      <rect
        x={8 + (LINES[visible - 1]?.length ?? 0) * 4.1}
        y={20 + (visible - 1) * 12 - 7}
        width="5"
        height="8"
        fill="#A07E4A"
        style={{ animation: "cursorBlink 1s step-end infinite" }}
      />
    </svg>
  );
}
