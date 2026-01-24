/**
 * Spells API Routes
 *
 * Endpoints for managing character spells (unlocking, ranking, equipping, loadouts)
 * Trigger rebuild: 2025-10-29
 */

import express from 'express';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import {
  getAvailableSpells,
  unlockSpell,
  rankUpSpell,
  equipSpell,
  unequipSpell,
  getSpellLoadout,
} from '../services/spellService';
import {
  check_adherence_and_equip_spell,
  check_adherence_and_unlock_spell
} from '../services/loadoutAdherenceService';
import { query } from '../database/index';

const router = express.Router();

/**
 * GET /api/spells/character/:character_id
 * Get all spells available to a character (learned + available to learn)
 */
router.get('/character/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;
    const result = await getAvailableSpells(character_id);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting character spells:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/spells/unlock
 * Unlock a new spell by spending character points
 *
 * Body: {
 *   character_id: string,
 *   spell_id: string
 * }
 */
router.post('/unlock', authenticate_token, async (req: AuthRequest, res) => {
  if (!req.user) {
    throw new Error('STRICT MODE: req.user missing after authenticate_token');
  }
  const { character_id, spell_id } = req.body;

  if (!character_id || !spell_id) {
    return res.status(400).json({ error: 'character_id and spell_id required' });
  }

  // Get user_id from authenticated session (NOT from request body)
  const user_id = req.user.id;

  // Use adherence check - character may rebel and choose different spell
  const result = await check_adherence_and_unlock_spell({
    user_id,
    character_id,
    coach_spell_choice: spell_id
  });

  // If survey is required, return immediately
  if (result.survey_required) {
    return res.json({
      success: false,
      survey_required: true,
      survey_options: result.survey_options,
      adherence_score: result.adherence_score,
      message: result.reason
    });
  }

  res.json(result);
});



/**
 * POST /api/spells/rank-up
 * Rank up an existing spell by spending character points
 *
 * Body: {
 *   character_id: string,
 *   spell_id: string
 * }
 */
router.post('/rank-up', async (req, res) => {
  try {
    const { character_id, spell_id } = req.body;

    if (!character_id || !spell_id) {
      return res.status(400).json({ error: 'character_id and spell_id required' });
    }

    const result = await rankUpSpell({ character_id, spell_id });
    res.json(result);
  } catch (error: any) {
    console.error('Error ranking up spell:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/spells/equip
 * Equip an unlocked spell to a loadout slot with adherence check
 *
 * Body: {
 *   user_id: string,
 *   character_id: string,
 *   spell_id: string,
 *   slot_number: number (1-8)
 * }
 */
router.post('/equip', async (req, res) => {
  try {
    const { user_id, character_id, spell_id, slot_number } = req.body;

    if (!user_id || !character_id || !spell_id || slot_number === undefined) {
      return res.status(400).json({ error: 'user_id, character_id, spell_id, and slot_number required' });
    }

    // Check adherence and let character rebel if needed
    const result = await check_adherence_and_equip_spell({
      user_id,
      character_id,
      coach_spell_choice: spell_id,
      slot_number
    });

    res.json({
      success: true,
      adhered: result.adhered,
      coach_choice: spell_id,
      final_choice: result.final_choice,
      reasoning: result.ai_response,
      adherence_score: result.adherence_score,
      message: result.reason
    });
  } catch (error: any) {
    console.error('Error equipping spell:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/spells/unequip
 * Unequip a spell from a loadout slot
 *
 * Body: {
 *   character_id: string,
 *   slot_number: number
 * }
 */
router.post('/unequip', async (req, res) => {
  try {
    const { character_id, slot_number } = req.body;

    if (!character_id || slot_number === undefined) {
      return res.status(400).json({ error: 'character_id and slot_number required' });
    }

    const result = await unequipSpell({ character_id, slot_number });
    res.json(result);
  } catch (error: any) {
    console.error('Error unequipping spell:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/spells/loadout/:character_id
 * Get character's equipped spell loadout
 */
router.get('/loadout/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;
    const result = await getSpellLoadout(character_id);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting spell loadout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/spells/definitions
 * Get all spell definitions (master catalog)
 *
 * Query params:
 * - tier: filter by tier (universal, archetype, species, signature)
 * - archetype: filter by archetype
 * - species: filter by species
 */
router.get('/definitions', async (req, res) => {
  try {
    const { tier, archetype, species } = req.query;

    let where_clause = '1=1';
    const params: any[] = [];

    if (tier) {
      params.push(tier);
      where_clause += ` AND tier = $${params.length}`;
    }

    if (archetype) {
      params.push(archetype);
      where_clause += ` AND archetype = $${params.length}`;
    }

    if (species) {
      params.push(species);
      where_clause += ` AND species = $${params.length}`;
    }

    const result = await query(
      `SELECT * FROM spell_definitions
       WHERE ${where_clause}
       ORDER BY
         CASE tier
           WHEN 'universal' THEN 1
           WHEN 'archetype' THEN 2
           WHEN 'species' THEN 3
           WHEN 'signature' THEN 4
         END,
         required_level,
         name`,
      params
    );

    res.json({ spells: result.rows });
  } catch (error: any) {
    console.error('Error getting spell definitions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/spells/stats/:character_id
 * Get spell usage statistics for a character
 */
router.get('/stats/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;

    const result = await query(
      `SELECT
         cs.spell_id,
         sd.name,
         sd.tier,
         cs.times_cast,
         cs.last_cast,
         cs.unlocked_at
       FROM character_spells cs
       JOIN spell_definitions sd ON cs.spell_id = sd.id
       WHERE cs.character_id = $1
       ORDER BY cs.times_cast DESC, sd.tier`,
      [character_id]
    );

    res.json({
      character_id: character_id,
      unlocked_spells_count: result.rows.length,
      stats: result.rows,
    });
  } catch (error: any) {
    console.error('Error getting spell stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
