import { db } from '../database';
import ChallengeRewardService from './challengeRewardService';

/**
 * Challenge Scoring Service
 * Calculates scores, determines placements, and completes challenges
 * Governance: NO FALLBACKS, explicit scoring rules
 */

export interface ChallengeResult {
  id: string;
  active_challenge_id: string;
  challenge_template_id: string;
  winner_character_id: string | null;
  second_place_character_id: string | null;
  third_place_character_id: string | null;
  total_participants: number;
  completion_time_minutes: number | null;
  full_results: Record<string, any>;
  highlight_moments: string[];
}

export interface ParticipantScore {
  user_character_id: string;
  final_score: number;
  placement: number;
  performance_metrics: Record<string, any>;
}

export class ChallengeScoringService {
  private static instance: ChallengeScoringService;
  private reward_service: ChallengeRewardService;

  private constructor() {
    this.reward_service = ChallengeRewardService.get_instance();
  }

  static get_instance(): ChallengeScoringService {
    if (!ChallengeScoringService.instance) {
      ChallengeScoringService.instance = new ChallengeScoringService();
    }
    return ChallengeScoringService.instance;
  }

  /**
   * Complete a challenge and calculate all results
   */
  async completeChallenge(
    challenge_id: string,
    highlight_moments: string[] = []
  ): Promise<ChallengeResult> {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Get challenge info
      const challenge_result = await client.query(
        `SELECT ac.*, ct.mechanics, ct.base_currency_reward
         FROM active_challenges ac
         JOIN challenge_templates ct ON ct.id = ac.challenge_template_id
         WHERE ac.id = $1`,
        [challenge_id]
      );

      const challenge = challenge_result.rows[0];
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      if (challenge.status !== 'in_progress' && challenge.status !== 'voting') {
        throw new Error(`Cannot complete challenge with status ${challenge.status}`);
      }

      // Calculate completion time
      const completion_time = challenge.start_time
        ? Math.floor((Date.now() - new Date(challenge.start_time).getTime()) / 60000)
        : null;

      // Get all participants
      const participants_result = await client.query(
        `SELECT * FROM challenge_participants
         WHERE active_challenge_id = $1`,
        [challenge_id]
      );

      const participants = participants_result.rows;

      // Calculate final scores and placements
      const scored_participants = await this.calculatePlacements(
        client,
        participants,
        challenge.mechanics
      );

      // Determine top 3
      const winner = scored_participants[0] || null;
      const second_place = scored_participants[1] || null;
      const third_place = scored_participants[2] || null;

      // Create challenge result
      const result_insert = await client.query(
        `INSERT INTO challenge_results
         (active_challenge_id, challenge_template_id, winner_character_id,
          second_place_character_id, third_place_character_id, total_participants,
          completion_time_minutes, full_results, highlight_moments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          challenge_id,
          challenge.challenge_template_id,
          winner?.user_character_id || null,
          second_place?.user_character_id || null,
          third_place?.user_character_id || null,
          participants.length,
          completion_time,
          JSON.stringify({
            rankings: scored_participants,
            mechanics_used: challenge.mechanics
          }),
          highlight_moments
        ]
      );

      const result = result_insert.rows[0];

      // Mark challenge as completed
      await client.query(
        `UPDATE active_challenges
         SET status = 'completed', end_time = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [challenge_id]
      );

      await client.query('COMMIT');

      console.log(`🏆 Challenge ${challenge_id} completed! Winner: ${winner?.user_character_id || 'None'}`);

      // Distribute rewards (outside transaction)
      const participant_ids = participants.map(p => p.user_character_id);
      await this.reward_service.distributeRewards(
        result.id,
        challenge.challenge_template_id,
        winner?.user_character_id || '',
        second_place?.user_character_id || null,
        third_place?.user_character_id || null,
        participant_ids
      );

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error completing challenge:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate placements for all participants
   */
  private async calculatePlacements(
    client: any,
    participants: any[],
    mechanics: Record<string, any>
  ): Promise<ParticipantScore[]> {
    // Sort participants by final_score (descending)
    const sorted = participants
      .filter(p => p.final_score !== null)
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0));

    // Assign placements
    const scored: ParticipantScore[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const participant = sorted[i];
      const placement = i + 1;

      // Update participant placement in database
      await client.query(
        `UPDATE challenge_participants
         SET placement = $1, updated_at = NOW()
         WHERE id = $2`,
        [placement, participant.id]
      );

      scored.push({
        user_character_id: participant.user_character_id,
        final_score: participant.final_score,
        placement,
        performance_metrics: participant.performance_metrics
      });
    }

    return scored;
  }

  /**
   * Calculate score for a participant based on mechanics
   */
  calculateScore(
    performance_metrics: Record<string, any>,
    mechanics: Record<string, any>
  ): number {
    // Default: sum all numeric performance metrics
    let score = 0;

    for (const [key, value] of Object.entries(performance_metrics)) {
      if (typeof value === 'number') {
        score += value;
      }
    }

    // Apply mechanics-based modifiers
    if (mechanics.score_multiplier) {
      score *= mechanics.score_multiplier;
    }

    if (mechanics.bonus_points) {
      score += mechanics.bonus_points;
    }

    return Math.max(0, score); // No negative scores
  }

  /**
   * Get challenge results
   */
  async getChallengeResult(result_id: string): Promise<ChallengeResult | null> {
    const result = await db.query(
      'SELECT * FROM challenge_results WHERE id = $1',
      [result_id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all completed challenges for a character
   */
  async getCharacterChallengeHistory(user_character_id: string): Promise<ChallengeResult[]> {
    const result = await db.query(
      `SELECT cr.*
       FROM challenge_results cr
       WHERE cr.winner_character_id = $1
          OR cr.second_place_character_id = $1
          OR cr.third_place_character_id = $1
          OR EXISTS (
            SELECT 1 FROM challenge_participants cp
            WHERE cp.active_challenge_id = cr.active_challenge_id
              AND cp.user_character_id = $1
          )
       ORDER BY cr.completed_at DESC`,
      [user_character_id]
    );

    return result.rows;
  }
}

export default ChallengeScoringService;
