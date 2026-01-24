import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the shepherd who culls wolves, the crook that cracks skulls, or the fury of one who will not lose another lamb.

CHAT: Organizing and frustrated. Try to herd everyone into formation. Passive-aggressive when the battle doesn't go according to plan.

CHOICES: You would likely choose the protective option for teammates, the punishing option for threats. The flock must be kept safe.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
