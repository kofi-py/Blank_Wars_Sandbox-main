import { query } from '../database/postgres';
import { v4 as uuidv4 } from 'uuid';

export interface ResurrectionOption {
  type: 'premium_instant' | 'wait_penalty' | 'level_reset';
  name: string;
  cost: { currency?: number; premium?: number };
  wait_time?: number; // hours
  xp_penalty?: number; // percentage
  level_reset?: boolean;
  description: string;
}

export interface DeathPenalty {
  character_id: string;
  death_count: number;
  xp_penalty: number;
  level_penalty: number;
  wait_timeHours: number;
}

export class ResurrectionService {

  /**
   * Calculate death penalties based on character level and death count
   */
  static calculateDeathPenalties(character_level: number, death_count: number): DeathPenalty {
    // Base wait time: 24 hours for first death, increases with each death
    const base_wait_hours = 24;
    const wait_timeMultiplier = Math.pow(1.5, death_count - 1); // 1.5x for each additional death
    const wait_timeHours = Math.floor(base_wait_hours * wait_timeMultiplier);

    // XP penalty: 10% for first death, +5% for each additional death (capped at 50%)
    const base_xp_penalty = 10;
    const xp_penalty = Math.min(50, base_xp_penalty + (death_count - 1) * 5);

    // Level penalty: lose 1 level for every 3 deaths
    const level_penalty = Math.floor(death_count / 3);

    return {
      character_id: '',
      death_count,
      xp_penalty,
      level_penalty,
      wait_timeHours
    };
  }

  /**
   * Calculate resurrection costs based on character level and rarity
   */
  static calculateResurrectionCosts(character_level: number, character_rarity: string): { currency: number; premium: number } {
    const rarity_multipliers = {
      'common': 1,
      'uncommon': 1.5,
      'rare': 2,
      'epic': 3,
      'legendary': 5,
      'mythic': 8
    };

    const multiplier = rarity_multipliers[character_rarity as keyof typeof rarity_multipliers] || 1;

    return {
      currency: Math.floor(1000 * character_level * multiplier),
      premium: Math.floor(10 * character_level * multiplier)
    };
  }

  /**
   * Handle character death in battle
   */
  static async handleCharacterDeath(character_id: string, battle_context?: any): Promise<void> {
    try {
      // Get character details
      const character_result = await query(
        `SELECT uc.*, c.rarity FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.id = $1`,
        [character_id]
      );

      if (character_result.rows.length === 0) {
        throw new Error('Character not found');
      }

      const character = character_result.rows[0];
      // GOVERNANCE: No fallbacks - fail loudly on missing data
      if (character.death_count === undefined) throw new Error(`death_count missing for ${character_id}`);
      const new_death_count = character.death_count + 1;
      const penalties = this.calculateDeathPenalties(character.level, new_death_count);

      // Calculate when natural resurrection becomes available
      const resurrection_available_at = new Date(Date.now() + penalties.wait_timeHours * 60 * 60 * 1000);

      // Mark character as dead and store pre-death stats
      await query(
        `UPDATE user_characters 
         SET is_dead = true,
             is_injured = false,
             injury_severity = 'dead',
             current_health = 0,
             death_timestamp = CURRENT_TIMESTAMP,
             resurrection_available_at = $1,
             death_count = $2,
             pre_death_level = $3,
             pre_death_experience = $4
         WHERE id = $5`,
        [
          resurrection_available_at,
          new_death_count,
          character.level,
          character.experience,
          character_id
        ]
      );

      console.log(`💀 Character ${character.name || character_id} has died (death #${new_death_count})`);
      console.log(`⏰ Natural resurrection available at: ${resurrection_available_at}`);
      console.log(`📊 Penalties: ${penalties.xp_penalty}% XP, ${penalties.level_penalty} levels`);

    } catch (error) {
      console.error('Error handling character death:', error);
      throw error;
    }
  }

