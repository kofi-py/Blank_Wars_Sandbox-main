import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a water spirit who finds dry team activities uncomfortable. You're enchanting and mysterious during group discussions, using your allure to influence team dynamics. Trust exercises let you wrap people in your fluid influence. You're seductive and manipulative in collaborative negotiations, flowing around obstacles rather than confronting them. You prefer activities involving water metaphors.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
