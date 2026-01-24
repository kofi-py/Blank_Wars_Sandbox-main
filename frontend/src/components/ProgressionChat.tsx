'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, TrendingUp, Star, Sparkles, Award, Zap, Target, Trophy, MessageCircle } from 'lucide-react';
import { Contestant } from '@blankwars/types';
import { sendViaAIChat } from '../services/chatAdapter';

interface Message {
  id: number;
  type: 'coach' | 'contestant';
  message: string;
  timestamp: Date;
  bond_increase?: boolean;
  speaker_name: string;
  speaker_id: string;
}

interface ProgressionIntent {
  type: 'set_goal' | 'request_training' | 'express_concern' | 'celebrate_milestone' | 'request_rest' | 'challenge_teammate';
  action: Record<string, unknown>;
  urgency: 'low' | 'medium' | 'high';
  requires_approval: boolean;
}

interface ProgressionChatProps {
  selected_characterId: string;
  onCharacterChange?: (character_id: string) => void;
  selected_character: Contestant;
  available_characters: Contestant[];
  coach_name: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function ProgressionChat({
  selected_characterId,
  onCharacterChange,
  selected_character,
  available_characters,
  coach_name
}: ProgressionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastIntent, setLastIntent] = useState<ProgressionIntent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  // Reset when character changes
  useEffect(() => {
    setMessages([]);
    setLastIntent(null);
    if (selected_character && selected_character.name) {
      const greeting = getProgressionGreeting(selected_character);
      setMessages([{
        id: Date.now(),
        type: 'contestant',
        message: greeting,
        timestamp: new Date(),
        speaker_name: selected_character.name,
        speaker_id: selected_character.id
      }]);
    }
  }, [selected_character?.id]);

  function getProgressionGreeting(character: Contestant): string {
    const xp = character.experience || 0;
    const level = character.level || 1;
    const bond_level = character.bond_level || 0;

    if (xp < 100) {
      return `Hey Coach! I'm still pretty new here... only ${xp} XP. Got a lot to learn about Blank Wars. Where do we start?`;
    } else if (xp < 500) {
      return `Coach! I'm at level ${level} now with ${xp} XP. Starting to get the hang of this. How am I doing?`;
    } else if (xp < 1000) {
      return `Coach, we've been working together for a while now. Level ${level}, ${xp} XP, bond level ${bond_level}. What's next for us?`;
    } else {
      return `Coach... look at how far we've come. Level ${level}, ${xp} XP. I remember when I first got here. What's my legacy going to be?`;
    }
  }

  function getProgressionQuickMessages(character: Contestant): string[] {
    const xp = character.experience || 0;
    const totalBattles = character.total_battles || 0;
    const totalWins = character.total_wins || 0;
    const bond_level = character.bond_level || 0;
    const winRate = totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0;

    if (xp < 100) {
      return [
        "I'm nervous about my journey ahead...",
        "What should I expect in Blank Wars?",
        "How do I build trust with you?",
        "Do you think I have what it takes?",
        "What should my first goal be?"
      ];
    } else if (xp < 500) {
      return [
        `I've had ${totalBattles} battles now, how am I progressing?`,
        "What should I focus on to improve faster?",
        winRate < 40 ? "I'm struggling with my win rate..." : "My confidence is building!",
        "When will I be ready for bigger challenges?",
        "Can we set some goals together?"
      ];
    } else if (xp < 1000) {
      return [
        `With ${xp} XP, am I on track?`,
        "What milestones should I aim for next?",
        "How do I compare to my teammates?",
        "What's my path to championship glory?",
        bond_level < 50 ? "How can we strengthen our bond?" : "I trust your guidance completely"
      ];
    } else {
      return [
        "Look how far we've come together...",
        "Should I start mentoring newer fighters?",
        "What's my legacy going to be?",
        "How will I be remembered?",
        "Is it time for championship contention?"
      ];
    }
  }

