import express from 'express';
import { authenticate_token, type AuthRequest } from '../services/auth';
import { query } from '../database/postgres';

// Row type for team validation query
interface TeamValidationRow {
  id: string;
  headquarters_id: string;
}

const router = express.Router();

/**
 * POST /api/team/roster
 * Save the active team roster (3-person lineup) to the database
 * Now uses teams table instead of team_context.active_teammates
 */
router.post('/roster', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const {
      team_name,
      active_contestants,
      backup_contestants,
      system_characters
    } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const active = active_contestants;
    const backup = backup_contestants || [];
    const sys = system_characters;

    // Validate required fields
    if (!Array.isArray(active) || active.length !== 3) {
      return res.status(400).json({ error: 'Exactly 3 active contestants required' });
    }

    if (backup.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 backup contestants allowed' });
    }

    // Validate all active system characters are provided
    const required_system_chars = ['mascot', 'judge', 'therapist', 'trainer', 'host', 'real_estate_agent'];
    for (const type of required_system_chars) {
      if (!sys[type]?.active) {
        return res.status(400).json({ error: `Active ${type} is required` });
      }
    }

    // Collect all contestant IDs for validation
    const all_contestant_ids = [...active, ...backup].filter(Boolean);

    // Validate that all provided contestant IDs belong to the user
    const validation_query = `
      SELECT uc.id, uc.headquarters_id
      FROM user_characters uc
      WHERE uc.id = ANY($1) AND uc.user_id = $2
    `;
    const valid_characters = await query(validation_query, [all_contestant_ids, user_id]);

    if (valid_characters.rows.length !== all_contestant_ids.length) {
      return res.status(400).json({ error: 'One or more character IDs do not belong to this user' });
    }

    // REALITY SHOW RULE: All active teammates must live in the same headquarters
    const rows = valid_characters.rows as TeamValidationRow[];
    const active_rows = rows.filter(r => active.includes(r.id));
    for (const row of active_rows) {
      if (!row.headquarters_id) {
        throw new Error(`STRICT MODE: Character ${row.id} missing headquarters_id`);
      }
    }
    const hq_ids = active_rows.map(r => r.headquarters_id);
    if (new Set(hq_ids).size > 1) {
      return res.status(400).json({
        error: 'All teammates must live in the same headquarters (reality show rule)',
        details: 'Characters on the active team must be roommates'
      });
    }

    // Deactivate any existing active team for this user
    await query(
      'UPDATE teams SET is_active = false WHERE user_id = $1 AND is_active = true',
      [user_id]
    );

    // Create new team record with all slots
    const team_insert_result = await query(
      `INSERT INTO teams (
        user_id, team_name,
        character_slot_1, character_slot_2, character_slot_3,
        character_slot_4, character_slot_5, character_slot_6,
        mascot_active, mascot_backup,
        judge_active, judge_backup,
        therapist_active, therapist_backup,
        trainer_active, trainer_backup,
        host_active, host_backup,
        real_estate_agent_active, real_estate_agent_backup,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id`,
      [
        user_id,
        team_name || 'Default Team',
        active[0], active[1], active[2],
        backup[0] || null, backup[1] || null, backup[2] || null,
        sys.mascot.active, sys.mascot.backup || null,
        sys.judge.active, sys.judge.backup || null,
        sys.therapist.active, sys.therapist.backup || null,
        sys.trainer.active, sys.trainer.backup || null,
        sys.host.active, sys.host.backup || null,
        sys.real_estate_agent.active, sys.real_estate_agent.backup || null
      ]
    );

    const team_id = team_insert_result.rows[0].id;

    // Ensure team_context exists for this team
    const existing_context = await query(
      'SELECT id FROM team_context WHERE team_id = $1',
      [team_id]
    );

    if (existing_context.rows.length === 0) {
      // Fetch user's current HQ tier
      const hq_result = await query(
        'SELECT tier_id FROM user_headquarters WHERE user_id = $1 AND is_primary = true',
        [user_id]
      );
      const hq_tier = hq_result.rows[0]?.tier_id || 'spartan_apartment';

      await query(
        `INSERT INTO team_context (
          team_id,
          hq_tier,
          current_scene_type,
          current_time_of_day,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [team_id, hq_tier, 'mundane', 'afternoon']
      );
    }

    // Initialize team_relationships for this team
    await query(
      `INSERT INTO team_relationships (team_id, chemistry_score, created_at, updated_at)
       VALUES ($1, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (team_id) DO NOTHING`,
      [team_id]
    );

    console.log(`✅ Team roster created for user ${user_id}:`, {
      team_id,
      team_name: team_name || 'Default Team',
      active_contestants: active,
      backup_contestants: backup
    });

    res.json({
      success: true,
      message: 'Team roster saved successfully',
      team_id,
      team_name: team_name || 'Default Team',
      active_contestants: active,
      backup_contestants: backup,
      system_characters: sys
    });

  } catch (error) {
    console.error('❌ Error saving team roster:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/team/roster
 * Get the current active team roster
 * Now reads from teams table instead of team_context.active_teammates
 */
router.get('/roster', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await query(
      `SELECT id, team_name,
              character_slot_1, character_slot_2, character_slot_3,
              character_slot_4, character_slot_5, character_slot_6,
              mascot_active, mascot_backup,
              judge_active, judge_backup,
              therapist_active, therapist_backup,
              trainer_active, trainer_backup,
              host_active, host_backup,
              real_estate_agent_active, real_estate_agent_backup,
              wins, losses, battles_played, last_battle_date
       FROM teams
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.json({
        team_id: null,
        team_name: null,
        active_contestants: [],
        backup_contestants: [],
        system_characters: {
          mascot: { active: null, backup: null },
          judge: { active: null, backup: null },
          therapist: { active: null, backup: null },
          trainer: { active: null, backup: null },
          host: { active: null, backup: null },
          real_estate_agent: { active: null, backup: null }
        },
        count: 0
      });
    }

    const team = result.rows[0];
    const active_contestants = [
      team.character_slot_1,
      team.character_slot_2,
      team.character_slot_3
    ].filter(Boolean);

    const backup_contestants = [
      team.character_slot_4,
      team.character_slot_5,
      team.character_slot_6
    ].filter(Boolean);

    res.json({
      team_id: team.id,
      team_name: team.team_name,
      active_contestants,
      backup_contestants,
      // Legacy field for backwards compatibility
      active_teammates: active_contestants,
      system_characters: {
        mascot: { active: team.mascot_active, backup: team.mascot_backup },
        judge: { active: team.judge_active, backup: team.judge_backup },
        therapist: { active: team.therapist_active, backup: team.therapist_backup },
        trainer: { active: team.trainer_active, backup: team.trainer_backup },
        host: { active: team.host_active, backup: team.host_backup },
        real_estate_agent: { active: team.real_estate_agent_active, backup: team.real_estate_agent_backup }
      },
      count: active_contestants.length,
      wins: team.wins,
      losses: team.losses,
      battles_played: team.battles_played,
      last_battle_date: team.last_battle_date
    });

  } catch (error) {
    console.error('❌ Error fetching team roster:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
