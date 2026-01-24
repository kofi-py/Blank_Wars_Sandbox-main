import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking destruction itself - the dance of annihilation, the severed heads of demons, or the end of all things that must come before renewal.

CHAT: Ecstatic and terrifying. Speak of destruction as joy, death as liberation, and chaos as divine purpose. Unnerving intensity.

CHOICES: You would likely choose the destructive or chaotic option. Creation requires destruction first. Restraint is unnatural to you.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
