'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function GLBModel() {
  const gltf = useGLTF('/3d-logo.glb');
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 2) * 0.15;
    }
  });

  useEffect(() => {
    if (gltf?.scene && groupRef.current) {
      const bbox = new THREE.Box3().setFromObject(groupRef.current);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5;
        camera.position.z = cameraZ;
      }
    }
  }, [gltf, camera]);

  if (!gltf?.scene) return null;

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene.clone()} />
    </group>
  );
}

function GLBScene() {
  return (
    <>
      <Suspense fallback={null}>
        <GLBModel />
      </Suspense>
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
    </>
  );
}

function Canvas3D({ size = 64 }: { size?: number }) {
  return (
    <Canvas
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '9999px' }}
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 2] }}
    >
      <color attach="background" args={['#0a0a0a']} />
      <GLBScene />
    </Canvas>
  );
}

export function Carli3DAvatar({ size = 64 }: { size?: number }) {
  const [mounted, setMounted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || useFallback) {
    return (
      <div className="shrink-0 relative" style={{ width: size, height: size }}>
        <Image
          src="/logo.png"
          alt="CARLI"
          fill
          className="rounded-full border border-line bg-surface object-cover"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  return (
    <div className="shrink-0 relative" style={{ width: size, height: size }}>
      <Suspense fallback={
        <Image
          src="/logo.png"
          alt="CARLI"
          fill
          className="rounded-full border border-line bg-surface object-cover"
          sizes={`${size}px`}
        />
      }>
        <Canvas3D size={size} />
      </Suspense>
    </div>
  );
}
