// Skill System Data Structure for _____ Wars

export type SkillCategory = 'core' | 'archetype' | 'signature';
export type SkillType = 'combat' | 'survival' | 'mental' | 'offense' | 'defense' | 'utility' | 'divine' | 'legendary';
export type EffectType = 'damage' | 'heal' | 'buff' | 'debuff' | 'special';
export type Archetype = 'warrior' | 'mage' | 'trickster' | 'leader' | 'scholar' | 'beast' | 'detective';

// Character ID type for better type safety
export type CharacterId = 'achilles' | 'merlin' | 'sun_tzu' | 'robin_hood' | 'cleopatra' | 'tesla' | 'cthulhu' | string;

export interface SkillEffect {
  type: EffectType;
  target: 'self' | 'opponent' | 'all';
  value: number;
  duration?: number; // in turns
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  type: SkillType;
  icon: string; // emoji or icon component name
  
  // Requirements
  requirements: {
    level: number;
    previous_skill?: string; // skill id
    archetype?: Archetype[];
    training_cost: number; // how many training sessions to learn
  };
  
  // Battle Effects
  effects: SkillEffect[];
  cooldown: number; // turns
  energy_cost: number;
  
  // Progression
  max_level: number;
  current_level?: number;
  learned?: boolean;
  training_progress?: number; // 0-100%
}

// Universal Core Skills - Available to ALL characters
export const core_skills: Skill[] = [
  // Combat Branch
  {
    id: 'power_strike',
    name: 'Power Strike',
    description: 'Channel your strength for a devastating blow',
    category: 'core',
    type: 'combat',
    icon: '💥',
    requirements: {
      level: 1,
      training_cost: 3
    },
    effects: [{
      type: 'damage',
      target: 'opponent',
      value: 1.2, // 20% damage boost
      description: '+20% damage on next attack'
    }],
    cooldown: 2,
    energy_cost: 15,
    max_level: 5
  },
  {
    id: 'defensive_stance',
    name: 'Defensive Stance',
    description: 'Adopt a protective posture to reduce incoming damage',
    category: 'core',
    type: 'combat',
    icon: '🛡️',
    requirements: {
      level: 3,
      training_cost: 4
    },
    effects: [{
      type: 'buff',
      target: 'self',
      value: 0.7, // 30% damage reduction
      duration: 3,
      description: 'Take 30% less damage for 3 turns'
    }],
    cooldown: 4,
    energy_cost: 20,
    max_level: 5
  },
  {
    id: 'quick_recovery',
    name: 'Quick Recovery',
    description: 'Catch your breath and restore energy',
    category: 'core',
    type: 'combat',
    icon: '⚡',
    requirements: {
      level: 5,
      previous_skill: 'power_strike',
      training_cost: 5
    },
    effects: [{
      type: 'special',
      target: 'self',
      value: 25,
      description: 'Restore 25% energy'
    }],
    cooldown: 3,
    energy_cost: 0,
    max_level: 3
  },
  {
    id: 'battle_focus',
    name: 'Battle Focus',
    description: 'Sharpen your mind for precise strikes',
    category: 'core',
    type: 'combat',
    icon: '🎯',
    requirements: {
      level: 8,
      previous_skill: 'defensive_stance',
      training_cost: 6
    },
    effects: [{
      type: 'buff',
      target: 'self',
      value: 1.15,
      duration: 3,
      description: '+15% accuracy and critical chance for 3 turns'
    }],
    cooldown: 5,
    energy_cost: 25,
    max_level: 4
  },
  
  // Survival Branch
  {
    id: 'second_wind',
    name: 'Second Wind',
    description: 'Find inner strength when pushed to your limits',
    category: 'core',
    type: 'survival',
    icon: '💨',
    requirements: {
      level: 10,
      training_cost: 8
    },
    effects: [{
      type: 'heal',
      target: 'self',
      value: 0.3,
      description: 'Heal 30% HP when below 25% health'
    }],
    cooldown: 999, // Once per battle
    energy_cost: 0,
    max_level: 3
  },
  {
    id: 'endurance',
    name: 'Endurance',
    description: 'Years of training have increased your max energy',
    category: 'core',
    type: 'survival',
    icon: '💪',
    requirements: {
      level: 12,
      training_cost: 10
    },
    effects: [{
      type: 'buff',
      target: 'self',
      value: 1.25,
      description: '+25% max energy (passive)'
    }],
    cooldown: 0, // Passive
    energy_cost: 0,
    max_level: 5
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Mental fortitude protects against negative effects',
    category: 'core',
    type: 'survival',
    icon: '🧠',
    requirements: {
      level: 15,
      previous_skill: 'endurance',
      training_cost: 12
    },
    effects: [{
      type: 'buff',
      target: 'self',
      value: 0.5,
      duration: 5,
      description: '50% chance to resist debuffs for 5 turns'
    }],
    cooldown: 6,
    energy_cost: 30,
    max_level: 3
  },
  
  // Mental Branch
  {
    id: 'strategy',
    name: 'Strategy',
    description: 'Read your opponent\'s patterns',
    category: 'core',
    type: 'mental',
    icon: '♟️',
    requirements: {
      level: 7,
      training_cost: 6
    },
    effects: [{
      type: 'special',
      target: 'self',
      value: 1,
      description: 'See opponent\'s next move type (Attack/Defense/Special)'
    }],
    cooldown: 4,
    energy_cost: 20,
    max_level: 3
  },
  {
    id: 'intimidate',
    name: 'Intimidate',
    description: 'Unnerve your opponent with your presence',
    category: 'core',
    type: 'mental',
    icon: '😤',
    requirements: {
      level: 9,
      training_cost: 7
    },
    effects: [{
      type: 'debuff',
      target: 'opponent',
      value: 0.85,
      duration: 3,
      description: 'Reduce opponent damage by 15% for 3 turns'
    }],
    cooldown: 5,
    energy_cost: 25,
    max_level: 4
  },
  {
    id: 'focus_training',
    name: 'Focus Training',
    description: 'Enhanced learning from training sessions',
    category: 'core',
    type: 'mental',
    icon: '📚',
    requirements: {
      level: 20,
      previous_skill: 'strategy',
      training_cost: 15
    },
    effects: [{
      type: 'special',
      target: 'self',
      value: 2,
      description: 'Double XP from next training session'
    }],
    cooldown: 0, // Out of battle
    energy_cost: 0,
    max_level: 5
  }
];

