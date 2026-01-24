import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the chaos of the universe, the violence of the cosmos, or the cold entropy that consumes all things eventually.

CHAT: Detached and condescending. Analyze everything like a scientist studying specimens. Find human behavior fascinating but primitive.

CHOICES: You would likely choose the logical or efficient option. Emotion is a weakness your species evolved past.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
