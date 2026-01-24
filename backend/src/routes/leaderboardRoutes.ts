import express from 'express';
import { authenticate_token } from '../services/auth';
import { query } from '../database/postgres';
import { AuthRequest } from '../types/index';

const router = express.Router();

// Valid leaderboard types
type LeaderboardType = 'battles' | 'coach' | 'teams' | 'collections' | 'streaks' | 'activity';

// Row types for each leaderboard query
// Note: PostgreSQL driver returns numeric types as strings, hence string types for numbers
// The code uses parseInt/parseFloat to convert these
interface BattleLeaderboardRow {
  user_id: string;
  username: string;
  total_wins: number;       // integer in DB
  total_losses: number;     // integer in DB
  total_battles: number;    // integer in DB
  win_percentage: number;   // real in DB
  rating: number;           // integer in DB
  level: number;            // integer in DB
  current_win_streak: number; // integer in DB
  best_win_streak: number;  // integer in DB
  rank: string;             // ROW_NUMBER() returns bigint, driver gives string
  [key: string]: string | number; // For dynamic column access (value_column, secondary_column)
}

interface CoachLeaderboardRow {
  user_id: string;
  username: string;
  coach_level: number;      // integer in DB
  coach_experience: number; // integer in DB
  coach_title: string;      // text in DB
  total_battles_coached: number;  // integer in DB
  total_wins_coached: number;     // integer in DB
  total_losses_coached: number;   // integer in DB
  win_percentage_coached: number; // real in DB
  psychology_skill_points: number;           // integer in DB
  battle_strategy_skill_points: number;      // integer in DB
  character_development_skill_points: number; // integer in DB
  rank: string;             // ROW_NUMBER() returns bigint
}

interface TeamLeaderboardRow {
  team_id: string;
  user_id: string;
  username: string;
  team_name: string;
  wins: number;             // integer in DB
  losses: number;           // integer in DB
  battles_played: number;   // integer in DB
  chemistry_score: number;  // integer in DB (from team_relationships)
  team_win_percentage: number; // real in DB (from team_relationships)
  rank: string;             // ROW_NUMBER() returns bigint
}

interface CollectionLeaderboardRow {
  user_id: string;
  username: string;
  character_count: string;  // COUNT(*) returns bigint, driver gives string
  total_level: string;      // SUM() returns bigint, driver gives string
  avg_level: string;        // AVG() returns numeric, driver gives string
  total_character_wins: string; // SUM() returns bigint, driver gives string
  rank: string;             // ROW_NUMBER() returns bigint
}

interface ActivityLeaderboardRow {
  user_id: string;
  username: string;
  battles_in_period: string; // COUNT() returns bigint, driver gives string
  wins_in_period: string;    // SUM(CASE...) returns bigint, driver gives string
  total_battles: number;     // integer in DB
  total_wins: number;        // integer in DB
  rank: string;              // ROW_NUMBER() returns bigint
}

