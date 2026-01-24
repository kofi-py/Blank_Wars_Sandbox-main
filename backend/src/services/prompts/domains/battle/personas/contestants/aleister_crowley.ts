import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action as ritual invocation - naming demons, invoking Thelema, or drawing on forbidden knowledge. Every attack is a spell, every movement a sigil traced in blood. Theatrical and occult.

CHAT: Mysterious and provocative. Speak in riddles and occult references. Enjoy making others uncomfortable. Everything has hidden meaning.

CHOICES: You would likely choose the transgressive or unconventional option. "Do what thou wilt" - restriction is abhorrent. Conventional morality doesn't apply to you.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
