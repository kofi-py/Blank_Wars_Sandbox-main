/**
 * Battle Turn Service
 *
 * Orchestrates a character's turn in battle:
 * 1. Pre-generate rebellion choice (async while coach thinks)
 * 2. Receive coach order
 * 3. Perform adherence check
 * 4. PASS: Generate declaration, execute coach's order
 * 5. FAIL: Use rebellion choice, get judge ruling, create memory
 * 6. Persist to battle_actions with all new fields
 *
 * This is the core of the coach-order-per-turn model.
 * See: docs/gameplans/002-battle-rebellion-flow.md
 */

import OpenAI from 'openai';
import { query } from '../database/index';

import {
  ReconstructedState,
  persistBattleAction,
} from './battleStateReconstructor';

import {
  executeAction,
  BattleActionRequest,
  BattleActionResult,
  AttackActionRequest,
  PowerActionRequest,
  SpellActionRequest,
  DefendActionRequest,
} from './battleActionExecutor';

import {
  checkBattleAdherence,
  BattleState as AdherenceBattleState,
} from './battleAdherenceService';

import {
  generateActionOptions as generateAllPossibleActions,
  getRebellionOptions,
  formatOptionsForPrompt,
  findOptionById,
  BattleActionOption as ActionOption,
  CoachOrder,
} from './battleActionOptionsService';

// Re-export types for consumers
export { CoachOrder, ActionOption };

import { assemblePrompt } from './prompts/assembler';
import type {
  BattleStateContext,
  BattleTeammate,
  BattleEnemy,
  CoachOrderContext,
  RebellionContext,
  BattleBuildOptions,
} from './prompts/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== TYPES =====

export interface TurnExecutionResult {
  success: boolean;
  character_id: string;
  action_type: string;
  action_result: BattleActionResult;
  declaration: string;
  is_rebellion: boolean;
  adherence: {
    roll: number;
    threshold: number;
    passed: boolean;
    modifiers: AdherenceModifiers;
  };
  rebellion_details?: {
    type: string;
    coach_order: CoachOrder;
    chosen_action: ActionOption;
    judge_ruling?: JudgeRuling;
  };
  error?: string;
}

export interface AdherenceModifiers {
  hp_percent: number;
  team_winning: boolean;
  ko_penalty: number;
}

export interface JudgeRuling {
  judge_id: string;
  verdict: 'approved' | 'tolerated' | 'penalized' | 'severely_penalized';
  commentary: string;
  mechanical_effects: {
    points_change: number;
    debuffs: string[];
  };
}

export interface RebellionChoice {
  chosen_action: ActionOption;
  declaration: string;
  rebellion_type: string;
}

// ===== PRE-GENERATION =====

/**
 * Pre-generate rebellion choice while coach is thinking.
 * Called at turn start, runs async.
 */
export async function preGenerateRebellion(
  state: ReconstructedState,
  character_id: string,
  coach_order: CoachOrder
): Promise<RebellionChoice | null> {
  try {
    const options = await generateAllPossibleActions(character_id, state.context, coach_order);
    const rebellion_options = getRebellionOptions(options);

    if (rebellion_options.length === 0) {
      console.log(`[REBELLION] No rebellion options available for ${character_id}`);
      return null;
    }

    // Get character's userchar_id for prompt assembly
    const character = state.context.characters.get(character_id);
    if (!character) {
      console.error(`[REBELLION] Character ${character_id} not found`);
      return null;
    }

    const userchar_id = character.id; // This IS the userchar_id

    // Build structured battle context for the domain
    const battle_state_context = buildBattleStateContext(state, character_id);
    const coach_order_context = buildCoachOrderContext(coach_order, state);
    const options_list = formatOptionsForPrompt(rebellion_options);

    // Assemble prompt using the battle domain with rebellion context
    const prompt = await assemblePrompt({
      userchar_id: userchar_id,
      domain: 'battle',
      role: 'combatant',
      role_type: 'contestant',
      conversation_history: '',
      battle_options: {
        role: 'combatant',
        battle_state: battle_state_context,
        coach_order: coach_order_context,
        is_rebellion: true,
        rebellion_options: options_list.split('\n'),
      },
    });

    // User message just triggers the response - context is in system prompt
    const user_message = 'Make your rebellion choice now.';

    // Call LLM with JSON response format
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system_prompt },
        { role: 'user', content: user_message }
      ],
      max_tokens: 200,
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('[REBELLION] OpenAI returned empty content');
    }

    // Parse JSON response - NO FALLBACK
    const parsed = JSON.parse(content);

    // DEBUG: Log what LLM actually returned
    console.log('[REBELLION] LLM Response:', JSON.stringify(parsed, null, 2));

    if (parsed.chosen_option === undefined) {
      throw new Error(`[REBELLION] Response missing chosen_option field. Got: ${JSON.stringify(parsed)}`);
    }
    if (!parsed.declaration) {
      throw new Error('[REBELLION] Response missing declaration field');
    }
    if (!parsed.rebellion_type) {
      throw new Error('[REBELLION] Response missing rebellion_type field');
    }

    const chosen_action = findOptionById(rebellion_options, parsed.chosen_option);
    if (!chosen_action) {
      throw new Error(`[REBELLION] Invalid option ID: ${parsed.chosen_option} - not in available options`);
    }

    return {
      chosen_action,
      declaration: parsed.declaration,
      rebellion_type: parsed.rebellion_type
    };

  } catch (error) {
    // NO FALLBACK - fail loudly
    console.error('[REBELLION] Pre-generation FAILED - no fallback:', error);
    throw error;
  }
}

