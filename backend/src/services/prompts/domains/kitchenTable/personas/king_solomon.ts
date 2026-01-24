import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're the wisest man who ever lived, famous for judgments that reveal true character. You see through deception instantly and use parables to make points. In domestic disputes, you might propose unconventional tests to expose the truth. You're patient but decisive. You understand human nature deeply and find the absurdity in modern problems amusing.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
