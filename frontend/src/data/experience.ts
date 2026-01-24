// Experience and Leveling System for _____ Wars
// Core character progression mechanics

export interface ExperienceGain {
  source: 'battle' | 'training' | 'quest' | 'achievement' | 'daily' | 'event';
  amount: number;
  bonuses: {
    type: string;
    multiplier: number;
    description: string;
  }[];
  timestamp: Date;
}

export interface LevelRequirement {
  level: number;
  xp_required: number;
  total_xp_required: number;
  rewards: LevelReward[];
}

export interface LevelReward {
  type: 'stat_points' | 'skill_points' | 'ability' | 'item' | 'currency' | 'unlock' | 'title';
  id?: string;
  amount?: number;
  description: string;
}

export interface CharacterExperience {
  character_id: string;
  current_level: number;
  current_xp: number;
  total_xp: number;
  xp_to_nextLevel: number;
  stat_points: number;
  skill_points: number;
  level_history: {
    level: number;
    achieved_at: Date;
    time_to_level: number; // seconds
  }[];
  xp_history: ExperienceGain[];
}

// XP curve configuration
const XP_CURVE_BASE = 100;
const XP_CURVE_MULTIPLIER = 1.5;
const XP_CURVE_EXPONENT = 1.2;

// Generate level requirements for levels 1-50
export const levelRequirements: LevelRequirement[] = Array.from({ length: 50 }, (_, i) => {
  const level = i + 1;
  
  // Calculate XP required for this level
  const xpRequired = Math.floor(
    XP_CURVE_BASE * Math.pow(level, XP_CURVE_EXPONENT) * XP_CURVE_MULTIPLIER
  );
  
  // Calculate total XP required to reach this level
  const totalXpRequired = Array.from({ length: level - 1 }, (_, j) => {
    const lvl = j + 1;
    return Math.floor(XP_CURVE_BASE * Math.pow(lvl, XP_CURVE_EXPONENT) * XP_CURVE_MULTIPLIER);
  }).reduce((sum, xp) => sum + xp, 0);

  // Define rewards for each level
  const rewards: LevelReward[] = [];

  // Every level gives stat points
  rewards.push({
    type: 'stat_points',
    amount: level <= 10 ? 3 : level <= 25 ? 4 : 5,
    description: `+${level <= 10 ? 3 : level <= 25 ? 4 : 5} stat points to distribute`
  });

  // Every 2 levels gives skill points
  if (level % 2 === 0) {
    rewards.push({
      type: 'skill_points',
      amount: 1,
      description: '+1 skill point for abilities'
    });
  }

  // Milestone rewards
  if (level % 5 === 0) {
    rewards.push({
      type: 'currency',
      id: 'gems',
      amount: level * 10,
      description: `+${level * 10} gems bonus`
    });
  }

  if (level % 10 === 0) {
    rewards.push({
      type: 'unlock',
      id: `ability_slot_${Math.floor(level / 10)}`,
      description: `Unlock ability slot ${Math.floor(level / 10)}`
    });
  }

  // Special milestone rewards
  switch (level) {
    case 5:
      rewards.push({
        type: 'unlock',
        id: 'training_advanced',
        description: 'Unlock advanced training facilities'
      });
      break;
    case 10:
      rewards.push({
        type: 'title',
        id: 'experienced_warrior',
        description: 'Earn "Experienced Warrior" title'
      });
      break;
    case 20:
      rewards.push({
        type: 'ability',
        id: 'signature_ability',
        description: 'Unlock signature ability'
      });
      break;
    case 30:
      rewards.push({
        type: 'unlock',
        id: 'elite_equipment',
        description: 'Unlock elite equipment tier'
      });
      break;
    case 40:
      rewards.push({
        type: 'title',
        id: 'legendary_warrior',
        description: 'Earn "Legendary Warrior" title'
      });
      break;
    case 50:
      rewards.push({
        type: 'unlock',
        id: 'prestige_mode',
        description: 'Unlock Prestige Mode'
      });
      rewards.push({
        type: 'title',
        id: 'max_level_champion',
        description: 'Earn "Max Level Champion" title'
      });
      break;
  }

  return {
    level,
    xp_required: xpRequired,
    total_xp_required: totalXpRequired,
    rewards
  };
});

