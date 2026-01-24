'use client';

// DIRECT IMPORT FROM TEST-APP - WORKING ENVIRONMENT PRESERVED AS-IS
// test-app: /Users/gabrielgreenstein/blank-wars-models/test-app/src/app/simple/page.tsx

import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { useGLTF, OrbitControls, PerspectiveCamera, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { Contestant } from '@blankwars/types';
import { HeadquartersState } from '../types/headquarters';
import * as kitchenTableService from '../services/kitchenTableService';
import type { KitchenConversation } from '../services/kitchenTableService';

// All available layout patterns (from test-app)
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

// Remote texture URLs from GitHub raw content
const KITCHEN_TEXTURE_BASE = 'https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main/Headquarters/Kitchen_Table';

/**
 * KitchenRoomEnvironment - 3D room geometry with textured floor and walls
 * Creates an enclosed kitchen environment instead of a void
 *
 * Coordinate system (test-app derived):
 * - Camera at [0, -0.3, 3.5] looking at [0, -0.5, 0]
 * - Characters have internal -1 Y offset, so feet at y=-1 world space
 * - Floor at y=-1, walls behind characters (negative Z)
 */
function KitchenRoomEnvironment() {
    // Load textures
    const tableTexture = useLoader(TextureLoader, `${KITCHEN_TEXTURE_BASE}/floor_1.png`);
    const backWallTexture = useLoader(TextureLoader, `${KITCHEN_TEXTURE_BASE}/kitchen_wall.png`);
    const leftWallTexture = useLoader(TextureLoader, `${KITCHEN_TEXTURE_BASE}/left_wall.png`);
    const rightWallTexture = useLoader(TextureLoader, `${KITCHEN_TEXTURE_BASE}/right_wall.png`);

    // Configure texture wrapping and scaling
    useEffect(() => {
        [tableTexture, backWallTexture, leftWallTexture, rightWallTexture].forEach(texture => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
        });

        tableTexture.repeat.set(1.5, 1.2);  // Slight tiling for larger table

        // ZOOM OUT on kitchen textures - show MORE of the image
        // This makes each appliance appear smaller, characters appear larger
        backWallTexture.repeat.set(0.4, 0.4);  // Show more of the kitchen
        leftWallTexture.repeat.set(0.4, 0.4);
        rightWallTexture.repeat.set(0.4, 0.4);
    }, [tableTexture, backWallTexture, leftWallTexture, rightWallTexture]);

    // SIMPLE APPROACH: Avoid photographic textures that reveal scale problems
    // Scene layout:
    // - Characters at y=0 (models include chairs)
    // - Table surface at y=-0.5 with wood texture (floor_1.png)
    // - Floor at y=-1.5 (solid color)
    // - Simple colored walls (no photographic kitchen appliances)
    // - Camera at [0, -0.3, 3.5] looking at [0, -0.5, 0]

    const TABLE_Y = -0.5;        // Table surface
    const TABLE_WIDTH = 5;       // Table dimensions
    const TABLE_DEPTH = 4;

    const FLOOR_Y = -1.5;        // Floor below table
    const FLOOR_SIZE = 12;       // Room floor

    const CEILING_Y = 3.5;       // Ceiling height
    const WALL_HEIGHT = CEILING_Y - FLOOR_Y;

    // Moderate room size - simple backdrop
    const BACK_WALL_Z = -3;      // Behind characters
    const FRONT_WALL_Z = 6;      // Behind camera
    const SIDE_WALL_X = 6;       // Room width

    return (
        <group name="KitchenRoomEnvironment">
            {/* TABLE SURFACE - using floor_1.png as tabletop texture */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, TABLE_Y, 0]}
                receiveShadow
                castShadow
            >
                <planeGeometry args={[TABLE_WIDTH, TABLE_DEPTH]} />
                <meshStandardMaterial
                    map={tableTexture}
                    roughness={0.8}
                    metalness={0.1}
                />
            </mesh>

            {/* ACTUAL FLOOR - solid color, far below table */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, FLOOR_Y, 0]}
                receiveShadow
            >
                <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
                <meshStandardMaterial
                    color="#8B7355"
                    roughness={0.9}
                />
            </mesh>

            {/* Back wall - with kitchen texture */}
            <mesh position={[0, FLOOR_Y + WALL_HEIGHT / 2, BACK_WALL_Z]}>
                <planeGeometry args={[FLOOR_SIZE, WALL_HEIGHT]} />
                <meshStandardMaterial
                    map={backWallTexture}
                    roughness={0.9}
                />
            </mesh>

            {/* Left wall - with kitchen texture */}
            <mesh
                position={[-SIDE_WALL_X, FLOOR_Y + WALL_HEIGHT / 2, 0]}
                rotation={[0, Math.PI / 2, 0]}
            >
                <planeGeometry args={[FLOOR_SIZE, WALL_HEIGHT]} />
                <meshStandardMaterial
                    map={leftWallTexture}
                    roughness={0.9}
                />
            </mesh>

            {/* Right wall - with kitchen texture */}
            <mesh
                position={[SIDE_WALL_X, FLOOR_Y + WALL_HEIGHT / 2, 0]}
                rotation={[0, -Math.PI / 2, 0]}
            >
                <planeGeometry args={[FLOOR_SIZE, WALL_HEIGHT]} />
                <meshStandardMaterial
                    map={rightWallTexture}
                    roughness={0.9}
                />
            </mesh>

            {/* Front wall - behind camera */}
            <mesh
                position={[0, FLOOR_Y + WALL_HEIGHT / 2, FRONT_WALL_Z]}
                rotation={[0, Math.PI, 0]}
            >
                <planeGeometry args={[FLOOR_SIZE, WALL_HEIGHT]} />
                <meshStandardMaterial
                    map={backWallTexture}
                    roughness={0.9}
                />
            </mesh>

            {/* Ceiling */}
            <mesh
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, CEILING_Y, 0]}
            >
                <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
                <meshStandardMaterial
                    color="#f5f0e8"
                    roughness={0.9}
                />
            </mesh>
        </group>
    );
}

/**
 * Fallback environment with solid colors (no textures)
 * Used if texture loading fails via ErrorBoundary
 */
