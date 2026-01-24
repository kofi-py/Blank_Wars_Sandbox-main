import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import { query } from '../database/index';
import GameEventBus from '../services/gameEventBus';

const router = express.Router();

// Get the singleton instance of GameEventBus
const event_bus = GameEventBus.get_instance();

// Apply character stat changes based on decision effects
async function applyCharacterStatChanges(character_id: string, effects: any) {
  try {
    console.log('[EVENTS] 🎯 Applying stat changes to character:', character_id, 'Effects:', JSON.stringify(effects));
    
    // Build dynamic SQL update based on provided effects
    const updates: string[] = [];
    const values: any[] = [];
    let param_index = 1;

    // Map effect keys to database columns
    const stat_mapping: { [key: string]: string } = {
      trust: 'team_trust',
      stress: 'current_stress',
      happiness: 'current_mental_health',
      ego: 'current_ego',
      communication: 'current_communication',
      adherence: 'gameplan_adherence'
    };

    for (const [effect_key, change_value] of Object.entries(effects)) {
      const db_column = stat_mapping[effect_key];
      if (db_column && typeof change_value === 'number') {
        updates.push(`${db_column} = COALESCE(${db_column}, 50) + $${param_index}`);
        values.push(change_value);
        param_index++;
      }
    }

    if (updates.length > 0) {
      values.push(character_id); // Add character ID at the end
      const sql = `
        UPDATE user_characters 
        SET ${updates.join(', ')}
        WHERE id = $${param_index}
        RETURNING id, team_trust, current_stress, current_mental_health
      `;
      
      const result = await query(sql, values);
      console.log('[EVENTS] ✅ Character stats updated successfully:', result.rows[0]);
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('[EVENTS] Error applying stat changes:', error);
    throw error;
  }
}

/**
 * POST /api/events
 * Create a new game event and generate memories
 */
router.post('/', authenticate_token, async (req: AuthRequest, res: Response) => {
  console.log('[EVENTS] received', req.body?.type, typeof req.body?.payload, req.body);
  try {
    const event_data = req.body;
    
    // Validate required fields
    if (!event_data.type || !event_data.character_ids || !event_data.description) {
      return res.status(400).json({
        error: 'Missing required fields: type, character_ids, description'
      });
    }

    // Parse character IDs - flat array, no hierarchy
    const userchar_ids = Array.isArray(event_data.character_ids) ? event_data.character_ids : [event_data.character_ids];

    console.log('[EVENTS] Character IDs:', userchar_ids);

    // VALIDATION: Ensure character_ids are UUIDs, not canonical IDs
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of userchar_ids) {
      if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
        console.error('[EVENTS] ❌ INVALID ID DETECTED - Expected UUID, got canonical ID or invalid format');
        console.error('[EVENTS] ❌ Bad ID:', id);
        console.error('[EVENTS] ❌ Full request body:', JSON.stringify(req.body, null, 2));
        console.error('[EVENTS] ❌ Request headers:', JSON.stringify(req.headers, null, 2));
        return res.status(400).json({
          error: `Invalid character_id format: "${id}" is not a UUID. Use user_characters.id (UUID), not character_id (canonical).`,
          hint: 'character_ids must be UUIDs like "b252bd0f-1226-46e2-a622-5095d9b803c0", not canonical IDs like "sun_wukong"',
          received_id: id,
          all_ids: userchar_ids
        });
      }
    }

    // Validate severity is provided
    if (!event_data.severity) {
      return res.status(400).json({ error: 'Missing required field: severity' });
    }

    // Determine source and category based on event type
    const source = event_data.type.includes('financial') ? 'financial_advisory' : 'chat_system';
    const category = event_data.type.includes('financial') ? 'financial' : 'social';

    // Publish event through the GameEventBus
    const event_id = await event_bus.publish({
      type: event_data.type,
      source,
      userchar_ids,
      severity: event_data.severity,
      category,
      description: event_data.description,
      metadata: event_data.metadata,
      tags: ['financial', 'decision'],
      importance: event_data.severity === 'critical' ? 9 : event_data.severity === 'high' ? 7 : 5
    });

    // Apply character stat changes if effects are provided
    if (event_data.metadata?.effects && userchar_ids.length > 0) {
      for (const character_id of userchar_ids) {
        await applyCharacterStatChanges(character_id, event_data.metadata.effects);
      }
    }

    res.status(201).json({
      success: true,
      event_id,
      message: 'Event created and memories generated'
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/events/:id
 * Get a specific event by ID
 */
router.get('/:id', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // This would need to be implemented in the adapter
    // For now, return a placeholder response
    res.status(501).json({
      error: 'Event retrieval not yet implemented',
      message: 'Waiting for database adapter integration'
    });

  } catch (error) {
    console.error('Error retrieving event:', error);
    res.status(500).json({
      error: 'Failed to retrieve event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/events/character/:character_id
 * Get recent events for a character
 */
router.get('/character/:character_id', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const { character_id } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // This would use the adapter to get recent events
    res.status(501).json({
      error: 'Character events retrieval not yet implemented',
      message: 'Waiting for database adapter integration'
    });

  } catch (error) {
    console.error('Error retrieving character events:', error);
    res.status(500).json({
      error: 'Failed to retrieve character events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;