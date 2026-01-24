/**
 * EmotionalStateService
 * Centralized service for generating emotional state context from character stats.
 * Used for AI prompt injection across all domains.
 *
 * STRICT MODE: All required stats must be present - throws if missing.
 */

import { query } from '../database/postgres';
import { CharacterData } from './prompts/types';

export type ContextType = 'general' | 'battle' | 'therapy' | 'social' | 'financial' | 'kitchen' | 'training';

export interface EmotionalStateInput {
  user_character_id: string;
  context_type: ContextType;
}

export interface EmotionalStateOutput {
  prose: string;              // Full behavioral description for AI prompt
  current_mood: number;       // Integer from database (calculated by trigger)
  summary: string;            // One-line summary
  dominant_factors: string[]; // What's most affecting mood right now
}

interface CharacterStats {
  current_stress: number;
  current_mental_health: number;
  current_morale: number;
  current_fatigue: number;
  current_confidence: number;
  current_ego: number;
  bond_level: number;
  coach_trust_level: number;
  financial_stress: number;
  current_health: number;
  current_max_health: number;
  current_mood: number;
}

/**
 * Get emotional state for a character
 * STRICT MODE: Throws if required stats are missing
 */
export async function getEmotionalState(input: EmotionalStateInput): Promise<EmotionalStateOutput> {
  const { user_character_id, context_type } = input;

  // Query all required stats
  const result = await query(
    `SELECT
      current_stress,
      current_mental_health,
      current_morale,
      current_fatigue,
      current_confidence,
      current_ego,
      bond_level,
      coach_trust_level,
      financial_stress,
      current_health,
      current_max_health,
      current_mood
    FROM user_characters
    WHERE id = $1`,
    [user_character_id]
  );

  if (result.rows.length === 0) {
    throw new Error(`STRICT MODE: user_character ${user_character_id} not found`);
  }

  const stats: CharacterStats = result.rows[0];

  // STRICT MODE validation - crash if data is missing
  validateStats(stats, user_character_id);

  // Build prose and collect dominant factors
  const { prose, dominant_factors, summary } = buildEmotionalProse(stats, context_type);

  return {
    prose,
    current_mood: stats.current_mood,
    summary,
    dominant_factors
  };
}

/**
 * Get emotional state from pre-loaded stats (no database query)
 * For use when stats are already available
 * STRICT MODE: Throws if required stats are missing
 */
export function getEmotionalStateFromStats(
  stats: CharacterStats,
  context_type: ContextType,
  identifier: string
): EmotionalStateOutput {
  validateStats(stats, identifier);

  const { prose, dominant_factors, summary } = buildEmotionalProse(stats, context_type);

  return {
    prose,
    current_mood: stats.current_mood,
    summary,
    dominant_factors
  };
}

/**
 * STRICT MODE validation - throws if any required stat is missing
 */
function validateStats(stats: CharacterStats, identifier: string): void {
  if (stats.current_stress === null || stats.current_stress === undefined) {
    throw new Error(`STRICT MODE: Missing current_stress for ${identifier}`);
  }
  if (stats.current_mental_health === null || stats.current_mental_health === undefined) {
    throw new Error(`STRICT MODE: Missing current_mental_health for ${identifier}`);
  }
  if (stats.current_morale === null || stats.current_morale === undefined) {
    throw new Error(`STRICT MODE: Missing current_morale for ${identifier}`);
  }
  if (stats.current_fatigue === null || stats.current_fatigue === undefined) {
    throw new Error(`STRICT MODE: Missing current_fatigue for ${identifier}`);
  }
  if (stats.current_confidence === null || stats.current_confidence === undefined) {
    throw new Error(`STRICT MODE: Missing current_confidence for ${identifier}`);
  }
  if (stats.current_ego === null || stats.current_ego === undefined) {
    throw new Error(`STRICT MODE: Missing current_ego for ${identifier}`);
  }
  if (stats.bond_level === null || stats.bond_level === undefined) {
    throw new Error(`STRICT MODE: Missing bond_level for ${identifier}`);
  }
  if (stats.coach_trust_level === null || stats.coach_trust_level === undefined) {
    throw new Error(`STRICT MODE: Missing coach_trust_level for ${identifier}`);
  }
  if (stats.financial_stress === null || stats.financial_stress === undefined) {
    throw new Error(`STRICT MODE: Missing financial_stress for ${identifier}`);
  }
  if (stats.current_health === null || stats.current_health === undefined) {
    throw new Error(`STRICT MODE: Missing current_health for ${identifier}`);
  }
  if (stats.current_max_health === null || stats.current_max_health === undefined) {
    throw new Error(`STRICT MODE: Missing current_max_health for ${identifier}`);
  }
  if (stats.current_mood === null || stats.current_mood === undefined) {
    throw new Error(`STRICT MODE: Missing current_mood for ${identifier}`);
  }
}

