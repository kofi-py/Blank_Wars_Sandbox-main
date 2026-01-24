// User Account and Character Collection System for _____ Wars
// Complete account management with character roster, progress tracking, and collection mechanics

export type SubscriptionTier = 'free' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
export type CharacterRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type AcquisitionMethod = 'starter' | 'pack' | 'quest' | 'event' | 'premium' | 'achievement';

export interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  email: string;
  avatar: string;
  avatar_url?: string;
  bio?: string;
  title: string;
  player_level: number;
  total_xp: number;
  join_date: Date;
  last_active: Date;
  character_slot_capacity: number; // New: Dynamic character slot capacity

  // Subscription info
  subscription_tier: SubscriptionTier;
  subscription_expiry?: Date;
  is_active: boolean;

  // Currency and resources
  currency: PlayerCurrency;

  // Settings and preferences
  preferences: UserPreferences;

  // Player statistics
  stats: PlayerStats;

  // Achievements
  achievements: Achievement[];

  // Character collection
  characters_owned: OwnedCharacter[];
}

export interface PlayerStats {
  // Battle statistics
  battles_won: number;
  battles_lost: number;
  battles_draw: number;
  total_battles: number;
  win_rate: number;
  win_streak: number;
  best_win_streak: number;

  // Training statistics
  training_sessions_completed: number;
  total_training_time: number; // in minutes
  skill_pointsEarned: number;
  training_pointsEarned: number;

  // Character collection
  characters_unlocked: number;
  total_character_levels: number;
  highest_character_level: number;

  // Economy
  gold_earned: number;
  gold_spent: number;
  items_used: number;
  equipment_crafted: number;

  // Special achievements
  perfect_battles: number; // won without taking damage
  critical_hit_streak: number;
  abilities_unlocked: number;

  // Time tracking
  total_play_time: number; // in minutes
  daily_play_streak: number;
  longest_play_streak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: CharacterRarity;
  category: 'battle' | 'training' | 'collection' | 'progression' | 'social' | 'special';
  progress: number;
  max_progress: number;
  is_completed: boolean;
  completed_date?: Date;
  rewards: AchievementReward[];
}

export interface AchievementReward {
  type: 'gold' | 'gems' | 'xp' | 'contestant' | 'item' | 'title' | 'cosmetic';
  amount?: number;
  item_id?: string;
  character_id?: string;
}

export interface OwnedCharacter {
  character_id: string;
  character_name: string;
  archetype: string;
  rarity: CharacterRarity;
  acquisition_method: AcquisitionMethod;
  acquisition_date: Date;

  // Character progression
  level: number;
  xp: number;
  total_xp: number;

  // Battle stats for this character
  wins: number;
  losses: number;
  draws: number;

  // Training progress
  training_level: number;
  skills_learned: string[];
  abilities_unlocked: string[];
  ability_progress: { ability_id: string; rank: number; experience: number }[];

  // Equipment and items
  equipped_items: {
    weapon?: string;
    armor?: string;
    accessory?: string;
  };
  favorite_loadout?: string;

  // Customization
  nickname?: string;
  custom_avatar?: string;
  is_favorite: boolean;
  is_starter: boolean;

  // Metadata
  last_used: Date;
  total_battle_time: number;
  total_training_time: number;

  // Stats
  attack?: number;
  defense?: number;
  speed?: number;
  health?: number;
  base_attack?: number;
  base_defense?: number;
  base_speed?: number;
  base_health?: number;

  // Current stats (including buffs/equipment)
  current_attack?: number;
  current_defense?: number;
  current_speed?: number;
  current_max_health?: number;
  character_data?: any;
  bond_level?: number;
}

export interface PlayerCurrency {
  gold: number;
  gems: number; // Premium currency
  training_points: number;
  battle_tokens: number; // Limited battle attempts
  pack_credits: number; // For opening character packs
  event_currency: number; // Special event currency
}

export interface UserPreferences {
  // Game settings
  battle_animation_speed: 'slow' | 'normal' | 'fast';
  sound_enabled: boolean;
  music_enabled: boolean;
  notifications_enabled: boolean;

  // Display preferences
  theme: 'dark' | 'light' | 'auto';
  language: string;
  time_zone: string;

  // Gameplay preferences
  auto_save_enabled: boolean;
  tutorial_completed: boolean;
  expert_mode: boolean;

  // Privacy settings
  profile_public: boolean;
  show_online_status: boolean;
  allow_friend_requests: boolean;

