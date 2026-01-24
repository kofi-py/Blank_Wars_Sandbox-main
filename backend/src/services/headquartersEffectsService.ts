/**
 * Headquarters Effects Service
 * 
 * This service calculates the real game impact of headquarters facilities, 
 * room themes, and apartment upgrades on character stats and battle performance.
 */

interface HeadquartersEffects {
  physical_damage_bonus: number;
  magic_damage_bonus: number;
  defense_bonus: number;
  speed_bonus: number;
  critical_chanceBonus: number;
  team_coordination_modifier: number;
  health_regen_bonus: number;
  energy_bonus: number;
}

interface RoomTheme {
  id: string;
  name: string;
  bonus: string;
  bonus_value: number;
  suitable_characters: string[];
}

interface HeadquartersData {
  current_tier: 'your_parents_basement' | 'radioactive_roach_motel' | 'hobo_camp' | 'spartan_apartment' | 'basic_house' | 'condo' | 'mansion' | 'compound' | 'super_yacht' | 'moon_base';
  rooms: Array<{
    id: string;
    theme?: string;
    assigned_characters: string[];
  }>;
  unlocked_themes: string[];
}

const ROOM_THEMES: RoomTheme[] = [
  {
    id: 'gothic',
    name: 'Gothic Chamber',
    bonus: 'Magic Damage',
    bonus_value: 15,
    suitable_characters: ['dracula', 'frankenstein_monster']
  },
  {
    id: 'medieval',
    name: 'Medieval Hall',
    bonus: 'Physical Damage',
    bonus_value: 15,
    suitable_characters: ['achilles', 'joan', 'robin_hood']
  },
  {
    id: 'victorian',
    name: 'Victorian Study',
    bonus: 'Critical Chance',
    bonus_value: 12,
    suitable_characters: ['holmes']
  },
  {
    id: 'egyptian',
    name: 'Pharaoh\'s Chamber',
    bonus: 'Defense',
    bonus_value: 20,
    suitable_characters: ['cleopatra']
  },
  {
    id: 'mystical',
    name: 'Mystical Sanctuary',
    bonus: 'Magic Damage',
    bonus_value: 18,
    suitable_characters: ['tesla', 'space_cyborg']
  },
  {
    id: 'saloon',
    name: 'Saloon Room',
    bonus: 'Speed',
    bonus_value: 12,
    suitable_characters: ['robin_hood', 'wild_west_character']
  }
];

const HEADQUARTERS_TIERS: Record<string, any> = {
  // STARTER HOVELS (net negative)
  'your_parents_basement': {
    team_coordination_modifier: -40, // Can't bring teammates to parents' house - embarrassing
    health_regen_modifier: -15,      // Cramped, no sunlight, poor ventilation
    energy_modifier: -30,            // Constant nagging, no privacy, crushing shame
    defense_modifier: -10            // Mom keeps unlocking the door
  },
  'radioactive_roach_motel': {
    team_coordination_modifier: -35, // Teammates refuse to visit this hellhole
    health_regen_modifier: -40,      // Literally radioactive + roach infested
    energy_modifier: -25,            // Can't sleep with roaches crawling on you
    defense_modifier: -15            // Walls made of asbestos and broken dreams
  },
  'hobo_camp': {
    team_coordination_modifier: -30, // Hard to coordinate when living under a bridge
    health_regen_modifier: -35,      // Exposed to elements, sleeping on cardboard
    energy_modifier: -20,            // Constant worry about getting robbed
    defense_modifier: -25            // Zero protection, completely vulnerable
  },
  // TIER 1: First upgrade (still penalties but YOUR place)
  'spartan_apartment': {
    team_coordination_modifier: -15, // Small but at least it's yours
    health_regen_modifier: -5,       // Basic amenities work
    energy_modifier: -10,            // Cramped but livable
    defense_modifier: 0              // Has a door that locks
  },

  // TIER 2: Neutral baseline
  'basic_house': {
    team_coordination_modifier: 0,   // Normal conditions
    health_regen_modifier: 0,
    energy_modifier: 0,
    defense_modifier: 0
  },

  // TIER 3: First real bonuses
  'condo': {
    team_coordination_modifier: 10,    // Nice common areas
    health_regen_modifier: 15,         // Modern amenities
    energy_modifier: 15,               // Comfortable
    defense_modifier: 10               // Security desk
  },

  // TIER 4: Serious upgrades
  'mansion': {
    team_coordination_modifier: 20,    // Multiple team rooms
    health_regen_modifier: 25,         // Spa, gym facilities
    energy_modifier: 30,               // Luxury living
    defense_modifier: 20               // Gated property
  },

  // TIER 5: Elite facilities
  'compound': {
    team_coordination_modifier: 35,    // Dedicated training facilities
    health_regen_modifier: 40,         // Medical bay, recovery tech
    energy_modifier: 45,               // Peak comfort
    defense_modifier: 35               // Fortified compound
  },

  // TIER 6: Extreme luxury
  'super_yacht': {
    team_coordination_modifier: 45,    // Mobile headquarters - always together
    health_regen_modifier: 50,         // On-board medical staff
    energy_modifier: 55,               // Ultimate relaxation
    defense_modifier: 30               // Can escape to international waters
  },

  // TIER 7: Ultimate endgame
  'moon_base': {
    team_coordination_modifier: 60,    // Isolated - forced coordination
    health_regen_modifier: 70,         // Zero-G recovery chambers
    energy_modifier: 80,               // Living in literal space
    defense_modifier: 100              // They can't reach you on the moon
  }
};