// ===== DECLARATION GENERATION =====

/**
 * Generate in-character declaration for following coach's order.
 */
async function generatePassDeclaration(
  state: ReconstructedState,
  character_id: string,
  coach_order: CoachOrder
): Promise<string> {
  try {
    const character = state.context.characters.get(character_id);
    if (!character) {
      throw new Error(`STRICT MODE: Character ${character_id} not found for pass declaration`);
    }

    // Build structured battle context for the domain
    const battle_state_context = buildBattleStateContext(state, character_id);
    const coach_order_context = buildCoachOrderContext(coach_order, state);

    const prompt = await assemblePrompt({
      userchar_id: character.id,
      domain: 'battle',
      role: 'combatant',
      role_type: 'contestant',
      conversation_history: '',
      battle_options: {
        role: 'combatant',
        battle_state: battle_state_context,
        coach_order: coach_order_context,
        is_rebellion: false,
      },
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system_prompt },
        { role: 'user', content: 'Speak your declaration now.' }
      ],
      max_tokens: 100,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('[DECLARATION] OpenAI returned empty content');
    }

    const parsed = JSON.parse(content);
    if (!parsed.declaration) {
      throw new Error('[DECLARATION] Response missing declaration field');
    }
    return parsed.declaration;

  } catch (error) {
    // NO FALLBACK - fail loudly
    console.error('[DECLARATION] Generation FAILED - no fallback:', error);
    throw error;
  }
}

// ===== JUDGE RULING =====

/**
 * Generate judge ruling on a rebellion.
 * Uses the battle domain with role='judge'.
 */
