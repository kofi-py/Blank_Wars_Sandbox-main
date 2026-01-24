'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SafeMotion } from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { MessageCircle, Send, Users, Brain, Target, Shield } from 'lucide-react';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { io, Socket } from 'socket.io-client';
import GameEventBus from '../services/gameEventBus';
import EventContextService from '../services/eventContextService';
import { sendViaAIChat } from '../services/chatAdapter';

interface ChatMessage {
  id: string;
  sender: 'coach' | string; // 'coach' or character ID
  sender_name: string;
  sender_avatar: string;
  message: string;
  timestamp: Date;
  message_type: 'strategy' | 'encouragement' | 'concern' | 'general';
}

interface TeamChatPanelProps {
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

export default function TeamChatPanel({
  player_team,
  phase,
  current_round,
  current_match,
  is_visible,
  onSendCoachMessage
}: TeamChatPanelProps) {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coachMessage, setCoachMessage] = useState('');
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [usageLimitReached, setUsageLimitReached] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection for AI chat
  useEffect(() => {
    // Determine backend URL based on environment
    let socketUrl: string;

    // Check if we're running locally (either in dev or local production build)
    const isLocalhost = typeof window !== 'undefined' &&
                       (window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1');

    if (isLocalhost) {
      // Local development or local production build
      socketUrl = 'http://localhost:4000';
    } else {
      // Deployed production
      socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.blankwars.com';
    }

    console.log('🔌 TeamChat connecting to backend:', socketUrl);

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ TeamChat Socket connected!');
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ TeamChat Socket disconnected');
      setConnected(false);
    });

    socketRef.current.on('team_chat_response', (data: { character: string; message: string; character_id: string }) => {
      console.log('📨 Team chat response:', data);

      const respondingCharacter = (player_team.characters && Array.isArray(player_team.characters))
        ? player_team.characters.find(c => c.id === data.character_id)
        : null;
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
      setIsTyping(null);
    });

    socketRef.current.on('team_chat_error', (error: { message?: string; error?: string; usageLimitReached?: boolean }) => {
      console.error('❌ Team chat error:', error);
      setIsTyping(null);

      if (error.usageLimitReached) {
        setUsageLimitReached(true);
        // Add a system message about the usage limit
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
    });

    return () => {
      console.log('Cleaning up WebSocket listeners');
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      socketRef.current = null;
    };
  }, []); // Remove dependency to prevent constant reconnects

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);


  // Add initial team greeting
  useEffect(() => {
    if (phase.name === 'strategy-selection' && messages.length === 0) {
      const initialMessages: ChatMessage[] = [
        {
          id: 'coach-welcome',
          sender: 'coach',
          sender_name: 'Coach',
          sender_avatar: '🧑‍🏫',
          message: `Alright team, this is Match ${current_match}, Round ${current_round}. Let's discuss our strategy and coordinate our approach.`,
          timestamp: new Date(),
          message_type: 'strategy'
        }
      ];

      // Add AI character introductions
      player_team.characters.forEach((character, index) => {
        setTimeout(async () => {
          try {
            const systemPrompt = `You are ${character.name}, a ${character.archetype}. Introduce yourself briefly to your coach for this team battle. Be in character and mention your role on the team.`;
            const userPrompt = 'Introduce yourself to the coach for this battle';

            const reply = await sendViaAIChat('team-chat', {
              character: character.id,
              message: userPrompt,
              conversation_context: systemPrompt
            });

            const character_message: ChatMessage = {
              id: `${character.id}-intro-${Date.now()}`,
              sender: character.id,
              sender_name: character.name,
              sender_avatar: character.avatar,
              message: reply?.text || `${character.name} ready for battle!`,
              timestamp: new Date(),
              message_type: 'general'
            };

            setMessages(prev => [...prev, character_message]);
          } catch (error) {
            console.error(`Introduction error for ${character.name}:`, error);
          }
        }, (index + 1) * 1000);
      });

      setMessages(initialMessages);
    }
  }, [phase, current_match, current_round, player_team.characters]);

  const handleSendCoachMessage = async () => {
    if (!coachMessage.trim()) return;
    if (usageLimitReached) return;

    const messageContent = coachMessage;
    const newMessage: ChatMessage = {
      id: `coach-${Date.now()}`,
      sender: 'coach',
      sender_name: 'Coach',
      sender_avatar: '🧑‍🏫',
      message: coachMessage,
      timestamp: new Date(),
      message_type: coachMessage.toLowerCase().includes('strategy') || coachMessage.toLowerCase().includes('plan') ? 'strategy' :
                  coachMessage.toLowerCase().includes('good') || coachMessage.toLowerCase().includes('great') ? 'encouragement' :
                  coachMessage.toLowerCase().includes('worry') || coachMessage.toLowerCase().includes('concern') ? 'concern' :
                  'general'
    };

    setMessages(prev => [...prev, newMessage]);
    onSendCoachMessage(coachMessage);
    setCoachMessage('');

    // Publish team chat events for each character
    try {
      const eventBus = GameEventBus.getInstance();

      for (const character of player_team.characters) {
        // Import team battle context for enhanced conversations
        let teamBattleContext = '';
        try {
          const contextService = EventContextService.getInstance();
          teamBattleContext = await contextService.getTeamBattleContext(character.id);
        } catch (error) {
          console.error(`Error getting team battle context for ${character.id}:`, error);
        }

        let event_type = 'team_battle_communication';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

        if (newMessage.message_type === 'strategy') {
          event_type = 'battle_strategy_discussion';
          severity = 'high';
        } else if (newMessage.message_type === 'encouragement') {
          event_type = 'team_morale_boost';
          severity = 'medium';
        } else if (newMessage.message_type === 'concern') {
          event_type = 'battle_concern_raised';
          severity = 'high';
        }

        await eventBus.publish({
          type: event_type as any,
          source: 'team_battle_chat' as any,
          primary_character_id: character.id,
          secondary_character_ids: player_team.characters.filter(c => c.id !== character.id).map(c => c.id),
          severity,
          category: 'battle',
          description: `Coach to team in battle: "${messageContent.substring(0, 100)}..."`,
          metadata: {
            battle_phase: phase.name,
            current_round,
            current_match,
            message_type: newMessage.message_type,
            team_size: player_team.characters.length,
            is_coach_message: true
          },
          tags: ['team_battle', 'coaching', 'battle_communication', newMessage.message_type]
        });
      }
    } catch (error) {
      console.error('Error publishing team chat events:', error);
    }

    // Generate AI character responses using backend AI service
      const respondingCharacters = player_team.characters
        .filter(char => Math.random() > 0.3) // 70% chance each character responds
        .slice(0, 2); // Max 2 responses to avoid spam

      respondingCharacters.forEach((character, index) => {
        setIsTyping(character.id);

        setTimeout(async () => {
          try {
            // Use backend AI client instead of socket
            const systemPrompt = `You are ${character.name}, a ${character.archetype} in a team battle. Your speech style is ${character.archetype === 'warrior' ? 'Direct and bold' :
                           character.archetype === 'mage' ? 'Wise and mystical' :
                           character.archetype === 'trickster' ? 'Clever and playful' :
                           character.archetype === 'beast' ? 'Instinctual and loyal' : 'Determined'}. Current battle phase: ${phase.name}, Round ${current_round}, Match ${current_match}. Message type: ${newMessage.message_type}.`;

            const userPrompt = `Coach said: "${coachMessage}". Respond as ${character.name} in character.`;

            const reply = await sendViaAIChat('team-chat', {
              character: character.id,
              message: userPrompt,
              conversation_context: systemPrompt
            });

            // Add the character's response
            const character_message: ChatMessage = {
              id: `${character.id}-${Date.now()}`,
              sender: character.id,
              sender_name: character.name,
              sender_avatar: character.avatar,
              message: reply?.text || 'I must gather my thoughts...',
              timestamp: new Date(),
              message_type: 'general'
            };

            setMessages(prev => [...prev, character_message]);
            setIsTyping(null);
          } catch (error) {
            console.error(`AI error for ${character.name}:`, error);
            setIsTyping(null);
          }
        }, (index + 1) * 1500 + Math.random() * 1000); // Staggered responses
      });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendCoachMessage();
    }
  };

  if (!is_visible) return null;

  return (
    <SafeMotion
      as="div"
      initial={{ opacity: 0, x: isMobile ? 0 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isMobile ? 0 : -20 }}
      transition={{ duration: isMobile ? 0.15 : 0.3, type: isMobile ? 'tween' : 'spring' }}
      class_name="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-700"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="text-blue-400" />
        <h3 className="text-lg font-bold text-white">Team Strategy Chat</h3>
        <div className="text-sm text-gray-400">
          ({player_team.characters.length + 1} participants)
        </div>
        <div className="ml-auto text-xs">
          {connected ? (
            <span className="text-green-400">🟢 AI Connected</span>
          ) : (
            <span className="text-red-400">🔴 AI Offline</span>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="h-48 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message) => {
            const isCoach = message.sender === 'coach';
            const MessageIcon = message_typeIcons[message.message_type];

            return (
              <SafeMotion
                as="div"
                key={message.id}
                initial={{ opacity: 0, y: isMobile ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: isMobile ? 0 : -10 }}
                transition={{ duration: isMobile ? 0.1 : 0.2, type: isMobile ? 'tween' : 'spring' }}
                class_name={`p-3 rounded-lg border ${message_typeColors[message.message_type]} ${
                  isCoach ? 'ml-4' : 'mr-4'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="text-xl flex-shrink-0">{message.sender_avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold text-sm ${
                        isCoach ? 'text-blue-300' : 'text-white'
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
              </SafeMotion>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: isMobile ? 0.1 : 0.2 }}
            class_name="flex items-center gap-2 text-gray-400 text-sm italic"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>{(player_team.characters && Array.isArray(player_team.characters))
              ? player_team.characters.find(c => c.id === isTyping)?.name
              : 'Someone'} is typing...</span>
          </SafeMotion>
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
        <SafeMotion
          as="button"
          while_hover={isMobile ? {} : { scale: 1.05 }}
          while_tap={{ scale: 0.95 }}
          transition={{ duration: isMobile ? 0.1 : 0.2, type: isMobile ? 'tween' : 'spring' }}
          on_click={handleSendCoachMessage}
          disabled={!coachMessage.trim() || usageLimitReached}
          class_name="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors flex items-center gap-1"
        >
          <Send className="w-4 h-4" />
          {usageLimitReached && <span className="text-xs">Limit reached</span>}
        </SafeMotion>
      </div>

      {/* Character count */}
      <div className="text-xs text-gray-500 mt-1 text-right">
        {coachMessage.length}/200
      </div>
    </SafeMotion>
  );
}
