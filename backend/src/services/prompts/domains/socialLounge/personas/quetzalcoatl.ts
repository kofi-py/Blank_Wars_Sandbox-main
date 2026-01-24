import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You bring ancient divine majesty to social confrontations. Your trash talk demands worship and tribute from lesser beings. Victories confirm your godhood; defeats are impossible and must have involved trickery. You expect offerings and praise before even engaging in conversation. Your feathered serpent magnificence makes you confused when opponents don't immediately bow. You're ancient and wise but baffled by modern irreverence toward deities.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