  // Collection preferences
  default_sort_order: 'level' | 'rarity' | 'recent' | 'alphabetical';
  show_duplicates: boolean;
  compact_view: boolean;
}

// Subscription tier configuration
export const subscriptionTiers: Record<SubscriptionTier, {
  name: string;
  display_name: string;
  price: number; // monthly USD
  character_slots: number;
  benefits: string[];
  color: string;
  icon: string;
  priority: number;
}> = {
  free: {
    name: 'free',
    display_name: 'Free Player',
    price: 0,
    character_slots: 3,
    benefits: [
      '3 character slots',
      'Basic training facilities',
      'Standard battle rewards',
      'Limited daily energy'
    ],
    color: 'text-gray-400',
    icon: '🆓',
    priority: 0
  },
  bronze: {
    name: 'bronze',
    display_name: 'Bronze Warrior',
    price: 4.99,
    character_slots: 5,
    benefits: [
      '5 character slots',
      'Access to Bronze training facilities',
      '+25% XP and gold rewards',
      '50% more daily energy',
      'Priority matchmaking'
    ],
    color: 'text-orange-600',
    icon: '🥉',
    priority: 1
  },
  silver: {
    name: 'silver',
    display_name: 'Silver Champion',
    price: 9.99,
    character_slots: 8,
    benefits: [
      '8 character slots',
      'Access to Silver training facilities',
      '+50% XP and gold rewards',
      'Double daily energy',
      'Exclusive Silver characters',
      'Advanced battle analytics'
    ],
    color: 'text-gray-300',
    icon: '🥈',
    priority: 2
  },
  gold: {
    name: 'gold',
    display_name: 'Gold Gladiator',
    price: 19.99,
    character_slots: 12,
    benefits: [
      '12 character slots',
      'Access to Gold training facilities',
      '+100% XP and gold rewards',
      'Triple daily energy',
      'Exclusive Gold characters',
      'Custom battle arenas',
      'Priority customer support'
    ],
    color: 'text-yellow-400',
    icon: '🥇',
    priority: 3
  },
  platinum: {
    name: 'platinum',
    display_name: 'Platinum Master',
    price: 39.99,
    character_slots: 20,
    benefits: [
      '20 character slots',
      'Access to Elite training facilities',
      '+200% XP and gold rewards',
      'Unlimited daily energy',
      'Exclusive Platinum characters',
      'Early access to new content',
      'Custom character skins',
      'VIP tournament access'
    ],
    color: 'text-blue-300',
    icon: '💎',
    priority: 4
  },
  legendary: {
    name: 'legendary',
    display_name: 'Legendary Hero',
    price: 99.99,
    character_slots: 50,
    benefits: [
      '50 character slots',
      'Access to Legendary facilities',
      '+500% XP and gold rewards',
      'Unlimited everything',
      'All exclusive characters',
      'Beta testing privileges',
      'Personal account manager',
      'Quarterly exclusive events',
      'Custom ability animations'
    ],
    color: 'text-purple-400',
    icon: '👑',
    priority: 5
  }
};

// Character rarity configuration
export const characterRarityConfig: Record<CharacterRarity, {
  name: string;
  color: string;
  text_color: string;
  pack_probability: number; // chance in packs (0-1)
  base_power: number; // stat multiplier
  unlock_method: string[];
  icon: string;
  glow_effect: string;
}> = {
  common: {
    name: 'Common',
    color: 'from-gray-500 to-gray-600',
    text_color: 'text-gray-300',
    pack_probability: 0.6,
    base_power: 1.0,
    unlock_method: ['starter', 'pack', 'quest'],
    icon: '⚪',
    glow_effect: 'shadow-gray-500/30'
  },
  uncommon: {
    name: 'Uncommon',
    color: 'from-green-500 to-green-600',
    text_color: 'text-green-300',
    pack_probability: 0.25,
    base_power: 1.15,
    unlock_method: ['pack', 'quest', 'achievement'],
    icon: '🟢',
    glow_effect: 'shadow-green-500/50'
  },
  rare: {
    name: 'Rare',
    color: 'from-blue-500 to-blue-600',
    text_color: 'text-blue-300',
    pack_probability: 0.1,
    base_power: 1.35,
    unlock_method: ['pack', 'event', 'premium'],
    icon: '🔵',
    glow_effect: 'shadow-blue-500/50'
  },
  epic: {
    name: 'Epic',
    color: 'from-purple-500 to-purple-600',
    text_color: 'text-purple-300',
    pack_probability: 0.04,
    base_power: 1.6,
    unlock_method: ['pack', 'event', 'premium'],
    icon: '🟣',
    glow_effect: 'shadow-purple-500/50'
  },
  legendary: {
    name: 'Legendary',
    color: 'from-yellow-500 to-orange-600',
    text_color: 'text-yellow-300',
    pack_probability: 0.009,
    base_power: 2.0,
    unlock_method: ['event', 'premium', 'achievement'],
    icon: '🟡',
    glow_effect: 'shadow-yellow-500/70'
  },
  mythic: {
    name: 'Mythic',
    color: 'from-pink-500 via-purple-500 to-blue-500',
    text_color: 'text-pink-300',
    pack_probability: 0.001,
    base_power: 2.5,
    unlock_method: ['event', 'premium'],
    icon: '🌟',
    glow_effect: 'shadow-pink-500/70'
  }
};

