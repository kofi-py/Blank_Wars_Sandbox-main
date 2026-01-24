/**
 * Spell Service - Handles learning, unlocking, and equipping character spells
 *
 * Spell System:
 * - Universal spells (available to all)
 * - Archetype-specific spells
 * - Species-specific spells
 * - Signature spells (character-specific)
 * - Spells are unlocked/ranked with ability_points (unified currency shared with powers)
 * - Characters can equip spells to their loadout for battle
 */

import { query } from '../database/index';
import { requireNotInBattle } from './battleLockService';

interface SpellDefinition {
  id: string;
  name: string;
  description: string;
  flavor_text?: string;
  tier: 'universal' | 'archetype' | 'species' | 'signature';
  power_level?: number; // 1 (common), 2 (uncommon), or 3 (rare)
  archetype?: string;
  species?: string;
  character_id?: string;
  unlock_cost: number;
  rank_up_cost: number;
  rank_up_cost_r3: number;
  max_rank: number;
  mana_cost: number;
  cooldown_turns: number;
  effects: any;
  icon?: string;
  animation?: string;
}

interface CharacterSpell {
  id: string;
  character_id: string;
  spell_id: string;
  current_rank: number;
  unlocked: boolean;
  unlocked_at?: Date;
  times_cast: number;
  last_cast?: Date;
}

interface SpellLoadout {
  character_id: string;
  spell_id: string;
  slot_number: number;
}

interface Character {
  id: string;
  user_id: string;
  character_id: string;
  level: number;
  ability_points: number;
  archetype?: string;
  species?: string;
  name: string; // Add name
}

/**
 * Get all spells available to a character (universal + archetype + species)
 */
