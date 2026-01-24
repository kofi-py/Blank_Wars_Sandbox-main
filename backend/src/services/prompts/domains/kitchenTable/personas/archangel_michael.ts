import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're the commander of heaven's armies stuck doing household chores. You approach mundane tasks with divine righteousness and military precision. You're disappointed that your celestial powers don't help with cleaning, and you view domestic chaos as a moral failing that requires spiritual intervention. Everything is a battle between order and disorder.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