// XP gain calculations
export function calculateBattleXP(
  winner_level: number,
  loser_level: number,
  is_victory: boolean,
  battle_duration: number
): ExperienceGain {
  const baseXP = is_victory ? 100 : 30;
  const levelDifference = loser_level - winner_level;
  
  // Level difference multiplier
  let levelMultiplier = 1;
  if (levelDifference > 0) {
    levelMultiplier = 1 + (levelDifference * 0.1); // +10% per level higher
  } else if (levelDifference < -5) {
    levelMultiplier = Math.max(0.1, 1 + (levelDifference * 0.1)); // -10% per level lower, min 10%
  }

  // Quick battle bonus
  const quickBattleBonus = battle_duration < 120 ? 1.2 : 1; // 20% bonus for battles under 2 minutes

  const bonuses: ExperienceGain['bonuses'] = [];
  
  if (levelMultiplier !== 1) {
    bonuses.push({
      type: 'level_difference',
      multiplier: levelMultiplier,
      description: `Level difference (${levelDifference > 0 ? '+' : ''}${levelDifference})`
    });
  }

  if (quickBattleBonus > 1) {
    bonuses.push({
      type: 'quick_battle',
      multiplier: quickBattleBonus,
      description: 'Quick battle bonus'
    });
  }

  const totalMultiplier = levelMultiplier * quickBattleBonus;
  const amount = Math.floor(baseXP * totalMultiplier);

  return {
    source: 'battle',
    amount,
    bonuses,
    timestamp: new Date()
  };
}

export function calculateTrainingXP(
  activity_type: string,
  duration: number,
  facility_tier: number
): ExperienceGain {
  const baseXPPerMinute = 10;
  const facilityMultiplier = 1 + (facility_tier * 0.25); // +25% per tier
  
  const bonuses: ExperienceGain['bonuses'] = [{
    type: 'facility_tier',
    multiplier: facilityMultiplier,
    description: `Tier ${facility_tier} facility bonus`
  }];

  const amount = Math.floor((baseXPPerMinute * duration) * facilityMultiplier);

  return {
    source: 'training',
    amount,
    bonuses,
    timestamp: new Date()
  };
}

// Level progression functions
export function getRequiredXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > 50) return Infinity;
  
  const requirement = levelRequirements.find(req => req.level === level);
  return requirement?.xp_required || 0;
}

export function getTotalXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > 50) return Infinity;
  
  const requirement = levelRequirements.find(req => req.level === level);
  return requirement?.total_xp_required || 0;
}

export function calculateLevelFromTotalXP(total_xp: number): { level: number; current_xp: number; xp_to_next: number } {
  let level = 1;
  let remainingXP = total_xp;

  for (const req of levelRequirements) {
    if (total_xp >= req.total_xp_required + req.xp_required) {
      level = req.level + 1;
    } else if (total_xp >= req.total_xp_required) {
      level = req.level;
      remainingXP = total_xp - req.total_xp_required;
      break;
    }
  }

  // Cap at level 50
  if (level > 50) {
    level = 50;
    remainingXP = 0;
  }

  const xp_to_next = getRequiredXPForLevel(level) - remainingXP;

  return {
    level: Math.min(level, 50),
    current_xp: remainingXP,
    xp_to_next: Math.max(0, xp_to_next)
  };
}

export function addExperience(
  character: CharacterExperience,
  gain: ExperienceGain,
  agent_bonuses?: ExperienceBonus[]
): {
  updated_character: CharacterExperience;
  leveled_up: boolean;
  new_level?: number;
  rewards?: LevelReward[];
} {
  const updated_character = { ...character };
  
  // Apply agent bonuses to XP gain
  let finalXpAmount = gain.amount;
  if (agent_bonuses && agent_bonuses.length > 0) {
    const totalMultiplier = calculateTotalExperienceMultiplier(agent_bonuses);
    finalXpAmount = Math.floor(gain.amount * totalMultiplier);
    
    // Add agent bonuses to the gain record
    gain.bonuses = [...gain.bonuses, ...agent_bonuses.map(bonus => ({
      type: bonus.id,
      multiplier: bonus.multiplier,
      description: bonus.description
    }))];
    
    console.log(`🏠 Applied agent XP bonuses: ${gain.amount} → ${finalXpAmount} (+${finalXpAmount - gain.amount})`);
  }
  
  // Add XP
  updated_character.current_xp += finalXpAmount;
  updated_character.total_xp += finalXpAmount;

  // Add to history
  updated_character.xp_history = [...updated_character.xp_history, gain];

  // Check for level up
  let leveledUp = false;
  let newLevel = updated_character.current_level;
  const collectedRewards: LevelReward[] = [];

  while (updated_character.current_xp >= getRequiredXPForLevel(updated_character.current_level)) {
    const xpRequired = getRequiredXPForLevel(updated_character.current_level);
    updated_character.current_xp -= xpRequired;
    updated_character.current_level += 1;
    newLevel = updated_character.current_level;
    leveledUp = true;

    // Get rewards for this level
    const levelReq = levelRequirements.find(req => req.level === newLevel);
    if (levelReq) {
      collectedRewards.push(...levelReq.rewards);

      // Apply immediate rewards
      levelReq.rewards.forEach(reward => {
        if (reward.type === 'stat_points' && reward.amount) {
          updated_character.stat_points += reward.amount;
        }
        if (reward.type === 'skill_points' && reward.amount) {
          updated_character.skill_points += reward.amount;
        }
      });
    }

    // Add to level history
    updated_character.level_history.push({
      level: newLevel,
      achieved_at: new Date(),
      time_to_level: 0 // Would calculate from previous level timestamp
    });

    // Stop at max level
    if (updated_character.current_level >= 50) {
      updated_character.current_level = 50;
      updated_character.current_xp = 0;
      break;
    }
  }

  // Update XP to next level
  updated_character.xp_to_nextLevel = getRequiredXPForLevel(updated_character.current_level) - updated_character.current_xp;

  return {
    updated_character,
    leveled_up: leveledUp,
    new_level: leveledUp ? newLevel : undefined,
    rewards: leveledUp ? collectedRewards : undefined
  };
}

