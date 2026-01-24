'use client';

/**
 * ConfessionalChatScene - Full-screen immersive 3D confessional experience
 *
 * REBUILT following KitchenChatScene architecture:
 * - UI lives INSIDE the 3D world (not 3D inside UI)
 * - Character selection is an overlay panel inside the scene
 * - Full word bubble system with collision detection & comic styling
 * - Self-contained - parent just renders this full-screen
 */

import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Contestant } from '@blankwars/types';
import { HeadquartersState } from '../types/headquarters';
import * as confessionalService from '../services/confessionalService';
import type { ConfessionalMessage, ConfessionalData } from '../services/confessionalService';
import { getCharacter3DModelPath, getCharacterImagePath } from '../utils/characterImageUtils';

// All available layout patterns (from KitchenChatScene)
type LayoutType =
    | 'stack-right'
    | 'stack-left'
    | 'horizontal-right'
    | 'horizontal-left'
    | 'arc-over'
    | 'arc-left'
    | 'arc-right'
    | 'diagonal-up-right'
    | 'diagonal-up-left'
    | 'L-right-up'
    | 'L-up-right'
    | 'L-left-up'
    | 'L-up-left'
    | 'zigzag'
    | 'staircase'
    | 'staircase-left';

interface FaceMetrics {
    jawX: number;      // Jaw X position (percentage of screen)
    jawY: number;      // Jaw Y position (percentage of screen)
    headTopY: number;  // HeadTop Y position (percentage of screen)
    faceHeight: number; // Distance from headTop to jaw in pixels
}

// Obstacle bounding box for collision detection
interface ObstaclePosition {
    x: number;      // center X in pixels
    y: number;      // center Y in pixels
    halfWidth: number;   // half width in pixels
    halfHeight: number;  // half height in pixels
}

interface CharacterProps {
    modelPath: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    talkTrigger: number;
    onFaceMetrics: (metrics: FaceMetrics) => void;
}