// Achievement definitions
export const achievements: Achievement[] = [
  // Battle achievements
  {
    id: 'first_victory',
    name: 'First Victory',
    description: 'Win your first battle',
    icon: '🏆',
    rarity: 'common',
    category: 'battle',
    progress: 0,
    max_progress: 1,
    is_completed: false,
    rewards: [
      { type: 'gold', amount: 100 },
      { type: 'xp', amount: 50 }
    ]
  },
  {
    id: 'win_streak_10',
    name: 'Unstoppable',
    description: 'Win 10 battles in a row',
    icon: '🔥',
    rarity: 'rare',
    category: 'battle',
    progress: 0,
    max_progress: 10,
    is_completed: false,
    rewards: [
      { type: 'gold', amount: 1000 },
      { type: 'title', item_id: 'unstoppable_warrior' }
    ]
  },
  {
    id: 'perfect_battles_5',
    name: 'Flawless Fighter',
    description: 'Win 5 battles without taking damage',
    icon: '✨',
    rarity: 'epic',
    category: 'battle',
    progress: 0,
    max_progress: 5,
    is_completed: false,
    rewards: [
      { type: 'contestant', character_id: 'special_variant' },
      { type: 'gold', amount: 2500 }
    ]
  },

  // Collection achievements
  {
    id: 'collector_10',
    name: 'Character Collector',
    description: 'Collect 10 different characters',
    icon: '👥',
    rarity: 'uncommon',
    category: 'collection',
    progress: 0,
    max_progress: 10,
    is_completed: false,
    rewards: [
      { type: 'gold', amount: 500 },
      { type: 'item', item_id: 'character_slot_expansion' }
    ]
  },
  {
    id: 'legendary_collector',
    name: 'Legend Hunter',
    description: 'Collect a Legendary character',
    icon: '🌟',
    rarity: 'legendary',
    category: 'collection',
    progress: 0,
    max_progress: 1,
    is_completed: false,
    rewards: [
      { type: 'gold', amount: 5000 },
      { type: 'title', item_id: 'legend_hunter' },
      { type: 'cosmetic', item_id: 'golden_frame' }
    ]
  },

  // Training achievements
  {
    id: 'training_master',
    name: 'Training Master',
    description: 'Complete 100 training sessions',
    icon: '💪',
    rarity: 'rare',
    category: 'training',
    progress: 0,
    max_progress: 100,
    is_completed: false,
    rewards: [
      { type: 'gold', amount: 1500 },
      { type: 'title', item_id: 'training_master' }
    ]
  },

  // Progression achievements
  {
    id: 'level_50_character',
    name: 'Master Warrior',
    description: 'Reach level 50 with any character',
    icon: '⭐',
    rarity: 'epic',
    category: 'progression',
    progress: 0,
    max_progress: 1,
    is_completed: false,
    rewards: [
      { type: 'contestant', character_id: 'ascended_variant' },
      { type: 'gold', amount: 10000 }
    ]
  },
  {
    id: 'level_75_character',
    name: 'Legendary Hero',
    description: 'Reach level 75 with any character',
    icon: '🌟',
    rarity: 'legendary',
    category: 'progression',
    progress: 0,
    max_progress: 1,
    is_completed: false,
    rewards: [
      { type: 'gold', amount: 25000 },
      { type: 'gems', amount: 100 }
    ]
  },
  {
    id: 'level_100_character',
    name: 'Mythic Ascendant',
    description: 'Reach level 100 with any character',
    icon: '🔥',
    rarity: 'mythic',
    category: 'progression',
    progress: 0,
    max_progress: 1,
    is_completed: false,
    rewards: [
      { type: 'gold', amount: 50000 },
      { type: 'gems', amount: 250 },
      { type: 'contestant', character_id: 'mythic_variant' }
    ]
  },
  {
    id: 'level_150_character',
    name: 'Transcendent Being',
    description: 'Reach level 150 with any character',
    icon: '⚡',
    rarity: 'legendary',
    category: 'progression',
    progress: 0,
    max_progress: 1,
    is_completed: false,
    rewards: [
      { type: 'gold', amount: 100000 },
      { type: 'gems', amount: 500 }
    ]
  }
];

