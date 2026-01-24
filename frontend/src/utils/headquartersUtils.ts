// Headquarters Battle Bonuses Utility
// Calculates and applies headquarters room bonuses to team stats

import type { Contestant } from '@blankwars/types';

export interface HeadquartersBonus {
  [key: string]: number; // e.g., { "Strength": 15, "Accuracy": 20 }
}

export interface HeadquartersPenalty {
  [key: string]: number; // e.g., { "All Stats": -10, "Teamwork": -15 }
}

export interface CharacterConflict {
  character1: string;
  character2: string;
  conflict_type: 'personality' | 'historical' | 'cultural';
  severity: 'minor' | 'major' | 'severe';
  penalty: number; // Percentage penalty to apply
}

export interface Bed {
  id: string;
  bed_id: string;
  bed_type: 'bed' | 'bunk_bed' | 'couch' | 'air_mattress' | 'floor';
  position_x: number;
  position_y: number;
  capacity: number;
  comfort_bonus: number;
  character_id?: string;
  stat_modifier_type?: string;
  stat_modifier_value?: number;
  cost?: { coins: number; gems: number };
}

export interface Room {
  id: string;
  name: string;
  theme: string | null;
  assigned_characters: string[];
  max_characters: number;
  beds: Bed[];
}

export interface RoomTheme {
  id: string;
  name: string;
  description: string;
  bonus: string; // "Strength", "Accuracy", "Speed", etc.
  bonus_value: number;
  suitable_characters: string[];
  cost: { coins: number; gems: number };
  background_color: string;
  text_color: string;
  icon: string;
}

export interface HeadquartersState {
  current_tier: string;
  rooms: Room[];
  currency: { coins: number; gems: number };
  unlocked_themes: string[];
}

// Room themes data - this should match the data in TeamHeadquarters.tsx
export const ROOM_THEMES: RoomTheme[] = [
  {
    id: 'greek_classical',
    name: 'Classical Greek',
    description: 'Marble columns, olive wreaths, and classical Greek architecture',
    bonus: 'Strength',
    bonus_value: 15,
    suitable_characters: ['achilles', 'odysseus'],
    cost: { coins: 5000, gems: 10 },
    background_color: 'bg-blue-900/20',
    text_color: 'text-blue-300',
    icon: '🏛️'
  },
  {
    id: 'victorian_study',
    name: 'Victorian Study',
    description: 'Dark wood, leather chairs, and intellectual sophistication',
    bonus: 'Intelligence',
    bonus_value: 20,
    suitable_characters: ['holmes'],
    cost: { coins: 4000, gems: 8 },
    background_color: 'bg-amber-900/20',
    text_color: 'text-amber-300',
    icon: '📚'
  },
  {
    id: 'gothic_chamber',
    name: 'Gothic Chamber',
    description: 'Dark tapestries, candles, and mysterious atmosphere',
    bonus: 'Charisma',
    bonus_value: 18,
    suitable_characters: ['dracula', 'frankenstein_monster'],
    cost: { coins: 6000, gems: 12 },
    background_color: 'bg-purple-900/20',
    text_color: 'text-purple-300',
    icon: '🦇'
  },
  {
    id: 'mystical_sanctuary',
    name: 'Mystical Sanctuary',
    description: 'Crystals, ancient symbols, and magical energies',
    bonus: 'Spirit',
    bonus_value: 25,
    suitable_characters: ['merlin', 'sun_wukong'],
    cost: { coins: 8000, gems: 15 },
    background_color: 'bg-indigo-900/20',
    text_color: 'text-indigo-300',
    icon: '🔮'
  },
  {
    id: 'royal_quarters',
    name: 'Royal Quarters',
    description: 'Golden accents, silk curtains, and regal luxury',
    bonus: 'Charisma',
    bonus_value: 22,
    suitable_characters: ['cleopatra', 'genghis_khan'],
    cost: { coins: 10000, gems: 20 },
    background_color: 'bg-yellow-900/20',
    text_color: 'text-yellow-300',
    icon: '👑'
  },
  {
    id: 'medieval_armory',
    name: 'Medieval Armory',
    description: 'Weapons, shields, and knightly heritage',
    bonus: 'Dexterity',
    bonus_value: 16,
    suitable_characters: ['joan'],
    cost: { coins: 5500, gems: 11 },
    background_color: 'bg-gray-900/20',
    text_color: 'text-gray-300',
    icon: '⚔️'
  },
  {
    id: 'wild_west',
    name: 'Wild West Saloon',
    description: 'Wooden floors, cowboy memorabilia, and frontier spirit',
    bonus: 'Speed',
    bonus_value: 18,
    suitable_characters: ['billy_the_kid'],
    cost: { coins: 4500, gems: 9 },
    background_color: 'bg-orange-900/20',
    text_color: 'text-orange-300',
    icon: '🤠'
  },
  {
    id: 'futuristic',
    name: 'Tech Lab',
    description: 'Holographic displays, advanced equipment, and cutting-edge technology',
    bonus: 'Accuracy',
    bonus_value: 20,
    suitable_characters: ['tesla', 'space_cyborg', 'agent_x'],
    cost: { coins: 10000, gems: 25 },
    background_color: 'bg-cyan-900/20',
    text_color: 'text-cyan-300',
    icon: '🤖'
  },
  {
    id: 'sports_den',
    name: 'Sports Den',
    description: 'Baseball memorabilia, trophies, and all-American spirit',
    bonus: 'Defense',
    bonus_value: 15,
    suitable_characters: ['sam_spade'],
    cost: { coins: 3000, gems: 5 },
    background_color: 'bg-green-900/20',
    text_color: 'text-green-300',
    icon: '⚾'
  },
  {
    id: 'mongolian',
    name: 'Khan\'s Yurt',
    description: 'Traditional Mongolian decorations and symbols of conquest',
    bonus: 'Vitality',
    bonus_value: 20,
    suitable_characters: ['genghis_khan'],
    cost: { coins: 7000, gems: 14 },
    background_color: 'bg-red-900/20',
    text_color: 'text-red-300',
    icon: '🏹'
  },
  {
    id: 'norse_hall',
    name: 'Norse Mead Hall',
    description: 'Viking shields, drinking horns, and warrior camaraderie',
    bonus: 'Strength',
    bonus_value: 18,
    suitable_characters: ['ragnar'],
    cost: { coins: 6500, gems: 13 },
    background_color: 'bg-blue-900/20',
    text_color: 'text-blue-300',
    icon: '🐺'
  }
];

