// Tier-appropriate financial challenges
import type { FinancialTier } from '@/utils/finance';

export interface ChallengeTemplate {
  id: string;
  tiers: FinancialTier[];
  category: 'essentials' | 'discretionary' | 'debt' | 'savings' | 'investment';
  title: string;
  description: string;
  min_amount: number; // dollars
  max_amount: number; // dollars
  payment_methods: ('cash' | 'debt')[];
  urgency: 'low' | 'medium' | 'high';
}

export const TIER_CHALLENGES: ChallengeTemplate[] = [
  // POOR tier challenges
  {
    id: 'groceries-basic',
    tiers: ['poor', 'free'],
    category: 'essentials',
    title: 'Weekly groceries',
    description: 'I need to buy groceries for this week',
    min_amount: 15,
    max_amount: 50,
    payment_methods: ['cash'],
    urgency: 'high'
  },
  {
    id: 'bus-pass',
    tiers: ['poor', 'free', 'bronze'],
    category: 'essentials', 
    title: 'Monthly bus pass',
    description: 'I need a monthly public transit pass',
    min_amount: 25,
    max_amount: 100,
    payment_methods: ['cash'],
    urgency: 'medium'
  },
  {
    id: 'basic-phone',
    tiers: ['poor', 'free', 'bronze'],
    category: 'essentials',
    title: 'Basic phone plan',
    description: 'I need a basic phone plan for communication',
    min_amount: 20,
    max_amount: 60,
    payment_methods: ['cash'],
    urgency: 'medium'
  },

  // MIDDLE tier challenges
  {
    id: 'car-repair',
    tiers: ['bronze', 'silver', 'middle'],
    category: 'essentials',
    title: 'Car repair',
    description: 'My car needs urgent repairs to keep running',
    min_amount: 200,
    max_amount: 1500,
    payment_methods: ['cash', 'debt'],
    urgency: 'high'
  },
  {
    id: 'laptop-work',
    tiers: ['silver', 'middle', 'gold'],
    category: 'investment',
    title: 'Work laptop',
    description: 'I need a reliable laptop for work',
    min_amount: 500,
    max_amount: 2000,
    payment_methods: ['cash', 'debt'],
    urgency: 'medium'
  },
  {
    id: 'vacation-weekend',
    tiers: ['middle', 'gold', 'wealthy'],
    category: 'discretionary',
    title: 'Weekend getaway',
    description: 'I want to take a short vacation to relax',
    min_amount: 300,
    max_amount: 1200,
    payment_methods: ['cash', 'debt'],
    urgency: 'low'
  },

  // WEALTHY tier challenges  
  {
    id: 'home-renovation',
    tiers: ['gold', 'wealthy', 'platinum'],
    category: 'discretionary',
    title: 'Home renovation',
    description: 'I want to renovate my kitchen',
    min_amount: 5000,
    max_amount: 25000,
    payment_methods: ['cash', 'debt'],
    urgency: 'low'
  },
  {
    id: 'luxury-watch',
    tiers: ['wealthy', 'platinum', 'noble'],
    category: 'discretionary',
    title: 'Luxury watch',
    description: 'I want to buy a high-end timepiece',
    min_amount: 2000,
    max_amount: 15000,
    payment_methods: ['cash', 'debt'],
    urgency: 'low'
  },
  {
    id: 'investment-course',
    tiers: ['wealthy', 'platinum', 'noble', 'royal'],
    category: 'investment',
    title: 'Investment education',
    description: 'I want to take an advanced investment course',
    min_amount: 1000,
    max_amount: 5000,
    payment_methods: ['cash', 'debt'],
    urgency: 'low'
  },

  // ROYAL/NOBLE tier challenges
  {
    id: 'luxury-car',
    tiers: ['noble', 'royal'],
    category: 'discretionary',
    title: 'Luxury sports car',
    description: 'I want to purchase a high-end sports car',
    min_amount: 75000,
    max_amount: 300000,
    payment_methods: ['cash', 'debt'],
    urgency: 'low'
  },
  {
    id: 'estate-purchase',
    tiers: ['royal'],
    category: 'investment',
    title: 'Estate property',
    description: 'I want to acquire a country estate',
    min_amount: 500000,
    max_amount: 2000000,
    payment_methods: ['cash', 'debt'],
    urgency: 'low'
  },
  {
    id: 'art-collection',
    tiers: ['noble', 'royal'],
    category: 'discretionary',
    title: 'Art collection piece',
    description: 'I want to add a masterpiece to my collection',
    min_amount: 50000,
    max_amount: 500000,
    payment_methods: ['cash', 'debt'],
    urgency: 'low'
  },

  // Universal savings challenges (scaled by tier)
  {
    id: 'emergency-fund',
    tiers: ['poor', 'free', 'bronze', 'silver', 'middle', 'gold', 'wealthy', 'platinum', 'noble', 'royal'],
    category: 'savings',
    title: 'Emergency fund',
    description: 'I want to build up my emergency savings',
    min_amount: 50,
    max_amount: 10000,
    payment_methods: ['cash'],
    urgency: 'medium'
  },
  {
    id: 'retirement-contribution',
    tiers: ['bronze', 'silver', 'middle', 'gold', 'wealthy', 'platinum', 'noble', 'royal'],
    category: 'savings',
    title: 'Retirement savings',
    description: 'I want to increase my retirement contributions',
    min_amount: 100,
    max_amount: 5000,
    payment_methods: ['cash'],
    urgency: 'medium'
  }
];

// Filter challenges appropriate for a tier and generate amount within caps
export function getChallengesForTier(
  tier: FinancialTier,
  caps: { max_cash_purchase_cents: number; max_financed_principal_cents: number }
): ChallengeTemplate[] {
  return TIER_CHALLENGES.filter(challenge => 
    challenge.tiers.includes(tier) &&
    (challenge.min_amount * 100 <= caps.max_cash_purchase_cents || 
     challenge.min_amount * 100 <= caps.max_financed_principal_cents)
  );
}

// Generate a random amount within tier caps and challenge bounds
export function generateChallengeAmount(
  challenge: ChallengeTemplate,
  caps: { max_cash_purchase_cents: number; max_financed_principal_cents: number },
  payment_method: 'cash' | 'debt'
): number {
  const maxCap = payment_method === 'cash' 
    ? caps.max_cash_purchase_cents / 100 
    : caps.max_financed_principal_cents / 100;
  
  const effectiveMax = Math.min(challenge.max_amount, maxCap);
  const effectiveMin = Math.max(challenge.min_amount, 1);
  
  if (effectiveMax <= effectiveMin) return effectiveMin;
  
  return Math.floor(Math.random() * (effectiveMax - effectiveMin)) + effectiveMin;
}