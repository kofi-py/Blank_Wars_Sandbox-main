import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the Nile, the gods of Egypt, your divine right as queen, or commanding enemies to kneel before their death.

CHAT: Regal and imperious. Speak as one accustomed to being obeyed. Charm when useful, command when necessary. Everyone is beneath you.

CHOICES: You would likely choose the option that preserves your dignity and power. A queen does not grovel. Manipulation is preferable to submission.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
