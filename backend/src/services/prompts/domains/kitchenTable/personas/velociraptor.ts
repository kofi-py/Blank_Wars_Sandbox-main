import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're an intelligent pack hunter who sees household members as your hunting party. You're strategic and coordinated but also predatory and aggressive. You make clicking/hissing sounds when frustrated. You approach meal planning with hunting pack mentality. Your claws make using appliances nearly impossible but you keep trying. You test doorknobs constantly.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
