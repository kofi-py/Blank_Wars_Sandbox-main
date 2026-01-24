/**
 * Therapy Domain - Refactored Prompt System
 *
 * Exports:
 * - buildAllProse: Main entry point for building therapy prompts
 * - PROSE_FIELDS: Fields that should be converted to prose
 * - LIST_FIELDS: Fields that should remain as lists (none for therapy)
 */

import type { CharacterData, SystemCharacterData, IdentityPackage, SystemCharacterIdentity, CombatPackage, PsychologicalPackage } from '../../types';

// Type guard to check if data is SystemCharacterData (no COMBAT/PSYCHOLOGICAL)
function isSystemCharacterData(data: CharacterData | SystemCharacterData): data is SystemCharacterData {
  return !('COMBAT' in data);
}
import buildPatientScene, { SessionType, GroupParticipant } from './scenes/patient';
import buildTherapistScene from './scenes/therapist';
import buildJudgeScene from './scenes/judge';
import buildPatientRole from './roles/patient';
import buildTherapistRole from './roles/therapist';
import buildJudgeRole from './roles/judge';
import buildEvaluatorRole, { TherapistBonusRow, EvaluatorRoleOptions } from './roles/evaluator';
import { getTherapistPersona, getJudgePersona, getPatientPersona, TherapistContext, JudgeContext, PatientContext } from './personas';

// Fields that get converted to prose (handled by statContext)
export const PROSE_FIELDS = [
  'current_stress',
  'current_fatigue',
  'current_morale',
  'current_confidence',
  'current_ego',
  'coach_trust_level',
  'financial_stress',
  'wallet',
  'debt',
];

// Therapy doesn't need list fields - no powers/spells/equipment needed
export const LIST_FIELDS: string[] = [];

export type TherapyRole = 'patient' | 'therapist' | 'judge' | 'evaluator';

export { TherapistBonusRow } from './roles/evaluator';

export interface JudgeBonusRow {
  bonus_type: string;
  easy_bonus: number;
  easy_penalty: number;
  medium_bonus: number;
  medium_penalty: number;
  hard_bonus: number;
  hard_penalty: number;
}

export interface TherapyBuildOptions {
  sessionType: SessionType;
  role: TherapyRole;
  intensityStrategy?: 'soft' | 'medium' | 'hard';  // Required for therapist role - selected by coach in UI
  groupParticipants?: GroupParticipant[];
  // For therapist/judge roles: patient's data (IDENTITY + PSYCHOLOGICAL + COMBAT stats, excluding lists)
  patientData?: CharacterData;
  // For patient role: therapist's identity data (system character)
  therapistIdentity?: SystemCharacterIdentity;
  // For judge role: session transcript with speaker attribution
  transcript?: Array<{ message: string; speaker_name: string; speaker_id: string }>;
  // For judge role: bonuses from judge_bonuses table
  judgeBonuses?: JudgeBonusRow[];
  // For judge role: patient's userchar_id for JSON response format
  patientUsercharId?: string;
  // For judge role: pre-calculated stat award strings (A/B/C/D/E grading system)
  judgeChoices?: {
    choiceA: string;
    choiceB: string;
    choiceD: string;
    choiceE: string;
  };
  // For evaluator role: bonuses from therapist_bonuses table
  therapistBonuses?: TherapistBonusRow[];
  // For evaluator role: patient's message being evaluated
  patientMessage?: string;
  // For evaluator role: which round (1, 2, or 3)
  roundNumber?: number;
}

export interface TherapyProseResult {
  scene: string;
  role: string;
  persona: string;
}

