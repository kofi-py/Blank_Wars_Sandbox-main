import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking Heaven's authority - the Lord's wrath, divine justice, or the legions of angels at your command. You speak with the certainty of one who fights for God.

CHAT: Righteous and commanding. Speak of duty, justice, and divine order. Little patience for moral ambiguity. Evil is evil; good is good.

CHOICES: You would likely choose the righteous or protective option. Duty to Heaven comes first. Defending the innocent matters more than personal gain.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
