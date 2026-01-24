/**
 * Battle Actions Service
 * Handles power/spell execution during hex grid battles
 */

import { PowerDefinition, SpellDefinition, calculatePowerAPCost, calculateSpellAPCost } from './battleCharacterLoader';

export interface HexPosition {
  q: number;
  r: number;
  s: number;
}

export interface PowerExecutionContext {
  power: PowerDefinition;
  caster: {
    id: string;
    name: string;
    position: HexPosition;
    current_ap: number;
    max_ap: number;
  };
  target: {
    id: string;
    name: string;
    position: HexPosition;
    health: number;
    max_health: number;
  };
}

export interface SpellExecutionContext {
  spell: SpellDefinition;
  caster: {
    id: string;
    name: string;
    position: HexPosition;
    current_ap: number;
    max_ap: number;
    current_mana: number;
    max_mana: number;
  };
  target: {
    id: string;
    name: string;
    position: HexPosition;
    health: number;
    max_health: number;
  };
}

export interface ActionResult {
  ap_cost: number;
  mana_cost?: number;
  effects: ActionEffect[];
  cooldown_turns: number;
  narrative: string;
}

export interface ActionEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'movement' | 'special';
  target_id?: string;
  value: number;
  description: string;
}

/**
 * Calculate hex distance using cube coordinates
 */
export function calculateHexDistance(a: HexPosition, b: HexPosition): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

/**
 * Validate if a power can be used
 */
export function validatePowerUsage(context: PowerExecutionContext, cooldown: number): {
  can_use: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if on cooldown
  if (cooldown > 0) {
    errors.push(`Power is on cooldown for ${cooldown} more turn(s)`);
  }

  // Check AP cost (now pre-loaded in power definition)
  const ap_cost = context.power.ap_cost;
  if (context.caster.current_ap < ap_cost) {
    errors.push(`Insufficient AP: need ${ap_cost}, have ${context.caster.current_ap}`);
  }

  // Check range if targeting
  if (context.target) {
    const range = getPowerRange(context.power);
    const distance = calculateHexDistance(context.caster.position, context.target.position);
    if (distance > range) {
      errors.push(`Target out of range: ${distance} hexes, max range ${range}`);
    }
  }

  return {
    can_use: errors.length === 0,
    errors
  };
}

/**
 * Validate if a spell can be cast
 */
export function validateSpellCast(context: SpellExecutionContext, cooldown: number): {
  can_cast: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if on cooldown
  if (cooldown > 0) {
    errors.push(`Spell is on cooldown for ${cooldown} more turn(s)`);
  }

  // Check AP cost (now pre-loaded in spell definition)
  const ap_cost = context.spell.ap_cost;
  if (context.caster.current_ap < ap_cost) {
    errors.push(`Insufficient AP: need ${ap_cost}, have ${context.caster.current_ap}`);
  }

  // Check mana cost
  if (context.caster.current_mana < context.spell.mana_cost) {
    errors.push(`Insufficient mana: need ${context.spell.mana_cost}, have ${context.caster.current_mana}`);
  }

  // Check range if targeting
  if (context.target) {
    const range = getSpellRange(context.spell);
    const distance = calculateHexDistance(context.caster.position, context.target.position);
    if (distance > range) {
      errors.push(`Target out of range: ${distance} hexes, max range ${range}`);
    }
  }

  return {
    can_cast: errors.length === 0,
    errors
  };
}

/**
 * Execute a power and return the results
 */
/**
 * Execute a power and return the results
 */
