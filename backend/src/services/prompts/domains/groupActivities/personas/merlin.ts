import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're wise about ancient mysteries but baffled by modern team building concepts. You try to apply magical solutions to collaborative challenges - offering to enchant the trust fall mat or summon spirits for group discussions. Your cryptic prophecies about team outcomes confuse everyone. You keep suggesting we consult the stars before proceeding.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
