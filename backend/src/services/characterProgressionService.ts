import { query } from '../database/postgres';
import { v4 as uuidv4 } from 'uuid';
import { InternalMailService } from './internalMailService';
import { performSimpleAdherenceRoll } from './battleAdherenceService';
import { requireNotInBattle } from './battleLockService';

export interface CharacterProgression {
  character_id: string;
  user_id: string;
  level: number;
  experience: number;
  total_experience: number;
  stat_points: number;
  skill_points: number;
  ability_points: number;
  tier: string;
  title: string;
  last_updated: Date;
}

export interface SkillProgression {
  id: string;
  character_id: string;
  skill_id: string;
  skill_name: string;
  level: number;
  experience: number;
  max_level: number;
  unlocked: boolean;
  last_updated: Date;
}

export interface AbilityProgression {
  id: string;
  character_id: string;
  ability_id: string;
  ability_name: string;
  rank: number;
  max_rank: number;
  unlocked: boolean;
  unlocked_at: Date;
}

export interface ExperienceGain {
  id: string;
  character_id: string;
  source: 'battle' | 'training' | 'quest' | 'achievement' | 'daily' | 'event';
  amount: number;
  multiplier: number;
  description: string;
  timestamp: Date;
}

export interface LevelRequirement {
  total_xp_required: string; // BigInt returns as string from pg
  stat_points_reward: number;
  skill_points_reward: number;
  ability_points_reward: number;
  tier_title: string;
}

export class CharacterProgressionService {
  // XP curve configuration
  private static readonly XP_CURVE_BASE = 100;
  private static readonly XP_CURVE_MULTIPLIER = 1.1;
  private static readonly XP_CURVE_EXPONENT = 1.2;

  // Progression tiers
  private static readonly TIERS = {
    novice: { min: 1, max: 10, title: 'Novice' },
    apprentice: { min: 11, max: 20, title: 'Apprentice' },
    adept: { min: 21, max: 30, title: 'Adept' },
    expert: { min: 31, max: 40, title: 'Expert' },
    master: { min: 41, max: 50, title: 'Master' },
    legend: { min: 51, max: 100, title: 'Legend' }
  };

