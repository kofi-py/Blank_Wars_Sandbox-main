'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Heart } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  type: 'player' | 'contestant';
  content: string;
  timestamp: Date;
}

export default function SimpleChatDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'contestant',
      content: 'Greetings, noble warrior! I am Achilles, greatest of the Greek heroes. Ready to forge our legend together?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [is_loading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = 'http://localhost:4000';
    console.log('🔌 Connecting to:', socketUrl);

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected');
    });

    socketRef.current.on('chat_response', (data: unknown) => {
      console.log('📨 Received response:', data);

      const response = data as { message?: string };
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'contestant',
        content: response.message || 'I must gather my thoughts...',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newMessage]);
      setIsLoading(false);
    });

    socketRef.current.on('chat_error', (error: unknown) => {
      console.error('❌ Chat error:', error);
      setIsLoading(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const content = inputMessage.trim();
    if (!content || is_loading || !socketRef.current?.connected) return;

    // Add player message immediately
    const playerMessage: Message = {
      id: Date.now().toString(),
      type: 'player',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, playerMessage]);
    setInputMessage('');
    setIsLoading(true);

    console.log('📤 Sending message:', content);

    // Send to backend
    socketRef.current.emit('chat_message', {
      message: content,
      character: '1',
      character_data: {
        name: 'Achilles',
        personality: {
          traits: ['Brave', 'Honorable', 'Fierce'],
          speech_style: 'Epic and heroic, befitting a legendary warrior',
          motivations: ['Glory', 'Honor', 'Victory'],
          fears: ['Dishonor', 'Weakness', 'Betrayal']
        },
        bond_level: 3
      },
      previous_messages: messages.slice(-5).map(m => ({
        role: m.type === 'player' ? 'user' : 'assistant',
        content: m.content
      }))
    });

    // Safety timeout
    setTimeout(() => {
      if (is_loading) {
        console.log('⏰ Response timeout - resetting');
        setIsLoading(false);
      }
    }, 15000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="text-3xl">⚔️</div>
          <div>
            <h2 className="text-xl font-bold text-white">Achilles</h2>
            <p className="text-gray-400">Hero of Troy</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            <span className="text-gray-300">Bond Level 3</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'player' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.type === 'player'
                  ? 'bg-blue-600 text-white'
                  : 'bg-purple-600 text-white'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {is_loading && (
          <div className="flex justify-start">
            <div className="bg-purple-600 text-white px-4 py-2 rounded-lg">
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
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        {/* Debug info */}
        <div className="text-xs text-gray-500 mb-2">
          Status: {socketRef.current?.connected ? '🟢 Connected' : '🔴 Disconnected'} |
          {is_loading ? ' ⏳ AI Responding...' : ' ✅ Ready'} |
          Messages: {messages.length}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={is_loading ? 'AI is responding...' : 'Message Achilles...'}
            disabled={is_loading}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || is_loading || !socketRef.current?.connected}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white p-2 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
