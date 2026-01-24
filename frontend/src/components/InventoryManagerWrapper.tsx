'use client';

import { useState, useEffect, useRef } from 'react';
import { Package } from 'lucide-react';
import InventoryManager, { populateInventoryDataCache } from './InventoryManager';
import { characterAPI, equipmentAPI } from '@/services/apiClient';
import { equipmentCache } from '@/services/equipmentCache';
import { InventoryItem } from '@/data/inventory';
import type { Equipment } from '@/data/equipment';
import type { Contestant } from '@blankwars/types';

interface UserItemResponse {
  id: string;
  quantity: number;
  acquiredAt: string;
}

interface ItemDataResponse {
  id: string;
  name: string;
  description: string;
}

interface UserInventory {
  equipment: Equipment[];
  items: UserItemResponse[];
}

// Hook to preserve scroll position across re-renders
const useScrollPreservation = (key: string) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScrollPositions = useRef<Map<string, number>>(new Map());

  const saveScrollPosition = () => {
    if (scrollRef.current) {
      savedScrollPositions.current.set(key, scrollRef.current.scrollTop);
    }
  };

  const restoreScrollPosition = () => {
    if (scrollRef.current) {
      const savedPosition = savedScrollPositions.current.get(key) || 0;
      scrollRef.current.scrollTop = savedPosition;
    }
  };

  useEffect(() => {
    // Restore scroll position after component mounts/updates
    const timeoutId = setTimeout(restoreScrollPosition, 0);
    return () => clearTimeout(timeoutId);
  });

  return {
    scrollRef,
    saveScrollPosition,
    restoreScrollPosition
  };
};

interface InventoryManagerWrapperProps {
  global_selected_character_id: string;
  set_global_selected_character_id: (id: string) => void;
}

// Helper function to convert character equipment to InventoryItem format
const convertEquipmentToInventoryItem = (equipment: Equipment, equipment_data: Equipment[]): InventoryItem | null => {
  if (!equipment || !equipment.id) {
    return null;
  }

  // Find the full equipment data from the loaded equipment
  const fullEquipmentData = (equipment_data && Array.isArray(equipment_data))
    ? (equipment_data.find(eq => eq.id === equipment.id) || equipment)
    : equipment;

  return {
    id: `char_eq_${equipment.id}`,
    item_id: equipment.id,
    quantity: 1,
    acquired_date: new Date(),
    is_equipped: false, // Will be marked as equipped if in character's equipped slots
    equipment_slot: (equipment.slot as 'weapon' | 'armor' | 'accessory') || 'weapon',
    enhancement_level: 0,
    is_locked: false,
    is_favorite: false,
    // Add the raw equipment data for access to name, description, etc.
    equipment: fullEquipmentData
  };
};

// Helper function to convert user items to InventoryItem format
const convertUserItemToInventoryItem = (item: UserItemResponse, items_data: ItemDataResponse[]): InventoryItem | null => {
  if (!item) {
    throw new Error('Item is required');
  }

  if (!item.id) {
    throw new Error('Item ID is required');
  }

  if (!item.quantity) {
    throw new Error(`Item ${item.id} quantity is required`);
  }

  if (!item.acquiredAt) {
    throw new Error(`Item ${item.id} acquiredAt date is required`);
  }

  const fullItemData = items_data.find((itm) => itm.id === item.id);

  if (!fullItemData) {
    throw new Error(`Item ${item.id} not found in items cache`);
  }

  return {
    id: `user_item_${item.id}`,
    item_id: item.id,
    quantity: item.quantity,
    acquired_date: new Date(item.acquiredAt),
    is_equipped: false,
    is_locked: false,
    is_favorite: false,
    item: fullItemData
  };
};

