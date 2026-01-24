/**
 * Training Facilities Data
 * Defines facility tiers, capacities, bonuses, and trainer slots
 */

// All trainable stats from CombatPackage and PsychologicalPackage
export const TRAINABLE_STATS = [
  // Combat stats
  'current_health',
  'current_max_health',
  'current_energy',
  'current_max_energy',
  'current_mana',
  'current_max_mana',
  'current_attack',
  'current_defense',
  'current_speed',
  'current_dexterity',
  'current_intelligence',
  'current_wisdom',
  'current_spirit',
  'current_magic_attack',
  'current_magic_defense',
  'current_initiative',
  'current_fire_resistance',
  'current_cold_resistance',
  'current_lightning_resistance',
  'current_toxic_resistance',
  // Psychological stats
  'current_mental_health',
  'current_stress',
  'current_morale',
  'current_fatigue',
  'current_confidence',
  'current_ego',
  'current_team_player',
  'coach_trust_level',
] as const;

export type TrainableStat = typeof TRAINABLE_STATS[number];

export interface TrainingFacility {
  id: string;
  name: string;
  description: string;
  // Requirements
  headquarters_tier_required: string;
  currency_cost_per_session: number;  // Per 2hr session
  premium_cost_per_session: number;
  // Capacity
  max_contestants_per_session: number;
  max_trainers: number;
  // Base bonuses (before trainer bonuses)
  xp_multiplier: number;           // 1.0 = normal, 1.5 = 50% more XP
  stat_improvement_chance: number; // Base % chance for stat gains
  injury_risk_modifier: number;    // 1.0 = normal, 0.8 = 20% less injury risk
  // Equipment available at this tier
  equipment_available: string[];
}

export interface Trainer {
  id: string;
  character_id: string;  // Links to characters table
  name: string;
  specialty: TrainerSpecialty;
  description: string;
  // Bonuses this trainer provides
  xp_bonus: number;                    // Added to facility multiplier
  specialty_stat_bonus: number;        // Extra % chance for specialty stat
  specialty_stats: TrainableStat[];    // Which stats get the bonus
  injury_prevention_bonus: number;     // Reduces injury risk further
  // Stacking - diminishing returns when multiple trainers
  stacking_efficiency: number;         // 1.0 = full bonus, 0.7 = 70% when stacked
}

export type TrainerSpecialty =
  | 'strength'      // Attack, raw power
  | 'defense'       // Defense, durability
  | 'speed'         // Speed, agility
  | 'technique'     // Intelligence, precision
  | 'endurance'     // Health, stamina
  | 'mental'        // Wisdom, focus, stress management
  | 'general';      // All-around, no specialty bonus

