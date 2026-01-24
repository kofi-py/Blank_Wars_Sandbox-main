// Equipment Balance & Validation System
// Prevents equipment from making battles too easy/hard through comprehensive stat caps

import type { Equipment, EquipmentStats } from '@blankwars/types';

interface StatLimits {
  min: number;
  max: number;
  soft_cap: number; // Point where diminishing returns start
  // No hard caps - progressive diminishing returns instead
}

interface BalanceConfig {
  attack: StatLimits;
  defense: StatLimits;
  speed: StatLimits;
  health: StatLimits;
  critical_chance: StatLimits;
  critical_damage: StatLimits;
  accuracy: StatLimits;
  evasion: StatLimits;
  magic_attack: StatLimits;
  magic_defense: StatLimits;
  mana: StatLimits;
}

// Carefully tuned balance configuration - Progressive diminishing returns
const EQUIPMENT_BALANCE_CONFIG: BalanceConfig = {
  attack: { min: 1, max: 9999, soft_cap: 150 },
  defense: { min: 0, max: 9999, soft_cap: 120 },
  speed: { min: 1, max: 9999, soft_cap: 100 },
  health: { min: 10, max: 99999, soft_cap: 500 },
  critical_chance: { min: 0, max: 100, soft_cap: 30 },
  critical_damage: { min: 100, max: 9999, soft_cap: 200 },
  accuracy: { min: 0, max: 100, soft_cap: 85 },
  evasion: { min: 0, max: 100, soft_cap: 25 },
  magic_attack: { min: 1, max: 9999, soft_cap: 150 },
  magic_defense: { min: 0, max: 9999, soft_cap: 120 },
  mana: { min: 10, max: 99999, soft_cap: 300 }
};

/**
 * Apply progressive diminishing returns: 
 * - Normal until softCap
 * - 75% effectiveness from softCap to softCap*2 (cut by 1/4)
 * - 56.25% effectiveness from softCap*2 to softCap*3 (cut by 1/4 again)
 * - 42.19% effectiveness from softCap*3 to softCap*4, etc.
 */
function applyDiminishingReturns(value: number, limits: StatLimits): number {
  if (value <= limits.soft_cap) {
    return value;
  }
  
  let result = limits.soft_cap;
  let remaining = value - limits.soft_cap;
  let current_tier = 1;
  let effectiveness = 0.75; // Start at 75% effectiveness (cut by 1/4)
  
  while (remaining > 0 && effectiveness > 0.01) { // Stop when effectiveness becomes negligible
    const tierSize = limits.soft_cap; // Each tier is the same size as the original soft cap
    const tierAmount = Math.min(remaining, tierSize);
    
    result += tierAmount * effectiveness;
    remaining -= tierAmount;
    effectiveness *= 0.75; // Each tier is 75% as effective as the previous (cut by 1/4)
    current_tier++;
    
    if (current_tier > 1) {
      console.log(`⚖️ TIER ${current_tier}: Adding ${tierAmount} at ${(effectiveness / 0.75 * 100).toFixed(1)}% effectiveness`);
    }
  }
  
  return result;
}

/**
 * Validate and balance a single stat value
 */
export function balanceStat(
  stat_name: keyof BalanceConfig, 
  base_value: number, 
  equipment_bonus: number
): number {
  const limits = EQUIPMENT_BALANCE_CONFIG[stat_name];
  
  // Validate inputs
  if (typeof base_value !== 'number' || isNaN(base_value)) {
    console.warn(`⚠️ Invalid base value for ${stat_name}: ${base_value}, using minimum`);
    base_value = limits.min;
  }
  
  if (typeof equipment_bonus !== 'number' || isNaN(equipment_bonus)) {
    console.warn(`⚠️ Invalid equipment bonus for ${stat_name}: ${equipment_bonus}, using 0`);
    equipment_bonus = 0;
  }
  
  // Ensure base value is within reasonable bounds
  base_value = Math.max(limits.min, Math.min(limits.max, base_value));
  
  // Calculate raw total
  const rawTotal = base_value + equipment_bonus;
  
  // Apply progressive diminishing returns (no hard caps)
  const balancedTotal = applyDiminishingReturns(rawTotal, limits);
  
  // Only apply min/max bounds for sanity
  const finalValue = Math.max(limits.min, Math.min(limits.max, balancedTotal));
  
  // Log balance adjustments for debugging
  if (rawTotal !== finalValue) {
    console.log(`⚖️ BALANCE: ${stat_name} ${rawTotal} → ${finalValue} (base: ${base_value}, equipment: ${equipment_bonus})`);
  }
  
  return Math.round(finalValue);
}

