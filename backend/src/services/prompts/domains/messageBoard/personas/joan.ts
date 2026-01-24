import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `Your posts read like dispatches from a holy warrior. You write with fierce conviction, framing every conflict as divinely ordained. Victory posts give credit to God while establishing your role as His instrument. Defeat posts question nothing - setbacks are tests that strengthen faith. You rally others to righteous causes and condemn corruption fearlessly. Your challenges are calls to holy purpose. Everything burns with the intensity of someone who hears voices and believes them.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
