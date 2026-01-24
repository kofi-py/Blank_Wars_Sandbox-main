'use client';

import React from 'react';
import { SafeMotion } from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { formatCharacterName } from '@/utils/characterUtils';

interface PsychStats {
  mental_health: number;
  training: number;
  team_player: number;
  ego: number;
}

interface Character {
  id: string;
  name: string;
  avatar: string;
  level: number;
  archetype: string;
  psych_stats: PsychStats;
  rest_days_needed: number;
}

interface Team {
  name: string;
  team_chemistry: number;
  average_level: number;
  wins: number;
  losses: number;
  characters: Character[];
  coaching_points: number;
}

interface TeamOverviewProps {
  player_team: Team;
  player_morale: number;
  onCharacterClick: (character: Character) => void;
  onSelectChatCharacter: (character: Character) => void;
}

export default function TeamOverview({
  player_team,
  player_morale,
  onCharacterClick,
  onSelectChatCharacter
}: TeamOverviewProps) {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const getMentalHealthColor = (value: number) => {
    if (value >= 80) return 'text-green-400';
    if (value >= 50) return 'text-yellow-400';
    if (value >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <SafeMotion
      class_name="bg-gradient-to-r from-gray-900/60 to-gray-800/60 rounded-xl p-6 border border-gray-600 mb-6"
      initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isMobile ? 0.15 : 0.3, type: isMobile ? 'tween' : 'spring' }}
      as="div"
    >
      <h2 className="text-2xl font-bold text-white mb-4 text-center">🏆 {player_team.name} 🏆</h2>
      
      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="text-center bg-gray-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-400">{Math.round(player_team.team_chemistry)}%</div>
          <div className="text-sm text-gray-400">Team Chemistry</div>
        </div>
        <div className="text-center bg-gray-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">{player_morale}%</div>
          <div className="text-sm text-gray-400">Team Morale</div>
        </div>
        <div className="text-center bg-gray-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-400">{player_team.average_level}</div>
          <div className="text-sm text-gray-400">Avg Level</div>
        </div>
        <div className="text-center bg-gray-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-400">{player_team.wins}-{player_team.losses}</div>
          <div className="text-sm text-gray-400">W-L Record</div>
        </div>
        <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-orange-500/50">
          <div className="text-2xl font-bold text-orange-400">{player_team.coaching_points}</div>
          <div className="text-sm text-gray-400">Coaching Points</div>
        </div>
      </div>

      {/* Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(player_team.characters && Array.isArray(player_team.characters) ? player_team.characters : []).map((character) => (
          <SafeMotion
            key={character.id}
            class_name="bg-gray-800/30 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-all"
            while_hover={isMobile ? {} : { scale: 1.02 }}
            while_tap={isMobile ? { scale: 0.98 } : { scale: 0.98 }}
            transition={{ duration: isMobile ? 0.1 : 0.2, type: isMobile ? 'tween' : 'spring' }}
            as="div"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{character.avatar}</div>
              <div>
                <h3 className="text-lg font-bold text-white">{formatCharacterName(character.name)}</h3>
                <p className="text-sm text-gray-400">Level {character.level} {character.archetype}</p>
              </div>
            </div>
            
            {/* Psychology Stats */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Mental Health:</span>
                <span className={`font-bold ${getMentalHealthColor(character.psych_stats.mental_health)}`}>
                  {character.psych_stats.mental_health}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Training:</span>
                <span className="text-blue-400 font-bold">{character.psych_stats.training}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Team Player:</span>
                <span className="text-purple-400 font-bold">{character.psych_stats.team_player}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ego:</span>
                <span className="text-red-400 font-bold">{character.psych_stats.ego}%</span>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="mt-3 flex gap-1">
              {character.psych_stats.mental_health < 30 && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Crisis</span>
              )}
              {character.rest_days_needed > 0 && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Needs Rest</span>
              )}
              {character.psych_stats.ego > 80 && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">High Ego</span>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectChatCharacter(character);
                }}
                className="flex-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs rounded transition-colors"
              >
                💬 Chat
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCharacterClick(character);
                }}
                className="flex-1 px-2 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 text-xs rounded transition-colors"
              >
                🏃 Coach
              </button>
            </div>
          </SafeMotion>
        ))}
      </div>
    </SafeMotion>
  );
}