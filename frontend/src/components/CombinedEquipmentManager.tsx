import React, { useState, useEffect, useMemo } from 'react';
import { characterAPI } from '@/services/apiClient';
import type { Equipment } from '@/data/equipment';
import { Contestant } from '@blankwars/types';
import EquipmentManager from './EquipmentManager';
import InventoryManager from './InventoryManager';
import EquipmentAdvisorChat, { EnhancedCharacter } from './EquipmentAdvisorChat';
import { User } from 'lucide-react';
import { getCharacterImageSet } from '@/utils/characterImageUtils';

interface CombinedEquipmentManagerProps {
  global_selected_character_id: string;
  set_global_selected_character_id: (id: string) => void;
  is_mobile?: boolean;
  // CamelCase variants
  globalSelectedCharacterId?: string;
  setGlobalSelectedCharacterId?: (id: string) => void;
  isMobile?: boolean;
}

export default function CombinedEquipmentManager(props: CombinedEquipmentManagerProps) {
  const {
    global_selected_character_id,
    set_global_selected_character_id,
    globalSelectedCharacterId,
    setGlobalSelectedCharacterId,
    isMobile = false,
    is_mobile
  } = props;

  // Coalesce props to handle both naming conventions
  const selectedCharacterId = globalSelectedCharacterId || global_selected_character_id;
  const setSelectedCharacterId = setGlobalSelectedCharacterId || set_global_selected_character_id;

  const [available_characters, setAvailableCharacters] = useState<EnhancedCharacter[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [characterEquipment, setCharacterEquipment] = useState<Record<string, Record<string, Equipment>>>({});
  const [activeTab, setActiveTab] = useState<'weapons-armor' | 'items'>('weapons-armor');

  // Load characters
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const characters = await characterAPI.get_user_characters();

        const enhancedCharacters: EnhancedCharacter[] = characters.map((char) => {
          return {
            ...char,
            base_name: char.character_id,  // Use character_id (underscores) for image paths
            name: char.name,
            level: char.level || 1,
            archetype: char.archetype,
            avatar: char.avatar || '⚔️',
            equipment: char.equipment || [],
            inventory: char.inventory || [],
            gameplan_adherence: char.gameplan_adherence,
            bond_level: char.bond_level,
            display_bond_level: char.bond_level || Math.floor((char.base_health || 100) / 10)
          };
        });

        setAvailableCharacters(enhancedCharacters);

        // Initialize characterEquipment state with existing equipment
        const initialEquipment: Record<string, Record<string, Equipment>> = {};
        enhancedCharacters.forEach((char) => {
          if (char.equipment && Array.isArray(char.equipment)) {
            const equipped_items: Record<string, Equipment> = {};
            (char.equipment as Equipment[]).forEach((item) => {
              if (item.slot) {
                equipped_items[item.slot] = item;
              }
            });
            if (Object.keys(equipped_items).length > 0) {
              initialEquipment[char.base_name] = equipped_items;
              console.log(`🎯 Initialized equipment for ${char.name}:`, equipped_items);
            }
          }
        });
        setCharacterEquipment(initialEquipment);

        // Auto-select first character if none selected
        if (!selectedCharacterId && enhancedCharacters.length > 0 && setSelectedCharacterId) {
          setSelectedCharacterId(enhancedCharacters[0].base_name);
          console.log(`🎯 Auto-selected character: ${enhancedCharacters[0].name}`);
        }

        setCharactersLoading(false);
      } catch (error) {
        console.error('Error loading characters:', error);
        setCharactersLoading(false);
      }
    };

    loadCharacters();
  }, [selectedCharacterId, setSelectedCharacterId]);

  const selected_character = useMemo(() => {
    if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) {
      return null;
    }
    return available_characters.find(c => c && c.base_name === selectedCharacterId) || available_characters[0];
  }, [available_characters, selectedCharacterId]);

  const handleEquip = async (equipment: Equipment) => {
    console.log('🔧 handleEquip called:', equipment);
    console.log('🔧 Current character:', selectedCharacterId);

    // Find the actual character by selectedCharacterId
    const character = available_characters.find(c => c && c.base_name === selectedCharacterId);
    if (!character) {
      console.error('❌ Character not found for equipping:', selectedCharacterId);
      return;
    }

    // Update local state first for immediate UI feedback
    setCharacterEquipment(prev => {
      const updated = {
        ...prev,
        [selectedCharacterId]: {
          ...prev[selectedCharacterId],
          [equipment.slot]: equipment
        }
      };
      console.log('🔧 Updated equipment state:', updated);
      return updated;
    });

    // Save to backend
    try {
      const currentEquipped = characterEquipment[selectedCharacterId] || {};
      const newEquipment = {
        ...currentEquipped,
        [equipment.slot]: equipment
      };

      // Convert to array format expected by backend
      const equipmentArray = Object.values(newEquipment).filter((item): item is Equipment => Boolean(item));

      console.log('💾 Saving equipment to backend:', equipmentArray);

      const result = await characterAPI.update_equipment(character.id, equipmentArray);
      console.log('✅ Equipment saved successfully:', result);

      // Reload character data to show updated equipment
      const characters = await characterAPI.get_user_characters();
      const enhancedCharacters: EnhancedCharacter[] = characters.map((char) => {
        return {
          ...char,
          base_name: char.character_id,
          name: char.name,
          level: char.level || 1,
          archetype: char.archetype,
          avatar: char.avatar || '⚔️',
          equipment: char.equipment || [],
          inventory: char.inventory || [],
          gameplan_adherence: char.gameplan_adherence,
          bond_level: char.bond_level,
          display_bond_level: char.bond_level || Math.floor((char.base_health || 100) / 10)
        };
      });
      setAvailableCharacters(enhancedCharacters);
      console.log('🔄 Character data refreshed after equipment save');

    } catch (error) {
      console.error('❌ Failed to save equipment to backend:', error);
      // Revert local state on error
      setCharacterEquipment(prev => {
        const reverted = { ...prev };
        if (reverted[selectedCharacterId]) {
          delete reverted[selectedCharacterId][equipment.slot];
        }
        return reverted;
      });
    }
  };

  const handleUnequip = async (slot: string) => {
    console.log('🔧 handleUnequip called:', slot);
    console.log('🔧 Current character:', selectedCharacterId);

    // Find the actual character by selectedCharacterId
    const character = available_characters.find(c => c && c.base_name === selectedCharacterId);
    if (!character) {
      console.error('❌ Character not found for unequipping:', selectedCharacterId);
      return;
    }

    // Update local state first for immediate UI feedback
    setCharacterEquipment(prev => ({
      ...prev,
      [selectedCharacterId]: {
        ...prev[selectedCharacterId],
        [slot]: undefined
      }
    }));

    // Save to backend
    try {
      const currentEquipped = characterEquipment[selectedCharacterId] || {};
      const newEquipment = { ...currentEquipped };
      delete newEquipment[slot];

      // Convert to array format expected by backend
      const equipmentArray = Object.values(newEquipment).filter((item): item is Equipment => Boolean(item));

      console.log('💾 Removing equipment from backend:', equipmentArray);

      await characterAPI.update_equipment(character.id, equipmentArray);
      console.log('✅ Equipment unequipped successfully');

      // Reload character data to show updated equipment
      const characters = await characterAPI.get_user_characters();
      const enhancedCharacters: EnhancedCharacter[] = characters.map((char) => {
        return {
          ...char,
          base_name: char.character_id,
          name: char.name,
          level: char.level || 1,
          archetype: char.archetype,
          avatar: char.avatar || '⚔️',
          equipment: char.equipment || [],
          inventory: char.inventory || [],
          gameplan_adherence: char.gameplan_adherence,
          bond_level: char.bond_level,
          display_bond_level: char.bond_level || Math.floor((char.base_health || 100) / 10)
        };
      });
      setAvailableCharacters(enhancedCharacters);
      console.log('🔄 Character data refreshed after equipment unequip');

    } catch (error) {
      console.error('❌ Failed to save equipment changes to backend:', error);
      // Revert local state on error
      console.warn('Manual refresh may be needed to restore equipment state');
    }
  };

  if (charactersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading equipment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('weapons-armor')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'weapons-armor'
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
        >
          ⚔️ Weapons & Armor
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'items'
            ? 'bg-green-600 text-white shadow-lg'
            : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
        >
          🧪 Items
        </button>
      </div>

      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
        {/* Shared Character Sidebar */}
        <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Characters
          </h3>
          <div className={`${isMobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
            {available_characters.map((character) => (
              <button
                key={character.id}
                onClick={() => setSelectedCharacterId && setSelectedCharacterId(character.base_name)}
                className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left ${selectedCharacterId === character.base_name
                  ? activeTab === 'weapons-armor'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-green-500 bg-green-500/20 text-white'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                  }`}
              >
                <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'}`}>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                  <div className={isMobile ? 'character-info' : ''}>
                    <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                    <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>
                      Lv.{character.level} {character.archetype}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-8">
          {activeTab === 'weapons-armor' && selected_character && (
            <>
              {/* Character Equipment Images */}
              <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 sm:rounded-xl p-2 sm:p-8 text-center mb-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-full sm:max-w-md md:max-w-lg lg:w-[40rem] h-[90vh] sm:h-[90vh] md:h-[90vh] lg:h-[86rem] sm:rounded-xl sm:border-4 border-blue-600 shadow-2xl bg-gray-800 sm:p-1 sm:p-2">
                    <div className="flex flex-col h-full gap-2">
                      {/* Top image */}
                      <div className="h-[65%] rounded-lg overflow-hidden border-2 border-blue-500/30">
                        <img
                          src={getCharacterImageSet(selected_character.character_id, 'equipment', 3)[1]}
                          alt={`${selected_character.name} equipment`}
                          className="w-full h-full object-contain bg-gray-900 object-top"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      {/* Bottom row */}
                      <div className="h-[35%] grid grid-cols-2 gap-2">
                        {[0, 2].map((imageIndex) => (
                          <div key={imageIndex} className="rounded-lg overflow-hidden border-2 border-blue-500/30">
                            <img
                              src={getCharacterImageSet(selected_character.character_id, 'equipment', 3)[imageIndex]}
                              alt={`${selected_character.name} equipment ${imageIndex + 1}`}
                              className="w-full h-full object-contain bg-gray-900"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                      <div className="text-3xl">{selected_character.avatar}</div>
                      <div>
                        <div>{selected_character.name}</div>
                        <div className="text-sm text-gray-400">
                          Level {selected_character.level} {selected_character.archetype}
                        </div>
                      </div>
                    </h2>
                  </div>
                </div>
              </div>

              {/* Equipment Advisor Chat */}
              <EquipmentAdvisorChat
                selected_characterId={selectedCharacterId}
                onCharacterChange={setSelectedCharacterId}
                selected_character={selected_character}
                available_characters={available_characters}
              />

              {/* Equipment Manager */}
              <EquipmentManager
                character_id={selected_character.id}
                character_name={selected_character.name}
                character_level={selected_character.level || 1}
                character_archetype={selected_character.archetype}
                equipped_items={(characterEquipment[selectedCharacterId] || characterEquipment[selected_character.base_name] || {})}
                inventory={selected_character.inventory || []}
                on_equip={handleEquip}
                on_unequip={handleUnequip}
                adherence_score={selected_character.gameplan_adherence || 100}
                bond_level={selected_character.bond_level || 50}
              />

              {/* Training Equipment Synergy */}
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-xl font-bold text-purple-300 mb-4">
                  ⚡ Training Equipment Synergy
                </h3>
                <p className="text-gray-300 mb-4">
                  {selected_character.name}'s training enhances equipment effectiveness
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Strength', 'Defense', 'Speed', 'Special'].map((stat) => {
                    const bonus = Math.floor((selected_character.level || 1) / 3);
                    return (
                      <div key={stat} className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-400">+{bonus}%</div>
                        <div className="text-sm text-gray-400">{stat}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'items' && selected_character && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selected_character.name}'s Inventory
                </h2>
                <p className="text-gray-400">
                  Consumables, materials, and quest items
                </p>
              </div>

              <InventoryManager
                character={{
                  id: selected_character.id,
                  name: selected_character.name,
                  avatar: selected_character.avatar,
                  archetype: selected_character.archetype,
                  level: selected_character.level,
                  stats: {}
                }}
                initial_inventory={{
                  character_id: selected_character.id,
                  items: [],
                  equipped: {},
                  quick_access: { slot1: null, slot2: null },
                  max_slots: 30,
                  sort_preference: 'rarity',
                  auto_sort: false,
                  last_updated: new Date()
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
