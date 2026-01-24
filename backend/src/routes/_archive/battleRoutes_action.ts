/**
 * ARCHIVED: REST Battle Action Endpoint
 *
 * Deprecated as part of Pure Socket Authority migration.
 * Battle actions now go through WebSocket handlers in battleService.ts
 *
 * Keep for reference only.
 */

import { Router } from 'express';
import { authenticate_token } from '../../services/auth';
import { executeAction, BattleActionRequest } from '../../services/battleActionExecutor';
import { reconstructBattleState, persistBattleAction } from '../../services/battleStateReconstructor';

const router = Router();

// Execute a battle action (move, attack, power, spell, defend)
// This is the main endpoint for all battle action execution
// Uses event sourcing: action is persisted immediately, state rebuilt from action log
router.post('/:battle_id/action', authenticate_token, async (req: any, res) => {
  try {
    const { battle_id } = req.params;
    const user_id = req.user.id;

    // Validate request body has required fields
    const { character_id, action_type } = req.body;
    if (!character_id) {
      return res.status(400).json({
        success: false,
        error: 'character_id is required'
      });
    }
    if (!action_type) {
      return res.status(400).json({
        success: false,
        error: 'action_type is required'
      });
    }

    // Reconstruct current battle state from action log
    const reconstructed = await reconstructBattleState(battle_id);
    const { context, battle_record, current_round, current_turn } = reconstructed;

    // Verify the battle is active
    if (battle_record.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Battle is not active (status: ${battle_record.status})`
      });
    }

    // Verify user owns this character or is participant in battle
    const is_user_battle = battle_record.user_id === user_id;
    const is_opponent_battle = battle_record.opponent_user_id === user_id;
    if (!is_user_battle && !is_opponent_battle) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this battle'
      });
    }

    // Verify the character belongs to the requesting user's team
    const user_team = is_user_battle
      ? battle_record.user_team_data.characters
      : battle_record.opponent_team_data.characters;
    const character_in_team = user_team.some((c: any) => c.id === character_id);
    if (!character_in_team) {
      return res.status(403).json({
        success: false,
        error: 'Character does not belong to your team'
      });
    }

    // Build the action request from body
    const action_request: BattleActionRequest = {
      battle_id,
      character_id,
      action_type,
      ...req.body  // Include target_id, target_hex, power_id, spell_id, item_id as needed
    };

    // Execute the action (pure function - no side effects)
    const result = await executeAction(action_request, context);

    // Persist the action to the database (event sourcing)
    const persisted_action = await persistBattleAction(
      battle_id,
      character_id,
      action_request,
      result,
      current_round,
      current_turn + 1,  // Increment turn for new action
      false,  // is_rebellion - will be set by adherence check flow
      null    // judge_ruling_id - will be set by judge flow
    );

    // Return the result
    return res.json({
      success: true,
      action_id: persisted_action.id,
      sequence_num: persisted_action.sequence_num,
      result
    });

  } catch (error: any) {
    console.error('Error executing battle action:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
