export interface Facility {
  id: string;
  name: string;
  category: 'training' | 'recovery' | 'support' | 'premium';
  description: string;
  benefits: string[];
  bonuses: {
    type: 'stat' | 'training' | 'recovery' | 'chemistry' | 'battle';
    value: number;
    description: string;
  }[];
  cost: { coins: number; gems: number };
  unlock_requirements: {
    team_level?: number;
    achievements?: string[];
    prerequisite_facilities?: string[];
  };
  maintenance_cost?: { coins: number; gems: number };
  icon: string;
  background_color: string;
  text_color: string;
  max_level: number;
  upgrade_costs: { coins: number; gems: number }[];
}

export const FACILITIES: Facility[] = [
  // Training Facilities
  {
    id: 'gym',
    name: 'Training Gym',
    category: 'training',
    description: 'A fully equipped gym with weights, cardio equipment, and training areas for building physical strength and endurance.',
    benefits: [
      '+15% Strength XP gain',
      '+10% Vitality XP gain',
      'Reduces training fatigue by 20%',
      'Unlocks advanced strength training sessions'
    ],
    bonuses: [
      { type: 'training', value: 15, description: '+15% Strength XP' },
      { type: 'training', value: 10, description: '+10% Vitality XP' },
      { type: 'recovery', value: 20, description: '-20% Training Fatigue' }
    ],
    cost: { coins: 8000, gems: 15 },
    unlock_requirements: {
      team_level: 5
    },
    maintenance_cost: { coins: 200, gems: 0 },
    icon: '🏋️',
    background_color: 'bg-red-900/20',
    text_color: 'text-red-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 12000, gems: 20 },
      { coins: 18000, gems: 30 }
    ]
  },
  {
    id: 'combat_dojo',
    name: 'Combat Dojo',
    category: 'training',
    description: 'A traditional martial arts dojo with training dummies, weapons racks, and sparring areas for honing combat skills.',
    benefits: [
      '+20% Combat skill XP gain',
      '+15% Agility XP gain',
      'Unlocks advanced combat techniques',
      '+5% critical hit chance in battles'
    ],
    bonuses: [
      { type: 'training', value: 20, description: '+20% Combat XP' },
      { type: 'training', value: 15, description: '+15% Agility XP' },
      { type: 'battle', value: 5, description: '+5% Crit Chance' }
    ],
    cost: { coins: 10000, gems: 20 },
    unlock_requirements: {
      team_level: 8,
      prerequisite_facilities: ['gym']
    },
    maintenance_cost: { coins: 250, gems: 0 },
    icon: '🥋',
    background_color: 'bg-orange-900/20',
    text_color: 'text-orange-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 15000, gems: 25 },
      { coins: 22000, gems: 35 }
    ]
  },
  {
    id: 'strategy_room',
    name: 'Strategy Room',
    category: 'training',
    description: 'A quiet room with tactical boards, maps, and analysis tools for developing strategic thinking and battle planning.',
    benefits: [
      '+25% Intelligence XP gain',
      '+20% Wisdom XP gain',
      'Team formations become 15% more effective',
      'Unlocks advanced battle strategies'
    ],
    bonuses: [
      { type: 'training', value: 25, description: '+25% Intelligence XP' },
      { type: 'training', value: 20, description: '+20% Wisdom XP' },
      { type: 'battle', value: 15, description: '+15% Formation Effectiveness' }
    ],
    cost: { coins: 12000, gems: 25 },
    unlock_requirements: {
      team_level: 10
    },
    maintenance_cost: { coins: 300, gems: 0 },
    icon: '🧠',
    background_color: 'bg-blue-900/20',
    text_color: 'text-blue-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 18000, gems: 30 },
      { coins: 25000, gems: 40 }
    ]
  },
  {
    id: 'psychology_lab',
    name: 'Psychology Lab',
    category: 'training',
    description: 'A research facility for understanding character psychology, improving team dynamics, and mental conditioning.',
    benefits: [
      '+30% Charisma XP gain',
      '+25% Mental skill XP gain',
      'Team chemistry improves 20% faster',
      'Reduces psychological stress by 25%'
    ],
    bonuses: [
      { type: 'training', value: 30, description: '+30% Charisma XP' },
      { type: 'training', value: 25, description: '+25% Mental XP' },
      { type: 'chemistry', value: 20, description: '+20% Chemistry Growth' },
      { type: 'recovery', value: 25, description: '-25% Stress' }
    ],
    cost: { coins: 15000, gems: 35 },
    unlock_requirements: {
      team_level: 12,
      achievements: ['team_harmony']
    },
    maintenance_cost: { coins: 400, gems: 0 },
    icon: '🧪',
    background_color: 'bg-purple-900/20',
    text_color: 'text-purple-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 20000, gems: 45 },
      { coins: 30000, gems: 60 }
    ]
  },

  // Recovery Facilities
  {
    id: 'medical_bay',
    name: 'Medical Bay',
    category: 'recovery',
    description: 'A fully equipped medical facility with healing equipment, first aid supplies, and recovery beds.',
    benefits: [
      'Characters recover 50% faster from injuries',
      '+25% health regeneration rate',
      'Reduces downtime between training sessions',
      'Prevents training injuries'
    ],
    bonuses: [
      { type: 'recovery', value: 50, description: '+50% Injury Recovery' },
      { type: 'recovery', value: 25, description: '+25% Health Regen' },
      { type: 'recovery', value: 30, description: '-30% Training Downtime' }
    ],
    cost: { coins: 9000, gems: 18 },
    unlock_requirements: {
      team_level: 6
    },
    maintenance_cost: { coins: 300, gems: 0 },
    icon: '🏥',
    background_color: 'bg-green-900/20',
    text_color: 'text-green-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 13000, gems: 25 },
      { coins: 19000, gems: 35 }
    ]
  },
  {
    id: 'spa',
    name: 'Recovery Spa',
    category: 'recovery',
    description: 'A luxurious spa with hot tubs, massage tables, and relaxation areas for mental and physical recovery.',
    benefits: [
      'Reduces stress by 40%',
      '+30% energy regeneration',
      'Improves team morale',
      'Characters start training sessions with bonus energy'
    ],
    bonuses: [
      { type: 'recovery', value: 40, description: '-40% Stress' },
      { type: 'recovery', value: 30, description: '+30% Energy Regen' },
      { type: 'chemistry', value: 15, description: '+15% Team Morale' }
    ],
    cost: { coins: 11000, gems: 22 },
    unlock_requirements: {
      team_level: 9,
      prerequisite_facilities: ['medical_bay']
    },
    maintenance_cost: { coins: 350, gems: 0 },
    icon: '🛁',
    background_color: 'bg-cyan-900/20',
    text_color: 'text-cyan-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 16000, gems: 30 },
      { coins: 24000, gems: 45 }
    ]
  },
  {
    id: 'meditation_garden',
    name: 'Meditation Garden',
    category: 'recovery',
    description: 'A peaceful garden with zen elements, meditation spots, and natural healing areas for spiritual recovery.',
    benefits: [
      '+35% Wisdom XP gain',
      '+40% mental health recovery',
      'Reduces team conflicts by 50%',
      'Unlocks meditation training sessions'
    ],
    bonuses: [
      { type: 'training', value: 35, description: '+35% Wisdom XP' },
      { type: 'recovery', value: 40, description: '+40% Mental Health' },
      { type: 'chemistry', value: 50, description: '-50% Team Conflicts' }
    ],
    cost: { coins: 13000, gems: 28 },
    unlock_requirements: {
      team_level: 11,
      achievements: ['inner_peace']
    },
    maintenance_cost: { coins: 200, gems: 0 },
    icon: '🌸',
    background_color: 'bg-pink-900/20',
    text_color: 'text-pink-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 18000, gems: 35 },
      { coins: 26000, gems: 50 }
    ]
  },

  // Support Facilities
  {
    id: 'kitchen_upgrade',
    name: 'Professional Kitchen',
    category: 'support',
    description: 'An upgraded kitchen with professional equipment, nutrition planning, and meal preparation areas.',
    benefits: [
      '+20% training efficiency from better nutrition',
      'Characters maintain energy longer',
      'Improves team bonding during meals',
      'Unlocks cooking team activities'
    ],
    bonuses: [
      { type: 'training', value: 20, description: '+20% Training Efficiency' },
      { type: 'recovery', value: 25, description: '+25% Energy Duration' },
      { type: 'chemistry', value: 30, description: '+30% Meal Bonding' }
    ],
    cost: { coins: 7000, gems: 12 },
    unlock_requirements: {
      team_level: 4
    },
    maintenance_cost: { coins: 150, gems: 0 },
    icon: '👨‍🍳',
    background_color: 'bg-yellow-900/20',
    text_color: 'text-yellow-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 10000, gems: 18 },
      { coins: 15000, gems: 25 }
    ]
  },
  {
    id: 'equipment_workshop',
    name: 'Equipment Workshop',
    category: 'support',
    description: 'A workshop for maintaining, upgrading, and crafting equipment with advanced tools and materials.',
    benefits: [
      'Equipment durability increased by 40%',
      'Unlock equipment crafting',
      '25% discount on equipment purchases',
      'Equipment bonuses increased by 10%'
    ],
    bonuses: [
      { type: 'stat', value: 40, description: '+40% Equipment Durability' },
      { type: 'stat', value: 25, description: '-25% Equipment Costs' },
      { type: 'stat', value: 10, description: '+10% Equipment Bonuses' }
    ],
    cost: { coins: 14000, gems: 30 },
    unlock_requirements: {
      team_level: 13,
      achievements: ['equipment_master']
    },
    maintenance_cost: { coins: 400, gems: 0 },
    icon: '🔧',
    background_color: 'bg-gray-900/20',
    text_color: 'text-gray-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 20000, gems: 40 },
      { coins: 28000, gems: 55 }
    ]
  },
  {
    id: 'analytics_center',
    name: 'Analytics Center',
    category: 'support',
    description: 'A data analysis center with computers, statistical software, and performance tracking systems.',
    benefits: [
      'Detailed performance analytics for all characters',
      '+30% XP gain from optimized training',
      'Predicts optimal team compositions',
      'Tracks long-term character development'
    ],
    bonuses: [
      { type: 'training', value: 30, description: '+30% XP from Analytics' },
      { type: 'battle', value: 20, description: '+20% Team Optimization' },
      { type: 'stat', value: 25, description: '+25% Development Tracking' }
    ],
    cost: { coins: 16000, gems: 35 },
    unlock_requirements: {
      team_level: 15,
      prerequisite_facilities: ['strategy_room']
    },
    maintenance_cost: { coins: 500, gems: 0 },
    icon: '📊',
    background_color: 'bg-indigo-900/20',
    text_color: 'text-indigo-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 22000, gems: 45 },
      { coins: 32000, gems: 65 }
    ]
  },

  // Premium Facilities
  {
    id: 'vr_training_suite',
    name: 'VR Training Suite',
    category: 'premium',
    description: 'A cutting-edge virtual reality training facility with immersive simulations and advanced scenarios.',
    benefits: [
      '+50% training efficiency in all skills',
      'Unlock VR-exclusive training scenarios',
      'Safe practice of dangerous techniques',
      'Accelerated skill development'
    ],
    bonuses: [
      { type: 'training', value: 50, description: '+50% All Training Efficiency' },
      { type: 'training', value: 40, description: '+40% Skill Development' },
      { type: 'stat', value: 30, description: '+30% Technique Mastery' }
    ],
    cost: { coins: 25000, gems: 60 },
    unlock_requirements: {
      team_level: 18,
      achievements: ['tech_pioneer'],
      prerequisite_facilities: ['analytics_center']
    },
    maintenance_cost: { coins: 800, gems: 2 },
    icon: '🥽',
    background_color: 'bg-violet-900/20',
    text_color: 'text-violet-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 35000, gems: 80 },
      { coins: 50000, gems: 120 }
    ]
  },
  {
    id: 'hyperbaric_chamber',
    name: 'Hyperbaric Chamber',
    category: 'premium',
    description: 'An advanced medical facility using pressurized oxygen to accelerate healing and enhance recovery.',
    benefits: [
      'Characters recover from all conditions 75% faster',
      '+60% health and energy regeneration',
      'Prevents long-term injury complications',
      'Enhances physical performance limits'
    ],
    bonuses: [
      { type: 'recovery', value: 75, description: '+75% Recovery Speed' },
      { type: 'recovery', value: 60, description: '+60% Health & Energy Regen' },
      { type: 'stat', value: 15, description: '+15% Performance Limits' }
    ],
    cost: { coins: 30000, gems: 75 },
    unlock_requirements: {
      team_level: 20,
      achievements: ['medical_excellence'],
      prerequisite_facilities: ['medical_bay', 'spa']
    },
    maintenance_cost: { coins: 1000, gems: 3 },
    icon: '🫧',
    background_color: 'bg-teal-900/20',
    text_color: 'text-teal-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 40000, gems: 100 },
      { coins: 60000, gems: 150 }
    ]
  },
  {
    id: 'performance_lab',
    name: 'Performance Lab',
    category: 'premium',
    description: 'An elite scientific facility for optimizing every aspect of character performance and potential.',
    benefits: [
      'Unlock character genetic optimization',
      '+40% stat growth rates',
      'Precise performance tuning',
      'Breakthrough training methods'
    ],
    bonuses: [
      { type: 'stat', value: 40, description: '+40% Stat Growth' },
      { type: 'training', value: 35, description: '+35% Training Effectiveness' },
      { type: 'stat', value: 25, description: '+25% Performance Optimization' }
    ],
    cost: { coins: 35000, gems: 85 },
    unlock_requirements: {
      team_level: 22,
      achievements: ['performance_master'],
      prerequisite_facilities: ['psychology_lab', 'vr_training_suite']
    },
    maintenance_cost: { coins: 1200, gems: 4 },
    icon: '🧬',
    background_color: 'bg-emerald-900/20',
    text_color: 'text-emerald-300',
    max_level: 3,
    upgrade_costs: [
      { coins: 45000, gems: 110 },
      { coins: 65000, gems: 160 }
    ]
  }
];

export interface FacilityState {
  id: string;
  level: number;
  purchase_date: Date;
  maintenance_paid: boolean;
  bonuses_active: boolean;
}

export const calculateFacilityBonus = (facility: Facility, level: number): number => {
  const baseBonus = facility.bonuses.reduce((sum, bonus) => sum + bonus.value, 0);
  return baseBonus * (1 + (level - 1) * 0.5); // 50% increase per level
};

export const getFacilityUpgradeCost = (facility: Facility, current_level: number): { coins: number; gems: number } => {
  if (current_level >= facility.max_level) {
    return { coins: 0, gems: 0 };
  }
  return facility.upgrade_costs[current_level - 1];
};

export const canUnlockFacility = (
  facility: Facility,
  team_level: number,
  unlocked_achievements: string[],
  owned_facilities: string[]
): boolean => {
  const { team_level: required_level, achievements, prerequisite_facilities } = facility.unlock_requirements;
  
  if (required_level && team_level < required_level) return false;
  if (achievements && !achievements.every(achievement => unlocked_achievements.includes(achievement))) return false;
  if (prerequisite_facilities && !prerequisite_facilities.every(facility => owned_facilities.includes(facility))) return false;
  
  return true;
};