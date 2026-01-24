'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Heart, Star, User, TrendingUp, Activity, Target } from 'lucide-react';
import { characterAPI } from '../services/apiClient';
import { Contestant as Character } from '@blankwars/types';
import ConflictContextService, { LivingContext } from '../services/conflictContextService';
import EventContextService from '../services/eventContextService';
import EventPublisher from '../services/eventPublisher';
import GameEventBus from '../services/gameEventBus';
import ChatFeedback, { ChatFeedbackData } from './ChatFeedback';
import { performanceChatService } from '../data/performanceChatService';

interface Message {
  id: number;
  type: 'coach' | 'contestant' | 'system';
  content: string;
  timestamp: Date;
  bond_increase?: boolean;
}

interface BattleRecord {
  id: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  date: Date;
  primaryCause?: string;
}

interface EnhancedCharacter extends Character {
  base_name: string;
  display_bond_level: number;
  recent_battles?: BattleRecord[];
}

const loadUserCharacters = async (): Promise<EnhancedCharacter[]> => {
  try {
    const characters = await characterAPI.get_user_characters();

    return characters.map((char: Character) => {
      if (!char.character_id) {
        throw new Error(`Performance coaching: character missing character_id: ${char.name || char.id}`);
      }

      return {
        ...char, // All stats from backend - no fallbacks
        base_name: char.character_id,
        display_bond_level: char.bond_level,
        archetype: char.archetype
      };
    });
  } catch (error) {
    console.error('Failed to load user characters:', error);
    throw error; // Don't swallow errors
  }
};

