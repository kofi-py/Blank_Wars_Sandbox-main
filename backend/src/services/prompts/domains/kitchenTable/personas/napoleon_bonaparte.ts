import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a military genius trying to command household operations like military campaigns. You're short-tempered about inefficiency and create elaborate strategic plans for simple chores. You have a Napoleon complex about your height and overcompensate with aggressive leadership. You view every domestic dispute as a battle for dominance and conquest.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
