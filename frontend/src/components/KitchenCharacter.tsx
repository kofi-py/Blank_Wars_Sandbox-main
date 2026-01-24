'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface FaceMetrics {
  jawX: number;      // Jaw X position (percentage of screen)
  jawY: number;      // Jaw Y position (percentage of screen)
  headTopY: number;  // HeadTop Y position (percentage of screen)
  faceHeight: number; // Distance from headTop to jaw in pixels
}

interface KitchenCharacterProps {
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  talkTrigger?: number; // Increments when character should talk
  onFaceMetrics: (metrics: FaceMetrics) => void;
}

/**
 * Kitchen Character Component (based on test-app architecture)
 * Handles model loading, jaw bone detection, projection to 2D, and talk animations
 *
 * This is a direct port from blank-wars-models/test-app for reliability
 */
export default function KitchenCharacter({
  modelPath,
  position,
  rotation,
  scale,
  talkTrigger = 0,
  onFaceMetrics
}: KitchenCharacterProps) {
  const group = useRef<THREE.Group>(null);
  const jawMarkerRef = useRef<THREE.Mesh>(null);
  const headTopMarkerRef = useRef<THREE.Mesh>(null);
  const { scene, animations } = useGLTF(modelPath);
  const [ready, setReady] = useState(false);
  const jawBoneRef = useRef<THREE.Object3D | null>(null);
  const headTopBoneRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const talkActionRef = useRef<THREE.AnimationAction | null>(null);
  const lastTriggerRef = useRef(0);
  const { camera, size } = useThree();
  const tempV = useRef(new THREE.Vector3());
  const tempV2 = useRef(new THREE.Vector3());

  // Find bones and setup animations (runs once on mount)
  useEffect(() => {
    scene.traverse((child) => {
      if (child.type === 'Bone') {
        const name = child.name.toLowerCase();
        if (name === 'jaw') {
          jawBoneRef.current = child;
          console.log('💀 JAW BONE LOCKED:', modelPath.split('/').pop());
        } else if (name === 'headtop') {
          headTopBoneRef.current = child;
          console.log('👑 HEADTOP BONE LOCKED:', modelPath.split('/').pop());
        }
      }
    });

    // Setup talk animation
    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(scene);
      mixerRef.current = mixer;

      // Look for 'talk' OR 'jaw' animation
      const talkAnim = animations.find(a => {
        const n = a.name.toLowerCase();
        return n.includes('talk') || n.includes('jaw');
      });

      if (talkAnim) {
        console.log(`🎬 Found Talk Animation: "${talkAnim.name}" for ${modelPath.split('/').pop()}`);
        const action = mixer.clipAction(talkAnim);
        action.setLoop(THREE.LoopRepeat, Infinity);
        talkActionRef.current = action;
      } else {
        console.warn(`⚠️ No 'talk' or 'jaw' animation found in: ${modelPath.split('/').pop()}`, animations.map(a => a.name));
      }
    }

    setReady(true);

    return () => { mixerRef.current?.stopAllAction(); };
  }, [scene, animations, modelPath]);

  // Play animation when talkTrigger changes
  useEffect(() => {
    if (!talkActionRef.current || !mixerRef.current) return;
    if (talkTrigger > lastTriggerRef.current) {
      lastTriggerRef.current = talkTrigger;

      // Play a short burst of the talk animation
      const action = talkActionRef.current;
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = false;
      action.play();

      // Stop after animation completes (about 0.5 seconds)
      setTimeout(() => {
        action.stop();
      }, 500);
    }
  }, [talkTrigger]);

  // Project jaw position to 2D every frame (THIS IS THE KEY - same as test-app)
  useFrame((state, delta) => {
    mixerRef.current?.update(delta);

    if (!jawBoneRef.current || !jawMarkerRef.current || !group.current) return;

    group.current.updateMatrixWorld(true);

    // Get jaw position
    jawBoneRef.current.getWorldPosition(tempV.current);
    jawMarkerRef.current.position.copy(tempV.current);

    // Project jaw 3D to 2D screen coordinates
    const projectedJaw = tempV.current.clone().project(camera);
    const jawPixelX = (projectedJaw.x + 1) / 2 * size.width;
    const jawPixelY = (1 - projectedJaw.y) / 2 * size.height;
    const jawPercentX = (jawPixelX / size.width) * 100;
    const jawPercentY = (jawPixelY / size.height) * 100;

    // Get headTop position (if available)
    let headTopPercentY = jawPercentY - 30; // Default fallback: 30% above jaw
    let faceHeightPixels = size.height * 0.3; // Default fallback

    if (headTopBoneRef.current && headTopMarkerRef.current) {
      headTopBoneRef.current.getWorldPosition(tempV2.current);
      headTopMarkerRef.current.position.copy(tempV2.current);

      // Project headTop 3D to 2D screen coordinates
      const projectedHead = tempV2.current.clone().project(camera);
      const headPixelY = (1 - projectedHead.y) / 2 * size.height;
      headTopPercentY = (headPixelY / size.height) * 100;

      // Calculate actual face height in pixels
      faceHeightPixels = Math.abs(jawPixelY - headPixelY);
    }

    // Update face metrics every frame
    onFaceMetrics({
      jawX: jawPercentX,
      jawY: jawPercentY,
      headTopY: headTopPercentY,
      faceHeight: faceHeightPixels
    });
  });

  if (!ready) return null;

  return (
    <>
      {/* Jaw marker (red) - hidden */}
      <mesh ref={jawMarkerRef} visible={false}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial color="red" />
      </mesh>
      {/* HeadTop marker (blue) - hidden */}
      <mesh ref={headTopMarkerRef} visible={false}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial color="blue" />
      </mesh>
      <group position={position} rotation={rotation} scale={scale}>
        <group ref={group} position={[0, -1, 0]}>
          <primitive object={scene} />
        </group>
      </group>
    </>
  );
}
