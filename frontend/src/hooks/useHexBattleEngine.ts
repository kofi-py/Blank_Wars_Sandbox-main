// Hex Battle Engine - Spatial tactical combat with psychology/adherence integration
// Replaces abstract combat logic with hex grid positioning

import { useCallback, useRef, useState } from 'react';
import { HexGridSystem, HexPosition, HexBattleGrid } from '@/systems/hexGridSystem';
import { HexLineOfSight } from '@/systems/hexLineOfSight';
import { HexMovementEngine, CharacterActionState, ACTION_COSTS, ExecutedAction } from '@/systems/hexMovementEngine';
import { TeamCharacter, Team } from '@/data/teamBattleSystem';
import { type BattleStateData } from '@/hooks/useBattleState';
import { judgePersonalities, type JudgeDecision } from '@/data/aiJudgeSystem';
import { AIJudge } from '@/data/aiJudge';

interface HexAction {
  type: 'move' | 'attack' | 'move_and_attack' | 'defend' | 'special';
  move_to_hex?: HexPosition;
  attack_target_id?: string;
  attack_target_hex?: HexPosition;
  ability_id?: string;
}

interface CoachPlannedAction {
  character_id: string;
  action: HexAction;
  reasoning: string;
}

interface UseHexBattleEngineProps {
  state: BattleStateData;
  actions: any;
  timeout_manager: {
    setTimeout: (cb: () => void, delay: number) => any;
    clearTimeout: (id: any) => void;
  };
  check_for_chaos: (attacker: TeamCharacter, defender: TeamCharacter, ability: any, is_player_team: boolean) => any;
  announce_battle_start: (team1: string, team2: string) => void;
  announce_round_start: (round: number) => void;
  announce_action: (action: string, delay?: number) => void;
  announce_victory: (team: string, is_flawless?: boolean) => void;
  announce_defeat: (team: string) => void;
  // CamelCase variants
  checkForChaos?: (attacker: TeamCharacter, defender: TeamCharacter, ability: any, is_player_team: boolean) => any;
  announceBattleStart?: (team1: string, team2: string) => void;
  announceRoundStart?: (round: number) => void;
  announceAction?: (action: string, delay?: number) => void;
  announceVictory?: (team: string, is_flawless?: boolean) => void;
  announceDefeat?: (team: string) => void;
}

