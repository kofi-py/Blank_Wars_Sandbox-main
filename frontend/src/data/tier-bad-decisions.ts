// Tier-appropriate bad financial decisions that AI characters suggest
import type { FinancialTier } from '@/utils/finance';

export interface BadDecisionTemplate {
  id: string;
  tiers: FinancialTier[];
  category: 'debt' | 'spending' | 'investment' | 'emergency';
  
  // What the AI character says to you (the coach)
  character_message: string;
  
  // The financial details
  amount: { min: number; max: number }; // dollars
  urgency: 'low' | 'medium' | 'high';
  
  // Why it's a bad decision (for system reference)
  problems: string[];
}

export const BAD_DECISIONS_BY_TIER: BadDecisionTemplate[] = [
  // POOR tier - small-scale financial mistakes
  {
    id: 'payday-loan',
    tiers: ['poor', 'free'],
    category: 'debt',
    character_message: "I'm thinking about getting a payday loan for $500 to cover expenses until my next payment. The interest seems high but I really need the money.",
    amount: { min: 200, max: 800 },
    urgency: 'high',
    problems: ['extremely high APR', 'debt trap cycle', 'better alternatives exist']
  },
  {
    id: 'rent-to-own-furniture',
    tiers: ['poor', 'free', 'bronze'],
    category: 'spending',
    character_message: "I want to get a nice couch from one of those rent-to-own places. It's only $25 a week and I can take it home today!",
    amount: { min: 300, max: 1200 },
    urgency: 'low',
    problems: ['total cost 3x retail price', 'no ownership until fully paid', 'poor value']
  },
  {
    id: 'overdraft-fees',
    tiers: ['poor', 'free', 'bronze'],
    category: 'spending',
    character_message: "I'm a bit short this month but I'll just let my account overdraft a few times. It's only $35 per transaction.",
    amount: { min: 35, max: 200 },
    urgency: 'medium',
    problems: ['expensive fees', 'cascading overdrafts', 'better alternatives available']
  },

  // MIDDLE tier - moderate financial mistakes
  {
    id: 'credit-card-vacation',
    tiers: ['bronze', 'silver', 'middle'],
    category: 'spending',
    character_message: "I really need a vacation and found a great deal for $2,500. I don't have the cash but I can put it on my credit card.",
    amount: { min: 1500, max: 4000 },
    urgency: 'low',
    problems: ['high interest debt for discretionary spending', 'no emergency fund impact']
  },
  {
    id: 'car-lease-upgrade',
    tiers: ['silver', 'middle', 'gold'],
    category: 'spending',
    character_message: "My car lease is up and the dealer is offering me an upgrade to a luxury model for just $150 more per month.",
    amount: { min: 400, max: 800 },
    urgency: 'medium',
    problems: ['lifestyle inflation', 'higher insurance', 'depreciation']
  },
  {
    id: 'whole-life-insurance',
    tiers: ['middle', 'gold', 'wealthy'],
    category: 'investment',
    character_message: "An insurance agent says I should buy whole life insurance as an investment. It's $300/month but builds cash value.",
    amount: { min: 200, max: 500 },
    urgency: 'low',
    problems: ['poor investment returns', 'high fees', 'term insurance + investing separately is better']
  },

  // WEALTHY tier - larger financial mistakes
  {
    id: 'luxury-car-loan',
    tiers: ['gold', 'wealthy', 'platinum'],
    category: 'spending',
    character_message: "I've been looking at this amazing sports car for $85,000. I can finance it at 6.9% over 72 months. I deserve to treat myself!",
    amount: { min: 60000, max: 150000 },
    urgency: 'low',
    problems: ['rapid depreciation', 'high insurance costs', 'long loan term']
  },
  {
    id: 'timeshare-purchase',
    tiers: ['wealthy', 'platinum', 'noble'],
    category: 'spending',
    character_message: "I'm at this presentation for a timeshare in Hawaii. It's $45,000 but I'll save money on vacations and it's an investment!",
    amount: { min: 25000, max: 80000 },
    urgency: 'high',
    problems: ['poor resale value', 'ongoing maintenance fees', 'limited flexibility']
  },
  {
    id: 'risky-investment',
    tiers: ['wealthy', 'platinum', 'noble'],
    category: 'investment',
    character_message: "My friend told me about this amazing cryptocurrency opportunity. If I invest $50,000 now, I could double my money in 6 months!",
    amount: { min: 20000, max: 100000 },
    urgency: 'medium',
    problems: ['high risk speculation', 'FOMO investing', 'lack of diversification']
  },

  // ROYAL/NOBLE tier - large-scale financial mistakes
  {
    id: 'private-jet',
    tiers: ['noble', 'royal'],
    category: 'spending',
    character_message: "I'm tired of commercial flights. I found a nice private jet for $8 million. The financing options look reasonable.",
    amount: { min: 5000000, max: 15000000 },
    urgency: 'low',
    problems: ['massive depreciation', 'enormous operating costs', 'low utilization likely']
  },
  {
    id: 'art-speculation',
    tiers: ['noble', 'royal'],
    category: 'investment',
    character_message: "There's an art auction next week with a piece I really want. It's $2 million but art always appreciates in value, right?",
    amount: { min: 500000, max: 5000000 },
    urgency: 'high',
    problems: ['illiquid investment', 'market volatility', 'storage and insurance costs']
  },
  {
    id: 'yacht-purchase',
    tiers: ['royal'],
    category: 'spending',
    character_message: "I've been looking at yachts and found the perfect one for $12 million. Think of all the entertaining I could do!",
    amount: { min: 8000000, max: 25000000 },
    urgency: 'low',
    problems: ['enormous maintenance costs', 'depreciation', 'limited usage', 'crew costs']
  }
];

// Generate a tier-appropriate bad decision for the character to suggest
export function generateBadDecisionForTier(tier: FinancialTier): {
  description: string;
  amount: number;
  urgency: 'low' | 'medium' | 'high';
  category: string;
} {
  const availableDecisions = BAD_DECISIONS_BY_TIER.filter(decision => 
    decision.tiers.includes(tier)
  );
  
  if (availableDecisions.length === 0) {
    // Fallback for unhandled tiers
    return {
      description: "I'm thinking about making a purchase I'm not sure about",
      amount: 100,
      urgency: 'medium',
      category: 'spending'
    };
  }
  
  const randomDecision = availableDecisions[Math.floor(Math.random() * availableDecisions.length)];
  const amount = Math.floor(
    Math.random() * (randomDecision.amount.max - randomDecision.amount.min) + 
    randomDecision.amount.min
  );
  
  return {
    description: randomDecision.character_message,
    amount,
    urgency: randomDecision.urgency,
    category: randomDecision.category
  };
}