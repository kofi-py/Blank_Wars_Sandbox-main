'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { Send, Heart, Star, User, Sword, Shield, Zap } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { characterAPI } from '../services/apiClient';
import { Contestant as Character, Equipment } from '@blankwars/types';
import ConflictContextService, { LivingContext } from '../services/conflictContextService';
import EventContextService from '../services/eventContextService';
import EventPublisher from '../services/eventPublisher';
import GameEventBus, { GameEvent } from '../services/gameEventBus';
import ChatFeedback, { ChatFeedbackData } from './ChatFeedback';
import { ChatResponseData, isChatResponseData } from '@/types/socket';
import { sendViaAIChat } from '../services/chatAdapter';

interface Message {
  id: number;
  type: 'coach' | 'contestant' | 'system';
  content: string;
  timestamp: Date;
  bond_increase?: boolean;
}

export interface EnhancedCharacter extends Character {
  base_name: string;
  display_bond_level: number;
}

const loadUserCharacters = async (): Promise<EnhancedCharacter[]> => {
  try {
    const characters = await characterAPI.get_user_characters();

    return characters.map((char: Character) => {
      const base_name = char.name?.toLowerCase() || char.id?.split('_')[0] || 'unknown';
      return {
        ...char, // All stats already here from backend
        base_name,
        display_bond_level: char.bond_level || Math.floor(char.base_health / 10),
        abilities: char.abilities || [],
        archetype: char.archetype, // No fallback - must be from DB
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

// Generate character-specific equipment advice based on actual gear and stats
const generateEquipmentAdvice = (character: EnhancedCharacter): string[] => {
  const advice: string[] = [];

  // Safety check to prevent destructuring errors
  if (!character) {
    return ["Check your equipment regularly", "Upgrade when possible", "Match gear to your fighting style"];
  }

  const { archetype, strength, intelligence, dexterity, defense, speed, attack, critical_chance } = character;

  // Archetype-specific equipment recommendations
  if (archetype === 'warrior' && strength && strength < 80) {
    advice.push(`As a warrior, you need strength-boosting weapons - current strength is only ${strength}`);
  }
  if (archetype === 'mage' && intelligence && intelligence < 80) {
    advice.push(`Your intelligence (${intelligence}) needs magical equipment enhancement`);
  }
  if (archetype === 'assassin' && dexterity && dexterity < 80) {
    advice.push(`Precision weapons would suit your assassin skills better - dexterity is ${dexterity}`);
  }

  // Defense recommendations based on defense stat
  if (defense && defense < 70) {
    advice.push(`Your defense (${defense}) is low - consider heavier armor for protection`);
  }
  if (defense && defense > 90) {
    advice.push(`Your high defense (${defense}) allows for lighter, faster armor`);
  }

  // Speed-based equipment advice
  if (speed && speed < 60) {
    advice.push(`Your speed (${speed}) needs mobility-enhancing gear`);
  }
  if (speed && speed > 85) {
    advice.push(`Your excellent speed (${speed}) would benefit from agility-focused equipment`);
  }

  // Combat stat-based equipment needs
  if (attack && attack < 100) {
    advice.push('Focus on offensive weapons to boost your attack power');
  }
  if (defense && defense < 80) {
    advice.push('Invest in defensive gear to improve your survivability');
  }
  if (critical_chance && critical_chance < 20) {
    advice.push('Consider crit-boosting accessories to enhance your damage output');
  }

  // Mental state equipment considerations
  if (character.psych_stats?.mental_health && character.psych_stats.mental_health < 60) {
    advice.push('Choose reliable, simple equipment until your mental health improves');
  }
  if (character.psych_stats?.ego && character.psych_stats.ego > 80) {
    advice.push('Flashy, prestigious equipment would suit your high ego personality');
  }

  // Character-specific recommendations
  if (character.personality?.traits?.includes('Prideful')) {
    advice.push('Your pride demands equipment that makes a statement');
  }
  if (character.personality?.traits?.includes('Honorable')) {
    advice.push('Focus on traditional, well-crafted gear over flashy appearance');
  }

  // Fallback advice if nothing specific applies
  if (advice.length === 0) {
    advice.push('Balance offense and defense based on your role');
    advice.push('Consider equipment that enhances your strongest stats');
    advice.push('Upgrade gear that matches your fighting style');
  }

  return advice.slice(0, 8);
};

interface EquipmentAdvisorChatProps {
  selected_characterId?: string;
  onCharacterChange?: (character_id: string) => void;
  selected_character?: EnhancedCharacter;
  available_characters?: EnhancedCharacter[];
}

export default function EquipmentAdvisorChat({
  selected_characterId,
  onCharacterChange,
  selected_character: propSelectedCharacter,
  available_characters: propAvailableCharacters
}: EquipmentAdvisorChatProps) {
  const { isMobile } = useMobileSafeMotion();
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
      // Clear messages when character changes
      setMessages([]);
      setInputMessage('');
      setIsTyping(false);
    }
  }, [selected_characterId, globalSelectedCharacterId]);

  // Use props if available, otherwise use local state
  const available_characters = propAvailableCharacters || localAvailableCharacters;
  const selected_character = propSelectedCharacter || available_characters.find(c => c.base_name === globalSelectedCharacterId) || available_characters[0];
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

    console.log('🔌 [EquipmentAdvisor] Connecting to backend:', socketUrl);

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      withCredentials: true, // Include cookies for authentication
    });

    socketRef.current.on('connect', () => {
      console.log('✅ EquipmentAdvisor Socket connected!');
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ EquipmentAdvisor Socket disconnected');
      setConnected(false);
    });

    socketRef.current.on('chat_response', (data: unknown) => {
      if (!isChatResponseData(data)) {
        console.error('Invalid chat response data:', data);
        return;
      }

      console.log('📨 EquipmentAdvisor response:', data);

      const character_message: Message = {
        id: Date.now(),
        type: 'contestant',
        content: data.message || 'Let me consider that equipment choice...',
        timestamp: new Date(),
        bond_increase: data.bond_increase || false,
      };

      setMessages(prev => [...prev, character_message]);
      setIsTyping(false);

      // Update chat feedback data
      setLastFeedback({
        bond_increase: data.bond_increase,
        chat_result: data.chat_result || 'neutral',
        xp_awarded: data.xp_awarded,
        penalty_applied: data.penalty_applied,
        character_name: selected_character?.name || 'Character'
      });
    });

    socketRef.current.on('chat_error', (error: { message: string }) => {
      console.error('❌ EquipmentAdvisor error:', error);
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
          console.log('🏠 EquipmentAdvisor loading living context for:', selected_character.id);
          const context = await conflictService.generateLivingContext(selected_character.id);
          setLivingContext(context);
          console.log('✅ EquipmentAdvisor living context loaded:', context);
        } catch (error) {
          console.error('❌ EquipmentAdvisor failed to load living context:', error);
          setLivingContext(null);
        }
      }
    };

    loadLivingContext();
  }, [selected_character?.id, conflictService]);

  // Generate equipment advice specific to the selected character
  const equipmentQuickMessages = generateEquipmentAdvice(selected_character);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping || !connected || !socketRef.current) {
      console.log('❌ Equipment chat cannot send message:', {
        has_content: !!content.trim(),
        isTyping,
        connected,
        has_socket: !!socketRef.current
      });
      return;
    }

    if (!selected_character) {
      console.log('❌ Equipment chat: No selected character for message');
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

    console.log('📤 EquipmentAdvisor message:', content);

    // Only proceed if connected and socket available
    if (!connected || !socketRef.current) {
      console.log('❌ Cannot send message: not connected to backend');
      return;
    }

    setIsTyping(true);

    // Generate compressed event context
    const userchar_id = selected_character.id; // User-character UUID
    const canonicalCharId = selected_character.character_id; // Base character ID for agent key

    if (!canonicalCharId) {
      throw new Error(`Equipment chat: character missing character_id: ${selected_character.name}`);
    }
    let eventContext = null;
    try {
      const contextString = await eventContextService.getEquipmentContext(userchar_id);
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

    // Use real character equipment data instead of fake data
    const currentEquipment = selected_character.equipped_items || {};
    const inventory = selected_character.inventory || [];
    const character_level = selected_character.level || 1;

    const __reply = await sendViaAIChat('equipment', {
      message: content,
      agent_key: canonicalCharId, // Use canonical character ID for agent key
      userchar_id: userchar_id, // The user-character UUID
      character: canonicalCharId,
      character_data: {
        name: selected_character?.name,
        archetype: selected_character.archetype,
        level: selected_character.level,
        personality: selected_character.personality || {
          traits: ['Equipment-focused'],
          speech_style: 'Direct',
          motivations: ['Excellence', 'Efficiency'],
          fears: ['Inadequate gear'],
          relationships: []
        },
        // Real combat stats that affect equipment choices
        strength: selected_character.strength,
        dexterity: selected_character.dexterity,
        defense: selected_character.defense,
        intelligence: selected_character.intelligence,
        wisdom: selected_character.wisdom,
        charisma: selected_character.charisma,
        spirit: selected_character.spirit,
        // Combat stats - flat
        attack: selected_character.attack,
        speed: selected_character.speed,
        health: selected_character.health,
        max_health: selected_character.max_health,
        // Current status
        current_health: selected_character.health,
        injuries: selected_character.injuries,
        bond_level: selected_character.display_bond_level,
        // Equipment-specific context
        conversation_context: `This is an equipment advisory session. You are ${selected_character.name}, speaking to your coach about your equipment and gear.

IMPORTANT: You MUST reference your actual equipment and inventory in conversation. You are fully aware of:

YOUR CURRENT STATS (reference these specific numbers):
- Level: ${selected_character.level}
- Attack: ${selected_character.attack}
- Health: ${selected_character.health}/${selected_character.max_health} (current/max)
- Defense: ${selected_character.defense}
- Speed: ${selected_character.speed}
- Magic Attack: ${selected_character.magic_attack}
- Archetype: ${selected_character.archetype}

YOUR CURRENT EQUIPMENT:
${Object.keys(currentEquipment).length > 0 ?
            Object.entries(currentEquipment).map(([slot, item]: [string, Equipment]) => `- ${slot}: ${item.name} (${item.type})`).join('\n') :
            '- No equipment currently equipped'
          }

YOUR INVENTORY (${inventory.length} items):
${inventory.length > 0 ?
            inventory.slice(0, 5).map(item => `- ${item.name} (${item.type}) - ${item.description || 'Equipment item'}`).join('\n') :
            '- No items in inventory'
          }

You should naturally reference your current equipment, mention specific items in your inventory, and suggest equipment changes based on your stats. For example: "My attack is ${selected_character.attack}, so I think that sword in my inventory would boost my damage" or "I'm currently using ${Object.keys(currentEquipment)[0] || 'basic gear'}, but I noticed that [specific item] might work better for my ${selected_character.archetype} fighting style."`,
        equipment_data: {
          current_equipment: currentEquipment,
          inventory: inventory,
          character_level: character_level,
          real_character_stats: {
            attack: selected_character.attack,
            health: selected_character.health,
            defense: selected_character.defense,
            speed: selected_character.speed,
            magic_attack: selected_character.magic_attack,
            level: selected_character.level,
            archetype: selected_character.archetype
          },
          stat_based_recommendations: {
            strength_based: selected_character.attack > 80,
            speed_based: selected_character.speed > 80,
            defense_based: selected_character.defense > 80,
            health_based: selected_character.max_health > 80,
            magic_based: selected_character.magic_attack > 80,
            needs_attack_boost: selected_character.attack < 60,
            needs_health_boost: selected_character.max_health < 60,
            needs_defense_boost: selected_character.defense < 60,
            needs_speed_boost: selected_character.speed < 60
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

    const replyText = typeof __reply === 'string' ? __reply : __reply?.text || 'Let me help with your equipment!';
    setMessages(prev => [...prev, { id: Date.now(), type: 'contestant', content: replyText, timestamp: new Date() }]);
    setIsTyping(false);

    // Publish equipment chat event
    try {
      const eventBus = GameEventBus.getInstance();
      await eventBus.publish({
        type: 'equipment_advice_requested',
        source: 'equipment_advisor',
        primary_character_id: selected_character.id,
        severity: 'low',
        category: 'equipment',
        description: `${selected_character.name} asked for equipment advice: "${content.substring(0, 100)}..."`,
        metadata: {
          request_type: 'equipment_advice',
          message_length: content.length,
          character_level: selected_character.level,
          current_archetype: selected_character.archetype
        },
        tags: ['equipment', 'advice', 'coaching']
      });
    } catch (error) {
      console.warn('Could not publish equipment event:', error);
    }

  };

  const getEquipmentIntro = (character: EnhancedCharacter): string => {
    // Simple intro that lets the AI take over from there
    return `Coach, I've been thinking about my gear lately. What equipment advice do you have for me?`;
  };

  useEffect(() => {
    if (selected_character) {
      setMessages([
        {
          id: Date.now() + 1,
          type: 'contestant',
          content: getEquipmentIntro(selected_character),
          timestamp: new Date(),
        }
      ]);
      // Ensure typing state is cleared when character changes
      setIsTyping(false);
    }
  }, [selected_character?.id]);

  // Listen for autonomous equipment decisions from EquipmentManager
  useEffect(() => {
    const eventBus = GameEventBus.getInstance();

    const handleAutonomousDecision = (event: GameEvent) => {
      console.log(`📨 [EquipmentAdvisorChat] Received autonomous decision event:`, event);

      // Only show message if it's for the currently selected character
      if (event.metadata.character_id === selected_characterId || event.metadata.character_name === selected_character?.name) {
        const newMessage: Message = {
          id: Date.now(),
          type: 'contestant',
          content: event.metadata.message,
          timestamp: new Date(),
        };

        console.log(`💬 [EquipmentAdvisorChat] Adding autonomous decision message to chat:`, newMessage);
        setMessages(prev => [...prev, newMessage]);
      }
    };

    // subscribe() returns an unsubscribe function
    const unsubscribe = eventBus.subscribe('equipment:autonomous_decision', handleAutonomousDecision);

    return () => {
      unsubscribe();
    };
  }, [selected_characterId, selected_character?.name]);

  const handleCharacterChange = (character_id: string) => {
    setGlobalSelectedCharacterId(character_id);
    onCharacterChange?.(character_id);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <SafeMotion
        as="div"
        class_name="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-xl backdrop-blur-sm border border-blue-500/30 overflow-hidden"
        initial={{ opacity: 0, y: isMobile ? 10 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: isMobile ? 0.3 : 0.5 }}
      >
        <div className="h-[700px]">
          <div className="flex flex-col h-full">
            <div className="bg-gradient-to-r from-blue-800/30 to-cyan-800/30 p-4 border-b border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{selected_character?.avatar}</div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sword className="w-5 h-5 text-blue-400" />
                    Equipment Advisor - {selected_character?.name}
                  </h3>
                  <p className="text-sm text-blue-200">Discuss gear choices, weapon preferences, and equipment strategy</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Focus: Gear Optimization</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-blue-500/20 bg-blue-900/10">
              <div className="flex flex-wrap gap-2">
                {equipmentQuickMessages.map((msg, index) => (
                  <motion.button
                    key={index}
                    onClick={() => sendMessage(msg)}
                    className="bg-blue-700/30 hover:bg-blue-600/40 text-blue-100 text-xs px-3 py-1 rounded-full border border-blue-500/30 transition-all"
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
                    ? 'bg-blue-600 text-white'
                    : message.type === 'contestant'
                      ? 'bg-cyan-600 text-white'
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
                        Equipment bond strengthened!
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
                  <div className="bg-cyan-600 text-white px-4 py-2 rounded-lg">
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

            <div className="p-4 border-t border-blue-500/30 bg-blue-900/10">
              {/* Chat Feedback */}
              {lastFeedback && (
                <ChatFeedback feedback_data={lastFeedback} />
              )}

              <div className="text-xs text-blue-300 mb-2">
                Status: {socketRef.current?.connected ? '🟢 Connected' : '🔴 Disconnected'} |
                {isTyping ? ' ⏳ Examining equipment...' : ' ✅ Ready for gear discussion'} |
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
                  placeholder={isTyping ? 'Character is considering equipment...' : `Ask ${selected_character?.name} about gear...`}
                  disabled={isTyping}
                  className="flex-1 bg-gray-700 border border-blue-500/30 rounded-full px-4 py-2 text-white placeholder-blue-200/50 focus:outline-none focus:border-blue-400 disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isTyping || !socketRef.current?.connected}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-500 text-white p-2 rounded-full transition-all"
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