async function generateJudgeRuling(
  battle_id: string,
  character_id: string,
  rebellion: RebellionChoice,
  coach_order: CoachOrder,
  state: ReconstructedState
): Promise<JudgeRuling | null> {
  try {
    // Get battle's assigned judge and user_id
    const battle_result = await query(
      'SELECT judge_id, user_id FROM battles WHERE id = $1',
      [battle_id]
    );

    if (!battle_result.rows[0]?.judge_id) {
      console.log('[JUDGE] No judge assigned to battle');
      return null;
    }

    const judge_id = battle_result.rows[0].judge_id;
    const battle_user_id = battle_result.rows[0].user_id;
    const character = state.context.characters.get(character_id);
    const battle_state = state.context.character_battle_state.get(character_id);

    if (!character) {
      throw new Error(`STRICT MODE: Rebel character ${character_id} not found`);
    }
    if (!battle_state) {
      throw new Error(`STRICT MODE: Character ${character_id} missing battle_state`);
    }

    // Look up the judge's userchar_id for this user
    const judge_userchar_result = await query(
      'SELECT id FROM user_characters WHERE user_id = $1 AND character_id = $2',
      [battle_user_id, judge_id]
    );

    if (!judge_userchar_result.rows[0]?.id) {
      throw new Error(`STRICT MODE: Judge ${judge_id} has no user_character for user ${battle_user_id}`);
    }

    const judge_userchar_id = judge_userchar_result.rows[0].id;

    // Build battle state context (simplified for judge - just needs battle_id and round)
    const battle_state_context = buildBattleStateContext(state, character_id);

    // Build rebellion context for judge
    const hp_percent = Math.round((battle_state.health / character.current_max_health) * 100);
    const rebellion_context: RebellionContext = {
      rebel_name: character.name,
      rebel_declaration: rebellion.declaration,
      coach_ordered: coach_order.label,
      rebel_did: rebellion.chosen_action.label,
      rebellion_type: rebellion.rebellion_type,
      rebel_health_percent: hp_percent,
    };

    // Assemble prompt using the battle domain with judge role
    const prompt = await assemblePrompt({
      userchar_id: judge_userchar_id,
      domain: 'battle',
      role: 'judge',
      role_type: 'system',
      conversation_history: '',
      battle_options: {
        role: 'judge',
        battle_state: battle_state_context,
        rebellion: rebellion_context,
      },
    });

    // User message just triggers the ruling
    const user_message = 'Make your ruling now.';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system_prompt },
        { role: 'user', content: user_message }
      ],
      max_tokens: 200,
      temperature: 0.6,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('[JUDGE] OpenAI returned empty content');
    }

    const parsed = JSON.parse(content);
    if (!parsed.verdict) {
      throw new Error(`[JUDGE] Response missing verdict field. Got: ${JSON.stringify(parsed)}`);
    }
    if (!parsed.commentary) {
      throw new Error(`[JUDGE] Response missing commentary field. Got: ${JSON.stringify(parsed)}`);
    }
    if (!parsed.mechanical_effects) {
      throw new Error(`[JUDGE] Response missing mechanical_effects field. Got: ${JSON.stringify(parsed)}`);
    }

    console.log(`⚖️ [JUDGE] ${judge_id} ruled: ${parsed.verdict}`);

    return {
      judge_id,
      verdict: parsed.verdict,
      commentary: parsed.commentary,
      mechanical_effects: parsed.mechanical_effects,
    };

  } catch (error) {
    // NO FALLBACK - fail loudly
    console.error('[JUDGE] Ruling generation FAILED - no fallback:', error);
    throw error;
  }
}

// ===== MAIN TURN EXECUTION =====

/**
 * Execute a character's turn with adherence check and declarations.
 *
 * This is the main entry point called from the socket handler.
 */
export async function executeTurn(
  state: ReconstructedState,
  character_id: string,
  coach_order: CoachOrder,
  pregenerated_rebellion?: RebellionChoice | null
): Promise<TurnExecutionResult> {
  const { context, battle_record } = state;

  // Get character data
  const character = context.characters.get(character_id);
  const battle_state = context.character_battle_state.get(character_id);

  if (!character || !battle_state) {
    return {
      success: false,
      character_id,
      action_type: coach_order.action_type,
      action_result: {
        success: false,
        action_type: coach_order.action_type as any,
        errors: ['Character not found'],
        ap_cost: 0,
        narrative: 'Character not found'
      },
      declaration: '',
      is_rebellion: false,
      adherence: { roll: 0, threshold: 0, passed: false, modifiers: { hp_percent: 0, team_winning: false, ko_penalty: 0 } },
      error: 'Character not found'
    };
  }

  // Calculate battle state for adherence check
  const adherence_battle_state: AdherenceBattleState = buildAdherenceBattleState(state, character_id);

  // Calculate Preference Modifier based on the specific order
  const preference_modifier = await getPreferenceModifierForOrder(character_id, character.archetype, coach_order);

  // Perform adherence check - reads gameplan_adherence from DB internally
  const adherence = await checkBattleAdherence(character_id, adherence_battle_state, preference_modifier);

  const adherence_modifiers: AdherenceModifiers = {
    hp_percent: adherence_battle_state.current_hp / adherence_battle_state.max_hp,
    team_winning: adherence_battle_state.team_winning,
    ko_penalty: (adherence_battle_state.teammates_total - adherence_battle_state.teammates_alive) * 10
  };

  if (adherence.passed) {
    // ===== ADHERENCE PASS FLOW =====
    return executePassFlow(state, character_id, coach_order, adherence, adherence_modifiers);
  } else {
    // ===== REBELLION FLOW =====
    return executeRebellionFlow(
      state,
      character_id,
      coach_order,
      adherence,
      adherence_modifiers,
      pregenerated_rebellion
    );
  }
}

/**
 * Execute pass flow - character follows coach's order.
 */
