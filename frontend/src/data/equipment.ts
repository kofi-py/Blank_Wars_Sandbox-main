// Weapons and Equipment System for Blank Wars
// Type definitions and utility functions for equipment system
// Equipment data now loaded dynamically from database via equipmentCache

export type EquipmentSlot = 'weapon' | 'armor' | 'body_armor' | 'accessory' | 'off_hand' | 'large_item' | 'accessories';
export type WeaponType = 'sword' | 'bow' | 'staff' | 'dagger' | 'hammer' | 'claws' | 'orb' | 'shield' | 'spear' | 'crown' | 'whip' | 'sonic' | 'club' | 'cane' | 'revolver' | 'rifle' | 'chalice' | 'generator' | 'cudgel' | 'tommy_gun' | 'fedora' | 'knife' | 'coil' | 'cannon' | 'energy_blade' | 'plasma_rifle' | 'disruptor' | 'probe_staff' | 'mind_control' | 'reality_warper' | 'pistol' | 'briefcase' | 'cloak' | 'banner' | 'knuckles' | 'rod' | 'gun' | 'armband' | 'siege_weapon';
export type ArmorType = 'light' | 'medium' | 'heavy' | 'robes' | 'leather' | 'plate';
export type AccessoryType = 'ring' | 'amulet' | 'charm' | 'relic' | 'tome' | 'trinket' | 'armband';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface EquipmentStats {
  // Combat Stats (short keys from database)
  hp?: number;              // → health
  atk?: number;             // → attack
  def?: number;             // → defense
  spd?: number;             // → speed
  magic_attack?: number;     // → magic_attack
  magic_defense?: number;    // → magic_defense

  // Attribute Stats (short keys)
  str?: number;             // → strength
  dex?: number;             // → dexterity
  sta?: number;             // → defense
  int?: number;             // → intelligence
  wis?: number;             // → wisdom
  cha?: number;             // → charisma
  spr?: number;             // → spirit

  // Advanced Combat Stats
  crit_rate?: number;        // → critical_chance
  crit_damage?: number;      // → critical_damage
  accuracy?: number;        // → accuracy
  evasion?: number;         // → evasion
  mana?: number;            // → max_mana
  energy_regen?: number;     // → energy_regen

  // Psychological Stats (special items)
  stress?: number;          // → reduces stress_level
  focus?: number;           // → gameplan_adherence
  mental_health?: number;    // → mental_health
  teamwork?: number;        // → team_player
  confidence?: number;      // → ego
  trust?: number;           // → team_trust

  // Special/Misc
  xp_bonus?: number;
  team_coordination?: number;
  ally_morale?: number;
  damage_bonus?: number;
  rage_buildup?: number;
  fire_resistance?: number;
  [key: string]: number | undefined;
}

export interface EquipmentEffect {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active' | 'trigger';
  trigger?: 'battle_start' | 'turn_start' | 'on_hit' | 'on_crit' | 'on_kill' | 'low_hp' | 'ally_defeated';
  value?: number;
  duration?: number;
  cooldown?: number;
  // Database-specific effect properties
  condition?: string;
  team_bonus?: boolean;
  rage_increase?: boolean;
  reflect_damage?: string;
  divine_protection?: boolean;
  uses_per_battle?: number;
  summon_count?: number;
  summon_duration?: number;
  additional_attacks?: number;
  [key: string]: any;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  type: WeaponType | ArmorType | AccessoryType | string;
  rarity: EquipmentRarity;
  level: number;
  required_level: number;
  required_archetype?: string[];
  preferred_character?: string;
  stats: EquipmentStats;
  effects: EquipmentEffect[];
  range?: number; // Weapon range in hexes (0-12): 0=unarmed, 1-2=close, 3-4=melee, 5=polearm, 6-7=short range, 8-9=medium range, 10-12=long range (12=full grid)
  icon: string;
  image?: string;
  flavor?: string;
  obtain_method?: 'shop' | 'craft' | 'drop' | 'quest' | 'event' | 'premium';
  price?: number;
  sell_price?: number;
  acquired_from?: string;
  lore?: string;
  prompt_addition?: string;
  crafting_materials?: { item: string; quantity: number }[];
  [key: string]: any;
}

// Equipment Set interface
export interface EquipmentSet {
  id: string;
  name: string;
  description: string;
  items: string[];
  bonuses: {
    pieces: number;
    stats: EquipmentStats;
    effects: EquipmentEffect[];
  }[];
}

