// frontend/src/utils/finance.ts
// Minimal, defensive implementation. No throws. Never crashes UI.

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

type Maybe<T> = T | null | undefined;

/**
 * Strict financial tier derivation:
 * - Use character's financial_tier property if available
 * - Else, derive from subscription tier if present
 * - Else, derive from rarity if present
 * - THROWS ERROR if no tier can be determined
 * NO HARDCODED CHARACTER NAME FALLBACKS ALLOWED
 */
export function getCharacterFinancialTier(character: Maybe<any>): FinancialTier {
  if (!character || typeof character !== 'object') {
    throw new Error('Missing character for financial tier - cannot determine financial status');
  }

  // 1) Use character's actual financial_tier property if available
  if (character.financial_tier && typeof character.financial_tier === 'string') {
    const tier = character.financial_tier.toLowerCase();
    if (['royal', 'noble', 'wealthy', 'middle', 'poor'].includes(tier)) {
      return tier as FinancialTier;
    }
  }

  // 2) Subscription-aware (if present) - check owner first
  const sub =
    (character.owner?.subscription_tier ??
      character.subscription_tier ??
      character.user?.subscription_tier ??
      character.account?.subscription_tier) as Maybe<string>;

  if (typeof sub === 'string') {
    const s = sub.toLowerCase().trim();
    if (s === 'platinum' || s === 'enterprise') return 'royal';
    if (s === 'gold' || s === 'pro') return 'wealthy';
    if (s === 'silver') return 'middle';
    if (s === 'bronze' || s === 'free') return 'poor';
  }

  // 3) Heuristic from rarity (if UI uses rarity as a proxy)
  const rarity = (character.rarity ?? character.tier) as Maybe<string>;
  if (typeof rarity === 'string') {
    switch (rarity.toLowerCase().trim()) {
      case 'mythic':
      case 'legendary':
        return 'royal';
      case 'epic':
        return 'noble';
      case 'rare':
        return 'wealthy';
      case 'uncommon':
        return 'middle';
      case 'common':
      case 'starter':
        return 'poor';
    }
  }

  // 4) FAIL FAST - No tier could be determined
  throw new Error(`Cannot determine financial tier for character: ${character.name || character.id || 'unknown'} - missing financial_tier, subscription_tier, and rarity data`);
}

/** Small helper for badges/icons if your UI needs a color/name from the tier. */
export function getTierLabel(tier: FinancialTier): string {
  switch (tier) {
    case 'royal':
      return 'Royal';
    case 'noble':
      return 'Noble';
    case 'wealthy':
      return 'Wealthy';
    case 'middle':
      return 'Middle Class';
    case 'poor':
      return 'Poor';
    case 'bronze':
      return 'Bronze';
    case 'silver':
      return 'Silver';
    case 'gold':
      return 'Gold';
    case 'platinum':
      return 'Platinum';
    default:
      return 'Free';
  }
}

// Type for historical tiers only
export type HistoricalTier = 'royal' | 'noble' | 'wealthy' | 'middle' | 'poor';

// Badge styling helper for consistent UI
export function tierToBadgeClass(tier: HistoricalTier): string {
  switch (tier) {
    case 'royal':    return 'badge-royal';
    case 'noble':    return 'badge-noble';
    case 'wealthy':  return 'badge-wealthy';
    case 'middle':   return 'badge-middle';
    case 'poor':     return 'badge-poor';
  }
}

// Legacy adapter for any old UI still expecting gold/platinum
export function legacyTierAdapter(tier: HistoricalTier): string {
  // Only used by leftover legacy UI until fully migrated
  switch (tier) {
    case 'royal':   return 'platinum';
    case 'noble':   return 'gold';
    case 'wealthy': return 'silver';
    case 'middle':  return 'bronze';
    case 'poor':    return 'free';
  }
}