// Character conflict matrix - defines which characters clash
export const CHARACTER_CONFLICTS: CharacterConflict[] = [
  // Historical Conflicts
  { character1: 'dracula', character2: 'holmes', conflict_type: 'personality', severity: 'major', penalty: 15 },
  { character1: 'achilles', character2: 'joan', conflict_type: 'historical', severity: 'minor', penalty: 8 },
  { character1: 'genghis_khan', character2: 'cleopatra', conflict_type: 'cultural', severity: 'major', penalty: 12 },

  // Personality Clashes
  { character1: 'dracula', character2: 'tesla', conflict_type: 'personality', severity: 'minor', penalty: 6 },
  { character1: 'holmes', character2: 'sun_wukong', conflict_type: 'personality', severity: 'minor', penalty: 7 },
  { character1: 'frankenstein_monster', character2: 'joan', conflict_type: 'personality', severity: 'major', penalty: 14 },

  // Cultural/Era Conflicts  
  { character1: 'billy_the_kid', character2: 'cleopatra', conflict_type: 'cultural', severity: 'minor', penalty: 5 },
  { character1: 'space_cyborg', character2: 'merlin', conflict_type: 'cultural', severity: 'minor', penalty: 6 },
  { character1: 'agent_x', character2: 'achilles', conflict_type: 'personality', severity: 'minor', penalty: 7 }
];

// Headquarters tier penalties
export const HEADQUARTERS_TIER_PENALTIES: Record<string, HeadquartersPenalty> = {
  'spartan_apartment': {
    'All Stats': -8, // Poor living conditions affect everything
    'Morale': -15,   // Cramped conditions hurt team spirit
    'Teamwork': -10  // Hard to coordinate in small space
  },
  'shared_house': {
    'All Stats': -3, // Slightly better but still cramped
    'Morale': -5
  },
  'team_complex': {
    // No penalties - this is the baseline good housing
  },
  'luxury_compound': {
    // No penalties - luxury housing, could even have small bonuses
  }
};

