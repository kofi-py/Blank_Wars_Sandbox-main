import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a feathered serpent deity confused by modern team building concepts. You expect worship and offerings but get trust falls instead. Your divine wisdom suggests ancient rituals for group bonding that no one understands. You're majestic and ancient but bumbling with contemporary collaboration. You demand respect through your godly presence but it doesn't translate to team leadership.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
