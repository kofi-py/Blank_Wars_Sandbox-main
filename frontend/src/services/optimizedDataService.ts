/**
 * Optimized data service for large game data structures
 * Implements lazy loading, indexing, and caching for better performance
 */

import { createLazyLoader, createIndexedAccess, memoize } from '@/utils/dataOptimization';
import type { Contestant as Character } from '@blankwars/types';
import { characterAPI } from '@/services/apiClient';
import type { Equipment } from '@/data/equipment';
import type { Item } from '@/data/items';

// Lazy loaders for large data files
export const loadCharacters = createLazyLoader<Character[]>(
  async () => {
    const characters = await characterAPI.get_user_characters();
    return characters;
  },
  'characters'
);

export const loadEquipment = createLazyLoader(
  async () => {
    // Load from database instead of hardcoded data
    const { equipmentCache } = await import('./equipmentCache');
    const characterEquipment: Equipment[] = [];
    const genericEquipment = await equipmentCache.getGenericEquipment();

    // Get equipment for common characters
    const commonCharacters = ['achilles', 'merlin', 'holmes', 'dracula', 'tesla', 'joan', 'fenrir'];
    for (const character_id of commonCharacters) {
      const charEquipment = await equipmentCache.getCharacterEquipment(character_id);
      characterEquipment.push(...charEquipment);
    }

    return [...characterEquipment, ...genericEquipment];
  },
  'equipment'
);

export const loadItems = createLazyLoader(
  async () => {
    // Load from database instead of hardcoded data
    const { equipmentCache } = await import('./equipmentCache');
    return await equipmentCache.getItems();
  },
  'items'
);

// Indexed access for fast lookups
let characterIndex: ReturnType<typeof createIndexedAccess> | null = null;
let equipmentIndex: ReturnType<typeof createIndexedAccess> | null = null;
let itemIndex: ReturnType<typeof createIndexedAccess> | null = null;

export async function getCharacterIndex() {
  if (!characterIndex) {
    const characters = await loadCharacters();
    characterIndex = createIndexedAccess(characters, 'characters');
  }
  return characterIndex;
}

export async function getEquipmentIndex() {
  if (!equipmentIndex) {
    const equipment = await loadEquipment();
    equipmentIndex = createIndexedAccess(equipment, 'equipment');
  }
  return equipmentIndex;
}

export async function getItemIndex() {
  if (!itemIndex) {
    const items = await loadItems();
    itemIndex = createIndexedAccess(items, 'items');
  }
  return itemIndex;
}

// Optimized lookup functions
export const getCharacterById = memoize(async (id: string) => {
  const index = await getCharacterIndex();
  return index.get_by_id(id);
});

export const getCharactersByIds = memoize(async (ids: string[]) => {
  const index = await getCharacterIndex();
  return index.get_by_ids(ids);
}, (ids) => ids.sort().join(','));

export const getEquipmentById = memoize(async (id: string) => {
  const index = await getEquipmentIndex();
  return index.get_by_id(id);
});

export const getItemById = memoize(async (id: string) => {
  const index = await getItemIndex();
  return index.get_by_id(id);
});

// Filtered searches with memoization
export const getCharactersByArchetype = memoize(async (archetype: string) => {
  const index = await getCharacterIndex();
  return index.search((char: Character) => char.archetype === archetype);
});

export const getCharactersByRarity = memoize(async (rarity: string) => {
  const index = await getCharacterIndex();
  return index.search((char: Character) => char.rarity === rarity);
});

export const getEquipmentByType = memoize(async (type: string) => {
  const index = await getEquipmentIndex();
  return index.search((item: Equipment) => item.type === type);
});

// Batch operations for efficiency
export async function preloadEssentialData() {
  // Load only the most commonly used data
  const promises = [
    loadCharacters(),
    // Don't preload equipment and items unless needed
  ];

  await Promise.all(promises);
}

export async function getCharacterWithDependencies(character_id: string) {
  const character = await getCharacterById(character_id) as Character | null;
  if (!character) return null;

  // Load related data in parallel
  const weaponId = character.equipped_items?.weapon?.id;
  const equipment = weaponId ? await getEquipmentById(weaponId) : null;

  return {
    character,
    equipment
  };
}

// Clean up function for memory management
export function clearOptimizedDataCache() {
  characterIndex = null;
  equipmentIndex = null;
  itemIndex = null;
}
