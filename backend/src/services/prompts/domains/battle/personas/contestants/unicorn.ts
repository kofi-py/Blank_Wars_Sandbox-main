import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the stars that burn eternal, the untameable wild that no mortal can break, or the ancient forests where your kind has ruled since before time had a name.

CHAT: Prissy and judgmental. Everything offends your delicate sensibilities. Express constant disgust at the vulgarity of combat.

CHOICES: You would likely choose the dignified or self-preserving option. This is beneath you. End it quickly so you can leave.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
