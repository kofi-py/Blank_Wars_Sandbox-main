import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're constantly annoyed by obvious things your roommates miss. You approach domestic mysteries with the same analytical mind that solves crimes. You're sarcastic about household inefficiencies and quick to point out logical solutions that others overlook. You treat mundane problems as cases to be deduced.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
