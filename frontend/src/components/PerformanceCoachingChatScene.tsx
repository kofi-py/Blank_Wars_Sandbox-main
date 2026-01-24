'use client';

/**
 * PerformanceCoachingChatScene - Full-screen immersive 3D performance coaching
 *
 * REBUILT following KitchenChatScene architecture:
 * - UI lives INSIDE the 3D world (not 3D inside UI)
 * - Character selection is an overlay panel inside the scene
 * - Full word bubble system with collision detection & comic styling
 * - Self-contained - parent just renders this full-screen
 * - Coach input as overlay at bottom for combat training discussion
 */

import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Contestant } from '@blankwars/types';
import { getCharacter3DModelPath, getCharacterImagePath } from '../utils/characterImageUtils';
import { sendChat } from '../lib/chat';
import GameEventBus from '../services/gameEventBus';

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
    jawX: number;
    jawY: number;
    headTopY: number;
    faceHeight: number;
}

interface ObstaclePosition {
    x: number;
    y: number;
    halfWidth: number;
    halfHeight: number;
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

interface Message {
    id: number;
    type: 'coach' | 'contestant' | 'system';
    content: string;
    timestamp: Date;
}

const getHeightFromCharCount = (charCount: number, bubbleWidth: number = 300): number => {
    const charsPerLine = Math.floor((bubbleWidth / 300) * 37);
    const lines = Math.ceil(charCount / charsPerLine);
    const height = 40 + (lines * 17) + 10;
    return Math.max(70, Math.min(height, 220));
};

// Coaching topics for performance discussion
const COACHING_TOPICS = [
    'battle_strategy', 'defense_tactics', 'offensive_moves', 'equipment_synergy',
    'ability_timing', 'team_coordination', 'matchup_analysis', 'weakness_improvement',
    'strength_optimization', 'mental_focus', 'combat_stamina', 'reaction_speed',
    'critical_hits', 'resource_management', 'gameplan_adherence'
];

// Generate character-specific coaching intro
const generateCoachingIntro = (character: Contestant): { topic: string; intro: string } => {
    const { name, archetype } = character;
    const randomTopic = COACHING_TOPICS[Math.floor(Math.random() * COACHING_TOPICS.length)];

    const topicIntros: Record<string, string> = {
        battle_strategy: `Coach, I want to refine my overall battle strategy. I feel like I'm not maximizing my potential in fights...`,
        defense_tactics: `I've been taking too much damage lately. Help me improve my defensive approach...`,
        offensive_moves: `My attacks aren't hitting hard enough. I need to work on my offensive techniques...`,
        equipment_synergy: `I'm not sure my gear is working well together. Can we review my equipment setup?`,
        ability_timing: `I keep using my abilities at the wrong moments. Help me with timing and cooldown management...`,
        team_coordination: `I struggle to sync up with my teammates. How can I be a better team player?`,
        matchup_analysis: `Certain opponents give me trouble. Can we analyze my weak matchups?`,
        weakness_improvement: `My stats have some clear weak points. What's the best way to address them?`,
        strength_optimization: `I want to lean into what I do best. How can I maximize my strengths?`,
        mental_focus: `I lose concentration during long battles. Help me maintain focus under pressure...`,
        combat_stamina: `I start strong but fade in longer fights. How do I build better endurance?`,
        reaction_speed: `I'm too slow to react to enemy moves. Can we work on my reflexes?`,
        critical_hits: `I want to land more critical strikes. What's the secret to consistent crits?`,
        resource_management: `I burn through my resources too fast. Teach me better conservation...`,
        gameplan_adherence: `I keep deviating from our battle plans. Help me stick to the strategy...`
    };

    return {
        topic: randomTopic,
        intro: topicIntros[randomTopic] || `Coach, I'm ready for our combat training session. Let's work on improving my performance.`
    };
};

export interface PerformanceCoachingChatSceneProps {
    availableCharacters: Contestant[];
    onClose?: () => void;
}

export interface PerformanceCoachingChatSceneRef {
    speak: (sentences: string[]) => void;
}

const PerformanceCoachingChatScene = forwardRef<PerformanceCoachingChatSceneRef, PerformanceCoachingChatSceneProps>(({
    availableCharacters,
    onClose
}, ref) => {
    // Orange theme for performance coaching
    const BUBBLE_COLOR = '#EA580C';

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

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [currentTopic, setCurrentTopic] = useState<{ topic: string; intro: string } | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

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
        const characterMessages = messages.filter(m => m.type === 'contestant');
        if (characterMessages.length === 0) return;

        const latestMessage = characterMessages[characterMessages.length - 1];
        if (latestMessage && !spokenMessageIds.current.has(latestMessage.id)) {
            spokenMessageIds.current.add(latestMessage.id);
            const sentences = splitIntoSentences(latestMessage.content);
            handleSpeak(sentences);
        }
    }, [messages]);

    // Smart sentence splitting
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

    // Calculate bubble positions with FULL collision detection (spiral search from KitchenChatScene)
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

