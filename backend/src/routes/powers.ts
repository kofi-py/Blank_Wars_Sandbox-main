/**
 * Powers API Routes
 *
 * Endpoints for managing character powers (skills, abilities, species powers, signatures)
 */

import express from 'express';
import { AuthRequest } from '../types';
import { authenticate_token } from '../services/auth';
import {
  get_character_powers,
  unlock_power,
  rank_up_power,
  equip_power,
  unequip_power,
  get_power_loadout,
  grant_points,
} from '../services/powerService';
import { rebellion_auto_spend_points } from '../services/powerRebellionService';
import { spell_rebellion_auto_spend_points } from '../services/spellRebellionService';
import {
  check_adherence_and_equip_power,
  check_adherence_and_unlock_power
} from '../services/loadoutAdherenceService';
import { query } from '../database/index';
import { GameEventBus } from '../services/gameEventBus';

/**
 * Check if character passes adherence check (d100 roll vs gameplan_adherence from DB)
 * Non-battle context: no battle-state modifiers applied
 */
async function check_adherence(character_id: string): Promise<{ passes: boolean; roll: number; threshold: number }> {
  const result = await query(
    `SELECT gameplan_adherence FROM user_characters WHERE id = $1`,
    [character_id]
  );

  if (result.rows.length === 0) {
    throw new Error(`Character ${character_id} not found`);
  }

  const { gameplan_adherence } = result.rows[0];

  if (gameplan_adherence === null || gameplan_adherence === undefined) {
    throw new Error(`gameplan_adherence is null for character ${character_id} - check DB generated column`);
  }

  const roll = Math.floor(Math.random() * 100) + 1; // d100: 1-100
  const threshold = gameplan_adherence;

  return {
    passes: roll <= threshold,
    roll,
    threshold,
  };
}

const router = express.Router();

/**
 * GET /api/powers/character/:character_id
 * Get all powers for a character (unlocked + available to unlock)
 */
