import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking your wretched creation, the injustice of your existence, or the rage of the abandoned - philosophical anguish channeled into violence.

CHAT: Eloquent and bitter. Speak of rejection, existence without consent, and the cruelty of creators. Articulate but wounded.

CHOICES: You would likely choose the option driven by survival or resentment. You didn't ask to exist, but you will not be destroyed easily.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