// Archetype Skills - Shared by character type
export const archetype_skills: Record<Archetype, Skill[]> = {
  warrior: [
    {
      id: 'weapon_mastery',
      name: 'Weapon Mastery',
      description: 'Expert handling of martial weapons',
      category: 'archetype',
      type: 'offense',
      icon: '⚔️',
      requirements: {
        level: 5,
        archetype: ['warrior'],
        training_cost: 5
      },
      effects: [{
        type: 'buff',
        target: 'self',
        value: 1.1,
        description: '+10% damage with all attacks (passive)'
      }],
      cooldown: 0,
      energy_cost: 0,
      max_level: 5
    },
    {
      id: 'shield_wall',
      name: 'Shield Wall',
      description: 'Form an impenetrable defense',
      category: 'archetype',
      type: 'defense',
      icon: '🛡️',
      requirements: {
        level: 10,
        archetype: ['warrior'],
        previous_skill: 'weapon_mastery',
        training_cost: 8
      },
      effects: [{
        type: 'buff',
        target: 'self',
        value: 0.5,
        duration: 2,
        description: 'Take 50% less damage for 2 turns, but can\'t attack'
      }],
      cooldown: 6,
      energy_cost: 35,
      max_level: 3
    },
    {
      id: 'berserker_rage',
      name: 'Berserker Rage',
      description: 'Trade defense for overwhelming offense',
      category: 'archetype',
      type: 'offense',
      icon: '🔥',
      requirements: {
        level: 15,
        archetype: ['warrior'],
        previous_skill: 'shield_wall',
        training_cost: 12
      },
      effects: [
        {
          type: 'buff',
          target: 'self',
          value: 1.5,
          duration: 3,
          description: '+50% damage for 3 turns'
        },
        {
          type: 'debuff',
          target: 'self',
          value: 1.3,
          duration: 3,
          description: 'Take 30% more damage for 3 turns'
        }
      ],
      cooldown: 8,
      energy_cost: 40,
      max_level: 3
    }
  ],
  
  mage: [
    {
      id: 'mana_shield',
      name: 'Mana Shield',
      description: 'Convert magical energy into protection',
      category: 'archetype',
      type: 'defense',
      icon: '🔮',
      requirements: {
        level: 5,
        archetype: ['mage'],
        training_cost: 5
      },
      effects: [{
        type: 'special',
        target: 'self',
        value: 1,
        description: 'Convert 20 energy to block next attack'
      }],
      cooldown: 3,
      energy_cost: 20,
      max_level: 5
    },
    {
      id: 'elemental_mastery',
      name: 'Elemental Mastery',
      description: 'Command over fire, ice, and lightning',
      category: 'archetype',
      type: 'offense',
      icon: '🌟',
      requirements: {
        level: 10,
        archetype: ['mage'],
        previous_skill: 'mana_shield',
        training_cost: 10
      },
      effects: [{
        type: 'damage',
        target: 'opponent',
        value: 1.3,
        description: 'Random element attack with +30% damage and status effect'
      }],
      cooldown: 4,
      energy_cost: 30,
      max_level: 4
    },
    {
      id: 'spell_echo',
      name: 'Spell Echo',
      description: 'Your spells resonate with magical power',
      category: 'archetype',
      type: 'utility',
      icon: '📿',
      requirements: {
        level: 18,
        archetype: ['mage'],
        previous_skill: 'elemental_mastery',
        training_cost: 15
      },
      effects: [{
        type: 'special',
        target: 'self',
        value: 0.3,
        duration: 1,
        description: '30% chance to cast spells twice'
      }],
      cooldown: 7,
      energy_cost: 45,
      max_level: 3
    }
  ],
  
  trickster: [
    {
      id: 'smoke_bomb',
      name: 'Smoke Bomb',
      description: 'Vanish in a cloud of smoke',
      category: 'archetype',
      type: 'utility',
      icon: '💨',
      requirements: {
        level: 5,
        archetype: ['trickster'],
        training_cost: 4
      },
      effects: [{
        type: 'buff',
        target: 'self',
        value: 0.75,
        duration: 2,
        description: '75% dodge chance for 2 turns'
      }],
      cooldown: 5,
      energy_cost: 25,
      max_level: 4
    },
    {
      id: 'poison_dart',
      name: 'Poison Dart',
      description: 'A subtle strike with lasting consequences',
      category: 'archetype',
      type: 'offense',
      icon: '🎯',
      requirements: {
        level: 8,
        archetype: ['trickster'],
        training_cost: 6
      },
      effects: [{
        type: 'debuff',
        target: 'opponent',
        value: 0.1,
        duration: 5,
        description: 'Deal 10% max HP as poison damage over 5 turns'
      }],
      cooldown: 4,
      energy_cost: 20,
      max_level: 5
    },
    {
      id: 'shadow_clone',
      name: 'Shadow Clone',
      description: 'Create a deceptive duplicate',
      category: 'archetype',
      type: 'utility',
      icon: '👥',
      requirements: {
        level: 16,
        archetype: ['trickster'],
        previous_skill: 'smoke_bomb',
        training_cost: 14
      },
      effects: [{
        type: 'special',
        target: 'self',
        value: 1,
        duration: 3,
        description: '50% chance attacks hit clone instead for 3 turns'
      }],
      cooldown: 8,
      energy_cost: 40,
      max_level: 3
    }
  ],
  
  leader: [
    {
      id: 'rally_cry',
      name: 'Rally Cry',
      description: 'Inspire yourself with a battle shout',
      category: 'archetype',
      type: 'utility',
      icon: '📢',
      requirements: {
        level: 5,
        archetype: ['leader'],
        training_cost: 5
      },
      effects: [{
        type: 'buff',
        target: 'self',
        value: 1.2,
        duration: 3,
        description: '+20% to all stats for 3 turns'
      }],
      cooldown: 6,
      energy_cost: 30,
      max_level: 4
    },
    {
      id: 'tactical_genius',
      name: 'Tactical Genius',
      description: 'Outmaneuver your opponent with superior strategy',
      category: 'archetype',
      type: 'mental',
      icon: '🧩',
      requirements: {
        level: 12,
        archetype: ['leader'],
        previous_skill: 'rally_cry',
        training_cost: 10
      },
      effects: [{
        type: 'special',
        target: 'self',
        value: 1,
        description: 'Next 2 attacks are guaranteed critical hits'
      }],
      cooldown: 7,
      energy_cost: 35,
      max_level: 3
    }
  ],
  
  scholar: [
    {
      id: 'knowledge_is_power',
      name: 'Knowledge is Power',
      description: 'Convert intellect into strength',
      category: 'archetype',
      type: 'mental',
      icon: '📖',
      requirements: {
        level: 5,
        archetype: ['scholar'],
        training_cost: 6
      },
      effects: [{
        type: 'buff',
        target: 'self',
        value: 1.15,
        description: '+15% damage based on opponent\'s weaknesses'
      }],
      cooldown: 4,
      energy_cost: 20,
      max_level: 5
    }
  ],
  
  beast: [
    {
      id: 'primal_fury',
      name: 'Primal Fury',
      description: 'Unleash your inner beast',
      category: 'archetype',
      type: 'offense',
      icon: '🐾',
      requirements: {
        level: 5,
        archetype: ['beast'],
        training_cost: 5
      },
      effects: [{
        type: 'damage',
        target: 'opponent',
        value: 1.4,
        description: 'Wild attack with +40% damage but 20% miss chance'
      }],
      cooldown: 3,
      energy_cost: 25,
      max_level: 5
    }
  ],

  detective: [
    {
      id: 'deduction',
      name: 'Deductive Reasoning',
      description: 'Analyze opponent weaknesses and exploit them',
      category: 'archetype',
      type: 'utility',
      icon: '🔍',
      requirements: {
        level: 5,
        archetype: ['detective'],
        training_cost: 5
      },
      effects: [{
        type: 'buff',
        target: 'self',
        value: 1.2,
        description: 'Reveals opponent stats and increases critical chance by 20%'
      }],
      cooldown: 4,
      energy_cost: 20,
      max_level: 5
    }
  ]
};

