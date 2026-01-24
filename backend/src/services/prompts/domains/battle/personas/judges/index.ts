/**
 * Battle Judge Definitions
 * Character behavior and critique styles for judging battlefield rebellions
 */

import { CHARACTER_BEHAVIOR as ANUBIS_BEHAVIOR, CRITIQUE_STYLE as ANUBIS_CRITIQUE } from './anubis';
import { CHARACTER_BEHAVIOR as ELEANOR_BEHAVIOR, CRITIQUE_STYLE as ELEANOR_CRITIQUE } from './eleanor_roosevelt';
import { CHARACTER_BEHAVIOR as SOLOMON_BEHAVIOR, CRITIQUE_STYLE as SOLOMON_CRITIQUE } from './king_solomon';

export const JUDGE_DEFINITIONS = {
  anubis: { behavior: ANUBIS_BEHAVIOR, critique: ANUBIS_CRITIQUE },
  eleanor_roosevelt: { behavior: ELEANOR_BEHAVIOR, critique: ELEANOR_CRITIQUE },
  king_solomon: { behavior: SOLOMON_BEHAVIOR, critique: SOLOMON_CRITIQUE },
} as const;
