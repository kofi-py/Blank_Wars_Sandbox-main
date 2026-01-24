// Weight Class System for PvP Matchmaking
// Implements risk/reward progression based on level differences

import { calculateBattleXP, type ExperienceGain } from './experience';

export interface WeightClass {
  id: string;
  name: string;
  level_range: [number, number]; // [min, max] inclusive
  color: string;
  description: string;
  rank: number; // For ordering
}

export const weight_classes: WeightClass[] = [
  {
    id: 'rookie',
    name: 'Rookie Division',
    level_range: [1, 5],
    color: 'from-green-400 to-green-500',
    description: 'New fighters learning the basics',
    rank: 1
  },
  {
    id: 'amateur',
    name: 'Amateur League',
    level_range: [6, 10],
    color: 'from-blue-400 to-blue-500',
    description: 'Developing fighters gaining experience',
    rank: 2
  },
  {
    id: 'pro',
    name: 'Professional Circuit',
    level_range: [11, 20],
    color: 'from-purple-400 to-purple-500',
    description: 'Skilled fighters competing seriously',
    rank: 3
  },
  {
    id: 'elite',
    name: 'Elite Championship',
    level_range: [21, 35],
    color: 'from-orange-400 to-orange-500',
    description: 'Top-tier fighters with mastery',
    rank: 4
  },
  {
    id: 'legendary',
    name: 'Legendary Masters',
    level_range: [36, 60],
    color: 'from-red-400 to-red-500',
    description: 'Master-level fighters',
    rank: 5
  },
  {
    id: 'mythic',
    name: 'Mythic Champions',
    level_range: [61, 100],
    color: 'from-purple-500 to-pink-500',
    description: 'Legendary warriors transcending limits',
    rank: 6
  },
  {
    id: 'transcendent',
    name: 'Transcendent Beings',
    level_range: [101, 200],
    color: 'from-yellow-400 to-orange-500',
    description: 'God-tier combatants beyond mortal comprehension',
    rank: 7
  }
];

export interface MatchmakingPreference {
  allow_same_class: boolean;
  allow_class_above: boolean;
  allow_class_below: boolean;
  max_levelDifference: number;
}

export interface MatchmakingResult {
  opponent: {
    team_level: number; // Average level of opponent team
    weight_class: WeightClass;
    level_difference: number; // negative = lower, positive = higher
  };
  risk_level: 'safe' | 'moderate' | 'risky' | 'extreme';
  expected_xp_multiplier: number;
  description: string;
}

// Get weight class for a character level
export function getWeightClassForLevel(level: number): WeightClass {
  const weight_class = weight_classes.find(wc => 
    level >= wc.level_range[0] && level <= wc.level_range[1]
  );
  return weight_class || weight_classes[weight_classes.length - 1]; // Default to highest if over max
}

// Get team's overall weight class (based on average level)
export function getTeamWeightClass(team_levels: number[]): { average_level: number; weight_class: WeightClass } {
  const average_level = Math.round(team_levels.reduce((sum, level) => sum + level, 0) / team_levels.length);
  const weight_class = getWeightClassForLevel(average_level);
  return { average_level, weight_class };
}

// Calculate risk level based on opponent level difference
export function calculateRiskLevel(levelDifference: number): MatchmakingResult['risk_level'] {
  if (levelDifference <= -3) return 'safe';    // Fighting 3+ levels below
  if (levelDifference <= 0) return 'moderate'; // Same level or 1-2 below
  if (levelDifference <= 3) return 'risky';    // 1-3 levels above
  return 'extreme';                            // 4+ levels above
}

// Enhanced XP calculation with weight class bonuses
export function calculateWeightClassXP(
  player_level: number,
  opponent_level: number,
  is_victory: boolean,
  battle_duration: number
): ExperienceGain & { weight_classBonus?: number } {
  // Use existing battle XP calculation as base
  const baseXpGain = calculateBattleXP(player_level, opponent_level, is_victory, battle_duration);
  
  const levelDifference = opponent_level - player_level;
  let weight_classBonus = 1;
  
  // Additional weight class specific bonuses
  if (levelDifference >= 5) {
    // Fighting significantly higher weight class
    weight_classBonus = 1.5; // +50% bonus
  } else if (levelDifference >= 8) {
    // Fighting way above weight class
    weight_classBonus = 2.0; // +100% bonus
  } else if (levelDifference >= 12) {
    // David vs Goliath scenario
    weight_classBonus = 3.0; // +200% bonus
  }
  
  // Apply weight class bonus if it's better than existing
  let finalAmount = baseXpGain.amount;
  const bonuses = [...baseXpGain.bonuses];
  
  if (weight_classBonus > 1) {
    finalAmount = Math.floor(baseXpGain.amount * weight_classBonus);
    bonuses.push({
      type: 'weight_class',
      multiplier: weight_classBonus,
      description: `Weight class challenge bonus (+${Math.round((weight_classBonus - 1) * 100)}%)`
    });
  }
  
  return {
    ...baseXpGain,
    amount: finalAmount,
    bonuses,
    weight_classBonus
  };
}

