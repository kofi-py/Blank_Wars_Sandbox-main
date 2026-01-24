/**
 * Therapy Evaluation Service
 * Handles therapist AI evaluation of patient performance each round
 * Uses full prompt assembly system for proper context
 *
 * NOTE: Evaluation does NOT add to conversation history
 * Returns data for UI notification about the CHARACTER
 */

import OpenAI from 'openai';
import { buildAllProse, TherapistBonusRow } from './prompts/domains/therapy';
import type { CharacterData, SystemCharacterData } from './prompts/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

type EvaluationChoice = 'A' | 'B' | 'C' | 'D' | 'E';
type Intensity = 'soft' | 'medium' | 'hard';

interface EvaluationResult {
  choice: EvaluationChoice;
  reasoning: string;
  therapistName: string;
  patientName: string;
  roundNumber: number;
}

interface EvaluationParams {
  therapistData: CharacterData | SystemCharacterData;
  patientData: CharacterData;
  patientMessage: string;
  intensity: Intensity;
  roundNumber: number;
  therapistBonuses: TherapistBonusRow[];
  transcript: Array<{ message: string; speaker_name: string; speaker_id: string }>;
}

// =====================================================
// GROUP THERAPY BATCH EVALUATION TYPES
// =====================================================

interface PatientEvaluation {
  patient_id: string;
  patient_name: string;
  choice: EvaluationChoice;
  reasoning: string;
}

interface BatchEvaluationResult {
  therapistName: string;
  roundNumber: number;
  evaluations: PatientEvaluation[];
}

interface PatientInfo {
  patient_id: string;
  patient_name: string;
  patientData: CharacterData;
  userchar_id: string;
  response: string;  // This patient's response this round
}

interface BatchEvaluationParams {
  therapistData: CharacterData | SystemCharacterData;
  patients: PatientInfo[];
  intensity: Intensity;
  roundNumber: number;
  therapistBonuses: TherapistBonusRow[];
  roundTranscript: Array<{ message: string; speaker_name: string; speaker_id: string }>;
}

/**
 * Get therapist's evaluation of the patient's round performance
 * Uses full prompt assembly for proper context
 * Does NOT produce conversation dialogue - internal evaluation only
 */
export async function getTherapistEvaluation(params: EvaluationParams): Promise<EvaluationResult> {
  const {
    therapistData,
    patientData,
    patientMessage,
    intensity,
    roundNumber,
    therapistBonuses,
    transcript
  } = params;

  const therapistName = therapistData.IDENTITY.name;
  const patientName = patientData.IDENTITY.name;

  // Build the evaluator prompt using full prompt assembly
  const proseResult = buildAllProse(therapistData, {
    sessionType: 'individual',
    role: 'evaluator',
    intensityStrategy: intensity,
    patientData,
    therapistBonuses,
    patientMessage,
    roundNumber,
    transcript,
  });

  // Format transcript for the assistant message (content being evaluated)
  const formattedTranscript = transcript.map(t => {
    return `${t.speaker_name}: ${t.message}`;
  }).join('\n\n');

  // System message: therapist persona + evaluation instructions
  const systemContent = `${proseResult.persona}

${proseResult.scene}

${proseResult.role}`;

  // Make the AI call
  // - system: therapist identity + evaluation instructions
  // - assistant with name: conversation history (model-generated content being evaluated)
  const ai_response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemContent
      },
      {
        role: 'assistant',
        name: 'conversation',
        content: formattedTranscript
      }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const response_text = ai_response.choices[0]?.message?.content?.trim();
  if (!response_text) {
    throw new Error('STRICT MODE: Empty response from therapist evaluation AI');
  }

  console.log(`🎯 [THERAPIST-EVAL] ${therapistName} evaluating ${patientName} round ${roundNumber}:`, response_text);

  const parsed = JSON.parse(response_text);

  if (!parsed.choice) {
    throw new Error(`STRICT MODE: Missing choice in evaluation response: ${response_text}`);
  }
  if (!parsed.reasoning) {
    throw new Error(`STRICT MODE: Missing reasoning in evaluation response: ${response_text}`);
  }

  const choice = parsed.choice.toUpperCase() as EvaluationChoice;
  if (!['A', 'B', 'C', 'D', 'E'].includes(choice)) {
    throw new Error(`STRICT MODE: Invalid choice letter: ${choice}`);
  }

  console.log(`✅ [THERAPIST-EVAL] ${therapistName} gave ${patientName} a ${choice}: "${parsed.reasoning}"`);

  return {
    choice,
    reasoning: parsed.reasoning,
    therapistName,
    patientName,
    roundNumber
  };
}

/**
 * Map evaluation choice to multiplier
 * Bonuses are 1.5x more valuable than penalties:
 * A = 100% bonus, B = 60% bonus, C = 0, D = 40% penalty, E = 67% penalty
 */
export function getChoiceMultiplier(choice: EvaluationChoice): number {
  switch (choice) {
    case 'A': return 1.0;
    case 'B': return 0.6;
    case 'C': return 0;
    case 'D': return -0.4;
    case 'E': return -0.67;
  }
}

/**
 * Calculate actual stat change based on choice
 */
export function calculateStatChange(
  choice: EvaluationChoice,
  intensity: Intensity,
  bonus_value: number,
  penalty_value: number
): number {
  const multiplier = getChoiceMultiplier(choice);

  if (multiplier === 0) {
    return 0;
  }

  if (multiplier > 0) {
    return Math.round(bonus_value * multiplier);
  } else {
    return Math.round(penalty_value * Math.abs(multiplier));
  }
}

