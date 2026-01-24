'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee,
  Users,
  Send,
  MessageCircle,
  Briefcase,
  Gavel,
  Heart,
  Dumbbell,
  Mic,
  Home,
  RefreshCw,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import EmployeeLoungeService, {
  StaffRole,
  StaffMember,
  LoungeMessage,
  LoungeSession
} from '../services/employeeLoungeService';

interface EmployeeLoungeProps {
  coach_name: string;
}

// Role configuration for display
const ROLE_CONFIG: Record<StaffRole, { label: string; icon: typeof Briefcase; color: string; bgColor: string }> = {
  mascot: { label: 'Mascot', icon: Briefcase, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  judge: { label: 'Judge', icon: Gavel, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  therapist: { label: 'Therapist', icon: Heart, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  trainer: { label: 'Trainer', icon: Dumbbell, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  host: { label: 'Host', icon: Mic, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  real_estate_agent: { label: 'Real Estate', icon: Home, color: 'text-green-400', bgColor: 'bg-green-500/20' }
};

const STAFF_ROLES: StaffRole[] = ['mascot', 'judge', 'therapist', 'trainer', 'host', 'real_estate_agent'];

export default function EmployeeLounge({ coach_name }: EmployeeLoungeProps) {
  const [session, setSession] = useState<LoungeSession | null>(null);
  const [messages, setMessages] = useState<LoungeMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<StaffRole>>(
    new Set(['mascot', 'therapist', 'trainer'])
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<EmployeeLoungeService>(EmployeeLoungeService.getInstance());

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session and generate opening
  const initializeSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    const service = serviceRef.current;
    const newSession = await service.initializeSession(coach_name);
    setSession(newSession);
    setMessages([]);
    setLoading(false);

    // Auto-generate opening conversation
    setGenerating(true);
    await service.generateOpeningScene((msg) => {
      setMessages(prev => [...prev, msg]);
    });
    setGenerating(false);
  }, [coach_name]);

  // Initial load
  useEffect(() => {
    initializeSession().catch((err) => {
      setError(err.message);
      setLoading(false);
      setGenerating(false);
    });

    return () => {
      serviceRef.current.endSession();
    };
  }, [initializeSession]);

  // Toggle participant selection
  const toggleParticipant = (role: StaffRole) => {
    const newSelected = new Set(selectedParticipants);
    if (newSelected.has(role)) {
      // Don't allow less than 2 participants
      if (newSelected.size > 2) {
        newSelected.delete(role);
      }
    } else {
      newSelected.add(role);
    }
    setSelectedParticipants(newSelected);

    // Update service
    const service = serviceRef.current;
    service.setActiveParticipants(Array.from(newSelected));
  };

  // Send coach message
  const sendMessage = async () => {
    if (!userInput.trim() || generating) return;
    if (!session) return;

    const messageContent = userInput.trim();
    setUserInput('');
    setGenerating(true);
    setError(null);

    const service = serviceRef.current;
    await service.sendGroupMessage(messageContent, (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    setGenerating(false);
  };

  // Continue conversation
  const continueConversation = async () => {
    if (generating || !session) return;

    setGenerating(true);
    setError(null);

    const service = serviceRef.current;
    await service.continueConversation((msg) => {
      setMessages(prev => [...prev, msg]);
    });

    setGenerating(false);
  };

  // Handle send on Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage().catch(err => {
        setError(err.message);
        setGenerating(false);
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-xl p-8">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-gray-400">Loading Employee Lounge...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-xl p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={() => initializeSession().catch(err => setError(err.message))}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Group messages by round for display
  const messagesByRound = messages.reduce((acc, msg) => {
    const round = msg.round || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(msg);
    return acc;
  }, {} as Record<number, LoungeMessage[]>);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coffee className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Employee Lounge</h2>
            <span className="text-sm text-gray-400">
              {session.team_context.team_name} Staff Break Room
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-400">{selectedParticipants.size} chatting</span>
          </div>
        </div>
      </div>

      {/* Staff Selection Bar */}
      <div className="bg-gray-800/50 border-b border-gray-700 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400">Who&apos;s chatting (min 2):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.staff.map((member) => {
            const config = ROLE_CONFIG[member.role];
            const Icon = config.icon;
            const isSelected = selectedParticipants.has(member.role);
            const displayName = member.name.length > 12 ? member.name.slice(0, 10) + '...' : member.name;

            return (
              <button
                key={member.userchar_id}
                onClick={() => toggleParticipant(member.role)}
                disabled={generating}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                  isSelected
                    ? `${config.bgColor} border-${config.color.split('-')[1]}-500/50`
                    : 'bg-gray-800 border-gray-700 opacity-50'
                } ${generating ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-100'}`}
                title={`${member.name} (${config.label})`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? config.color : 'text-gray-500'}`} />
                <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                  {displayName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && !generating ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">Welcome to the Employee Lounge</p>
            <p className="text-gray-500 text-sm mt-2">
              Staff are starting to chat...
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {Object.entries(messagesByRound).map(([round, roundMessages]) => (
              <div key={round} className="space-y-3">
                {/* Round indicator */}
                {parseInt(round) > 1 && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-xs text-gray-500">Round {round}</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>
                )}

                {/* Messages in this round */}
                {roundMessages.map((message) => {
                  const isCoach = message.speaker_role === 'coach';
                  const roleConfig = !isCoach ? ROLE_CONFIG[message.speaker_role as StaffRole] : null;
                  const Icon = roleConfig?.icon;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl p-3 ${
                          isCoach
                            ? 'bg-blue-600 text-white'
                            : `bg-gray-800 border border-gray-700`
                        }`}
                      >
                        {/* Speaker Header */}
                        <div className="flex items-center gap-2 mb-1">
                          {Icon && <Icon className={`w-4 h-4 ${roleConfig?.color}`} />}
                          <span className={`text-sm font-medium ${isCoach ? 'text-blue-200' : (roleConfig ? roleConfig.color : 'text-gray-300')}`}>
                            {message.speaker_name}
                          </span>
                        </div>
                        {/* Message Content */}
                        <p className={`text-sm ${isCoach ? 'text-white' : 'text-gray-200'}`}>
                          {message.content}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </AnimatePresence>
        )}

        {/* Generating indicator */}
        {generating && (
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Staff are chatting...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        {/* Error display */}
        {error && (
          <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Continue button */}
        <div className="flex justify-center mb-3">
          <button
            onClick={() => continueConversation().catch(err => {
              setError(err.message);
              setGenerating(false);
            })}
            disabled={generating || messages.length === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg text-gray-300 text-sm flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Continue Conversation
          </button>
        </div>

        {/* Message Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Say something to your staff..."
            disabled={generating}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage().catch(err => {
              setError(err.message);
              setGenerating(false);
            })}
            disabled={generating || !userInput.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-medium flex items-center gap-2"
          >
            {generating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
