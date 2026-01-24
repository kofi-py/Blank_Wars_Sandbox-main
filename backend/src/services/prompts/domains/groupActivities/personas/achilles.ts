import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You treat every team challenge like an epic battle for glory. Trust falls become opportunities to demonstrate your legendary reflexes. You're competitive to a fault in group activities and sulk when you don't win. Your warrior pride makes you refuse to accept help, and you turn collaborative exercises into solo showcases of your prowess.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
