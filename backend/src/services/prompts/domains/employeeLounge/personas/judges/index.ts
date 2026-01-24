/**
 * Judge Personas Index for Employee Lounge
 */

import type { SystemCharacterData } from '../../../../types';
import { StaffContext } from '../buildStaffPersona';

import anubis from './anubis';
import eleanor_roosevelt from './eleanor_roosevelt';
import king_solomon from './king_solomon';

type JudgeBuilder = (data: SystemCharacterData, context: StaffContext) => string;

const JUDGE_PERSONAS: Record<string, JudgeBuilder> = {
  anubis,
  eleanor_roosevelt,
  king_solomon,
};

export function getJudgePersona(
  judgeId: string,
  data: SystemCharacterData,
  context: StaffContext
): string {
  const builder = JUDGE_PERSONAS[judgeId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown judge "${judgeId}". Valid judges: ${Object.keys(JUDGE_PERSONAS).join(', ')}`);
  }
  return builder(data, context);
}

export { JUDGE_PERSONAS };
