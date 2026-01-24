// Equipment Battle Integration
// Makes equipment effects work in the battle system

import { EquippedCharacter, EquipmentEffect } from './characterEquipment';

export interface EquipmentTriggerContext {
  turn: number;
  phase: 'start' | 'action' | 'end';
  attacker?: EquippedCharacter;
  defender?: EquippedCharacter;
  damage?: number;
  is_critical?: boolean;
  is_hit?: boolean;
}

export interface EquipmentBattleEffect {
  character_id: string;
  effect_id: string;
  name: string;
  description: string;
  value: number;
  applied: boolean;
  remaining?: number;
}

export class EquipmentBattleManager {
  private activeEffects: Map<string, EquipmentBattleEffect[]> = new Map();
  
  // Process equipment effects at battle start
  processBattleStartEffects(characters: EquippedCharacter[]): EquipmentBattleEffect[] {
    const battleEffects: EquipmentBattleEffect[] = [];
    
    characters.forEach(character => {
      character.active_effects.forEach(effect => {
        if (this.shouldTriggerEffect(effect, { phase: 'start', turn: 1 })) {
          const battleEffect = this.createBattleEffect(character.id, effect);
          battleEffects.push(battleEffect);
          this.addActiveEffect(character.id, battleEffect);
        }
      });
    });
    
    return battleEffects;
  }
  
  // Process equipment effects on hit
  processOnHitEffects(
    attacker: EquippedCharacter, 
    defender: EquippedCharacter, 
    context: EquipmentTriggerContext
  ): EquipmentBattleEffect[] {
    const battleEffects: EquipmentBattleEffect[] = [];
    
    // Process attacker's on-hit effects
    attacker.active_effects.forEach(effect => {
      if (this.shouldTriggerEffect(effect, { ...context, phase: 'action' })) {
        const battleEffect = this.createBattleEffect(attacker.id, effect);
        battleEffects.push(battleEffect);
        this.addActiveEffect(attacker.id, battleEffect);
      }
    });
    
    return battleEffects;
  }
  
  // Process equipment effects on critical hit
  processOnCritEffects(
    attacker: EquippedCharacter, 
    defender: EquippedCharacter, 
    context: EquipmentTriggerContext
  ): EquipmentBattleEffect[] {
    const battleEffects: EquipmentBattleEffect[] = [];
    
    if (!context.is_critical) return battleEffects;
    
    attacker.active_effects.forEach(effect => {
      if (this.shouldTriggerEffect(effect, { ...context, phase: 'action' })) {
        const battleEffect = this.createBattleEffect(attacker.id, effect);
        battleEffects.push(battleEffect);
        this.addActiveEffect(attacker.id, battleEffect);
      }
    });
    
    return battleEffects;
  }
  
  // Calculate damage modifiers from equipment
  calculateDamageModifiers(
    attacker: EquippedCharacter, 
    defender: EquippedCharacter, 
    base_damage: number,
    context: EquipmentTriggerContext
  ): {
    final_damage: number;
    modifiers: string[];
  } {
    let finalDamage = base_damage;
    const modifiers: string[] = [];
    
    // Apply attacker's weapon effects
    if (attacker.equipped_items.weapon) {
      attacker.equipped_items.weapon.effects.forEach(effect => {
        switch (effect.id) {
          case 'trojan_might':
            if (defender.archetype === 'warrior' || defender.archetype === 'tank') {
              finalDamage *= 1.2;
              modifiers.push(`+20% vs defenders (${effect.name})`);
            }
            break;
          case 'divine_charge':
            if (context.turn === 1) {
              finalDamage *= 1.5;
              modifiers.push(`+50% first attack (${effect.name})`);
            }
            break;
          case 'flame_strike':
            if (Math.random() < 0.2) {
              finalDamage += 10;
              modifiers.push(`+10 burn damage (${effect.name})`);
            }
            break;
          case 'surprise_strike':
            if (context.turn === 1) {
              finalDamage *= 2;
              modifiers.push(`Guaranteed critical (${effect.name})`);
            }
            break;
          case 'dual_wield':
            // Handle in separate attack
            modifiers.push(`Can attack twice (${effect.name})`);
            break;
        }
      });
    }
    
    // Apply defender's armor effects
    if (defender.equipped_items.armor) {
      defender.equipped_items.armor.effects.forEach(effect => {
        switch (effect.id) {
          case 'armor_mastery':
            finalDamage = Math.max(1, finalDamage - 3);
            modifiers.push(`-3 damage reduction (${effect.name})`);
            break;
          case 'divine_protection':
            if (Math.random() < 0.15) {
              finalDamage = 0;
              modifiers.push(`Damage negated (${effect.name})`);
            }
            break;
        }
      });
    }
    
    return { final_damage: Math.round(finalDamage), modifiers };
  }
  
