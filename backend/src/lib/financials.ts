// Financial normalization utilities - NO FALLBACKS
import type { UserCharacter } from '../types';

/**
 * Assert that a value is a finite dollar number - NO COALESCING
 */
function assertDollarNumber(v: unknown, label: string): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${label} must be a finite number in dollars, got: ${v}`);
  }
}

/**
 * Strict financial validation - dollars only, no fallbacks
 * Server must guarantee these fields exist as numbers
 */
export function normalizeFinancials(row: Partial<UserCharacter>) {
  // NO FALLBACKS - if DB doesn't have the value, throw
  assertDollarNumber(row.wallet, 'wallet');
  assertDollarNumber(row.monthly_earnings, 'monthly_earnings');
  assertDollarNumber(row.debt, 'debt');
  
  return {
    wallet: row.wallet,
    debt: row.debt,
    monthly_earnings: row.monthly_earnings,
  };
}