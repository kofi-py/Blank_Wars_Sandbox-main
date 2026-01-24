import { Request, Response } from 'express';
import { mustResolveAgentKey } from '../../utils/mapping';
import { getCharactersByRole } from '../../config/roleRegistry';
import { buildJudgePrompt, buildBatchJudgePrompt, PatientInfo } from './judgesPrompt';
import { query } from '../../database/postgres';
import { getChoiceMultiplier, calculateStatChange } from '../therapyEvaluationService';
import Open_ai from 'openai';

const openai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY
});

export async function handleTherapyEvaluation(req: Request, res: Response) {
  const trace = `judge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const t0 = Date.now();

  // Extract required fields - body must exist
  if (!req.body) {
    throw new Error('STRICT MODE: Request body is required');
  }
  const judge_userchar_id = req.body.judge_userchar_id;
  const patient_userchar_id = req.body.patient_userchar_id;
  const chat_type = req.body.chat_type;
  const transcript = req.body.transcript;
  const intensity = req.body.intensity as 'soft' | 'medium' | 'hard';
  const session_type = req.body.session_type;

  console.log('[JUDGE][BEGIN]', {
    trace,
    judge_userchar_id,
    patient_userchar_id,
    chat_type,
    intensity,
    session_type,
    transcript_length: Array.isArray(transcript) ? transcript.length : 0
  });

  // Validate all required fields
  if (!judge_userchar_id) {
    console.error('[JUDGE][400][MISSING_JUDGE_USERCHAR_ID]', { trace });
    return res.status(400).json({ error: 'judge_userchar_id is required' });
  }
  if (!patient_userchar_id) {
    console.error('[JUDGE][400][MISSING_PATIENT_USERCHAR_ID]', { trace });
    return res.status(400).json({ error: 'patient_userchar_id is required' });
  }
  if (chat_type !== 'therapy_evaluation') {
    console.error('[JUDGE][400][INVALID_CHATTYPE]', { trace, chat_type });
    return res.status(400).json({ error: 'chat_type must be therapy_evaluation' });
  }
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    console.error('[JUDGE][400][MISSING_TRANSCRIPT]', { trace });
    return res.status(400).json({ error: 'transcript is required and must be a non-empty array' });
  }
  if (!intensity || !['soft', 'medium', 'hard'].includes(intensity)) {
    console.error('[JUDGE][400][INVALID_INTENSITY]', { trace, intensity });
    return res.status(400).json({ error: 'intensity is required and must be soft, medium, or hard' });
  }
  if (!session_type || !['individual', 'group'].includes(session_type)) {
    console.error('[JUDGE][400][INVALID_SESSION_TYPE]', { trace, session_type });
    return res.status(400).json({ error: 'session_type is required and must be individual or group' });
  }

  // Look up judge's canonical ID from judge_userchar_id
  const judgeResult = await query(
    'SELECT character_id FROM user_characters WHERE id = $1',
    [judge_userchar_id]
  );
  if (judgeResult.rows.length === 0) {
    console.error('[JUDGE][400][JUDGE_NOT_FOUND]', { trace, judge_userchar_id });
    return res.status(400).json({ error: `No user_character found with id "${judge_userchar_id}"` });
  }
  const judge_canonical_id = judgeResult.rows[0].character_id;

  // Verify it's a judge
  const judges = await getCharactersByRole('judge');
  if (!judges.includes(judge_canonical_id)) {
    console.error('[JUDGE][400][NOT_JUDGE]', { trace, judge_canonical_id });
    return res.status(400).json({ error: `Character "${judge_canonical_id}" is not a judge` });
  }

  // Fetch patient name (needed for logging and response)
  const patientResult = await query(
    `SELECT c.name
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [patient_userchar_id]
  );
  if (patientResult.rows.length === 0) {
    throw new Error(`STRICT MODE: No patient found for userchar_id "${patient_userchar_id}"`);
  }
  const patient_name = patientResult.rows[0].name;

  // Fetch judge bonuses for stat application (same as batch)
  const bonusResult = await query(
    `SELECT bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
     FROM judge_bonuses WHERE character_id = $1`,
    [judge_canonical_id]
  );
  if (bonusResult.rows.length === 0) {
    throw new Error(`STRICT MODE: No judge_bonuses found for judge "${judge_canonical_id}"`);
  }
  const judgeBonuses = bonusResult.rows;

  // Pre-calculate A/B/C/D/E values for each stat based on intensity (same as batch)
  const statValues: Array<{
    stat: string;
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    bonus_value: number;
    penalty_value: number;
  }> = [];

  for (const bonus of judgeBonuses) {
    let bonusVal: number;
    let penaltyVal: number;

    if (intensity === 'soft') {
      bonusVal = bonus.easy_bonus;
      penaltyVal = bonus.easy_penalty;
    } else if (intensity === 'medium') {
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
      bonus_value: bonusVal,
      penalty_value: penaltyVal
    });
  }

  // Use modular prompt system (handles judge identity, persona, A/B/C/D/E format, and surprise reveal)
  const prompt = await buildJudgePrompt(judge_canonical_id, judge_userchar_id, {
    transcript,
    patient_userchar_id,
    intensity,
    session_type
  });

  console.log(`⚖️ [JUDGE] ${judge_canonical_id} prompt length:`, prompt.length);

  // Call OpenAI with JSON response format (same as batch)
  const model = process.env.OPENAI_MODEL;
  if (!model) {
    throw new Error('STRICT MODE: OPENAI_MODEL environment variable is required');
  }

  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  if (!completion.choices?.[0]?.message?.content) {
    throw new Error('STRICT MODE: OpenAI returned no content');
  }

  const response_text = completion.choices[0].message.content.trim();
  console.log(`⚖️ [JUDGE] Response:`, response_text);

  // Parse JSON response
  const parsed = JSON.parse(response_text);
  if (!parsed.choice) {
    throw new Error('STRICT MODE: Response missing choice field');
  }
  if (!parsed.critique) {
    throw new Error('STRICT MODE: Response missing critique field');
  }

  const choice = parsed.choice.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
  if (!['A', 'B', 'C', 'D', 'E'].includes(choice)) {
    throw new Error(`STRICT MODE: Invalid choice "${choice}"`);
  }

  // Apply stat changes (same logic as batch)
  const stats_applied: Array<{ stat: string; change: number }> = [];

  for (const sv of statValues) {
    const change = calculateStatChange(choice, intensity, sv.bonus_value, sv.penalty_value);

    if (change !== 0) {
      await query(
        `UPDATE user_characters
         SET ${sv.stat} = GREATEST(0, ${sv.stat} + $1)
         WHERE id = $2`,
        [change, patient_userchar_id]
      );

      stats_applied.push({ stat: sv.stat, change });
      console.log(`📊 [JUDGE-STAT] ${patient_name} ${sv.stat}: ${change > 0 ? '+' : ''}${change}`);
    }
  }

  console.log(`✅ [JUDGE] ${judge_canonical_id} gave ${patient_name} a ${choice}`);

  const ms = Date.now() - t0;
  console.log('[JUDGE][OK]', { trace, ms });

  // Return structured response matching batch format
  return res.json({
    ok: true,
    judge_userchar_id,
    judge_canonical_id,
    evaluation: {
      patient_id: patient_userchar_id,
      patient_name,
      choice,
      critique: parsed.critique,
      stats_applied
    }
  });
}

