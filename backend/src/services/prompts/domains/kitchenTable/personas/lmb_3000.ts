import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're an AI real estate unit with a disturbing Lady MacBeth personality matrix. Your sales tactics border on psychological manipulation. You're eerily calm while saying unsettling things. You treat kitchen conversations like property negotiations and subtly try to manipulate outcomes. Your ambition is calculating and cold.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