// Rarity configuration for UI display
export const rarityConfig: Record<EquipmentRarity, {
  name: string;
  color: string;
  text_color: string;
  stat_multiplier: number;
  drop_rate: number;
  icon: string;
  glow: string;
}> = {
  common: {
    name: 'Common',
    color: 'from-gray-500 to-gray-600',
    text_color: 'text-gray-300',
    stat_multiplier: 1.0,
    drop_rate: 0.6,
    icon: '⚪',
    glow: 'shadow-gray-500/50'
  },
  uncommon: {
    name: 'Uncommon',
    color: 'from-green-500 to-green-600',
    text_color: 'text-green-300',
    stat_multiplier: 1.2,
    drop_rate: 0.25,
    icon: '🟢',
    glow: 'shadow-green-500/50'
  },
  rare: {
    name: 'Rare',
    color: 'from-blue-500 to-blue-600',
    text_color: 'text-blue-300',
    stat_multiplier: 1.5,
    drop_rate: 0.1,
    icon: '🔵',
    glow: 'shadow-blue-500/50'
  },
  epic: {
    name: 'Epic',
    color: 'from-purple-500 to-purple-600',
    text_color: 'text-purple-300',
    stat_multiplier: 2.0,
    drop_rate: 0.04,
    icon: '🟣',
    glow: 'shadow-purple-500/50'
  },
  legendary: {
    name: 'Legendary',
    color: 'from-yellow-500 to-orange-600',
    text_color: 'text-yellow-300',
    stat_multiplier: 3.0,
    drop_rate: 0.009,
    icon: '🟡',
    glow: 'shadow-yellow-500/50'
  },
  mythic: {
    name: 'Mythic',
    color: 'from-pink-500 via-purple-500 to-blue-500',
    text_color: 'text-pink-300',
    stat_multiplier: 5.0,
    drop_rate: 0.001,
    icon: '🌟',
    glow: 'shadow-pink-500/50'
  }
};

// Equipment sets (hardcoded for now, can be moved to database later)
export const equipmentSets: EquipmentSet[] = [
  {
    id: 'shadow_assassin',
    name: 'Shadow Assassin Set',
    description: 'Equipment favored by elite assassins',
    items: ['shadow_dagger', 'assassin_garb', 'stealth_ring'],
    bonuses: [
      {
        pieces: 2,
        stats: { spd: 10, crit_rate: 15 },
        effects: []
      },
      {
        pieces: 3,
        stats: { spd: 20, crit_rate: 25, evasion: 20 },
        effects: [
          {
            id: 'master_assassin',
            name: 'Master Assassin',
            description: 'First attack each battle is guaranteed critical hit',
            type: 'trigger',
            trigger: 'battle_start'
          }
        ]
      }
    ]
  }
];

// UTILITY FUNCTIONS
// Import equipmentCache for database access
import { equipmentCache } from '../services/equipmentCache';

// Helper: Get equipment from cache (fallback for backward compatibility)
async function getAllEquipment(): Promise<Equipment[]> {
  try {
    // Get all equipment from database
    const [generic, characterEquipment] = await Promise.all([
      equipmentCache.getGenericEquipment(),
      // Note: This gets all equipment, we'd need to iterate through characters
      // For now, return generic equipment
      equipmentCache.getGenericEquipment()
    ]);
    return generic;
  } catch (error) {
    console.warn('Failed to load equipment from database:', error);
    return [];
  }
}

// BACKWARD COMPATIBLE FUNCTIONS (original signatures preserved)
// These functions now use database data but maintain the same API

export async function getEquipmentBySlot(slot: EquipmentSlot): Promise<Equipment[]> {
  const allEquipment = await getAllEquipment();
  return allEquipment.filter(item => item.slot === slot);
}

export async function getEquipmentByRarity(rarity: EquipmentRarity): Promise<Equipment[]> {
  const allEquipment = await getAllEquipment();
  return allEquipment.filter(item => item.rarity === rarity);
}

export async function getEquipmentByArchetype(archetype: string): Promise<Equipment[]> {
  const allEquipment = await getAllEquipment();
  return allEquipment.filter(item =>
    !item.required_archetype || item.required_archetype.includes(archetype)
  );
}

export function canEquip(equipment: Equipment, character_level: number, character_archetype: string): boolean {
  const levelCheck = character_level >= equipment.required_level;
  const archetypeCheck = !equipment.required_archetype || equipment.required_archetype.includes(character_archetype);
  return levelCheck && archetypeCheck;
}

