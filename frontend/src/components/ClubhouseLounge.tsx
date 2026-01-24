'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee,
  Users,
  Sparkles,
  MessageCircle,
  LogIn,
  LogOut,
  Clock,
  Dice1,
  Music,
  Star,
  Activity,
  RefreshCw
} from 'lucide-react';
import GameEventBus from '../services/gameEventBus';
import EventContextService from '../services/eventContextService';
import apiClient from '../services/apiClient';

interface CharacterData {
  id: string;
  character_id: string;
  name: string;
  avatar_emoji: string;
}

interface LoungeCharacter {
  id: string;
  name: string;
  avatar: string;
  team_name: string;
  coach_name?: string;
  status: 'active' | 'idle' | 'typing';
  mood: 'relaxed' | 'excited' | 'annoyed' | 'thoughtful' | 'playful';
  current_activity?: string;
  last_seen?: Date;
}

interface LoungeMessage {
  id: string;
  character_id: string;
  character_name: string;
  character_avatar: string;
  coach_name?: string;
  content: string;
  type: 'chat' | 'action' | 'join' | 'leave' | 'emote';
  timestamp: Date;
  mentions?: string[];
  referenced_battle?: {
    id: string;
    participants: string[];
    winner: string;
  };
}

interface ClubhouseLoungeProps {
  available_characters: CharacterData[];
  current_user_id: string;
  current_user_name: string;
}

interface LoungeMessageResponse {
  id: string;
  character_id: string;
  character_name: string;
  character_avatar: string;
  coach_name: string;
  content: string;
  message_type: LoungeMessage['type'];
  created_at: string;
  mentions: string[];
}

interface LoungePresenceResponse {
  character_id: string;
  character_name: string;
  avatar_emoji: string;
  team_name: string;
  coach_name: string;
  status: LoungeCharacter['status'];
  mood: LoungeCharacter['mood'];
  activity: string;
  last_active: string;
}

