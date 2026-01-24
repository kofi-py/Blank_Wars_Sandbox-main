import React, { Suspense, useState, forwardRef, useImperativeHandle, useEffect, useCallback, useMemo, useRef } from 'react';
import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html, useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';
import KitchenCharacter, { type FaceMetrics } from './KitchenCharacter';
import { WordBubbleSystemRef } from './WordBubbleSystem';
import { ChatContextType, BubbleType, EmotionType } from '@/types/wordBubble';
import { getCharacter3DModelPath } from '@/utils/characterImageUtils';
import { ErrorBoundary } from 'react-error-boundary';
import { SpeechBubble3D } from './SpeechBubble3D';
import { selectBestLayout, calculateBubblePositions, type ObstaclePosition } from '@/utils/bubbleLayout';

function ModelFallback({ error }: { error: Error }) {
  console.warn('3D Model failed to load:', error);
  return (
    <mesh position={[0, 3, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="red" />
      <Html position={[0, 2.5, 0]} center>
        <div className="bg-red-500 text-white p-2 rounded text-xs w-48 text-center">
          Model Error: {error.message}
        </div>
      </Html>
    </mesh>
  );
}

// SpeechBubble3D component now imported from separate file (comic book HTML overlay system)

/**
 * Typewriter Bubble Component
 * Handles paging long text and revealing it character-by-character
 */
function TypewriterBubble({
  text,
  characterName,
  tailPosition,
  onComplete
}: {
  text: string,
  characterName: string,
  tailPosition: 'center' | 'left' | 'right',
  onComplete: () => void
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);

  // Split text into pages
  const pages = useMemo(() => {
    const words = text.split(' ');
    const pages: string[] = [];
    let currentPage = '';
    const MAX_CHARS_PER_PAGE = 120; // Fixed size for RPG feel

    words.forEach(word => {
      if ((currentPage + word).length > MAX_CHARS_PER_PAGE) {
        pages.push(currentPage.trim());
        currentPage = word + ' ';
      } else {
        currentPage += word + ' ';
      }
    });
    if (currentPage.trim()) {
      pages.push(currentPage.trim());
    }
    return pages;
  }, [text]);

  useEffect(() => {
    // Reset state when text changes (new bubble)
    setDisplayedText('');
    setPageIndex(0);
    setIsWaiting(false);
  }, [text]);

  useEffect(() => {
    if (pageIndex >= pages.length) {
      // All pages done
      const timeout = setTimeout(onComplete, 2000); // Wait a bit before closing
      return () => clearTimeout(timeout);
    }

    const currentPageText = pages[pageIndex];

    if (displayedText.length < currentPageText.length) {
      // Typing effect
      const timeout = setTimeout(() => {
        setDisplayedText(currentPageText.slice(0, displayedText.length + 1));
      }, 30); // 30ms per char typing speed
      return () => clearTimeout(timeout);
    } else {
      // Page finished
      if (!isWaiting) {
        setIsWaiting(true);
        const readTime = Math.max(1500, currentPageText.length * 50); // Dynamic read time
        const timeout = setTimeout(() => {
          setIsWaiting(false);
          setDisplayedText('');
          setPageIndex(prev => prev + 1);
        }, readTime);
        return () => clearTimeout(timeout);
      }
    }
  }, [displayedText, pageIndex, pages, isWaiting, onComplete]);

  return (
    <div className="relative pointer-events-none transform -translate-y-1/2">
      {/* RPG Style Bubble - Fixed Size */}
      <div
        className="bg-white shadow-xl flex flex-col"
        style={{
          width: '1200px', // Fixed width
          height: '600px', // Fixed height
          padding: '48px',
          border: '8px solid #1f2937',
          borderRadius: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Character name */}
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px', flexShrink: 0 }}>
          {characterName}
        </div>

        {/* Message Content Area */}
        <div className="flex-grow relative overflow-hidden">
          <p className="text-gray-900 font-bold leading-tight whitespace-pre-wrap break-words" style={{ fontSize: '80px', lineHeight: '1.2' }}>
            {displayedText}
            {/* Blinking cursor */}
            <span className="animate-pulse">|</span>
          </p>
        </div>

        {/* Page Indicator */}
        {pages.length > 1 && (
          <div className="absolute bottom-8 right-12 text-gray-400 text-4xl font-bold">
            {pageIndex + 1} / {pages.length} {isWaiting && pageIndex < pages.length - 1 ? '▼' : ''}
          </div>
        )}

        {/* Speech tail */}
        {tailPosition === 'center' && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[20px] border-l-transparent border-r-transparent border-t-gray-900"></div>
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[16px] border-l-transparent border-r-transparent border-t-white absolute bottom-1 left-1/2 transform -translate-x-1/2"></div>
          </div>
        )}

        {tailPosition === 'left' && (
          <div className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2">
            <div className="w-0 h-0 border-t-[16px] border-b-[16px] border-r-[20px] border-t-transparent border-b-transparent border-r-gray-900"></div>
            <div className="w-0 h-0 border-t-[12px] border-b-[12px] border-r-[16px] border-t-transparent border-b-transparent border-r-white absolute right-1 top-1/2 transform -translate-y-1/2"></div>
          </div>
        )}

        {tailPosition === 'right' && (
          <div className="absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2">
            <div className="w-0 h-0 border-t-[16px] border-b-[16px] border-l-[20px] border-t-transparent border-b-transparent border-l-gray-900"></div>
            <div className="w-0 h-0 border-t-[12px] border-b-[12px] border-l-[16px] border-t-transparent border-b-transparent border-l-white absolute left-1 top-1/2 transform -translate-y-1/2"></div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ChatTheater3DProps {
  context_type: ChatContextType;
  participants: Array<{
    character_id: string;
    character_name: string;
    character_avatar: string;
  }>;
  is_enabled?: boolean;
  class_name?: string;
  use_3d_bubbles?: boolean; // New prop to toggle 3D mesh bubbles
  /** Callback with 2D screen positions (percentages) for each character's jaw */
  onJawPositions2D?: (positions: Map<string, { x: number; y: number }>) => void;
  /** If true, disables internal bubble rendering (use external SmartWordBubble instead) */
  useExternalBubbles?: boolean;
}

// JawPositionProjector component removed - projection now happens in KitchenCharacter (test-app style)

/**
 * Kitchen Table - 3D table model
 */
function KitchenTable() {
  // Placeholder for missing 3D model
  // Table top at y=1.5, legs (height=3) extend down to y=0 (floor)
  return (
    <group position={[0, 1.5, 6]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[10, 1, 6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Legs - positioned so they touch floor at y=0 */}
      <mesh position={[-4, -1.5, -2]}>
        <boxGeometry args={[0.5, 3, 0.5]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh position={[4, -1.5, -2]}>
        <boxGeometry args={[0.5, 3, 0.5]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh position={[-4, -1.5, 2]}>
        <boxGeometry args={[0.5, 3, 0.5]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      <mesh position={[4, -1.5, 2]}>
        <boxGeometry args={[0.5, 3, 0.5]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
    </group>
  );
}

/**
 * Camera Setup - Position at corner looking at table center
 */
function CameraSetup() {
  const { camera } = useThree();

  useEffect(() => {
    // Point camera at table center (moved forward to Z=6)
    camera.lookAt(0, 3, 6);
  }, [camera]);

  return null;
}

/**
 * Kitchen Environment - Simple oversized planes to fill viewport
 * No complex calculations - just make walls bigger than camera can see
 */
function KitchenEnvironment() {
  // Simple colored environment - no texture loading for better reliability
  return (
    <>
      {/* Back wall - cozy kitchen cream color */}
      <mesh position={[0, 15, -30]}>
        <planeGeometry args={[150, 50]} />
        <meshStandardMaterial color="#F5E6D3" roughness={0.9} />
      </mesh>

      {/* Left wall - matching kitchen wall color */}
      <mesh position={[-50, 15, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[150, 50]} />
        <meshStandardMaterial color="#F5E6D3" roughness={0.9} />
      </mesh>

      {/* Right wall - matching kitchen wall color */}
      <mesh position={[50, 15, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[150, 50]} />
        <meshStandardMaterial color="#F5E6D3" roughness={0.9} />
      </mesh>

      {/* Floor - wood-toned brown */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Ceiling - plain beige */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 30, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshBasicMaterial color={0xf5f5dc} />
      </mesh>
    </>
  );
}

/**
 * Confessional/Spartan Apartment Environment - Minimal but appropriately sized setting
 */
function ConfessionalEnvironment() {
  return (
    <>
      {/* Back wall - warm beige, taller for headroom */}
      <mesh position={[0, 12, -15]}>
        <planeGeometry args={[35, 24]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.9} />
      </mesh>

      {/* Left wall - warm beige */}
      <mesh position={[-17, 12, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.9} />
      </mesh>

      {/* Right wall - warm beige */}
      <mesh position={[17, 12, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.9} />
      </mesh>

      {/* Floor - warm wood planks color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[35, 30]} />
        <meshStandardMaterial color="#a67c52" roughness={0.8} />
      </mesh>

      {/* Ceiling - off white, high up for speech bubbles */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 24, 0]}>
        <planeGeometry args={[35, 30]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.9} />
      </mesh>

      {/* Window with frame on back wall */}
      <group position={[8, 14, -14.8]}>
        {/* Window glass */}
        <mesh>
          <planeGeometry args={[5, 4]} />
          <meshBasicMaterial color="#87CEEB" opacity={0.5} transparent />
        </mesh>
        {/* Window frame - top */}
        <mesh position={[0, 2.1, 0]}>
          <boxGeometry args={[5.2, 0.2, 0.1]} />
          <meshStandardMaterial color="#3d2817" />
        </mesh>
        {/* Window frame - bottom */}
        <mesh position={[0, -2.1, 0]}>
          <boxGeometry args={[5.2, 0.2, 0.1]} />
          <meshStandardMaterial color="#3d2817" />
        </mesh>
        {/* Window frame - left */}
        <mesh position={[-2.6, 0, 0]}>
          <boxGeometry args={[0.2, 4.4, 0.1]} />
          <meshStandardMaterial color="#3d2817" />
        </mesh>
        {/* Window frame - right */}
        <mesh position={[2.6, 0, 0]}>
          <boxGeometry args={[0.2, 4.4, 0.1]} />
          <meshStandardMaterial color="#3d2817" />
        </mesh>
      </group>

      {/* Baseboards along walls */}
      {/* Back wall baseboard */}
      <mesh position={[0, 0.3, -14.9]}>
        <boxGeometry args={[35, 0.6, 0.3]} />
        <meshStandardMaterial color="#3d2817" />
      </mesh>
      {/* Left wall baseboard */}
      <mesh position={[-16.9, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 30]} />
        <meshStandardMaterial color="#3d2817" />
      </mesh>
      {/* Right wall baseboard */}
      <mesh position={[16.9, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 30]} />
        <meshStandardMaterial color="#3d2817" />
      </mesh>
    </>
  );
}

/**
 * 3D Visual Theater - Combines 3D character models with word bubble chat system
 * The future of chat in Blank Wars!
 */
interface ActiveBubble {
  id: string;
  character_id: string;
  message: string;
  type: BubbleType;
  emotion: EmotionType;
  sequence_number: number; // For ordering multiple bubbles
  // Comic book styling (calculated once, not per render)
  rotate: number;
  scale: number;
  borderRadius: string;
}

const ChatTheater3D = forwardRef<WordBubbleSystemRef, ChatTheater3DProps>(({
  context_type,
  participants,
  is_enabled = true,
  class_name = '',
  use_3d_bubbles = true, // Enable 3D word bubbles for metal foldout chair models
  onJawPositions2D,
  useExternalBubbles = false
}, ref) => {
  // Store multiple bubbles per character (comic book style chaining)
  const [activeBubbles, setActiveBubbles] = useState<Map<string, ActiveBubble[]>>(new Map());
  const [speakingCharacters, setSpeakingCharacters] = useState<Set<string>>(new Set());

  // Layout state for word bubble positioning
  const [characterLayouts, setCharacterLayouts] = useState<Map<string, string>>(new Map());

  // Face metrics for each character (updated every frame via KitchenCharacter)
  const [faceMetrics, setFaceMetrics] = useState<Map<string, FaceMetrics>>(new Map());

  // Talk triggers for animations (increment to trigger talk animation)
  const [talkTriggers, setTalkTriggers] = useState<Map<string, number>>(new Map());

  // Callback to update face metrics for a character
  const handleFaceMetrics = useCallback((character_id: string, metrics: FaceMetrics) => {
    setFaceMetrics(prev => {
      const next = new Map(prev);
      next.set(character_id, metrics);
      return next;
    });
  }, []);

  // Helper to remove a bubble
  const removeBubble = useCallback((character_id: string, bubble_id: string) => {
    let shouldRemoveFromSpeaking = false;

    setActiveBubbles(prev => {
      const next: Map<string, ActiveBubble[]> = new Map(prev);
      const charBubbles: ActiveBubble[] = next.get(character_id) || [];
      // Remove this specific bubble by id
      const filtered = charBubbles.filter(b => b.id !== bubble_id);
      if (filtered.length === 0) {
        next.delete(character_id);
        shouldRemoveFromSpeaking = true; // No bubbles left for this character
      } else {
        next.set(character_id, filtered);
      }
      return next;
    });

    // Remove from speaking set only if no bubbles left
    if (shouldRemoveFromSpeaking) {
      setSpeakingCharacters(prev => {
        const next = new Set(prev);
        next.delete(character_id);
        return next;
      });

      // Clear locked layout so new layout can be selected next time
      setCharacterLayouts(prev => {
        const next = new Map(prev);
        next.delete(character_id);
        return next;
      });
    }
  }, []);

  // Expose bubble system methods to parent
  useImperativeHandle(ref, () => ({
    add_bubble: (character_id: string, message: string, options?: { type?: BubbleType; emotion?: EmotionType; duration?: number; replace?: boolean }) => {
      // SPLIT MESSAGE INTO WORD CHUNKS (3-5 words per bubble, like test-app)
      const words = message.split(' ');
      const chunks: string[] = [];
      let currentChunk = '';
      const WORDS_PER_BUBBLE = 4; // Average 4 words per bubble

      words.forEach((word, index) => {
        currentChunk += (currentChunk ? ' ' : '') + word;

        // Create chunk every WORDS_PER_BUBBLE words, or at end
        if ((index + 1) % WORDS_PER_BUBBLE === 0 || index === words.length - 1) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
      });

      console.log(`📝 Splitting message into ${chunks.length} bubbles:`, chunks);

      // Create bubbles sequentially with delays
      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          const bubbleId = `${character_id}-${Date.now()}-${index}`;
          const duration = 6000; // 6 seconds per bubble

          // Calculate comic book styling ONCE (not per render - prevents jitter)
          const bubble: ActiveBubble = {
            id: bubbleId,
            character_id,
            message: chunk,
            type: options?.type || 'speech',
            emotion: options?.emotion || 'neutral',
            sequence_number: index,
            // Comic book styling (same as test-app)
            rotate: (Math.random() - 0.5) * 6,
            scale: 0.95 + Math.random() * 0.1,
            borderRadius: `${18 + Math.random() * 6}px ${20 + Math.random() * 8}px ${16 + Math.random() * 6}px ${22 + Math.random() * 6}px`,
          };

          // Trigger talk animation only on first bubble
          if (index === 0) {
            setTalkTriggers(prev => {
              const next = new Map(prev);
              const current = next.get(character_id) || 0;
              next.set(character_id, current + 1);
              return next;
            });
          }

          // COMIC BOOK CHAINING: Add bubble to character's chain (append, not replace)
          const MAX_BUBBLES_PER_CHARACTER = 6; // Prevent overflow
          setActiveBubbles(prev => {
            const next = new Map(prev);
            const existingBubbles = next.get(character_id) || [];

            if (options?.replace && index === 0) {
              // Replace mode: clear all and add new one (only on first chunk)
              next.set(character_id, [bubble]);
            } else {
              // Chain mode: append to existing bubbles (comic book style)
              const newBubbles = [...existingBubbles, bubble];

              // Limit to max bubbles (remove oldest if over limit)
              if (newBubbles.length > MAX_BUBBLES_PER_CHARACTER) {
                newBubbles.shift(); // Remove oldest bubble
              }

              next.set(character_id, newBubbles);
            }

            return next;
          });

          setSpeakingCharacters(prev => new Set(prev).add(character_id));

          // Auto-remove bubble after duration
          setTimeout(() => {
            removeBubble(character_id, bubbleId);
          }, duration);
        }, index * 700); // 700ms delay between bubbles (like test-app)
      });
    },
    clear_all_bubbles: () => {
      setActiveBubbles(new Map());
      setSpeakingCharacters(new Set());
    },
    get_state: () => ({
      active_bubbles_count: Array.from(activeBubbles.values()).reduce((total, bubbles) => total + bubbles.length, 0),
      queue_length: 0 // ChatTheater3D doesn't queue bubbles
    })
  }));

  // Filter participants to only those with 3D models (context-aware)
  const participantsWithModels = participants.filter(p => {
    const path = getCharacter3DModelPath(p.character_name, context_type);
    console.log(`🔍 Checking model for ${p.character_name} (context: ${context_type}): ${path ? 'FOUND' : 'MISSING'} -> ${path}`);
    return path !== '';
  });

  console.log(`📊 Participants with models: ${participantsWithModels.length} / ${participants.length}`);

  // Position characters standing around the kitchen table in a circle
  const getCharacterPosition = (index: number, total: number): [number, number, number] => {
    const tableRadius = 8; // Distance from table center
    const angle = (index / total) * Math.PI * 2; // Evenly distribute around circle

    // Calculate X and Z positions around the table
    const x = Math.cos(angle) * tableRadius;
    const z = Math.sin(angle) * tableRadius + 6; // +6 moves circle forward towards camera

    // Y position at 1 (KitchenCharacter has -1 offset internally, so feet end up at y=0)
    return [x, 1, z];
  };

  // Get rotation - characters face toward camera (not straight inward)
  const getCharacterRotation = (index: number, total: number): [number, number, number] => {
    // Calculate angle for this character's position around the circle
    const angle = (index / total) * Math.PI * 2;

    // Rotate to face more toward camera (which is at [15, 15, 25])
    // Base rotation faces inward, then adjust by -45 degrees to angle toward camera
    const rotationAngle = angle + Math.PI - Math.PI / 4; // -45 deg adjustment

    return [0, rotationAngle, 0];
  };

  // Get per-character scale - adjusted based on feedback
  // NOTE: Metal foldout chair models are about 1.9 units tall at scale 1.0
  // Increased to 4.5 for better visibility (1.9 * 4.5 = 8.55 units tall)
  const getCharacterScale = (character_name: string): number => {
    const scaleMap: Record<string, number> = {
      'achilles': 4.5,     // Metal foldout chair model - good size for room
      'agent x': 4.5,      // Metal foldout chair model - good size for room
      'agent_x': 4.5,      // Metal foldout chair model - good size for room
      'merlin': 4.5,       // Metal foldout chair model - good size for room
      'karna': 4.5,        // Metal foldout chair model - good size for room
      'genghis khan': 4.5, // Metal foldout chair model - good size for room
      'genghis_khan': 4.5, // Metal foldout chair model - good size for room
      'space cyborg': 4.5, // Metal foldout chair model - good size for room
      'space_cyborg': 4.5, // Metal foldout chair model - good size for room
      'cleopatra': 4.5,    // Metal foldout chair model - good size for room
      'cleopatra vii': 4.5,// Metal foldout chair model - good size for room
      'dracula': 6.0,      // Old confessional model
      'robin hood': 6.0,   // Old confessional model
      'robin_hood': 6.0,   // Old confessional model
      'fenrir': 12.75,     // Giant mythological wolf - 1.5x size of humanoids (8.5 * 1.5)
    };

    const normalizedName = character_name?.toLowerCase()?.trim();
    return scaleMap[normalizedName] || 4.5; // Default to 4.5 for metal foldout chair models
  };

  return (
    <div className={`relative w-full h-full ${class_name}`}>
      {/* 3D Scene */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [15, 15, 25], fov: 65 }}
          shadows
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            {/* Camera setup - look at table center */}
            <CameraSetup />

            {/* Lighting - Kitchen atmosphere */}
            <ambientLight intensity={0.7} />
            <directionalLight
              position={[5, 10, 5]}
              intensity={0.8}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            {/* Context-specific lighting and environment */}
            {context_type === 'kitchen' ? (
              <>
                {/* Kitchen-specific warm lighting */}
                <pointLight position={[0, 4, 2]} intensity={0.4} color="#fff5e6" />
                <pointLight position={[-5, 4, 0]} intensity={0.3} color="#fff5e6" />

                {/* Kitchen Environment (background + floor) */}
                <KitchenEnvironment />

                {/* Kitchen Table */}
                <KitchenTable />
              </>
            ) : (
              <>
                {/* Confessional-specific softer lighting */}
                <pointLight position={[0, 8, 4]} intensity={0.3} color="#fff8e1" />
                <pointLight position={[-3, 5, 0]} intensity={0.2} color="#fff8e1" />

                {/* Spartan Apartment Environment */}
                <ConfessionalEnvironment />
              </>
            )}

            {/* Character models - using test-app architecture */}
            {participantsWithModels.map((participant, index) => {
              const model_path = getCharacter3DModelPath(participant.character_name, context_type);
              if (!model_path) {
                console.warn(`❌ No model path for character: ${participant.character_name}`);
                return null;
              }

              const position = getCharacterPosition(index, participantsWithModels.length);
              const rotation = getCharacterRotation(index, participantsWithModels.length);
              const characterScale = getCharacterScale(participant.character_name);
              const talkTrigger = talkTriggers.get(participant.character_id) || 0;

              return (
                <KitchenCharacter
                  key={participant.character_id}
                  modelPath={model_path}
                  position={position}
                  rotation={rotation}
                  scale={characterScale}
                  talkTrigger={talkTrigger}
                  onFaceMetrics={(metrics) => handleFaceMetrics(participant.character_id, metrics)}
                />
              );
            })}

            {/* Orbit controls - user can move around scene */}
            <OrbitControls
              target={[0, 1.5, 6]} // Look at table center (table top at y=1.5)
              enableDamping
              dampingFactor={0.05}
              minDistance={5}
              maxDistance={50}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay - Title */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
        <div className="font-semibold">🎭 3D Visual Theater</div>
      </div>

      {/* Character count indicator */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
        <div className="text-xs text-gray-300">
          {participantsWithModels.length} / {participants.length} characters loaded
        </div>
      </div>

      {/* Word Bubbles Overlay - Rendered outside Canvas (test-app style) */}
      {use_3d_bubbles && typeof window !== 'undefined' && participantsWithModels.map((participant) => {
        const bubbles = activeBubbles.get(participant.character_id) || [];
        if (bubbles.length === 0) return null;

        const metrics = faceMetrics.get(participant.character_id);
        if (!metrics) {
          console.log(`⏳ Waiting for face metrics for ${participant.character_id}...`);
          return null;
        }

        console.log(`🎈 Bubble render for ${participant.character_id}:`, {
          bubbleCount: bubbles.length,
          jawPosition: `${metrics.jawX.toFixed(1)}%, ${metrics.jawY.toFixed(1)}%`,
          faceHeight: `${metrics.faceHeight.toFixed(0)}px`,
          windowSize: `${window.innerWidth}x${window.innerHeight}`
        });

        // Get or create layout for this character
        let layout = characterLayouts.get(participant.character_id);
        if (!layout) {
          // Calculate obstacles (other characters)
          const obstacles: ObstaclePosition[] = [];
          faceMetrics.forEach((otherMetrics, charId) => {
            if (charId !== participant.character_id) {
              obstacles.push({ x: otherMetrics.jawX, y: otherMetrics.jawY });
            }
          });

          layout = selectBestLayout(
            metrics,
            obstacles,
            window.innerWidth,
            window.innerHeight
          );

          console.log(`🎯 Selected layout for ${participant.character_id}: ${layout}`, {
            obstacles: obstacles.map(o => `(${o.x.toFixed(0)}%, ${o.y.toFixed(0)}%)`),
            metrics: {
              jawX: `${metrics.jawX.toFixed(1)}%`,
              jawY: `${metrics.jawY.toFixed(1)}%`,
              faceHeight: `${metrics.faceHeight.toFixed(0)}px`
            }
          });

          setCharacterLayouts(prev => new Map(prev).set(participant.character_id, layout!));
        }

        // Calculate obstacles again for position calculation
        const obstacles: ObstaclePosition[] = [];
        faceMetrics.forEach((otherMetrics, charId) => {
          if (charId !== participant.character_id) {
            obstacles.push({ x: otherMetrics.jawX, y: otherMetrics.jawY });
          }
        });

        const positions = calculateBubblePositions(
          bubbles.length,
          layout,
          metrics,
          obstacles,
          window.innerWidth,
          window.innerHeight
        );

        console.log(`📍 Bubble positions for ${participant.character_id} (${layout}):`,
          positions.map((p, i) => `[${i}]: (${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px)`)
        );

        return bubbles.map((bubble, index) => {
          const pos = positions[index] || { x: 0, y: 0 };
          const isArc = layout.includes('arc');

          return (
            <div
              key={bubble.id}
              style={{
                position: 'absolute',
                left: `calc(${metrics.jawX}% + ${pos.x}px)`,
                top: `calc(${metrics.jawY}% + ${pos.y}px)`,
                transform: `translate(-50%, -100%) rotate(${bubble.rotate * 0.3}deg) scale(${bubble.scale})`,
                width: '120px', // Fixed width instead of min/max
                backgroundColor: 'white',
                padding: '8px 12px',
                borderRadius: bubble.borderRadius,
                border: '2px solid #222',
                boxShadow: '3px 3px 0px #222',
                zIndex: 50 + index,
                pointerEvents: 'none',
                fontFamily: '"Comic Sans MS", "Bangers", cursive, sans-serif',
                fontSize: '12px',
                fontWeight: 'bold',
                lineHeight: 1.2,
                textAlign: 'center',
                animation: 'bubblePopIn 0.3s ease-out forwards',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto',
              }}
            >
              {/* Speech tail - only on first bubble */}
              {index === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-18px',
                    left: isArc ? '70%' : '25px',
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '14px solid transparent',
                    borderTop: '22px solid white',
                    filter: 'drop-shadow(2px 2px 0px #222)',
                    transform: `rotate(${isArc ? -45 : -15}deg)`,
                  }}
                />
              )}
              {bubble.message}
            </div>
          );
        });
      })}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes bubblePopIn {
          from {
            opacity: 0;
            transform: translate(-50%, -100%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1);
          }
        }
      `}</style>
    </div>
  );
});

ChatTheater3D.displayName = 'ChatTheater3D';

export default ChatTheater3D;


