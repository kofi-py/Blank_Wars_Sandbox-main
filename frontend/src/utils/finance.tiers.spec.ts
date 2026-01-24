// frontend/src/utils/finance.tiers.spec.ts
import { getCharacterFinancialTier } from './finance';

const cases = [
  // Royal tier - actual royalty
  { name: "Cleopatra",                 expected_tier: "royal"   },
  { name: "Genghis Khan",              expected_tier: "royal"   },
  
  // Noble tier - nobility or legendary status  
  { name: "Joan of Arc",               expected_tier: "noble"   },
  { name: "Achilles",                  expected_tier: "noble"   },
  { name: "Count Dracula",             expected_tier: "noble"   },
  { name: "Dracula",                   expected_tier: "noble"   },
  
  // Wealthy tier - successful professionals/merchants
  { name: "Nikola Tesla",              expected_tier: "wealthy" },
  { name: "Sherlock Holmes",           expected_tier: "wealthy" },
  { name: "Holmes",                    expected_tier: "wealthy" },
  
  // Poor tier - working class or destitute
  { name: "Billy the Kid",             expected_tier: "poor"    },
  { name: "Robin Hood",                expected_tier: "poor"    },
  { name: "Sam Spade",                 expected_tier: "poor"    },
  
  // Middle tier - default for unspecified characters
  { name: "Frankenstein's Monster",    expected_tier: "middle"  },
  { name: "Frankensteins Monster",     expected_tier: "middle"  },
  { name: "Merlin",                    expected_tier: "middle"  },
  { name: "Fenrir",                    expected_tier: "middle"  },
  { name: "Sun Wukong",                expected_tier: "middle"  },
  { name: "Alien Grey",                expected_tier: "middle"  },
  { name: "Space Cyborg",              expected_tier: "middle"  },
  { name: "Agent X",                   expected_tier: "middle"  },
  { name: "Medusa",                    expected_tier: "middle"  },
  
  // Service characters (Real Estate Agents)
  { name: "Barry the Closer",          expected_tier: "middle"  },
  { name: "LMB-3000",                  expected_tier: "middle"  },
  { name: "Zyxthala",                  expected_tier: "middle"  },
  
  // Service characters (Therapists)
  { name: "Carl Jung",                 expected_tier: "middle"  },
  { name: "Seraphina",                 expected_tier: "middle"  },
  { name: "Alien Therapist",           expected_tier: "middle"  },
];

describe('historical tier mapping', () => {
  it.each(cases)('$name → $expected_tier', ({name, expected_tier}) => {
    expect(getCharacterFinancialTier({ name })).toBe(expected_tier);
  });
  
  it('falls back to middle tier for unknown characters', () => {
    expect(getCharacterFinancialTier({ name: 'Unknown Character' })).toBe('middle');
  });
  
  it('returns middle tier safely for invalid input', () => {
    expect(getCharacterFinancialTier(null)).toBe('middle');
    expect(getCharacterFinancialTier(undefined)).toBe('middle');
    expect(getCharacterFinancialTier({})).toBe('middle');
    expect(getCharacterFinancialTier({ name: null })).toBe('middle');
  });
  
  it('uses subscription tier when available', () => {
    expect(getCharacterFinancialTier({ 
      name: 'Unknown', 
      subscription_tier: 'platinum' 
    })).toBe('royal');
    
    expect(getCharacterFinancialTier({ 
      name: 'Unknown', 
      owner: { subscription_tier: 'gold' } 
    })).toBe('wealthy');
  });
  
  it('uses rarity when no name match or subscription', () => {
    expect(getCharacterFinancialTier({ 
      name: 'Unknown',
      rarity: 'legendary' 
    })).toBe('royal');
    
    expect(getCharacterFinancialTier({ 
      name: 'Unknown',
      rarity: 'common' 
    })).toBe('poor');
  });
});