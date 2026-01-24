'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Users,
  ArrowRight,
  ArrowLeft,
  Crown,
  Shield,
  Sword,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { teamEquipmentAPI, equipmentAPI } from '@/services/apiClient';
import type { Contestant } from '@blankwars/types';

interface TeamEquipmentManagerProps {
  available_characters: Contestant[];
  selected_characterId?: string;
}

interface Equipment {
  id: string;
  name: string;
  description: string;
  rarity: string;
  slot: string;
  equipment_type: string;
}

interface TeamEquipment extends Equipment {
  is_available: boolean;
  loaned_to_character_id?: string;
  loaned_to_character_name?: string;
  loaned_at?: string;
}

interface CoachEquipment extends Equipment {
  acquired_from: string;
  acquired_at: string;
}

export default function TeamEquipmentManager({ available_characters, selected_characterId }: TeamEquipmentManagerProps) {
  const [coachEquipment, setCoachEquipment] = useState<CoachEquipment[]>([]);
  const [teamPool, setTeamPool] = useState<TeamEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'coach' | 'team'>('coach');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coachData, teamData] = await Promise.all([
        equipmentAPI.get_user_inventory(),
        teamEquipmentAPI.get_team_equipment_pool()
      ]);

      setCoachEquipment(coachData?.inventory?.equipment || []);
      setTeamPool(teamData?.teamEquipment || []);
    } catch (error) {
      console.error('Error loading equipment data:', error);
      showMessage('error', 'Failed to load equipment data');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const moveToTeamPool = async (equipment_id: string, equipment_name: string) => {
    setActionLoading(equipment_id);
    try {
      await teamEquipmentAPI.move_from_coach_inventory(equipment_id);
      showMessage('success', `${equipment_name} moved to team pool`);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error moving to team pool:', error);
      showMessage('error', 'Failed to move equipment to team pool');
    } finally {
      setActionLoading(null);
    }
  };

  const lendToCharacter = async (equipment_id: string, character_id: string, equipment_name: string, character_name: string) => {
    setActionLoading(equipment_id);
    try {
      await teamEquipmentAPI.lend_to_character(equipment_id, character_id);
      showMessage('success', `${equipment_name} lent to ${character_name}`);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error lending equipment:', error);
      showMessage('error', 'Failed to lend equipment');
    } finally {
      setActionLoading(null);
    }
  };

  const returnFromCharacter = async (equipment_id: string, character_id: string, equipment_name: string) => {
    setActionLoading(equipment_id);
    try {
      await teamEquipmentAPI.return_from_character(equipment_id, character_id);
      showMessage('success', `${equipment_name} returned to team pool`);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error returning equipment:', error);
      showMessage('error', 'Failed to return equipment');
    } finally {
      setActionLoading(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'from-gray-400 to-gray-500',
      uncommon: 'from-green-400 to-green-500',
      rare: 'from-blue-400 to-blue-500',
      epic: 'from-purple-400 to-purple-500',
      legendary: 'from-yellow-400 to-yellow-500',
      mythic: 'from-red-400 to-red-500'
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getSlotIcon = (slot: string) => {
    if (slot?.includes('weapon') || slot === 'main_hand') return <Sword className="w-4 h-4" />;
    if (slot?.includes('armor') || slot === 'chest') return <Shield className="w-4 h-4" />;
    return <Package className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading team equipment...</span>
      </div>
    );
  }

  const availableTeamEquipment = teamPool.filter(eq => eq.is_available);
  const loanedTeamEquipment = teamPool.filter(eq => !eq.is_available);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-500" />
          Team Equipment Management
        </h1>
        <p className="text-gray-400">Manage your team's shared equipment pool and lending system</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('coach')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'coach' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
        >
          <Package className="w-4 h-4" />
          Coach Inventory ({coachEquipment.length})
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
        >
          <Users className="w-4 h-4" />
          Team Pool ({availableTeamEquipment.length} available, {loanedTeamEquipment.length} loaned)
        </button>
      </div>

      {/* Coach Inventory Tab */}
      {activeTab === 'coach' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Coach Personal Equipment</h2>
          <p className="text-gray-400 mb-4">Move equipment from your personal inventory to the team pool for lending to characters.</p>

          {coachEquipment.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No equipment in coach inventory</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coachEquipment.map((equipment) => (
                <div key={equipment.id} className={`border border-gray-600 rounded-lg p-4 bg-gradient-to-r ${getRarityColor(equipment.rarity)}/10 relative`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSlotIcon(equipment.slot)}
                      <span className="font-semibold">{equipment.name}</span>
                      <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full border border-gray-600">
                        Personal
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getRarityColor(equipment.rarity)} text-white`}>
                      {equipment.rarity}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-3">{equipment.description}</p>

                  <button
                    onClick={() => moveToTeamPool(equipment.id, equipment.name)}
                    disabled={actionLoading === equipment.id}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === equipment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        Move to Team Pool
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Pool Tab */}
      {activeTab === 'team' && (
        <div>
          {/* Available Equipment */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Available for Lending</h2>

            {availableTeamEquipment.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No equipment available in team pool</p>
                <p className="text-sm">Move equipment from coach inventory to start building your team pool</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTeamEquipment.map((equipment) => (
                  <div key={equipment.id} className={`border border-green-500/30 rounded-lg p-4 bg-gradient-to-r ${getRarityColor(equipment.rarity)}/10 relative`}>
                    {/* Team Pool Badge */}
                    <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full shadow-lg border border-green-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Team Pool
                    </div>

                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSlotIcon(equipment.slot)}
                        <span className="font-semibold">{equipment.name}</span>
                        <span className="text-xs px-2 py-1 bg-green-700/50 text-green-300 rounded-full border border-green-600">
                          Available
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getRarityColor(equipment.rarity)} text-white`}>
                        {equipment.rarity}
                      </span>
                    </div>

                    <p className="text-gray-400 text-sm mb-3">{equipment.description}</p>

                    <div className="space-y-2">
                      {available_characters.length === 0 ? (
                        <div className="text-center py-3 text-gray-400 border border-gray-600 rounded-lg">
                          No characters available for lending
                        </div>
                      ) : (
                        <select
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white"
                          onChange={(e) => {
                            if (e.target.value && actionLoading === null) {
                              const character = (available_characters && Array.isArray(available_characters))
                                ? available_characters.find(c => c.id === e.target.value)
                                : null;
                              if (character) {
                                lendToCharacter(equipment.id, character.id, equipment.name, character.name);
                              }
                            }
                          }}
                          value=""
                          disabled={actionLoading !== null}
                        >
                          <option value="">Select character to lend to...</option>
                          {available_characters.map(character => (
                            <option key={character.id} value={character.id}>{character.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loaned Equipment */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">Currently Loaned</h2>

            {loanedTeamEquipment.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No equipment currently loaned out</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loanedTeamEquipment.map((equipment) => (
                  <div key={equipment.id} className={`border border-yellow-500/30 rounded-lg p-4 bg-gradient-to-r ${getRarityColor(equipment.rarity)}/10 relative`}>
                    {/* Team Pool Badge */}
                    <div className="absolute -top-2 -right-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded-full shadow-lg border border-yellow-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Team Pool
                    </div>

                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSlotIcon(equipment.slot)}
                        <span className="font-semibold">{equipment.name}</span>
                        <span className="text-xs px-2 py-1 bg-yellow-700/50 text-yellow-300 rounded-full border border-yellow-600">
                          Loaned
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getRarityColor(equipment.rarity)} text-white`}>
                        {equipment.rarity}
                      </span>
                    </div>

                    <p className="text-gray-400 text-sm mb-2">{equipment.description}</p>
                    <p className="text-yellow-400 text-sm mb-3">
                      Loaned to: <span className="font-semibold">{equipment.loaned_to_character_name}</span>
                    </p>

                    <button
                      onClick={() => returnFromCharacter(equipment.id, equipment.loaned_to_character_id!, equipment.name)}
                      disabled={actionLoading === equipment.id}
                      className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {actionLoading === equipment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowLeft className="w-4 h-4" />
                          Return to Pool
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}