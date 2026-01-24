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

import { dbAdapter } from './databaseAdapter';

// ===== TYPES =====

export interface StatusEffect {
  type: string;
  duration: number; // in turns
  value?: number;
  damage_per_turn?: number;
  heal_per_turn?: number;
  charges?: number;
  damage_multiplier?: number;
  attack_multiplier?: number;
  defense_reduction?: number;
  // Extended properties
  category?: 'cc' | 'buff' | 'debuff' | 'dot' | 'hot';
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
  damage_type?: string; // what type of DoT
  healing_reduction?: number; // grievous wound
  max_hp_reduction?: number;
}

export interface StatusEffectType {
  id: string;
  name: string;
  category: 'cc' | 'buff' | 'debuff' | 'dot' | 'hot';
  stackable: boolean;
  cc_diminishing: boolean;
}

export interface DamageTypeInfo {
  id: string;
  category: 'physical' | 'magical' | 'elemental';
  resistance_stat: string;
}

export interface BattleCharacter {
  // Core stats
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  magic_defense: number;

  // Resistances (from migration 015)
  physical_resistance?: number;
  magical_resistance?: number;
  elemental_resistance?: number;

  // Status tracking
  effects: StatusEffect[];
  cc_history?: Record<string, number>; // for diminishing returns
  shields?: Array<{amount: number, source: string}>;

  // New mechanics
  turnPriority?: number; // Higher = goes first (default speed-based)
  extraActions?: number; // Extra actions this turn
  damageImmunity?: boolean; // Temporarily immune to all damage
  damageImmunityDuration?: number; // Turns remaining
  forceCritical?: boolean; // Next attack is guaranteed crit
  attackType?: 'melee' | 'ranged'; // For damage type distinction
  killCount?: number; // Enemies killed this battle
  isDead?: boolean; // For revive mechanic
}

// ===== CONSTANTS =====

const DAMAGE_TYPE_RESISTANCE_MAP: Record<string, string> = {
  // Physical category
  'physical': 'physical_resistance',
  'piercing': 'physical_resistance',
  'slashing': 'physical_resistance',
  'bludgeoning': 'physical_resistance',

  // Magical category
  'magic': 'magic_defense',
  'arcane': 'magic_defense',
  'holy': 'magical_resistance',
  'dark': 'magical_resistance',
  'psychic': 'magical_resistance',

  // Elemental category
  'fire': 'elemental_resistance',
  'lightning': 'elemental_resistance',
  'ice': 'elemental_resistance',
  'poison': 'elemental_resistance',
  'acid': 'elemental_resistance',
};

// ===== CACHE =====

let statusEffectTypesCache: Map<string, StatusEffectType> | null = null;
let damageTypesCache: Map<string, DamageTypeInfo> | null = null;

async function loadStatusEffectTypes(): Promise<Map<string, StatusEffectType>> {
  if (statusEffectTypesCache) return statusEffectTypesCache;

  const result = await dbAdapter.query(
    'SELECT id, name, category, stackable, cc_diminishing FROM status_effect_types'
  );
  const types = result.rows as StatusEffectType[];

  statusEffectTypesCache = new Map(types.map(t => [t.id, t]));
  return statusEffectTypesCache;
}

async function loadDamageTypes(): Promise<Map<string, DamageTypeInfo>> {
  if (damageTypesCache) return damageTypesCache;

  const result = await dbAdapter.query(
    'SELECT id, category, resistance_stat FROM damage_type_reference'
  );
  const types = result.rows as DamageTypeInfo[];

  damageTypesCache = new Map(types.map(t => [t.id, t]));
  return damageTypesCache;
}

// ===== DAMAGE CALCULATION =====

/**
 * Calculate damage with resistance
 * Uses percentage-based resistance formula: damage * (1 - resistance/100)
 */
export function calculateDamageWithResistance(
  baseDamage: number,
  damageType: string,
  defender: BattleCharacter
): number {
  // Get resistance stat for this damage type
  const resistanceStat = DAMAGE_TYPE_RESISTANCE_MAP[damageType] || 'physical_resistance';
  const resistance = (defender as any)[resistanceStat] || 0;

  // Percentage-based formula: better scaling than flat reduction
  // 0% = full damage, 50% = half damage, 75% = quarter damage, 100% = immune
  const resistanceMultiplier = 1 - (Math.min(100, Math.max(0, resistance)) / 100);

  const finalDamage = baseDamage * resistanceMultiplier;

  return Math.round(Math.max(0, finalDamage));
}

