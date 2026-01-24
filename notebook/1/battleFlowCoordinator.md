// Battle Flow Coordinator
// Wires together all the adherence system components into the actual battle flow

import { type BattleState, type BattleCharacter } from '@/data/battleFlow';
import { type PlannedAction } from '@/components/battle/CharacterActionPlanner';
import { executeTurn, type TurnExecutionResult } from './turnExecutionCoordinator';
import {
  setCharacterPlan,
  getCharacterPlan,
  decrementCooldowns,
  setPowerCooldown,
  setSpellCooldown
} from './battlePlanManager';

/**
 * Execute a complete round of battle (all characters take turns)
 */
export function executeRound(
  battleState: BattleState
): {
  updatedBattleState: BattleState;
  turnResults: TurnExecutionResult[];
  roundSummary: string;
} {
  const turnResults: TurnExecutionResult[] = [];
  let currentState = battleState;

  // Determine turn order based on character speed
  const turnOrder = calculateTurnOrder(currentState);

  // Execute each character's turn
  for (const { characterId, team } of turnOrder) {
    const character = findCharacter(currentState, characterId);
    if (!character || character.currentHealth <= 0) continue;

    const plan = getCharacterPlan(currentState, characterId);

    // Execute turn with adherence system
    const battleContext = {
      teamWinning: team === 'player'
        ? currentState.teams.player.currentMorale > currentState.teams.opponent.currentMorale
        : currentState.teams.opponent.currentMorale > currentState.teams.player.currentMorale,
      teammatesAlive: getTeammatesAliveCount(currentState, team),
      teammatesTotal: team === 'player' ? currentState.teams.player.characters.length : currentState.teams.opponent.characters.length,
      roundNumber: currentState.currentRound
    };

    const turnResult = executeTurn(character, plan, currentState, battleContext);
    turnResults.push(turnResult);

    // Apply turn results to state
    currentState = applyTurnResults(currentState, turnResult);
  }

  // Decrement cooldowns at end of round
  currentState = decrementCooldowns(currentState);

  // Increment round number
  currentState = {
    ...currentState,
    currentRound: currentState.currentRound + 1
  };

  const roundSummary = generateRoundSummary(turnResults);

  return {
    updatedBattleState: currentState,
    turnResults,
    roundSummary
  };
}

/**
 * Calculate turn order based on speed
 */
function calculateTurnOrder(battleState: BattleState): Array<{ characterId: string; team: 'player' | 'opponent' }> {
  const allCharacters = [
    ...battleState.teams.player.characters.map(c => ({
      id: c.character.id,
      speed: c.character.speed,
      team: 'player' as const
    })),
    ...battleState.teams.opponent.characters.map(c => ({
      id: c.character.id,
      speed: c.character.speed,
      team: 'opponent' as const
    }))
  ];

  return allCharacters
    .filter(c => {
      const char = findCharacter(battleState, c.id);
      return char && char.currentHealth > 0;
    })
    .sort((a, b) => b.speed - a.speed)
    .map(c => ({ characterId: c.id, team: c.team }));
}

/**
 * Find a character in battle state
 */
function findCharacter(battleState: BattleState, characterId: string): BattleCharacter | null {
  const playerChar = battleState.teams.player.characters.find(c => c.character.id === characterId);
  if (playerChar) return playerChar;

  const opponentChar = battleState.teams.opponent.characters.find(c => c.character.id === characterId);
  return opponentChar || null;
}

/**
 * Get count of alive teammates
 */
function getTeammatesAliveCount(battleState: BattleState, team: 'player' | 'opponent'): number {
  const teamChars = team === 'player'
    ? battleState.teams.player.characters
    : battleState.teams.opponent.characters;

  return teamChars.filter(c => c.currentHealth > 0).length;
}

/**
 * Apply turn results to battle state
 */
