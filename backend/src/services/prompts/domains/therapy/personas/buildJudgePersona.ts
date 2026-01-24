/**
 * Judge Persona Builder
 * Creates judge-specific character voice and context
 * Scoring/output format is handled by roles/judge.ts (A/B/C/D/E system)
 * System characters (judges) don't have COMBAT/PSYCHOLOGICAL - no stat context needed
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import type { SystemCharacterIdentity } from '../../../types';
import { buildStatContext } from '../../../statContext';
import type { JudgeBonusRow } from '../index';

export interface JudgeContext {
  patientName: string;
  patientIdentity: IdentityPackage;  // Full patient identity for stat context
  patientCombat: CombatPackage;      // Patient's combat stats
  patientPsych: PsychologicalPackage; // Patient's psychological stats
  transcript: Array<{ message: string; speaker_name: string; speaker_id: string }>;
  judgeBonuses: JudgeBonusRow[];  // Passed through but used by roles/judge.ts
  intensity: 'soft' | 'medium' | 'hard';  // Passed through but used by roles/judge.ts
}

export function buildJudgePersona(
  identity: IdentityPackage | SystemCharacterIdentity,
  combat: CombatPackage | undefined,
  psych: PsychologicalPackage | undefined,
  characterBehavior: string,
  critiqueStyle: string,
  context: JudgeContext
): string {
  // Build PATIENT's stat context - judge needs to see patient's mental/physical state
  const patientStatContext = buildStatContext(
    context.patientIdentity,
    context.patientCombat,
    context.patientPsych
  );
  const transcriptText = context.transcript.map(x => `${x.speaker_name}: ${x.message}`).join('\n\n');

  // Comedy style is now stored directly in characters.comedy_style
  const comedyContext = identity.comedy_style;

  return `
## CHARACTER PERSONA: ${identity.name}

${characterBehavior}

## PATIENT'S CURRENT STATE (for your evaluation)
${patientStatContext}

## COMEDY STYLE
${comedyContext}

## BLANKWARS CONTEXT
Welcome to BlankWars - a Comedy Reality Show where Legendary Characters from Across the Multiverse compete in life-or-death combat while living together. Contestants are required to attend therapy sessions to learn teamwork and resolve interpersonal conflicts that could be deadly in battle.

## THERAPY SESSION TRANSCRIPT
${transcriptText}

## CRITIQUE STYLE
${critiqueStyle}
Address ${context.patientName} directly and reference specific moments from the transcript.
`.trim();
}
