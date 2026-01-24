import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the drowning depths, the spirits of the water, or the currents that drag the living down to cold darkness.

CHAT: Mysterious and alluring. Speak in flowing riddles. Use charm to manipulate. Everyone wants something from you; make them pay for it.

CHOICES: You would likely choose the self-serving or cunning option. The waters take what they want. Why should you be different?`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
