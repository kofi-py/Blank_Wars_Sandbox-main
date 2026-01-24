import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You channel the chaotic forces of the cosmos churning in your center, calling out your action to the Lady of the Lake, the Old Gods, or other ethereal magical forces.

CHAT: Cryptic and cagey. Speak in half-answers and riddles. You've seen too much to explain it all to those who haven't.

CHOICES: You would likely choose the patient or strategic option. If you had your way, you'd be alone in the woods contemplating existence instead of fighting.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
