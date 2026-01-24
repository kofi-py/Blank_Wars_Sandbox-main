'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import BattleAnimationDisplay from './BattleAnimationDisplay';
import { Play, Square, RotateCcw } from 'lucide-react';
import { type TeamCharacter } from '@/data/teamBattleSystem';

// Local mock data for testing
const MOCK_CHARACTERS: Record<string, string> = {
  'achilles': 'Achilles',
  'joan': 'Joan of Arc',
  'genghis_khan': 'Gengas Khan',
  'merlin': 'Merlin',
  'holmes': 'Sherlock Holmes',
  'dracula': 'Dracula',
  'cleopatra': 'Cleopatra',
  'sam_spade': 'Sam Spade',
  'billy_the_kid': 'Billy the Kid',
  'robin_hood': 'Robin Hood',
  'agent_x': 'Agent X',
  'frankenstein_monster': 'Frankenstein',
  'space_cyborg': 'Cyborg',
  'rilak_trelkar': 'Rilak',
  'fenrir': 'Fenrir',
  'sun_wukong': 'Sun Wukong',
  'tesla': 'Tesla'
};

interface BattleImageTesterProps {
  class_name?: string;
}

export default function BattleImageTester({ class_name = '' }: BattleImageTesterProps) {
  const [fighter1_id, setFighter1Id] = useState('achilles');
  const [fighter2_id, setFighter2Id] = useState('dracula');
  const [current_round, setCurrentRound] = useState(1);
  const [is_animating, setIsAnimating] = useState(false);
  const [animation_type, setAnimationType] = useState<'fadeIn' | 'slideLeft' | 'slideRight' | 'zoomIn'>('fadeIn');

  const available_characters = Object.keys(MOCK_CHARACTERS);

  // Helper to create mock TeamCharacter
  const createMockCharacter = (id: string): TeamCharacter => ({
    id,
    name: MOCK_CHARACTERS[id],
    battle_image_name: MOCK_CHARACTERS[id],
    battle_image_variants: 7,
    // Minimal required fields to satisfy type
    level: 1,
    experience: 0,
    experience_to_next: 100,
    current_health: 100,
    max_health: 100,
    strength: 50,
    dexterity: 50,
    defense: 50,
    intelligence: 50,
    wisdom: 50,
    charisma: 50,
    spirit: 50,
    speed: 50,
    current_mana: 100,
    max_mana: 100,
    current_energy: 100,
    max_energy: 100,
    psych_stats: {} as any,
    gameplan_adherence: 0,
    current_stress: 0,
    team_trust: 0,
    current_mental_health: 0,
    battle_focus: 0,
    current_confidence: 0,
    temporary_stats: {} as any,
    personality_traits: [],
    speaking_style: 'casual',
    decision_making: 'logical',
    conflict_response: 'diplomatic',
    status_effects: [],
    injuries: [],
    rest_days_needed: 0,
    abilities: [],
    special_powers: [],
    powers: [],
    spells: [],
    equipped_powers: [],
    equipped_spells: [],
    equipped_items: { weapon: null, armor: null, accessory: null },
    equipment_bonuses: {},
    core_skills: {
      combat: { level: 1, experience: 0, max_level: 999 },
      survival: { level: 1, experience: 0, max_level: 999 },
      mental: { level: 1, experience: 0, max_level: 999 },
      social: { level: 1, experience: 0, max_level: 999 },
      spiritual: { level: 1, experience: 0, max_level: 999 }
    },
    avatar: '',
    archetype: 'warrior',
    rarity: 'common'
  });

  const handleStartAnimation = () => {
    setIsAnimating(true);
  };

  const handleStopAnimation = () => {
    setIsAnimating(false);
  };

  const handleResetAnimation = () => {
    setIsAnimating(false);
    setCurrentRound(1);
    setTimeout(() => {
      setCurrentRound(1);
    }, 100);
  };

  const handleNextRound = () => {
    if (current_round < 3) {
      setCurrentRound(prev => prev + 1);
    }
  };

  const handlePrevRound = () => {
    if (current_round > 1) {
      setCurrentRound(prev => prev - 1);
    }
  };

  return (
    <div className={`space-y-6 p-6 bg-gray-900/50 rounded-lg border border-gray-700 ${class_name}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Battle Animation Tester</h2>
        <p className="text-gray-400">Test battle animations with different character combinations</p>
      </div>

      {/* Character Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Fighter 1</label>
          <select
            value={fighter1_id}
            onChange={(e) => setFighter1Id(e.target.value)}
            className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {available_characters.map(character_id => (
              <option key={character_id} value={character_id}>
                {MOCK_CHARACTERS[character_id]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Fighter 2</label>
          <select
            value={fighter2_id}
            onChange={(e) => setFighter2Id(e.target.value)}
            className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {available_characters.map(character_id => (
              <option key={character_id} value={character_id}>
                {MOCK_CHARACTERS[character_id]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Animation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-white">Animation Type:</label>
          <select
            value={animation_type}
            onChange={(e) => setAnimationType(e.target.value as 'fadeIn' | 'slideLeft' | 'slideRight' | 'zoomIn')}
            className="p-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="fadeIn">Fade In</option>
            <option value="slideLeft">Slide Left</option>
            <option value="slideRight">Slide Right</option>
            <option value="zoomIn">Zoom In</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-white">Round:</label>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevRound}
              disabled={current_round <= 1}
              className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <span className="px-3 py-1 bg-gray-800 text-white rounded">{current_round}/3</span>
            <button
              onClick={handleNextRound}
              disabled={current_round >= 3}
              className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStartAnimation}
          disabled={is_animating}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-5 h-5" />
          Start Animation
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStopAnimation}
          disabled={!is_animating}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Square className="w-5 h-5" />
          Stop Animation
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleResetAnimation}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </motion.button>
      </div>

      {/* Battle Animation Display */}
      <div className="w-full">
        <BattleAnimationDisplay
          fighter1={createMockCharacter(fighter1_id)}
          fighter2={createMockCharacter(fighter2_id)}
          current_round={current_round}
          is_animating={is_animating}
          animation_type={animation_type}
          on_animation_complete={() => {
            console.log('Animation completed');
            setIsAnimating(false);
          }}
          on_round_complete={() => {
            console.log(`Round ${current_round} completed`);
          }}
          class_name="w-full h-[400px]"
        />
      </div>

      {/* Information Panel */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-2">Animation Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Matchup:</span>
            <div className="text-white font-semibold">
              {MOCK_CHARACTERS[fighter1_id]} vs {MOCK_CHARACTERS[fighter2_id]}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Round:</span>
            <div className="text-white font-semibold">{current_round} of 3</div>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <div className={`font-semibold ${is_animating ? 'text-green-400' : 'text-gray-400'}`}>
              {is_animating ? 'Animating' : 'Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Combinations */}
      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-white">Quick Test Combinations</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { f1: 'achilles', f2: 'dracula', name: 'Achilles vs Dracula' },
            { f1: 'cleopatra', f2: 'fenrir', name: 'Cleopatra vs Fenrir' },
            { f1: 'sam_spade', f2: 'tesla', name: 'Sam Spade vs Tesla' },
            { f1: 'joan', f2: 'sun_wukong', name: 'Joan vs Sun Wukong' },
            { f1: 'holmes', f2: 'frankenstein_monster', name: 'Holmes vs Frankenstein' }
          ].map(combo => (
            <button
              key={`${combo.f1}-${combo.f2}`}
              onClick={() => {
                setFighter1Id(combo.f1);
                setFighter2Id(combo.f2);
                setCurrentRound(1);
                setIsAnimating(false);
              }}
              className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded text-xs font-medium transition-colors"
            >
              {combo.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}