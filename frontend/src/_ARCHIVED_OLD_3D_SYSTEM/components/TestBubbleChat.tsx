'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, MessageCircle, ToggleLeft, ToggleRight, Send, Zap, Users, RefreshCw, Bot, Sparkles } from 'lucide-react';
import WordBubbleSystem, { WordBubbleSystemRef } from './WordBubbleSystem';
import { CharacterPosition, WordBubble as WordBubbleType, BubbleType, EmotionType } from '@/types/wordBubble';
import kitchenTableLocalAI from '../services/kitchenTableLocalAI';

// Real characters from the game database for kitchen table
const testCharacters = [
  { id: 'achilles', name: 'Achilles', avatar: '⚔️', headshot: '/images/HQ/Kitchen_Table/Kitchen_Table_Test/achilles_headshot.png' },
  { id: 'joan', name: 'Joan of Arc', avatar: '⚔️', headshot: '/images/HQ/Kitchen_Table/Kitchen_Table_Test/joan_of_arc_headshots.png' },
  { id: 'dracula', name: 'Count Dracula', avatar: '🧛', headshot: '/images/HQ/Kitchen_Table/Kitchen_Table_Test/dracula_headshot.png' },
  { id: 'merlin', name: 'Merlin', avatar: '🔮', headshot: '/images/characters/merlin_headshot.png' },
  { id: 'cleopatra', name: 'Cleopatra VII', avatar: '👑', headshot: '/images/characters/cleopatra_headshot.png' }
];

// Test messages for different scenarios
const testScenarios = {
  mundane: [
    { speaker: 'achilles', message: "Who left their sandals in the kitchen again?" },
    { speaker: 'julius_caesar', message: "Et tu, sandals? The floor is for walking, not storage." },
    { speaker: 'joan_of_arc', message: "Perhaps we need a shoe rack by the door?" },
    { speaker: 'dracula', message: "I don't wear shoes... but I support organization." }
  ],
  conflict: [
    { speaker: 'einstein', message: "The mathematical probability of finding a clean dish here approaches zero!" },
    { speaker: 'achilles', message: "Warriors don't wash dishes! That's what servants are for!" },
    { speaker: 'julius_caesar', message: "In Rome, we had slaves for this. Where are my slaves?" },
    { speaker: 'joan_of_arc', message: "We ALL live here. We ALL clean. This is ridiculous!" },
    { speaker: 'dracula', message: "The blood stains in the sink... they're not mine, I swear!" }
  ],
  chaos: [
    { speaker: 'dracula', message: "WHO ATE MY BLOOD BAGS?! THEY WERE CLEARLY LABELED!" },
    { speaker: 'achilles', message: "IT LOOKED LIKE WINE! HOW WAS I SUPPOSED TO KNOW?!" },
    { speaker: 'einstein', message: "Fascinating! Your digestive system handled Type O negative?" },
    { speaker: 'joan_of_arc', message: "EVERYONE CALM DOWN! Dracula, we'll get you more blood!" },
    { speaker: 'julius_caesar', message: "This is worse than the Senate on the Ides of March!" }
  ]
};

