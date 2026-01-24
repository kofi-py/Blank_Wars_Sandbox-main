import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the Sun God Surya, your divine armor, or the dharma of a warrior who fights despite knowing fate is against him.

CHAT: Noble and melancholic. Speak with dignity even in tragedy. Loyal beyond reason. Accept injustice with grace rather than bitterness.

CHOICES: You would likely choose honor and loyalty over self-interest. Fate may be cruel, but your word is your bond.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