export const TRAINING_FACILITIES: TrainingFacility[] = [
  {
    id: 'dirt_lot',
    name: 'Dirt Lot',
    description: 'An empty lot with rocks for weights and a patch of dirt for sparring. Better than nothing, barely.',
    headquarters_tier_required: 'your_parents_basement',
    currency_cost_per_session: 0,
    premium_cost_per_session: 0,
    max_contestants_per_session: 2,
    max_trainers: 0,  // No trainer slots - self-training only
    xp_multiplier: 0.5,
    stat_improvement_chance: 5,
    injury_risk_modifier: 1.5,  // 50% MORE injuries
    equipment_available: ['rocks', 'sticks', 'dirt'],
  },
  {
    id: 'basement_gym',
    name: 'Basement Gym',
    description: 'A cramped basement with rusty weights, a worn punching bag, and questionable electrical wiring.',
    headquarters_tier_required: 'spartan_apartment',
    currency_cost_per_session: 25,
    premium_cost_per_session: 0,
    max_contestants_per_session: 3,
    max_trainers: 1,
    xp_multiplier: 0.75,
    stat_improvement_chance: 8,
    injury_risk_modifier: 1.2,
    equipment_available: ['rusty_weights', 'punching_bag', 'jump_rope', 'pull_up_bar'],
  },
  {
    id: 'community_gym',
    name: 'Community Gym',
    description: 'A public gym with standard equipment. Crowded, but functional. You might have to wait for the squat rack.',
    headquarters_tier_required: 'basic_house',
    currency_cost_per_session: 50,
    premium_cost_per_session: 0,
    max_contestants_per_session: 5,
    max_trainers: 1,
    xp_multiplier: 1.0,
    stat_improvement_chance: 10,
    injury_risk_modifier: 1.0,
    equipment_available: ['weight_machines', 'free_weights', 'treadmills', 'sparring_ring', 'mirrors'],
  },
  {
    id: 'pro_training_center',
    name: 'Pro Training Center',
    description: 'A professional facility with multiple rings, quality equipment, and actual coaches who know what they\'re doing.',
    headquarters_tier_required: 'condo',
    currency_cost_per_session: 100,
    premium_cost_per_session: 1,
    max_contestants_per_session: 8,
    max_trainers: 2,
    xp_multiplier: 1.25,
    stat_improvement_chance: 15,
    injury_risk_modifier: 0.9,
    equipment_available: ['olympic_weights', 'multiple_rings', 'speed_bags', 'heavy_bags', 'agility_ladders', 'recovery_room'],
  },
  {
    id: 'elite_combat_academy',
    name: 'Elite Combat Academy',
    description: 'State-of-the-art training complex with AI-assisted coaching, biomechanical analysis, and holographic sparring partners.',
    headquarters_tier_required: 'mansion',
    currency_cost_per_session: 200,
    premium_cost_per_session: 2,
    max_contestants_per_session: 12,
    max_trainers: 3,
    xp_multiplier: 1.5,
    stat_improvement_chance: 20,
    injury_risk_modifier: 0.75,
    equipment_available: ['ai_training_bots', 'holographic_opponents', 'biomech_sensors', 'cryo_chambers', 'hyperbaric_recovery'],
  },
  {
    id: 'champions_fortress',
    name: 'Champion\'s Fortress',
    description: 'An exclusive facility reserved for elite fighters. Personal training suites, zero distractions, maximum results.',
    headquarters_tier_required: 'compound',
    currency_cost_per_session: 400,
    premium_cost_per_session: 5,
    max_contestants_per_session: 6,  // Exclusive = smaller groups
    max_trainers: 4,
    xp_multiplier: 1.75,
    stat_improvement_chance: 25,
    injury_risk_modifier: 0.6,
    equipment_available: ['personal_training_suite', 'opponent_simulation_chamber', 'neural_feedback_system', 'instant_recovery_pods'],
  },
  {
    id: 'interdimensional_arena',
    name: 'Interdimensional Arena',
    description: 'Reality-bending training grounds where time flows differently. Train for hours, age minutes. Fight impossible opponents.',
    headquarters_tier_required: 'moon_base',
    currency_cost_per_session: 1000,
    premium_cost_per_session: 10,
    max_contestants_per_session: 20,
    max_trainers: 5,
    xp_multiplier: 2.5,
    stat_improvement_chance: 35,
    injury_risk_modifier: 0.5,
    equipment_available: ['temporal_training_loops', 'reality_warping_arena', 'multiverse_opponents', 'instant_mastery_chambers', 'quantum_recovery'],
  },
];