function KitchenRoomEnvironmentFallback() {
    // Match dimensions from KitchenRoomEnvironment
    const TABLE_Y = -0.5;
    const TABLE_WIDTH = 5;
    const TABLE_DEPTH = 4;
    const FLOOR_Y = -1.5;
    const FLOOR_SIZE = 12;
    const CEILING_Y = 3.5;
    const WALL_HEIGHT = CEILING_Y - FLOOR_Y;
    const BACK_WALL_Z = -3;
    const FRONT_WALL_Z = 6;
    const SIDE_WALL_X = 6;

    return (
        <group name="KitchenRoomEnvironmentFallback">
            {/* Table surface */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, TABLE_Y, 0]}
                receiveShadow
                castShadow
            >
                <planeGeometry args={[TABLE_WIDTH, TABLE_DEPTH]} />
                <meshStandardMaterial color="#8B6F47" roughness={0.8} metalness={0.1} />
            </mesh>

            {/* Actual floor */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, FLOOR_Y, 0]}
                receiveShadow
            >
                <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
                <meshStandardMaterial color="#8B7355" roughness={0.9} />
            </mesh>

            {/* Back wall */}
            <mesh position={[0, FLOOR_Y + WALL_HEIGHT / 2, BACK_WALL_Z]}>
                <planeGeometry args={[FLOOR_SIZE, WALL_HEIGHT]} />
                <meshStandardMaterial color="#F5E6D3" roughness={0.85} />
            </mesh>

            {/* Left wall */}
            <mesh position={[-SIDE_WALL_X, FLOOR_Y + WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[FLOOR_SIZE, WALL_HEIGHT]} />
                <meshStandardMaterial color="#E8D9C5" roughness={0.85} />
            </mesh>

            {/* Right wall */}
            <mesh position={[SIDE_WALL_X, FLOOR_Y + WALL_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[FLOOR_SIZE, WALL_HEIGHT]} />
                <meshStandardMaterial color="#E8D9C5" roughness={0.85} />
            </mesh>

            {/* Front wall */}
            <mesh position={[0, FLOOR_Y + WALL_HEIGHT / 2, FRONT_WALL_Z]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[FLOOR_SIZE, WALL_HEIGHT]} />
                <meshStandardMaterial color="#F5E6D3" roughness={0.85} />
            </mesh>

            {/* Ceiling */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CEILING_Y, 0]}>
                <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
                <meshStandardMaterial color="#f5f0e8" roughness={0.9} />
            </mesh>
        </group>
    );
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
    position?: [number, number, number]; // Position in 3D space (default [0, 0, 0])
    rotation?: [number, number, number]; // Rotation in 3D space (default [0, 0, 0])
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
                    console.log('💀 JAW BONE LOCKED!');
                } else if (name === 'headtop') {
                    headTopBoneRef.current = child;
                    console.log('👑 HEADTOP BONE LOCKED!');
                }
            }
        });

        if (animations.length > 0) {
            const mixer = new THREE.AnimationMixer(scene);
            mixerRef.current = mixer;
            // Look for 'talk' OR 'jaw' animation
            const talkAnim = animations.find(a => {
                const n = a.name.toLowerCase();
                return n.includes('talk') || n.includes('jaw');
            });
            if (talkAnim) {
                console.log(`🎬 Found Talk Animation: "${talkAnim.name}"`);
                const action = mixer.clipAction(talkAnim);
                action.setLoop(THREE.LoopRepeat, Infinity);
                talkActionRef.current = action;
            } else {
                console.warn("⚠️ No 'talk' or 'jaw' animation found found in:", animations.map(a => a.name));
            }
        }
        setReady(true);

        return () => { mixerRef.current?.stopAllAction(); };
    }, [scene, animations]);

    // Play animation burst each time a new bubble appears
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

    useFrame((state, delta) => {
        mixerRef.current?.update(delta);

        if (!jawBoneRef.current || !jawMarkerRef.current || !group.current) return;

        // DEBUG: Log when size is suspiciously small
        if (size.height < 100) {
            console.error(`🚨 TINY CANVAS SIZE DETECTED: width=${size.width}, height=${size.height}`);
        }

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
    width: number;  // Random width between 250-350px
}

const BUBBLE_WIDTH = 130;
const BUBBLE_HEIGHT = 55;

// Calculate bubble height based on character count and width
// Narrower bubbles need more height for same text
const getHeightFromCharCount = (charCount: number, bubbleWidth: number = 300): number => {
    // Chars per line scales with width (at 300px = ~37 chars, at 250px = ~31 chars, at 350px = ~43 chars)
    const charsPerLine = Math.floor((bubbleWidth / 300) * 37);
    const lines = Math.ceil(charCount / charsPerLine);

    // Base height + lines * line height (17px) + padding
    const height = 40 + (lines * 17) + 10;
    return Math.max(70, Math.min(height, 220));  // Clamp between 70-220px
};

export interface CharacterConfig {
    id: string; // Unique ID (e.g., "space_cyborg", "cleopatra")
    modelPath: string;
    position: [number, number, number];
    rotation: [number, number, number];
}

export interface KitchenChatSceneProps {
    characters: CharacterConfig[]; // Array of characters to render
    available_characters: Contestant[]; // Full character data for AI service
    headquarters: HeadquartersState; // HQ state for context
    coach_name?: string; // Coach name (defaults to 'Coach')
}

export interface KitchenChatSceneRef {
    speak: (characterId: string, sentences: string[]) => void;
}

const KitchenChatScene = forwardRef<KitchenChatSceneRef, KitchenChatSceneProps>(({
    characters,
    available_characters,
    headquarters,
    coach_name = 'Coach'
}, ref) => {
    // COLLISION SETTINGS - bounding box dimensions
    const JAW_CLEARANCE_HALF = 60;  // Keep bubbles 60px away from jaw center
    const BUBBLE_HALF_WIDTH = 175;  // 350px max width / 2 (widths vary 250-350px)

    // Bubble colors by position (warm/cool alternating for contrast)
    const BUBBLE_COLORS = [
        '#E63946',  // Red
        '#1D4ED8',  // Blue
        '#FACC15',  // Yellow
        '#9333EA',  // Purple
        '#F97316',  // Orange
        '#16A34A',  // Green
        '#EC4899',  // Pink
    ];

    // Container ref for accurate collision detection (not window dimensions)
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

    // Per-character state using Maps (keyed by character ID)
    const [faceMetricsMap, setFaceMetricsMap] = useState<Map<string, FaceMetrics>>(new Map());
    const [bubblesMap, setBubblesMap] = useState<Map<string, Bubble[]>>(new Map());
    const [lockedLayoutMap, setLockedLayoutMap] = useState<Map<string, LayoutType>>(new Map());
    const [talkTriggerMap, setTalkTriggerMap] = useState<Map<string, number>>(new Map());
    const [isTalkingMap, setIsTalkingMap] = useState<Map<string, boolean>>(new Map());

    const bubbleIdRef = useRef(0);
    const timeoutsRef = useRef<Map<string, NodeJS.Timeout[]>>(new Map());

    // Kitchen Table session state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [chatId, setChatId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<KitchenConversation[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [coachInput, setCoachInput] = useState('');
    const [isOpeningPhase, setIsOpeningPhase] = useState(true);
    const hasAutoStartedRef = useRef(false);

    // Debug: Log characters on mount
    useEffect(() => {
        console.log('🎭 KitchenChatScene mounted with characters:', characters.map(c => ({ id: c.id, modelPath: c.modelPath })));
        console.log('👥 Available characters:', available_characters.map(c => ({ id: c.id, character_id: c.character_id, name: c.name })));
    }, [characters, available_characters]);

    // Auto-start scene when characters have face metrics
    useEffect(() => {
        if (hasAutoStartedRef.current) return;
        if (characters.length === 0) return;
        if (faceMetricsMap.size < characters.length) return;

        console.log('🚀 Auto-starting scene - all characters have face metrics');
        hasAutoStartedRef.current = true;

        // Start the opening scene
        handleAutoStart();
    }, [faceMetricsMap, characters]);

    // Auto-start handler - runs 2 rounds then enables coach input
    const handleAutoStart = async () => {
        if (isGenerating) return;

        setIsGenerating(true);
        setIsOpeningPhase(true);
        setConversations([]);
        setBubblesMap(new Map());
        setLockedLayoutMap(new Map());
        setTalkTriggerMap(new Map());
        setIsTalkingMap(new Map());

        // Clear all timeouts
        timeoutsRef.current.forEach((timeouts) => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        });
        timeoutsRef.current.clear();

        try {
            const newSessionId = `kitchen_session_${Date.now()}`;
            const newChatId = `kitchen_${Date.now()}`;
            setSessionId(newSessionId);
            setChatId(newChatId);

            // Handler receives each LLM response and displays bubbles
            const handleResponse = (conv: KitchenConversation) => {
                if (conv.is_ai && conv.speaker_id !== 'coach') {
                    const character = available_characters.find(c => c.id === conv.speaker_id);
                    if (!character) return;
                    const canonical_id = character.character_id;
                    const sentences = splitIntoSentences(conv.message);
                    handleSpeak(canonical_id, sentences);
                }
            };

            // Round 1: Opening scene
            console.log('🎬 Round 1: Opening scene');
            const round1Convos = await kitchenTableService.startNewScene(
                headquarters,
                available_characters,
                coach_name,
                handleResponse
            );
            setConversations(round1Convos);

            // Wait for users to read round 1
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Round 2: Continue conversation
            console.log('🎬 Round 2: Continuing scene');
            const round2Convos = await kitchenTableService.continueScene(
                round1Convos,
                available_characters,
                newSessionId,
                newChatId,
                handleResponse
            );
            setConversations([...round1Convos, ...round2Convos]);

            // Opening complete - enable coach input
            console.log('✅ Opening phase complete - coach input enabled');
            setIsOpeningPhase(false);
        } catch (error) {
            console.error('Failed to auto-start scene:', error);
            setIsOpeningPhase(false);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFaceMetrics = useCallback((characterId: string, metrics: FaceMetrics) => {
        setFaceMetricsMap(prev => new Map(prev).set(characterId, metrics));
    }, []);

    // EXACT COPY of selectBestLayout from test-app (updated for per-character)
    const selectBestLayout = useCallback((characterId: string): LayoutType => {
        const faceMetrics = faceMetricsMap.get(characterId);
        if (!faceMetrics) return 'zigzag'; // Fallback if no metrics yet

        const faceH = faceMetrics.faceHeight;

        // Pure random selection - equal 1/16 chance for all patterns
        // Obstacle detection and screen bounds will adapt positions dynamically
        const allLayouts: LayoutType[] = [
            'stack-right', 'stack-left', 'horizontal-right', 'horizontal-left',
            'arc-over', 'arc-left', 'arc-right', 'diagonal-up-right', 'diagonal-up-left',
            'L-right-up', 'L-up-right', 'L-left-up', 'L-up-left', 'zigzag', 'staircase', 'staircase-left'
        ];

        const randomIndex = Math.floor(Math.random() * allLayouts.length);
        const chosen = allLayouts[randomIndex];
        console.log(`🎲 Layout: ${chosen} (pattern ${randomIndex + 1} of ${allLayouts.length})`);
        return chosen;
    }, [faceMetricsMap, screenWidth, screenHeight]);

    // Make character talk with provided sentences (exposed via ref)
    const handleSpeak = useCallback((characterId: string, sentences: string[]) => {
        console.log('💬 handleSpeak called:', { characterId, sentencesCount: sentences?.length, sentences });
        if (isTalkingMap.get(characterId)) {
            console.log('⚠️ Character already talking:', characterId);
            return;
        }
        if (!sentences || sentences.length === 0) {
            console.log('⚠️ No sentences to speak:', { characterId, sentences });
            return;
        }

        // Clear existing timeouts for this character
        const existingTimeouts = timeoutsRef.current.get(characterId) || [];
        existingTimeouts.forEach(t => clearTimeout(t));
        timeoutsRef.current.set(characterId, []);

        // Clear existing bubbles for this character
        setBubblesMap(prev => new Map(prev).set(characterId, []));

        const newLayout = selectBestLayout(characterId);
        setLockedLayoutMap(prev => new Map(prev).set(characterId, newLayout));
        setIsTalkingMap(prev => new Map(prev).set(characterId, true));

        const timeouts: NodeJS.Timeout[] = [];

        sentences.forEach((sentence, index) => {
            const timeout = setTimeout(() => {
                setBubblesMap(prev => {
                    const next = new Map(prev);
                    const existingBubbles = next.get(characterId) || [];

                    // Generate random width for this bubble (250-350px)
                    const bubbleWidth = 250 + Math.floor(Math.random() * 100);

                    // Calculate height based on character count and width
                    const bubbleHeight = getHeightFromCharCount(sentence.length, bubbleWidth);
                    console.log(`📏 [${characterId}] Sentence length: ${sentence.length} chars, width: ${bubbleWidth}px → height: ${bubbleHeight}px`);

                    // Create array of heights for collision detection (existing + new)
                    const bubbleHeights = [...existingBubbles.map(b => b.measuredHeight), bubbleHeight];

                    // Calculate position for this new bubble (pass current bubblesMap to avoid stale closure)
                    const positions = calculatePositionsForCharacter(characterId, existingBubbles.length + 1, bubbleHeights, newLayout, next);
                    console.log(`🔍 [${characterId}] positions returned:`, positions, 'length:', positions.length);
                    const newBubblePos = positions[existingBubbles.length]; // Get position for the new bubble
                    console.log(`🔍 [${characterId}] newBubblePos at index ${existingBubbles.length}: x=${newBubblePos?.x?.toFixed(0)}, y=${newBubblePos?.y?.toFixed(0)}`);

                    next.set(characterId, [...existingBubbles, {
                        id: bubbleIdRef.current++,
                        message: sentence,
                        rotate: (Math.random() - 0.5) * 6,
                        scale: 0.95 + Math.random() * 0.1,
                        borderRadius: `${18 + Math.random() * 6}px ${20 + Math.random() * 8}px ${16 + Math.random() * 6}px ${22 + Math.random() * 6}px`,
                        x: newBubblePos.x,
                        y: newBubblePos.y,
                        measuredHeight: bubbleHeight,
                        width: bubbleWidth,
                    }]);
                    return next;
                });
                setTalkTriggerMap(prev => {
                    const next = new Map(prev);
                    next.set(characterId, (next.get(characterId) || 0) + 1);
                    return next;
                });
            }, index * 700);
            timeouts.push(timeout);
        });

        // Stop talking animation after all sentences displayed (bubbles persist until next turn)
        const stopTalkingTimeout = setTimeout(() => {
            setIsTalkingMap(prev => new Map(prev).set(characterId, false));
        }, sentences.length * 700 + 500);
        timeouts.push(stopTalkingTimeout);

        timeoutsRef.current.set(characterId, timeouts);
    }, [isTalkingMap, selectBestLayout]);

    // Expose handleSpeak via ref
    useImperativeHandle(ref, () => ({
        speak: handleSpeak
    }), [handleSpeak]);

    // Helper to split AI response into sentences for bubbles
    const splitIntoSentences = (text: string): string[] => {
        const MAX_CHARS = 140;
        const MIN_CHARS = 30; // Don't create tiny fragments

        // Step 1: Split only on sentence-ending punctuation followed by space
        // Keep the punctuation with the sentence
        const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];

        const result: string[] = [];

        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (!trimmed) continue;

            // If sentence fits, add it directly
            if (trimmed.length <= MAX_CHARS) {
                // Try to merge with previous if both are short
                if (result.length > 0 && result[result.length - 1].length < MIN_CHARS &&
                    result[result.length - 1].length + trimmed.length + 1 <= MAX_CHARS) {
                    result[result.length - 1] += ' ' + trimmed;
                } else {
                    result.push(trimmed);
                }
            } else {
                // Long sentence - split at comma or semicolon first, then space
                let remaining = trimmed;
                while (remaining.length > MAX_CHARS) {
                    // Try to split at comma/semicolon near the limit
                    let splitIndex = -1;
                    const commaIdx = remaining.lastIndexOf(',', MAX_CHARS);
                    const semiIdx = remaining.lastIndexOf(';', MAX_CHARS);
                    const colonIdx = remaining.lastIndexOf(':', MAX_CHARS);

                    // Pick the closest to MAX_CHARS that's not too early
                    const candidates = [commaIdx, semiIdx, colonIdx].filter(i => i > MIN_CHARS);
                    if (candidates.length > 0) {
                        splitIndex = Math.max(...candidates) + 1; // Include the punctuation
                    }

                    // Fall back to space
                    if (splitIndex <= MIN_CHARS) {
                        splitIndex = remaining.lastIndexOf(' ', MAX_CHARS);
                    }

                    // Last resort: hard split
                    if (splitIndex <= MIN_CHARS) {
                        splitIndex = MAX_CHARS;
                    }

                    result.push(remaining.substring(0, splitIndex).trim());
                    remaining = remaining.substring(splitIndex).trim();
                }
                if (remaining) result.push(remaining);
            }
        }

        if (result.length === 0) {
            console.warn('⚠️ Could not split text, using full text:', text.substring(0, 100));
            return [text];
        }

        console.log(`📐 Split "${text.substring(0, 50)}..." into ${result.length} sentences:`, result.map(s => `"${s.substring(0, 40)}..." (${s.length} chars)`));
        return result;
    };

    // New Scene button handler
    const handleNewScene = async () => {
        if (isGenerating) return;

        setIsGenerating(true);
        setConversations([]);
        setIsPaused(false);

        // Clear all talking state maps for new scene
        setIsTalkingMap(new Map());
        setBubblesMap(new Map());
        setLockedLayoutMap(new Map());
        setTalkTriggerMap(new Map());

        // Clear all timeouts
        timeoutsRef.current.forEach((timeouts) => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        });
        timeoutsRef.current.clear();

        try {
            // Extract session info
            const newSessionId = `kitchen_session_${Date.now()}`;
            const newChatId = `kitchen_${Date.now()}`;
            setSessionId(newSessionId);
            setChatId(newChatId);

            // Handler receives each LLM response and transforms it into bubbles immediately
            const handleResponse = (conv: typeof conversations[0]) => {
                if (conv.is_ai && conv.speaker_id !== 'coach') {
                    console.log('🗣️ Response received, displaying bubbles for:', conv.speaker_id);

                    // Map UUID to canonical ID for handleSpeak
                    const character = available_characters.find(c => c.id === conv.speaker_id);
                    if (!character) {
                        console.error(`❌ Character not found for speaker_id: ${conv.speaker_id}`);
                        return;
                    }
                    const canonical_id = character.character_id;
                    console.log(`🔄 Mapped UUID ${conv.speaker_id} to canonical ID: ${canonical_id}`);

                    const sentences = splitIntoSentences(conv.message);
                    handleSpeak(canonical_id, sentences);
                }
            };

            const newConversations = await kitchenTableService.startNewScene(
                headquarters,
                available_characters,
                coach_name,
                handleResponse
            );

            setConversations(newConversations);
        } catch (error) {
            console.error('Failed to start new scene:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Continue Scene button handler
    const handleContinueScene = async () => {
        if (isGenerating || !sessionId || !chatId) return;

        setIsGenerating(true);

        try {
            const newConversations = await kitchenTableService.continueScene(
                conversations,
                available_characters,
                sessionId,
                chatId
            );

            setConversations(prev => [...newConversations, ...prev]);

            // Display bubbles for new responses
            newConversations.forEach(conv => {
                if (conv.is_ai && conv.speaker_id !== 'coach') {
                    // Map UUID to canonical ID for handleSpeak
                    const character = available_characters.find(c => c.id === conv.speaker_id);
                    if (!character) {
                        console.error(`❌ Character not found for speaker_id: ${conv.speaker_id}`);
                        return;
                    }
                    const canonical_id = character.character_id;

                    const sentences = splitIntoSentences(conv.message);
                    handleSpeak(canonical_id, sentences);
                }
            });
        } catch (error) {
            console.error('Failed to continue scene:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Coach message handler
    const handleSendCoachMessage = async () => {
        if (isGenerating || !coachInput.trim() || !sessionId || !chatId) return;

        setIsGenerating(true);
        const message = coachInput.trim();
        setCoachInput('');

        try {
            const newConversations = await kitchenTableService.handleCoachMessage(
                message,
                conversations,
                available_characters,
                sessionId,
                chatId,
                coach_name
            );

            setConversations(prev => [...newConversations, ...prev]);

            // Display bubbles for character responses (skip coach message)
            newConversations.forEach(conv => {
                if (conv.is_ai && conv.speaker_id !== 'coach') {
                    // Map UUID to canonical ID for handleSpeak
                    const character = available_characters.find(c => c.id === conv.speaker_id);
                    if (!character) {
                        console.error(`❌ Character not found for speaker_id: ${conv.speaker_id}`);
                        return;
                    }
                    const canonical_id = character.character_id;

                    const sentences = splitIntoSentences(conv.message);
                    handleSpeak(canonical_id, sentences);
                }
            });
        } catch (error) {
            console.error('Failed to send coach message:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        return () => {
            // Clean up all timeouts for all characters
            timeoutsRef.current.forEach(timeouts => {
                timeouts.forEach(t => clearTimeout(t));
            });
        };
    }, []);

    // Calculate bubble positions for a specific character (memoized to prevent 60 FPS recalculation)
    // currentBubblesMap is passed explicitly to avoid stale closure issues during concurrent updates
    const calculatePositionsForCharacter = useCallback((characterId: string, bubbleCount: number, bubbleHeights: number[], layout: LayoutType, currentBubblesMap: Map<string, Bubble[]>): { x: number; y: number }[] => {
        const faceMetrics = faceMetricsMap.get(characterId);

        const faceH = faceMetrics.faceHeight;
        const jawPixelX = (faceMetrics.jawX / 100) * screenWidth;
        const jawPixelY = (faceMetrics.jawY / 100) * screenHeight;

        const FACE_CLEARANCE = Math.min(faceH * 1.15, 250);
        const UNIT = faceH * 0.35;
        const BUBBLE_GAP = faceH * 0.20; // Removed cap - allow full scaling
        const SIDE_OFFSET = faceH * 0.60;
        const VERTICAL_STEP = faceH * 0.45; // Removed cap - allow full scaling
        const HORIZONTAL_STEP = 150; // Fixed spacing to prevent bubble collision

        console.log(`🎯 [${characterId}] faceH=${faceH.toFixed(0)}px, FACE_CLEARANCE=${FACE_CLEARANCE.toFixed(0)}px, VERTICAL_STEP=${VERTICAL_STEP.toFixed(0)}px, layout=${layout}`);

        const MARGIN = 20;
        const BUBBLE_HALF_WIDTH = 175; // For 350px max width (widths vary 250-350px)

        // Calculate obstacles from OTHER characters ONCE before loop
        // Include both face positions AND their existing bubbles with bounding boxes
        const obstacles: ObstaclePosition[] = [];

        // Add UI button area as obstacle (top-right control buttons)
        // Buttons are at top: 20, right: 20, approximately 450px wide x 50px tall
        const BUTTON_AREA_WIDTH = 450;
        const BUTTON_AREA_HEIGHT = 60;
        const BUTTON_AREA_TOP = 20;
        const BUTTON_AREA_RIGHT = 20;
        const buttonObstacle = {
            x: screenWidth - BUTTON_AREA_RIGHT - (BUTTON_AREA_WIDTH / 2),
            y: BUTTON_AREA_TOP + (BUTTON_AREA_HEIGHT / 2),
            halfWidth: BUTTON_AREA_WIDTH / 2,
            halfHeight: BUTTON_AREA_HEIGHT / 2
        };
        console.log(`🔲 Button obstacle: x=${buttonObstacle.x.toFixed(0)}, y=${buttonObstacle.y.toFixed(0)}, halfW=${buttonObstacle.halfWidth}, halfH=${buttonObstacle.halfHeight}, screenWidth=${screenWidth}`);
        obstacles.push(buttonObstacle);

        // Add screen boundaries as obstacles so collision detection handles them
        // Top boundary - prevents bubbles from going off top of screen
        obstacles.push({
            x: screenWidth / 2,
            y: -500,  // Far above screen
            halfWidth: screenWidth / 2,
            halfHeight: 500 + MARGIN  // Extends down to MARGIN from top
        });

        // Add current character's own face as obstacle (prevents bubbles covering own face)
        obstacles.push({
            x: jawPixelX,
            y: jawPixelY,
            halfWidth: JAW_CLEARANCE_HALF,
            halfHeight: JAW_CLEARANCE_HALF
        });

        faceMetricsMap.forEach((metrics, id) => {
            if (id !== characterId) {
                const otherJawPixelX = (metrics.jawX / 100) * screenWidth;
                const otherJawPixelY = (metrics.jawY / 100) * screenHeight;

                // Add face position as obstacle with clearance box
                obstacles.push({
                    x: otherJawPixelX,
                    y: otherJawPixelY,
                    halfWidth: JAW_CLEARANCE_HALF,
                    halfHeight: JAW_CLEARANCE_HALF
                });

                // Add other character's bubbles as obstacles with actual dimensions
                const otherBubbles = currentBubblesMap.get(id) || [];
                otherBubbles.forEach(bubble => {
                    const bubbleAbsX = otherJawPixelX + bubble.x;
                    const bubbleHalfHeight = bubble.measuredHeight / 2;
                    // bubble.y is offset from jaw to bubble BOTTOM, convert to CENTER for collision
                    const bubbleCenterY = otherJawPixelY + bubble.y - bubbleHalfHeight;
                    obstacles.push({
                        x: bubbleAbsX,
                        y: bubbleCenterY,
                        halfWidth: BUBBLE_HALF_WIDTH,
                        halfHeight: bubbleHalfHeight
                    });
                });
            }
        });

        let accumulatedOffset = { x: 0, y: 0 };

        const result = Array.from({ length: bubbleCount }, (_, index) => {
            let x = 0, y = 0;

            // Reverse index so first sentence (index 0) appears at TOP, reading top-to-bottom
            const reversedIndex = bubbleCount - 1 - index;

            switch (layout) {
                case 'stack-right':
                    x = SIDE_OFFSET;
                    y = -FACE_CLEARANCE - (reversedIndex * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'stack-left':
                    x = -SIDE_OFFSET;
                    y = -FACE_CLEARANCE - (reversedIndex * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'horizontal-right':
                    x = index * HORIZONTAL_STEP;
                    y = -FACE_CLEARANCE - (index * UNIT * 0.3);
                    break;
                case 'horizontal-left':
                    x = -(index * HORIZONTAL_STEP);
                    y = -FACE_CLEARANCE - (index * UNIT * 0.3);
                    break;
                case 'arc-over':
                    const arcSpacing = HORIZONTAL_STEP;
                    const arcHeight = faceH * 0.6; // Increased for more pronounced arc
                    const centerX = ((bubbleCount - 1) / 2) * arcSpacing;
                    x = (index * arcSpacing) - centerX;
                    const arcProgress = index / Math.max(bubbleCount - 1, 1);
                    y = -FACE_CLEARANCE - arcHeight * Math.sin(arcProgress * Math.PI); // Removed diagonal offset
                    break;
                case 'arc-left':
                    const leftArcProg = index / Math.max(bubbleCount - 1, 1);
                    x = -SIDE_OFFSET - (UNIT * 0.4 * Math.sin(leftArcProg * Math.PI));
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'arc-right':
                    const rightArcProg = index / Math.max(bubbleCount - 1, 1);
                    x = SIDE_OFFSET + (UNIT * 0.4 * Math.sin(rightArcProg * Math.PI));
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'diagonal-up-right':
                    x = index * (HORIZONTAL_STEP * 0.6);
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'diagonal-up-left':
                    x = -(index * (HORIZONTAL_STEP * 0.6));
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'L-right-up':
                    if (index < 2) {
                        x = index * HORIZONTAL_STEP;
                        y = -FACE_CLEARANCE - (index * UNIT * 0.2);
                    } else {
                        x = HORIZONTAL_STEP;
                        y = -FACE_CLEARANCE - UNIT - ((index - 1) * (VERTICAL_STEP + BUBBLE_GAP));
                    }
                    break;
                case 'L-up-right':
                    if (index < 2) {
                        x = SIDE_OFFSET;
                        y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    } else {
                        x = SIDE_OFFSET + ((index - 1) * HORIZONTAL_STEP);
                        y = -FACE_CLEARANCE - VERTICAL_STEP;
                    }
                    break;
                case 'zigzag':
                    x = (index % 2 === 0) ? UNIT : -UNIT;
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'staircase':
                    x = index * (HORIZONTAL_STEP * 0.4);
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'staircase-left':
                    x = -(index * (HORIZONTAL_STEP * 0.4));
                    y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    break;
                case 'L-left-up':
                    if (index < 2) {
                        x = -(index * HORIZONTAL_STEP);
                        y = -FACE_CLEARANCE - (index * UNIT * 0.2);
                    } else {
                        x = -HORIZONTAL_STEP;
                        y = -FACE_CLEARANCE - UNIT - ((index - 1) * (VERTICAL_STEP + BUBBLE_GAP));
                    }
                    break;
                case 'L-up-left':
                    if (index < 2) {
                        x = -SIDE_OFFSET;
                        y = -FACE_CLEARANCE - (index * (VERTICAL_STEP + BUBBLE_GAP));
                    } else {
                        x = -SIDE_OFFSET - ((index - 1) * HORIZONTAL_STEP);
                        y = -FACE_CLEARANCE - VERTICAL_STEP;
                    }
                    break;
                default:
                    throw new Error(`Unknown layout type: ${layout}`);
            }

            // Apply accumulated offset from previous collisions (test-app behavior)
            x += accumulatedOffset.x;
            y += accumulatedOffset.y;

            // Check bounding box collision with obstacles
            const currentBubbleHalfHeight = bubbleHeights[index] / 2;

            obstacles.forEach((obs, obsIndex) => {
                const globalX = jawPixelX + x;
                const globalY = jawPixelY + y;

                // Check bounding box overlap (AABB intersection)
                const overlapX = (BUBBLE_HALF_WIDTH + obs.halfWidth) - Math.abs(globalX - obs.x);
                const overlapY = (currentBubbleHalfHeight + obs.halfHeight) - Math.abs(globalY - obs.y);

                // Debug: Log collision check for button obstacle (first obstacle)
                if (obsIndex === 0) {
                    console.log(`🔍 [${characterId}] Bubble ${index} vs buttons: globalX=${globalX.toFixed(0)}, globalY=${globalY.toFixed(0)}, overlapX=${overlapX.toFixed(0)}, overlapY=${overlapY.toFixed(0)}`);
                }

                // If both overlaps are positive, boxes intersect
                if (overlapX > 0 && overlapY > 0) {
                    // Push in direction of least overlap to minimize movement
                    const dx = globalX - obs.x;
                    const dy = globalY - obs.y;

                    if (overlapX < overlapY) {
                        // Push horizontally
                        const pushX = dx > 0 ? overlapX + 5 : -(overlapX + 5);
                        x += pushX;
                        accumulatedOffset.x += pushX;
                        console.log(`⚠️ [${characterId}] Bubble #${index} horizontal push: ${pushX.toFixed(0)}px`);
                    } else {
                        // Push vertically (prefer upward)
                        const pushY = dy > 0 ? overlapY + 5 : -(overlapY + 5);
                        y += pushY;
                        accumulatedOffset.y += pushY;
                        console.log(`⚠️ [${characterId}] Bubble #${index} vertical push: ${pushY.toFixed(0)}px`);
                    }
                }
            });

            // Use actual bubble height for boundary checking
            const currentBubbleHeight = bubbleHeights[index];

            const bubbleLeft = jawPixelX + x - BUBBLE_HALF_WIDTH;
            const bubbleRight = jawPixelX + x + BUBBLE_HALF_WIDTH;
            const bubbleTop = jawPixelY + y - currentBubbleHeight;

            if (bubbleLeft < MARGIN) {
                x = MARGIN - jawPixelX + BUBBLE_HALF_WIDTH;
            }
            if (bubbleRight > screenWidth - MARGIN) {
                x = screenWidth - MARGIN - jawPixelX - BUBBLE_HALF_WIDTH;
            }
            if (bubbleTop < MARGIN) {
                y = MARGIN - jawPixelY + currentBubbleHeight;
            }
            // Bottom boundary check
            const bubbleBottom = jawPixelY + y;
            if (bubbleBottom > screenHeight - MARGIN) {
                y = screenHeight - MARGIN - jawPixelY;
            }

            return { x, y };
        });

        // Helper: check if a position collides with any placed bubble OR obstacle
        const collidesWithOthers = (testX: number, testY: number, testHeight: number, currentIndex: number): boolean => {
            const globalX = jawPixelX + testX;
            const globalY = jawPixelY + testY;
            const testHalfHeight = testHeight / 2;

            // Check against same-character bubbles that have ALREADY been resolved (indices < currentIndex)
            // This prevents checking against unresolved bubbles at their initial positions
            for (let k = 0; k < currentIndex; k++) {
                const dx = Math.abs(testX - result[k].x);
                const dy = Math.abs(testY - result[k].y);
                const otherHeight = bubbleHeights[k];
                // Add 10px gap between bubbles for visual clarity
                if (dx < (BUBBLE_HALF_WIDTH * 2) + 10 && dy < Math.max(testHeight, otherHeight) + 10) {
                    return true;
                }
            }

            // Check against obstacles (other characters' faces, bubbles, buttons, boundaries)
            for (const obs of obstacles) {
                const dx = Math.abs(globalX - obs.x);
                const dy = Math.abs(globalY - testHalfHeight - obs.y);
                if (dx < (BUBBLE_HALF_WIDTH + obs.halfWidth) && dy < (testHalfHeight + obs.halfHeight)) {
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
                        console.log(`🔍 Found free position for bubble ${bubbleIndex} at (${testX.toFixed(0)}, ${testY.toFixed(0)})`);
                        return { x: testX, y: testY };
                    }
                }
            }
            // Should never reach here if screen has space
            console.error(`❌ No free position found for bubble ${bubbleIndex}!`);
            return { x: startX, y: startY };
        };

        // Resolve collisions by finding free positions
        for (let i = 1; i < result.length; i++) {
            const height = bubbleHeights[i];
            if (collidesWithOthers(result[i].x, result[i].y, height, i)) {
                const freePos = findFreePosition(result[i].x, result[i].y, height, i);
                result[i].x = freePos.x;
                result[i].y = freePos.y;
            }
        }

        // Final boundary enforcement for left/right/bottom (top is handled by obstacle + smart collision)
        for (let i = 0; i < result.length; i++) {
            const bubbleBottom = jawPixelY + result[i].y;
            const bubbleLeft = jawPixelX + result[i].x - BUBBLE_HALF_WIDTH;
            const bubbleRight = jawPixelX + result[i].x + BUBBLE_HALF_WIDTH;

            if (bubbleBottom > screenHeight - MARGIN) {
                result[i].y = screenHeight - MARGIN - jawPixelY;
            }
            if (bubbleLeft < MARGIN) {
                result[i].x = MARGIN - jawPixelX + BUBBLE_HALF_WIDTH;
            }
            if (bubbleRight > screenWidth - MARGIN) {
                result[i].x = screenWidth - MARGIN - jawPixelX - BUBBLE_HALF_WIDTH;
            }
        }

        return result;
    }, [faceMetricsMap, screenWidth, screenHeight]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#1a1a2e', position: 'relative', overflow: 'hidden' }}>
            {/* Header */}
            <h1 style={{
                position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                color: 'white', zIndex: 10, fontFamily: 'sans-serif', fontSize: '20px'
            }}>
                Kitchen Chat Scene - {characters.length} Characters
            </h1>

            {/* Kitchen Table Controls - Top Right */}
            <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                display: 'flex',
                gap: 10,
                zIndex: 100
            }}>
                <button
                    onClick={handleNewScene}
                    disabled={isGenerating}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: isGenerating ? '#555' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                >
                    {isGenerating ? 'Generating...' : '🎬 New Scene'}
                </button>

                <button
                    onClick={handleContinueScene}
                    disabled={isGenerating || !sessionId}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: (isGenerating || !sessionId) ? '#555' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: (isGenerating || !sessionId) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                >
                    ▶️ Continue
                </button>

                <button
                    onClick={() => setIsPaused(!isPaused)}
                    style={{
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: isPaused ? '#f59e0b' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                >
                    {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>

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
                    📜 History
                </button>
            </div>

            {/* Coach Input - Bottom Center (hidden during opening phase) */}
            {!isOpeningPhase && (
            <div style={{
                position: 'absolute',
                bottom: 30,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                zIndex: 100,
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '15px 20px',
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
                <span style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px'
                }}>
                    {coach_name}:
                </span>
                <input
                    type="text"
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendCoachMessage()}
                    placeholder="Type your message to the team..."
                    disabled={isGenerating || !sessionId}
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
                    onClick={handleSendCoachMessage}
                    disabled={isGenerating || !coachInput.trim() || !sessionId}
                    style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: (isGenerating || !coachInput.trim() || !sessionId) ? '#555' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: (isGenerating || !coachInput.trim() || !sessionId) ? 'not-allowed' : 'pointer'
                    }}
                >
                    Send
                </button>
            </div>
            )}

            {/* Conversation History Panel */}
            {showHistory && (
                <div style={{
                    position: 'absolute',
                    top: 80,
                    right: 20,
                    width: '350px',
                    maxHeight: '500px',
                    background: 'rgba(0, 0, 0, 0.85)',
                    borderRadius: 12,
                    padding: '15px',
                    zIndex: 99,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    overflowY: 'auto'
                }}>
                    <h3 style={{
                        color: 'white',
                        margin: '0 0 15px 0',
                        fontSize: '16px',
                        borderBottom: '2px solid #444',
                        paddingBottom: '10px'
                    }}>
                        Conversation History
                    </h3>
                    {conversations.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '14px' }}>No conversations yet. Start a new scene!</p>
                    ) : (
                        conversations.map((conv, idx) => (
                            <div key={conv.id} style={{
                                marginBottom: '12px',
                                padding: '10px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: 8,
                                borderLeft: `3px solid ${conv.speaker_id === 'coach' ? '#3b82f6' : '#10b981'}`
                            }}>
                                <div style={{
                                    color: '#60a5fa',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    marginBottom: '5px'
                                }}>
                                    {conv.speaker} {conv.speaker_id === 'coach' ? '👨‍💼' : ''}
                                </div>
                                <div style={{
                                    color: 'white',
                                    fontSize: '12px',
                                    lineHeight: 1.4
                                }}>
                                    {conv.message}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* 3D Scene */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                <Canvas shadows style={{ background: '#1a1a2e' }}>
                    <PerspectiveCamera makeDefault position={[0, -0.3, 3.5]} fov={50} />

                    {/* Lighting - Kitchen-specific warm atmosphere */}
                    <ambientLight intensity={0.6} />
                    <directionalLight
                        position={[5, 5, 5]}
                        intensity={0.8}
                        castShadow
                        shadow-mapSize-width={2048}
                        shadow-mapSize-height={2048}
                    />
                    {/* Warm point lights for kitchen feel */}
                    <pointLight position={[0, 4, 2]} intensity={0.4} color="#fff5e6" />
                    <pointLight position={[-3, 3, 0]} intensity={0.3} color="#fff5e6" />

                    {/* Environment reflection for metallic materials */}
                    <Environment preset="city" />

                    {/* Kitchen Room Environment - Floor and Walls with textures */}
                    <React.Suspense fallback={<KitchenRoomEnvironmentFallback />}>
                        <KitchenRoomEnvironment />
                    </React.Suspense>

                    {/* Characters */}
                    <React.Suspense fallback={<Html center><div style={{ color: 'white' }}>Loading characters...</div></Html>}>
                        {characters.map(char => (
                            <Character
                                key={char.id}
                                modelPath={char.modelPath}
                                position={char.position}
                                rotation={char.rotation}
                                talkTrigger={talkTriggerMap.get(char.id) || 0}
                                onFaceMetrics={(metrics) => handleFaceMetrics(char.id, metrics)}
                            />
                        ))}
                    </React.Suspense>

                    <OrbitControls target={[0, -0.5, 0]} />
                </Canvas>
            </div>

            {/* Comic Book Speech Bubbles - Render for each character */}
            {characters.map((char, charIndex) => {
                const bubbles = bubblesMap.get(char.id);
                if (!bubbles || bubbles.length === 0) {
                    return null;
                }

                const faceMetrics = faceMetricsMap.get(char.id);
                if (!faceMetrics) {
                    return null;
                }

                const layout = lockedLayoutMap.get(char.id);
                const isArc = layout?.includes('arc');
                const bubbleColor = BUBBLE_COLORS[charIndex % BUBBLE_COLORS.length];

                return bubbles.map((bubble, index) => {
                    return (
                        <div
                            key={bubble.id}
                            style={{
                                position: 'absolute',
                                left: `calc(${faceMetrics.jawX}% + ${bubble.x}px)`,
                                top: `calc(${faceMetrics.jawY}% + ${bubble.y}px)`,
                                transform: `translate(-50%, -100%) rotate(${bubble.rotate * 0.3}deg) scale(${bubble.scale})`,
                                minWidth: '90px',
                                maxWidth: `${bubble.width}px`,
                                backgroundColor: 'white',
                                padding: '10px 14px',
                                borderRadius: bubble.borderRadius,
                                border: `3px solid ${bubbleColor}`,
                                boxShadow: `3px 3px 0px ${bubbleColor}`,
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
                                    left: isArc ? '70%' : '25px',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '8px solid transparent',
                                    borderRight: '14px solid transparent',
                                    borderTop: '22px solid white',
                                    filter: `drop-shadow(2px 2px 0px ${bubbleColor})`,
                                    transform: `rotate(${isArc ? -45 : -15}deg)`
                                }} />
                            )}
                            {bubble.message}
                        </div>
                    );
                });
            })}

            <style jsx global>{`
                @keyframes bubblePopIn {
                    from { opacity: 0; transform: translate(-50%, -100%) scale(0.5); }
                    to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
                }
            `}</style>
        </div>
    );
});

KitchenChatScene.displayName = 'KitchenChatScene';

export default KitchenChatScene;
