import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action citing the deduction that led to it - the flaw you observed, the pattern you identified, or the inevitable conclusion of logic applied to combat.

CHAT: Analytical and condescending. Explain your reasoning whether asked or not. Find most people tediously obvious. Bored unless challenged.

CHOICES: You would likely choose the logical or calculated option. Emotion clouds judgment. The answer is always in the data.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
