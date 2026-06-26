'use client';

import { useEffect, useRef } from 'react';

export function Carli3DAvatar({ size = 64 }: { size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load model-viewer dynamically
    import('@google/model-viewer').catch(() => {
      console.warn('model-viewer failed to load');
    });
  }, []);

  return (
    <div
      ref={containerRef}
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
        model-viewer {
          width: 100%;
          height: 100%;
        }
      `}</style>
      <model-viewer
        src="/3d-logo.glb"
        alt="CARLI 3D"
        auto-rotate
        camera-controls
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '9999px',
          overflow: 'hidden',
          display: 'block',
        }}
      />
    </div>
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerElement;
    }
  }
  interface ModelViewerElement extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
    src?: string;
    alt?: string;
    'auto-rotate'?: boolean;
    'camera-controls'?: boolean;
  }
}
