import express from 'express';
import { authenticate_token } from '../services/auth';
import { CoachProgressionService } from '../services/coachProgressionService';
import { admin_service } from '../services/adminService';

const router = express.Router();

// GET /api/coach-progression - Get user's coach progression
router.get('/', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const progression = await CoachProgressionService.getCoachProgression(user_id);

    if (!progression) {
      return res.status(404).json({ error: 'Coach progression not found' });
    }

    // Calculate level progress
    const current_level_req = await CoachProgressionService.getLevelRequirement(progression.coach_level);
    const next_level_req = await CoachProgressionService.getLevelRequirement(progression.coach_level + 1);

    if (!current_level_req) {
      throw new Error(`STRICT MODE: No level requirement for level ${progression.coach_level}`);
    }
    if (!next_level_req) {
      throw new Error(`STRICT MODE: No level requirement for level ${progression.coach_level + 1}`);
    }

    const current_level_xp = current_level_req.total_xp_required;
    const next_level_xp = next_level_req.total_xp_required;

    const progress_in_current_level = progression.coach_experience - current_level_xp;
    const xp_to_next_level = next_level_xp - progression.coach_experience;

    // Calculate coach bonuses
    const bonuses = CoachProgressionService.calculateCoachBonuses(progression);

    res.json({
      progression: {
        ...progression,
        progress_in_current_level,
        xp_to_next_level,
        next_level_xp,
        current_level_xp
      },
      bonuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting coach progression:', error);
    res.status(500).json({ error: 'Failed to get coach progression' });
  }
});

// GET /api/coach-progression/xp-history - Get XP event history
router.get('/xp-history', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await CoachProgressionService.getXPHistory(user_id, limit);

    res.json({
      history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting XP history:', error);
    res.status(500).json({ error: 'Failed to get XP history' });
  }
});

// GET /api/coach-progression/skills - Get coach skills
router.get('/skills', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const skills = await CoachProgressionService.getCoachSkills(user_id);

    res.json({
      skills,
      count: skills.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting coach skills:', error);
    res.status(500).json({ error: 'Failed to get coach skills' });
  }
});

// GET /api/coach-progression/skills-with-overall - Get coach skills with calculated overall_skill
router.get('/skills-with-overall', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const skills_data = await CoachProgressionService.getCoachSkillsWithOverall(user_id);

    res.json({
      skills: skills_data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting coach skills with overall:', error);
    res.status(500).json({ error: 'Failed to get coach skills with overall' });
  }
});

// POST /api/coach-progression/award-xp - Award XP (internal use)
router.post('/award-xp', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { event_type, xp_amount, description, event_subtype, battle_id, character_id } = req.body;

    if (!event_type || !xp_amount || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await CoachProgressionService.awardXP(
      user_id,
      event_type,
      xp_amount,
      description,
      event_subtype,
      battle_id,
      character_id
    );

    res.json({
      success: true,
      xp_awarded: xp_amount,
      leveled_up: result.leveled_up,
      new_level: result.new_level,
      old_level: result.old_level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error awarding XP:', error);
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

// POST /api/coach-progression/award-battle-xp - Award battle XP
router.post('/award-battle-xp', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { is_win, battle_id, character_id, bonus_multiplier, bonus_reason } = req.body;

    if (typeof is_win !== 'boolean' || !battle_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await CoachProgressionService.awardBattleXP(
      user_id,
      is_win,
      battle_id,
      character_id,
      bonus_multiplier || 1.0,
      bonus_reason
    );

    res.json({
      success: true,
      battle_result: is_win ? 'win' : 'loss',
      leveled_up: result.leveled_up,
      new_level: result.new_level,
      old_level: result.old_level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error awarding battle XP:', error);
    res.status(500).json({ error: 'Failed to award battle XP' });
  }
});

// POST /api/coach-progression/award-psychology-xp - Award psychology management XP
router.post('/award-psychology-xp', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { psychology_event_type, xp_amount, description, battle_id, character_id } = req.body;

    if (!psychology_event_type || !xp_amount || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await CoachProgressionService.awardPsychologyXP(
      user_id,
      psychology_event_type,
      xp_amount,
      description,
      battle_id,
      character_id
    );

    res.json({
      success: true,
      psychology_event: psychology_event_type,
      xp_awarded: xp_amount,
      leveled_up: result.leveled_up,
      new_level: result.new_level,
      old_level: result.old_level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error awarding psychology XP:', error);
    res.status(500).json({ error: 'Failed to award psychology XP' });
  }
});

// POST /api/coach-progression/award-character-development-xp - Award character development XP
router.post('/award-character-development-xp', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { development_type, xp_amount, description, character_id } = req.body;

    if (!development_type || !xp_amount || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await CoachProgressionService.awardCharacterDevelopmentXP(
      user_id,
      development_type,
      xp_amount,
      description,
      character_id
    );

    res.json({
      success: true,
      development_type,
      xp_awarded: xp_amount,
      leveled_up: result.leveled_up,
      new_level: result.new_level,
      old_level: result.old_level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error awarding character development XP:', error);
    res.status(500).json({ error: 'Failed to award character development XP' });
  }
});

// POST /api/coach-progression/award-gameplan-adherence-xp - Award gameplan adherence XP
router.post('/award-gameplan-adherence-xp', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { adherence_rate, deviations_blocked, average_deviation_severity, battle_id } = req.body;

    if (typeof adherence_rate !== 'number' || typeof deviations_blocked !== 'number' || !average_deviation_severity || !battle_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await CoachProgressionService.awardGameplanAdherenceXP(
      user_id,
      adherence_rate,
      deviations_blocked,
      average_deviation_severity,
      battle_id
    );

    res.json({
      success: true,
      adherence_rate,
      deviations_blocked,
      leveled_up: result.leveled_up,
      new_level: result.new_level,
      old_level: result.old_level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error awarding gameplan adherence XP:', error);
    res.status(500).json({ error: 'Failed to award gameplan adherence XP' });
  }
});


// POST /api/coach-progression/award-team-chemistry-xp - Award team chemistry XP
router.post('/award-team-chemistry-xp', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { chemistry_improvement, final_chemistry, battle_id } = req.body;

    if (typeof chemistry_improvement !== 'number' || typeof final_chemistry !== 'number' || !battle_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await CoachProgressionService.awardTeamChemistryXP(
      user_id,
      chemistry_improvement,
      final_chemistry,
      battle_id
    );

    res.json({
      success: true,
      chemistry_improvement,
      final_chemistry,
      leveled_up: result.leveled_up,
      new_level: result.new_level,
      old_level: result.old_level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error awarding team chemistry XP:', error);
    res.status(500).json({ error: 'Failed to award team chemistry XP' });
  }
});

// GET /api/coach-progression/leaderboard - Get coach leaderboard
router.get('/leaderboard', authenticate_token, async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await CoachProgressionService.getCoachLeaderboard(limit);

    res.json({
      leaderboard: result,
      count: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting coach leaderboard:', error);
    res.status(500).json({ error: 'Failed to get coach leaderboard' });
  }
});

export default router;