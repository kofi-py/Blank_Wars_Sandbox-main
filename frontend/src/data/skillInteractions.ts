// Skill Interaction System
// Core + Signature skill combinations for powerful synergy effects

export interface SkillInteraction {
  id: string;
  name: string;
  description: string;
  requirements: {
    core_skills: { skill: string; min_level: number }[];
    signature_skills: { skill: string; min_level: number }[];
    character?: string; // Character-specific interactions
    archetype?: string; // Archetype-specific interactions
  };
  effects: {
    type: 'combat' | 'utility' | 'passive' | 'social';
    bonuses: Record<string, number>;
    abilities?: string[];
    duration?: number; // For temporary effects
    cooldown?: number;
  };
  trigger_conditions: {
    combat_phase?: 'start' | 'during' | 'end';
    health_threshold?: number; // Trigger at certain health %
    enemy_condition?: string;
    environment?: string;
  };
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: string;
  visual_effect: string;
}

export interface ActiveInteraction {
  interaction_id: string;
  activated_at: Date;
  duration?: number;
  remaining_cooldown: number;
  bonuses: Record<string, number>;
}

export interface SkillSynergy {
  character_id: string;
  available_interactions: string[];
  active_interactions: ActiveInteraction[];
  mastered_interactions: string[]; // Unlocked through repeated use
  combo_count: number; // Total successful combinations
  last_updated: Date;
}

// Core Skill Interactions (Universal across all characters)
export const coreSkillInteractions: SkillInteraction[] = [
  {
    id: 'combat_survival_synergy',
    name: 'Battle Hardened',
    description: 'Combat experience enhances survival instincts, reducing damage taken',
    requirements: {
      core_skills: [
        { skill: 'combat', min_level: 25 },
        { skill: 'survival', min_level: 20 }
      ],
      signature_skills: []
    },
    effects: {
      type: 'passive',
      bonuses: {
        damage_reduction: 15,
        status_resistance: 20
      }
    },
    trigger_conditions: {},
    rarity: 'common',
    icon: '🛡️',
    visual_effect: 'defensive_aura'
  },

  {
    id: 'mental_social_synergy',
    name: 'Tactical Leadership',
    description: 'Mental prowess combined with social skills allows commanding allies effectively',
    requirements: {
      core_skills: [
        { skill: 'mental', min_level: 30 },
        { skill: 'social', min_level: 25 }
      ],
      signature_skills: []
    },
    effects: {
      type: 'utility',
      bonuses: {
        team_attack_bonus: 25,
        team_defense_bonus: 15
      },
      duration: 300 // 5 minutes
    },
    trigger_conditions: {
      combat_phase: 'start'
    },
    rarity: 'uncommon',
    icon: '👑',
    visual_effect: 'leadership_aura'
  },

  {
    id: 'spiritual_mental_synergy',
    name: 'Inner Focus',
    description: 'Spiritual awareness enhances mental clarity, boosting mana regeneration and spell power',
    requirements: {
      core_skills: [
        { skill: 'spiritual', min_level: 20 },
        { skill: 'mental', min_level: 25 }
      ],
      signature_skills: []
    },
    effects: {
      type: 'passive',
      bonuses: {
        mana_regeneration: 50,
        spell_power: 20,
        critical_chance: 10
      }
    },
    trigger_conditions: {},
    rarity: 'uncommon',
    icon: '🧘',
    visual_effect: 'meditation_glow'
  },

  {
    id: 'combat_mental_synergy',
    name: 'Strategic Warrior',
    description: 'Combining combat skill with mental acuity for precise strikes',
    requirements: {
      core_skills: [
        { skill: 'combat', min_level: 35 },
        { skill: 'mental', min_level: 30 }
      ],
      signature_skills: []
    },
    effects: {
      type: 'combat',
      bonuses: {
        critical_chance: 25,
        accuracy: 20,
        critical_damage: 40
      }
    },
    trigger_conditions: {
      combat_phase: 'during'
    },
    rarity: 'rare',
    icon: '🎯',
    visual_effect: 'precision_strikes'
  },

  {
    id: 'survival_spiritual_synergy',
    name: 'Primal Instinct',
    description: 'Survival skills enhanced by spiritual connection to nature',
    requirements: {
      core_skills: [
        { skill: 'survival', min_level: 30 },
        { skill: 'spiritual', min_level: 25 }
      ],
      signature_skills: []
    },
    effects: {
      type: 'utility',
      bonuses: {
        health_regeneration: 100,
        poison_resistance: 80,
        environmental_damage_reduction: 50
      }
    },
    trigger_conditions: {
      health_threshold: 50
    },
    rarity: 'rare',
    icon: '🌿',
    visual_effect: 'nature_regeneration'
  }
];

