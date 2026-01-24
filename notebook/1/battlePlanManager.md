// Battle Plan Manager
// Helper functions for managing character plans in battle state

import { type BattleState } from '@/data/battleFlow';
import { type PlannedAction } from '@/components/battle/CharacterActionPlanner';

/**
 * Initialize character plans Map for battle state
 */
export function initializeCharacterPlans(): Map<string, PlannedAction> {
  return new Map<string, PlannedAction>();
}

/**
 * Set a character's plan in battle state
 */
export function setCharacterPlan(
  battleState: BattleState,
  characterId: string,
  plan: PlannedAction
): BattleState {
  const newPlans = new Map(battleState.characterPlans);
  newPlans.set(characterId, plan);

  return {
    ...battleState,
    characterPlans: newPlans
  };
}

/**
 * Get a character's plan from battle state
 */
export function getCharacterPlan(
  battleState: BattleState,
  characterId: string
): PlannedAction | null {
  return battleState.characterPlans.get(characterId) || null;
}

/**
 * Check if all player characters have plans set
 */
export function allPlayerPlansSet(battleState: BattleState): boolean {
  const playerCharacters = battleState.teams.player.characters;
  return playerCharacters.every(char =>
    battleState.characterPlans.has(char.character.id)
  );
}

/**
 * Get count of plans set for player team
 */
export function getPlayerPlansCount(battleState: BattleState): number {
  const playerCharacters = battleState.teams.player.characters;
  return playerCharacters.filter(char =>
    battleState.characterPlans.has(char.character.id)
  ).length;
}

/**
 * Clear all character plans (for new battle or reset)
 */
export function clearAllPlans(battleState: BattleState): BattleState {
  return {
    ...battleState,
    characterPlans: new Map<string, PlannedAction>()
  };
}

/**
 * Decrement all cooldowns for a character at start of round
 */
export function decrementCooldowns(battleState: BattleState): BattleState {
  const updatedPlayerCharacters = battleState.teams.player.characters.map(char => {
    // Decrement power cooldowns
    const newPowerCooldowns = new Map(char.powerCooldowns);
    for (const [powerId, turns] of newPowerCooldowns.entries()) {
      if (turns > 0) {
        newPowerCooldowns.set(powerId, turns - 1);
      }
    }

    // Decrement spell cooldowns
    const newSpellCooldowns = new Map(char.spellCooldowns);
    for (const [spellId, turns] of newSpellCooldowns.entries()) {
      if (turns > 0) {
        newSpellCooldowns.set(spellId, turns - 1);
      }
    }

    return {
      ...char,
      powerCooldowns: newPowerCooldowns,
      spellCooldowns: newSpellCooldowns
    };
  });

  const updatedOpponentCharacters = battleState.teams.opponent.characters.map(char => {
    // Same for opponent team
    const newPowerCooldowns = new Map(char.powerCooldowns);
    for (const [powerId, turns] of newPowerCooldowns.entries()) {
      if (turns > 0) {
        newPowerCooldowns.set(powerId, turns - 1);
      }
    }

    const newSpellCooldowns = new Map(char.spellCooldowns);
    for (const [spellId, turns] of newSpellCooldowns.entries()) {
      if (turns > 0) {
        newSpellCooldowns.set(spellId, turns - 1);
      }
    }

    return {
      ...char,
      powerCooldowns: newPowerCooldowns,
      spellCooldowns: newSpellCooldowns
    };
  });

  return {
    ...battleState,
    teams: {
      player: {
        ...battleState.teams.player,
        characters: updatedPlayerCharacters
      },
      opponent: {
        ...battleState.teams.opponent,
        characters: updatedOpponentCharacters
      }
    }
  };
}

/**
 * Set a cooldown for a specific power
 */
export function setPowerCooldown(
  battleState: BattleState,
  characterId: string,
  powerId: string,
  cooldownTurns: number
): BattleState {
  // Find character in player or opponent team
  const isPlayerTeam = battleState.teams.player.characters.some(
    c => c.character.id === characterId
  );

  if (isPlayerTeam) {
    const updatedCharacters = battleState.teams.player.characters.map(char => {
      if (char.character.id === characterId) {
        const newCooldowns = new Map(char.powerCooldowns);
        newCooldowns.set(powerId, cooldownTurns);
        return { ...char, powerCooldowns: newCooldowns };
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
        const newCooldowns = new Map(char.powerCooldowns);
        newCooldowns.set(powerId, cooldownTurns);
        return { ...char, powerCooldowns: newCooldowns };
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
 * Set a cooldown for a specific spell
 */
export function setSpellCooldown(
  battleState: BattleState,
  characterId: string,
  spellId: string,
  cooldownTurns: number
): BattleState {
  // Find character in player or opponent team
  const isPlayerTeam = battleState.teams.player.characters.some(
    c => c.character.id === characterId
  );

  if (isPlayerTeam) {
    const updatedCharacters = battleState.teams.player.characters.map(char => {
      if (char.character.id === characterId) {
        const newCooldowns = new Map(char.spellCooldowns);
        newCooldowns.set(spellId, cooldownTurns);
        return { ...char, spellCooldowns: newCooldowns };
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
        const newCooldowns = new Map(char.spellCooldowns);
        newCooldowns.set(spellId, cooldownTurns);
        return { ...char, spellCooldowns: newCooldowns };
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