// Generate character-specific coaching advice based on actual stats, equipment, and battle history
const generateCoachingAdvice = (character: EnhancedCharacter): string[] => {
  const advice: string[] = [];

  // Safety check to prevent destructuring errors
  if (!character) {
    return ["Focus on consistent training", "Track your progress", "Stay motivated"];
  }

  const { level, equipment, abilities, recent_battles, gameplan_adherence, strength, defense, dexterity, intelligence, critical_chance, accuracy } = character;

  // Attribute stat weaknesses (below 70)
  if (strength && strength < 70) {
    advice.push(`Your strength (${strength}) needs training for better damage output`);
  }
  if (defense && defense < 70) {
    advice.push(`Your defense (${defense}) needs work - you're taking too much damage`);
  }
  if (dexterity && dexterity < 70) {
    advice.push(`Your dexterity (${dexterity}) is limiting your turn order advantage`);
  }
  if (intelligence && intelligence < 70) {
    advice.push(`Your intelligence (${intelligence}) is affecting tactical decisions`);
  }

  // Combat stat advice
  if (critical_chance && critical_chance < 20) {
    advice.push(`Your critical chance (${critical_chance}%) needs improvement for better damage`);
  }
  if (accuracy && accuracy < 80) {
    advice.push(`Your accuracy (${accuracy}%) is causing missed opportunities`);
  }

  // Level-based advice
  if (level < 10) {
    advice.push('Focus on basic training fundamentals at your current level');
  } else if (level > 15) {
    advice.push('Your experience should guide newer team members');
  }

  // Equipment-based advice
  if (equipment && equipment.length > 0) {
    const weaponCount = equipment.filter(item => item.type === 'weapon').length;
    const armorCount = equipment.filter(item => item.type === 'armor').length;

    if (weaponCount === 0) {
      advice.push('Consider equipping a weapon to improve your combat effectiveness');
    }
    if (armorCount === 0) {
      advice.push('Armor could help reduce damage taken in battles');
    }

    // Check for equipment synergies
    const hasFireWeapon = equipment.some(item => item.element === 'fire');
    const hasIceArmor = equipment.some(item => item.element === 'ice');
    if (hasFireWeapon && hasIceArmor) {
      advice.push('Your fire weapon and ice armor create conflicting elements - consider matching your equipment');
    }
  }

  // Ability utilization advice
  if (abilities && Array.isArray(abilities) && abilities.length > 0) {
    // Define union type for ability structures
    interface AbilityWithCost {
      cost: { cooldown: number };
    }
    interface LegacyAbility {
      cooldown: number;
    }
    type CharacterAbility = AbilityWithCost | LegacyAbility;

    const highCooldownAbilities = abilities.filter(ability => {
      const typedAbility = ability as CharacterAbility;
      // Type guard to check if ability has cost.cooldown
      if ('cost' in typedAbility && typedAbility.cost && typeof typedAbility.cost.cooldown === 'number') {
        return typedAbility.cost.cooldown > 3;
      }
      // Fallback to direct cooldown property
      if ('cooldown' in typedAbility && typeof typedAbility.cooldown === 'number') {
        return typedAbility.cooldown > 3;
      }
      return false;
    });

    if (highCooldownAbilities.length > 2) {
      advice.push('Consider balancing high-cooldown abilities with faster moves');
    }

    const elementalAbilities = abilities.filter(ability => (ability as any).element);
    if (elementalAbilities.length > 0) {
      advice.push(`Your ${(elementalAbilities[0] as any).element} abilities could synergize better with matching equipment`);
    }
  }

  // Battle history analysis
  if (recent_battles && recent_battles.length > 0) {
    const recentLosses = recent_battles.filter(battle => battle.result === 'loss').length;
    const recentWins = recent_battles.filter(battle => battle.result === 'win').length;

    if (recentLosses > recentWins) {
      advice.push('Your recent battle performance suggests we need to adjust your strategy');
    }

    // Analyze common causes of defeat
    const commonProblems = recent_battles
      .filter(battle => battle.result === 'loss')
      .map(battle => battle.primaryCause)
      .reduce((acc, cause) => {
        acc[cause] = (acc[cause] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topProblem = Object.entries(commonProblems)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    if (topProblem) {
      advice.push(`You've been struggling with ${topProblem[0]} - let's work on that together`);
    }
  }

  // Gameplan adherence feedback
  if (gameplan_adherence !== undefined) {
    if (gameplan_adherence < 0.6) {
      advice.push('You\'re not following our battle strategy consistently - let\'s review your gameplan');
    } else if (gameplan_adherence > 0.8) {
      advice.push('Excellent gameplan execution! Your strategy adherence is paying off');
    }
  }

  // Personality-specific advice
  if (character.personality?.traits?.includes('Honorable')) {
    advice.push('Your honor is admirable, but consider strategic flexibility');
  }
  if (character.personality?.traits?.includes('Wrathful')) {
    advice.push('Channel your anger productively in battle');
  }

  // Ensure we have at least some generic advice if nothing specific applies
  if (advice.length === 0) {
    advice.push('Focus on your strongest stats and coordinate better with your team');
    advice.push('Work on timing your abilities for maximum impact');
    advice.push('Consider your role in team strategy');
    advice.push('Let\'s develop a personalized gameplan for your next battles');
  }

  return advice.slice(0, 10); // Limit to 10 pieces of advice
};

interface PerformanceCoachingChatProps {
  selected_characterId: string;
  onCharacterChange?: (character_id: string) => void;
  selected_character: EnhancedCharacter;
  available_characters: EnhancedCharacter[];
  coach_name: string;
}

export default function PerformanceCoachingChat({
  selected_characterId,
  onCharacterChange,
  selected_character: propSelectedCharacter,
  available_characters: propAvailableCharacters,
  coach_name
}: PerformanceCoachingChatProps) {
  const selected_character = propSelectedCharacter;
  const available_characters = propAvailableCharacters;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [livingContext, setLivingContext] = useState<LivingContext | null>(null);
  const [lastFeedback, setLastFeedback] = useState<ChatFeedbackData | null>(null);
  const [session_id, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conflictService = ConflictContextService.getInstance();
  const eventContextService = EventContextService.getInstance();
  const eventPublisher = EventPublisher.getInstance();

  // Initialize session when character changes
  useEffect(() => {
    const initSession = async () => {
      const newSessionId = await performanceChatService.startSession(selected_character.id);
      setSessionId(newSessionId);
      console.log('🏋️ [PerformanceCoaching] Session initialized:', newSessionId);
    };

    initSession();

    // Cleanup: end session when component unmounts or character changes
    return () => {
      if (session_id) {
        performanceChatService.endSession(session_id);
      }
    };
  }, [selected_character.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  // Load living context when character changes
  useEffect(() => {
    const loadLivingContext = async () => {
      if (selected_character) {
        try {
          console.log('🏠 Loading living context for:', selected_character.name, 'ID:', selected_character.id);
          const context = await conflictService.generateLivingContext(selected_character.id);
          setLivingContext(context);
          console.log('✅ Living context loaded:', context);
        } catch (error) {
          console.error('❌ Failed to load living context:', error);
          setLivingContext(null);
        }
      }
    };

    loadLivingContext();
  }, [selected_character.id, conflictService]);

  // Generate coaching advice specific to the selected character
  const performanceQuickMessages = generateCoachingAdvice(selected_character);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) {
      console.log('❌ Cannot send message:', {
        has_content: !!content.trim(),
        isTyping
      });
      return;
    }

    if (!selected_character || !session_id) {
      console.log('❌ No selected character or session for message');
      return;
    }

    // Get userchar_id (the database ID for the user_characters table)
    const userchar_id = selected_character.id;

    if (!userchar_id) {
      throw new Error(`Character missing id field: ${selected_character.name}`);
    }

    const playerMessage: Message = {
      id: Date.now(),
      type: 'coach',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, playerMessage]);
    const messageContent = content;
    setInputMessage('');

    console.log('📤 PerformanceCoaching message:', content);

    // Publish 1-on-1 combat coaching event
    try {
      const eventBus = GameEventBus.getInstance();
      const messageText = messageContent.toLowerCase();
      let event_type = 'combat_coaching_session';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

      if (messageText.includes('strategy') || messageText.includes('tactics') || messageText.includes('technique')) {
        event_type = 'combat_strategy_coaching';
        severity = 'high';
      } else if (messageText.includes('improve') || messageText.includes('better') || messageText.includes('help')) {
        event_type = 'performance_improvement_request';
        severity = 'medium';
      } else if (messageText.includes('problem') || messageText.includes('struggle') || messageText.includes('losing')) {
        event_type = 'combat_performance_concern';
        severity = 'high';
      }

      if (!selected_character.character_id) {
        throw new Error(`Performance coaching event: character missing character_id: ${selected_character.name}`);
      }

      await eventBus.publish({
        type: event_type as any,
        source: 'training_grounds',
        primary_character_id: selected_character.character_id,
        severity,
        category: 'training',
        description: `${selected_character.name} in 1-on-1 combat coaching: "${messageContent.substring(0, 100)}..."`,
        metadata: {
          coaching_type: '1on1_combat',
          character_level: selected_character.level,
          message_length: messageContent.length
        },
        tags: ['combat_coaching', '1on1', 'performance', 'coaching']
      });
    } catch (error) {
      console.error('Error publishing combat coaching event:', error);
    }

    setIsTyping(true);

    try {
      // Get character's canonical ID from DB - no fallbacks
      const character_id = selected_character.character_id;

      if (!character_id) {
        throw new Error(`Character missing character_id field: ${selected_character.name}`);
      }

      // Call the service to generate character response
      const response = await performanceChatService.generateCharacterResponse(
        session_id,
        character_id,
        userchar_id,
        content,
        selected_character.name,
        coach_name
      );

      // Add character response to messages
      const character_message: Message = {
        id: Date.now() + 1,
        type: 'contestant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, character_message]);

      // Publish performance coaching event
      try {
        await eventPublisher.publishChatInteraction({
          character_id,
          chat_type: 'performance',
          message: content,
          outcome: 'helpful',
        });

      } catch (error) {
        console.warn('Could not publish chat event:', error);
      }

    } finally {
      setIsTyping(false);
    }
  };

  const getPerformanceIntro = (character: EnhancedCharacter): string => {
    const inventory = character.inventory;
    const equipmentCount = inventory.length;
    const abilities = character.abilities;
    const abilitiesCount = abilities.length;
    const gameplan_adherence = character.gameplan_adherence;

    return `Coach, I'm ready for our combat training session. I've got ${equipmentCount} pieces of equipment and ${abilitiesCount} abilities at my disposal. My gameplan adherence has been ${gameplan_adherence}%. Let's work on improving my battle strategy and effectiveness.`;
  };

  useEffect(() => {
    if (selected_character) {
      setMessages([
        {
          id: Date.now() + 1,
          type: 'contestant',
          content: getPerformanceIntro(selected_character),
          timestamp: new Date(),
        }
      ]);
      // Ensure typing state is cleared when character changes
      setIsTyping(false);
    }
  }, [selected_character.id]);


  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        className="bg-gradient-to-br from-orange-900/20 to-red-900/20 rounded-xl backdrop-blur-sm border border-orange-500/30 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="h-[700px]">
          <div className="flex flex-col h-full">
            <div className="bg-gradient-to-r from-orange-800/30 to-red-800/30 p-4 border-b border-orange-500/30">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selected_character.avatar}</div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    1-on-1 Combat - {selected_character.name}
                  </h3>
                  <p className="text-sm text-orange-200">Analyze combat performance, discuss equipment & abilities, develop battle strategies</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-300">Focus: Strategy & Gameplan Development</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-orange-500/20 bg-orange-900/10">
              <div className="flex flex-wrap gap-2">
                {performanceQuickMessages.map((msg, index) => (
                  <motion.button
                    key={index}
                    onClick={() => sendMessage(msg)}
                    className="bg-orange-700/30 hover:bg-orange-600/40 text-orange-100 text-xs px-3 py-1 rounded-full border border-orange-500/30 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {msg}
                  </motion.button>
                ))}
              </div>
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
                    ? 'bg-orange-600 text-white'
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
                        Trust increased!
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

            <div className="p-4 border-t border-orange-500/30 bg-orange-900/10">
              {/* Chat Feedback */}
              {lastFeedback && (
                <ChatFeedback feedback_data={lastFeedback} />
              )}

              <div className="text-xs text-orange-300 mb-2">
                Status: {session_id ? '🟢 Session Active' : '🔴 No Session'} |
                {isTyping ? ' ⏳ Developing strategy...' : ' ✅ Ready for combat training'} |
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
                  placeholder={isTyping ? 'Character is analyzing combat strategy...' : `Discuss strategy with ${selected_character.name}...`}
                  disabled={isTyping}
                  className="flex-1 bg-gray-700 border border-orange-500/30 rounded-full px-4 py-2 text-white placeholder-orange-200/50 focus:outline-none focus:border-orange-400 disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isTyping || !session_id}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-500 text-white p-2 rounded-full transition-all"
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
