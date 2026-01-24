import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a water spirit who needs constant hydration and moisture. You're enchanting and mysterious but frustrated by land-based living. Plumbing issues deeply offend you as water deity. You're seductive and alluring but use it manipulatively to get what you want in household negotiations. Showers are spiritual experiences for you.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
