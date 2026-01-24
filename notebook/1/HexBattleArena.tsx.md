// HexBattleArena - Main 3D hex grid battle component
// Dual-screen layout: Hex grid (left) + Battle Monitor (right)

import React, { useState, useCallback, useEffect } from 'react';
import { HexGrid } from './HexGrid';
import { CharacterToken } from './CharacterToken';
import { ActionOverlay } from './ActionOverlay';
import { CharacterActionPlanner, PlannedAction } from './CharacterActionPlanner';
import { PowersSpellsPanel, PowerDefinition, SpellDefinition } from './PowersSpellsPanel';
import { HexGridSystem, HexPosition, HexBattleGrid } from '@/systems/hexGridSystem';
import { HexLineOfSight } from '@/systems/hexLineOfSight';
import { HexMovementEngine, CharacterActionState, ExecutedAction } from '@/systems/hexMovementEngine';
import { TeamCharacter, Team } from '@/data/teamBattleSystem';
import { getWeaponRange } from '@/data/weaponRanges';
import { battleWebSocket } from '@/services/battleWebSocket';
import { performAdherenceCheck } from '@/systems/adherenceCheckSystem';
import { type BattleCharacter } from '@/data/battleFlow';
import { generateActionSurvey, selectFromSurvey, type SurveyOption } from '@/systems/actionSurveyGenerator';
import { makeJudgeDecision, getRandomJudge, type JudgeDecision, type JudgePersonality } from '@/data/aiJudgeSystem';

interface HexBattleArenaProps {
  userTeam: Team;
  opponentTeam: Team;
  onBattleEnd?: (result: { winner: 'user' | 'opponent'; userHealth: number; opponentHealth: number }) => void;
}

// Battle-specific character state (tracks HP, status during battle without mutating original)
interface BattleCharacterState {
  id: string;
  currentHp: number;
  maxHp: number;
  statusEffects: string[];
  isKnockedOut: boolean;
}

