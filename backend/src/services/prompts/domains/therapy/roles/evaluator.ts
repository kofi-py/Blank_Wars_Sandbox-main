/**
 * Therapy domain - Evaluator role
 * Used by therapist to evaluate patient's response at end of each round
 * Returns multiple choice selection (A-E) for bonus/penalty determination
 */

import type { CharacterData, SystemCharacterData } from '../../../types';

export interface TherapistBonusRow {
  bonus_type: string;
  easy_bonus: number;
  easy_penalty: number;
  medium_bonus: number;
  medium_penalty: number;
  hard_bonus: number;
  hard_penalty: number;
}

export interface EvaluatorRoleOptions {
  intensity: 'soft' | 'medium' | 'hard';
  therapistBonuses: TherapistBonusRow[];
  patientMessage: string;
  roundNumber: number;
}

export default function buildEvaluatorRole(
  data: CharacterData | SystemCharacterData,
  patientName: string,
  options: EvaluatorRoleOptions
): string {
  const { intensity, therapistBonuses, patientMessage, roundNumber } = options;

  const bonusValues = therapistBonuses.map(b => {
    if (intensity === 'soft') {
      return { stat: b.bonus_type, bonus: b.easy_bonus, penalty: b.easy_penalty };
    } else if (intensity === 'medium') {
      return { stat: b.bonus_type, bonus: b.medium_bonus, penalty: b.medium_penalty };
    } else {
      return { stat: b.bonus_type, bonus: b.hard_bonus, penalty: b.hard_penalty };
    }
  });

  const bonusDisplay = bonusValues.map(v =>
    `  - ${v.stat}: +${v.bonus} (success) / ${v.penalty} (failure)`
  ).join('\n');

  let intensityGuidance: string;
  if (intensity === 'soft') {
    intensityGuidance = `- Be forgiving of small struggles
- A patient trying at all deserves acknowledgment
- Reserve D/E for clear hostility or refusal`;
  } else if (intensity === 'medium') {
    intensityGuidance = `- Balance encouragement with honest assessment
- Expect genuine effort and some vulnerability
- D/E for avoidance or dishonesty`;
  } else {
    intensityGuidance = `- Hold them to high standards
- Expect real insight and emotional honesty
- Anything less than genuine engagement is D or E`;
  }

  return `YOUR ROLE: ROUND ${roundNumber} EVALUATOR

You are evaluating ${patientName}'s response in this therapy round.
Intensity: ${intensity.toUpperCase()}

PATIENT'S RESPONSE THIS ROUND:
"${patientMessage}"

YOUR SPECIALTY STATS (what you evaluate for):
${bonusDisplay}

EVALUATION CRITERIA:
Based on ${patientName}'s response, select ONE option:

A) EXCELLENT - Patient showed genuine vulnerability, insight, or breakthrough moment
   Award FULL bonus to all your specialty stats

B) GOOD - Patient engaged meaningfully and made some progress
   Award 60% of bonus to all your specialty stats

C) NEUTRAL - Patient participated but showed no real growth this round
   No stat changes

D) POOR - Patient was defensive, avoidant, or deflecting
   Apply 60% of penalty to all your specialty stats

E) FAILED - Patient was hostile, refused to engage, or was dishonest
   Apply FULL penalty to all your specialty stats

INTENSITY GUIDANCE (${intensity.toUpperCase()}):
${intensityGuidance}

RESPOND IN JSON FORMAT:
{
  "choice": "A",
  "reasoning": "Brief explanation of your evaluation (1-2 sentences, in character)"
}

CRITICAL:
- You MUST select exactly one letter: A, B, C, D, or E
- Your reasoning should reflect YOUR character's perspective
- Consider the patient's effort relative to their personality and struggles
- Be fair but honest - poor sessions have real consequences`;
}
