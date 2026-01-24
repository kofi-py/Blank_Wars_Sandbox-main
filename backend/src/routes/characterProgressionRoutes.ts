import express from 'express';
import { CharacterProgressionService } from '../services/characterProgressionService';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';

const router = express.Router();

/**
 * GET /api/character-progression/:character_id
 * Get character's progression data
 */
router.get('/:character_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;

    // Verify character belongs to authenticated user
    const character_check = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!character_check) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }

    const progression = await CharacterProgressionService.getCharacterProgression(character_id);
    const skills = await CharacterProgressionService.getCharacterSkills(character_id);
    const abilities = await CharacterProgressionService.getCharacterAbilities(character_id);
    const experience_history = await CharacterProgressionService.getExperienceHistory(character_id, 20);

    res.json({
      progression,
      skills,
      abilities,
      experience_history
    });
  } catch (error) {
    console.error('Error getting character progression:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/character-progression/:character_id/award-xp
 * Award experience to a character
 */
router.post('/:character_id/award-xp', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const { amount, source, description, multiplier = 1.0 } = req.body;

    if (!amount || !source || !description) {
      return res.status(400).json({ error: 'Missing required fields: amount, source, description' });
    }

    if (amount <= 0 || amount > 10000) {
      return res.status(400).json({ error: 'Experience amount must be between 1 and 10000' });
    }

    // Verify character belongs to authenticated user
    const character_check = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!character_check) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }

    const result = await CharacterProgressionService.awardExperience(
      character_id,
      amount,
      source,
      description,
      multiplier
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error awarding experience:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/character-progression/:character_id/unlock-skill
 * Unlock a skill for a character
 */
router.post('/:character_id/unlock-skill', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const { skill_id, skill_name, max_level = 10 } = req.body;

    if (!skill_id || !skill_name) {
      return res.status(400).json({ error: 'Missing required fields: skill_id, skill_name' });
    }

    // Verify character belongs to authenticated user
    const character_check = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!character_check) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }

    // Check if character has enough skill points
    if (character_check.skill_points < 1) {
      return res.status(400).json({ error: 'Not enough skill points to unlock this skill' });
    }

    const skill = await CharacterProgressionService.unlockSkill(character_id, skill_id, skill_name, max_level);

    // Deduct skill point (this should be handled in the service)
    // For now, we'll update it here
    // TODO: Move this logic into the service

    res.json({
      success: true,
      skill
    });
  } catch (error) {
    console.error('Error unlocking skill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/character-progression/:character_id/progress-skill
 * Progress a skill by gaining experience
 */
router.post('/:character_id/progress-skill', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const { skill_id, experience_gained } = req.body;

    if (!skill_id || !experience_gained) {
      return res.status(400).json({ error: 'Missing required fields: skill_id, experience_gained' });
    }

    if (experience_gained <= 0 || experience_gained > 1000) {
      return res.status(400).json({ error: 'Experience gained must be between 1 and 1000' });
    }

    // Verify character belongs to authenticated user
    const character_check = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!character_check) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }

    const result = await CharacterProgressionService.progressSkill(character_id, skill_id, experience_gained);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error progressing skill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/character-progression/:character_id/unlock-ability
 * Unlock an ability for a character
 */
router.post('/:character_id/unlock-ability', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const { ability_id, ability_name, max_rank = 5 } = req.body;

    if (!ability_id || !ability_name) {
      return res.status(400).json({ error: 'Missing required fields: ability_id, ability_name' });
    }

    // Verify character belongs to authenticated user
    const character_check = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!character_check) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }

    // Check if character has enough ability points
    if (character_check.ability_points < 1) {
      return res.status(400).json({ error: 'Not enough ability points to unlock this ability' });
    }

    const ability = await CharacterProgressionService.unlockAbility(character_id, ability_id, ability_name, max_rank);

    res.json({
      success: true,
      ability
    });
  } catch (error) {
    console.error('Error unlocking ability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/character-progression/:character_id/xp-history
 * Get character's experience gain history
 */
router.get('/:character_id/xp-history', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (limit > 200) {
      return res.status(400).json({ error: 'Limit cannot exceed 200' });
    }

    // Verify character belongs to authenticated user
    const character_check = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!character_check) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }

    const history = await CharacterProgressionService.getExperienceHistory(character_id, limit);

    res.json({ history });
  } catch (error) {
    console.error('Error getting experience history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/character-progression/xp-calculator/:level
 * Calculate XP requirements for a specific level
 */
router.get('/xp-calculator/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level);

    if (isNaN(level) || level < 1 || level > 100) {
      return res.status(400).json({ error: 'Level must be between 1 and 100' });
    }

    const req_current = await CharacterProgressionService.getLevelRequirement(level);
    if (!req_current) {
      throw new Error(`STRICT MODE: Level requirement for level ${level} not found in database`);
    }

    const total_xpForLevel = parseInt(req_current.total_xp_required);

    // Level 1 has no previous level - prev_total is 0
    // Levels 2+ should have previous level requirements
    let prev_total = 0;
    if (level > 1) {
      const req_prev = await CharacterProgressionService.getLevelRequirement(level - 1);
      if (!req_prev) {
        throw new Error(`STRICT MODE: Level requirement for level ${level - 1} not found in database`);
      }
      prev_total = parseInt(req_prev.total_xp_required);
    }

    const xp_for_level = total_xpForLevel - prev_total;

    res.json({
      level,
      xp_for_this_level: xp_for_level,
      total_xpRequired: total_xpForLevel
    });
  } catch (error) {
    console.error('Error calculating XP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/character-progression/:character_id/upgrade-spell
 * Upgrade a spell's rank
 */
router.post('/:character_id/upgrade-spell', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const { spell_id } = req.body;

    if (!spell_id) {
      return res.status(400).json({ error: 'Missing required field: spell_id' });
    }

    // Verify character belongs to authenticated user
    const character_check = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!character_check) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }

    const result = await CharacterProgressionService.upgradeSpellRank(character_id, spell_id);

    res.json(result);
  } catch (error) {
    console.error('Error upgrading spell:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * POST /api/character-progression/:character_id/upgrade-power
 * Upgrade a power's rank
 */
router.post('/:character_id/upgrade-power', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id } = req.params;
    const { power_id } = req.body;

    if (!power_id) {
      return res.status(400).json({ error: 'Missing required field: power_id' });
    }

    // Verify character belongs to authenticated user
    const character_check = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!character_check) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character_check.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this character' });
    }

    const result = await CharacterProgressionService.upgradePowerRank(character_id, power_id);

    res.json(result);
  } catch (error) {
    console.error('Error upgrading power:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

/**
 * GET /api/character-progression/milestone-rewards
 * Get all milestone rewards
 */
router.get('/milestone-rewards', async (req, res) => {
  try {
    const { query } = await import('../database/index');
    const result = await query('SELECT * FROM milestone_rewards ORDER BY level ASC');

    res.json({
      success: true,
      milestones: result.rows
    });
  } catch (error) {
    console.error('Error fetching milestone rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;