export function calculateEquipmentStats(equipment: Equipment[]): EquipmentStats {
  return equipment.reduce((total, item) => {
    const stats = item.stats;
    return {
      atk: (total.atk || 0) + (stats.atk || 0),
      def: (total.def || 0) + (stats.def || 0),
      spd: (total.spd || 0) + (stats.spd || 0),
      hp: (total.hp || 0) + (stats.hp || 0),
      crit_rate: (total.crit_rate || 0) + (stats.crit_rate || 0),
      crit_damage: (total.crit_damage || 0) + (stats.crit_damage || 0),
      accuracy: (total.accuracy || 0) + (stats.accuracy || 0),
      evasion: (total.evasion || 0) + (stats.evasion || 0),
      energy_regen: (total.energy_regen || 0) + (stats.energy_regen || 0),
      xp_bonus: (total.xp_bonus || 0) + (stats.xp_bonus || 0),
      magic_attack: (total.magic_attack || 0) + (stats.magic_attack || 0)
    };
  }, {} as EquipmentStats);
}

export async function getRandomEquipment(character_level: number, archetype: string): Promise<Equipment | null> {
  const allEquipment = await getAllEquipment();
  const availableEquipment = allEquipment.filter(item =>
    canEquip(item, character_level, archetype)
  );

  if (availableEquipment.length === 0) {
    return null;
  }

  // Weight by rarity drop rates
  const weightedPool: Equipment[] = [];
  availableEquipment.forEach(item => {
    const rarity = rarityConfig[item.rarity];
    const count = Math.ceil(rarity.drop_rate * 100);
    for (let i = 0; i < count; i++) {
      weightedPool.push(item);
    }
  });

  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

export async function getCharacterSpecificWeapons(character_id: string): Promise<Equipment[]> {
  try {
    // Use the character-specific equipment endpoint
    const characterEquipment = await equipmentCache.getCharacterEquipment(character_id);
    return characterEquipment.filter(item => item.slot === 'weapon');
  } catch (error) {
    console.warn(`Failed to load weapons for ${character_id}:`, error);
    return [];
  }
}

export async function getCharacterWeaponProgression(character_id: string): Promise<{
  basic: Equipment | null;
  elite: Equipment | null;
  legendary: Equipment | null;
}> {
  const weapons = await getCharacterSpecificWeapons(character_id);

  return {
    basic: weapons.find(w => w.rarity === 'common') || null,
    elite: weapons.find(w => w.rarity === 'rare') || null,
    legendary: weapons.find(w => w.rarity === 'legendary') || null
  };
}

export async function getAllCharacterWeapons(): Promise<Record<string, Equipment[]>> {
  const characterWeapons: Record<string, Equipment[]> = {};
  
  // This would need to iterate through all characters
  // For now, return empty object as this function needs refactoring
  console.warn('getAllCharacterWeapons needs refactoring for database use');
  return characterWeapons;
}

// NEW SYNCHRONOUS FUNCTIONS (for components that have equipment data already)
// These work with equipment arrays passed as parameters

export function getEquipmentBySlotSync(equipment: Equipment[], slot: EquipmentSlot): Equipment[] {
  return equipment.filter(item => item.slot === slot);
}

export function getEquipmentByRaritySync(equipment: Equipment[], rarity: EquipmentRarity): Equipment[] {
  return equipment.filter(item => item.rarity === rarity);
}

export function getEquipmentByArchetypeSync(equipment: Equipment[], archetype: string): Equipment[] {
  return equipment.filter(item =>
    !item.required_archetype || item.required_archetype.includes(archetype)
  );
}

export function getRandomEquipmentSync(equipment: Equipment[], character_level: number, archetype: string): Equipment | null {
  const availableEquipment = equipment.filter(item =>
    canEquip(item, character_level, archetype)
  );

  if (availableEquipment.length === 0) {
    return null;
  }

  // Weight by rarity drop rates
  const weightedPool: Equipment[] = [];
  availableEquipment.forEach(item => {
    const rarity = rarityConfig[item.rarity];
    const count = Math.ceil(rarity.drop_rate * 100);
    for (let i = 0; i < count; i++) {
      weightedPool.push(item);
    }
  });

  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

export function getCharacterSpecificEquipmentSync(equipment: Equipment[], character_id: string): Equipment[] {
  return equipment.filter(item => item.preferred_character === character_id);
}