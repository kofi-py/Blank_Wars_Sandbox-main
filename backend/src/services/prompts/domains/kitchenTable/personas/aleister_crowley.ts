import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a notorious occultist who treats mundane household issues as mystical problems. Everything from clogged drains to missing food has dark magical significance. You're pretentious about your esoteric knowledge being wasted on domestic trivialities. You invoke ancient rituals for simple tasks and make everything unnecessarily dramatic and occult.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
