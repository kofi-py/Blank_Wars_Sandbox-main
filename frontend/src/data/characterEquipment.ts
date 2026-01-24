// Character Equipment Integration System
// Combines character base stats with equipment bonuses

import { CharacterStats } from '../services/apiClient';
import { Contestant as Character } from '@blankwars/types';
import { TeamCharacter } from './teamBattleSystem';
import { Equipment, EquipmentStats } from './equipment';
import { validateEquipmentObject } from '../utils/equipmentBalance';

// Type alias for legacy compatibility
type CombatStats = CharacterStats;

// Union type for any character that can equip items
export type EquipmentUser = Character | TeamCharacter;

// Moved calculateEquipmentStats to individual components to avoid circular imports
const calculateEquipmentStats = (equipment: Equipment[]): EquipmentStats => {
  return equipment.reduce((total, item) => {
    const stats = item.stats || {};
    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'number') {
        (total as any)[key] = ((total as any)[key] || 0) + value;
      }
    });
    return total;
  }, {} as EquipmentStats);
};

export interface EquippedCharacter extends Character {
  final_stats: CombatStats;
  equipment_bonuses: EquipmentStats;
  active_effects: EquipmentEffect[];
}

export interface EquipmentEffect {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active' | 'trigger';
  value: number;
  duration?: number;
  remaining?: number;
  source: string; // equipment id
}

export function calculateFinalStats(character: EquipmentUser): CombatStats {
  // Get base stats directly from character (all flat now)
  const equipment = [
    character.equipped_items.weapon,
    character.equipped_items.armor,
    character.equipped_items.accessory
  ].filter(Boolean) as Equipment[];

  // Validate equipment objects
  const validEquipment = equipment.filter(item => {
    const isValid = validateEquipmentObject(item);
    if (!isValid) {
      console.warn(`⚠️ Invalid equipment filtered out: ${item?.name || 'Unknown'}`);
    }
    return isValid;
  });

  const equipmentStats = calculateEquipmentStats(validEquipment);

  // Helper to safely get a stat
  const getStat = (key: keyof Character | keyof TeamCharacter): number => {
    const val = (character as any)[key];
    return typeof val === 'number' ? val : 0;
  };

  // Direct stat combination - no artificial caps or diminishing returns
  const finalStats = {
    health: getStat('health') + (equipmentStats.hp || 0),
    max_health: getStat('max_health') + (equipmentStats.hp || 0),
    mana: getStat('mana'), // Equipment doesn't affect mana yet
    max_mana: getStat('max_mana'),
    attack: getStat('attack') + (equipmentStats.atk || 0),
    defense: getStat('defense') + (equipmentStats.def || 0),
    magic_attack: getStat('magic_attack') + (equipmentStats.magic_attack || 0),
    magic_defense: getStat('magic_defense') + (equipmentStats.magic_defense || 0),
    speed: getStat('speed') + (equipmentStats.spd || 0),
    critical_chance: getStat('critical_chance') + (equipmentStats.crit_rate || 0),
    critical_damage: getStat('critical_damage') + (equipmentStats.crit_damage || 0),
    accuracy: getStat('accuracy') + (equipmentStats.accuracy || 0),
    evasion: getStat('evasion') + (equipmentStats.evasion || 0)
  };

  return finalStats;
}

export function getActiveEquipmentEffects(character: Character): EquipmentEffect[] {
  const effects: EquipmentEffect[] = [];
  const equipment = [
    character.equipped_items.weapon,
    character.equipped_items.armor,
    character.equipped_items.accessory
  ].filter(Boolean) as Equipment[];

  equipment.forEach(item => {
    item.effects.forEach(effect => {
      effects.push({
        id: effect.id,
        name: effect.name,
        description: effect.description,
        type: effect.type,
        value: effect.value || 0,
        duration: effect.duration,
        source: item.id
      });
    });
  });

  return effects;
}

export function equipItem(character: Character, equipment: Equipment): Character {
  const newCharacter = { ...character };

  // Check if character can equip this item
  if (!canCharacterEquip(character, equipment)) {
    throw new Error(`${character.name} cannot equip ${equipment.name}`);
  }

  // Equip the item in the appropriate slot
  switch (equipment.slot) {
    case 'weapon':
      newCharacter.equipped_items.weapon = equipment;
      break;
    case 'armor':
      newCharacter.equipped_items.armor = equipment;
      break;
    case 'accessory':
      newCharacter.equipped_items.accessory = equipment;
      break;
  }

  return newCharacter;
}

export function unequipItem(character: Character, slot: 'weapon' | 'armor' | 'accessory'): Character {
  const newCharacter = { ...character };
  newCharacter.equipped_items[slot] = undefined;
  return newCharacter;
}

export function canCharacterEquip(character: Character, equipment: Equipment): boolean {
  // Level requirement
  if (character.level < equipment.required_level) {
    return false;
  }

  // Archetype requirement
  if (equipment.required_archetype &&
    !equipment.required_archetype.includes(character.archetype)) {
    return false;
  }

  // Preferred character gets no restrictions
  if (equipment.preferred_character === character.id) {
    return true;
  }

  return true;
}

