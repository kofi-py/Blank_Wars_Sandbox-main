/**
 * Judge Prompt Builder - Uses modular prompt assembly system
 * No hardcoded judge contexts, scoring rubrics, or personas
 * Everything comes from:
 * - Character data packages (IDENTITY, COMBAT, PSYCHOLOGICAL)
 * - Judge personas (domains/therapy/personas/judges/)
 * - Judge bonuses from database (judge_bonuses table)
 */

import { assemblePrompt } from '../prompts/assembler';
import { query } from '../../database/postgres';

export interface JudgePromptContext {
  transcript: Array<{ message: string; speaker_name: string; speaker_id: string }>;
  patient_userchar_id: string;
  intensity: 'soft' | 'medium' | 'hard';
  session_type: 'individual' | 'group';
}

export async function buildJudgePrompt(
  judge_canonical_id: string,
  judge_userchar_id: string,
  ctx: JudgePromptContext
): Promise<string> {
  if (!judge_canonical_id) {
    throw new Error('STRICT MODE: judge_canonical_id is required');
  }
  if (!judge_userchar_id) {
    throw new Error('STRICT MODE: judge_userchar_id is required');
  }
  if (!ctx.patient_userchar_id) {
    throw new Error('STRICT MODE: patient_userchar_id is required');
  }
  if (!ctx.transcript || ctx.transcript.length === 0) {
    throw new Error('STRICT MODE: transcript is required and cannot be empty');
  }
  if (!ctx.intensity) {
    throw new Error('STRICT MODE: intensity is required');
  }
  if (!ctx.session_type) {
    throw new Error('STRICT MODE: session_type is required');
  }

  // Use assembler which handles:
  // - Judge character data packages
  // - Patient character data packages
  // - Judge bonuses from judge_bonuses table
  // - Judge personas from modular system
  const assembled = await assemblePrompt({
    userchar_id: judge_userchar_id,
    domain: 'therapy',
    role: 'judge',
    role_type: 'system',
    conversation_history: '',  // Transcript is passed via therapy_options
    context_userchar_id: ctx.patient_userchar_id,
    therapy_options: {
      session_type: ctx.session_type,
      intensity_strategy: ctx.intensity,
      transcript: ctx.transcript,
    },
  });

  return assembled.system_prompt;
}

/**
 * Helper to get canonical character_id from user_character id
 */
async function getCanonicalIdFromUserchar(userchar_id: string): Promise<string> {
  const result = await query(
    'SELECT character_id FROM user_characters WHERE id = $1',
    [userchar_id]
  );
  if (result.rows.length === 0) {
    throw new Error(`STRICT MODE: No user_character found with id "${userchar_id}"`);
  }
  return result.rows[0].character_id;
}

// =====================================================
// BATCH JUDGE EVALUATION (Group Therapy - Multiple Patients)
// =====================================================

export interface PatientInfo {
  patient_userchar_id: string;
  patient_name: string;
}

export interface BatchJudgePromptContext {
  transcript: Array<{ message: string; speaker_name: string; speaker_id: string }>;
  patients: PatientInfo[];
  intensity: 'soft' | 'medium' | 'hard';
  session_type: 'group';
}

