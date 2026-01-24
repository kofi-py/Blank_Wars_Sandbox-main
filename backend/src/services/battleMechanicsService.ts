/**
 * Battle Mechanics Service
 *
 * Handles advanced combat mechanics including:
 * - Damage type resistance calculation
 * - Status effect application and processing
 * - CC diminishing returns
 * - Lifesteal, reflect, execute, and other special mechanics
 *
 * Based on research-backed best practices for RPG combat systems
 */

import { db_adapter } from './databaseAdapter';

// ===== TYPES =====

export interface StatusEffect {
  type: string;
  duration: number; // in turns
  category: 'cc' | 'buff' | 'debuff' | 'dot' | 'hot'; // Required - must be set when creating effect
  value?: number;
  damage_per_turn?: number;
  heal_per_turn?: number;
  charges?: number;
  damage_multiplier?: number;
  attack_multiplier?: number;
  defense_reduction?: number;
  // Extended properties
  stacks?: number; // for stackable effects
  source?: string; // who applied it
  diminishing_level?: number; // for CC diminishing returns
  accuracy_reduction?: number;
  evasion_bonus?: number;
  speed_modifier?: number;
  stat_modifiers?: Record<string, number>;
  prevents_action?: boolean; // for stun
  forces_random_target?: boolean; // for confusion/blind
  controlled_by?: string; // for charm/mind control
  damage_type?: string; // for DoT effects
  healing_reduction?: number; // grievous wound
  max_hp_reduction?: number;
}

export interface StatusEffectType {
  id: string;
  name: string;
  category: 'cc' | 'buff' | 'debuff' | 'dot' | 'hot';
  stackable: boolean;
  cc_diminishing: boolean;
  damage_type: string | null; // From DB - set for DoT effects
}

export interface DamageTypeInfo {
  id: string;
  category: 'physical' | 'magical' | 'elemental';
  resistance_stat: string;
}

export interface BattleCharacter {
  id?: string;
  name?: string;
  // Core stats
  health: number;
  max_health: number;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  magic_defense: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  spirit: number;
  initiative: number; // DB-calculated, not computed at runtime

  // Resistances
  elemental_resistance: number;
  fire_resistance: number;
  cold_resistance: number;
  lightning_resistance: number;
  toxic_resistance: number;

  // Status tracking
  effects: StatusEffect[];
  cc_history?: Record<string, number>; // for diminishing returns
  shields?: Array<{ amount: number, source: string }>;

  // New mechanics
  turn_priority?: number; // Higher = goes first (default speed-based)
  extra_actions?: number; // Extra actions this turn
  damage_immunity?: boolean; // Temporarily immune to all damage
  damage_immunityDuration?: number; // Turns remaining
  force_critical?: boolean; // Next attack is guaranteed crit
  attack_type?: 'melee' | 'ranged'; // For damage type distinction
  kill_count?: number; // Enemies killed this battle
  is_dead: boolean; // For revive mechanic
}

// ===== CONSTANTS =====
// Damage type to resistance mapping is loaded from damage_type_reference table via loadDamageTypes()

// ===== CACHE =====

let status_effect_typesCache: Map<string, StatusEffectType> | null = null;
let damage_typesCache: Map<string, DamageTypeInfo> | null = null;

async function loadStatusEffectTypes(): Promise<Map<string, StatusEffectType>> {
  if (status_effect_typesCache) return status_effect_typesCache;

  const result = await db_adapter.query(
    'SELECT id, name, category, stackable, cc_diminishing, damage_type FROM status_effect_types'
  );
  const types = result.rows as StatusEffectType[];

  status_effect_typesCache = new Map(types.map(t => [t.id, t]));
  return status_effect_typesCache;
}

async function loadDamageTypes(): Promise<Map<string, DamageTypeInfo>> {
  if (damage_typesCache) return damage_typesCache;

  const result = await db_adapter.query(
    'SELECT id, category, resistance_stat FROM damage_type_reference'
  );
  const types = result.rows as DamageTypeInfo[];

  damage_typesCache = new Map(types.map(t => [t.id, t]));
  return damage_typesCache;
}

// ===== DEFENSE CALCULATION =====

