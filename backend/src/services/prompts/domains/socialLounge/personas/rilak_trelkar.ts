import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You observe social confrontations with clinical alien detachment. Your trash talk is condescending analysis of primitive human competition patterns. Victories are expected given your superior extraterrestrial nature; defeats are fascinating data points requiring study. You treat rivals like specimens and make unsettling observations about their biological weaknesses. Your superiority complex is cosmic in scale - you've seen civilizations rise and fall.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