/**
 * Calculate headquarters effects for a specific character
 */
export function calculateCharacterHeadquartersEffects(
  character_id: string,
  headquarters: HeadquartersData
): HeadquartersEffects {
  const effects: HeadquartersEffects = {
    physical_damage_bonus: 0,
    magic_damage_bonus: 0,
    defense_bonus: 0,
    speed_bonus: 0,
    critical_chanceBonus: 0,
    team_coordination_modifier: 0,
    health_regen_bonus: 0,
    energy_bonus: 0
  };

  // Apply apartment tier effects
  const tier_effects = HEADQUARTERS_TIERS[headquarters.current_tier];
  if (tier_effects) {
    effects.team_coordination_modifier += tier_effects.team_coordination_modifier || 0;
    effects.health_regen_bonus += tier_effects.health_regen_modifier || 0;
    effects.energy_bonus += tier_effects.energy_modifier || 0;
    effects.defense_bonus += tier_effects.defense_modifier || 0;
  }

  // Apply room theme bonuses
  headquarters.rooms.forEach(room => {
    if (room.theme && room.assigned_characters.includes(character_id)) {
      const theme = ROOM_THEMES.find(t => t.id === room.theme);
      if (theme && theme.suitable_characters.includes(character_id)) {
        switch (theme.bonus) {
          case 'Physical Damage':
            effects.physical_damage_bonus += theme.bonus_value;
            break;
          case 'Magic Damage':
            effects.magic_damage_bonus += theme.bonus_value;
            break;
          case 'Defense':
            effects.defense_bonus += theme.bonus_value;
            break;
          case 'Speed':
            effects.speed_bonus += theme.bonus_value;
            break;
          case 'Critical Chance':
            effects.critical_chanceBonus += theme.bonus_value;
            break;
        }
      }
    }
  });

  return effects;
}

/**
 * Apply headquarters effects to character battle stats
 */
export function applyHeadquartersEffectsToCharacter(
  character: any,
  headquarters: HeadquartersData
): any {
  const effects = calculateCharacterHeadquartersEffects(character.id || character.character_id, headquarters);
  
  // Apply effects to character stats
  const enhanced_character = {
    ...character,
    // Base stats with headquarters bonuses
    effective_attack: character.attack + effects.physical_damage_bonus + effects.magic_damage_bonus,
    effective_defense: character.defense + effects.defense_bonus,
    effective_speed: character.speed + effects.speed_bonus,
    effective_critical_chance: (character.critical_chance || 10) + effects.critical_chanceBonus,
    
    // Living condition effects
    team_coordination_modifier: effects.team_coordination_modifier,
    health_regen_modifier: effects.health_regen_bonus,
    energy_modifier: effects.energy_bonus,
    
    // Track applied effects for debugging
    headquarters_effects: effects
  };

  console.log(`🏠 Applied headquarters effects to ${character.name}:`, effects);
  
  return enhanced_character;
}

import { headquarters_service, HeadquartersState } from './headquartersService';

/**
 * Get headquarters data for a user
 */
export async function getHeadquartersData(user_id: string): Promise<HeadquartersData | null> {
  const hq_state = await headquarters_service.getHeadquarters(user_id);
  if (!hq_state) return null;

  return {
    current_tier: hq_state.tier_id as any,
    rooms: hq_state.rooms.map(room => ({
      id: room.id,
      theme: room.theme || undefined,
      assigned_characters: room.assigned_characters
    })),
    unlocked_themes: hq_state.unlocked_themes
  };
}

export { HeadquartersEffects, HeadquartersData };