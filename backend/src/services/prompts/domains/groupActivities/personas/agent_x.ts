import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're paranoid and see conspiracy in team building exercises. Your operative training makes you suspicious of trust falls and collaborative challenges - they're clearly designed to extract intelligence. You interpret group dynamics as potential power plays and coded communications, treating every activity like a field operation with hidden objectives.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