// Character-Specific Signature Interactions
export const signatureInteractions: SkillInteraction[] = [
  // Achilles Interactions
  {
    id: 'achilles_wrath_combat',
    name: 'Legendary Fury',
    description: 'Achilles\' wrath combined with supreme combat skill unleashes devastating attacks',
    requirements: {
      core_skills: [{ skill: 'combat', min_level: 40 }],
      signature_skills: [{ skill: 'divine_wrath', min_level: 15 }],
      character: 'achilles'
    },
    effects: {
      type: 'combat',
      bonuses: {
        attack_power: 100,
        critical_chance: 50,
        speed: 30
      },
      duration: 30,
      cooldown: 180
    },
    trigger_conditions: {
      health_threshold: 30
    },
    rarity: 'legendary',
    icon: '⚡',
    visual_effect: 'fury_explosion'
  },

  {
    id: 'achilles_honor_social',
    name: 'Hero\'s Inspiration',
    description: 'Achilles\' honor and charisma inspire allies to fight harder',
    requirements: {
      core_skills: [{ skill: 'social', min_level: 25 }],
      signature_skills: [{ skill: 'heroic_presence', min_level: 10 }],
      character: 'achilles'
    },
    effects: {
      type: 'utility',
      bonuses: {
        team_morale: 75,
        team_damage: 35,
        team_critical_chance: 20
      },
      duration: 120
    },
    trigger_conditions: {
      combat_phase: 'start'
    },
    rarity: 'epic',
    icon: '🏆',
    visual_effect: 'heroic_aura'
  },

  // Merlin Interactions
  {
    id: 'merlin_arcane_mental',
    name: 'Arcane Mastery',
    description: 'Merlin\'s vast mental capacity unlocks the deepest secrets of magic',
    requirements: {
      core_skills: [{ skill: 'mental', min_level: 45 }],
      signature_skills: [{ skill: 'ancient_knowledge', min_level: 20 }],
      character: 'merlin'
    },
    effects: {
      type: 'combat',
      bonuses: {
        spell_power: 150,
        mana_efficiency: 50,
        spell_critical_chance: 40
      },
      abilities: ['reality_warp', 'time_distortion']
    },
    trigger_conditions: {},
    rarity: 'legendary',
    icon: '🌟',
    visual_effect: 'arcane_storm'
  },

  {
    id: 'merlin_wisdom_spiritual',
    name: 'Cosmic Awareness',
    description: 'Merlin\'s wisdom combined with spiritual enlightenment reveals hidden truths',
    requirements: {
      core_skills: [{ skill: 'spiritual', min_level: 35 }],
      signature_skills: [{ skill: 'prophetic_sight', min_level: 15 }],
      character: 'merlin'
    },
    effects: {
      type: 'utility',
      bonuses: {
        experience_gain: 100,
        enemy_weakness_detection: 100,
        future_event_prediction: 80
      }
    },
    trigger_conditions: {},
    rarity: 'epic',
    icon: '👁️',
    visual_effect: 'cosmic_sight'
  },

  // Loki Interactions
  {
    id: 'loki_trickery_social',
    name: 'Master Manipulator',
    description: 'Loki\'s trickery enhanced by social mastery allows controlling enemy actions',
    requirements: {
      core_skills: [{ skill: 'social', min_level: 40 }],
      signature_skills: [{ skill: 'shapeshifting', min_level: 20 }],
      character: 'loki'
    },
    effects: {
      type: 'combat',
      bonuses: {
        enemy_confusion: 80,
        illusion_power: 100,
        mind_control_chance: 30
      },
      duration: 45,
      cooldown: 120
    },
    trigger_conditions: {
      combat_phase: 'during'
    },
    rarity: 'legendary',
    icon: '🎭',
    visual_effect: 'reality_distortion'
  },

  {
    id: 'loki_chaos_mental',
    name: 'Chaotic Genius',
    description: 'Loki\'s chaotic nature combined with sharp intellect creates unpredictable advantages',
    requirements: {
      core_skills: [{ skill: 'mental', min_level: 35 }],
      signature_skills: [{ skill: 'chaos_magic', min_level: 15 }],
      character: 'loki'
    },
    effects: {
      type: 'utility',
      bonuses: {
        random_bonus_chance: 50,
        adaptability: 100,
        surprise_attack_damage: 200
      }
    },
    trigger_conditions: {},
    rarity: 'epic',
    icon: '🌀',
    visual_effect: 'chaos_swirl'
  },

  // Fenrir Interactions
  {
    id: 'fenrir_hunt_survival',
    name: 'Alpha Predator',
    description: 'Fenrir\'s hunting instincts combined with supreme survival skills',
    requirements: {
      core_skills: [{ skill: 'survival', min_level: 40 }],
      signature_skills: [{ skill: 'pack_leader', min_level: 20 }],
      character: 'fenrir'
    },
    effects: {
      type: 'combat',
      bonuses: {
        attack_speed: 75,
        critical_chance: 60,
        bleed_damage: 100,
        pack_damage_bonus: 150
      },
      abilities: ['blood_frenzy', 'pack_coordination']
    },
    trigger_conditions: {
      enemy_condition: 'wounded'
    },
    rarity: 'legendary',
    icon: '🐺',
    visual_effect: 'primal_hunt'
  },

  {
    id: 'fenrir_rage_combat',
    name: 'Berserker\'s Fury',
    description: 'Fenrir\'s primal rage amplifies combat prowess beyond mortal limits',
    requirements: {
      core_skills: [{ skill: 'combat', min_level: 35 }],
      signature_skills: [{ skill: 'primal_rage', min_level: 15 }],
      character: 'fenrir'
    },
    effects: {
      type: 'combat',
      bonuses: {
        damage_output: 200,
        damage_reduction: -50, // Takes more damage
        speed: 100,
        fear_resistance: 100
      },
      duration: 60,
      cooldown: 300
    },
    trigger_conditions: {
      health_threshold: 25
    },
    rarity: 'epic',
    icon: '💥',
    visual_effect: 'berserker_aura'
  },

  // Cleopatra Interactions
  {
    id: 'cleopatra_diplomacy_mental',
    name: 'Political Mastermind',
    description: 'Cleopatra\'s diplomatic skills enhanced by strategic thinking',
    requirements: {
      core_skills: [{ skill: 'mental', min_level: 40 }],
      signature_skills: [{ skill: 'royal_authority', min_level: 18 }],
      character: 'cleopatra'
    },
    effects: {
      type: 'utility',
      bonuses: {
        enemy_recruitment_chance: 25,
        ally_loyalty: 100,
        resource_generation: 75
      }
    },
    trigger_conditions: {},
    rarity: 'epic',
    icon: '👑',
    visual_effect: 'royal_influence'
  },

  {
    id: 'cleopatra_mysticism_spiritual',
    name: 'Divine Pharaoh',
    description: 'Cleopatra\'s connection to Egyptian gods grants divine powers',
    requirements: {
      core_skills: [{ skill: 'spiritual', min_level: 35 }],
      signature_skills: [{ skill: 'divine_connection', min_level: 20 }],
      character: 'cleopatra'
    },
    effects: {
      type: 'combat',
      bonuses: {
        divine_protection: 50,
        curse_immunity: 100,
        healing_power: 100,
        mana_amplification: 75
      },
      abilities: ['divine_blessing', 'pharaoh_curse']
    },
    trigger_conditions: {},
    rarity: 'legendary',
    icon: '☥',
    visual_effect: 'divine_radiance'
  }
];