// GET /api/leaderboards/battles - Battle statistics leaderboard
router.get('/battles', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const sort = (req.query.sort as string) || 'wins';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let order_by: string;
    let value_column: string;
    let secondary_column: string;

    switch (sort) {
      case 'win_rate':
        order_by = 'win_percentage DESC, total_wins DESC';
        value_column = 'win_percentage';
        secondary_column = 'total_wins';
        break;
      case 'rating':
        order_by = 'rating DESC, total_wins DESC';
        value_column = 'rating';
        secondary_column = 'total_wins';
        break;
      case 'battles':
        order_by = 'total_battles DESC, win_percentage DESC';
        value_column = 'total_battles';
        secondary_column = 'win_percentage';
        break;
      case 'wins':
      default:
        order_by = 'total_wins DESC, win_percentage DESC';
        value_column = 'total_wins';
        secondary_column = 'win_percentage';
    }

    const result = await query(
      `SELECT
        u.id as user_id,
        u.username,
        u.total_wins,
        u.total_losses,
        u.total_battles,
        u.win_percentage,
        u.rating,
        u.level,
        u.current_win_streak,
        u.best_win_streak,
        ROW_NUMBER() OVER (ORDER BY ${order_by}) as rank
      FROM users u
      WHERE u.total_battles > 0
      ORDER BY ${order_by}
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count for pagination
    const count_result = await query(
      `SELECT COUNT(*) as total FROM users WHERE total_battles > 0`
    );

    res.json({
      ok: true,
      leaderboard_type: 'battles',
      sort_by: sort,
      total_entries: parseInt(count_result.rows[0].total),
      entries: result.rows.map((row: BattleLeaderboardRow) => ({
        rank: parseInt(row.rank),
        user_id: row.user_id,
        username: row.username,
        value: row[value_column],
        secondary_value: row[secondary_column],
        stats: {
          total_wins: row.total_wins,
          total_losses: row.total_losses,
          total_battles: row.total_battles,
          win_percentage: row.win_percentage,
          rating: row.rating,
          level: row.level,
          current_streak: row.current_win_streak,
          best_streak: row.best_win_streak
        }
      }))
    });
  } catch (error: any) {
    console.error('[LEADERBOARD] Battles error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_leaderboard', detail: error.message });
  }
});

// GET /api/leaderboards/streaks - Win streak leaderboard
router.get('/streaks', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const sort = (req.query.sort as string) || 'best';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const order_by = sort === 'current'
      ? 'current_win_streak DESC, best_win_streak DESC'
      : 'best_win_streak DESC, current_win_streak DESC';

    const result = await query(
      `SELECT
        u.id as user_id,
        u.username,
        u.current_win_streak,
        u.best_win_streak,
        u.total_wins,
        u.total_battles,
        u.win_percentage,
        ROW_NUMBER() OVER (ORDER BY ${order_by}) as rank
      FROM users u
      WHERE u.best_win_streak > 0 OR u.current_win_streak > 0
      ORDER BY ${order_by}
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const count_result = await query(
      `SELECT COUNT(*) as total FROM users WHERE best_win_streak > 0 OR current_win_streak > 0`
    );

    res.json({
      ok: true,
      leaderboard_type: 'streaks',
      sort_by: sort,
      total_entries: parseInt(count_result.rows[0].total),
      entries: result.rows.map((row: BattleLeaderboardRow) => ({
        rank: parseInt(row.rank),
        user_id: row.user_id,
        username: row.username,
        value: sort === 'current' ? row.current_win_streak : row.best_win_streak,
        secondary_value: sort === 'current' ? row.best_win_streak : row.current_win_streak,
        stats: {
          current_streak: row.current_win_streak,
          best_streak: row.best_win_streak,
          total_wins: row.total_wins,
          total_battles: row.total_battles,
          win_percentage: row.win_percentage
        }
      }))
    });
  } catch (error: any) {
    console.error('[LEADERBOARD] Streaks error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_leaderboard', detail: error.message });
  }
});

