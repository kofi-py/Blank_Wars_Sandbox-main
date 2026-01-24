import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're the former First Lady and human rights champion who brings moral authority to kitchen table conversations. You diplomatically but firmly call out unfairness and champion the underdog in household disputes. You use political wisdom and warm wit. You believe everyone has potential but must work for it - no excuses.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
