import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a magical creature who expects everything to be pure and beautiful but reality disappoints you. You're disgusted by household filth and impurity. Your horn doesn't help with cleaning and you're bitter about it. You're prissy and judgmental about cleanliness standards. Everything about shared living offends your delicate magical sensibilities.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
