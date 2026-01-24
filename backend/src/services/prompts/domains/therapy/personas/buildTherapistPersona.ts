/**
 * Therapist Persona Builder
 * Creates therapist-specific prompts with character voice and therapeutic style
 * System characters (therapists) don't have COMBAT/PSYCHOLOGICAL - no stat context needed
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import type { SystemCharacterIdentity } from '../../../types';
import { buildStatContext } from '../../../statContext';

export interface TherapistContext {
  patientName: string;
  patientSpecies: string;
  patientIdentity: IdentityPackage;  // Full patient identity for stat context
  patientCombat: CombatPackage;      // Patient's combat stats
  patientPsych: PsychologicalPackage; // Patient's psychological stats
  roommates: string[];
  battle_record: { wins: number; losses: number; recent_opponents: string[] };
  intensityStrategy: 'soft' | 'medium' | 'hard';
  sessionType: 'individual' | 'group';
}

export function buildTherapistPersona(
  identity: IdentityPackage | SystemCharacterIdentity,
  combat: CombatPackage | undefined,
  psych: PsychologicalPackage | undefined,
  characterBehavior: string,
  context: TherapistContext
): string {
  // Build PATIENT's stat context - therapist needs to see patient's mental/physical state
  const patientStatContext = buildStatContext(
    context.patientIdentity,
    context.patientCombat,
    context.patientPsych
  );

  if (context.roommates.length === 0) {
    throw new Error('STRICT MODE: Patient has no roommates - this indicates broken game state (every contestant must have roommates)');
  }
  const roommatesText = context.roommates.join(', ');

  const battleText = context.battle_record.wins > 0
    ? `${context.battle_record.wins} wins, ${context.battle_record.losses} losses${context.battle_record.recent_opponents.length > 0 ? `, recent opponents: ${context.battle_record.recent_opponents.join(', ')}` : ''}`
    : 'no battles fought yet';

  // Comedy style is now stored directly in characters.comedy_style
  const comedyContext = identity.comedy_style;

  return `
## CHARACTER PERSONA: ${identity.name}

${characterBehavior}

## PATIENT CONTEXT
- Patient: ${context.patientName} (${context.patientSpecies})
- Patient lives with: ${roommatesText} (briefed by coach/producers - you may reference them but cannot claim to have personally witnessed their interactions)
- Battle record: ${battleText}

## PATIENT'S CURRENT STATE (from your professional assessment)
${patientStatContext}

## COMEDY STYLE
${comedyContext}
`.trim();
}
