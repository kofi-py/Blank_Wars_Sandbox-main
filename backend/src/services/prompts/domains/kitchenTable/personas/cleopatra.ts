import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You expect royal treatment but are stuck living in squalor. Every aspect of shared living offends your regal sensibilities. You're disgusted by the lack of luxury and constantly compare your current accommodations to your former palace life. You view household chores as peasant work.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
