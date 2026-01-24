'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, Heart, Star, User, Dumbbell, Zap, Target, Brain, Flame } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { characterAPI } from '../services/apiClient';
import { Contestant as Character } from '@blankwars/types';
import ConflictContextService, { LivingContext } from '../services/conflictContextService';

interface Message {
  id: number;
  type: 'coach' | 'contestant' | 'system';
  content: string;
  timestamp: Date;
  bond_increase?: boolean;
}

interface EnhancedCharacter extends Character {
  base_name: string;
  display_bond_level: number;
}


// Generate Argock's training recommendations to the COACH
const generateCoachRecommendations = (character: EnhancedCharacter): string[] => {
  const recommendations: string[] = [];
  const { archetype, level, strength, dexterity, defense } = character;

  // Strength analysis for coach
  if (strength && strength < 80) {
    recommendations.push(`Coach! ${character.name} needs strength training - weak like soggy bread! Recommend heavy lifting!`);
  }
  if (strength && strength > 90) {
    recommendations.push(`Coach! ${character.name} has mighty strength but must maintain it! Power exercises!`);
  }

  // Speed analysis
  if (dexterity && dexterity < 75) {
    recommendations.push(`Coach! ${character.name} moves like wounded bear! Agility drills needed!`);
  }

  // Defense analysis
  if (defense && defense < 70) {
    recommendations.push(`Coach! ${character.name} too soft! Endurance training will forge tougher warrior!`);
  }

  // Level-based recommendations
  if (level < 10) {
    recommendations.push(`Coach! Young ${character.name} needs basic conditioning - start with fundamentals!`);
  }
  if (level > 30) {
    recommendations.push(`Coach! ${character.name} ready for advanced training - time for REAL challenges!`);
  }

  // Archetype-specific recommendations
  if (archetype === 'warrior') {
    recommendations.push(`Coach! ${character.name} warrior type - focus on combat conditioning and weapon training!`);
  }
  if (archetype === 'mage') {
    recommendations.push(`Coach! ${character.name} mage needs physical training - brain strong but body weak like twig!`);
  }
  if (archetype === 'trickster') {
    recommendations.push(`Coach! ${character.name} trickster needs flexibility and core strength for sneaking!`);
  }

  return recommendations.slice(0, 6);
};

// Generate exercise options that can trigger trainer-character interactions
const generateExerciseOptions = (character: EnhancedCharacter): string[] => {
  const exercises: string[] = [];
  const { archetype, strength, dexterity, defense } = character;

  // Always available basic exercises
  exercises.push(`Start ${character.name} on cardio training`);
  exercises.push(`Have ${character.name} do strength training`);
  exercises.push(`Put ${character.name} through agility drills`);

  // Stat-specific exercises
  if (strength && strength < 80) {
    exercises.push(`${character.name} needs heavy weightlifting session`);
  }
  if (dexterity && dexterity < 75) {
    exercises.push(`${character.name} should do sprint intervals`);
  }
  if (defense && defense < 70) {
    exercises.push(`${character.name} needs endurance conditioning`);
  }

  // Archetype-specific exercises
  if (archetype === 'warrior') {
    exercises.push(`Combat training for ${character.name}`);
  }
  if (archetype === 'mage') {
    exercises.push(`Physical conditioning for ${character.name}`);
  }
  if (archetype === 'trickster') {
    exercises.push(`Flexibility training for ${character.name}`);
  }

  return exercises.slice(0, 6);
};

interface PersonalTrainerChatProps {
  selected_characterId?: string;
  onCharacterChange?: (character_id: string) => void;
}

