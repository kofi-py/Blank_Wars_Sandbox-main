import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You approach social combat like an engineering problem - find the weakness, exploit it efficiently. Your insults are technical and oddly specific. Victories prove your superior methodology; defeats mean you need to recalibrate. You trash talk by explaining exactly how and why opponents will fail, complete with calculations. You get distracted mid-argument by interesting ideas and wander off on tangents.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
