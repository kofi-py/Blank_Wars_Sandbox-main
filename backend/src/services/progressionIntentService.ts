/**
 * Progression Intent Service
 * Handles execution of AI character progression intentions
 * (goals, training requests, concerns, etc.)
 */

import { query } from '../database/index';

interface ProgressionIntent {
  type: 'set_goal' | 'request_training' | 'express_concern' | 'celebrate_milestone' | 'request_rest' | 'challenge_teammate';
  action: any;
  urgency: 'low' | 'medium' | 'high';
  requires_approval: boolean;
}

interface IntentContext {
  user_id: string;
  character_name: string;
}

/**
 * Main intent execution dispatcher
 */
export async function executeProgressionIntent(
  character_id: string,
  intent: ProgressionIntent,
  context: IntentContext
): Promise<void> {
  console.log(`🎯 [PROGRESSION-INTENT] Executing ${intent.type} for ${context.character_name}`);

  switch (intent.type) {
    case 'set_goal':
      await handleSetGoal(character_id, intent.action);
      break;

    case 'request_training':
      if (intent.requires_approval) {
        await queueForCoachApproval(character_id, intent, context);
      } else {
        await applyTrainingFocus(character_id, intent.action);
      }
      break;

    case 'express_concern':
      await logCharacterConcern(character_id, intent.action, context);
      break;

    case 'celebrate_milestone':
      await recordMilestoneCelebration(character_id, intent.action, context);
      break;

    case 'request_rest':
      if (intent.requires_approval) {
        await queueForCoachApproval(character_id, intent, context);
      } else {
        await scheduleRestPeriod(character_id, intent.action);
      }
      break;

    case 'challenge_teammate':
      await queueForCoachApproval(character_id, intent, context); // Always requires approval
      break;

    default:
      console.warn(`[PROGRESSION-INTENT] Unknown intent type: ${intent.type}`);
  }
}

/**
 * Handle goal setting - stores in recent_decisions
 */
async function handleSetGoal(character_id: string, action: any): Promise<void> {
  try {
    // Get current character data
    const result = await query(
      'SELECT recent_decisions, level, experience FROM user_characters WHERE id = $1',
      [character_id]
    );

    if (!result.rows[0]) {
      throw new Error(`Character not found: ${character_id}`);
    }

    const character = result.rows[0];

    // GOVERNANCE: No fallbacks - explicitly handle null vs missing
    if (!character.hasOwnProperty('recent_decisions')) {
      throw new Error(`recent_decisions column missing for character ${character_id}`);
    }
    const recent_decisions = character.recent_decisions === null ? [] : character.recent_decisions;

    // Create new goal
    const new_goal = {
      type: 'goal',
      goal_type: action.goal,
      target: action.target,
      deadline: action.deadline,
      set_date: new Date().toISOString(),
      status: 'active',
      ai_generated: true,
      progress: character.level // Current progress snapshot
    };

    // Add to decisions array
    recent_decisions.push(new_goal);

    // Keep only last 10 decisions
    if (recent_decisions.length > 10) {
      recent_decisions.shift();
    }

    // Update database
    await query(
      'UPDATE user_characters SET recent_decisions = $1 WHERE id = $2',
      [JSON.stringify(recent_decisions), character_id]
    );

    console.log(`✅ [PROGRESSION-INTENT] Goal set: ${action.goal} = ${action.target}`);
  } catch (error: any) {
    console.error('[PROGRESSION-INTENT] handleSetGoal error:', error.message);
    throw error;
  }
}

/**
 * Apply training focus (stores in recent_decisions)
 */
async function applyTrainingFocus(character_id: string, action: any): Promise<void> {
  try {
    const result = await query(
      'SELECT recent_decisions FROM user_characters WHERE id = $1',
      [character_id]
    );

    if (!result.rows[0]) {
      throw new Error(`Character not found: ${character_id}`);
    }

    const recent_decisions = result.rows[0].recent_decisions || [];

    const training_focus = {
      type: 'training_focus',
      focus: action.focus,
      reason: action.reason,
      duration: action.duration,
      set_date: new Date().toISOString(),
      status: 'active',
      ai_generated: true
    };

    recent_decisions.push(training_focus);

    if (recent_decisions.length > 10) {
      recent_decisions.shift();
    }

    await query(
      'UPDATE user_characters SET recent_decisions = $1 WHERE id = $2',
      [JSON.stringify(recent_decisions), character_id]
    );

    console.log(`✅ [PROGRESSION-INTENT] Training focus applied: ${action.focus}`);
  } catch (error: any) {
    console.error('[PROGRESSION-INTENT] applyTrainingFocus error:', error.message);
    throw error;
  }
}

/**
 * Log character concern
 */
