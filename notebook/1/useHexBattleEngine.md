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
  moveToHex?: HexPosition;
  attackTargetId?: string;
  attackTargetHex?: HexPosition;
  abilityId?: string;
}

interface CoachPlannedAction {
  characterId: string;
  action: HexAction;
  reasoning: string;
}

interface UseHexBattleEngineProps {
  state: BattleStateData;
  actions: any;
  timeoutManager: {
    setTimeout: (cb: () => void, delay: number) => any;
    clearTimeout: (id: any) => void;
  };
  checkForChaos: (attacker: TeamCharacter, defender: TeamCharacter, ability: any, isPlayerTeam: boolean) => any;
  announceBattleStart: (team1: string, team2: string) => void;
  announceRoundStart: (round: number) => void;
  announceAction: (action: string, delay?: number) => void;
  announceVictory: (team: string, isFlawless?: boolean) => void;
  announceDefeat: (team: string) => void;
}

export const useHexBattleEngine = ({
  state,
  actions,
  timeoutManager,
  checkForChaos,
  announceBattleStart,
  announceRoundStart,
  announceAction,
  announceVictory,
  announceDefeat
}: UseHexBattleEngineProps) => {
  const { setTimeout: safeSetTimeout } = timeoutManager;

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

    state.playerTeam.characters.forEach((char, index) => {
      grid.characterPositions.set(char.id, team1Positions[index]);
    });

    state.opponentTeam.characters.forEach((char, index) => {
      grid.characterPositions.set(char.id, team2Positions[index]);
    });

    // Initialize action states for all characters
    const actionStates = new Map<string, CharacterActionState>();
    [...state.playerTeam.characters, ...state.opponentTeam.characters].forEach(char => {
      actionStates.set(char.id, HexMovementEngine.initializeActionState(char.id));
    });

    // Calculate turn order based on speed
    const allCharacters = [...state.playerTeam.characters, ...state.opponentTeam.characters];
    const turnOrder = allCharacters
      .sort((a, b) => {
        const speedA = a.traditionalStats?.speed || a.speed || 50;
        const speedB = b.traditionalStats?.speed || b.speed || 50;
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
    actions.setPhase('pre_battle_huddle');

    announceBattleStart(state.playerTeam.name, state.opponentTeam.name);
    actions.setCurrentAnnouncement(
      `⚔️ HEX GRID BATTLE: ${state.playerTeam.name} vs ${state.opponentTeam.name}!\n` +
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
  }, [state.playerTeam, state.opponentTeam, actions, announceBattleStart, safeSetTimeout]);

  // Proceed to first round
  const proceedToFirstRound = useCallback(() => {
    actions.setPhase('coaching');
    actions.setCurrentRound(1);
    announceRoundStart(1);

    actions.setCurrentAnnouncement(
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
    actions.setPhase('combat');

    const allCharacters = [...state.playerTeam.characters, ...state.opponentTeam.characters];
    const activeCharId = turnOrderRef.current[currentTurnIndexRef.current];
    const activeChar = allCharacters.find(c => c.id === activeCharId);

    if (!activeChar) {
      console.error('Active character not found:', activeCharId);
      return;
    }

    actions.setActiveCharacterId(activeCharId);

    announceAction(`${activeChar.name}'s turn! (${activeChar.traditionalStats?.speed || 50} speed)`);

    // Execute character turn
    safeSetTimeout(() => {
      executeCharacterTurn(activeChar);
    }, 2000);
  }, [state.playerTeam, state.opponentTeam, actions, announceAction, safeSetTimeout]);

  // Convert HexAction to Ability format for psychology system
  const hexActionToAbility = useCallback((hexAction: HexAction, characterAbilities: any[]) => {
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

    const isPlayerTeam = state.playerTeam.characters.some(c => c.id === character.id);
    const characterPos = grid.characterPositions.get(character.id);

    if (!characterPos) {
      console.error('Character position not found:', character.id);
      advanceToNextTurn();
      return;
    }

    // Get coach's planned action
    const coachAction = getCoachPlannedAction(character, grid, isPlayerTeam);

    // Get target character if attacking
    const targetChar = coachAction.action.attackTargetId
      ? [...state.playerTeam.characters, ...state.opponentTeam.characters].find(
          c => c.id === coachAction.action.attackTargetId
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
    // chaosEvent: true means character deviated
    if (!adherenceResult?.chaosEvent) {
      // Character followed the plan - execute coach's action
      executeCoachAction(character, coachAction, targetChar, isPlayerTeam);
    } else {
      // Character deviated - handle rogue action
      executeRogueAction(character, adherenceResult, isPlayerTeam);
    }

  }, [state.playerTeam, state.opponentTeam, checkForChaos, hexActionToAbility]);

  // Get coach's planned action for a character
  const getCoachPlannedAction = useCallback((
    character: TeamCharacter,
    grid: HexBattleGrid,
    isPlayerTeam: boolean
  ): CoachPlannedAction => {
    // TODO: In full implementation, this comes from coaching UI
    // For now, generate basic tactical AI

    const characterPos = grid.characterPositions.get(character.id)!;
    const actionState = state.characterActionStates.get(character.id);

    if (!actionState) {
      return {
        characterId: character.id,
        action: { type: 'defend' },
        reasoning: 'No AP available'
      };
    }

    // Find nearest enemy
    const enemies = isPlayerTeam ? state.opponentTeam.characters : state.playerTeam.characters;
    const visibleEnemies = HexLineOfSight.getVisibleCharacters(
      characterPos,
      5, // Attack range
      grid,
      [character.id]
    ).filter(visible =>
      enemies.some(e => e.id === visible.characterId)
    );

    if (visibleEnemies.length > 0 && actionState.canAttack) {
      // Attack nearest visible enemy
      const target = visibleEnemies[0];
      return {
        characterId: character.id,
        action: {
          type: 'attack',
          attackTargetId: target.characterId,
          attackTargetHex: target.position
        },
        reasoning: `Attack ${target.characterId} at range ${target.distance}`
      };
    } else if (actionState.canMove) {
      // Move toward nearest enemy
      const nearestEnemy = enemies[0];
      const enemyPos = grid.characterPositions.get(nearestEnemy.id);

      if (enemyPos) {
        // Find reachable hex closest to enemy
        const reachableHexes = HexMovementEngine.getReachableHexes(
          character.id,
          characterPos,
          actionState.actionPointsRemaining,
          grid
        );

        const closestHex = reachableHexes.reduce((closest, hex) => {
          const distToEnemy = HexGridSystem.distance(hex, enemyPos);
          const closestDist = HexGridSystem.distance(closest, enemyPos);
          return distToEnemy < closestDist ? hex : closest;
        }, reachableHexes[0] || characterPos);

        return {
          characterId: character.id,
          action: {
            type: 'move',
            moveToHex: closestHex
          },
          reasoning: `Move toward ${nearestEnemy.name}`
        };
      }
    }

    // Default: defend
    return {
      characterId: character.id,
      action: { type: 'defend' },
      reasoning: 'Defensive stance'
    };
  }, [state.characterActionStates, state.playerTeam, state.opponentTeam]);

  // Execute coach's planned action
  const executeCoachAction = useCallback((
    character: TeamCharacter,
    plannedAction: CoachPlannedAction,
    targetChar: TeamCharacter | null,
    isPlayerTeam: boolean
  ) => {
    const grid = gridRef.current;
    if (!grid) return;

    const action = plannedAction.action;
    const characterPos = grid.characterPositions.get(character.id)!;
    const actionState = state.characterActionStates.get(character.id)!;

    announceAction(`${character.name} follows the plan: ${plannedAction.reasoning}`);

    if (action.type === 'move' || action.type === 'move_and_attack') {
      if (action.moveToHex) {
        // Validate movement
        const validation = HexMovementEngine.canMoveTo(
          character.id,
          characterPos,
          action.moveToHex,
          grid,
          actionState.actionPointsRemaining
        );

        if (validation.valid) {
          // Execute movement
          grid.characterPositions.set(character.id, action.moveToHex);

          const moveAction: ExecutedAction = {
            type: 'move',
            apCost: validation.apCost,
            targetHex: action.moveToHex
          };

          const result = HexMovementEngine.executeAction(actionState, moveAction);
          if (result.success) {
            const newStates = new Map(state.characterActionStates);
            newStates.set(character.id, result.newState);
            actions.setCharacterActionStates(newStates);
            actions.setHexBattleGrid({ ...grid });
          }

          announceAction(`${character.name} moves to hex (${action.moveToHex.q}, ${action.moveToHex.r})`);
        }
      }
    }

    if ((action.type === 'attack' || action.type === 'move_and_attack') && targetChar) {
      // Execute attack
      const damage = calculateHexBattleDamage(character, targetChar, grid);
      const newHP = Math.max(0, targetChar.currentHp - damage);

      // Update target HP
      const allChars = [...state.playerTeam.characters, ...state.opponentTeam.characters];
      const targetIndex = allChars.findIndex(c => c.id === targetChar.id);
      if (targetIndex !== -1) {
        allChars[targetIndex] = { ...targetChar, currentHp: newHP };
      }

      announceAction(`${character.name} attacks ${targetChar.name} for ${damage} damage!`);

      // Check if target is defeated
      if (newHP <= 0) {
        announceAction(`💀 ${targetChar.name} has been defeated!`);
      }
    }

    // Advance to next turn
    safeSetTimeout(() => {
      advanceToNextTurn();
    }, 3000);
  }, [state.characterActionStates, state.playerTeam, state.opponentTeam, actions, announceAction, safeSetTimeout]);

  // Execute rogue action (character deviated)
  const executeRogueAction = useCallback((
    character: TeamCharacter,
    adherenceResult: any,
    isPlayerTeam: boolean
  ) => {
    announceAction(`⚠️ ${character.name} goes ROGUE! Psychology breakdown!`);

    // Judge rules on the rogue action
    const judgeDecision = adherenceResult.judgeDecision || state.judgeDecisions[state.judgeDecisions.length - 1];

    if (judgeDecision) {
      announceAction(`⚖️ ${state.currentJudge.name} rules: ${judgeDecision.ruling}`);
      announceAction(judgeDecision.narrative);
    }

    // Apply rogue action effects from adherence result
    if (adherenceResult.chaosEvent) {
      // Effects already applied by psychology system
      announceAction(adherenceResult.description);
    }

    safeSetTimeout(() => {
      advanceToNextTurn();
    }, 4000);
  }, [state.currentJudge, state.judgeDecisions, announceAction, safeSetTimeout]);

  // Calculate damage with spatial modifiers
  const calculateHexBattleDamage = useCallback((
    attacker: TeamCharacter,
    defender: TeamCharacter,
    grid: HexBattleGrid
  ): number => {
    const baseAttack = attacker.traditionalStats?.strength || attacker.attack || 50;
    const baseDefense = defender.traditionalStats?.stamina || defender.defense || 50;

    let damage = Math.max(1, baseAttack - baseDefense + Math.random() * 20);

    // Spatial modifiers
    const defenderPos = grid.characterPositions.get(defender.id);
    if (defenderPos) {
      const flankingPositions = HexLineOfSight.getFlankingPositions(defenderPos, grid);
      const occupiedByAllies = flankingPositions.filter(fp => {
        if (!fp.isOccupied || !fp.occupantId) return false;
        const occupant = [...state.playerTeam.characters, ...state.opponentTeam.characters]
          .find(c => c.id === fp.occupantId);
        if (!occupant) return false;
        // Check if occupant is on attacker's team
        const isAttackerTeam = state.playerTeam.characters.some(c => c.id === attacker.id);
        const isOccupantTeam = state.playerTeam.characters.some(c => c.id === occupant.id);
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
  }, [state.playerTeam, state.opponentTeam, announceAction]);

  // Advance to next character's turn
  const advanceToNextTurn = useCallback(() => {
    currentTurnIndexRef.current += 1;

    // Check if round is complete
    if (currentTurnIndexRef.current >= turnOrderRef.current.length) {
      // Round complete - check victory condition
      const playerAlive = state.playerTeam.characters.some(c => c.currentHp > 0);
      const opponentAlive = state.opponentTeam.characters.some(c => c.currentHp > 0);

      if (!playerAlive) {
        endHexBattle('opponent');
      } else if (!opponentAlive) {
        endHexBattle('player');
      } else {
        // Start next round
        currentTurnIndexRef.current = 0;
        const nextRound = state.currentRound + 1;
        actions.setCurrentRound(nextRound);

        // Reset action points for all characters
        const newActionStates = new Map(state.characterActionStates);
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
  }, [state.currentRound, state.playerTeam, state.opponentTeam, state.characterActionStates, actions, announceRoundStart, safeSetTimeout]);

  // End hex battle
  const endHexBattle = useCallback((winner: 'player' | 'opponent') => {
    actions.setPhase('battle_complete');
    actions.setHexBattleMode(false);
    actions.setActiveCharacterId(null);

    if (winner === 'player') {
      announceVictory(state.playerTeam.name, true);
      actions.setCurrentAnnouncement(`🏆 VICTORY! ${state.playerTeam.name} dominates the hex grid!`);
    } else {
      announceDefeat(state.playerTeam.name);
      actions.setCurrentAnnouncement(`💀 DEFEAT! ${state.opponentTeam.name} claims victory!`);
    }
  }, [state.playerTeam, state.opponentTeam, actions, announceVictory, announceDefeat]);

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
    isHexBattle: state.hexBattleMode,
    currentGrid: state.hexBattleGrid,
    activeCharacterId: state.activeCharacterId
  };
};
