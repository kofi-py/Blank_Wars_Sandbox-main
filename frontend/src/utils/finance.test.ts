// frontend/src/utils/finance.test.ts
import { getCharacterFinancialTier } from './finance';

describe('getCharacterFinancialTier', () => {
  it('should throw when character is null', () => {
    expect(() => getCharacterFinancialTier(null)).toThrow(/Missing character for financial tier/);
  });

  it('should throw when character is undefined', () => {
    expect(() => getCharacterFinancialTier(undefined)).toThrow(/Missing character for financial tier/);
  });

  it('should throw when character is not an object', () => {
    expect(() => getCharacterFinancialTier('invalid')).toThrow(/Missing character for financial tier/);
  });

  it('should return financial_tier property when present', () => {
    const character = { financial_tier: 'noble' };
    expect(getCharacterFinancialTier(character)).toBe('noble');
  });

  it('should handle case-insensitive financial_tier', () => {
    const character = { financial_tier: 'NOBLE' };
    expect(getCharacterFinancialTier(character)).toBe('noble');
  });

  it('should derive from subscription_tier when financial_tier missing', () => {
    const character = { subscription_tier: 'gold' };
    expect(getCharacterFinancialTier(character)).toBe('wealthy');
  });

  it('should derive from nested owner.subscription_tier', () => {
    const character = { owner: { subscription_tier: 'enterprise' } };
    expect(getCharacterFinancialTier(character)).toBe('royal');
  });

  it('should handle case-insensitive subscription_tier', () => {
    const character = { subscription_tier: 'PLATINUM' };
    expect(getCharacterFinancialTier(character)).toBe('royal');
  });

  it('should derive from rarity when both financial_tier and subscription_tier missing', () => {
    const character = { rarity: 'legendary' };
    expect(getCharacterFinancialTier(character)).toBe('royal');
  });

  it('should handle case-insensitive rarity', () => {
    const character = { rarity: 'LEGENDARY' };
    expect(getCharacterFinancialTier(character)).toBe('royal');
  });

  it('should handle whitespace in subscription_tier', () => {
    const character = { subscription_tier: ' gold ' };
    expect(getCharacterFinancialTier(character)).toBe('wealthy');
  });

  it('should handle whitespace in rarity', () => {
    const character = { rarity: '  legendary  ' };
    expect(getCharacterFinancialTier(character)).toBe('royal');
  });

  it('should prioritize owner.subscription_tier over direct subscription_tier', () => {
    const character = { 
      subscription_tier: 'bronze',
      owner: { subscription_tier: 'platinum' }
    };
    expect(getCharacterFinancialTier(character)).toBe('royal');
  });

  it('should throw when no tier data available', () => {
    const character = { name: 'test_character' };
    expect(() => getCharacterFinancialTier(character)).toThrow(
      /Cannot determine financial tier for character.*missing financial_tier, subscription_tier, and rarity data/
    );
  });

  it('should throw when all tier data is invalid', () => {
    const character = { 
      financial_tier: 'invalid',
      subscription_tier: 'unknown',
      rarity: 'mystery'
    };
    expect(() => getCharacterFinancialTier(character)).toThrow(
      /Cannot determine financial tier for character.*missing financial_tier, subscription_tier, and rarity data/
    );
  });
});