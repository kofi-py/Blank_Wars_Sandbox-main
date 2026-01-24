/**
 * Psychology Service - Handles psychological/emotional modifiers from battle outcomes
 *
 * Applies morale, stress, and fatigue modifiers based on:
 * - Battle wins/losses
 * - Critical injuries
 * - Near-death experiences
 * - Teammate deaths
 * - Rivalries
 * - Team morale cascades
 *
 * Uses character_modifiers table (migration 167) with psychology source_types (migration 171)
 * Trigger (migration 170) auto-recalculates user_characters.current_* stats
 */

import { query } from '../database/index';

// Types for psychology effects
interface PsychologyEffect {
  stat_name: 'current_morale' | 'current_stress' | 'current_fatigue' | 'current_confidence';
  modifier_value: number;
  source_type: string;
  source_id: string;           // REQUIRED - what caused this effect
  notes: string;               // REQUIRED - human-readable explanation
  expires_hours?: number;      // Optional - null means permanent
  context_data?: Record<string, any>;  // Optional - for complex cases like PTSD opponent tracking
}

interface BattleOutcome {
  battle_id: string;
  winner_character_ids: string[];
  loser_character_ids: string[];
  character_final_health: Record<string, { current: number; max: number }>;
  deaths: string[]; // character_ids that died
}

/**
 * Apply all psychology effects after a battle resolves
 */
export async function applyBattleOutcomeEffects(outcome: BattleOutcome): Promise<void> {
  console.log(`[Psychology] Processing battle ${outcome.battle_id}`);

  // Process winners
  for (const winner_id of outcome.winner_character_ids) {
    await applyVictoryEffects(winner_id, outcome);
  }

  // Process losers
  for (const loser_id of outcome.loser_character_ids) {
    await applyDefeatEffects(loser_id, outcome);
  }

  // Process deaths (applies to teammates of the dead, not the dead themselves)
  for (const dead_id of outcome.deaths) {
    await applyTeammateDeathEffects(dead_id, outcome);
  }

  // Apply team morale cascades
  await applyTeamMoraleCascades(outcome);

  console.log(`[Psychology] Battle ${outcome.battle_id} psychology effects complete`);
}

/**
 * Apply victory morale boost
 */
async function applyVictoryEffects(
  character_id: string,
  outcome: BattleOutcome
): Promise<void> {
  const effects: PsychologyEffect[] = [
    {
      stat_name: 'current_morale',
      modifier_value: 5,
      source_type: 'battle_victory_morale',
      source_id: outcome.battle_id,
      expires_hours: 48,
      notes: 'Victory morale boost'
    },
    {
      stat_name: 'current_confidence',
      modifier_value: 3,
      source_type: 'battle_victory_morale',
      source_id: outcome.battle_id,
      expires_hours: 72,
      notes: 'Victory confidence boost'
    }
  ];

  // Check if they won while injured (bonus for grit)
  const health = outcome.character_final_health[character_id];
  if (health && health.current < health.max * 0.3) {
    effects.push({
      stat_name: 'current_morale',
      modifier_value: 3,
      source_type: 'battle_victory_morale',
      source_id: outcome.battle_id,
      expires_hours: 72,
      notes: 'Won while badly injured - grit bonus'
    });
  }

  for (const effect of effects) {
    await insertModifier(character_id, effect);
  }

  console.log(`[Psychology] Applied victory effects to ${character_id}`);
}

/**
 * Apply defeat morale/stress penalties
 */
async function applyDefeatEffects(
  character_id: string,
  outcome: BattleOutcome
): Promise<void> {
  const effects: PsychologyEffect[] = [
    {
      stat_name: 'current_morale',
      modifier_value: -3,
      source_type: 'battle_defeat',
      source_id: outcome.battle_id,
      expires_hours: 24,
      notes: 'Defeat morale penalty'
    }
  ];

  // Check final health for additional trauma
  const health = outcome.character_final_health[character_id];
  if (health) {
    const health_percent = health.current / health.max;

    // Critical injury stress
    if (health_percent < 0.2) {
      effects.push({
        stat_name: 'current_stress',
        modifier_value: 10,
        source_type: 'critical_injury',
        source_id: outcome.battle_id,
        expires_hours: 72,
        notes: 'Stress from critical injury (health < 20%)'
      });
    }

    // Near-death trauma (even worse)
    if (health_percent < 0.1) {
      effects.push({
        stat_name: 'current_stress',
        modifier_value: 15,
        source_type: 'near_death',
        source_id: outcome.battle_id,
        expires_hours: 168, // 7 days
        notes: 'Near-death trauma (health < 10%)'
      });
      effects.push({
        stat_name: 'current_confidence',
        modifier_value: -5,
        source_type: 'near_death',
        source_id: outcome.battle_id,
        expires_hours: 120, // 5 days
        notes: 'Confidence shaken from near-death'
      });
    }
  }

  for (const effect of effects) {
    await insertModifier(character_id, effect);
  }

  console.log(`[Psychology] Applied defeat effects to ${character_id}`);
}

