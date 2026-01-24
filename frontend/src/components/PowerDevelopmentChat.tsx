'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Zap, Star, Sparkles } from 'lucide-react';
import { sendViaAIChat } from '../services/chatAdapter';
import { Contestant } from '@blankwars/types';

interface Message {
  id: number;
  type: 'coach' | 'contestant';
  message: string;
  timestamp: Date;
  bond_increase?: boolean;
  speaker_name: string;
  speaker_id: string;
}

interface PowerDevelopmentChatProps {
  selected_characterId: string;
  onCharacterChange?: (character_id: string) => void;
  selected_character: Contestant;
  available_characters: Contestant[];
  coach_name: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function PowerDevelopmentChat({
  selected_characterId,
  onCharacterChange,
  selected_character,
  available_characters,
  coach_name
}: PowerDevelopmentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  // Generate quick messages for power development
  const quickMessages = [
    "What powers should I prioritize?",
    "How should I spend my character points?",
    "Which tier should I focus on?",
    "Should I unlock new powers or rank up existing ones?",
    "What powers fit my fighting style?"
  ];

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping || !selected_character) return;
    if (!selected_character.name) {
      throw new Error('STRICT MODE: selected_character.name is required for powers chat');
    }
    if (!selected_character.character_id) {
      throw new Error(`STRICT MODE: selected_character.character_id is required for powers chat`);
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

    try {
      const chat_id = `powers_${selected_character.id}`;
      const result = await sendViaAIChat(chat_id, {
        agent_key: selected_character.character_id,
        character: selected_character.character_id,
        userchar_id: selected_character.id,
        chat_type: 'powers',
        domain: 'powers',
        message: content,
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
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickMessage = (message: string) => {
    sendMessage(message);
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30 mb-6">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          Power Development Chat
        </h2>
        <p className="text-gray-400 text-sm">
          Discuss power choices and development strategy with {selected_character?.name || 'your character'}
        </p>
      </div>

      {/* Quick Messages */}
      <div className="mb-4 flex flex-wrap gap-2">
        {quickMessages.map((msg, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickMessage(msg)}
            disabled={isTyping}
            className="px-3 py-1.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="bg-gray-900/50 rounded-lg p-4 mb-4 h-64 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Start a conversation about power development</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${message.type === 'coach' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${message.type === 'coach'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
                }`}
            >
              <div className="flex items-start gap-2">
                {message.type === 'contestant' && (
                  <span className="text-2xl">{selected_character?.avatar || '⚔️'}</span>
                )}
                <div>
                  <p className="text-sm">{message.message}</p>
                  {message.bond_increase && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-pink-300">
                      <Star className="w-3 h-3" fill="currentColor" />
                      <span>Bond increased!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="mb-4 flex justify-start">
            <div className="bg-gray-700 text-gray-100 p-3 rounded-lg flex items-center gap-2">
              <span className="text-2xl">{selected_character?.avatar || '⚔️'}</span>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
          placeholder="Ask about power development..."
          disabled={isTyping}
          className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(inputMessage)}
          disabled={isTyping || !inputMessage.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