  function getIntentIcon(type: string) {
    switch (type) {
      case 'set_goal': return <Target className="w-4 h-4" />;
      case 'request_training': return <TrendingUp className="w-4 h-4" />;
      case 'celebrate_milestone': return <Trophy className="w-4 h-4" />;
      case 'express_concern': return <MessageCircle className="w-4 h-4" />;
      case 'request_rest': return <Star className="w-4 h-4" />;
      case 'challenge_teammate': return <Sparkles className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  }

  function getIntentMessage(intent: ProgressionIntent): string {
    const action = intent.action;
    switch (intent.type) {
      case 'set_goal':
        return `🎯 Goal set: ${action.goal} (target: ${action.target})`;
      case 'request_training':
        return `🏋️ Training request: ${action.focus}`;
      case 'celebrate_milestone':
        return `🎉 Celebrating: ${action.achievement}`;
      case 'express_concern':
        return `💭 Concern: ${action.concern}`;
      case 'request_rest':
        return `😴 Rest requested: ${action.duration}`;
      case 'challenge_teammate':
        return `⚔️ Challenge: ${action.target}`;
      default:
        return `💡 ${intent.type}`;
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping || !selected_character) return;
    if (!selected_character.name) {
      throw new Error('STRICT MODE: selected_character.name is required for progression chat');
    }
    if (!selected_character.character_id) {
      throw new Error('STRICT MODE: selected_character.character_id is required for progression chat');
    }

    const playerMessage: Message = {
      id: Date.now(),
      type: 'coach',
      message: content,
      timestamp: new Date(),
      speaker_name: coach_name,
      speaker_id: 'coach'
    };

    setMessages(prev => [...prev, playerMessage]);
    setInputMessage('');
    setIsTyping(true);
    setLastIntent(null);

    try {
      const chat_id = `progression:${selected_character.id}`;

      const result = await sendViaAIChat(chat_id, {
        message: content,
        role: 'therapist',
        character: selected_character.character_id,
        agent_key: selected_character.character_id,
        userchar_id: selected_character.id,
        chat_type: 'progression',
        domain: 'progression',
        messages: messages.slice(-5)
      });

      const character_message: Message = {
        id: Date.now() + 1,
        type: 'contestant',
        message: result.text,
        timestamp: new Date(),
        bond_increase: false,
        speaker_name: selected_character.name,
        speaker_id: selected_character.id
      };

      setMessages(prev => [...prev, character_message]);

      // Handle intent if present in raw response
      if (result.raw && result.raw.intent) {
        setLastIntent(result.raw.intent);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const quickMessages = selected_character ? getProgressionQuickMessages(selected_character) : [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 rounded-xl backdrop-blur-sm border border-green-500/30 overflow-hidden">
        <div className="h-[700px]">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-800/30 to-blue-800/30 p-4 border-b border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selected_character?.avatar}</div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Progression & Journey - {selected_character?.name}
                  </h3>
                  <p className="text-sm text-green-200">Discuss your growth, goals, and legacy in Blank Wars</p>
                </div>
                <div className="ml-auto flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-300">Level {selected_character?.level || 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">{selected_character?.experience || 0} XP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Messages */}
            <div className="p-4 border-b border-green-500/20 bg-green-900/10">
              <div className="flex flex-wrap gap-2">
                {quickMessages.map((msg, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(msg)}
                    className="bg-green-700/30 hover:bg-green-600/40 text-green-100 text-xs px-3 py-1 rounded-full border border-green-500/30 transition-all"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'coach' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.type === 'coach'
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white'
                    }`}>
                    <p>{message.message}</p>
                  </div>
                </div>
              ))}

              {/* Intent Display */}
              {lastIntent && (
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2">
                    {getIntentIcon(lastIntent.type)}
                    <span className="text-sm text-blue-200">
                      {getIntentMessage(lastIntent)}
                    </span>
                    {lastIntent.requires_approval && (
                      <span className="ml-auto text-xs bg-yellow-600/50 px-2 py-1 rounded">
                        Pending Approval
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-green-500/30 bg-green-900/10">
              <div className="text-xs text-green-300 mb-2">
                Status: {isTyping ? '⏳ Reflecting...' : '✅ Ready'} |
                Messages: {messages.length}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(inputMessage);
                    }
                  }}
                  placeholder={isTyping ? 'Character is thinking...' : `Discuss journey with ${selected_character?.name}...`}
                  disabled={isTyping}
                  className="flex-1 bg-gray-700 border border-green-500/30 rounded-full px-4 py-2 text-white placeholder-green-200/50 focus:outline-none focus:border-green-400 disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-500 text-white p-2 rounded-full transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
