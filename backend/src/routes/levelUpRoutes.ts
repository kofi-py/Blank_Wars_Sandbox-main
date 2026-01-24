/**
 * Level Up Routes (ADMIN TESTING ONLY)
 *
 * These endpoints are for testing level-up functionality during development.
 * DELETE THIS FILE OR COMMENT OUT THE IMPORT IN SERVER BEFORE BETA LAUNCH.
 */

import express from 'express';
import { authenticate_token } from '../services/auth';
import { CoachProgressionService } from '../services/coachProgressionService';
import { CharacterProgressionService } from '../services/characterProgressionService';
import { admin_service } from '../services/adminService';

const router = express.Router();

// POST /api/level-up/coach - Admin: Force coach level-up for testing
router.post('/coach', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { admin_secret } = req.body;

    // Validate admin secret
    if (!admin_service.validateAdminSecret(admin_secret)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid admin credentials'
      });
    }

    // Get current progression
    const progression = await CoachProgressionService.getCoachProgression(user_id);
    if (!progression) {
      return res.status(404).json({
        success: false,
        error: 'Coach progression not found'
      });
    }

    // Calculate XP needed for next level
    const current_level = progression.coach_level;
    const next_level_req = await CoachProgressionService.getLevelRequirement(current_level + 1);
    if (!next_level_req) {
      return res.status(500).json({
        error: `Could not get level requirement for level ${current_level + 1}`
      });
    }
    const xp_for_next_level = next_level_req.total_xp_required;
    const current_xp = progression.coach_experience;
    const xp_needed = xp_for_next_level - current_xp;

    // Award enough XP to level up once
    const result = await CoachProgressionService.awardXP(
      user_id,
      'battle_win',
      xp_needed,
      '[ADMIN TEST] Level-up test - awarded via admin panel',
      'admin_test'
    );

    // Get updated progression
    const updated_progression = await CoachProgressionService.getCoachProgression(user_id);

    res.json({
      success: true,
      message: result.leveled_up
        ? `Coach level up successful! ${result.old_level} → ${result.new_level}`
        : 'XP awarded, but no level up occurred',
      xp_awarded: xp_needed,
      leveled_up: result.leveled_up,
      old_level: result.old_level,
      new_level: result.new_level,
      current_xp: updated_progression?.coach_experience,
      current_level: updated_progression?.coach_level,
      current_title: updated_progression?.coach_title,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in admin coach level-up:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process admin coach level-up'
    });
  }
});

// POST /api/level-up/character - Admin: Force character level-up for testing
router.post('/character', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { admin_secret, character_id } = req.body;

    // Validate admin secret
    if (!admin_service.validateAdminSecret(admin_secret)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid admin credentials'
      });
    }

    // Validate character_id provided
    if (!character_id) {
      return res.status(400).json({
        success: false,
        error: 'character_id is required'
      });
    }

    // Get current character progression
    const progression = await CharacterProgressionService.getCharacterProgression(character_id);
    if (!progression) {
      return res.status(404).json({
        success: false,
        error: 'Character progression not found'
      });
    }

    // Calculate XP needed for next level
    const current_level = progression.level;
    const xp_for_next_level = CharacterProgressionService.calculateXPForLevel(current_level + 1);
    const current_xp = progression.experience;
    const xp_needed = xp_for_next_level - current_xp;

    // Award enough XP to level up once
    const result = await CharacterProgressionService.awardExperience(
      character_id,
      xp_needed,
      'event',
      '[ADMIN TEST] Level-up test - awarded via admin panel',
      1.0
    );

    // Get updated progression
    const updated_progression = await CharacterProgressionService.getCharacterProgression(character_id);

    res.json({
      success: true,
      message: result.leveled_up
        ? `Character level up successful! ${result.old_level} → ${result.new_level}`
        : 'XP awarded, but no level up occurred',
      character_id: character_id,
      xp_awarded: xp_needed,
      leveled_up: result.leveled_up,
      old_level: result.old_level,
      new_level: result.new_level,
      current_xp: updated_progression?.experience,
      current_level: updated_progression?.level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in admin character level-up:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process admin character level-up'
    });
  }
});

export default router;