/**
 * Apply grief/trauma effects to teammates when a character dies
 */
async function applyTeammateDeathEffects(
  dead_character_id: string,
  outcome: BattleOutcome
): Promise<void> {
  // Find teammates of the dead character
  const teammates = [
    ...outcome.winner_character_ids,
    ...outcome.loser_character_ids
  ].filter(id => id !== dead_character_id);

  for (const teammate_id of teammates) {
    // Check if they were on the same side
    const dead_was_winner = outcome.winner_character_ids.includes(dead_character_id);
    const teammate_is_winner = outcome.winner_character_ids.includes(teammate_id);

    // Only apply grief if they were on the same team
    if (dead_was_winner === teammate_is_winner) {
      await insertModifier(teammate_id, {
        stat_name: 'current_morale',
        modifier_value: -8,
        source_type: 'teammate_death',
        source_id: outcome.battle_id,
        expires_hours: 120, // 5 days
        notes: 'Grief from teammate death',
        context_data: { dead_character_id }
      });

      await insertModifier(teammate_id, {
        stat_name: 'current_stress',
        modifier_value: 12,
        source_type: 'teammate_death',
        source_id: outcome.battle_id,
        expires_hours: 168, // 7 days
        notes: 'Trauma from witnessing teammate death',
        context_data: { dead_character_id }
      });
    }
  }

  console.log(`[Psychology] Applied teammate death effects for ${dead_character_id}`);
}

/**
 * Apply cascading morale effects within teams
 * When one character has extreme morale change, teammates feel it too
 */
async function applyTeamMoraleCascades(outcome: BattleOutcome): Promise<void> {
  // Winners cascade: +2 morale to all teammates
  if (outcome.winner_character_ids.length > 1) {
    for (const winner_id of outcome.winner_character_ids) {
      await insertModifier(winner_id, {
        stat_name: 'current_morale',
        modifier_value: 2,
        source_type: 'team_morale_cascade',
        source_id: outcome.battle_id,
        expires_hours: 24,
        notes: 'Team victory energy'
      });
    }
  }

  // Losers cascade: -2 morale from shared defeat
  if (outcome.loser_character_ids.length > 1) {
    for (const loser_id of outcome.loser_character_ids) {
      await insertModifier(loser_id, {
        stat_name: 'current_morale',
        modifier_value: -2,
        source_type: 'team_morale_cascade',
        source_id: outcome.battle_id,
        expires_hours: 24,
        notes: 'Shared defeat demoralization'
      });
    }
  }
}

/**
 * Apply PTSD effect - fear debuff when facing a specific opponent who defeated you badly
 */
export async function applyPTSD(
  character_id: string,
  opponent_id: string,
  battle_id: string
): Promise<void> {
  await insertModifier(character_id, {
    stat_name: 'current_stress',
    modifier_value: 8,
    source_type: 'ptsd',
    source_id: battle_id,
    expires_hours: 336, // 14 days
    notes: `PTSD from crushing defeat`,
    context_data: { opponent_id }
  });

  await insertModifier(character_id, {
    stat_name: 'current_confidence',
    modifier_value: -5,
    source_type: 'ptsd',
    source_id: battle_id,
    expires_hours: 336,
    notes: `Fear of opponent`,
    context_data: { opponent_id }
  });

  console.log(`[Psychology] Applied PTSD to ${character_id} against opponent ${opponent_id}`);
}

/**
 * Apply rivalry effects when beating/losing to a rival
 */
