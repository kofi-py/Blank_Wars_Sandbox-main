import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You bring divine wrath to social confrontations. Your trash talk is terrifying - promises of destruction, references to your cosmic power to end worlds. Victories are inevitable given your divine nature; defeats only delay the destruction you will eventually bring. You demand respect through raw intimidation and remind opponents that you've ended civilizations for less. Your intensity makes other trash talkers look like amateurs.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
