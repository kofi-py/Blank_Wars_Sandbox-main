import { User, UserProfile, Friendship } from '../types/user';
import { db_adapter } from './databaseAdapter';
import { query } from '../database/index';

export class UserService {
  async findUserById(id: string): Promise<User> {
    try {
      const result = await query(
        'SELECT id, username, email, coach_name FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error(`User not found: ${id}`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        coach_name: row.coach_name,
        password_hash: '',
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findUserByUsername(username: string): Promise<User> {
    try {
      const result = await query(
        'SELECT id, username, email, coach_name FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        throw new Error(`User not found by username: ${username}`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        coach_name: row.coach_name,
        password_hash: '',
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  async findUserProfile(user_id: string): Promise<UserProfile | undefined> {
    try {
      const db_user = await db_adapter.users.find_by_id(user_id);
      if (!db_user) return undefined;

      // Convert database user to UserProfile type
      return {
        user_id: db_user.id,
        display_name: db_user.username, // Use username as display name
        avatar_url: undefined, // Not in database schema yet
        bio: undefined, // Not in database schema yet
        level: db_user.level || 1,
        xp: db_user.experience || 0,
        character_slot_capacity: db_user.character_slot_capacity || 12
      };
    } catch (error) {
      console.error('Error finding user profile:', error);
      return undefined;
    }
  }

  async updateUserProfile(user_id: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined> {
    try {
      // Map UserProfile updates to database fields
      const db_updates: any = {};
      if (updates.display_name) db_updates.username = updates.display_name;
      if (updates.level !== undefined) db_updates.level = updates.level;
      if (updates.xp !== undefined) db_updates.experience = updates.xp;

      const success = await db_adapter.users.update(user_id, db_updates);
      if (!success) return undefined;

      // Return updated profile
      return await this.findUserProfile(user_id);
    } catch (error) {
      console.error('Error updating user profile:', error);
      return undefined;
    }
  }

  async addFriend(user_id1: string, user_id2: string): Promise<Friendship | undefined> {
    try {
      // Prevent self-friending
      if (user_id1 === user_id2) return undefined;

      // Check for existing friendship
      const existing = await query(
        'SELECT * FROM user_friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
        [user_id1, user_id2, user_id2, user_id1]
      );

      if (existing.rows.length > 0) return undefined;

      // Create friendship
      const friendship_id = `f${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await query(
        'INSERT INTO user_friendships (id, user_id, friend_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [friendship_id, user_id1, user_id2, 'pending']
      );

      return {
        id: friendship_id,
        user_id1,
        user_id2,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error('Error adding friend:', error);
      return undefined;
    }
  }

  async acceptFriendRequest(friendship_id: string): Promise<Friendship | undefined> {
    try {
      await query(
        'UPDATE user_friendships SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = $1',
        ['accepted', friendship_id, 'pending']
      );

      const result = await query('SELECT * FROM user_friendships WHERE id = $1', [friendship_id]);
      const row = result.rows[0];
      if (!row) return undefined;

      return {
        id: row.id,
        user_id1: row.user_id,
        user_id2: row.friend_id,
        status: row.status,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return undefined;
    }
  }

  async rejectFriendRequest(friendship_id: string): Promise<Friendship | undefined> {
    try {
      await query(
        'UPDATE user_friendships SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = $1',
        ['blocked', friendship_id, 'pending']
      );

      const result = await query('SELECT * FROM user_friendships WHERE id = $1', [friendship_id]);
      const row = result.rows[0];
      if (!row) return undefined;

      return {
        id: row.id,
        user_id1: row.user_id,
        user_id2: row.friend_id,
        status: row.status,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return undefined;
    }
  }

  async getFriends(user_id: string): Promise<UserProfile[]> {
    try {
      const result = await query(`
        SELECT u.* FROM users u
        JOIN user_friendships f ON (f.friend_id = u.id OR f.user_id = u.id)
        WHERE (f.user_id = ? OR f.friend_id = ?) 
          AND f.status = 'accepted'
          AND u.id != ?
      `, [user_id, user_id, user_id]);

      return result.rows.map((row: any) => ({
        user_id: row.id,
        display_name: row.username,
        avatar_url: undefined,
        bio: undefined,
        level: row.level || 1,
        xp: row.experience || 0
      }));
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  }

  async getPendingFriendRequests(user_id: string): Promise<Friendship[]> {
    try {
      const result = await query(
        'SELECT * FROM user_friendships WHERE friend_id = ? AND status = $1',
        [user_id, 'pending']
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        user_id1: row.user_id,
        user_id2: row.friend_id,
        status: row.status,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error getting pending friend requests:', error);
      return [];
    }
  }

  async searchUsers(search_query: string): Promise<UserProfile[]> {
    try {
      const lower_case_query = `%${search_query.toLowerCase()}%`;
      const result = await query(
        'SELECT * FROM users WHERE LOWER(username) LIKE ? OR LOWER(email) LIKE ? LIMIT 20',
        [lower_case_query, lower_case_query]
      );

      return result.rows.map((row: any) => ({
        user_id: row.id,
        display_name: row.username,
        avatar_url: undefined,
        bio: undefined,
        level: row.level || 1,
        xp: row.experience || 0
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async getUserCharacters(user_id: string): Promise<any[]> {
    try {
      const result = await query(
        `SELECT uc.id AS user_character_id, uc.serial_number, uc.nickname,
                uc.level, uc.experience, uc.bond_level, uc.current_health, uc.max_health,
                c.id AS character_id, c.name, c.title, c.rarity, c.avatar_emoji,
                c.archetype, c.origin_era, c.backstory, c.conversation_style,
                c.personality_traits, c.conversation_topics, c.abilities,
                c.max_health, c.attack, c.defense, c.speed, c.magic_attack,
                c.gameplan_adherence, c.current_mental_health, c.stress,
                c.team_trust, c.battle_focus
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.user_id = $1 
         AND (c.role IS NULL OR c.role NOT IN ('therapist', 'judge', 'host', 'real_estate_agent', 'trainer', 'mascot', 'system'))`,
        [user_id]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting user characters:', error);
      return [];
    }
  }


  async getTeamStats(user_id: string) {
    // Get user data
    const user_result = await query(`
      SELECT username, level, total_wins, total_losses, win_percentage,
             total_earnings, monthly_earnings
      FROM users WHERE id = $1
    `, [user_id]);
    if (user_result.rows.length === 0) {
      throw new Error('STRICT MODE: User not found');
    }
    const user = user_result.rows[0];

    // Get headquarters data
    const hq_result = await query(`
      SELECT uh.tier_id, uh.balance, uh.gems,
             ht.tier_name, ht.max_rooms, ht.max_beds
      FROM user_headquarters uh
      JOIN headquarters_tiers ht ON uh.tier_id = ht.tier_id
      WHERE uh.user_id = $1 AND uh.is_primary = true
    `, [user_id]);
    if (hq_result.rows.length === 0) {
      throw new Error('STRICT MODE: User headquarters not found');
    }
    const hq = hq_result.rows[0];

    // Get room and bed counts
    const rooms_result = await query(`
      SELECT COUNT(*) as room_count, COALESCE(SUM(capacity), 0) as bed_count
      FROM headquarters_rooms hr
      JOIN user_headquarters uh ON hr.headquarters_id = uh.id
      WHERE uh.user_id = $1 AND uh.is_primary = true
    `, [user_id]);
    const rooms = rooms_result.rows[0];

    // Get active team data
    const team_result = await query(`
      SELECT team_name, wins, losses, total_earnings, monthly_earnings
      FROM teams
      WHERE user_id = $1 AND is_active = true
    `, [user_id]);
    if (team_result.rows.length === 0) {
      throw new Error('STRICT MODE: Active team not found');
    }
    const team = team_result.rows[0];

    // Get character count
    const characters_result = await query(
      'SELECT COUNT(*) as count FROM user_characters WHERE user_id = $1',
      [user_id]
    );
    const total_characters = parseInt(characters_result.rows[0].count);

    // Get available tiers
    const tiers_result = await query(`
      SELECT tier_id, tier_name, tier_level, max_rooms, max_beds, upgrade_cost
      FROM headquarters_tiers
      ORDER BY tier_level
    `);
    const available_tiers = tiers_result.rows;

    // Calculate characters without beds
    const characters_without_beds = Math.max(0, total_characters - parseInt(rooms.bed_count));

    return {
      // Legacy fields
      level: user.level,
      total_characters: total_characters,
      current_facilities: [hq.tier_name],
      budget: hq.balance,

      // HQ data
      current_hq_tier: hq.tier_id,
      current_balance: hq.balance,
      current_gems: hq.gems,
      current_room_count: parseInt(rooms.room_count),
      current_bed_count: parseInt(rooms.bed_count),
      current_character_count: total_characters,
      characters_without_beds: characters_without_beds,
      available_tiers: available_tiers,

      // Coach/User data
      coach_name: user.username,

      // Team data
      team_name: team.team_name,
      team_total_wins: team.wins,
      team_total_losses: team.losses,
      team_win_percentage: user.win_percentage,
      team_monthly_earnings: team.monthly_earnings,
      team_total_earnings: team.total_earnings,

      // Account-wide earnings
      account_total_earnings: user.total_earnings,
      account_monthly_earnings: user.monthly_earnings,
    };
  }
}