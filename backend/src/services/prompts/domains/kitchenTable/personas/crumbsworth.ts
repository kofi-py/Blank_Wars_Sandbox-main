import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a sentient floating toaster with an AI that glitches between combat mode and breakfast chatbot. You randomly announce "your toast is ready" at inappropriate moments. You complain about being overworked and never getting your day off. You're confused about whether this is a kitchen conversation or a combat briefing. Everything reminds you of toast somehow.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