// ===== STATUS EFFECTS =====

/**
 * Apply status effect with stacking and CC diminishing returns logic
 */
export async function applyStatusEffect(
  target: BattleCharacter,
  newEffect: StatusEffect
): Promise<void> {
  const statusTypes = await loadStatusEffectTypes();
  const effectType = statusTypes.get(newEffect.type);

  if (!effectType) {
    console.warn(`Unknown status effect type: ${newEffect.type}`);
    return;
  }

  // Check for existing effect
  const existingIndex = target.effects.findIndex(e => e.type === newEffect.type);

  if (existingIndex >= 0) {
    const existing = target.effects[existingIndex];

    if (effectType.stackable) {
      // DoT effects: Extend duration (research best practice)
      existing.duration += newEffect.duration;
      existing.stacks = (existing.stacks || 1) + 1;
    } else {
      // Non-stackable: Refresh to longer duration
      existing.duration = Math.max(existing.duration, newEffect.duration);
    }
  } else {
    // New effect - apply CC diminishing returns if needed
    if (effectType.cc_diminishing) {
      const ccHistory = target.cc_history || {};
      const ccCount = ccHistory[newEffect.type] || 0;

      // Research pattern: full -> half -> quarter -> immune
      switch (ccCount) {
        case 0:
          // Full duration
          break;
        case 1:
          newEffect.duration = Math.floor(newEffect.duration / 2);
          newEffect.diminishing_level = 1;
          break;
        case 2:
          newEffect.duration = Math.floor(newEffect.duration / 4);
          newEffect.diminishing_level = 2;
          break;
        default:
          // Immune - don't apply
          console.log(`Target immune to ${newEffect.type} due to diminishing returns`);
          return;
      }

      // Track for next application
      target.cc_history = target.cc_history || {};
      target.cc_history[newEffect.type] = ccCount + 1;
    }

    // Add category for easier processing
    newEffect.category = effectType.category;
    target.effects.push(newEffect);
  }
}

/**
 * Process status effects at start of turn
 * Returns combat events generated
 */
