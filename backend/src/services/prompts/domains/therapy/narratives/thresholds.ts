/**
 * Therapy Intensity Thresholds
 * Defines scoring thresholds and reward/penalty multipliers per intensity level
 */

export interface IntensityThresholds {
  success_floor: number;      // Minimum score for success (scores above this get positive rewards)
  failure_ceiling: number;    // Maximum score before failure (scores below this get penalties)
  success_multiplier: number; // Multiplier for rewards at this intensity
  failure_multiplier: number; // Multiplier for penalties at this intensity
}

/**
 * Intensity thresholds determine how hard it is to succeed/fail
 * and how much rewards/penalties are modified by intensity choice
 */
export const INTENSITY_THRESHOLDS: Record<'soft' | 'medium' | 'hard', IntensityThresholds> = {
  soft: {
    success_floor: 40,        // Easy to succeed
    failure_ceiling: 20,      // Hard to fail
    success_multiplier: 0.8,  // Lower rewards (safe choice)
    failure_multiplier: 0.5,  // Lower penalties (safe choice)
  },
  medium: {
    success_floor: 50,        // Standard threshold
    failure_ceiling: 35,      // Standard threshold
    success_multiplier: 1.0,  // Standard rewards
    failure_multiplier: 1.0,  // Standard penalties
  },
  hard: {
    success_floor: 65,        // Hard to succeed
    failure_ceiling: 50,      // Easy to fail (larger failure zone)
    success_multiplier: 1.5,  // Higher rewards (risk/reward)
    failure_multiplier: 1.5,  // Higher penalties (risk/reward)
  },
};

/**
 * Reward ranges for each stat type
 * Success values are positive, failure values are negative (1/3 of success)
 */
export const REWARD_RANGES = {
  experience: {
    success_min: 50,
    success_max: 200,
    failure_min: -17,   // -50/3 rounded
    failure_max: -67,   // -200/3 rounded
  },
  current_mental_health: {
    success_min: 5,
    success_max: 25,
    failure_min: -2,
    failure_max: -8,
  },
  current_morale: {
    success_min: 5,
    success_max: 20,
    failure_min: -2,
    failure_max: -7,
  },
  current_confidence: {
    success_min: 5,
    success_max: 15,
    failure_min: -2,
    failure_max: -5,
  },
  current_stress: {
    // For stress, success means REDUCTION (negative), failure means INCREASE (positive)
    success_min: -20,   // Best case: reduce stress by 20
    success_max: -5,    // Minimum success: reduce by 5
    failure_min: 5,     // Minimum failure: increase by 5
    failure_max: 15,    // Worst case: increase stress by 15
  },
  bond_level: {
    success_min: 5,
    success_max: 30,
    failure_min: -2,
    failure_max: -10,
  },
  current_team_player: {
    success_min: 5,
    success_max: 15,
    failure_min: -2,
    failure_max: -5,
  },
  current_communication: {
    success_min: 5,
    success_max: 15,
    failure_min: -2,
    failure_max: -5,
  },
};

/**
 * Returns prose describing the session difficulty and thresholds
 */
export function getThresholdProse(intensity: 'soft' | 'medium' | 'hard'): string {
  const thresholds = INTENSITY_THRESHOLDS[intensity];
  if (!thresholds) {
    throw new Error(`STRICT MODE: Unknown intensity "${intensity}". Valid: soft, medium, hard`);
  }

  const riskLevel = intensity === 'soft' ? 'LOW RISK' : intensity === 'medium' ? 'BALANCED RISK' : 'HIGH RISK';

  return `## SESSION DIFFICULTY: ${intensity.toUpperCase()} (${riskLevel})

SCORING THRESHOLDS:
- Success requires scores ABOVE ${thresholds.success_floor}
- Failure occurs with scores BELOW ${thresholds.failure_ceiling}
- Scores between ${thresholds.failure_ceiling} and ${thresholds.success_floor} are neutral (minimal change)

REWARD/PENALTY MODIFIERS:
- Successes multiplied by ${thresholds.success_multiplier}x
- Failures multiplied by ${thresholds.failure_multiplier}x

${intensity === 'soft' ? 'Safe approach - lower stakes, lower rewards.' :
  intensity === 'medium' ? 'Standard approach - balanced risk and reward.' :
  'Aggressive approach - higher stakes, higher potential gains and losses.'}`;
}

/**
 * Returns the reward range prose for judges to use when scoring
 */
export function getRewardRangesProse(): string {
  return `## STAT REWARD/PENALTY RANGES

For SUCCESSFUL performance (scores above threshold):
- Experience: +${REWARD_RANGES.experience.success_min} to +${REWARD_RANGES.experience.success_max}
- Mental Health: +${REWARD_RANGES.current_mental_health.success_min} to +${REWARD_RANGES.current_mental_health.success_max}
- Morale: +${REWARD_RANGES.current_morale.success_min} to +${REWARD_RANGES.current_morale.success_max}
- Confidence: +${REWARD_RANGES.current_confidence.success_min} to +${REWARD_RANGES.current_confidence.success_max}
- Stress: ${REWARD_RANGES.current_stress.success_min} to ${REWARD_RANGES.current_stress.success_max} (negative = reduction)
- Bond Level: +${REWARD_RANGES.bond_level.success_min} to +${REWARD_RANGES.bond_level.success_max}
- Team Player: +${REWARD_RANGES.current_team_player.success_min} to +${REWARD_RANGES.current_team_player.success_max}
- Communication: +${REWARD_RANGES.current_communication.success_min} to +${REWARD_RANGES.current_communication.success_max}

For FAILED performance (scores below threshold):
- Experience: ${REWARD_RANGES.experience.failure_min} to ${REWARD_RANGES.experience.failure_max}
- Mental Health: ${REWARD_RANGES.current_mental_health.failure_min} to ${REWARD_RANGES.current_mental_health.failure_max}
- Morale: ${REWARD_RANGES.current_morale.failure_min} to ${REWARD_RANGES.current_morale.failure_max}
- Confidence: ${REWARD_RANGES.current_confidence.failure_min} to ${REWARD_RANGES.current_confidence.failure_max}
- Stress: +${REWARD_RANGES.current_stress.failure_min} to +${REWARD_RANGES.current_stress.failure_max} (positive = increase)
- Bond Level: ${REWARD_RANGES.bond_level.failure_min} to ${REWARD_RANGES.bond_level.failure_max}
- Team Player: ${REWARD_RANGES.current_team_player.failure_min} to ${REWARD_RANGES.current_team_player.failure_max}
- Communication: ${REWARD_RANGES.current_communication.failure_min} to ${REWARD_RANGES.current_communication.failure_max}

IMPORTANT: Failures are worth approximately 1/3 of successes. Poor sessions have real consequences.`;
}
