export function ProjectIcon() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" aria-hidden="true">
      <circle cx="40" cy="30" r="18" fill="none" stroke="#A07E4A" strokeWidth="1" opacity="0.4" />
      <circle cx="40" cy="30" r="2" fill="#2B2B2E" />
      <g style={{ transformOrigin: "40px 30px", animation: "compassSpin 3.5s cubic-bezier(0.4,0,0.2,1) infinite" }}>
        <path d="M40 30 L40 14 L36 22 Z" fill="#8B2C2C" />
        <path d="M40 30 L40 46 L44 38 Z" fill="#2B2B2E" opacity="0.5" />
      </g>
    </svg>
  );
}