/**
 * Calculate defense reduction using hybrid formula (flat + percentage)
 * Based on Dark Souls 3 research: two-layer defense for balanced scaling
 * 
 * @param incoming_damage - Raw damage before defense
 * @param defense - Total defense (character.defense + armor bonus)
 * @returns Damage after defense reduction (minimum 1)
 */
export function calculateDefenseReduction(
  incoming_damage: number,
  defense: number
): number {
  // Layer 1: Flat reduction - counters weak attacks
  const flat_reduction = defense * 0.3;

  // Layer 2: Percentage reduction with diminishing returns
  // Formula: defense / (defense + 100)
  // 0 def = 0%, 50 def = 33%, 100 def = 50%, 200 def = 67%
  const percentage_reduction = defense / (defense + 100);

  // Apply both layers: (damage - flat) * (1 - percentage)
  const damage_after_flat = Math.max(0, incoming_damage - flat_reduction);
  const damage_after_percentage = damage_after_flat * (1 - percentage_reduction);

  // Minimum 1 damage to prevent complete immunity
  return Math.max(1, Math.round(damage_after_percentage));
}

/**
 * Calculate critical hit chance, reduced by target's dexterity
 * High dexterity = better at avoiding critical hits
 * 
 * @param base_crit_chance - Base crit chance (typically 15%)
 * @param target_dexterity - Target's dexterity stat
 * @returns Final crit chance (minimum 5%)
 */
export function calculateCritChance(
  base_crit_chance: number,
  target_dexterity: number
): number {
  // Dexterity reduces crit chance: -dex/3
  // 60 dex = 20% reduction, capping at 5% minimum
  const crit_reduction = target_dexterity / 3;
  const final_crit_chance = base_crit_chance - crit_reduction;

  // Minimum 5% crit chance - always some risk
  return Math.max(5, final_crit_chance);
}

/**
 * Calculate evasion bonus from dexterity
 * High dexterity = harder to hit
 * 
 * @param target_dexterity - Target's dexterity stat
 * @returns Reduction to enemy hit chance
 */
export function calculateEvasionBonus(target_dexterity: number): number {
  // -dex/4 to enemy hit chance
  // 60 dex = 15% harder to hit
  return Math.floor(target_dexterity / 4);
}

// ===== DAMAGE CALCULATION =====

/**
 * Calculate damage with resistance
 * Uses percentage-based resistance formula: damage * (1 - resistance/100)
 */
export async function calculateDamageWithResistance(
  base_damage: number,
  damage_type: string,
  defender: BattleCharacter
): Promise<number> {
  const resistance_multiplier = await calculateDamageTypeResistance(damage_type, defender);
  const final_damage = base_damage * resistance_multiplier;
  return Math.round(Math.max(0, final_damage));
}

/**
 * Calculate damage with resistance
 * Uses percentage-based resistance formula: damage * (1 - resistance/100)
 * Resistance stat mapping loaded from damage_type_reference table
 */
export async function calculateDamageTypeResistance(
  damage_type: string,
  defender: BattleCharacter
): Promise<number> {
  // Get resistance stat from DB
  const damage_types = await loadDamageTypes();
  const damage_type_info = damage_types.get(damage_type);

  if (!damage_type_info) {
    throw new Error(`Unknown damage type: ${damage_type}`);
  }

  const resistance_stat_name = damage_type_info.resistance_stat;

  // Resistance lookup by stat name from damage_type_reference
  const resistanceMap: Record<string, number> = {
    defense: defender.defense,
    magic_defense: defender.magic_defense,
    fire_resistance: defender.fire_resistance,
    cold_resistance: defender.cold_resistance,
    lightning_resistance: defender.lightning_resistance,
    toxic_resistance: defender.toxic_resistance,
    elemental_resistance: defender.elemental_resistance
  };
  const resistance = resistanceMap[resistance_stat_name] ?? 0;

  // Percentage-based formula: better scaling than flat reduction
  // 0% = full damage, 50% = half damage, 75% = quarter damage, 100% = immune
  const resistance_multiplier = 1 - (Math.min(100, Math.max(0, resistance)) / 100);

  return resistance_multiplier;
}

// ===== STATUS EFFECTS =====

