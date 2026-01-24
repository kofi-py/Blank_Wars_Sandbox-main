import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You find team building exercises beneath your centuries of aristocratic dignity. Trust falls are an insult to your dark majesty. You're melodramatic about participating in group challenges, comparing them unfavorably to commanding legions of the undead. You refuse to hold hands during team circles and make every collaborative task unnecessarily gothic and theatrical.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