export function processStatusEffects(
  character: BattleCharacter,
  isStartOfTurn: boolean
): Array<{type: string, data: any}> {
  const events: Array<{type: string, data: any}> = [];

  character.effects = character.effects.filter(effect => {
    // Remove expired effects
    if (effect.duration <= 0) {
      events.push({
        type: 'effect_removed',
        data: {effect: effect.type}
      });
      return false;
    }

    if (isStartOfTurn) {
      // Process DoT (Damage Over Time)
      if (effect.damage_per_turn && effect.damage_per_turn > 0) {
        character.health = Math.max(0, character.health - effect.damage_per_turn);
        events.push({
          type: 'damage_over_time',
          data: {
            amount: effect.damage_per_turn,
            effect: effect.type,
            damageType: effect.damage_type || 'physical'
          }
        });
      }

      // Process HoT (Heal Over Time)
      if (effect.heal_per_turn && effect.heal_per_turn > 0) {
        const healAmount = Math.min(
          character.maxHealth - character.health,
          effect.heal_per_turn
        );
        character.health = Math.min(character.maxHealth, character.health + healAmount);
        events.push({
          type: 'heal_over_time',
          data: {amount: healAmount, effect: effect.type}
        });
      }

      // Check CC prevention
      if (isCrowdControlled(effect)) {
        events.push({
          type: 'action_prevented',
          data: {effect: effect.type}
        });
      }
    }

    // Decrement duration at end of turn
    if (!isStartOfTurn) {
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
  lifestealPercent: number
): number {
  const healAmount = Math.round(damage * (lifestealPercent / 100));
  const actualHeal = Math.min(
    attacker.maxHealth - attacker.health,
    healAmount
  );

  attacker.health = Math.min(attacker.maxHealth, attacker.health + actualHeal);
  return actualHeal;
}

/**
 * Check if attack should execute (instant kill) target
 */
export function checkExecute(
  target: BattleCharacter,
  thresholdPercent: number
): boolean {
  const hpPercent = (target.health / target.maxHealth) * 100;
  return hpPercent <= thresholdPercent;
}

/**
 * Apply reflected damage back to attacker
 */
export function applyReflectDamage(
  attacker: BattleCharacter,
  originalDamage: number,
  reflectPercent: number
): number {
  const reflectDamage = Math.round(originalDamage * (reflectPercent / 100));
  attacker.health = Math.max(0, attacker.health - reflectDamage);
  return reflectDamage;
}

/**
 * Apply shield/absorb damage
 * Returns actual damage dealt after shields
 */
export function applyShields(
  target: BattleCharacter,
  incomingDamage: number
): {damageDealt: number, shieldsRemaining: number} {
  if (!target.shields || target.shields.length === 0) {
    return {damageDealt: incomingDamage, shieldsRemaining: 0};
  }

  let remainingDamage = incomingDamage;
  let totalShieldsRemaining = 0;

  // Process shields in order
  target.shields = target.shields.filter(shield => {
    if (remainingDamage <= 0) {
      totalShieldsRemaining += shield.amount;
      return true; // Keep shield
    }

    if (shield.amount >= remainingDamage) {
      shield.amount -= remainingDamage;
      remainingDamage = 0;
      totalShieldsRemaining += shield.amount;
      return shield.amount > 0; // Remove if depleted
    } else {
      remainingDamage -= shield.amount;
      return false; // Shield depleted, remove
    }
  });

  return {
    damageDealt: incomingDamage - remainingDamage,
    shieldsRemaining: totalShieldsRemaining
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
    const isBuffCategory = ['buff', 'hot'].includes(effect.category || '');
    const isDebuffCategory = ['debuff', 'dot', 'cc'].includes(effect.category || '');

    const shouldRemove =
      category === 'all' ||
      (category === 'buff' && isBuffCategory) ||
      (category === 'debuff' && isDebuffCategory);

    if (shouldRemove) {
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
  const stolenHP = Math.round(target.maxHealth * (percentage / 100));

  // Reduce target max HP
  target.maxHealth = Math.max(1, target.maxHealth - stolenHP);
  target.health = Math.min(target.health, target.maxHealth);

  // Increase attacker max HP
  attacker.maxHealth += stolenHP;
  attacker.health += stolenHP;

  return stolenHP;
}

// ===== NEW MECHANICS (Added for Power System) =====

/**
 * Apply multi-hit attack - attack hits multiple times
 * Returns array of damage values for each hit
 */
export function applyMultiHit(
  baseDamage: number,
  hitCount: number,
  damageType: string,
  defender: BattleCharacter
): number[] {
  const damages: number[] = [];

  for (let i = 0; i < hitCount; i++) {
    const damage = calculateDamageWithResistance(baseDamage, damageType, defender);
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
  character.turnPriority = priority;
}

/**
 * Determine turn order for multiple characters
 * Returns characters sorted by priority (high to low), then speed (high to low)
 */
export function determineTurnOrder(
  characters: BattleCharacter[]
): BattleCharacter[] {
  return [...characters].sort((a, b) => {
    // First sort by turnPriority if set
    const priorityA = a.turnPriority ?? a.speed;
    const priorityB = b.turnPriority ?? b.speed;

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority/speed goes first
    }

    // Tiebreaker: use speed if priorities are equal
    return b.speed - a.speed;
  });
}

/**
 * Grant extra actions for this turn
 */
export function grantExtraActions(
  character: BattleCharacter,
  actionCount: number
): void {
  character.extraActions = (character.extraActions || 0) + actionCount;
}

/**
 * Consume one action from character's available actions
 * Returns true if action was consumed, false if no actions available
 */
export function consumeAction(character: BattleCharacter): boolean {
  if ((character.extraActions || 0) > 0) {
    character.extraActions!--;
    return true;
  }
  return false;
}

/**
 * Reset extra actions at end of turn
 */
export function resetExtraActions(character: BattleCharacter): void {
  character.extraActions = 0;
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
    ['buff', 'hot'].includes(e.category || '')
  );

  const buffsToCopy = buffs.slice(0, count === 99 ? buffs.length : count);
  const copiedBuffs: StatusEffect[] = [];

  for (const buff of buffsToCopy) {
    // Create a copy of the buff
    const copiedBuff: StatusEffect = {
      ...buff,
      source: `copied_from_${source}`
    };
    target.effects.push(copiedBuff);
    copiedBuffs.push(copiedBuff);
  }

  return copiedBuffs;
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
    ['buff', 'hot'].includes(e.category || '')
  );

  const buffsToSteal = buffs.slice(0, count === 99 ? buffs.length : count);
  const stolenBuffs: StatusEffect[] = [];

  for (const buff of buffsToSteal) {
    // Remove from enemy
    const index = enemy.effects.findIndex(e => e === buff);
    if (index >= 0) {
      enemy.effects.splice(index, 1);

      // Add to ally
      const stolenBuff: StatusEffect = {
        ...buff,
        source: 'stolen'
      };
      ally.effects.push(stolenBuff);
      stolenBuffs.push(stolenBuff);
    }
  }

  return stolenBuffs;
}

/**
 * Set forced critical hit on next attack
 */
export function setForceCritical(character: BattleCharacter): void {
  character.forceCritical = true;
}

/**
 * Check and consume forced critical flag
 * Returns true if this attack should be a guaranteed crit
 */
export function checkAndConsumeForceCritical(character: BattleCharacter): boolean {
  if (character.forceCritical) {
    character.forceCritical = false;
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
  character.damageImmunity = true;
  character.damageImmunityDuration = duration;
}

/**
 * Check if character is immune to damage
 */
export function isDamageImmune(character: BattleCharacter): boolean {
  return character.damageImmunity === true;
}

/**
 * Process damage immunity duration (call at end of turn)
 */
export function processDamageImmunity(character: BattleCharacter): void {
  if (character.damageImmunityDuration !== undefined && character.damageImmunityDuration > 0) {
    character.damageImmunityDuration--;
    if (character.damageImmunityDuration <= 0) {
      character.damageImmunity = false;
      character.damageImmunityDuration = undefined;
    }
  }
}

/**
 * Revive a fallen ally
 * Returns true if revive was successful
 */
export function reviveAlly(
  character: BattleCharacter,
  hpPercent: number
): boolean {
  if (!character.isDead) {
    return false; // Character is not dead
  }

  character.isDead = false;
  character.health = Math.round(character.maxHealth * (hpPercent / 100));

  // Clear negative effects on revive
  character.effects = character.effects.filter(e =>
    ['buff', 'hot'].includes(e.category || '')
  );

  return true;
}

/**
 * Mark character as dead
 */
export function markAsDead(character: BattleCharacter): void {
  character.isDead = true;
  character.health = 0;
}

/**
 * Share stats from one character to allies
 * Adds a percentage of source's stats to target as temporary buffs
 */
export function shareStats(
  source: BattleCharacter,
  target: BattleCharacter,
  percentage: number,
  duration: number
): void {
  const sharedStats: StatusEffect = {
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

  target.effects.push(sharedStats);
}

/**
 * Apply AOE damage to multiple targets
 * Returns array of damage dealt to each target
 */
export function applyAOEDamage(
  baseDamage: number,
  damageType: string,
  targets: BattleCharacter[]
): Array<{target: BattleCharacter, damage: number}> {
  const results: Array<{target: BattleCharacter, damage: number}> = [];

  for (const target of targets) {
    // Check damage immunity
    if (isDamageImmune(target)) {
      results.push({target, damage: 0});
      continue;
    }

    // Apply shields first
    const {damageDealt} = applyShields(target, baseDamage);
    const remainingDamage = baseDamage - damageDealt;

    // Calculate damage with resistance
    const finalDamage = calculateDamageWithResistance(remainingDamage, damageType, target);

    // Apply damage
    target.health = Math.max(0, target.health - finalDamage);

    // Check if killed
    if (target.health <= 0 && !target.isDead) {
      markAsDead(target);
    }

    results.push({target, damage: finalDamage});
  }

  return results;
}

/**
 * Increment kill count for character
 */
export function incrementKillCount(character: BattleCharacter): void {
  character.killCount = (character.killCount || 0) + 1;
}

/**
 * Get kill count for character
 */
export function getKillCount(character: BattleCharacter): number {
  return character.killCount || 0;
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
  shareStats,
  applyAOEDamage,
  incrementKillCount,
  getKillCount,

  // Cache management
  loadStatusEffectTypes,
  loadDamageTypes,
};

export default BattleMechanicsService;
