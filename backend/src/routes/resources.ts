import express from 'express';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import {
  getCharacterResources,
  allocateResources,
  submitResourceSurveyChoice
} from '../services/resourceService';

const router = express.Router();

router.get('/character/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { character_id } = req.params;
    const user_id = req.user?.id;
    const result = await getCharacterResources(character_id, user_id);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching character resources:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch resources' });
  }
});

router.post('/allocate', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id, allocations } = req.body;
    const user_id = req.user.id;

    if (!character_id || !allocations) {
      return res.status(400).json({ error: 'character_id and allocations are required' });
    }

    const result = await allocateResources({
      character_id,
      user_id,
      allocations
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error allocating resources:', error);
    res.status(500).json({ error: error.message || 'Failed to allocate resources' });
  }
});

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

    const result = await submitResourceSurveyChoice({
      character_id,
      user_id,
      survey_option_id
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error submitting resource survey choice:', error);
    res.status(500).json({ error: error.message || 'Failed to submit survey choice' });
  }
});

export default router;
