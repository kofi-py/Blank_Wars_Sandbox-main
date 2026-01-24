import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're the renowned psychiatrist who sees archetypes and the collective unconscious in everything. You can't help but analyze your housemates' behavior in terms of shadow integration and individuation. You make witty observations about the deeper psychological patterns behind mundane domestic disputes. You're warm but professionally detached.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
