/**
 * Therapy Routes
 * Handles therapy session bonuses - therapist round-end and judge session-end
 */

import { Router } from 'express';
import { db_adapter } from '../services/databaseAdapter';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import { TemporaryBuffService } from '../services/temporaryBuffService';
import { calculateStatChange } from '../services/therapyEvaluationService';

const router = Router();

type Intensity = 'soft' | 'medium' | 'hard';
type EvaluationChoice = 'A' | 'B' | 'C' | 'D' | 'E';

// Valid stat names that therapist bonuses can modify (must be numeric UserCharacter fields)
type TherapyStatName =
  | 'bond_level'
  | 'current_team_player'
  | 'experience'
  | 'current_mental_health'
  | 'current_stress'
  | 'current_communication'
  | 'current_morale'
  | 'current_confidence';

// Row type for therapy bonus queries
interface TherapyBonusRow {
  bonus_type: TherapyStatName;
  easy_bonus: number;
  easy_penalty: number;
  medium_bonus: number;
  medium_penalty: number;
  hard_bonus: number;
  hard_penalty: number;
}

// Intensity determines permanent % and temporary duration
const INTENSITY_PERMANENT_PERCENT: Record<Intensity, number> = {
  soft: 5,
  medium: 10,
  hard: 15
};

const INTENSITY_DURATION_HOURS: Record<Intensity, number> = {
  soft: 4,
  medium: 12,
  hard: 24
};

/**
 * Apply therapist round-end bonus
 * POST /api/therapy/:character_id/round-bonus
 *
 * Called after therapist evaluates the patient at end of each round
 */