export default function ClubhouseLounge({
  available_characters,
  current_user_id,
  current_user_name
}: ClubhouseLoungeProps) {
  const [characters, setCharacters] = useState<LoungeCharacter[]>([]);
  const [messages, setMessages] = useState<LoungeMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from backend
  const loadMessages = useCallback(async () => {
    const response = await apiClient.get<{ messages: LoungeMessageResponse[] }>('/social/lounge/messages', {
      params: { limit: 50 }
    });
    const backendMessages: LoungeMessage[] = response.data.messages.map((msg) => ({
      id: msg.id,
      character_id: msg.character_id,
      character_name: msg.character_name,
      character_avatar: msg.character_avatar,
      coach_name: msg.coach_name,
      content: msg.content,
      type: msg.message_type,
      timestamp: new Date(msg.created_at),
      mentions: msg.mentions
    }));
    setMessages(backendMessages);
  }, []);

  // Load presence (who's in the lounge) - all autonomous AI characters
  const loadPresence = useCallback(async () => {
    const response = await apiClient.get<{ presence: LoungePresenceResponse[] }>('/social/lounge/presence');
    const loungeCharacters: LoungeCharacter[] = response.data.presence.map((p) => ({
      id: p.character_id,
      name: p.character_name,
      avatar: p.avatar_emoji,
      team_name: p.team_name,
      coach_name: p.coach_name,
      status: p.status,
      mood: p.mood,
      current_activity: p.activity,
      last_seen: new Date(p.last_active)
    }));
    setCharacters(loungeCharacters);
  }, []);

  // Update own presence
  const updatePresence = useCallback(async (characterId: string | null) => {
    await apiClient.post('/social/lounge/presence', {
      character_id: characterId, // null for coach, valid UUID for character
      status: 'active'
    });
  }, []);

  // Initial load from backend
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadMessages(), loadPresence()]);
      setLoading(false);

      // Register coach presence (null means coach, not character)
      updatePresence(null);
    };
    init();
  }, [current_user_id, loadMessages, loadPresence, updatePresence]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadMessages();
      loadPresence();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [loadMessages, loadPresence]);

  // Heartbeat coach presence every 30 seconds
  useEffect(() => {
    const heartbeat = setInterval(() => {
      updatePresence(`coach_${current_user_id}`);
    }, 30000);

    return () => clearInterval(heartbeat);
  }, [current_user_id, updatePresence]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const generateAIMessage = async (character: LoungeCharacter) => {
    try {
      // Build context for the AI conversation (backend will inject real events)
      const conversation_context = {
        recent_messages: messages.slice(-5).map(msg => ({
          character: msg.character_name,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        lounge_participants: characters.map(c => c.name),
        character_mood: character.mood,
        character_status: character.status
      };

      const response = await apiClient.post('/social/lounge', {
        character_id: character.id,
        conversation_type: 'character_interaction',
        context: conversation_context
      });

      const data = response.data;

      // Create AI message from API response
      const aiMessage: LoungeMessage = {
        id: `msg_${Date.now()}`,
        character_id: character.id,
        character_name: character.name,
        character_avatar: character.avatar,
        coach_name: character.coach_name,
        content: data.message,
        type: 'chat',
        timestamp: new Date(data.timestamp)
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Failed to generate AI lounge message:', error);
    }
  };

  const generateAIUserResponse = async (character: LoungeCharacter, user_message: string) => {
    try {
      // Build context for the AI conversation (backend will inject real events)
      const conversation_context = {
        recent_messages: messages.slice(-5).map(msg => ({
          character: msg.character_name,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        lounge_participants: characters.map(c => c.name),
        character_mood: character.mood,
        character_status: character.status
      };

      const response = await apiClient.post('/social/lounge', {
        character_id: character.id,
        conversation_type: 'user_chat',
        user_message: user_message,
        context: conversation_context
      });

      const data = response.data;

      // Create AI message from API response
      const aiMessage: LoungeMessage = {
        id: `msg_${Date.now()}`,
        character_id: character.id,
        character_name: character.name,
        character_avatar: character.avatar,
        coach_name: character.coach_name,
        content: data.message,
        type: 'chat',
        timestamp: new Date(data.timestamp)
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Failed to generate AI user response:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    // Human coach speaks as themselves, NOT as a character
    const newMessage: LoungeMessage = {
      id: `msg_${Date.now()}`,
      character_id: `coach_${current_user_id}`,
      character_name: current_user_name,
      character_avatar: '🎮',
      coach_name: current_user_name,
      content: userInput,
      type: 'chat',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    const messageContent = userInput;
    setUserInput('');

    // POST message to backend for persistence (null character_id = coach message)
    setSending(true);
    await apiClient.post('/social/lounge/messages', {
      content: messageContent,
      message_type: 'chat'
    });
    setSending(false);

    // Publish clubhouse social event
    try {
      const eventBus = GameEventBus.getInstance();
      const messageText = messageContent.toLowerCase();
      let event_type: 'casual_conversation' | 'gossip_session' | 'team_meeting' = 'casual_conversation';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (messageText.includes('battle') || messageText.includes('fight') || messageText.includes('combat')) {
        event_type = 'casual_conversation';
        severity = 'medium';
      } else if (messageText.includes('drama') || messageText.includes('conflict') || messageText.includes('problem')) {
        event_type = 'gossip_session';
        severity = 'medium';
      } else if (messageText.includes('strategy') || messageText.includes('team') || messageText.includes('tactics')) {
        event_type = 'team_meeting';
        severity = 'medium';
      }

      await eventBus.publish({
        type: event_type,
        source: 'clubhouse_lounge',
        primary_character_id: current_user_id,
        severity,
        category: 'social',
        description: `Coach ${current_user_name} in clubhouse: "${messageContent.substring(0, 100)}..."`,
        metadata: {
          lounge_activity: true,
          message_type: newMessage.type,
          is_coach: true
        },
        tags: ['clubhouse', 'social', 'lounge', 'coach']
      });
    } catch (error) {
      console.error('Error publishing clubhouse event:', error);
    }

    // AI characters may respond autonomously to coach message
    setTimeout(async () => {
      if (Math.random() > 0.3) { // 70% chance of AI response
        const responder = characters.filter(c => c.status === 'active')[0];
        if (responder) {
          await generateAIUserResponse(responder, messageContent);
        }
      }
    }, 2000 + Math.random() * 3000);
  };

  const getCharacterStatus = (char: LoungeCharacter) => {
    if (isTyping.includes(char.id)) return 'typing...';
    if (char.status === 'idle' && char.last_seen) {
      const minutes = Math.floor((Date.now() - char.last_seen.getTime()) / 1000 / 60);
      return `idle ${minutes}m`;
    }
    return char.current_activity || char.status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading lounge...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[400px] md:h-[700px] flex gap-6">
      {/* Character List Sidebar */}
      <div className="w-80 bg-gray-900/50 rounded-xl border border-gray-700 p-4 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          In the Lounge ({characters.length})
        </h3>

        <div className="space-y-2 flex-1 overflow-y-auto">
          {characters.map((char) => (
            <div
              key={char.id}
              className="p-3 rounded-lg transition-all bg-gray-800/50 hover:bg-gray-800/70"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{char.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{char.name}</span>
                  </div>
                  <div className="text-xs text-gray-400">{char.team_name}</div>
                  {char.coach_name && (
                    <div className="text-xs text-purple-400">Coach: {char.coach_name}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1 italic">
                    {getCharacterStatus(char)}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  isTyping.includes(char.id) ? 'bg-yellow-400 animate-pulse' :
                  char.status === 'active' ? 'bg-green-400' :
                  char.status === 'idle' ? 'bg-orange-400' :
                  'bg-gray-400'
                }`} />
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-gray-900/50 rounded-xl border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Coffee className="w-6 h-6 text-amber-400" />
            Clubhouse Lounge
            <span className="text-sm font-normal text-gray-400 ml-2">
              Cross-team social space
            </span>
          </h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`${
              msg.type === 'join' || msg.type === 'leave' ? 'text-center' : ''
            }`}>
              {msg.type === 'join' || msg.type === 'leave' ? (
                <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                  {msg.type === 'join' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                  <span>{msg.character_avatar} {msg.character_name} {msg.content}</span>
                </div>
              ) : msg.type === 'action' ? (
                <div className="text-sm text-gray-400 italic flex items-center gap-2">
                  <Dice1 className="w-4 h-4" />
                  <span>* {msg.content} *</span>
                </div>
              ) : (
                <div className={`flex items-start gap-3 ${
                  msg.character_id === `coach_${current_user_id}` ? 'flex-row-reverse' : ''
                }`}>
                  <div className="text-2xl">{msg.character_avatar}</div>
                  <div className={`max-w-md ${msg.character_id === `coach_${current_user_id}` ? 'items-end' : ''}`}>
                    <div className={`flex items-center gap-2 mb-1 ${
                      msg.character_id === `coach_${current_user_id}` ? 'justify-end' : ''
                    }`}>
                      <span className="font-semibold text-white text-sm">{msg.character_name}</span>
                      {msg.character_id?.startsWith('coach_') ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-600 text-white">
                          Coach
                        </span>
                      ) : msg.coach_name && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                          {msg.coach_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`inline-block px-4 py-2 rounded-lg ${
                      msg.character_id === `coach_${current_user_id}`
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-200'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.mentions && msg.mentions.length > 0 && (
                      <div className="mt-1 text-xs text-purple-400">
                        @{msg.mentions.join(', @')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicators */}
          {isTyping.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {characters.filter(c => isTyping.includes(c.id)).map(c => c.name).join(', ')} typing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm flex items-center gap-2">
              <span>🎮</span>
              <span>{current_user_name}</span>
            </div>

            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />

            <button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || sending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>

          <div className="mt-2 text-xs text-gray-500 text-center">
            Characters from different teams gather here to socialize between battles
          </div>
        </div>
      </div>
    </div>
  );
}