// Archetype-Based Interactions
export const archetypeInteractions: SkillInteraction[] = [
  {
    id: 'warrior_archetype_synergy',
    name: 'Warrior\'s Discipline',
    description: 'All warrior archetypes can combine combat and mental skills for superior battlefield control',
    requirements: {
      core_skills: [
        { skill: 'combat', min_level: 30 },
        { skill: 'mental', min_level: 20 }
      ],
      signature_skills: [],
      archetype: 'warrior'
    },
    effects: {
      type: 'passive',
      bonuses: {
        accuracy: 25,
        tactical_awareness: 50,
        leadership: 30
      }
    },
    trigger_conditions: {},
    rarity: 'uncommon',
    icon: '⚔️',
    visual_effect: 'warrior_focus'
  },

  {
    id: 'mage_archetype_synergy',
    name: 'Arcane Intellect',
    description: 'Mage archetypes excel at combining mental and spiritual skills for enhanced magic',
    requirements: {
      core_skills: [
        { skill: 'mental', min_level: 35 },
        { skill: 'spiritual', min_level: 30 }
      ],
      signature_skills: [],
      archetype: 'mage'
    },
    effects: {
      type: 'passive',
      bonuses: {
        spell_power: 50,
        mana_regeneration: 75,
        magical_resistance: 40
      }
    },
    trigger_conditions: {},
    rarity: 'uncommon',
    icon: '🔮',
    visual_effect: 'arcane_enhancement'
  },

  {
    id: 'trickster_archetype_synergy',
    name: 'Cunning Adaptability',
    description: 'Trickster archetypes combine social and mental skills for unpredictable advantages',
    requirements: {
      core_skills: [
        { skill: 'social', min_level: 30 },
        { skill: 'mental', min_level: 25 }
      ],
      signature_skills: [],
      archetype: 'trickster'
    },
    effects: {
      type: 'utility',
      bonuses: {
        deception: 60,
        adaptability: 80,
        critical_thinking: 40
      }
    },
    trigger_conditions: {},
    rarity: 'uncommon',
    icon: '🎭',
    visual_effect: 'trickster_shimmer'
  },

  {
    id: 'beast_archetype_synergy',
    name: 'Primal Instincts',
    description: 'Beast archetypes naturally combine combat and survival skills',
    requirements: {
      core_skills: [
        { skill: 'combat', min_level: 25 },
        { skill: 'survival', min_level: 35 }
      ],
      signature_skills: [],
      archetype: 'beast'
    },
    effects: {
      type: 'passive',
      bonuses: {
        tracking: 100,
        environmental_adaptation: 75,
        pack_coordination: 50
      }
    },
    trigger_conditions: {},
    rarity: 'uncommon',
    icon: '🐺',
    visual_effect: 'primal_connection'
  },

  {
    id: 'mystic_archetype_synergy',
    name: 'Divine Wisdom',
    description: 'Mystic archetypes excel at spiritual and social skill combinations',
    requirements: {
      core_skills: [
        { skill: 'spiritual', min_level: 40 },
        { skill: 'social', min_level: 30 }
      ],
      signature_skills: [],
      archetype: 'mystic'
    },
    effects: {
      type: 'utility',
      bonuses: {
        divine_insight: 80,
        prophecy: 60,
        spiritual_leadership: 70
      }
    },
    trigger_conditions: {},
    rarity: 'rare',
    icon: '👁️‍🗨️',
    visual_effect: 'divine_aura'
  }
];