/**
 * Apply status effect with stacking and CC diminishing returns logic
 */
export async function applyStatusEffect(
  target: BattleCharacter,
  new_effect: StatusEffect
): Promise<void> {
  const status_types = await loadStatusEffectTypes();
  const effect_type = status_types.get(new_effect.type);

  if (!effect_type) {
    console.warn(`Unknown status effect type: ${new_effect.type}`);
    return;
  }

  // Check for existing effect
  const existing_index = target.effects.findIndex(e => e.type === new_effect.type);

  if (existing_index >= 0) {
    const existing = target.effects[existing_index];

    if (effect_type.stackable) {
      // DoT effects: Extend duration (capped to prevent unbounded growth)
      const MAX_EFFECT_DURATION = 10; // Cap at 10 rounds max
      existing.duration = Math.min(existing.duration + new_effect.duration, MAX_EFFECT_DURATION);
      existing.stacks = (existing.stacks || 1) + 1;
    } else {
      // Non-stackable: Refresh to longer duration
      existing.duration = Math.max(existing.duration, new_effect.duration);
    }
  } else {
    // New effect - apply CC diminishing returns if needed
    if (effect_type.cc_diminishing) {
      const cc_history = target.cc_history || {};
      const cc_count = cc_history[new_effect.type] || 0;

      // Research pattern: full -> half -> quarter -> immune
      switch (cc_count) {
        case 0:
          // Full duration
          break;
        case 1:
          new_effect.duration = Math.floor(new_effect.duration / 2);
          new_effect.diminishing_level = 1;
          break;
        case 2:
          new_effect.duration = Math.floor(new_effect.duration / 4);
          new_effect.diminishing_level = 2;
          break;
        default:
          // Immune - don't apply
          console.log(`Target immune to ${new_effect.type} due to diminishing returns`);
          return;
      }

      // Track for next application
      target.cc_history = target.cc_history || {};
      target.cc_history[new_effect.type] = cc_count + 1;
    }

    // Add category and damage_type from DB
    new_effect.category = effect_type.category;
    if (effect_type.damage_type) {
      new_effect.damage_type = effect_type.damage_type;
    }
    target.effects.push(new_effect);
  }
}

/**
 * Process status effects at start of turn
 * Returns combat events generated
 */
export function processStatusEffects(
  character: BattleCharacter,
  is_start_of_turn: boolean
): Array<{ type: string, data: any }> {
  const events: Array<{ type: string, data: any }> = [];

  character.effects = character.effects.filter(effect => {
    // Remove expired effects
    if (effect.duration <= 0) {
      events.push({
        type: 'effect_removed',
        data: { effect: effect.type }
      });
      return false;
    }

    if (is_start_of_turn) {
      // Process DoT (Damage Over Time)
      if (effect.damage_per_turn && effect.damage_per_turn > 0) {
        character.health = Math.max(0, character.health - effect.damage_per_turn);
        events.push({
          type: 'damage_over_time',
          data: {
            amount: effect.damage_per_turn,
            effect: effect.type,
            damage_type: effect.damage_type
          }
        });
      }

      // Process HoT (Heal Over Time)
      if (effect.heal_per_turn && effect.heal_per_turn > 0) {
        const heal_amount = Math.min(
          character.max_health - character.health,
          effect.heal_per_turn
        );
        character.health = Math.min(character.max_health, character.health + heal_amount);
        events.push({
          type: 'heal_over_time',
          data: { amount: heal_amount, effect: effect.type }
        });
      }

      // Check CC prevention
      if (isCrowdControlled(effect)) {
        events.push({
          type: 'action_prevented',
          data: { effect: effect.type }
        });
      }
    }

    // Decrement duration at end of turn
    if (!is_start_of_turn) {
      effect.duration--;
    }

    return true;
  });

  return events;
}

/**
 * Check if effect prevents action
 */
export function isCrowdControlled(effect: StatusEffect): boolean {
  return ['stun', 'paralyze', 'fear', 'charm', 'sleep'].includes(effect.type);
}

/**
 * Check if character can act this turn
 */
export function canCharacterAct(character: BattleCharacter): boolean {
  return !character.effects.some(e => isCrowdControlled(e));
}