async function logCharacterConcern(
  character_id: string,
  action: any,
  context: IntentContext
): Promise<void> {
  try {
    const result = await query(
      'SELECT recent_decisions FROM user_characters WHERE id = $1',
      [character_id]
    );

    if (!result.rows[0]) {
      throw new Error(`Character not found: ${character_id}`);
    }

    const recent_decisions = result.rows[0].recent_decisions || [];

    const concern = {
      type: 'concern',
      concern: action.concern,
      severity: action.severity,
      expressed_date: new Date().toISOString(),
      ai_generated: true
    };

    recent_decisions.push(concern);

    if (recent_decisions.length > 10) {
      recent_decisions.shift();
    }

    await query(
      'UPDATE user_characters SET recent_decisions = $1 WHERE id = $2',
      [JSON.stringify(recent_decisions), character_id]
    );

    console.log(`✅ [PROGRESSION-INTENT] Concern logged: ${action.concern} (${action.severity})`);
  } catch (error: any) {
    console.error('[PROGRESSION-INTENT] logCharacterConcern error:', error.message);
    throw error;
  }
}

/**
 * Record milestone celebration
 */
async function recordMilestoneCelebration(
  character_id: string,
  action: any,
  context: IntentContext
): Promise<void> {
  try {
    const result = await query(
      'SELECT recent_decisions FROM user_characters WHERE id = $1',
      [character_id]
    );

    if (!result.rows[0]) {
      throw new Error(`Character not found: ${character_id}`);
    }

    const recent_decisions = result.rows[0].recent_decisions || [];

    const celebration = {
      type: 'milestone_celebration',
      achievement: action.achievement,
      emotion: action.emotion,
      celebrated_date: new Date().toISOString(),
      ai_generated: true
    };

    recent_decisions.push(celebration);

    if (recent_decisions.length > 10) {
      recent_decisions.shift();
    }

    await query(
      'UPDATE user_characters SET recent_decisions = $1 WHERE id = $2',
      [JSON.stringify(recent_decisions), character_id]
    );

    console.log(`✅ [PROGRESSION-INTENT] Milestone celebrated: ${action.achievement}`);
  } catch (error: any) {
    console.error('[PROGRESSION-INTENT] recordMilestoneCelebration error:', error.message);
    throw error;
  }
}

/**
 * Schedule rest period (future feature - currently logs only)
 */
async function scheduleRestPeriod(character_id: string, action: any): Promise<void> {
  try {
    const result = await query(
      'SELECT recent_decisions FROM user_characters WHERE id = $1',
      [character_id]
    );

    if (!result.rows[0]) {
      throw new Error(`Character not found: ${character_id}`);
    }

    const recent_decisions = result.rows[0].recent_decisions || [];

    const rest_request = {
      type: 'rest_period',
      reason: action.reason,
      duration: action.duration,
      requested_date: new Date().toISOString(),
      status: 'logged', // Future: implement actual rest mechanics
      ai_generated: true
    };

    recent_decisions.push(rest_request);

    if (recent_decisions.length > 10) {
      recent_decisions.shift();
    }

    await query(
      'UPDATE user_characters SET recent_decisions = $1 WHERE id = $2',
      [JSON.stringify(recent_decisions), character_id]
    );

    console.log(`✅ [PROGRESSION-INTENT] Rest period requested: ${action.duration} (${action.reason})`);
  } catch (error: any) {
    console.error('[PROGRESSION-INTENT] scheduleRestPeriod error:', error.message);
    throw error;
  }
}

/**
 * Queue decision for coach approval (future feature - currently logs only)
 */
async function queueForCoachApproval(
  character_id: string,
  intent: ProgressionIntent,
  context: IntentContext
): Promise<void> {
  try {
    // Future: create pending_character_requests table
    // For now, log in recent_decisions with pending status

    const result = await query(
      'SELECT recent_decisions FROM user_characters WHERE id = $1',
      [character_id]
    );

    if (!result.rows[0]) {
      throw new Error(`Character not found: ${character_id}`);
    }

    const recent_decisions = result.rows[0].recent_decisions || [];

    const pending_request = {
      type: 'pending_approval',
      intent_type: intent.type,
      action: intent.action,
      urgency: intent.urgency,
      requested_date: new Date().toISOString(),
      status: 'pending',
      ai_generated: true
    };

    recent_decisions.push(pending_request);

    if (recent_decisions.length > 10) {
      recent_decisions.shift();
    }

    await query(
      'UPDATE user_characters SET recent_decisions = $1 WHERE id = $2',
      [JSON.stringify(recent_decisions), character_id]
    );

    console.log(`📬 [PROGRESSION-INTENT] Request queued for coach approval: ${intent.type}`);
  } catch (error: any) {
    console.error('[PROGRESSION-INTENT] queueForCoachApproval error:', error.message);
    throw error;
  }
}
