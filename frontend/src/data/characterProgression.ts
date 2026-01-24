// Character Progression System for _____ Wars
// Levels 1-50 with balanced XP curves, stat scaling, and milestone rewards

export interface CharacterSkills {
  character_id: string;
  core_skills: Record<string, { level: number; experience: number; max_level: number }>;
  signature_skills?: Record<string, { name: string; level: number; description?: string }>;
  archetype_skills?: Record<string, { name: string; level: number; description?: string }>;
  passive_abilities?: Array<{ id: string; name: string; description: string }>;
  active_abilities?: Array<{ id: string; name: string; description: string; cost?: number }>;
  unlocked_nodes?: Array<{ id: string; name: string; type: string }>;
  skill_points?: number;
  last_updated?: Date;
}


export interface LevelData {
  level: number;
  xp_required: number;
  xp_to_next: number;
  stat_points_gained: number;
  milestone_reward?: MilestoneReward;
  tier: ProgressionTier;
  title: string;
}

export interface MilestoneReward {
  type: 'ability' | 'stat_boost' | 'training_points' | 'currency' | 'special';
  name: string;
  description: string;
  value?: number;
  icon: string;
}

export type ProgressionTier = 'novice' | 'apprentice' | 'adept' | 'expert' | 'master' | 'legend';

export interface ProgressionTierInfo {
  tier: ProgressionTier;
  name: string;
  level_range: [number, number];
  color: string;
  description: string;
  icon: string;
  benefits: string[];
}

// Progression Tiers
export const progressionTiers: Record<ProgressionTier, ProgressionTierInfo> = {
  novice: {
    tier: 'novice',
    name: 'Novice',
    level_range: [1, 10],
    color: 'gray',
    description: 'Learning the basics of combat and training',
    icon: '🌱',
    benefits: [
      'Basic training access',
      'Core skill previews',
      'Simple combat abilities'
    ]
  },
  apprentice: {
    tier: 'apprentice', 
    name: 'Apprentice',
    level_range: [11, 20],
    color: 'green',
    description: 'Developing fundamental skills and techniques',
    icon: '⚔️',
    benefits: [
      'Intermediate training unlocked',
      'First signature abilities',
      'Team coordination basics'
    ]
  },
  adept: {
    tier: 'adept',
    name: 'Adept',
    level_range: [21, 30],
    color: 'blue',
    description: 'Mastering advanced combat techniques',
    icon: '🎯',
    benefits: [
      'Advanced training facilities',
      'Complex skill combinations',
      'Leadership abilities'
    ]
  },
  expert: {
    tier: 'expert',
    name: 'Expert',
    level_range: [31, 40],
    color: 'purple',
    description: 'Achieving exceptional mastery',
    icon: '👑',
    benefits: [
      'Master-level training',
      'Signature skill mastery',
      'Cross-archetype learning'
    ]
  },
  master: {
    tier: 'master',
    name: 'Master',
    level_range: [41, 50],
    color: 'gold',
    description: 'Transcending normal limitations',
    icon: '⭐',
    benefits: [
      'Legendary training access',
      'Ultimate abilities unlocked',
      'Mentor capabilities'
    ]
  },
  legend: {
    tier: 'legend',
    name: 'Legend',
    level_range: [51, 200],
    color: 'rainbow',
    description: 'Achieving mythical status - unlimited potential',
    icon: '🌟',
    benefits: [
      'Mythical abilities',
      'Reality-bending powers',
      'Godlike presence',
      'Infinite growth potential'
    ]
  }
};

// XP calculation functions
function calculateXPRequired(level: number): number {
  if (level <= 1) return 0;
  
  // Exponential curve with diminishing returns
  const baseXP = 100;
  const growthFactor = 1.15;
  const levelPenalty = Math.pow(level - 1, 1.3);
  
  return Math.floor(baseXP * Math.pow(growthFactor, level - 2) + levelPenalty * 50);
}

function calculateXPToNext(level: number): number {
  return calculateXPRequired(level + 1) - calculateXPRequired(level);
}

function getTierForLevel(level: number): ProgressionTier {
  if (level <= 10) return 'novice';
  if (level <= 20) return 'apprentice';
  if (level <= 30) return 'adept';
  if (level <= 40) return 'expert';
  if (level <= 50) return 'master'; // Master tier now extends to level 50
  return 'legend'; // Legend tier for levels above 50
}

function getTitle(level: number): string {
  const tier = getTierForLevel(level);
  const tierInfo = progressionTiers[tier];
  
  const titles = {
    novice: ['Trainee', 'Recruit', 'Student', 'Initiate', 'Novice', 'Cadet', 'Learner', 'Beginner', 'Pupil', 'Freshman'],
    apprentice: ['Apprentice', 'Warrior-in-Training', 'Combatant', 'Fighter', 'Soldier', 'Guardian', 'Defender', 'Protector', 'Sentinel', 'Champion-to-be'],
    adept: ['Adept', 'Skilled Fighter', 'Battle-tested', 'Veteran', 'Elite', 'Advanced Warrior', 'Combat Expert', 'Tactical Fighter', 'Seasoned Hero', 'Proven Champion'],
    expert: ['Expert', 'Master Fighter', 'Combat Specialist', 'Elite Warrior', 'Legendary Fighter', 'Battle Master', 'War Veteran', 'Combat Legend', 'Heroic Champion', 'Renowned Warrior'],
    master: ['Master', 'Grandmaster', 'Legendary Hero', 'Mythic Warrior', 'Ultimate Champion', 'Transcendent Master', 'Cosmic Champion', 'Eternal Paragon', 'Divine Ascendant', 'Omni-Leveler'],
    legend: ['Legend', 'Mythic Legend', 'Godlike Being', 'Transcendent Hero', 'Omnipotent Champion', 'Infinite Legend', 'Cosmic Deity', 'Absolute Apex', 'Universal Force', 'Beyond Omega']
  };
  
  const tierTitles = titles[tier];
  const indexInTier = level - tierInfo.level_range[0];
  return tierTitles[Math.min(indexInTier, tierTitles.length - 1)];
}

