'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Users, Brain, Target, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { io, Socket } from 'socket.io-client';
import GameEventBus from '@/services/gameEventBus';
import EventContextService from '@/services/eventContextService';
import WordBubbleSystem from '../WordBubbleSystem';
import { useBattleBubbles } from '@/hooks/useWordBubbleIntegration';

interface ChatMessage {
  id: string;
  sender: 'coach' | string;
  sender_name: string;
  sender_avatar: string;
  message: string;
  timestamp: Date;
  message_type: 'strategy' | 'encouragement' | 'concern' | 'general';
}

interface TeamChatPanelWithBubblesProps {
  player_team: { characters: TeamCharacter[] };
  phase: { name: string };
  current_round: number;
  current_match: number;
  is_visible: boolean;
  onSendCoachMessage: (message: string) => void;
}

const message_typeColors = {
  strategy: 'border-blue-500 bg-blue-900/20',
  encouragement: 'border-green-500 bg-green-900/20',
  concern: 'border-yellow-500 bg-yellow-900/20',
  general: 'border-gray-500 bg-gray-800/20'
};

const message_typeIcons = {
  strategy: Target,
  encouragement: Shield,
  concern: Brain,
  general: MessageCircle
};

export default function TeamChatPanelWithBubbles({
  player_team,
  phase,
  current_round,
  current_match,
  is_visible,
  onSendCoachMessage
}: TeamChatPanelWithBubblesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coachMessage, setCoachMessage] = useState('');
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [usageLimitReached, setUsageLimitReached] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const battleAreaRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Prepare participants for bubble system
  const participants = React.useMemo(() => [
    { character_id: 'coach', character_name: 'Coach', character_avatar: '🧑‍🏫' },
    ...player_team.characters.map(char => ({
      character_id: char.id,
      character_name: char.name,
      character_avatar: char.avatar
    }))
  ], [player_team.characters]);

  // Initialize bubble system for battle context
  const { bubble_system_props, bubble_system_ref, isBubbleMode, toggleChatMode } = useBattleBubbles(
    participants,
    socketRef.current || undefined,
    battleAreaRef
  );

  // Initialize socket connection
  useEffect(() => {
    let socketUrl: string;
    const isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    if (isLocalhost) {
      socketUrl = 'http://localhost:3006';
    } else {
      socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://blank-wars-clean-production.up.railway.app';
    }

    console.log('🔌 TeamChatWithBubbles connecting to:', socketUrl);

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ TeamChatWithBubbles Socket connected!');
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ TeamChatWithBubbles Socket disconnected');
      setConnected(false);
    });

    // Handle traditional chat responses (when bubbles are disabled)
    socketRef.current.on('team_chat_response', (data: { character: string; message: string; character_id: string }) => {
      console.log('📨 Team chat response:', data);

      if (!isBubbleMode) {
        const respondingCharacter = player_team.characters.find(c => c.id === data.character_id);
        if (respondingCharacter) {
          const character_message: ChatMessage = {
            id: `${data.character_id}-${Date.now()}`,
            sender: data.character_id,
            sender_name: respondingCharacter.name,
            sender_avatar: respondingCharacter.avatar,
            message: data.message || 'I must gather my thoughts...',
            timestamp: new Date(),
            message_type: 'general'
          };

          setMessages(prev => [...prev, character_message]);
        }
      }
      setIsTyping(null);
    });

    socketRef.current.on('team_chat_error', (error: { message?: string; error?: string; usageLimitReached?: boolean }) => {
      console.error('❌ Team chat error:', error);
      setIsTyping(null);

      if (error.usageLimitReached) {
        setUsageLimitReached(true);

        if (!isBubbleMode) {
          const limitMessage: ChatMessage = {
            id: `limit-${Date.now()}`,
            sender: 'system',
            sender_name: 'System',
            sender_avatar: '⚠️',
            message: error.error || 'Daily AI interaction limit reached. Upgrade to premium for more conversations!',
            timestamp: new Date(),
            message_type: 'concern'
          };
          setMessages(prev => [...prev, limitMessage]);
        }
      }
    });

    return () => {
      console.log('Cleaning up TeamChatWithBubbles WebSocket listeners');
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      socketRef.current = null;
    };
  }, [player_team.characters, isBubbleMode]);

  // Auto-scroll traditional chat to bottom
  useEffect(() => {
    if (chatContainerRef.current && !isBubbleMode) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isBubbleMode]);

  // Add initial team greeting
  useEffect(() => {
    if (phase.name === 'strategy-selection' && messages.length === 0) {
      const initialMessage: ChatMessage = {
        id: 'coach-welcome',
        sender: 'coach',
        sender_name: 'Coach',
        sender_avatar: '🧑‍🏫',
        message: `Alright team, this is Match ${current_match}, Round ${current_round}. Let's discuss our strategy and coordinate our approach.`,
        timestamp: new Date(),
        message_type: 'strategy'
      };

      if (isBubbleMode) {
        // Send to bubbles
        if (bubble_system_ref.current) {
          bubble_system_ref.current.add_bubble(
            'coach',
            initialMessage.message,
            { type: 'speech', priority: 'high' }
          );
        }
      } else {
        // Add to traditional chat
        setMessages([initialMessage]);
      }

      // Generate AI character introductions
      if (connected && socketRef.current) {
        player_team.characters.forEach((character, index) => {
          setTimeout(() => {
            socketRef.current?.emit('team_chat_message', {
              message: 'Introduce yourself to the coach for this battle',
              character: character.name,
              character_id: character.id,
              character_data: {
                name: character.name,
                archetype: character.archetype,
                avatar: character.avatar,
                personality: {
                  traits: [character.archetype],
                  speech_style: character.archetype === 'warrior' ? 'Direct and bold' :
                    character.archetype === 'mage' ? 'Wise and mystical' :
                      character.archetype === 'trickster' ? 'Clever and playful' :
                        character.archetype === 'beast' ? 'Instinctual and loyal' : 'Determined'
                }
              },
              previous_messages: [],
              is_introduction: true
            });
          }, (index + 1) * 1000);
        });
      }
    }
  }, [phase.name, current_match, current_round, player_team.characters, connected, isBubbleMode]);

  const handleSendCoachMessage = async () => {
    if (!coachMessage.trim()) return;
    if (usageLimitReached) return;

    const messageContent = coachMessage;
    const message_type = coachMessage.toLowerCase().includes('strategy') || coachMessage.toLowerCase().includes('plan') ? 'strategy' :
      coachMessage.toLowerCase().includes('good') || coachMessage.toLowerCase().includes('great') ? 'encouragement' :
        coachMessage.toLowerCase().includes('worry') || coachMessage.toLowerCase().includes('concern') ? 'concern' :
          'general';

    // Send coach message
    if (isBubbleMode) {
      // Add to bubbles
      if (bubble_system_ref.current) {
        bubble_system_ref.current.add_bubble(
          'coach',
          messageContent,
          { type: 'speech', priority: 'high' }
        );
      }
    } else {
      // Add to traditional chat
      const newMessage: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        sender_name: 'Coach',
        sender_avatar: '🧑‍🏫',
        message: coachMessage,
        timestamp: new Date(),
        message_type
      };
      setMessages(prev => [...prev, newMessage]);
    }

    onSendCoachMessage(coachMessage);
    setCoachMessage('');

    // Publish team chat events
    try {
      const eventBus = GameEventBus.getInstance();

      for (const character of player_team.characters) {
        let event_type = 'team_battle_communication';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

        if (message_type === 'strategy') {
          event_type = 'battle_strategy_discussion';
          severity = 'high';
        } else if (message_type === 'encouragement') {
          event_type = 'team_morale_boost';
          severity = 'medium';
        } else if (message_type === 'concern') {
          event_type = 'battle_concern_raised';
          severity = 'high';
        }

        await eventBus.publish({
          type: event_type as any,
          source: 'battle_arena',
          primary_character_id: character.id,
          secondary_character_ids: player_team.characters.filter(c => c.id !== character.id).map(c => c.id),
          severity,
          category: 'battle',
          description: `Coach to team in battle: "${messageContent.substring(0, 100)}..."`,
          metadata: {
            battle_phase: phase.name,
            current_round,
            current_match,
            message_type,
            team_size: player_team.characters.length,
            is_coach_message: true
          },
          tags: ['team_battle', 'coaching', 'battle_communication', message_type]
        });
      }
    } catch (error) {
      console.error('Error publishing team chat events:', error);
    }

    // Generate AI responses
    if (connected && socketRef.current) {
      const respondingCharacters = player_team.characters
        .filter(char => Math.random() > 0.3)
        .slice(0, 2);

      respondingCharacters.forEach((character, index) => {
        setIsTyping(character.id);

        setTimeout(() => {
          socketRef.current?.emit('team_chat_message', {
            message: coachMessage,
            character: character.name,
            character_id: character.id,
            character_data: {
              name: character.name,
              archetype: character.archetype,
              avatar: character.avatar,
              personality: {
                traits: [character.archetype],
                speech_style: character.archetype === 'warrior' ? 'Direct and bold' :
                  character.archetype === 'mage' ? 'Wise and mystical' :
                    character.archetype === 'trickster' ? 'Clever and playful' :
                      character.archetype === 'beast' ? 'Instinctual and loyal' : 'Determined'
              },
              battle_context: {
                phase: phase.name,
                round: current_round,
                match: current_match,
                message_type
              }
            },
            previous_messages: messages.slice(-5).map(m => ({
              role: m.sender === 'coach' ? 'user' : 'assistant',
              content: m.message,
              sender: m.sender_name
            }))
          });
        }, (index + 1) * 1500 + Math.random() * 1000);
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCoachMessage();
    }
  };

  if (!is_visible) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Header with Mode Toggle */}
      <div className="flex items-center gap-2 mb-4 bg-gradient-to-r from-gray-800 to-gray-700 p-3 rounded-lg">
        <Users className="text-blue-400" />
        <h3 className="text-lg font-bold text-white">Team Strategy Chat</h3>
        <div className="text-sm text-gray-400">
          ({player_team.characters.length + 1} participants)
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={toggleChatMode}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${isBubbleMode
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
          >
            {isBubbleMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {isBubbleMode ? 'Bubbles' : 'Traditional'}
          </button>
          <div className="text-xs">
            {connected ? (
              <span className="text-green-400">🟢 AI Connected</span>
            ) : (
              <span className="text-red-400">🔴 AI Offline</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Display Area */}
      <div className="flex-1 relative">
        {isBubbleMode ? (
          /* Battle Arena with Word Bubbles */
          <div
            ref={battleAreaRef}
            className="relative w-full h-full bg-gradient-to-br from-red-900/20 via-gray-900 to-blue-900/20 rounded-xl overflow-hidden border border-gray-700"
          >
            {/* Battle Field Background */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 text-4xl">⚔️</div>
              <div className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2 text-4xl">🛡️</div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-2xl">🧑‍🏫</div>
            </div>

            {/* Word Bubble System */}
            <WordBubbleSystem
              ref={bubble_system_ref}
              {...bubble_system_props}
            />

            {/* Battle Phase Indicator */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
              {phase.name} - Round {current_round} - Match {current_match}
            </div>
          </div>
        ) : (
          /* Traditional Chat Messages */
          <div
            ref={chatContainerRef}
            className="h-48 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-700"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => {
                const isCoach = message.sender === 'coach';
                const MessageIcon = message_typeIcons[message.message_type];

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3 rounded-lg border ${message_typeColors[message.message_type]} ${isCoach ? 'ml-4' : 'mr-4'
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-xl flex-shrink-0">{message.sender_avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold text-sm ${isCoach ? 'text-blue-300' : 'text-white'
                            }`}>
                            {message.sender_name}
                          </span>
                          <MessageIcon className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString([], { timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {message.message}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            {isTyping && !isBubbleMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-gray-400 text-sm italic"
              >
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span>{player_team.characters.find(c => c.id === isTyping)?.name} is typing...</span>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Quick Response Suggestions */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-2">
          {[
            'Great job everyone!',
            'Stay focused on the strategy',
            'Watch out for their counter-attacks',
            'Trust your training'
          ].map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setCoachMessage(suggestion)}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={coachMessage}
          onChange={(e) => setCoachMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Coach your team..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          maxLength={200}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSendCoachMessage}
          disabled={!coachMessage.trim() || usageLimitReached}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors flex items-center gap-1"
        >
          <Send className="w-4 h-4" />
          {usageLimitReached && <span className="text-xs">Limit reached</span>}
        </motion.button>
      </div>

      {/* Character count */}
      <div className="text-xs text-gray-500 mt-1 text-right">
        {coachMessage.length}/200
      </div>
    </div>
  );
}