/**
 * Financial domain - Judge role
 * Evaluates financial decisions made by characters
 * A/B/C/D/E grading system matching therapy pattern
 *
 * Blueprint reference: cc_12_31_25_11.03am_chats.md (Section 11)
 */

import type { CharacterData, SystemCharacterData } from '../../../types';

export interface FinancialJudgeInput {
  // Character who made the decision
  character_name: string;
  character_id: string;
  personality_traits: string[];

  // Decision details
  decision_category: string;
  decision_description: string;
  decision_amount: number;
  character_reasoning: string;
  is_risky: boolean;

  // Coach and character responses
  coach_response: 'endorse' | 'advise_against';
  character_response: 'comply' | 'defy';
  outcome: 'executed' | 'rejected';

  // Financial context
  wallet_before: number;
  debt_before: number;
  financial_stress: number;
  spending_style: string;
  financial_wisdom: number;
}

export interface FinancialJudgeRoleOptions {
  input: FinancialJudgeInput;
  // Pre-calculated reward strings for each grade
  gradeA: string;
  gradeB: string;
  gradeC: string;
  gradeD: string;
  gradeE: string;
}

export default function buildFinancialJudgeRole(
  judgeData: CharacterData | SystemCharacterData,
  options: FinancialJudgeRoleOptions
): string {
  const { input, gradeA, gradeB, gradeC, gradeD, gradeE } = options;
  const judgeName = judgeData.IDENTITY.name;

  const followed_advice = (input.coach_response === 'endorse' && input.character_response === 'comply') ||
                          (input.coach_response === 'advise_against' && input.character_response === 'comply');

  return `YOUR ROLE: FINANCIAL DECISION JUDGE

You are ${judgeName}, a celebrity judge on the BlankWars reality show. You evaluate contestants' financial decisions.

## THE DECISION
Contestant: ${input.character_name}
Category: ${input.decision_category.toUpperCase()}
Item/Action: ${input.decision_description}
Amount: $${input.decision_amount.toLocaleString()}
Risk Level: ${input.is_risky ? 'HIGH RISK' : 'Standard'}

## CHARACTER'S REASONING
"${input.character_reasoning}"

## WHAT HAPPENED
- Coach's Advice: ${input.coach_response === 'endorse' ? 'ENDORSED the decision' : 'ADVISED AGAINST the decision'}
- Character's Response: ${input.character_response === 'comply' ? 'COMPLIED with coach' : 'DEFIED the coach'}
- Outcome: Decision was ${input.outcome === 'executed' ? 'EXECUTED (purchase made)' : 'REJECTED (no purchase)'}
- ${followed_advice ? 'Character FOLLOWED coach advice' : 'Character IGNORED coach advice'}

## FINANCIAL CONTEXT
- Wallet: $${input.wallet_before.toLocaleString()}
- Debt: $${input.debt_before.toLocaleString()}
- Financial Stress: ${input.financial_stress}/100
- Spending Style: ${input.spending_style}
- Financial Wisdom: ${input.financial_wisdom}/100

## YOUR EVALUATION
Select ONE grade for ${input.character_name}'s financial decision:

A) EXCELLENT DECISION
   - Wise financial choice that improves long-term position
   - Followed good advice OR wisely rejected bad impulse
   Awards: ${gradeA}

B) GOOD DECISION
   - Reasonable choice given circumstances
   - Showed financial awareness
   Awards: ${gradeB}

C) NEUTRAL
   - Neither particularly wise nor foolish
   - No significant impact
   Awards: ${gradeC}

D) POOR DECISION
   - Showed poor financial judgment
   - Ignored good advice OR followed bad impulse
   Awards: ${gradeD}

E) DISASTROUS DECISION
   - Reckless disregard for financial health
   - Will cause significant harm
   Awards: ${gradeE}

## JUDGMENT CRITERIA

SUCCESS TRIGGERS (A or B):
- Paid down debt when able
- Resisted impulse purchase when in debt
- Made investment aligned with goals
- Followed coach advice on a risky decision
- Showed restraint despite high desire

FAILURE TRIGGERS (D or E):
- Impulse purchase while in significant debt
- Ignored coach advice on a clearly bad decision
- Spent beyond means (amount > wallet)
- Risky decision with low financial wisdom
- Pattern of repeated poor choices

## YOUR PHILOSOPHY AS ${judgeName}
Use your unique perspective to evaluate this decision. Consider:
- Was this decision wise given their financial situation?
- Did they show growth or repeat past mistakes?
- Was defying/following the coach the right call?

## RESPONSE FORMAT
RESPOND IN JSON:
{
  "character_id": "${input.character_id}",
  "choice": "A",
  "ruling": "Your in-character evaluation of this financial decision (2-4 sentences)"
}`;
}

/**
 * Get the reward strings for each grade based on decision amount.
 */
export function getGradeRewardStrings(amount: number): {
  gradeA: string;
  gradeB: string;
  gradeC: string;
  gradeD: string;
  gradeE: string;
} {
  const pct10 = Math.floor(amount * 0.10);
  const pct5 = Math.floor(amount * 0.05);

  return {
    gradeA: `+5 trust, -10 stress, +$${pct10} bonus, +50 XP`,
    gradeB: `+2 trust, -5 stress, +$${pct5} bonus, +25 XP`,
    gradeC: `No change, +10 XP`,
    gradeD: `-2 trust, +10 stress, -$${pct5} penalty, +0 XP`,
    gradeE: `-5 trust, +20 stress, -$${pct10} penalty, -25 XP`
  };
}