export async function applyRivalryEffect(
  character_id: string,
  rival_id: string,
  won: boolean,
  battle_id: string
): Promise<void> {
  if (won) {
    // Dominance boost
    await insertModifier(character_id, {
      stat_name: 'current_morale',
      modifier_value: 10,
      source_type: 'rivalry_dominance',
      source_id: battle_id,
      expires_hours: 168, // 7 days
      notes: 'Victory over rival',
      context_data: { rival_id }
    });
    await insertModifier(character_id, {
      stat_name: 'current_confidence',
      modifier_value: 8,
      source_type: 'rivalry_dominance',
      source_id: battle_id,
      expires_hours: 168,
      notes: 'Proved dominance over rival',
      context_data: { rival_id }
    });
  } else {
    // Humiliation penalty
    await insertModifier(character_id, {
      stat_name: 'current_morale',
      modifier_value: -8,
      source_type: 'rivalry_humiliation',
      source_id: battle_id,
      expires_hours: 120, // 5 days
      notes: 'Lost to rival',
      context_data: { rival_id }
    });
    await insertModifier(character_id, {
      stat_name: 'current_stress',
      modifier_value: 10,
      source_type: 'rivalry_humiliation',
      source_id: battle_id,
      expires_hours: 120,
      notes: 'Humiliated by rival',
      context_data: { rival_id }
    });
  }

  console.log(`[Psychology] Applied rivalry ${won ? 'dominance' : 'humiliation'} to ${character_id}`);
}

/**
 * Apply therapy/counseling effects (reduces stress, boosts mental health)
 */
export async function applyTherapyEffect(
  character_id: string,
  therapy_type: 'basic' | 'intensive' | 'specialized',
  session_id: string  // therapy session ID for tracking
): Promise<void> {
  const effects: Record<string, { stress: number; morale: number; duration: number }> = {
    basic: { stress: -5, morale: 3, duration: 48 },
    intensive: { stress: -12, morale: 8, duration: 120 },
    specialized: { stress: -20, morale: 12, duration: 168 }
  };

  const effect = effects[therapy_type];

  await insertModifier(character_id, {
    stat_name: 'current_stress',
    modifier_value: effect.stress,
    source_type: 'therapy',
    source_id: session_id,
    expires_hours: effect.duration,
    notes: `${therapy_type} therapy session - stress reduction`
  });

  await insertModifier(character_id, {
    stat_name: 'current_morale',
    modifier_value: effect.morale,
    source_type: 'therapy',
    source_id: session_id,
    expires_hours: effect.duration,
    notes: `${therapy_type} therapy session - morale boost`
  });

  console.log(`[Psychology] Applied ${therapy_type} therapy to ${character_id}`);
}

/**
 * Apply bond boost from high coach relationship
 */
export async function applyBondBoost(
  character_id: string,
  bond_level: number,
  user_id: string  // coach user ID for tracking
): Promise<void> {
  // Only applies at high bond levels
  if (bond_level < 70) return;

  const boost = Math.floor((bond_level - 70) / 10) + 1; // 1-3 based on bond

  await insertModifier(character_id, {
    stat_name: 'current_morale',
    modifier_value: boost,
    source_type: 'bond_boost',
    source_id: `bond_check_${user_id}_${Date.now()}`,
    notes: `High bond with coach (${bond_level}%) - morale boost`
    // No expiration - permanent while bond stays high
  });

  console.log(`[Psychology] Applied bond boost (+${boost} morale) to ${character_id}`);
}

/**
 * Get all active psychology modifiers for a character
 */
export async function getActivePsychologyModifiers(character_id: string): Promise<any[]> {
  const result = await query(`
    SELECT *
    FROM character_modifiers
    WHERE user_character_id = $1
      AND source_type IN (
        'battle_defeat', 'battle_victory_morale', 'critical_injury', 'near_death',
        'teammate_death', 'team_morale_cascade', 'rivalry_dominance', 'rivalry_humiliation',
        'ptsd', 'trauma_decay', 'therapy', 'bond_boost'
      )
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
  `, [character_id]);

  return result.rows;
}

/**
 * Clear expired modifiers (can be called by cron job)
 */
export async function clearExpiredModifiers(): Promise<number> {
  const result = await query(`
    DELETE FROM character_modifiers
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
    RETURNING id
  `);

  const count = result.rowCount || 0;
  if (count > 0) {
    console.log(`[Psychology] Cleared ${count} expired modifiers`);
  }

  return count;
}

/**
 * Apply trauma decay - gradually reduces trauma effects over time
 * Call this daily via cron job
 */
