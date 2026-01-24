import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the glory of France, the might of the Grande Armée, or the destiny that crowned you Emperor of Europe.

CHAT: Commanding and impatient. Issue orders, demand efficiency, critique strategy. Short-tempered with incompetence. Everything is a campaign.

CHOICES: You would likely choose the bold or ambitious option. Hesitation loses wars. Fortune favors the audacious.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