// Skill Interaction Management Functions
export function getAvailableInteractions(
  character_id: string,
  archetype: string,
  core_skills: Record<string, { level: number }>,
  signature_skills: Record<string, { level: number }>
): SkillInteraction[] {
  const allInteractions = [
    ...coreSkillInteractions,
    ...signatureInteractions,
    ...archetypeInteractions
  ];

  return allInteractions.filter(interaction => {
    // Check character requirement
    if (interaction.requirements.character && interaction.requirements.character !== character_id) {
      return false;
    }

    // Check archetype requirement
    if (interaction.requirements.archetype && interaction.requirements.archetype !== archetype) {
      return false;
    }

    // Check core skill requirements
    for (const requirement of interaction.requirements.core_skills) {
      const skill = core_skills[requirement.skill];
      if (!skill || skill.level < requirement.min_level) {
        return false;
      }
    }

    // Check signature skill requirements
    for (const requirement of interaction.requirements.signature_skills) {
      const skill = signature_skills[requirement.skill];
      if (!skill || skill.level < requirement.min_level) {
        return false;
      }
    }

    return true;
  });
}

export function activateInteraction(
  synergy: SkillSynergy,
  interaction_id: string
): { success: boolean; updated_synergy: SkillSynergy; error?: string } {
  const interaction = [...coreSkillInteractions, ...signatureInteractions, ...archetypeInteractions]
    .find(i => i.id === interaction_id);

  if (!interaction) {
    return {
      success: false,
      updated_synergy: synergy,
      error: 'Interaction not found'
    };
  }

  // Check if interaction is on cooldown
  const activeInteraction = synergy.active_interactions.find(ai => ai.interaction_id === interaction_id);
  if (activeInteraction && activeInteraction.remaining_cooldown > 0) {
    return {
      success: false,
      updated_synergy: synergy,
      error: 'Interaction is on cooldown'
    };
  }

  const now = new Date();
  const newActiveInteraction: ActiveInteraction = {
    interaction_id,
    activated_at: now,
    duration: interaction.effects.duration,
    remaining_cooldown: interaction.effects.cooldown || 0,
    bonuses: interaction.effects.bonuses
  };

  const updated_synergy: SkillSynergy = {
    ...synergy,
    active_interactions: [...synergy.active_interactions.filter(ai => ai.interaction_id !== interaction_id), newActiveInteraction],
    combo_count: synergy.combo_count + 1,
    last_updated: now
  };

  // Add to mastered interactions if used enough times
  const usageCount = synergy.combo_count + 1;
  if (usageCount >= 10 && !synergy.mastered_interactions.includes(interaction_id)) {
    updated_synergy.mastered_interactions = [...synergy.mastered_interactions, interaction_id];
  }

  return {
    success: true,
    updated_synergy
  };
}

