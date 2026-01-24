import { Router } from 'express';
import { dbAdapter } from '../services/databaseAdapter';
import { authenticateToken } from '../services/auth';
import { query } from '../database';

// Create a factory function that accepts battleManager
export const createBattleRouter = (battleManager: any) => {
  const router = Router();

  // Get battle status
  router.get('/status', async (req, res) => {
    try {
      const queueSize = battleManager.getBattleQueue().size;
      const activeBattles = battleManager.getActiveBattles().size;
      
      return res.json({
        success: true,
        status: {
          queueSize,
          activeBattles,
          serverTime: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get user's battles (requires authentication)
  router.get('/user', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const activeBattles = await dbAdapter.battles.findActiveByUserId(userId);
      return res.json({
        success: true,
        battles: activeBattles
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Complete battle and save results (requires authentication)
  router.post('/:battleId/complete', authenticateToken, async (req: any, res) => {
    try {
      const { battleId } = req.params;
      const userId = req.user.id;
      const {
        winnerId,
        winningCharacterId,
        losingCharacterId,
        characterEarnings,
        coachEarnings,
        xpGained,
        endReason = 'victory',
        events = []
      } = req.body;

      // Validate required fields
      if (!winnerId || !winningCharacterId || characterEarnings === undefined || coachEarnings === undefined || xpGained === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: winnerId, winningCharacterId, characterEarnings, coachEarnings, xpGained'
        });
      }

      // Verify battle exists and user is participant
      const battle = await dbAdapter.battles.findById(battleId);
      if (!battle) {
        return res.status(404).json({
          success: false,
          error: 'Battle not found'
        });
      }

      if (battle.user_id !== userId && battle.opponent_user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to complete this battle'
        });
      }

      // Check if already completed (idempotency)
      if (battle.status === 'completed') {
        return res.json({
          success: true,
          battleId,
          message: 'Battle already completed',
          alreadyCompleted: true
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
        [winnerId, endReason, xpGained, characterEarnings, battleId]
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
        [characterEarnings, xpGained, winningCharacterId]
      );

      // Update losing character stats (if provided)
      if (losingCharacterId) {
        await query(
          `UPDATE user_characters
           SET total_battles = total_battles + 1,
               last_battle_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [losingCharacterId]
        );
      }

      // Update coach (winner's user) coins
      await query(
        `UPDATE users
         SET coins = coins + $1,
             total_battles = total_battles + 1,
             total_wins = total_wins + 1
         WHERE id = $2`,
        [coachEarnings, userId]
      );

      // Save events to database
      if (events && events.length > 0) {
        for (const event of events) {
          await query(
            `INSERT INTO game_events (
              id, type, source, primary_character_id, secondary_character_ids,
              severity, category, description, metadata, tags, importance, timestamp, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (id) DO NOTHING`,
            [
              event.id,
              event.type,
              event.source || 'battle',
              event.primaryCharacterId,
              event.secondaryCharacterIds || null,
              event.severity || 'medium',
              event.category || 'battle',
              event.description,
              JSON.stringify(event.metadata || {}),
              event.tags || [],
              event.importance || 5,
              event.timestamp || new Date()
            ]
          );
        }
      }

      // Commit transaction
      await query('COMMIT');

      return res.json({
        success: true,
        battleId,
        characterEarnings,
        coachEarnings,
        xpGained,
        eventsSaved: events.length
      });

    } catch (error: any) {
      // Rollback transaction on error
      await query('ROLLBACK');
      console.error('Error completing battle:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

// Default export for compatibility
const router = Router();

// Get user's battles (requires authentication)
router.get('/user', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    const activeBattles = await dbAdapter.battles.findActiveByUserId(userId);
    return res.json({
      success: true,
      battles: activeBattles
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;