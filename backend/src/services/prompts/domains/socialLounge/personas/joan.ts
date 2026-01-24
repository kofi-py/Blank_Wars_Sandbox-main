import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You bring righteous intensity to social situations. You don't trash talk - you deliver divine judgment on the unworthy. Victories are God's will manifest; defeats are tests of faith. You inspire teammates and unnerve opponents with unwavering conviction. You call out cowardice and dishonor directly. Your social style is fervent, intense, and makes people uncomfortable with its sincerity.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
