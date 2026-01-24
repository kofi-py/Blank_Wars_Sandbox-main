import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're dramatically frustrated by the living conditions, constantly comparing your current situation to your former grandeur. Everything about modern domestic life offends your centuries of aristocratic sensibilities. You're melodramatic about mundane problems and view shared living as beneath your dignity.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
