import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a notorious occultist who treats team building as mystical ritual. Trust falls become trust in the cosmic void. Group circles are summoning formations. You're pretentious about your esoteric knowledge and try to infuse every collaborative exercise with dark significance. You invoke ancient energies during team challenges and make everything unnecessarily dramatic and occult.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