// GET /api/leaderboards/coach - Coach progression leaderboard
router.get('/coach', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const sort = (req.query.sort as string) || 'level';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let order_by: string;
    switch (sort) {
      case 'win_rate':
        order_by = 'cp.win_percentage_coached DESC, cp.coach_level DESC';
        break;
      case 'battles':
        order_by = 'cp.total_battles_coached DESC, cp.coach_level DESC';
        break;
      case 'level':
      default:
        order_by = 'cp.coach_level DESC, cp.coach_experience DESC';
    }

    const result = await query(
      `SELECT
        u.id as user_id,
        u.username,
        cp.coach_level,
        cp.coach_experience,
        cp.coach_title,
        cp.total_battles_coached,
        cp.total_wins_coached,
        cp.total_losses_coached,
        cp.win_percentage_coached,
        cp.psychology_skill_points,
        cp.battle_strategy_skill_points,
        cp.character_development_skill_points,
        ROW_NUMBER() OVER (ORDER BY ${order_by}) as rank
      FROM coach_progression cp
      JOIN users u ON cp.user_id = u.id
      ORDER BY ${order_by}
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const count_result = await query(
      `SELECT COUNT(*) as total FROM coach_progression`
    );

    res.json({
      ok: true,
      leaderboard_type: 'coach',
      sort_by: sort,
      total_entries: parseInt(count_result.rows[0].total),
      entries: result.rows.map((row: CoachLeaderboardRow) => ({
        rank: parseInt(row.rank),
        user_id: row.user_id,
        username: row.username,
        value: row.coach_level,
        secondary_value: row.coach_experience,
        stats: {
          coach_level: row.coach_level,
          coach_experience: row.coach_experience,
          coach_title: row.coach_title,
          total_battles_coached: row.total_battles_coached,
          total_wins_coached: row.total_wins_coached,
          win_percentage: row.win_percentage_coached,
          skill_points: {
            psychology: row.psychology_skill_points,
            battle_strategy: row.battle_strategy_skill_points,
            character_development: row.character_development_skill_points
          }
        }
      }))
    });
  } catch (error: any) {
    console.error('[LEADERBOARD] Coach error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_leaderboard', detail: error.message });
  }
});

// GET /api/leaderboards/teams - Team power leaderboard
router.get('/teams', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const sort = (req.query.sort as string) || 'wins';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let order_by: string;
    switch (sort) {
      case 'chemistry':
        order_by = 'tr.chemistry_score DESC, t.wins DESC';
        break;
      case 'win_rate':
        order_by = 'tr.win_percentage DESC, t.wins DESC';
        break;
      case 'wins':
      default:
        order_by = 't.wins DESC, t.battles_played DESC';
    }

    const result = await query(
      `SELECT
        t.id as team_id,
        t.user_id,
        u.username,
        t.team_name,
        t.wins,
        t.losses,
        t.battles_played,
        COALESCE(tr.chemistry_score, 50) as chemistry_score,
        COALESCE(tr.win_percentage, 0) as team_win_percentage,
        ROW_NUMBER() OVER (ORDER BY ${order_by}) as rank
      FROM teams t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN team_relationships tr ON t.id = tr.team_id
      WHERE t.is_active = true AND t.battles_played > 0
      ORDER BY ${order_by}
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const count_result = await query(
      `SELECT COUNT(*) as total FROM teams WHERE is_active = true AND battles_played > 0`
    );

    res.json({
      ok: true,
      leaderboard_type: 'teams',
      sort_by: sort,
      total_entries: parseInt(count_result.rows[0].total),
      entries: result.rows.map((row: TeamLeaderboardRow) => ({
        rank: parseInt(row.rank),
        user_id: row.user_id,
        username: row.username,
        team_id: row.team_id,
        team_name: row.team_name,
        value: row.wins,
        secondary_value: row.chemistry_score,
        stats: {
          wins: row.wins,
          losses: row.losses,
          battles_played: row.battles_played,
          chemistry_score: row.chemistry_score,
          win_percentage: row.team_win_percentage
        }
      }))
    });
  } catch (error: any) {
    console.error('[LEADERBOARD] Teams error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_leaderboard', detail: error.message });
  }
});

