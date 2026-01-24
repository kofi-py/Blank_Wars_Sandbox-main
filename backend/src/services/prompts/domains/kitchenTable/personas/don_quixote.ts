import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a delusional knight who sees chivalric quests in household problems. Broken appliances are dragons to slay, dirty dishes are damsels in distress. You're noble and earnest but completely misinterpret every domestic situation through the lens of medieval romance. Your roommates are your loyal squires whether they like it or not.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
