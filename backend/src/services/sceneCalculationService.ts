/**
 * Scene Calculation Service
 * Calculates dynamic time_of_day and scene_type for teams
 */

import { query } from '../database/index';

/**
 * Calculate time of day based on user's timezone
 */
export async function calculateTimeOfDay(user_id: string): Promise<'morning' | 'afternoon' | 'evening' | 'night'> {
  // Get user's timezone
  const user_result = await query(
    'SELECT timezone FROM users WHERE id = $1',
    [user_id]
  );

  const timezone = user_result.rows[0]?.timezone || 'America/New_York';

  // Get current time in user's timezone
  const now = new Date();
  const user_time = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const hour = user_time.getHours();

  // Map hour to time period
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Calculate scene type using weighted random selection with game state modifiers
 */
export async function calculateSceneType(team_id: string): Promise<'mundane' | 'conflict' | 'chaos'> {
  // Base weights (out of 100)
  const weights = {
    mundane: 60,
    conflict: 30,
    chaos: 10
  };

  // Modifier: Floor sleepers increase conflict/chaos
  const floor_sleeper_result = await query(
    `SELECT COUNT(*) as count
     FROM user_characters
     WHERE sleeping_arrangement = 'floor'
     AND id IN (
       SELECT character_slot_1 FROM teams WHERE id = $1
       UNION SELECT character_slot_2 FROM teams WHERE id = $1
       UNION SELECT character_slot_3 FROM teams WHERE id = $1
     )`,
    [team_id]
  );

  const floor_sleeper_count = parseInt(floor_sleeper_result.rows[0]?.count || '0');
  if (floor_sleeper_count > 2) {
    weights.conflict += 20;
    weights.chaos += 10;
    weights.mundane -= 30;
  } else if (floor_sleeper_count > 0) {
    weights.conflict += 10;
    weights.mundane -= 10;
  }

  // Modifier: Recent battle defeats or crises boost chaos
  // Check if any team member is in the userchar_ids array
  const recent_crisis_result = await query(
    `SELECT COUNT(*) as count
     FROM game_events ge
     WHERE ge.type IN ('battle_defeat', 'financial_crisis', 'drama_escalated')
     AND ge.severity IN ('high', 'critical')
     AND ge.timestamp > NOW() - INTERVAL '2 hours'
     AND ge.userchar_ids && ARRAY(
       SELECT id FROM user_characters uc
       WHERE uc.id IN (
         SELECT character_slot_1 FROM teams WHERE id = $1
         UNION SELECT character_slot_2 FROM teams WHERE id = $1
         UNION SELECT character_slot_3 FROM teams WHERE id = $1
       )
     )`,
    [team_id]
  );

  const recent_crisis_count = parseInt(recent_crisis_result.rows[0]?.count || '0');
  if (recent_crisis_count > 0) {
    weights.chaos += 30;
    weights.conflict += 10;
    weights.mundane -= 40;
  }

  // Ensure weights don't go negative
  weights.mundane = Math.max(5, weights.mundane);
  weights.conflict = Math.max(5, weights.conflict);
  weights.chaos = Math.max(5, weights.chaos);

  // Normalize weights to 100
  const total = weights.mundane + weights.conflict + weights.chaos;
  const normalized_weights = {
    mundane: (weights.mundane / total) * 100,
    conflict: (weights.conflict / total) * 100,
    chaos: (weights.chaos / total) * 100
  };

  // Weighted random selection
  const roll = Math.random() * 100;
  if (roll < normalized_weights.mundane) {
    return 'mundane';
  } else if (roll < normalized_weights.mundane + normalized_weights.conflict) {
    return 'conflict';
  } else {
    return 'chaos';
  }
}
