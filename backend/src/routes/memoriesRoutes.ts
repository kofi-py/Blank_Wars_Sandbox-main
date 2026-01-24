import express, { Response } from 'express';
import { authenticate_token } from '../services/auth';
import { AuthRequest } from '../types';
import GameEventBus from '../services/gameEventBus';
import { getEmotionalState, ContextType } from '../services/emotionalStateService';

const router = express.Router();

/**
 * GET /api/memories/character/:user_character_id
 * Get memories for a user character, optionally filtered by scene type
 */
router.get('/character/:user_character_id', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const { user_character_id } = req.params;
    const scene_type = req.query.scene as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const min_importance = parseInt(req.query.min_importance as string) || 0;

    const event_bus = GameEventBus.get_instance();
    const memories = event_bus.getCharacterMemories(user_character_id, {
      importance: min_importance,
      limit: limit
    });

    // Filter by scene type if provided
    let filtered_memories = memories;
    if (scene_type) {
      filtered_memories = memories.filter(memory =>
        memory.cross_reference_data.can_referenced_in.includes(scene_type)
      );
    }

    res.json({
      success: true,
      user_character_id,
      scene_type,
      memories: filtered_memories,
      count: filtered_memories.length,
      total_available: memories.length
    });

  } catch (error) {
    console.error('Error retrieving memories:', error);
    res.status(500).json({
      error: 'Failed to retrieve memories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/memories/context/:user_character_id/:scene_type
 * Get formatted memory context for prompt injection
 */
router.get('/context/:user_character_id/:scene_type', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const { user_character_id, scene_type } = req.params;
    const other_characters = req.query.others ? (req.query.others as string).split(',') : [];

    const event_bus = GameEventBus.get_instance();

    // Get recent memories relevant to the scene type
    const all_memories = event_bus.getCharacterMemories(user_character_id, {
      importance: 5,
      limit: 10
    });

    // Filter memories by scene relevance and other characters involved
    const relevant_memories = all_memories.filter(memory => {
      const scene_relevant = memory.cross_reference_data.can_referenced_in.includes(scene_type);
      const characters_relevant = other_characters.length === 0 ||
        other_characters.some(char => memory.associated_characters.includes(char));
      return scene_relevant || characters_relevant;
    }).slice(0, 5);

    // Get relationships with other characters
    const relationships: Record<string, {
      trust: number;
      respect: number;
      affection: number;
      rivalry: number;
      trajectory: string;
    }> = {};

    for (const other_char of other_characters) {
      const relationship = event_bus.getRelationship(user_character_id, other_char);
      if (relationship) {
        relationships[other_char] = {
          trust: relationship.trust_level,
          respect: relationship.respect_level,
          affection: relationship.affection_level,
          rivalry: relationship.rivalry_intensity,
          trajectory: relationship.relationship_trajectory
        };
      }
    }

    // Format memories for prompt injection
    const recent_memories = relevant_memories.map(memory =>
      `${memory.content} (${memory.emotional_valence}, importance: ${memory.importance})`
    );

    // Build contextual hints from memory tags
    const contextual_hints = relevant_memories
      .filter(memory => memory.tags.length > 0)
      .map(memory => `Remember: ${memory.content}`)
      .slice(0, 3);

    // Get emotional state from the centralized service
    const emotional_result = await getEmotionalState({
      user_character_id,
      context_type: scene_type as ContextType
    });

    const context = {
      user_character_id,
      scene: scene_type,
      recent_memories,
      relationships,
      emotional_state: {
        prose: emotional_result.prose,
        current_mood: emotional_result.current_mood,
        summary: emotional_result.summary,
        dominant_factors: emotional_result.dominant_factors
      },
      contextual_hints
    };

    res.json({
      success: true,
      context,
      memories_found: relevant_memories.length,
      relationships_found: Object.keys(relationships).length
    });

  } catch (error) {
    console.error('Error building memory context:', error);
    res.status(500).json({
      error: 'Failed to build memory context',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/memories/:memory_id/recall
 * Mark a memory as recalled (updates frequency/importance)
 */
router.post('/:memory_id/recall', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const { memory_id } = req.params;

    const event_bus = GameEventBus.get_instance();
    const memory = event_bus.recallMemory(memory_id);

    res.json({
      success: true,
      memory_id,
      recall_count: memory.recall_count,
      last_recalled: memory.last_recalled
    });

  } catch (error) {
    console.error('Error updating memory recall:', error);
    res.status(500).json({
      error: 'Failed to update memory recall',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/memories/relationships/:user_character_id
 * Get relationship status for a character with all known characters
 */
router.get('/relationships/:user_character_id', authenticate_token, async (req: AuthRequest, res: Response) => {
  try {
    const { user_character_id } = req.params;
    const target_id = req.query.target as string;

    const event_bus = GameEventBus.get_instance();

    if (target_id) {
      // Get specific relationship
      const relationship = event_bus.getRelationship(user_character_id, target_id);
      if (!relationship) {
        return res.status(404).json({
          error: 'Relationship not found'
        });
      }

      res.json({
        success: true,
        relationship
      });
    } else {
      // Get all relationships - use memories to find associated characters
      const memories = event_bus.getCharacterMemories(user_character_id, { limit: 100 });
      const associated_ids = new Set<string>();
      for (const memory of memories) {
        for (const char_id of memory.associated_characters) {
          associated_ids.add(char_id);
        }
      }

      const relationships: Record<string, {
        trust: number;
        respect: number;
        affection: number;
        rivalry: number;
        trajectory: string;
        last_interaction: Date;
      }> = {};
      for (const char_id of associated_ids) {
        const rel = event_bus.getRelationship(user_character_id, char_id);
        if (rel) {
          relationships[char_id] = {
            trust: rel.trust_level,
            respect: rel.respect_level,
            affection: rel.affection_level,
            rivalry: rel.rivalry_intensity,
            trajectory: rel.relationship_trajectory,
            last_interaction: rel.last_interaction
          };
        }
      }

      res.json({
        success: true,
        user_character_id,
        relationships,
        count: Object.keys(relationships).length
      });
    }

  } catch (error) {
    console.error('Error retrieving relationships:', error);
    res.status(500).json({
      error: 'Failed to retrieve relationships',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