export default function InventoryManagerWrapper({
  global_selected_character_id,
  set_global_selected_character_id
}: InventoryManagerWrapperProps) {
  const [available_characters, setAvailableCharacters] = useState<Contestant[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [userInventory, setUserInventory] = useState<UserInventory | null>(null);
  const [equipmentData, setEquipmentData] = useState<Equipment[]>([]);
  const [itemsData, setItemsData] = useState<ItemDataResponse[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const inventoryCharacterScrollPreservation = useScrollPreservation('inventory-characters');

  // Load equipment and items data for cache population
  useEffect(() => {
    const loadEquipmentAndItemsData = async () => {
      try {
        console.log('🔄 Loading equipment and items data for cache...');

        // Load all equipment and items data
        const [genericEquipment, items] = await Promise.all([
          equipmentCache.getGenericEquipment(),
          equipmentCache.getItems()
        ]);

        // Also load character-specific equipment for popular characters
        const characterEquipmentPromises = ['achilles', 'merlin', 'holmes', 'dracula', 'tesla', 'joan', 'fenrir'].map(
          charId => equipmentCache.getCharacterEquipment(charId)
        );
        const characterEquipment = await Promise.all(characterEquipmentPromises);
        const allCharacterEquipment = characterEquipment.flat();

        // Combine all equipment
        const allEquipment = [...genericEquipment, ...allCharacterEquipment];

        console.log('📦 Loaded equipment and items:', {
          equipment: allEquipment.length,
          items: items.length
        });

        setEquipmentData(allEquipment);
        setItemsData(items);

        // Store data for lookup during conversion
        populateInventoryDataCache(allEquipment, items);

        setDataLoaded(true);
      } catch (error) {
        console.error('❌ Failed to load equipment and items data:', error);
        setDataLoaded(true); // Still allow component to render
      }
    };

    loadEquipmentAndItemsData();
  }, []);

  // Load user's complete inventory (equipment + items) from proper API
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const inventoryResponse = await equipmentAPI.get_user_inventory();
        console.log('🎒 Loaded user inventory:', inventoryResponse);
        setUserInventory(inventoryResponse.inventory || { equipment: [], items: [] });
      } catch (error) {
        console.error('❌ Failed to load user inventory:', error);
        setUserInventory({ equipment: [], items: [] });
      }
    };

    loadInventory();
  }, []);

  // Load characters data from API
  useEffect(() => {
    const loadCharacters = async () => {
      setCharactersLoading(true);
      try {
        const characters = await characterAPI.get_user_characters();

        const mappedCharacters = (characters as Contestant[]).map((char) => {
          const base_name = char.name?.toLowerCase() || char.id?.split('_')[0];
          console.log('🔍 Character data mapping:', char.name, {
            has_inventory: !!char.inventory,
            inventory_length: char.inventory?.length || 0,
            inventory_items: char.inventory || []
          });

          // Use inventory directly
          const actualInventory = char.inventory || [];

          return {
            ...char,
            base_name,
            name: char.name,
            level: char.level || 1,
            archetype: char.archetype, // No fallback - must be from DB
            avatar: char.avatar_emoji || '⚔️',
            inventory: actualInventory,
            equipment: char.equipment || []
          };
        });

        setAvailableCharacters(mappedCharacters);
      } catch (error) {
        console.error('❌ Failed to load characters for inventory:', error);
        setAvailableCharacters([]);
      } finally {
        setCharactersLoading(false);
      }
    };

    loadCharacters();
  }, []);

  const selected_character = (available_characters && Array.isArray(available_characters) && available_characters.length > 0)
    ? (available_characters.find(c => c.base_name === global_selected_character_id) || available_characters[0])
    : null;

  // Calculate total inventory count for debugging
  const totalInventoryCount = selected_character ? (() => {
    const userItems = userInventory ? (userInventory.equipment?.length || 0) + (userInventory.items?.length || 0) : 0;
    const allCharacterEquipment = (available_characters && Array.isArray(available_characters))
      ? available_characters.flatMap(char => {
        const equipment = char.equipment || {};
        return Object.values(equipment).filter(item => item != null);
      })
      : [];
    return userItems + allCharacterEquipment.length;
  })() : 0;

  console.log('Items - Real character data:', selected_character?.name, 'Total inventory count:', totalInventoryCount, 'Character equipment:', Object.values(selected_character?.equipment || {}).filter(item => item != null).length);

  if (charactersLoading || !dataLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading character inventory and equipment data...</p>
        </div>
      </div>
    );
  }

  if (!selected_character) {
    return (
      <div className="text-center text-gray-400 py-8">
        No character selected or available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        {/* Character Sidebar */}
        <div className="w-80 bg-gray-800/80 rounded-xl p-4 h-fit">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Characters
          </h3>
          <div ref={inventoryCharacterScrollPreservation.scrollRef} className="space-y-2 max-h-96 overflow-y-auto">
            {available_characters.map((character) => (
              <button
                key={character.id}
                onClick={() => {
                  console.log('Clicking character:', character.name, character.base_name);
                  inventoryCharacterScrollPreservation.saveScrollPosition();
                  set_global_selected_character_id(character.base_name);
                }}
                className={`w-full p-3 rounded-lg border transition-all text-left ${global_selected_character_id === character.base_name
                  ? 'border-green-500 bg-green-500/20 text-white'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{character.avatar}</div>
                  <div>
                    <div className="font-semibold">{character.name}</div>
                    <div className="text-xs opacity-75">
                      Lv.{character.level} • {(() => {
                        const userItems = userInventory ? (userInventory.equipment?.length || 0) + (userInventory.items?.length || 0) : 0;
                        const characterEquipment = Object.values(character.equipment || {}).filter(item => item != null).length;
                        return userItems + characterEquipment;
                      })()} items
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Manager */}
        <div className="flex-1">
          <InventoryManager
            character={{
              id: selected_character.id,
              name: selected_character.name,
              level: selected_character.level,
              archetype: selected_character.archetype,
              avatar: selected_character.avatar,
              stats: selected_character.stats || {}
            }}
            initial_inventory={{
              items: (() => {
                if (!dataLoaded) return [];

                // Convert user inventory items to proper InventoryItem format
                // Only include consumable items here - equipment goes to equipped slots
                const user_items: InventoryItem[] = userInventory ? [
                  ...(userInventory.items || []).map((item: UserItemResponse) => convertUserItemToInventoryItem(item, itemsData)).filter(Boolean)
                ] : [];

                // Aggregate all equipment from all characters and convert to InventoryItem format
                const characterEquipmentItems: InventoryItem[] = (available_characters && Array.isArray(available_characters))
                  ? available_characters.flatMap(char => {
                    const equipment = char.equipment || {};
                    const characterEquipmentArray = Object.values(equipment).filter(item => item != null);

                    return characterEquipmentArray.map((eq: Equipment) => {
                      const inventoryItem = convertEquipmentToInventoryItem(eq, equipmentData);
                      if (inventoryItem) {
                        // Mark as equipped if it's currently equipped by this character
                        inventoryItem.is_equipped = true;
                        inventoryItem.id = `${char.id}_eq_${eq.id}`;
                      }
                      return inventoryItem;
                    }).filter(Boolean) as InventoryItem[];
                  })
                  : [];

                console.log('🎒 Items page inventory aggregation:', {
                  user_items_count: user_items.length,
                  character_equipment_count: characterEquipmentItems.length,
                  total_items: user_items.length + characterEquipmentItems.length,
                  sample_user_items: user_items.slice(0, 2).map(item => ({ id: item.id, item_id: item.item_id, is_equipped: item.is_equipped })),
                  sample_character_equipment: characterEquipmentItems.slice(0, 2).map(item => ({ id: item.id, item_id: item.item_id, is_equipped: item.is_equipped })),
                  character_names: available_characters.map(char => char.name),
                  data_loaded_status: dataLoaded
                });

                return [...user_items, ...characterEquipmentItems];
              })(),
              equipped: (() => {
                // Convert character equipment array to equipped slots format
                const characterEquipment = selected_character.equipment || {};
                const equipped: { weapon?: InventoryItem, armor?: InventoryItem, accessory?: InventoryItem } = {};

                // Handle both array and object formats
                const equipmentItems = Array.isArray(characterEquipment)
                  ? characterEquipment
                  : Object.values(characterEquipment).filter(Boolean);

                equipmentItems.forEach((item: Equipment) => {
                  if (!item) return;

                  // Find the full equipment data
                  const fullEquipmentData = (equipmentData && Array.isArray(equipmentData))
                    ? (equipmentData.find(eq => eq.id === item.id) || item)
                    : item;

                  // Convert to InventoryItem format
                  const inventoryItem = convertEquipmentToInventoryItem(fullEquipmentData, equipmentData);
                  if (!inventoryItem) return;

                  // Assign to appropriate slot based on equipment type
                  const slot = fullEquipmentData.slot || item.slot;
                  if (slot === 'weapon') {
                    equipped.weapon = inventoryItem;
                  } else if (slot === 'armor' || slot === 'body_armor') {
                    equipped.armor = inventoryItem;
                  } else if (slot === 'accessory') {
                    equipped.accessory = inventoryItem;
                  }
                });

                return equipped;
              })(),
              quick_access: (() => {
                // Auto-assign first consumable items to quick_access slots
                const consumableItems = userInventory?.items || [];

                return {
                  slot1: consumableItems[0] ? convertUserItemToInventoryItem(consumableItems[0], itemsData) : null,
                  slot2: consumableItems[1] ? convertUserItemToInventoryItem(consumableItems[1], itemsData) : null
                };
              })(),
              max_slots: selected_character.maxInventorySlots || 30,
              sort_preference: 'rarity',
              character_id: selected_character.id,
              auto_sort: false,
              last_updated: new Date()
            }}
            onInventoryChange={(updated_inventory) => {
              console.log('🔄 Inventory changed:', updated_inventory);
              // TODO: Save to backend if needed
            }}
            onStatsChange={(newStats) => {
              console.log('📊 Stats changed:', newStats);
              // TODO: Update character stats if needed
            }}
          />
        </div>
      </div>
    </div>
  );
}