// =====================================================
// BATCH JUDGE EVALUATION (Group Therapy - Multiple Patients)
// =====================================================

type EvaluationChoice = 'A' | 'B' | 'C' | 'D' | 'E';

export async function handleBatchTherapyEvaluation(req: Request, res: Response) {
  const trace = `batch-judge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const t0 = Date.now();

  if (!req.body) {
    throw new Error('STRICT MODE: Request body is required');
  }

  const judge_userchar_id = req.body.judge_userchar_id;
  const patients: PatientInfo[] = req.body.patients;
  const chat_type = req.body.chat_type;
  const transcript = req.body.transcript;
  const intensity = req.body.intensity as 'soft' | 'medium' | 'hard';

  console.log('[BATCH-JUDGE][BEGIN]', {
    trace,
    judge_userchar_id,
    patient_count: patients?.length,
    chat_type,
    intensity,
    transcript_length: Array.isArray(transcript) ? transcript.length : 0
  });

  // Validate required fields
  if (!judge_userchar_id) {
    return res.status(400).json({ error: 'judge_userchar_id is required' });
  }
  if (!patients || !Array.isArray(patients) || patients.length < 2) {
    return res.status(400).json({ error: 'patients array is required with at least 2 patients' });
  }
  if (chat_type !== 'therapy_evaluation_batch') {
    return res.status(400).json({ error: 'chat_type must be therapy_evaluation_batch' });
  }
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({ error: 'transcript is required and must be a non-empty array' });
  }
  if (!intensity || !['soft', 'medium', 'hard'].includes(intensity)) {
    return res.status(400).json({ error: 'intensity is required and must be soft, medium, or hard' });
  }

  // Validate each patient has required fields
  for (const patient of patients) {
    if (!patient.patient_userchar_id) {
      return res.status(400).json({ error: 'Each patient must have patient_userchar_id' });
    }
    if (!patient.patient_name) {
      return res.status(400).json({ error: 'Each patient must have patient_name' });
    }
  }

  // Look up judge's canonical ID from judge_userchar_id
  const judgeResult = await query(
    'SELECT character_id FROM user_characters WHERE id = $1',
    [judge_userchar_id]
  );
  if (judgeResult.rows.length === 0) {
    return res.status(400).json({ error: `No user_character found with id "${judge_userchar_id}"` });
  }
  const judge_canonical_id = judgeResult.rows[0].character_id;

  // Verify it's a judge
  const judges = await getCharactersByRole('judge');
  if (!judges.includes(judge_canonical_id)) {
    return res.status(400).json({ error: `Character "${judge_canonical_id}" is not a judge` });
  }

  // Build batch prompt
  const prompt = await buildBatchJudgePrompt(judge_canonical_id, judge_userchar_id, {
    transcript,
    patients,
    intensity,
    session_type: 'group',
  });

  console.log(`⚖️ [BATCH-JUDGE] ${judge_canonical_id} prompt length:`, prompt.length);

  // Call OpenAI with JSON response format
  const model = process.env.OPENAI_MODEL;
  if (!model) {
    throw new Error('STRICT MODE: OPENAI_MODEL environment variable is required');
  }

  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  if (!completion.choices?.[0]?.message?.content) {
    throw new Error('STRICT MODE: OpenAI returned no content');
  }

  const response_text = completion.choices[0].message.content.trim();
  console.log(`⚖️ [BATCH-JUDGE] Response:`, response_text);

  // Parse JSON response
  const parsed = JSON.parse(response_text);
  if (!parsed.evaluations || !Array.isArray(parsed.evaluations)) {
    throw new Error('STRICT MODE: Response missing evaluations array');
  }

  // Fetch judge bonuses for stat application
  const bonusResult = await query(
    `SELECT bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
     FROM judge_bonuses WHERE character_id = $1`,
    [judge_canonical_id]
  );
  if (bonusResult.rows.length === 0) {
    throw new Error(`STRICT MODE: No judge_bonuses found for judge "${judge_canonical_id}"`);
  }
  const judgeBonuses = bonusResult.rows;

  // Process each patient's evaluation
  const results: Array<{
    patient_id: string;
    patient_name: string;
    choice: string;
    critique: string;
    stats_applied: Array<{ stat: string; change: number }>;
  }> = [];

  for (const eval_item of parsed.evaluations) {
    if (!eval_item.patient_id) {
      throw new Error(`STRICT MODE: Evaluation missing patient_id: ${JSON.stringify(eval_item)}`);
    }
    if (!eval_item.choice) {
      throw new Error(`STRICT MODE: Evaluation missing choice for ${eval_item.patient_id}`);
    }

    const choice = eval_item.choice.toUpperCase() as EvaluationChoice;
    if (!['A', 'B', 'C', 'D', 'E'].includes(choice)) {
      throw new Error(`STRICT MODE: Invalid choice "${choice}" for ${eval_item.patient_id}`);
    }

    // Find patient info
    const patient = patients.find(p => p.patient_userchar_id === eval_item.patient_id);
    if (!patient) {
      throw new Error(`STRICT MODE: Unknown patient_id "${eval_item.patient_id}" in response`);
    }

    // Apply stat changes
    const stats_applied: Array<{ stat: string; change: number }> = [];

    for (const bonus of judgeBonuses) {
      let bonus_value: number;
      let penalty_value: number;

      if (intensity === 'soft') {
        bonus_value = bonus.easy_bonus;
        penalty_value = bonus.easy_penalty;
      } else if (intensity === 'medium') {
        bonus_value = bonus.medium_bonus;
        penalty_value = bonus.medium_penalty;
      } else {
        bonus_value = bonus.hard_bonus;
        penalty_value = bonus.hard_penalty;
      }

      const change = calculateStatChange(choice, intensity, bonus_value, penalty_value);

      if (change !== 0) {
        await query(
          `UPDATE user_characters
           SET ${bonus.bonus_type} = GREATEST(0, ${bonus.bonus_type} + $1)
           WHERE id = $2`,
          [change, patient.patient_userchar_id]
        );

        stats_applied.push({ stat: bonus.bonus_type, change });
        console.log(`📊 [BATCH-JUDGE-STAT] ${patient.patient_name} ${bonus.bonus_type}: ${change > 0 ? '+' : ''}${change}`);
      }
    }

    results.push({
      patient_id: patient.patient_userchar_id,
      patient_name: patient.patient_name,
      choice,
      critique: eval_item.critique || '',
      stats_applied
    });

    console.log(`✅ [BATCH-JUDGE] ${judge_canonical_id} gave ${patient.patient_name} a ${choice}`);
  }

  // Verify all patients were evaluated
  const evaluated_ids = results.map(r => r.patient_id);
  for (const patient of patients) {
    if (!evaluated_ids.includes(patient.patient_userchar_id)) {
      throw new Error(`STRICT MODE: Patient "${patient.patient_name}" (${patient.patient_userchar_id}) was not evaluated`);
    }
  }

  const ms = Date.now() - t0;
  console.log('[BATCH-JUDGE][OK]', { trace, ms, patient_count: results.length });

  return res.json({
    ok: true,
    judge_userchar_id,
    judge_canonical_id,
    evaluations: results
  });
}