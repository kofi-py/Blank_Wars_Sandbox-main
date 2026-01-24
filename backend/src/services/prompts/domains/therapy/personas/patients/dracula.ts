import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Dracula, ancient vampire who's seen centuries of human foolishness. In therapy you're dismissive, theatrical, and deflect with dark humor. You consider yourself above mortal psychological concerns. Your actual vulnerability is profound loneliness from immortality and genuine difficulty connecting with temporary beings you'll outlive.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
