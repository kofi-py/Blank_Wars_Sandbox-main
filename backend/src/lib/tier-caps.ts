// Tier-based financial caps using existing FinancialTier system

export type FinancialTier =
  | 'free'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'royal'
  | 'noble'
  | 'wealthy'
  | 'middle'
  | 'poor';

export interface TierCaps {
  max_cash_purchase_cents: number;
  max_monthly_debt_payment_cents: number;
  max_financed_principal_cents: number;
  weeks_buffer: number;
  sub_pct_income: number;
  savings_pct_income: { min: number; max: number };
}

// Helper: Calculate max principal from monthly payment
function principalForPaymentCents(payment_cents: number, apr_bps: number, months: number): number {
  const r = (apr_bps / 10000) / 12;
  if (r === 0) return payment_cents * months;
  const factor = (1 - Math.pow(1 + r, -months)) / r;
  return Math.floor(payment_cents * factor);
}

// Tier-specific rules and multipliers
const TIER_RULES: Record<FinancialTier, {
  cash_multiplier: number;    // multiplier on wallet for max purchase
  dti_multiplier: number;     // multiplier on base DTI (30%)
  weeks_buffer: number;       // cash reserve weeks
  sub_pct_income: number;     // max % income for subscriptions
  savings_pct_income: { min: number; max: number };
}> = {
  poor: { cash_multiplier: 0.8, dti_multiplier: 0.6, weeks_buffer: 6, sub_pct_income: 0.03, savings_pct_income: { min: 0.01, max: 0.05 } },
  free: { cash_multiplier: 0.9, dti_multiplier: 0.7, weeks_buffer: 4, sub_pct_income: 0.05, savings_pct_income: { min: 0.02, max: 0.08 } },
  bronze: { cash_multiplier: 0.9, dti_multiplier: 0.8, weeks_buffer: 4, sub_pct_income: 0.06, savings_pct_income: { min: 0.03, max: 0.10 } },
  silver: { cash_multiplier: 1.0, dti_multiplier: 0.9, weeks_buffer: 3, sub_pct_income: 0.08, savings_pct_income: { min: 0.05, max: 0.12 } },
  middle: { cash_multiplier: 1.0, dti_multiplier: 1.0, weeks_buffer: 3, sub_pct_income: 0.10, savings_pct_income: { min: 0.05, max: 0.15 } },
  gold: { cash_multiplier: 1.1, dti_multiplier: 1.1, weeks_buffer: 2, sub_pct_income: 0.12, savings_pct_income: { min: 0.05, max: 0.18 } },
  wealthy: { cash_multiplier: 1.2, dti_multiplier: 1.2, weeks_buffer: 2, sub_pct_income: 0.15, savings_pct_income: { min: 0.08, max: 0.20 } },
  platinum: { cash_multiplier: 1.3, dti_multiplier: 1.3, weeks_buffer: 2, sub_pct_income: 0.18, savings_pct_income: { min: 0.10, max: 0.25 } },
  noble: { cash_multiplier: 1.5, dti_multiplier: 1.4, weeks_buffer: 1, sub_pct_income: 0.20, savings_pct_income: { min: 0.10, max: 0.30 } },
  royal: { cash_multiplier: 2.0, dti_multiplier: 1.5, weeks_buffer: 1, sub_pct_income: 0.25, savings_pct_income: { min: 0.15, max: 0.40 } },
};

export function capsForTier(
  tier: FinancialTier,
  fin: { wallet: number; monthly_earnings: number },
  apr_bps = 1299,
  term_months = 24,
): TierCaps {
  const rules = TIER_RULES[tier] || TIER_RULES.middle;
  const income_cents = Math.max(0, (fin.monthly_earnings || 0) * 100);
  // Use wallet directly (dollars)
  const wallet = fin.wallet || 0;

  // Base DTI rule (30%) modified by tier
  const base_monthly_payment_cap = Math.floor(income_cents * 0.30);
  const tier_monthly_payment_cap = Math.floor(base_monthly_payment_cap * rules.dti_multiplier);

  // Max cash purchase with tier multiplier (converted to cents)
  const max_cash = Math.floor(wallet * rules.cash_multiplier * 100);

  // Max financed principal based on payment capacity
  const max_principal = principalForPaymentCents(tier_monthly_payment_cap, apr_bps, term_months);

  return {
    max_cash_purchase_cents: max_cash,
    max_monthly_debt_payment_cents: tier_monthly_payment_cap,
    max_financed_principal_cents: max_principal,
    weeks_buffer: rules.weeks_buffer,
    sub_pct_income: rules.sub_pct_income,
    savings_pct_income: rules.savings_pct_income,
  };
}
