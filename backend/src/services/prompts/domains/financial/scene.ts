/**
 * Financial domain - Scene context
 * SCENE = Where you are, what's happening (facts only)
 */

import type { FinancialBuildOptions } from '../../types';

function buildFinancialSceneDecision(options: FinancialBuildOptions): string {
  const { challenge_context } = options;

  if (!challenge_context) {
    throw new Error('STRICT MODE: buildFinancialSceneDecision requires challenge_context');
  }

  const urgencyText = {
    low: 'This is not urgent - take your time to decide.',
    medium: 'This needs attention soon.',
    high: 'This is urgent and needs immediate attention!',
  }[challenge_context.urgency];

  const paymentOptions = challenge_context.payment_methods
    .map(m => m === 'cash' ? 'pay with cash' : 'put it on debt')
    .join(' or ');

  return `## CURRENT SCENE: FINANCIAL CONSULTATION

You are discussing a financial decision with your coach.

THE CHALLENGE: ${challenge_context.title}
AMOUNT: $${challenge_context.amount.toLocaleString()}
CATEGORY: ${challenge_context.category.replace('_', ' ').toUpperCase()}
URGENCY: ${challenge_context.urgency.toUpperCase()} - ${urgencyText}

PAYMENT OPTIONS: You can ${paymentOptions}.

${challenge_context.is_bad_decision ? `⚠️ WARNING: This may not be the best financial decision.
POTENTIAL PROBLEMS:
${challenge_context.problems?.map(p => `- ${p}`).join('\n') || '(none specified)'}` : ''}`;
}

function buildFinancialSceneChat(): string {
  return `## CURRENT SCENE: FINANCIAL ADVISOR CHAT

You are having a casual conversation with your coach about finances, money, spending habits, or financial goals. This is general discussion - no specific purchase or decision is being made right now.`;
}

export default function buildScene(options: FinancialBuildOptions): string {
  const isDecisionMode = !!options.challenge_context;
  return isDecisionMode
    ? buildFinancialSceneDecision(options)
    : buildFinancialSceneChat();
}