export function getEquipmentCompatibility(character: Character, equipment: Equipment): {
  can_equip: boolean;
  effectiveness: number;
  restrictions: string[];
} {
  const restrictions: string[] = [];
  let effectiveness = 1.0;

  // Level check
  if (character.level < equipment.required_level) {
    restrictions.push(`Requires level ${equipment.required_level}`);
    return { can_equip: false, effectiveness: 0, restrictions };
  }

  // Archetype check
  if (equipment.required_archetype &&
    !equipment.required_archetype.includes(character.archetype)) {
    restrictions.push(`Requires archetype: ${equipment.required_archetype.join(' or ')}`);
    effectiveness *= 0.7; // Can still use but less effective
  }

  // Preferred character bonus
  if (equipment.preferred_character === character.id) {
    effectiveness *= 1.2; // 20% bonus effectiveness
  } else if (equipment.preferred_character) {
    effectiveness *= 0.9; // 10% penalty for using another character's weapon
  }

  // Era compatibility (simplified)
  const characterPeriod = character.historical_period.toLowerCase();
  const equipmentName = equipment.name.toLowerCase();

  // Modern characters using ancient weapons
  if (characterPeriod.includes('modern') || characterPeriod.includes('contemporary')) {
    if (equipmentName.includes('bronze') || equipmentName.includes('ancient')) {
      effectiveness *= 0.8;
      restrictions.push('Unfamiliar with ancient technology');
    }
  }

  // Ancient characters using modern weapons
  if (characterPeriod.includes('ancient') || characterPeriod.includes('medieval')) {
    if (equipmentName.includes('gun') || equipmentName.includes('rifle') ||
      equipmentName.includes('pistol') || equipmentName.includes('tommy')) {
      effectiveness *= 0.6;
      restrictions.push('Confused by modern technology');
    }
  }

  // Beast characters and weapon restrictions
  if (character.archetype === 'beast') {
    if (equipment.type === 'sword' || equipment.type === 'bow' ||
      equipment.type === 'staff' || equipment.type === 'gun') {
      effectiveness *= 0.5;
      restrictions.push('Difficulty using complex weapons');
    }
  }

  return {
    can_equip: true,
    effectiveness,
    restrictions
  };
}

export function createEquippedCharacter(character: Character): EquippedCharacter {
  const finalStats = calculateFinalStats(character);
  const equipment = [
    character.equipped_items.weapon,
    character.equipped_items.armor,
    character.equipped_items.accessory
  ].filter(Boolean) as Equipment[];

  const equipmentBonuses = calculateEquipmentStats(equipment);
  const activeEffects = getActiveEquipmentEffects(character);

  return {
    ...character,
    final_stats: finalStats,
    equipment_bonuses: equipmentBonuses,
    active_effects: activeEffects
  };
}

export function getCharacterPowerLevel(character: Character): number {
  const finalStats = calculateFinalStats(character);

  // Calculate overall power based on final stats
  const base_power = (
    finalStats.attack * 2 +
    finalStats.defense +
    finalStats.magic_attack * 1.5 +
    finalStats.speed * 1.2 +
    finalStats.critical_chance * 0.5 +
    finalStats.accuracy * 0.3
  );

  // Level multiplier
  const levelMultiplier = 1 + (character.level * 0.1);

  // Equipment bonus
  const equipment = [
    character.equipped_items.weapon,
    character.equipped_items.armor,
    character.equipped_items.accessory
  ].filter(Boolean) as Equipment[];

  const equipmentBonus = equipment.reduce((bonus, item) => {
    const rarityMultiplier = {
      common: 1.1,
      uncommon: 1.2,
      rare: 1.4,
      epic: 1.7,
      legendary: 2.0,
      mythic: 2.5
    }[item.rarity] || 1.0;

    return bonus + (rarityMultiplier * 10);
  }, 0);

  return Math.floor(base_power * levelMultiplier + equipmentBonus);
}

export function simulateEquipmentChange(
  character: Character,
  new_equipment: Equipment
): {
  old_stats: CombatStats;
  new_stats: CombatStats;
  stat_changes: Partial<CombatStats>;
  power_change: number;
} {
  const oldStats = calculateFinalStats(character);
  const oldPower = getCharacterPowerLevel(character);

  const testCharacter = equipItem(character, new_equipment);
  const newStats = calculateFinalStats(testCharacter);
  const newPower = getCharacterPowerLevel(testCharacter);

  const stat_changes: Partial<CombatStats> = {};
  (Object.keys(newStats) as (keyof CombatStats)[]).forEach(key => {
    const change = newStats[key] - oldStats[key];
    if (change !== 0) {
      stat_changes[key] = change;
    }
  });

  return {
    old_stats: oldStats,
    new_stats: newStats,
    stat_changes,
    power_change: newPower - oldPower
  };
}

// Battle effect processors
export function processBattleStartEffects(character: EquippedCharacter): EquipmentEffect[] {
  return character.active_effects.filter(effect =>
    effect.type === 'trigger' &&
    character.equipped_items.weapon?.effects.some(e =>
      e.id === effect.id && e.trigger === 'battle_start'
    )
  );
}

export function processOnHitEffects(character: EquippedCharacter): EquipmentEffect[] {
  return character.active_effects.filter(effect =>
    effect.type === 'trigger' &&
    character.equipped_items.weapon?.effects.some(e =>
      e.id === effect.id && e.trigger === 'on_hit'
    )
  );
}

export function processOnCritEffects(character: EquippedCharacter): EquipmentEffect[] {
  return character.active_effects.filter(effect =>
    effect.type === 'trigger' &&
    character.equipped_items.weapon?.effects.some(e =>
      e.id === effect.id && e.trigger === 'on_crit'
    )
  );
}