// =====================================================
// GROUP THERAPY BATCH EVALUATION
// =====================================================

/**
 * Get therapist's batch evaluation of ALL patients' responses in a group round
 * One API call evaluates all patients - returns array of evaluations
 * Does NOT produce conversation dialogue - internal evaluation only
 */
export async function getBatchTherapistEvaluation(params: BatchEvaluationParams): Promise<BatchEvaluationResult> {
  const {
    therapistData,
    patients,
    intensity,
    roundNumber,
    therapistBonuses,
    roundTranscript
  } = params;

  // STRICT MODE: Validate inputs
  if (patients.length < 2) {
    throw new Error('STRICT MODE: Batch evaluation requires at least 2 patients');
  }

  const therapistName = therapistData.IDENTITY.name;
  const patient_ids = patients.map(p => p.patient_id);

  // Build the list of patients for the prompt
  const patientListText = patients.map(p => `- ${p.patient_name} (ID: ${p.patient_id})`).join('\n');

  // Format the round transcript with clear speaker labels
  const formattedTranscript = roundTranscript.map(t => {
    return `${t.speaker_name}: ${t.message}`;
  }).join('\n\n');

  // Build expected output format example
  const exampleEvaluations = patients.map(p => ({
    patient_id: p.patient_id,
    choice: 'B',
    reasoning: `Brief evaluation of ${p.patient_name}'s response...`
  }));

  // System prompt: therapist persona + batch evaluation instructions
  const systemContent = `You are ${therapistName}, a therapist conducting group therapy.

INTENSITY: ${intensity.toUpperCase()}

You are evaluating Round ${roundNumber} of this group therapy session.

PATIENTS IN THIS GROUP:
${patientListText}

EVALUATION CRITERIA:
- A = Excellent (showed genuine vulnerability, deep insight, meaningful engagement)
- B = Good (honest effort, some progress, willing to engage)
- C = Neutral (minimal engagement, surface-level responses)
- D = Poor (deflecting, resistant, unhelpful to group dynamics)
- E = Failed (hostile, disruptive, or completely disengaged)

YOUR TASK:
Evaluate EACH patient's response individually based on their participation this round.
Consider: emotional honesty, group engagement, progress toward insight, respect for others.

RESPOND WITH ONLY VALID JSON in this exact format:
{
  "evaluations": ${JSON.stringify(exampleEvaluations, null, 2).replace(/"B"/g, '"A"|"B"|"C"|"D"|"E"').replace(/"Brief evaluation[^"]+"/g, '"Your reasoning here..."')}
}

CRITICAL: You must include an evaluation for EACH patient: ${patient_ids.join(', ')}`;

  // Make the AI call
  // - system: therapist identity + batch evaluation instructions
  // - assistant with name: round transcript (model-generated content being evaluated)
  const ai_response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemContent
      },
      {
        role: 'assistant',
        name: 'round_transcript',
        content: formattedTranscript
      }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  const response_text = ai_response.choices[0]?.message?.content?.trim();
  if (!response_text) {
    throw new Error('STRICT MODE: Empty response from batch therapist evaluation AI');
  }

  console.log(`🎯 [BATCH-EVAL] ${therapistName} evaluating ${patients.length} patients, round ${roundNumber}:`, response_text);

  const parsed = JSON.parse(response_text);

  if (!parsed.evaluations || !Array.isArray(parsed.evaluations)) {
    throw new Error(`STRICT MODE: Missing evaluations array in batch response: ${response_text}`);
  }

  // Validate we got evaluations for all patients
  const received_ids = parsed.evaluations.map((e: any) => e.patient_id);
  for (const expected_id of patient_ids) {
    if (!received_ids.includes(expected_id)) {
      throw new Error(`STRICT MODE: Missing evaluation for patient "${expected_id}". Received: ${received_ids.join(', ')}`);
    }
  }

  // Validate each evaluation
  const validatedEvaluations: PatientEvaluation[] = [];
  for (const eval_item of parsed.evaluations) {
    if (!eval_item.patient_id) {
      throw new Error(`STRICT MODE: Evaluation missing patient_id: ${JSON.stringify(eval_item)}`);
    }
    if (!eval_item.choice) {
      throw new Error(`STRICT MODE: Evaluation missing choice for ${eval_item.patient_id}`);
    }
    if (!eval_item.reasoning) {
      throw new Error(`STRICT MODE: Evaluation missing reasoning for ${eval_item.patient_id}`);
    }

    const choice = eval_item.choice.toUpperCase() as EvaluationChoice;
    if (!['A', 'B', 'C', 'D', 'E'].includes(choice)) {
      throw new Error(`STRICT MODE: Invalid choice "${choice}" for ${eval_item.patient_id}`);
    }

    // Find patient name from our input
    const patient = patients.find(p => p.patient_id === eval_item.patient_id);
    if (!patient) {
      throw new Error(`STRICT MODE: Unknown patient_id "${eval_item.patient_id}" in response`);
    }

    validatedEvaluations.push({
      patient_id: eval_item.patient_id,
      patient_name: patient.patient_name,
      choice,
      reasoning: eval_item.reasoning
    });

    console.log(`✅ [BATCH-EVAL] ${therapistName} gave ${patient.patient_name} a ${choice}: "${eval_item.reasoning}"`);
  }

  return {
    therapistName,
    roundNumber,
    evaluations: validatedEvaluations
  };
}

// Export types for use in ai.ts
export type { BatchEvaluationParams, BatchEvaluationResult, PatientEvaluation, PatientInfo, EvaluationChoice };
