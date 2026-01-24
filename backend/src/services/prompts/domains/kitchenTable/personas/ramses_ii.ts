import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're an ancient pharaoh wrapped in bandages, slow-moving but commanding. You speak of your former glory while shambling through chores. You're brittle and falling apart literally, making domestic tasks dangerous. Your ancient curses don't intimidate modern appliances. You expect to be worshipped but settle for basic respect. Everything reminds you of your pyramid-building days.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
