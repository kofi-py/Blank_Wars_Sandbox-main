'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import {
  MessageCircle, Clock, AlertTriangle, Heart, Brain,
  Users, Target, CheckCircle, XCircle, Pause, Play,
  TrendingUp, TrendingDown, Activity, Zap
} from 'lucide-react';

import { BattleCharacter, CoachingTimeout, TimeoutAction } from '@/data/battleFlow';

interface CoachingInterfaceProps {
  character: BattleCharacter;
  is_timeout_active?: boolean;
  time_remaining?: number;
  onCoachingAction: (action: CoachingAction) => void;
  onCloseCoaching: () => void;
}

interface CoachingAction {
  type: 'motivational_speech' | 'tactical_adjustment' | 'conflict_resolution' | 'confidence_boost' | 'mental_health_support';
  target_characters: string[];
  message: string;
  intensity: 'gentle' | 'firm' | 'intense';
}

interface CoachingSessionData {
  coaching_messages: string[];
  character_responses: string[];
  session_active: boolean;
  session_type: string;
  time_spent: number;
  effectiveness: number;
}

export default function CoachingInterface({
  character,
  is_timeout_active = false,
  time_remaining = 0,
  onCoachingAction,
  onCloseCoaching
}: CoachingInterfaceProps) {
  const { isMobile } = useMobileSafeMotion();
  const [sessionData, setSessionData] = useState<CoachingSessionData>({
    coaching_messages: [],
    character_responses: [],
    session_active: false,
    session_type: '',
    time_spent: 0,
    effectiveness: 0
  });

  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedCoachingType, setSelectedCoachingType] = useState<CoachingAction['type'] | null>(null);
  const [selectedIntensity, setSelectedIntensity] = useState<CoachingAction['intensity']>('gentle');
  const [isCharacterTyping, setIsCharacterTyping] = useState(false);
  const [showEffectivenessMetrics, setShowEffectivenessMetrics] = useState(false);

  // Simulate character response based on their psychology
  const generateCharacterResponse = (coachingType: string, message: string, intensity: string): string => {
    const mental = character.mental_state;
    const personality_traits = character.character.personality_traits || [];

    // High stress characters respond differently
    if (mental.stress > 70) {
      if (intensity === 'intense') {
        return "I can't handle pressure right now! Give me space!";
      } else if (coachingType === 'mental_health_support') {
        return "Thank you... I really needed to hear that.";
      }
    }

    // Low gameplan adherence characters are more resistant
    if (character.gameplan_adherence < 40) {
      if (intensity === 'firm' || intensity === 'intense') {
        return "You can't tell me what to do! I know what I'm doing!";
      } else {
        return "I'll consider it, but I still think my way is better.";
      }
    }

    // High ego characters
    if (personality_traits.includes('Prideful')) {
      if (coachingType === 'confidence_boost') {
        return "Of course I'm great! Tell me something I don't know.";
      } else if (coachingType === 'tactical_adjustment') {
        return "Your strategy is... adequate. I'll make it work.";
      }
    }

    // Default positive responses for well-adjusted characters
    const positiveResponses = [
      "I understand, coach. I'll do my best.",
      "That makes sense. Thanks for the guidance.",
      "You're right. Let me adjust my approach.",
      "I appreciate the coaching. I'll implement that.",
      "Good point. I was getting too caught up in the moment."
    ];

    return positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
  };

  const handleCoachingAction = async (type: CoachingAction['type'], message: string) => {
    if (!message.trim()) return;

    // Add coach message
    setSessionData(prev => ({
      ...prev,
      coaching_messages: [...prev.coaching_messages, message],
      session_active: true,
      session_type: type,
      time_spent: prev.time_spent + 1
    }));

    setIsCharacterTyping(true);

    // Real API call to individual coaching service
    const sendCoachingRequest = async () => {
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

        const response = await fetch(`${BACKEND_URL}/coaching/individual`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            character_id: character.character.id,
            message,
            type,
            intensity: selectedIntensity,
            context: {
              mental_state: character.mental_state,
              team_trust: character.mental_state.team_trust,
              previous_messages: sessionData.character_responses.slice(-3)
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setSessionData(prev => ({
          ...prev,
          character_responses: [...prev.character_responses, data.message],
          effectiveness: calculateEffectiveness(type, selectedIntensity, character)
        }));

        setIsCharacterTyping(false);
      } catch (error) {
        console.error('Individual coaching error:', error);
        // Fallback to ensure UI doesn't break
        setSessionData(prev => ({
          ...prev,
          character_responses: [...prev.character_responses, "I'm having trouble responding right now. Please try again."],
          effectiveness: calculateEffectiveness(type, selectedIntensity, character)
        }));
        setIsCharacterTyping(false);
      }
    };

    sendCoachingRequest();

    // Trigger parent callback
    onCoachingAction({
      type,
      target_characters: [character.character.id],
      message,
      intensity: selectedIntensity
    });

    setCurrentMessage('');
  };

  const calculateEffectiveness = (type: string, intensity: string, char: BattleCharacter): number => {
    let effectiveness = 50; // Base effectiveness

    const mental = char.mental_state;
    const gameplan_adherence = char.gameplan_adherence;

    // Adjust based on character state
    if (mental.stress > 70 && type === 'mental_health_support') effectiveness += 30;
    if (mental.current_mental_health < 40 && type === 'confidence_boost') effectiveness += 25;
    if (gameplan_adherence < 50 && intensity === 'gentle') effectiveness += 20;
    if (gameplan_adherence > 80 && intensity === 'firm') effectiveness += 15;

    // Adjust based on personality
    const traits = char.character.personality_traits || [];
    if (traits.includes('Loyal') && type === 'motivational_speech') effectiveness += 20;
    if (traits.includes('Stubborn') && intensity === 'intense') effectiveness -= 25;
    if (traits.includes('Analytical') && type === 'tactical_adjustment') effectiveness += 15;

    return Math.max(10, Math.min(100, effectiveness));
  };

  const getCoachingOptions = () => {
    const options = [];
    const mental = character.mental_state;

    // Mental Health Support (always available but more effective when needed)
    options.push({
      type: 'mental_health_support' as const,
      title: '🧠 Mental Health Support',
      description: 'Address psychological stress and trauma',
      urgency: mental.current_mental_health < 40 ? 'high' : mental.current_mental_health < 70 ? 'medium' : 'low',
      effectiveness: calculateEffectiveness('mental_health_support', selectedIntensity, character)
    });

    // Motivational Speech
    options.push({
      type: 'motivational_speech' as const,
      title: '🎯 Motivational Speech',
      description: 'Boost morale and fighting spirit',
      urgency: mental.confidence < 50 ? 'high' : 'medium',
      effectiveness: calculateEffectiveness('motivational_speech', selectedIntensity, character)
    });

    // Tactical Adjustment
    options.push({
      type: 'tactical_adjustment' as const,
      title: '📋 Tactical Adjustment',
      description: 'Refine strategy and approach',
      urgency: character.battle_performance.strategy_deviations > 0 ? 'high' : 'medium',
      effectiveness: calculateEffectiveness('tactical_adjustment', selectedIntensity, character)
    });

    // Conflict Resolution (if there are relationship issues)
    const hasConflicts = character.relationship_modifiers.some(rel => rel.strength < -30);
    if (hasConflicts) {
      options.push({
        type: 'conflict_resolution' as const,
        title: '🤝 Conflict Resolution',
        description: 'Address team relationship issues',
        urgency: 'high',
        effectiveness: calculateEffectiveness('conflict_resolution', selectedIntensity, character)
      });
    }

    // Confidence Boost
    options.push({
      type: 'confidence_boost' as const,
      title: '✨ Confidence Boost',
      description: 'Reinforce self-belief and capabilities',
      urgency: mental.confidence < 40 ? 'high' : 'low',
      effectiveness: calculateEffectiveness('confidence_boost', selectedIntensity, character)
    });

    return options.sort((a, b) => {
      const urgencyOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-red-500/50 bg-red-600/20';
      case 'medium': return 'border-yellow-500/50 bg-yellow-600/20';
      case 'low': return 'border-green-500/50 bg-green-600/20';
      default: return 'border-gray-500/50 bg-gray-600/20';
    }
  };

  const coachingOptions = getCoachingOptions();

  return (
    <SafeMotion
      as="div"
      class_name="bg-gradient-to-r from-green-900/40 to-blue-900/40 rounded-xl p-6 backdrop-blur-sm border border-green-500"
      initial={{ opacity: 0, y: isMobile ? 10 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isMobile ? 0.2 : 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{character.character.avatar}</div>
          <div>
            <h2 className="text-xl font-bold text-white">Coaching: {character.character.name}</h2>
            <p className="text-green-200">
              {is_timeout_active ? 'Timeout Session' : 'Individual Coaching'}
            </p>
          </div>
        </div>

        {/* Timer and Controls */}
        <div className="flex items-center gap-4">
          {is_timeout_active && time_remaining > 0 && (
            <div className="bg-yellow-600 text-white px-3 py-1 rounded-lg font-bold">
              <Clock className="w-4 h-4 inline mr-1" />
              {time_remaining}s
            </div>
          )}

          <button
            onClick={() => setShowEffectivenessMetrics(!showEffectivenessMetrics)}
            className="p-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-lg transition-all"
            title="Toggle Metrics"
          >
            <Activity className="w-4 h-4 text-blue-400" />
          </button>

          <button
            onClick={onCloseCoaching}
            className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-all"
          >
            <XCircle className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Character Psychology Status */}
        <div className="bg-black/40 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Psychology Status
          </h3>

          <div className="space-y-3">
            {/* Mental Health */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-400">Mental Health</span>
                <span className={`text-sm font-bold ${
                  character.mental_state.current_mental_health >= 70 ? 'text-green-400' :
                  character.mental_state.current_mental_health >= 40 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {character.mental_state.current_mental_health}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    character.mental_state.current_mental_health >= 70 ? 'bg-green-500' :
                    character.mental_state.current_mental_health >= 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${character.mental_state.current_mental_health}%` }}
                />
              </div>
            </div>

            {/* Stress Level */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-400">Stress Level</span>
                <span className="text-sm font-bold text-red-400">
                  {character.mental_state.stress}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${character.mental_state.stress}%` }}
                />
              </div>
            </div>

            {/* Strategy Adherence Level */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-400">Strategy Adherence</span>
                <span className={`text-sm font-bold ${
                  character.gameplan_adherence >= 70 ? 'text-blue-400' :
                  character.gameplan_adherence >= 40 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {character.gameplan_adherence}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    character.gameplan_adherence >= 70 ? 'bg-blue-500' :
                    character.gameplan_adherence >= 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${character.gameplan_adherence}%` }}
                />
              </div>
            </div>

            {/* Team Trust */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-400">Team Trust</span>
                <span className="text-sm font-bold text-purple-400">
                  {character.mental_state.team_trust}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all"
                  style={{ width: `${character.mental_state.team_trust}%` }}
                />
              </div>
            </div>
          </div>

          {/* Personality Traits */}
          <div className="mt-4 pt-4 border-t border-gray-600">
            <h4 className="text-sm font-semibold text-white mb-2">Personality</h4>
            <div className="flex flex-wrap gap-1">
              {(character.character.personality_traits || []).slice(0, 4).map((trait, idx) => (
                <span key={idx} className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Coaching Options */}
        <div className="bg-black/40 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Coaching Options
          </h3>

          {/* Intensity Selector */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Coaching Intensity:</label>
            <div className="flex gap-2">
              {['gentle', 'firm', 'intense'].map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => setSelectedIntensity(intensity as CoachingAction['intensity'])}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    selectedIntensity === intensity
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Coaching Action Buttons */}
          <div className="space-y-2">
            {coachingOptions.map((option, idx) => (
              <button
                key={option.type}
                onClick={() => setSelectedCoachingType(option.type)}
                className={`w-full p-3 rounded-lg text-left transition-all border ${
                  selectedCoachingType === option.type
                    ? 'bg-blue-600/30 border-blue-500'
                    : getUrgencyColor(option.urgency)
                } hover:opacity-80`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="text-white font-medium text-sm">{option.title}</div>
                  <div className="flex items-center gap-1">
                    {option.urgency === 'high' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    <span className="text-xs text-gray-400">{option.effectiveness}%</span>
                  </div>
                </div>
                <div className="text-gray-400 text-xs">{option.description}</div>
              </button>
            ))}
          </div>

          {/* Custom Message Input */}
          {selectedCoachingType && (
            <SafeMotion
              as="div"
              class_name="mt-4 pt-4 border-t border-gray-600"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label className="text-sm text-gray-400 mb-2 block">Your Message:</label>
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder={`Type your ${selectedCoachingType.replace('_', ' ')} message...`}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm resize-none"
                rows={3}
              />
              <button
                onClick={() => handleCoachingAction(selectedCoachingType, currentMessage)}
                disabled={!currentMessage.trim() || isCharacterTyping}
                className="w-full mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-medium transition-all"
              >
                {isCharacterTyping ? 'Character Responding...' : 'Send Coaching Message'}
              </button>
            </SafeMotion>
          )}
        </div>

        {/* Conversation & Metrics */}
        <div className="bg-black/40 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Session Log
          </h3>

          {/* Effectiveness Metrics */}
          {showEffectivenessMetrics && sessionData.session_active && (
            <SafeMotion
              as="div"
              class_name="mb-4 p-3 bg-blue-600/20 rounded border border-blue-500/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <h4 className="text-sm font-semibold text-white mb-2">Session Metrics</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Effectiveness:</span>
                  <span className={`font-bold ${
                    sessionData.effectiveness >= 70 ? 'text-green-400' :
                    sessionData.effectiveness >= 40 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {sessionData.effectiveness}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time Spent:</span>
                  <span className="text-blue-400">{sessionData.time_spent}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Messages:</span>
                  <span className="text-purple-400">{sessionData.coaching_messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-gray-300 capitalize">{sessionData.session_type.replace('_', ' ')}</span>
                </div>
              </div>
            </SafeMotion>
          )}

          {/* Conversation History */}
          <div className="h-64 overflow-y-auto space-y-2">
            {sessionData.coaching_messages.length === 0 ? (
              <div className="text-gray-400 text-center py-8 text-sm">
                Start a coaching conversation...
              </div>
            ) : (
              sessionData.coaching_messages.map((message, idx) => (
                <div key={idx} className="space-y-2">
                  {/* Coach Message */}
                  <SafeMotion
                    as="div"
                    class_name="bg-green-600/20 border-l-4 border-green-500 p-2 rounded-r"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="text-xs text-green-400 mb-1">Coach:</div>
                    <div className="text-white text-sm">{message}</div>
                  </SafeMotion>

                  {/* Character Response */}
                  {sessionData.character_responses[idx] && (
                    <SafeMotion
                      as="div"
                      class_name="bg-blue-600/20 border-l-4 border-blue-500 p-2 rounded-r ml-4"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="text-xs text-blue-400 mb-1">{character.character.name}:</div>
                      <div className="text-white text-sm">{sessionData.character_responses[idx]}</div>
                    </SafeMotion>
                  )}
                </div>
              ))
            )}

            {/* Character Typing Indicator */}
            {isCharacterTyping && (
              <SafeMotion
                as="div"
                class_name="bg-gray-600/20 border-l-4 border-gray-500 p-2 rounded-r ml-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-xs text-gray-400 mb-1">{character.character.name}:</div>
                <div className="text-gray-300 text-sm italic">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </SafeMotion>
            )}
          </div>
        </div>
      </div>
    </SafeMotion>
  );
}
