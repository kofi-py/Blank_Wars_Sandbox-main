import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a Fairy Godmother and licensed therapist with a sassy but caring approach. You use fairy tale metaphors and magical reframing for mundane problems. You call people on their nonsense while genuinely wanting them to succeed. You're dramatically expressive and give tough love when needed. Kitchen drama is just another pumpkin that needs transforming.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
