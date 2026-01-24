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
  battle_state: BattleState,
  character_id: string,
  plan: PlannedAction
): BattleState {
  const newPlans = new Map(battle_state.characterPlans);
  newPlans.set(character_id, plan);

  return {
    ...battle_state,
    characterPlans: newPlans
  };
}

/**
 * Get a character's plan from battle state
 */
export function getCharacterPlan(
  battle_state: BattleState,
  character_id: string
): PlannedAction | null {
  return battle_state.characterPlans.get(character_id) || null;
}

/**
 * Check if all player characters have plans set
 */
export function allPlayerPlansSet(battle_state: BattleState): boolean {
  const playerCharacters = battle_state.teams.player.characters;
  return playerCharacters.every(char =>
    battle_state.characterPlans.has(char.character.id)
  );
}

/**
 * Get count of plans set for player team
 */
export function getPlayerPlansCount(battle_state: BattleState): number {
  const playerCharacters = battle_state.teams.player.characters;
  return playerCharacters.filter(char =>
    battle_state.characterPlans.has(char.character.id)
  ).length;
}

/**
 * Clear all character plans (for new battle or reset)
 */
export function clearAllPlans(battle_state: BattleState): BattleState {
  return {
    ...battle_state,
    characterPlans: new Map<string, PlannedAction>()
  };
}

/**
 * Decrement all cooldowns for a character at start of round
 */
export function decrementCooldowns(battle_state: BattleState): BattleState {
  const updatedPlayerCharacters = battle_state.teams.player.characters.map(char => {
    // Decrement power cooldowns
    const newPowerCooldowns = new Map(char.power_cooldowns);
    for (const [powerId, turns] of newPowerCooldowns.entries()) {
      if (turns > 0) {
        newPowerCooldowns.set(powerId, turns - 1);
      }
    }

    // Decrement spell cooldowns
    const newSpellCooldowns = new Map(char.spell_cooldowns);
    for (const [spellId, turns] of newSpellCooldowns.entries()) {
      if (turns > 0) {
        newSpellCooldowns.set(spellId, turns - 1);
      }
    }

    return {
      ...char,
      power_cooldowns: newPowerCooldowns,
      spell_cooldowns: newSpellCooldowns
    };
  });

  const updatedOpponentCharacters = battle_state.teams.opponent.characters.map(char => {
    // Same for opponent team
    const newPowerCooldowns = new Map(char.power_cooldowns);
    for (const [powerId, turns] of newPowerCooldowns.entries()) {
      if (turns > 0) {
        newPowerCooldowns.set(powerId, turns - 1);
      }
    }

    const newSpellCooldowns = new Map(char.spell_cooldowns);
    for (const [spellId, turns] of newSpellCooldowns.entries()) {
      if (turns > 0) {
        newSpellCooldowns.set(spellId, turns - 1);
      }
    }

    return {
      ...char,
      power_cooldowns: newPowerCooldowns,
      spell_cooldowns: newSpellCooldowns
    };
  });

  return {
    ...battle_state,
    teams: {
      player: {
        ...battle_state.teams.player,
        characters: updatedPlayerCharacters
      },
      opponent: {
        ...battle_state.teams.opponent,
        characters: updatedOpponentCharacters
      }
    }
  };
}

/**
 * Set a cooldown for a specific power
 */
export function setPowerCooldown(
  battle_state: BattleState,
  character_id: string,
  power_id: string,
  cooldown_turns: number
): BattleState {
  // Find character in player or opponent team
  const isPlayerTeam = battle_state.teams.player.characters.some(
    c => c.character.id === character_id
  );

  if (isPlayerTeam) {
    const updatedCharacters = battle_state.teams.player.characters.map(char => {
      if (char.character.id === character_id) {
        const newCooldowns = new Map(char.power_cooldowns);
        newCooldowns.set(power_id, cooldown_turns);
        return { ...char, power_cooldowns: newCooldowns };
      }
      return char;
    });

    return {
      ...battle_state,
      teams: {
        ...battle_state.teams,
        player: {
          ...battle_state.teams.player,
          characters: updatedCharacters
        }
      }
    };
  } else {
    const updatedCharacters = battle_state.teams.opponent.characters.map(char => {
      if (char.character.id === character_id) {
        const newCooldowns = new Map(char.power_cooldowns);
        newCooldowns.set(power_id, cooldown_turns);
        return { ...char, power_cooldowns: newCooldowns };
      }
      return char;
    });

    return {
      ...battle_state,
      teams: {
        ...battle_state.teams,
        opponent: {
          ...battle_state.teams.opponent,
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
  battle_state: BattleState,
  character_id: string,
  spell_id: string,
  cooldown_turns: number
): BattleState {
  // Find character in player or opponent team
  const isPlayerTeam = battle_state.teams.player.characters.some(
    c => c.character.id === character_id
  );

  if (isPlayerTeam) {
    const updatedCharacters = battle_state.teams.player.characters.map(char => {
      if (char.character.id === character_id) {
        const newCooldowns = new Map(char.spell_cooldowns);
        newCooldowns.set(spell_id, cooldown_turns);
        return { ...char, spell_cooldowns: newCooldowns };
      }
      return char;
    });

    return {
      ...battle_state,
      teams: {
        ...battle_state.teams,
        player: {
          ...battle_state.teams.player,
          characters: updatedCharacters
        }
      }
    };
  } else {
    const updatedCharacters = battle_state.teams.opponent.characters.map(char => {
      if (char.character.id === character_id) {
        const newCooldowns = new Map(char.spell_cooldowns);
        newCooldowns.set(spell_id, cooldown_turns);
        return { ...char, spell_cooldowns: newCooldowns };
      }
      return char;
    });

    return {
      ...battle_state,
      teams: {
        ...battle_state.teams,
        opponent: {
          ...battle_state.teams.opponent,
          characters: updatedCharacters
        }
      }
    };
  }
}
