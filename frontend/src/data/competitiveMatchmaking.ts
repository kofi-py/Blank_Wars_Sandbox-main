// Competitive Matchmaking System
// Weight class and difficulty-based opponent matching instead of cherry-picking specific opponents

import { TeamCharacter } from './teamBattleSystem';
import { type Contestant as Character } from '@blankwars/types';
import { TeamFormation, TeamSynergy } from './teamBuilding';
import { Equipment } from './equipment';

export type WeightClassName = 'featherweight' | 'lightweight' | 'middleweight' | 'heavyweight' | 'super_heavyweight';
export type DifficultyTier = 'novice' | 'amateur' | 'professional' | 'elite' | 'master' | 'legendary';
export type CompetitionType = 'ranked' | 'casual' | 'tournament' | 'championship';

export interface WeightClass {
  id: WeightClassName;
  name: string;
  description: string;
  power_range: {
    min: number;
    max: number;
  };
  team_level_range: {
    min: number;
    max: number;
  };
  restrictions: {
    max_mythic_characters?: number;
    max_legendary_characters?: number;
    banned_formations?: string[];
    max_equipment_tier?: number;
  };
  rewards: {
    experience_multiplier: number;
    currency_multiplier: number;
    prestige_points: number;
  };
}

export interface DifficultyTierInfo {
  id: DifficultyTier;
  name: string;
  description: string;
  unlock_requirements: {
    min_player_level?: number;
    min_wins?: number;
    completed_challenges?: string[];
    min_rating?: number;
    previous_tier_mastery?: boolean;
  };
  matchmaking_rules: {
    rating_variance: number;        // How much rating difference is allowed
    cross_tier_allowed: boolean;     // Can match with adjacent tiers
    handicap_enabled: boolean;      // Apply handicaps for cross-tier matches
    max_wait_time: number;          // Max queue time before expanding search
  };
  battle_modifiers: {
    experience_bonus: number;       // % bonus experience
    difficulty_multiplier: number;  // AI opponent strength modifier
    special_rules?: string[];       // Special battle conditions
  };
}

export interface TeamPowerCalculation {
  base_power: number;           // Sum of character base stats
  formation_bonus: number;      // Formation modifier
  synergy_bonus: number;        // Team synergy effects
  equipment_bonus: number;      // Equipment contributions
  level_bonus: number;          // Character level scaling
  total_power: number;          // Final calculated power
  weight_class: WeightClassName;
}

export interface MatchmakingCriteria {
  weight_class: WeightClassName;
  difficulty_tier: DifficultyTier;
  competition_type: CompetitionType;
  allow_cross_tier: boolean;
  max_power_difference: number;
  preferences: {
    faster_matching: boolean;     // Accept wider skill gaps for faster matches
    balanced_teams: boolean;      // Prefer similar team compositions
    new_player_friendly: boolean;  // Avoid very experienced opponents
  };
}

export interface OpponentProfile {
  team_power: number;
  weight_class: WeightClassName;
  difficulty_tier: DifficultyTier;
  estimated_rating: number;
  team_composition: {
    formation: string;
    archetypes: string[];
    average_level: number;
  };
  expected_match_difficulty: 'easy' | 'fair' | 'challenging' | 'hard';
  reward_multiplier: number;
}

