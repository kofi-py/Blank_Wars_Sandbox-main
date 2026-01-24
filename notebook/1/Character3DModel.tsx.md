'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Character3DModelProps {
  modelPath: string;
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  isSpeaking?: boolean;
  emotion?: 'neutral' | 'happy' | 'angry' | 'sad' | 'excited' | 'worried' | 'confused' | 'confident';
  onHeadPositionCalculated?: (headY: number) => void; // Callback with Y position of character's head
}

/**
 * Individual 3D character model component
 * Loads GLB models from Meshy AI and handles animations
 */
export default function Character3DModel({
  modelPath,
  position,
  scale = 1,
  rotation = [0, 0, 0],
  isSpeaking = false,
  emotion = 'neutral',
  onHeadPositionCalculated
}: Character3DModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Load GLB model
  const { scene, animations } = useGLTF(modelPath);
  const mixer = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (scene) {
      // Ensure all materials are properly set up and hide pedestals
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

          // Hide pedestal/base geometry from draft models
          const name = mesh.name.toLowerCase();
          if (name.includes('pedestal') || name.includes('base') || name.includes('stand') || name.includes('platform')) {
            mesh.visible = false;
            return;
          }

          if (mesh.material) {
            // Enable proper material rendering
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                mat.needsUpdate = true;
              });
            } else {
              mesh.material.needsUpdate = true;
            }
          }
          // Enable shadows
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      // Calculate bounding box to get actual character head position
      const bbox = new THREE.Box3().setFromObject(scene);

      // Get the actual top of the model after scaling
      // If model feet are at min.y and head at max.y, we need the distance from min to max
      const modelHeight = bbox.max.y - bbox.min.y;
      const headY = modelHeight * scale; // Height from bottom to top after scaling

      // Account for model origin offset - if feet aren't at Y=0 in model file
      const originOffsetY = bbox.min.y * scale; // Where the bottom is relative to origin
      const actualHeadY = headY + originOffsetY; // Actual head position

      console.log(`📏 Character head position calculated: ${actualHeadY.toFixed(2)} (height=${modelHeight.toFixed(2)}, scale=${scale}, offset=${originOffsetY.toFixed(2)})`);

      // Notify parent component of head position for bubble placement
      if (onHeadPositionCalculated) {
        onHeadPositionCalculated(actualHeadY);
      }

      // Set up animations
      if (animations && animations.length > 0) {
        mixer.current = new THREE.AnimationMixer(scene);

        // Play idle animation by default (if available)
        const idleAnimation = animations.find(anim =>
          anim.name.toLowerCase().includes('idle') ||
          anim.name.toLowerCase().includes('walk')
        );

        if (idleAnimation) {
          const action = mixer.current.clipAction(idleAnimation);
          action.play();
        }
      }
    }

    return () => {
      mixer.current?.stopAllAction();
    };
  }, [scene, animations, scale, onHeadPositionCalculated]);

  // Update animation mixer on each frame
  useFrame((state, delta) => {
    mixer.current?.update(delta);

    // Subtle floating animation when speaking
    if (isSpeaking && groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }

    // Subtle rotation on hover
    if (hovered && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  // Calculate grounding offset to prevent feet clipping into floor
  // Initialize with a default value to prevent re-render jumps
  const [groundOffset, setGroundOffset] = useState<number>(0);
  const hasCalculatedOffsetRef = useRef(false);

  useEffect(() => {
    if (scene && !hasCalculatedOffsetRef.current) {
      const bbox = new THREE.Box3().setFromObject(scene);
      // If model's feet are below Y=0, shift up by that amount
      const offset = -bbox.min.y * scale + 0.1; // +0.1 to prevent z-fighting
      setGroundOffset(offset);
      hasCalculatedOffsetRef.current = true;
      // Removed console.log to prevent infinite output
    }
  }, [scene, scale]);

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1] + groundOffset, position[2]]}
      rotation={rotation}
      scale={scale}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={scene.clone()} />

      {/* Rim light when speaking */}
      {isSpeaking && (
        <pointLight
          position={[0, 2, 0]}
          intensity={0.5}
          color="#ffaa00"
          distance={5}
        />
      )}
    </group>
  );
}
