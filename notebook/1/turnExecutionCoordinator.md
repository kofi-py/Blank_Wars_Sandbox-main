// Turn Execution Coordinator
// Orchestrates the flow of a single character's turn
// Integrates adherence checks, action surveys, and Plan B logic

import { type BattleCharacter, type BattleState } from '@/data/battleFlow';
import { type PlannedAction, type ActionStep } from '@/components/battle/CharacterActionPlanner';
import { performAdherenceCheck, type AdherenceCheckResult } from './adherenceCheckSystem';
import {
  generateActionSurvey,
  applyPlanBWeighting,
  selectFromSurvey,
  type SurveyOption
} from './actionSurveyGenerator';

export interface TurnExecutionResult {
  characterId: string;
  adherenceCheck: AdherenceCheckResult;
  plannedAction: ActionStep | null;
  actualAction: ActionStep | SurveyOption;
  actionSource: 'plan_executed' | 'plan_b_adaptation' | 'rebellion';
  reasoning: string;
}

export interface BattleContext {
  teamWinning: boolean;
  roundNumber: number;
  teammatesAlive: number;
  teammatesTotal: number;
}

/**
 * Execute a character's turn with full adherence system
 * This is the main entry point for turn logic
 */
export function executeTurn(
  character: BattleCharacter,
  plan: PlannedAction | null,
  battleState: BattleState,
  battleContext: BattleContext
): TurnExecutionResult {

  // If no plan exists, character acts autonomously
  if (!plan || plan.actionSequence.length === 0) {
    return executeAutonomousTurn(character, battleState, battleContext);
  }

  // Step 1: Perform Adherence Check
  const adherenceCheck = performAdherenceCheck(character, battleContext);

  if (adherenceCheck.passed) {
    // Character will TRY to follow the plan
    return executeWithAdherence(character, plan, battleState, battleContext, adherenceCheck);
  } else {
    // Character rebels - ignores coach completely
    return executeRebellion(character, plan, battleState, battleContext, adherenceCheck);
  }
}

/**
 * Character passed adherence - tries to execute planned action
 */
function executeWithAdherence(
  character: BattleCharacter,
  plan: PlannedAction,
  battleState: BattleState,
  battleContext: BattleContext,
  adherenceCheck: AdherenceCheckResult
): TurnExecutionResult {

  const plannedAction = plan.actionSequence[0]; // First action in sequence

  // Check if planned action is still available
  const actionAvailable = checkActionAvailability(plannedAction, character, battleState);

  if (actionAvailable.available) {
    // Execute plan as-is
    return {
      characterId: character.character.id,
      adherenceCheck,
      plannedAction,
      actualAction: plannedAction,
      actionSource: 'plan_executed',
      reasoning: `${character.character.name} successfully executes the planned action.`
    };
  } else {
    // Planned action unavailable - use Plan B
    const survey = generateActionSurvey(character, battleState, 3);
    const weightedSurvey = applyPlanBWeighting(survey, plan.planB);
    const selectedAction = selectFromSurvey(weightedSurvey);

    return {
      characterId: character.character.id,
      adherenceCheck,
      plannedAction,
      actualAction: selectedAction,
      actionSource: 'plan_b_adaptation',
      reasoning: `${character.character.name} couldn't execute planned action (${actionAvailable.reason}). Adapted using Plan B (${plan.planB}): ${selectedAction.label}`
    };
  }
}

/**
 * Character failed adherence - rebels and picks own action
 */
function executeRebellion(
  character: BattleCharacter,
  plan: PlannedAction,
  battleState: BattleState,
  battleContext: BattleContext,
  adherenceCheck: AdherenceCheckResult
): TurnExecutionResult {

  // Generate full action survey
  const survey = generateActionSurvey(character, battleState, 3);

  // Select based on character's personality/mental state (not Plan B)
  const selectedAction = selectByPersonality(survey, character);

  return {
    characterId: character.character.id,
    adherenceCheck,
    plannedAction: plan.actionSequence[0] || null,
    actualAction: selectedAction,
    actionSource: 'rebellion',
    reasoning: `${character.character.name} rejects the coach's plan. ${adherenceCheck.reasoning} Chooses to: ${selectedAction.label}`
  };
}

/**
 * Character has no plan - acts based on AI/personality
 */
function executeAutonomousTurn(
  character: BattleCharacter,
  battleState: BattleState,
  battleContext: BattleContext
): TurnExecutionResult {

  const survey = generateActionSurvey(character, battleState, 3);
  const selectedAction = selectByPersonality(survey, character);

  // Create a mock adherence check (always "pass" since no plan to rebel against)
  const mockAdherenceCheck: AdherenceCheckResult = {
    passed: true,
    rollValue: 50,
    threshold: 100,
    factors: {
      baseAdherence: 0,
      mentalHealthModifier: 0,
      stressModifier: 0,
      teamTrustModifier: 0,
      battleContextModifier: 0,
      totalModifier: 0,
      finalThreshold: 100
    },
    reasoning: 'No plan set - character acts autonomously'
  };

  return {
    characterId: character.character.id,
    adherenceCheck: mockAdherenceCheck,
    plannedAction: null,
    actualAction: selectedAction,
    actionSource: 'rebellion', // Technically autonomous, but uses same selection logic
    reasoning: `${character.character.name} has no plan and acts independently: ${selectedAction.label}`
  };
}

