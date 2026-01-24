'use client';

import React, { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { AnimatePresence } from 'framer-motion';
import WordBubble from './WordBubble';
import {
  WordBubble as WordBubbleType,
  ChatContextType,
  BubbleQueueItem,
  WordBubbleConfig,
  CharacterPosition,
  BubbleType,
  EmotionType
} from '@/types/wordBubble';
import { getCharacterPositionManager, positionCharactersForChat } from '@/services/characterPositionManager';
import { getConversationLogger } from '@/services/conversationLogger';

interface WordBubbleSystemProps {
  context_type: ChatContextType;
  participants: Array<{
    character_id: string;
    character_name: string;
    character_avatar: string;
  }>;
  is_enabled: boolean;
  container_width?: number;
  container_height?: number;
  config?: Partial<WordBubbleConfig>;
  onBubbleInteraction?: (bubble: WordBubbleType, action: 'tap' | 'dismiss') => void;
  class_name?: string;
}

interface WordBubbleSystemState {
  active_bubbles_count: number;
  queue_length: number;
}

export interface WordBubbleSystemRef {
  add_bubble: (
    character_id: string,
    message: string,
    options?: {
      type?: BubbleType;
      emotion?: EmotionType;
      duration?: number;
      priority?: 'low' | 'medium' | 'high';
      replace?: boolean;
      position?: { x: number; y: number };
    }
  ) => void;
  clear_all_bubbles: () => void;
  get_state: () => WordBubbleSystemState;
}

const defaultConfig: WordBubbleConfig = {
  max_concurrent_bubbles: 1, // Sequential message ordering - one bubble at a time
  default_duration: 8000,
  fade_in_duration: 500,
  fade_out_duration: 300,
  enable_sound: false,
  enable_auto_scroll: true,
  bubble_spacing: 80,
  history_retention_days: 30
};

// Hook for using WordBubbleSystem functionality
export function useWordBubbleSystem(
  context_type: ChatContextType,
  participants: Array<{
    character_id: string;
    character_name: string;
    character_avatar: string;
  }>,
  config?: Partial<WordBubbleConfig>
) {
  const [activeBubbleCount, setActiveBubbleCount] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  const addMessage = useCallback((
    character_id: string,
    message: string,
    options?: {
      character_name?: string;
      character_avatar?: string;
      type?: BubbleType;
      emotion?: EmotionType;
      duration?: number;
      priority?: 'low' | 'medium' | 'high';
      metadata?: Record<string, string | number | boolean>;
    }
  ) => {
    // This will be implemented when we have a ref to the WordBubbleSystem
    console.log('Adding message:', { character_id, message, options });
  }, []);

  const clear_all_bubbles = useCallback(() => {
    console.log('Clearing all bubbles');
  }, []);

  return {
    addMessage,
    clear_all_bubbles,
    activeBubbleCount,
    containerSize,
    bubble_system_props: {
      context_type,
      participants,
      is_enabled: true,
      config,
      container_width: containerSize.width,
      container_height: containerSize.height
    }
  };
}

const WordBubbleSystem = forwardRef<WordBubbleSystemRef, WordBubbleSystemProps>(({
  context_type,
  participants,
  is_enabled,
  container_width = 800,
  container_height = 600,
  config = {},
  onBubbleInteraction,
  class_name = ''
}, ref) => {
  const [activeBubbles, setActiveBubbles] = useState<WordBubbleType[]>([]);
  const [bubbleQueue, setBubbleQueue] = useState<BubbleQueueItem[]>([]);
  const [characterPositions, setCharacterPositions] = useState<CharacterPosition[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const finalConfig = { ...defaultConfig, ...config };
  const positionManager = useRef(getCharacterPositionManager());
  const conversationLogger = useRef(getConversationLogger());
  const processQueueTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to position changes
  useEffect(() => {
    const unsubscribe = positionManager.current.subscribe(setCharacterPositions);
    return unsubscribe;
  }, []);

  // Initialize conversation session when participants change
  useEffect(() => {
    if (participants.length > 0 && is_enabled) {
      // End any existing conversation
      if (conversationId) {
        conversationLogger.current.endConversation(context_type);
      }

      // Position characters for this context
      const character_ids = participants.map(p => p.character_id);
      positionCharactersForChat(context_type, character_ids);

      // Start new conversation session
      const newConversationId = conversationLogger.current.startConversation(
        context_type,
        participants
      );
      setConversationId(newConversationId);

      console.log(`🎭 WordBubbleSystem initialized for ${context_type} with ${participants.length} participants`);
    }

    return () => {
      // Cleanup when component unmounts or context changes
      if (conversationId) {
        conversationLogger.current.endConversation(context_type);
      }
    };
  }, [participants, context_type, is_enabled]);

  // Process bubble queue
  const processQueue = useCallback(() => {
    if (bubbleQueue.length === 0 || activeBubbles.length >= finalConfig.max_concurrent_bubbles) {
      return;
    }

    const nextItem = bubbleQueue[0];
    setBubbleQueue(prev => prev.slice(1));

    // Position MUST be provided via override_position - NO FALLBACKS
    const basePosition = nextItem.bubble.metadata?.override_position as { x: number, y: number } | undefined;

    if (!basePosition) {
      console.warn(`❌ Cannot display bubble for ${nextItem.bubble.character_id} - no position provided. NO FALLBACKS.`);
      return;
    }

    const bubble: WordBubbleType = {
      ...nextItem.bubble,
      id: `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      is_visible: true,
      animation_state: 'entering',
      duration: nextItem.bubble.duration || finalConfig.default_duration,
      position: {
        x: basePosition.x,
        y: basePosition.y
      }
    };

    // SMART SPOUT POSITIONING - Your idea implemented!
    // Spout position based on available space and optimal pointing
    const getSmartSpoutPosition = (character_id: string, bubble_pos: { x: number, y: number }): { position: string; anchor_point: 'bottom' | 'top' | 'left' | 'right' } => {
      const spoutConfigs: Record<string, { position: string; anchor_point: 'bottom' | 'top' | 'left' | 'right' }> = {
        'einstein': {
          position: 'bottom-right',  // Bubble at B1-B2, spout points down-right to Einstein at D1
          anchor_point: 'bottom'
        },
        'achilles': {
          position: 'bottom-left',   // Bubble at A5-A6, spout at bottom-left pointing to Achilles at B4
          anchor_point: 'bottom'
        },
        'julius_caesar': {
          position: 'bottom-left',   // Bubble at A8-A9, spout at bottom-left pointing to Julius at C7
          anchor_point: 'bottom'
        },
        'joan_of_arc': {
          position: 'bottom-center', // Bubble at G6, spout at bottom-center pointing to Joan at H6
          anchor_point: 'bottom'
        },
        'dracula': {
          position: 'bottom-right',  // Bubble at F2, spout at bottom-right pointing to Dracula at H2
          anchor_point: 'bottom'
        }
      };

      // Return config if exists, otherwise null - NO FALLBACKS
      return spoutConfigs[character_id] || null;
    };

    const spoutConfig = getSmartSpoutPosition(bubble.character_id, bubble.position);
    if (spoutConfig) {
      bubble.anchor_point = spoutConfig.anchor_point;
    }
    // If no spout config, anchor_point stays as default from bubble_data
    // Note: spout_position removed as it's not part of WordBubble interface

    // Special debugging for Joan's liberation
    if (bubble.character_id === 'joan_of_arc') {
      console.log(`🛡️ JOAN DEBUG: Expected F6 (65%, 55%) -> Got ${bubble.position.x.toFixed(1)}%, ${bubble.position.y.toFixed(1)}%`);
      console.log(`🛡️ JOAN DEBUG: Base position was ${basePosition.x}%, ${basePosition.y}%`);
    } else {
      console.log(`Positioning bubble for ${bubble.character_id} at ${bubble.position.x.toFixed(1)}%, ${bubble.position.y.toFixed(1)}%`);
    }

    // Add to active bubbles
    setActiveBubbles(prev => [...prev, bubble]);

    // Log to conversation history
    conversationLogger.current.logMessage(bubble);

    // Execute callback if provided
    nextItem.callback?.();

    // Schedule next queue processing
    if (bubbleQueue.length > 1) {
      processQueueTimeoutRef.current = setTimeout(processQueue, 500);
    }
  }, [bubbleQueue, activeBubbles, characterPositions, finalConfig, conversationId]);

  // Process queue when it changes
  useEffect(() => {
    if (bubbleQueue.length > 0 && activeBubbles.length < finalConfig.max_concurrent_bubbles) {
      const delay = bubbleQueue[0].delay || 0;
      processQueueTimeoutRef.current = setTimeout(processQueue, delay);
    }

    return () => {
      if (processQueueTimeoutRef.current) {
        clearTimeout(processQueueTimeoutRef.current);
      }
    };
  }, [bubbleQueue, processQueue]);

  // Get bubble offset for a character (stacking bubbles vertically for same character)
  const getBubbleOffset = useCallback((
    character_id: string,
    existing_bubbles: WordBubbleType[]
  ): { x: number; y: number } => {
    const sameCharacterBubbles = existing_bubbles.filter(b => b.character_id === character_id);
    const bubbleIndex = sameCharacterBubbles.length;

    // Stack bubbles vertically above the character, with alternating horizontal offset
    return {
      x: (bubbleIndex % 2) * 15 - 7.5, // Alternate left/right with more spacing
      y: -(bubbleIndex * 15) // Stack vertically with more spacing
    };
  }, []);

  // Helper function to convert grid coordinates (like "B4") to percentages
  const gridToPercentage = useCallback((gridCoord: string): { x: number; y: number } => {
    const letter = gridCoord.charAt(0);
    const number = parseInt(gridCoord.slice(1));

    const row = letter.charCodeAt(0) - 65; // A=0, B=1, etc.
    const col = number; // 0, 1, 2, etc.

    return {
      x: col * 10,
      y: row * 10
    };
  }, []);

  // NO FALLBACK POSITIONS - bubbles require explicit position from jaw tracking

  // Public API: Add bubble to queue
  const addBubble = useCallback((
    bubble_data: Omit<WordBubbleType, 'id' | 'timestamp' | 'is_visible' | 'animation_state' | 'position'>,
    delay?: number,
    callback?: () => void
  ) => {
    if (!is_enabled) {
      console.warn('WordBubbleSystem is disabled, ignoring bubble');
      return;
    }

    const queueItem: BubbleQueueItem = {
      bubble: bubble_data,
      delay,
      callback
    };

    setBubbleQueue(prev => [...prev, queueItem]);
  }, [is_enabled]);

  // Handle bubble dismissal
  const handleBubbleDismiss = useCallback((bubbleId: string) => {
    setActiveBubbles(prev => prev.filter(b => b.id !== bubbleId));

    const dismissedBubble = activeBubbles.find(b => b.id === bubbleId);
    if (dismissedBubble) {
      onBubbleInteraction?.(dismissedBubble, 'dismiss');
    }
  }, [activeBubbles, onBubbleInteraction]);

  // Handle bubble tap
  const handleBubbleTap = useCallback((bubble: WordBubbleType) => {
    onBubbleInteraction?.(bubble, 'tap');
  }, [onBubbleInteraction]);

  // Public API: Clear all bubbles
  const clear_all_bubbles = useCallback(() => {
    setActiveBubbles([]);
    setBubbleQueue([]);
  }, []);

  // Public API: Get current state
  const get_state = useCallback((): WordBubbleSystemState => ({
    active_bubbles_count: activeBubbles.length,
    queue_length: bubbleQueue.length
  }), [activeBubbles.length, bubbleQueue.length]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    add_bubble: (character_id: string, message: string, options: {
      type?: BubbleType;
      emotion?: EmotionType;
      duration?: number;
      priority?: 'low' | 'medium' | 'high';
      position?: { x: number; y: number };
    } = {}) => {
      const character = participants.find(p => p.character_id === character_id);
      if (!character) {
        console.warn(`Character ${character_id} not found in participants`);
        return;
      }

      const bubble_data: Omit<WordBubbleType, 'id' | 'timestamp' | 'is_visible' | 'animation_state' | 'position'> = {
        message,
        character_id,
        character_name: character.character_name,
        character_avatar: character.character_avatar,
        type: options.type || 'speech',
        emotion: options.emotion || 'neutral',
        duration: options.duration || finalConfig.default_duration,
        priority: options.priority || 'medium',
        chat_context: context_type,
        anchor_point: 'bottom',
        metadata: {
          override_position: options.position
        }
      };

      addBubble(bubble_data);
    },
    clear_all_bubbles,
    get_state
  }), [participants, context_type, finalConfig, addBubble, clear_all_bubbles, get_state]);

  if (!is_enabled) {
    return null;
  }

  return (
    <div
      className={`relative overflow-visible ${class_name}`}
      style={{ width: container_width, height: container_height, minHeight: '600px' }}
    >

      {/* Active word bubbles - AnimatePresence disabled for debugging */}
      <div>
        {activeBubbles.map(bubble => (
          <div key={bubble.id}>

            {/* PROPER SPEECH BUBBLE - Direct render with smart spout */}
            <div
              className="absolute z-50"
              style={{
                left: `${bubble.position.x}%`,
                top: `${bubble.position.y}%`,
                transform: 'translate(-50%, 0%)'
              }}
            >
              <div className="bg-white border-2 border-gray-300 rounded-xl px-4 py-3 shadow-lg relative" style={{ maxWidth: '280px', minWidth: '150px' }}>
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  {bubble.character_name}
                </div>
                <p className="text-sm text-gray-800">
                  {bubble.message}
                </p>
                {/* Smart spout positioning - pointing UP to characters above */}
                {bubble.character_id === 'merlin' && (
                  /* Spout pointing up-left to Merlin */
                  <div className="absolute bottom-full left-6 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-l-transparent border-r-transparent border-b-white"></div>
                )}
                {bubble.character_id === 'achilles' && (
                  /* Spout pointing DOWN to Achilles (bubble above head) */
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-white"></div>
                )}
                {bubble.character_id === 'cleopatra' && (
                  /* Spout pointing up-right to Cleopatra */
                  <div className="absolute bottom-full right-6 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-l-transparent border-r-transparent border-b-white"></div>
                )}
                {bubble.character_id === 'joan' && (
                  /* Spout pointing up to Joan */
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-l-transparent border-r-transparent border-b-white"></div>
                )}
                {bubble.character_id === 'dracula' && (
                  /* Spout pointing up-right to Dracula */
                  <div className="absolute bottom-full right-6 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-l-transparent border-r-transparent border-b-white"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded pointer-events-none">
          <div>Context: {context_type}</div>
          <div>Active: {activeBubbles.length}/{finalConfig.max_concurrent_bubbles}</div>
          <div>Queued: {bubbleQueue.length}</div>
          <div>Positions: {characterPositions.filter(p => p.zone === context_type).length}</div>
        </div>
      )}
    </div>
  );
});

WordBubbleSystem.displayName = 'WordBubbleSystem';

export default WordBubbleSystem;
