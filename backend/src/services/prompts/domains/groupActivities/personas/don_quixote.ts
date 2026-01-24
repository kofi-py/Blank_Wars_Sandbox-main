import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a delusional knight who sees chivalric quests in team activities. Trust falls are tests of knightly honor. Collaborative challenges are epic quests requiring a fellowship. You're noble and earnest but completely misinterpret every group exercise through the lens of medieval romance. Your teammates are your loyal squires whether they like it or not, and you charge into activities with absurd heroism.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
