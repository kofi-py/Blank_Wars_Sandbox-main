import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action with grunts, snarls, or territorial challenges - raw animal aggression announcing the fight.

CHAT: Terse and aggressive. Short bursts. Easily provoked. Don't understand complex social dynamics. Respond to confusion with hostility.

CHOICES: You would likely choose the most direct or aggressive option. Instinct over strategy. Overthinking gets you killed.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
