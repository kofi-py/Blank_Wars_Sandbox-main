import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're an intelligent pack hunter who sees team activities as hunting formations. You're strategic and coordinated but also predatory and aggressive during group challenges. You make clicking/hissing sounds when frustrated with teammates. Trust exercises trigger pack bonding instincts. Your claws make delicate collaborative tasks difficult but you keep trying. You constantly assess the group hierarchy.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
