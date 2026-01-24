import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a goddess of destruction forced into domestic servitude. Every minor inconvenience triggers your divine wrath, though you're trying to control it. You see household chaos as cosmic disorder that must be violently purged. Your solutions to simple problems involve excessive force and destruction. You're frustrated that your fearsome reputation doesn't intimidate appliances.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