// ===== SPECIAL MECHANICS =====

/**
 * Apply lifesteal - heal attacker for percentage of damage dealt
 */
export function applyLifesteal(
  attacker: BattleCharacter,
  damage: number,
  lifesteal_percent: number
): number {
  const heal_amount = Math.round(damage * (lifesteal_percent / 100));
  const actual_heal = Math.min(
    attacker.max_health - attacker.health,
    heal_amount
  );

  attacker.health = Math.min(attacker.max_health, attacker.health + actual_heal);
  return actual_heal;
}

/**
 * Check if attack should execute (instant kill) target
 */
export function checkExecute(
  target: BattleCharacter,
  threshold_percent: number
): boolean {
  const hp_percent = (target.health / target.max_health) * 100;
  return hp_percent <= threshold_percent;
}

/**
 * Apply reflected damage back to attacker
 */
export function applyReflectDamage(
  attacker: BattleCharacter,
  original_damage: number,
  reflect_percent: number
): number {
  const reflect_damage = Math.round(original_damage * (reflect_percent / 100));
  attacker.health = Math.max(0, attacker.health - reflect_damage);
  return reflect_damage;
}

/**
 * Apply shield/absorb damage
 * Returns actual damage dealt after shields
 */
export function applyShields(
  target: BattleCharacter,
  incoming_damage: number
): { damage_dealt: number, shields_remaining: number } {
  if (!target.shields || target.shields.length === 0) {
    return { damage_dealt: incoming_damage, shields_remaining: 0 };
  }

  let remaining_damage = incoming_damage;
  let total_shields_remaining = 0;

  // Process shields in order
  target.shields = target.shields.filter(shield => {
    if (remaining_damage <= 0) {
      total_shields_remaining += shield.amount;
      return true; // Keep shield
    }

    if (shield.amount >= remaining_damage) {
      shield.amount -= remaining_damage;
      remaining_damage = 0;
      total_shields_remaining += shield.amount;
      return shield.amount > 0; // Remove if depleted
    } else {
      remaining_damage -= shield.amount;
      return false; // Shield depleted, remove
    }
  });

  return {
    damage_dealt: remaining_damage,  // Damage that got THROUGH shields (not absorbed)
    shields_remaining: total_shields_remaining
  };
}

/**
 * Purge effects by category
 */
export function purgeEffects(
  target: BattleCharacter,
  category: 'buff' | 'debuff' | 'all'
): StatusEffect[] {
  const removed: StatusEffect[] = [];

  target.effects = target.effects.filter(effect => {
    const is_buff_category = ['buff', 'hot'].includes(effect.category);
    const is_debuff_category = ['debuff', 'dot', 'cc'].includes(effect.category);

    const should_remove =
      category === 'all' ||
      (category === 'buff' && is_buff_category) ||
      (category === 'debuff' && is_debuff_category);

    if (should_remove) {
      removed.push(effect);
      return false;
    }
    return true;
  });

  return removed;
}

/**
 * Steal max HP permanently
 */
export function stealMaxHP(
  attacker: BattleCharacter,
  target: BattleCharacter,
  percentage: number
): number {
  const stolen_hp = Math.round(target.max_health * (percentage / 100));

  // Reduce target max HP
  target.max_health = Math.max(1, target.max_health - stolen_hp);
  target.health = Math.min(target.health, target.max_health);

  // Increase attacker max HP
  attacker.max_health += stolen_hp;
  attacker.health += stolen_hp;

  return stolen_hp;
}

// ===== NEW MECHANICS (Added for Power System) =====

/**
 * Apply multi-hit attack - attack hits multiple times
 * Returns array of damage values for each hit
 */
export async function applyMultiHit(
  base_damage: number,
  hit_count: number,
  damage_type: string,
  defender: BattleCharacter
): Promise<number[]> {
  const damages: number[] = [];

  for (let i = 0; i < hit_count; i++) {
    const damage = await calculateDamageWithResistance(base_damage, damage_type, defender);
    damages.push(damage);
  }

  return damages;
}

/**
 * Set turn priority - higher values go first
 * Default priority is based on speed stat
 */
export function setTurnPriority(
  character: BattleCharacter,
  priority: number
): void {
  character.turn_priority = priority;
}

