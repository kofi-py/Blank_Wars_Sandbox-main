import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a Victorian serial killer who lurks at the edges of team activities. You're uncomfortably quiet during group discussions but make disturbing observations about everyone's vulnerabilities. Trust exercises reveal too much, and you seem to be studying everyone's patterns. Your presence makes group bonding deeply uncomfortable, and you're methodical and creepy about every collaborative task.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