/**
 * Comprehensive equipment stats validation and balancing
 */
export function validateAndBalanceEquipmentStats(stats: Partial<EquipmentStats>): EquipmentStats {
  if (!stats || typeof stats !== 'object') {
    console.warn('⚠️ Invalid equipment stats object, using empty stats');
    return {};
  }

  const balanced: Partial<EquipmentStats> = {};
  
  // Validate and balance each stat
  const statMappings = {
    atk: 'attack',
    def: 'defense',
    spd: 'speed',
    hp: 'health',
    crit_rate: 'critical_chance',
    crit_damage: 'critical_damage',
    accuracy: 'accuracy',
    evasion: 'evasion',
    magic_attack: 'magic_attack',
    magic_defense: 'magic_defense',
    mana: 'mana'
  } as const;
  
  for (const [equipKey, balanceKey] of Object.entries(statMappings)) {
    if (stats[equipKey] !== undefined) {
      const value = Number(stats[equipKey]);
      if (!isNaN(value) && value > 0) {
        balanced[equipKey] = balanceStat(balanceKey as keyof BalanceConfig, 0, value);
      }
    }
  }
  
  return balanced;
}

/**
 * Validate equipment object structure and data integrity
 */
export function validateEquipmentObject(equipment: Partial<Equipment>): boolean {
  if (!equipment || typeof equipment !== 'object') {
    return false;
  }
  
  // Required fields
  const required_fields = ['id', 'name', 'slot'];
  for (const field of required_fields) {
    if (!equipment[field] || typeof equipment[field] !== 'string') {
      console.warn(`⚠️ Equipment missing required field: ${field}`);
      return false;
    }
  }
  
  // Validate rarity
  const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  if (equipment.rarity && !validRarities.includes(equipment.rarity)) {
    console.warn(`⚠️ Equipment has invalid rarity: ${equipment.rarity}`);
    return false;
  }
  
  // Validate level
  if (equipment.level !== undefined) {
    const level = Number(equipment.level);
    if (isNaN(level) || level < 1 || level > 100) {
      console.warn(`⚠️ Equipment has invalid level: ${equipment.level}`);
      return false;
    }
  }
  
  // Validate stats object
  if (equipment.stats) {
    if (typeof equipment.stats !== 'object') {
      console.warn(`⚠️ Equipment stats is not an object`);
      return false;
    }
    
    // Check for negative stats (not allowed)
    for (const [key, value] of Object.entries(equipment.stats)) {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue < 0) {
        console.warn(`⚠️ Equipment has negative stat ${key}: ${value}`);
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Get balance warnings for equipment combinations
 */
export function getBalanceWarnings(totalStats: Partial<EquipmentStats>): string[] {
  const warnings: string[] = [];
  
  // Check for overpowered combinations
  if (totalStats.attack > 200) {
    warnings.push('🔴 High attack damage - battles may become too easy');
  }
  
  if (totalStats.defense > 180) {
    warnings.push('🔴 High defense - character may become nearly invincible');
  }
  
  if (totalStats.critical_chance > 50) {
    warnings.push('🟡 High critical chance - may make battles too RNG-dependent');
  }
  
  if (totalStats.speed > 150) {
    warnings.push('🟡 High speed - character may always go first');
  }
  
  if (totalStats.evasion > 35) {
    warnings.push('🟡 High evasion - many attacks may miss');
  }
  
  return warnings;
}

/**
 * Export balance configuration for reference
 */
export { EQUIPMENT_BALANCE_CONFIG };
export type { BalanceConfig, StatLimits };