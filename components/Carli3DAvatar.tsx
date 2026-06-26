'use client';

import { useEffect, useRef } from 'react';

export function Carli3DAvatar({ size = 64 }: { size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load model-viewer from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    script.type = 'module';
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes float-up-down {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-${Math.max(5, size * 0.1)}px);
          }
        }
        .carli-3d-avatar {
          animation: float-up-down 3s ease-in-out infinite;
          display: block;
          width: 100%;
          height: 100%;
        }
      `}</style>
      <model-viewer
        className="carli-3d-avatar"
        src="/3d-logo.glb"
        alt="CARLI 3D"
        auto-rotate
        camera-controls
        touch-action="pan-y"
        style={{
          width: '100%',
          height: '100%',
        } as any}
      />
    </div>
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}
