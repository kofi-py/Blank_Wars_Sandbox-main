/**
 * PersonalProblemGeneratorService
 *
 * Generates contextually appropriate personal problems based on actual character data.
 * Returns structured problem context - the LLM generates the actual dialogue.
 *
 * STRICT MODE: Uses real data only, no random selection without context.
 */

import type { CharacterData, PersonalProblemContext, PersonalProblemCategory } from './prompts/types';

interface ProblemCandidate extends PersonalProblemContext {
  priority: number;
}

/** Priority band - problems within this range of the top priority are eligible for random selection */
const PRIORITY_BAND = 15;

/**
 * Generates a personal problem based on character's actual situation.
 * Returns structured context - the prompt/LLM generates dialogue.
 *
 * Uses priority band randomization: problems within PRIORITY_BAND points
 * of the highest priority are randomly selected. This prevents the same
 * problem from always being chosen for a character.
 */
export function generatePersonalProblem(data: CharacterData): PersonalProblemContext {
  const candidates: ProblemCandidate[] = [];

  candidates.push(...analyzeRelationshipProblems(data));
  candidates.push(...analyzeFinancialProblems(data));
  candidates.push(...analyzePsychologicalProblems(data));
  candidates.push(...analyzeLivingProblems(data));
  candidates.push(...analyzePerformanceProblems(data));

  if (candidates.length === 0) {
    return {
      category: 'existential_reflection',
      severity: 'minor',
      source: 'no_active_problems',
      details: {
        origin_era: data.IDENTITY.origin_era,
        total_battles: data.IDENTITY.total_battles || 0,
        current_morale: data.PSYCHOLOGICAL.current_morale,
      },
    };
  }

  // Sort by priority (highest first)
  candidates.sort((a, b) => b.priority - a.priority);

  // Find all candidates within PRIORITY_BAND of the top priority
  const topPriority = candidates[0].priority;
  const eligibleCandidates = candidates.filter(
    c => c.priority >= topPriority - PRIORITY_BAND
  );

  // Randomly select from eligible candidates
  const selectedIndex = Math.floor(Math.random() * eligibleCandidates.length);
  const { priority, ...problem } = eligibleCandidates[selectedIndex];
  return problem;
}

function analyzeRelationshipProblems(data: CharacterData): ProblemCandidate[] {
  const candidates: ProblemCandidate[] = [];
  const relationships = data.PSYCHOLOGICAL.relationships || [];

  for (const rel of relationships) {
    if (rel.rivalry > 50 && rel.affection < 30) {
      candidates.push({
        category: 'relationship_conflict',
        severity: rel.rivalry > 70 ? 'severe' : 'moderate',
        source: `rivalry_with_${rel.character_id}`,
        details: {
          other_character: rel.character_name,
          rivalry: rel.rivalry,
          affection: rel.affection,
          trust: rel.trust,
          shared_battles: rel.shared_battles,
        },
        priority: rel.rivalry,
      });
    }

    if (rel.trust < 20 && rel.shared_battles > 0) {
      candidates.push({
        category: 'trust_issues',
        severity: 'moderate',
        source: `distrust_of_${rel.character_id}`,
        details: {
          other_character: rel.character_name,
          trust: rel.trust,
          shared_battles: rel.shared_battles,
          affection: rel.affection,
        },
        priority: 50 - rel.trust,
      });
    }
  }

  return candidates;
}

function analyzeFinancialProblems(data: CharacterData): ProblemCandidate[] {
  const candidates: ProblemCandidate[] = [];
  const wallet = data.IDENTITY.wallet;
  const debt = data.IDENTITY.debt;
  const financialStress = data.PSYCHOLOGICAL.financial_stress;

  if (debt > wallet * 3 && debt > 0) {
    candidates.push({
      category: 'financial_crisis',
      severity: 'severe',
      source: 'debt_crisis',
      details: {
        wallet,
        debt,
        debt_to_wallet_ratio: wallet > 0 ? debt / wallet : null,
        financial_stress: financialStress,
      },
      priority: 85,
    });
  } else if (debt > wallet && debt > 0) {
    candidates.push({
      category: 'financial_pressure',
      severity: 'moderate',
      source: 'debt_pressure',
      details: {
        wallet,
        debt,
        financial_stress: financialStress,
      },
      priority: 60,
    });
  }

  if (financialStress > 70 && debt <= wallet) {
    candidates.push({
      category: 'financial_pressure',
      severity: financialStress > 85 ? 'severe' : 'moderate',
      source: 'financial_anxiety',
      details: {
        wallet,
        debt,
        financial_stress: financialStress,
      },
      priority: financialStress - 10,
    });
  }

  return candidates;
}