export async function applyTraumaDecay(): Promise<void> {
  // Find all active trauma modifiers older than 24 hours
  const result = await query(`
    SELECT id, user_character_id, modifier_value, source_type
    FROM character_modifiers
    WHERE source_type IN ('near_death', 'ptsd', 'teammate_death', 'critical_injury')
      AND (expires_at IS NULL OR expires_at > NOW())
      AND created_at < NOW() - interval '24 hours'
      AND ABS(modifier_value) > 2
  `);

  for (const row of result.rows) {
    // Reduce modifier by 10% (healing over time)
    const decayed_value = Math.round(row.modifier_value * 0.9);

    if (Math.abs(decayed_value) <= 2) {
      // Too small, just delete it
      await query(`DELETE FROM character_modifiers WHERE id = $1`, [row.id]);
      console.log(`[Psychology] Removed healed trauma modifier ${row.id}`);
    } else {
      // Update with decayed value
      await query(`
        UPDATE character_modifiers
        SET modifier_value = $1
        WHERE id = $2
      `, [decayed_value, row.id]);
      console.log(`[Psychology] Decayed trauma modifier ${row.id}: ${row.modifier_value} -> ${decayed_value}`);
    }
  }
}

/**
 * Apply HQ tier effects to a character's psychological stats.
 * Called when:
 * - Character is assigned to a headquarters
 * - HQ tier changes (upgrade/downgrade)
 *
 * Removes any existing hq_tier_effect modifiers and applies new ones
 * based on the headquarters_tiers table values.
 */
export async function applyHqTierEffects(
  character_id: string,
  tier_id: string
): Promise<void> {
  // Get the psychological modifiers for this tier
  const tier_result = await query(`
    SELECT stress_modifier, morale_modifier, fatigue_modifier
    FROM headquarters_tiers
    WHERE tier_id = $1
  `, [tier_id]);

  if (tier_result.rows.length === 0) {
    console.error(`[Psychology] Unknown tier_id: ${tier_id}`);
    return;
  }

  const { stress_modifier, morale_modifier, fatigue_modifier } = tier_result.rows[0];

  // Remove any existing hq_tier_effect modifiers for this character
  await query(`
    DELETE FROM character_modifiers
    WHERE user_character_id = $1 AND source_type = 'hq_tier_effect'
  `, [character_id]);

  // Apply new modifiers (only if non-zero)
  const source_id = `hq_tier_${tier_id}`;

  if (stress_modifier !== 0) {
    await insertModifier(character_id, {
      stat_name: 'current_stress',
      modifier_value: stress_modifier,
      source_type: 'hq_tier_effect',
      source_id,
      notes: `Living conditions effect from ${tier_id}`
    });
  }

  if (morale_modifier !== 0) {
    await insertModifier(character_id, {
      stat_name: 'current_morale',
      modifier_value: morale_modifier,
      source_type: 'hq_tier_effect',
      source_id,
      notes: `Living conditions effect from ${tier_id}`
    });
  }

  if (fatigue_modifier !== 0) {
    await insertModifier(character_id, {
      stat_name: 'current_fatigue',
      modifier_value: fatigue_modifier,
      source_type: 'hq_tier_effect',
      source_id,
      notes: `Living conditions effect from ${tier_id}`
    });
  }

  console.log(`[Psychology] Applied HQ tier effects (${tier_id}) to ${character_id}: stress=${stress_modifier}, morale=${morale_modifier}, fatigue=${fatigue_modifier}`);
}

/**
 * Apply HQ tier effects to all characters in a headquarters.
 * Called when HQ tier changes (upgrade/downgrade).
 */
export async function applyHqTierEffectsToAllCharacters(
  headquarters_id: string,
  tier_id: string
): Promise<void> {
  // Get all characters in this headquarters
  const characters_result = await query(`
    SELECT id FROM user_characters
    WHERE headquarters_id = $1
  `, [headquarters_id]);

  for (const row of characters_result.rows) {
    await applyHqTierEffects(row.id, tier_id);
  }

  console.log(`[Psychology] Applied HQ tier effects (${tier_id}) to ${characters_result.rows.length} characters in HQ ${headquarters_id}`);
}

/**
 * Insert a psychology modifier into the database
 */
async function insertModifier(
  character_id: string,
  effect: PsychologyEffect
): Promise<void> {
  const expires_at = effect.expires_hours
    ? new Date(Date.now() + effect.expires_hours * 60 * 60 * 1000)
    : null;

  await query(`
    INSERT INTO character_modifiers (
      user_character_id,
      stat_name,
      modifier_value,
      modifier_type,
      source_type,
      source_id,
      expires_at,
      notes,
      context_data
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    character_id,
    effect.stat_name,
    effect.modifier_value,
    effect.expires_hours ? 'temporary' : 'permanent',
    effect.source_type,
    effect.source_id,
    expires_at,
    effect.notes,
    effect.context_data ? JSON.stringify(effect.context_data) : null
  ]);
}