// Find available matchmaking opponents based on preferences
export function findMatchmakingOpponents(
  player_teamLevel: number,
  preferences: MatchmakingPreference
): MatchmakingResult[] {
  const playerWeightClass = getWeightClassForLevel(player_teamLevel);
  const results: MatchmakingResult[] = [];
  
  // Generate potential opponents within level range
  const minLevel = Math.max(1, player_teamLevel - preferences.max_levelDifference);
  const max_level = Math.min(50, player_teamLevel + preferences.max_levelDifference);
  
  for (let opponent_level = minLevel; opponent_level <= max_level; opponent_level++) {
    const opponentWeightClass = getWeightClassForLevel(opponent_level);
    const levelDifference = opponent_level - player_teamLevel;
    
    // Check if this opponent matches preferences
    const sameClass = opponentWeightClass.id === playerWeightClass.id;
    const classAbove = opponentWeightClass.rank > playerWeightClass.rank;
    const classBelow = opponentWeightClass.rank < playerWeightClass.rank;
    
    let allowed = false;
    if (sameClass && preferences.allow_same_class) allowed = true;
    if (classAbove && preferences.allow_class_above) allowed = true;
    if (classBelow && preferences.allow_class_below) allowed = true;
    
    if (!allowed) continue;
    
    // Calculate expected XP multiplier
    const mockXpGain = calculateWeightClassXP(player_teamLevel, opponent_level, true, 120);
    const baseXp = 100; // Base victory XP
    const expectedMultiplier = mockXpGain.amount / baseXp;
    
    const risk_level = calculateRiskLevel(levelDifference);
    
    let description = '';
    if (levelDifference === 0) {
      description = 'Even match - balanced risk and reward';
    } else if (levelDifference > 0) {
      description = `Fighting ${levelDifference} level${levelDifference > 1 ? 's' : ''} above - high risk, high reward`;
    } else {
      description = `Fighting ${Math.abs(levelDifference)} level${Math.abs(levelDifference) > 1 ? 's' : ''} below - low risk, standard reward`;
    }
    
    results.push({
      opponent: {
        team_level: opponent_level,
        weight_class: opponentWeightClass,
        level_difference: levelDifference
      },
      risk_level,
      expected_xp_multiplier: expectedMultiplier,
      description
    });
  }
  
  // Sort by level difference (closest first, then higher levels)
  return results.sort((a, b) => {
    const aDiff = Math.abs(a.opponent.level_difference);
    const bDiff = Math.abs(b.opponent.level_difference);
    if (aDiff !== bDiff) return aDiff - bDiff;
    return b.opponent.level_difference - a.opponent.level_difference; // Higher levels first if same distance
  });
}

// Default matchmaking preferences
export const defaultMatchmakingPreferences: MatchmakingPreference = {
  allow_same_class: true,
  allow_class_above: true,
  allow_class_below: true,
  max_levelDifference: 10
};

// Aggressive matchmaking preferences (for risk-takers like you!)
export const aggressiveMatchmakingPreferences: MatchmakingPreference = {
  allow_same_class: true,
  allow_class_above: true,
  allow_class_below: false, // No easy fights
  max_levelDifference: 15  // Willing to fight way above
};

// Conservative matchmaking preferences
export const conservativeMatchmakingPreferences: MatchmakingPreference = {
  allow_same_class: true,
  allow_class_above: false, // No higher weight classes
  allow_class_below: true,
  max_levelDifference: 3   // Stay close to your level
};

// Get readable weight class comparison
export function getWeightClassComparison(playerClass: WeightClass, opponent_class: WeightClass): string {
  if (playerClass.id === opponent_class.id) {
    return `Same weight class (${playerClass.name})`;
  } else if (opponent_class.rank > playerClass.rank) {
    const difference = opponent_class.rank - playerClass.rank;
    return `${difference} weight class${difference > 1 ? 'es' : ''} above (${opponent_class.name})`;
  } else {
    const difference = playerClass.rank - opponent_class.rank;
    return `${difference} weight class${difference > 1 ? 'es' : ''} below (${opponent_class.name})`;
  }
}