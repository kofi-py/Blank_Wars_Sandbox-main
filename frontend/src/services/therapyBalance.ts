// Therapy Game Balance Configuration
// Keep all tunable constants here for easy designer adjustments

export const THERAPY_BALANCE = {
  // Stage progression thresholds
  STAGE_THRESHOLDS: {
    resistance: {
      min_messages: 5,
      defensive_ratio: 1.0 // defensiveMoments > deepThoughtsShared
    },
    breakthrough: {
      min_breakthroughs: 1,
      min_vulnerability: 25
    },
    mastery: {
      min_breakthrough_streak: 5,
      min_breakthroughs: 3,
      min_vulnerability: 50
    }
  },

  // Point calculation multipliers
  SCORING: {
    emotional_depth: {
      base: 3,
      multiplier: 2,
      max: 10
    },
    vulnerability: {
      base: 2, 
      multiplier: 2,
      max: 10
    },
    insight: {
      base: 1,
      multiplier: 2.5,
      max: 10
    },
    defensive: {
      base: 1,
      multiplier: 1.5,
      max: 10
    },
    empathy: {
      base: 1,
      multiplier: 2,
      max: 10
    }
  },

  // Progress gain per message
  PROGRESS_GAIN: {
    max_per_message: 25,
    emotional_weight: 2,
    vulnerability_weight: 2,
    insight_weight: 3,
    defensive_penalty: 1
  },

  // Point rewards
  POINT_REWARDS: {
    insight_threshold: 7,
    insight_multiplier: 2,
    vulnerability_threshold: 6,
    empathy_threshold: 6,
    breakthrough_bonus: 25
  },

  // Achievement thresholds
  ACHIEVEMENTS: {
    first_breakthrough: 1,
    vulnerability_master: 50,
    breakthrough_streak: 5,
    empathy_champion: 100,
    insight_collector: 200
  },

  // Anti-exploit limits
  ANTI_EXPLOIT: {
    max_points_per_message: 100,
    cooldown_ms: 2000, // 2 seconds between messages
    max_same_word_repeats: 3, // prevent spamming "understand understand understand"
    max_messages_per_minute: 10
  },

  // Session rewards
  SESSION_REWARDS: {
    base_mental_health: 15,
    mental_healthDivisor: 10, // insightPoints / 10
    breakthrough_xp_multiplier: 25,
    vulnerability_bond_threshold: 20,
    vulnerability_bond_reward: 2
  }
} as const;

export type TherapyBalance = typeof THERAPY_BALANCE;