import { Router } from 'express';
import { db_adapter } from '../services/databaseAdapter';
import { authenticate_token } from '../services/auth';
import { query } from '../database';
import { applyBattleStateModifiers, performAdherenceCheck, type BattleState } from '../services/adherenceCalculationService';
import { unlockCharactersFromBattle } from '../services/battleLockService';

// Sanitize error messages to prevent leaking internal details to clients
function sanitizeErrorMessage(error: any): string {
  const message = error?.message || 'An unexpected error occurred';
  // Don't expose SQL errors, constraint names, or internal paths
  if (message.includes('violates') || message.includes('constraint') ||
      message.includes('relation') || message.includes('column') ||
      message.includes('/Users/') || message.includes('ECONNREFUSED')) {
    return 'A database error occurred. Please try again.';
  }
  // Allow safe error messages through
  return message;
}

// Create a factory function that accepts battle_manager
export const create_battle_router = (battle_manager: any) => {
  const router = Router();

  // Get battle status
  router.get('/status', async (req, res) => {
    try {
      const queue_size = battle_manager.get_battle_queue().size;
      const active_battles = battle_manager.get_active_battles().size;
      
      return res.json({
        success: true,
        status: {
          queue_size,
          active_battles,
          server_time: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // Get user's battles (requires authentication)
  router.get('/user', authenticate_token, async (req: any, res) => {
    try {
      const user_id = req.user.id;

      const active_battles = await db_adapter.battles.find_active_by_user_id(user_id);
      return res.json({
        success: true,
        battles: active_battles
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // Complete battle and save results (requires authentication)
  router.post('/:battle_id/complete', authenticate_token, async (req: any, res) => {
    try {
      const { battle_id } = req.params;
      const user_id = req.user.id;
      const {
        winner_id,
        winning_character_id,
        losing_character_id,
        character_earnings,
        coach_earnings,
        xp_gained,
        end_reason = 'victory',
        events = []
      } = req.body;

      // Validate required fields
      if (!winner_id || !winning_character_id || character_earnings === undefined || coach_earnings === undefined || xp_gained === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: winner_id, winning_character_id, character_earnings, coach_earnings, xp_gained'
        });
      }

      // Verify battle exists and user is participant
      const battle = await db_adapter.battles.find_by_id(battle_id);
      if (!battle) {
        return res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
      }

      if (battle.user_id !== user_id && battle.opponent_user_id !== user_id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to complete this battle'
        });
      }

      // Check if already completed (idempotency)
      if (battle.status === 'completed') {
        return res.json({
          success: true,
          battle_id,
          message: 'Battle already completed',
          already_completed: true
        });
      }

      // Start transaction
      await query('BEGIN');

      // Update battle status
      await query(
        `UPDATE battles
         SET status = 'completed',
             winner_id = $1,
             end_reason = $2,
             xp_gained = $3,
             currency_gained = $4,
             ended_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND status != 'completed'`,
        [winner_id, end_reason, xp_gained, character_earnings, battle_id]
      );

      // Update winning character wallet and stats
      await query(
        `UPDATE user_characters
         SET wallet = wallet + $1,
             experience = experience + $2,
             total_battles = total_battles + 1,
             total_wins = total_wins + 1,
             last_battle_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [character_earnings, xp_gained, winning_character_id]
      );

      // Update losing character stats (if provided)
      if (losing_character_id) {
        await query(
          `UPDATE user_characters
           SET total_battles = total_battles + 1,
               last_battle_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [losing_character_id]
        );
      }

      // Update coach (winner's user) coins
      await query(
        `UPDATE users
         SET coins = coins + $1,
             total_battles = total_battles + 1,
             total_wins = total_wins + 1
         WHERE id = $2`,
        [coach_earnings, user_id]
      );

      // Save events to database
      if (events && events.length > 0) {
        for (const event of events) {
          // Validate required fields - no fallbacks
          if (!event.source) throw new Error(`Event ${event.id} missing required field: source`);
          if (!event.severity) throw new Error(`Event ${event.id} missing required field: severity`);
          if (!event.category) throw new Error(`Event ${event.id} missing required field: category`);
          if (!event.userchar_ids || event.userchar_ids.length === 0) {
            throw new Error(`Event ${event.id} missing required field: userchar_ids`);
          }

          await query(
            `INSERT INTO game_events (
              id, type, source, userchar_ids,
              severity, category, description, metadata, tags, importance, timestamp, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (id) DO NOTHING`,
            [
              event.id,
              event.type,
              event.source,
              event.userchar_ids,
              event.severity,
              event.category,
              event.description,
              JSON.stringify(event.metadata),
              event.tags,
              event.importance,
              event.timestamp
            ]
          );
        }
      }

      // Commit transaction
      await query('COMMIT');

      // IMPORTANT: Unlock characters AFTER commit so they're not stuck if commit fails
      try {
        await unlockCharactersFromBattle(battle_id);
        console.log(`🔓 Characters unlocked for completed battle ${battle_id}`);
      } catch (unlock_error) {
        // Log but don't fail the response - battle was completed successfully
        console.error(`⚠️ Failed to unlock characters for battle ${battle_id}:`, unlock_error);
      }

      return res.json({
        success: true,
        battle_id,
        character_earnings,
        coach_earnings,
        xp_gained,
        events_saved: events.length
      });

    } catch (error: any) {
      // Rollback transaction on error
      await query('ROLLBACK');
      console.error('Error completing battle:', error);
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // Emergency unlock endpoint - fallback when socket disconnected during battle
  // This ensures characters can always be unlocked even if websocket fails
  router.post('/:battle_id/unlock', authenticate_token, async (req: any, res) => {
    try {
      const { battle_id } = req.params;
      const user_id = req.user.id;

      // Verify battle exists and user is participant
      const battle = await db_adapter.battles.find_by_id(battle_id);
      if (!battle) {
        return res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
      }

      if (battle.user_id !== user_id && battle.opponent_user_id !== user_id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized for this battle'
        });
      }

      // Unlock characters
      await unlockCharactersFromBattle(battle_id);
      console.log(`🔓 Emergency unlock: Characters unlocked for battle ${battle_id} via HTTP`);

      return res.json({
        success: true,
        battle_id,
        message: 'Characters unlocked successfully'
      });

    } catch (error: any) {
      console.error('Error unlocking characters:', error);
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // Admin endpoint to clear stale battle locks (dev only)
  // Clears locks for battles that are completed, don't exist, or are older than 1 hour
  router.post('/admin/clear-stale-locks', async (req, res) => {
    try {
      // Find all characters with battle locks where battle is completed, missing, or stale (>1 hour old)
      const result = await query(`
        UPDATE user_characters uc
        SET current_battle_id = NULL
        WHERE current_battle_id IS NOT NULL
          AND (
            NOT EXISTS (SELECT 1 FROM battles b WHERE b.id = uc.current_battle_id)
            OR EXISTS (SELECT 1 FROM battles b WHERE b.id = uc.current_battle_id AND b.status = 'completed')
            OR EXISTS (SELECT 1 FROM battles b WHERE b.id = uc.current_battle_id AND b.started_at < NOW() - INTERVAL '1 hour')
          )
        RETURNING uc.id, uc.nickname, uc.current_battle_id as was_locked_to
      `);

      console.log(`🧹 Admin: Cleared ${result.rows.length} stale battle locks`);

      return res.json({
        success: true,
        cleared_count: result.rows.length,
        cleared_characters: result.rows
      });
    } catch (error: any) {
      console.error('Error clearing stale locks:', error);
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // Get all status effect types from database
  router.get('/status-effects', async (req, res) => {
    try {
      const result = await query(
        `SELECT id, name, category, description, icon, stackable, cc_diminishing
         FROM status_effect_types
         ORDER BY category, name`
      );

      return res.json({
        success: true,
        status_effects: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching status effects:', error);
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // Perform adherence check for a character during battle
  // DB is single source of truth for base adherence; backend applies battle-state modifiers
  router.post('/adherence-check', authenticate_token, async (req: any, res) => {
    try {
      const { user_character_id, battle_state } = req.body;

      if (!user_character_id) {
        return res.status(400).json({
          success: false,
          error: 'user_character_id is required'
        });
      }

      // Validate all required battle_state fields - no defaults, caller must provide
      if (!battle_state) {
        return res.status(400).json({
          success: false,
          error: 'battle_state is required'
        });
      }

      const required_fields = ['current_hp', 'max_hp', 'team_winning', 'teammates_alive', 'teammates_total'];
      const missing_fields = required_fields.filter(f => battle_state[f] === undefined || battle_state[f] === null);
      if (missing_fields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `battle_state missing required fields: ${missing_fields.join(', ')}`
        });
      }

      // Get gameplan_adherence from DB (the single source of truth)
      const result = await query(
        `SELECT uc.gameplan_adherence, c.name as character_name
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.id = $1`,
        [user_character_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Character not found'
        });
      }

      let base_adherence = result.rows[0].gameplan_adherence;
      const character_name = result.rows[0].character_name;

      // ╔════════════════════════════════════════════════════════════════════════╗
      // ║  🚨 DEV-ONLY ADHERENCE BOOST - REMOVE BEFORE PRODUCTION! 🚨            ║
      // ║                                                                        ║
      // ║  This adds +20 to adherence for local testing only.                    ║
      // ║  Will NOT run if NODE_ENV === 'production'                             ║
      // ║                                                                        ║
      // ║  TODO: Remove this block before deploying to production!               ║
      // ╚════════════════════════════════════════════════════════════════════════╝
      if (process.env.NODE_ENV !== 'production') {
        const DEV_ADHERENCE_BOOST = 20;
        const original_adherence = base_adherence;
        base_adherence = Math.min(100, (base_adherence || 0) + DEV_ADHERENCE_BOOST);
        console.log(`🧪 [DEV-ONLY] Adherence boost applied: ${original_adherence} + ${DEV_ADHERENCE_BOOST} = ${base_adherence}`);
      }

      console.log(`🎲 [ADHERENCE-CHECK] Character: ${character_name} (${user_character_id})`);
      console.log(`🎲 [ADHERENCE-CHECK] Base adherence from DB: ${base_adherence}`);
      console.log(`🎲 [ADHERENCE-CHECK] Battle state:`, JSON.stringify(battle_state));

      // Fail if gameplan_adherence is null - indicates DB schema issue
      if (base_adherence === null || base_adherence === undefined) {
        return res.status(500).json({
          success: false,
          error: `gameplan_adherence is null for character ${user_character_id} - check DB generated column`
        });
      }

      const state: BattleState = {
        current_hp: battle_state.current_hp,
        max_hp: battle_state.max_hp,
        team_winning: battle_state.team_winning,
        teammates_alive: battle_state.teammates_alive,
        teammates_total: battle_state.teammates_total
      };

      // Perform the adherence check (applies battle-state modifiers + d100 roll)
      const check_result = performAdherenceCheck(base_adherence, state);

      console.log(`🎲 [ADHERENCE-CHECK] Result: roll=${check_result.roll}, threshold=${check_result.threshold}, passed=${check_result.passed}`);

      // Build modifiers explanation for display
      const modifiers_applied: string[] = [];
      const hp_percent = state.current_hp / state.max_hp;
      if (hp_percent <= 0.1) modifiers_applied.push('Near death (-50)');
      else if (hp_percent <= 0.25) modifiers_applied.push('Critical injuries (-30)');
      else if (hp_percent <= 0.5) modifiers_applied.push('Wounded (-15)');
      if (!state.team_winning) modifiers_applied.push('Team losing (-10)');
      const teammate_loss = (state.teammates_total - state.teammates_alive) / state.teammates_total;
      if (teammate_loss > 0) modifiers_applied.push(`Teammates down (-${Math.floor(teammate_loss * 20)})`);

      // Generate reasoning
      const reasoning = check_result.passed
        ? `${character_name} follows the plan (rolled ${check_result.roll} vs ${check_result.threshold}).`
        : `${character_name} rejects the plan (rolled ${check_result.roll} vs ${check_result.threshold}).`;

      return res.json({
        success: true,
        result: {
          passed: check_result.passed,
          roll: check_result.roll,
          threshold: check_result.threshold,
          base_adherence,
          modifiers_applied,
          reasoning
        }
      });

    } catch (error: any) {
      console.error('Error performing adherence check:', error);
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // REMOVED: Battle action endpoint - now handled via WebSocket
  // See: /Users/gabrielgreenstein/Blank_Wars_2026/backend/src/routes/_archive/battleRoutes_action.ts

  // Get battle history between specific characters
  router.get('/history', async (req, res) => {
    try {
      const { character_ids } = req.query;

      if (!character_ids || typeof character_ids !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'character_ids query parameter required (comma-separated)'
        });
      }

      // Parse, trim, filter empty strings, and limit array size to prevent DoS
      const MAX_IDS = 50;
      const ids = character_ids.split(',').map(id => id.trim()).filter(id => id.length > 0).slice(0, MAX_IDS);

      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one valid character_id required'
        });
      }

      const result = await query(
        `SELECT id, character1_id, character2_id, winner_id, end_reason,
                combat_log, started_at, ended_at, xp_gained
         FROM battles
         WHERE status = 'completed'
           AND (
             (character1_id = ANY($1) AND character2_id = ANY($1))
             OR (character1_id = ANY($1) AND character2_id = ANY($1))
           )
         ORDER BY ended_at DESC
         LIMIT 20`,
        [ids]
      );

      return res.json({
        success: true,
        battles: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching battle history:', error);
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // Get character relationships for battle context (tensions, rivalries)
  router.get('/relationships', async (req, res) => {
    try {
      const { character_ids } = req.query;

      if (!character_ids || typeof character_ids !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'character_ids query parameter required (comma-separated)'
        });
      }

      // Parse, trim, filter empty strings, and limit array size to prevent DoS
      const MAX_IDS = 50;
      const ids = character_ids.split(',').map(id => id.trim()).filter(id => id.length > 0).slice(0, MAX_IDS);

      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one valid character_id required'
        });
      }

      const result = await query(
        `SELECT character1_id, character2_id, current_trust, current_respect,
                current_affection, current_rivalry, relationship_status,
                shared_battles, vendetta_description, last_interaction
         FROM character_relationships
         WHERE (character1_id = ANY($1) OR character2_id = ANY($1))
           AND (character1_id = ANY($1) OR character2_id = ANY($1))
           AND character1_id != character2_id`,
        [ids]
      );

      return res.json({
        success: true,
        relationships: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching character relationships:', error);
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  // Get judge ruling history for specific judge and characters
  router.get('/judge-rulings', async (req, res) => {
    try {
      const { judge_id, character_ids } = req.query;

      if (!judge_id || typeof judge_id !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'judge_id query parameter required'
        });
      }

      if (!character_ids || typeof character_ids !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'character_ids query parameter required (comma-separated)'
        });
      }

      // Parse, trim, filter empty strings, and limit array size to prevent DoS
      const MAX_IDS = 50;
      const ids = character_ids.split(',').map(id => id.trim()).filter(id => id.length > 0).slice(0, MAX_IDS);

      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one valid character_id required'
        });
      }

      const result = await query(
        `SELECT id, battle_id, ruling_round, situation, ruling, reasoning,
                gameplay_effect, narrative_impact, character_affected_id,
                character_benefited_id, character_penalized_id, ruling_type,
                severity, was_controversial, character_reactions, created_at
         FROM judge_rulings
         WHERE judge_character_id = $1
           AND (
             character_affected_id = ANY($2)
             OR character_benefited_id = ANY($2)
             OR character_penalized_id = ANY($2)
           )
         ORDER BY created_at DESC
         LIMIT 50`,
        [judge_id, ids]
      );

      return res.json({
        success: true,
        rulings: result.rows
      });
    } catch (error: any) {
      console.error('Error fetching judge rulings:', error);
      return res.status(500).json({
        success: false,
        error: sanitizeErrorMessage(error)
      });
    }
  });

  return router;
};

// Default export for compatibility
const router = Router();

// Get user's battles (requires authentication)
router.get('/user', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;

    const active_battles = await db_adapter.battles.find_active_by_user_id(user_id);
    return res.json({
      success: true,
      battles: active_battles
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(error)
    });
  }
});

export default router;