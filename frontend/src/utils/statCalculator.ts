// Unified Stat Calculation System
// Calculates final character stats by adding equipment bonuses to base stats

import { EquipmentStats, Equipment } from '../data/equipment';
import type { UserCharacter } from '@blankwars/types';

/**
 * Stat mapping from equipment short keys to character stat fields
 */
const STAT_MAPPING: Record<string, string> = {
  // Combat Stats
  hp: 'health',
  atk: 'attack',
  def: 'defense',
  spd: 'speed',
  magic_attack: 'magic_attack',
  magic_defense: 'magic_defense',

  // Attribute Stats
  str: 'strength',
  dex: 'dexterity',
  sta: 'defense',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
  spr: 'spirit',

  // Advanced Combat Stats
  crit_rate: 'critical_chance',
  crit_damage: 'critical_damage',
  accuracy: 'accuracy',
  evasion: 'evasion',
  mana: 'max_mana',
  energy_regen: 'energy_regen',

  // Psychological Stats
  focus: 'gameplan_adherence',
  mental_health: 'mental_health',
  teamwork: 'team_player',
  confidence: 'ego',
  trust: 'team_trust',
  // Note: stress REDUCES stress_level, handled specially below
};

export interface EquipmentBonuses {
  [key: string]: number;
}

/**
 * Calculate total equipment bonuses from inventory
 * @param inventory - Array of items from character's inventory
 * @returns Object with bonuses for each stat
 */
export function calculateEquipmentBonuses(inventory: Equipment[]): EquipmentBonuses {
  const bonuses: EquipmentBonuses = {};

  // Filter for equipped items
  const equipped_items = inventory.filter((item) => item.is_equipped);

  // Sum up all stats from equipped items
  equipped_items.forEach((item) => {
    // InventoryItem can have stats in the equipment property
    const equipment_data = item.equipment;
    const stats = equipment_data?.stats || {};

    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'number') {
        // Map equipment stat key to character stat field
        const statField = STAT_MAPPING[key] || key;
        bonuses[statField] = (bonuses[statField] || 0) + value;
      }
    });

    // Special case: stress equipment REDUCES stress_level
    if (stats.stress && typeof stats.stress === 'number') {
      bonuses.stress_level = (bonuses.stress_level || 0) - stats.stress;
    }
  });

  return bonuses;
}

/**
 * Get allocated attribute points for a stat
 * attribute_allocations is a sparse JSONB object - missing key means 0 allocated
 */
function getAllocatedPoints(allocations: Record<string, number>, stat: string): number {
  return stat in allocations ? allocations[stat] : 0;
}

/**
 * Calculate final character stats (base + equipment bonuses + attribute allocations)
 * @param character - Character object with base stats and inventory
 * @returns Object with final stat values
 */
export function calculateFinalStats(character: UserCharacter): UserCharacter {
  const inventory = (character.inventory || []) as Equipment[];
  const bonuses = calculateEquipmentBonuses(inventory);
  const allocations: Record<string, number> = character.attribute_allocations || {};
  const finalStats: UserCharacter = { ...character };

  // Apply equipment bonuses to base stats
  Object.entries(bonuses).forEach(([statKey, bonus]) => {
    if (typeof character[statKey] === 'number') {
      finalStats[statKey] = character[statKey] + bonus;
    }
  });

  // Apply attribute allocations to combat stats
  // These map directly: attack, defense, speed, dexterity, intelligence, wisdom, spirit
  const direct_stats = ['attack', 'defense', 'speed', 'dexterity', 'intelligence', 'wisdom', 'spirit', 'strength', 'charisma', 'energy_regen'];
  direct_stats.forEach((stat) => {
    const allocated = getAllocatedPoints(allocations, stat);
    if (allocated > 0 && typeof finalStats[stat] === 'number') {
      finalStats[stat] = finalStats[stat] + allocated;
    }
  });

  // Intelligence also boosts magic_attack
  const int_allocated = getAllocatedPoints(allocations, 'intelligence');
  if (int_allocated > 0 && typeof finalStats.magic_attack === 'number') {
    finalStats.magic_attack = finalStats.magic_attack + int_allocated;
  }

  // Wisdom also boosts magic_defense
  const wis_allocated = getAllocatedPoints(allocations, 'wisdom');
  if (wis_allocated > 0 && typeof finalStats.magic_defense === 'number') {
    finalStats.magic_defense = finalStats.magic_defense + wis_allocated;
  }

  return finalStats;
}

/**
 * Get equipment bonuses for display purposes
 * @param inventory - Array of items from character's inventory
 * @returns Object mapping stat names to their bonus values
 */
export function getEquipmentBonusesForDisplay(inventory: Equipment[]): Record<string, number> {
  const bonuses = calculateEquipmentBonuses(inventory);
  const displayBonuses: Record<string, number> = {};

  // Convert to display format (only include stats with non-zero bonuses)
  Object.entries(bonuses).forEach(([key, value]) => {
    if (value !== 0) {
      displayBonuses[key] = value;
    }
  });

  return displayBonuses;
}

/**
 * Get a human-readable stat name for display
 */
export function getStatDisplayName(statKey: string): string {
  const display_names: Record<string, string> = {
    // Combat Stats
    health: 'Health',
    attack: 'Attack',
    defense: 'Defense',
    speed: 'Speed',
    magic_attack: 'Magic Attack',
    magic_defense: 'Magic Defense',

    // Attribute Stats
    strength: 'Strength',
    dexterity: 'Dexterity',
    intelligence: 'Intelligence',
    wisdom: 'Wisdom',
    charisma: 'Charisma',
    spirit: 'Spirit',

    // Advanced Combat
    critical_chance: 'Critical Chance',
    critical_damage: 'Critical Damage',
    accuracy: 'Accuracy',
    evasion: 'Evasion',
    max_mana: 'Max Mana',
    energy_regen: 'Energy Regen',

    // Psychological
    training: 'Training',
    team_player: 'Team Player',
    ego: 'Ego',
    mental_health: 'Mental Health',
    communication: 'Communication',
    gameplan_adherence: 'Gameplan Adherence',
    stress_level: 'Stress Level',
    team_trust: 'Team Trust',
  };

  return display_names[statKey] || statKey;
}
