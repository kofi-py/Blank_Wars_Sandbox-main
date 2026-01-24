/**
 * Financial Domain Module
 *
 * Coach and contestant discuss financial decisions, spending, saving, and debt management.
 * Character responds in-character to financial challenges based on their personality.
 */

import type { CharacterData, SystemCharacterData, FinancialBuildOptions } from '../../types';
import { buildStatContext } from '../../statContext';
import buildScene from './scene';

export type { FinancialBuildOptions } from '../../types';

export const PROSE_FIELDS = [
  // Scene context fields
  'hq_tier',
  'time_of_day',
  // Role context fields
  'roommates',
  'teammates',
  'relationships',
  // Persona context fields
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'comedian_category',
  // Financial stats
  'wallet',
  'debt',
  'financial_stress',
  // Other relevant stats
  'current_stress',
  'current_morale',
  'coach_trust_level',
];

export const LIST_FIELDS: string[] = [];

function buildFinancialRoleDecision(data: CharacterData, options: FinancialBuildOptions): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;
  const { challenge_context, coach_message, memory_context } = options;

  if (!challenge_context) {
    throw new Error('STRICT MODE: buildFinancialRoleDecision requires challenge_context');
  }

  // STRICT MODE: Validate required financial data
  if (identity.wallet === undefined || identity.wallet === null) {
    throw new Error('STRICT MODE: Missing wallet for financial role');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt for financial role');
  }

  const financialState = identity.wallet > identity.debt
    ? 'You are in a good financial position.'
    : identity.debt > identity.wallet * 2
      ? 'You are deep in debt and should be concerned.'
      : 'You have some debt to manage.';

  const stressInfluence = psych.financial_stress > 70
    ? 'Your high financial stress makes you anxious about money decisions.'
    : psych.financial_stress > 40
      ? 'You feel moderate pressure about finances.'
      : 'You feel relatively calm about money matters.';

  return `## YOUR ROLE: CONTESTANT IN FINANCIAL CONSULTATION

YOUR CURRENT FINANCES:
- Wallet: $${identity.wallet.toLocaleString()}
- Debt: $${identity.debt.toLocaleString()}
- Financial Stress: ${psych.financial_stress}/100

${financialState}
${stressInfluence}

YOUR QUESTION/REQUEST:
"${challenge_context.character_question}"

${memory_context ? `## THINGS ON YOUR MIND
${memory_context}` : ''}

## COACH'S MESSAGE
${coach_message}

## YOUR BEHAVIOR
- Your personality influences how you handle money decisions
- You may resist advice that conflicts with what you want
- Your financial_stress affects how anxious you are
- You experience real consequences from financial decisions
- Stay in character - a reckless character might defend bad choices
- A frugal character might be overly cautious even with good opportunities

## RESPONSE RULES
- Respond conversationally (2-3 sentences)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Stay in character based on your personality
- Express your feelings about this financial decision
- You can agree, disagree, or express uncertainty about coach's advice
- Reference your current financial situation if relevant
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"`;
}

function buildFinancialRoleChat(data: CharacterData, options: FinancialBuildOptions): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;
  const { coach_message, memory_context } = options;

  // STRICT MODE: Validate required financial data
  if (identity.wallet === undefined || identity.wallet === null) {
    throw new Error('STRICT MODE: Missing wallet for financial role');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt for financial role');
  }

  const financialState = identity.wallet > identity.debt
    ? 'You are in a good financial position.'
    : identity.debt > identity.wallet * 2
      ? 'You are deep in debt and should be concerned.'
      : 'You have some debt to manage.';

  const stressInfluence = psych.financial_stress > 70
    ? 'Your high financial stress makes you anxious about money decisions.'
    : psych.financial_stress > 40
      ? 'You feel moderate pressure about finances.'
      : 'You feel relatively calm about money matters.';

  return `## YOUR ROLE: CONTESTANT IN FINANCIAL CHAT

YOUR CURRENT FINANCES:
- Wallet: $${identity.wallet.toLocaleString()}
- Debt: $${identity.debt.toLocaleString()}
- Financial Stress: ${psych.financial_stress}/100

${financialState}
${stressInfluence}

${memory_context ? `## THINGS ON YOUR MIND
${memory_context}` : ''}

## COACH'S MESSAGE
${coach_message}

## YOUR BEHAVIOR
- Chat naturally about finances, money, or financial goals
- Your personality influences your views on money
- Your financial_stress affects how you feel about money topics
- Stay in character - be authentic to your personality
- You can share concerns, ask questions, or discuss financial topics

## RESPONSE RULES
- Respond conversationally (2-3 sentences)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Stay in character based on your personality
- Be natural - this is casual conversation, not a formal decision
- You can bring up financial concerns or desires organically
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"`;
}

function buildFinancialPersona(data: CharacterData): string {
  const identity = data.IDENTITY;

  // STRICT MODE: comedy_style required
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for financial persona');
  }

  // Comedy style is now stored directly in characters.comedy_style
  const comedyContext = identity.comedy_style;

  const statContext = buildStatContext(identity, data.COMBAT, data.PSYCHOLOGICAL);

  return `## CHARACTER PERSONA: ${identity.name}

YOU ARE: ${identity.name}, ${identity.title} from ${identity.origin_era}

BACKGROUND:
${identity.backstory}

PERSONALITY TRAITS:
${identity.personality_traits.map(t => `- ${t}`).join('\n')}

COMEDY STYLE:
${comedyContext}

## YOUR PROFILE
${statContext}

## HOW TO USE YOUR PERSONA IN FINANCIAL DISCUSSIONS
- Your personality traits influence your spending habits
- Your background may affect your relationship with money
- A warrior might be impulsive, a scholar might be analytical
- A trickster might try to find loopholes or shortcuts
- Stay true to your character even when discussing boring money stuff`.trim();
}

export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: FinancialBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Financial discussions are for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Financial domain requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;

  // STRICT MODE: Validate required options
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Financial domain requires coach_message');
  }

  // Route to decision mode or chat mode based on challenge_context
  const isDecisionMode = !!options.challenge_context;

  const scene = buildScene(options);

  const role = isDecisionMode
    ? buildFinancialRoleDecision(charData, options)
    : buildFinancialRoleChat(charData, options);

  const persona = buildFinancialPersona(charData);

  return { scene, role, persona };
}
