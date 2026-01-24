import { db } from '../database';

/**
 * Challenge Service
 * Manages reality show challenges - create, start, progress, complete
 * Governance: NO FALLBACKS, Dollars-Everywhere (integer USD not cents)
 */

export interface ChallengeTemplate {
  id: string;
  name: string;
  description: string;
  challenge_type: string;
  min_participants: number;
  max_participants: number;
  requires_team: boolean;
  mechanics: Record<string, any>;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  estimated_duration_minutes: number;
  reality_show_parody: string | null;
  theme_tags: string[];
  base_currency_reward: number; // USD integer dollars
}

export interface ActiveChallenge {
  id: string;
  challenge_template_id: string;
  user_id: string;
  status: 'registration' | 'ready' | 'in_progress' | 'voting' | 'completed' | 'cancelled';
  registration_deadline: Date | null;
  start_time: Date | null;
  end_time: Date | null;
  game_state: Record<string, any>;
}

export interface ChallengeParticipant {
  id: string;
  active_challenge_id: string;
  user_character_id: string;
  team_assignment: string | null;
  performance_metrics: Record<string, any>;
  final_score: number | null;
  placement: number | null;
  is_eliminated: boolean;
}

export class ChallengeService {
  private static instance: ChallengeService;

  private constructor() {}

  static get_instance(): ChallengeService {
    if (!ChallengeService.instance) {
      ChallengeService.instance = new ChallengeService();
    }
    return ChallengeService.instance;
  }

  /**
   * Get all available challenge templates
   */
  async getAvailableTemplates(): Promise<ChallengeTemplate[]> {
    const result = await db.query(
      `SELECT * FROM challenge_templates
       WHERE is_active = true
       ORDER BY difficulty, name`
    );

    return result.rows;
  }

  /**
   * Get challenge template by ID
   */
  async getTemplate(template_id: string): Promise<ChallengeTemplate | null> {
    const result = await db.query(
      'SELECT * FROM challenge_templates WHERE id = $1',
      [template_id]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new active challenge instance
   */
  async createChallenge(
    template_id: string,
    user_id: string,
    registration_deadline_minutes: number = 30
  ): Promise<ActiveChallenge> {
    const template = await this.getTemplate(template_id);
    if (!template) {
      throw new Error(`Challenge template ${template_id} not found`);
    }

    const registration_deadline = new Date();
    registration_deadline.setMinutes(registration_deadline.getMinutes() + registration_deadline_minutes);

    const result = await db.query(
      `INSERT INTO active_challenges
       (challenge_template_id, user_id, status, registration_deadline, game_state)
       VALUES ($1, $2, 'registration', $3, '{}'::jsonb)
       RETURNING *`,
      [template_id, user_id, registration_deadline]
    );

    console.log(`✅ Challenge created: ${template.name} (ID: ${result.rows[0].id})`);

    return result.rows[0];
  }

  /**
   * Register a character for a challenge
   */
  async registerParticipant(
    challenge_id: string,
    user_character_id: string
  ): Promise<ChallengeParticipant> {
    // Check challenge status
    const challenge_result = await db.query(
      'SELECT status FROM active_challenges WHERE id = $1',
      [challenge_id]
    );

    const challenge = challenge_result.rows[0];
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.status !== 'registration') {
      throw new Error(`Cannot register - challenge status is ${challenge.status}`);
    }

    // Check if already registered
    const existing_result = await db.query(
      'SELECT id FROM challenge_participants WHERE active_challenge_id = $1 AND user_character_id = $2',
      [challenge_id, user_character_id]
    );

    if (existing_result.rows.length > 0) {
      throw new Error('Character already registered for this challenge');
    }

    // Register participant
    const result = await db.query(
      `INSERT INTO challenge_participants
       (active_challenge_id, user_character_id, performance_metrics)
       VALUES ($1, $2, '{}'::jsonb)
       RETURNING *`,
      [challenge_id, user_character_id]
    );

    console.log(`✅ Participant registered for challenge ${challenge_id}`);

    return result.rows[0];
  }

  /**
   * Start a challenge (move from registration to in_progress)
   */
  async startChallenge(challenge_id: string): Promise<ActiveChallenge> {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Get challenge and check participant count
      const challenge_result = await client.query(
        `SELECT ac.*, ct.min_participants, ct.max_participants
         FROM active_challenges ac
         JOIN challenge_templates ct ON ct.id = ac.challenge_template_id
         WHERE ac.id = $1`,
        [challenge_id]
      );

      const challenge = challenge_result.rows[0];
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      if (challenge.status !== 'registration' && challenge.status !== 'ready') {
        throw new Error(`Cannot start challenge - status is ${challenge.status}`);
      }

      // Count participants
      const participant_result = await client.query(
        'SELECT COUNT(*) as count FROM challenge_participants WHERE active_challenge_id = $1',
        [challenge_id]
      );

      const participant_count = parseInt(participant_result.rows[0].count);

      if (participant_count < challenge.min_participants) {
        throw new Error(`Not enough participants (need ${challenge.min_participants}, have ${participant_count})`);
      }

      // Start challenge
      const start_time = new Date();
      const result = await client.query(
        `UPDATE active_challenges
         SET status = 'in_progress', start_time = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [start_time, challenge_id]
      );

      await client.query('COMMIT');

      console.log(`🎮 Challenge ${challenge_id} started with ${participant_count} participants`);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update participant performance
   */
  async updateParticipantPerformance(
    participant_id: string,
    performance_metrics: Record<string, any>,
    final_score?: number
  ): Promise<ChallengeParticipant> {
    const result = await db.query(
      `UPDATE challenge_participants
       SET performance_metrics = $1,
           final_score = COALESCE($2, final_score),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(performance_metrics), final_score, participant_id]
    );

    return result.rows[0];
  }

  /**
   * Get all participants for a challenge
   */
  async getParticipants(challenge_id: string): Promise<ChallengeParticipant[]> {
    const result = await db.query(
      `SELECT * FROM challenge_participants
       WHERE active_challenge_id = $1
       ORDER BY placement NULLS LAST, final_score DESC`,
      [challenge_id]
    );

    return result.rows;
  }

  /**
   * Get active challenges for a user
   */
  async getActiveChallenges(user_id: string): Promise<ActiveChallenge[]> {
    const result = await db.query(
      `SELECT ac.*, ct.name, ct.description, ct.reality_show_parody
       FROM active_challenges ac
       JOIN challenge_templates ct ON ct.id = ac.challenge_template_id
       WHERE ac.user_id = $1
         AND ac.status IN ('registration', 'ready', 'in_progress', 'voting')
       ORDER BY ac.created_at DESC`,
      [user_id]
    );

    return result.rows;
  }

  /**
   * Cancel a challenge
   */
  async cancelChallenge(challenge_id: string): Promise<void> {
    await db.query(
      `UPDATE active_challenges
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status IN ('registration', 'ready')`,
      [challenge_id]
    );

    console.log(`❌ Challenge ${challenge_id} cancelled`);
  }
}

export default ChallengeService;