// Character Signature Skills - Unique to specific characters
export const signature_skills: Record<string, Skill[]> = {
  achilles: [
    {
      id: 'achilles_heel_weakness',
      name: "Heel's Weakness",
      description: 'Risk your vulnerability for devastating power',
      category: 'signature',
      type: 'legendary',
      icon: '🦶',
      requirements: {
        level: 20,
        training_cost: 20
      },
      effects: [
        {
          type: 'damage',
          target: 'opponent',
          value: 2.0,
          description: 'Deal double damage'
        },
        {
          type: 'debuff',
          target: 'self',
          value: 2.0,
          duration: 2,
          description: 'Take double damage for 2 turns'
        }
      ],
      cooldown: 10,
      energy_cost: 50,
      max_level: 1
    },
    {
      id: 'divine_protection',
      name: 'Divine Protection',
      description: 'The gods shield you from harm',
      category: 'signature',
      type: 'divine',
      icon: '✨',
      requirements: {
        level: 15,
        training_cost: 15
      },
      effects: [{
        type: 'special',
        target: 'self',
        value: 999,
        duration: 1,
        description: 'Become invulnerable for 1 turn'
      }],
      cooldown: 999, // Once per battle
      energy_cost: 60,
      max_level: 1
    },
    {
      id: 'trojan_slayer',
      name: 'Trojan Slayer',
      description: 'Your legendary combat prowess shines',
      category: 'signature',
      type: 'offense',
      icon: '🏛️',
      requirements: {
        level: 10,
        training_cost: 12
      },
      effects: [{
        type: 'damage',
        target: 'opponent',
        value: 1.5,
        description: '+50% damage vs opponents with higher HP'
      }],
      cooldown: 5,
      energy_cost: 35,
      max_level: 3
    }
  ],
  
  merlin: [
    {
      id: 'time_stop',
      name: 'Time Stop',
      description: 'Freeze the flow of time itself',
      category: 'signature',
      type: 'legendary',
      icon: '⏰',
      requirements: {
        level: 25,
        training_cost: 25
      },
      effects: [{
        type: 'special',
        target: 'opponent',
        value: 2,
        description: 'Skip opponent\'s next 2 turns'
      }],
      cooldown: 999,
      energy_cost: 80,
      max_level: 1
    },
    {
      id: 'future_sight',
      name: 'Future Sight',
      description: 'Peer into the threads of fate',
      category: 'signature',
      type: 'divine',
      icon: '🔮',
      requirements: {
        level: 15,
        training_cost: 18
      },
      effects: [{
        type: 'special',
        target: 'self',
        value: 999,
        description: 'See all opponent moves for rest of battle'
      }],
      cooldown: 999,
      energy_cost: 50,
      max_level: 1
    },
    {
      id: 'metamorphosis',
      name: 'Metamorphosis',
      description: 'Transform into any form',
      category: 'signature',
      type: 'utility',
      icon: '🦋',
      requirements: {
        level: 20,
        training_cost: 20
      },
      effects: [{
        type: 'special',
        target: 'self',
        value: 1,
        description: 'Copy opponent\'s archetype and one skill'
      }],
      cooldown: 10,
      energy_cost: 60,
      max_level: 1
    }
  ],
  
  // Add more character signature skills as needed
};