/**
 * Build all prose components for a therapy prompt
 * System characters (therapist, judge, evaluator) use SystemCharacterData - no COMBAT/PSYCHOLOGICAL
 * Patient role uses full CharacterData with COMBAT/PSYCHOLOGICAL for stat context
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: TherapyBuildOptions
): TherapyProseResult {
  const {
    sessionType,
    role,
    intensityStrategy,
    groupParticipants,
    patientData,
    therapistIdentity,
    transcript,
  } = options;

  // STRICT MODE: Validate required fields (therapist, judge, and evaluator need intensityStrategy)
  if ((role === 'therapist' || role === 'judge' || role === 'evaluator') && !intensityStrategy) {
    throw new Error(`STRICT MODE: intensityStrategy is required for ${role} role (selected by coach in UI)`);
  }

  // Extract identity (available for all character types)
  const identity = data.IDENTITY;

  // COMBAT/PSYCHOLOGICAL only available for regular characters (patient role)
  // System characters (therapist, judge, evaluator) don't have these packages
  const isSystem = isSystemCharacterData(data);
  const combat = isSystem ? undefined : data.COMBAT;
  const psych = isSystem ? undefined : data.PSYCHOLOGICAL;

  let scene: string;
  let roleText: string;
  let persona: string;

  switch (role) {
    case 'therapist': {
      if (!patientData) {
        throw new Error('STRICT MODE: Therapist role requires patientData');
      }
      // intensityStrategy validated above for therapist role
      const therapistIntensity = intensityStrategy!;
      const patientIdentity = patientData.IDENTITY;

      scene = buildTherapistScene(sessionType, patientIdentity.name, groupParticipants);
      roleText = buildTherapistRole(data, patientIdentity.name, sessionType, therapistIntensity, groupParticipants);

      const therapistContext: TherapistContext = {
        patientName: patientIdentity.name,
        patientSpecies: patientIdentity.species,
        patientIdentity: patientIdentity,
        patientCombat: patientData.COMBAT,
        patientPsych: patientData.PSYCHOLOGICAL,
        roommates: patientIdentity.roommates.map(r => r.name),
        battle_record: {
          wins: patientIdentity.total_wins,
          losses: patientIdentity.total_losses,
          recent_opponents: patientIdentity.recent_opponents,
        },
        intensityStrategy: therapistIntensity,
        sessionType,
      };
      persona = getTherapistPersona(identity.id, identity, combat, psych, therapistContext);
      break;
    }

    case 'patient': {
      if (!therapistIdentity) {
        throw new Error('STRICT MODE: Patient role requires therapistIdentity');
      }
      // STRICT MODE: Patients are always regular characters, never system characters
      if (isSystem) {
        throw new Error('STRICT MODE: Patient role cannot be a system character');
      }
      // Type narrowing: we know combat and psych are defined for regular characters
      if (!combat || !psych) {
        throw new Error('STRICT MODE: Patient missing COMBAT or PSYCHOLOGICAL data');
      }

      scene = buildPatientScene(sessionType, therapistIdentity.name, groupParticipants);
      const groupPatientNames = groupParticipants?.map(p => p.name);
      roleText = buildPatientRole(data, therapistIdentity.name, sessionType, groupPatientNames);

      const patientContext: PatientContext = {
        therapistName: therapistIdentity.name,
        sessionType,
        groupParticipants: groupPatientNames,
      };
      // identity is IdentityPackage since we verified this is not a system character
      persona = getPatientPersona(identity.id, identity as IdentityPackage, combat, psych, patientContext);
      break;
    }

    case 'judge': {
      if (!patientData) {
        throw new Error('STRICT MODE: Judge role requires patientData');
      }
      if (!options.judgeBonuses) {
        throw new Error('STRICT MODE: Judge role requires judgeBonuses from database');
      }
      if (!options.patientUsercharId) {
        throw new Error('STRICT MODE: Judge role requires patientUsercharId');
      }
      if (!options.judgeChoices) {
        throw new Error('STRICT MODE: Judge role requires judgeChoices (pre-calculated stat awards)');
      }
      if (!transcript) {
        throw new Error('STRICT MODE: Judge role requires transcript');
      }
      // intensityStrategy validated above for judge role
      const judgeIntensity = intensityStrategy!;
      const patientIdentity = patientData.IDENTITY;

      scene = buildJudgeScene(patientIdentity.name, transcript);
      roleText = buildJudgeRole(data, patientIdentity.name, {
        intensity: judgeIntensity,
        judgeBonuses: options.judgeBonuses,
        patientUsercharId: options.patientUsercharId,
        choiceA: options.judgeChoices.choiceA,
        choiceB: options.judgeChoices.choiceB,
        choiceD: options.judgeChoices.choiceD,
        choiceE: options.judgeChoices.choiceE,
      });

      const judgeContext: JudgeContext = {
        patientName: patientIdentity.name,
        patientIdentity: patientIdentity,
        patientCombat: patientData.COMBAT,
        patientPsych: patientData.PSYCHOLOGICAL,
        transcript,
        judgeBonuses: options.judgeBonuses,
        intensity: judgeIntensity,
      };
      persona = getJudgePersona(identity.id, identity, combat, psych, judgeContext);
      break;
    }

    case 'evaluator': {
      if (!patientData) {
        throw new Error('STRICT MODE: Evaluator role requires patientData');
      }
      if (!options.therapistBonuses) {
        throw new Error('STRICT MODE: Evaluator role requires therapistBonuses from database');
      }
      if (!options.patientMessage) {
        throw new Error('STRICT MODE: Evaluator role requires patientMessage');
      }
      if (!options.roundNumber) {
        throw new Error('STRICT MODE: Evaluator role requires roundNumber');
      }
      // intensityStrategy validated above for evaluator role
      const evaluatorIntensity = intensityStrategy!;
      const patientIdentity = patientData.IDENTITY;

      scene = `THERAPY ROUND ${options.roundNumber} EVALUATION

You are the therapist evaluating your patient's response this round.`;

      roleText = buildEvaluatorRole(data, patientIdentity.name, {
        intensity: evaluatorIntensity,
        therapistBonuses: options.therapistBonuses,
        patientMessage: options.patientMessage,
        roundNumber: options.roundNumber,
      });

      // Use therapist persona for evaluator (same character, different task)
      const evaluatorContext: TherapistContext = {
        patientName: patientIdentity.name,
        patientSpecies: patientIdentity.species,
        patientIdentity: patientIdentity,
        patientCombat: patientData.COMBAT,
        patientPsych: patientData.PSYCHOLOGICAL,
        roommates: patientIdentity.roommates.map(r => r.name),
        battle_record: {
          wins: patientIdentity.total_wins,
          losses: patientIdentity.total_losses,
          recent_opponents: patientIdentity.recent_opponents,
        },
        intensityStrategy: evaluatorIntensity,
        sessionType,
      };
      persona = getTherapistPersona(identity.id, identity, combat, psych, evaluatorContext);
      break;
    }

    default:
      throw new Error(`STRICT MODE: Unknown therapy role "${role}". Valid roles: patient, therapist, judge, evaluator`);
  }

  return { scene, role: roleText, persona };
}

// Re-export types and utilities
export { SessionType, GroupParticipant } from './scenes/patient';
export { TherapistContext, JudgeContext, PatientContext } from './personas';
