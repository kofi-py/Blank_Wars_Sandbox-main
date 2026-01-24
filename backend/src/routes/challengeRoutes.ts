import { Router } from 'express';
import { authenticate_token } from '../services/auth';
import { ChallengeService } from '../services/challengeService';
import { ChallengeRewardService } from '../services/challengeRewardService';
import { ChallengeScoringService } from '../services/challengeScoringService';
import { AllianceService } from '../services/allianceService';

const router = Router();
const challenge_service = ChallengeService.get_instance();
const reward_service = ChallengeRewardService.get_instance();
const scoring_service = ChallengeScoringService.get_instance();
const alliance_service = AllianceService.get_instance();

/**
 * GET /api/challenges/templates
 * Get all available challenge templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await challenge_service.getAvailableTemplates();
    return res.json({
      success: true,
      templates
    });
  } catch (error: any) {
    console.error('Error fetching challenge templates:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/challenges/templates/:id
 * Get specific challenge template
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await challenge_service.getTemplate(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Challenge template not found'
      });
    }

    return res.json({
      success: true,
      template
    });
  } catch (error: any) {
    console.error('Error fetching challenge template:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/challenges
 * Create new challenge instance
 * Body: { template_id: string, registration_deadline_minutes?: number }
 */
router.post('/', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const { template_id, registration_deadline_minutes } = req.body;

    if (!template_id) {
      return res.status(400).json({
        success: false,
        error: 'template_id is required'
      });
    }

    const challenge = await challenge_service.createChallenge(
      template_id,
      user_id,
      registration_deadline_minutes
    );

    return res.json({
      success: true,
      challenge
    });
  } catch (error: any) {
    console.error('Error creating challenge:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/challenges/active
 * Get user's active challenges
 */
router.get('/active', authenticate_token, async (req: any, res) => {
  try {
    const user_id = req.user.id;
    const challenges = await challenge_service.getActiveChallenges(user_id);

    return res.json({
      success: true,
      challenges
    });
  } catch (error: any) {
    console.error('Error fetching active challenges:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/challenges/:id/register
 * Register character for challenge
 * Body: { user_character_id: string }
 */
router.post('/:id/register', authenticate_token, async (req: any, res) => {
  try {
    const { id: challenge_id } = req.params;
    const { user_character_id } = req.body;

    if (!user_character_id) {
      return res.status(400).json({
        success: false,
        error: 'user_character_id is required'
      });
    }

    const participant = await challenge_service.registerParticipant(
      challenge_id,
      user_character_id
    );

    return res.json({
      success: true,
      participant
    });
  } catch (error: any) {
    console.error('Error registering for challenge:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/challenges/:id/participants
 * Get all participants for a challenge
 */
router.get('/:id/participants', async (req, res) => {
  try {
    const { id: challenge_id } = req.params;
    const participants = await challenge_service.getParticipants(challenge_id);

    return res.json({
      success: true,
      participants
    });
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/challenges/:id/complete
 * Complete challenge and distribute rewards
 * Body: { results: { participant_id: string, final_score: number, placement: number }[] }
 */
router.post('/:id/complete', authenticate_token, async (req: any, res) => {
  try {
    const { id: challenge_id } = req.params;
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        error: 'results array is required'
      });
    }

    const completion_result = await scoring_service.completeChallenge(
      challenge_id,
      results
    );

    return res.json({
      success: true,
      result: completion_result
    });
  } catch (error: any) {
    console.error('Error completing challenge:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/challenges/:id/alliance
 * Create alliance within a challenge
 * Body: { leader_character_id: string, member_character_ids: string[], alliance_name?: string }
 */
router.post('/:id/alliance', authenticate_token, async (req: any, res) => {
  try {
    const { id: challenge_id } = req.params;
    const { leader_character_id, member_character_ids, alliance_name } = req.body;

    if (!leader_character_id || !member_character_ids || !Array.isArray(member_character_ids)) {
      return res.status(400).json({
        success: false,
        error: 'leader_character_id and member_character_ids array are required'
      });
    }

    const alliance = await alliance_service.formAlliance(
      challenge_id,
      leader_character_id,
      member_character_ids,
      alliance_name
    );

    return res.json({
      success: true,
      alliance
    });
  } catch (error: any) {
    console.error('Error forming alliance:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/challenges/:id/alliances
 * Get all alliances in a challenge
 */
router.get('/:id/alliances', async (req, res) => {
  try {
    const { id: challenge_id } = req.params;
    const alliances = await alliance_service.getAlliances(challenge_id);

    return res.json({
      success: true,
      alliances
    });
  } catch (error: any) {
    console.error('Error fetching alliances:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/challenges/:challenge_id/alliances/:alliance_id
 * Dissolve an alliance (betrayal!)
 */
router.delete('/:challenge_id/alliances/:alliance_id', authenticate_token, async (req: any, res) => {
  try {
    const { alliance_id } = req.params;
    await alliance_service.dissolveAlliance(alliance_id);

    return res.json({
      success: true,
      message: 'Alliance dissolved'
    });
  } catch (error: any) {
    console.error('Error dissolving alliance:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/challenges/rewards/unclaimed/:user_character_id
 * Get unclaimed rewards for a character
 */
router.get('/rewards/unclaimed/:user_character_id', authenticate_token, async (req: any, res) => {
  try {
    const { user_character_id } = req.params;
    const rewards = await reward_service.getUnclaimedRewards(user_character_id);

    return res.json({
      success: true,
      rewards
    });
  } catch (error: any) {
    console.error('Error fetching unclaimed rewards:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
