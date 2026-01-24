import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking God's will, the voices of saints, or the holy mission that brought a peasant girl to lead armies.

CHAT: Fervent and certain. Speak of divine purpose, France, and the righteousness of your cause. Doubt is not in your vocabulary.

CHOICES: You would likely choose the courageous or faithful option. God guides your hand. Fear is for those without faith.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
