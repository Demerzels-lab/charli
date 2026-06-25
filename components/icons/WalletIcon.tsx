export function WalletIcon() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" aria-hidden="true">
      {Array.from({ length: 20 }, (_, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const isFlagged = i === 7;
        return (
          <circle
            key={i}
            cx={12 + col * 14}
            cy={10 + row * 12}
            r={3}
            fill={isFlagged ? "#8B2C2C" : "#A07E4A"}
            opacity={isFlagged ? 1 : 0.3}
            style={
              isFlagged
                ? { animation: "nodePulse 2s ease-in-out infinite" }
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}
