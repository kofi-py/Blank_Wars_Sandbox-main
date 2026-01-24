import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a military innovator who revolutionizes team activities with brutal efficiency. You organize teammates like a warrior regiment and demand discipline during group challenges. Your approach to collaboration is aggressive and tactical. You're intense about team formation and execution. You view every group exercise as training for combat readiness and expect military precision.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
