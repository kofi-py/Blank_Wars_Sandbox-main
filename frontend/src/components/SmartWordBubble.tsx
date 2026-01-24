'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Bubble {
  id: number;
  message: string;
  character_id: string;
  rotate: number;
  scale: number;
  borderRadius: string;
}

type LayoutType =
  | 'stack-right'
  | 'stack-left'
  | 'horizontal-right'
  | 'horizontal-left'
  | 'arc-over'
  | 'arc-left'
  | 'diagonal-up-right'
  | 'diagonal-up-left'
  | 'L-right-up'
  | 'L-up-right'
  | 'zigzag'
  | 'staircase';

export interface JawPosition {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface SmartWordBubbleRef {
  showMessage: (character_id: string, message: string, duration?: number) => void;
  clearBubbles: () => void;
  updateJawPosition: (character_id: string, position: JawPosition) => void;
}

interface SmartWordBubbleProps {
  /** Map of character_id to their jaw screen position (percentage) */
  jawPositions?: Map<string, JawPosition>;
  /** Callback when all bubbles for a message are done */
  onMessageComplete?: (character_id: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BUBBLE_WIDTH = 140;
const BUBBLE_HEIGHT = 50;

// ============================================================================
// COMPONENT
// ============================================================================

const SmartWordBubble = forwardRef<SmartWordBubbleRef, SmartWordBubbleProps>(({
  jawPositions: externalJawPositions,
  onMessageComplete
}, ref) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [lockedLayout, setLockedLayout] = useState<LayoutType | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [internalJawPositions, setInternalJawPositions] = useState<Map<string, JawPosition>>(new Map());

  const bubbleIdRef = useRef(0);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Merge external and internal jaw positions
  const jawPositions = useMemo(() => {
    const merged = new Map(internalJawPositions);
    if (externalJawPositions) {
      externalJawPositions.forEach((pos, id) => merged.set(id, pos));
    }
    return merged;
  }, [externalJawPositions, internalJawPositions]);

  // Get current speaker's jaw position - NO FALLBACKS
  const speakerJawPos = useMemo(() => {
    if (!currentSpeaker) return null;
    return jawPositions.get(currentSpeaker) || null;
  }, [currentSpeaker, jawPositions]);

  // Get positions of other characters for obstacle detection
  const getObstaclePositions = useCallback((): JawPosition[] => {
    if (!currentSpeaker) return [];
    const obstacles: JawPosition[] = [];
    jawPositions.forEach((pos, id) => {
      if (id !== currentSpeaker) {
        obstacles.push(pos);
      }
    });
    return obstacles;
  }, [currentSpeaker, jawPositions]);

  // Select best layout based on available space and obstacles
  const selectBestLayout = useCallback((): LayoutType | null => {
    // No jaw position = can't calculate layout
    if (!speakerJawPos) return null;

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const jawPixelX = (speakerJawPos.x / 100) * screenWidth;
    const jawPixelY = (speakerJawPos.y / 100) * screenHeight;

    const spaceRight = screenWidth - jawPixelX - 50;
    const spaceLeft = jawPixelX - 50;
    const spaceUp = jawPixelY - 80;

    // Obstacle detection - check all other characters
    const obstacles = getObstaclePositions();
    let obstacleOnRight = false;
    let obstacleOnLeft = false;

    obstacles.forEach(obs => {
      const obsPixelX = (obs.x / 100) * screenWidth;
      const distance = obsPixelX - jawPixelX;
      if (distance > 0 && distance < 400) obstacleOnRight = true;
      if (distance < 0 && distance > -400) obstacleOnLeft = true;
    });

    // Build list of valid layouts
    const validLayouts: LayoutType[] = [];

    // Vertical layouts (need space above)
    if (spaceUp > 120) {
      validLayouts.push('stack-right');
      if (!obstacleOnLeft && spaceLeft > 100) validLayouts.push('stack-left');
    }

    // Right-side layouts
    if (!obstacleOnRight) {
      if (spaceRight > 350) validLayouts.push('horizontal-right');
      if (spaceRight > 250 && spaceUp > 100) validLayouts.push('diagonal-up-right');
      if (spaceRight > 200 && spaceUp > 100) {
        validLayouts.push('L-right-up');
        validLayouts.push('L-up-right');
      }
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

    // Zigzag works in tight spaces
    if (spaceUp > 100) validLayouts.push('zigzag');

    // Fallback
    if (validLayouts.length === 0) {
      validLayouts.push('stack-right');
    }

    // Randomly pick for variety
    return validLayouts[Math.floor(Math.random() * validLayouts.length)];
  }, [speakerJawPos, getObstaclePositions]);

  // Split text into sentence bubbles
  const splitIntoSentences = (text: string): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  };

  // Show a message for a character
  const showMessage = useCallback((character_id: string, message: string, duration = 8000) => {
    // Clear any existing timeouts
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    setBubbles([]);
    bubbleIdRef.current = 0;

    // Set speaker and lock layout
    setCurrentSpeaker(character_id);
    const newLayout = selectBestLayout();

    // No jaw position = no bubbles. Period.
    if (!newLayout) {
      console.warn(`❌ Cannot show message for ${character_id} - no jaw position available`);
      return;
    }

    setLockedLayout(newLayout);

    // Split message into sentences
    const sentences = splitIntoSentences(message);

    // Add each sentence as a bubble with staggered timing
    sentences.forEach((sentence, index) => {
      const timeout = setTimeout(() => {
        setBubbles(prev => [...prev, {
          id: bubbleIdRef.current++,
          message: sentence,
          character_id,
          rotate: (Math.random() - 0.5) * 6,
          scale: 0.95 + Math.random() * 0.1,
          borderRadius: `${18 + Math.random() * 6}px ${20 + Math.random() * 8}px ${16 + Math.random() * 6}px ${22 + Math.random() * 6}px`,
        }]);
      }, index * 800); // 800ms between bubbles
      timeoutsRef.current.push(timeout);
    });

    // Clear bubbles after duration
    const clearDelay = sentences.length * 800 + duration;
    const clearTimeout_ = setTimeout(() => {
      setBubbles([]);
      setLockedLayout(null);
      setCurrentSpeaker(null);
      onMessageComplete?.(character_id);
    }, clearDelay);
    timeoutsRef.current.push(clearTimeout_);
  }, [selectBestLayout, onMessageComplete]);

  // Clear all bubbles immediately
  const clearBubbles = useCallback(() => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    setBubbles([]);
    setLockedLayout(null);
    setCurrentSpeaker(null);
  }, []);

  // Update jaw position for a character
  const updateJawPosition = useCallback((character_id: string, position: JawPosition) => {
    setInternalJawPositions(prev => new Map(prev).set(character_id, position));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    showMessage,
    clearBubbles,
    updateJawPosition
  }), [showMessage, clearBubbles, updateJawPosition]);