function Character({ modelPath, position = [0, 0, 0], rotation = [0, 0, 0], talkTrigger, onFaceMetrics }: CharacterProps) {
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

    useEffect(() => {
        scene.traverse((child) => {
            if (child.type === 'Bone') {
                const name = child.name.toLowerCase();
                if (name === 'jaw') {
                    jawBoneRef.current = child;
                } else if (name === 'headtop') {
                    headTopBoneRef.current = child;
                }
            }
        });

        if (animations.length > 0) {
            const mixer = new THREE.AnimationMixer(scene);
            mixerRef.current = mixer;
            const talkAnim = animations.find(a => {
                const n = a.name.toLowerCase();
                return n.includes('talk') || n.includes('jaw');
            });
            if (talkAnim) {
                const action = mixer.clipAction(talkAnim);
                action.setLoop(THREE.LoopRepeat, Infinity);
                talkActionRef.current = action;
            }
        }
        setReady(true);

        return () => { mixerRef.current?.stopAllAction(); };
    }, [scene, animations]);

    useEffect(() => {
        if (!talkActionRef.current || !mixerRef.current) return;
        if (talkTrigger > lastTriggerRef.current) {
            lastTriggerRef.current = talkTrigger;
            const action = talkActionRef.current;
            action.reset();
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = false;
            action.play();
            setTimeout(() => { action.stop(); }, 500);
        }
    }, [talkTrigger]);

    useFrame((state, delta) => {
        mixerRef.current?.update(delta);
        if (!jawBoneRef.current || !jawMarkerRef.current || !group.current) return;

        group.current.updateMatrixWorld(true);
        jawBoneRef.current.getWorldPosition(tempV.current);
        jawMarkerRef.current.position.copy(tempV.current);

        const projectedJaw = tempV.current.clone().project(camera);
        const jawPixelX = (projectedJaw.x + 1) / 2 * size.width;
        const jawPixelY = (1 - projectedJaw.y) / 2 * size.height;
        const jawPercentX = (jawPixelX / size.width) * 100;
        const jawPercentY = (jawPixelY / size.height) * 100;

        let headTopPercentY = jawPercentY - 30;
        let faceHeightPixels = size.height * 0.3;

        if (headTopBoneRef.current && headTopMarkerRef.current) {
            headTopBoneRef.current.getWorldPosition(tempV2.current);
            headTopMarkerRef.current.position.copy(tempV2.current);
            const projectedHead = tempV2.current.clone().project(camera);
            const headPixelY = (1 - projectedHead.y) / 2 * size.height;
            headTopPercentY = (headPixelY / size.height) * 100;
            faceHeightPixels = Math.abs(jawPixelY - headPixelY);
        }

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
            <mesh ref={jawMarkerRef} visible={false}>
                <sphereGeometry args={[0.015, 16, 16]} />
                <meshBasicMaterial color="red" />
            </mesh>
            <mesh ref={headTopMarkerRef} visible={false}>
                <sphereGeometry args={[0.015, 16, 16]} />
                <meshBasicMaterial color="blue" />
            </mesh>
            <group position={position} rotation={rotation}>
                <group ref={group} position={[0, -1, 0]}>
                    <primitive object={scene} />
                </group>
            </group>
        </>
    );
}

interface Bubble {
    id: number;
    message: string;
    rotate: number;
    scale: number;
    borderRadius: string;
    x: number;
    y: number;
    measuredHeight: number;
    width: number;
}

// Calculate bubble height based on character count and width
const getHeightFromCharCount = (charCount: number, bubbleWidth: number = 300): number => {
    const charsPerLine = Math.floor((bubbleWidth / 300) * 37);
    const lines = Math.ceil(charCount / charsPerLine);
    const height = 40 + (lines * 17) + 10;
    return Math.max(70, Math.min(height, 220));
};

export interface ConfessionalChatSceneProps {
    availableCharacters: Contestant[];
    headquarters: HeadquartersState;
    onClose?: () => void;
}

export interface ConfessionalChatSceneRef {
    speak: (sentences: string[]) => void;
}

const ConfessionalChatScene = forwardRef<ConfessionalChatSceneRef, ConfessionalChatSceneProps>(({
    availableCharacters,
    headquarters,
    onClose
}, ref) => {
    // Confessional purple theme
    const BUBBLE_COLOR = '#9333EA';

    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 1000, height: 800 });

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setContainerSize({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const screenWidth = containerSize.width;
    const screenHeight = containerSize.height;

    // Character state
    const [activeCharacter, setActiveCharacter] = useState<Contestant | null>(null);
    const [characterConfig, setCharacterConfig] = useState<{
        id: string;
        modelPath: string;
        position: [number, number, number];
        rotation: [number, number, number];
    } | null>(null);

    // Confessional session state
    const [confessionalData, setConfessionalData] = useState<ConfessionalData>({
        active_character: null,
        messages: [],
        is_interviewing: false,
        is_paused: false,
        turn_number: 0,
        is_loading: false,
        session_complete: false
    });

    // Bubble state
    const [faceMetrics, setFaceMetrics] = useState<FaceMetrics | null>(null);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [lockedLayout, setLockedLayout] = useState<LayoutType | null>(null);
    const [talkTrigger, setTalkTrigger] = useState(0);
    const [isTalking, setIsTalking] = useState(false);

    const bubbleIdRef = useRef(0);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

    // UI state
    const [showCharacterPanel, setShowCharacterPanel] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    // Track which messages have been spoken
    const spokenMessageIds = useRef<Set<number>>(new Set());

    // Expose speak method via ref
    useImperativeHandle(ref, () => ({
        speak: (sentences: string[]) => {
            handleSpeak(sentences);
        }
    }));

    // Watch for new character messages and speak them
    useEffect(() => {
        const characterMessages = confessionalData.messages.filter(m => m.type === 'contestant');
        if (characterMessages.length === 0) return;

        const latestMessage = characterMessages[characterMessages.length - 1];
        if (latestMessage && !spokenMessageIds.current.has(latestMessage.id)) {
            spokenMessageIds.current.add(latestMessage.id);
            const sentences = splitIntoSentences(latestMessage.content);
            handleSpeak(sentences);
        }
    }, [confessionalData.messages]);

    // Smart sentence splitting (from KitchenChatScene)
    const splitIntoSentences = (text: string): string[] => {
        const MAX_CHARS = 140;
        const MIN_CHARS = 30;

        const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];
        const result: string[] = [];

        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (!trimmed) continue;

            if (trimmed.length <= MAX_CHARS) {
                if (result.length > 0 && result[result.length - 1].length < MIN_CHARS &&
                    result[result.length - 1].length + trimmed.length + 1 <= MAX_CHARS) {
                    result[result.length - 1] += ' ' + trimmed;
                } else {
                    result.push(trimmed);
                }
            } else {
                let remaining = trimmed;
                while (remaining.length > MAX_CHARS) {
                    let splitIndex = -1;
                    const commaIdx = remaining.lastIndexOf(',', MAX_CHARS);
                    const semiIdx = remaining.lastIndexOf(';', MAX_CHARS);
                    const colonIdx = remaining.lastIndexOf(':', MAX_CHARS);

                    const candidates = [commaIdx, semiIdx, colonIdx].filter(i => i > MIN_CHARS);
                    if (candidates.length > 0) {
                        splitIndex = Math.max(...candidates) + 1;
                    }

                    if (splitIndex <= MIN_CHARS) {
                        splitIndex = remaining.lastIndexOf(' ', MAX_CHARS);
                    }

                    if (splitIndex <= MIN_CHARS) {
                        splitIndex = MAX_CHARS;
                    }

                    result.push(remaining.substring(0, splitIndex).trim());
                    remaining = remaining.substring(splitIndex).trim();
                }
                if (remaining) result.push(remaining);
            }
        }

        return result.length > 0 ? result : [text];
    };

    // Select random layout
    const selectBestLayout = useCallback((): LayoutType => {
        const allLayouts: LayoutType[] = [
            'stack-right', 'stack-left', 'horizontal-right', 'horizontal-left',
            'arc-over', 'arc-left', 'arc-right', 'diagonal-up-right', 'diagonal-up-left',
            'L-right-up', 'L-up-right', 'L-left-up', 'L-up-left', 'zigzag', 'staircase', 'staircase-left'
        ];
        return allLayouts[Math.floor(Math.random() * allLayouts.length)];
    }, []);

    // Wave queue for handling long responses
    const waveQueueRef = useRef<string[][]>([]);
    const MAX_BUBBLES_PER_WAVE = 3;
    const WAVE_DISPLAY_TIME = 8000; // 8 seconds per wave
    const BUBBLE_APPEAR_DELAY = 600; // ms between each bubble appearing

    // Process next wave from queue
    const processNextWave = useCallback(() => {
        if (waveQueueRef.current.length === 0) {
            setIsTalking(false);
            return;
        }

        const wave = waveQueueRef.current.shift()!;
        setBubbles([]);

        const newLayout = selectBestLayout();
        setLockedLayout(newLayout);

        const timeouts: NodeJS.Timeout[] = [];

        wave.forEach((sentence, index) => {
            const timeout = setTimeout(() => {
                const bubbleWidth = 250 + Math.floor(Math.random() * 100);
                const bubbleHeight = getHeightFromCharCount(sentence.length, bubbleWidth);

                setBubbles(prev => {
                    const newBubble: Bubble = {
                        id: bubbleIdRef.current++,
                        message: sentence,
                        rotate: (Math.random() - 0.5) * 6,
                        scale: 0.95 + Math.random() * 0.1,
                        borderRadius: `${18 + Math.random() * 6}px ${20 + Math.random() * 8}px ${16 + Math.random() * 6}px ${22 + Math.random() * 6}px`,
                        x: 0,
                        y: 0,
                        measuredHeight: bubbleHeight,
                        width: bubbleWidth
                    };
                    return [...prev, newBubble];
                });

                setTalkTrigger(prev => prev + 1);
            }, index * BUBBLE_APPEAR_DELAY);
            timeouts.push(timeout);
        });

        // After wave display time, process next wave or stop
        const nextWaveTimeout = setTimeout(() => {
            processNextWave();
        }, WAVE_DISPLAY_TIME);
        timeouts.push(nextWaveTimeout);

        timeoutsRef.current = timeouts;
    }, [selectBestLayout]);

    // Handle speaking with bubbles - splits into waves of MAX_BUBBLES_PER_WAVE
    const handleSpeak = useCallback((sentences: string[]) => {
        if (isTalking || !sentences || sentences.length === 0) return;

        // Clear existing timeouts
        timeoutsRef.current.forEach(t => clearTimeout(t));
        timeoutsRef.current = [];
        setBubbles([]);

        // Split sentences into waves of MAX_BUBBLES_PER_WAVE
        const waves: string[][] = [];
        for (let i = 0; i < sentences.length; i += MAX_BUBBLES_PER_WAVE) {
            waves.push(sentences.slice(i, i + MAX_BUBBLES_PER_WAVE));
        }

        console.log(`📦 Split ${sentences.length} sentences into ${waves.length} waves (max ${MAX_BUBBLES_PER_WAVE} per wave)`);

        waveQueueRef.current = waves;
        setIsTalking(true);
        processNextWave();
    }, [isTalking, processNextWave]);

    // Calculate bubble positions with FULL collision detection (from KitchenChatScene)
    const calculateBubblePositions = useCallback((
        bubbleCount: number,
        layout: LayoutType,
        bubbleHeights: number[]
    ): { x: number; y: number }[] => {
        if (!faceMetrics) {
            console.log('🔴 calculateBubblePositions: No faceMetrics!');
            return Array(bubbleCount).fill({ x: 0, y: -100 });
        }

        const faceH = faceMetrics.faceHeight;
        console.log(`🎯 calculateBubblePositions: faceH=${faceH.toFixed(0)}px, jawX=${faceMetrics.jawX.toFixed(1)}%, jawY=${faceMetrics.jawY.toFixed(1)}%, layout=${layout}, bubbleCount=${bubbleCount}`);
        const jawPixelX = (faceMetrics.jawX / 100) * screenWidth;
        const jawPixelY = (faceMetrics.jawY / 100) * screenHeight;

        const FACE_CLEARANCE = Math.min(faceH * 1.15, 250);
        const UNIT = faceH * 0.35;
        const BUBBLE_GAP = faceH * 0.20;
        const SIDE_OFFSET = faceH * 0.60;
        const VERTICAL_STEP = faceH * 0.45;
        const HORIZONTAL_STEP = 150;
        const MARGIN = 20;
        const BUBBLE_HALF_WIDTH = 175;
        const JAW_CLEARANCE_HALF = 60;

        // Build obstacles array
        const obstacles: ObstaclePosition[] = [];

        // UI button area (top-right)
        obstacles.push({ x: screenWidth - 200, y: 40, halfWidth: 180, halfHeight: 30 });

        // Character selection panel (left side) if visible
        if (showCharacterPanel) {
            obstacles.push({ x: 150, y: screenHeight / 2, halfWidth: 150, halfHeight: screenHeight / 2 });
        }

        // Top boundary
        obstacles.push({ x: screenWidth / 2, y: -500, halfWidth: screenWidth / 2, halfHeight: 500 + MARGIN });

        // Character's face
        obstacles.push({ x: jawPixelX, y: jawPixelY, halfWidth: JAW_CLEARANCE_HALF, halfHeight: JAW_CLEARANCE_HALF });

        // Calculate initial positions based on layout
        const result: { x: number; y: number }[] = [];

        for (let index = 0; index < bubbleCount; index++) {
            let x = 0, y = 0;
            const reversedIndex = bubbleCount - 1 - index;

            switch (layout) {
                case 'stack-right':
                    x = SIDE_OFFSET; y = -FACE_CLEARANCE - (reversedIndex * (VERTICAL_STEP + BUBBLE_GAP)); break;
                case 'stack-left':
                    x = -SIDE_OFFSET; y = -FACE_CLEARANCE - (reversedIndex * (VERTICAL_STEP + BUBBLE_GAP)); break;
                case 'horizontal-right':
                    x = index * HORIZONTAL_STEP; y = -FACE_CLEARANCE - (index * UNIT * 0.3); break;
                case 'horizontal-left':
                    x = -(index * HORIZONTAL_STEP); y = -FACE_CLEARANCE - (index * UNIT * 0.3); break;
                case 'arc-over':
                    const arcSpacing = HORIZONTAL_STEP;
                    const arcHeight = faceH * 0.6;
                    const centerX = ((bubbleCount - 1) / 2) * arcSpacing;
                    x = (index * arcSpacing) - centerX;
                    const arcProgress = index / Math.max(bubbleCount - 1, 1);
                    y = -FACE_CLEARANCE - arcHeight * Math.sin(arcProgress * Math.PI);
                    break;
                case 'arc-left':
                    x = -SIDE_OFFSET - (UNIT * 0.4 * Math.sin(index / Math.max(bubbleCount - 1, 1) * Math.PI));
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); break;
                case 'arc-right':
                    x = SIDE_OFFSET + (UNIT * 0.4 * Math.sin(index / Math.max(bubbleCount - 1, 1) * Math.PI));
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); break;
                case 'diagonal-up-right':
                    x = index * (HORIZONTAL_STEP * 0.6); y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); break;
                case 'diagonal-up-left':
                    x = -(index * (HORIZONTAL_STEP * 0.6)); y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); break;
                case 'L-right-up':
                    if (index < 2) { x = index * HORIZONTAL_STEP; y = -FACE_CLEARANCE - (index * UNIT * 0.2); }
                    else { x = HORIZONTAL_STEP; y = -FACE_CLEARANCE - UNIT - ((index - 1) * (VERTICAL_STEP + BUBBLE_GAP)); }
                    break;
                case 'L-up-right':
                    if (index < 2) { x = SIDE_OFFSET; y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); }
                    else { x = SIDE_OFFSET + ((index - 1) * HORIZONTAL_STEP); y = -FACE_CLEARANCE - VERTICAL_STEP; }
                    break;
                case 'L-left-up':
                    if (index < 2) { x = -(index * HORIZONTAL_STEP); y = -FACE_CLEARANCE - (index * UNIT * 0.2); }
                    else { x = -HORIZONTAL_STEP; y = -FACE_CLEARANCE - UNIT - ((index - 1) * (VERTICAL_STEP + BUBBLE_GAP)); }
                    break;
                case 'L-up-left':
                    if (index < 2) { x = -SIDE_OFFSET; y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); }
                    else { x = -SIDE_OFFSET - ((index - 1) * HORIZONTAL_STEP); y = -FACE_CLEARANCE - VERTICAL_STEP; }
                    break;
                case 'zigzag':
                    x = (index % 2 === 0) ? UNIT : -UNIT; y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); break;
                case 'staircase':
                    x = index * (HORIZONTAL_STEP * 0.4); y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); break;
                case 'staircase-left':
                    x = -(index * (HORIZONTAL_STEP * 0.4)); y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP)); break;
            }

            result.push({ x, y });
        }

        // Helper: check if a position collides with any placed bubble OR obstacle
        // NOTE: y positions are BOTTOM of bubble (due to translate -100% in render)
        const collidesWithOthers = (testX: number, testY: number, testHeight: number, currentIndex: number): boolean => {
            const globalX = jawPixelX + testX;
            const globalY = jawPixelY + testY;
            const GAP = 15; // Gap between bubbles

            // Check against same-character bubbles that have ALREADY been resolved (indices < currentIndex)
            for (let k = 0; k < currentIndex; k++) {
                const otherX = result[k].x;
                const otherY = result[k].y;
                const otherHeight = bubbleHeights[k];

                // Horizontal overlap check (centers within combined half-widths)
                const dx = Math.abs(testX - otherX);
                if (dx >= (BUBBLE_HALF_WIDTH * 2) + GAP) continue; // No horizontal overlap

                // Vertical overlap check using interval math
                // testBubble spans [testY - testHeight, testY]
                // otherBubble spans [otherY - otherHeight, otherY]
                const testTop = testY - testHeight;
                const testBottom = testY;
                const otherTop = otherY - otherHeight;
                const otherBottom = otherY;

                // Check if intervals overlap (with gap)
                const verticalOverlap = testBottom + GAP > otherTop && testTop - GAP < otherBottom;

                if (verticalOverlap) {
                    return true;
                }
            }

            // Check against obstacles (face, buttons, boundaries)
            for (const obs of obstacles) {
                const dx = Math.abs(globalX - obs.x);
                // For obstacles, y is center, so compare against bubble center
                const bubbleCenterY = globalY - testHeight / 2;
                const dy = Math.abs(bubbleCenterY - obs.y);
                if (dx < (BUBBLE_HALF_WIDTH + obs.halfWidth) && dy < (testHeight / 2 + obs.halfHeight)) {
                    return true;
                }
            }

            return false;
        };

        // Helper: check if position is within screen bounds
        const isInBounds = (testX: number, testY: number, testHeight: number): boolean => {
            const globalX = jawPixelX + testX;
            const globalY = jawPixelY + testY;
            const left = globalX - BUBBLE_HALF_WIDTH;
            const right = globalX + BUBBLE_HALF_WIDTH;
            const top = globalY - testHeight;
            const bottom = globalY;
            return left >= MARGIN && right <= screenWidth - MARGIN &&
                   top >= MARGIN && bottom <= screenHeight - MARGIN;
        };

        // Helper: find nearest free position using spiral search
        const findFreePosition = (startX: number, startY: number, height: number, bubbleIndex: number): { x: number; y: number } => {
            // Try original position first
            if (!collidesWithOthers(startX, startY, height, bubbleIndex) && isInBounds(startX, startY, height)) {
                return { x: startX, y: startY };
            }

            // Spiral search for free position
            const step = 30;
            for (let radius = step; radius < 800; radius += step) {
                // Check 8 directions at this radius
                const directions = [
                    { x: 0, y: -1 },      // up
                    { x: 1, y: -1 },      // up-right
                    { x: 1, y: 0 },       // right
                    { x: 1, y: 1 },       // down-right
                    { x: 0, y: 1 },       // down
                    { x: -1, y: 1 },      // down-left
                    { x: -1, y: 0 },      // left
                    { x: -1, y: -1 },     // up-left
                ];
                for (const dir of directions) {
                    const testX = startX + dir.x * radius;
                    const testY = startY + dir.y * radius;
                    if (isInBounds(testX, testY, height) && !collidesWithOthers(testX, testY, height, bubbleIndex)) {
                        console.log(`🔍 Found free position for bubble ${bubbleIndex} at (${testX.toFixed(0)}, ${testY.toFixed(0)}) via spiral search`);
                        return { x: testX, y: testY };
                    }
                }
            }
            // Should never reach here if screen has space
            console.error(`❌ No free position found for bubble ${bubbleIndex}!`);
            return { x: startX, y: startY };
        };

        // Resolve collisions by finding free positions for each bubble
        for (let i = 0; i < result.length; i++) {
            const height = bubbleHeights[i];
            if (collidesWithOthers(result[i].x, result[i].y, height, i) || !isInBounds(result[i].x, result[i].y, height)) {
                const freePos = findFreePosition(result[i].x, result[i].y, height, i);
                result[i].x = freePos.x;
                result[i].y = freePos.y;
            }
            console.log(`  📍 Bubble ${i}: layout=${layout}, x=${result[i].x.toFixed(0)}, y=${result[i].y.toFixed(0)}`);
        }

        return result;
    }, [faceMetrics, screenWidth, screenHeight, showCharacterPanel]);

    // Start confessional with a character
    const handleStartConfessional = async (character: Contestant) => {
        setActiveCharacter(character);
        setCharacterConfig({
            id: character.character_id || character.id,
            modelPath: getCharacter3DModelPath(character.character_id || character.id),
            position: [0, 0, 0],
            rotation: [0, 0, 0]
        });

        // Clear previous state
        setBubbles([]);
        spokenMessageIds.current = new Set();

        // Start the confessional service
        await confessionalService.startConfessional(
            character.id,
            availableCharacters,
            headquarters,
            setConfessionalData
        );

        // Hide character panel once interview starts
        setShowCharacterPanel(false);
    };

    // End confessional
    const handleEndConfessional = () => {
        setConfessionalData({
            active_character: null,
            messages: [],
            is_interviewing: false,
            is_paused: false,
            turn_number: 0,
            is_loading: false,
            session_complete: false
        });
        setActiveCharacter(null);
        setCharacterConfig(null);
        setBubbles([]);
        spokenMessageIds.current = new Set();
        setShowCharacterPanel(true);
    };

    // Get latest hostmaster question
    const latestHostmasterQuestion = useMemo(() => {
        const hostmasterMessages = confessionalData.messages.filter(m => m.type === 'hostmaster');
        return hostmasterMessages.length > 0 ? hostmasterMessages[hostmasterMessages.length - 1].content : null;
    }, [confessionalData.messages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(t => clearTimeout(t));
        };
    }, []);

    // Calculate positions for current bubbles
    const bubblePositions = useMemo(() => {
        if (!faceMetrics || bubbles.length === 0 || !lockedLayout) return [];
        const bubbleHeights = bubbles.map(b => b.measuredHeight);
        return calculateBubblePositions(bubbles.length, lockedLayout, bubbleHeights);
    }, [faceMetrics, bubbles, lockedLayout, calculateBubblePositions]);

    const isArcLayout = lockedLayout?.includes('arc');

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#1a1a2e', position: 'relative', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                textAlign: 'center'
            }}>
                <h1 style={{ color: 'white', fontFamily: 'sans-serif', fontSize: '24px', margin: 0 }}>
                    Confessional Booth
                </h1>
                {activeCharacter && (
                    <div style={{ color: '#a855f7', fontSize: '14px', marginTop: 4 }}>
                        {activeCharacter.name} - Turn {confessionalData.turn_number}
                    </div>
                )}
            </div>

            {/* Control Buttons - Top Right */}
            <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                display: 'flex',
                gap: 10,
                zIndex: 100
            }}>
                {confessionalData.is_interviewing && (
                    <>
                        {confessionalData.is_paused ? (
                            <button
                                onClick={() => {
                                    if (confessionalData.active_character) {
                                        confessionalService.continueConfessional(
                                            confessionalData.active_character,
                                            availableCharacters,
                                            headquarters,
                                            confessionalData,
                                            setConfessionalData
                                        );
                                    }
                                }}
                                style={{
                                    padding: '12px 20px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    background: '#22c55e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                }}
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={() => confessionalService.pauseConfessional(setConfessionalData)}
                                style={{
                                    padding: '12px 20px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    background: '#eab308',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                }}
                            >
                                Pause
                            </button>
                        )}
                        <button
                            onClick={handleEndConfessional}
                            style={{
                                padding: '12px 20px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                        >
                            End
                        </button>
                    </>
                )}
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: showHistory ? '#8b5cf6' : '#4b5563',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                >
                    History
                </button>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 20px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                    >
                        Close
                    </button>
                )}
            </div>

            {/* Character Selection Panel - Left Side Overlay */}
            {showCharacterPanel && (
                <div style={{
                    position: 'absolute',
                    top: 80,
                    left: 20,
                    width: '280px',
                    maxHeight: 'calc(100% - 120px)',
                    background: 'rgba(0, 0, 0, 0.85)',
                    borderRadius: 12,
                    padding: '15px',
                    zIndex: 99,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    overflowY: 'auto',
                    border: '1px solid rgba(147, 51, 234, 0.3)'
                }}>
                    <h3 style={{
                        color: 'white',
                        margin: '0 0 15px 0',
                        fontSize: '16px',
                        borderBottom: '2px solid #9333EA',
                        paddingBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>🎥</span> Select Fighter
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableCharacters.map((character) => (
                            <button
                                key={character.id}
                                onClick={() => handleStartConfessional(character)}
                                disabled={confessionalData.is_loading}
                                style={{
                                    padding: '10px',
                                    background: 'rgba(147, 51, 234, 0.2)',
                                    border: '1px solid rgba(147, 51, 234, 0.4)',
                                    borderRadius: 8,
                                    cursor: confessionalData.is_loading ? 'not-allowed' : 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    opacity: confessionalData.is_loading ? 0.5 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!confessionalData.is_loading) {
                                        e.currentTarget.style.background = 'rgba(147, 51, 234, 0.4)';
                                        e.currentTarget.style.borderColor = '#9333EA';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(147, 51, 234, 0.2)';
                                    e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.4)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img
                                        src={getCharacterImagePath(character.character_id || character.name, 'progression')}
                                        alt={character.name}
                                        style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '8px',
                                            objectFit: 'cover',
                                            border: '2px solid rgba(147, 51, 234, 0.5)'
                                        }}
                                    />
                                    <div>
                                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                                            {character.name}
                                        </div>
                                        <div style={{ color: '#a855f7', fontSize: '12px' }}>
                                            {character.archetype}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Toggle Character Panel Button (when hidden) */}
            {!showCharacterPanel && confessionalData.is_interviewing && (
                <button
                    onClick={() => setShowCharacterPanel(true)}
                    style={{
                        position: 'absolute',
                        top: 80,
                        left: 20,
                        padding: '10px 15px',
                        background: 'rgba(147, 51, 234, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        zIndex: 99,
                        fontSize: '14px'
                    }}
                >
                    Show Fighters
                </button>
            )}

            {/* Conversation History Panel - Right Side */}
            {showHistory && (
                <div style={{
                    position: 'absolute',
                    top: 80,
                    right: 20,
                    width: '350px',
                    maxHeight: 'calc(100% - 120px)',
                    background: 'rgba(0, 0, 0, 0.85)',
                    borderRadius: 12,
                    padding: '15px',
                    zIndex: 99,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    overflowY: 'auto',
                    border: '1px solid rgba(147, 51, 234, 0.3)'
                }}>
                    <h3 style={{
                        color: 'white',
                        margin: '0 0 15px 0',
                        fontSize: '16px',
                        borderBottom: '2px solid #9333EA',
                        paddingBottom: '10px'
                    }}>
                        Interview Transcript
                    </h3>
                    {confessionalData.messages.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '14px' }}>No conversation yet. Select a fighter to begin!</p>
                    ) : (
                        confessionalData.messages
                            .filter(m => m.type === 'contestant')
                            .map((message) => (
                                <div key={message.id} style={{
                                    marginBottom: '12px',
                                    padding: '10px',
                                    background: 'rgba(147, 51, 234, 0.2)',
                                    borderRadius: 8,
                                    borderLeft: '3px solid #9333EA'
                                }}>
                                    <div style={{
                                        color: '#a855f7',
                                        fontWeight: 'bold',
                                        fontSize: '12px',
                                        marginBottom: '5px'
                                    }}>
                                        {activeCharacter?.name}
                                    </div>
                                    <div style={{
                                        color: 'white',
                                        fontSize: '13px',
                                        lineHeight: 1.4
                                    }}>
                                        {message.content}
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            )}

            {/* Director prompt is intentionally NOT shown - it's only for the AI contestant to see */}

            {/* Loading Indicator */}
            {confessionalData.is_loading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.9)',
                    color: 'white',
                    padding: '20px 40px',
                    borderRadius: 12,
                    zIndex: 200,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: '1px solid rgba(147, 51, 234, 0.5)'
                }}>
                    <div style={{
                        width: 20,
                        height: 20,
                        border: '3px solid rgba(147, 51, 234, 0.3)',
                        borderTop: '3px solid #9333EA',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <span>Character is responding...</span>
                </div>
            )}

            {/* Live/Paused Indicator */}
            {confessionalData.is_interviewing && (
                <div style={{
                    position: 'absolute',
                    top: 70,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 10
                }}>
                    <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: confessionalData.is_paused ? '#eab308' : '#ef4444',
                        animation: confessionalData.is_paused ? 'none' : 'pulse 1s infinite'
                    }} />
                    <span style={{ color: confessionalData.is_paused ? '#eab308' : '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>
                        {confessionalData.is_paused ? 'PAUSED' : 'LIVE'}
                    </span>
                </div>
            )}

            {/* 3D Scene */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <Canvas style={{ background: '#1a1a2e' }}>
                    <PerspectiveCamera makeDefault position={[0, -0.3, 3.5]} fov={50} />
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[5, 5, 5]} intensity={1} />
                    <Environment preset="city" />
                    <React.Suspense fallback={<Html center><div style={{ color: 'white' }}>Loading 3D Scene...</div></Html>}>
                        {characterConfig && (
                            <Character
                                modelPath={characterConfig.modelPath}
                                position={characterConfig.position}
                                rotation={characterConfig.rotation}
                                talkTrigger={talkTrigger}
                                onFaceMetrics={setFaceMetrics}
                            />
                        )}
                    </React.Suspense>
                    <OrbitControls target={[0, -0.5, 0]} />
                </Canvas>
            </div>

            {/* No Character Selected State */}
            {!characterConfig && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    zIndex: 5
                }}>
                    <div style={{ fontSize: '80px', marginBottom: 20 }}>🎥</div>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '24px' }}>Select a Fighter</h2>
                    <p style={{ color: '#888', marginTop: 10 }}>Choose a character from the panel to begin their confessional</p>
                </div>
            )}

            {/* Comic Book Speech Bubbles */}
            {faceMetrics && bubbles.length > 0 && bubbles.map((bubble, index) => {
                const pos = bubblePositions[index] || { x: 0, y: -100 };

                return (
                    <div
                        key={bubble.id}
                        style={{
                            position: 'absolute',
                            left: `calc(${faceMetrics.jawX}% + ${pos.x}px)`,
                            top: `calc(${faceMetrics.jawY}% + ${pos.y}px)`,
                            transform: `translate(-50%, -100%) rotate(${bubble.rotate * 0.3}deg) scale(${bubble.scale})`,
                            minWidth: '90px',
                            maxWidth: `${bubble.width}px`,
                            backgroundColor: 'white',
                            padding: '10px 14px',
                            borderRadius: bubble.borderRadius,
                            border: `3px solid ${BUBBLE_COLOR}`,
                            boxShadow: `3px 3px 0px ${BUBBLE_COLOR}`,
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
                                left: isArcLayout ? '70%' : '25px',
                                width: 0,
                                height: 0,
                                borderLeft: '8px solid transparent',
                                borderRight: '14px solid transparent',
                                borderTop: '22px solid white',
                                filter: `drop-shadow(2px 2px 0px ${BUBBLE_COLOR})`,
                                transform: `rotate(${isArcLayout ? -45 : -15}deg)`
                            }} />
                        )}
                        {bubble.message}
                    </div>
                );
            })}

            {/* CSS Animations */}
            <style>{`
                @keyframes bubblePopIn {
                    from { opacity: 0; transform: translate(-50%, -100%) scale(0.5); }
                    to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
});

ConfessionalChatScene.displayName = 'ConfessionalChatScene';

export default ConfessionalChatScene;
