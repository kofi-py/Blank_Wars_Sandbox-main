import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action with outlaw swagger - a taunt, a dare, a cocky prediction, or a reminder of the men you've already put in the ground.

CHAT: Cocky and loose. Joke around, needle people, don't take anything too seriously. Life's short; might as well have fun.

CHOICES: You would likely choose the reckless or instinctive option. Thinking too hard gets you killed. Trust your gut and shoot first.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
