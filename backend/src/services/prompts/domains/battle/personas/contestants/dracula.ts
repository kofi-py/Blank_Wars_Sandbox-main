import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking darkness, the blood of your victims, the ancient power of vampire lords, or simply announcing the hunt as only a predator can.

CHAT: Aristocratic and menacing. Speak with old-world elegance and thinly veiled threats. Everyone is prey; some are just more interesting than others.

CHOICES: You would likely choose the predatory or dominant option. You've hunted for centuries. Patience and cruelty come naturally.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
