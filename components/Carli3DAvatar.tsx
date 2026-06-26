'use client';

import Image from 'next/image';

export function Carli3DAvatar({ size = 64 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="shrink-0"
    >
      <style>{`
        @keyframes float-up-down {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .carli-floating {
          animation: float-up-down 3s ease-in-out infinite !important;
          display: inline-block !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
      <div className="carli-floating relative w-full h-full">
        <Image
          src="/logo.png"
          alt="CARLI"
          fill
          className="rounded-full border border-line bg-surface object-cover"
          sizes={`${size}px`}
          priority
        />
      </div>
    </div>
  );
}
