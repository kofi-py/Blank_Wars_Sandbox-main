'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { Send, Heart, Star, User, Zap, Flame, Sparkles } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { characterAPI } from '../services/apiClient';
import { Contestant as Character } from '@blankwars/types';
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
                avatar: char.avatar || '⚡',
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

// Generate character-specific abilities advice based on stats and archetype
const generateAbilitiesAdvice = (character: EnhancedCharacter): string[] => {
    const advice: string[] = [];

    // Safety check to prevent destructuring errors
    if (!character) {
        return ["What powers should I unlock next?", "How can I improve my spells?", "Let's discuss my combat style"];
    }

    const { archetype, strength, intelligence, dexterity, spirit, magic_attack } = character;

    // Archetype-specific advice
    if (archetype === 'warrior') {
        advice.push("Should I focus on physical powers or defensive buffs?");
        advice.push("How can I use magic to support my melee attacks?");
    } else if (archetype === 'mage') {
        advice.push("Which high-tier spells should I aim for?");
        advice.push("How do I balance mana cost with damage output?");
    } else if (archetype === 'assassin') {
        advice.push("Are there powers that help with stealth?");
        advice.push("What spells complement a hit-and-run style?");
    }

    // Stat-based advice
    if (intelligence && intelligence > 80) {
        advice.push(`My high intelligence (${intelligence}) suggests I should learn complex spells.`);
    }
    if (strength && strength > 80) {
        advice.push(`With my strength (${strength}), physical powers seem like the best choice.`);
    }
    if (spirit && spirit < 50) {
        advice.push(`My spirit is low (${spirit}). Should I focus on passive buffs?`);
    }

    // Fallback advice
    if (advice.length === 0) {
        advice.push("What's the best ability for my current level?");
        advice.push("I want to diversify my skill set.");
        advice.push("Should I upgrade existing powers or unlock new ones?");
    }

    return advice.slice(0, 6);
};

interface AbilitiesDevelopmentChatProps {
    selected_characterId?: string;
    onCharacterChange?: (character_id: string) => void;
    selected_character?: EnhancedCharacter;
    available_characters?: EnhancedCharacter[];
}

