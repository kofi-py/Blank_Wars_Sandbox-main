import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { ChatContextType } from '@/types/wordBubble';
import { getBubbleMessageRouter } from '@/services/bubbleMessageRouter';
import { useWordBubbleSystem, WordBubbleSystemRef } from '@/components/WordBubbleSystem';

interface BubbleIntegrationConfig {
  context_type: ChatContextType;
  participants: Array<{
    character_id: string;
    character_name: string;
    character_avatar: string;
  }>;
  socket?: Socket;
  container_ref: React.RefObject<HTMLElement>;
  enabled?: boolean;
  enable_bubbles?: boolean;
  fallback_to_traditional_chat?: boolean;
}

export function useWordBubbleIntegration({
  context_type,
  participants,
  socket,
  container_ref,
  enabled,
  fallback_to_traditional_chat
}: BubbleIntegrationConfig) {
  const [isBubbleMode, setIsBubbleMode] = useState(enabled);
  const [container_dimensions, set_container_dimensions] = useState({ width: 800, height: 600 });
  const bubbleRouter = useRef(getBubbleMessageRouter());

  const bubbleSystemRef = useRef<WordBubbleSystemRef>(null);

  // Initialize bubble system (we just keep this for the props mostly, 
  // but importantly we need the ref to control it)
  const bubbleSystem = useWordBubbleSystem(
    context_type,
    participants,
    {
      max_concurrent_bubbles: context_type === 'kitchen' ? 6 : 5,
      default_duration: context_type === 'battle' ? 4000 : 5000
    }
  );

  // Initialize socket routing
  useEffect(() => {
    if (socket && isBubbleMode) {
      bubbleRouter.current.initialize(socket);
      bubbleRouter.current.setBubbleEnabled(context_type, true);
    }

    return () => {
      if (socket) {
        bubbleRouter.current.setBubbleEnabled(context_type, false);
      }
    };
  }, [socket, isBubbleMode, context_type]);

  // Subscribe to routed messages
  useEffect(() => {
    if (!isBubbleMode) return;

    const unsubscribe = bubbleRouter.current.subscribe(context_type, (messageData) => {
      const unsubscribe = bubbleRouter.current.subscribe(context_type, (messageData) => {
        // Use the ref to add the bubble directly to the imperatively handled component
        if (bubbleSystemRef.current) {
          bubbleSystemRef.current.add_bubble(
            messageData.character_id,
            messageData.message,
            {
              type: messageData.type,
              emotion: messageData.emotion,
              priority: messageData.priority,
              duration: messageData.duration
              // metadata not currently supported in add_bubble signature, can be added if needed
            }
          );
        } else {
          // Fallback to internal hook state if ref not bound (unlikely)
          bubbleSystem.addMessage(
            messageData.character_id,
            messageData.message,
            {
              type: messageData.type,
              emotion: messageData.emotion,
              priority: messageData.priority,
              duration: messageData.duration,
              metadata: messageData.metadata
            }
          );
        }
      });
    });

    return unsubscribe;
  }, [isBubbleMode, context_type, bubbleSystem]);

  // Update container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (container_ref.current) {
        const rect = container_ref.current.getBoundingClientRect();
        set_container_dimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (container_ref.current) {
      resizeObserver.observe(container_ref.current);
    }

    return () => resizeObserver.disconnect();
  }, [container_ref]);

  // Toggle between bubble and traditional chat
  const toggleChatMode = () => {
    setIsBubbleMode(prev => {
      const newMode = !prev;
      bubbleRouter.current.setBubbleEnabled(context_type, newMode);

      if (!newMode) {
        // Clear bubbles when switching to traditional
        bubbleSystem.clear_all_bubbles();
      }

      console.log(`🔄 Chat mode switched to: ${newMode ? 'bubbles' : 'traditional'}`);
      return newMode;
    });
  };

  // Manually add a bubble (for user messages)
  const addUserMessage = (message: string, character_id: string = 'user') => {
    if (!isBubbleMode) return;

    const participant = participants.find(p => p.character_id === character_id) || {
      character_id: 'user',
      character_name: 'You',
      character_avatar: '👤'
    };

    bubbleSystem.addMessage(
      participant.character_id,
      message,
      {
        type: 'speech',
        emotion: 'neutral',
        priority: 'medium'
      }
    );
  };

  // Get current bubble system state
  const getBubbleState = () => {
    return {
      isBubbleMode,
      active_bubble_count: bubbleSystem.activeBubbleCount,
      container_dimensions
    };
  };

  // Test bubble functionality
  const testBubble = (character_id?: string, message?: string) => {
    const testCharacterId = character_id || participants[0]?.character_id || 'test';
    const testMessage = message || 'Test bubble message!';

    if (isBubbleMode) {
      bubbleSystem.addMessage(testCharacterId, testMessage, {
        type: 'speech',
        emotion: 'happy',
        priority: 'high'
      });
    } else {
      bubbleRouter.current.sendTestMessage(context_type, testCharacterId, testMessage);
    }
  };

  return {
    // Bubble system
    isBubbleMode,
    setIsBubbleMode,
    toggleChatMode,
    container_dimensions,

    // Bubble controls
    add_message: bubbleSystem.addMessage,
    addUserMessage,
    clear_all_bubbles: bubbleSystem.clear_all_bubbles,
    getBubbleState,
    testBubble,

    // Integration status
    can_use_bubbles: participants.length > 0 && !!socket,

    // For WordBubbleSystem component
    bubble_system_ref: bubbleSystemRef,
    bubble_system_props: {
      context_type,
      participants,
      is_enabled: isBubbleMode,
      container_width: container_dimensions.width,
      container_height: container_dimensions.height,
      onBubbleInteraction: (bubble: any, action: string) => {
        console.log(`Bubble ${action}:`, bubble);
      }
    }
  };
}

// Helper hook for specific chat contexts
export function useKitchenBubbles(
  participants: Array<{ character_id: string; character_name: string; character_avatar: string }>,
  socket?: Socket,
  container_ref?: React.RefObject<HTMLElement>
) {
  const defaultRef = useRef<HTMLDivElement>(null);
  return useWordBubbleIntegration({
    context_type: 'kitchen',
    participants,
    socket,
    container_ref: container_ref || defaultRef,
    enable_bubbles: true
  });
}

export function useBattleBubbles(
  participants: Array<{ character_id: string; character_name: string; character_avatar: string }>,
  socket?: Socket,
  container_ref?: React.RefObject<HTMLElement>
) {
  const defaultRef = useRef<HTMLDivElement>(null);
  return useWordBubbleIntegration({
    context_type: 'battle',
    participants,
    socket,
    container_ref: container_ref || defaultRef,
    enable_bubbles: true
  });
}

export function useCoachingBubbles(
  coaching_type: 'performance' | 'equipment' | 'skill' | 'personal' | 'financial',
  participants: Array<{ character_id: string; character_name: string; character_avatar: string }>,
  socket?: Socket,
  container_ref?: React.RefObject<HTMLElement>
) {
  const defaultRef = useRef<HTMLDivElement>(null);
  return useWordBubbleIntegration({
    context_type: `coaching_${coaching_type}` as ChatContextType,
    participants,
    socket,
    container_ref: container_ref || defaultRef,
    enable_bubbles: true
  });
}