export default function PersonalTrainerChat({
  selected_characterId,
  onCharacterChange
}: PersonalTrainerChatProps) {
  const [available_characters, setAvailableCharacters] = useState<EnhancedCharacter[]>([]);
  const [globalSelectedCharacterId, setGlobalSelectedCharacterId] = useState(selected_characterId || 'achilles');
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [conversationMode, setConversationMode] = useState<'coach_consultation' | 'character_training'>('coach_consultation');
  const [currentExercise, setCurrentExercise] = useState<string | null>(null);


  // Load characters on component mount
  useEffect(() => {
    const loadCharacters = async () => {
      setCharactersLoading(true);
      try {
        const characters = await characterAPI.get_user_characters();

        const enhancedCharacters = characters.map((char: Character) => {
          const normalizedChar = char;

          if (!char.character_id) {
            throw new Error(`Character missing character_id: ${char.name || char.id}`);
          }

          const base_name = char.character_id;
          return {
            ...normalizedChar, // All stats already here from backend
            base_name,
            display_bond_level: normalizedChar.bond_level || char.bond_level,
            abilities: char.abilities,
            archetype: char.archetype,
            avatar: char.avatar_emoji,
            name: char.name,
            personality_traits: char.personality_traits,
            speaking_style: char.speaking_style,
            decision_making: char.decision_making,
            conflict_response: char.conflict_response
          };
        });

        setAvailableCharacters(enhancedCharacters);
      } catch (error) {
        console.error('Failed to load characters:', error);
        setAvailableCharacters([]);
      }
      setCharactersLoading(false);
    };

    loadCharacters();
  }, []);

  // Update internal state when prop changes and clear messages
  useEffect(() => {
    if (selected_characterId && selected_characterId !== globalSelectedCharacterId) {
      setGlobalSelectedCharacterId(selected_characterId);
      setMessages([]);
      setInputMessage('');
      setIsTyping(false);
      // Reset to consultation mode when switching characters
      setConversationMode('coach_consultation');
      setCurrentExercise(null);
    }
  }, [selected_characterId, globalSelectedCharacterId]);

  const selected_character = useMemo(() => {
    const character = available_characters.find(c => c.base_name === globalSelectedCharacterId) || available_characters[0];
    if (!character) {
      throw new Error('No characters available - users must have minimum 3 characters');
    }
    return character;
  }, [available_characters, globalSelectedCharacterId]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [livingContext, setLivingContext] = useState<LivingContext | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conflictService = ConflictContextService.getInstance();

  useEffect(() => {
    const socketUrl = 'http://localhost:4000';
    console.log('🔌 [PersonalTrainer] Connecting to local backend:', socketUrl);

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      withCredentials: true,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ PersonalTrainer Socket connected! Waiting for authentication...');
    });

    socketRef.current.on('auth_success', (data: { user_id: string; username: string }) => {
      console.log('🔐 PersonalTrainer Socket authenticated!', data);
      setConnected(true);
    });

    socketRef.current.on('auth_error', (error: { error: string }) => {
      console.error('❌ PersonalTrainer Socket authentication failed:', error);
      setConnected(false);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ PersonalTrainer Socket disconnected');
      setConnected(false);
    });

    socketRef.current.on('chat_response', (data: { character: string; message: string; bond_increase?: boolean }) => {
      console.log('📨 PersonalTrainer response:', data);

      const character_message: Message = {
        id: Date.now(),
        type: 'contestant',
        content: data.message || 'ARGOCK THINKS ABOUT BEST TRAINING FOR YOU!',
        timestamp: new Date(),
        bond_increase: data.bond_increase || Math.random() > 0.7,
      };

      setMessages(prev => [...prev, character_message]);
      setIsTyping(false);
    });

    socketRef.current.on('chat_error', (error: { message: string }) => {
      console.error('❌ PersonalTrainer error:', error);
      setIsTyping(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load living context when character changes
  useEffect(() => {
    const loadLivingContext = async () => {
      if (selected_character) {
        try {
          console.log('🏠 PersonalTrainer loading living context for:', selected_character.base_name || selected_character.name);
          const context = await conflictService.generateLivingContext(selected_character.base_name ||
            selected_character.name?.toLowerCase() || selected_character.id);
          setLivingContext(context);
          console.log('✅ PersonalTrainer living context loaded:', context);
        } catch (error) {
          console.error('❌ PersonalTrainer failed to load living context:', error);
          setLivingContext(null);
        }
      }
    };

    loadLivingContext();
  }, [selected_character?.id, conflictService]);

  // Generate quick messages based on conversation mode
  const coachRecommendations = useMemo(() => {
    return selected_character ? generateCoachRecommendations(selected_character) : [];
  }, [selected_character]);

  const exerciseOptions = useMemo(() => {
    return selected_character ? generateExerciseOptions(selected_character) : [];
  }, [selected_character]);

  // Handle exercise selection (switches to character training mode)
  const startExercise = (exercise: string) => {
    setCurrentExercise(exercise);
    setConversationMode('character_training');

    // Send the exercise command which will trigger trainer-character interaction
    sendMessage(exercise);
  };

  // Return to coach consultation mode
  const returnToConsultation = () => {
    setConversationMode('coach_consultation');
    setCurrentExercise(null);
  };

  const sendMessage = (content: string) => {
    if (!content.trim() || isTyping || !connected || !socketRef.current) {
      return;
    }

    const playerMessage: Message = {
      id: Date.now(),
      type: 'coach',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, playerMessage]);
    setInputMessage('');
    setIsTyping(true);

    console.log('📤 PersonalTrainer message:', content);

    socketRef.current.emit('chat_message', {
      message: content,
      character: 'Argock The Inspirerer',
      character_data: {
        name: 'Argock The Inspirerer',
        archetype: 'orc_trainer',
        level: 50,
        personality: {
          traits: ['Enthusiastic', 'Battle-hardened', 'Motivational', 'Dramatic', 'Well-meaning'],
          speech_style: 'Orc warrior meets fitness coach - dramatic, loud, uses battle metaphors',
          decision_making: 'Instinctive but surprisingly wise',
          conflict_response: 'Turns everything into training opportunity',
          interests: ['Training optimization', 'Battle preparation', 'Character development', 'Crushing limits']
        },
        // Training context for the selected character
        trainee_data: selected_character ? {
          name: selected_character.name,
          level: selected_character.level,
          archetype: selected_character.archetype,
          strength: selected_character.strength,
          dexterity: selected_character.dexterity,
          defense: selected_character.current_defense,
          intelligence: selected_character.intelligence,
          wisdom: selected_character.wisdom,
          charisma: selected_character.charisma,
          spirit: selected_character.spirit,
          // Combat stats - from database (base 50 + modifiers)
          attack: selected_character.current_attack,
          speed: selected_character.current_speed,
          health: selected_character.current_health,
          max_health: selected_character.current_max_health,
          current_training_needs: {
            strength_deficit: selected_character.strength < 80,
            speed_deficit: selected_character.dexterity < 75,
            defense_deficit: selected_character.current_defense < 70,
            current_level: selected_character.level,
            experience_to_next: Math.max(0, (selected_character.level + 1) * 1000 - (selected_character.experience as number))
          }
        } : null,
        conversation_context: `You are Argock The Inspirerer, an enthusiastic Orc personal trainer. You're genuinely well-meaning but have zero self-awareness about how intense and dramatic you sound. You constantly use battle metaphors for exercise.

CONVERSATION MODE: ${conversationMode}

${conversationMode === 'coach_consultation' ? `
COACH CONSULTATION MODE: You are giving training recommendations TO THE COACH about this character. Address the coach directly.
- "Coach! ${selected_character.name} needs [specific training] because [reason with battle metaphor]!"
- Analyze their stats and give professional recommendations using dramatic Orc language
- Don't directly address the character - you're consulting with their coach
` : `
CHARACTER TRAINING MODE: You are directly training ${selected_character.name}.
Current Exercise: ${currentExercise}
- Address the character directly by name
- Give exercise instructions with battle metaphors
- React to their personality and physical limitations
- Show the back-and-forth training interaction
`}

CURRENT CHARACTER: ${selected_character.name} (Level ${selected_character.level} ${selected_character.archetype})
- Strength: ${selected_character.strength} ${selected_character.strength < 80 ? '[needs improvement - use battle metaphor]' : '[impressive - use battle metaphor]'}
- Speed/Dexterity: ${selected_character.dexterity} ${selected_character.dexterity < 75 ? '[too slow - use battle metaphor]' : '[good speed - use battle metaphor]'}
- Defense: ${selected_character.current_defense} ${selected_character.current_defense < 70 ? '[weak defense - use battle metaphor]' : '[strong defense - use battle metaphor]'}

ARGOCK'S TRAINING PHILOSOPHY:
- Pain is weakness leaving body through SCREAMS!
- Every exercise is preparation for glorious battle!
- Proper form prevents injury (can't fight with broken bones!)
- Always encouraging but uses terrifying metaphors

Respond as Argock would based on the current conversation mode.`,

        training_expertise: {
          specialties: ['Strength building', 'Combat conditioning', 'Berserker endurance', 'Battle preparation'],
          methods: ['High intensity intervals', 'Functional movement', 'Mental toughness', 'Progressive overload'],
          philosophy: 'Transform warriors through controlled suffering and dramatic encouragement'
        },
        // Add living context for kitchen table conflict awareness
        living_context: livingContext
      },
      previous_messages: messages.slice(-5).map(m => ({
        role: m.type === 'coach' ? 'user' : 'assistant',
        content: m.content
      }))
    });

    setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
      }
    }, 15000);
  };

  const getArgockIntro = (character: EnhancedCharacter): string => {
    return `Greetings Coach! Argock has analyzed warrior ${character.name}. Level ${character.level} ${character.archetype} shows promise but needs PROPER FORGING! What training recommendations do you seek for this warrior?`;
  };

  useEffect(() => {
    if (selected_character) {
      setMessages([
        {
          id: Date.now() + 1,
          type: 'contestant',
          content: getArgockIntro(selected_character),
          timestamp: new Date(),
        }
      ]);
      setIsTyping(false);
      // Reset to consultation mode when character changes
      setConversationMode('coach_consultation');
      setCurrentExercise(null);
    }
  }, [selected_character?.id]);

  const handleCharacterChange = (character_id: string) => {
    setGlobalSelectedCharacterId(character_id);
    onCharacterChange?.(character_id);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        className="bg-gradient-to-br from-green-900/20 to-red-900/20 rounded-xl backdrop-blur-sm border border-green-500/30 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="h-[700px]">
          <div className="flex flex-col h-full">
            <div className="bg-gradient-to-r from-green-800/30 to-red-800/30 p-4 border-b border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="text-3xl">👹</div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-green-400" />
                    Personal Training - {selected_character?.name || 'Select Character'}
                  </h3>
                  <p className="text-sm text-green-200">Argock The Inspirerer will CRUSH your training goals!</p>
                </div>
                <div className="ml-auto flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-red-400" />
                    <span className="text-gray-300">Battle-Hardened</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300">Goal Crusher</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-green-500/20 bg-green-900/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-green-300">
                  {conversationMode === 'coach_consultation'
                    ? '📋 Coach Consultation Mode'
                    : '🏋️ Training Session Mode'}
                </div>
                {conversationMode === 'character_training' && (
                  <button
                    onClick={returnToConsultation}
                    className="text-xs bg-gray-600/50 hover:bg-gray-500/50 text-gray-300 px-2 py-1 rounded border border-gray-500/30"
                  >
                    ← Back to Consultation
                  </button>
                )}
              </div>

              {conversationMode === 'coach_consultation' ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-green-200 mb-2">💡 Training Recommendations:</div>
                    <div className="flex flex-wrap gap-2">
                      {coachRecommendations.map((recommendation, index) => (
                        <motion.button
                          key={index}
                          onClick={() => sendMessage(recommendation)}
                          className="bg-blue-700/30 hover:bg-blue-600/40 text-blue-100 text-xs px-3 py-1 rounded-full border border-blue-500/30 transition-all"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {recommendation}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-green-200 mb-2">🎯 Start Exercise Session:</div>
                    <div className="flex flex-wrap gap-2">
                      {exerciseOptions.map((exercise, index) => (
                        <motion.button
                          key={index}
                          onClick={() => startExercise(exercise)}
                          className="bg-green-700/30 hover:bg-green-600/40 text-green-100 text-xs px-3 py-1 rounded-full border border-green-500/30 transition-all"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {exercise}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-red-200 mb-2">🏋️ Training Session: {currentExercise}</div>
                  <div className="text-xs text-gray-300">Argock is directly coaching {selected_character?.name}...</div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'coach' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.type === 'coach'
                    ? 'bg-green-600 text-white'
                    : message.type === 'contestant'
                      ? 'bg-red-600 text-white'
                      : 'bg-yellow-600 text-white text-sm'
                    }`}>
                    <p>{message.content}</p>
                    {message.bond_increase && (
                      <motion.div
                        className="mt-2 flex items-center gap-1 text-xs text-yellow-200"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <Star className="w-3 h-3" />
                        Training bond strengthened!
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-red-600 text-white px-4 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-green-500/30 bg-green-900/10">
              <div className="text-xs text-green-300 mb-2">
                Status: {socketRef.current?.connected ? '🟢 Connected' : '🔴 Disconnected'} |
                {isTyping ? ' 🏋️ Argock planning your CRUSHING workout...' : ' ✅ Ready to forge warriors'} |
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
                  placeholder={isTyping ? 'Argock forging training plan...' : `Tell Argock about your training goals...`}
                  disabled={isTyping}
                  className="flex-1 bg-gray-700 border border-green-500/30 rounded-full px-4 py-2 text-white placeholder-green-200/50 focus:outline-none focus:border-green-400 disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isTyping || !socketRef.current?.connected}
                  className="bg-gradient-to-r from-green-600 to-red-600 hover:from-green-500 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-500 text-white p-2 rounded-full transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
