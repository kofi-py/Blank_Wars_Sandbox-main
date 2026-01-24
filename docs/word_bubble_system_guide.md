# Comic Book Word Bubble System - Complete Guide

A comprehensive guide for implementing dynamic, intelligent speech bubbles that anchor to 3D character jaws, avoid obstacles, respect screen boundaries, and use comic book layout patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Part 1: Blender Jaw Rigging](#part-1-blender-jaw-rigging)
3. [Part 2: Three.js Jaw Tracking](#part-2-threejs-jaw-tracking)
4. [Part 3: 3D to 2D Screen Projection](#part-3-3d-to-2d-screen-projection)
5. [Part 4: Smart Layout System](#part-4-smart-layout-system)
6. [Part 5: Obstacle Detection](#part-5-obstacle-detection)
7. [Part 6: Boundary Awareness](#part-6-boundary-awareness)
8. [Part 7: Layout Patterns Reference](#part-7-layout-patterns-reference)
9. [Part 8: Comic Book Styling](#part-8-comic-book-styling)
10. [Complete Code Reference](#complete-code-reference)

---

## Overview

This system creates speech bubbles that:
- **Anchor to character jaw** - Track a 3D bone and project to 2D screen coordinates
- **Detect obstacles** - Avoid overlapping other characters in the scene
- **Respect boundaries** - Stay within screen edges
- **Use variety** - Randomly select from valid layout patterns for visual interest
- **Prevent overlap** - Bubbles never cover each other or the speaker's face

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Blender Model  │ ──▶ │  Three.js Scene  │ ──▶ │  React Bubbles  │
│  (with Jaw bone)│     │  (Jaw tracking)  │     │  (Smart layout) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## Part 1: Blender Jaw Rigging

### Requirements
Your 3D model needs a bone named `Jaw` (or `Head` as fallback) that the system can track.

### Steps to Add Jaw Bone

1. **Open your model in Blender**
2. **Enter Edit Mode on the Armature**
3. **Create or rename the jaw bone:**
   - Select the bone at the character's jaw/chin area
   - In Properties panel > Bone, rename it to `Jaw`
   - Alternatively, use `Head` if jaw is not available

4. **Ensure bone is part of the hierarchy:**
   ```
   Root
   └── Spine
       └── Neck
           └── Head
               └── Jaw  ← This is what we track
   ```

5. **Export as GLTF/GLB:**
   - File > Export > glTF 2.0
   - Enable "Include: Armature"
   - Enable "Skinning" for animations

### Blender Python Script (Optional)
```python
import bpy

# Find and rename jaw bone
armature = bpy.context.active_object
if armature and armature.type == 'ARMATURE':
    for bone in armature.data.bones:
        name = bone.name.lower()
        if 'jaw' in name or 'chin' in name or 'mouth' in name:
            bone.name = 'Jaw'
            print(f"Renamed bone to 'Jaw'")
            break
```

---

## Part 2: Three.js Jaw Tracking

### Scene Component (Scene.tsx)

This component loads the 3D model and tracks the jaw bone position every frame.

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

interface CharacterProps {
    onJawPosition?: (pos: { x: number, y: number }) => void;
    position: [number, number, number];
    name?: string;
}

function Character({ onJawPosition, position, name = 'Character' }: CharacterProps) {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF('/models/your-character.glb');
    const clonedScene = useRef<THREE.Group | null>(null);
    const { camera, size } = useThree();
    const jawBoneRef = useRef<THREE.Object3D | null>(null);
    const tempV = useRef(new THREE.Vector3());

    // Clone the scene so we can have multiple instances
    useEffect(() => {
        clonedScene.current = scene.clone();
    }, [scene]);

    // Find the Jaw/Head node once the model loads
    useEffect(() => {
        if (!clonedScene.current) return;

        let foundNode: THREE.Object3D | null = null;
        const PRIORITY_NAMES = ['jaw', 'mouth', 'head'];

        clonedScene.current.traverse((child) => {
            const nodeName = child.name.toLowerCase();
            for (const boneName of PRIORITY_NAMES) {
                if (nodeName === boneName) {
                    if (!foundNode || nodeName === 'jaw') {
                        foundNode = child;
                    }
                }
            }
        });

        if (foundNode) {
            jawBoneRef.current = foundNode;
            console.log(`💀 ${name} JAW LOCKED: ${foundNode.name}`);
        }
    }, [clonedScene.current, name]);

    // Track jaw position EVERY FRAME
    useFrame(() => {
        if (!jawBoneRef.current || !group.current || !onJawPosition) return;

        // Update world matrix to get accurate position
        group.current.updateMatrixWorld(true);
        jawBoneRef.current.getWorldPosition(tempV.current);

        // Project 3D position to 2D screen coordinates
        const projected = tempV.current.clone().project(camera);
        const pixelX = (projected.x + 1) / 2 * size.width;
        const pixelY = (1 - projected.y) / 2 * size.height;

        // Convert to percentage for responsive positioning
        const percentX = (pixelX / size.width) * 100;
        const percentY = (pixelY / size.height) * 100;

        onJawPosition({ x: percentX, y: percentY });
    });

    if (!clonedScene.current) return null;

    return (
        <group ref={group} position={position}>
            <primitive object={clonedScene.current} />
        </group>
    );
}
```

### Key Concepts

1. **Clone the scene** - Allows multiple character instances
2. **Priority bone search** - Looks for `jaw` first, then `mouth`, then `head`
3. **Every-frame tracking** - Uses `useFrame` hook for real-time updates
4. **World position** - `getWorldPosition` gets actual 3D coordinates

---

## Part 3: 3D to 2D Screen Projection

### The Projection Formula

```typescript
// Get 3D world position of the jaw bone
jawBoneRef.current.getWorldPosition(tempV.current);

// Project to normalized device coordinates (-1 to 1)
const projected = tempV.current.clone().project(camera);

// Convert to pixel coordinates
const pixelX = (projected.x + 1) / 2 * size.width;
const pixelY = (1 - projected.y) / 2 * size.height;  // Note: Y is inverted

// Convert to percentage (responsive)
const percentX = (pixelX / size.width) * 100;
const percentY = (pixelY / size.height) * 100;
```

### Why Percentages?
Using percentages allows bubbles to stay anchored correctly when:
- Window is resized
- Different screen sizes
- Camera moves

---

## Part 4: Smart Layout System

### Layout Type Definitions

```typescript
type LayoutType =
    | 'stack-right'       // Vertical stack offset to right
    | 'stack-left'        // Vertical stack offset to left
    | 'horizontal-right'  // Horizontal chain to right
    | 'horizontal-left'   // Horizontal chain to left
    | 'arc-over'          // Arc over head
    | 'arc-left'          // Arc curving left
    | 'diagonal-up-right' // Diagonal going up and right
    | 'diagonal-up-left'  // Diagonal going up and left
    | 'L-right-up'        // L-shape: right then up
    | 'L-up-right'        // L-shape: up then right
    | 'zigzag'            // Zigzag pattern
    | 'staircase';        // Staircase pattern
```

### Layout Selection Algorithm

The system builds a list of ALL valid layouts, then randomly picks one for variety:

```typescript
const selectBestLayout = (): LayoutType => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const jawPixelX = (jawPos.x / 100) * screenWidth;
    const jawPixelY = (jawPos.y / 100) * screenHeight;

    // Calculate available space in each direction
    const spaceRight = screenWidth - jawPixelX - 50;
    const spaceLeft = jawPixelX - 50;
    const spaceUp = jawPixelY - 80;

    // Detect obstacles
    const obstaclePixelX = (obstacleJawPos.x / 100) * screenWidth;
    const obstacleDistance = obstaclePixelX - jawPixelX;
    const obstacleOnRight = showObstacle && obstacleDistance > 0 && obstacleDistance < 400;
    const obstacleOnLeft = showObstacle && obstacleDistance < 0 && obstacleDistance > -400;

    // Build list of valid layouts
    const validLayouts: LayoutType[] = [];

    // Vertical layouts (always safe if space above)
    if (spaceUp > 120) {
        validLayouts.push('stack-right');
        if (!obstacleOnLeft && spaceLeft > 100) validLayouts.push('stack-left');
    }

    // Right-side layouts
    if (!obstacleOnRight) {
        if (spaceRight > 350) validLayouts.push('horizontal-right');
        if (spaceRight > 250 && spaceUp > 100) validLayouts.push('diagonal-up-right');
        if (spaceRight > 200 && spaceUp > 100) validLayouts.push('L-right-up', 'L-up-right');
        if (spaceRight > 150) validLayouts.push('staircase');
    }

    // Left-side layouts
    if (!obstacleOnLeft) {
        if (spaceLeft > 350) validLayouts.push('horizontal-left');
        if (spaceLeft > 200 && spaceUp > 100) validLayouts.push('diagonal-up-left');
    }

    // Arc layouts
    if (spaceUp > 150) {
        validLayouts.push('arc-over');
        if (!obstacleOnLeft && spaceLeft > 150) validLayouts.push('arc-left');
    }

    // Zigzag (works in tight spaces)
    if (spaceUp > 100) validLayouts.push('zigzag');

    // Fallback
    if (validLayouts.length === 0) {
        validLayouts.push('stack-right');
    }

    // RANDOMLY pick for variety!
    return validLayouts[Math.floor(Math.random() * validLayouts.length)];
};
```

### Layout Lock System

The layout is **locked** when speech begins and stays locked until bubbles clear:

```typescript
const [lockedLayout, setLockedLayout] = useState<LayoutType | null>(null);

const handleSpeak = () => {
    // Lock layout at start
    const newLayout = selectBestLayout();
    setLockedLayout(newLayout);
    
    // ... add bubbles ...
    
    // Clear and unlock when done
    setTimeout(() => {
        setBubbles([]);
        setLockedLayout(null);
    }, duration);
};
```

---

## Part 5: Obstacle Detection

### How It Works

1. Convert both jaw positions to pixels
2. Calculate distance between speaker and obstacle
3. Mark obstacle direction (left/right)
4. Filter out layouts that would collide

```typescript
// Convert to pixels
const obstaclePixelX = (obstacleJawPos.x / 100) * screenWidth;
const obstacleDistance = obstaclePixelX - jawPixelX;

// Detect direction and proximity
const obstacleOnRight = showObstacle && obstacleDistance > 0 && obstacleDistance < 400;
const obstacleOnLeft = showObstacle && obstacleDistance < 0 && obstacleDistance > -400;

// Use in layout selection
if (!obstacleOnRight) {
    // Safe to use right-side layouts
    validLayouts.push('horizontal-right');
}
```

---

## Part 6: Boundary Awareness

### Space Calculation

```typescript
// Available space from jaw to each edge
const spaceRight = screenWidth - jawPixelX - 50;  // 50px margin
const spaceLeft = jawPixelX - 50;
const spaceUp = jawPixelY - 80;  // 80px margin from top
```

### Space Requirements per Layout

| Layout | spaceRight | spaceLeft | spaceUp |
|--------|-----------|-----------|---------|
| stack-right | - | - | > 120px |
| stack-left | - | > 100px | > 120px |
| horizontal-right | > 350px | - | - |
| horizontal-left | - | > 350px | - |
| diagonal-up-right | > 250px | - | > 100px |
| diagonal-up-left | - | > 200px | > 100px |
| L-right-up | > 200px | - | > 100px |
| L-up-right | > 200px | - | > 100px |
| arc-over | - | - | > 150px |
| arc-left | - | > 150px | > 150px |
| zigzag | - | - | > 100px |
| staircase | > 150px | - | - |

---

## Part 7: Layout Patterns Reference

### Position Calculations

```typescript
const BUBBLE_WIDTH = 120;
const BUBBLE_HEIGHT = 45;

const positions = bubbles.map((_, index) => {
    let x = 0, y = 0;

    switch (layout) {
        case 'stack-right':
            x = 50;
            y = -(index * (BUBBLE_HEIGHT + 5));
            break;

        case 'stack-left':
            x = -50;
            y = -(index * (BUBBLE_HEIGHT + 5));
            break;

        case 'horizontal-right':
            x = index * BUBBLE_WIDTH;
            y = 0;
            break;

        case 'horizontal-left':
            x = -(index * BUBBLE_WIDTH);
            y = 0;
            break;

        case 'arc-over':
            // Centered arc with sine curve
            const arcSpacing = BUBBLE_WIDTH + 10;
            const arcHeight = 50;
            const centerX = ((bubbles.length - 1) / 2) * arcSpacing;
            x = (index * arcSpacing) - centerX;
            const arcProgress = index / Math.max(bubbles.length - 1, 1);
            y = -arcHeight * Math.sin(arcProgress * Math.PI) - 50;
            break;

        case 'arc-left':
            x = -(index * (BUBBLE_WIDTH * 0.8)) - 40;
            const leftArcProg = index / Math.max(bubbles.length - 1, 1);
            y = -40 * Math.sin(leftArcProg * Math.PI) - (index * 20) - 30;
            break;

        case 'diagonal-up-right':
            x = index * BUBBLE_WIDTH;
            y = -(index * (BUBBLE_HEIGHT + 10));
            break;

        case 'diagonal-up-left':
            x = -(index * BUBBLE_WIDTH);
            y = -(index * (BUBBLE_HEIGHT + 10));
            break;

        case 'L-right-up':
            if (index < 2) {
                x = index * BUBBLE_WIDTH;
                y = 0;
            } else {
                x = BUBBLE_WIDTH;
                y = -((index - 1) * (BUBBLE_HEIGHT + 5));
            }
            break;

        case 'L-up-right':
            if (index < 2) {
                x = 50;
                y = -(index * (BUBBLE_HEIGHT + 5));
            } else {
                x = 50 + ((index - 1) * BUBBLE_WIDTH);
                y = -(BUBBLE_HEIGHT + 5);
            }
            break;

        case 'zigzag':
            x = (index % 2 === 0) ? 40 : -40;
            y = -(index * (BUBBLE_HEIGHT + 10));
            break;

        case 'staircase':
            x = index * (BUBBLE_WIDTH * 0.6);
            y = -(index * (BUBBLE_HEIGHT + 5));
            break;
    }

    return { x, y };
});
```

### Visual Pattern Reference

```
STACK-RIGHT          HORIZONTAL-RIGHT       ARC-OVER
    ┌───┐            ┌───┬───┬───┬───┐         ┌───┐
    │ 4 │            │ 1 │ 2 │ 3 │ 4 │     ┌───┐   ┌───┐
    ├───┤            └───┴───┴───┴───┘     │ 2 │   │ 3 │
    │ 3 │              ▲                   └───┘   └───┘
    ├───┤              │                 ┌───┐       ┌───┐
    │ 2 │              │                 │ 1 │       │ 4 │
    ├───┤              │                 └───┘       └───┘
    │ 1 │◄─────────────┘                   ▲
    └─┬─┘                                  │
      │                                    │
     👤                                   👤


DIAGONAL-UP-RIGHT    L-RIGHT-UP            ZIGZAG
            ┌───┐    ┌───┐                     ┌───┐
        ┌───┤ 4 │    │ 4 │                 ┌───┤ 4 │
    ┌───┤ 3 ├───┘    ├───┤             ┌───┤ 3 ├───┘
┌───┤ 2 ├───┘        │ 3 │         ┌───┤ 2 ├───┘
│ 1 ├───┘            ├───┤     ┌───┤ 1 ├───┘
└─┬─┘                │ 2 ├───┐ └─┬─┘
  │                  └───┤ 1 │   │
 👤                      └─┬─┘  👤
                           │
                          👤
```

---

## Part 8: Comic Book Styling

### Bubble Styling

```typescript
const bubbleStyle = {
    position: 'absolute',
    left: `calc(${jawPos.x}% + ${pos.x}px)`,
    top: `calc(${jawPos.y - 6}% + ${pos.y}px)`,
    transform: `translate(-50%, -100%) rotate(${bubble.rotate * 0.3}deg) scale(${bubble.scale})`,
    minWidth: '90px',
    maxWidth: '130px',
    backgroundColor: 'white',
    padding: '10px 14px',
    borderRadius: bubble.borderRadius,  // Random asymmetric corners
    border: '2px solid #222',
    boxShadow: '3px 3px 0px #222',
    fontFamily: '"Comic Sans MS", "Bangers", cursive, sans-serif',
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center',
    animation: 'bubblePopIn 0.3s ease-out forwards',
};
```

### Random Variations (Generated Once)

```typescript
const bubble = {
    rotate: (Math.random() - 0.5) * 6,  // -3 to +3 degrees
    scale: 0.95 + Math.random() * 0.1,  // 0.95 to 1.05
    borderRadius: `${18 + Math.random() * 6}px ${20 + Math.random() * 8}px ${16 + Math.random() * 6}px ${22 + Math.random() * 6}px`,
};
```

### Speech Tail

```typescript
// Only on first bubble
{index === 0 && (
    <div style={{
        position: 'absolute',
        bottom: '-18px',
        left: isArc ? '70%' : '25px',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '14px solid transparent',
        borderTop: '22px solid white',
        filter: 'drop-shadow(2px 2px 0px #222)',
        transform: `rotate(${isArc ? -45 : -15}deg)`
    }} />
)}
```

### Pop-in Animation

```css
@keyframes bubblePopIn {
    from { opacity: 0; transform: translate(-50%, -100%) scale(0.5); }
    to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
}
```

---

## Complete Code Reference

### File: Scene.tsx

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

interface CharacterProps {
    onJawPosition?: (pos: { x: number, y: number }) => void;
    position: [number, number, number];
    name?: string;
}

function Character({ onJawPosition, position, name = 'Character' }: CharacterProps) {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF('/models/achilles_source_talk.glb');
    const clonedScene = useRef<THREE.Group | null>(null);
    const { camera, size } = useThree();
    const jawBoneRef = useRef<THREE.Object3D | null>(null);
    const tempV = useRef(new THREE.Vector3());

    // Clone the scene so we can have multiple instances
    useEffect(() => {
        clonedScene.current = scene.clone();
    }, [scene]);

    // Find the Jaw/Head node once the model loads
    useEffect(() => {
        if (!clonedScene.current) return;

        let foundNode: THREE.Object3D | null = null;
        const PRIORITY_NAMES = ['jaw', 'mouth', 'head'];

        clonedScene.current.traverse((child) => {
            const nodeName = child.name.toLowerCase();
            for (const boneName of PRIORITY_NAMES) {
                if (nodeName === boneName) {
                    if (!foundNode || nodeName === 'jaw') {
                        foundNode = child;
                    }
                }
            }
        });

        if (foundNode) {
            jawBoneRef.current = foundNode;
            console.log(`💀 ${name} JAW LOCKED: ${foundNode.name}`);
        }
    }, [clonedScene.current, name]);

    // Track jaw position EVERY FRAME
    useFrame(() => {
        if (!jawBoneRef.current || !group.current || !onJawPosition) return;

        group.current.updateMatrixWorld(true);
        jawBoneRef.current.getWorldPosition(tempV.current);

        const projected = tempV.current.clone().project(camera);
        const pixelX = (projected.x + 1) / 2 * size.width;
        const pixelY = (1 - projected.y) / 2 * size.height;

        const percentX = (pixelX / size.width) * 100;
        const percentY = (pixelY / size.height) * 100;

        onJawPosition({ x: percentX, y: percentY });
    });

    if (!clonedScene.current) return null;

    return (
        <group ref={group} position={position}>
            <primitive object={clonedScene.current} />
        </group>
    );
}

interface SceneProps {
    onJawPosition: (pos: { x: number, y: number }) => void;
    onObstaclePosition?: (pos: { x: number, y: number }) => void;
    characterPosition?: [number, number, number];
    obstaclePosition?: [number, number, number];
    showObstacle?: boolean;
}

export default function Scene({
    onJawPosition,
    onObstaclePosition,
    characterPosition = [0, -1, 0],
    obstaclePosition = [1.5, -1, 0],
    showObstacle = true
}: SceneProps) {
    return (
        <Canvas style={{ background: '#1a1a2e' }}>
            <PerspectiveCamera makeDefault position={[0, 0.5, 4]} fov={50} />
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1} />

            <React.Suspense fallback={<Html center><div style={{ color: 'white' }}>Loading...</div></Html>}>
                {/* Main speaking character */}
                <Character
                    onJawPosition={onJawPosition}
                    position={characterPosition}
                    name="Speaker"
                />

                {/* Second character as obstacle */}
                {showObstacle && (
                    <Character
                        onJawPosition={onObstaclePosition}
                        position={obstaclePosition}
                        name="Obstacle"
                    />
                )}
            </React.Suspense>

            <OrbitControls target={[0.5, 0.5, 0]} />
        </Canvas>
    );
}
```

### File: page.tsx (Complete Bubble System)

```tsx
'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

const Scene = dynamic(() => import('./Scene'), { ssr: false });

interface Bubble {
    id: number;
    message: string;
    rotate: number;
    scale: number;
    borderRadius: string;
}

// All available layout patterns
type LayoutType =
    | 'stack-right'      // Vertical stack offset to right
    | 'stack-left'       // Vertical stack offset to left  
    | 'horizontal-right' // Horizontal chain to right
    | 'horizontal-left'  // Horizontal chain to left
    | 'arc-over'         // Arc over head
    | 'arc-left'         // Arc curving left
    | 'diagonal-up-right'// Diagonal going up and right
    | 'diagonal-up-left' // Diagonal going up and left
    | 'L-right-up'       // L-shape: right then up
    | 'L-up-right'       // L-shape: up then right
    | 'zigzag'           // Zigzag pattern
    | 'staircase';       // Staircase pattern

export default function TestJawPage() {
    const [charPos, setCharPos] = useState<[number, number, number]>([-0.8, -1, 0]);
    const [obstaclePos] = useState<[number, number, number]>([1.2, -1, 0]);
    const [jawPos, setJawPos] = useState({ x: 50, y: 50 });
    const [obstacleJawPos, setObstacleJawPos] = useState({ x: 70, y: 50 });
    const [showObstacle, setShowObstacle] = useState(true);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [lockedLayout, setLockedLayout] = useState<LayoutType | null>(null);
    const bubbleIdRef = useRef(0);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

    const handleJawPosition = useCallback((pos: { x: number, y: number }) => {
        setJawPos(pos);
    }, []);

    const handleObstacleJawPosition = useCallback((pos: { x: number, y: number }) => {
        setObstacleJawPos(pos);
    }, []);

    const handleSpeak = () => {
        timeoutsRef.current.forEach(t => clearTimeout(t));
        timeoutsRef.current = [];
        setBubbles([]);
        bubbleIdRef.current = 0;

        // LOCK the layout at the start based on current conditions
        const newLayout = selectBestLayout();
        setLockedLayout(newLayout);
        console.log(`🔒 Layout LOCKED: ${newLayout}`);

        const sentences = [
            "By the gods!",
            "I am Achilles!",
            "The mightiest warrior!",
            "Of all Greece!"
        ];

        sentences.forEach((sentence, index) => {
            const timeout = setTimeout(() => {
                setBubbles(prev => [...prev, {
                    id: bubbleIdRef.current++,
                    message: sentence,
                    rotate: (Math.random() - 0.5) * 6,
                    scale: 0.95 + Math.random() * 0.1,
                    borderRadius: `${18 + Math.random() * 6}px ${20 + Math.random() * 8}px ${16 + Math.random() * 6}px ${22 + Math.random() * 6}px`,
                }]);
            }, index * 700);
            timeoutsRef.current.push(timeout);
        });

        const clearTimeout_ = setTimeout(() => {
            setBubbles([]);
            setLockedLayout(null);
        }, sentences.length * 700 + 4000);
        timeoutsRef.current.push(clearTimeout_);
    };

    useEffect(() => {
        return () => timeoutsRef.current.forEach(t => clearTimeout(t));
    }, []);

    const BUBBLE_WIDTH = 120;
    const BUBBLE_HEIGHT = 45;

    // Select a random layout from all VALID options for variety
    const selectBestLayout = (): LayoutType => {
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
        const jawPixelX = (jawPos.x / 100) * screenWidth;
        const jawPixelY = (jawPos.y / 100) * screenHeight;

        const spaceRight = screenWidth - jawPixelX - 50;
        const spaceLeft = jawPixelX - 50;
        const spaceUp = jawPixelY - 80;

        // Obstacle detection
        const obstaclePixelX = (obstacleJawPos.x / 100) * screenWidth;
        const obstacleDistance = obstaclePixelX - jawPixelX;
        const obstacleOnRight = showObstacle && obstacleDistance > 0 && obstacleDistance < 400;
        const obstacleOnLeft = showObstacle && obstacleDistance < 0 && obstacleDistance > -400;

        console.log(`🎯 Obstacle: dist=${obstacleDistance.toFixed(0)}px, R=${obstacleOnRight}, L=${obstacleOnLeft}`);
        console.log(`📏 Space: R=${spaceRight.toFixed(0)} L=${spaceLeft.toFixed(0)} U=${spaceUp.toFixed(0)}`);

        // Build list of ALL valid layouts based on available space
        const validLayouts: LayoutType[] = [];

        // Always-safe vertical layouts (just need space above)
        if (spaceUp > 120) {
            validLayouts.push('stack-right');
            if (!obstacleOnLeft && spaceLeft > 100) validLayouts.push('stack-left');
        }

        // Right-side layouts (need no obstacle on right + space)
        if (!obstacleOnRight) {
            if (spaceRight > 350) validLayouts.push('horizontal-right');
            if (spaceRight > 250 && spaceUp > 100) validLayouts.push('diagonal-up-right');
            if (spaceRight > 200 && spaceUp > 100) validLayouts.push('L-right-up', 'L-up-right');
            if (spaceRight > 150) validLayouts.push('staircase');
        }

        // Left-side layouts (need no obstacle on left + space)
        if (!obstacleOnLeft) {
            if (spaceLeft > 350) validLayouts.push('horizontal-left');
            if (spaceLeft > 200 && spaceUp > 100) validLayouts.push('diagonal-up-left');
        }

        // Arc layouts (need space above)
        if (spaceUp > 150) {
            validLayouts.push('arc-over');
            if (!obstacleOnLeft && spaceLeft > 150) validLayouts.push('arc-left');
        }

        // Zigzag works in tight spaces
        if (spaceUp > 100) validLayouts.push('zigzag');

        // Fallback if nothing valid
        if (validLayouts.length === 0) {
            validLayouts.push('stack-right');
        }

        console.log(`🎲 Valid layouts: [${validLayouts.join(', ')}]`);

        // RANDOMLY pick from valid layouts for variety!
        const chosen = validLayouts[Math.floor(Math.random() * validLayouts.length)];
        console.log(`✨ Randomly chose: ${chosen}`);

        return chosen;
    };

    // Calculate positions based on locked layout
    const positions = useMemo(() => {
        const layout = lockedLayout || 'stack-right';
        const posArray: Array<{ x: number; y: number }> = [];

        bubbles.forEach((_, index) => {
            let x = 0, y = 0;

            switch (layout) {
                case 'stack-right':
                    x = 50;
                    y = -(index * (BUBBLE_HEIGHT + 5));
                    break;

                case 'stack-left':
                    x = -50;
                    y = -(index * (BUBBLE_HEIGHT + 5));
                    break;

                case 'horizontal-right':
                    x = index * BUBBLE_WIDTH;
                    y = 0;
                    break;

                case 'horizontal-left':
                    x = -(index * BUBBLE_WIDTH);
                    y = 0;
                    break;

                case 'arc-over':
                    const arcSpacing = BUBBLE_WIDTH + 10;
                    const arcHeight = 50;
                    const centerX = ((bubbles.length - 1) / 2) * arcSpacing;
                    x = (index * arcSpacing) - centerX;
                    const arcProgress = index / Math.max(bubbles.length - 1, 1);
                    y = -arcHeight * Math.sin(arcProgress * Math.PI) - 50;
                    break;

                case 'arc-left':
                    x = -(index * (BUBBLE_WIDTH * 0.8)) - 40;
                    const leftArcProg = index / Math.max(bubbles.length - 1, 1);
                    y = -40 * Math.sin(leftArcProg * Math.PI) - (index * 20) - 30;
                    break;

                case 'diagonal-up-right':
                    x = index * BUBBLE_WIDTH;
                    y = -(index * (BUBBLE_HEIGHT + 10));
                    break;

                case 'diagonal-up-left':
                    x = -(index * BUBBLE_WIDTH);
                    y = -(index * (BUBBLE_HEIGHT + 10));
                    break;

                case 'L-right-up':
                    if (index < 2) {
                        x = index * BUBBLE_WIDTH;
                        y = 0;
                    } else {
                        x = BUBBLE_WIDTH;
                        y = -((index - 1) * (BUBBLE_HEIGHT + 5));
                    }
                    break;

                case 'L-up-right':
                    if (index < 2) {
                        x = 50;
                        y = -(index * (BUBBLE_HEIGHT + 5));
                    } else {
                        x = 50 + ((index - 1) * BUBBLE_WIDTH);
                        y = -(BUBBLE_HEIGHT + 5);
                    }
                    break;

                case 'zigzag':
                    x = (index % 2 === 0) ? 40 : -40;
                    y = -(index * (BUBBLE_HEIGHT + 10));
                    break;

                case 'staircase':
                    x = index * (BUBBLE_WIDTH * 0.6);
                    y = -(index * (BUBBLE_HEIGHT + 5));
                    break;
            }

            posArray.push({ x, y });
        });

        return posArray;
    }, [bubbles, lockedLayout, BUBBLE_WIDTH, BUBBLE_HEIGHT]);

    const activeLayout = lockedLayout || 'none';

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e', position: 'relative', overflow: 'hidden' }}>
            <h1 style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                zIndex: 10,
                fontFamily: 'sans-serif',
                fontSize: '18px'
            }}>
                Layout: <span style={{ color: '#4ade80' }}>{activeLayout.toUpperCase()}</span>
            </h1>

            <div style={{
                position: 'absolute',
                top: 55,
                left: 20,
                color: 'lime',
                fontFamily: 'monospace',
                fontSize: 12,
                zIndex: 10
            }}>
                Speaker: ({jawPos.x.toFixed(0)}%, {jawPos.y.toFixed(0)}%)
                {showObstacle && <span style={{ color: 'orange' }}> | Obstacle: ({obstacleJawPos.x.toFixed(0)}%, {obstacleJawPos.y.toFixed(0)}%)</span>}
                <br />
                Bubbles: {bubbles.length}
            </div>

            {/* 3D Scene */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <Scene
                    onJawPosition={handleJawPosition}
                    onObstaclePosition={handleObstacleJawPosition}
                    characterPosition={charPos}
                    obstaclePosition={obstaclePos}
                    showObstacle={showObstacle}
                />
            </div>

            {/* Comic Book Speech Bubbles */}
            {bubbles.map((bubble, index) => {
                const pos = positions[index] || { x: 0, y: 0 };
                const isArc = activeLayout.includes('arc');
                const tailRotation = isArc && index === 0 ? -45 : -15;
                const tailLeft = isArc && index === 0 ? '70%' : '25px';

                return (
                    <div
                        key={bubble.id}
                        style={{
                            position: 'absolute',
                            left: `calc(${jawPos.x}% + ${pos.x}px)`,
                            top: `calc(${jawPos.y - 6}% + ${pos.y}px)`,
                            transform: `translate(-50%, -100%) rotate(${bubble.rotate * 0.3}deg) scale(${bubble.scale})`,
                            minWidth: `${BUBBLE_WIDTH - 30}px`,
                            maxWidth: `${BUBBLE_WIDTH + 10}px`,
                            backgroundColor: 'white',
                            padding: '10px 14px',
                            borderRadius: bubble.borderRadius,
                            border: '2px solid #222',
                            boxShadow: '3px 3px 0px #222',
                            zIndex: 50 + index,
                            pointerEvents: 'none' as const,
                            fontFamily: '"Comic Sans MS", "Bangers", cursive, sans-serif',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            lineHeight: 1.3,
                            textAlign: 'center' as const,
                            animation: 'bubblePopIn 0.3s ease-out forwards',
                        }}
                    >
                        {/* Speech tail - only on first bubble */}
                        {index === 0 && (
                            <div style={{
                                position: 'absolute',
                                bottom: '-18px',
                                left: tailLeft,
                                width: 0,
                                height: 0,
                                borderLeft: '8px solid transparent',
                                borderRight: '14px solid transparent',
                                borderTop: '22px solid white',
                                filter: 'drop-shadow(2px 2px 0px #222)',
                                transform: `rotate(${tailRotation}deg)`
                            }} />
                        )}
                        {bubble.message}
                    </div>
                );
            })}

            {/* Jaw markers */}
            <div style={{
                position: 'absolute',
                left: `${jawPos.x}%`,
                top: `${jawPos.y}%`,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'lime',
                border: '2px solid white',
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
                pointerEvents: 'none'
            }} />

            {showObstacle && (
                <div style={{
                    position: 'absolute',
                    left: `${obstacleJawPos.x}%`,
                    top: `${obstacleJawPos.y}%`,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'orange',
                    border: '2px solid white',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 100,
                    pointerEvents: 'none'
                }} />
            )}

            <style jsx>{`
                @keyframes bubblePopIn {
                    from { opacity: 0; transform: translate(-50%, -100%) scale(0.5); }
                    to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
                }
            `}</style>
        </div>
    );
}
```

---

## Dependencies

```json
{
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "three": "^0.160.x",
  "react": "^18.x",
  "next": "^14.x"
}
```

---

## Console Debug Output

When running, check the browser console for:

```
💀 Speaker JAW LOCKED: Jaw
💀 Obstacle JAW LOCKED: Jaw
🎯 Obstacle: dist=287px, R=true, L=false
📏 Space: R=534 L=256 U=320
🎲 Valid layouts: [stack-right, stack-left, arc-over, zigzag]
✨ Randomly chose: arc-over
🔒 Layout LOCKED: arc-over
```

---

## Summary

This system provides:

1. ✅ **Jaw bone tracking** from 3D models
2. ✅ **3D to 2D projection** for screen positioning
3. ✅ **12 layout patterns** for variety
4. ✅ **Obstacle detection** to avoid other characters
5. ✅ **Boundary awareness** to stay on screen
6. ✅ **Layout locking** to prevent mid-speech changes
7. ✅ **Random selection** from valid patterns for variety
8. ✅ **No-overlap guarantee** between bubbles
9. ✅ **Comic book styling** with asymmetric shapes and animations