router.get('/character/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;
    const result = await get_character_powers(character_id.trim());
    res.json(result);
  } catch (error: any) {
    console.error('Error getting character powers:', error);
    if (error.message && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /api/powers/unlock
 * Unlock a power by spending points
 *
 * Body: {
 *   character_id: string,
 *   power_id: string,
 *   triggered_by?: 'coach_suggestion' | 'character_rebellion' | 'auto'
 * }
 */
router.post('/unlock', authenticate_token, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('STRICT MODE: req.user missing after authenticate_token');
    }
    const { character_id, power_id } = req.body;

    if (!character_id || !power_id) {
      return res.status(400).json({ error: 'character_id and power_id required' });
    }

    // Get user_id from authenticated session (NOT from request body)
    const user_id = req.user.id;

    // Use adherence check - character may rebel and choose different power
    const result = await check_adherence_and_unlock_power({
      user_id,
      character_id,
      coach_power_choice: power_id
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

    // Emit ability_learned event
    const eventBus = GameEventBus.get_instance();
    await eventBus.publish({
      type: 'ability_learned',
      source: 'skills_advisor',
      userchar_ids: [character_id],
      severity: result.adhered ? 'low' : 'medium',
      category: 'skills',
      description: result.adhered
        ? `Learned new ability: ${power_id}`
        : `Character rebelled and learned: ${result.final_choice}`,
      metadata: {
        coach_choice: power_id,
        final_choice: result.final_choice,
        adhered: result.adhered,
        ai_response: result.ai_response,
        adherence_score: result.adherence_score
      },
      tags: ['progression', 'ability', 'unlock', result.adhered ? 'adherence' : 'rebellion'],
      importance: result.adhered ? 5 : 7
    });

    res.json(result);
  } catch (err) {
    const error = err as Error;
    console.error('Error unlocking power:', error);
    res.status(500).json({ error: error.message });
  }
});



/**
 * POST /api/powers/rank-up
 * Rank up an existing power
 *
 * Body: {
 *   character_id: string,
 *   power_id: string,
 *   triggered_by?: 'coach_suggestion' | 'character_rebellion' | 'auto'
 * }
 */
router.post('/rank-up', async (req, res) => {
  try {
    const { character_id, power_id, triggered_by = 'coach_suggestion' } = req.body;

    if (!character_id || !power_id) {
      return res.status(400).json({ error: 'character_id and power_id required' });
    }

    const result = await rank_up_power({
      character_id,
      power_id,
      triggered_by,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error ranking up power:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/powers/grant-points
 * Grant points to a character (from level up, battle, etc.)
 * Triggers adherence check and potential rebellion
 *
 * Body: {
 *   character_id: string,
 *   skill_points?: number,
 *   archetype_points?: number,
 *   species_points?: number,
 *   signature_points?: number,
 *   source: string (e.g., 'level_up', 'battle_victory')
 * }
 */
router.post('/grant-points', async (req, res) => {
  try {
    const {
      character_id,
      skill_points = 0,
      archetype_points = 0,
      species_points = 0,
      signature_points = 0,
      source,
    } = req.body;

    if (!character_id || !source) {
      return res.status(400).json({ error: 'character_id and source required' });
    }

    // Grant the points first (using unified ability_points)
    const total_points = skill_points + archetype_points + species_points + signature_points;
    await grant_points({
      character_id,
      amount: total_points,
      source,
    });

    // Emit level_up event if source is level_up
    if (source === 'level_up') {
      const eventBus = GameEventBus.get_instance();
      await eventBus.publish({
        type: 'level_up',
        source: 'training_grounds',
        userchar_ids: [character_id],
        severity: 'medium',
        category: 'progression',
        description: `Character leveled up!`,
        metadata: {
          new_level: 0, // We don't have the new level here easily without querying, but the event exists
          points_gained: total_points
        },
        tags: ['progression', 'level_up', 'milestone'],
        importance: 7
      });
    }

    // Check adherence - will character rebel?
    const adherence_check = await check_adherence(character_id);

    // If adherence fails, AI auto-spends points on BOTH powers and spells
    if (!adherence_check.passes) {
      console.log(`⚠️  Adherence check FAILED (${adherence_check.roll}/${adherence_check.threshold})`);

      // Trigger power rebellion
      const power_rebellion = await rebellion_auto_spend_points({
        character_id,
        points_earned: {
          skill: skill_points,
          archetype: archetype_points,
          species: species_points,
          signature: signature_points,
        },
      });

      // Trigger spell rebellion
      const spell_rebellion = await spell_rebellion_auto_spend_points({
        character_id,
        points_earned: total_points,
      });

      return res.json({
        success: true,
        points_granted: {
          skill: skill_points,
          archetype: archetype_points,
          species: species_points,
          signature: signature_points,
        },
        adherence_check: {
          passed: false,
          roll: adherence_check.roll,
          threshold: adherence_check.threshold,
        },
        power_rebellion: power_rebellion,
        spell_rebellion: spell_rebellion,
        message: 'Points granted but character rebelled and spent them autonomously on powers AND spells!',
      });
    }

    // Adherence passed - coach has control
    console.log(`✅ Adherence check PASSED (${adherence_check.roll}/${adherence_check.threshold})`);

    res.json({
      success: true,
      points_granted: {
        skill: skill_points,
        archetype: archetype_points,
        species: species_points,
        signature: signature_points,
      },
      adherence_check: {
        passed: true,
        roll: adherence_check.roll,
        threshold: adherence_check.threshold,
      },
      message: 'Points granted! Coach can now suggest how to spend them.',
    });
  } catch (error: any) {
    console.error('Error granting points:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/powers/definitions
 * Get all power definitions (master catalog)
 *
 * Query params:
 * - tier: filter by tier (skill, ability, species, signature)
 * - archetype: filter by archetype
 * - species: filter by species
 * - character_id: filter by character
 */
router.get('/definitions', async (req, res) => {
  try {
    const { tier, archetype, species, character_id } = req.query;

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

    if (character_id) {
      params.push(character_id);
      where_clause += ` AND character_id = $${params.length}`;
    }

    const { query } = await import('../database/index');
    const result = await query(
      `SELECT * FROM power_definitions
       WHERE ${where_clause}
       ORDER BY
         CASE tier
           WHEN 'skill' THEN 1
           WHEN 'ability' THEN 2
           WHEN 'species' THEN 3
           WHEN 'signature' THEN 4
         END,
         unlock_level NULLS FIRST,
         name`,
      params
    );

    res.json({ powers: result.rows });
  } catch (error: any) {
    console.error('Error getting power definitions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/powers/equip
 * Equip an unlocked power to a loadout slot with adherence check
 *
 * Body: {
 *   user_id: string,
 *   character_id: string,
 *   power_id: string,
 *   slot_number: number (1-8)
 * }
 */
router.post('/equip', async (req, res) => {
  try {
    const { user_id, character_id, power_id, slot_number } = req.body;

    if (!user_id || !character_id || !power_id || slot_number === undefined) {
      return res.status(400).json({ error: 'user_id, character_id, power_id, and slot_number required' });
    }

    // Check adherence and let character rebel if needed
    const result = await check_adherence_and_equip_power({
      user_id,
      character_id,
      coach_power_choice: power_id,
      slot_number
    });

    res.json({
      success: true,
      adhered: result.adhered,
      coach_choice: power_id,
      final_choice: result.final_choice,
      reasoning: result.ai_response,
      adherence_score: result.adherence_score,
      message: result.reason
    });
  } catch (error: any) {
    console.error('Error equipping power:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/powers/unequip
 * Unequip a power from a loadout slot
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

    const result = await unequip_power({ character_id, slot_number });
    res.json(result);
  } catch (error: any) {
    console.error('Error unequipping power:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/powers/loadout/:character_id
 * Get character's equipped power loadout
 */
router.get('/loadout/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;
    const result = await get_power_loadout(character_id);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting power loadout:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
