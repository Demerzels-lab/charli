'use client';

export function Carli3DAvatar({ size = 64 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        animation: 'float-3d 3s ease-in-out infinite',
      }}
      className="shrink-0"
    >
      <style>{`
        @keyframes float-3d {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }
      `}</style>
      <img
        src="/logo.png"
        alt="CARLI"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '9999px',
          border: '1px solid #ccc',
        }}
      />
    </div>
  );
}