export default function AbilitiesDevelopmentChat({
    selected_characterId,
    onCharacterChange,
    selected_character: propSelectedCharacter,
    available_characters: propAvailableCharacters
}: AbilitiesDevelopmentChatProps) {
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

        console.log('🔌 [AbilitiesChat] Connecting to backend:', socketUrl);

        socketRef.current = io(socketUrl, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            withCredentials: true, // Include cookies for authentication
        });

        socketRef.current.on('connect', () => {
            console.log('✅ AbilitiesChat Socket connected!');
            setConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('❌ AbilitiesChat Socket disconnected');
            setConnected(false);
        });

        socketRef.current.on('chat_response', (data: unknown) => {
            if (!isChatResponseData(data)) {
                console.error('Invalid chat response data:', data);
                return;
            }

            console.log('📨 AbilitiesChat response:', data);

            const character_message: Message = {
                id: Date.now(),
                type: 'contestant',
                content: data.message || 'I need to think about my training...',
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
            console.error('❌ AbilitiesChat error:', error);
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
                    console.log('🏠 AbilitiesChat loading living context for:', selected_character.id);
                    const context = await conflictService.generateLivingContext(selected_character.id);
                    setLivingContext(context);
                    console.log('✅ AbilitiesChat living context loaded:', context);
                } catch (error) {
                    console.error('❌ AbilitiesChat failed to load living context:', error);
                    setLivingContext(null);
                }
            }
        };

        loadLivingContext();
    }, [selected_character?.id, conflictService]);

    // Generate abilities advice specific to the selected character
    const abilitiesQuickMessages = generateAbilitiesAdvice(selected_character);

    const sendMessage = async (content: string) => {
        if (!content.trim() || isTyping || !connected || !socketRef.current) {
            console.log('❌ Abilities chat cannot send message:', {
                has_content: !!content.trim(),
                isTyping,
                connected,
                has_socket: !!socketRef.current
            });
            return;
        }

        if (!selected_character) {
            console.log('❌ Abilities chat: No selected character for message');
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

        console.log('📤 AbilitiesChat message:', content);

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
            throw new Error(`Abilities chat: character missing character_id: ${selected_character.name}`);
        }
        let eventContext = null;
        try {
            // Use the new getAbilitiesContext method
            const contextString = await eventContextService.getAbilitiesContext(userchar_id);
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

        const __reply = await sendViaAIChat('abilities', {
            message: content,
            agent_key: canonicalCharId, // Use canonical character ID for agent key
            userchar_id: userchar_id, // The user-character UUID
            character: canonicalCharId,
            character_data: {
                name: selected_character?.name,
                archetype: selected_character.archetype,
                level: selected_character.level,
                personality: selected_character.personality || {
                    traits: ['Power-focused'],
                    speech_style: 'Direct',
                    motivations: ['Strength', 'Mastery'],
                    fears: ['Weakness'],
                    relationships: []
                },
                // Real combat stats
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
                // Abilities-specific context
                conversation_context: `This is an abilities coaching session. You are ${selected_character.name}, speaking to your coach about your powers and spells.
        
IMPORTANT: You have both innate POWERS (biological/structural) and learned SPELLS (magical/arcane).
Your goal is to become stronger by developing both.

YOUR CURRENT STATS:
- Level: ${selected_character.level}
- Archetype: ${selected_character.archetype}
- Strength: ${selected_character.strength} (affects physical powers)
- Intelligence: ${selected_character.intelligence} (affects spell potency)

Discuss your training strategy. Do you prefer relying on your natural powers or studying magic? How do they complement each other?`,
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

        const replyText = typeof __reply === 'string' ? __reply : __reply?.text || 'Let me think about my training...';
        setMessages(prev => [...prev, { id: Date.now(), type: 'contestant', content: replyText, timestamp: new Date() }]);
        setIsTyping(false);

        // Publish abilities chat event
        try {
            const eventBus = GameEventBus.getInstance();
            await eventBus.publish({
                type: 'abilities_advice_requested',
                source: 'abilities_advisor',
                primary_character_id: selected_character.id,
                severity: 'low',
                category: 'training',
                description: `${selected_character.name} asked for abilities advice: "${content.substring(0, 100)}..."`,
                metadata: {
                    request_type: 'abilities_advice',
                    message_length: content.length,
                    character_level: selected_character.level,
                    current_archetype: selected_character.archetype
                },
                tags: ['abilities', 'powers', 'spells', 'advice', 'coaching']
            });
        } catch (error) {
            console.warn('Could not publish abilities event:', error);
        }

    };

    const getAbilitiesIntro = (character: EnhancedCharacter): string => {
        return `Coach, I'm ready to discuss my combat development. Should we focus on my Powers or my Spells today?`;
    };

    useEffect(() => {
        if (selected_character) {
            setMessages([
                {
                    id: Date.now() + 1,
                    type: 'contestant',
                    content: getAbilitiesIntro(selected_character),
                    timestamp: new Date(),
                }
            ]);
            // Ensure typing state is cleared when character changes
            setIsTyping(false);
        }
    }, [selected_character?.id]);

    // Listen for autonomous ability decisions (if any)
    useEffect(() => {
        const eventBus = GameEventBus.getInstance();

        const handleAutonomousDecision = (event: GameEvent) => {
            console.log(`📨 [AbilitiesChat] Received autonomous decision event:`, event);

            // Only show message if it's for the currently selected character
            if (event.metadata.character_id === selected_characterId || event.metadata.character_name === selected_character?.name) {
                const newMessage: Message = {
                    id: Date.now(),
                    type: 'contestant',
                    content: event.metadata.message || event.description,
                    timestamp: new Date(),
                };

                console.log(`💬 [AbilitiesChat] Adding autonomous decision message to chat:`, newMessage);
                setMessages(prev => [...prev, newMessage]);
            }
        };

        // subscribe() returns an unsubscribe function
        const unsubscribe = eventBus.subscribe('ability:autonomous_decision', handleAutonomousDecision);

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
                class_name="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl backdrop-blur-sm border border-purple-500/30 overflow-hidden"
                initial={{ opacity: 0, y: isMobile ? 10 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: isMobile ? 0.3 : 0.5 }}
            >
                <div className="h-[700px]">
                    <div className="flex flex-col h-full">
                        <div className="bg-gradient-to-r from-purple-800/30 to-indigo-800/30 p-4 border-b border-purple-500/30">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">{selected_character?.avatar}</div>
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-purple-400" />
                                        Abilities Development - {selected_character?.name}
                                    </h3>
                                    <p className="text-sm text-purple-200">Master your Powers and Spells</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <Flame className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm text-gray-300">Focus: Combat Potential</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-b border-purple-500/20 bg-purple-900/10">
                            <div className="flex flex-wrap gap-2">
                                {abilitiesQuickMessages.map((msg, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => sendMessage(msg)}
                                        className="bg-purple-700/30 hover:bg-purple-600/40 text-purple-100 text-xs px-3 py-1 rounded-full border border-purple-500/30 transition-all"
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
                                        ? 'bg-purple-600 text-white'
                                        : message.type === 'contestant'
                                            ? 'bg-indigo-600 text-white'
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
                                                Trust strengthened!
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
                                    <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
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

                        <div className="p-4 border-t border-purple-500/30 bg-purple-900/10">
                            {/* Chat Feedback */}
                            {lastFeedback && (
                                <ChatFeedback feedback_data={lastFeedback} />
                            )}

                            <div className="text-xs text-purple-300 mb-2">
                                Status: {socketRef.current?.connected ? '🟢 Connected' : '🔴 Disconnected'} |
                                {isTyping ? ' ⏳ Thinking...' : ' ✅ Ready'} |
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
                                    placeholder={isTyping ? 'Character is thinking...' : `Discuss abilities with ${selected_character?.name}...`}
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
