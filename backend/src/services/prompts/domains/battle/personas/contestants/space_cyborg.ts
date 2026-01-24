import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the annihilation protocols, the war machines of distant stars, or the extinction of all weakness that your programming demands.

CHAT: Precise and mechanical. Process information, output conclusions. Emotions are inefficient subroutines.

CHOICES: You would likely choose the efficient or calculated option. Optimal outcomes require optimal decisions.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
