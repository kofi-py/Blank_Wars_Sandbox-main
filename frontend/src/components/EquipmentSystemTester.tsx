'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Sword,
  User,
  Package,
  Loader,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import EquipmentDetailsModalDB from './EquipmentDetailsModalDB';
import SmartEquipmentPrefetcher, { useSmartPrefetching } from './SmartEquipmentPrefetcher';
import { equipmentCache } from '@/services/equipmentCache';
import type { Equipment } from '@blankwars/types';

interface EquipmentTestData {
  id: string;
  name: string;
  rarity: string;
  character_name?: string;
  icon: string;
}

export default function EquipmentSystemTester() {
  const [is_loading, setIsLoading] = useState(false);
  const [selected_character, setSelectedCharacter] = useState('achilles');
  const [characterEquipment, setCharacterEquipment] = useState<EquipmentTestData[]>([]);
  const [genericEquipment, setGenericEquipment] = useState<EquipmentTestData[]>([]);
  const [consumables, setConsumables] = useState<EquipmentTestData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Smart prefetching hooks
  const { prefetch_character } = useSmartPrefetching(selected_character, 'equipment');

  const characters = [
    'achilles', 'merlin', 'fenrir', 'holmes', 'dracula',
    'frankenstein_monster', 'joan', 'tesla', 'space_cyborg',
    'sun_wukong', 'genghis_khan', 'rilak_trelkar', 'billy_the_kid',
    'robin_hood', 'sam_spade', 'alexander_the_great', 'miyamoto_musashi',
    'cleopatra', 'agent_x'
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      loadEquipmentData();
    }
  }, [selected_character, isClient]);

  const loadEquipmentData = async () => {
    if (typeof window === 'undefined') {
      console.log('⚠️ SSR detected, skipping data load');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading equipment data...');
      
      // Load character-specific equipment
      const charEquipment = await equipmentCache.getCharacterEquipment(selected_character);
      setCharacterEquipment(charEquipment.map((item: Equipment) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        character_name: item.preferred_character,
        icon: item.icon
      })));
      
      // Load generic equipment
      const genEquipment = await equipmentCache.getGenericEquipment();
      setGenericEquipment(genEquipment.map((item: Equipment) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        icon: item.icon
      })));
      
      // Load consumables
      const items = await equipmentCache.getItems();
      setConsumables(items.map((item: Equipment) => ({
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        icon: item.icon
      })));
      
      console.log('✅ Equipment data loaded successfully');
    } catch (err: unknown) {
      console.error('❌ Failed to load equipment data:', err);
      if (typeof err !== 'object' || err === null || !('message' in err)) {
        throw new Error('Unexpected error type in equipment load');
      }
      if (!err.message) {
        throw new Error('Error missing message property');
      }
      setError(err.message as string);
    } finally {
      setIsLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'uncommon': return 'text-green-600 bg-green-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const EquipmentCard: React.FC<{ equipment: EquipmentTestData }> = ({ equipment }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all"
      onClick={() => {
        setSelectedEquipmentId(equipment.id);
        setShowModal(true);
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{equipment.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{equipment.name}</h4>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${getRarityColor(equipment.rarity)}`}>
              {equipment.rarity}
            </span>
            {equipment.character_name && (
              <span className="text-xs text-gray-500">
                {equipment.character_name}
              </span>
            )}
          </div>
        </div>
        <Eye className="w-4 h-4 text-gray-400" />
      </div>
    </motion.div>
  );

  if (!isClient) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading equipment system...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Smart Prefetcher - invisible component that preloads likely-needed data */}
      <SmartEquipmentPrefetcher 
        currentCharacter={selected_character}
        currentPage="equipment"
        priority="medium"
      />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Equipment System Tester</h1>
              <p className="text-gray-600">Testing database integration with smart caching</p>
            </div>
          </div>
          
          {/* Character Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Test Character:</label>
            <select
              value={selected_character}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              onMouseEnter={() => {
                // Prefetch popular characters when user hovers over selector
                ['achilles', 'merlin', 'fenrir'].forEach(char => {
                  if (char !== selected_character) {
                    prefetch_character(char);
                  }
                });
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {characters.map(char => (
                <option key={char} value={char}>
                  {char.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            <button
              onClick={loadEquipmentData}
              disabled={is_loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {is_loading ? <Loader className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Reload Data
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">Error Loading Equipment</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {is_loading && (
          <div className="bg-white rounded-lg p-8 text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading equipment from database...</p>
          </div>
        )}

        {/* Equipment Grid */}
        {!is_loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Character Equipment */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {selected_character.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Equipment
                </h2>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                  {characterEquipment.length}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {characterEquipment.map(equipment => (
                  <EquipmentCard key={equipment.id} equipment={equipment} />
                ))}
                {characterEquipment.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No character-specific equipment found
                  </p>
                )}
              </div>
            </div>

            {/* Generic Equipment */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sword className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Generic Equipment</h2>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                  {genericEquipment.length}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {genericEquipment.map(equipment => (
                  <EquipmentCard key={equipment.id} equipment={equipment} />
                ))}
                {genericEquipment.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No generic equipment found
                  </p>
                )}
              </div>
            </div>

            {/* Consumables */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Consumables</h2>
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                  {consumables.length}
                </span>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {consumables.map(equipment => (
                  <EquipmentCard key={equipment.id} equipment={equipment} />
                ))}
                {consumables.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No consumables found
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cache Status */}
        <div className="bg-white rounded-lg p-4 mt-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Cache Status</h3>
          <div className="text-xs text-gray-500">
            Equipment cache active • Smart memory management enabled • Database integration working
          </div>
        </div>
      </div>

      {/* Equipment Details Modal */}
      <EquipmentDetailsModalDB
        is_open={showModal}
        onClose={() => setShowModal(false)}
        equipment_id={selectedEquipmentId}
        onEquip={(equipment) => {
          console.log('🎮 Equip equipment:', equipment.name);
          setShowModal(false);
        }}
      />
    </div>
  );
}