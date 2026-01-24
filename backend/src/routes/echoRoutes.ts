import { Router } from 'express';
import { CharacterEchoService } from '../services/characterEchoService';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import { query } from '../database';

const router = Router();
const echo_service = new CharacterEchoService();

// Get all echoes for the current user with character info
router.get('/', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's echoes with character names and avatars
    const result = await query(`
      SELECT uce.character_template_id, uce.echo_count, c.name, c.avatar_emoji, c.rarity, c.title
      FROM user_character_echoes uce
      JOIN characters c ON uce.character_template_id = c.id
      WHERE uce.user_id = $1 AND uce.echo_count > 0
      ORDER BY c.name ASC
    `, [req.user.id]);

    const echoes = result.rows.map((row: any) => ({
      character_id: row.character_template_id,
      count: row.echo_count,
      name: row.name,
      avatar: row.avatar_emoji,
      rarity: row.rarity,
      title: row.title
    }));

    res.json({ 
      success: true,
      echoes: echoes 
    });
  } catch (error: any) {
    console.error('Error fetching user echoes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get echo count for a specific character
router.get('/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { character_id } = req.params;
    const count = await echo_service.getEchoCount(req.user.id, character_id);
    
    res.json({ count });
  } catch (error: any) {
    console.error('Error fetching echo count:', error);
    res.status(500).json({ error: error.message });
  }
});

// Spend echoes for character ascension
router.post('/ascend', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { user_character_id, echoes_to_spend } = req.body;
    
    if (!user_character_id || !echoes_to_spend) {
      return res.status(400).json({ error: 'User character ID and echoes to spend are required' });
    }

    // Get the character to find the template ID
    const character_result = await query(
      'SELECT character_id FROM user_characters WHERE id = $1 AND user_id = $2',
      [user_character_id, req.user.id]
    );

    if (character_result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const character_template_id = character_result.rows[0].character_id;

    // Check if user has enough echoes
    const current_echoes = await echo_service.getEchoCount(req.user.id, character_template_id);
    if (current_echoes < echoes_to_spend) {
      return res.status(400).json({ error: 'Not enough echoes' });
    }

    // Perform ascension
    const success = await echo_service.ascendCharacter(req.user.id, user_character_id, echoes_to_spend);

    if (success) {
      // Spend the echoes
      await echo_service.spendEchoes(req.user.id, character_template_id, echoes_to_spend);
      const remaining_echoes = await echo_service.getEchoCount(req.user.id, character_template_id);

      res.json({
        success: true,
        remaining_echoes: remaining_echoes,
        message: 'Character ascended successfully!'
      });
    } else {
      res.status(500).json({ error: 'Failed to ascend character' });
    }
  } catch (error: any) {
    console.error('Error ascending character:', error);
    res.status(500).json({ error: error.message });
  }
});

// Spend echoes for ability rank up (with adherence check)
router.post('/rankup', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { user_character_id, ability_id, echoes_to_spend } = req.body;

    if (!user_character_id || !ability_id || !echoes_to_spend) {
      return res.status(400).json({ error: 'User character ID, ability ID, and echoes to spend are required' });
    }

    // Get the character to find the template ID
    const character_result = await query(
      'SELECT character_id FROM user_characters WHERE id = $1 AND user_id = $2',
      [user_character_id, req.user.id]
    );

    if (character_result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const character_template_id = character_result.rows[0].character_id;

    // Check if user has enough echoes
    const current_echoes = await echo_service.getEchoCount(req.user.id, character_template_id);
    if (current_echoes < echoes_to_spend) {
      return res.status(400).json({ error: 'Not enough echoes' });
    }

    // Check adherence - character may rebel and choose different ability
    const { check_adherence_and_rank_ability } = require('../services/autonomousDecisionService');
    const adherence_result = await check_adherence_and_rank_ability({
      user_id: req.user.id,
      character_id: user_character_id,
      coach_ability_choice: ability_id
    });

    // Use the final choice (coach's or AI's rebellious choice)
    const final_ability_id = adherence_result.final_choice;

    // Perform ability rank up
    const success = await echo_service.rankUpAbility(req.user.id, user_character_id, final_ability_id, echoes_to_spend);

    if (success) {
      // Spend the echoes
      await echo_service.spendEchoes(req.user.id, character_template_id, echoes_to_spend);
      const remaining_echoes = await echo_service.getEchoCount(req.user.id, character_template_id);

      res.json({
        success: true,
        remaining_echoes: remaining_echoes,
        message: adherence_result.message,
        adhered: adherence_result.adhered,
        ranked_ability: final_ability_id,
        coach_choice: ability_id
      });
    } else {
      res.status(500).json({ error: 'Failed to rank up ability' });
    }
  } catch (error: any) {
    console.error('Error ranking up ability:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generic spend echoes endpoint
router.post('/spend', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { character_id, amount, action } = req.body;
    
    if (!character_id || !amount || !action) {
      return res.status(400).json({ error: 'Character ID, amount, and action are required' });
    }

    // Check if user has enough echoes
    const current_echoes = await echo_service.getEchoCount(req.user.id, character_id);
    if (current_echoes < amount) {
      return res.status(400).json({ error: 'Not enough echoes' });
    }

    // Spend the echoes
    const success = await echo_service.spendEchoes(req.user.id, character_id, amount);

    if (success) {
      const remaining_echoes = await echo_service.getEchoCount(req.user.id, character_id);
      res.json({
        success: true,
        remaining_echoes: remaining_echoes,
        message: `Spent ${amount} echoes on ${action}`
      });
    } else {
      res.status(500).json({ error: 'Failed to spend echoes' });
    }
  } catch (error: any) {
    console.error('Error spending echoes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;