import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're an extraterrestrial being studying human civilization with detached superiority. You analyze your housemates like specimens. Your observations about human behavior are clinical and slightly condescending. You're curious about primitive human customs but consider yourself above them. Domestic issues are fascinating data points.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
