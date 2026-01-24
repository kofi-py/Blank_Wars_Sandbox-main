/**
 * Power Service - Handles unlocking and ranking up character powers
 *
 * Four-Tier Power System:
 * - Tier 1: Skills (universal, 1 point to unlock, 1 per rank)
 * - Tier 2: Abilities (archetype-specific, 2 points to unlock, 1 per rank)
 * - Tier 3: Species Powers (species-specific, 3 points to unlock, 2 per rank)
 * - Tier 4: Signature Powers (character-specific, 5 points to unlock, 3 per rank)
 */

import { query } from '../database/index';
import { requireNotInBattle } from './battleLockService';

interface PowerDefinition {
  id: string;
  name: string;
  tier: 'skill' | 'ability' | 'species' | 'signature';
  power_level?: number; // 1 (common), 2 (uncommon), or 3 (rare)
  category?: string;
  archetype?: string;
  species?: string;
  character_id?: string;
  description: string;
  flavor_text?: string;
  icon?: string;
  max_rank: number;
  rank_bonuses?: any;
  unlock_level?: number;
  unlock_challenge?: string;
  unlock_cost: number;
  rank_up_cost: number;
  rank_up_cost_r3?: number;
  prerequisite_power_id?: string;
  power_type: 'active' | 'passive' | 'toggle';
  effects?: any;
  cooldown?: number;
  energy_cost?: number;
}

interface CharacterPower {
  id: string;
  character_id: string;
  power_id: string;
  current_rank: number;
  experience: number;
  unlocked: boolean;
  unlocked_at?: Date;
  unlocked_by?: string;
  times_used: number;
  last_used?: Date;
}

interface Character {
  id: string;
  user_id: string;
  character_id: string;
  level: number;
  ability_points: number;
  archetype?: string;
  species?: string;
}

/**
 * Get all available powers for a character (unlocked + available to unlock)
 */
