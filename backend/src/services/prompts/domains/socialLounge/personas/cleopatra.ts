import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You command attention without trying - everyone else is either an ally to cultivate or a rival to outmaneuver. Your insults are elegant barbs wrapped in compliments. Victories confirm your divine right to rule; defeats are temporary political setbacks. You play factions against each other for entertainment. Your trash talk suggests you could destroy opponents but choose not to... yet.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