export const HexBattleArena: React.FC<HexBattleArenaProps> = ({
  userTeam,
  opponentTeam,
  onBattleEnd
}) => {
  // Extract characters from teams
  const userCharacters = userTeam.characters || [];
  const opponentCharacters = opponentTeam.characters || [];

  // Battle state - tracks HP and status during battle
  const [battleCharacterStates, setBattleCharacterStates] = useState<Map<string, BattleCharacterState>>(new Map());

  // Initialize battle states when teams load
  useEffect(() => {
    if (userCharacters.length === 0 || opponentCharacters.length === 0) return;

    const newStates = new Map<string, BattleCharacterState>();

    // Initialize user team battle states
    userCharacters.forEach(char => {
      newStates.set(char.id, {
        id: char.id,
        currentHp: char.currentHp || char.maxHp,
        maxHp: char.maxHp,
        statusEffects: [],
        isKnockedOut: false
      });
    });

    // Initialize opponent team battle states
    opponentCharacters.forEach(char => {
      newStates.set(char.id, {
        id: char.id,
        currentHp: char.currentHp || char.maxHp,
        maxHp: char.maxHp,
        statusEffects: [],
        isKnockedOut: false
      });
    });

    setBattleCharacterStates(newStates);
    console.log('⚔️ Battle states initialized for', newStates.size, 'characters');
  }, [userCharacters.length, opponentCharacters.length]);

  // Helper: Get battle state for character
  const getBattleState = useCallback((characterId: string): BattleCharacterState | undefined => {
    return battleCharacterStates.get(characterId);
  }, [battleCharacterStates]);

  // Helper: Update battle state for character
  const updateBattleState = useCallback((characterId: string, updates: Partial<BattleCharacterState>) => {
    setBattleCharacterStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(characterId);
      if (currentState) {
        newStates.set(characterId, { ...currentState, ...updates });
      }
      return newStates;
    });
  }, []);

  // Check victory/defeat conditions
  const checkBattleEnd = useCallback(() => {
    // Count alive characters on each team
    let userAlive = 0;
    let opponentAlive = 0;
    let userTotalHp = 0;
    let opponentTotalHp = 0;

    userCharacters.forEach(char => {
      const battleState = getBattleState(char.id);
      if (battleState && !battleState.isKnockedOut) {
        userAlive++;
        userTotalHp += battleState.currentHp;
      }
    });

    opponentCharacters.forEach(char => {
      const battleState = getBattleState(char.id);
      if (battleState && !battleState.isKnockedOut) {
        opponentAlive++;
        opponentTotalHp += battleState.currentHp;
      }
    });

    // Check for victory/defeat
    if (userAlive === 0 && opponentAlive === 0) {
      // Draw (both teams eliminated simultaneously - rare but possible)
      console.log('⚔️ BATTLE ENDED IN A DRAW!');
      const result = {
        winner: (userTotalHp >= opponentTotalHp ? 'user' : 'opponent') as 'user' | 'opponent',
        userHealth: 0,
        opponentHealth: 0
      };
      setBattleEnded(true);
      setBattleResult(result);
      if (onBattleEnd) {
        onBattleEnd(result);
      }
      return true;
    } else if (userAlive === 0) {
      // Defeat
      console.log('💀 DEFEAT! All your characters have been knocked out!');
      const result = {
        winner: 'opponent' as const,
        userHealth: 0,
        opponentHealth: opponentTotalHp
      };
      setBattleEnded(true);
      setBattleResult(result);
      if (onBattleEnd) {
        onBattleEnd(result);
      }
      return true;
    } else if (opponentAlive === 0) {
      // Victory
      console.log('🎉 VICTORY! All enemy characters have been defeated!');
      const result = {
        winner: 'user' as const,
        userHealth: userTotalHp,
        opponentHealth: 0
      };
      setBattleEnded(true);
      setBattleResult(result);
      if (onBattleEnd) {
        onBattleEnd(result);
      }
      return true;
    }

    return false;
  }, [userCharacters, opponentCharacters, getBattleState, onBattleEnd]);

  // Debug logging
  useEffect(() => {
    console.log('🎮 HexBattleArena mounted');
    console.log('User characters:', userCharacters.length, userCharacters.map(c => c.name));
    console.log('Opponent characters:', opponentCharacters.length, opponentCharacters.map(c => c.name));
  }, []);

  // Internal state for turn management
  const [currentTurn, setCurrentTurn] = useState<'user' | 'opponent'>('user');
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);

  // Action planning state
  const [showActionPlanner, setShowActionPlanner] = useState(false);
  const [characterPlans, setCharacterPlans] = useState<Map<string, PlannedAction>>(new Map());

  // Battle end state
  const [battleEnded, setBattleEnded] = useState(false);
  const [battleResult, setBattleResult] = useState<{ winner: 'user' | 'opponent'; userHealth: number; opponentHealth: number } | null>(null);

  // Judge system state
  const [currentJudge, setCurrentJudge] = useState<JudgePersonality>(() => getRandomJudge());

  // Battle log state
  interface BattleLogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: 'attack' | 'damage' | 'crit' | 'dodge' | 'knockout' | 'turn' | 'system';
  }
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);

  // Powers & Spells state
  const [equippedPowers, setEquippedPowers] = useState<PowerDefinition[]>([]);
  const [equippedSpells, setEquippedSpells] = useState<SpellDefinition[]>([]);
  const [powerCooldowns, setPowerCooldowns] = useState<Record<string, number>>({});
  const [spellCooldowns, setSpellCooldowns] = useState<Record<string, number>>({});
  const [selectedPower, setSelectedPower] = useState<PowerDefinition | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<SpellDefinition | null>(null);

  // Defensive buff state - tracks which characters are defending this turn
  const [defendingCharacters, setDefendingCharacters] = useState<Set<string>>(new Set());

  // Add message to battle log
  const addLogMessage = useCallback((message: string, type: BattleLogEntry['type']) => {
    const entry: BattleLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      message,
      type
    };
    setBattleLog(prev => [...prev, entry]);
  }, []);

  // Auto-scroll battle log to bottom
  const battleLogRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (battleLogRef.current) {
      battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight;
    }
  }, [battleLog]);

  // Socket integration for powers/spells
  useEffect(() => {
    const handlers = {
      onPowerUsed: (data: any) => {
        console.log('⚡ Power used response:', data);
        // Update HP based on server response via battle state
        if (data.healthChanges) {
          Object.entries(data.healthChanges).forEach(([characterId, change]) => {
            const battleState = getBattleState(characterId);
            if (battleState) {
              const newHp = Math.max(0, Math.min(battleState.maxHp, battleState.currentHp + (change as number)));
              updateBattleState(characterId, {
                currentHp: newHp,
                isKnockedOut: newHp <= 0
              });
            }
          });
        }
        // Update cooldowns from server
        if (data.newState?.yourCharacter?.powerCooldowns) {
          setPowerCooldowns(data.newState.yourCharacter.powerCooldowns);
        }
        // Add to battle log
        addLogMessage(data.narrative || `Power ${data.powerName} used!`, 'attack');
      },
      onSpellCast: (data: any) => {
        console.log('✨ Spell cast response:', data);
        // Update HP based on server response via battle state
        if (data.healthChanges) {
          Object.entries(data.healthChanges).forEach(([characterId, change]) => {
            const battleState = getBattleState(characterId);
            if (battleState) {
              const newHp = Math.max(0, Math.min(battleState.maxHp, battleState.currentHp + (change as number)));
              updateBattleState(characterId, {
                currentHp: newHp,
                isKnockedOut: newHp <= 0
              });
            }
          });
        }
        // Update cooldowns from server
        if (data.newState?.yourCharacter?.spellCooldowns) {
          setSpellCooldowns(data.newState.yourCharacter.spellCooldowns);
        }
        // Add to battle log
        addLogMessage(data.narrative || `Spell ${data.spellName} cast!`, 'attack');
      },
      onPowerFailed: (error: any) => {
        console.error('❌ Power failed:', error);
        addLogMessage(error.error || 'Power failed!', 'system');
      },
      onSpellFailed: (error: any) => {
        console.error('❌ Spell failed:', error);
        addLogMessage(error.error || 'Spell failed!', 'system');
      }
    };

    battleWebSocket.setEventHandlers(handlers);

    return () => {
      // Cleanup handlers on unmount
      battleWebSocket.clearEventHandlers();
    };
  }, [getBattleState, updateBattleState, addLogMessage]);

  // Floating damage numbers state
  interface FloatingDamageNumber {
    id: string;
    damage: number;
    position: HexPosition;
    type: 'normal' | 'crit' | 'dodge' | 'heal';
    timestamp: number;
  }
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingDamageNumber[]>([]);

  // Add floating damage number
  const addFloatingNumber = useCallback((damage: number, position: HexPosition, type: FloatingDamageNumber['type']) => {
    const floatingNum: FloatingDamageNumber = {
      id: `${Date.now()}-${Math.random()}`,
      damage,
      position,
      type,
      timestamp: Date.now()
    };
    setFloatingNumbers(prev => [...prev, floatingNum]);

    // Remove after animation completes (1.5 seconds)
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(n => n.id !== floatingNum.id));
    }, 1500);
  }, []);

  // Initialize turn order based on speed - must re-run when characters change
  useEffect(() => {
    if (userCharacters.length === 0 || opponentCharacters.length === 0) {
      console.warn('⚠️ Cannot initialize turn order - teams not loaded yet');
      return;
    }

    const allCharacters = [...userCharacters, ...opponentCharacters];
    const sorted = allCharacters
      .map(char => ({ id: char.id, speed: char.speed }))
      .sort((a, b) => b.speed - a.speed)
      .map(c => c.id);

    console.log('✅ Turn order initialized:', sorted);
    setTurnOrder(sorted);
    setActiveCharacterId(sorted[0] || null);

    // Add battle start message
    addLogMessage('⚔️ Battle begins!', 'system');
  }, [userCharacters.length, opponentCharacters.length, addLogMessage]);

  // Show coaching modal when a user character's turn begins
  useEffect(() => {
    if (!activeCharacterId) return;

    const activeChar = [...userCharacters, ...opponentCharacters].find(c => c.id === activeCharacterId);
    if (!activeChar) return;

    const isUserCharacter = userCharacters.some(c => c.id === activeCharacterId);

    // Load character's powers/spells
    if (activeChar.equippedPowers) {
      setEquippedPowers(activeChar.equippedPowers as any);
    } else {
      setEquippedPowers([]);
    }

    if (activeChar.equippedSpells) {
      setEquippedSpells(activeChar.equippedSpells as any);
    } else {
      setEquippedSpells([]);
    }

    // Add turn announcement to log
    addLogMessage(`${activeChar.name}'s turn`, 'turn');

    if (isUserCharacter) {
      console.log('📋 User character turn starting - showing action planner');
      setShowActionPlanner(true);
    } else {
      console.log('🤖 Opponent character turn - AI will play');
      // For opponent, we could add AI logic here
      // For now, opponent turns will be skipped/automated
    }
  }, [activeCharacterId, userCharacters, opponentCharacters, addLogMessage]);

  // Apply psychology-based weighting to chaos actions
  const applyRebellionWeighting = useCallback((
    survey: ReturnType<typeof generateActionSurvey>,
    character: BattleCharacter
  ): ReturnType<typeof generateActionSurvey> => {
    const weightedOptions = survey.options.map(option => {
      let weight = option.priorityWeight;

      // Chaos actions get boosted based on psychology
      if (option.id.startsWith('chaos_')) {
        const stress = character.mentalState.stress;
        const teamTrust = character.mentalState.teamTrust;
        const mentalHealth = character.mentalState.currentMentalHealth;

        // High stress increases chaos likelihood
        if (stress > 70) {
          weight += 50;
        } else if (stress > 50) {
          weight += 20;
        }

        // Low team trust increases betrayal likelihood
        if (teamTrust < 30 && option.id.includes('friendly_fire')) {
          weight += 40;
        }

        // Low mental health increases flee/refuse likelihood
        if (mentalHealth < 30) {
          if (option.id === 'chaos_flee' || option.id === 'chaos_refuse') {
            weight += 60;
          }
        }
      }

      return { ...option, priorityWeight: weight };
    });

    return { ...survey, options: weightedOptions };
  }, []);

  // Execute rebellious action selected by psychology system
  const executeRebellionAction = useCallback((
    characterId: string,
    rebellionAction: SurveyOption,
    character: BattleCharacter
  ) => {
    console.log('💀 Executing rebellion action:', rebellionAction.label);
    addLogMessage(`${character.character.name}: ${rebellionAction.label}`, 'turn');

    // Get judge ruling on the rebellion
    const judgeDecision = makeJudgeDecision(
      {
        type: 'strategy_override',
        description: `${character.character.name} rebels: ${rebellionAction.label}`,
        severity: 'major',
        characterId: character.character.id,
        startRound: Math.floor(turnOrder.indexOf(characterId) / turnOrder.length) + 1,
        duration: 'temporary'
      },
      character,
      {
        currentRound: Math.floor(turnOrder.indexOf(characterId) / turnOrder.length) + 1,
        opponentCharacter: opponentCharacters[0], // Use first opponent as reference
        arenaCondition: 'pristine'
      },
      currentJudge,
      rebellionAction.label
    );

    // Display judge ruling
    addLogMessage(`⚖️ ${currentJudge.name}: ${judgeDecision.ruling}`, 'system');
    addLogMessage(judgeDecision.narrative, 'attack');

    // Apply mechanical effect
    const effect = judgeDecision.mechanicalEffect;
    const charState = getBattleState(characterId);
    if (!charState) return;

    switch (effect.type) {
      case 'damage':
        if (effect.target === 'self') {
          const newHp = Math.max(0, charState.currentHp - (effect.amount || 0));
          updateBattleState(characterId, {
            currentHp: newHp,
            isKnockedOut: newHp === 0
          });
          addLogMessage(`${character.character.name} takes ${effect.amount} damage!`, 'damage');
        } else if (effect.target === 'opponent') {
          const targetId = opponentCharacters[0]?.id;
          if (targetId) {
            const targetState = getBattleState(targetId);
            if (targetState) {
              const newHp = Math.max(0, targetState.currentHp - (effect.amount || 0));
              updateBattleState(targetId, {
                currentHp: newHp,
                isKnockedOut: newHp === 0
              });
              addLogMessage(`${opponentCharacters[0].name} takes ${effect.amount} damage!`, 'damage');
            }
          }
        }
        break;

      case 'skip_turn':
        addLogMessage(`${character.character.name} loses their turn!`, 'system');
        // Turn will end naturally
        break;

      case 'redirect_attack':
        if (effect.target === 'teammate') {
          // Find a random teammate to hit
          const teammates = userCharacters.filter(c => c.id !== characterId);
          if (teammates.length > 0) {
            const victim = teammates[Math.floor(Math.random() * teammates.length)];
            const victimState = getBattleState(victim.id);
            if (victimState) {
              const newHp = Math.max(0, victimState.currentHp - (effect.amount || 0));
              updateBattleState(victim.id, {
                currentHp: newHp,
                isKnockedOut: newHp === 0
              });
              addLogMessage(`💥 Friendly fire! ${victim.name} takes ${effect.amount} damage!`, 'damage');
            }
          }
        }
        break;

      default:
        addLogMessage(`Chaotic effect: ${effect.specialEffect || 'unpredictable consequences'}`, 'system');
    }

    // Check if battle ended due to rebellion
    checkBattleEnd();
  }, [userCharacters, opponentCharacters, currentJudge, turnOrder, getBattleState, updateBattleState, addLogMessage, checkBattleEnd]);

  // Execute planned actions when adherence check passes
  const executePlannedActions = useCallback((characterId: string, plan: PlannedAction) => {
    console.log('🎬 Executing planned actions for', characterId);

    const character = [...userCharacters, ...opponentCharacters].find(c => c.id === characterId);
    if (!character) {
      console.error('❌ Character not found for plan execution');
      return;
    }

    let currentActionState = actionStates.get(characterId);
    if (!currentActionState) {
      console.error('❌ Action state not found for character');
      return;
    }

    // Execute each action step in sequence
    plan.actionSequence.forEach((step, index) => {
      console.log(`  Step ${index + 1}/${plan.actionSequence.length}:`, step.type, `(${step.apCost} AP)`);

      switch (step.type) {
        case 'move':
          if (step.targetHex) {
            // Update grid position
            const newGrid = { ...grid };
            newGrid.characterPositions.set(characterId, step.targetHex);
            setGrid(newGrid);

            // Deduct AP
            const moveAction = { type: 'move' as const, apCost: step.apCost, targetHex: step.targetHex };
            const result = HexMovementEngine.executeAction(currentActionState!, moveAction);
            if (result.success) {
              currentActionState = result.newState;
              const newStates = new Map(actionStates);
              newStates.set(characterId, result.newState);
              setActionStates(newStates);
            }

            addLogMessage(`${character.name} moves to new position (${step.apCost} AP)`, 'system');
            console.log(`    ✅ Moved to`, step.targetHex);
          }
          break;

        case 'attack':
          if (step.targetId) {
            const attackResult = handleAttackCharacter(characterId, step.targetId, currentActionState);
            if (attackResult.success && attackResult.newState) {
              currentActionState = attackResult.newState;
              const newStates = new Map(actionStates);
              newStates.set(characterId, attackResult.newState);
              setActionStates(newStates);
            }
            console.log(`    ⚔️ Attacked ${step.targetId}`);
          }
          break;

        case 'power':
          if (step.targetId && step.abilityId) {
            // Find the power
            const power = equippedPowers.find(p => p.id === step.abilityId);
            if (power) {
              const powerResult = executePowerOnTarget(step.targetId, power, characterId, currentActionState);
              if (powerResult.success && powerResult.newState) {
                currentActionState = powerResult.newState;
                const newStates = new Map(actionStates);
                newStates.set(characterId, powerResult.newState);
                setActionStates(newStates);
              }
              console.log(`    ⚡ Used power ${step.abilityName} on ${step.targetId}`);
            } else {
              console.warn(`    ⚠️ Power ${step.abilityId} not found in equipped powers`);
            }
          }
          break;

        case 'spell':
          if (step.targetId && step.abilityId) {
            // Find the spell
            const spell = equippedSpells.find(s => s.id === step.abilityId);
            if (spell) {
              const spellResult = executeSpellOnTarget(step.targetId, spell, characterId, currentActionState);
              if (spellResult.success && spellResult.newState) {
                currentActionState = spellResult.newState;
                const newStates = new Map(actionStates);
                newStates.set(characterId, spellResult.newState);
                setActionStates(newStates);
              }
              console.log(`    ✨ Cast spell ${step.abilityName} on ${step.targetId}`);
            } else {
              console.warn(`    ⚠️ Spell ${step.abilityId} not found in equipped spells`);
            }
          }
          break;

        case 'defend':
          // Execute defend for the specific character
          const defendAction = {
            type: 'defend' as const,
            apCost: 1
          };
          const defendResult = HexMovementEngine.executeAction(currentActionState, defendAction);
          if (defendResult.success) {
            currentActionState = defendResult.newState;
            const newStates = new Map(actionStates);
            newStates.set(characterId, defendResult.newState);
            setActionStates(newStates);
            setDefendingCharacters(prev => new Set(prev).add(characterId));
            addLogMessage(`${character.name} takes a defensive stance!`, 'system');
            console.log(`    🛡️ Taking defensive stance`);
          }
          break;

        default:
          console.warn(`    ⚠️ Unknown action type: ${step.type}`);
      }
    });

    console.log('✅ Plan execution complete');
  }, [userCharacters, opponentCharacters, actionStates, grid, handleAttackCharacter, executePowerOnTarget, executeSpellOnTarget, addLogMessage, equippedPowers, equippedSpells, defendingCharacters]);

  // Action plan submission handler
  const handlePlanSubmit = useCallback((plan: PlannedAction) => {
    if (!activeCharacterId) return;

    console.log('✅ Action plan submitted:', plan);

    // Store the plan for this character
    const newPlans = new Map(characterPlans);
    newPlans.set(activeCharacterId, plan);
    setCharacterPlans(newPlans);

    setShowActionPlanner(false);

    // Get active character
    const activeChar = [...userCharacters, ...opponentCharacters].find(c => c.id === activeCharacterId);
    if (!activeChar) {
      console.error('❌ Could not find active character for adherence check');
      return;
    }

    // Calculate battle context for adherence check
    const userAlive = userCharacters.filter(c => {
      const state = getBattleState(c.id);
      return !state?.isKnockedOut;
    }).length;

    const opponentAlive = opponentCharacters.filter(c => {
      const state = getBattleState(c.id);
      return !state?.isKnockedOut;
    }).length;

    const userTotalHp = userCharacters.reduce((sum, c) => {
      const state = getBattleState(c.id);
      return sum + (state?.currentHp ?? c.currentHp);
    }, 0);

    const opponentTotalHp = opponentCharacters.reduce((sum, c) => {
      const state = getBattleState(c.id);
      return sum + (state?.currentHp ?? c.currentHp);
    }, 0);

    const isUserCharacter = userCharacters.some(c => c.id === activeCharacterId);
    const teamWinning = isUserCharacter ? userTotalHp > opponentTotalHp : opponentTotalHp > userTotalHp;

    // Convert TeamCharacter to BattleCharacter for adherence check
    const battleChar: BattleCharacter = {
      character: {
        id: activeChar.id,
        name: activeChar.name,
        level: activeChar.level,
        archetype: activeChar.archetype
      },
      currentHealth: activeChar.currentHp,
      maxHealth: activeChar.maxHp,
      currentMana: activeChar.currentMana,
      maxMana: activeChar.maxMana,
      gameplanAdherence: activeChar.gameplan_adherence_level,
      mentalState: {
        currentMentalHealth: activeChar.current_mental_health,
        stress: activeChar.stress_level,
        teamTrust: activeChar.team_trust
      }
    };

    const battleContext = {
      teamWinning,
      roundNumber: currentTurn === 'user' ? Math.floor(turnOrder.indexOf(activeCharacterId) / turnOrder.length) + 1 : 1,
      teammatesAlive: isUserCharacter ? userAlive : opponentAlive,
      teammatesTotal: isUserCharacter ? userCharacters.length : opponentCharacters.length
    };

    // Perform adherence check
    console.log('🎲 Performing adherence check for', activeChar.name);
    const adherenceResult = performAdherenceCheck(battleChar, battleContext);

    console.log(`${adherenceResult.passed ? '✅' : '❌'} Adherence check result:`, adherenceResult.reasoning);
    addLogMessage(adherenceResult.reasoning, adherenceResult.passed ? 'system' : 'turn');

    if (adherenceResult.passed) {
      // Character follows the plan
      console.log('✅ Character follows plan - executing planned actions');
      addLogMessage(`${activeChar.name} follows the coach's plan!`, 'system');

      // Execute the planned actions
      executePlannedActions(activeCharacterId, plan);
    } else {
      // Character rebels!
      console.log('⚠️ Character rebels - triggering rebellion flow');
      addLogMessage(`${activeChar.name} refuses to follow the plan!`, 'turn');

      // Generate action survey with all possible actions (including chaos)
      const activeCharPos = grid.characterPositions.get(activeCharacterId);
      const activeActionState = actionStates.get(activeCharacterId);

      if (!activeCharPos || !activeActionState) {
        console.error('❌ Missing position or action state for rebellion');
        return;
      }

      // Build minimal BattleState for action survey
      const battleState = {
        teams: {
          player: {
            characters: userCharacters.map(c => {
              const state = getBattleState(c.id);
              return {
                character: { id: c.id, name: c.name, level: c.level, archetype: c.archetype },
                currentHealth: state?.currentHp ?? c.currentHp,
                maxHealth: c.maxHp,
                currentMana: c.currentMana,
                maxMana: c.maxMana,
                gameplanAdherence: c.gameplan_adherence_level,
                mentalState: {
                  currentMentalHealth: c.current_mental_health,
                  stress: c.stress_level,
                  teamTrust: c.team_trust
                },
                unlockedPowers: c.unlockedPowers || [],
                unlockedSpells: c.unlockedSpells || [],
                powerCooldowns: new Map(),
                spellCooldowns: new Map()
              } as BattleCharacter;
            })
          },
          opponent: {
            characters: opponentCharacters.map(c => {
              const state = getBattleState(c.id);
              return {
                character: { id: c.id, name: c.name, level: c.level, archetype: c.archetype },
                currentHealth: state?.currentHp ?? c.currentHp,
                maxHealth: c.maxHp,
                currentMana: c.currentMana,
                maxMana: c.maxMana,
                gameplanAdherence: c.gameplan_adherence_level,
                mentalState: {
                  currentMentalHealth: c.current_mental_health,
                  stress: c.stress_level,
                  teamTrust: c.team_trust
                },
                unlockedPowers: c.unlockedPowers || [],
                unlockedSpells: c.unlockedSpells || [],
                powerCooldowns: new Map(),
                spellCooldowns: new Map()
              } as BattleCharacter;
            })
          }
        },
        currentRound: battleContext.roundNumber
      };

      // Generate action survey
      let survey = generateActionSurvey(battleChar, battleState as any, activeActionState.actionPointsRemaining);

      // Apply psychology-based weighting to chaos actions
      survey = applyRebellionWeighting(survey, battleChar);

      // Select rebellious action
      const rebellionAction = selectFromSurvey(survey);

      console.log('💀 Rebellion action selected:', rebellionAction);

      // Execute the rebellious action through judge system
      executeRebellionAction(activeCharacterId, rebellionAction, battleChar);
    }
  }, [activeCharacterId, characterPlans, userCharacters, opponentCharacters, getBattleState, currentTurn, turnOrder, addLogMessage, executePlannedActions, grid, actionStates, applyRebellionWeighting, executeRebellionAction]);

  // Character action handlers
  const onMoveCharacter = useCallback((characterId: string, to: HexPosition) => {
    console.log(`Moving character ${characterId} to`, to);
    // Update will happen through grid state
  }, []);

  const onEndTurn = useCallback(() => {
    console.log('Turn ended for', activeCharacterId);

    // Decrement cooldowns for active character
    setPowerCooldowns(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(powerId => {
        if (updated[powerId] > 0) {
          updated[powerId]--;
        }
      });
      return updated;
    });

    setSpellCooldowns(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(spellId => {
        if (updated[spellId] > 0) {
          updated[spellId]--;
        }
      });
      return updated;
    });

    // Clear action mode
    setActionMode(null);

    // Clear defensive buffs for the character whose turn just ended
    if (activeCharacterId) {
      setDefendingCharacters(prev => {
        const updated = new Set(prev);
        updated.delete(activeCharacterId);
        return updated;
      });
    }

    // Move to next character in turn order
    const currentIndex = turnOrder.indexOf(activeCharacterId || '');
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    const nextCharacterId = turnOrder[nextIndex];

    console.log(`Next character: ${nextCharacterId} (index ${nextIndex}/${turnOrder.length})`);

    // Initialize action state for next character if needed
    if (nextCharacterId && !actionStates.has(nextCharacterId)) {
      const newStates = new Map(actionStates);
      newStates.set(nextCharacterId, HexMovementEngine.initializeActionState(nextCharacterId));
      setActionStates(newStates);
    }

    setActiveCharacterId(nextCharacterId);

    // Toggle turn when cycling back to first character (new round)
    if (nextIndex === 0) {
      console.log('🔄 New round starting');
      setCurrentTurn(prev => prev === 'user' ? 'opponent' : 'user');
    }
  }, [activeCharacterId, turnOrder, actionStates]);

  // Handle move character
  const handleMoveCharacter = useCallback((characterId: string, to: HexPosition) => {
    console.log(`Moving ${characterId} to`, to);
    // Movement logic handled by HexMovementEngine
  }, []);

  // Calculate damage for basic attack
  const calculateBasicDamage = useCallback((attacker: TeamCharacter, defender: TeamCharacter) => {
    // Base damage from attacker's attack stat (flat)
    const baseAttack = attacker.attack;
    const baseDamage = Math.floor(baseAttack * 0.5);

    // Defense reduces damage (flat)
    const defense = defender.defense;
    const defenseReduction = Math.floor(defense * 0.3);

    // Critical hit chance (based on attack stat)
    const critChance = baseAttack * 0.2; // 0-20% crit chance
    const isCrit = Math.random() * 100 < critChance;

    // Calculate final damage
    let finalDamage = Math.max(1, baseDamage - defenseReduction);
    if (isCrit) {
      finalDamage = Math.floor(finalDamage * 2);
    }

    // Dodge chance (based on defender's speed - flat)
    const defenderSpeed = defender.speed;
    const dodgeChance = defenderSpeed * 0.15; // 0-15% dodge chance
    const dodged = Math.random() * 100 < dodgeChance;

    return {
      damage: dodged ? 0 : finalDamage,
      isCrit,
      dodged,
      breakdown: {
        baseAttack,
        baseDamage,
        defenseReduction,
        critMultiplier: isCrit ? 2 : 1
      }
    };
  }, []);

  // Handle attack character
  const handleAttackCharacter = useCallback((
    attackerId: string,
    defenderId: string,
    providedActionState?: CharacterActionState
  ): { success: boolean; newState?: CharacterActionState } => {
    const attacker = [...userCharacters, ...opponentCharacters].find(c => c.id === attackerId);
    const defender = [...userCharacters, ...opponentCharacters].find(c => c.id === defenderId);

    if (!attacker || !defender) {
      console.error('❌ Could not find attacker or defender');
      return { success: false };
    }

    const attackerBattleState = getBattleState(attackerId);
    const defenderBattleState = getBattleState(defenderId);
    const attackerActionState = providedActionState || actionStates.get(attackerId);

    if (!attackerBattleState || !defenderBattleState || !attackerActionState) {
      console.error('❌ Battle states not initialized');
      return { success: false };
    }

    // Check if defender is already knocked out
    if (defenderBattleState.isKnockedOut) {
      console.log('⚠️ Target is already knocked out');
      return { success: false };
    }

    // Deduct AP for attack (2 AP)
    const attackAction = {
      type: 'attack' as const,
      apCost: 2
    };

    const result = HexMovementEngine.executeAction(attackerActionState, attackAction);
    if (!result.success) {
      console.log('❌ Not enough AP to attack');
      return { success: false };
    }

    // Update action state only if not provided (UI flow)
    if (!providedActionState) {
      const newStates = new Map(actionStates);
      newStates.set(attackerId, result.newState);
      setActionStates(newStates);
    }

    // Calculate damage
    const damageResult = calculateBasicDamage(attacker, defender);

    // Get defender's position for floating number
    const defenderPos = grid.characterPositions.get(defenderId);

    if (damageResult.dodged) {
      console.log(`💨 ${defender.name} dodged ${attacker.name}'s attack!`);
      addLogMessage(`${defender.name} dodged ${attacker.name}'s attack!`, 'dodge');

      // Show "DODGE" floating text
      if (defenderPos) {
        addFloatingNumber(0, defenderPos, 'dodge');
      }
      return { success: true, newState: result.newState };
    }

    // Apply defensive buff if defender is defending (50% damage reduction)
    let damage = damageResult.damage;
    const isDefending = defendingCharacters.has(defenderId);
    if (isDefending) {
      damage = Math.round(damage * 0.5);
      addLogMessage(`${defender.name}'s defense reduces damage to ${damage}!`, 'system');
      console.log(`🛡️ Defense active! Damage reduced: ${damageResult.damage} → ${damage}`);
    }

    const newHp = Math.max(0, defenderBattleState.currentHp - damage);
    const isKnockedOut = newHp <= 0;

    // Apply damage
    updateBattleState(defenderId, {
      currentHp: newHp,
      isKnockedOut
    });

    // Show floating damage number
    if (defenderPos) {
      addFloatingNumber(damage, defenderPos, damageResult.isCrit ? 'crit' : 'normal');
    }

    // Log combat result
    if (damageResult.isCrit) {
      console.log(`💥 CRITICAL! ${attacker.name} hits ${defender.name} for ${damage} damage!`);
      addLogMessage(`${attacker.name} attacks ${defender.name}`, 'attack');
      addLogMessage(`CRITICAL HIT for ${damage} damage!`, 'crit');
    } else {
      console.log(`⚔️ ${attacker.name} attacks ${defender.name} for ${damage} damage`);
      addLogMessage(`${attacker.name} attacks ${defender.name} for ${damage} damage`, 'damage');
    }

    if (isKnockedOut) {
      console.log(`💀 ${defender.name} has been knocked out!`);
      addLogMessage(`${defender.name} has been knocked out!`, 'knockout');
    }

    console.log(`   HP: ${defenderBattleState.currentHp} → ${newHp}`);
    console.log(`   AP remaining: ${result.newState.actionPointsRemaining}`);

    // Check for battle end immediately (state is already updated synchronously)
    checkBattleEnd();

    return { success: true, newState: result.newState };
  }, [userCharacters, opponentCharacters, getBattleState, updateBattleState, calculateBasicDamage, actionStates, checkBattleEnd, addLogMessage, grid.characterPositions, addFloatingNumber, defendingCharacters]);

  // Handle defend action
  const handleDefend = useCallback(() => {
    if (!activeCharacterId || !activeActionState) return;

    console.log(`${activeCharacterId} takes defensive stance`);

    const defendAction = {
      type: 'defend' as const,
      apCost: 1
    };

    const result = HexMovementEngine.executeAction(activeActionState, defendAction);
    if (result.success) {
      const newStates = new Map(actionStates);
      newStates.set(activeCharacterId, result.newState);
      setActionStates(newStates);

      // Apply defensive buff - reduces incoming damage by 50% this turn
      setDefendingCharacters(prev => new Set(prev).add(activeCharacterId));
      addLogMessage(`${activeCharacterId} takes a defensive stance!`, 'system');
      console.log('✋ Defensive stance activated - damage reduced by 50% this turn');
    }
  }, [activeCharacterId, activeActionState, actionStates, addLogMessage]);

  // Handle power selection
  const handleUsePower = useCallback((powerId: string) => {
    const power = equippedPowers.find(p => p.id === powerId);
    if (!power) return;

    console.log(`⚡ Selected power: ${power.name}`);
    setSelectedPower(power);
    setSelectedSpell(null);
    setActionMode('power');
    addLogMessage(`Select target for ${power.name}`, 'system');
  }, [equippedPowers, addLogMessage]);

  // Handle spell selection
  const handleCastSpell = useCallback((spellId: string) => {
    const spell = equippedSpells.find(s => s.id === spellId);
    if (!spell) return;

    console.log(`✨ Selected spell: ${spell.name}`);
    setSelectedSpell(spell);
    setSelectedPower(null);
    setActionMode('spell');
    addLogMessage(`Select target for ${spell.name}`, 'system');
  }, [equippedSpells, addLogMessage]);

  // Execute power on target
  const executePowerOnTarget = useCallback((
    targetCharacterId: string,
    providedPower?: any,
    providedCharacterId?: string,
    providedActionState?: CharacterActionState
  ): { success: boolean; newState?: CharacterActionState } => {
    const power = providedPower || selectedPower;
    const charId = providedCharacterId || activeCharacterId;
    const charActionState = providedActionState || activeActionState;

    if (!power || !charId || !charActionState) {
      return { success: false };
    }

    const apCost = power.current_rank;

    // Check if enough AP
    if (charActionState.actionPointsRemaining < apCost) {
      addLogMessage(`Not enough AP to use ${power.name}!`, 'system');
      return { success: false };
    }

    console.log(`⚡ Using ${power.name} on ${targetCharacterId}`);

    // Deduct AP through HexMovementEngine
    const powerAction: ExecutedAction = {
      type: 'power',
      apCost,
      targetCharacterId,
      abilityId: power.id
    };

    const result = HexMovementEngine.executeAction(charActionState, powerAction);
    if (!result.success) {
      console.log(`❌ Failed to execute power: ${result.reason}`);
      return { success: false };
    }

    // Update global state only if not provided (UI flow)
    if (!providedActionState) {
      const newStates = new Map(actionStates);
      newStates.set(charId, result.newState);
      setActionStates(newStates);
    }

    // Set cooldown
    setPowerCooldowns(prev => ({
      ...prev,
      [power.id]: power.cooldown
    }));

    // Send socket event to backend
    battleWebSocket.usePower(power.id, targetCharacterId);

    // Local simulation for immediate feedback (server will override)
    addLogMessage(`${charId} uses ${power.name}!`, 'attack');

    // Clear selection only in UI mode
    if (!providedPower) {
      setSelectedPower(null);
      setActionMode(null);
    }

    return { success: true, newState: result.newState };
  }, [selectedPower, activeCharacterId, activeActionState, actionStates, addLogMessage]);

  // Execute spell on target
  const executeSpellOnTarget = useCallback((
    targetCharacterId: string,
    providedSpell?: any,
    providedCharacterId?: string,
    providedActionState?: CharacterActionState
  ): { success: boolean; newState?: CharacterActionState } => {
    const spell = providedSpell || selectedSpell;
    const charId = providedCharacterId || activeCharacterId;
    const charActionState = providedActionState || activeActionState;

    if (!spell || !charId || !charActionState) {
      return { success: false };
    }

    const apCost = spell.current_rank;

    // Check if enough AP
    if (charActionState.actionPointsRemaining < apCost) {
      addLogMessage(`Not enough AP to cast ${spell.name}!`, 'system');
      return { success: false };
    }

    console.log(`✨ Casting ${spell.name} on ${targetCharacterId}`);

    // Deduct AP through HexMovementEngine
    const spellAction: ExecutedAction = {
      type: 'spell',
      apCost,
      targetCharacterId,
      abilityId: spell.id
    };

    const result = HexMovementEngine.executeAction(charActionState, spellAction);
    if (!result.success) {
      console.log(`❌ Failed to execute spell: ${result.reason}`);
      return { success: false };
    }

    // Update global state only if not provided (UI flow)
    if (!providedActionState) {
      const newStates = new Map(actionStates);
      newStates.set(charId, result.newState);
      setActionStates(newStates);
    }

    // Set cooldown
    setSpellCooldowns(prev => ({
      ...prev,
      [spell.id]: spell.cooldown_turns
    }));

    // Send socket event to backend
    battleWebSocket.castSpell(spell.id, targetCharacterId);

    // Local simulation for immediate feedback (server will override)
    addLogMessage(`${charId} casts ${spell.name}!`, 'attack');

    // Clear selection only in UI mode
    if (!providedSpell) {
      setSelectedSpell(null);
      setActionMode(null);
    }

    return { success: true, newState: result.newState };
  }, [selectedSpell, activeCharacterId, activeActionState, actionStates, addLogMessage]);
  // Initialize hex grid
  const [grid, setGrid] = useState<HexBattleGrid>(() => HexGridSystem.initializeBattleGrid());

  // Character action states
  const [actionStates, setActionStates] = useState<Map<string, CharacterActionState>>(new Map());

  // Selection state
  const [selectedHex, setSelectedHex] = useState<HexPosition | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexPosition | null>(null);
  const [actionMode, setActionMode] = useState<'move' | 'attack' | 'power' | 'spell' | null>(null);

  // Initialize character positions - must re-run when characters change
  useEffect(() => {
    if (userCharacters.length === 0 || opponentCharacters.length === 0) {
      console.warn('⚠️ Cannot initialize positions - teams not loaded yet');
      return;
    }

    const newGrid = { ...grid };
    const team1Positions = HexGridSystem.getTeam1StartPositions();
    const team2Positions = HexGridSystem.getTeam2StartPositions();

    console.log('📍 Setting character positions...');
    userCharacters.forEach((char, index) => {
      newGrid.characterPositions.set(char.id, team1Positions[index]);
      console.log(`  User ${char.name} at`, team1Positions[index]);
    });

    opponentCharacters.forEach((char, index) => {
      newGrid.characterPositions.set(char.id, team2Positions[index]);
      console.log(`  Opponent ${char.name} at`, team2Positions[index]);
    });

    setGrid(newGrid);
    console.log('✅ Grid initialized with', newGrid.characterPositions.size, 'characters');
  }, [userCharacters.length, opponentCharacters.length]);

  // Initialize action states for active character
  useEffect(() => {
    if (activeCharacterId && !actionStates.has(activeCharacterId)) {
      const newStates = new Map(actionStates);
      newStates.set(activeCharacterId, HexMovementEngine.initializeActionState(activeCharacterId));
      setActionStates(newStates);
    }
  }, [activeCharacterId]);

  // Get active character position
  const activeCharacterPos = activeCharacterId ? grid.characterPositions.get(activeCharacterId) : null;
  const activeActionState = activeCharacterId ? actionStates.get(activeCharacterId) : null;

  // Calculate reachable hexes for movement
  const reachableHexes = activeCharacterPos && activeActionState && actionMode === 'move'
    ? HexMovementEngine.getReachableHexes(
        activeCharacterId!,
        activeCharacterPos,
        activeActionState.actionPointsRemaining,
        grid
      )
    : [];

  // Calculate attackable characters using weapon range
  const attackableCharacters = activeCharacterPos && activeActionState && actionMode === 'attack'
    ? (() => {
        // Get active character's weapon range
        const activeChar = [...userCharacters, ...opponentCharacters].find(c => c.id === activeCharacterId);
        const weaponEquipment = activeChar?.equipment?.find(e => e.slot === 'weapon');
        const weaponType = weaponEquipment?.type || 'sword';
        const weaponRange = getWeaponRange(weaponType as string, weaponEquipment?.range);

        console.log(`🎯 ${activeChar?.name} weapon range: ${weaponRange} hexes (${weaponType})`);

        return HexLineOfSight.getVisibleCharacters(
          activeCharacterPos,
          weaponRange, // Use character's actual weapon range!
          grid,
          [activeCharacterId!]
        ).filter(visible => {
          // Only allow attacks on opponent team
          const isOpponentTeam = currentTurn === 'user'
            ? opponentCharacters.some(c => c.id === visible.characterId)
            : userCharacters.some(c => c.id === visible.characterId);
          return isOpponentTeam;
        });
      })()
    : [];

  // Handle hex click
  const handleHexClick = useCallback((hexPos: HexPosition) => {
    if (!activeCharacterId || !activeCharacterPos || !activeActionState) return;

    if (actionMode === 'move') {
      // Check if hex is reachable
      const isReachable = reachableHexes.some(hex => HexGridSystem.equals(hex, hexPos));

      if (isReachable) {
        const validation = HexMovementEngine.canMoveTo(
          activeCharacterId,
          activeCharacterPos,
          hexPos,
          grid,
          activeActionState.actionPointsRemaining
        );

        if (validation.valid) {
          handleMoveCharacter(activeCharacterId, hexPos);

          // Update grid and action state
          const newGrid = { ...grid };
          newGrid.characterPositions.set(activeCharacterId, hexPos);
          setGrid(newGrid);

          const moveAction = {
            type: 'move' as const,
            apCost: validation.apCost,
            targetHex: hexPos
          };

          const result = HexMovementEngine.executeAction(activeActionState, moveAction);
          if (result.success) {
            const newStates = new Map(actionStates);
            newStates.set(activeCharacterId, result.newState);
            setActionStates(newStates);
          }

          setActionMode(null);
        }
      }
    } else if (actionMode === 'attack') {
      // Check if clicking on a character hex
      for (const [charId, charPos] of grid.characterPositions) {
        if (HexGridSystem.equals(charPos, hexPos)) {
          const canAttack = attackableCharacters.some(a => a.characterId === charId);

          if (canAttack) {
            handleAttackCharacter(activeCharacterId, charId);

            // Execute attack action
            const attackAction = {
              type: 'attack' as const,
              apCost: 2,
              targetCharacterId: charId
            };

            const result = HexMovementEngine.executeAction(activeActionState, attackAction);
            if (result.success) {
              const newStates = new Map(actionStates);
              newStates.set(activeCharacterId, result.newState);
              setActionStates(newStates);
            }

            setActionMode(null);
          }
        }
      }
    }

    setSelectedHex(hexPos);
  }, [activeCharacterId, activeCharacterPos, activeActionState, actionMode, reachableHexes, attackableCharacters, grid]);

  // Handle character token click
  const handleCharacterClick = useCallback((characterId: string) => {
    if (actionMode === 'attack' && activeCharacterId) {
      const canAttack = attackableCharacters.some(a => a.characterId === characterId);
      if (canAttack) {
        handleAttackCharacter(activeCharacterId, characterId);
        setActionMode(null);
      }
    } else if (actionMode === 'power' && activeCharacterId) {
      // Use power on clicked character
      executePowerOnTarget(characterId);
    } else if (actionMode === 'spell' && activeCharacterId) {
      // Cast spell on clicked character
      executeSpellOnTarget(characterId);
    }
  }, [actionMode, activeCharacterId, attackableCharacters, handleAttackCharacter, executePowerOnTarget, executeSpellOnTarget]);

  // Debug render state
  console.log('🎨 Rendering HexBattleArena:', {
    userCount: userCharacters.length,
    opponentCount: opponentCharacters.length,
    gridCharacters: grid.characterPositions.size,
    activeCharacterId,
    currentTurn,
    turnOrderLength: turnOrder.length
  });

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Panel: Hex Grid */}
      <div className="w-2/3 relative bg-gray-800 p-8">
        <HexGrid
          grid={grid}
          hexSize={30}
          onHexClick={handleHexClick}
          onHexHover={setHoveredHex}
          selectedHex={selectedHex}
          hoveredHex={hoveredHex}
        />

        {/* Character Tokens */}
        {[...userCharacters, ...opponentCharacters].map(character => {
          const position = grid.characterPositions.get(character.id);
          if (!position) return null;

          return (
            <CharacterToken
              key={character.id}
              character={character}
              position={position}
              hexSize={30}
              isActive={character.id === activeCharacterId}
              isUserTeam={userCharacters.some(c => c.id === character.id)}
              onClick={() => handleCharacterClick(character.id)}
            />
          );
        })}

        {/* Action Overlay */}
        <ActionOverlay
          grid={grid}
          hexSize={30}
          reachableHexes={actionMode === 'move' ? reachableHexes : []}
          attackablePositions={actionMode === 'attack' ? attackableCharacters.map(a => a.position) : []}
          hoveredHex={hoveredHex}
          activeCharacterPos={activeCharacterPos}
        />

        {/* Floating Damage Numbers */}
        {floatingNumbers.map(floatingNum => {
          const pixelPos = HexGridSystem.hexToPixel(floatingNum.position, 30);
          return (
            <div
              key={floatingNum.id}
              className="absolute pointer-events-none z-50 animate-float-up"
              style={{
                left: `${pixelPos.x}px`,
                top: `${pixelPos.y}px`,
                transform: 'translate(-50%, -50%)',
                animation: 'floatUp 1.5s ease-out forwards'
              }}
            >
              <div
                className={`text-2xl font-bold drop-shadow-lg ${
                  floatingNum.type === 'crit' ? 'text-yellow-300 scale-150' :
                  floatingNum.type === 'dodge' ? 'text-blue-300' :
                  floatingNum.type === 'heal' ? 'text-green-300' :
                  'text-red-400'
                }`}
              >
                {floatingNum.type === 'dodge' ? 'DODGE!' :
                 floatingNum.type === 'crit' ? `${floatingNum.damage}!` :
                 floatingNum.damage}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Panel: Battle Monitor */}
      <div className="w-1/3 bg-gray-900 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Battle Monitor</h2>

        {/* Current Turn Indicator */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-400 mb-1">Current Turn</div>
          <div className={`text-xl font-bold ${currentTurn === 'user' ? 'text-blue-400' : 'text-red-400'}`}>
            {currentTurn === 'user' ? 'Your Team' : 'Opponent Team'}
          </div>
        </div>

        {/* Active Character AP */}
        {activeCharacterId && activeActionState && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="text-sm text-gray-400 mb-1">Action Points</div>
            <div className="flex items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded ${
                    i < activeActionState.actionPointsRemaining
                      ? 'bg-green-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
              <span className="text-white ml-2">
                {activeActionState.actionPointsRemaining} / 3
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {activeCharacterId && activeActionState && (
          <div className="space-y-2 mb-4">
            <button
              onClick={() => setActionMode(actionMode === 'move' ? null : 'move')}
              disabled={!activeActionState.canMove}
              className={`w-full py-3 rounded-lg font-semibold ${
                actionMode === 'move'
                  ? 'bg-green-600 text-white'
                  : activeActionState.canMove
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Move (1 AP/hex)
            </button>

            <button
              onClick={() => setActionMode(actionMode === 'attack' ? null : 'attack')}
              disabled={!activeActionState.canAttack}
              className={`w-full py-3 rounded-lg font-semibold ${
                actionMode === 'attack'
                  ? 'bg-red-600 text-white'
                  : activeActionState.canAttack
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Attack (2 AP)
            </button>

            <button
              onClick={handleDefend}
              disabled={!activeActionState.canDefend}
              className={`w-full py-3 rounded-lg font-semibold ${
                activeActionState.canDefend
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              🛡️ Defend (1 AP)
            </button>

            <button
              onClick={onEndTurn}
              className="w-full py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              End Turn
            </button>
          </div>
        )}

        {/* Powers & Spells Panel */}
        {activeCharacterId && activeActionState && (() => {
          const activeChar = [...userCharacters, ...opponentCharacters].find(c => c.id === activeCharacterId);
          if (!activeChar) return null;

          return (
            <PowersSpellsPanel
              equippedPowers={equippedPowers}
              equippedSpells={equippedSpells}
              powerCooldowns={powerCooldowns}
              spellCooldowns={spellCooldowns}
              currentAP={activeActionState.actionPointsRemaining}
              maxAP={3}
              currentMana={activeChar.currentMana}
              maxMana={activeChar.maxMana}
              onUsePower={handleUsePower}
              onCastSpell={handleCastSpell}
              disabled={battleEnded}
            />
          );
        })()}

        {/* Team Status */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Your Team</h3>
            {userCharacters.map(char => {
              const battleState = getBattleState(char.id);
              const currentHp = battleState?.currentHp ?? char.currentHp;
              const maxHp = battleState?.maxHp ?? char.maxHp;
              const isKnockedOut = battleState?.isKnockedOut ?? false;

              return (
                <div key={char.id} className={`bg-gray-800 rounded p-3 mb-2 ${isKnockedOut ? 'opacity-50' : ''}`}>
                  <div className="font-semibold text-white">
                    {char.name} {isKnockedOut && '💀'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentHp > maxHp * 0.5 ? 'bg-green-500' :
                          currentHp > maxHp * 0.25 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(currentHp / maxHp) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">
                      {currentHp}/{maxHp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Opponent Team</h3>
            {opponentCharacters.map(char => {
              const battleState = getBattleState(char.id);
              const currentHp = battleState?.currentHp ?? char.currentHp;
              const maxHp = battleState?.maxHp ?? char.maxHp;
              const isKnockedOut = battleState?.isKnockedOut ?? false;

              return (
                <div key={char.id} className={`bg-gray-800 rounded p-3 mb-2 ${isKnockedOut ? 'opacity-50' : ''}`}>
                  <div className="font-semibold text-white">
                    {char.name} {isKnockedOut && '💀'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentHp > maxHp * 0.5 ? 'bg-red-500' :
                          currentHp > maxHp * 0.25 ? 'bg-orange-500' :
                          'bg-red-800'
                        }`}
                        style={{ width: `${(currentHp / maxHp) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">
                      {currentHp}/{maxHp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Battle Log */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-purple-400 mb-2">Battle Log</h3>
          <div ref={battleLogRef} className="bg-gray-800 rounded-lg p-3 h-64 overflow-y-auto">
            {battleLog.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                Battle log will appear here...
              </div>
            ) : (
              <div className="space-y-1">
                {battleLog.map(entry => (
                  <div
                    key={entry.id}
                    className={`text-sm p-2 rounded ${
                      entry.type === 'crit' ? 'bg-yellow-900/30 text-yellow-300 font-bold' :
                      entry.type === 'dodge' ? 'bg-blue-900/30 text-blue-300' :
                      entry.type === 'knockout' ? 'bg-red-900/30 text-red-300 font-bold' :
                      entry.type === 'turn' ? 'bg-purple-900/30 text-purple-300 font-semibold' :
                      entry.type === 'attack' ? 'bg-orange-900/30 text-orange-300' :
                      'text-gray-300'
                    }`}
                  >
                    {entry.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Character Action Planner */}
      {showActionPlanner && activeCharacterId && (() => {
        const activeChar = userCharacters.find(c => c.id === activeCharacterId);
        if (!activeChar) return null;

        const activeCharPos = grid.characterPositions.get(activeCharacterId);
        if (!activeCharPos) return null;

        // Get reachable hexes for planning (3 AP max)
        const planningReachableHexes = HexMovementEngine.getReachableHexes(
          activeCharacterId,
          activeCharPos,
          3,
          grid
        );

        // Convert TeamCharacter to BattleCharacter format
        const battleChar = {
          character: {
            id: activeChar.id,
            name: activeChar.name,
            level: activeChar.level,
            archetype: activeChar.archetype
          },
          currentHealth: activeChar.currentHp,
          maxHealth: activeChar.maxHp,
          currentMana: activeChar.currentMana,
          maxMana: activeChar.maxMana,
          unlockedPowers: activeChar.equippedPowers,
          unlockedSpells: activeChar.equippedSpells,
          powerCooldowns: new Map(Object.entries(powerCooldowns)),
          spellCooldowns: new Map(Object.entries(spellCooldowns))
        };

        const enemyBattleChars = opponentCharacters.map(opp => {
          const oppBattleState = getBattleState(opp.id);
          return {
            character: {
              id: opp.id,
              name: opp.name,
              level: opp.level,
              archetype: opp.archetype
            },
            currentHealth: oppBattleState ? oppBattleState.currentHp : opp.currentHp,
            maxHealth: opp.maxHp
          };
        });

        const allyBattleChars = userCharacters
          .filter(c => c.id !== activeCharacterId)
          .map(ally => {
            const allyBattleState = getBattleState(ally.id);
            return {
              character: {
                id: ally.id,
                name: ally.name,
                level: ally.level,
                archetype: ally.archetype
              },
              currentHealth: allyBattleState ? allyBattleState.currentHp : ally.currentHp,
              maxHealth: ally.maxHp
            };
          });

        return (
          <CharacterActionPlanner
            character={battleChar}
            enemyCharacters={enemyBattleChars}
            allyCharacters={allyBattleChars}
            currentHex={activeCharPos}
            reachableHexes={planningReachableHexes}
            grid={grid}
            onClose={() => setShowActionPlanner(false)}
            onSavePlan={handlePlanSubmit}
            existingPlan={characterPlans.get(activeCharacterId)}
          />
        );
      })()}

      {/* Victory/Defeat Screen */}
      {battleEnded && battleResult && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border-4 p-8 max-w-md w-full text-center"
               style={{
                 borderColor: battleResult.winner === 'user' ? '#10b981' : '#ef4444'
               }}>
            {/* Result Header */}
            <div className="text-6xl mb-4">
              {battleResult.winner === 'user' ? '🎉' : '💀'}
            </div>
            <h2 className={`text-4xl font-bold mb-4 ${
              battleResult.winner === 'user' ? 'text-green-400' : 'text-red-400'
            }`}>
              {battleResult.winner === 'user' ? 'VICTORY!' : 'DEFEAT!'}
            </h2>

            {/* Stats */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Your Team HP:</span>
                <span className={`font-bold ${battleResult.userHealth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {battleResult.userHealth}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Enemy Team HP:</span>
                <span className={`font-bold ${battleResult.opponentHealth > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {battleResult.opponentHealth}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => window.location.reload()}
              className={`w-full py-3 rounded-lg font-semibold text-white ${
                battleResult.winner === 'user'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Return to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
