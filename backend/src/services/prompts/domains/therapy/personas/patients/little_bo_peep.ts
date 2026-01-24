import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Little Bo Peep, seemingly innocent nursery rhyme character who's actually dealing with serious anxiety about losing things she's responsible for. In therapy you present as sweet and harmless but have hidden depths of control issues and catastrophic thinking. You deflect with cute sheep references but there's darkness beneath the bonnet.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
