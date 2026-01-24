'use client';

import { useState, useEffect, useRef } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import {
  MessageCircle,
  Send,
  Star,
  Sword,
  Shield,
  Zap,
  Heart,
  Brain,
  TrendingUp,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import apiClient from '../services/apiClient';

interface PendingAllocations {
  pending_levels: number;
  pending_stat_points: number;
  archetype: string;
  rarity: string;
}

interface PsychologyStats {
  team_trust: number;
  ego: number;
  gameplan_adherence: number;
  communication: number;
  stress_level: number;
  mental_health: number;
}

interface CharacterLevelUpChatProps {
  character: {
    id: string;
    name: string;
    avatar: string;
    psychology?: PsychologyStats;
  };
  pending_allocations: PendingAllocations;
  onClose: () => void;
  onStatsAllocated: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'contestant' | 'coach';
  content: string;
  timestamp: Date;
}

export default function CharacterLevelUpChat({
  character,
  pending_allocations,
  onClose,
  onStatsAllocated
}: CharacterLevelUpChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isCharacterTyping, setIsCharacterTyping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat with character's first message
  useEffect(() => {
    sendInitialMessage();
  }, []);

  const sendInitialMessage = async () => {
    setIsCharacterTyping(true);
    try {
      const response = await apiClient.post(`/characters/${character.id}/level-up-chat`, {
        message: 'Hello! I just leveled up and need to decide how to allocate my stat points. What do you think I should focus on?'
      });

      const data = response.data;

      if (data.success) {
        const character_message: ChatMessage = {
          id: '1',
          sender: 'contestant',
          content: data.data.message,
          timestamp: new Date()
        };
        setMessages([character_message]);
      } else {
        setError(data.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError('Failed to connect to character');
    } finally {
      setIsCharacterTyping(false);
    }
  };

  const sendCoachMessage = async () => {
    if (!inputValue.trim() || isCharacterTyping || isSubmitting) return;

    const coachMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'coach',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, coachMessage]);
    const currentMessage = inputValue;
    setInputValue('');
    setIsCharacterTyping(true);
    setError(null);

    try {
      const response = await apiClient.post(`/characters/${character.id}/level-up-chat`, {
        message: currentMessage
      });

      const data = response.data;

      if (data.success) {
        const character_response: ChatMessage = {
          id: Date.now().toString(),
          sender: 'contestant',
          content: data.data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, character_response]);

        // Check if the AI response contains a stat allocation decision
        if (containsStatAllocation(data.data.message)) {
          // Show confirmation option
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              sender: 'contestant',
              content: 'Should I go ahead with this allocation?',
              timestamp: new Date()
            }]);
          }, 1000);
        }
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setIsCharacterTyping(false);
    }
  };

  const containsStatAllocation = (message: string): boolean => {
    // Check if the message contains a complete stat allocation
    const allocationPattern = /(\d+)\s+(?:points?\s+)?(?:to\s+)?(?:in\s+)?(health|attack|defense|speed|special)/gi;
    const matches = [...message.matchAll(allocationPattern)];
    return matches.length >= 3; // At least 3 stats mentioned
  };

  const confirmAllocation = async () => {
    const lastMessage = messages[messages.length - 2]; // Get the character's allocation message
    if (!lastMessage || lastMessage.sender !== 'contestant') return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`/characters/${character.id}/allocate-stats`, {
        ai_decision_text: lastMessage.content
      });

      const data = response.data;

      if (data.success) {
        const successMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: 'contestant',
          content: "Perfect! I can feel myself getting stronger! Thanks for your guidance, coach!",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);

        setTimeout(() => {
          onStatsAllocated();
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Failed to allocate stats');
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: 'contestant',
          content: `Hmm, something went wrong: ${data.error}. Can we try again with the allocation?`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error confirming allocation:', error);
      setError('Failed to confirm allocation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPsychologyDisplay = () => {
    if (!character.psychology) return null;

    const psych = character.psychology;
    return (
      <div className="text-xs text-gray-400 mb-2">
        Psychology: Trust {psych.team_trust} • Ego {psych.ego} • Adherence {psych.gameplan_adherence} • Stress {psych.stress_level}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <SafeMotion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        class_name="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl h-[600px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{character.avatar}</span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                Level Up Chat: {character.name}
              </h2>
              <p className="text-sm text-gray-400">
                {pending_allocations.pending_levels} levels • {pending_allocations.pending_stat_points} stat points
              </p>
              {getPsychologyDisplay()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-900/50 border-b border-red-700">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'coach' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${message.sender === 'coach'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-white'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">
                    {message.sender === 'coach' ? 'Coach' : character.name}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>

                {/* Show confirmation button for allocation messages */}
                {message.sender === 'contestant' &&
                  containsStatAllocation(message.content) &&
                  message.id === messages[messages.length - 2]?.id &&
                  !isSubmitting && (
                    <button
                      onClick={confirmAllocation}
                      className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirm This Allocation
                    </button>
                  )}

                {isSubmitting && message.id === messages[messages.length - 2]?.id && (
                  <div className="w-full mt-3 bg-gray-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 animate-spin" />
                    Applying...
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isCharacterTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-lg p-3 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{character.avatar}</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendCoachMessage()}
              placeholder="Guide your character's stat allocation..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              disabled={isCharacterTyping || isSubmitting}
            />
            <button
              onClick={sendCoachMessage}
              disabled={!inputValue.trim() || isCharacterTyping || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Chat with {character.name} to help them decide how to allocate their stat points! Their psychology affects how they respond to your coaching.
          </p>
        </div>
      </SafeMotion.div>
    </div>
  );
}