/**
 * Check if a planned action is still available to execute
 */
function checkActionAvailability(
  action: ActionStep,
  character: BattleCharacter,
  battleState: BattleState
): { available: boolean; reason?: string } {

  switch (action.type) {
    case 'move':
      if (!action.targetHex) {
        return { available: false, reason: 'No target hex specified' };
      }
      // Check if hex is occupied
      // TODO: Implement actual hex occupancy check
      return { available: true };

    case 'attack':
      if (!action.targetId) {
        return { available: false, reason: 'No target specified' };
      }
      // Check if target is alive
      const target = findCharacterById(action.targetId, battleState);
      if (!target || target.currentHealth <= 0) {
        return { available: false, reason: 'Target is dead or not found' };
      }
      return { available: true };

    case 'power':
      if (!action.abilityId) {
        return { available: false, reason: 'No power specified' };
      }
      // Check cooldown
      const powerCooldown = character.powerCooldowns.get(action.abilityId) || 0;
      if (powerCooldown > 0) {
        return { available: false, reason: `${action.abilityName} is on cooldown (${powerCooldown} turns)` };
      }
      // Check target
      if (!action.targetId) {
        return { available: false, reason: 'No target specified' };
      }
      const powerTarget = findCharacterById(action.targetId, battleState);
      if (!powerTarget || powerTarget.currentHealth <= 0) {
        return { available: false, reason: 'Target is dead' };
      }
      return { available: true };

    case 'spell':
      if (!action.abilityId) {
        return { available: false, reason: 'No spell specified' };
      }
      // Check cooldown
      const spellCooldown = character.spellCooldowns.get(action.abilityId) || 0;
      if (spellCooldown > 0) {
        return { available: false, reason: `${action.abilityName} is on cooldown (${spellCooldown} turns)` };
      }
      // Check mana
      const spell = character.unlockedSpells.find(s => s.id === action.abilityId);
      if (spell && character.currentMana < spell.mana_cost) {
        return { available: false, reason: 'Not enough mana' };
      }
      // Check target
      if (!action.targetId) {
        return { available: false, reason: 'No target specified' };
      }
      const spellTarget = findCharacterById(action.targetId, battleState);
      if (!spellTarget || spellTarget.currentHealth <= 0) {
        return { available: false, reason: 'Target is dead' };
      }
      return { available: true };

    case 'defend':
      return { available: true };

    case 'item':
      // TODO: Implement item availability check
      return { available: true };

    default:
      return { available: false, reason: 'Unknown action type' };
  }
}

/**
 * Select action based on character personality and mental state
 * Used during rebellion or autonomous action
 */
function selectByPersonality(
  survey: { options: SurveyOption[] },
  character: BattleCharacter
): SurveyOption {

  // Weight options based on character's mental state and personality
  const weightedOptions = survey.options.map(option => {
    let weight = option.priorityWeight || 0;

    // High stress → prefer defensive/flee options
    if (character.mentalState.stress > 70) {
      if (option.type === 'defend') weight += 40;
      if (option.id === 'chaos_flee') weight += 30;
      if (option.id === 'chaos_refuse') weight += 20;
    }

    // Low mental health → erratic behavior
    if (character.mentalState.currentMentalHealth < 30) {
      if (option.id.startsWith('chaos_')) weight += 25;
    }

    // Low team trust → may attack teammates
    if (character.mentalState.teamTrust < 20) {
      if (option.id.startsWith('chaos_friendly_fire')) weight += 30;
    }

    // High confidence → prefer aggressive actions
    if (character.mentalState.confidence > 70) {
      if (option.type === 'attack') weight += 20;
      if (option.abilityType === 'power_attack') weight += 30;
    }

    return {
      ...option,
      priorityWeight: weight
    };
  });

  // Select from weighted options
  const minWeight = Math.min(...weightedOptions.map(o => o.priorityWeight));
  const normalized = weightedOptions.map(o => ({
    ...o,
    normalizedWeight: o.priorityWeight - minWeight + 1
  }));

  const totalWeight = normalized.reduce((sum, o) => sum + o.normalizedWeight, 0);
  let random = Math.random() * totalWeight;

  for (const option of normalized) {
    random -= option.normalizedWeight;
    if (random <= 0) {
      return option;
    }
  }

  return weightedOptions[0];
}

/**
 * Find a character by ID across both teams
 */
function findCharacterById(
  id: string,
  battleState: BattleState
): BattleCharacter | null {

  const playerChar = battleState.teams.player.characters.find(c => c.character.id === id);
  if (playerChar) return playerChar;

  const opponentChar = battleState.teams.opponent.characters.find(c => c.character.id === id);
  if (opponentChar) return opponentChar;

  return null;
}
