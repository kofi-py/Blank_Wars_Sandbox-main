'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshoptDecoder } from 'meshoptimizer';

// Full 3D position for mouth/jaw anchor point
export interface MouthPosition {
  x: number;
  y: number;
  z: number;
}

interface Character3DModelProps {
  model_path: string;
  position: [number, number, number];
  world_position: [number, number, number]; // World position for head calculation (when inside a positioned group)
  scale?: number;
  rotation?: [number, number, number];
  is_speaking?: boolean;
  emotion?: 'neutral' | 'happy' | 'angry' | 'sad' | 'excited' | 'worried' | 'confused' | 'confident';
  on_mouth_position_calculated: (position: MouthPosition) => void; // Callback with full 3D position of character's mouth
}

/**
 * Individual 3D character model component
 * Loads GLB models from Meshy AI and handles animations
 */
export default function Character3DModel({
  model_path,
  position,
  world_position,
  scale = 1,
  rotation = [0, 0, 0],
  is_speaking = false,
  emotion = 'neutral',
  on_mouth_position_calculated
}: Character3DModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const lastMouthPositionRef = useRef<MouthPosition | null>(null); // Track last reported mouth position
  const jawBoneRef = useRef<THREE.Object3D | null>(null); // Store ref to jaw bone for dynamic updates

  // Load GLB model with meshopt decoder for compressed models
  const { scene, animations } = useGLTF(model_path, true, true, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const idleAction = useRef<THREE.AnimationAction | null>(null);
  const talkAction = useRef<THREE.AnimationAction | null>(null);

  // Calculate grounding offset - MUST be declared before useEffect that uses it
  const [groundOffset, setGroundOffset] = useState<number>(0);
  const hasCalculatedOffsetRef = useRef(false);

  useEffect(() => {
    if (scene && !hasCalculatedOffsetRef.current) {
      // Calculate bounding box
      const bbox = new THREE.Box3().setFromObject(scene);

      // STEP 1: Calculate ground offset as LOCAL VARIABLE (not state yet)
      const calculatedOffset = -bbox.min.y * scale + 0.1; // +0.1 to prevent z-fighting

      // STEP 2: Ensure all materials are properly set up and hide pedestals
      let meshCount = 0;
      let visibleMeshCount = 0;
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          meshCount++;

          // Hide pedestal/base geometry from draft models
          // TEMPORARILY DISABLED to debug metal foldout chair models
          // const name = mesh.name.toLowerCase();
          // if (name.includes('pedestal') || name.includes('base') || name.includes('stand') || name.includes('platform')) {
          //   mesh.visible = false;
          //   return;
          // }

          if (mesh.material) {
            // Enable proper material rendering
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                mat.needsUpdate = true;
                // Force materials to be visible
                mat.transparent = false;
                mat.opacity = 1;
                mat.visible = true;
                mat.depthWrite = true;
                mat.depthTest = true;
                mat.side = THREE.DoubleSide; // Render both sides
                // Force a basic color to ensure visibility (will show if textures fail)
                if (!mat.color) {
                  mat.color = new THREE.Color(0xFF00FF); // Bright magenta for debugging
                }
                // If texture exists, ensure it's loaded
                if (mat.map) {
                  mat.map.needsUpdate = true;
                }
              });
            } else {
              mesh.material.needsUpdate = true;
              // Force materials to be visible
              mesh.material.transparent = false;
              mesh.material.opacity = 1;
              mesh.material.visible = true;
              mesh.material.depthWrite = true;
              mesh.material.depthTest = true;
              mesh.material.side = THREE.DoubleSide; // Render both sides
              // Force a basic color to ensure visibility (will show if textures fail)
              if (!mesh.material.color) {
                mesh.material.color = new THREE.Color(0xFF00FF); // Bright magenta for debugging
              }
              // If texture exists, ensure it's loaded
              if (mesh.material.map) {
                mesh.material.map.needsUpdate = true;
              }
            }
          }
          // Enable shadows
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.visible = true;
          mesh.frustumCulled = false; // Prevent frustum culling
          visibleMeshCount++;
        }
      });
      console.log(`🎨 MODEL LOADED: ${meshCount} meshes total, ${visibleMeshCount} visible, model: ${model_path.split('/').pop()}`);

      // STEP 3: STRICT BONE ANCHORING - NO GUESSWORK
      // We search for specific mouth/jaw bones commonly found in 3D rigs (Mixamo, RPM, etc.)
      const MOUTH_BONE_NAMES = [
        'jaw', 'mouth', 'lips', 'teeth', // Generic
        'mixamorig:head', 'mixamorig:headtop_end', // Mixamo Head (Jaw is often child)
        'head', 'def_head', // Standard Humanoid
        'cc_base_head', 'cc_base_jawroot', // Character Creator
        'bip01_head', // Biped
      ];

      let anchorBone: THREE.Object3D | null = null;
      let highestFoundBone: THREE.Object3D | null = null;

      scene.traverse((child) => {
        if ((child as THREE.Bone).isBone || child.type === 'Bone') {
          const name = child.name.toLowerCase();

          // Track highest bone just in case we need a "top of head" reference if jaw is missing
          // But purely for context, not as a blind bounding box guess
          if (!highestFoundBone || child.position.y > highestFoundBone.position.y) {
            highestFoundBone = child;
          }

          // Check if this is a mouth/jaw bone
          if (MOUTH_BONE_NAMES.some(boneName => name.includes(boneName))) {
            // Prioritize Jaw/Mouth over Head if both found (Jaw is more specific)
            if (!anchorBone || name.includes('jaw') || name.includes('mouth')) {
              anchorBone = child;
            }
          }
        }
      });

      if (anchorBone) {
        // Store ref to jaw bone for dynamic position updates
        jawBoneRef.current = anchorBone;

        // FORCE MATRIX UPDATE: Essential for accurate world positions
        scene.updateMatrixWorld(true);

        // Use proper getWorldPosition() to get bone position accounting for all rotations
        const boneWorldPos = new THREE.Vector3();
        anchorBone.getWorldPosition(boneWorldPos);

        // Apply character scale (getWorldPosition returns unscaled local-to-scene position)
        const scaledBoneX = boneWorldPos.x * scale;
        const scaledBoneY = boneWorldPos.y * scale;
        const scaledBoneZ = boneWorldPos.z * scale;

        // Calculate world space mouth position
        // world_position is where the character group is placed in the scene
        // calculatedOffset moves the model up so feet are at floor
        // scaledBone is the bone position within the model (already scaled)
        const mouthPosition: MouthPosition = {
          x: world_position[0] + scaledBoneX,
          y: world_position[1] + calculatedOffset + scaledBoneY,
          z: world_position[2] + scaledBoneZ
        };

        console.log(`💀 MOUTH ANCHOR LOCKED: ${anchorBone.name} at world position (${mouthPosition.x.toFixed(2)}, ${mouthPosition.y.toFixed(2)}, ${mouthPosition.z.toFixed(2)})`);

        // Pass full 3D position to parent
        on_mouth_position_calculated(mouthPosition);
        lastMouthPositionRef.current = mouthPosition;

      } else {
        console.warn(`⚠️ NO ANCHOR BONE FOUND for model. Bubbles will not be anchored.`);
        // Log available bones to help debugging
        scene.traverse(c => { if ((c as THREE.Bone).isBone) console.log(`- Bone: ${c.name}`); });
        // NO FALLBACK - strict bone-only anchoring as requested
      }

      // STEP 4: Set up animations
      if (animations && animations.length > 0) {
        mixer.current = new THREE.AnimationMixer(scene);
        console.log(`🎬 Found ${animations.length} animations:`, animations.map(a => a.name).join(', '));

        // Find and setup idle animation
        const idleAnimation = animations.find(anim =>
          anim.name.toLowerCase().includes('idle') ||
          anim.name.toLowerCase().includes('walk')
        );

        if (idleAnimation) {
          idleAction.current = mixer.current.clipAction(idleAnimation);
          idleAction.current.play();
          console.log(`🎬 Setup idle animation: ${idleAnimation.name}`);
        }

        // Find and setup talk animation
        const talkAnimation = animations.find(anim =>
          anim.name.toLowerCase().includes('talk') ||
          anim.name.toLowerCase().includes('jaw')
        );

        if (talkAnimation) {
          talkAction.current = mixer.current.clipAction(talkAnimation);
          talkAction.current.setLoop(THREE.LoopRepeat, Infinity);
          console.log(`🎬 Setup talk animation: ${talkAnimation.name}`);
        }
      }

      // STEP 5: Finally set state for rendering (at the end, after using the value)
      setGroundOffset(calculatedOffset);
      hasCalculatedOffsetRef.current = true;
    }

    return () => {
      mixer.current?.stopAllAction();
    };
  }, [scene, animations, scale]); // Removed groundOffset from dependencies - no more circular loop!

  // Switch between idle and talk animations based on is_speaking
  useEffect(() => {
    if (is_speaking && talkAction.current) {
      // Fade to talk animation
      idleAction.current?.fadeOut(0.2);
      talkAction.current.reset().fadeIn(0.2).play();
      console.log(`🎬 Switching to TALK animation`);
    } else if (!is_speaking && idleAction.current) {
      // Fade back to idle animation
      talkAction.current?.fadeOut(0.2);
      idleAction.current.reset().fadeIn(0.2).play();
      console.log(`🎬 Switching to IDLE animation`);
    }
  }, [is_speaking]);

  // Update animation mixer on each frame
  useFrame((state, delta) => {
    mixer.current?.update(delta);

    // Manual jaw animation - DISABLED since we're using Talk animation now
    // if (is_speaking && jawBoneRef.current) {
    //   // Oscillate jaw rotation for talking effect
    //   // Use a faster frequency for more natural speech rhythm
    //   const jawOpenAmount = Math.sin(state.clock.elapsedTime * 8) * 0.15; // ~0.15 radians = ~8.5 degrees
    //   jawBoneRef.current.rotation.x = jawOpenAmount;
    // } else if (jawBoneRef.current) {
    //   // Close jaw when not speaking
    //   jawBoneRef.current.rotation.x = 0;
    // }

    // Subtle floating animation when speaking (preserve groundOffset!)
    if (is_speaking && groupRef.current) {
      // Use position (relative to parent group), not world_position (which is for head calc only)
      groupRef.current.position.y = (position[1] + groundOffset) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }

    // Subtle rotation on hover
    if (hovered && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1] + groundOffset, position[2]]}
      rotation={rotation}
      scale={scale}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={scene} />

      {/* Rim light when speaking */}
      {is_speaking && (
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
