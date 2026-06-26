'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function Model() {
  const { scene } = useGLTF('/3d-logo.glb');
  const groupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.scale.set(1.5, 1.5, 1.5);
    }
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;

    const t = clock.elapsedTime;

    // Float naik-turun (sinus)
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.12;

    // Target rotasi dari kursor + idle drift
    const targetY = pointer.x * 0.5 + Math.sin(t * 0.25) * 0.08;
    const targetX = -pointer.y * 0.28;

    // Lerp smoothing (6% per frame = smooth)
    rotationRef.current.y = THREE.MathUtils.lerp(rotationRef.current.y, targetY, 0.06);
    rotationRef.current.x = THREE.MathUtils.lerp(rotationRef.current.x, targetX, 0.06);

    groupRef.current.rotation.y = rotationRef.current.y;
    groupRef.current.rotation.x = rotationRef.current.x;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} />
    </group>
  );
}

function Scene() {
  return (
    <>
      <Suspense fallback={null}>
        <Model />
      </Suspense>
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, 5, 8]} intensity={0.8} color="#d4af37" />
    </>
  );
}

export function Carli3DAvatar({ size = 64 }: { size?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ width: size, height: size }} />;

  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 3.5] }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        gl={{ antialias: true, alpha: true, toneMappingExposure: 1.3 }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