// Weight Class Definitions
export const WEIGHT_CLASSES: Record<WeightClassName, WeightClass> = {
  featherweight: {
    id: 'featherweight',
    name: 'Featherweight Division',
    description: 'Entry-level competition for developing teams',
    power_range: { min: 0, max: 250 },
    team_level_range: { min: 1, max: 15 },
    restrictions: {
      max_mythic_characters: 0,
      max_legendary_characters: 1,
      max_equipment_tier: 2
    },
    rewards: {
      experience_multiplier: 1.0,
      currency_multiplier: 1.0,
      prestige_points: 1
    }
  },
  lightweight: {
    id: 'lightweight',
    name: 'Lightweight Division',
    description: 'Intermediate teams with solid fundamentals',
    power_range: { min: 251, max: 450 },
    team_level_range: { min: 16, max: 30 },
    restrictions: {
      max_mythic_characters: 1,
      max_legendary_characters: 2,
      max_equipment_tier: 3
    },
    rewards: {
      experience_multiplier: 1.15,
      currency_multiplier: 1.25,
      prestige_points: 2
    }
  },
  middleweight: {
    id: 'middleweight',
    name: 'Middleweight Division',
    description: 'Competitive teams with advanced strategies',
    power_range: { min: 451, max: 700 },
    team_level_range: { min: 31, max: 50 },
    restrictions: {
      max_mythic_characters: 2,
      max_legendary_characters: 3,
      max_equipment_tier: 4
    },
    rewards: {
      experience_multiplier: 1.35,
      currency_multiplier: 1.5,
      prestige_points: 3
    }
  },
  heavyweight: {
    id: 'heavyweight',
    name: 'Heavyweight Division',
    description: 'Elite teams pushing the limits',
    power_range: { min: 701, max: 1000 },
    team_level_range: { min: 51, max: 75 },
    restrictions: {
      max_mythic_characters: 3,
      banned_formations: [], // No restrictions
      max_equipment_tier: 5
    },
    rewards: {
      experience_multiplier: 1.6,
      currency_multiplier: 1.85,
      prestige_points: 5
    }
  },
  super_heavyweight: {
    id: 'super_heavyweight',
    name: 'Super Heavyweight Division',
    description: 'Unlimited power - only for the strongest teams',
    power_range: { min: 1001, max: 9999 },
    team_level_range: { min: 76, max: 100 },
    restrictions: {}, // No restrictions - anything goes
    rewards: {
      experience_multiplier: 2.0,
      currency_multiplier: 2.5,
      prestige_points: 10
    }
  }
};