export const useHexBattleEngine = ({
  state,
  actions,
  timeout_manager,
  checkForChaos,
  announceBattleStart,
  announceRoundStart,
  announceAction,
  announceVictory,
  announceDefeat
}: UseHexBattleEngineProps) => {
  const { setTimeout: safeSetTimeout } = timeout_manager;

  // Refs for stable closures
  const gridRef = useRef<HexBattleGrid | null>(null);
  const turnOrderRef = useRef<string[]>([]);
  const currentTurnIndexRef = useRef(0);

  // Initialize hex battle
  const startHexBattle = useCallback(() => {
    // Initialize hex grid
    const grid = HexGridSystem.initializeBattleGrid();

    // Place teams at starting positions
    const team1Positions = HexGridSystem.getTeam1StartPositions();
    const team2Positions = HexGridSystem.getTeam2StartPositions();

    state.player_team.characters.forEach((char, index) => {
      grid.character_positions.set(char.id, team1Positions[index]);
    });

    state.opponent_team.characters.forEach((char, index) => {
      grid.character_positions.set(char.id, team2Positions[index]);
    });

    // Initialize action states for all characters
    const actionStates = new Map<string, CharacterActionState>();
    [...state.player_team.characters, ...state.opponent_team.characters].forEach(char => {
      actionStates.set(char.id, HexMovementEngine.initializeActionState(char.id));
    });

    // Calculate turn order based on speed
    const allCharacters = [...state.player_team.characters, ...state.opponent_team.characters];
    const turnOrder = allCharacters
      .sort((a, b) => {
        const speedA = a.speed || 50;
        const speedB = b.speed || 50;
        return speedB - speedA; // Highest speed goes first
      })
      .map(char => char.id);

    // Store refs
    gridRef.current = grid;
    turnOrderRef.current = turnOrder;
    currentTurnIndexRef.current = 0;

    // Update state
    actions.setHexBattleMode(true);
    actions.setHexBattleGrid(grid);
    actions.setCharacterActionStates(actionStates);
    actions.setActiveCharacterId(turnOrder[0]);
    actions.set_phase('pre_battle_huddle');

    announceBattleStart(state.player_team.name, state.opponent_team.name);
    actions.set_current_announcement(
      `⚔️ HEX GRID BATTLE: ${state.player_team.name} vs ${state.opponent_team.name}!\n` +
      `🎯 Battlefield: 12x12 ColosSeaum Arena with Broadcast Tower\n` +
      `🦈 DANGER: Shark-infested perimeter!\n\n` +
      `Turn Order: ${turnOrder.map(id => {
        const char = allCharacters.find(c => c.id === id);
        return char?.name || 'Unknown';
      }).join(' → ')}`
    );

    // Proceed to first turn after huddle
    safeSetTimeout(() => {
      proceedToFirstRound();
    }, 5000);
  }, [state.player_team, state.opponent_team, actions, announceBattleStart, safeSetTimeout]);

  // Proceed to first round
  const proceedToFirstRound = useCallback(() => {
    actions.set_phase('coaching');
    actions.set_current_round(1);
    announceRoundStart(1);

    actions.set_current_announcement(
      `📋 Round 1 - Coaching Phase\n\n` +
      `Coaches: Plan your team's moves on the hex grid!\n` +
      `- Select character positions\n` +
      `- Choose attack targets\n` +
      `- Consider range and line of sight`
    );

    // Transition to combat after coaching phase
    safeSetTimeout(() => {
      executeRound();
    }, 10000);
  }, [actions, announceRoundStart, safeSetTimeout]);

  // Execute a full round of turns
  const executeRound = useCallback(() => {
    actions.set_phase('combat');

    const allCharacters = [...state.player_team.characters, ...state.opponent_team.characters];
    const activeCharId = turnOrderRef.current[currentTurnIndexRef.current];
    const activeChar = allCharacters.find(c => c.id === activeCharId);

    if (!activeChar) {
      console.error('Active character not found:', activeCharId);
      return;
    }

    actions.setActiveCharacterId(activeCharId);

    announceAction(`${activeChar.name}'s turn! (${activeChar.speed || 50} speed)`);

    // Execute character turn
    safeSetTimeout(() => {
      executeCharacterTurn(activeChar);
    }, 2000);
  }, [state.player_team, state.opponent_team, actions, announceAction, safeSetTimeout]);

  // Convert HexAction to Ability format for psychology system
  const hexActionToAbility = useCallback((hexAction: HexAction, character_abilities: any[]) => {
    // Create ability-like object for psychology system
    const ability = {
      name: hexAction.type === 'attack' ? 'Tactical Strike' : hexAction.type === 'move' ? 'Tactical Reposition' : 'Defensive Stance',
      type: hexAction.type === 'attack' || hexAction.type === 'move_and_attack' ? 'attack' as const :
            hexAction.type === 'defend' ? 'defense' as const : 'special' as const,
      power: hexAction.type === 'attack' || hexAction.type === 'move_and_attack' ? 50 : 0,
      cooldown: 0,
      description: `Hex grid action: ${hexAction.type}`
    };
    return ability;
  }, []);

  // Execute a single character's turn
  const executeCharacterTurn = useCallback((character: TeamCharacter) => {
    const grid = gridRef.current;
    if (!grid) return;

    const isPlayerTeam = state.player_team.characters.some(c => c.id === character.id);
    const characterPos = grid.character_positions.get(character.id);

    if (!characterPos) {
      console.error('Character position not found:', character.id);
      advanceToNextTurn();
      return;
    }

    // Get coach's planned action
    const coachAction = getCoachPlannedAction(character, grid, isPlayerTeam);

    // Get target character if attacking
    const targetChar = coachAction.action.attack_target_id
      ? [...state.player_team.characters, ...state.opponent_team.characters].find(
          c => c.id === coachAction.action.attack_target_id
        )
      : null;

    // Convert HexAction to Ability for psychology system
    const abilityForPsych = hexActionToAbility(coachAction.action, character.abilities);

    // Call psychology system's checkForChaos
    const adherenceResult = checkForChaos(
      character,
      targetChar || character, // Default to self if no target
      abilityForPsych,
      isPlayerTeam
    );

    // Check if character adhered or deviated
    // chaos_event: true means character deviated
    if (!adherenceResult?.chaos_event) {
      // Character followed the plan - execute coach's action
      executeCoachAction(character, coachAction, targetChar, isPlayerTeam);
    } else {
      // Character deviated - handle rogue action
      executeRogueAction(character, adherenceResult, isPlayerTeam);
    }

  }, [state.player_team, state.opponent_team, checkForChaos, hexActionToAbility]);

  // Get coach's planned action for a character
  const getCoachPlannedAction = useCallback((
    character: TeamCharacter,
    grid: HexBattleGrid,
    is_player_team: boolean
  ): CoachPlannedAction => {
    // TODO: In full implementation, this comes from coaching UI
    // For now, generate basic tactical AI

    const characterPos = grid.character_positions.get(character.id)!;
    const actionState = state.character_action_states.get(character.id);

    if (!actionState) {
      return {
        character_id: character.id,
        action: { type: 'defend' },
        reasoning: 'No AP available'
      };
    }

    // Find nearest enemy
    const enemies = is_player_team ? state.opponent_team.characters : state.player_team.characters;
    const visibleEnemies = HexLineOfSight.getVisibleCharacters(
      characterPos,
      5, // Attack range
      grid,
      [character.id]
    ).filter(visible =>
      enemies.some(e => e.id === visible.character_id)
    );

    if (visibleEnemies.length > 0 && actionState.can_attack) {
      // Attack nearest visible enemy
      const target = visibleEnemies[0];
      return {
        character_id: character.id,
        action: {
          type: 'attack',
          attack_target_id: target.character_id,
          attack_target_hex: target.position
        },
        reasoning: `Attack ${target.character_id} at range ${target.distance}`
      };
    } else if (actionState.can_move) {
      // Move toward nearest enemy
      const nearestEnemy = enemies[0];
      const enemyPos = grid.character_positions.get(nearestEnemy.id);

      if (enemyPos) {
        // Find reachable hex closest to enemy
        const reachableHexes = HexMovementEngine.getReachableHexes(
          character.id,
          characterPos,
          actionState.action_points_remaining,
          grid
        );

        const closestHex = reachableHexes.reduce((closest, hex) => {
          const distToEnemy = HexGridSystem.distance(hex, enemyPos);
          const closestDist = HexGridSystem.distance(closest, enemyPos);
          return distToEnemy < closestDist ? hex : closest;
        }, reachableHexes[0] || characterPos);

        return {
          character_id: character.id,
          action: {
            type: 'move',
            move_to_hex: closestHex
          },
          reasoning: `Move toward ${nearestEnemy.name}`
        };
      }
    }

    // Default: defend
    return {
      character_id: character.id,
      action: { type: 'defend' },
      reasoning: 'Defensive stance'
    };
  }, [state.character_action_states, state.player_team, state.opponent_team]);

  // Execute coach's planned action
  const executeCoachAction = useCallback((
    character: TeamCharacter,
    planned_action: CoachPlannedAction,
    target_char: TeamCharacter | null,
    is_player_team: boolean
  ) => {
    const grid = gridRef.current;
    if (!grid) return;

    const action = planned_action.action;
    const characterPos = grid.character_positions.get(character.id)!;
    const actionState = state.character_action_states.get(character.id)!;

    announceAction(`${character.name} follows the plan: ${planned_action.reasoning}`);

    if (action.type === 'move' || action.type === 'move_and_attack') {
      if (action.move_to_hex) {
        // Validate movement
        const validation = HexMovementEngine.canMoveTo(
          character.id,
          characterPos,
          action.move_to_hex,
          grid,
          actionState.action_points_remaining
        );

        if (validation.valid) {
          // Execute movement
          grid.character_positions.set(character.id, action.move_to_hex);

          const moveAction: ExecutedAction = {
            type: 'move',
            ap_cost: validation.ap_cost,
            target_hex: action.move_to_hex
          };

          const result = HexMovementEngine.executeAction(actionState, moveAction);
          if (result.success) {
            const newStates = new Map(state.character_action_states);
            newStates.set(character.id, result.new_state);
            actions.setCharacterActionStates(newStates);
            actions.setHexBattleGrid({ ...grid });
          }

          announceAction(`${character.name} moves to hex (${action.move_to_hex.q}, ${action.move_to_hex.r})`);
        }
      }
    }

    if ((action.type === 'attack' || action.type === 'move_and_attack') && target_char) {
      // Execute attack
      const damage = calculateHexBattleDamage(character, target_char, grid);
      const newHP = Math.max(0, target_char.current_health - damage);

      // Update target HP
      const allChars = [...state.player_team.characters, ...state.opponent_team.characters];
      const targetIndex = allChars.findIndex(c => c.id === target_char.id);
      if (targetIndex !== -1) {
        allChars[targetIndex] = { ...target_char, current_health: newHP };
      }

      announceAction(`${character.name} attacks ${target_char.name} for ${damage} damage!`);

      // Check if target is defeated
      if (newHP <= 0) {
        announceAction(`💀 ${target_char.name} has been defeated!`);
      }
    }

    // Advance to next turn
    safeSetTimeout(() => {
      advanceToNextTurn();
    }, 3000);
  }, [state.character_action_states, state.player_team, state.opponent_team, actions, announceAction, safeSetTimeout]);

  // Execute rogue action (character deviated)
  const executeRogueAction = useCallback((
    character: TeamCharacter,
    adherence_result: any,
    is_player_team: boolean
  ) => {
    announceAction(`⚠️ ${character.name} goes ROGUE! Psychology breakdown!`);

    // Judge rules on the rogue action
    const judgeDecision = adherence_result.judge_decision || state.judge_decisions[state.judge_decisions.length - 1];

    if (judgeDecision) {
      announceAction(`⚖️ ${state.current_judge.name} rules: ${judgeDecision.ruling}`);
      announceAction(judgeDecision.narrative);
    }

    // Apply rogue action effects from adherence result
    if (adherence_result.chaos_event) {
      // Effects already applied by psychology system
      announceAction(adherence_result.description);
    }

    safeSetTimeout(() => {
      advanceToNextTurn();
    }, 4000);
  }, [state.current_judge, state.judge_decisions, announceAction, safeSetTimeout]);

  // Calculate damage with spatial modifiers
  const calculateHexBattleDamage = useCallback((
    attacker: TeamCharacter,
    defender: TeamCharacter,
    grid: HexBattleGrid
  ): number => {
    const baseAttack = attacker.traditionalStats?.strength || attacker.attack || 50;
    const baseDefense = defender.traditionalStats?.defense || defender.defense || 50;

    let damage = Math.max(1, baseAttack - baseDefense + Math.random() * 20);

    // Spatial modifiers
    const defenderPos = grid.character_positions.get(defender.id);
    if (defenderPos) {
      const flankingPositions = HexLineOfSight.getFlankingPositions(defenderPos, grid);
      const occupiedByAllies = flankingPositions.filter(fp => {
        if (!fp.isOccupied || !fp.occupantId) return false;
        const occupant = [...state.player_team.characters, ...state.opponent_team.characters]
          .find(c => c.id === fp.occupantId);
        if (!occupant) return false;
        // Check if occupant is on attacker's team
        const isAttackerTeam = state.player_team.characters.some(c => c.id === attacker.id);
        const isOccupantTeam = state.player_team.characters.some(c => c.id === occupant.id);
        return isAttackerTeam === isOccupantTeam;
      });

      // Flanking bonus: +20% damage per ally adjacent to defender
      if (occupiedByAllies.length >= 2) {
        damage *= 1.4; // +40% for 2+ flanking allies
        announceAction(`🎯 FLANKING BONUS! +40% damage`);
      } else if (occupiedByAllies.length === 1) {
        damage *= 1.2; // +20% for 1 flanking ally
        announceAction(`🎯 Flanking bonus! +20% damage`);
      }
    }

    return Math.floor(damage);
  }, [state.player_team, state.opponent_team, announceAction]);

  // Advance to next character's turn
  const advanceToNextTurn = useCallback(() => {
    currentTurnIndexRef.current += 1;

    // Check if round is complete
    if (currentTurnIndexRef.current >= turnOrderRef.current.length) {
      // Round complete - check victory condition
      const playerAlive = state.player_team.characters.some(c => c.current_health > 0);
      const opponentAlive = state.opponent_team.characters.some(c => c.current_health > 0);

      if (!playerAlive) {
        endHexBattle('opponent');
      } else if (!opponentAlive) {
        endHexBattle('player');
      } else {
        // Start next round
        currentTurnIndexRef.current = 0;
        const nextRound = state.current_round + 1;
        actions.set_current_round(nextRound);

        // Reset action points for all characters
        const newActionStates = new Map(state.character_action_states);
        turnOrderRef.current.forEach(charId => {
          newActionStates.set(charId, HexMovementEngine.initializeActionState(charId));
        });
        actions.setCharacterActionStates(newActionStates);

        announceRoundStart(nextRound);
        safeSetTimeout(() => {
          executeRound();
        }, 3000);
      }
    } else {
      // Continue to next character's turn
      safeSetTimeout(() => {
        executeRound();
      }, 1000);
    }
  }, [state.current_round, state.player_team, state.opponent_team, state.character_action_states, actions, announceRoundStart, safeSetTimeout]);

  // End hex battle
  const endHexBattle = useCallback((winner: 'player' | 'opponent') => {
    actions.set_phase('battle_complete');
    actions.setHexBattleMode(false);
    actions.setActiveCharacterId(null);

    if (winner === 'player') {
      announceVictory(state.player_team.name, true);
      actions.set_current_announcement(`🏆 VICTORY! ${state.player_team.name} dominates the hex grid!`);
    } else {
      announceDefeat(state.player_team.name);
      actions.set_current_announcement(`💀 DEFEAT! ${state.opponent_team.name} claims victory!`);
    }
  }, [state.player_team, state.opponent_team, actions, announceVictory, announceDefeat]);

  // Reset hex battle
  const resetHexBattle = useCallback(() => {
    gridRef.current = null;
    turnOrderRef.current = [];
    currentTurnIndexRef.current = 0;

    actions.setHexBattleMode(false);
    actions.setHexBattleGrid(null);
    actions.setCharacterActionStates(new Map());
    actions.setActiveCharacterId(null);
  }, [actions]);

  return {
    startHexBattle,
    executeRound,
    executeCharacterTurn,
    endHexBattle,
    resetHexBattle,
    is_hex_battle: state.hex_battle_mode,
    current_grid: state.hex_battle_grid,
    active_character_id: state.active_character_id
  };
};
