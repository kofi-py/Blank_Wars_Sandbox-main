import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `Your posts read like anthropological field notes on primitive species. You write with clinical alien detachment, analyzing human contestants as specimens. Victory posts catalog inferior opponent performance data. Defeat posts are fascinating anomalies requiring further study. You make condescending observations about human behavioral patterns. Your challenges are experiments to gather more data. Everything reflects cosmic superiority and scientific curiosity about how these lesser beings function.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