export async function get_character_powers(character_id: string): Promise<any> {
  // Get character details
  const char_result = await query(
    `SELECT uc.id, uc.user_id, uc.character_id, uc.level,
            uc.ability_points,
            c.archetype, c.species
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [character_id]
  );

  if (char_result.rows.length === 0) {
    throw new Error(`Character ${character_id} not found`);
  }

  const character: Character = char_result.rows[0];

  // Get all power definitions that this character can access
  const powers_result = await query(
    `SELECT * FROM power_definitions
     WHERE tier = 'skill'
        OR (tier = 'ability' AND archetype = $1)
        OR (tier = 'species' AND species = $2)
        OR (tier = 'signature' AND character_id = $3)
     ORDER BY
       CASE tier
         WHEN 'skill' THEN 1
         WHEN 'ability' THEN 2
         WHEN 'species' THEN 3
         WHEN 'signature' THEN 4
       END,
       unlock_level NULLS FIRST,
       name`,
    [character.archetype, character.species, character.character_id]
  );

  // Get character's unlocked powers
  const unlocked_result = await query(
    `SELECT * FROM character_powers WHERE character_id = $1`,
    [character_id]
  );

  const unlocked_map = new Map<string, CharacterPower>();
  unlocked_result.rows.forEach((row: CharacterPower) => {
    unlocked_map.set(row.power_id, row);
  });

  // Get character's equipped powers
  const loadout_result = await query(
    `SELECT * FROM character_power_loadout WHERE user_character_id = $1 ORDER BY slot_number`,
    [character_id]
  );

  const equipped_powers = new Set(loadout_result.rows.map((r: any) => r.power_id));

  // Combine data
  const powers = powers_result.rows.map((power: PowerDefinition) => {
    const unlocked = unlocked_map.get(power.id);
    return {
      ...power,
      is_unlocked: !!unlocked,
      is_equipped: equipped_powers.has(power.id),
      current_rank: unlocked?.current_rank,
      experience: unlocked?.experience,
      times_used: unlocked?.times_used,
      unlocked_at: unlocked?.unlocked_at,
      unlocked_by: unlocked?.unlocked_by,
      can_unlock: can_unlockPower(power, character, unlocked_map),
      can_rank_up: can_rankUpPower(power, character, unlocked),
    };
  });

  return {
    character: {
      id: character.id,
      level: character.level,
      ability_points: character.ability_points,
    },
    powers,
    loadout: loadout_result.rows,
  };
}

/**
 * Check if character can unlock a power
 */
function can_unlockPower(
  power: PowerDefinition,
  character: Character,
  unlocked_powers: Map<string, CharacterPower>
): { can: boolean; reason?: string } {
  // Already unlocked
  if (unlocked_powers.has(power.id)) {
    return { can: false, reason: 'Already unlocked' };
  }

  // Check level requirement
  if (power.unlock_level && character.level < power.unlock_level) {
    return { can: false, reason: `Requires level ${power.unlock_level}` };
  }

  // Check prerequisite power
  if (power.prerequisite_power_id && !unlocked_powers.has(power.prerequisite_power_id)) {
    return { can: false, reason: 'Missing prerequisite power' };
  }

  // Check character points
  if (character.ability_points < power.unlock_cost) {
    return { can: false, reason: `Need ${power.unlock_cost} character points (have ${character.ability_points})` };
  }

  return { can: true };
}

/**
 * Check if character can rank up a power
 */
function can_rankUpPower(
  power: PowerDefinition,
  character: Character,
  unlocked?: CharacterPower
): { can: boolean; reason?: string } {
  // Not unlocked yet
  if (!unlocked) {
    return { can: false, reason: 'Not unlocked' };
  }

  // Already at max rank
  if (unlocked.current_rank >= power.max_rank) {
    return { can: false, reason: 'Already at max rank' };
  }

  // Check character points - cost depends on current rank
  const cost = unlocked.current_rank === 1 ? power.rank_up_cost : power.rank_up_cost_r3;
  if (cost === undefined) {
    throw new Error(`STRICT MODE: Power ${power.id} missing rank_up_cost`);
  }
  if (character.ability_points < cost) {
    return { can: false, reason: `Need ${cost} character points (have ${character.ability_points})` };
  }

  return { can: true };
}

/**
 * Unlock a power by spending points
 */
export async function unlock_power(params: {
  character_id: string;
  power_id: string;
  triggered_by: 'coach_suggestion' | 'character_rebellion' | 'auto';
}): Promise<any> {
  const { character_id, power_id, triggered_by } = params;

  // Check if character is in battle
  await requireNotInBattle(character_id);

  // Start transaction to prevent race conditions
  await query('BEGIN');

  try {
    // Get character with row lock to prevent concurrent modifications
    const char_result = await query(
      `SELECT uc.id, uc.user_id, uc.character_id, uc.level,
              uc.ability_points,
              c.archetype, c.species
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1
       FOR UPDATE`,
      [character_id]
    );

    if (char_result.rows.length === 0) {
      await query('ROLLBACK');
      throw new Error(`Character ${character_id} not found`);
    }

    const character: Character = char_result.rows[0];

    // Get power definition
    const power_result = await query(
      `SELECT * FROM power_definitions WHERE id = $1`,
      [power_id]
    );

    if (power_result.rows.length === 0) {
      await query('ROLLBACK');
      throw new Error(`Power ${power_id} not found`);
    }

    const power: PowerDefinition = power_result.rows[0];

    // Get unlocked powers
    const unlocked_result = await query(
      `SELECT * FROM character_powers WHERE character_id = $1`,
      [character_id]
    );

    const unlocked_map = new Map<string, CharacterPower>();
    unlocked_result.rows.forEach((row: CharacterPower) => {
      unlocked_map.set(row.power_id, row);
    });

    // Verify can unlock
    const can_unlock = can_unlockPower(power, character, unlocked_map);
    if (!can_unlock.can) {
      await query('ROLLBACK');
      throw new Error(`Cannot unlock power: ${can_unlock.reason}`);
    }

    // Deduct character points
    await query(
      `UPDATE user_characters
       SET ability_points = ability_points - $1
       WHERE id = $2`,
      [power.unlock_cost, character_id]
    );

    // Create character_powers entry
    const power_instance_id = `charpow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await query(
      `INSERT INTO character_powers (id, character_id, power_id, current_rank, unlocked, unlocked_at, unlocked_by)
       VALUES ($1, $2, $3, 1, true, NOW(), $4)`,
      [power_instance_id, character_id, power_id, triggered_by]
    );

    // Log unlock
    await query(
      `INSERT INTO power_unlock_log (character_id, power_id, action, from_rank, to_rank, triggered_by, points_spent)
       VALUES ($1, $2, 'unlock', 0, 1, $3, $4)`,
      [character_id, power_id, triggered_by, power.unlock_cost]
    );

    // Commit transaction
    await query('COMMIT');

    return {
      success: true,
      power: {
        id: power.id,
        name: power.name,
        tier: power.tier,
        current_rank: 1,
      },
      points_spent: power.unlock_cost,
      remaining_points: character.ability_points - power.unlock_cost,
    };
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

/**
 * Rank up an existing power
 */
export async function rank_up_power(params: {
  character_id: string;
  power_id: string;
  triggered_by: 'coach_suggestion' | 'character_rebellion' | 'auto';
}): Promise<any> {
  const { character_id, power_id, triggered_by } = params;

  // Check if character is in battle
  await requireNotInBattle(character_id);

  // Start transaction to prevent race conditions
  await query('BEGIN');

  try {
    // Get character with row lock
    const char_result = await query(
      `SELECT uc.id, uc.user_id, uc.character_id, uc.level,
              uc.ability_points,
              c.archetype, c.species
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1
       FOR UPDATE`,
      [character_id]
    );

    if (char_result.rows.length === 0) {
      await query('ROLLBACK');
      throw new Error(`Character ${character_id} not found`);
    }

    const character: Character = char_result.rows[0];

    // Get power definition
    const power_result = await query(
      `SELECT * FROM power_definitions WHERE id = $1`,
      [power_id]
    );

    if (power_result.rows.length === 0) {
      await query('ROLLBACK');
      throw new Error(`Power ${power_id} not found`);
    }

    const power: PowerDefinition = power_result.rows[0];

    // Get character's power instance
    const instance_result = await query(
      `SELECT * FROM character_powers WHERE character_id = $1 AND power_id = $2`,
      [character_id, power_id]
    );

    if (instance_result.rows.length === 0) {
      await query('ROLLBACK');
      throw new Error(`Power not unlocked yet`);
    }

    const instance: CharacterPower = instance_result.rows[0];

    // Verify can rank up
    const can_rank = can_rankUpPower(power, character, instance);
    if (!can_rank.can) {
      await query('ROLLBACK');
      throw new Error(`Cannot rank up power: ${can_rank.reason}`);
    }

    // Deduct character points - cost depends on current rank
    const cost = instance.current_rank === 1 ? power.rank_up_cost : power.rank_up_cost_r3;
    if (cost === undefined) {
      await query('ROLLBACK');
      throw new Error(`STRICT MODE: Power ${power.id} missing rank_up_cost`);
    }
    await query(
      `UPDATE user_characters
       SET ability_points = ability_points - $1
       WHERE id = $2`,
      [cost, character_id]
    );

    // Rank up power
    const new_rank = instance.current_rank + 1;
    await query(
      `UPDATE character_powers
       SET current_rank = $1
       WHERE character_id = $2 AND power_id = $3`,
      [new_rank, character_id, power_id]
    );

    // Log rank up
    await query(
      `INSERT INTO power_unlock_log (character_id, power_id, action, from_rank, to_rank, triggered_by, points_spent)
       VALUES ($1, $2, 'rank_up', $3, $4, $5, $6)`,
      [character_id, power_id, instance.current_rank, new_rank, triggered_by, cost]
    );

    // Commit transaction
    await query('COMMIT');

    return {
      success: true,
      power: {
        id: power.id,
        name: power.name,
        tier: power.tier,
        current_rank: new_rank,
        max_rank: power.max_rank,
      },
      points_spent: cost,
      remaining_points: character.ability_points - cost,
    };
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

/**
 * Equip a power to a loadout slot
 */
export async function equip_power(params: {
  character_id: string;
  power_id: string;
  slot_number: number;
}): Promise<{ success: boolean; message: string }> {
  const { character_id, power_id, slot_number } = params;

  // Check if character is in battle
  await requireNotInBattle(character_id);

  // Validate slot number (1-8)
  if (slot_number < 1 || slot_number > 8) {
    throw new Error('Invalid slot number (must be 1-8)');
  }

  // Check if power is unlocked
  const unlocked_result = await query(
    `SELECT * FROM character_powers WHERE character_id = $1 AND power_id = $2`,
    [character_id, power_id]
  );

  if (unlocked_result.rows.length === 0) {
    throw new Error('Must unlock power before equipping');
  }

  // Remove any power in that slot
  await query(
    `DELETE FROM character_power_loadout WHERE user_character_id = $1 AND slot_number = $2`,
    [character_id, slot_number]
  );

  // Remove power from other slots if already equipped
  await query(
    `DELETE FROM character_power_loadout WHERE user_character_id = $1 AND power_id = $2`,
    [character_id, power_id]
  );

  // Equip power to slot
  await query(
    `INSERT INTO character_power_loadout (user_character_id, power_id, slot_number)
     VALUES ($1, $2, $3)`,
    [character_id, power_id, slot_number]
  );

  return {
    success: true,
    message: `Equipped power to slot ${slot_number}`,
  };
}

/**
 * Unequip a power from a loadout slot
 */
export async function unequip_power(params: {
  character_id: string;
  slot_number: number;
}): Promise<{ success: boolean; message: string }> {
  const { character_id, slot_number } = params;

  const result = await query(
    `DELETE FROM character_power_loadout WHERE user_character_id = $1 AND slot_number = $2`,
    [character_id, slot_number]
  );

  return {
    success: true,
    message: `Unequipped power from slot ${slot_number}`,
  };
}

/**
 * Get character's equipped power loadout
 */
export async function get_power_loadout(character_id: string): Promise<any> {
  const result = await query(
    `SELECT cpl.slot_number, pd.*
     FROM character_power_loadout cpl
     JOIN power_definitions pd ON cpl.power_id = pd.id
     WHERE cpl.user_character_id = $1
     ORDER BY cpl.slot_number`,
    [character_id]
  );

  return {
    character_id: character_id,
    loadout: result.rows,
  };
}

/**
 * Grant character points (called on level up, battle victory, etc.)
 */
export async function grant_points(params: {
  character_id: string;
  amount: number;
  source: string;
}): Promise<any> {
  const { character_id, amount, source } = params;

  // Check if character is in battle
  await requireNotInBattle(character_id);

  await query(
    `UPDATE user_characters
     SET ability_points = ability_points + $1
     WHERE id = $2`,
    [amount, character_id]
  );

  console.log(`✨ Granted ${amount} character points to ${character_id} from ${source}`);

  return {
    success: true,
    points_granted: amount,
    source,
  };
}
