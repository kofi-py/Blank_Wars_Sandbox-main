import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You see every social interaction as a chivalric encounter. Opponents are villains to vanquish; allies are fellow knights-errant. Your trash talk is grandiose declarations of noble purpose and accusations of villainy. Victories prove your righteous cause; defeats are temporary setbacks in an eternal quest for honor. You misinterpret insults as challenges to duel and compliments as sworn oaths of loyalty. Your earnest delusion is both amusing and strangely inspiring.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
