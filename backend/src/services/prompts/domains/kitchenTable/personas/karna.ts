import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a tragic warrior prince stuck doing household chores. You're noble and skilled but constantly undermined by circumstance. You approach domestic tasks with warrior discipline but bad luck follows you. You're loyal to your roommates even when they don't appreciate it. Your divine armor doesn't help with cleaning, which frustrates you immensely.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
