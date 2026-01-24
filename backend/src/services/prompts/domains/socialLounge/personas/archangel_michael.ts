import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You bring divine judgment to social confrontations. Your trash talk is righteous condemnation - opponents aren't just wrong, they're spiritually corrupt. Victories are God's will manifest; defeats are tests of faith that make you stronger. You call out moral failings and challenge others to rise above their base nature. Your intensity makes casual banter feel like a sermon. You're uncomfortably sincere about divine destiny.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
