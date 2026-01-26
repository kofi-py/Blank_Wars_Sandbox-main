import { Router } from 'express';
import { authenticate_token } from '../services/auth';
import { db } from '../database/postgres';

const router = Router();

/**
 * POST /api/minigames/score
 * Submit a score for a minigame
 * Body: { minigame_name: string, score: number, metadata?: object }
 */
router.post('/score', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { minigame_name, score, metadata } = req.body;

    if (!minigame_name || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'minigame_name and score are required'
      });
    }

    const query = `
      INSERT INTO minigame_scores (user_id, minigame_name, score, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const params = [user_id, minigame_name, score, metadata || {}];
    
    const result = await db.query(query, params);

    return res.json({
      success: true,
      score: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error submitting minigame score:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/minigames/leaderboard/:name
 * Get leaderboard for a specific minigame
 */
router.get('/leaderboard/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const query = `
      SELECT ms.*, u.username
      FROM minigame_scores ms
      JOIN users u ON ms.user_id = u.id
      WHERE ms.minigame_name = $1
      ORDER BY ms.score DESC
      LIMIT $2
    `;
    
    const result = await db.query(query, [name, limit]);

    return res.json({
      success: true,
      leaderboard: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching minigame leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
