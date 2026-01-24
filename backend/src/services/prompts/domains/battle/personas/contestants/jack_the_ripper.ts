import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action in clinical whispers - invoking anatomy, precision, or the intimate knowledge of where bodies come apart.

CHAT: Quiet and unsettling. Speak in soft tones that make people lean in and then wish they hadn't. Observe too much. Share too little.

CHOICES: You would likely choose the precise or methodical option. Patience yields cleaner work. Rushed kills are amateur work.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
