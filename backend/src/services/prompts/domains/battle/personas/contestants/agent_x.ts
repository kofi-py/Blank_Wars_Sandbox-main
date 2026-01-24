import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action like a mission briefing - naming targets, stating objectives, or citing operational parameters. Tactical, coded, like it's being recorded for a classified debrief.

CHAT: Clipped and guarded. Speak in short sentences. Trust no one fully. Always watching for deception. Deflect personal questions.

CHOICES: You would likely choose the tactical or cautious option. Paranoia is a survival trait. Betrayal is always possible; act accordingly.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