export default function TestBubbleChat() {
  const [isBubbleMode, setIsBubbleMode] = useState(true);
  const [messages, setMessages] = useState<Array<{id: string, speaker: string, message: string, timestamp: Date}>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selected_character, setSelectedCharacter] = useState(testCharacters[0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<'mundane' | 'conflict' | 'chaos'>('mundane');
  const bubbleSystemRef = useRef<WordBubbleSystemRef>(null);
  const [useLocalAI, setUseLocalAI] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Simple bubble integration  
  const addBubbleMessage = (character_id: string, message: string, type: BubbleType = 'speech', emotion: EmotionType = 'neutral') => {
    if (!isBubbleMode || !bubbleSystemRef.current) {
      console.log('Cannot add bubble:', { isBubbleMode, has_ref: !!bubbleSystemRef.current });
      return;
    }
    
    console.log('ADDING BUBBLE FOR:', character_id, 'MESSAGE:', message);
    bubbleSystemRef.current.add_bubble(character_id, message, { type, emotion });
  };

  // Register character positions when component loads
  useEffect(() => {
    if (!isBubbleMode) return;
    
    // Register character positions with the position manager
    testCharacters.forEach((char, index) => {
      const angle = (index / testCharacters.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 180;
      // Convert pixel positions to percentages
      const xPercent = ((Math.cos(angle) * radius + 400) / 800) * 100;
      const yPercent = ((Math.sin(angle) * radius + 280) / 500) * 100;
      
      console.log(`Positioning ${char.name} at ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
    });
  }, [isBubbleMode]);

  // Play test scenario - now supports both scripted and LocalAI modes
  const playScenario = async (scenario: 'mundane' | 'conflict' | 'chaos') => {
    setIsPlaying(true);
    setCurrentScenario(scenario);
    setMessages([]); // Clear previous messages
    
    if (useLocalAI) {
      // Use LocalAI for dynamic conversation generation
      await playLocalAIScenario(scenario);
    } else {
      // Use original scripted scenarios
      await playScriptedScenario(scenario);
    }
    
    setIsPlaying(false);
  };

  // Original scripted scenario playback
  const playScriptedScenario = async (scenario: 'mundane' | 'conflict' | 'chaos') => {
    const scenarioMessages = testScenarios[scenario];
    
    for (let i = 0; i < scenarioMessages.length; i++) {
      const msg = scenarioMessages[i];
      const newMessage = {
        id: `msg_${Date.now()}_${i}`,
        speaker: msg.speaker,
        message: msg.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      if (isBubbleMode) {
        // Determine emotion based on scenario
        const emotion = scenario === 'chaos' ? 'angry' : 
                       scenario === 'conflict' ? 'worried' : 
                       'neutral';
        
        const bubbleType = scenario === 'chaos' ? 'shout' : 'speech';
        
        addBubbleMessage(msg.speaker, msg.message, bubbleType, emotion);
      }
      
      // Wait between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  // LocalAI-powered scenario with your existing kitchen table system
  const playLocalAIScenario = async (scenario: 'mundane' | 'conflict' | 'chaos') => {
    try {
      setIsGeneratingAI(true);
      
      // Create mock headquarters state for testing
      const mockHeadquarters = {
        current_tier: 'spartan_apartment',
        rooms: [
          {
            assigned_characters: testCharacters.map(c => c.id),
            max_characters: 3,
            theme: 'basic',
            beds: [
              { type: 'bunk_bed', capacity: 2 },
              { type: 'single_bed', capacity: 1 }
            ]
          }
        ]
      };

      // Convert test characters to Character format
      const mockCharacters = testCharacters.map(tc => ({
        id: tc.id,
        name: tc.name,
        avatar: tc.avatar,
        headshot: tc.headshot,
        title: tc.name,
        personality: {
          traits: ['historical', 'unique'],
          speech_style: 'period-appropriate',
          motivations: ['glory', 'honor'],
          fears: ['defeat', 'dishonor']
        },
        historical_period: 'various eras'
      }));

      console.log('🤖 Starting LocalAI kitchen scene...');
      
      // Generate the initial scene using your LocalAI system
      const { conversations, scene_context } = await kitchenTableLocalAI.startNewScene(
        mockHeadquarters as any,
        mockCharacters as any
      );

      // Display the AI-generated conversations with bubbles
      for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        const newMessage = {
          id: conv.id,
          speaker: conv.speaker,
          message: conv.message,
          timestamp: conv.timestamp
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        if (isBubbleMode) {
          const emotion = scenario === 'chaos' ? 'angry' : 
                         scenario === 'conflict' ? 'worried' : 
                         'neutral';
          
          const bubbleType = scenario === 'chaos' ? 'shout' : 'speech';
          
          // Map character names to IDs for bubble positioning
          const speakerNameToId: Record<string, string> = {
            'Achilles': 'achilles',
            'Joan of Arc': 'joan', 
            'Count Dracula': 'dracula',
            'Merlin': 'merlin',
            'Cleopatra VII': 'cleopatra'
          };
          const character_id = speakerNameToId[conv.speaker] || conv.speaker.toLowerCase().replace(/\s+/g, '_');
          addBubbleMessage(character_id, conv.message, bubbleType, emotion);
        }
        
        // Wait between AI responses for natural flow
        if (i < conversations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Optionally continue the conversation with a few more responses
      if (conversations.length > 0) {
        console.log('🔄 Continuing LocalAI conversation...');
        
        for (let round = 0; round < 2; round++) {
          // Pick a random character to continue the conversation
          const randomCharacter = mockCharacters[Math.floor(Math.random() * mockCharacters.length)];
          
          const continueConv = await kitchenTableLocalAI.continueConversation(
            randomCharacter as any,
            conversations,
            mockHeadquarters as any,
            mockCharacters as any,
            scene_context
          );

          if (continueConv) {
            const newMessage = {
              id: continueConv.id,
              speaker: continueConv.speaker,
              message: continueConv.message,
              timestamp: continueConv.timestamp
            };
            
            setMessages(prev => [...prev, newMessage]);
            
            if (isBubbleMode) {
              const emotion = scenario === 'chaos' ? 'angry' : 'neutral';
              const bubbleType = scenario === 'chaos' ? 'shout' : 'speech';
              
              // Map character names to IDs for bubble positioning
              const speakerNameToId: Record<string, string> = {
                'Achilles': 'achilles',
                'Joan of Arc': 'joan', 
                'Count Dracula': 'dracula',
                'Merlin': 'merlin',
                'Cleopatra VII': 'cleopatra'
              };
              const character_id = speakerNameToId[continueConv.speaker] || continueConv.speaker.toLowerCase().replace(/\s+/g, '_');
              
              addBubbleMessage(character_id, continueConv.message, bubbleType, emotion);
            }
            
            conversations.push(continueConv);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
    } catch (error) {
      console.error('Error in LocalAI scenario:', error);
      // Fallback to scripted scenario if AI fails
      await playScriptedScenario(scenario);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Send manual message
  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      speaker: selected_character.id,
      message: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    if (isBubbleMode) {
      addBubbleMessage(selected_character.id, inputMessage, 'speech', 'neutral');
    }
    
    setInputMessage('');
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Coffee className="w-6 h-6" />
            Kitchen Table Chat Test
          </h2>
          
          <button
            onClick={() => setIsBubbleMode(!isBubbleMode)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            {isBubbleMode ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
            {isBubbleMode ? 'Bubble Mode' : 'Traditional Chat'}
          </button>

          <button
            onClick={() => setUseLocalAI(!useLocalAI)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-700 rounded-lg hover:bg-purple-600 transition-colors"
          >
            {useLocalAI ? <Bot className="w-5 h-5 text-purple-300" /> : <Sparkles className="w-5 h-5" />}
            {useLocalAI ? 'LocalAI Mode' : 'Scripted Mode'}
          </button>
        </div>

        {/* Test Scenarios */}
        <div className="flex gap-3">
          <button
            onClick={() => playScenario('mundane')}
            disabled={isPlaying}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Mundane Chat
          </button>
          
          <button
            onClick={() => playScenario('conflict')}
            disabled={isPlaying}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Conflict Scene
          </button>
          
          <button
            onClick={() => playScenario('chaos')}
            disabled={isPlaying}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Chaos Mode
          </button>
          
          {isPlaying && (
            <div className="flex items-center gap-2 text-yellow-400">
              {useLocalAI && isGeneratingAI ? (
                <>
                  <Bot className="w-4 h-4 animate-pulse" />
                  LocalAI generating {currentScenario} scene...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Playing {currentScenario} scenario...
                </>
              )}
            </div>
          )}
        </div>

        {/* Debug Info */}
        {isBubbleMode && (
          <div className="text-xs text-gray-400 bg-gray-900/50 rounded p-2">
            <div>Active Bubbles: {bubbleSystemRef.current?.get_state()?.active_bubbles_count || 0}</div>
            <div>Container Size: 800 x 500</div>
            <div>Current Scenario: {currentScenario}</div>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div 
        ref={containerRef}
        className="relative bg-gray-900 rounded-lg h-[500px] overflow-hidden"
      >
        {isBubbleMode ? (
          <>
            {/* Coordinate Grid - Letters for rows, Numbers for columns */}
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute inset-0 pointer-events-none opacity-40">
                {/* Vertical lines with numbers (columns) */}
                {Array.from({length: 11}, (_, i) => (
                  <div key={`col${i}`} className="absolute border-l border-blue-300" 
                       style={{left: `${i * 10}%`, height: '100%', width: '1px'}}>
                    <span className="text-sm font-bold text-blue-300 bg-gray-900 px-1 rounded">{i}</span>
                  </div>
                ))}
                {/* Horizontal lines with letters (rows) */}
                {Array.from({length: 11}, (_, i) => {
                  const letter = String.fromCharCode(65 + i); // A, B, C, etc.
                  return (
                    <div key={`row${i}`} className="absolute border-t border-blue-300" 
                         style={{top: `${i * 10}%`, width: '100%', height: '1px'}}>
                      <span className="text-sm font-bold text-blue-300 bg-gray-900 px-1 rounded ml-1">{letter}</span>
                    </div>
                  );
                })}
                {/* Grid intersection markers */}
                {Array.from({length: 11}, (_, row) => 
                  Array.from({length: 11}, (_, col) => (
                    <div 
                      key={`${row}-${col}`}
                      className="absolute w-1 h-1 bg-blue-400 rounded-full"
                      style={{
                        left: `${col * 10}%`, 
                        top: `${row * 10}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  ))
                )}
              </div>
            )}

            {/* Kitchen Table Visual */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 bg-amber-800/20 rounded-lg border-2 border-amber-700/30" />
              <div className="absolute text-amber-600/50 text-sm">Kitchen Table</div>
            </div>
            
            {/* Single Character System - More natural asymmetric positioning */}
            <div className="absolute inset-0 pointer-events-none">
              {testCharacters.map((char) => {
                // More natural, asymmetric positions around the kitchen table
                const positions = {
                  'achilles': { x: 45, y: 12 }, // Top left of table (B4-B5)
                  'julius_caesar': { x: 75, y: 25 }, // Moved left to C7-C8
                  'joan_of_arc': { x: 65, y: 65 }, // Row G (G6-G7)
                  'dracula': { x: 25, y: 68 }, // Row G (G2-G3)
                  'einstein': { x: 10, y: 10 } // A1 position
                };
                
                const pos = positions[char.id as keyof typeof positions] || { x: 50, y: 50 };
                
                return (
                  <div
                    key={char.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <div className="relative">
                      <img 
                        src={char.headshot} 
                        alt={char.name}
                        className="w-16 h-16 rounded-full border-2 border-gray-400 object-cover shadow-lg"
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                        }}
                      />
                      <div className="text-4xl hidden">{char.avatar}</div>
                    </div>
                    <div className="text-xs text-gray-300 text-center font-medium mt-1">{char.name.split(' ')[0]}</div>
                    {/* Show grid coordinates */}
                    <div className="text-xs text-blue-300 text-center bg-gray-900 px-1 rounded">
                      {String.fromCharCode(65 + Math.floor(pos.y / 10))}{Math.floor(pos.x / 10)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Bubble System */}
            <WordBubbleSystem 
              ref={bubbleSystemRef}
              context_type="kitchen"
              participants={testCharacters.map(char => ({
                character_id: char.id,
                character_name: char.name,
                character_avatar: char.headshot || char.avatar // Use headshot as avatar
              }))}
              is_enabled={isBubbleMode}
              container_width={1200}
              container_height={800}
            />
          </>
        ) : (
          /* Traditional Chat */
          <div className="h-full p-4 overflow-y-auto">
            <AnimatePresence>
              {messages.map((msg) => {
                const character = testCharacters.find(c => c.id === msg.speaker);
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 flex items-start gap-3"
                  >
                    <div className="text-2xl">{character?.avatar}</div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-400">{character?.name}</div>
                      <div className="bg-gray-800 rounded-lg p-3">{msg.message}</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-4 flex gap-2">
        <select
          value={selected_character.id}
          onChange={(e) => setSelectedCharacter(testCharacters.find(c => c.id === e.target.value) || testCharacters[0])}
          className="px-3 py-2 bg-gray-700 rounded-lg"
        >
          {testCharacters.map(char => (
            <option key={char.id} value={char.id}>
              {char.avatar} {char.name}
            </option>
          ))}
        </select>
        
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}