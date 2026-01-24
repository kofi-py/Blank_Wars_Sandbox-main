/**
 * Attributes API Routes
 * Endpoints for managing core attribute allocation with adherence-aware flow.
 */

import express from 'express';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import {
  getCharacterAttributes,
  allocateAttributes,
  submitAttributeSurveyChoice,
  requestAttributeAdvice
} from '../services/attributeService';

const router = express.Router();

/**
 * GET /api/attributes/character/:character_id
 * Returns attribute stats, available points, and any pending survey.
 */
router.get('/character/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const user_id = req.user.id;
    const result = await getCharacterAttributes(character_id, user_id);
    res.json(result);
  } catch (error) {
    console.error('Error fetching character attributes:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch attributes' });
  }
});

/**
 * POST /api/attributes/allocate
 * Coach submits an allocation plan; may trigger adherence or survey.
 */
router.post('/allocate', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id, allocations, coach_notes } = req.body;
    const user_id = req.user.id;

    if (!character_id || !allocations) {
      return res.status(400).json({ error: 'character_id and allocations are required' });
    }

    const result = await allocateAttributes({
      character_id,
      user_id,
      allocations,
      coach_notes
    });
    res.json(result);
  } catch (error) {
    console.error('Error allocating attributes:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to allocate attributes' });
  }
});

/**
 * POST /api/attributes/survey
 * Apply a character-selected survey option after adherence failure.
 */
router.post('/survey', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id, survey_option_id } = req.body;
    const user_id = req.user.id;

    if (!character_id || !survey_option_id) {
      return res.status(400).json({ error: 'character_id and survey_option_id are required' });
    }

    const result = await submitAttributeSurveyChoice({
      character_id,
      user_id,
      survey_option_id
    });
    res.json(result);
  } catch (error) {
    console.error('Error submitting attribute survey choice:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to submit survey choice' });
  }
});

/**
 * POST /api/attributes/advice
 * Lightweight advice generator based on current attributes (no external calls).
 */
router.post('/advice', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id, character_name, message, attributes } = req.body;
    const user_id = req.user.id;

    if (!character_id || !message) {
      return res.status(400).json({ error: 'character_id and message are required' });
    }

    const result = await requestAttributeAdvice({
      character_id,
      user_id,
      character_name,
      attributes,
      message
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating attribute advice:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate advice' });
  }
});

export default router;
