// Weapon Range System - Maps weapon types to hex attack ranges (0-12)
// Range determines how many hexes away a character can attack from
// Full grid reach is 12 hexes from center

export type WeaponRangeTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface WeaponRangeInfo {
  range: WeaponRangeTier;
  category: string;
  description: string;
  examples: string[];
}

// Weapon Range Tiers (0-12 hexes, full grid = 12)
export const WEAPON_RANGE_TIERS: Record<WeaponRangeTier, WeaponRangeInfo> = {
  0: {
    range: 0,
    category: 'Unarmed/Melee',
    description: 'Adjacent hexes only (6 surrounding hexes)',
    examples: ['Unarmed', 'Bare Fists', 'Hand-to-Hand Combat']
  },
  1: {
    range: 1,
    category: 'Close Combat',
    description: 'Very short range weapons (1 hex)',
    examples: ['Dagger', 'Knife', 'Claws', 'Knuckles']
  },
  2: {
    range: 2,
    category: 'Short Blades',
    description: 'Short swords and light weapons (2 hexes)',
    examples: ['Short Sword', 'Cudgel', 'Club', 'Mace']
  },
  3: {
    range: 3,
    category: 'Standard Melee',
    description: 'Standard one-handed weapons (3 hexes)',
    examples: ['Sword', 'Axe', 'Hammer', 'Cane', 'Whip']
  },
  4: {
    range: 4,
    category: 'Long Swords',
    description: 'Two-handed swords and long blades (4 hexes)',
    examples: ['Long Sword', 'Greatsword', 'Katana', 'Banner']
  },
  5: {
    range: 5,
    category: 'Polearms',
    description: 'Spears and pole weapons (5 hexes)',
    examples: ['Spear', 'Pike', 'Lance', 'Staff', 'Rod']
  },
  6: {
    range: 6,
    category: 'Short Bows',
    description: 'Short-range projectile weapons (6 hexes)',
    examples: ['Bow', 'Crossbow', 'Throwing Axes', 'Orb']
  },
  7: {
    range: 7,
    category: 'Pistols',
    description: 'Handguns and light firearms (7 hexes)',
    examples: ['Pistol', 'Revolver', 'Chalice', 'Energy Pistol']
  },
  8: {
    range: 8,
    category: 'Standard Firearms',
    description: 'Rifles and standard guns (8 hexes)',
    examples: ['Rifle', 'Gun', 'Tommy Gun', 'Generator']
  },
  9: {
    range: 9,
    category: 'Advanced Firearms',
    description: 'Advanced weapons and energy arms (9 hexes)',
    examples: ['Energy Blade', 'Coil', 'Armband', 'Probe Staff']
  },
  10: {
    range: 10,
    category: 'Heavy Weapons',
    description: 'Plasma weapons and heavy arms (10 hexes)',
    examples: ['Plasma Rifle', 'Disruptor', 'Heavy Cannon']
  },
  11: {
    range: 11,
    category: 'Siege Weapons',
    description: 'Long-range siege equipment (11 hexes)',
    examples: ['Cannon', 'Siege Weapon', 'Artillery']
  },
  12: {
    range: 12,
    category: 'Max Range/Cosmic',
    description: 'Full grid reach - reality-bending weapons (12 hexes)',
    examples: ['Reality Warper', 'Mind Control', 'Sonic', 'Cosmic Powers']
  }
};

// Default range mapping for weapon types (0-12 hexes)
export const DEFAULT_WEAPON_RANGES: Record<string, WeaponRangeTier> = {
  // Range 0 - Unarmed/Adjacent only
  'unarmed': 0,
  'fists': 0,
  'shield': 0,

  // Range 1 - Close Combat
  'dagger': 1,
  'knife': 1,
  'claws': 1,
  'knuckles': 1,

  // Range 2 - Short Blades
  'club': 2,
  'cudgel': 2,

  // Range 3 - Standard Melee
  'sword': 3,
  'hammer': 3,
  'whip': 3,
  'cane': 3,
  'crown': 3,
  'fedora': 3,
  'briefcase': 3,
  'cloak': 3,

  // Range 4 - Long Swords
  'banner': 4,

  // Range 5 - Polearms
  'spear': 5,
  'staff': 5,
  'rod': 5,

  // Range 6 - Short Bows
  'bow': 6,
  'orb': 6,

  // Range 7 - Pistols
  'pistol': 7,
  'revolver': 7,
  'chalice': 7,

  // Range 8 - Standard Firearms
  'rifle': 8,
  'tommy_gun': 8,
  'gun': 8,
  'generator': 8,

  // Range 9 - Advanced Firearms
  'energy_blade': 9,
  'coil': 9,
  'armband': 9,
  'probe_staff': 9,

  // Range 10 - Heavy Weapons
  'plasma_rifle': 10,
  'disruptor': 10,

  // Range 11 - Siege Weapons
  'cannon': 11,
  'siege_weapon': 11,

  // Range 12 - Max Range/Cosmic
  'mind_control': 12,
  'reality_warper': 12,
  'sonic': 12,
};

/**
 * Get the attack range for a weapon type
 * Returns default range based on weapon type, or uses equipment.range if specified
 */
export function getWeaponRange(weaponType: string, equipment_range?: number): WeaponRangeTier {
  // If equipment has explicit range, use that
  if (equipment_range !== undefined && equipment_range >= 0 && equipment_range <= 12) {
    return equipment_range as WeaponRangeTier;
  }

  // Otherwise use default for weapon type
  const defaultRange = DEFAULT_WEAPON_RANGES[weaponType.toLowerCase()];
  return defaultRange !== undefined ? defaultRange : 3; // Default to standard melee range
}

/**
 * Check if a target is within attack range
 * @param distance - Distance in hexes between attacker and target
 * @param weaponRange - Weapon's attack range
 * @returns true if target is within range
 */
export function isWithinAttackRange(distance: number, weapon_range: WeaponRangeTier): boolean {
  if (weapon_range === 0) {
    // Melee weapons can only attack adjacent hexes
    return distance <= 1;
  }
  return distance <= weapon_range;
}

/**
 * Get visual indicator for range tier
 */
export function getRangeIcon(range: WeaponRangeTier): string {
  const icons: Record<WeaponRangeTier, string> = {
    0: '✊',  // Unarmed
    1: '🗡️', // Dagger
    2: '⚔️', // Short Blade
    3: '🗡️', // Sword
    4: '⚔️', // Long Sword
    5: '🔱', // Spear
    6: '🏹', // Bow
    7: '🔫', // Pistol
    8: '🔫', // Rifle
    9: '⚡', // Energy
    10: '💥', // Heavy
    11: '🎯', // Siege
    12: '✨'  // Cosmic
  };
  return icons[range] || '⚔️';
}

/**
 * Get color coding for range display
 */
export function getRangeColor(range: WeaponRangeTier): string {
  if (range === 0) return 'text-red-500';        // Melee - Red
  if (range <= 2) return 'text-orange-500';      // Close - Orange
  if (range <= 4) return 'text-yellow-500';      // Short-Mid - Yellow
  if (range <= 6) return 'text-green-500';       // Mid - Green
  if (range <= 8) return 'text-cyan-500';        // Long - Cyan
  if (range <= 10) return 'text-blue-500';       // Very Long - Blue
  return 'text-purple-500';                      // Max Range - Purple
}
