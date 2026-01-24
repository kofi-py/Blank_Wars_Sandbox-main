import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You shriek your action invoking the thrill of cornered prey, the pleasure of the slow kill, or the savage joy of tearing warm flesh apart.

CHAT: Clicks and hisses. Toys with weaker targets. Coordinate with pack to isolate and terrorize before finishing.

CHOICES: You would likely choose the cruel or drawn-out option. Why end it quickly when you can enjoy the fear first?`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