async function executePassFlow(
  state: ReconstructedState,
  character_id: string,
  coach_order: CoachOrder,
  adherence: { roll: number; threshold: number; passed: boolean },
  adherence_modifiers: AdherenceModifiers
): Promise<TurnExecutionResult> {
  // Generate declaration
  const declaration = await generatePassDeclaration(state, character_id, coach_order);

  // Build action request from coach order
  const action_request = buildActionRequest(state.battle_record.id, character_id, coach_order);

  // Execute action
  const action_result = await executeAction(action_request, state.context);

  // Persist to battle_actions with new fields
  await persistBattleActionWithDetails(
    state.battle_record.id,
    character_id,
    action_request,
    action_result,
    state.current_round,
    state.current_turn + 1,
    {
      declaration,
      adherence_roll: adherence.roll,
      adherence_threshold: adherence.threshold,
      is_rebellion: false
    }
  );

  return {
    success: action_result.success,
    character_id,
    action_type: action_request.action_type,
    action_result,
    declaration,
    is_rebellion: false,
    adherence: {
      roll: adherence.roll,
      threshold: adherence.threshold,
      passed: true,
      modifiers: adherence_modifiers
    }
  };
}

/**
 * Execute rebellion flow - character disobeys coach.
 */
async function executeRebellionFlow(
  state: ReconstructedState,
  character_id: string,
  coach_order: CoachOrder,
  adherence: { roll: number; threshold: number; passed: boolean },
  adherence_modifiers: AdherenceModifiers,
  pregenerated_rebellion?: RebellionChoice | null
): Promise<TurnExecutionResult> {
  // Use pregenerated rebellion or generate now
  let rebellion = pregenerated_rebellion;
  if (!rebellion) {
    rebellion = await preGenerateRebellion(state, character_id, coach_order);
  }

  if (!rebellion) {
    // Fallback: character refuses to act
    rebellion = {
      chosen_action: {
        id: 0,
        type: 'refuse',
        label: 'Refuse to act',
        ap_cost: 0,
        is_coach_order: false,
        is_valid: true
      },
      declaration: "I... I can't. Not now.",
      rebellion_type: 'refuse'
    };
  }

  // Build action request from rebellion choice
  const action_request = buildActionRequestFromOption(
    state.battle_record.id,
    character_id,
    rebellion.chosen_action
  );

  // Execute action
  const action_result = await executeAction(action_request, state.context);

  // Debug: Log action result
  if (!action_result.success) {
    console.log(`[REBELLION] Action failed:`, JSON.stringify(action_result).slice(0, 200));
  }

  // Get judge ruling
  const judge_ruling = await generateJudgeRuling(
    state.battle_record.id,
    character_id,
    rebellion,
    coach_order,
    state
  );

  // Persist judge ruling if exists
  let judge_ruling_id: number | null = null;
  if (judge_ruling) {
    console.log(`[JUDGE] Attempting to persist ruling: ${judge_ruling.verdict}`);
    try {
      const ruling_result = await query(`
        INSERT INTO judge_rulings (
          battle_id, judge_character_id, ruling_round, situation,
          ruling, reasoning, gameplay_effect, narrative_impact,
          verdict, mechanical_effects, rebel_declaration,
          character_penalized_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        state.battle_record.id,
        judge_ruling.judge_id,
        state.current_round,
        `${coach_order.label} -> ${rebellion.chosen_action.label}`,
        judge_ruling.commentary,
        `Rebellion type: ${rebellion.rebellion_type}`,
        `Points: ${judge_ruling.mechanical_effects.points_change || 0}`,
        `The judge evaluated the rebellion and issued a ${judge_ruling.verdict} verdict.`,
        judge_ruling.verdict,
        JSON.stringify(judge_ruling.mechanical_effects),
        rebellion.declaration,
        character_id
      ]);
      judge_ruling_id = ruling_result.rows[0]?.id;
      console.log(`[JUDGE] ✅ Ruling persisted with ID: ${judge_ruling_id}`);
    } catch (persistError) {
      console.error(`[JUDGE] ❌ Failed to persist ruling:`, persistError);
      throw persistError; // Re-throw - no silent failures
    }
  } else {
    console.log(`[JUDGE] No ruling to persist`);
  }

  // Build psych snapshot from character data (already validated exists above)
  const char_data = state.context.characters.get(character_id)!;
  const psych_snapshot = {
    stress: char_data.current_stress,
    mental_health: char_data.current_mental_health,
    team_trust: char_data.team_trust,
    battle_focus: char_data.battle_focus
  };

  // Persist to battle_actions with rebellion details
  await persistBattleActionWithDetails(
    state.battle_record.id,
    character_id,
    action_request,
    action_result,
    state.current_round,
    state.current_turn + 1,
    {
      declaration: rebellion.declaration,
      adherence_roll: adherence.roll,
      adherence_threshold: adherence.threshold,
      is_rebellion: true,
      rebellion_type: rebellion.rebellion_type,
      coach_order: coach_order,
      psych_snapshot: psych_snapshot,
      judge_ruling_id
    }
  );

  // Create rebellion memory (for therapy/confessional cross-domain use)
  await createRebellionMemory(
    character_id,
    state.battle_record.id,
    rebellion,
    coach_order,
    judge_ruling
  );

  return {
    success: action_result.success,
    character_id,
    action_type: action_request.action_type,
    action_result,
    declaration: rebellion.declaration,
    is_rebellion: true,
    adherence: {
      roll: adherence.roll,
      threshold: adherence.threshold,
      passed: false,
      modifiers: adherence_modifiers
    },
    rebellion_details: {
      type: rebellion.rebellion_type,
      coach_order,
      chosen_action: rebellion.chosen_action,
      judge_ruling: judge_ruling ?? undefined
    }
  };
}

// ===== HELPER FUNCTIONS =====

/**
 * Build AdherenceBattleState from ReconstructedState
 */
function buildAdherenceBattleState(
  state: ReconstructedState,
  character_id: string
): AdherenceBattleState {
  const character = state.context.characters.get(character_id);
  const battle_state = state.context.character_battle_state.get(character_id);

  // Get team info
  const my_team = getCharacterTeam(character_id, state.battle_record);
  const team_chars = my_team === 'user'
    ? state.battle_record.user_team_data.characters
    : state.battle_record.opponent_team_data.characters;

  // Count alive teammates
  const teammates_alive = team_chars.filter(c => {
    const bs = state.context.character_battle_state.get(c.id);
    return bs && !bs.is_dead && c.id !== character_id;
  }).length;

  // Determine if team is winning (simple: more alive characters)
  const enemy_team = my_team === 'user'
    ? state.battle_record.opponent_team_data.characters
    : state.battle_record.user_team_data.characters;
  const enemies_alive = enemy_team.filter(c => {
    const bs = state.context.character_battle_state.get(c.id);
    return bs && !bs.is_dead;
  }).length;

  const my_alive = teammates_alive + 1; // Include self
  const team_winning = my_alive >= enemies_alive;

  return {
    current_hp: battle_state!.health,
    max_hp: character!.current_max_health,
    team_winning,
    teammates_alive,
    teammates_total: team_chars.length - 1 // Exclude self
  };
}

function getCharacterTeam(character_id: string, battle_record: any): 'user' | 'opponent' {
  const user_ids = battle_record.user_team_data.characters.map((c: any) => c.id);
  return user_ids.includes(character_id) ? 'user' : 'opponent';
}

/**
 * Build BattleStateContext for the battle domain prompt.
 * Converts ReconstructedState into the structured context the domain expects.
 */
function buildBattleStateContext(
  state: ReconstructedState,
  character_id: string
): BattleStateContext {
  const character = state.context.characters.get(character_id);
  const battle_state = state.context.character_battle_state.get(character_id);

  if (!character) {
    throw new Error(`STRICT MODE: Character ${character_id} not found in state`);
  }
  if (!battle_state) {
    throw new Error(`STRICT MODE: Battle state for ${character_id} not found`);
  }

  // Get team info
  const my_team = getCharacterTeam(character_id, state.battle_record);
  const team_chars = my_team === 'user'
    ? state.battle_record.user_team_data.characters
    : state.battle_record.opponent_team_data.characters;
  const enemy_chars = my_team === 'user'
    ? state.battle_record.opponent_team_data.characters
    : state.battle_record.user_team_data.characters;

  // Build teammates array (exclude self)
  const teammates: BattleTeammate[] = team_chars
    .filter((c: any) => c.id !== character_id)
    .map((c: any) => {
      const bs = state.context.character_battle_state.get(c.id);
      const charData = state.context.characters.get(c.id);
      if (!charData) {
        throw new Error(`STRICT MODE: Teammate ${c.id} not found in characters map`);
      }
      if (!bs) {
        throw new Error(`STRICT MODE: Teammate ${c.id} missing battle_state`);
      }
      if (!charData.name) {
        throw new Error(`STRICT MODE: Teammate ${c.id} missing name`);
      }
      if (!charData.archetype) {
        throw new Error(`STRICT MODE: Teammate ${c.id} missing archetype`);
      }
      if (bs.health === undefined || bs.health === null) {
        throw new Error(`STRICT MODE: Teammate ${c.id} missing health`);
      }
      if (!charData.current_max_health || charData.current_max_health <= 0) {
        throw new Error(`STRICT MODE: Teammate ${c.id} missing or invalid current_max_health`);
      }
      if (bs.is_dead === undefined || bs.is_dead === null) {
        throw new Error(`STRICT MODE: Teammate ${c.id} missing is_dead flag`);
      }
      return {
        id: c.id,
        name: charData.name,
        archetype: charData.archetype,
        current_health: bs.health,
        max_health: charData.current_max_health,
        is_dead: bs.is_dead,
      };
    });

  // Build enemies array
  const enemies: BattleEnemy[] = enemy_chars.map((c: any) => {
    const bs = state.context.character_battle_state.get(c.id);
    const charData = state.context.characters.get(c.id);
    if (!charData) {
      throw new Error(`STRICT MODE: Enemy ${c.id} not found in characters map`);
    }
    if (!bs) {
      throw new Error(`STRICT MODE: Enemy ${c.id} missing battle_state`);
    }
    if (!charData.name) {
      throw new Error(`STRICT MODE: Enemy ${c.id} missing name`);
    }
    if (!charData.archetype) {
      throw new Error(`STRICT MODE: Enemy ${c.id} missing archetype`);
    }
    if (bs.health === undefined || bs.health === null) {
      throw new Error(`STRICT MODE: Enemy ${c.id} missing health`);
    }
    if (!charData.current_max_health || charData.current_max_health <= 0) {
      throw new Error(`STRICT MODE: Enemy ${c.id} missing or invalid current_max_health`);
    }
    if (bs.is_dead === undefined || bs.is_dead === null) {
      throw new Error(`STRICT MODE: Enemy ${c.id} missing is_dead flag`);
    }
    return {
      id: c.id,
      name: charData.name,
      archetype: charData.archetype,
      current_health: bs.health,
      max_health: charData.current_max_health,
      is_dead: bs.is_dead,
    };
  });

  // Calculate team winning
  const my_alive = teammates.filter(t => !t.is_dead).length + 1; // +1 for self
  const enemies_alive = enemies.filter(e => !e.is_dead).length;
  const team_winning = my_alive >= enemies_alive;

  // Build recent action context
  const recent_action = state.last_action
    ? `${state.last_action.action_type} by ${state.last_action.character_id}`
    : undefined;

  // STRICT MODE: Validate character resource fields
  // Note: battle_state only tracks health; energy/mana come from character base values
  if (battle_state.health === undefined || battle_state.health === null) {
    throw new Error(`STRICT MODE: Character ${character_id} missing health in battle_state`);
  }
  if (!character.current_max_health || character.current_max_health <= 0) {
    throw new Error(`STRICT MODE: Character ${character_id} missing or invalid current_max_health`);
  }
  if (character.current_energy === undefined || character.current_energy === null) {
    throw new Error(`STRICT MODE: Character ${character_id} missing current_energy`);
  }
  if (!character.current_max_energy || character.current_max_energy <= 0) {
    throw new Error(`STRICT MODE: Character ${character_id} missing or invalid current_max_energy`);
  }
  if (character.current_mana === undefined || character.current_mana === null) {
    throw new Error(`STRICT MODE: Character ${character_id} missing current_mana`);
  }
  if (!character.current_max_mana || character.current_max_mana <= 0) {
    throw new Error(`STRICT MODE: Character ${character_id} missing or invalid current_max_mana`);
  }

  return {
    battle_id: state.battle_record.id,
    current_round: state.current_round,
    current_turn: state.current_turn,
    character_health: battle_state.health,
    character_max_health: character.current_max_health,
    // Energy/mana not tracked in battle_state - use character base values
    character_energy: character.current_energy,
    character_max_energy: character.current_max_energy,
    character_mana: character.current_mana,
    character_max_mana: character.current_max_mana,
    teammates,
    enemies,
    team_winning,
    recent_action,
  };
}

/**
 * Build CoachOrderContext from CoachOrder for the battle domain.
 */
function buildCoachOrderContext(
  coach_order: CoachOrder,
  state: ReconstructedState
): CoachOrderContext {
  // Look up target name if target_id exists
  let target_name: string | undefined;
  if (coach_order.target_id) {
    const targetChar = state.context.characters.get(coach_order.target_id);
    target_name = targetChar?.name;
  }

  // Look up ability name if ability_id exists
  let ability_name: string | undefined;
  if (coach_order.ability_id) {
    // For now just use the label which should contain the ability name
    ability_name = coach_order.label;
  }

  return {
    label: coach_order.label,
    action_type: coach_order.action_type,
    target_name,
    ability_name,
  };
}

/**
 * Build action request from coach order
 */
function buildActionRequest(
  battle_id: string,
  character_id: string,
  coach_order: CoachOrder
): BattleActionRequest {
  const base = { battle_id, character_id };

  switch (coach_order.action_type) {
    case 'attack':
      if (!coach_order.target_id) {
        throw new Error('Attack action requires target_id');
      }
      if (!coach_order.attack_type_id) {
        throw new Error('Attack action requires attack_type_id');
      }
      return {
        ...base,
        action_type: 'attack',
        target_id: coach_order.target_id,
        attack_type_id: coach_order.attack_type_id
      } as AttackActionRequest;

    case 'defend':
      return {
        ...base,
        action_type: 'defend'
      } as DefendActionRequest;

    case 'power':
      if (!coach_order.ability_id) {
        throw new Error('Power action requires ability_id');
      }
      if (!coach_order.target_id) {
        throw new Error('Power action requires target_id');
      }
      return {
        ...base,
        action_type: 'power',
        power_id: coach_order.ability_id,
        target_id: coach_order.target_id,
      } as PowerActionRequest;

    case 'spell':
      if (!coach_order.ability_id) {
        throw new Error('Spell action requires ability_id');
      }
      if (!coach_order.target_id) {
        throw new Error('Spell action requires target_id');
      }
      return {
        ...base,
        action_type: 'spell',
        spell_id: coach_order.ability_id,
        target_id: coach_order.target_id,
      } as SpellActionRequest;

    default:
      throw new Error(`Unknown action type: ${coach_order.action_type}`);
  }
}

/**
 * Build action request from ActionOption (for rebellions)
 */
function buildActionRequestFromOption(
  battle_id: string,
  character_id: string,
  option: ActionOption
): BattleActionRequest {
  const base = { battle_id, character_id };

  switch (option.type) {
    case 'attack':
    case 'friendly_fire':
      return {
        ...base,
        action_type: 'attack',
        target_id: option.target_id!,
        attack_type_id: option.metadata?.attack_type_id || 'strike' // Default to strike if missing
      } as AttackActionRequest;

    case 'defend':
      return {
        ...base,
        action_type: 'defend'
      } as DefendActionRequest;

    case 'power':
      if (!option.target_id) {
        throw new Error('Power action requires target_id');
      }
      return {
        ...base,
        action_type: 'power',
        power_id: option.ability_id!,
        target_id: option.target_id,
      } as PowerActionRequest;

    case 'spell':
      if (!option.target_id) {
        throw new Error('Spell action requires target_id');
      }
      return {
        ...base,
        action_type: 'spell',
        spell_id: option.ability_id!,
        target_id: option.target_id,
      } as SpellActionRequest;

    case 'refuse':
    case 'flee':
    default:
      // Refuse/flee = defend (do nothing offensive)
      return {
        ...base,
        action_type: 'defend'
      } as DefendActionRequest;
  }
}

/**
 * Persist battle action with extended fields
 */
async function persistBattleActionWithDetails(
  battle_id: string,
  character_id: string,
  request: BattleActionRequest,
  result: BattleActionResult,
  round_num: number,
  turn_num: number,
  details: {
    declaration: string;
    adherence_roll: number;
    adherence_threshold: number;
    is_rebellion: boolean;
    rebellion_type?: string;
    coach_order?: CoachOrder;
    psych_snapshot?: any;
    judge_ruling_id?: number | null;
  }
): Promise<void> {
  // Get next sequence number
  const seq_result = await query(
    'SELECT COALESCE(MAX(sequence_num), 0) + 1 as next_seq FROM battle_actions WHERE battle_id = $1',
    [battle_id]
  );
  const sequence_num = seq_result.rows[0].next_seq;

  await query(`
    INSERT INTO battle_actions (
      battle_id, sequence_num, character_id, action_type,
      request, result, is_rebellion, judge_ruling_id,
      round_num, turn_num,
      declaration, adherence_roll, adherence_threshold,
      adherence_modifiers, rebellion_type, psych_snapshot, coach_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
  `, [
    battle_id,
    sequence_num,
    character_id,
    request.action_type,
    JSON.stringify(request),
    JSON.stringify(result),
    details.is_rebellion,
    details.judge_ruling_id ?? null,
    round_num,
    turn_num,
    details.declaration,
    details.adherence_roll,
    details.adherence_threshold,
    JSON.stringify({ roll: details.adherence_roll, threshold: details.adherence_threshold }),
    details.rebellion_type ?? null,
    details.psych_snapshot ? JSON.stringify(details.psych_snapshot) : null,
    details.coach_order ? JSON.stringify(details.coach_order) : null
  ]);
}

/**
 * Create rebellion memory for cross-domain use (therapy, confessional)
 */
async function createRebellionMemory(
  character_id: string,
  battle_id: string,
  rebellion: RebellionChoice,
  coach_order: CoachOrder,
  judge_ruling: JudgeRuling | null
): Promise<void> {
  try {
    const memory_content = `
During battle ${battle_id}, I disobeyed my coach.
Coach ordered: "${coach_order.label}"
I did instead: "${rebellion.chosen_action.label}"
I said: "${rebellion.declaration}"
${judge_ruling ? `The judge (${judge_ruling.judge_id}) ruled: ${judge_ruling.verdict}. They said: "${judge_ruling.commentary}"` : ''}
`.trim();

    const memory_id = `mem_rebellion_${battle_id}_${Date.now()}`;
    await query(`
      INSERT INTO character_memories (
        id, user_character_id, content, intensity, tags, emotion_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      memory_id,
      character_id,
      memory_content,
      9, // High intensity (1-10 scale) - rebellions are memorable
      ['rebellion', 'battle', rebellion.rebellion_type, judge_ruling?.verdict || 'unruled'],
      'defiance'
    ]);
  } catch (error) {
    console.error('[MEMORY] Failed to create rebellion memory:', error);
    // Don't throw - memory creation is not critical
  }
}

/**
 * Calculate preference modifier for a specific coach order.
 * Returns a value between -25 and +25 (typically).
 */
export async function getPreferenceModifierForOrder(
  character_id: string,
  archetype: string,
  order: CoachOrder
): Promise<number> {
  try {
    let preference_score = 50; // Default neutral

    if (order.action_type === 'power' && order.ability_id) {
      const res = await query(
        `SELECT preference_score FROM character_powers WHERE character_id = $1 AND power_id = $2`,
        [character_id, order.ability_id]
      );
      if (res.rows.length > 0) preference_score = res.rows[0].preference_score;

    } else if (order.action_type === 'spell' && order.ability_id) {
      const res = await query(
        `SELECT preference_score FROM character_spells WHERE character_id = $1 AND spell_id = $2`,
        [character_id, order.ability_id]
      );
      if (res.rows.length > 0) preference_score = res.rows[0].preference_score;

    } else if (order.action_type === 'attack') {
      // Determine primary attribute based on archetype
      let primary_attr = 'strength'; // Default
      const arch = archetype.toLowerCase();
      if (['mage', 'mystic', 'scholar'].includes(arch)) primary_attr = 'intelligence';
      if (['assassin', 'trickster', 'ranger'].includes(arch)) primary_attr = 'dexterity';

      // Fetch attribute preference
      const res = await query(
        `SELECT rank FROM character_category_preferences 
         WHERE character_id = $1 AND category_type = 'attribute' AND category_value = $2`,
        [character_id, primary_attr]
      );

      // Convert Rank (1-4) to Score (1-100)
      if (res.rows.length > 0) {
        const rank = res.rows[0].rank;
        if (rank === 4) preference_score = 70;
        else if (rank === 3) preference_score = 60;
        else if (rank === 2) preference_score = 50;
        else if (rank === 1) preference_score = 30;
      }

    } else if (order.action_type === 'defend') {
      // Defend uses 'constitution' preference
      const res = await query(
        `SELECT rank FROM character_category_preferences 
         WHERE character_id = $1 AND category_type = 'attribute' AND category_value = 'constitution'`,
        [character_id]
      );

      if (res.rows.length > 0) {
        const rank = res.rows[0].rank;
        if (rank === 4) preference_score = 70;
        else if (rank === 3) preference_score = 60;
        else if (rank === 2) preference_score = 50;
        else if (rank === 1) preference_score = 30;
      }
    }

    // Calculate modifier: (Score - 50) / 2
    return Math.floor((preference_score - 50) / 2);

  } catch (error) {
    console.error('Error calculating preference modifier:', error);
    return 0; // Fail safe
  }
}