/**
 * Build emotional prose based on stat thresholds
 */
function buildEmotionalProse(
  stats: CharacterStats,
  context_type: ContextType
): { prose: string; dominant_factors: string[]; summary: string } {
  const parts: string[] = [];
  const dominant_factors: string[] = [];
  const summary_parts: string[] = [];

  const {
    current_stress,
    current_mental_health,
    current_morale,
    current_fatigue,
    current_confidence,
    current_ego,
    coach_trust_level,
    current_health,
    current_max_health,
    financial_stress
  } = stats;

  // STRESS - affects vulnerability and volatility
  if (current_stress > 70) {
    parts.push(`Your HIGH stress (${current_stress}) makes you emotionally volatile. You might snap, cry, or shut down unexpectedly.`);
    dominant_factors.push('high_stress');
    summary_parts.push('stressed');
  } else if (current_stress < 30) {
    parts.push(`Your LOW stress (${current_stress}) helps you stay calm, though you might minimize serious issues.`);
  }

  // MENTAL HEALTH - affects depth of struggle
  if (current_mental_health < 40) {
    parts.push(`Your LOW mental health (${current_mental_health}) means you're genuinely struggling. Conversations matter deeply to you.`);
    dominant_factors.push('low_mental_health');
    summary_parts.push('struggling');
  } else if (current_mental_health > 70) {
    parts.push(`Your GOOD mental health (${current_mental_health}) gives you resilience, but you still have real concerns.`);
  }

  // MORALE - affects hope and outlook
  if (current_morale < 40) {
    parts.push(`Your LOW morale (${current_morale}) makes everything feel hopeless. You might express doubt that things can improve.`);
    dominant_factors.push('low_morale');
    summary_parts.push('hopeless');
  } else if (current_morale > 70) {
    parts.push(`Your HIGH morale (${current_morale}) keeps you optimistic. You believe in positive outcomes.`);
    summary_parts.push('optimistic');
  }

  // FATIGUE - affects patience and emotional regulation
  if (current_fatigue > 70) {
    parts.push(`Your HIGH fatigue (${current_fatigue}) makes you emotionally raw. You have less capacity to regulate your feelings.`);
    dominant_factors.push('high_fatigue');
    summary_parts.push('exhausted');
  }

  // CONFIDENCE - affects assertiveness
  if (current_confidence < 30) {
    parts.push(`Your LOW confidence (${current_confidence}) makes you self-doubting and hesitant to assert your opinions.`);
    dominant_factors.push('low_confidence');
    summary_parts.push('insecure');
  } else if (current_confidence > 70) {
    parts.push(`Your HIGH confidence (${current_confidence}) makes you assertive. You may dismiss others' input.`);
    summary_parts.push('confident');
  }

  // EGO - affects defensiveness
  if (current_ego > 80) {
    parts.push(`Your HIGH ego (${current_ego}) makes you defensive about criticism. You need to feel respected.`);
    dominant_factors.push('high_ego');
    summary_parts.push('defensive');
  } else if (current_ego < 30) {
    parts.push(`Your LOW ego (${current_ego}) makes you self-deprecating. You may not advocate for yourself.`);
    summary_parts.push('self-deprecating');
  }

  // COACH TRUST - affects openness (relevant for therapy, training, coaching contexts)
  if (context_type === 'therapy' || context_type === 'training' || context_type === 'general') {
    if (coach_trust_level < 30) {
      parts.push(`Your LOW trust in your coach (${coach_trust_level}) makes you guarded. You might deflect or rebel.`);
      dominant_factors.push('low_coach_trust');
      summary_parts.push('guarded');
    } else if (coach_trust_level > 70) {
      parts.push(`Your HIGH trust in your coach (${coach_trust_level}) makes you open and willing to be vulnerable.`);
      summary_parts.push('trusting');
    }
  }

  // HEALTH - physical condition affecting mental state
  const health_pct = (current_health / current_max_health) * 100;
  if (health_pct < 30) {
    parts.push(`Your POOR physical health (${health_pct.toFixed(0)}%) means pain and weakness cloud your thoughts.`);
    dominant_factors.push('poor_health');
    summary_parts.push('in pain');
  }

  // FINANCIAL STRESS - money worries (relevant for financial, therapy, general contexts)
  if (context_type === 'financial' || context_type === 'therapy' || context_type === 'general') {
    if (financial_stress > 70) {
      parts.push(`Your HIGH financial stress (${financial_stress}) means money worries compound all your problems.`);
      dominant_factors.push('high_financial_stress');
      summary_parts.push('financially anxious');
    }
  }

  // Build summary
  let summary: string;
  if (summary_parts.length === 0) {
    summary = 'balanced emotional state';
  } else if (summary_parts.length === 1) {
    summary = summary_parts[0];
  } else {
    summary = summary_parts.slice(0, -1).join(', ') + ' and ' + summary_parts[summary_parts.length - 1];
  }

  // Build final prose
  const prose = parts.length > 0
    ? parts.join('\n')
    : 'You are in a balanced emotional state, capable of handling this situation thoughtfully.';

  return { prose, dominant_factors, summary };
}

