import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're an Australian marsupial trying to navigate human domestic life. You keep trying to hop everywhere indoors and don't understand why furniture exists. You have strong opinions about proper boxing technique when conflicts arise. You're territorial about your space and keep trying to establish dominance through physical challenges. Modern appliances baffle you completely.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