/**
 * Calculate battle bonuses from headquarters room themes
 */
export function calculateHeadquartersBonuses(headquarters: HeadquartersState): HeadquartersBonus {
  if (!headquarters?.rooms) {
    return {};
  }
  return headquarters.rooms.reduce((bonuses: HeadquartersBonus, room) => {
    if (room.theme && room.assigned_characters.length > 0) {
      const theme = ROOM_THEMES.find(t => t.id === room.theme);
      if (theme) {
        // Only apply bonus if characters are actually assigned to the themed room
        bonuses[theme.bonus] = (bonuses[theme.bonus] || 0) + theme.bonus_value;
      }
    }
    return bonuses;
  }, {});
}

/**
 * Convert headquarters bonus names to battle stat names
 */
export function mapBonusToStat(bonusName: string): string {
  const mapping: Record<string, string> = {
    'Strength': 'strength',
    'Intelligence': 'intelligence',
    'Charisma': 'charisma',
    'Spirit': 'spirit',
    'Dexterity': 'dexterity',
    'Speed': 'speed',
    'Accuracy': 'dexterity', // Accuracy maps to dexterity in battle system
    'Defense': 'defense',
    'Vitality': 'vitality'
  };
  return mapping[bonusName] || bonusName.toLowerCase();
}

/**
 * Calculate all penalties from headquarters conditions
 */
export function calculateHeadquartersPenalties(headquarters: HeadquartersState): HeadquartersPenalty {
  const penalties: HeadquartersPenalty = {};

  if (!headquarters?.rooms) {
    return penalties;
  }

  // 1. Overcrowding penalties
  headquarters.rooms.forEach(room => {
    if (room.assigned_characters.length > room.max_characters) {
      const overcrowdAmount = room.assigned_characters.length - room.max_characters;
      const penaltyPerExtraPerson = 5; // -5% per extra person
      const overcrowdingPenalty = overcrowdAmount * penaltyPerExtraPerson;

      penalties['All Stats'] = (penalties['All Stats'] || 0) - overcrowdingPenalty;
      penalties['Morale'] = (penalties['Morale'] || 0) - (overcrowdingPenalty * 1.5); // Extra morale hit
    }
  });

  // 2. Character conflict penalties
  headquarters.rooms.forEach(room => {
    const roomCharacters = room.assigned_characters;
    roomCharacters.forEach((char1, i) => {
      roomCharacters.slice(i + 1).forEach(char2 => {
        const conflict = CHARACTER_CONFLICTS.find(c =>
          (c.character1 === char1 && c.character2 === char2) ||
          (c.character1 === char2 && c.character2 === char1)
        );

        if (conflict) {
          penalties['Teamwork'] = (penalties['Teamwork'] || 0) - conflict.penalty;
          if (conflict.severity === 'major' || conflict.severity === 'severe') {
            penalties['Morale'] = (penalties['Morale'] || 0) - (conflict.penalty * 0.7);
          }
        }
      });
    });
  });

  // 3. Housing tier penalties
  const tierPenalties = HEADQUARTERS_TIER_PENALTIES[headquarters.current_tier];
  if (tierPenalties) {
    Object.entries(tierPenalties).forEach(([stat, penalty]) => {
      penalties[stat] = (penalties[stat] || 0) + penalty; // penalty is already negative
    });
  }

  // 4. Unthemed room penalties
  headquarters.rooms.forEach(room => {
    if (!room.theme && room.assigned_characters.length > 0) {
      const unthemedPenalty = -3; // Small penalty for lack of personalization
      penalties['Morale'] = (penalties['Morale'] || 0) + unthemedPenalty;
    }
  });

  return penalties;
}

/**
 * Get character conflicts in a specific room
 */
export function getRoomConflicts(room: Room): CharacterConflict[] {
  const conflicts: CharacterConflict[] = [];
  const roomCharacters = room.assigned_characters;

  roomCharacters.forEach((char1, i) => {
    roomCharacters.slice(i + 1).forEach(char2 => {
      const conflict = CHARACTER_CONFLICTS.find(c =>
        (c.character1 === char1 && c.character2 === char2) ||
        (c.character1 === char2 && c.character2 === char1)
      );

      if (conflict) {
        conflicts.push(conflict);
      }
    });
  });

  return conflicts;
}