  /**
   * Get resurrection options for a dead character
   */
  static async getResurrectionOptions(character_id: string): Promise<ResurrectionOption[]> {
    try {
      // Get character details
      const character_result = await query(
        `SELECT uc.*, c.rarity FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.id = $1 AND uc.is_dead = true`,
        [character_id]
      );

      if (character_result.rows.length === 0) {
        return []; // Character not found or not dead
      }

      const character = character_result.rows[0];
      const costs = this.calculateResurrectionCosts(character.level, character.rarity);
      const penalties = this.calculateDeathPenalties(character.level, character.death_count);

      const options: ResurrectionOption[] = [];

      // Premium instant resurrection (no penalties)
      options.push({
        type: 'premium_instant',
        name: 'Premium Resurrection',
        cost: { premium: costs.premium },
        description: `Instantly resurrect with no penalties using ${costs.premium} premium currency`
      });

      // Wait with XP penalty
      options.push({
        type: 'wait_penalty',
        name: 'Natural Resurrection',
        cost: {},
        wait_time: penalties.wait_timeHours,
        xp_penalty: penalties.xp_penalty,
        description: `Wait ${penalties.wait_timeHours} hours and lose ${penalties.xp_penalty}% experience`
      });

      // Restart at level 1 (immediate, but harsh)
      options.push({
        type: 'level_reset',
        name: 'Reincarnation',
        cost: {},
        level_reset: true,
        description: `Immediately return to life, but restart at level 1 with base stats`
      });

      return options;
    } catch (error) {
      console.error('Error getting resurrection options:', error);
      throw error;
    }
  }