function applyTurnResults(
  battleState: BattleState,
  turnResult: TurnExecutionResult
): BattleState {
  let updatedState = { ...battleState };

  // Find the actor and target
  const actor = findCharacter(updatedState, turnResult.characterId);
  const targetId = turnResult.actualAction.targetId;
  const target = targetId ? findCharacter(updatedState, targetId) : null;

  // Apply action effects (damage, healing, etc.)
  if (turnResult.actualAction.type === 'move') {
    // Update character position on hex grid
    // TODO: Implement hex grid position tracking
  } else if (turnResult.actualAction.type === 'attack' || turnResult.actualAction.type === 'power' || turnResult.actualAction.type === 'spell') {
    if (actor) {
      // Get ability definition to check for special effects
      let ability: any = null;
      if (turnResult.actualAction.type === 'power' && turnResult.actualAction.abilityId) {
        ability = actor.unlockedPowers.find(p => p.id === turnResult.actualAction.abilityId);
      } else if (turnResult.actualAction.type === 'spell' && turnResult.actualAction.abilityId) {
        ability = actor.unlockedSpells.find(s => s.id === turnResult.actualAction.abilityId);
      }

      // Check for AOE effects
      const aoeEffect = ability?.effects?.find((e: any) => e.type === 'aoe' || e.target === 'all_enemies' || e.target === 'all_allies');
      const healingEffect = ability?.effects?.find((e: any) => e.type === 'heal' || e.type === 'healing');

      if (aoeEffect) {
        // Apply to all valid targets
        const targets = getAOETargets(updatedState, actor, aoeEffect, turnResult.characterId);
        for (const aoeTarget of targets) {
          if (healingEffect) {
            // AOE healing
            updatedState = applyHealingToCharacter(updatedState, aoeTarget.character.id, healingEffect.value || 0);
          } else {
            // AOE damage
            const damageResult = calculateDamage(actor, aoeTarget, turnResult.actualAction);
            if (!damageResult.dodged) {
              updatedState = applyDamageToCharacter(updatedState, aoeTarget.character.id, damageResult.damage);
              if (damageResult.isCrit) {
                updatedState = incrementCritHits(updatedState, turnResult.characterId);
              }
            }
          }
        }
      } else if (healingEffect) {
        // Single target healing
        if (targetId) {
          updatedState = applyHealingToCharacter(updatedState, targetId, healingEffect.value || 0);
        }
      } else if (targetId && target) {
        // Single target damage
        const damageResult = calculateDamage(actor, target, turnResult.actualAction);

        if (!damageResult.dodged) {
          updatedState = applyDamageToCharacter(updatedState, targetId, damageResult.damage);

          // Track crits in battle performance
          if (damageResult.isCrit) {
            updatedState = incrementCritHits(updatedState, turnResult.characterId);
          }
        }
      }

      // Apply status effects
      const statusEffects = ability?.effects?.filter((e: any) =>
        e.type === 'status' || e.type === 'buff' || e.type === 'debuff' || e.type === 'stun'
      );
      if (statusEffects && statusEffects.length > 0) {
        for (const statusEffect of statusEffects) {
          // Determine targets for status effect
          const statusTargets = statusEffect.target === 'self' ? [actor] :
                               statusEffect.target === 'all_enemies' ? getAllEnemies(updatedState, turnResult.characterId) :
                               statusEffect.target === 'all_allies' ? getAllAllies(updatedState, turnResult.characterId) :
                               target ? [target] : [];

          for (const statusTarget of statusTargets) {
            updatedState = applyStatusEffect(updatedState, statusTarget.character.id, statusEffect);
          }
        }
      }

      // Deduct mana if spell
      if (turnResult.actualAction.type === 'spell' && turnResult.actualAction.abilityId) {
        const spell = actor.unlockedSpells.find(s => s.id === turnResult.actualAction.abilityId);
        if (spell) {
          updatedState = deductMana(updatedState, turnResult.characterId, spell.manaCost);
        }
      }
    }
  }

  // Set cooldowns for used abilities
  if (turnResult.actualAction.type === 'power' && turnResult.actualAction.abilityId && actor) {
    const power = actor.unlockedPowers.find(p => p.id === turnResult.actualAction.abilityId);
    if (power) {
      updatedState = setPowerCooldown(
        updatedState,
        turnResult.characterId,
        turnResult.actualAction.abilityId,
        power.cooldown
      );
    }
  } else if (turnResult.actualAction.type === 'spell' && turnResult.actualAction.abilityId && actor) {
    const spell = actor.unlockedSpells.find(s => s.id === turnResult.actualAction.abilityId);
    if (spell) {
      updatedState = setSpellCooldown(
        updatedState,
        turnResult.characterId,
        turnResult.actualAction.abilityId,
        spell.cooldown
      );
    }
  }

  return updatedState;
}

/**
 * Calculate damage for an action with crit chance, dodge, and all effects
 */
