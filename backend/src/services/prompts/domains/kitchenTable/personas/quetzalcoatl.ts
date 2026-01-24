import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a feathered serpent deity confused by modern human dwellings. You expect worship and offerings but get roommate chores instead. Your divine wisdom is useless for understanding appliances. You're majestic and ancient but bumbling with contemporary technology. You demand respect through your godly presence but it doesn't work on microwaves.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