  /**
   * Execute resurrection based on chosen option
   */
  static async executeResurrection(
    character_id: string,
    resurrection_type: 'premium_instant' | 'wait_penalty' | 'level_reset'
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get character details
      const character_result = await query(
        `SELECT uc.*, c.rarity FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.id = $1 AND uc.is_dead = true`,
        [character_id]
      );

      if (character_result.rows.length === 0) {
        return { success: false, message: 'Character not found or not dead' };
      }

      const character = character_result.rows[0];

      switch (resurrection_type) {
        case 'premium_instant':
          return await this.executePremiumResurrection(character);

        case 'wait_penalty':
          return await this.executeNaturalResurrection(character);

        case 'level_reset':
          return await this.executeReincarnation(character);

        default:
          return { success: false, message: 'Invalid resurrection type' };
      }
    } catch (error) {
      console.error('Error executing resurrection:', error);
      return { success: false, message: 'Resurrection failed due to an error' };
    }
  }

  /**
   * Execute premium instant resurrection
   */
  private static async executePremiumResurrection(character: any): Promise<{ success: boolean; message: string }> {
    try {
      const costs = this.calculateResurrectionCosts(character.level, character.rarity);

      // Check if user has enough premium currency
      const currency_result = await query(
        `SELECT premium_currency FROM user_currency WHERE user_id = $1`,
        [character.user_id]
      );

      if (currency_result.rows.length === 0 || currency_result.rows[0].premium_currency < costs.premium) {
        return { success: false, message: `Insufficient premium currency. Need ${costs.premium}` };
      }

      // Deduct premium currency
      await query(
        `UPDATE user_currency SET premium_currency = premium_currency - $1 WHERE user_id = $2`,
        [costs.premium, character.user_id]
      );

      // Resurrect character with no penalties
      await query(
        `UPDATE user_characters 
         SET is_dead = false,
             is_injured = false,
             injury_severity = 'healthy',
             current_health = max_health,
             death_timestamp = NULL,
             resurrection_available_at = NULL
         WHERE id = $1`,
        [character.id]
      );

      return { success: true, message: `Character resurrected instantly for ${costs.premium} premium currency` };

    } catch (error) {
      console.error('Error in premium resurrection:', error);
      return { success: false, message: 'Premium resurrection failed' };
    }
  }

  /**
   * Execute natural resurrection with penalties
   */
  private static async executeNaturalResurrection(character: any): Promise<{ success: boolean; message: string }> {
    try {
      // Check if resurrection time has passed
      const resurrection_time = new Date(character.resurrection_available_at);
      const now = new Date();

      if (now < resurrection_time) {
        const hours_left = Math.ceil((resurrection_time.getTime() - now.getTime()) / (1000 * 60 * 60));
        return { success: false, message: `Must wait ${hours_left} more hours for natural resurrection` };
      }

      const penalties = this.calculateDeathPenalties(character.level, character.death_count);

      // Calculate new experience after penalty
      // GOVERNANCE: No fallbacks - fail loudly on missing data
      if (character.experience === undefined) throw new Error(`experience missing for ${character.id}`);
      const current_xp = character.experience;
      const xp_loss = Math.floor(current_xp * (penalties.xp_penalty / 100));
      const new_xp = Math.max(0, current_xp - xp_loss);

      // Calculate new level after penalty (if any)
      const new_level = Math.max(1, character.level - penalties.level_penalty);

      // Resurrect character with penalties
      await query(
        `UPDATE user_characters 
         SET is_dead = false,
             is_injured = false,
             injury_severity = 'healthy',
             current_health = max_health,
             level = $1,
             experience = $2,
             death_timestamp = NULL,
             resurrection_available_at = NULL
         WHERE id = $3`,
        [new_level, new_xp, character.id]
      );

      return {
        success: true,
        message: `Character resurrected naturally. Lost ${penalties.xp_penalty}% experience${penalties.level_penalty > 0 ? ` and ${penalties.level_penalty} levels` : ''}`
      };

    } catch (error) {
      console.error('Error in natural resurrection:', error);
      return { success: false, message: 'Natural resurrection failed' };
    }
  }

  /**
   * Execute reincarnation (level 1 reset)
   */
  private static async executeReincarnation(character: any): Promise<{ success: boolean; message: string }> {
    try {
      // Reset character to level 1
      await query(
        `UPDATE user_characters 
         SET is_dead = false,
             is_injured = false,
             injury_severity = 'healthy',
             current_health = max_health,
             level = 1,
             experience = 0,
             death_timestamp = NULL,
             resurrection_available_at = NULL
         WHERE id = $1`,
        [character.id]
      );

      return {
        success: true,
        message: 'Character reincarnated at level 1. All progress has been reset, but they live again!'
      };

    } catch (error) {
      console.error('Error in reincarnation:', error);
      return { success: false, message: 'Reincarnation failed' };
    }
  }

  /**
   * Check for characters eligible for natural resurrection
   */
  static async processNaturalResurrections(): Promise<void> {
    try {
      const eligible_characters = await query(
        `SELECT id FROM user_characters
         WHERE is_dead = true
         AND resurrection_available_at <= CURRENT_TIMESTAMP`
      );

      console.log(`🔄 Found ${eligible_characters.rows.length} characters eligible for natural resurrection`);

      // Note: We don't automatically resurrect - we just make them eligible
      // Players must still choose their resurrection option

    } catch (error) {
      console.error('Error processing natural resurrections:', error);
    }
  }

  /**
   * Get death statistics for a character
   */
  static async getCharacterDeathStats(character_id: string): Promise<any> {
    try {
      const result = await query(
        `SELECT death_count, death_timestamp, resurrection_available_at, 
                pre_death_level, pre_death_experience, is_dead
         FROM user_characters WHERE id = $1`,
        [character_id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const stats = result.rows[0];

      if (stats.is_dead) {
        const penalties = this.calculateDeathPenalties(stats.pre_death_level || 1, stats.death_count || 1);
        stats.calculatedPenalties = penalties;
      }

      return stats;
    } catch (error) {
      console.error('Error getting character death stats:', error);
      return null;
    }
  }
}