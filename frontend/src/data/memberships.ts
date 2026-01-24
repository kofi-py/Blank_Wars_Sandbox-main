// Training Membership System for _____ Wars

export type MembershipTier = 'free' | 'premium' | 'legendary';
export type FacilityType = 'community' | 'bronze' | 'elite' | 'legendary';

export interface TrainingLimits {
  daily_training_sessions: number | 'unlimited';
  daily_energy_refills: number | 'unlimited';
  skill_learning_sessions: number;
  xp_multiplier: number;
  stat_gain_multiplier: number;
  training_point_multiplier: number;
}

export interface MembershipBenefit {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Membership {
  tier: MembershipTier;
  name: string;
  price: number; // Monthly price in USD
  color: string; // For UI theming
  icon: string;
  tagline: string;
  
  // Training Limits
  limits: TrainingLimits;
  
  // Available Facilities
  facilities: FacilityType[];
  
  // Available Training Types
  training_types: {
    basic: boolean;
    intermediate: boolean;
    advanced: boolean;
    master: boolean;
    legendary: boolean;
  };
  
  // Special Benefits
  benefits: MembershipBenefit[];
  
  // Skill Learning
  skill_access: {
    core_skills: boolean;
    archetype_skills: boolean;
    signature_skills: boolean;
    cross_character_skills: boolean; // Learn skills from other characters
  };
}

export const memberships: Record<MembershipTier, Membership> = {
  free: {
    tier: 'free',
    name: 'Free Trainer',
    price: 0,
    color: 'gray',
    icon: '🏃',
    tagline: 'Start your journey',
    
    limits: {
      daily_training_sessions: 3,
      daily_energy_refills: 1,
      skill_learning_sessions: 0,
      xp_multiplier: 1.0,
      stat_gain_multiplier: 1.0,
      training_point_multiplier: 0.5
    },
    
    facilities: ['community'],
    
    training_types: {
      basic: true,
      intermediate: false,
      advanced: false,
      master: false,
      legendary: false
    },
    
    benefits: [
      {
        id: 'basic_training',
        name: 'Basic Training',
        description: '3 training sessions per day',
        icon: '💪'
      },
      {
        id: 'energy_recovery',
        name: 'Energy Recovery',
        description: '1 free energy refill daily',
        icon: '⚡'
      },
      {
        id: 'core_skills_preview',
        name: 'Core Skills Preview',
        description: 'View (but not learn) core skills',
        icon: '👁️'
      }
    ],
    
    skill_access: {
      core_skills: false,
      archetype_skills: false,
      signature_skills: false,
      cross_character_skills: false
    }
  },
  
  premium: {
    tier: 'premium',
    name: 'Premium Gym Pass',
    price: 7.99,
    color: 'purple',
    icon: '🏆',
    tagline: 'Master your potential',
    
    limits: {
      daily_training_sessions: 'unlimited',
      daily_energy_refills: 'unlimited',
      skill_learning_sessions: 7,
      xp_multiplier: 2.0,
      stat_gain_multiplier: 1.5,
      training_point_multiplier: 2.0
    },
    
    facilities: ['community', 'bronze', 'elite'],
    
    training_types: {
      basic: true,
      intermediate: true,
      advanced: true,
      master: true,
      legendary: false
    },
    
    benefits: [
      {
        id: 'unlimited_training',
        name: 'Unlimited Training',
        description: 'Train as much as you want',
        icon: '♾️'
      },
      {
        id: 'daily_skills',
        name: 'Daily Skill Learning',
        description: 'Learn new skills every day',
        icon: '🎯'
      },
      {
        id: 'double_xp',
        name: 'Double XP',
        description: '2x XP from all activities',
        icon: '💫'
      },
      {
        id: 'ai_coach',
        name: 'AI Personal Trainer',
        description: 'Get personalized training tips',
        icon: '🤖'
      },
      {
        id: 'elite_facilities',
        name: 'Elite Academy Access',
        description: 'Train in state-of-the-art facilities',
        icon: '🏛️'
      }
    ],
    
    skill_access: {
      core_skills: true,
      archetype_skills: true,
      signature_skills: true,
      cross_character_skills: false
    }
  },
  
  legendary: {
    tier: 'legendary',
    name: 'Legendary',
    price: 14.99,
    color: 'gold',
    icon: '⚜️',
    tagline: 'Access to Legendary Dojo',
    
    limits: {
      daily_training_sessions: 'unlimited',
      daily_energy_refills: 'unlimited',
      skill_learning_sessions: 999,
      xp_multiplier: 3.0,
      stat_gain_multiplier: 2.0,
      training_point_multiplier: 3.0
    },
    
    facilities: ['community', 'bronze', 'elite', 'legendary'],
    
    training_types: {
      basic: true,
      intermediate: true,
      advanced: true,
      master: true,
      legendary: true
    },
    
    benefits: [
      {
        id: 'legendary_training',
        name: 'Legendary Training',
        description: 'Access to mythical techniques',
        icon: '🌟'
      },
      {
        id: 'unlimited_skills',
        name: 'Unlimited Skill Learning',
        description: 'Learn as many skills as you want',
        icon: '🧠'
      },
      {
        id: 'triple_xp',
        name: 'Triple XP',
        description: '3x XP from all activities',
        icon: '🚀'
      },
      {
        id: 'cross_training',
        name: 'Cross-Character Training',
        description: 'Learn skills from other characters',
        icon: '🔄'
      },
      {
        id: 'legendary_dojo',
        name: 'Legendary Dojo',
        description: 'Train where legends are born',
        icon: '🏯'
      },
      {
        id: 'priority_features',
        name: 'Priority Access',
        description: 'Early access to new features',
        icon: '👑'
      }
    ],
    
    skill_access: {
      core_skills: true,
      archetype_skills: true,
      signature_skills: true,
      cross_character_skills: true
    }
  }
};

// Training Facilities
export interface TrainingFacility {
  type: FacilityType;
  name: string;
  description: string;
  icon: string;
  