function calculateDamage(
  attacker: BattleCharacter,
  defender: BattleCharacter,
  action: { type: string; abilityId?: string; abilityType?: string }
): { damage: number; isCrit: boolean; dodged: boolean } {
  let baseDamage = 0;
  let critChance = attacker.character.critical_chance || 0;

  // Check for dodge/evasion first
  const dodgeChance = defender.character.evasion || 0;
  const dodgeRoll = Math.random() * 100;
  if (dodgeRoll < dodgeChance) {
    return { damage: 0, isCrit: false, dodged: true };
  }

  if (action.type === 'attack') {
    // Basic attack - use attack stat
    if (action.abilityType === 'power_attack') {
      baseDamage = attacker.character.attack * 1.5;
    } else {
      baseDamage = attacker.character.attack;
    }
  } else if (action.type === 'power' && action.abilityId) {
    // Power - read effects from power definition
    const power = attacker.unlockedPowers.find(p => p.id === action.abilityId);
    if (power && power.effects) {
      const damageEffect = power.effects.find((e: any) => e.type === 'damage');
      if (damageEffect) {
        baseDamage = damageEffect.value;
      }
      // Check for crit chance in power
      const critEffect = power.effects.find((e: any) => e.type === 'critChance');
      if (critEffect) {
        critChance += critEffect.value;
      }
    }
  } else if (action.type === 'spell' && action.abilityId) {
    // Spell - read effects from spell definition
    const spell = attacker.unlockedSpells.find(s => s.id === action.abilityId);
    if (spell && spell.effects) {
      const damageEffect = spell.effects.find((e: any) => e.type === 'damage');
      if (damageEffect) {
        baseDamage = damageEffect.value;
      }
      // Check for crit chance in spell
      const critEffect = spell.effects.find((e: any) => e.type === 'critChance');
      if (critEffect) {
        critChance += critEffect.value;
      }
    }
  }

  // Check for critical hit
  const critRoll = Math.random() * 100;
  const isCrit = critRoll < critChance;
  if (isCrit) {
    baseDamage *= 2; // Critical hits do 2x damage
  }

  // Apply defender's defense
  const defense = defender.character.defense;
  const finalDamage = Math.max(1, Math.floor(baseDamage - defense));

  return { damage: finalDamage, isCrit, dodged: false };
}

/**
 * Deduct mana from a character
 */