// Difficulty Tier Definitions
export const DIFFICULTY_TIERS: Record<DifficultyTier, DifficultyTierInfo> = {
  novice: {
    id: 'novice',
    name: 'Novice',
    description: 'Learning the basics of team combat',
    unlock_requirements: {},
    matchmaking_rules: {
      rating_variance: 150,
      cross_tier_allowed: false,
      handicap_enabled: true,
      max_wait_time: 30000 // 30 seconds
    },
    battle_modifiers: {
      experience_bonus: 50, // 50% bonus for learning
      difficulty_multiplier: 0.7, // Easier AI opponents
      special_rules: ['coaching_hints', 'extended_strategy_time']
    }
  },
  amateur: {
    id: 'amateur',
    name: 'Amateur',
    description: 'Developing tactical understanding',
    unlock_requirements: {
      min_wins: 5,
      min_player_level: 5
    },
    matchmaking_rules: {
      rating_variance: 125,
      cross_tier_allowed: true,
      handicap_enabled: true,
      max_wait_time: 45000
    },
    battle_modifiers: {
      experience_bonus: 25,
      difficulty_multiplier: 0.85,
      special_rules: ['basic_psychology_effects']
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Competitive team management',
    unlock_requirements: {
      min_wins: 15,
      min_player_level: 15,
      min_rating: 1100
    },
    matchmaking_rules: {
      rating_variance: 100,
      cross_tier_allowed: true,
      handicap_enabled: false,
      max_wait_time: 60000
    },
    battle_modifiers: {
      experience_bonus: 0,
      difficulty_multiplier: 1.0,
      special_rules: ['full_psychology_system', 'advanced_team_chemistry']
    }
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    description: 'High-level strategic combat',
    unlock_requirements: {
      min_wins: 50,
      min_player_level: 35,
      min_rating: 1400,
      completed_challenges: ['tournament_finalist', 'weight_class_champion']
    },
    matchmaking_rules: {
      rating_variance: 75,
      cross_tier_allowed: true,
      handicap_enabled: false,
      max_wait_time: 90000
    },
    battle_modifiers: {
      experience_bonus: 0,
      difficulty_multiplier: 1.2,
      special_rules: ['judge_system_active', 'environmental_effects', 'advanced_deviations']
    }
  },
  master: {
    id: 'master',
    name: 'Master',
    description: 'Peak competitive performance',
    unlock_requirements: {
      min_wins: 150,
      min_player_level: 60,
      min_rating: 1700,
      previous_tier_mastery: true
    },
    matchmaking_rules: {
      rating_variance: 50,
      cross_tier_allowed: false,
      handicap_enabled: false,
      max_wait_time: 120000
    },
    battle_modifiers: {
      experience_bonus: 0,
      difficulty_multiplier: 1.4,
      special_rules: ['all_systems_active', 'master_level_ai', 'tournament_pressure']
    }
  },
  legendary: {
    id: 'legendary',
    name: 'Legendary',
    description: 'Ultimate challenge for the greatest coaches',
    unlock_requirements: {
      min_wins: 500,
      min_player_level: 80,
      min_rating: 2000,
      completed_challenges: ['grand_champion', 'undefeated_streak_50']
    },
    matchmaking_rules: {
      rating_variance: 25,
      cross_tier_allowed: false,
      handicap_enabled: false,
      max_wait_time: 300000 // 5 minutes
    },
    battle_modifiers: {
      experience_bonus: 0,
      difficulty_multiplier: 1.8,
      special_rules: ['legendary_ai', 'chaos_events', 'reality_bending']
    }
  }
};

// Team Power Calculation Functions
export function calculateTeamPower(
  team: Character[],
  formation?: TeamFormation,
  synergies?: TeamSynergy[]
): TeamPowerCalculation {

  // Base power from character stats
  const base_power = team.reduce((total, character) => {
    // Calculate stat sum from all flat stats
    const attributeStatSum =
      (character.strength + character.dexterity + character.intelligence +
        character.defense + character.wisdom + character.charisma);

    const combatStatSum =
      (character.attack + character.defense + character.speed +
        character.magic_attack + character.magic_defense);

    const totalStatSum = attributeStatSum + combatStatSum;
    const levelMultiplier = 1 + (character.level * 0.1); // 10% per level
    return total + (totalStatSum * levelMultiplier);
  }, 0);

  // Formation bonus (5-25% depending on formation effectiveness)
  const formationBonus = formation ? base_power * 0.15 : 0;

  // Synergy bonus (varies by synergy quality)
  const synergyBonus = synergies ? synergies.reduce((total, synergy) => {
    const multiplier = synergy.rarity === 'legendary' ? 0.2 :
      synergy.rarity === 'epic' ? 0.15 :
        synergy.rarity === 'rare' ? 0.1 : 0.05;
    return total + (base_power * multiplier);
  }, 0) : 0;

  // Equipment bonus (estimated 10-30% of base power)
  const equipmentBonus = base_power * 0.2; // Placeholder - should calculate from actual equipment

  // Level bonus (team average level contributes)
  const average_level = team.reduce((sum, char) => sum + char.level, 0) / team.length;
  const levelBonus = average_level * 5; // 5 power per average level

  const total_power = base_power + formationBonus + synergyBonus + equipmentBonus + levelBonus;

  // Determine weight class
  const weight_class = determineWeightClass(total_power);

  return {
    base_power,
    formation_bonus: formationBonus,
    synergy_bonus: synergyBonus,
    equipment_bonus: equipmentBonus,
    level_bonus: levelBonus,
    total_power,
    weight_class
  };
}

export function determineWeightClass(total_power: number): WeightClassName {
  for (const [className, classInfo] of Object.entries(WEIGHT_CLASSES)) {
    if (total_power >= classInfo.power_range.min && total_power <= classInfo.power_range.max) {
      return className as WeightClassName;
    }
  }
  return 'super_heavyweight'; // Default for very high power
}

export function isPlayerEligibleForTier(
  tier: DifficultyTier,
  player_stats: {
    level: number;
    wins: number;
    rating: number;
    completed_challenges: string[];
  }
): boolean {
  const tierInfo = DIFFICULTY_TIERS[tier];
  const reqs = tierInfo.unlock_requirements;

  if (reqs.min_player_level && player_stats.level < reqs.min_player_level) return false;
  if (reqs.min_wins && player_stats.wins < reqs.min_wins) return false;
  if (reqs.min_rating && player_stats.rating < reqs.min_rating) return false;
  if (reqs.completed_challenges) {
    const hasAllChallenges = reqs.completed_challenges.every(challenge =>
      player_stats.completed_challenges.includes(challenge)
    );
    if (!hasAllChallenges) return false;
  }

  return true;
}

export function generateOpponentProfile(
  player_teamPower: number,
  criteria: MatchmakingCriteria
): OpponentProfile {
  const weight_class = criteria.weight_class;
  const classInfo = WEIGHT_CLASSES[weight_class];
  const tierInfo = DIFFICULTY_TIERS[criteria.difficulty_tier];

  // Generate opponent power within weight class range
  const powerVariance = criteria.max_power_difference;
  const minPower = Math.max(classInfo.power_range.min, player_teamPower - powerVariance);
  const maxPower = Math.min(classInfo.power_range.max, player_teamPower + powerVariance);
  const opponentPower = Math.floor(Math.random() * (maxPower - minPower + 1)) + minPower;

  // Estimate rating based on power and tier
  const baseRating = 1000 + ((opponentPower - 250) * 2); // Rough power-to-rating conversion
  const tierBonus = {
    'novice': -200,
    'amateur': -100,
    'professional': 0,
    'elite': 150,
    'master': 300,
    'legendary': 500
  }[criteria.difficulty_tier] || 0;

  const estimatedRating = baseRating + tierBonus;

  // Determine match difficulty
  const powerDifference = opponentPower - player_teamPower;
  const expected_match_difficulty: OpponentProfile['expected_match_difficulty'] =
    powerDifference > 50 ? 'hard' :
      powerDifference > 15 ? 'challenging' :
        powerDifference < -50 ? 'easy' : 'fair';

  // Calculate reward multiplier
  const difficulty_multiplier = {
    'easy': 0.8,
    'fair': 1.0,
    'challenging': 1.3,
    'hard': 1.6
  }[expected_match_difficulty];

  const rewardMultiplier = difficulty_multiplier * classInfo.rewards.experience_multiplier;

  return {
    team_power: opponentPower,
    weight_class,
    difficulty_tier: criteria.difficulty_tier,
    estimated_rating: estimatedRating,
    team_composition: {
      formation: 'balanced', // Would be determined by AI
      archetypes: ['warrior', 'mage', 'support'], // Would be generated
      average_level: Math.floor(opponentPower / 50) // Rough estimate
    },
    expected_match_difficulty,
    reward_multiplier: rewardMultiplier
  };
}

export function getAvailableWeightClasses(teamPower: number): WeightClassName[] {
  const currentClass = determineWeightClass(teamPower);
  const classNames = Object.keys(WEIGHT_CLASSES) as WeightClassName[];
  const currentIndex = classNames.indexOf(currentClass);

  // Allow current class and one above/below if within reasonable power range
  const available = [currentClass];

  if (currentIndex > 0) {
    const lowerClass = classNames[currentIndex - 1];
    const lowerRange = WEIGHT_CLASSES[lowerClass].power_range;
    if (teamPower <= lowerRange.max + 50) { // 50 power buffer
      available.unshift(lowerClass);
    }
  }

  if (currentIndex < classNames.length - 1) {
    const upperClass = classNames[currentIndex + 1];
    const upperRange = WEIGHT_CLASSES[upperClass].power_range;
    if (teamPower >= upperRange.min - 50) { // 50 power buffer
      available.push(upperClass);
    }
  }

  return available;
}

export default {
  WEIGHT_CLASSES,
  DIFFICULTY_TIERS,
  calculateTeamPower,
  determineWeightClass,
  isPlayerEligibleForTier,
  generateOpponentProfile,
  getAvailableWeightClasses
};