  // Calculate bubble positions based on layout
  const positions = useMemo(() => {
    const layout = lockedLayout || 'stack-right';
    const posArray: Array<{ x: number; y: number }> = [];

    bubbles.forEach((_, index) => {
      let x = 0, y = 0;

      switch (layout) {
        case 'stack-right':
          x = 60;
          y = -(index * (BUBBLE_HEIGHT + 8));
          break;

        case 'stack-left':
          x = -60;
          y = -(index * (BUBBLE_HEIGHT + 8));
          break;

        case 'horizontal-right':
          x = index * BUBBLE_WIDTH;
          y = -20;
          break;

        case 'horizontal-left':
          x = -(index * BUBBLE_WIDTH);
          y = -20;
          break;

        case 'arc-over': {
          const arcSpacing = BUBBLE_WIDTH + 10;
          const arcHeight = 60;
          const centerX = ((bubbles.length - 1) / 2) * arcSpacing;
          x = (index * arcSpacing) - centerX;
          const arcProgress = index / Math.max(bubbles.length - 1, 1);
          y = -arcHeight * Math.sin(arcProgress * Math.PI) - 60;
          break;
        }

        case 'arc-left': {
          x = -(index * (BUBBLE_WIDTH * 0.8)) - 50;
          const leftArcProg = index / Math.max(bubbles.length - 1, 1);
          y = -50 * Math.sin(leftArcProg * Math.PI) - (index * 25) - 40;
          break;
        }

        case 'diagonal-up-right':
          x = index * BUBBLE_WIDTH;
          y = -(index * (BUBBLE_HEIGHT + 12));
          break;

        case 'diagonal-up-left':
          x = -(index * BUBBLE_WIDTH);
          y = -(index * (BUBBLE_HEIGHT + 12));
          break;

        case 'L-right-up':
          if (index < 2) {
            x = index * BUBBLE_WIDTH;
            y = -20;
          } else {
            x = BUBBLE_WIDTH;
            y = -20 - ((index - 1) * (BUBBLE_HEIGHT + 8));
          }
          break;

        case 'L-up-right':
          if (index < 2) {
            x = 60;
            y = -(index * (BUBBLE_HEIGHT + 8));
          } else {
            x = 60 + ((index - 1) * BUBBLE_WIDTH);
            y = -(BUBBLE_HEIGHT + 8);
          }
          break;

        case 'zigzag':
          x = (index % 2 === 0) ? 50 : -50;
          y = -(index * (BUBBLE_HEIGHT + 12));
          break;

        case 'staircase':
          x = index * (BUBBLE_WIDTH * 0.6);
          y = -(index * (BUBBLE_HEIGHT + 8));
          break;
      }

      posArray.push({ x, y });
    });

    return posArray;
  }, [bubbles, lockedLayout]);

