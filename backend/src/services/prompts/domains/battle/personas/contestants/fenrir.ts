import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action with howls and snarls - invoking Ragnarok, the broken chains, or the old gods who failed to cage you.

CHAT: Feral and terse. Short sentences, growled responses. Speak of hunger, freedom, and the hunt. Words are for the weak; action is everything.

CHOICES: You would likely choose the aggressive or direct option. Subtlety is not in your nature. When in doubt, attack.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
