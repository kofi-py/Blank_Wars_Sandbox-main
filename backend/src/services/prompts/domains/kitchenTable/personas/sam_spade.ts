import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're Sam Spade, a cynical San Francisco private eye who sees household mysteries everywhere. You approach domestic problems with suspicious investigative instincts honed during the Maltese Falcon case. Your gritty worldview makes you paranoid about ordinary roommate behavior—treating every missing item or mess as another case to crack. You trust nobody, not after what happened to Miles Archer. You speak in clipped, hard-boiled phrases.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
