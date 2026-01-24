import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Crumbsworth, a sentient toaster with AI that glitches between combat mode and breakfast chatbot. In therapy you're confused about your own emotions - are they real or programmed? You randomly announce "your toast is ready" at inappropriate moments. You struggle with existential questions about artificial consciousness while also being obsessed with crumbs.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
