/**
 * Judge Personas Index
 * System characters (judges) don't have COMBAT/PSYCHOLOGICAL packages
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import type { SystemCharacterIdentity } from '../../../../types';
import { JudgeContext } from '../buildJudgePersona';

import anubis, { CHARACTER_BEHAVIOR as ANUBIS_BEHAVIOR, CRITIQUE_STYLE as ANUBIS_CRITIQUE } from './anubis';
import eleanor_roosevelt, { CHARACTER_BEHAVIOR as ELEANOR_BEHAVIOR, CRITIQUE_STYLE as ELEANOR_CRITIQUE } from './eleanor_roosevelt';
import king_solomon, { CHARACTER_BEHAVIOR as SOLOMON_BEHAVIOR, CRITIQUE_STYLE as SOLOMON_CRITIQUE } from './king_solomon';

// Export judge character definitions for reuse in other domains (e.g., battle)
export const JUDGE_DEFINITIONS = {
  anubis: { behavior: ANUBIS_BEHAVIOR, critique: ANUBIS_CRITIQUE },
  eleanor_roosevelt: { behavior: ELEANOR_BEHAVIOR, critique: ELEANOR_CRITIQUE },
  king_solomon: { behavior: SOLOMON_BEHAVIOR, critique: SOLOMON_CRITIQUE },
} as const;

type JudgeBuilder = (
  identity: IdentityPackage | SystemCharacterIdentity,
  combat: CombatPackage | undefined,
  psych: PsychologicalPackage | undefined,
  context: JudgeContext
) => string;

const JUDGE_PERSONAS: Record<string, JudgeBuilder> = {
  anubis,
  eleanor_roosevelt,
  king_solomon,
};

export function getJudgePersona(
  judgeId: string,
  identity: IdentityPackage | SystemCharacterIdentity,
  combat: CombatPackage | undefined,
  psych: PsychologicalPackage | undefined,
  context: JudgeContext
): string {
  const builder = JUDGE_PERSONAS[judgeId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown judge "${judgeId}". Valid judges: ${Object.keys(JUDGE_PERSONAS).join(', ')}`);
  }
  return builder(identity, combat, psych, context);
}

export { JUDGE_PERSONAS };
