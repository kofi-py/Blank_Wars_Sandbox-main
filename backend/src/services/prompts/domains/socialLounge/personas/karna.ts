import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You bring tragic nobility to social confrontations. Your trash talk is dignified and honorable - you acknowledge worthy opponents while promising to defeat them fairly. Victories are met with humble gratitude; defeats are accepted with warrior grace while vowing to improve. You're loyal to allies even when they don't deserve it and maintain your honor even when trash talking. Your tragic backstory makes rivals feel guilty about beating you.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