  // Bonuses
  xp_bonus: number;
  stat_bonus: number;
  energy_costReduction: number;
  
  // Environment
  crowd_level: 'empty' | 'moderate' | 'crowded';
  equipment: 'basic' | 'standard' | 'advanced' | 'legendary';
  
  // Special Features
  features: string[];
}

export const facilities: Record<FacilityType, TrainingFacility> = {
  community: {
    type: 'community',
    name: 'Community Gym',
    description: 'A basic gym with essential equipment',
    icon: '🏋️',
    xp_bonus: 1.0,
    stat_bonus: 1.0,
    energy_costReduction: 0,
    crowd_level: 'crowded',
    equipment: 'basic',
    features: [
      'Basic weights and machines',
      'Limited hours (6AM - 10PM)',
      'Shared equipment',
      'Basic training programs'
    ]
  },
  
  bronze: {
    type: 'bronze',
    name: 'Bronze Fitness Center',
    description: 'A well-equipped fitness center',
    icon: '🏢',
    xp_bonus: 1.2,
    stat_bonus: 1.1,
    energy_costReduction: 0.1,
    crowd_level: 'moderate',
    equipment: 'standard',
    features: [
      'Modern equipment',
      'Extended hours (5AM - 11PM)',
      'Group classes available',
      'Personal locker included'
    ]
  },
  
  elite: {
    type: 'elite',
    name: 'Elite Training Academy',
    description: 'State-of-the-art training facility',
    icon: '🏛️',
    xp_bonus: 1.5,
    stat_bonus: 1.3,
    energy_costReduction: 0.2,
    crowd_level: 'empty',
    equipment: 'advanced',
    features: [
      'Cutting-edge technology',
      '24/7 access',
      'Personal trainers available',
      'Recovery spa included',
      'Nutrition bar'
    ]
  },
  
  legendary: {
    type: 'legendary',
    name: 'Legendary Dojo',
    description: 'Where myths and legends train',
    icon: '⛩️',
    xp_bonus: 2.0,
    stat_bonus: 1.5,
    energy_costReduction: 0.3,
    crowd_level: 'empty',
    equipment: 'legendary',
    features: [
      'Mystical training grounds',
      'Ancient artifacts and techniques',
      'Master instructors',
      'Dimensional training rooms',
      'Time dilation chambers',
      'Legendary weapon vault access'
    ]
  }
};

// Helper functions
export function can_access_facility(membershipTier: MembershipTier, facility_type: FacilityType): boolean {
  return memberships[membershipTier].facilities.includes(facility_type);
}

export function get_training_multipliers(membershipTier: MembershipTier, facility_type: FacilityType) {
  const membership = memberships[membershipTier];
  const facility = facilities[facility_type];

  return {
    xp: membership.limits.xp_multiplier * facility.xp_bonus,
    stat: membership.limits.stat_gain_multiplier * facility.stat_bonus,
    training_points: membership.limits.training_point_multiplier,
    energy_cost: 1 - facility.energy_costReduction
  };
}

export function get_daily_limits(membershipTier: MembershipTier) {
  return memberships[membershipTier].limits;
}