import { db } from '../database';

/**
 * Alliance Service
 * Manages Survivor-style alliances within challenges
 * Governance: NO FALLBACKS - alliances must be explicitly formed
 */

export interface ChallengeAlliance {
  id: string;
  active_challenge_id: string;
  alliance_name: string | null;
  leader_character_id: string;
  member_character_ids: string[];
  is_active: boolean;
  formed_at: Date;
  dissolved_at: Date | null;
}

export class AllianceService {
  private static instance: AllianceService;

  private constructor() {}

  static get_instance(): AllianceService {
    if (!AllianceService.instance) {
      AllianceService.instance = new AllianceService();
    }
    return AllianceService.instance;
  }

  /**
   * Form a new alliance in a challenge
   */
  async formAlliance(
    challenge_id: string,
    leader_character_id: string,
    member_character_ids: string[],
    alliance_name?: string
  ): Promise<ChallengeAlliance> {
    // Validate all members are participants in the challenge
    const participants_result = await db.query(
      `SELECT user_character_id
       FROM challenge_participants
       WHERE active_challenge_id = $1 AND user_character_id = ANY($2)`,
      [challenge_id, [leader_character_id, ...member_character_ids]]
    );

    const valid_participants = new Set(participants_result.rows.map(r => r.user_character_id));

    if (!valid_participants.has(leader_character_id)) {
      throw new Error('Leader is not a participant in this challenge');
    }

    const invalid_members = member_character_ids.filter(id => !valid_participants.has(id));
    if (invalid_members.length > 0) {
      throw new Error(`Invalid members: ${invalid_members.join(', ')}`);
    }

    // Create alliance
    const result = await db.query(
      `INSERT INTO challenge_alliances
       (active_challenge_id, alliance_name, leader_character_id, member_character_ids)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [challenge_id, alliance_name || null, leader_character_id, member_character_ids]
    );

    console.log(`🤝 Alliance formed in challenge ${challenge_id}: ${alliance_name || 'Unnamed'} (${member_character_ids.length + 1} members)`);

    return result.rows[0];
  }

  /**
   * Add a member to an existing alliance
   */
  async addMember(
    alliance_id: string,
    new_member_character_id: string
  ): Promise<ChallengeAlliance> {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Get alliance
      const alliance_result = await client.query(
        'SELECT * FROM challenge_alliances WHERE id = $1 AND is_active = true',
        [alliance_id]
      );

      const alliance = alliance_result.rows[0];
      if (!alliance) {
        throw new Error('Alliance not found or inactive');
      }

      // Verify new member is a participant
      const participant_result = await client.query(
        `SELECT user_character_id
         FROM challenge_participants
         WHERE active_challenge_id = $1 AND user_character_id = $2`,
        [alliance.active_challenge_id, new_member_character_id]
      );

      if (participant_result.rows.length === 0) {
        throw new Error('Character is not a participant in this challenge');
      }

      // Check if already a member
      if (alliance.member_character_ids.includes(new_member_character_id)) {
        throw new Error('Character is already a member of this alliance');
      }

      // Add member
      const updated_members = [...alliance.member_character_ids, new_member_character_id];

      const result = await client.query(
        `UPDATE challenge_alliances
         SET member_character_ids = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [updated_members, alliance_id]
      );

      await client.query('COMMIT');

      console.log(`➕ Member added to alliance ${alliance_id}`);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove a member from an alliance
   */
  async removeMember(
    alliance_id: string,
    member_character_id: string
  ): Promise<ChallengeAlliance> {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Get alliance
      const alliance_result = await client.query(
        'SELECT * FROM challenge_alliances WHERE id = $1 AND is_active = true',
        [alliance_id]
      );

      const alliance = alliance_result.rows[0];
      if (!alliance) {
        throw new Error('Alliance not found or inactive');
      }

      // Remove member
      const updated_members = alliance.member_character_ids.filter(
        (id: string) => id !== member_character_id
      );

      const result = await client.query(
        `UPDATE challenge_alliances
         SET member_character_ids = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [updated_members, alliance_id]
      );

      await client.query('COMMIT');

      console.log(`➖ Member removed from alliance ${alliance_id}`);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Dissolve an alliance (betrayal!)
   */
  async dissolveAlliance(alliance_id: string): Promise<void> {
    await db.query(
      `UPDATE challenge_alliances
       SET is_active = false, dissolved_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [alliance_id]
    );

    console.log(`💔 Alliance ${alliance_id} dissolved`);
  }

  /**
   * Get all active alliances for a challenge
   */
  async getAlliances(challenge_id: string): Promise<ChallengeAlliance[]> {
    const result = await db.query(
      `SELECT * FROM challenge_alliances
       WHERE active_challenge_id = $1 AND is_active = true
       ORDER BY formed_at`,
      [challenge_id]
    );

    return result.rows;
  }

  /**
   * Get alliances a character is part of
   */
  async getCharacterAlliances(
    challenge_id: string,
    character_id: string
  ): Promise<ChallengeAlliance[]> {
    const result = await db.query(
      `SELECT * FROM challenge_alliances
       WHERE active_challenge_id = $1
         AND is_active = true
         AND (leader_character_id = $2 OR $2 = ANY(member_character_ids))
       ORDER BY formed_at`,
      [challenge_id, character_id]
    );

    return result.rows;
  }

  /**
   * Check if two characters are in an alliance together
   */
  async areAllied(
    challenge_id: string,
    character_id1: string,
    character_id2: string
  ): Promise<boolean> {
    const result = await db.query(
      `SELECT id FROM challenge_alliances
       WHERE active_challenge_id = $1
         AND is_active = true
         AND (
           (leader_character_id = $2 AND $3 = ANY(member_character_ids))
           OR (leader_character_id = $3 AND $2 = ANY(member_character_ids))
           OR ($2 = ANY(member_character_ids) AND $3 = ANY(member_character_ids))
         )
       LIMIT 1`,
      [challenge_id, character_id1, character_id2]
    );

    return result.rows.length > 0;
  }

  /**
   * Calculate alliance strength (for bonuses in challenges)
   */
  async getAllianceStrength(alliance_id: string): Promise<number> {
    const result = await db.query(
      'SELECT member_character_ids FROM challenge_alliances WHERE id = $1',
      [alliance_id]
    );

    const alliance = result.rows[0];
    if (!alliance) return 0;

    // Strength = number of members (including leader)
    return (alliance.member_character_ids?.length || 0) + 1;
  }
}

export default AllianceService;