export async function buildBatchJudgePrompt(
  judge_canonical_id: string,
  judge_userchar_id: string,
  ctx: BatchJudgePromptContext
): Promise<string> {
  if (!judge_canonical_id) {
    throw new Error('STRICT MODE: judge_canonical_id is required');
  }
  if (!judge_userchar_id) {
    throw new Error('STRICT MODE: judge_userchar_id is required');
  }
  if (!ctx.patients || ctx.patients.length === 0) {
    throw new Error('STRICT MODE: patients array is required and cannot be empty');
  }
  if (ctx.patients.length < 2) {
    throw new Error('STRICT MODE: Batch judge evaluation requires at least 2 patients');
  }
  if (!ctx.transcript || ctx.transcript.length === 0) {
    throw new Error('STRICT MODE: transcript is required and cannot be empty');
  }
  if (!ctx.intensity) {
    throw new Error('STRICT MODE: intensity is required');
  }

  // Fetch judge character data
  const judgeResult = await query(
    `SELECT c.name, c.backstory, c.personality_traits
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [judge_userchar_id]
  );
  if (judgeResult.rows.length === 0) {
    throw new Error(`STRICT MODE: No judge found with userchar_id "${judge_userchar_id}"`);
  }
  const judge = judgeResult.rows[0];

  // Fetch judge bonuses
  const bonusResult = await query(
    `SELECT bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
     FROM judge_bonuses WHERE character_id = $1`,
    [judge_canonical_id]
  );
  if (bonusResult.rows.length === 0) {
    throw new Error(`STRICT MODE: No judge_bonuses found for judge "${judge_canonical_id}"`);
  }
  const judgeBonuses = bonusResult.rows;
  const statList = judgeBonuses.map((b: any) => b.bonus_type).join(', ');

  // Build patient list
  const patientListText = ctx.patients.map(p => `- ${p.patient_name} (ID: ${p.patient_userchar_id})`).join('\n');
  const patient_ids = ctx.patients.map(p => p.patient_userchar_id);

  // Format transcript
  const formattedTranscript = ctx.transcript.map(t => `${t.speaker_name}: ${t.message}`).join('\n\n');

  // Pre-calculate A/B/C/D/E values for each stat based on intensity
  // Bonuses are 1.5x more valuable than penalties:
  // A = 100% bonus, B = 60% bonus, C = 0, D = 40% penalty, E = 67% penalty
  const statValues: Array<{
    stat: string;
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  }> = [];

  for (const bonus of judgeBonuses) {
    let bonusVal: number;
    let penaltyVal: number;

    if (ctx.intensity === 'soft') {
      bonusVal = bonus.easy_bonus;
      penaltyVal = bonus.easy_penalty;
    } else if (ctx.intensity === 'medium') {
      bonusVal = bonus.medium_bonus;
      penaltyVal = bonus.medium_penalty;
    } else {
      bonusVal = bonus.hard_bonus;
      penaltyVal = bonus.hard_penalty;
    }

    statValues.push({
      stat: bonus.bonus_type,
      A: Math.round(bonusVal * 1.0),
      B: Math.round(bonusVal * 0.6),
      C: 0,
      D: Math.round(penaltyVal * 0.4),
      E: Math.round(penaltyVal * 0.67),
    });
  }

  // Build the multiple choice options showing actual stat changes
  const choiceA = statValues.map(s => `${s.stat} ${s.A >= 0 ? '+' : ''}${s.A}`).join(', ');
  const choiceB = statValues.map(s => `${s.stat} ${s.B >= 0 ? '+' : ''}${s.B}`).join(', ');
  const choiceD = statValues.map(s => `${s.stat} ${s.D}`).join(', ');
  const choiceE = statValues.map(s => `${s.stat} ${s.E}`).join(', ');

  const prompt = `You are ${judge.name}, a celebrity judge on the BlankWars reality show.

${judge.backstory}

${Array.isArray(judge.personality_traits) ? judge.personality_traits.join(', ') : judge.personality_traits}

You are evaluating a GROUP THERAPY session. INTENSITY: ${ctx.intensity.toUpperCase()}

PATIENTS TO EVALUATE:
${ctx.patients.map(p => `- ${p.patient_name} (${p.patient_userchar_id})`).join('\n')}

SESSION TRANSCRIPT:
${formattedTranscript}

For EACH patient, select ONE choice:

A) EXCELLENT - Genuine vulnerability, insight, or breakthrough
   Awards: ${choiceA}

B) GOOD - Engaged meaningfully, made progress
   Awards: ${choiceB}

C) NEUTRAL - Participated but no real growth
   Awards: no change

D) POOR - Defensive, avoidant, or deflecting
   Awards: ${choiceD}

E) FAILED - Hostile, refused to engage, or dishonest
   Awards: ${choiceE}

FAILURE TRIGGERS (D or E):
- Lying, deflecting every question, attacking therapist, repeated deflection, refusal to participate

SUCCESS TRIGGERS (A or B):
- Admitting uncomfortable truth, genuine emotion, asking for help, acknowledging fault, connecting past to present

RESPOND IN JSON:
{
  "evaluations": [
    { "patient_id": "${ctx.patients[0].patient_userchar_id}", "choice": "A", "critique": "Your in-character evaluation" }
  ]
}

You MUST evaluate: ${ctx.patients.map(p => p.patient_userchar_id).join(', ')}`;

  return prompt;
}


