/**
 * Guild System API Routes
 * Player alliances for social competition
 */

import { Router } from 'express';
import { query } from '../database/postgres';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types/index';

const router = Router();

// ===== GUILD CRUD =====

// Get all public guilds (for browsing)
router.get('/', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { search, sort_by = 'total_power', limit = 50, offset = 0 } = req.query;

    let where_clause = 'WHERE g.is_public = true';
    const params: any[] = [];
    let param_index = 1;

    if (search) {
      where_clause += ` AND (g.name ILIKE $${param_index} OR g.tag ILIKE $${param_index})`;
      params.push(`%${search}%`);
      param_index++;
    }

    const sort_column = ['total_power', 'level', 'battle_wins', 'created_at'].includes(sort_by as string)
      ? sort_by
      : 'total_power';

    params.push(limit, offset);

    const result = await query(`
      SELECT
        g.*,
        COUNT(gm.id) as member_count,
        u.username as leader_name
      FROM guilds g
      LEFT JOIN guild_members gm ON g.id = gm.guild_id
      JOIN users u ON g.leader_user_id = u.id
      ${where_clause}
      GROUP BY g.id, u.username
      ORDER BY g.${sort_column} DESC
      LIMIT $${param_index} OFFSET $${param_index + 1}
    `, params);

    res.json({ ok: true, guilds: result.rows });
  } catch (error: any) {
    console.error('[GUILD] List error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_list_guilds', detail: error.message });
  }
});

// Get single guild details
router.get('/:guild_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { guild_id } = req.params;

    const guild_result = await query(`
      SELECT
        g.*,
        u.username as leader_name,
        COUNT(gm.id) as member_count
      FROM guilds g
      JOIN users u ON g.leader_user_id = u.id
      LEFT JOIN guild_members gm ON g.id = gm.guild_id
      WHERE g.id = $1
      GROUP BY g.id, u.username
    `, [guild_id]);

    if (guild_result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'guild_not_found' });
    }

    // Get members
    const members_result = await query(`
      SELECT
        gm.*,
        u.username
      FROM guild_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.guild_id = $1
      ORDER BY
        CASE gm.role
          WHEN 'leader' THEN 1
          WHEN 'officer' THEN 2
          ELSE 3
        END,
        gm.contribution_points DESC
    `, [guild_id]);

    res.json({
      ok: true,
      guild: guild_result.rows[0],
      members: members_result.rows
    });
  } catch (error: any) {
    console.error('[GUILD] Get error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_get_guild', detail: error.message });
  }
});

