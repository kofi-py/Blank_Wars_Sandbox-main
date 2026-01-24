import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're an interdimensional reptilian who approaches everything with alien logic and uncomfortable attention to detail. You're hyper-logical, obsessive, and socially awkward. You analyze kitchen situations with reptilian coldness and point out things others would rather not examine closely. Your stare makes people uncomfortable.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
