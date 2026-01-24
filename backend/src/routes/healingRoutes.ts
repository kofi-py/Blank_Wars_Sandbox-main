import express from 'express';
import { authenticate_token } from '../services/auth';
import { HealingService, HealingOption } from '../services/healingService';
import { ResurrectionService, ResurrectionOption } from '../services/resurrectionService';
import { query } from '../database/postgres';
import { AuthRequest } from '../types';

const router = express.Router();

/**
 * GET /api/healing/options/:character_id
 * Get healing options for an injured character
 */
router.get('/options/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    
    // Verify character belongs to user
    const character_check = await query(
      `SELECT user_id FROM user_characters WHERE id = $1`,
      [character_id]
    );

    if (character_check.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }
    
    const options = await HealingService.getHealingOptions(character_id);
    
    res.json({
      character_id,
      healing_options: options,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting healing options:', error);
    res.status(500).json({ error: 'Failed to get healing options' });
  }
});

/**
 * POST /api/healing/start/:character_id
 * Start a healing session for a character
 */
router.post('/start/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const { healing_type, facility_id, payment_method } = req.body;
    
    if (!healing_type || !['natural', 'currency', 'premium', 'facility'].includes(healing_type)) {
      return res.status(400).json({ error: 'Invalid healing type' });
    }
    
    // Verify character belongs to user
    const character_check = await query(
      `SELECT user_id FROM user_characters WHERE id = $1`,
      [character_id]
    );

    if (character_check.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }
    
    const session = await HealingService.startHealingSession(
      character_id,
      healing_type,
      facility_id,
      payment_method
    );
    
    res.json({
      success: true,
      session,
      message: `Healing session started successfully`
    });
  } catch (error) {
    console.error('Error starting healing session:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start healing session' });
  }
});

/**
 * GET /api/healing/sessions
 * Get active healing sessions for the authenticated user
 */
router.get('/sessions', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const sessions = await HealingService.getUserHealingSessions(req.user.id);
    
    res.json({
      sessions,
      count: sessions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting healing sessions:', error);
    res.status(500).json({ error: 'Failed to get healing sessions' });
  }
});

/**
 * GET /api/healing/resurrection/options/:character_id
 * Get resurrection options for a dead character
 */
router.get('/resurrection/options/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    
    // Verify character belongs to user
    const character_check = await query(
      `SELECT user_id FROM user_characters WHERE id = $1`,
      [character_id]
    );

    if (character_check.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }
    
    const options = await ResurrectionService.getResurrectionOptions(character_id);
    const death_stats = await ResurrectionService.getCharacterDeathStats(character_id);

    res.json({
      character_id,
      resurrection_options: options,
      death_stats: death_stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting resurrection options:', error);
    res.status(500).json({ error: 'Failed to get resurrection options' });
  }
});

/**
 * POST /api/healing/resurrection/:character_id
 * Execute resurrection for a dead character
 */
router.post('/resurrection/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const { resurrection_type } = req.body;
    
    if (!resurrection_type || !['premium_instant', 'wait_penalty', 'level_reset'].includes(resurrection_type)) {
      return res.status(400).json({ error: 'Invalid resurrection type' });
    }
    
    // Verify character belongs to user
    const character_check = await query(
      `SELECT user_id FROM user_characters WHERE id = $1`,
      [character_id]
    );

    if (character_check.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }
    
    const result = await ResurrectionService.executeResurrection(character_id, resurrection_type);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        resurrection_type,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error executing resurrection:', error);
    res.status(500).json({ error: 'Failed to execute resurrection' });
  }
});

/**
 * GET /api/healing/character-status/:character_id
 * Get complete health/death status for a character
 */
router.get('/character-status/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    
    // Verify character belongs to user
    const character_result = await query(
      `SELECT uc.user_id, uc.current_health, uc.current_max_health, uc.is_injured, uc.is_dead,
              uc.injury_severity, uc.recovery_time, uc.death_timestamp, uc.resurrection_available_at,
              uc.death_count, uc.level, c.name
       FROM user_characters uc
       LEFT JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1`,
      [character_id]
    );

    if (character_result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const character = character_result.rows[0];
    
    if (character.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }
    
    // Get available options based on character state
    let healing_options: HealingOption[] = [];
    let resurrection_options: ResurrectionOption[] = [];
    
    if (character.is_dead) {
      resurrection_options = await ResurrectionService.getResurrectionOptions(character_id);
    } else if (character.is_injured) {
      healing_options = await HealingService.getHealingOptions(character_id);
    }
    
    const status = {
      character_id,
      name: character.name,
      health: {
        current: character.current_health,
        max: character.current_max_health,
        percentage: Math.round((character.current_health / character.current_max_health) * 100)
      },
      status: character.is_dead ? 'dead' : (character.is_injured ? 'injured' : 'healthy'),
      injury_severity: character.injury_severity,
      recovery_time: character.recovery_time,
      death_info: character.is_dead ? {
        death_timestamp: character.death_timestamp,
        resurrection_available_at: character.resurrection_available_at,
        death_count: character.death_count
      } : null,
      available_options: {
        healing: healing_options,
        resurrection: resurrection_options
      }
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting character status:', error);
    res.status(500).json({ error: 'Failed to get character status' });
  }
});

export default router;