function analyzePsychologicalProblems(data: CharacterData): ProblemCandidate[] {
  const candidates: ProblemCandidate[] = [];
  const psych = data.PSYCHOLOGICAL;

  if (psych.current_mental_health < 40) {
    candidates.push({
      category: 'mental_health_struggle',
      severity: psych.current_mental_health < 25 ? 'severe' : 'moderate',
      source: 'low_mental_health',
      details: {
        mental_health: psych.current_mental_health,
        stress: psych.current_stress,
        morale: psych.current_morale,
        fatigue: psych.current_fatigue,
      },
      priority: 100 - psych.current_mental_health,
    });
  }

  if (psych.current_stress > 70) {
    candidates.push({
      category: 'overwhelming_stress',
      severity: psych.current_stress > 85 ? 'severe' : 'moderate',
      source: 'high_stress',
      details: {
        stress: psych.current_stress,
        fatigue: psych.current_fatigue,
        mental_health: psych.current_mental_health,
      },
      priority: psych.current_stress,
    });
  }

  if (psych.current_morale < 35) {
    candidates.push({
      category: 'lost_hope',
      severity: psych.current_morale < 20 ? 'severe' : 'moderate',
      source: 'low_morale',
      details: {
        morale: psych.current_morale,
        mental_health: psych.current_mental_health,
        confidence: psych.current_confidence,
      },
      priority: 100 - psych.current_morale,
    });
  }

  if (psych.coach_trust_level < 30) {
    candidates.push({
      category: 'coach_trust_issues',
      severity: 'moderate',
      source: 'low_coach_trust',
      details: {
        coach_trust: psych.coach_trust_level,
        bond_level: psych.bond_level,
      },
      priority: 55,
    });
  }

  if (psych.current_ego > 120) {
    candidates.push({
      category: 'ego_crisis',
      severity: 'minor',
      source: 'inflated_ego',
      details: {
        ego: psych.current_ego,
        confidence: psych.current_confidence,
      },
      priority: 35,
    });
  } else if (psych.current_ego < 25) {
    candidates.push({
      category: 'self_worth_crisis',
      severity: 'moderate',
      source: 'low_ego',
      details: {
        ego: psych.current_ego,
        confidence: psych.current_confidence,
        morale: psych.current_morale,
      },
      priority: 75 - psych.current_ego,
    });
  }

  if (psych.current_fatigue > 80) {
    candidates.push({
      category: 'burnout',
      severity: 'moderate',
      source: 'exhaustion',
      details: {
        fatigue: psych.current_fatigue,
        stress: psych.current_stress,
        mental_health: psych.current_mental_health,
      },
      priority: psych.current_fatigue - 20,
    });
  }

  return candidates;
}

function analyzeLivingProblems(data: CharacterData): ProblemCandidate[] {
  const candidates: ProblemCandidate[] = [];
  const sleepingArrangement = data.IDENTITY.sleeping_arrangement;
  const roommates = data.IDENTITY.roommates || [];
  const hqTier = data.IDENTITY.hq_tier;

  if (sleepingArrangement === 'floor') {
    candidates.push({
      category: 'living_conditions',
      severity: 'moderate',
      source: 'floor_sleeping',
      details: {
        sleeping_arrangement: sleepingArrangement,
        roommate_count: roommates.length,
        hq_tier: hqTier,
      },
      priority: 65,
    });
  } else if (sleepingArrangement === 'couch') {
    candidates.push({
      category: 'no_privacy',
      severity: 'moderate',
      source: 'couch_sleeping',
      details: {
        sleeping_arrangement: sleepingArrangement,
        roommate_count: roommates.length,
        hq_tier: hqTier,
      },
      priority: 55,
    });
  }

  if (roommates.length > 5) {
    candidates.push({
      category: 'overcrowding',
      severity: 'moderate',
      source: 'overcrowded_housing',
      details: {
        roommate_count: roommates.length,
        roommate_names: roommates.map(r => r.name).join(', '),
        hq_tier: hqTier,
        sleeping_arrangement: sleepingArrangement,
      },
      priority: 45 + roommates.length,
    });
  }

  if (hqTier === 'hobo_camp' || hqTier === 'tent_in_the_woods') {
    candidates.push({
      category: 'living_conditions',
      severity: 'moderate',
      source: 'poor_hq_tier',
      details: {
        hq_tier: hqTier,
        sleeping_arrangement: sleepingArrangement,
        roommate_count: roommates.length,
      },
      priority: 50,
    });
  }

  return candidates;
}

function analyzePerformanceProblems(data: CharacterData): ProblemCandidate[] {
  const candidates: ProblemCandidate[] = [];
  const wins = data.IDENTITY.total_wins || 0;
  const losses = data.IDENTITY.total_losses || 0;
  const total = data.IDENTITY.total_battles || 0;
  const winPercentage = data.IDENTITY.win_percentage || 0;

  if (total >= 5 && winPercentage < 30) {
    candidates.push({
      category: 'performance_crisis',
      severity: 'moderate',
      source: 'poor_win_rate',
      details: {
        wins,
        losses,
        total_battles: total,
        win_percentage: winPercentage,
      },
      priority: 60,
    });
  }

  if (total === 0) {
    candidates.push({
      category: 'pre_battle_anxiety',
      severity: 'minor',
      source: 'no_battles_yet',
      details: {
        total_battles: 0,
        level: data.IDENTITY.level,
      },
      priority: 30,
    });
  }

  return candidates;
}
