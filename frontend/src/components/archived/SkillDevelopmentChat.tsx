'use client';

import { useState, useEffect, useRef } from 'react';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { Send, Heart, Star, User, BookOpen, Zap, Target, Brain } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { characterAPI } from '../services/apiClient';
import { Contestant as Character } from '../services/apiClient';
import ConflictContextService, { LivingContext } from '../services/conflictContextService';
import EventContextService from '../services/eventContextService';
import EventPublisher from '../services/eventPublisher';
import ChatFeedback, { ChatFeedbackData } from './ChatFeedback';
import { ChatResponseData, isChatResponseData } from '@/types/socket';

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

const getAbilityType = (ability: any): string | undefined => {
  if (ability && typeof ability === 'object' && 'type' in ability) {
    const value = (ability as any).type;
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
};

const getAbilityPower = (ability: any): number | undefined => {
  if (!ability || typeof ability !== 'object') return undefined;
  if ('power' in ability && typeof (ability as any).power === 'number') return (ability as any).power;
  if ('effects' in ability && Array.isArray((ability as any).effects) && (ability as any).effects[0]?.value !== undefined) {
    return (ability as any).effects[0].value;
  }
  return undefined;
};

const getAbilityCooldown = (ability: any): number | undefined => {
  if (!ability || typeof ability !== 'object') return undefined;
  if ('cooldown' in ability && typeof (ability as any).cooldown === 'number') return (ability as any).cooldown;
  if ('cooldown_turns' in ability && typeof (ability as any).cooldown_turns === 'number') return (ability as any).cooldown_turns;
  if ('cost' in ability && typeof (ability as any).cost?.cooldown === 'number') return (ability as any).cost.cooldown;
  return undefined;
};

const loadUserCharacters = async (): Promise<EnhancedCharacter[]> => {
  try {
    const characters = await characterAPI.get_user_characters();

    return (characters && Array.isArray(characters) ? characters : []).map((char: any) => {
      const base_name = char.name?.toLowerCase() || char.id?.split('_')[0] || 'unknown';
      return {
        ...char, // All stats already here from backend
        base_name,
        display_bond_level: char.bond_level || Math.floor(char.health / 10),
        // Only override/compute properties that need transformation
        abilities: Array.isArray(char.abilities) ? char.abilities : [],
        avatar: char.avatar || '⚔️',
        name: char.name || 'Unknown Character',
        personality_traits: char.personality_traits || ['Determined'],
        speaking_style: char.speaking_style || 'Direct',
        decision_making: char.decision_making || 'Analytical',
        conflict_response: char.conflict_response || 'Confrontational'
      };
    });
  } catch (error) {
    console.error('Failed to load user characters:', error);
    return [];
  }
};

// Generate character-specific skill advice based on actual abilities and stats
const generateSkillAdvice = (character: EnhancedCharacter): string[] => {
  const advice: string[] = [];

  // Safety check to prevent destructuring errors
  if (!character) {
    return ["Focus on basic skill development", "Practice fundamental techniques", "Build core competencies"];
  }

  const { abilities, archetype, strength, intelligence, dexterity, defense, speed, accuracy } = character;

  // Ability-specific skill development advice
  if (Array.isArray(abilities) && abilities.length > 0) {
    const attackAbilities = abilities.filter(a => getAbilityType(a) === 'attack');
    const defenseAbilities = abilities.filter(a => getAbilityType(a) === 'defense');
    const specialAbilities = abilities.filter(a => getAbilityType(a) === 'special');
    const supportAbilities = abilities.filter(a => getAbilityType(a) === 'support');

    if (attackAbilities.length > 2) {
      advice.push(`Focus on mastering your ${attackAbilities.length} attack abilities for maximum damage`);
    }
    if (defenseAbilities.length > 1) {
      advice.push(`Develop your defensive skill tree to complement your ${defenseAbilities.length} protection abilities`);
    }
    if (specialAbilities.length > 0) {
      advice.push(`Your ${specialAbilities[0].name} special ability needs skill point investment`);
    }
  }

  // Stat-based skill recommendations
  if (strength && strength > 80) {
    advice.push(`Your high strength (${strength}) should guide physical skill development`);
  }
  if (intelligence && intelligence > 80) {
    advice.push(`Your intelligence (${intelligence}) opens advanced technique paths`);
  }
  if (dexterity && dexterity > 80) {
    advice.push(`Your dexterity (${dexterity}) allows precision skill specialization`);
  }
  if (speed && speed > 80) {
    advice.push(`Your speed (${speed}) enables agility-based skill trees`);
  }

  // Combat stat-based training approach
  if (accuracy && accuracy > 80) {
    advice.push(`Your excellent accuracy (${accuracy}%) allows complex skill combinations`);
  }
  if (accuracy && accuracy < 50) {
    advice.push(`Your accuracy (${accuracy}%) needs work before advanced skills`);
  }
  if (defense && defense < 60) {
    advice.push(`Focus on basic skills until your defense (${defense}) improves`);
  }

  // Archetype-specific skill paths
  if (archetype === 'warrior') {
    advice.push('Prioritize combat mastery and weapon specialization skills');
  }
  if (archetype === 'mage') {
    advice.push('Develop your spell power and mana efficiency skill branches');
  }
  if (archetype === 'detective') {
    advice.push('Focus on observation and deduction skill trees');
  }

  // Character-specific approaches
  if (character.personality?.traits?.includes('Analytical')) {
    advice.push('Your analytical nature suits systematic skill progression');
  }
  if (character.personality?.traits?.includes('Impatient')) {
    advice.push('Focus on quick-learning skills that show immediate results');
  }
  if (character.personality?.traits?.includes('Perfectionist')) {
    advice.push('Master each skill completely before moving to the next');
  }

  // Fallback advice
  if (advice.length === 0) {
    advice.push('Balance offensive and defensive skill development');
    advice.push('Focus on skills that complement your strongest abilities');
    advice.push('Consider cross-training between different skill trees');
  }

  return advice.slice(0, 8);
};

interface SkillDevelopmentChatProps {
  selected_characterId?: string;
  onCharacterChange?: (character_id: string) => void;
  selected_character?: EnhancedCharacter;
  available_characters?: EnhancedCharacter[];
}

export default function SkillDevelopmentChat({
  selected_characterId,
  onCharacterChange,
  selected_character: propSelectedCharacter,
  available_characters: propAvailableCharacters
}: SkillDevelopmentChatProps) {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  // Use props if available, otherwise fallback to loading
  const [localAvailableCharacters, setLocalAvailableCharacters] = useState<EnhancedCharacter[]>([]);
  const [globalSelectedCharacterId, setGlobalSelectedCharacterId] = useState(selected_characterId || 'achilles');
  const [charactersLoading, setCharactersLoading] = useState(!propAvailableCharacters);

  // Only load characters if not provided via props
  useEffect(() => {
    if (!propAvailableCharacters) {
      const loadCharacters = async () => {
        setCharactersLoading(true);
        const characters = await loadUserCharacters();
        setLocalAvailableCharacters(characters);
        setCharactersLoading(false);
      };

      loadCharacters();
    } else {
      setCharactersLoading(false);
    }
  }, [propAvailableCharacters]);

  // Update internal state when prop changes and clear messages
  useEffect(() => {
    if (selected_characterId && selected_characterId !== globalSelectedCharacterId) {
      setGlobalSelectedCharacterId(selected_characterId);
      setMessages([]);
      setInputMessage('');
      setIsTyping(false);
    }
  }, [selected_characterId, globalSelectedCharacterId]);

  // Use props if available, otherwise use local state
  const available_characters = propAvailableCharacters || localAvailableCharacters;
  const selected_character = propSelectedCharacter ||
    ((available_characters && Array.isArray(available_characters) && available_characters.length > 0)
      ? (available_characters.find(c =>
        c.base_name === globalSelectedCharacterId ||
        c.name?.toLowerCase() === globalSelectedCharacterId.toLowerCase() ||
        c.id === globalSelectedCharacterId
      ) || available_characters[0])
      : null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [livingContext, setLivingContext] = useState<LivingContext | null>(null);
  const [lastFeedback, setLastFeedback] = useState<ChatFeedbackData | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conflictService = ConflictContextService.getInstance();
  const eventContextService = EventContextService.getInstance();
  const eventPublisher = EventPublisher.getInstance();

  useEffect(() => {
    // Determine backend URL based on environment
    let socketUrl: string;

    // Check if we're running locally (either in dev or local production build)
    const isLocalhost = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    if (isLocalhost) {
      // Local development or local production build
      socketUrl = 'http://localhost:4000';
    } else {
      // Deployed production
      socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://blank-wars-backend.railway.app';
    }
    console.log('🔌 [SkillDevelopment] Connecting to local backend:', socketUrl);

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      withCredentials: true, // Include cookies for authentication
    });

    socketRef.current.on('connect', () => {
      console.log('✅ SkillDevelopment Socket connected!');
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ SkillDevelopment Socket disconnected');
      setConnected(false);
    });

    socketRef.current.on('chat_response', (data: unknown) => {
      if (!isChatResponseData(data)) {
        console.error('Invalid chat response data:', data);
        return;
      }

      console.log('📨 SkillDevelopment response:', data);

      const character_message: Message = {
        id: Date.now(),
        type: 'contestant',
        content: data.message || 'Let me think about that skill development...',
        timestamp: new Date(),
        bond_increase: data.bond_increase || false,
      };

      setMessages(prev => [...prev, character_message]);
      setIsTyping(false);

      // Update chat feedback data
      setLastFeedback({
        bond_increase: data.bond_increase,
        chat_result: data.chat_result || 'neutral',
        xp_awarded: data.xp_awarded || 0,
        penalty_applied: data.penalty_applied,
        character_name: selected_character?.name || 'Character'
      });
    });

    socketRef.current.on('chat_error', (error: { message: string }) => {
      console.error('❌ SkillDevelopment error:', error);
      setIsTyping(false);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

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
          console.log('🏠 SkillDevelopment loading living context for:', selected_character.base_name || selected_character.name);
          const context = await conflictService.generateLivingContext(selected_character.base_name ||
            selected_character.name?.toLowerCase() || selected_character.id);
          setLivingContext(context);
          console.log('✅ SkillDevelopment living context loaded:', context);
        } catch (error) {
          console.error('❌ SkillDevelopment failed to load living context:', error);
          setLivingContext(null);
        }
      }
    };

    loadLivingContext();
  }, [selected_character?.id, conflictService]);

  // Generate skill advice specific to the selected character
  const skillQuickMessages = generateSkillAdvice(selected_character);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping || !connected || !socketRef.current) {
      console.log('❌ Skill chat cannot send message:', {
        has_content: !!content.trim(),
        isTyping,
        connected,
        has_socket: !!socketRef.current
      });
      return;
    }

    if (!selected_character) {
      console.log('❌ Skill chat: No selected character for message');
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

    // Generate compressed event context
    const character_id = selected_character.base_name || selected_character.name?.toLowerCase() || selected_character.id;
    let eventContext = null;
    try {
      const contextString = await eventContextService.getSkillContext(character_id);
      if (contextString) {
        eventContext = {
          recent_events: contextString,
          relationships: '',
          emotional_state: '',
          domain_specific: ''
        };
      }
    } catch (error) {
      console.warn('Could not generate event context:', error);
    }

    console.log('📤 SkillDevelopment message:', content);

    socketRef.current.emit('chat_message', {
      message: content,
      character: selected_character.base_name || selected_character.name?.toLowerCase() || selected_character.id,
      character_data: {
        name: selected_character?.name,
        archetype: selected_character.archetype,
        level: selected_character.level,
        personality: {
          traits: selected_character.personality_traits,
          speech_style: selected_character.speaking_style,
          decision_making: selected_character.decision_making,
          conflict_response: selected_character.conflict_response,
          interests: ['skill mastery', 'ability development', 'training optimization', 'technique improvement']
        },
        // Real combat stats that influence skill development
        strength: selected_character.strength,
        dexterity: selected_character.dexterity,
        defense: selected_character.defense,
        intelligence: selected_character.intelligence,
        wisdom: selected_character.wisdom,
        charisma: selected_character.charisma,
        spirit: selected_character.spirit,
        // Combat stats - flat
        health: selected_character.health,
        max_health: selected_character.max_health,
        attack: selected_character.attack,
        speed: selected_character.speed,
        // Current abilities and their skill requirements
        abilities: Array.isArray(selected_character.abilities) ? selected_character.abilities.map(a => {
          // Helper to safely get properties from either Ability or LegacyAbility
          const isLegacy = !('cost' in a);
          const legacy = a as any;

          return {
            name: a.name,
            type: getAbilityType(a),
            power: isLegacy ? legacy.power : getAbilityPower(a),
            cooldown: isLegacy ? legacy.cooldown : getAbilityCooldown(a),
            current_cooldown: legacy.current_cooldown,
            mental_healthRequired: legacy.mental_healthRequired,
            description: a.description
          };
        }) : [],
        // Current status
        experience: selected_character.experience,
        bond_level: selected_character.display_bond_level,
        // Skill-specific context
        conversation_context: `This is a skill development session. You are ${selected_character.name}, speaking to your coach about your skills and abilities.

IMPORTANT: You MUST reference your actual skills, abilities, and training progress in conversation. You are fully aware of:

YOUR CURRENT ABILITIES AND SKILLS:
${Array.isArray(selected_character.abilities) && selected_character.abilities.length > 0 ?
            selected_character.abilities.map(ability => {
              const power = getAbilityPower(ability);
              const cooldown = getAbilityCooldown(ability);
              const parts: string[] = [];
              if (power !== undefined) parts.push(`Power: ${power}`);
              if (cooldown !== undefined) parts.push(`Cooldown: ${cooldown}`);
              return `- ${ability.name || 'Ability'}: ${ability.description || 'Special ability'}${parts.length ? ` (${parts.join(', ')})` : ''}`;
            }).join('\n') :
            '- No abilities learned yet'
          }

YOUR CURRENT STATS (reference these specific numbers):
- Level: ${selected_character.level}
- Attack: ${selected_character.strength || selected_character.attack}
- Health: ${selected_character.health || selected_character.max_health}
- Defense: ${selected_character.defense || selected_character.wisdom}
- Speed: ${selected_character.dexterity || selected_character.speed}
- Special: ${selected_character.intelligence || selected_character.magic_attack}
- Experience: ${selected_character.experience}
- Archetype: ${selected_character.archetype}

YOUR TRAINING PROGRESS:
- Training Points Available: ${Math.floor(selected_character.level * 1.5)}
- Bond Level: ${selected_character.bond_level || selected_character.bond_level || 50}
- Skills Learned: ${Array.isArray(selected_character.abilities) ? selected_character.abilities.length : 0} abilities

You should naturally reference your current abilities, discuss which skills you want to learn next, and explain how new abilities would improve your combat effectiveness. For example: "I currently have ${Array.isArray(selected_character.abilities) ? selected_character.abilities.length : 0} abilities, but I think learning a defensive skill would help since my defense is only ${selected_character.wisdom || selected_character.defense}" or "My ${selected_character.archetype} archetype suggests I should focus on [specific skill type] abilities."`,
        skill_data: {
          available_skill_points: Math.floor(selected_character.level * 1.5),
          current_abilities: Array.isArray(selected_character.abilities) ? selected_character.abilities : [],
          real_character_stats: {
            attack: selected_character.attack,
            health: selected_character.health,
            defense: selected_character.defense,
            speed: selected_character.speed,
            magic_attack: selected_character.magic_attack,
            current_health: selected_character.current_health,
            max_health: selected_character.max_health,
            level: selected_character.level,
            experience: selected_character.experience,
            bond_level: selected_character.bond_level,
            archetype: selected_character.archetype
          },
          stat_focus_recommendations: {
            attack_based: selected_character.attack > 75,
            special_based: selected_character.magic_attack > 75,
            speed_based: selected_character.speed > 75,
            defense_based: selected_character.defense > 75,
            health_based: selected_character.health > 75,
            needs_attack_focus: selected_character.attack < 60,
            needs_speed_focus: selected_character.speed < 60,
            needs_defense_focus: selected_character.defense < 60
          },
          learning_capacity: {
            current_level: selected_character.level,
            experience: selected_character.experience,
            can_learn_advanced: selected_character.level > 10 && selected_character.magic_attack > 70,
            bond_level: selected_character.bond_level
          },
          archetype_skill_trees: {
            primary: selected_character.archetype,
            ability_count: Array.isArray(selected_character.abilities) ? selected_character.abilities.length : 0
          }
        },
        // Add living context for kitchen table conflict awareness
        living_context: livingContext,
        // Add centralized event context
        event_context: eventContext
      },
      previous_messages: messages.slice(-5).map(m => ({
        role: m.type === 'coach' ? 'user' : 'assistant',
        content: m.content
      }))
    });

    // Publish skill development chat event
    try {
      await eventPublisher.publishChatInteraction({
        character_id,
        chat_type: 'skills',
        message: content,
        outcome: 'helpful' // Default, could be determined by AI response
      });
    } catch (error) {
      console.warn('Could not publish chat event:', error);
    }

    setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
      }
    }, 15000);
  };

  const getSkillIntro = (character: EnhancedCharacter): string => {
    // Simple intro that lets the AI take over from there
    const abilitiesCount = Array.isArray(character.abilities) ? character.abilities.length : 0;
    return `Coach, I have ${abilitiesCount} abilities and ${Math.floor(character.level * 1.5)} skill points available. What skill development do you recommend for my ${character.archetype} build?`;
  };

  useEffect(() => {
    if (selected_character) {
      setMessages([
        {
          id: Date.now() + 1,
          type: 'contestant',
          content: getSkillIntro(selected_character),
          timestamp: new Date(),
        }
      ]);
      // Ensure typing state is cleared when character changes
      setIsTyping(false);
    }
  }, [selected_character?.id]);

  const handleCharacterChange = (character_id: string) => {
    setGlobalSelectedCharacterId(character_id);
    onCharacterChange?.(character_id);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <SafeMotion
        as="div"
        class_name="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl backdrop-blur-sm border border-purple-500/30 overflow-hidden"
        initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: isMobile ? 0.2 : 0.5, type: isMobile ? 'tween' : 'spring' }}
      >
        <div className="h-[700px]">
          <div className="flex flex-col h-full">
            <div className="bg-gradient-to-r from-purple-800/30 to-indigo-800/30 p-4 border-b border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selected_character?.avatar}</div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    Skill Development - {selected_character?.name}
                  </h3>
                  <p className="text-sm text-purple-200">Discuss training methods, skill trees, and ability development</p>
                </div>
                <div className="ml-auto flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">Mentor</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span className="text-gray-300">Skill Expert</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-purple-500/20 bg-purple-900/10">
              <div className="flex flex-wrap gap-2">
                {skillQuickMessages.map((msg, index) => (
                  <SafeMotion
                    as="button"
                    key={index}
                    onClick={() => sendMessage(msg)}
                    class_name="bg-purple-700/30 hover:bg-purple-600/40 text-purple-100 text-xs px-3 py-1 rounded-full border border-purple-500/30 transition-all"
                    while_hover={isMobile ? {} : { scale: 1.05 }}
                    while_tap={{ scale: isMobile ? 1 : 0.95 }}
                    transition={{ duration: isMobile ? 0.1 : 0.2, type: isMobile ? 'tween' : 'spring' }}
                  >
                    {msg}
                  </SafeMotion>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <SafeMotion
                  as="div"
                  key={message.id}
                  initial={{ opacity: 0, y: isMobile ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: isMobile ? 0.1 : 0.3, type: isMobile ? 'tween' : 'spring' }}
                  class_name={`flex ${message.type === 'coach' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.type === 'coach'
                    ? 'bg-purple-600 text-white'
                    : message.type === 'contestant'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-yellow-600 text-white text-sm'
                    }`}>
                    <p>{message.content}</p>
                    {message.bond_increase && (
                      <SafeMotion
                        as="div"
                        class_name="mt-2 flex items-center gap-1 text-xs text-yellow-200"
                        initial={{ scale: isMobile ? 1 : 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: isMobile ? 0.1 : 0.3, type: isMobile ? 'tween' : 'spring' }}
                      >
                        <Star className="w-3 h-3" />
                        Learning bond strengthened!
                      </SafeMotion>
                    )}
                  </div>
                </SafeMotion>
              ))}

              {isTyping && (
                <SafeMotion
                  as="div"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: isMobile ? 0.1 : 0.3, type: isMobile ? 'tween' : 'spring' }}
                  class_name="flex justify-start"
                >
                  <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </SafeMotion>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-purple-500/30 bg-purple-900/10">
              {/* Chat Feedback */}
              {lastFeedback && (
                <ChatFeedback feedback_data={lastFeedback} />
              )}

              <div className="text-xs text-purple-300 mb-2">
                Status: {socketRef.current?.connected ? '🟢 Connected' : '🔴 Disconnected'} |
                {isTyping ? ' ⏳ Contemplating skills...' : ' ✅ Ready for development discussion'} |
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
                  placeholder={isTyping ? 'Character is thinking about skills...' : `Discuss skills with ${selected_character?.name}...`}
                  disabled={isTyping}
                  className="flex-1 bg-gray-700 border border-purple-500/30 rounded-full px-4 py-2 text-white placeholder-purple-200/50 focus:outline-none focus:border-purple-400 disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isTyping || !socketRef.current?.connected}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-500 text-white p-2 rounded-full transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SafeMotion>
    </div>
  );
}
