import { query } from '../database';

export interface BondData {
  target_id: string;
  target_name: string;
  trust_score: number;
  status: string;
  golden_memory?: string; // The "Core Memory" of friendship
  recent_good_vibe?: string; // The "Recent Win"
  description: string;   // Composite description for AI context
}

export class BondDatabaseService {
  private static instance: BondDatabaseService;

  private constructor() {}

  public static get_instance(): BondDatabaseService {
    if (!BondDatabaseService.instance) {
      BondDatabaseService.instance = new BondDatabaseService();
    }
    return BondDatabaseService.instance;
  }

  /**
   * Get positive bonds for a character (The "Friendship Engine")
   * 1. Status: Queries character_relationships for high trust/allies
   * 2. Narrative: Queries character_memories for "Golden Memories" and motivational moments
   */
  public async getPositiveBondsByCharacter(characterId: string): Promise<BondData[]> {
    try {
      // Step 1: Identify Allies (The Status)
      // Find characters with high trust (>40) or explicit friend/ally status
      const relationshipsResult = await query(
        `SELECT 
           cr.character2_id as ally_id, 
           c.name as target_name, 
           cr.current_trust, 
           cr.relationship_status
         FROM character_relationships cr
         JOIN characters c ON cr.character2_id = c.id
         WHERE cr.character1_id = $1
           AND (cr.relationship_status IN ('friend', 'ally', 'partner', 'mentor') OR cr.current_trust > 40)
         ORDER BY cr.current_trust DESC
         LIMIT 5`,
        [characterId]
      );

      const bonds: BondData[] = [];

      for (const row of relationshipsResult.rows) {
        const allyId = row.ally_id;
        
        // Step 2: Fetch the "Golden Memory" (The Core Friendship Event)
        // Highest importance positive memory involving this ally
        // We look for importance >= 7 and positive valence >= 7
        const goldenResult = await query(
          `SELECT content 
           FROM character_memories 
           WHERE character_id = $1 
             AND $2 = ANY(associated_characters)
             AND importance >= 7 
             AND valence >= 7
           ORDER BY importance DESC, created_at ASC 
           LIMIT 1`,
          [characterId, allyId]
        );

        // Step 3: Fetch the "Recent Good Vibe" (Motivational Moment)
        // Most recent positive memory involving this ally
        const recentResult = await query(
          `SELECT content, created_at
           FROM character_memories 
           WHERE character_id = $1 
             AND $2 = ANY(associated_characters)
             AND valence >= 6
           ORDER BY created_at DESC 
           LIMIT 1`,
          [characterId, allyId]
        );

        const goldenMemory = goldenResult.rows[0]?.content;
        const recentVibe = recentResult.rows[0]?.content;

        // Construct a rich description for the AI
        let description = `${row.target_name} is a ${row.relationship_status} (Trust: ${row.current_trust}).`;
        
        if (goldenMemory) {
          description += ` Bond forged by: "${goldenMemory}".`;
        }
        
        if (recentVibe && recentVibe !== goldenMemory) {
          description += ` Recent motivational moment: "${recentVibe}".`;
        }

        bonds.push({
          target_id: allyId,
          target_name: row.target_name,
          trust_score: row.current_trust,
          status: row.relationship_status,
          golden_memory: goldenMemory,
          recent_good_vibe: recentVibe,
          description: description
        });
      }

      return bonds;

    } catch (error) {
      console.error(`[BondDatabaseService] Error loading bonds for ${characterId}:`, error);
      // Return empty array to prevent crashing the calling service
      return [];
    }
  }
}

export default BondDatabaseService;
