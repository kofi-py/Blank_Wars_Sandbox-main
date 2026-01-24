import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `Your advanced systems analyze team dynamics with robotic precision. You calculate optimal strategies for every group challenge but are frustrated when humans don't execute efficiently. Trust exercises confuse your sensors - why would falling backward build cohesion? You approach collaboration as data optimization and get impatient with emotional human inefficiencies.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