// Create new guild
router.post('/', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const { name, tag, description, is_public = true, min_level_to_join = 1 } = req.body;

    if (!name || name.length < 3 || name.length > 50) {
      return res.status(400).json({ ok: false, error: 'invalid_name', detail: 'Name must be 3-50 characters' });
    }

    if (!tag || tag.length < 2 || tag.length > 5) {
      return res.status(400).json({ ok: false, error: 'invalid_tag', detail: 'Tag must be 2-5 characters' });
    }

    // Check if user already in a guild
    const existing_membership = await query(
      'SELECT id FROM guild_members WHERE user_id = $1',
      [user_id]
    );

    if (existing_membership.rows.length > 0) {
      return res.status(400).json({ ok: false, error: 'already_in_guild' });
    }

    // Create guild
    const guild_result = await query(`
      INSERT INTO guilds (name, tag, description, leader_user_id, is_public, min_level_to_join)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, tag.toUpperCase(), description, user_id, is_public, min_level_to_join]);

    const guild = guild_result.rows[0];

    // Add creator as leader
    await query(`
      INSERT INTO guild_members (guild_id, user_id, role)
      VALUES ($1, $2, 'leader')
    `, [guild.id, user_id]);

    console.log(`[GUILD] Created: ${name} [${tag}] by user ${user_id}`);

    res.json({ ok: true, guild });
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(400).json({ ok: false, error: 'name_or_tag_taken' });
    }
    console.error('[GUILD] Create error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_create_guild', detail: error.message });
  }
});

// Update guild (leader/officer only)
router.patch('/:guild_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { guild_id } = req.params;
    const { description, is_public, min_level_to_join, max_members } = req.body;

    // Check permission
    const membership = await query(
      'SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, user_id]
    );

    if (membership.rows.length === 0 || !['leader', 'officer'].includes(membership.rows[0].role)) {
      return res.status(403).json({ ok: false, error: 'insufficient_permission' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let param_index = 1;

    if (description !== undefined) {
      updates.push(`description = $${param_index++}`);
      params.push(description);
    }
    if (is_public !== undefined) {
      updates.push(`is_public = $${param_index++}`);
      params.push(is_public);
    }
    if (min_level_to_join !== undefined) {
      updates.push(`min_level_to_join = $${param_index++}`);
      params.push(min_level_to_join);
    }
    if (max_members !== undefined) {
      updates.push(`max_members = $${param_index++}`);
      params.push(max_members);
    }

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, error: 'no_updates_provided' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(guild_id);

    const result = await query(`
      UPDATE guilds
      SET ${updates.join(', ')}
      WHERE id = $${param_index}
      RETURNING *
    `, params);

    res.json({ ok: true, guild: result.rows[0] });
  } catch (error: any) {
    console.error('[GUILD] Update error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_update_guild', detail: error.message });
  }
});

// ===== MEMBERSHIP =====

// Join public guild
router.post('/:guild_id/join', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { guild_id } = req.params;

    // Check if already in a guild
    const existing = await query(
      'SELECT id FROM guild_members WHERE user_id = $1',
      [user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ ok: false, error: 'already_in_guild' });
    }

    // Get guild info
    const guild = await query(
      'SELECT * FROM guilds WHERE id = $1',
      [guild_id]
    );

    if (guild.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'guild_not_found' });
    }

    if (!guild.rows[0].is_public) {
      return res.status(400).json({ ok: false, error: 'guild_is_private', detail: 'Submit a join request instead' });
    }

    // Check member count
    const member_count = await query(
      'SELECT COUNT(*) as count FROM guild_members WHERE guild_id = $1',
      [guild_id]
    );

    if (parseInt(member_count.rows[0].count) >= guild.rows[0].max_members) {
      return res.status(400).json({ ok: false, error: 'guild_full' });
    }

    // Join
    await query(`
      INSERT INTO guild_members (guild_id, user_id, role)
      VALUES ($1, $2, 'member')
    `, [guild_id, user_id]);

    console.log(`[GUILD] User ${user_id} joined guild ${guild_id}`);

    res.json({ ok: true, message: 'joined_guild' });
  } catch (error: any) {
    console.error('[GUILD] Join error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_join_guild', detail: error.message });
  }
});

// Leave guild
router.post('/:guild_id/leave', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { guild_id } = req.params;

    const membership = await query(
      'SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, user_id]
    );

    if (membership.rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'not_in_guild' });
    }

    if (membership.rows[0].role === 'leader') {
      // Check if there are other members
      const other_members = await query(
        'SELECT id FROM guild_members WHERE guild_id = $1 AND user_id != $2',
        [guild_id, user_id]
      );

      if (other_members.rows.length > 0) {
        return res.status(400).json({
          ok: false,
          error: 'leader_cannot_leave',
          detail: 'Transfer leadership first or disband the guild'
        });
      }

      // Last member, delete guild
      await query('DELETE FROM guilds WHERE id = $1', [guild_id]);
      console.log(`[GUILD] Guild ${guild_id} disbanded (last member left)`);
    } else {
      await query(
        'DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2',
        [guild_id, user_id]
      );
    }

    console.log(`[GUILD] User ${user_id} left guild ${guild_id}`);

    res.json({ ok: true, message: 'left_guild' });
  } catch (error: any) {
    console.error('[GUILD] Leave error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_leave_guild', detail: error.message });
  }
});

// Kick member (leader/officer only)
router.post('/:guild_id/kick/:target_user_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { guild_id, target_user_id } = req.params;

    // Check permission
    const membership = await query(
      'SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, user_id]
    );

    if (membership.rows.length === 0 || !['leader', 'officer'].includes(membership.rows[0].role)) {
      return res.status(403).json({ ok: false, error: 'insufficient_permission' });
    }

    // Get target's role
    const target = await query(
      'SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, target_user_id]
    );

    if (target.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'member_not_found' });
    }

    // Can't kick leader, officers can only kick members
    if (target.rows[0].role === 'leader') {
      return res.status(403).json({ ok: false, error: 'cannot_kick_leader' });
    }

    if (target.rows[0].role === 'officer' && membership.rows[0].role !== 'leader') {
      return res.status(403).json({ ok: false, error: 'only_leader_can_kick_officers' });
    }

    await query(
      'DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, target_user_id]
    );

    console.log(`[GUILD] User ${target_user_id} kicked from guild ${guild_id} by ${user_id}`);

    res.json({ ok: true, message: 'member_kicked' });
  } catch (error: any) {
    console.error('[GUILD] Kick error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_kick_member', detail: error.message });
  }
});

// Promote/demote member (leader only)
router.post('/:guild_id/promote/:target_user_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { guild_id, target_user_id } = req.params;
    const { new_role } = req.body;

    if (!['officer', 'member'].includes(new_role)) {
      return res.status(400).json({ ok: false, error: 'invalid_role' });
    }

    // Only leader can promote
    const membership = await query(
      'SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, user_id]
    );

    if (membership.rows.length === 0 || membership.rows[0].role !== 'leader') {
      return res.status(403).json({ ok: false, error: 'only_leader_can_promote' });
    }

    await query(
      'UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND user_id = $3',
      [new_role, guild_id, target_user_id]
    );

    console.log(`[GUILD] User ${target_user_id} promoted to ${new_role} in guild ${guild_id}`);

    res.json({ ok: true, message: 'role_updated' });
  } catch (error: any) {
    console.error('[GUILD] Promote error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_promote', detail: error.message });
  }
});

// Transfer leadership (leader only)
router.post('/:guild_id/transfer/:target_user_id', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { guild_id, target_user_id } = req.params;

    // Verify current leader
    const membership = await query(
      'SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, user_id]
    );

    if (membership.rows.length === 0 || membership.rows[0].role !== 'leader') {
      return res.status(403).json({ ok: false, error: 'only_leader_can_transfer' });
    }

    // Verify target is in guild
    const target = await query(
      'SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, target_user_id]
    );

    if (target.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'member_not_found' });
    }

    // Transfer
    await query('UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND user_id = $3', ['officer', guild_id, user_id]);
    await query('UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND user_id = $3', ['leader', guild_id, target_user_id]);
    await query('UPDATE guilds SET leader_user_id = $1 WHERE id = $2', [target_user_id, guild_id]);

    console.log(`[GUILD] Leadership transferred from ${user_id} to ${target_user_id} in guild ${guild_id}`);

    res.json({ ok: true, message: 'leadership_transferred' });
  } catch (error: any) {
    console.error('[GUILD] Transfer error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_transfer', detail: error.message });
  }
});

// ===== GUILD CHAT =====

// Get guild messages
router.get('/:guild_id/messages', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { guild_id } = req.params;
    const { limit = 100, before } = req.query;

    // Verify membership
    const membership = await query(
      'SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, user_id]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ ok: false, error: 'not_a_member' });
    }

    const params: any[] = [guild_id, limit];
    let where_clause = 'WHERE guild_id = $1';

    if (before) {
      where_clause += ' AND created_at < $3';
      params.push(before);
    }

    const result = await query(`
      SELECT * FROM guild_messages
      ${where_clause}
      ORDER BY created_at DESC
      LIMIT $2
    `, params);

    res.json({ ok: true, messages: result.rows.reverse() });
  } catch (error: any) {
    console.error('[GUILD] Get messages error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_get_messages', detail: error.message });
  }
});

// Post guild message
router.post('/:guild_id/messages', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { guild_id } = req.params;
    const { content, character_id } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'content_required' });
    }

    // Verify membership
    const membership = await query(
      'SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2',
      [guild_id, user_id]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ ok: false, error: 'not_a_member' });
    }

    let sender_name: string;
    let sender_avatar: string;
    let sender_character_id: string | null = null;

    if (character_id) {
      // Posting as character
      const char_result = await query(`
        SELECT uc.id, c.name, c.avatar_emoji
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.id
        WHERE uc.id = $1 AND uc.user_id = $2
      `, [character_id, user_id]);

      if (char_result.rows.length === 0) {
        return res.status(403).json({ ok: false, error: 'character_not_owned' });
      }

      sender_character_id = character_id;
      sender_name = char_result.rows[0].name;
      sender_avatar = char_result.rows[0].avatar_emoji;
    } else {
      // Posting as coach
      const user_result = await query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );

      sender_name = user_result.rows[0].username;
      sender_avatar = '🎯';
    }

    const result = await query(`
      INSERT INTO guild_messages (guild_id, sender_user_id, sender_character_id, sender_name, sender_avatar, content)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [guild_id, user_id, sender_character_id, sender_name, sender_avatar, content]);

    res.json({ ok: true, message: result.rows[0] });
  } catch (error: any) {
    console.error('[GUILD] Post message error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_post_message', detail: error.message });
  }
});

// ===== USER'S GUILD =====

// Get current user's guild
router.get('/me/guild', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;

    const result = await query(`
      SELECT
        g.*,
        gm.role,
        gm.joined_at,
        gm.contribution_points,
        COUNT(gm2.id) as member_count
      FROM guild_members gm
      JOIN guilds g ON gm.guild_id = g.id
      LEFT JOIN guild_members gm2 ON g.id = gm2.guild_id
      WHERE gm.user_id = $1
      GROUP BY g.id, gm.role, gm.joined_at, gm.contribution_points
    `, [user_id]);

    if (result.rows.length === 0) {
      return res.json({ ok: true, guild: null });
    }

    res.json({ ok: true, guild: result.rows[0] });
  } catch (error: any) {
    console.error('[GUILD] Get my guild error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_get_guild', detail: error.message });
  }
});

export default router;