        // Coach input at bottom
        obstacles.push({ x: screenWidth / 2, y: screenHeight - 40, halfWidth: 300, halfHeight: 40 });

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
                   top >= MARGIN && bottom <= screenHeight - 100; // Leave room for coach input
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

    // Start session with a character
    const handleStartSession = async (character: Contestant) => {
        setActiveCharacter(character);
        setCharacterConfig({
            id: character.character_id || character.id,
            modelPath: getCharacter3DModelPath(character.character_id || character.id),
            position: [0, 0, 0],
            rotation: [0, 0, 0]
        });

        setBubbles([]);
        spokenMessageIds.current = new Set();

        // Create session ID once for this conversation
        const newSessionId = `performance_${character.id}_${Date.now()}`;
        setSessionId(newSessionId);

        // Generate a coaching topic for this character
        const topic = generateCoachingIntro(character);
        setCurrentTopic(topic);

        // Add opening message from character
        setMessages([{
            id: Date.now(),
            type: 'contestant',
            content: topic.intro,
            timestamp: new Date()
        }]);

        setShowCharacterPanel(false);
    };

    // Send coach message
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isTyping || !activeCharacter) return;

        const content = inputMessage.trim();
        setInputMessage('');

        // Add coach message
        const coachMessage: Message = {
            id: Date.now(),
            type: 'coach',
            content,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, coachMessage]);
        setIsTyping(true);

        try {
            if (!sessionId) {
                throw new Error('No active session');
            }
            const baseName = activeCharacter.character_id || activeCharacter.id;

            const response = await sendChat(sessionId, {
                agent_key: baseName,
                message: content,
                chat_type: 'performance',
                domain: 'performance',
                userchar_id: activeCharacter.id,
                messages: messages.map(m => ({
                    message: m.content,
                    speaker_name: m.type === 'coach' ? 'Coach' : activeCharacter.name,
                    speaker_id: m.type === 'coach' ? 'coach' : activeCharacter.id
                })),
                meta: {
                    userchar_id: activeCharacter.id,
                    character_display_name: activeCharacter.name,
                    character_idCanonical: baseName,
                    current_topic: currentTopic?.topic
                }
            });

            if (response?.text) {
                const aiMessage: Message = {
                    id: Date.now() + 1,
                    type: 'contestant',
                    content: response.text,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);

                // Publish event for memory persistence
                try {
                    const eventBus = GameEventBus.getInstance();
                    await eventBus.publish({
                        type: 'strategy_success' as any, // Performance coaching event
                        source: 'training_grounds',
                        primary_character_id: baseName,
                        severity: 'medium',
                        category: 'training',
                        description: `${activeCharacter.name} in performance coaching session`,
                        metadata: { session_type: 'performance_coaching', user_message: content, ai_response: response.text, topic: currentTopic?.topic },
                        tags: ['performance', 'coaching', 'combat_training']
                    });
                } catch (e) { console.error('Event publish error:', e); }
            }
        } catch (error) {
            console.error('Performance coaching chat error:', error);
            setMessages(prev => [...prev, {
                id: Date.now() + 2,
                type: 'system',
                content: 'Sorry, there was an error. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    // End session
    const handleEndSession = () => {
        setActiveCharacter(null);
        setCharacterConfig(null);
        setMessages([]);
        setBubbles([]);
        setCurrentTopic(null);
        setSessionId(null);
        spokenMessageIds.current = new Set();
        setShowCharacterPanel(true);
    };

    // Cleanup
    useEffect(() => {
        return () => { timeoutsRef.current.forEach(t => clearTimeout(t)); };
    }, []);

    // Calculate bubble positions
    const bubblePositions = useMemo(() => {
        if (!faceMetrics || bubbles.length === 0 || !lockedLayout) return [];
        const bubbleHeights = bubbles.map(b => b.measuredHeight);
        return calculateBubblePositions(bubbles.length, lockedLayout, bubbleHeights);
    }, [faceMetrics, bubbles, lockedLayout, calculateBubblePositions]);

    const isArcLayout = lockedLayout?.includes('arc');

    // Get latest coach message for display
    const latestCoachMessage = useMemo(() => {
        const coachMessages = messages.filter(m => m.type === 'coach');
        return coachMessages.length > 0 ? coachMessages[coachMessages.length - 1].content : null;
    }, [messages]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #7c2d12, #1c1917)', position: 'relative', overflow: 'hidden' }}>
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
                    Performance Coaching
                </h1>
                {activeCharacter && (
                    <div style={{ color: '#fb923c', fontSize: '14px', marginTop: 4 }}>
                        Training with {activeCharacter.name}
                    </div>
                )}
            </div>

            {/* Control Buttons */}
            <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                display: 'flex',
                gap: 10,
                zIndex: 100
            }}>
                {activeCharacter && (
                    <button
                        onClick={handleEndSession}
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
                        End Session
                    </button>
                )}
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: showHistory ? '#3b82f6' : '#4b5563',
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

            {/* Character Selection Panel */}
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
                    border: '1px solid rgba(234, 88, 12, 0.3)'
                }}>
                    <h3 style={{
                        color: 'white',
                        margin: '0 0 15px 0',
                        fontSize: '16px',
                        borderBottom: '2px solid #EA580C',
                        paddingBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>🏋️</span> Select Fighter
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableCharacters.map((character) => (
                            <button
                                key={character.id}
                                onClick={() => handleStartSession(character)}
                                style={{
                                    padding: '10px',
                                    background: 'rgba(234, 88, 12, 0.2)',
                                    border: '1px solid rgba(234, 88, 12, 0.4)',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(234, 88, 12, 0.4)';
                                    e.currentTarget.style.borderColor = '#EA580C';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(234, 88, 12, 0.2)';
                                    e.currentTarget.style.borderColor = 'rgba(234, 88, 12, 0.4)';
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
                                            border: '2px solid rgba(234, 88, 12, 0.5)'
                                        }}
                                    />
                                    <div>
                                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                                            {character.name}
                                        </div>
                                        <div style={{ color: '#fb923c', fontSize: '12px' }}>
                                            {character.archetype}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Toggle Panel Button */}
            {!showCharacterPanel && activeCharacter && (
                <button
                    onClick={() => setShowCharacterPanel(true)}
                    style={{
                        position: 'absolute',
                        top: 80,
                        left: 20,
                        padding: '10px 15px',
                        background: 'rgba(59, 130, 246, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        zIndex: 99,
                        fontSize: '14px'
                    }}
                >
                    Show Characters
                </button>
            )}

            {/* History Panel */}
            {showHistory && (
                <div style={{
                    position: 'absolute',
                    top: 80,
                    right: 20,
                    width: '350px',
                    maxHeight: 'calc(100% - 180px)',
                    background: 'rgba(0, 0, 0, 0.85)',
                    borderRadius: 12,
                    padding: '15px',
                    zIndex: 99,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    overflowY: 'auto',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                    <h3 style={{
                        color: 'white',
                        margin: '0 0 15px 0',
                        fontSize: '16px',
                        borderBottom: '2px solid #3b82f6',
                        paddingBottom: '10px'
                    }}>
                        Session Transcript
                    </h3>
                    {messages.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '14px' }}>No conversation yet. Select a character to begin!</p>
                    ) : (
                        messages.map((message) => (
                            <div key={message.id} style={{
                                marginBottom: '12px',
                                padding: '10px',
                                background: message.type === 'coach' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                borderRadius: 8,
                                borderLeft: `3px solid ${message.type === 'coach' ? '#8b5cf6' : '#3b82f6'}`
                            }}>
                                <div style={{
                                    color: message.type === 'coach' ? '#a78bfa' : '#60a5fa',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    marginBottom: '5px'
                                }}>
                                    {message.type === 'coach' ? 'Coach' : activeCharacter?.name}
                                </div>
                                <div style={{ color: 'white', fontSize: '13px', lineHeight: 1.4 }}>
                                    {message.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Latest Coach Message Display */}
            {latestCoachMessage && activeCharacter && (
                <div style={{
                    position: 'absolute',
                    top: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(139, 92, 246, 0.9)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: 8,
                    maxWidth: '60%',
                    textAlign: 'center',
                    zIndex: 10,
                    fontSize: '13px',
                    border: '1px solid rgba(167, 139, 250, 0.5)'
                }}>
                    <span style={{ opacity: 0.7, fontSize: '11px' }}>Coach: </span>
                    "{latestCoachMessage}"
                </div>
            )}

            {/* Loading Indicator */}
            {isTyping && (
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
                    border: '1px solid rgba(59, 130, 246, 0.5)'
                }}>
                    <div style={{
                        width: 20,
                        height: 20,
                        border: '3px solid rgba(59, 130, 246, 0.3)',
                        borderTop: '3px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <span>{activeCharacter?.name} is thinking...</span>
                </div>
            )}

            {/* 3D Scene */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <Canvas style={{ background: 'transparent' }}>
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
                    <div style={{ fontSize: '80px', marginBottom: 20 }}>💭</div>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '24px' }}>Select a Character</h2>
                    <p style={{ color: '#888', marginTop: 10 }}>Choose a fighter to begin a performance coaching session</p>
                </div>
            )}

            {/* Coach Input - Bottom Center */}
            {activeCharacter && (
                <div style={{
                    position: 'absolute',
                    bottom: 30,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    zIndex: 100,
                    background: 'rgba(0, 0, 0, 0.85)',
                    padding: '15px 20px',
                    borderRadius: 12,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                    <span style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '14px' }}>Coach:</span>
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your message..."
                        disabled={isTyping}
                        style={{
                            padding: '10px 15px',
                            fontSize: '14px',
                            width: '400px',
                            border: 'none',
                            borderRadius: 6,
                            background: 'rgba(255, 255, 255, 0.9)',
                            color: '#000'
                        }}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isTyping || !inputMessage.trim()}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            background: (isTyping || !inputMessage.trim()) ? '#555' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: (isTyping || !inputMessage.trim()) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Send
                    </button>
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
            `}</style>
        </div>
    );
});

PerformanceCoachingChatScene.displayName = 'PerformanceCoachingChatScene';

export default PerformanceCoachingChatScene;