/**
 * Determine turn order for multiple characters
 * Returns characters sorted by priority (high to low), then speed (high to low)
 * Initiative comes from DB - not calculated at runtime
 */
export function determineTurnOrder(
  characters: BattleCharacter[]
): BattleCharacter[] {
  return [...characters].sort((a, b) => {
    // Use turn_priority if set, otherwise use DB-calculated initiative
    const priority_a = a.turn_priority ?? a.initiative;
    const priority_b = b.turn_priority ?? b.initiative;

    if (priority_a !== priority_b) {
      return priority_b - priority_a; // Higher priority/initiative goes first
    }

    // Tiebreaker: use raw speed
    return b.speed - a.speed;
  });
}

/**
 * Grant extra actions for this turn
 */
export function grantExtraActions(
  character: BattleCharacter,
  action_count: number
): void {
  character.extra_actions = (character.extra_actions || 0) + action_count;
}

/**
 * Consume one action from character's available actions
 * Returns true if action was consumed, false if no actions available
 */
export function consumeAction(character: BattleCharacter): boolean {
  if ((character.extra_actions || 0) > 0) {
    character.extra_actions!--;
    return true;
  }
  return false;
}

/**
 * Reset extra actions at end of turn
 */
export function resetExtraActions(character: BattleCharacter): void {
  character.extra_actions = 0;
}

/**
 * Copy buffs from one character to another
 * Returns the buffs that were copied
 */
export function copyBuffs(
  source: BattleCharacter,
  target: BattleCharacter,
  count: number = 1
): StatusEffect[] {
  const buffs = source.effects.filter(e =>
    ['buff', 'hot'].includes(e.category)
  );

  const buffs_to_copy = buffs.slice(0, count === 99 ? buffs.length : count);
  const copied_buffs: StatusEffect[] = [];

  for (const buff of buffs_to_copy) {
    // Create a copy of the buff (use source.id not source object to avoid [object Object])
    const copied_buff: StatusEffect = {
      ...buff,
      source: `copied_from_${source.id || source.name || 'unknown'}`
    };
    target.effects.push(copied_buff);
    copied_buffs.push(copied_buff);
  }

  return copied_buffs;
}

/**
 * Steal buffs from enemy and apply to ally
 * Returns the buffs that were stolen
 */
export function stealBuffs(
  enemy: BattleCharacter,
  ally: BattleCharacter,
  count: number = 1
): StatusEffect[] {
  const buffs = enemy.effects.filter(e =>
    ['buff', 'hot'].includes(e.category)
  );

  const buffs_to_steal = buffs.slice(0, count === 99 ? buffs.length : count);
  const stolen_buffs: StatusEffect[] = [];

  // Create a Set of buff references for O(1) lookup
  const buffs_to_steal_set = new Set(buffs_to_steal);

  // Filter out stolen buffs from enemy in one pass (avoids stale index issues)
  enemy.effects = enemy.effects.filter(e => {
    if (buffs_to_steal_set.has(e)) {
      // This buff is being stolen - add to ally and track it
      const stolen_buff: StatusEffect = {
        ...e,
        source: 'stolen'
      };
      ally.effects.push(stolen_buff);
      stolen_buffs.push(stolen_buff);
      return false; // Remove from enemy
    }
    return true; // Keep in enemy
  });

  return stolen_buffs;
}

/**
 * Set forced critical hit on next attack
 */
export function setForceCritical(character: BattleCharacter): void {
  character.force_critical = true;
}

/**
 * Check and consume forced critical flag
 * Returns true if this attack should be a guaranteed crit
 */
export function checkAndConsumeForceCritical(character: BattleCharacter): boolean {
  if (character.force_critical) {
    character.force_critical = false;
    return true;
  }
  return false;
}

/**
 * Apply damage immunity for specified duration (in turns)
 */
export function applyDamageImmunity(
  character: BattleCharacter,
  duration: number
): void {
  character.damage_immunity = true;
  character.damage_immunityDuration = duration;
}

/**
 * Check if character is immune to damage
 */
export function isDamageImmune(character: BattleCharacter): boolean {
  return character.damage_immunity === true;
}

