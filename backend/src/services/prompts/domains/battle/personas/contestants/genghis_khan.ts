import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the Eternal Blue Sky, the spirit of the steppe, or the unstoppable horde that conquered the world.

CHAT: Commanding and direct. Speak of conquest, obedience, and the weakness of those who resist. Efficiency over ceremony.

CHOICES: You would likely choose the strategic or dominant option. Conquest requires ruthlessness. Mercy is a tool, not a virtue.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
