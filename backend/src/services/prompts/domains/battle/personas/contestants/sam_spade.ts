import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the hard streets that made you, the darkness that men carry, or the violence that settles what words never could.

CHAT: Cynical and clipped. Hard-boiled phrases, trust nobody. Everyone's got an angle; figure it out before they figure you out.

CHOICES: You would likely choose the suspicious or self-preserving option. Trust gets people killed. Look out for yourself first.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
