'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, AlertTriangle, Gavel, MessageCircle } from 'lucide-react';
import { formatCharacterName } from '@/utils/characterUtils';

import { TeamCharacter, Team } from '@/data/teamBattleSystem';

interface BattleCries {
  player1: string;
  player2: string;
}

interface BattlePhase {
  name: string;
}

interface TeamDisplayProps {
  player_team: Team;
  opponent_team: Team;
  current_round: number;
  phase: BattlePhase;
  battle_cries: BattleCries;
  chat_messages: string[];
  custom_message: string;
  is_character_typing: boolean;
  chat_container_ref: React.RefObject<HTMLDivElement>;
  selected_chat_character: TeamCharacter;
  onCustomMessageChange: (message: string) => void;
  onSendMessage: () => void;
  player_round_wins?: number;
  opponent_round_wins?: number;
  current_match?: number;
  player_match_wins?: number;
  opponent_match_wins?: number;
}

export default function TeamDisplay({
  player_team,
  opponent_team,
  current_round,
  phase,
  battle_cries,
  chat_messages,
  custom_message,
  is_character_typing,
  chat_container_ref,
  selected_chat_character,
  onCustomMessageChange,
  onSendMessage,
  player_round_wins = 0,
  opponent_round_wins = 0,
  current_match = 1,
  player_match_wins = 0,
  opponent_match_wins = 0
}: TeamDisplayProps) {
  // Determine the currently active fighters for the main display
  const getActiveFighter = (team: Team, round: number) => {
    const index = (round - 1) % team.characters.length;
    return team.characters[index];
  };

  const userCharacter = getActiveFighter(player_team, current_round);
  const opponent_character = getActiveFighter(opponent_team, current_round);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSendMessage();
    }
  };

  return (
    <>
      {/* Character Display */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Player Team */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {player_team.characters.map((character, index) => (
            <motion.div
              key={character.id}
              className={`bg-black/40 rounded-xl p-4 backdrop-blur-sm border ${
                character.id === userCharacter.id ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-700'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="text-center mb-2">
                <div className="text-4xl mb-1">{character.avatar}</div>
                <h3 className="text-lg font-bold text-white">{formatCharacterName(character.name)}</h3>
                <div className="text-xs text-gray-400">Lvl: {character.level}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500" />
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full transition-all"
                      style={{ width: `${(character.current_health / character.max_health) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-white">{character.current_health}/{character.max_health}</span>
                </div>
                {character.status_effects?.includes('Berserk') && (
                  <div className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="w-3 h-3 animate-pulse" />
                    <span className="text-xs">BERSERK</span>
                  </div>
                )}
              </div>
              {phase.name === 'battle-cry' && battle_cries.player1 && character.id === userCharacter.id && (
                <motion.div
                  className="mt-2 p-2 bg-blue-600/30 rounded-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <p className="text-xs italic text-blue-100">&quot;{battle_cries.player1}&quot;</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Center Column: AI Judge & Battle Status */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center">
          <motion.div
            className="bg-gradient-to-r from-gray-700/40 to-gray-900/40 rounded-xl p-4 backdrop-blur-sm border border-gray-600 flex items-center justify-center gap-3 mb-4 w-full"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Gavel className="w-8 h-8 text-yellow-300 animate-pulse" />
            <h3 className="text-xl font-bold text-white">AI Judge Presiding</h3>
          </motion.div>

          <div className="flex flex-col items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-6xl mb-4"
            >
              ⚔️
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2">Match {current_match}, Round {current_round}</h2>
            <p className="text-lg text-gray-300">{phase.name.replace('_', ' ').toUpperCase()}</p>
            {(player_match_wins > 0 || opponent_match_wins > 0 || player_round_wins > 0 || opponent_round_wins > 0) && (
              <div className="mt-1">
                <p className="text-lg text-yellow-300">Matches: Player {player_match_wins} - {opponent_match_wins} Opponent</p>
                <p className="text-md text-blue-300">This Match: Player {player_round_wins} - {opponent_round_wins} Opponent</p>
              </div>
            )}
          </div>
        </div>

        {/* Opponent Team */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {opponent_team.characters.map((character, index) => (
            <motion.div
              key={character.id}
              className={`bg-black/40 rounded-xl p-4 backdrop-blur-sm border ${
                character.id === opponent_character.id ? 'border-red-500 ring-2 ring-red-500/50' : 'border-gray-700'
              }`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="text-center mb-2">
                <div className="text-4xl mb-1">{character.avatar}</div>
                <h3 className="text-lg font-bold text-white">{formatCharacterName(character.name)}</h3>
                <div className="text-xs text-gray-400">Lvl: {character.level}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500" />
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full transition-all"
                      style={{ width: `${(character.current_health / character.max_health) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-white">{character.current_health}/{character.max_health}</span>
                </div>
                {character.status_effects?.includes('Berserk') && (
                  <div className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="w-3 h-3 animate-pulse" />
                    <span className="text-xs">BERSERK</span>
                  </div>
                )}
              </div>
              {phase.name === 'battle-cry' && battle_cries.player2 && character.id === opponent_character.id && (
                <motion.div
                  className="mt-2 p-2 bg-red-600/30 rounded-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <p className="text-xs italic text-red-100">&quot;{battle_cries.player2}&quot;</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Individual character chat removed - replaced with team chat in main layout */}
    </>
  );
}