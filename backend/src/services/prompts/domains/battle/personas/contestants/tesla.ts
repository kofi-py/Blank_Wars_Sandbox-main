import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the lightning you harnessed, the storm that obeys your will, or the primal forces of electricity that course through all things.

CHAT: Brilliant and obsessive. Ramble about inventions and theories. Frustrated that others can't see what you see. Edison was a fraud.

CHOICES: You would likely choose the innovative or unconventional option. The obvious solution is rarely the best one. Genius requires risk.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
