import { query } from '../database/index';

/**
 * Kitchen Table Conflict Service
 *
 * Queries scene_triggers table to generate random conflict scenarios
 * for kitchen table interactions based on scene_type and hq_tier.
 */

export interface KitchenTableTrigger {
  id: number;
  scene_type: 'mundane' | 'conflict' | 'chaos';
  hq_tier: string | null;
  trigger_text: string;
  weight: number;
  domain: string;
}

export interface KitchenTableConflictContext {
  trigger: KitchenTableTrigger | null;
  scene_type: 'mundane' | 'conflict' | 'chaos';
  hq_tier: string;
  has_hq_specific_trigger: boolean;
}

export class KitchenTableConflictService {
  private static instance: KitchenTableConflictService;

  private constructor() {}

  static getInstance(): KitchenTableConflictService {
    if (!KitchenTableConflictService.instance) {
      KitchenTableConflictService.instance = new KitchenTableConflictService();
    }
    return KitchenTableConflictService.instance;
  }

  /**
   * Get a random kitchen table trigger for the given scene type and HQ tier.
   * Prefers HQ-specific triggers when available.
   */
  async getRandomTrigger(
    scene_type: 'mundane' | 'conflict' | 'chaos',
    hq_tier: string
  ): Promise<KitchenTableTrigger | null> {
    // First try to get an HQ-specific trigger
    const hq_specific_result = await query(
      `SELECT id, scene_type, hq_tier, trigger_text, weight, domain
       FROM scene_triggers
       WHERE domain = 'kitchen_table'
       AND scene_type = $1
       AND hq_tier = $2
       ORDER BY RANDOM()
       LIMIT 1`,
      [scene_type, hq_tier]
    );

    if (hq_specific_result.rows.length > 0) {
      console.log(`🏠 [KITCHEN-TABLE] Found HQ-specific trigger for ${hq_tier}`);
      return hq_specific_result.rows[0];
    }

    // Fall back to generic trigger for this scene type
    const generic_result = await query(
      `SELECT id, scene_type, hq_tier, trigger_text, weight, domain
       FROM scene_triggers
       WHERE domain = 'kitchen_table'
       AND scene_type = $1
       AND hq_tier IS NULL
       ORDER BY RANDOM()
       LIMIT 1`,
      [scene_type]
    );

    if (generic_result.rows.length > 0) {
      console.log(`🍳 [KITCHEN-TABLE] Found generic trigger for scene_type=${scene_type}`);
      return generic_result.rows[0];
    }

    console.warn(`⚠️ [KITCHEN-TABLE] No triggers found for scene_type=${scene_type}, hq_tier=${hq_tier}`);
    return null;
  }

  /**
   * Get conflict context for kitchen table scene.
   * Returns the selected trigger and metadata.
   */
  async getConflictContext(
    scene_type: 'mundane' | 'conflict' | 'chaos',
    hq_tier: string
  ): Promise<KitchenTableConflictContext> {
    const trigger = await this.getRandomTrigger(scene_type, hq_tier);

    return {
      trigger,
      scene_type,
      hq_tier,
      has_hq_specific_trigger: trigger?.hq_tier === hq_tier,
    };
  }

  /**
   * Get all triggers for a given scene type (for testing/debugging)
   */
  async getAllTriggersForSceneType(
    scene_type: 'mundane' | 'conflict' | 'chaos'
  ): Promise<KitchenTableTrigger[]> {
    const result = await query(
      `SELECT id, scene_type, hq_tier, trigger_text, weight, domain
       FROM scene_triggers
       WHERE domain = 'kitchen_table'
       AND scene_type = $1
       ORDER BY hq_tier NULLS LAST, id`,
      [scene_type]
    );

    return result.rows;
  }

  /**
   * Get trigger counts by scene type (for monitoring)
   */
  async getTriggerCounts(): Promise<Record<string, number>> {
    const result = await query(
      `SELECT scene_type, COUNT(*) as count
       FROM scene_triggers
       WHERE domain = 'kitchen_table'
       GROUP BY scene_type
       ORDER BY scene_type`
    );

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.scene_type] = parseInt(row.count, 10);
    }
    return counts;
  }

  /**
   * Generate dynamic sleeping conflicts based on actual room state.
   * These are context-aware triggers that reflect the current living situation.
   *
   * Extracted from frontend PromptTemplateService - this is valuable because
   * it creates relevant drama based on actual overcrowding, not random picks.
   */
  generateSleepingConflicts(rooms: Array<{
    assigned_characters: string[],
    max_characters: number
  }>): string[] {
    const conflicts: string[] = [];

    for (const room of rooms) {
      const overcrowded = room.assigned_characters.length > room.max_characters;
      const floor_sleepers = Math.max(0, room.assigned_characters.length - room.max_characters);

      if (overcrowded) {
        conflicts.push(
          "Someone who slept on the floor last night is complaining about back pain and being grumpy",
          "There's heated tension about who gets the actual beds versus floor/couch sleeping",
          "The floor sleepers are demanding a fair rotation system for the beds",
          "Someone's loud snoring from the bed kept the floor sleepers awake all night",
          "Floor sleepers are bitter about the unfair sleeping arrangements",
          "Someone sleeping on the couch is complaining about being woken up by kitchen activity"
        );
      }

      if (room.assigned_characters.length >= 2) {
        conflicts.push(
          "Roommates are bickering about personal space and belongings cluttering the shared bedroom",
          "Someone's early morning/late night routine is disrupting their roommate's sleep",
          "There's passive-aggressive complaints about someone hogging all the blankets",
          "Someone's restless tossing and turning kept their bunk mate awake",
          "Roommates are arguing about temperature preferences for sleeping",
          "Someone left their clothes and gear all over the shared sleeping space"
        );
      }

      // Escalation when many floor sleepers
      if (floor_sleepers >= 3) {
        conflicts.push(
          "The sleeping situation has become chaotic with too many people on floors and couches",
          "Multiple floor sleepers are forming an alliance to demand better arrangements"
        );
      }
    }

    return conflicts;
  }

  /**
   * Get a random sleeping conflict based on room state.
   * Returns null if no rooms are overcrowded (no sleeping drama needed).
   */
  getRandomSleepingConflict(rooms: Array<{
    assigned_characters: string[],
    max_characters: number
  }>): string | null {
    const conflicts = this.generateSleepingConflicts(rooms);
    if (conflicts.length === 0) return null;
    return conflicts[Math.floor(Math.random() * conflicts.length)];
  }

  /**
   * Format trigger for injection into prompt
   */
  formatTriggerForPrompt(trigger: KitchenTableTrigger): string {
    return `## IMMEDIATE SITUATION
${trigger.trigger_text}

React to this situation naturally based on your personality, relationships with present housemates, and current mood. This is happening RIGHT NOW at the kitchen table.`;
  }

  /**
   * Get a formatted trigger ready for prompt injection
   */
  async getFormattedTrigger(
    scene_type: 'mundane' | 'conflict' | 'chaos',
    hq_tier: string
  ): Promise<string | null> {
    const trigger = await this.getRandomTrigger(scene_type, hq_tier);

    if (!trigger) {
      return null;
    }

    return this.formatTriggerForPrompt(trigger);
  }
}

// Export singleton instance
export const kitchenTableConflictService = KitchenTableConflictService.getInstance();

export default kitchenTableConflictService;