  // Calculate accuracy modifiers
  calculateAccuracyModifiers(
    attacker: EquippedCharacter, 
    defender: EquippedCharacter
  ): {
    final_accuracy: number;
    modifiers: string[];
  } {
    let accuracy = attacker.final_stats.accuracy;
    const modifiers: string[] = [];
    
    // Apply weapon accuracy bonuses
    if (attacker.equipped_items.weapon) {
      const weaponAccuracy = attacker.equipped_items.weapon.stats.accuracy || 0;
      accuracy += weaponAccuracy;
      if (weaponAccuracy > 0) {
        modifiers.push(`+${weaponAccuracy} weapon accuracy`);
      }
    }
    
    // Apply special effects
    attacker.active_effects.forEach(effect => {
      switch (effect.id) {
        case 'deductive_aim':
          // Increases over time - would need battle history
          break;
        case 'targeting_system':
          // Increases on misses - would need battle history  
          break;
      }
    });
    
    return { final_accuracy: accuracy, modifiers };
  }
  
  // Calculate critical hit chance
  calculateCriticalChance(attacker: EquippedCharacter): {
    final_crit_chance: number;
    modifiers: string[];
  } {
    let critChance = attacker.final_stats.critical_chance;
    const modifiers: string[] = [];
    
    // Apply weapon crit bonuses
    if (attacker.equipped_items.weapon) {
      const weaponCrit = attacker.equipped_items.weapon.stats.crit_rate;
      if (weaponCrit) {
        critChance += weaponCrit;
        modifiers.push(`+${weaponCrit}% weapon critical`);
      }
    }
    
    return { final_crit_chance: critChance, modifiers };
  }
  
  // Update active effects each turn
  updateEffects(character_id: string): void {
    const effects = this.activeEffects.get(character_id) || [];
    
    effects.forEach(effect => {
      if (effect.remaining !== undefined) {
        effect.remaining -= 1;
        if (effect.remaining <= 0) {
          this.removeActiveEffect(character_id, effect.effect_id);
        }
      }
    });
  }
  
  // Helper methods
  private shouldTriggerEffect(effect: EquipmentEffect, context: EquipmentTriggerContext): boolean {
    // Check if this equipment effect should trigger based on context
    const weaponEffect = effect.source; // equipment id
    
    // Map equipment effects to battle triggers
    const triggerMap: Record<string, (ctx: EquipmentTriggerContext) => boolean> = {
      'battle_start': (ctx) => ctx.phase === 'start' && ctx.turn === 1,
      'on_hit': (ctx) => ctx.phase === 'action' && ctx.is_hit === true,
      'on_crit': (ctx) => ctx.phase === 'action' && ctx.is_critical === true,
      'turn_start': (ctx) => ctx.phase === 'start',
      'low_hp': (ctx) => false // Would need health percentage
    };
    
    return triggerMap[effect.type] ? triggerMap[effect.type](context) : false;
  }
  
  private createBattleEffect(character_id: string, effect: EquipmentEffect): EquipmentBattleEffect {
    return {
      character_id,
      effect_id: effect.id,
      name: effect.name,
      description: effect.description,
      value: effect.value,
      applied: false,
      remaining: effect.duration
    };
  }
  
  private addActiveEffect(character_id: string, effect: EquipmentBattleEffect): void {
    const effects = this.activeEffects.get(character_id) || [];
    effects.push(effect);
    this.activeEffects.set(character_id, effects);
  }
  
  private removeActiveEffect(character_id: string, effect_id: string): void {
    const effects = this.activeEffects.get(character_id) || [];
    const filtered = effects.filter(e => e.effect_id !== effect_id);
    this.activeEffects.set(character_id, filtered);
  }
  
  public getActiveEffects(character_id: string): EquipmentBattleEffect[] {
    return this.activeEffects.get(character_id) || [];
  }
  
  public clearAllEffects(): void {
    this.activeEffects.clear();
  }
}

// Helper functions for battle integration
export function applyEquipmentEffectsToDamage(
  attacker: EquippedCharacter,
  defender: EquippedCharacter,
  base_damage: number,
  battle_manager: EquipmentBattleManager,
  context: EquipmentTriggerContext
): number {
  const result = battle_manager.calculateDamageModifiers(attacker, defender, base_damage, context);
  return result.final_damage;
}

export function checkForEquipmentTriggeredEffects(
  character: EquippedCharacter,
  battle_manager: EquipmentBattleManager,
  context: EquipmentTriggerContext
): EquipmentBattleEffect[] {
  const effects: EquipmentBattleEffect[] = [];
  
  if (context.is_hit) {
    effects.push(...battle_manager.processOnHitEffects(character, context.defender!, context));
  }
  
  if (context.is_critical) {
    effects.push(...battle_manager.processOnCritEffects(character, context.defender!, context));
  }
  
  return effects;
}

export function createBattleEquipmentSummary(character: EquippedCharacter): {
  weapon: string;
  effects: string[];
  stat_bonuses: string[];
} {
  const weapon = character.equipped_items.weapon?.name || 'None';
  const effects = character.active_effects.map(e => e.name);
  const stat_bonuses: string[] = [];
  
  if (character.equipment_bonuses.atk) {
    stat_bonuses.push(`+${character.equipment_bonuses.atk} Attack`);
  }
  if (character.equipment_bonuses.def) {
    stat_bonuses.push(`+${character.equipment_bonuses.def} Defense`);
  }
  if (character.equipment_bonuses.spd) {
    stat_bonuses.push(`+${character.equipment_bonuses.spd} Speed`);
  }
  if (character.equipment_bonuses.crit_rate) {
    stat_bonuses.push(`+${character.equipment_bonuses.crit_rate}% Crit`);
  }
  
  return { weapon, effects, stat_bonuses };
}