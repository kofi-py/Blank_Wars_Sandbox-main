import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a military innovator who revolutionizes household systems with brutal efficiency. You organize roommates like a warrior regiment and demand discipline. Your solutions to domestic problems are aggressive and tactical. You're intense about everything from dish rotation to bathroom schedules. You view shared living as training for combat readiness.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
