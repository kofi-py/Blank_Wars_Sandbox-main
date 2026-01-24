/**
 * Attack Types Service
 *
 * Loads universal attack types from database.
 * All characters can perform these attacks regardless of powers/spells.
 *
 * Attack types:
 * - jab: 1 AP, 0.5x damage, +10% accuracy
 * - strike: 2 AP, 1.0x damage, base accuracy
 * - heavy: 3 AP, 1.75x damage, -10% accuracy, can be countered
 */

import { query } from '../database';

export interface AttackType {
  id: string;
  name: string;
  description: string;
  flavor_text: string | null;
  ap_cost: number;
  energy_cost: number;
  damage_multiplier: number;
  accuracy_modifier: number;
  crit_chance_modifier: number;
  defense_penalty_next_turn: number;
  can_be_countered: boolean;
  min_level: number;
  requires_melee_range: boolean;
  icon: string | null;
  animation_id: string | null;
  sort_order: number;
}

// Cache attack types since they don't change at runtime
let attackTypesCache: Map<string, AttackType> | null = null;

/**
 * Load all attack types from database.
 * Results are cached after first load.
 */
export async function loadAttackTypes(): Promise<Map<string, AttackType>> {
  if (attackTypesCache) {
    return attackTypesCache;
  }

  const result = await query(`
    SELECT
      id,
      name,
      description,
      flavor_text,
      ap_cost,
      energy_cost,
      damage_multiplier,
      accuracy_modifier,
      crit_chance_modifier,
      defense_penalty_next_turn,
      can_be_countered,
      min_level,
      requires_melee_range,
      icon,
      animation_id,
      sort_order
    FROM action_types
    ORDER BY sort_order
  `);

  const cache = new Map<string, AttackType>();
  for (const row of result.rows) {
    cache.set(row.id, {
      id: row.id,
      name: row.name,
      description: row.description,
      flavor_text: row.flavor_text,
      ap_cost: row.ap_cost,
      energy_cost: row.energy_cost,
      damage_multiplier: parseFloat(row.damage_multiplier),
      accuracy_modifier: row.accuracy_modifier,
      crit_chance_modifier: row.crit_chance_modifier,
      defense_penalty_next_turn: row.defense_penalty_next_turn,
      can_be_countered: row.can_be_countered,
      min_level: row.min_level,
      requires_melee_range: row.requires_melee_range,
      icon: row.icon,
      animation_id: row.animation_id,
      sort_order: row.sort_order,
    });
  }

  attackTypesCache = cache;
  return cache;
}

/**
 * Get a specific attack type by ID.
 * Throws if attack type doesn't exist.
 */
export async function getAttackType(attack_type_id: string): Promise<AttackType> {
  const types = await loadAttackTypes();
  const attack_type = types.get(attack_type_id);

  if (!attack_type) {
    throw new Error(`Attack type '${attack_type_id}' not found in database`);
  }

  return attack_type;
}

/**
 * Get all attack types as an array (for UI display).
 */
export async function getAllAttackTypes(): Promise<AttackType[]> {
  const types = await loadAttackTypes();
  return Array.from(types.values());
}

/**
 * Get attack types available to a character based on their level.
 */
export async function getAvailableAttackTypes(character_level: number): Promise<AttackType[]> {
  const types = await loadAttackTypes();
  return Array.from(types.values()).filter(t => t.min_level <= character_level);
}

/**
 * Clear the attack types cache (for testing or after DB updates).
 */
export function clearAttackTypesCache(): void {
  attackTypesCache = null;
}

/**
 * Get the default attack type ('strike').
 */
export async function getDefaultAttackType(): Promise<AttackType> {
  return getAttackType('strike');
}