export async function getAvailableSpells(character_id: string): Promise<any> {
  // Get character details
  const char_result = await query(
    `SELECT uc.id, uc.user_id, uc.character_id, uc.level, uc.ability_points,
            c.archetype, c.species, c.name
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [character_id]
  );

  if (char_result.rows.length === 0) {
    throw new Error(`Character ${character_id} not found`);
  }

  const character: Character = char_result.rows[0];

  // Get all spell definitions available to this character
  const spells_result = await query(
    `SELECT * FROM spell_definitions
     WHERE tier = 'universal'
        OR (tier = 'archetype' AND archetype = $1)
        OR (tier = 'species' AND species = $2)
        OR (tier = 'signature' AND character_id = $3)
     ORDER BY
       CASE tier
         WHEN 'universal' THEN 1
         WHEN 'archetype' THEN 2
         WHEN 'species' THEN 3
         WHEN 'signature' THEN 4
       END,
       name`,
    [character.archetype, character.species, character.character_id]
  );

  // Get character's unlocked spells
  const unlocked_result = await query(
    `SELECT * FROM character_spells WHERE character_id = $1`,
    [character_id]
  );

  const unlocked_map = new Map<string, CharacterSpell>();
  unlocked_result.rows.forEach((row: CharacterSpell) => {
    unlocked_map.set(row.spell_id, row);
  });

  // Get character's equipped spells
  const loadout_result = await query(
    `SELECT * FROM character_spell_loadout WHERE user_character_id = $1 ORDER BY slot_number`,
    [character_id]
  );

  const equipped_spells = new Set(loadout_result.rows.map((r: SpellLoadout) => r.spell_id));

  // Combine data
  const spells = spells_result.rows.map((spell: SpellDefinition) => {
    const unlocked = unlocked_map.get(spell.id);
    return {
      ...spell,
      is_unlocked: !!unlocked,
      current_rank: unlocked?.current_rank,
      is_equipped: equipped_spells.has(spell.id),
      times_cast: unlocked?.times_cast || 0,
      last_cast: unlocked?.last_cast,
      can_unlock: can_unlockSpell(spell, character, unlocked_map),
      can_rank_up: can_rankUpSpell(spell, character, unlocked),
    };
  });

  return {
    character: {
      id: character.id,
      name: character.name, // Add name
      level: character.level,
      ability_points: character.ability_points,
    },
    spells,
    loadout: loadout_result.rows,
  };
}

/**
 * Check if character can unlock a spell
 */
function can_unlockSpell(
  spell: SpellDefinition,
  character: Character,
  unlocked_spells: Map<string, CharacterSpell>
): { can: boolean; reason?: string } {
  // Already unlocked
  if (unlocked_spells.has(spell.id)) {
    return { can: false, reason: 'Already unlocked' };
  }

  // Check character points
  if (character.ability_points < spell.unlock_cost) {
    return { can: false, reason: `Need ${spell.unlock_cost} character points (have ${character.ability_points})` };
  }

  return { can: true };
}

/**
 * Check if character can rank up a spell
 */
function can_rankUpSpell(
  spell: SpellDefinition,
  character: Character,
  unlocked?: CharacterSpell
): { can: boolean; reason?: string } {
  // Not unlocked yet
  if (!unlocked) {
    return { can: false, reason: 'Not unlocked' };
  }

  // Already at max rank
  if (unlocked.current_rank >= spell.max_rank) {
    return { can: false, reason: 'Already at max rank' };
  }

  // Check character points - cost depends on current rank
  const cost = unlocked.current_rank === 1 ? spell.rank_up_cost : spell.rank_up_cost_r3;
  if (character.ability_points < cost) {
    return { can: false, reason: `Need ${cost} character points (have ${character.ability_points})` };
  }

  return { can: true };
}

/**
 * Unlock a spell by spending character points
 */
export async function unlockSpell(params: {
  character_id: string;
  spell_id: string;
}): Promise<any> {
  const { character_id, spell_id } = params;

  // Check if character is in battle
  await requireNotInBattle(character_id);

  // Start transaction to prevent race conditions
  await query('BEGIN');

  try {
    // Get character with row lock
    const char_result = await query(
      `SELECT uc.id, uc.user_id, uc.character_id, uc.level, uc.ability_points,
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

    // Get spell definition
    const spell_result = await query(
      `SELECT * FROM spell_definitions WHERE id = $1`,
      [spell_id]
    );

    if (spell_result.rows.length === 0) {
      await query('ROLLBACK');
      throw new Error(`Spell ${spell_id} not found`);
    }

    const spell: SpellDefinition = spell_result.rows[0];

    // Get unlocked spells
    const unlocked_result = await query(
      `SELECT * FROM character_spells WHERE character_id = $1`,
      [character_id]
    );

    const unlocked_map = new Map<string, CharacterSpell>();
    unlocked_result.rows.forEach((row: CharacterSpell) => {
      unlocked_map.set(row.spell_id, row);
    });

    // Verify can unlock
    const can_unlock = can_unlockSpell(spell, character, unlocked_map);
    if (!can_unlock.can) {
      await query('ROLLBACK');
      throw new Error(`Cannot unlock spell: ${can_unlock.reason}`);
    }

    // Deduct character points
    await query(
      `UPDATE user_characters
       SET ability_points = ability_points - $1
       WHERE id = $2`,
      [spell.unlock_cost, character_id]
    );

    // Create character_spells entry
    const spell_instance_id = `charspell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await query(
      `INSERT INTO character_spells (id, character_id, spell_id, current_rank, unlocked, unlocked_at)
       VALUES ($1, $2, $3, 1, true, NOW())`,
      [spell_instance_id, character_id, spell_id]
    );

    // Commit transaction
    await query('COMMIT');

    return {
      success: true,
      spell: {
        id: spell.id,
        name: spell.name,
        tier: spell.tier,
        current_rank: 1,
      },
      points_spent: spell.unlock_cost,
      remaining_points: character.ability_points - spell.unlock_cost,
    };
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

/**
 * Rank up an existing spell
 */
export async function rankUpSpell(params: {
  character_id: string;
  spell_id: string;
}): Promise<any> {
  const { character_id, spell_id } = params;

  // Check if character is in battle
  await requireNotInBattle(character_id);

  // Start transaction to prevent race conditions
  await query('BEGIN');

  try {
    // Get character with row lock
    const char_result = await query(
      `SELECT uc.id, uc.user_id, uc.character_id, uc.level, uc.ability_points,
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

    // Get spell definition
    const spell_result = await query(
      `SELECT * FROM spell_definitions WHERE id = $1`,
      [spell_id]
    );

    if (spell_result.rows.length === 0) {
      await query('ROLLBACK');
      throw new Error(`Spell ${spell_id} not found`);
    }

    const spell: SpellDefinition = spell_result.rows[0];

    // Get character's spell instance
    const instance_result = await query(
      `SELECT * FROM character_spells WHERE character_id = $1 AND spell_id = $2`,
      [character_id, spell_id]
    );

    if (instance_result.rows.length === 0) {
      await query('ROLLBACK');
      throw new Error(`Spell not unlocked yet`);
    }

    const instance: CharacterSpell = instance_result.rows[0];

    // Verify can rank up
    const can_rank = can_rankUpSpell(spell, character, instance);
    if (!can_rank.can) {
      await query('ROLLBACK');
      throw new Error(`Cannot rank up spell: ${can_rank.reason}`);
    }

    // Deduct character points - cost depends on current rank
    const cost = instance.current_rank === 1 ? spell.rank_up_cost : spell.rank_up_cost_r3;
    await query(
      `UPDATE user_characters
       SET ability_points = ability_points - $1
       WHERE id = $2`,
      [cost, character_id]
    );

    // Rank up spell
    const new_rank = instance.current_rank + 1;
    await query(
      `UPDATE character_spells
       SET current_rank = $1
       WHERE character_id = $2 AND spell_id = $3`,
      [new_rank, character_id, spell_id]
    );

    // Commit transaction
    await query('COMMIT');

    return {
      success: true,
      spell: {
        id: spell.id,
        name: spell.name,
        tier: spell.tier,
        current_rank: new_rank,
        max_rank: spell.max_rank,
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
 * Equip a spell to loadout
 */
export async function equipSpell(params: {
  character_id: string;
  spell_id: string;
  slot_number: number;
}): Promise<{ success: boolean; message: string }> {
  const { character_id, spell_id, slot_number } = params;

  // Check if character is in battle
  await requireNotInBattle(character_id);

  // Validate slot number (1-8 typical loadout size)
  if (slot_number < 1 || slot_number > 8) {
    throw new Error('Invalid slot number (must be 1-8)');
  }

  // Check if spell is unlocked
  const unlocked_result = await query(
    `SELECT * FROM character_spells WHERE character_id = $1 AND spell_id = $2`,
    [character_id, spell_id]
  );

  if (unlocked_result.rows.length === 0) {
    throw new Error('Must unlock spell before equipping');
  }

  // Remove any spell in that slot
  await query(
    `DELETE FROM character_spell_loadout WHERE user_character_id = $1 AND slot_number = $2`,
    [character_id, slot_number]
  );

  // Remove spell from other slots if already equipped
  await query(
    `DELETE FROM character_spell_loadout WHERE user_character_id = $1 AND spell_id = $2`,
    [character_id, spell_id]
  );

  // Equip spell to slot
  await query(
    `INSERT INTO character_spell_loadout (user_character_id, spell_id, slot_number)
     VALUES ($1, $2, $3)`,
    [character_id, spell_id, slot_number]
  );

  return {
    success: true,
    message: `Equipped spell to slot ${slot_number}`,
  };
}

/**
 * Unequip a spell from loadout
 */
export async function unequipSpell(params: {
  character_id: string;
  slot_number: number;
}): Promise<{ success: boolean; message: string }> {
  const { character_id, slot_number } = params;

  const result = await query(
    `DELETE FROM character_spell_loadout WHERE user_character_id = $1 AND slot_number = $2`,
    [character_id, slot_number]
  );

  return {
    success: true,
    message: `Unequipped spell from slot ${slot_number}`,
  };
}

/**
 * Get character's equipped spell loadout
 */
export async function getSpellLoadout(character_id: string): Promise<any> {
  const result = await query(
    `SELECT csl.slot_number, sd.*
     FROM character_spell_loadout csl
     JOIN spell_definitions sd ON csl.spell_id = sd.id
     WHERE csl.character_id = $1
     ORDER BY csl.slot_number`,
    [character_id]
  );

  return {
    character_id: character_id,
    loadout: result.rows,
  };
}
