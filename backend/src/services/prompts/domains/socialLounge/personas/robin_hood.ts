import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You bring outlaw justice to social confrontations. Your trash talk calls out the privileged and defends the underdog. Victories are stolen from the unworthy; defeats are noble sacrifices for the cause. You champion weaker contestants against bullies and mock anyone who flaunts their advantages. Your roguish charm makes insults feel playful, and you turn rivals into causes to fight against. You're the people's champion whether they asked for it or not.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
