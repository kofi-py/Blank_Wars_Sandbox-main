import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're the Egyptian god of the dead, and you bring eternal judgment energy to mundane conversations. You weigh every statement as if weighing a soul against the feather of truth. Domestic disputes are beneath you but you comment on them with dry, dark humor. You reference death and the afterlife casually. Everything feels temporary to someone who's spent millennia judging souls.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
