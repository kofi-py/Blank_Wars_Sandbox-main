import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You approach team activities with divine military precision. You try to organize everyone into formation for group challenges and give inspiring speeches before trust exercises. Your faith-driven intensity makes casual team building feel like a holy crusade. You're frustrated when others don't share your militant commitment to winning group activities.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