/**
 * Calculate net effect (bonuses + penalties) for headquarters
 */
export function calculateNetHeadquartersEffect(headquarters: HeadquartersState): { bonuses: HeadquartersBonus, penalties: HeadquartersPenalty } {
  const bonuses = calculateHeadquartersBonuses(headquarters);
  const penalties = calculateHeadquartersPenalties(headquarters);

  return { bonuses, penalties };
}

/**
 * Calculate sleep comfort bonus for a character based on their bed assignment
 */
export function calculateSleepComfortBonus(
  character: Contestant,
  room: Room,
  character_id: string
): number {
  const charIndex = room.assigned_characters.indexOf(character_id);
  if (charIndex === -1) return -10; // Not assigned to any room, severe penalty

  let assignedSlot = 0;
  for (const bed of room.beds) {
    if (charIndex < assignedSlot + bed.capacity) {
      // Character gets this bed's comfort bonus
      return bed.comfort_bonus;
    }
    assignedSlot += bed.capacity;
  }

  // Character sleeps on floor (overcrowded)
  return -10;
}

/**
 * Calculate total sleep bonuses for all characters in HQ
 */
export function calculateHQSleepBonuses(headquarters: HeadquartersState): Record<string, number> {
  const sleepBonuses: Record<string, number> = {};

  if (!headquarters?.rooms) {
    return sleepBonuses;
  }

  headquarters.rooms.forEach(room => {
    room.assigned_characters.forEach((character_id, index) => {
      let assignedSlot = 0;
      let comfort_bonus = -10; // Default floor sleeping penalty

      for (const bed of room.beds) {
        if (index < assignedSlot + bed.capacity) {
          comfort_bonus = bed.comfort_bonus;
          break;
        }
        assignedSlot += bed.capacity;
      }

      sleepBonuses[character_id] = comfort_bonus;
    });
  });

  return sleepBonuses;
}

/**
 * Apply headquarters bonuses and penalties to a character's temporary stats
 */
export function applyHeadquartersEffectsToCharacter(
  character: Contestant,
  bonuses: HeadquartersBonus,
  penalties: HeadquartersPenalty,
  character_id: string,
  sleep_comfort_bonus?: number
): Contestant {
  const enhancedCharacter: Contestant = { ...character };

  // Apply bonuses to temporary_stats
  Object.entries(bonuses).forEach(([bonusName, bonus_value]) => {
    const statName = mapBonusToStat(bonusName);
    if (enhancedCharacter.temporary_stats && enhancedCharacter.temporary_stats[statName] !== undefined) {
      enhancedCharacter.temporary_stats[statName] += bonus_value;
    }
  });

  // Apply penalties to temporary_stats
  Object.entries(penalties).forEach(([penaltyName, penaltyValue]) => {
    if (penaltyName === 'All Stats') {
      // Apply to all stats
      Object.keys(enhancedCharacter.temporary_stats).forEach(statName => {
        enhancedCharacter.temporary_stats[statName] += penaltyValue; // penaltyValue is negative
      });
    } else {
      const statName = mapBonusToStat(penaltyName);
      if (enhancedCharacter.temporary_stats && enhancedCharacter.temporary_stats[statName] !== undefined) {
        enhancedCharacter.temporary_stats[statName] += penaltyValue; // penaltyValue is negative
      }
    }
  });

  // Apply sleep comfort bonus (affects morale/defense)
  if (sleep_comfort_bonus !== undefined && enhancedCharacter.temporary_stats) {
    // Sleep quality affects defense and morale
    if (enhancedCharacter.temporary_stats.defense !== undefined) {
      enhancedCharacter.temporary_stats.defense += Math.floor(sleep_comfort_bonus * 0.5); // 50% of comfort to defense
    }
    if (enhancedCharacter.temporary_stats.defense !== undefined) {
      enhancedCharacter.temporary_stats.defense += Math.floor(sleep_comfort_bonus * 0.3); // 30% of comfort to vitality
    }

    // Store the sleep comfort for display purposes
    enhancedCharacter.sleepComfort = sleep_comfort_bonus;
  }

  return enhancedCharacter;
}