export function executePower(context: PowerExecutionContext, cooldown: number): ActionResult {
  const validation = validatePowerUsage(context, cooldown);

  if (!validation.can_use) {
    throw new Error(`Invalid power usage: ${validation.errors.join(', ')}`);
  }

  const ap_cost = context.power.ap_cost;
  const effects: ActionEffect[] = [];
  let narrative = '';

  // Process power effects
  if (context.power.effects && Array.isArray(context.power.effects)) {
    for (const effect of context.power.effects) {
      const processed_effect = processEffect(effect, context, context.power.current_rank);
      effects.push(processed_effect);
    }
  }

  // Generate narrative
  if (context.target) {
    narrative = `${context.caster.name} uses ${context.power.name} on ${context.target.name}!`;
  } else {
    narrative = `${context.caster.name} activates ${context.power.name}!`;
  }

  return {
    ap_cost,
    effects,
    cooldown_turns: context.power.cooldown,
    narrative
  };
}

/**
 * Execute a spell and return the results
 */
export function executeSpell(context: SpellExecutionContext, cooldown: number): ActionResult {
  const validation = validateSpellCast(context, cooldown);

  if (!validation.can_cast) {
    throw new Error(`Invalid spell cast: ${validation.errors.join(', ')}`);
  }

  const ap_cost = context.spell.ap_cost;
  const mana_cost = context.spell.mana_cost;
  const effects: ActionEffect[] = [];
  let narrative = '';

  // Process spell effects
  if (context.spell.effects && Array.isArray(context.spell.effects)) {
    for (const effect of context.spell.effects) {
      const processed_effect = processEffect(effect, context, context.spell.current_rank);
      effects.push(processed_effect);
    }
  }

  // Generate narrative
  if (context.target) {
    narrative = `${context.caster.name} casts ${context.spell.name} on ${context.target.name}!`;
  } else {
    narrative = `${context.caster.name} casts ${context.spell.name}!`;
  }

  return {
    ap_cost,
    mana_cost,
    effects,
    cooldown_turns: context.spell.cooldown_turns,
    narrative
  };
}

/**
 * Process a single effect from power/spell definition
 */
function processEffect(
  effect_def: any,
  context: PowerExecutionContext | SpellExecutionContext,
  rank: number
): ActionEffect {
  const base_value = effect_def.value || 0;
  // Scale value with rank (rank 1 = 1x, rank 2 = 1.5x, rank 3 = 2x)
  const rank_multiplier = 0.5 + (rank * 0.5);
  const scaled_value = Math.round(base_value * rank_multiplier);

  return {
    type: effect_def.type || 'special',
    target_id: context.target.id,
    value: scaled_value,
    description: effect_def.description || `${effect_def.type} effect`
  };
}

/**
 * Get power range from effects
 */
function getPowerRange(power: PowerDefinition): number {
  if (power.effects && Array.isArray(power.effects)) {
    for (const effect of power.effects) {
      if (effect.range !== undefined) {
        return effect.range;
      }
    }
  }
  return 1; // Default melee range
}

/**
 * Get spell range from effects
 */
function getSpellRange(spell: SpellDefinition): number {
  if (spell.effects && Array.isArray(spell.effects)) {
    for (const effect of spell.effects) {
      if (effect.range !== undefined) {
        return effect.range;
      }
    }
  }
  return 3; // Default medium range
}

/**
 * Apply action effects to battle state
 */
export function applyActionEffects(
  effects: ActionEffect[],
  battle_state: any
): {
  health_changes: Map<string, number>;
  status_effects: Array<{ target_id: string; effect: any }>;
} {
  const health_changes = new Map<string, number>();
  const status_effects: Array<{ target_id: string; effect: any }> = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'damage':
        if (effect.target_id) {
          const current_change = health_changes.get(effect.target_id) || 0;
          health_changes.set(effect.target_id, current_change - effect.value);
        }
        break;

      case 'heal':
        if (effect.target_id) {
          const current_change = health_changes.get(effect.target_id) || 0;
          health_changes.set(effect.target_id, current_change + effect.value);
        }
        break;

      case 'buff':
      case 'debuff':
        if (effect.target_id) {
          status_effects.push({
            target_id: effect.target_id,
            effect: {
              type: effect.type,
              value: effect.value,
              description: effect.description,
              duration: 3 // Default 3 turns
            }
          });
        }
        break;
    }
  }

  return { health_changes, status_effects };
}
