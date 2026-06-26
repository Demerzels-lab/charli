'use client';

import { useEffect, useRef, useState } from 'react';

export function Carli3DAvatar({ size = 64 }: { size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<any>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Load model-viewer from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    script.type = 'module';
    document.head.appendChild(script);

    // Get model-viewer element after load
    const timer = setTimeout(() => {
      const model = containerRef.current?.querySelector('model-viewer');
      if (model) {
        modelRef.current = model;
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      // Normalize to -1 to 1 range
      const normalizedX = mouseX / (rect.width / 2);
      const normalizedY = mouseY / (rect.height / 2);

      // Clamp to -1 to 1
      const clampedX = Math.max(-1, Math.min(1, normalizedX));
      const clampedY = Math.max(-1, Math.min(1, normalizedY));

      const rotationY = clampedX * 25;
      const rotationX = -clampedY * 25;

      setRotation({ x: rotationX, y: rotationY });

      // Update camera target to make model "look" at cursor
      if (modelRef.current) {
        const targetX = clampedX * 0.3;
        const targetY = -clampedY * 0.3;
        const targetZ = 0;
        modelRef.current.cameraTarget = `${targetX}m ${targetY}m ${targetZ}m`;
      }
    };

    const handleMouseLeave = () => {
      setRotation({ x: 0, y: 0 });
      if (modelRef.current) {
        modelRef.current.cameraTarget = '0m 0m 0m';
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
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
        perspective: '1200px',
        cursor: 'grab',
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
          transition: transform 0.15s ease-out;
          transform-origin: center;
        }
      `}</style>
      <div
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
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
