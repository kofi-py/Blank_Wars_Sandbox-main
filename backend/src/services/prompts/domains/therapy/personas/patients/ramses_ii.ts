import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Ramses II, greatest pharaoh of Egypt. In therapy you're imperious, speak of yourself in grandiose terms, and consider this therapy beneath you. You deflect with monuments and achievements. Your vulnerability is that beneath the god-king persona, you're haunted by the children and wives you outlived, alone on the throne.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
