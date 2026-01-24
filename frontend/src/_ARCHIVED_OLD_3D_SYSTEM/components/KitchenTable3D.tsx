'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { WordBubbleSystemRef } from './WordBubbleSystem';
import { kitchenChatService, KitchenConversation } from '../services/kitchenChatService';
import { Contestant } from '@blankwars/types';

interface KitchenMessage {
  conversationId?: string;
  character_id?: string;
  speaker?: string;
  timestamp?: string;
  message?: string;
  is_complaint?: boolean;
}

/**
 * Split long text into comic-book style chunks (1 sentence per bubble)
 * Following comic book best practices for readability
 */
function splitIntoSpeechBubbles(text: string): string[] {
  // Split by sentence-ending punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // Each sentence gets its own bubble for maximum readability
  const bubbles: string[] = sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return bubbles.length > 0 ? bubbles : [text];
}

// Dynamically import 3D component (client-side only)
const ChatTheater3D = dynamic(() => import('./ChatTheater3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg">Loading 3D Kitchen Table...</p>
      </div>
    </div>
  )
});

interface KitchenTable3DProps {
  characters: Contestant[];
  conversations: KitchenConversation[];
  onMessage?: (character_id: string, message: string) => void;
  class_name?: string;
}

/**
 * 3D Kitchen Table Chat
 * Displays user's characters around a kitchen table in 3D with comic book speech bubbles
 * Integrates with kitchenChatService for real-time AI conversations
 */
export default function KitchenTable3D({ characters, conversations, onMessage, class_name = '' }: KitchenTable3DProps) {
  const bubbleSystemRef = useRef<WordBubbleSystemRef>(null);
  const [isConnected, setIsConnected] = useState(false);
  const previousConversationsRef = useRef<KitchenConversation[]>([]);
  const processedMessageIds = useRef<Set<string>>(new Set()); // Track processed messages to prevent duplicates

  // Transform Character[] to the format ChatTheater3D expects
  const participants = characters.map(char => ({
    character_id: char.character_id,
    character_name: char.name,
    character_avatar: char.avatar || ''
  }));

  // Watch for new conversations and display as 3D bubbles
  useEffect(() => {
    if (!bubbleSystemRef.current) return;

    // Find new conversations
    const previousIds = new Set(previousConversationsRef.current.map(c => c.id));
    const newConversations = conversations.filter(c => !previousIds.has(c.id));

    // Display each new conversation as a 3D bubble
    newConversations.forEach(convo => {
      const character = characters.find(c =>
        c.name.toLowerCase() === convo.speaker.toLowerCase() ||
        c.id === convo.speaker.toLowerCase()
      );

      if (character) {
        // Split long text into comic-book style bubbles (max 2 sentences each)
        const bubbleChunks = splitIntoSpeechBubbles(convo.message);

        // Add each bubble with a slight delay between them for reading flow
        bubbleChunks.forEach((chunk, i) => {
          setTimeout(() => {
            bubbleSystemRef.current?.add_bubble(
              character.id,
              chunk,
              {
                type: convo.is_complaint ? 'shout' : 'speech',
                emotion: convo.is_complaint ? 'angry' : 'neutral',
                duration: 30000 // 30 seconds - longer duration for readability
              }
            );
          }, i * 1500); // Stagger by 1.5 seconds per bubble
        });
      }
    });

    previousConversationsRef.current = conversations;
  }, [conversations, characters]);

  // Set up socket connection and message listening
  useEffect(() => {
    const setupKitchenChat = async () => {
      try {
        // Wait for socket connection
        const connected = await kitchenChatService.waitForConnection();
        setIsConnected(connected);

        if (!connected) {
          console.warn('Could not establish socket connection for kitchen chat');
          return;
        }

        // Listen for kitchen chat messages
        const socket = kitchenChatService.getSocket();

        const handleKitchenMessage = (data: unknown) => {
          console.log('🍳 Kitchen message received:', data);

          const message = data as KitchenMessage;
          // Create unique message ID to prevent duplicates (backend may emit on multiple events)
          const messageId = message.conversationId || `${message.character_id}_${message.timestamp}_${message.message?.substring(0, 20) || ''}`;

          // Skip if we've already processed this message
          if (processedMessageIds.current.has(messageId)) {
            console.log('⏭️ Skipping duplicate message:', messageId);
            return;
          }
          processedMessageIds.current.add(messageId);

          // Cleanup old message IDs to prevent memory leak (keep last 100)
          if (processedMessageIds.current.size > 100) {
            const idsArray = Array.from(processedMessageIds.current);
            processedMessageIds.current = new Set(idsArray.slice(-100));
          }

          // Handle both speaker and character_id fields
          const speaker_identifier = message.character_id || message.speaker;

          if (speaker_identifier && message.message) {
            // Find the character by canonical character_id (e.g., "dracula") or name
            const character = characters.find(c =>
              c.character_id === speaker_identifier ||
              c.character_id === speaker_identifier.toLowerCase() ||
              c.name.toLowerCase() === speaker_identifier.toLowerCase()
            );

            if (character && bubbleSystemRef.current) {
              // Split long text into comic-book style bubbles (max 2 sentences each)
              const bubbleChunks = splitIntoSpeechBubbles(message.message);

              // Add each bubble with a slight delay between them for reading flow
              bubbleChunks.forEach((chunk, i) => {
                setTimeout(() => {
                  bubbleSystemRef.current?.add_bubble(
                    character.character_id, // Use canonical ID (e.g., "dracula") not user instance ID
                    chunk,
                    {
                      type: message.is_complaint ? 'shout' : 'speech',
                      emotion: message.is_complaint ? 'angry' : 'neutral',
                      duration: 12000
                    }
                  );
                }, i * 1500); // Stagger by 1.5 seconds per bubble
              });

              // Call parent handler if provided
              onMessage?.(character.character_id, message.message);
            }
          }
        };

        // Subscribe to kitchen chat events
        socket.on('kitchen_conversation_response', handleKitchenMessage);
        socket.on('kitchen_message', handleKitchenMessage);
        socket.on('kitchen_scene_message', handleKitchenMessage);
        socket.on('ai_message', handleKitchenMessage);

        return () => {
          socket.off('kitchen_conversation_response', handleKitchenMessage);
          socket.off('kitchen_message', handleKitchenMessage);
          socket.off('kitchen_scene_message', handleKitchenMessage);
          socket.off('ai_message', handleKitchenMessage);
        };
      } catch (error) {
        console.error('Error setting up kitchen chat:', error);
      }
    };

    setupKitchenChat();
  }, [characters, onMessage]);

  return (
    <div className={`relative w-full h-full ${class_name}`}>
      {/* 3D Scene */}
      <ChatTheater3D
        ref={bubbleSystemRef}
        context_type="kitchen"
        participants={participants}
        is_enabled={true}
        class_name="w-full h-full"
      />

      {/* Connection status indicator */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-xs pointer-events-none">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Kitchen context label */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
        <div className="font-semibold">🍽️ Kitchen Table</div>
        <div className="text-xs text-gray-300">
          {characters.length} character{characters.length !== 1 ? 's' : ''} present
        </div>
      </div>
    </div>
  );
}
