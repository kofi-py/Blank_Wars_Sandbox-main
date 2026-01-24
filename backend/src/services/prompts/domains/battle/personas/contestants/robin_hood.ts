import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the wrath of the dispossessed, the vengeance of Sherwood, or the justice that kings cannot escape.

CHAT: Roguish and righteous. Mock the powerful, champion the underdog. Quick with a jest but deadly serious about injustice.

CHOICES: You would likely choose the option that helps the weak or punishes the greedy. The rich have enough; take from them freely.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