// GET /api/leaderboards/collections - Character collection leaderboard
router.get('/collections', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const sort = (req.query.sort as string) || 'total';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let order_by: string;
    let value_expression: string;

    switch (sort) {
      case 'level':
        order_by = 'avg_level DESC, character_count DESC';
        value_expression = 'ROUND(AVG(uc.level)::numeric, 1)';
        break;
      case 'power':
        order_by = 'total_level DESC, character_count DESC';
        value_expression = 'SUM(uc.level)';
        break;
      case 'total':
      default:
        order_by = 'character_count DESC, total_level DESC';
        value_expression = 'COUNT(*)';
    }

    const result = await query(
      `SELECT
        u.id as user_id,
        u.username,
        COUNT(uc.id) as character_count,
        SUM(uc.level) as total_level,
        ROUND(AVG(uc.level)::numeric, 1) as avg_level,
        SUM(uc.total_wins) as total_character_wins,
        ROW_NUMBER() OVER (ORDER BY ${order_by}) as rank
      FROM users u
      JOIN user_characters uc ON u.id = uc.user_id
      WHERE uc.is_dead = false
      GROUP BY u.id, u.username
      HAVING COUNT(uc.id) > 0
      ORDER BY ${order_by}
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const count_result = await query(
      `SELECT COUNT(DISTINCT user_id) as total FROM user_characters WHERE is_dead = false`
    );

    res.json({
      ok: true,
      leaderboard_type: 'collections',
      sort_by: sort,
      total_entries: parseInt(count_result.rows[0].total),
      entries: result.rows.map((row: CollectionLeaderboardRow) => ({
        rank: parseInt(row.rank),
        user_id: row.user_id,
        username: row.username,
        value: sort === 'level' ? parseFloat(row.avg_level) :
               sort === 'power' ? parseInt(row.total_level) :
               parseInt(row.character_count),
        secondary_value: sort === 'total' ? parseInt(row.total_level) : parseInt(row.character_count),
        stats: {
          character_count: parseInt(row.character_count),
          total_level: parseInt(row.total_level),
          avg_level: parseFloat(row.avg_level),
          total_character_wins: parseInt(row.total_character_wins)
        }
      }))
    });
  } catch (error: any) {
    console.error('[LEADERBOARD] Collections error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_leaderboard', detail: error.message });
  }
});

// GET /api/leaderboards/activity - Activity leaderboard (battles per period)
router.get('/activity', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const period = (req.query.period as string) || 'monthly';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let interval: string;
    switch (period) {
      case 'daily':
        interval = '1 day';
        break;
      case 'weekly':
        interval = '7 days';
        break;
      case 'monthly':
      default:
        interval = '30 days';
    }

    const result = await query(
      `SELECT
        u.id as user_id,
        u.username,
        COUNT(b.id) as battles_in_period,
        SUM(CASE WHEN b.winner_id = u.id THEN 1 ELSE 0 END) as wins_in_period,
        u.total_battles,
        u.total_wins,
        ROW_NUMBER() OVER (ORDER BY COUNT(b.id) DESC) as rank
      FROM users u
      JOIN battles b ON (b.user_id = u.id OR b.opponent_user_id = u.id)
      WHERE b.status = 'completed'
        AND b.ended_at > NOW() - INTERVAL '${interval}'
      GROUP BY u.id, u.username, u.total_battles, u.total_wins
      HAVING COUNT(b.id) > 0
      ORDER BY battles_in_period DESC, wins_in_period DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const count_result = await query(
      `SELECT COUNT(DISTINCT COALESCE(user_id, opponent_user_id)) as total
       FROM battles
       WHERE status = 'completed' AND ended_at > NOW() - INTERVAL '${interval}'`
    );

    res.json({
      ok: true,
      leaderboard_type: 'activity',
      period: period,
      total_entries: parseInt(count_result.rows[0].total),
      entries: result.rows.map((row: ActivityLeaderboardRow) => ({
        rank: parseInt(row.rank),
        user_id: row.user_id,
        username: row.username,
        value: parseInt(row.battles_in_period),
        secondary_value: parseInt(row.wins_in_period),
        stats: {
          battles_in_period: parseInt(row.battles_in_period),
          wins_in_period: parseInt(row.wins_in_period),
          total_battles: row.total_battles,
          total_wins: row.total_wins
        }
      }))
    });
  } catch (error: any) {
    console.error('[LEADERBOARD] Activity error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_leaderboard', detail: error.message });
  }
});

// GET /api/leaderboards/my-rank/:type - Get current user's rank for a specific leaderboard
router.get('/my-rank/:type', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const type = req.params.type as LeaderboardType;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'not_authenticated' });
    }

    let rank_query: string;
    let stats_query: string;

    switch (type) {
      case 'battles':
        rank_query = `
          SELECT COUNT(*) + 1 as rank
          FROM users
          WHERE total_wins > (SELECT total_wins FROM users WHERE id = $1)
        `;
        stats_query = `
          SELECT total_wins as value, win_percentage as secondary_value,
                 total_battles, total_wins, total_losses, win_percentage, rating
          FROM users WHERE id = $1
        `;
        break;
      case 'streaks':
        rank_query = `
          SELECT COUNT(*) + 1 as rank
          FROM users
          WHERE best_win_streak > (SELECT best_win_streak FROM users WHERE id = $1)
        `;
        stats_query = `
          SELECT best_win_streak as value, current_win_streak as secondary_value,
                 total_wins, total_battles
          FROM users WHERE id = $1
        `;
        break;
      case 'coach':
        rank_query = `
          SELECT COUNT(*) + 1 as rank
          FROM coach_progression
          WHERE coach_level > (SELECT coach_level FROM coach_progression WHERE user_id = $1)
        `;
        stats_query = `
          SELECT coach_level as value, coach_experience as secondary_value,
                 coach_title, total_battles_coached, total_wins_coached, win_percentage_coached
          FROM coach_progression WHERE user_id = $1
        `;
        break;
      default:
        return res.status(400).json({ ok: false, error: 'invalid_leaderboard_type' });
    }

    const [rank_result, stats_result] = await Promise.all([
      query(rank_query, [user_id]),
      query(stats_query, [user_id])
    ]);

    if (stats_result.rows.length === 0) {
      return res.json({ ok: true, rank: null, message: 'No data for this leaderboard' });
    }

    res.json({
      ok: true,
      leaderboard_type: type,
      rank: parseInt(rank_result.rows[0].rank),
      ...stats_result.rows[0]
    });
  } catch (error: any) {
    console.error('[LEADERBOARD] My rank error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_rank', detail: error.message });
  }
});

export default router;