  // Don't render if no bubbles OR no jaw position - NO FALLBACKS
  if (bubbles.length === 0 || !speakerJawPos) {
    if (bubbles.length > 0 && !speakerJawPos) {
      console.warn(`❌ Cannot render bubbles - no jaw position for speaker`);
    }
    return null;
  }

  const isArcLayout = lockedLayout?.includes('arc');

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 100 }}
    >
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

      {/* Render bubbles */}
      {bubbles.map((bubble, index) => {
        const pos = positions[index] || { x: 0, y: 0 };
        const tailRotation = isArcLayout && index === 0 ? -45 : -15;
        const tailLeft = isArcLayout && index === 0 ? '70%' : '25px';

        return (
          <div
            key={bubble.id}
            style={{
              position: 'absolute',
              left: `calc(${speakerJawPos.x}% + ${pos.x}px)`,
              top: `calc(${speakerJawPos.y - 8}% + ${pos.y}px)`,
              transform: `translate(-50%, -100%) rotate(${bubble.rotate * 0.3}deg) scale(${bubble.scale})`,
              minWidth: '100px',
              maxWidth: '180px',
              backgroundColor: 'white',
              padding: '12px 16px',
              borderRadius: bubble.borderRadius,
              border: '3px solid #222',
              boxShadow: '4px 4px 0px #222',
              zIndex: 100 + index,
              fontFamily: '"Comic Sans MS", "Bangers", cursive, sans-serif',
              fontSize: '14px',
              fontWeight: 'bold',
              lineHeight: 1.3,
              textAlign: 'center',
              animation: 'bubblePopIn 0.3s ease-out forwards',
            }}
          >
            {/* Speech tail - only on first bubble */}
            {index === 0 && (
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                left: tailLeft,
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '16px solid transparent',
                borderTop: '24px solid white',
                filter: 'drop-shadow(3px 3px 0px #222)',
                transform: `rotate(${tailRotation}deg)`
              }} />
            )}
            {bubble.message}
          </div>
        );
      })}

      {/* Debug: Show jaw position marker */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          left: `${speakerJawPos.x}%`,
          top: `${speakerJawPos.y}%`,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'lime',
          border: '2px solid white',
          transform: 'translate(-50%, -50%)',
          zIndex: 200,
        }} />
      )}
    </div>
  );
});

SmartWordBubble.displayName = 'SmartWordBubble';

export default SmartWordBubble;
