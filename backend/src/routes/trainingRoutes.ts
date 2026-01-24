import express from 'express';
import { training_service, training_activities } from '../services/trainingService';
import { db } from '../database';

const router = express.Router();

// Get available training activities
router.get('/activities', async (req, res) => {
  try {
    res.json({
      success: true,
      activities: training_activities
    });
  } catch (error) {
    console.error('Error fetching training activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training activities'
    });
  }
});

// Start training session
router.post('/start', async (req, res) => {
  try {
    const { character_id, activity_id, user_id, gym_tier = 'community' } = req.body;

    if (!character_id || !activity_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: character_id, activity_id, user_id'
      });
    }

    const result = await training_service.startTraining(character_id, activity_id, user_id, gym_tier, db);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error starting training:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start training'
    });
  }
});

// Complete training session
router.post('/complete', async (req, res) => {
  try {
    const { session_id, character_id, xp_gain, stat_type, stat_bonus, training_points_gain } = req.body;

    if (!session_id || !character_id || xp_gain === undefined || !stat_type || stat_bonus === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: session_id, character_id, xp_gain, stat_type, stat_bonus'
      });
    }

    const result = await training_service.completeTraining(
      session_id,
      character_id,
      xp_gain,
      stat_type,
      stat_bonus,
      training_points_gain
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error completing training:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete training'
    });
  }
});

// Get character training state
router.get('/character/:character_id/state', async (req, res) => {
  try {
    const { character_id } = req.params;
    
    // Get character training data from database
    const query = `
      SELECT * FROM character_training_state 
      WHERE character_id = $1
    `;
    
    const result = await db.query(query, [character_id]);
    const state = result.rows[0];

    res.json({
      success: true,
      state: state || {
        character_id,
        training_points: 0,
        mental_health: 100,
        stress_level: 0,
        focus_level: 50,
        training_history: [],
        available_activities: training_activities.map(a => a.id),
        completed_sessions: 0,
        specializations: []
      }
    });
  } catch (error) {
    console.error('Error fetching character training state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch character training state'
    });
  }
});

export default router;