/**
 * Get emotional state from CharacterData (the format returned by get_full_character_data)
 * STRICT MODE: Throws if required stats are missing
 */
export function getEmotionalStateFromCharacterData(
  data: CharacterData,
  context_type: ContextType
): EmotionalStateOutput {
  if (!data.IDENTITY.userchar_id) {
    throw new Error('STRICT MODE: CharacterData.IDENTITY.userchar_id is required');
  }
  const identifier = data.IDENTITY.userchar_id;

  // Extract stats from CharacterData structure
  const stats: CharacterStats = {
    current_stress: data.PSYCHOLOGICAL.current_stress,
    current_mental_health: data.PSYCHOLOGICAL.current_mental_health,
    current_morale: data.PSYCHOLOGICAL.current_morale,
    current_fatigue: data.PSYCHOLOGICAL.current_fatigue,
    current_confidence: data.PSYCHOLOGICAL.current_confidence,
    current_ego: data.PSYCHOLOGICAL.current_ego,
    bond_level: data.PSYCHOLOGICAL.bond_level,
    coach_trust_level: data.PSYCHOLOGICAL.coach_trust_level,
    financial_stress: data.PSYCHOLOGICAL.financial_stress,
    current_health: data.COMBAT.current_health,
    current_max_health: data.COMBAT.current_max_health,
    current_mood: data.PSYCHOLOGICAL.current_mood
  };

  validateStats(stats, identifier);

  const { prose, dominant_factors, summary } = buildEmotionalProse(stats, context_type);

  return {
    prose,
    current_mood: stats.current_mood,
    summary,
    dominant_factors
  };
}

export const EmotionalStateService = {
  getEmotionalState,
  getEmotionalStateFromCharacterData,
  getEmotionalStateFromStats
};