// Milestone rewards for specific levels
const milestoneRewards: Record<number, MilestoneReward> = {
  5: {
    type: 'training_points',
    name: 'First Milestone',
    description: 'Bonus training points for reaching level 5',
    value: 5,
    icon: '🎯'
  },
  10: {
    type: 'ability',
    name: 'Signature Ability Unlock',
    description: 'Unlock your first signature ability',
    icon: '⚡'
  },
  15: {
    type: 'stat_boost',
    name: 'Power Surge',
    description: 'Permanent +2 to all stats',
    value: 2,
    icon: '💪'
  },
  20: {
    type: 'special',
    name: 'Tier Advancement',
    description: 'Advanced training facilities unlocked',
    icon: '🏛️'
  },
  25: {
    type: 'training_points',
    name: 'Skill Mastery',
    description: 'Major training point bonus',
    value: 10,
    icon: '📚'
  },
  30: {
    type: 'ability',
    name: 'Ultimate Technique',
    description: 'Unlock powerful ultimate ability',
    icon: '🌟'
  },
  35: {
    type: 'stat_boost',
    name: 'Transcendence',
    description: 'Massive stat increase',
    value: 5,
    icon: '✨'
  },
  40: {
    type: 'special',
    name: 'Master Status',
    description: 'Cross-archetype skill learning unlocked',
    icon: '👑'
  },
  45: {
    type: 'ability',
    name: 'Legendary Power',
    description: 'Unlock legendary-tier abilities',
    icon: '🔥'
  },
  50: {
    type: 'special',
    name: 'Maximum Power',
    description: 'Achieve ultimate character potential',
    icon: '💎'
  }
};

// Generate complete level progression data
export const levelProgressionData: LevelData[] = Array.from({ length: 200 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    xp_required: calculateXPRequired(level),
    xp_to_next: calculateXPToNext(level),
    stat_points_gained: level <= 10 ? 2 : level <= 30 ? 3 : level <= 45 ? 4 : 5,
    milestone_reward: milestoneRewards[level],
    tier: getTierForLevel(level),
    title: getTitle(level)
  };
});

// Helper functions
export function get_level_data(level: number): LevelData | undefined {
  return levelProgressionData.find(data => data.level === level);
}

export function calculate_total_xp_for_level(level: number): number {
  if (level <= 1) return 0;
  return levelProgressionData.slice(0, level - 1).reduce((total, data) => total + data.xp_to_next, 0);
}

export function get_level_from_total_xp(total_xp: number): { level: number; current_xp: number; xp_to_next: number } {
  let currentLevel = 1;
  let accumulatedXP = 0;
  
  for (const levelData of levelProgressionData) {
    if (accumulatedXP + levelData.xp_to_next > total_xp) {
      return {
        level: currentLevel,
        current_xp: total_xp - accumulatedXP,
        xp_to_next: levelData.xp_to_next
      };
    }
    accumulatedXP += levelData.xp_to_next;
    currentLevel++;
  }
  
  // Max level reached (no longer capped at 50)
  return {
    level: currentLevel,
    current_xp: total_xp - accumulatedXP,
    xp_to_next: levelProgressionData[currentLevel - 1]?.xp_to_next || 0 // Use currentLevel - 1 for array index
  };
}

export function get_next_milestone(level: number): { level: number; reward: MilestoneReward } | null {
  const milestones = Object.keys(milestoneRewards).map(Number).sort((a, b) => a - b);
  const nextMilestone = milestones.find(milestone => milestone > level);
  
  if (!nextMilestone) return null;
  
  return {
    level: nextMilestone,
    reward: milestoneRewards[nextMilestone]
  };
}

export function get_tier_progress(level: number): {
  current_tier: ProgressionTierInfo;
  progress: number;
  next_tier: ProgressionTierInfo | null;
} {
  const current_tier = progressionTiers[getTierForLevel(level)];
  const [tierStart, tierEnd] = current_tier.level_range;
  const progress = (level - tierStart + 1) / (tierEnd - tierStart + 1);

  const nextTierKey = Object.keys(progressionTiers).find(key => {
    const tier = progressionTiers[key as ProgressionTier];
    return tier.level_range[0] > tierEnd;
  });

  const next_tier = nextTierKey ? progressionTiers[nextTierKey as ProgressionTier] : null;

  return {
    current_tier,
    progress,
    next_tier
  };
}

// getBaseStatsForLevel() deleted - stats come from database, not hardcoded values

// Experience bonuses for different activities
export const xp_multipliers = {
  training: {
    base: 1.0,
    archetype_specific: 1.2,
    signature_training: 1.5
  },
  combat: {
    victory: 1.0,
    defeat: 0.3,
    perfect_victory: 1.5,
    close_match: 1.1
  },
  milestones: {
    level_up: 1.0,
    tier_advancement: 2.0,
    first_signature: 1.5
  }
};