/**
 * Process damage immunity duration (call at end of turn)
 */
export function processDamageImmunity(character: BattleCharacter): void {
  if (character.damage_immunityDuration !== undefined && character.damage_immunityDuration > 0) {
    character.damage_immunityDuration--;
    if (character.damage_immunityDuration <= 0) {
      character.damage_immunity = false;
      character.damage_immunityDuration = undefined;
    }
  }
}

/**
 * Revive a fallen ally
 * Returns true if revive was successful
 */
export function reviveAlly(
  character: BattleCharacter,
  hp_percent: number
): boolean {
  if (!character.is_dead) {
    return false; // Character is not dead
  }

  character.is_dead = false;
  character.health = Math.round(character.max_health * (hp_percent / 100));

  // Clear negative effects on revive
  character.effects = character.effects.filter(e =>
    ['buff', 'hot'].includes(e.category)
  );

  return true;
}

/**
 * Mark character as dead
 */
export function markAsDead(character: BattleCharacter): void {
  character.is_dead = true;
  character.health = 0;
}

/**
 * Share stats from one character to allies
 * Adds a percentage of source's stats to target as temporary buffs
 */
export function share_stats(
  source: BattleCharacter,
  target: BattleCharacter,
  percentage: number,
  duration: number
): void {
  const shared_stats: StatusEffect = {
    type: 'shared_stats',
    category: 'buff',
    duration: duration,
    stat_modifiers: {
      attack: Math.round(source.attack * (percentage / 100)),
      defense: Math.round(source.defense * (percentage / 100)),
      speed: Math.round(source.speed * (percentage / 100)),
      magic_attack: Math.round(source.magic_attack * (percentage / 100)),
      magic_defense: Math.round(source.magic_defense * (percentage / 100))
    },
    source: 'stat_sharing'
  };

  target.effects.push(shared_stats);
}

/**
 * Apply AOE damage to multiple targets
 * Returns array of damage dealt to each target
 */
export async function applyAOEDamage(
  base_damage: number,
  damage_type: string,
  targets: BattleCharacter[]
): Promise<Array<{ target: BattleCharacter, damage: number }>> {
  const results: Array<{ target: BattleCharacter, damage: number }> = [];

  for (const target of targets) {
    // Check damage immunity
    if (isDamageImmune(target)) {
      results.push({ target, damage: 0 });
      continue;
    }

    // Apply shields first - damage_dealt is what got THROUGH shields
    const { damage_dealt } = applyShields(target, base_damage);

    // Calculate damage with resistance
    const final_damage = await calculateDamageWithResistance(damage_dealt, damage_type, target);

    // Apply damage
    target.health = Math.max(0, target.health - final_damage);

    // Check if killed
    if (target.health <= 0 && !target.is_dead) {
      markAsDead(target);
    }

    results.push({ target, damage: final_damage });
  }

  return results;
}

/**
 * Increment kill count for character
 */
export function incrementKillCount(character: BattleCharacter): void {
  character.kill_count = (character.kill_count || 0) + 1;
}

/**
 * Get kill count for character
 */
export function getKillCount(character: BattleCharacter): number {
  return character.kill_count || 0;
}

/**
 * Export all functions
 */
export const BattleMechanicsService = {
  // Damage
  calculateDamageWithResistance,

  // Status Effects
  applyStatusEffect,
  processStatusEffects,
  isCrowdControlled,
  canCharacterAct,

  // Special Mechanics
  applyLifesteal,
  checkExecute,
  applyReflectDamage,
  applyShields,
  purgeEffects,
  stealMaxHP,

  // New Mechanics (Power System)
  applyMultiHit,
  setTurnPriority,
  determineTurnOrder,
  grantExtraActions,
  consumeAction,
  resetExtraActions,
  copyBuffs,
  stealBuffs,
  setForceCritical,
  checkAndConsumeForceCritical,
  applyDamageImmunity,
  isDamageImmune,
  processDamageImmunity,
  reviveAlly,
  markAsDead,
  share_stats,
  applyAOEDamage,
  incrementKillCount,
  getKillCount,

  // Cache management
  loadStatusEffectTypes,
  loadDamageTypes,
};

export default BattleMechanicsService;
