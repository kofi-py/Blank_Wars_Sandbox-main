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
    currentAP: number;
    maxAP: number;
  };
  target?: {
    id: string;
    name: string;
    position: HexPosition;
    health: number;
    maxHealth: number;
  };
  targetPosition?: HexPosition;
}

export interface SpellExecutionContext {
  spell: SpellDefinition;
  caster: {
    id: string;
    name: string;
    position: HexPosition;
    currentAP: number;
    maxAP: number;
    currentMana: number;
    maxMana: number;
  };
  target?: {
    id: string;
    name: string;
    position: HexPosition;
    health: number;
    maxHealth: number;
  };
  targetPosition?: HexPosition;
}

export interface ActionResult {
  success: boolean;
  errors?: string[];
  apCost: number;
  manaCost?: number;
  effects: ActionEffect[];
  cooldownTurns: number;
  narrative: string;
}

export interface ActionEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'movement' | 'special';
  targetId?: string;
  targetPosition?: HexPosition;
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
  canUse: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if on cooldown
  if (cooldown > 0) {
    errors.push(`Power is on cooldown for ${cooldown} more turn(s)`);
  }

  // Check AP cost
  const apCost = calculatePowerAPCost(context.power);
  if (context.caster.currentAP < apCost) {
    errors.push(`Insufficient AP: need ${apCost}, have ${context.caster.currentAP}`);
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
    canUse: errors.length === 0,
    errors
  };
}

/**
 * Validate if a spell can be cast
 */
export function validateSpellCast(context: SpellExecutionContext, cooldown: number): {
  canCast: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if on cooldown
  if (cooldown > 0) {
    errors.push(`Spell is on cooldown for ${cooldown} more turn(s)`);
  }

  // Check AP cost (spells also use AP based on rank)
  const apCost = calculateSpellAPCost(context.spell);
  if (context.caster.currentAP < apCost) {
    errors.push(`Insufficient AP: need ${apCost}, have ${context.caster.currentAP}`);
  }

  // Check mana cost
  if (context.caster.currentMana < context.spell.mana_cost) {
    errors.push(`Insufficient mana: need ${context.spell.mana_cost}, have ${context.caster.currentMana}`);
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
    canCast: errors.length === 0,
    errors
  };
}

/**
 * Execute a power and return the results
 */
export function executePower(context: PowerExecutionContext, cooldown: number): ActionResult {
  const validation = validatePowerUsage(context, cooldown);

  if (!validation.canUse) {
    return {
      success: false,
      errors: validation.errors,
      apCost: 0,
      effects: [],
      cooldownTurns: 0,
      narrative: `${context.caster.name} cannot use ${context.power.name}`
    };
  }

  const apCost = calculatePowerAPCost(context.power);
  const effects: ActionEffect[] = [];
  let narrative = '';

  // Process power effects
  if (context.power.effects && Array.isArray(context.power.effects)) {
    for (const effect of context.power.effects) {
      const processedEffect = processEffect(effect, context, context.power.current_rank);
      effects.push(processedEffect);
    }
  }

  // Generate narrative
  if (context.target) {
    narrative = `${context.caster.name} uses ${context.power.name} on ${context.target.name}!`;
  } else {
    narrative = `${context.caster.name} activates ${context.power.name}!`;
  }

  return {
    success: true,
    apCost,
    effects,
    cooldownTurns: context.power.cooldown,
    narrative
  };
}

/**
 * Execute a spell and return the results
 */
export function executeSpell(context: SpellExecutionContext, cooldown: number): ActionResult {
  const validation = validateSpellCast(context, cooldown);

  if (!validation.canCast) {
    return {
      success: false,
      errors: validation.errors,
      apCost: 0,
      manaCost: 0,
      effects: [],
      cooldownTurns: 0,
      narrative: `${context.caster.name} cannot cast ${context.spell.name}`
    };
  }

  const apCost = calculateSpellAPCost(context.spell);
  const manaCost = context.spell.mana_cost;
  const effects: ActionEffect[] = [];
  let narrative = '';

  // Process spell effects
  if (context.spell.effects && Array.isArray(context.spell.effects)) {
    for (const effect of context.spell.effects) {
      const processedEffect = processEffect(effect, context, context.spell.current_rank);
      effects.push(processedEffect);
    }
  }

  // Generate narrative
  if (context.target) {
    narrative = `${context.caster.name} casts ${context.spell.name} on ${context.target.name}!`;
  } else {
    narrative = `${context.caster.name} casts ${context.spell.name}!`;
  }

  return {
    success: true,
    apCost,
    manaCost,
    effects,
    cooldownTurns: context.spell.cooldown_turns,
    narrative
  };
}

/**
 * Process a single effect from power/spell definition
 */
function processEffect(
  effectDef: any,
  context: PowerExecutionContext | SpellExecutionContext,
  rank: number
): ActionEffect {
  const baseValue = effectDef.value || 0;
  // Scale value with rank (rank 1 = 1x, rank 2 = 1.5x, rank 3 = 2x)
  const rankMultiplier = 0.5 + (rank * 0.5);
  const scaledValue = Math.round(baseValue * rankMultiplier);

  return {
    type: effectDef.type || 'special',
    targetId: context.target?.id,
    targetPosition: context.targetPosition,
    value: scaledValue,
    description: effectDef.description || `${effectDef.type} effect`
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
  battleState: any
): {
  healthChanges: Map<string, number>;
  statusEffects: Array<{ targetId: string; effect: any }>;
} {
  const healthChanges = new Map<string, number>();
  const statusEffects: Array<{ targetId: string; effect: any }> = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'damage':
        if (effect.targetId) {
          const currentChange = healthChanges.get(effect.targetId) || 0;
          healthChanges.set(effect.targetId, currentChange - effect.value);
        }
        break;

      case 'heal':
        if (effect.targetId) {
          const currentChange = healthChanges.get(effect.targetId) || 0;
          healthChanges.set(effect.targetId, currentChange + effect.value);
        }
        break;

      case 'buff':
      case 'debuff':
        if (effect.targetId) {
          statusEffects.push({
            targetId: effect.targetId,
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

  return { healthChanges, statusEffects };
}