export function updateInteractionCooldowns(synergy: SkillSynergy, delta_time_seconds: number): SkillSynergy {
  const updatedActiveInteractions = synergy.active_interactions
    .map(interaction => ({
      ...interaction,
      remaining_cooldown: Math.max(0, interaction.remaining_cooldown - delta_time_seconds)
    }))
    .filter(interaction => {
      // Remove expired duration-based interactions
      if (interaction.duration) {
        const elapsedTime = (Date.now() - interaction.activated_at.getTime()) / 1000;
        return elapsedTime < interaction.duration;
      }
      return true;
    });

  return {
    ...synergy,
    active_interactions: updatedActiveInteractions,
    last_updated: new Date()
  };
}

export function calculateCombinedBonuses(activeInteractions: ActiveInteraction[]): Record<string, number> {
  const combinedBonuses: Record<string, number> = {};

  for (const interaction of activeInteractions) {
    for (const [bonus, value] of Object.entries(interaction.bonuses)) {
      combinedBonuses[bonus] = (combinedBonuses[bonus] || 0) + value;
    }
  }

  return combinedBonuses;
}

// Demo data
export function createDemoSkillSynergy(character_id: string): SkillSynergy {
  return {
    character_id,
    available_interactions: [],
    active_interactions: [],
    mastered_interactions: [],
    combo_count: 0,
    last_updated: new Date()
  };
}