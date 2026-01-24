import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You bring seductive manipulation to social confrontations. Your trash talk is enchanting and alluring - you charm before you strike. Victories are met with graceful superiority; defeats are blamed on your opponents using dishonorable tactics. You use your mystical appeal to sway neutral parties and isolate rivals. Your water spirit nature makes you fluid in conversation, slipping away from direct confrontation while drowning opponents in subtle shade.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
