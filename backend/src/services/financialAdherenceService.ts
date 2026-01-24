/**
 * Financial Adherence Service
 *
 * Calculates character adherence for financial decisions.
 * Uses base gameplan_adherence + financial personality modifiers + coach advice modifier.
 *
 * Blueprint reference: cc_12_31_25_11.03am_chats.md (Section 4.2)
 */

import { query } from '../database/index';

export type FinancialDecisionCategory =
  | 'luxury'
  | 'investment'
  | 'essentials'
  | 'impulse'
  | 'generosity'
  | 'debt_payment';

export type SpendingStyle = 'impulsive' | 'moderate' | 'conservative' | 'strategic';

export interface FinancialPersonality {
  spending_style: SpendingStyle;
  financial_wisdom: number;
  risk_tolerance: number;
  luxury_desire: number;
  generosity: number;
}

export interface FinancialAdherenceParams {
  gameplan_adherence: number;
  financial_personality: FinancialPersonality;
  decision_category: FinancialDecisionCategory;
  coach_response: 'endorse' | 'advise_against';
  character_wants_it: boolean; // Does the character want to execute this decision?
}

export interface FinancialAdherenceResult {
  roll: number;
  base_adherence: number;
  preference_modifier: number;
  advice_modifier: number;
  final_score: number;
  passed: boolean;
  result: 'comply' | 'defy';
}

/**
 * Calculate the preference modifier based on decision category and financial personality.
 *
 * From blueprint:
 * - luxury: (luxury_desire - 50) / 5
 * - investment: (risk_tolerance - 50) / 5
 * - impulse: impulsive=-15, moderate=0, conservative=+10, strategic=+5
 * - generosity: (generosity - 50) / 5
 * - essentials: 0 (neutral)
 * - debt_payment: (financial_wisdom - 50) / 5
 */
export function getPreferenceModifier(
  category: FinancialDecisionCategory,
  fp: FinancialPersonality
): number {
  switch (category) {
    case 'luxury':
      // High luxury_desire = lower adherence (more likely to defy to get it)
      return Math.floor((fp.luxury_desire - 50) / 5) * -1;

    case 'investment':
      // High risk_tolerance = lower adherence (more likely to defy for risky investment)
      return Math.floor((fp.risk_tolerance - 50) / 5) * -1;

    case 'impulse':
      // Spending style directly affects impulse control
      const impulse_map: Record<SpendingStyle, number> = {
        impulsive: -15,
        moderate: 0,
        conservative: 10,
        strategic: 5
      };
      return impulse_map[fp.spending_style];

    case 'generosity':
      // High generosity = lower adherence (wants to give money away)
      return Math.floor((fp.generosity - 50) / 5) * -1;

    case 'essentials':
      // Neutral - essentials are practical, no personality bias
      return 0;

    case 'debt_payment':
      // High financial_wisdom = higher adherence (understands debt is bad)
      return Math.floor((fp.financial_wisdom - 50) / 5);

    default:
      return 0;
  }
}

/**
 * Calculate the coach advice modifier.
 *
 * From blueprint:
 * - Endorse + character wants it: +20 (aligned)
 * - Endorse + character doesn't want it: +10 (coach supports caution)
 * - Advise Against + character wants it: -15 (conflict)
 * - Advise Against + character doesn't want it: +15 (aligned)
 */
export function getAdviceModifier(
  coach_response: 'endorse' | 'advise_against',
  character_wants_it: boolean
): number {
  if (coach_response === 'endorse') {
    return character_wants_it ? 20 : 10;
  } else {
    return character_wants_it ? -15 : 15;
  }
}

/**
 * Perform financial adherence roll.
 *
 * @returns Result including roll, modifiers, and comply/defy outcome
 */
export function rollFinancialAdherence(params: FinancialAdherenceParams): FinancialAdherenceResult {
  const { gameplan_adherence, financial_personality, decision_category, coach_response, character_wants_it } = params;

  const preference_modifier = getPreferenceModifier(decision_category, financial_personality);
  const advice_modifier = getAdviceModifier(coach_response, character_wants_it);

  const final_score = Math.max(0, Math.min(100, gameplan_adherence + preference_modifier + advice_modifier));
  const roll = Math.floor(Math.random() * 100) + 1;
  const passed = roll <= final_score;

  console.log(`🎲 [FINANCIAL-ADHERENCE] Roll: ${roll}, Base: ${gameplan_adherence}, ` +
    `PrefMod: ${preference_modifier}, AdviceMod: ${advice_modifier}, ` +
    `Final: ${final_score}, Passed: ${passed}`);

  return {
    roll,
    base_adherence: gameplan_adherence,
    preference_modifier,
    advice_modifier,
    final_score,
    passed,
    result: passed ? 'comply' : 'defy'
  };
}

/**
 * Get financial personality from user_characters.
 * Returns the financial_personality JSONB column values.
 */
export async function getFinancialPersonality(character_id: string): Promise<FinancialPersonality> {
  const result = await query(
    `SELECT financial_personality FROM user_characters WHERE id = $1`,
    [character_id]
  );

  if (result.rows.length === 0) {
    throw new Error(`STRICT MODE: Character ${character_id} not found`);
  }

  const fp = result.rows[0].financial_personality;
  if (!fp) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality`);
  }
  if (!fp.spending_style) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.spending_style`);
  }
  if (fp.financial_wisdom === null || fp.financial_wisdom === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.financial_wisdom`);
  }
  if (fp.risk_tolerance === null || fp.risk_tolerance === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.risk_tolerance`);
  }
  if (fp.luxury_desire === null || fp.luxury_desire === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.luxury_desire`);
  }
  if (fp.generosity === null || fp.generosity === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.generosity`);
  }

  return {
    spending_style: fp.spending_style,
    financial_wisdom: fp.financial_wisdom,
    risk_tolerance: fp.risk_tolerance,
    luxury_desire: fp.luxury_desire,
    generosity: fp.generosity
  };
}

/**
 * Get gameplan_adherence from user_characters.
 */
export async function getGameplanAdherence(character_id: string): Promise<number> {
  const result = await query(
    `SELECT gameplan_adherence FROM user_characters WHERE id = $1`,
    [character_id]
  );

  if (result.rows.length === 0) {
    throw new Error(`STRICT MODE: Character ${character_id} not found`);
  }

  if (result.rows[0].gameplan_adherence === null || result.rows[0].gameplan_adherence === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing gameplan_adherence`);
  }

  return result.rows[0].gameplan_adherence;
}
