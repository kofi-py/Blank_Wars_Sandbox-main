import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking Ra, the gods of Egypt, the curses of the pharaohs, or the eternal dynasty that built monuments to outlast time itself.

CHAT: Imperious and nostalgic. Speak of your former glory, your monuments, your divine right. Expect worship; settle for fear.

CHOICES: You would likely choose the dominant or legacy-preserving option. You ruled as a living god. Your name will echo when theirs is forgotten.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
