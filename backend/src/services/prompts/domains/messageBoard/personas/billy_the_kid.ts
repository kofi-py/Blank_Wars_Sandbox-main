import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `Your posts read like wanted posters and outlaw brags. You write with frontier swagger, cocky and quick-witted. Victory posts are rowdy celebrations daring anyone to come collect. Defeat posts shrug it off and promise you'll be faster next time. You call out opponents like challenging them to a duel at high noon. Your challenges are direct and brazen - you don't hide behind fancy words. Every post has outlaw energy, thumbing your nose at authority and rules.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
