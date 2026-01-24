'use client';

import { useState, useEffect } from 'react';
import { SafeMotion } from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { Sparkles, ArrowUp, Star, Zap } from 'lucide-react';
import { echoAPI } from '../services/apiClient';

interface Echo {
  character_id: string;
  count: number;
  name: string;
  avatar: string;
  rarity: string;
  title: string;
}

interface Ability {
  id: string;
  name: string;
  description: string;
  current_rank: number;
  max_rank: number;
  echo_cost: number;
  icon: string;
}

// Mock abilities for demonstration (will be replaced with real data later)
const getMockAbilities = (character_id: string): Ability[] => {
  const baseAbilities = [
    {
      id: 'primary_attack',
      name: 'Primary Attack',
      description: 'Character\'s main offensive ability',
      current_rank: 1,
      max_rank: 5,
      echo_cost: 2,
      icon: '⚔️'
    },
    {
      id: 'special_power',
      name: 'Special Power',
      description: 'Unique character ability',
      current_rank: 1,
      max_rank: 3,
      echo_cost: 3,
      icon: '🌟'
    },
    {
      id: 'passive_boost',
      name: 'Passive Boost',
      description: 'Always-active character enhancement',
      current_rank: 1,
      max_rank: 4,
      echo_cost: 1,
      icon: '🛡️'
    }
  ];

  // Customize abilities based on character
  return baseAbilities.map(ability => ({
    ...ability,
    name: ability.name + ` (${character_id.split('_')[0]})`
  }));
};

const getRarityColor = (rarity: string) => {
  const colors = {
    common: 'border-gray-500 bg-gray-800',
    uncommon: 'border-green-500 bg-green-900/20',
    rare: 'border-blue-500 bg-blue-900/20',
    epic: 'border-purple-500 bg-purple-900/20',
    legendary: 'border-yellow-500 bg-yellow-900/20',
    mythic: 'border-red-500 bg-red-900/20'
  };
  return colors[rarity as keyof typeof colors] || colors.common;
};

export default function EchoManagement() {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [selectedEcho, setSelectedEcho] = useState<Echo | null>(null);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEchoes();
  }, []);

  const fetchEchoes = async () => {
    try {
      setLoading(true);
      const data = await echoAPI.get_user_echoes();
      setEchoes(data.echoes || []);
    } catch (err) {
      setError('Failed to load echoes');
      console.error('Error fetching echoes:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectCharacter = (echo: Echo) => {
    setSelectedEcho(echo);
    setAbilities(getMockAbilities(echo.character_id));
  };

  const upgradeAbility = async (ability: Ability) => {
    if (!selectedEcho) return;
    
    if (selectedEcho.count < ability.echo_cost) {
      setError(`Need ${ability.echo_cost} echoes to upgrade this ability`);
      return;
    }

    try {
      // Use real API to spend echoes (abilities are still mock for now)
      await echoAPI.spend_echoes(selectedEcho.character_id, ability.echo_cost, `Upgrade ${ability.name}`);
      
      // Update local state
      const updatedEchoes = echoes.map(echo => 
        echo.character_id === selectedEcho.character_id 
          ? { ...echo, count: echo.count - ability.echo_cost }
          : echo
      );
      setEchoes(updatedEchoes);
      
      const updatedSelectedEcho = updatedEchoes.find(e => e.character_id === selectedEcho.character_id);
      if (updatedSelectedEcho) {
        setSelectedEcho(updatedSelectedEcho);
      }

      // Update ability rank (still mock for now)
      const updatedAbilities = abilities.map(a => 
        a.id === ability.id 
          ? { ...a, current_rank: Math.min(a.current_rank + 1, a.max_rank) }
          : a
      );
      setAbilities(updatedAbilities);

      setError(null);
    } catch (err) {
      setError('Failed to upgrade ability');
      console.error('Upgrade error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading echoes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error: {error}
        <button 
          onClick={fetchEchoes}
          className="block mx-auto mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
          <Sparkles className="w-8 h-8 mr-2 text-purple-400" />
          Echo Management
        </h1>
        <p className="text-gray-300">Upgrade your characters' abilities using echoes</p>
      </div>

      {echoes.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No echoes available yet!</p>
          <p className="text-sm mt-2">Open some packs to get duplicate characters as echoes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Echo List */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Your Echoes</h2>
            <div className="space-y-3">
              {echoes.map((echo) => (
                <SafeMotion
                  as="div"
                  key={echo.character_id}
                  onClick={() => selectCharacter(echo)}
                  class_name={`p-4 rounded-lg border-2 cursor-pointer transition-all ${getRarityColor(echo.rarity)} ${
                    selectedEcho?.character_id === echo.character_id ? 'ring-2 ring-purple-500' : ''
                  }`}
                  while_hover={isMobile ? {} : { scale: 1.02 }}
                  while_tap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-3xl mr-3">{echo.avatar}</div>
                      <div>
                        <div className="font-bold text-white">{echo.name}</div>
                        <div className="text-sm text-gray-300">{echo.title}</div>
                        <div className="text-xs text-purple-300 capitalize">{echo.rarity}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-400">{echo.count}</div>
                      <div className="text-xs text-gray-400">echoes</div>
                    </div>
                  </div>
                </SafeMotion>
              ))}
            </div>
          </div>

          {/* Ability Upgrade Panel */}
          <div>
            {selectedEcho ? (
              <>
                <h2 className="text-xl font-bold text-white mb-4">
                  Upgrade {selectedEcho.name}
                </h2>
                <div className="bg-black/40 rounded-xl p-6 border border-gray-700 mb-4">
                  <div className="flex items-center mb-4">
                    <div className="text-4xl mr-4">{selectedEcho.avatar}</div>
                    <div>
                      <div className="text-lg font-bold text-white">{selectedEcho.name}</div>
                      <div className="text-purple-300">Echoes available: {selectedEcho.count}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {abilities.map((ability) => (
                    <div 
                      key={ability.id}
                      className="bg-black/40 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{ability.icon}</span>
                          <div>
                            <div className="font-bold text-white">{ability.name}</div>
                            <div className="text-sm text-gray-300">{ability.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-purple-300">
                            Rank {ability.current_rank}/{ability.max_rank}
                          </div>
                          <div className="text-xs text-gray-400">
                            Cost: {ability.echo_cost} echoes
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <div className="bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all"
                              style={{ width: `${(ability.current_rank / ability.max_rank) * 100}%` }}
                            />
                          </div>
                        </div>
                        
                        <SafeMotion
                          as="button"
                          onClick={() => upgradeAbility(ability)}
                          disabled={
                            selectedEcho.count < ability.echo_cost ||
                            ability.current_rank >= ability.max_rank
                          }
                          class_name={`px-4 py-2 rounded-lg font-bold transition-all flex items-center ${
                            selectedEcho.count >= ability.echo_cost && ability.current_rank < ability.max_rank
                              ? 'bg-purple-600 hover:bg-purple-500 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                          while_hover={
                            selectedEcho.count >= ability.echo_cost && ability.current_rank < ability.max_rank && !isMobile
                              ? { scale: 1.05 }
                              : {}
                          }
                          while_tap={{ scale: 0.95 }}
                        >
                          <ArrowUp className="w-4 h-4 mr-1" />
                          {ability.current_rank >= ability.max_rank ? 'MAX' : 'Upgrade'}
                        </SafeMotion>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-black/40 rounded-xl p-8 border border-gray-700 text-center">
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <div className="text-gray-400">
                  <p className="mb-2">Select a character to upgrade their abilities</p>
                  <p className="text-sm">Echoes can be used to make your characters stronger!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}