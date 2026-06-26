'use client';

import Image from 'next/image';

export function Carli3DAvatar({ size = 64 }: { size?: number }) {
  return (
    <div
      className="shrink-0 relative"
      style={{ width: size, height: size }}
    >
      <style>{`
        @keyframes float-up-down {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .carli-avatar {
          animation: float-up-down 3s ease-in-out infinite;
        }
      `}</style>
      <div className="carli-avatar w-full h-full">
        <Image
          src="/logo.png"
          alt="CARLI"
          fill
          className="rounded-full border border-line bg-surface object-cover"
          sizes={`${size}px`}
        />
      </div>
    </div>
  );
}