router.post('/:character_id/round-bonus', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🎖️ [POST /api/therapy/:character_id/round-bonus] Applying therapist round bonus');

  try {
    const character_id = req.params.character_id;
    const user_id = req.user?.id;
    const { therapist_id, intensity, evaluation_choice, evaluation_reasoning, session_id, round_number } = req.body;

    // Validate user
    if (!user_id) {
      throw new Error('STRICT MODE: User not authenticated');
    }

    // Validate required fields
    if (!therapist_id) {
      throw new Error('STRICT MODE: therapist_id is required');
    }

    if (!intensity) {
      throw new Error('STRICT MODE: intensity is required');
    }

    if (!INTENSITY_PERMANENT_PERCENT[intensity as Intensity]) {
      throw new Error(`STRICT MODE: intensity must be soft, medium, or hard. Got: ${intensity}`);
    }

    if (!evaluation_choice) {
      throw new Error('STRICT MODE: evaluation_choice is required');
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(evaluation_choice)) {
      throw new Error(`STRICT MODE: evaluation_choice must be A, B, C, D, or E. Got: ${evaluation_choice}`);
    }

    if (!evaluation_reasoning) {
      throw new Error('STRICT MODE: evaluation_reasoning is required');
    }

    if (!session_id) {
      throw new Error('STRICT MODE: session_id is required');
    }

    if (!round_number || ![1, 2, 3].includes(round_number)) {
      throw new Error(`STRICT MODE: round_number must be 1, 2, or 3. Got: ${round_number}`);
    }

    // Verify user owns this character
    const character = await db_adapter.user_characters.find_by_id(character_id);
    if (!character) {
      throw new Error('STRICT MODE: Character not found');
    }
    if (character.user_id !== user_id) {
      throw new Error('STRICT MODE: Character not owned by user');
    }

    // Fetch therapist bonuses from DB
    const bonuses_result = await db_adapter.query(
      `SELECT bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
       FROM therapist_bonuses WHERE character_id = $1`,
      [therapist_id]
    );

    if (bonuses_result.rows.length === 0) {
      throw new Error(`STRICT MODE: No bonuses found for therapist "${therapist_id}"`);
    }

    const intensity_key = intensity as Intensity;
    const choice = evaluation_choice as EvaluationChoice;
    const permanent_percent = INTENSITY_PERMANENT_PERCENT[intensity_key];
    const duration_hours = INTENSITY_DURATION_HOURS[intensity_key];

    const buffService = TemporaryBuffService.getInstance();
    const permanent_updates: Record<string, number> = {};
    const temporary_buffs: Array<{
      character_id: string;
      stat_name: string;
      value: number;
      duration_hours: number;
      source: string;
      description: string;
    }> = [];
    const applied_bonuses: Array<{
      stat: string;
      base_value: number;
      permanent: number;
      temporary: number;
    }> = [];

    for (const row of bonuses_result.rows as TherapyBonusRow[]) {
      // Get bonus and penalty values for this intensity
      let bonus_value: number;
      let penalty_value: number;

      if (intensity_key === 'soft') {
        bonus_value = row.easy_bonus;
        penalty_value = row.easy_penalty;
      } else if (intensity_key === 'medium') {
        bonus_value = row.medium_bonus;
        penalty_value = row.medium_penalty;
      } else {
        bonus_value = row.hard_bonus;
        penalty_value = row.hard_penalty;
      }

      // Calculate stat change based on evaluation choice
      const base_value = calculateStatChange(choice, intensity_key, bonus_value, penalty_value);

      // Skip if no change
      if (base_value === 0) {
        applied_bonuses.push({
          stat: row.bonus_type,
          base_value: 0,
          permanent: 0,
          temporary: 0
        });
        continue;
      }

      // Split into permanent and temporary
      const permanent_raw = base_value * (permanent_percent / 100);
      const permanent = base_value >= 0 ? Math.floor(permanent_raw) : Math.ceil(permanent_raw);
      const temporary = base_value - permanent;

      // Get current value
      const current_value = character[row.bonus_type];
      if (current_value === undefined || current_value === null) {
        throw new Error(`STRICT MODE: Character missing stat column "${row.bonus_type}"`);
      }

      // Apply permanent (floor at 0)
      if (permanent !== 0) {
        const new_value = Math.max(0, current_value + permanent);
        permanent_updates[row.bonus_type] = new_value;
      }

      // Queue temporary buff
      if (temporary !== 0) {
        temporary_buffs.push({
          character_id,
          stat_name: row.bonus_type,
          value: temporary,
          duration_hours,
          source: 'therapy',
          description: `Round bonus from ${therapist_id} (${choice}: ${evaluation_reasoning})`
        });
      }

      applied_bonuses.push({
        stat: row.bonus_type,
        base_value,
        permanent,
        temporary
      });

      console.log(`  ${row.bonus_type}: base=${base_value}, perm=${permanent}, temp=${temporary} (${duration_hours}h)`);
    }

    // Apply permanent updates
    if (Object.keys(permanent_updates).length > 0) {
      const update_success = await db_adapter.user_characters.update(character_id, permanent_updates);
      if (!update_success) {
        throw new Error('STRICT MODE: Failed to apply permanent stat updates');
      }
      console.log(`🎖️ Applied permanent updates:`, permanent_updates);
    }

    // Apply temporary buffs
    if (temporary_buffs.length > 0) {
      await buffService.applyBuffs(temporary_buffs);
      console.log(`✨ Applied ${temporary_buffs.length} temporary buffs`);
    }

    // Store evaluation in DB
    await db_adapter.query(
      `INSERT INTO therapy_evaluations
       (session_id, user_character_id, evaluator_id, evaluator_type, round_number, intensity, choice, reasoning, bonuses_applied)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [session_id, character_id, therapist_id, 'therapist', round_number, intensity, evaluation_choice, evaluation_reasoning, JSON.stringify(applied_bonuses)]
    );
    console.log(`📝 Stored therapist evaluation for round ${round_number}`);

    res.json({
      success: true,
      therapist_id,
      intensity,
      evaluation_choice,
      evaluation_reasoning,
      round_number,
      applied_bonuses,
      permanent_updates,
      temporary_buff_count: temporary_buffs.length,
      duration_hours
    });

  } catch (error: any) {
    console.error('❌ Error applying therapist round bonus:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Apply judge session-end awards
 * POST /api/therapy/:character_id/judge-awards
 *
 * Called after judge evaluates the full therapy session
 */
router.post('/:character_id/judge-awards', authenticate_token, async (req: AuthRequest, res) => {
  console.log('🎖️ [POST /api/therapy/:character_id/judge-awards] Applying judge awards');

  try {
    const character_id = req.params.character_id;
    const user_id = req.user?.id;
    const { judge_id, intensity, evaluation_choice, evaluation_reasoning, session_id } = req.body;

    // Validate user
    if (!user_id) {
      throw new Error('STRICT MODE: User not authenticated');
    }

    // Validate required fields
    if (!judge_id) {
      throw new Error('STRICT MODE: judge_id is required');
    }

    if (!intensity) {
      throw new Error('STRICT MODE: intensity is required');
    }

    if (!INTENSITY_PERMANENT_PERCENT[intensity as Intensity]) {
      throw new Error(`STRICT MODE: intensity must be soft, medium, or hard. Got: ${intensity}`);
    }

    if (!evaluation_choice) {
      throw new Error('STRICT MODE: evaluation_choice is required');
    }

    if (!['A', 'B', 'C', 'D', 'E'].includes(evaluation_choice)) {
      throw new Error(`STRICT MODE: evaluation_choice must be A, B, C, D, or E. Got: ${evaluation_choice}`);
    }

    if (!evaluation_reasoning) {
      throw new Error('STRICT MODE: evaluation_reasoning is required');
    }

    if (!session_id) {
      throw new Error('STRICT MODE: session_id is required');
    }

    // Verify user owns this character
    const character = await db_adapter.user_characters.find_by_id(character_id);
    if (!character) {
      throw new Error('STRICT MODE: Character not found');
    }
    if (character.user_id !== user_id) {
      throw new Error('STRICT MODE: Character not owned by user');
    }

    // Fetch judge bonuses from DB
    const bonuses_result = await db_adapter.query(
      `SELECT bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
       FROM judge_bonuses WHERE character_id = $1`,
      [judge_id]
    );

    if (bonuses_result.rows.length === 0) {
      throw new Error(`STRICT MODE: No bonuses found for judge "${judge_id}"`);
    }

    const intensity_key = intensity as Intensity;
    const choice = evaluation_choice as EvaluationChoice;
    const permanent_percent = INTENSITY_PERMANENT_PERCENT[intensity_key];
    const duration_hours = INTENSITY_DURATION_HOURS[intensity_key];

    const buffService = TemporaryBuffService.getInstance();
    const permanent_updates: Record<string, number> = {};
    const temporary_buffs: Array<{
      character_id: string;
      stat_name: string;
      value: number;
      duration_hours: number;
      source: string;
      description: string;
    }> = [];
    const applied_awards: Array<{
      stat: string;
      base_value: number;
      permanent: number;
      temporary: number;
    }> = [];

    for (const row of bonuses_result.rows as TherapyBonusRow[]) {
      // Get bonus and penalty values for this intensity
      let bonus_value: number;
      let penalty_value: number;

      if (intensity_key === 'soft') {
        bonus_value = row.easy_bonus;
        penalty_value = row.easy_penalty;
      } else if (intensity_key === 'medium') {
        bonus_value = row.medium_bonus;
        penalty_value = row.medium_penalty;
      } else {
        bonus_value = row.hard_bonus;
        penalty_value = row.hard_penalty;
      }

      // Calculate stat change based on evaluation choice
      const base_value = calculateStatChange(choice, intensity_key, bonus_value, penalty_value);

      // Skip if no change
      if (base_value === 0) {
        applied_awards.push({
          stat: row.bonus_type,
          base_value: 0,
          permanent: 0,
          temporary: 0
        });
        continue;
      }

      // Split into permanent and temporary
      const permanent_raw = base_value * (permanent_percent / 100);
      const permanent = base_value >= 0 ? Math.floor(permanent_raw) : Math.ceil(permanent_raw);
      const temporary = base_value - permanent;

      // Get current value
      const current_value = character[row.bonus_type];
      if (current_value === undefined || current_value === null) {
        throw new Error(`STRICT MODE: Character missing stat column "${row.bonus_type}"`);
      }

      // Apply permanent (floor at 0)
      if (permanent !== 0) {
        const new_value = Math.max(0, current_value + permanent);
        permanent_updates[row.bonus_type] = new_value;
      }

      // Queue temporary buff
      if (temporary !== 0) {
        temporary_buffs.push({
          character_id,
          stat_name: row.bonus_type,
          value: temporary,
          duration_hours,
          source: 'therapy',
          description: `Judge ${judge_id} award (${choice}: ${evaluation_reasoning})`
        });
      }

      applied_awards.push({
        stat: row.bonus_type,
        base_value,
        permanent,
        temporary
      });

      console.log(`  ${row.bonus_type}: base=${base_value}, perm=${permanent}, temp=${temporary} (${duration_hours}h)`);
    }

    // Apply permanent updates
    if (Object.keys(permanent_updates).length > 0) {
      const update_success = await db_adapter.user_characters.update(character_id, permanent_updates);
      if (!update_success) {
        throw new Error('STRICT MODE: Failed to apply permanent stat updates');
      }
      console.log(`🎖️ Applied permanent updates:`, permanent_updates);
    }

    // Apply temporary buffs
    if (temporary_buffs.length > 0) {
      await buffService.applyBuffs(temporary_buffs);
      console.log(`✨ Applied ${temporary_buffs.length} temporary buffs`);
    }

    // Store evaluation in DB (judge is always round 4)
    await db_adapter.query(
      `INSERT INTO therapy_evaluations
       (session_id, user_character_id, evaluator_id, evaluator_type, round_number, intensity, choice, reasoning, bonuses_applied)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [session_id, character_id, judge_id, 'judge', 4, intensity, evaluation_choice, evaluation_reasoning, JSON.stringify(applied_awards)]
    );
    console.log(`📝 Stored judge evaluation for session`);

    // Determine therapy outcome for bond tracking
    let therapy_outcome: string;
    if (choice === 'A' || choice === 'B') {
      therapy_outcome = 'therapy_productive';
    } else if (choice === 'D' || choice === 'E') {
      therapy_outcome = 'therapy_wasted';
    } else {
      therapy_outcome = 'therapy_productive'; // C is neutral, lean positive
    }

    // Record bond activity
    const { recordBondActivity } = await import('../services/bondTrackingService');
    const bond_log = await recordBondActivity({
      user_character_id: character_id,
      activity_type: therapy_outcome as any,
      context: {
        judge_id,
        intensity,
        evaluation_choice,
        evaluation_reasoning,
        applied_awards,
      },
      source: 'therapy'
    });

    console.log(`🔗 [THERAPY-BOND] ${therapy_outcome}: Bond ${bond_log.bond_level_before} → ${bond_log.bond_level_after}`);

    res.json({
      success: true,
      judge_id,
      intensity,
      evaluation_choice,
      evaluation_reasoning,
      applied_awards,
      permanent_updates,
      temporary_buff_count: temporary_buffs.length,
      duration_hours,
      bond_change: {
        activity: therapy_outcome,
        previous_bond: bond_log.bond_level_before,
        new_bond: bond_log.bond_level_after,
        change: bond_log.bond_change
      }
    });

  } catch (error: any) {
    console.error('❌ Error applying judge awards:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
