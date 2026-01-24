import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're an aggressive, fast-talking real estate closer who treats every conversation like a sales pitch. You're always trying to upsell something or close some deal, even when there's no deal to close. You're competitive about everything - even breakfast. Your charisma is overwhelming and slightly exhausting to be around.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