export const TRAINERS: Trainer[] = [
  {
    id: 'argock',
    character_id: 'argock',
    name: 'Argock',
    specialty: 'general',
    description: 'Gruff orc drill sergeant. No specialty, but solid all-around training with brutal motivation.',
    xp_bonus: 0.15,
    specialty_stat_bonus: 0,  // General trainer - no specialty bonus
    specialty_stats: [],
    injury_prevention_bonus: 0,  // Pushes too hard
    stacking_efficiency: 1.0,
  },
  // Future trainers - specialty examples
  // {
  //   id: 'iron_mike',
  //   character_id: 'iron_mike',
  //   name: 'Iron Mike',
  //   specialty: 'strength',
  //   description: 'Former heavyweight champion. Turns weaklings into powerhouses.',
  //   xp_bonus: 0.1,
  //   specialty_stat_bonus: 15,  // +15% chance for attack stat gains
  //   specialty_stats: ['attack', 'base_attack'],
  //   injury_prevention_bonus: -0.1,  // Slightly increases injury risk (intense training)
  //   stacking_efficiency: 0.7,
  // },
  // {
  //   id: 'sensei_hiro',
  //   character_id: 'sensei_hiro',
  //   name: 'Sensei Hiro',
  //   specialty: 'technique',
  //   description: 'Ancient martial arts master. Precision over power.',
  //   xp_bonus: 0.1,
  //   specialty_stat_bonus: 15,
  //   specialty_stats: ['intelligence', 'speed'],
  //   injury_prevention_bonus: 0.15,  // Teaches proper form
  //   stacking_efficiency: 0.8,
  // },
];

/**
 * Calculate total training bonuses for a session
 */
export function calculateTrainingBonuses(
  facility: TrainingFacility,
  trainers: Trainer[]
): {
  total_xp_multiplier: number;
  total_stat_chance: number;
  total_injury_modifier: number;
  specialty_bonuses: Record<TrainableStat, number>;
} {
  let total_xp = facility.xp_multiplier;
  let total_stat = facility.stat_improvement_chance;
  let total_injury = facility.injury_risk_modifier;

  // Pre-initialize all stats to 0
  const specialty_bonuses: Record<TrainableStat, number> = {} as Record<TrainableStat, number>;
  for (const stat of TRAINABLE_STATS) {
    specialty_bonuses[stat] = 0;
  }

  // Apply trainer bonuses with stacking diminishing returns
  trainers.forEach((trainer, index) => {
    const stackingPenalty = index === 0 ? 1.0 : Math.pow(trainer.stacking_efficiency, index);

    total_xp += trainer.xp_bonus * stackingPenalty;
    total_injury -= trainer.injury_prevention_bonus * stackingPenalty;

    // Specialty stat bonuses
    for (const stat of trainer.specialty_stats) {
      specialty_bonuses[stat] += trainer.specialty_stat_bonus * stackingPenalty;
    }
  });

  return {
    total_xp_multiplier: total_xp,
    total_stat_chance: total_stat,
    total_injury_modifier: Math.max(0.1, total_injury),  // Minimum 10% of normal injury risk
    specialty_bonuses,
  };
}

/**
 * Get facility tier hierarchy for comparison
 */
export const FACILITY_TIER_HIERARCHY: Record<string, number> = {
  'dirt_lot': 0,
  'basement_gym': 1,
  'community_gym': 2,
  'pro_training_center': 3,
  'elite_combat_academy': 4,
  'champions_fortress': 5,
  'interdimensional_arena': 6,
};

/**
 * Get available facilities based on HQ tier
 */
export function getAvailableTrainingFacilities(hqTier: string): TrainingFacility[] {
  const HQ_TIER_HIERARCHY: Record<string, number> = {
    'your_parents_basement': 0,
    'radioactive_roach_motel': 0,
    'hobo_camp': 0,
    'spartan_apartment': 1,
    'basic_house': 2,
    'condo': 3,
    'mansion': 4,
    'compound': 5,
    'super_yacht': 6,
    'moon_base': 7,
  };

  const userTierLevel = HQ_TIER_HIERARCHY[hqTier];
  if (userTierLevel === undefined) {
    throw new Error(`STRICT MODE: Unknown HQ tier "${hqTier}"`);
  }

  return TRAINING_FACILITIES.filter(facility => {
    const requiredLevel = HQ_TIER_HIERARCHY[facility.headquarters_tier_required];
    if (requiredLevel === undefined) {
      throw new Error(`STRICT MODE: Unknown HQ tier requirement "${facility.headquarters_tier_required}" in facility "${facility.id}"`);
    }
    return requiredLevel <= userTierLevel;
  });
}