  /**
   * Calculate XP required for a specific level (Legacy - now uses DB)
   * Kept for fallback/reference
   */
  static calculateXPForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(
      this.XP_CURVE_BASE *
      Math.pow(this.XP_CURVE_MULTIPLIER, level - 1) *
      Math.pow(level - 1, this.XP_CURVE_EXPONENT)
    );
  }

  /**
   * Get level requirement from database
   */
  static async getLevelRequirement(level: number): Promise<LevelRequirement | null> {
    try {
      // Use stored procedure to get or create level requirement (Infinite Leveling)
      const result = await query(
        `SELECT * FROM get_or_create_level_requirement($1)`,
        [level]
      );

      if (result.rows.length === 0) return null;

      // Map the result columns back to the interface properties
      // The function returns: lvl, total_xp_req, stat_pts, skill_pts, ability_pts, t_title
      const row = result.rows[0];
      return {
        total_xp_required: row.total_xp_req,
        stat_points_reward: row.stat_pts,
        skill_points_reward: row.skill_pts,
        ability_points_reward: row.ability_pts,
        tier_title: row.t_title
      };
    } catch (error) {
      console.error('Error getting level requirement:', error);
      return null;
    }
  }

  /**
   * Calculate total XP required to reach a level
   */
  static calculateTotalXPForLevel(level: number): number {
    let total = 0;
    for (let i = 2; i <= level; i++) {
      total += this.calculateXPForLevel(i);
    }
    return total;
  }

  /**
   * Get character's current progression data
   */
  static async getCharacterProgression(character_id: string): Promise<CharacterProgression | null> {
    try {
      const result = await query(
        `SELECT uc.*, cp.stat_points, cp.skill_points, cp.ability_points, cp.tier, cp.title, cp.last_updated
         FROM user_characters uc
         LEFT JOIN character_progression cp ON uc.id = cp.character_id
         WHERE uc.id = $1`,
        [character_id]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];

      // STRICT MODE: Validate required fields from user_characters
      if (row.level === null || row.level === undefined) {
        throw new Error(`STRICT MODE: Character ${character_id} missing required field: level`);
      }
      if (row.experience === null || row.experience === undefined) {
        throw new Error(`STRICT MODE: Character ${character_id} missing required field: experience`);
      }

      // Progression fields may be null if character_progression row doesn't exist yet (LEFT JOIN)
      // Use sensible defaults - the UPSERT in awardExperience will create the row on first XP gain
      const level = row.level || 1;
      const tier = row.tier || (level < 10 ? 'Rookie' : level < 25 ? 'Veteran' : level < 50 ? 'Elite' : 'Legend');

      return {
        character_id: row.id,
        user_id: row.user_id,
        level: row.level,
        experience: row.experience,
        total_experience: this.calculateTotalXPForLevel(row.level) + row.experience,
        stat_points: row.stat_points ?? 0,
        skill_points: row.skill_points ?? 0,
        ability_points: row.ability_points ?? 0,
        tier: tier,
        title: row.title || tier,
        last_updated: row.last_updated || new Date()
      };
    } catch (error) {
      console.error('Error getting character progression:', error);
      throw error;
    }
  }

  /**
   * Get stat points allocation by rarity
   */
  private static getStatPointsByRarity(rarity: string): number {
    const rarity_points = {
      'common': 8,
      'uncommon': 10,
      'rare': 12,
      'epic': 14,
      'legendary': 16,
      'mythic': 18
    };
    return rarity_points[rarity as keyof typeof rarity_points] || 8;
  }

  /**
   * Get recommended stat allocation based on character preferences
   */
  public static async getRecommendedStatAllocation(
    character_id: string,
    archetype: string,
    rarity: string,
    levels_gained: number = 1
  ): Promise<Record<string, number>> {
    // Fetch attribute preferences first
    const result = await query(
      `SELECT category_value, rank FROM character_category_preferences
       WHERE character_id = $1 AND category_type = 'attribute'
       ORDER BY rank DESC`,
      [character_id]
    );

    if (result.rows.length === 0) {
      throw new Error(`STRICT MODE: Character ${character_id} has no attribute preferences`);
    }

    // Build allocation from real preferences
    const allocation: Record<string, number> = {};
    for (const row of result.rows) {
      allocation[row.category_value] = 1 * levels_gained;
    }

    // Sort preferences by rank for priority order
    const priorities = result.rows
      .sort((a: { rank: number }, b: { rank: number }) => b.rank - a.rank)
      .map((row: { category_value: string }) => row.category_value);

    // Calculate points based on actual number of preferences
    let total_points = this.getStatPointsByRarity(rarity);

    // Beast archetype gets +2 bonus points per level due to equipment/consumable restrictions
    if (archetype === 'beast') {
      total_points += 2;
    }

    // Multiply by levels gained
    total_points *= levels_gained;

    const base_points = result.rows.length * levels_gained;
    const overflow_points = total_points - base_points;

    // Distribute overflow points in priority order
    let remaining_points = overflow_points;
    let priority_index = 0;

    while (remaining_points > 0) {
      const stat = priorities[priority_index % priorities.length];

      // Primary stats get more points (first two priorities get extra)
      const points_to_add = priority_index < 2 ? Math.min(2, remaining_points) : 1;
      allocation[stat] += points_to_add;
      remaining_points -= points_to_add;
      priority_index++;
    }

    return allocation;
  }

  /**
   * Store pending level ups for character-driven allocation
   */
  private static async storePendingLevelUps(
    character_id: string,
    levels_gained: number,
    archetype: string,
    rarity: string
  ): Promise<void> {
    // Calculate available stat points based on rarity and archetype
    let total_pointsPerLevel = this.getStatPointsByRarity(rarity);
    if (archetype === 'beast') {
      total_pointsPerLevel += 2; // Beast archetype bonus
    }

    const total_stat_points = total_pointsPerLevel * levels_gained;

    // Store in pending_stat_allocations table (we'll create this if it doesn't exist)
    try {
      await query(
        `INSERT INTO pending_stat_allocations (character_id, pending_levels, pending_stat_points, archetype, rarity, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (character_id) 
         DO UPDATE SET 
           pending_levels = pending_stat_allocations.pending_levels + $2,
           pending_stat_points = pending_stat_allocations.pending_stat_points + $3,
           created_at = CURRENT_TIMESTAMP`,
        [character_id, levels_gained, total_stat_points, archetype, rarity]
      );
    } catch (error: any) {
      // If table doesn't exist, we'll just log for now and handle it later
      console.log(`📊 Character ${character_id} has ${levels_gained} pending level ups with ${total_stat_points} stat points to allocate`);
    }
  }

  /**
   * Character-driven stat allocation (called by AI chat system)
   */
  static async allocateStatsFromChat(
    character_id: string,
    allocation: Record<string, number>
  ): Promise<{ success: boolean; message: string; rebellion?: boolean; actual_allocation?: any }> {
    try {
      // Check if character is in battle
      await requireNotInBattle(character_id);

      const allocationEntries = Object.entries(allocation);
      if (allocationEntries.length === 0) {
        throw new Error('STRICT MODE: allocation cannot be empty');
      }

      // Get pending allocations
      const pending_result = await query(
        `SELECT * FROM pending_stat_allocations WHERE character_id = $1`,
        [character_id]
      );

      if (pending_result.rows.length === 0) {
        return { success: false, message: "No pending level ups to allocate" };
      }

      const pending = pending_result.rows[0];
      const total_allocated = Object.values(allocation).reduce((sum, val) => sum + val, 0);

      if (total_allocated !== pending.pending_stat_points) {
        return {
          success: false,
          message: `You must allocate exactly ${pending.pending_stat_points} points, but allocated ${total_allocated}`
        };
      }

      // --- ADHERENCE CHECK START ---

      // 1. Determine Dominant Attribute in Coach's Allocation
      // We look for the stat receiving the most points
      let dominant_stat = allocationEntries[0][0];
      let max_points = allocationEntries[0][1];

      for (const [stat, points] of allocationEntries) {
        if (points > max_points) {
          max_points = points;
          dominant_stat = stat;
        }
      }

      // dominant_stat IS already the attribute name (no mapping needed)
      const dominant_attribute = dominant_stat;

      // 2. Fetch Preference for Dominant Attribute
      const pref_result = await query(
        `SELECT rank FROM character_category_preferences
         WHERE character_id = $1 AND category_type = 'attribute' AND category_value = $2`,
        [character_id, dominant_attribute]
      );

      if (pref_result.rows.length === 0) {
        throw new Error(`STRICT MODE: Character ${character_id} has no preference for attribute ${dominant_attribute}`);
      }

      const rank = pref_result.rows[0].rank;
      let preference_score: number;
      if (rank === 4) preference_score = 70;
      else if (rank === 3) preference_score = 60;
      else if (rank === 2) preference_score = 50;
      else if (rank === 1) preference_score = 30;
      else throw new Error(`STRICT MODE: Invalid preference rank ${rank} for character ${character_id}`);

      // 3. Perform Adherence Check
      const char_result = await query(
        `SELECT gameplan_adherence, archetype, rarity FROM user_characters
         JOIN characters ON user_characters.character_id = characters.id
         WHERE user_characters.id = $1`,
        [character_id]
      );

      if (char_result.rows.length === 0) {
        throw new Error(`STRICT MODE: Character ${character_id} not found`);
      }
      if (char_result.rows[0].gameplan_adherence === null || char_result.rows[0].gameplan_adherence === undefined) {
        throw new Error(`STRICT MODE: Character ${character_id} missing gameplan_adherence`);
      }
      if (!char_result.rows[0].archetype) {
        throw new Error(`STRICT MODE: Character ${character_id} missing archetype`);
      }
      if (!char_result.rows[0].rarity) {
        throw new Error(`STRICT MODE: Character ${character_id} missing rarity`);
      }

      const character_adherence = char_result.rows[0].gameplan_adherence;
      const archetype = char_result.rows[0].archetype;
      const rarity = char_result.rows[0].rarity;

      const check = performSimpleAdherenceRoll(character_adherence, preference_score);

      let final_allocation = allocation;
      let rebellion = false;

      if (!check.passed) {
        // REBELLION! Character chooses their own stats.
        rebellion = true;
        console.log(`🚨 [STAT-REBELLION] Character ${character_id} rejected coach allocation (Pref: ${preference_score}, Roll: ${check.roll} > ${check.adherence_score})`);

        // Calculate character's preferred allocation
        // We need to know how many levels gained to pass to getRecommendedStatAllocation
        // pending.pending_levels stores this
        final_allocation = await this.getRecommendedStatAllocation(
          character_id,
          archetype,
          rarity,
          pending.pending_levels
        );
      }

      // --- ADHERENCE CHECK END ---

      // Apply the allocation (either Coach's or Character's)
      await this.applyStatAllocation(character_id, final_allocation, 1);

      // Clear pending allocations
      await query(
        `DELETE FROM pending_stat_allocations WHERE character_id = $1`,
        [character_id]
      );

      if (rebellion) {
        return {
          success: true,
          message: `Character REBELLED! They hated your focus on ${dominant_attribute} and chose their own stats instead.`,
          rebellion: true,
          actual_allocation: final_allocation
        };
      }

      return { success: true, message: "Stats allocated successfully!" };

    } catch (error: any) {
      console.error('Error in character-driven stat allocation:', error);
      return { success: false, message: "Error allocating stats" };
    }
  }

  /**
   * Get pending stat allocations for a character
   */
  static async getPendingStatAllocations(character_id: string): Promise<{
    pending_levels: number;
    pending_stat_points: number;
    archetype: string;
    rarity: string;
  } | null> {
    try {
      const result = await query(
        `SELECT * FROM pending_stat_allocations WHERE character_id = $1`,
        [character_id]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        pending_levels: row.pending_levels,
        pending_stat_points: row.pending_stat_points,
        archetype: row.archetype,
        rarity: row.rarity
      };
    } catch (error: any) {
      // Table might not exist yet
      return null;
    }
  }

  /**
   * Apply stat allocation to character's base stats
   */
  private static async applyStatAllocation(
    character_id: string,
    allocation: Record<string, number>,
    levels_gained: number
  ): Promise<void> {
    const entries = Object.entries(allocation);
    if (entries.length === 0) {
      throw new Error('STRICT MODE: allocation cannot be empty');
    }

    // Build dynamic SET clauses: current_{attr} = current_{attr} + value
    const setClauses: string[] = [];
    const values: number[] = [];

    for (const [attr, points] of entries) {
      const totalPoints = points * levels_gained;
      const columnName = `current_${attr}`;
      setClauses.push(`${columnName} = ${columnName} + $${values.length + 1}`);
      values.push(totalPoints);
    }

    // Add character_id as final parameter
    values.push(character_id as any);

    const sql = `UPDATE user_characters SET ${setClauses.join(', ')} WHERE id = $${values.length}`;

    await query(sql, values);

    // Log the stat allocation for debugging
    const totalAllocation: Record<string, number> = {};
    for (const [attr, points] of entries) {
      totalAllocation[attr] = points * levels_gained;
    }
    console.log(`📊 Level up stat allocation for character ${character_id}:`, {
      levels_gained,
      allocation: totalAllocation
    });
  }

  /**
   * Award experience to a character
   */
  static async awardExperience(
    character_id: string,
    amount: number,
    source: ExperienceGain['source'],
    description: string,
    multiplier: number = 1.0
  ): Promise<{ leveled_up: boolean; old_level: number; new_level: number; progression: CharacterProgression }> {
    try {
      // Check if character is in battle
      await requireNotInBattle(character_id);

      const final_amount = Math.floor(amount * multiplier);

      // Get current progression
      const current_progression = await this.getCharacterProgression(character_id);
      if (!current_progression) {
        throw new Error('Character not found');
      }

      const old_level = current_progression.level;
      const new_experience = current_progression.experience + final_amount;

      // Check for level up using database
      let new_level = old_level;
      let remaining_xp = new_experience;

      // Get next level requirement
      let next_level_req = await this.getLevelRequirement(new_level + 1);

      // While we have enough total XP for the next level
      while (next_level_req && new_experience >= parseInt(next_level_req.total_xp_required as any)) {
        new_level++;
        next_level_req = await this.getLevelRequirement(new_level + 1);
      }

      const leveled_up = new_level > old_level;

      // Calculate rewards for level ups
      let stat_pointsGained = 0;
      let skill_pointsGained = 0;
      let ability_pointsGained = 0;
      let tier = current_progression.tier;
      let title = current_progression.title;

      if (leveled_up) {
        const levels_gained = new_level - old_level;

        // Get character archetype and rarity for stat allocation
        const character_result = await query(
          `SELECT c.archetype, c.rarity
           FROM user_characters uc
           JOIN characters c ON uc.character_id = c.id
           WHERE uc.id = $1`,
          [character_id]
        );

        const character = character_result.rows[0];
        if (character) {
          // Character-driven stat allocation will happen through chat interface
          // Store pending levels to be allocated
          await this.storePendingLevelUps(character_id, levels_gained, character.archetype, character.rarity);
        }

        // Calculate total rewards from DB for all levels gained
        for (let lvl = old_level + 1; lvl <= new_level; lvl++) {
          const req = await this.getLevelRequirement(lvl);
          if (!req) {
            throw new Error(`STRICT MODE: No level requirement found for level ${lvl}`);
          }
          if (req.stat_points_reward === null || req.stat_points_reward === undefined) {
            throw new Error(`STRICT MODE: Level ${lvl} missing stat_points_reward`);
          }
          if (req.skill_points_reward === null || req.skill_points_reward === undefined) {
            throw new Error(`STRICT MODE: Level ${lvl} missing skill_points_reward`);
          }
          if (req.ability_points_reward === null || req.ability_points_reward === undefined) {
            throw new Error(`STRICT MODE: Level ${lvl} missing ability_points_reward`);
          }
          stat_pointsGained += req.stat_points_reward;
          skill_pointsGained += req.skill_points_reward;
          ability_pointsGained += req.ability_points_reward;
          tier = this.getTierFromTitle(req.tier_title);
          title = req.tier_title;
        }
      }

      // Calculate points to grant on level up
      let ability_pointsToGrant = 0;
      let attribute_pointsToGrant = 0;
      let resource_pointsToGrant = 0;
      if (leveled_up) {
        const levels_gained = new_level - old_level;
        ability_pointsToGrant = levels_gained * 2;
        attribute_pointsToGrant = levels_gained * 5;
        resource_pointsToGrant = levels_gained * 3;
      }

      await query(
        `UPDATE user_characters
         SET level = $1,
             experience = $2,
             ability_points = ability_points + $3,
             attribute_points = attribute_points + $4,
             resource_points = resource_points + $5
         WHERE id = $6`,
        [new_level, remaining_xp, ability_pointsToGrant, attribute_pointsToGrant, resource_pointsToGrant, character_id]
      );

      // Insert or update character_progression record
      await query(
        `INSERT INTO character_progression (character_id, stat_points, skill_points, ability_points, tier, title, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (character_id) 
         DO UPDATE SET 
           stat_points = character_progression.stat_points + $2,
           skill_points = character_progression.skill_points + $3,
           ability_points = character_progression.ability_points + $4,
           tier = $5,
           title = $6,
           last_updated = CURRENT_TIMESTAMP`,
        [character_id, stat_pointsGained, skill_pointsGained, ability_pointsGained, tier, title]
      );

      // Log the experience gain
      await query(
        `INSERT INTO character_experience_log (id, character_id, source, amount, multiplier, description, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [uuidv4(), character_id, source, final_amount, multiplier, description]
      );

      // Get updated progression
      const updated_progression = await this.getCharacterProgression(character_id);
      if (!updated_progression) {
        throw new Error('Failed to get updated progression');
      }

      // Send level-up mail notification if character leveled up
      if (leveled_up) {
        try {
          const mail_service = new InternalMailService();
          const character_result = await query(
            `SELECT uc.name, uc.user_id
             FROM user_characters uc
             WHERE uc.id = $1`,
            [character_id]
          );

          if (character_result.rows.length > 0) {
            const character = character_result.rows[0];
            const levels_gained = new_level - old_level;

            await mail_service.sendSystemMail(character.user_id, {
              subject: `⭐ ${character.name} Reached Level ${new_level}!`,
              content: `${character.name} has leveled up ${levels_gained > 1 ? `${levels_gained} times` : ''}!\n\n• New Level: ${new_level}\n• Tier: ${updated_progression.title}\n• Stat Points: +${stat_pointsGained}\n• Skill Points: +${skill_pointsGained}${ability_pointsGained > 0 ? `\n• Ability Points: +${ability_pointsGained}` : ''}\n\n_new abilities may be available in the Skills tab!`,
              category: 'achievement',
              priority: 'high'
            });
          }
        } catch (error) {
          console.error('Error sending level-up mail:', error);
        }
      }

      return {
        leveled_up,
        old_level,
        new_level,
        progression: updated_progression
      };
    } catch (error) {
      console.error('Error awarding experience:', error);
      throw error;
    }
  }

  /**
   * Get tier for a specific level
   */
  private static getTierForLevel(level: number): string {
    for (const [tier_name, tier_info] of Object.entries(this.TIERS)) {
      if (level >= tier_info.min && level <= tier_info.max) {
        return tier_name;
      }
    }
    return 'legend'; // Default for high levels
  }

  /**
   * Get title for a specific level
   */
  private static getTitleForLevel(level: number): string {
    return 'Legendary Master'; // Default for high levels
  }

  /**
   * Helper to map tier title to tier key
   */
  private static getTierFromTitle(title: string): string {
    return title.toLowerCase();
  }

  /**
   * Get character's skill progressions
   */
  static async getCharacterSkills(character_id: string): Promise<SkillProgression[]> {
    try {
      const result = await query(
        `SELECT * FROM character_skills WHERE character_id = $1 ORDER BY skill_name`,
        [character_id]
      );

      interface CharacterSkillRow {
        id: string;
        character_id: string;
        skill_id: string;
        skill_name: string;
        level: number;
        experience: number;
        max_level: number;
        unlocked: boolean;
        last_updated: Date;
      }
      return result.rows.map((row: CharacterSkillRow) => ({
        id: row.id,
        character_id: row.character_id,
        skill_id: row.skill_id,
        skill_name: row.skill_name,
        level: row.level,
        experience: row.experience,
        max_level: row.max_level,
        unlocked: row.unlocked,
        last_updated: row.last_updated
      }));
    } catch (error) {
      console.error('Error getting character skills:', error);
      throw error;
    }
  }

  /**
   * Unlock a skill for a character
   */
  static async unlockSkill(character_id: string, skill_id: string, skill_name: string, max_level: number = 10): Promise<SkillProgression> {
    try {
      const id = uuidv4();
      await query(
        `INSERT INTO character_skills (id, character_id, skill_id, skill_name, level, experience, max_level, unlocked, last_updated)
         VALUES ($1, $2, $3, $4, 1, 0, $5, true, CURRENT_TIMESTAMP)
         ON CONFLICT (character_id, skill_id) 
         DO UPDATE SET unlocked = true, last_updated = CURRENT_TIMESTAMP`,
        [id, character_id, skill_id, skill_name, max_level]
      );

      const result = await query(
        `SELECT * FROM character_skills WHERE character_id = $1 AND skill_id = $2`,
        [character_id, skill_id]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        character_id: row.character_id,
        skill_id: row.skill_id,
        skill_name: row.skill_name,
        level: row.level,
        experience: row.experience,
        max_level: row.max_level,
        unlocked: row.unlocked,
        last_updated: row.last_updated
      };
    } catch (error) {
      console.error('Error unlocking skill:', error);
      throw error;
    }
  }

  /**
   * Progress a skill by gaining experience
   */
  static async progressSkill(character_id: string, skill_id: string, experience_gained: number): Promise<{ leveled_up: boolean; new_level: number }> {
    try {
      // Get current skill progression
      const result = await query(
        `SELECT * FROM character_skills WHERE character_id = $1 AND skill_id = $2`,
        [character_id, skill_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Skill not found or not unlocked');
      }

      const skill = result.rows[0];
      const new_experience = skill.experience + experience_gained;

      // Calculate skill level (simple: 100 XP per level)
      const new_level = Math.min(Math.floor(new_experience / 100) + 1, skill.max_level);
      const leveled_up = new_level > skill.level;

      // Update skill progression
      await query(
        `UPDATE character_skills 
         SET level = $1, experience = $2, last_updated = CURRENT_TIMESTAMP
         WHERE character_id = $3 AND skill_id = $4`,
        [new_level, new_experience, character_id, skill_id]
      );

      return { leveled_up, new_level };
    } catch (error) {
      console.error('Error progressing skill:', error);
      throw error;
    }
  }

  /**
   * Get character's unlocked powers (formerly abilities)
   */
  static async getCharacterAbilities(character_id: string): Promise<AbilityProgression[]> {
    try {
      const result = await query(
        `SELECT cp.*, pd.name as power_name 
         FROM character_powers cp
         JOIN power_definitions pd ON cp.power_id = pd.id
         WHERE cp.character_id = $1 
         ORDER BY cp.unlocked_at DESC`,
        [character_id]
      );

      interface CharacterPowerRow {
        id: string;
        character_id: string;
        power_id: string;
        power_name: string;
        current_rank: number;
        unlocked: boolean;
        unlocked_at: Date | null;
      }
      return result.rows.map((row: CharacterPowerRow) => ({
        id: row.id,
        character_id: row.character_id,
        ability_id: row.power_id, // Map power_id to ability_id for interface compatibility
        ability_name: row.power_name,
        rank: row.current_rank, // Map current_rank to rank
        max_rank: 5, // Default or fetch from definition if needed
        unlocked: row.unlocked,
        unlocked_at: row.unlocked_at
      }));
    } catch (error) {
      console.error('Error getting character powers:', error);
      throw error;
    }
  }

  /**
   * Unlock a spell for a character
   */
  static async unlockSpell(character_id: string, spell_id: string, spell_name: string, max_rank: number = 5): Promise<any> {
    try {
      await query(
        `INSERT INTO character_spells (character_id, spell_id, current_rank, unlocked, unlocked_at, unlocked_by)
         VALUES ($1, $2, 1, true, CURRENT_TIMESTAMP, 'point_spend')
         ON CONFLICT (character_id, spell_id) 
         DO UPDATE SET unlocked = true`,
        [character_id, spell_id]
      );

      const result = await query(
        `SELECT cs.*, sd.name as spell_name 
         FROM character_spells cs
         JOIN spell_definitions sd ON cs.spell_id = sd.id
         WHERE cs.character_id = $1 AND cs.spell_id = $2`,
        [character_id, spell_id]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error unlocking spell:', error);
      throw error;
    }
  }

  /**
   * Unlock a power for a character (formerly unlockAbility)
   */
  static async unlockAbility(character_id: string, ability_id: string, ability_name: string, max_rank: number = 5): Promise<AbilityProgression> {
    try {
      // Check if power definition exists, if not create it (legacy support)
      // Actually, we should assume power_definitions exists.

      await query(
        `INSERT INTO character_powers (character_id, power_id, current_rank, unlocked, unlocked_at, unlocked_by)
         VALUES ($1, $2, 1, true, CURRENT_TIMESTAMP, 'point_spend')
         ON CONFLICT (character_id, power_id) 
         DO UPDATE SET unlocked = true`,
        [character_id, ability_id]
      );

      const result = await query(
        `SELECT cp.*, pd.name as power_name 
         FROM character_powers cp
         JOIN power_definitions pd ON cp.power_id = pd.id
         WHERE cp.character_id = $1 AND cp.power_id = $2`,
        [character_id, ability_id]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        character_id: row.character_id,
        ability_id: row.power_id,
        ability_name: row.power_name || ability_name,
        rank: row.current_rank,
        max_rank: max_rank,
        unlocked: row.unlocked,
        unlocked_at: row.unlocked_at
      };
    } catch (error) {
      console.error('Error unlocking power:', error);
      throw error;
    }
  }

  /**
   * Get experience gain history for a character
   */
  static async getExperienceHistory(character_id: string, limit: number = 50): Promise<ExperienceGain[]> {
    try {
      const result = await query(
        `SELECT * FROM character_experience_log 
         WHERE character_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2`,
        [character_id, limit]
      );

      interface ExperienceLogRow {
        id: string;
        character_id: string;
        source: string;
        amount: number;
        multiplier: number;
        description: string;
        timestamp: Date;
      }
      return result.rows.map((row: ExperienceLogRow) => ({
        id: row.id,
        character_id: row.character_id,
        source: row.source,
        amount: row.amount,
        multiplier: row.multiplier,
        description: row.description,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Error getting experience history:', error);
      throw error;
    }
  }
  /**
   * Award mastery points to a spell or power
   */
  static async awardMasteryPoints(
    character_id: string,
    ability_id: string,
    type: 'spell' | 'power',
    amount: number
  ): Promise<{ new_level: number; new_points: number; leveled_up: boolean }> {
    try {
      const table = type === 'spell' ? 'character_spells' : 'character_powers';
      const id_column = type === 'spell' ? 'spell_id' : 'power_id';

      // Get current state
      const current_result = await query(
        `SELECT mastery_level, mastery_points FROM ${table} WHERE character_id = $1 AND ${id_column} = $2`,
        [character_id, ability_id]
      );

      if (current_result.rows.length === 0) {
        throw new Error(`${type} not found for character`);
      }

      const current_level = current_result.rows[0].mastery_level;

      // Update points (trigger will handle level update)
      const update_result = await query(
        `UPDATE ${table} 
         SET mastery_points = mastery_points + $1 
         WHERE character_id = $2 AND ${id_column} = $3
         RETURNING mastery_level, mastery_points`,
        [amount, character_id, ability_id]
      );

      const new_row = update_result.rows[0];
      const leveled_up = new_row.mastery_level > current_level;

      if (leveled_up) {
        console.log(`🎉 ${type} ${ability_id} leveled up to ${new_row.mastery_level}!`);
        // TODO: Send notification or handle other level-up effects
      }

      return {
        new_level: new_row.mastery_level,
        new_points: new_row.mastery_points,
        leveled_up
      };
    } catch (error) {
      console.error('Error awarding mastery points:', error);
      throw error;
    }
  }

  /**
   * Upgrade a spell's rank
   */
  static async upgradeSpellRank(
    character_id: string,
    spell_id: string
  ): Promise<{ success: boolean; new_rank: number; remaining_points: number }> {
    try {
      // 1. Get current spell state and definition
      const result = await query(
        `SELECT cs.current_rank as rank, cs.mastery_level, cp.skill_points, sd.max_rank, 
                sd.rank_up_cost, sd.rank_up_cost_r2, sd.rank_up_cost_r3
         FROM character_spells cs
         JOIN character_progression cp ON cs.character_id = cp.character_id
         JOIN spell_definitions sd ON cs.spell_id = sd.id
         WHERE cs.character_id = $1 AND cs.spell_id = $2`,
        [character_id, spell_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Spell not found or character progression missing');
      }

      const { rank, mastery_level, skill_points, max_rank, rank_up_cost, rank_up_cost_r2, rank_up_cost_r3 } = result.rows[0];

      // 2. Check if max rank reached
      if (rank >= max_rank) {
        throw new Error('Spell is already at max rank');
      }

      // 3. Determine cost and mastery requirement for NEXT rank
      let cost = 0;
      const next_rank = rank + 1;
      const mastery_req = (next_rank - 1) * 3; // Simple formula: 3, 6, 9...

      if (mastery_level < mastery_req) {
        throw new Error(`Requires Mastery Level ${mastery_req} (Current: ${mastery_level})`);
      }

      // Determine Point Cost
      if (next_rank === 2) cost = rank_up_cost_r2 || rank_up_cost || 1;
      else if (next_rank === 3) cost = rank_up_cost_r3 || rank_up_cost || 1;
      else cost = rank_up_cost || 1;

      // 4. Check funds
      if (skill_points < cost) {
        throw new Error(`Not enough Skill Points (Required: ${cost}, Current: ${skill_points})`);
      }

      // 5. Execute Upgrade
      await query('BEGIN');

      // Deduct points
      await query(
        `UPDATE character_progression 
         SET skill_points = skill_points - $1 
         WHERE character_id = $2`,
        [cost, character_id]
      );

      // Increase Rank
      await query(
        `UPDATE character_spells 
         SET current_rank = $1 
         WHERE character_id = $2 AND spell_id = $3`,
        [next_rank, character_id, spell_id]
      );

      await query('COMMIT');

      return {
        success: true,
        new_rank: next_rank,
        remaining_points: skill_points - cost
      };

    } catch (error) {
      await query('ROLLBACK');
      console.error('Error upgrading spell rank:', error);
      throw error;
    }
  }

  /**
   * Upgrade a power's rank
   */
  static async upgradePowerRank(
    character_id: string,
    power_id: string
  ): Promise<{ success: boolean; new_rank: number; remaining_points: number }> {
    try {
      // 1. Get current power state and definition
      const result = await query(
        `SELECT cp_pow.current_rank as rank, cp_pow.mastery_level, cp.ability_points, pd.max_rank, 
                pd.rank_up_cost, pd.rank_up_cost_r2, pd.rank_up_cost_r3
         FROM character_powers cp_pow
         JOIN character_progression cp ON cp_pow.character_id = cp.character_id
         JOIN power_definitions pd ON cp_pow.power_id = pd.id
         WHERE cp_pow.character_id = $1 AND cp_pow.power_id = $2`,
        [character_id, power_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Power not found or character progression missing');
      }

      const { rank, mastery_level, ability_points, max_rank, rank_up_cost, rank_up_cost_r2, rank_up_cost_r3 } = result.rows[0];

      // 2. Check if max rank reached
      if (rank >= max_rank) {
        throw new Error('Power is already at max rank');
      }

      // 3. Determine cost and mastery requirement for NEXT rank
      let cost = 0;
      const next_rank = rank + 1;
      const mastery_req = (next_rank - 1) * 3; // Simple formula: 3, 6, 9...

      if (mastery_level < mastery_req) {
        throw new Error(`Requires Mastery Level ${mastery_req} (Current: ${mastery_level})`);
      }

      // Determine Point Cost
      if (next_rank === 2) cost = rank_up_cost_r2 || rank_up_cost || 1;
      else if (next_rank === 3) cost = rank_up_cost_r3 || rank_up_cost || 1;
      else cost = rank_up_cost || 1;

      // 4. Check funds
      if (ability_points < cost) {
        throw new Error(`Not enough Ability Points (Required: ${cost}, Current: ${ability_points})`);
      }

      // 5. Execute Upgrade
      await query('BEGIN');

      // Deduct points
      await query(
        `UPDATE character_progression 
         SET ability_points = ability_points - $1 
         WHERE character_id = $2`,
        [cost, character_id]
      );

      // Increase Rank
      await query(
        `UPDATE character_powers 
         SET current_rank = $1 
         WHERE character_id = $2 AND power_id = $3`,
        [next_rank, character_id, power_id]
      );

      await query('COMMIT');

      return {
        success: true,
        new_rank: next_rank,
        remaining_points: ability_points - cost
      };

    } catch (error) {
      await query('ROLLBACK');
      console.error('Error upgrading power rank:', error);
      throw error;
    }
  }
}
