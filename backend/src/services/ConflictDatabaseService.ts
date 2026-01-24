import { query } from '../database';

export interface ConflictData {
  target_id: string;
  target_name: string;
  rivalry_score: number;
  status: string;
  origin_story?: string; // The "Formative Memory"
  recent_slight?: string; // The "Recent Friction"
  description: string;   // Composite description for AI context
}

export class ConflictDatabaseService {
  private static instance: ConflictDatabaseService;

  private constructor() {}

  public static get_instance(): ConflictDatabaseService {
    if (!ConflictDatabaseService.instance) {
      ConflictDatabaseService.instance = new ConflictDatabaseService();
    }
    return ConflictDatabaseService.instance;
  }

  /**
   * Get active conflicts for a character
   * Hybird Approach:
   * 1. Status: Queries character_relationships for high rivalry/enemies
   * 2. Narrative: Queries character_memories for specific "Origin Stories" and recent slights
   */
  public async getConflictsByCharacter(characterId: string): Promise<ConflictData[]> {
    try {
      // Step 1: Identify Rivals (The Status)
      // Find characters with high rivalry (>40) or explicit enemy/rival status
      const relationshipsResult = await query(
        `SELECT 
           cr.character2_id as rival_id, 
           c.name as target_name, 
           cr.current_rivalry, 
           cr.relationship_status
         FROM character_relationships cr
         JOIN characters c ON cr.character2_id = c.id
         WHERE cr.character1_id = $1
           AND (cr.relationship_status IN ('rival', 'enemy') OR cr.current_rivalry > 40)
         ORDER BY cr.current_rivalry DESC
         LIMIT 5`,
        [characterId]
      );

      const conflicts: ConflictData[] = [];

      for (const row of relationshipsResult.rows) {
        const rivalId = row.rival_id;
        
        // Step 2: Fetch the "Origin Story" (The Formative Memory)
        // Earliest high-importance negative memory involving this rival
        // We look for importance >= 7 and negative valence <= 4
        const originResult = await query(
          `SELECT content 
           FROM character_memories 
           WHERE character_id = $1 
             AND $2 = ANY(associated_characters)
             AND importance >= 7 
             AND valence <= 4
           ORDER BY created_at ASC 
           LIMIT 1`,
          [characterId, rivalId]
        );

        // Step 3: Fetch the "Recent Slight" (The Current Friction)
        // Most recent negative memory involving this rival
        const recentResult = await query(
          `SELECT content, created_at
           FROM character_memories 
           WHERE character_id = $1 
             AND $2 = ANY(associated_characters)
             AND valence <= 4
           ORDER BY created_at DESC 
           LIMIT 1`,
          [characterId, rivalId]
        );

        const originStory = originResult.rows[0]?.content;
        const recentSlight = recentResult.rows[0]?.content;

        // Construct a rich description for the AI
        let description = `${row.target_name} is a ${row.relationship_status} (Rivalry: ${row.current_rivalry}).`;
        
        if (originStory) {
          description += ` Origin of conflict: "${originStory}".`;
        }
        
        if (recentSlight && recentSlight !== originStory) {
          description += ` Recent slight: "${recentSlight}".`;
        }

        conflicts.push({
          target_id: rivalId,
          target_name: row.target_name,
          rivalry_score: row.current_rivalry,
          status: row.relationship_status,
          origin_story: originStory,
          recent_slight: recentSlight,
          description: description
        });
      }

      return conflicts;

    } catch (error) {
      console.error(`[ConflictDatabaseService] Error loading conflicts for ${characterId}:`, error);
      // Return empty array to prevent crashing the calling service
      return [];
    }
  }
}

export default ConflictDatabaseService;