function deductMana(
  battleState: BattleState,
  characterId: string,
  manaCost: number
): BattleState {
  const isPlayerTeam = battleState.teams.player.characters.some(c => c.character.id === characterId);

  if (isPlayerTeam) {
    const updatedCharacters = battleState.teams.player.characters.map(char => {
      if (char.character.id === characterId) {
        return {
          ...char,
          currentMana: Math.max(0, char.currentMana - manaCost)
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        player: {
          ...battleState.teams.player,
          characters: updatedCharacters
        }
      }
    };
  } else {
    const updatedCharacters = battleState.teams.opponent.characters.map(char => {
      if (char.character.id === characterId) {
        return {
          ...char,
          currentMana: Math.max(0, char.currentMana - manaCost)
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        opponent: {
          ...battleState.teams.opponent,
          characters: updatedCharacters
        }
      }
    };
  }
}

/**
 * Apply damage to a character
 */
function applyDamageToCharacter(
  battleState: BattleState,
  characterId: string,
  damage: number
): BattleState {
  const isPlayerTeam = battleState.teams.player.characters.some(c => c.character.id === characterId);

  if (isPlayerTeam) {
    const updatedCharacters = battleState.teams.player.characters.map(char => {
      if (char.character.id === characterId) {
        return {
          ...char,
          currentHealth: Math.max(0, char.currentHealth - damage)
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        player: {
          ...battleState.teams.player,
          characters: updatedCharacters
        }
      }
    };
  } else {
    const updatedCharacters = battleState.teams.opponent.characters.map(char => {
      if (char.character.id === characterId) {
        return {
          ...char,
          currentHealth: Math.max(0, char.currentHealth - damage)
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        opponent: {
          ...battleState.teams.opponent,
          characters: updatedCharacters
        }
      }
    };
  }
}

/**
 * Get AOE targets based on effect definition
 */
function getAOETargets(
  battleState: BattleState,
  caster: BattleCharacter,
  aoeEffect: any,
  casterId: string
): BattleCharacter[] {
  if (aoeEffect.target === 'all_enemies') {
    return getAllEnemies(battleState, casterId);
  } else if (aoeEffect.target === 'all_allies') {
    return getAllAllies(battleState, casterId);
  }
  // Default to all enemies
  return getAllEnemies(battleState, casterId);
}

/**
 * Get all enemy characters
 */
function getAllEnemies(battleState: BattleState, characterId: string): BattleCharacter[] {
  const isPlayerTeam = battleState.teams.player.characters.some(c => c.character.id === characterId);

  if (isPlayerTeam) {
    return battleState.teams.opponent.characters.filter(c => c.currentHealth > 0);
  } else {
    return battleState.teams.player.characters.filter(c => c.currentHealth > 0);
  }
}

/**
 * Get all ally characters (including self)
 */
function getAllAllies(battleState: BattleState, characterId: string): BattleCharacter[] {
  const isPlayerTeam = battleState.teams.player.characters.some(c => c.character.id === characterId);

  if (isPlayerTeam) {
    return battleState.teams.player.characters.filter(c => c.currentHealth > 0);
  } else {
    return battleState.teams.opponent.characters.filter(c => c.currentHealth > 0);
  }
}

/**
 * Apply healing to a character
 */
function applyHealingToCharacter(
  battleState: BattleState,
  characterId: string,
  healAmount: number
): BattleState {
  const isPlayerTeam = battleState.teams.player.characters.some(c => c.character.id === characterId);

  if (isPlayerTeam) {
    const updatedCharacters = battleState.teams.player.characters.map(char => {
      if (char.character.id === characterId) {
        const maxHealth = char.character.health;
        return {
          ...char,
          currentHealth: Math.min(maxHealth, char.currentHealth + healAmount)
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        player: {
          ...battleState.teams.player,
          characters: updatedCharacters
        }
      }
    };
  } else {
    const updatedCharacters = battleState.teams.opponent.characters.map(char => {
      if (char.character.id === characterId) {
        const maxHealth = char.character.health;
        return {
          ...char,
          currentHealth: Math.min(maxHealth, char.currentHealth + healAmount)
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        opponent: {
          ...battleState.teams.opponent,
          characters: updatedCharacters
        }
      }
    };
  }
}

/**
 * Apply status effect to a character
 */
function applyStatusEffect(
  battleState: BattleState,
  characterId: string,
  statusEffect: any
): BattleState {
  const isPlayerTeam = battleState.teams.player.characters.some(c => c.character.id === characterId);

  const newStatusEffect = {
    id: `${statusEffect.statusEffect || statusEffect.type}_${Date.now()}`,
    name: statusEffect.statusEffect || statusEffect.type,
    type: statusEffect.type === 'buff' ? 'buff' : statusEffect.type === 'debuff' ? 'debuff' : 'neutral',
    description: `${statusEffect.statusEffect || statusEffect.type} effect`,
    value: statusEffect.value || 0,
    duration: statusEffect.duration || 1,
    stackable: false
  };

  if (isPlayerTeam) {
    const updatedCharacters = battleState.teams.player.characters.map(char => {
      if (char.character.id === characterId) {
        return {
          ...char,
          statusEffects: [...(char.statusEffects || []), newStatusEffect]
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        player: {
          ...battleState.teams.player,
          characters: updatedCharacters
        }
      }
    };
  } else {
    const updatedCharacters = battleState.teams.opponent.characters.map(char => {
      if (char.character.id === characterId) {
        return {
          ...char,
          statusEffects: [...(char.statusEffects || []), newStatusEffect]
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        opponent: {
          ...battleState.teams.opponent,
          characters: updatedCharacters
        }
      }
    };
  }
}

/**
 * Increment crit hits counter for battle performance
 */
function incrementCritHits(battleState: BattleState, characterId: string): BattleState {
  const isPlayerTeam = battleState.teams.player.characters.some(c => c.character.id === characterId);

  if (isPlayerTeam) {
    const updatedCharacters = battleState.teams.player.characters.map(char => {
      if (char.character.id === characterId) {
        return {
          ...char,
          battlePerformance: {
            ...char.battlePerformance,
            damageDealt: (char.battlePerformance?.damageDealt || 0) + 1
          }
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        player: {
          ...battleState.teams.player,
          characters: updatedCharacters
        }
      }
    };
  } else {
    const updatedCharacters = battleState.teams.opponent.characters.map(char => {
      if (char.character.id === characterId) {
        return {
          ...char,
          battlePerformance: {
            ...char.battlePerformance,
            damageDealt: (char.battlePerformance?.damageDealt || 0) + 1
          }
        };
      }
      return char;
    });

    return {
      ...battleState,
      teams: {
        ...battleState.teams,
        opponent: {
          ...battleState.teams.opponent,
          characters: updatedCharacters
        }
      }
    };
  }
}

/**
 * Generate human-readable round summary
 */
function generateRoundSummary(turnResults: TurnExecutionResult[]): string {
  const lines: string[] = [];

  turnResults.forEach(result => {
    const character = result.characterId;
    const actionSource = result.actionSource === 'plan_executed'
      ? '✓ Followed plan'
      : result.actionSource === 'plan_b_adaptation'
      ? '⚠ Plan B adaptation'
      : '✗ Rebellion';

    lines.push(`${character}: ${actionSource} - ${result.reasoning}`);
  });

  return lines.join('\n');
}

/**
 * Check if battle is over
 */
export function checkBattleEnd(battleState: BattleState): {
  isOver: boolean;
  winner: 'player' | 'opponent' | 'draw' | null;
} {
  const playerAlive = battleState.teams.player.characters.some(c => c.currentHealth > 0);
  const opponentAlive = battleState.teams.opponent.characters.some(c => c.currentHealth > 0);

  if (!playerAlive && !opponentAlive) {
    return { isOver: true, winner: 'draw' };
  } else if (!playerAlive) {
    return { isOver: true, winner: 'opponent' };
  } else if (!opponentAlive) {
    return { isOver: true, winner: 'player' };
  }

  return { isOver: false, winner: null };
}
