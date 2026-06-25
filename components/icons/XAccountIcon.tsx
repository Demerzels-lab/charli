export function XAccountIcon() {
  const bars = [14, 22, 10, 30, 18, 26, 12];
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" aria-hidden="true">
      {bars.map((h, i) => {
        const isAnomaly = i === 3;
        return (
          <rect
            key={i}
            x={6 + i * 10}
            y={48 - h}
            width={6}
            height={h}
            rx={1}
            fill={isAnomaly ? "#8B2C2C" : "#A07E4A"}
            opacity={isAnomaly ? 0.9 : 0.45}
            style={{
              transformOrigin: `${6 + i * 10 + 3}px 48px`,
              animation: `barWave 2.6s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        );
      })}
    </svg>
  );
}