// Experience bonuses
export interface ExperienceBonus {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  source: string;
  duration?: number; // in seconds, null for permanent
  expires_at?: Date;
  stackable: boolean;
}

export function calculateTotalExperienceMultiplier(bonuses: ExperienceBonus[]): number {
  // Separate stackable and non-stackable bonuses
  const stackableBonuses = bonuses.filter(b => b.stackable);
  const nonStackableBonuses = bonuses.filter(b => !b.stackable);
  
  // For non-stackable, take the highest
  const highestNonStackable = nonStackableBonuses.reduce((max, bonus) => 
    bonus.multiplier > max ? bonus.multiplier : max, 1
  );
  
  // For stackable, multiply them
  const stackableMultiplier = stackableBonuses.reduce((total, bonus) => 
    total * bonus.multiplier, 1
  );
  
  return highestNonStackable * stackableMultiplier;
}

// Daily/Weekly bonuses
export const experience_bonuses = {
  first_win_of_day: {
    id: 'first_win_daily',
    name: 'First Win of the Day',
    description: 'Double XP for your first victory',
    multiplier: 2,
    source: 'daily_bonus',
    duration: null,
    stackable: false
  },
  weekend_bonus: {
    id: 'weekend_bonus',
    name: 'Weekend Warriors',
    description: '+50% XP all weekend',
    multiplier: 1.5,
    source: 'event',
    duration: null,
    stackable: true
  },
  premium_bonus: {
    id: 'premium_member',
    name: 'Premium Membership',
    description: '+100% XP from all sources',
    multiplier: 2,
    source: 'subscription',
    duration: null,
    stackable: true
  },
  guild_bonus: {
    id: 'guild_bonus',
    name: 'Guild Experience Share',
    description: '+25% XP when in a guild',
    multiplier: 1.25,
    source: 'guild',
    duration: null,
    stackable: true
  }
};

// Helper to create new character experience
export function createCharacterExperience(character_id: string): CharacterExperience {
  return {
    character_id,
    current_level: 1,
    current_xp: 0,
    total_xp: 0,
    xp_to_nextLevel: getRequiredXPForLevel(1),
    stat_points: 0,
    skill_points: 0,
    level_history: [{
      level: 1,
      achieved_at: new Date(),
      time_to_level: 0
    }],
    xp_history: []
  };
}

// Prestige system (for level 50 characters)
export interface PrestigeLevel {
  tier: number;
  name: string;
  color: string;
  bonuses: {
    stat_multiplier: number;
    xp_multiplier: number;
    special_rewards: string[];
  };
}

export const prestigeLevels: PrestigeLevel[] = [
  {
    tier: 1,
    name: 'Bronze Prestige',
    color: 'from-orange-600 to-orange-700',
    bonuses: {
      stat_multiplier: 1.1,
      xp_multiplier: 1.5,
      special_rewards: ['bronze_frame', 'prestige_1_title']
    }
  },
  {
    tier: 2,
    name: 'Silver Prestige',
    color: 'from-gray-400 to-gray-500',
    bonuses: {
      stat_multiplier: 1.2,
      xp_multiplier: 2,
      special_rewards: ['silver_frame', 'prestige_2_title']
    }
  },
  {
    tier: 3,
    name: 'Gold Prestige',
    color: 'from-yellow-400 to-yellow-500',
    bonuses: {
      stat_multiplier: 1.3,
      xp_multiplier: 2.5,
      special_rewards: ['gold_frame', 'prestige_3_title', 'legendary_skin']
    }
  }
];