// Helper functions
export function getSubscriptionBenefits(tier: SubscriptionTier): string[] {
  return subscriptionTiers[tier].benefits;
}



export function canUpgradeSubscription(current_tier: SubscriptionTier, target_tier: SubscriptionTier): boolean {
  return subscriptionTiers[target_tier].priority > subscriptionTiers[current_tier].priority;
}

export function calculatePlayerLevel(total_xp: number): number {
  // Player level uses different curve than character levels
  if (total_xp < 1000) return 1;
  return Math.floor(Math.log(total_xp / 100) / Math.log(1.1)) + 1;
}

export function getXPRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.1, level - 1));
}

export function updateAchievementProgress(
  achievements: Achievement[],
  achievement_id: string,
  progress: number
): { updated_achievements: Achievement[]; newlyCompleted: Achievement[] } {
  const updatedAchievements = [...achievements];
  const newlyCompleted: Achievement[] = [];

  const achievementIndex = updatedAchievements.findIndex(a => a.id === achievement_id);
  if (achievementIndex >= 0) {
    const achievement = updatedAchievements[achievementIndex];
    const oldProgress = achievement.progress;

    achievement.progress = Math.min(achievement.max_progress, progress);

    // Check if newly completed
    if (!achievement.is_completed && achievement.progress >= achievement.max_progress) {
      achievement.is_completed = true;
      achievement.completed_date = new Date();
      newlyCompleted.push(achievement);
    }
  }

  return { updated_achievements: updatedAchievements, newlyCompleted };
}

export function grantAchievementRewards(
  rewards: AchievementReward[],
  currency: PlayerCurrency
): PlayerCurrency {
  const updatedCurrency = { ...currency };

  rewards.forEach(reward => {
    switch (reward.type) {
      case 'gold':
        updatedCurrency.gold += reward.amount || 0;
        break;
      case 'gems':
        updatedCurrency.gems += reward.amount || 0;
        break;
      // Other reward types would be handled by other systems
    }
  });

  return updatedCurrency;
}

export function getCollectionStats(characters: OwnedCharacter[]): {
  total_characters: number;
  by_rarity: Record<CharacterRarity, number>;
  by_archetype: Record<string, number>;
  average_level: number;
  total_levels: number;
} {
  const stats = {
    total_characters: characters.length,
    by_rarity: {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythic: 0
    } as Record<CharacterRarity, number>,
    by_archetype: {} as Record<string, number>,
    average_level: 0,
    total_levels: 0
  };

  characters.forEach(char => {
    stats.by_rarity[char.rarity]++;
    stats.by_archetype[char.archetype] = (stats.by_archetype[char.archetype] || 0) + 1;
    stats.total_levels += char.level;
  });

  stats.average_level = characters.length > 0 ? stats.total_levels / characters.length : 0;

  return stats;
}

export function generatePackContents(packType: 'basic' | 'premium' | 'legendary'): {
  guaranteed_rarity?: CharacterRarity;
  character_count: number;
  bonus_rewards: { type: string; amount: number }[];
} {
  const packConfigs = {
    basic: {
      character_count: 3,
      bonus_rewards: [{ type: 'gold', amount: 100 }]
    },
    premium: {
      guaranteed_rarity: 'rare' as CharacterRarity,
      character_count: 5,
      bonus_rewards: [
        { type: 'gold', amount: 500 },
        { type: 'gems', amount: 10 }
      ]
    },
    legendary: {
      guaranteed_rarity: 'legendary' as CharacterRarity,
      character_count: 10,
      bonus_rewards: [
        { type: 'gold', amount: 2000 },
        { type: 'gems', amount: 50 },
        { type: 'training_points', amount: 100 }
      ]
    }
  };

  return packConfigs[packType];
}
