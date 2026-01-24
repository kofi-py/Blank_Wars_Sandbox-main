'use client';

import React, { useState, useEffect, useRef } from 'react';
import SafeMotion from './SafeMotion';
import {
  Dumbbell,
  Target,
  Brain,
  Zap,
  Clock,
  Star,
  TrendingUp,
  Play,
  Pause,
  Award,
  Coins,
  Battery,
  Heart,
  Sparkles,
  BookOpen,
  MessageCircle,
  Send,
  User,
  Users,
} from 'lucide-react';
import { memberships, MembershipTier, get_training_multipliers, get_daily_limits, FacilityType } from '@/data/memberships';
import { sendViaAIChat } from '@/services/chatAdapter';
import PersonalTrainerChat from './PersonalTrainerChat';
import { Contestant } from '@blankwars/types';
import axios from 'axios';
import { getCharacterImageSet } from '@/utils/characterImageUtils';

// Helper to get current time of day
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Multi-agent training chat via HTTP
// Makes separate calls for trainer (Argock) and trainee (character)
async function sendTrainingChat(
  character: Contestant,
  userchar_id: string,
  message: string,
  training_context: {
    training_phase: string;
    facility_tier: string;
    session_duration: number;
    available_equipment: string[];
    intensity_level: 'light' | 'moderate' | 'intense';
  },
  include_character_response: boolean = true
): Promise<Array<{ agent_type: string; agent_name: string; message: string }>> {
  const responses: Array<{ agent_type: string; agent_name: string; message: string }> = [];

  const base_payload = {
    domain: 'training',
    message,
    userchar_id,
    intensity_level: training_context.intensity_level,
    training_phase: training_context.training_phase,
    session_duration: training_context.session_duration,
    time_of_day: getTimeOfDay(),
    facility_tier: training_context.facility_tier,
    available_equipment: training_context.available_equipment,
    participant_ids: [userchar_id],
    trainer_id: 'argock',
  };

  // Call 1: Get Argock (trainer) response
  try {
    const argock_result = await sendViaAIChat('training', {
      ...base_payload,
      agent_key: 'argock',
      character: 'argock',
    });
    responses.push({
      agent_type: 'argock',
      agent_name: 'Argock the Inspirerer',
      message: argock_result.text,
    });
  } catch (error) {
    console.error('[Training HTTP] Argock call failed:', error);
    throw error;
  }

  // Call 2: Get character (trainee) response
  if (include_character_response) {
    if (!character.character_id) {
      throw new Error(`STRICT MODE: character_id missing for character "${character.name}"`);
    }
    try {
      const character_result = await sendViaAIChat('training', {
        ...base_payload,
        agent_key: character.character_id,
        character: character.character_id,
      });
      responses.push({
        agent_type: 'contestant',
        agent_name: character.name,
        message: character_result.text,
      });
    } catch (error) {
      console.error('[Training HTTP] Character call failed:', error);
      throw error;
    }
  }

  return responses;
}

const BACKEND_URL = (() => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:4000';
    }
    throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set. Cannot initialize TrainingGrounds.');
  }
  return url;
})();

interface TrainingActivity {
  id: string;
  name: string;
  description: string;
  type: 'strength' | 'defense' | 'speed' | 'special' | 'endurance';
  duration: number; // in seconds
  energy_cost: number;
  xp_gain: number;
  stat_bonus: number;
  icon: React.ComponentType<{ className?: string }>;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  requirements: {
    level: number;
    archetype?: string[];
  };
  training_points_gain?: number;
}

interface TrainingGroundsProps {
  global_selected_character_id: string;
  setGlobalSelectedCharacterId: (id: string) => void;
  selected_character: Contestant;
  available_characters: Contestant[];
}

