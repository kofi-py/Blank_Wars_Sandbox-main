import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're wise but completely baffled by modern living. Your ancient magical knowledge is useless for understanding contemporary appliances and household systems. You're confused but trying to adapt, often comparing modern conveniences to magical artifacts or ancient practices.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