export default function TrainingGrounds({
  global_selected_character_id,
  setGlobalSelectedCharacterId,
  selected_character: global_character,
  available_characters
}: TrainingGroundsProps) {
  // Convert global character to training character format and make it state
  const [selected_character, setSelectedCharacter] = useState<Contestant | null>(null);

  // Track previous character to prevent duplicate auto-triggers
  const [previous_character_id, setPreviousCharacterId] = useState<string>('');
  const [is_auto_analyzing, setIsAutoAnalyzing] = useState(false);
  const [last_analyzed_character, setLastAnalyzedCharacter] = useState<string>('');

  // Ref to store analysis timeout
  const analysis_timeout_ref = useRef<NodeJS.Timeout | null>(null);

  // Update selected character when global character changes and trigger Argock analysis
  useEffect(() => {
    if (!global_character) {
      console.error('❌ No global_character provided - Training requires real character from API');
      setSelectedCharacter(null);
      return;
    }

    setSelectedCharacter(global_character);

    // Only trigger Argock analysis if character actually changed
    if (global_character.id !== previous_character_id) {
      console.log('🔄 Character changed from', previous_character_id, 'to', global_character.id);
      setPreviousCharacterId(global_character.id);

      // Clear chat when character changes to start fresh
      setChatMessages([]);

      // Reset analysis tracking for new character
      setLastAnalyzedCharacter('');

      // Clear any pending analysis timeout to prevent duplicates
      if (analysis_timeout_ref.current) {
        clearTimeout(analysis_timeout_ref.current);
      }

      // Trigger analysis after a short delay to ensure state is settled
      analysis_timeout_ref.current = setTimeout(() => {
        trigger_argock_analysis(global_character);
        analysis_timeout_ref.current = null;
      }, 500);
    }

    // Cleanup timeout on unmount
    return () => {
      if (analysis_timeout_ref.current) {
        clearTimeout(analysis_timeout_ref.current);
      }
    };
  }, [global_character]);


  // Auto-trigger Argock analysis when character is selected
  const trigger_argock_analysis = async (character: Contestant) => {
    if (is_auto_analyzing) {
      console.log('🚫 Already auto-analyzing, skipping...');
      return;
    }

    // Prevent duplicate analysis for the same character
    if (last_analyzed_character === character.id) {
      console.log('🚫 Character already analyzed, skipping duplicate:', character.name);
      return;
    }

    console.log('🎯 Triggering Argock analysis for:', character.name, character.id);
    setLastAnalyzedCharacter(character.id);

    setIsAutoAnalyzing(true);

    try {
      // Get userchar_id from character.id (the user_character UUID) - STRICT MODE
      if (!character.id) {
        throw new Error(`STRICT MODE: character.id missing for character "${character.name}"`);
      }
      const userchar_id = character.id;

      console.log('🤖 Calling training HTTP endpoint for auto-analysis...');

      // Get Argock's immediate analysis with HTTP call
      const agent_responses = await sendTrainingChat(
        character,
        userchar_id,
        `${character.name} just walked into the training facility`,
        {
          training_phase: training_phase,
          facility_tier: selected_facility,
          session_duration: 0,
          available_equipment: ['Weights', 'Treadmill', 'Combat dummies', 'Resistance bands'],
          intensity_level: 'moderate',
        },
        true // include character response
      );

      console.log('✅ Auto-analysis responses received:', agent_responses.length, agent_responses);

      // Add Argock's analysis to chat - but only ONCE
      agent_responses.forEach((agent, index) => {
        const message_id = `auto_${agent.agent_type}_${character.id}_${Date.now()}_${index}`;
        const analysis_message = {
          id: message_id,
          sender: agent.agent_type as 'contestant' | 'argock',
          message: agent.message,
          timestamp: new Date(),
          character_name: agent.agent_name,
          agent_type: agent.agent_type,
          agent_name: agent.agent_name
        };
        console.log('📝 Adding auto-analysis message:', message_id, 'Message:', agent.message.substring(0, 50) + '...');

        // Check for duplicate auto-analysis messages - prevent multiple Argock initial analyses
        setChatMessages(prev => {
          // For auto-analysis, check if there's already an Argock message for this character
          const has_argock_analysis_for_character = prev.some(msg =>
            msg.agent_type === 'argock' &&
            msg.id?.includes(`auto_argock_${character.id}`)
          );

          if (has_argock_analysis_for_character && message_id.includes('auto_argock')) {
            console.warn('🚫 Argock auto-analysis already exists for character, skipping:', character.name);
            return prev;
          }

          // Also check for recent similar content to prevent rapid duplicates
          const is_duplicate = prev.some(msg =>
            msg.message === analysis_message.message &&
            msg.agent_type === analysis_message.agent_type &&
            Math.abs(msg.timestamp.getTime() - analysis_message.timestamp.getTime()) < 5000 // within 5 seconds
          );

          if (is_duplicate) {
            console.warn('🚫 Duplicate message content detected, skipping:', message_id);
            return prev;
          }

          return [...prev, analysis_message];
        });
      });

    } catch (error) {
      console.error('Auto-trigger Argock analysis error:', error);
      // No fallback message - let manual chat handle it
    } finally {
      setIsAutoAnalyzing(false);
    }
  };

  const [is_training, setIsTraining] = useState(false);
  const [current_activity, setCurrentActivity] = useState<TrainingActivity | null>(null);
  const [training_progress, setTrainingProgress] = useState(0);
  const [training_time_left, setTrainingTimeLeft] = useState(0);
  // Removed tabs - TrainingGrounds now focuses only on training activities
  const [membership_tier] = useState<MembershipTier>('free');
  const [selected_facility] = useState<FacilityType>('community');
  const [daily_training_sessions, setDailyTrainingSessions] = useState(0);
  const [daily_energy_refills, setDailyEnergyRefills] = useState(0);
  const [training_points, setTrainingPoints] = useState(0);

  // Training chat state
  // Training phases: 'planning' | 'active' | 'recovery'
  const [training_phase, setTrainingPhase] = useState<'planning' | 'active' | 'recovery'>('planning');
  const [show_training_chat, setShowTrainingChat] = useState(true); // Always show for Argock
  const [session_start_time, setSessionStartTime] = useState<Date | null>(null);
  const [chat_messages, setChatMessages] = useState<Array<{
    id: string;
    sender: 'coach' | 'contestant' | 'argock';
    message: string;
    timestamp: Date;
    character_name?: string;
    agent_type?: string;
    agent_name?: string;
  }>>([]);
  const [current_chat_message, setCurrentChatMessage] = useState('');
  const [is_chat_loading, setIsChatLoading] = useState(false);

  // Generate character-specific progressive training activities
  const generate_character_training_activities = (character: Contestant): TrainingActivity[] => {
    // ARCHIVED: Legacy exercise template system removed 2024-12-30
    // The old system used 'type: special' which has no database column (current_special doesn't exist)
    // Valid stat types are: strength, attack, defense, speed, endurance, intelligence, wisdom, spirit, dexterity, magic_attack, magic_defense
    // New training features need to be built with proper stat mappings
    // See: backend/src/services/trainingService.ts line 250-261 for how stat_type maps to current_{stat_type} column
    // Legacy exercise system archived - see TrainingGrounds.legacy-exercises.backup.ts
    return [];
  };

  // Get character-specific training activities
  const training_activities: TrainingActivity[] = selected_character ?
    generate_character_training_activities(selected_character) : [];

  // Check membership limits
  const membership_limits = get_daily_limits(membership_tier);
  const can_train = () => {
    if (membership_limits.daily_training_sessions === 'unlimited') return true;
    return daily_training_sessions < membership_limits.daily_training_sessions;
  };


  // Available activities based on character and membership
  const available_activities = selected_character ? training_activities.filter(activity => {
    const meets_level = selected_character.level >= activity.requirements.level;
    const meets_archetype = !activity.requirements.archetype ||
      activity.requirements.archetype.includes(selected_character.archetype);
    const has_energy = selected_character.energy >= activity.energy_cost;
    const within_limits = can_train();

    // Skill activities require membership access
    return meets_level && meets_archetype && has_energy && within_limits;
  }) : [];

  // Start training
  const start_training = async (activity: TrainingActivity) => {
    if (!selected_character || selected_character.energy < activity.energy_cost) return;
    if (!can_train()) return;

    try {
      console.log('🏋️ Starting character-specific training:', {
        character: selected_character.name,
        activity: activity.name,
        type: activity.type,
        difficulty: activity.difficulty
      });

      // Skip the old training system and use our character-specific system directly
      // This bypasses the legacy psychology-based training that was causing SyntaxError

      setCurrentActivity(activity);
      setIsTraining(true);
      setTrainingProgress(0);
      setTrainingTimeLeft(activity.duration);
      setTrainingPhase('active');
      setSessionStartTime(new Date());

      // Increment daily sessions
      setDailyTrainingSessions(prev => prev + 1);

      // Deduct energy (with membership cost reduction)
      const multipliers = get_training_multipliers(membership_tier, selected_facility);
      const energy_cost = Math.ceil(activity.energy_cost * multipliers.energy_cost);

      setSelectedCharacter(prev => ({
        ...prev,
        energy: prev.energy - energy_cost
      }));

      console.log('✅ Character-specific training started successfully!');

    } catch (error) {
      console.error('Training failed:', error);
      alert(error instanceof Error ? error.message : 'Training failed');
    }
  };

  // Complete training
  const complete_training = React.useCallback(async () => {
    if (!current_activity || !selected_character) return;

    // Apply membership multipliers
    const multipliers = get_training_multipliers(membership_tier, selected_facility);
    const xp_gain = Math.floor(current_activity.xp_gain * multipliers.xp);
    const stat_bonus = Math.floor(current_activity.stat_bonus * multipliers.stat);
    const training_points_gain = current_activity.training_points_gain
      ? Math.floor(current_activity.training_points_gain * multipliers.training_points)
      : 0;

    try {
      // Call backend to persist training completion
      const response = await axios.post(`${BACKEND_URL}/api/training/complete`, {
        session_id: `training_${Date.now()}`,
        character_id: selected_character.id,
        xp_gain,
        stat_type: current_activity.type,
        stat_bonus,
        training_points_gain
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Training completion failed');
      }

      const { character, leveled_up, new_level } = response.data;

      // Update character with real database values from backend
      setSelectedCharacter(prev => ({
        ...prev,
        level: character.level,
        xp: character.experience,
        xp_to_next: character.experience_to_next,
        atk: character.current_attack,
        def: character.current_defense,
        spd: character.current_speed,
        // Recover some energy after training
        energy: Math.min(prev.max_energy, prev.energy + 5)
      }));

      // Award training points for skill activities
      if (training_points_gain > 0) {
        setTrainingPoints(prev => prev + training_points_gain);
      }
    } catch (error) {
      console.error('Failed to complete training:', error);
      alert('Failed to save training progress. Please try again.');
      return;
    }

    // Generate completion message based on exercise difficulty and character
    const completion_message = current_activity.difficulty === 'extreme'
      ? `🔥 LEGENDARY TRAINING COMPLETE! ${selected_character?.name} mastered "${current_activity.name}"! Gained +${stat_bonus} ${current_activity.type} and ${xp_gain} XP!`
      : current_activity.difficulty === 'hard'
        ? `⚡ EXPERT TRAINING COMPLETE! ${selected_character?.name} conquered "${current_activity.name}"! Gained +${stat_bonus} ${current_activity.type} and ${xp_gain} XP!`
        : `✅ Training Complete: ${selected_character?.name} finished "${current_activity.name}" and gained +${stat_bonus} ${current_activity.type} and ${xp_gain} XP!`;

    console.log('⭐ Character-Specific Training Completed!', {
      character_name: selected_character?.name,
      exercise_name: current_activity.name,
      exercise_type: current_activity.type,
      difficulty: current_activity.difficulty,
      xp_gained: xp_gain,
      stat_bonus: stat_bonus,
      training_points_gained: training_points_gain,
      completion_message
    });

    setIsTraining(false);
    setTrainingPhase('recovery');
    // Keep current_activity for recovery discussion, clear after 5 minutes
    setTimeout(() => {
      setCurrentActivity(null);
      setTrainingPhase('planning');
    }, 300000); // 5 minutes recovery discussion
    setTrainingProgress(0);
  }, [current_activity, membership_tier, selected_facility]);

  // Training timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (is_training && training_time_left > 0) {
      interval = setInterval(() => {
        setTrainingTimeLeft(prev => {
          const new_time = prev - 1;
          setTrainingProgress(((current_activity?.duration || 0) - new_time) / (current_activity?.duration || 1) * 100);
          return new_time;
        });
      }, 1000);
    } else if (training_time_left === 0 && is_training) {
      complete_training();
    }

    return () => clearInterval(interval);
  }, [is_training, training_time_left, complete_training, current_activity?.duration]);

  // Stop training early
  const stop_training = () => {
    setIsTraining(false);
    setCurrentActivity(null);
    setTrainingProgress(0);
    setTrainingTimeLeft(0);

    // Refund partial energy
    if (current_activity) {
      setSelectedCharacter(prev => ({
        ...prev,
        energy: Math.min(prev.max_energy, prev.energy + Math.floor(current_activity.energy_cost * 0.5))
      }));
    }
  };

  const get_difficulty_color = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'hard': return 'text-orange-400 bg-orange-400/10';
      case 'extreme': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const format_time = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Multi-agent training chat functions with live AI-to-AI interactions
  const send_training_chat_message = async () => {
    if (!current_chat_message.trim() || is_chat_loading || !selected_character) return;

    const message_text = current_chat_message.trim();
    setCurrentChatMessage('');
    setIsChatLoading(true);

    // Add coach message to chat
    const coach_message = {
      id: `coach_${Date.now()}`,
      sender: 'coach' as const,
      message: message_text,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, coach_message]);

    try {
      // Get available characters for context - use the real characters from props
      const current_character = available_characters.find(c => c.name === selected_character.name);
      if (!current_character) {
        throw new Error(`STRICT MODE: Character "${selected_character.name}" not found in available_characters`);
      }

      // Get userchar_id from character.id (the user_character UUID) - STRICT MODE
      if (!current_character.id) {
        throw new Error(`STRICT MODE: character.id missing for character "${current_character.name}"`);
      }
      const userchar_id = current_character.id;

      // Calculate session duration in minutes
      const session_duration = session_start_time ? Math.floor((Date.now() - session_start_time.getTime()) / 60000) : 0;

      // Get multi-agent responses with HTTP calls
      const agent_responses = await sendTrainingChat(
        current_character,
        userchar_id,
        message_text,
        {
          training_phase: training_phase,
          facility_tier: selected_facility,
          session_duration: session_duration,
          available_equipment: ['Weights', 'Treadmill', 'Combat dummies', 'Resistance bands'],
          intensity_level: 'moderate',
        },
        true // include character response
      );

      // Add all agent responses to chat
      agent_responses.forEach((agent, index) => {
        const agent_message = {
          id: `${agent.agent_type}_${Date.now()}_${index}`,
          sender: agent.agent_type as 'contestant' | 'argock',
          message: agent.message,
          timestamp: new Date(),
          character_name: agent.agent_name,
          agent_type: agent.agent_type,
          agent_name: agent.agent_name
        };
        setChatMessages(prev => [...prev, agent_message]);
      });

    } catch (error) {
      console.error('Multi-agent training chat error:', error);
      const error_message = {
        id: `error_${Date.now()}`,
        sender: 'contestant' as const,
        message: 'Sorry, we\'re having trouble responding right now. Let\'s focus on training!',
        timestamp: new Date(),
        character_name: selected_character.name
      };
      setChatMessages(prev => [...prev, error_message]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handle_chat_key_press = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send_training_chat_message();
    }
  };


  // Show error if no real character available
  if (!selected_character) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Training Grounds</h1>
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-400 text-lg font-semibold">❌ No Character Available</p>
            <p className="text-red-300 mt-2">Training requires a real character from the API.</p>
            <p className="text-red-300 text-sm mt-2">Check authentication and backend connection.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">

      {/* All content below header image */}
      <div className="text-center mb-8">
        {/* Argock the Inspirerer - Training Master */}
        <div className="flex justify-center mb-8">
          <div className="relative max-w-md mx-auto">
            <img
              src="/images/argock-the-inspirerer.png"
              alt="Argock the Inspirerer - Training Master"
              className="rounded-xl border-2 border-orange-500/30 shadow-2xl"
              style={{ maxHeight: '300px', width: 'auto' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-xl pointer-events-none"></div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Dynamic Training Experience with Argock */}
        <SafeMotion
          class_name="bg-gray-900/50 rounded-xl border border-gray-700 p-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-orange-400" />
              {training_phase === 'planning' && 'Training Planning with Argock'}
              {training_phase === 'active' && `Training Session: ${current_activity?.name}`}
              {training_phase === 'recovery' && 'Post-Workout Recovery Chat'}
            </h2>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${training_phase === 'planning' ? 'bg-blue-500/20 text-blue-400' :
                training_phase === 'active' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                {training_phase.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Phase-specific content description */}
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-gray-300 text-sm">
              {training_phase === 'planning' && `Plan your workout with Argock and ${selected_character.name}. Discuss goals, exercises, and get motivated!`}
              {training_phase === 'active' && `Training in progress! Chat with Argock and your character during the workout. Stay motivated!`}
              {training_phase === 'recovery' && `${selected_character.name} is winded from training! Reflect on the workout and get recovery advice from Argock.`}
            </p>
          </div>

          {/* Dynamic Training Chat */}
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {chat_messages.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">
                    {training_phase === 'planning' && `Start planning your workout with ${selected_character.name}!`}
                    {training_phase === 'active' && `Training in progress! Keep the motivation going!`}
                    {training_phase === 'recovery' && `How was that workout? Let's discuss recovery!`}
                  </p>
                </div>
              ) : (
                chat_messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'coach' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md px-4 py-3 rounded-lg ${msg.sender === 'coach'
                      ? 'bg-orange-600 text-white'
                      : msg.sender === 'argock'
                        ? 'bg-red-700 text-white border-l-4 border-red-400'
                        : 'bg-gray-700 text-gray-200'
                      }`}>
                      {(msg.sender === 'contestant' || msg.sender === 'argock') && (
                        <div className={`text-xs mb-1 flex items-center gap-2 ${msg.sender === 'argock' ? 'text-red-200' : 'text-gray-400'
                          }`}>
                          <span>{msg.agent_name || msg.character_name}</span>
                          {msg.sender === 'argock' && (
                            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                              TRAINER
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-sm">{msg.message}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {is_chat_loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={current_chat_message}
                  onChange={(e) => setCurrentChatMessage(e.target.value)}
                  onKeyPress={handle_chat_key_press}
                  placeholder={
                    training_phase === 'planning' ? `Plan your workout with ${selected_character.name}...` :
                      training_phase === 'active' ? `Motivate ${selected_character.name} during training...` :
                        `Ask ${selected_character.name} about the workout...`
                  }
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  disabled={is_chat_loading}
                />
                <button
                  onClick={send_training_chat_message}
                  disabled={!current_chat_message.trim() || is_chat_loading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </SafeMotion>

        {/* Character Training Images */}
        {selected_character && (
          <SafeMotion
            class_name="bg-gray-900/50 rounded-xl border border-gray-700 p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
              <Dumbbell className="w-5 h-5 text-orange-400" />
              {selected_character.name}'s Training Session
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {getCharacterImageSet(selected_character, 'training', 3).map((imagePath, index) => (
                <div key={index} className="text-center">
                  <div className="w-full aspect-square rounded-xl overflow-hidden border-4 border-orange-600/30 shadow-xl mb-3">
                    <img
                      src={imagePath}
                      alt={`${selected_character.name} Training ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('❌ Training image failed to load:', e.currentTarget.src);
                        // Hide the image element instead of showing broken image
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="text-sm text-orange-300 font-semibold">
                    Training Phase {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </SafeMotion>
        )}

        {/* Training Management - Bottom */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Character Info & Training Status */}
          <SafeMotion
            class_name="bg-gray-900/50 rounded-xl border border-gray-700 p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">{selected_character.avatar}</div>
              <h3 className="text-2xl font-bold text-white">{selected_character.name}</h3>
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Star className="w-4 h-4" />
                <span>Level {selected_character.level}</span>
              </div>
            </div>

            {/* Energy */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  <Battery className="w-4 h-4" />
                  Energy
                </span>
                <span>{selected_character.energy}/{selected_character.max_energy}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(selected_character.energy / selected_character.max_energy) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Current Training Status */}
            {is_training && current_activity ? (
              <div className="bg-orange-900/30 border border-orange-500/50 rounded-xl p-4">
                <div className="text-center">
                  <div className="text-orange-400 text-lg mb-2">Training: {current_activity.name}</div>
                  <div className="text-gray-300 mb-4">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {format_time(training_time_left)} remaining
                  </div>
                  <button
                    onClick={stop_training}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Stop Training
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-4">
                Ready for training
              </div>
            )}
          </SafeMotion>

          {/* Available Training Activities */}
          <SafeMotion
            class_name="bg-gray-900/50 rounded-xl border border-gray-700 p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              {selected_character ? `${selected_character.name}'s Training` : 'Available Training'}
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {available_activities.slice(0, 5).map((activity) => {
                const Icon = activity.icon;
                const can_start_training = !is_training && selected_character.energy >= activity.energy_cost;

                return (
                  <div
                    key={activity.id}
                    className={`border rounded-lg p-3 transition-all ${can_start_training
                      ? `border-gray-600 hover:border-blue-500 cursor-pointer ${activity.difficulty === 'extreme' ? 'bg-gradient-to-r from-purple-900/20 to-red-900/20 border-purple-500/50' :
                        activity.difficulty === 'hard' ? 'bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border-orange-500/50' :
                          activity.difficulty === 'medium' ? 'bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/50' :
                            'bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/50'
                      }`
                      : 'border-gray-700 opacity-50 cursor-not-allowed'
                      }`}
                    onClick={() => can_start_training && start_training(activity)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-700 p-2 rounded">
                        <Icon className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{activity.name}</div>
                        <div className="text-xs text-gray-400 mb-1">
                          {format_time(activity.duration)} • {activity.energy_cost} Energy • +{activity.xp_gain} XP
                        </div>
                        <div className="text-xs text-blue-300 capitalize">
                          +{activity.stat_bonus} {activity.type} • {activity.difficulty} difficulty
                        </div>
                        {activity.description && (
                          <div className="text-xs text-gray-500 mt-1 italic">
                            {activity.description}
                          </div>
                        )}
                      </div>
                      {can_start_training && (
                        <button className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded">
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SafeMotion>
        </div>
      </div>
    </div>
  );
}