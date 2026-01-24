import { query } from '../database/postgres';
import { v4 as uuidv4 } from 'uuid';
import { requireNotInBattle } from './battleLockService';

export interface HealingFacility {
  id: string;
  name: string;
  facility_type: 'basic_medical' | 'advanced_medical' | 'premium_medical' | 'resurrection_chamber';
  healing_rate_multiplier: number;
  currency_cost_per_hour: number;
  premium_cost_per_hour: number;
  max_injury_severity: 'light' | 'moderate' | 'severe' | 'critical' | 'dead';
  headquarters_tier_required?: string;
  description: string;
}

export interface HealingSession {
  id: string;
  character_id: string;
  facility_id: string;
  session_type: 'injury_healing' | 'resurrection';
  start_time: Date;
  estimated_completion_time: Date;
  currency_paid: number;
  premium_paid: number;
  is_active: boolean;
  is_completed: boolean;
}

export interface HealingOption {
  type: 'natural' | 'currency' | 'premium' | 'facility';
  name: string;
  cost: { currency?: number; premium?: number };
  time_reduction: number; // hours reduced
  description: string;
  facility_id?: string;
}

export class HealingService {

  /**
   * Calculate percentage-based healing time based on missing health
   * More scalable approach that grows with character power
   */
  static calculatePercentageBasedHealingTime(
    current_health: number,
    max_health: number,
    healing_rate: number = 10 // percentage of missing health per hour
  ): number {
    if (current_health >= max_health) return 0;

    const missing_health = max_health - current_health;
    const missing_health_percentage = (missing_health / max_health) * 100;
    const hours_needed = Math.ceil(missing_health_percentage / healing_rate);

    return Math.max(1, hours_needed); // Minimum 1 hour
  }

  /**
   * Calculate natural recovery time based on injury severity (legacy method)
   * @deprecated Use calculatePercentageBasedHealingTime for better scaling
   */
  static calculateNaturalRecoveryTime(severity: string): number {
    const recovery_hours = {
      'light': 2,      // 2 hours
      'moderate': 8,   // 8 hours 
      'severe': 24,    // 1 day
      'critical': 72,  // 3 days
      'dead': 168      // 7 days for natural resurrection
    };

    return recovery_hours[severity as keyof typeof recovery_hours] || 2;
  }

  /**
   * Get healing rate based on facility and character level
   */
  static getHealingRatePercentage(facility_type?: string, character_level: number = 1): number {
    const base_rates = {
      'free_clinic': 5,      // 5% missing health per hour (slowest, always available)
      'natural': 10,         // 10% missing health per hour (default)
      'basic_medical': 15,   // 15% missing health per hour
      'advanced_medical': 25, // 25% missing health per hour
      'premium_medical': 50,  // 50% missing health per hour
      'instant': 100         // 100% (immediate healing)
    };

    const base_rate = base_rates[facility_type as keyof typeof base_rates] || base_rates.natural;

    // Higher level characters heal slightly faster (psychology integration point)
    const level_bonus = Math.min(5, Math.floor(character_level / 10));

    return base_rate + level_bonus;
  }

  /**
   * Calculate healing costs based on character level and injury severity
   */
  static calculateHealingCost(character_level: number, severity: string): { currency: number; premium: number } {
    const base_costs = {
      'light': { currency: 50, premium: 1 },
      'moderate': { currency: 200, premium: 3 },
      'severe': { currency: 500, premium: 8 },
      'critical': { currency: 1000, premium: 15 },
      'dead': { currency: 2000, premium: 25 }
    };

    const base = base_costs[severity as keyof typeof base_costs] || base_costs.light;
    const level_multiplier = Math.max(1, character_level / 10);

    return {
      currency: Math.floor(base.currency * level_multiplier),
      premium: Math.floor(base.premium * level_multiplier)
    };
  }

  /**
   * Get available healing options for a character
   */
  static async getHealingOptions(character_id: string): Promise<HealingOption[]> {
    try {
      // Get character info including health data
      const character_result = await query(
        `SELECT level, injury_severity, is_dead, current_health, current_max_health FROM user_characters WHERE id = $1`,
        [character_id]
      );

      if (character_result.rows.length === 0) {
        throw new Error('Character not found');
      }

      const character = character_result.rows[0];
      const severity = character.injury_severity || 'healthy';
      const level = character.level || 1;
      const current_health = character.current_health || 0;
      const max_health = character.current_max_health;

      if (severity === 'healthy' && !character.is_dead && current_health >= max_health) {
        return []; // No healing needed
      }

      // Use new percentage-based system for better scaling
      const natural_healing_rate = this.getHealingRatePercentage('natural', level);
      const natural_time = character.is_dead
        ? this.calculateNaturalRecoveryTime('dead') // Keep legacy for resurrection
        : this.calculatePercentageBasedHealingTime(current_health, max_health, natural_healing_rate);

      const costs = this.calculateHealingCost(level, severity);
      const options: HealingOption[] = [];

      // Free Clinic (slowest option, always available for F2P players)
      if (!character.is_dead) {
        const free_healing_rate = this.getHealingRatePercentage('free_clinic', level);
        const free_time = this.calculatePercentageBasedHealingTime(current_health, max_health, free_healing_rate);
        options.push({
          type: 'natural',
          name: 'Free Clinic',
          cost: {},
          time_reduction: 0,
          description: `Slow but free healing at ${free_healing_rate}% missing health per hour (~${free_time}h)`
        });
      }

      // Natural recovery (standard rate)
      options.push({
        type: 'natural',
        name: character.is_dead ? 'Natural Resurrection' : 'Natural Recovery',
        cost: {},
        time_reduction: 0,
        description: character.is_dead
          ? `Wait ${natural_time} hours for natural resurrection`
          : `Natural healing at ${natural_healing_rate}% missing health per hour (~${natural_time}h)`
      });

      // Medical treatment (faster healing)
      if (!character.is_dead) {
        const medical_rate = this.getHealingRatePercentage('basic_medical', level);
        const medical_time = this.calculatePercentageBasedHealingTime(current_health, max_health, medical_rate);
        options.push({
          type: 'currency',
          name: 'Medical Treatment',
          cost: { currency: costs.currency },
          time_reduction: natural_time - medical_time,
          description: `Faster healing at ${medical_rate}% missing health per hour (~${medical_time}h)`
        });
      }

      // Premium healing (instant or very fast)
      const premium_rate = this.getHealingRatePercentage('instant', level);
      options.push({
        type: 'premium',
        name: character.is_dead ? 'Instant Resurrection' : 'Premium Medical Care',
        cost: { premium: costs.premium },
        time_reduction: natural_time,
        description: character.is_dead
          ? 'Instant resurrection using premium currency'
          : 'Instant recovery using premium currency'
      });

      // Get available healing facilities
      const facilities_result = await query(
        `SELECT * FROM healing_facilities 
         WHERE max_injury_severity = $1 OR max_injury_severity = 'dead'
         ORDER BY healing_rate_multiplier DESC`,
        [severity]
      );

      // Add facility options using percentage-based calculations
      for (const facility of facilities_result.rows) {
        if (character.is_dead && facility.facility_type !== 'resurrection_chamber') {
          continue; // Only resurrection chamber can handle dead characters
        }

        let facility_time: number;
        let facility_description: string;

        if (character.is_dead) {
          // Use legacy time for resurrection
          facility_time = natural_time / facility.healing_rate_multiplier;
          facility_description = `${facility.description} (~${Math.ceil(facility_time)}h)`;
        } else {
          // Use percentage-based healing for injuries
          const facility_rate = this.getHealingRatePercentage('basic_medical', level) * facility.healing_rate_multiplier;
          facility_time = this.calculatePercentageBasedHealingTime(current_health, max_health, facility_rate);
          facility_description = `${facility.description} (${Math.floor(facility_rate)}% missing health per hour, ~${facility_time}h)`;
        }

        const total_cost = {
          currency: facility.currency_cost_per_hour * facility_time,
          premium: facility.premium_cost_per_hour * facility_time
        };

        options.push({
          type: 'facility',
          name: facility.name,
          cost: total_cost,
          time_reduction: natural_time - facility_time,
          description: facility_description,
          facility_id: facility.id
        });
      }

      return options.filter(option => option.time_reduction >= 0); // Remove invalid options
    } catch (error) {
      console.error('Error getting healing options:', error);
      throw error;
    }
  }

  /**
   * Start a healing session for a character
   */
  static async startHealingSession(
    character_id: string,
    healing_type: 'natural' | 'currency' | 'premium' | 'facility',
    facility_id?: string,
    payment_method?: 'currency' | 'premium'
  ): Promise<HealingSession> {
    try {
      // Check if character is in battle
      await requireNotInBattle(character_id);

      // Get character current state
      const character_result = await query(
        `SELECT level, injury_severity, is_dead, current_health, current_max_health FROM user_characters WHERE id = $1`,
        [character_id]
      );

      if (character_result.rows.length === 0) {
        throw new Error('Character not found');
      }

      const character = character_result.rows[0];
      const severity = character.injury_severity || 'healthy';
      const level = character.level || 1;
      const current_health = character.current_health || 0;
      const max_health = character.current_max_health;

      // Calculate healing time using percentage-based system
      const costs = this.calculateHealingCost(level, severity);

      let actual_healing_time = 0;
      let currency_paid = 0;
      let premium_paid = 0;
      let session_facility_id = facility_id;

      // Calculate healing parameters based on type using percentage-based system
      switch (healing_type) {
        case 'natural':
          if (character.is_dead) {
            // Use legacy resurrection time
            actual_healing_time = this.calculateNaturalRecoveryTime('dead');
          } else {
            // Use free clinic rate for natural healing
            const free_rate = this.getHealingRatePercentage('free_clinic', level);
            actual_healing_time = this.calculatePercentageBasedHealingTime(current_health, max_health, free_rate);
          }
          break;

        case 'currency':
          if (character.is_dead) {
            // Paid resurrection - faster than natural
            const natural_resurrection_time = this.calculateNaturalRecoveryTime('dead');
            actual_healing_time = natural_resurrection_time * 0.5; // 50% faster
          } else {
            // Medical treatment with better healing rate
            const medical_rate = this.getHealingRatePercentage('basic_medical', level);
            actual_healing_time = this.calculatePercentageBasedHealingTime(current_health, max_health, medical_rate);
          }
          currency_paid = costs.currency;
          break;

        case 'premium':
          // Premium healing is instant for both injuries and death
          actual_healing_time = 0.1; // Nearly instant (6 minutes)
          premium_paid = costs.premium;
          break;

        case 'facility':
          if (!facility_id) throw new Error('Facility ID required for facility healing');

          const facility_result = await query(
            `SELECT * FROM healing_facilities WHERE id = $1`,
            [facility_id]
          );

          if (facility_result.rows.length === 0) {
            throw new Error('Facility not found');
          }

          const facility = facility_result.rows[0];

          if (character.is_dead) {
            if (facility.facility_type !== 'resurrection_chamber') {
              throw new Error('Only resurrection chambers can handle dead characters');
            }
            // Use facility multiplier on natural resurrection time
            const natural_resurrection_time = this.calculateNaturalRecoveryTime('dead');
            actual_healing_time = natural_resurrection_time / facility.healing_rate_multiplier;
          } else {
            // Use facility-enhanced percentage-based healing
            const base_rate = this.getHealingRatePercentage('basic_medical', level);
            const enhanced_rate = base_rate * facility.healing_rate_multiplier;
            actual_healing_time = this.calculatePercentageBasedHealingTime(current_health, max_health, enhanced_rate);
          }

          // Calculate costs based on actual healing time
          if (payment_method === 'currency') {
            currency_paid = facility.currency_cost_per_hour * actual_healing_time;
          } else {
            premium_paid = facility.premium_cost_per_hour * actual_healing_time;
          }
          break;
      }

      const completion_time = new Date(Date.now() + actual_healing_time * 60 * 60 * 1000);

      // Create healing session
      const session_id = uuidv4();
      await query(
        `INSERT INTO character_healing_sessions 
         (id, character_id, facility_id, session_type, estimated_completion_time, currency_paid, premium_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          session_id,
          character_id,
          session_facility_id || 'natural',
          character.is_dead ? 'resurrection' : 'injury_healing',
          completion_time,
          currency_paid,
          premium_paid
        ]
      );

      // Update character recovery time
      await query(
        `UPDATE user_characters 
         SET recovery_time = $1 
         WHERE id = $2`,
        [completion_time, character_id]
      );

      // Deduct currency/premium if needed
      if (currency_paid > 0 || premium_paid > 0) {
        await this.deductHealingCosts(character_id, currency_paid, premium_paid);
      }

      return {
        id: session_id,
        character_id,
        facility_id: session_facility_id || 'natural',
        session_type: character.is_dead ? 'resurrection' : 'injury_healing',
        start_time: new Date(),
        estimated_completion_time: completion_time,
        currency_paid,
        premium_paid,
        is_active: true,
        is_completed: false
      };

    } catch (error) {
      console.error('Error starting healing session:', error);
      throw error;
    }
  }

  /**
   * Check and complete healing sessions that are finished
   */
  static async processCompletedHealingSessions(): Promise<void> {
    try {
      // Find completed sessions
      const completed_sessions = await query(
        `SELECT * FROM character_healing_sessions 
         WHERE is_active = true AND estimated_completion_time <= CURRENT_TIMESTAMP`
      );

      for (const session of completed_sessions.rows) {
        await this.completeHealingSession(session.id);
      }
    } catch (error) {
      console.error('Error processing completed healing sessions:', error);
    }
  }

  /**
   * Complete a healing session and restore character
   */
  static async completeHealingSession(session_id: string): Promise<void> {
    try {
      // Get session details
      const session_result = await query(
        `SELECT * FROM character_healing_sessions WHERE id = $1`,
        [session_id]
      );

      if (session_result.rows.length === 0) {
        throw new Error('Healing session not found');
      }

      const session = session_result.rows[0];

      // Restore character health
      if (session.session_type === 'resurrection') {
        // Handle resurrection
        await query(
          `UPDATE user_characters 
           SET is_dead = false, 
               is_injured = false,
               injury_severity = 'healthy',
               current_health = current_max_health,
               death_timestamp = NULL,
               resurrection_available_at = NULL,
               recovery_time = NULL
           WHERE id = $1`,
          [session.character_id]
        );
      } else {
        // Handle injury healing
        await query(
          `UPDATE user_characters 
           SET is_injured = false,
               injury_severity = 'healthy', 
               current_health = current_max_health,
               recovery_time = NULL
           WHERE id = $1`,
          [session.character_id]
        );
      }

      // Mark session as completed
      await query(
        `UPDATE character_healing_sessions 
         SET is_active = false, is_completed = true 
         WHERE id = $1`,
        [session_id]
      );

      console.log(`✅ Completed healing session for character ${session.character_id}`);

    } catch (error) {
      console.error('Error completing healing session:', error);
      throw error;
    }
  }

  /**
   * Deduct healing costs from user's currency
   */
  private static async deductHealingCosts(character_id: string, currency_cost: number, premium_cost: number): Promise<void> {
    try {
      // Get user ID from character
      const user_result = await query(
        `SELECT user_id FROM user_characters WHERE id = $1`,
        [character_id]
      );

      if (user_result.rows.length === 0) {
        throw new Error('Character not found');
      }

      const user_id = user_result.rows[0].user_id;

      // Deduct costs
      if (currency_cost > 0) {
        await query(
          `UPDATE user_currency 
           SET battle_tokens = battle_tokens - $1 
           WHERE user_id = $2 AND battle_tokens >= $1`,
          [currency_cost, user_id]
        );
      }

      if (premium_cost > 0) {
        await query(
          `UPDATE user_currency 
           SET premium_currency = premium_currency - $1 
           WHERE user_id = $2 AND premium_currency >= $1`,
          [premium_cost, user_id]
        );
      }

    } catch (error) {
      console.error('Error deducting healing costs:', error);
      throw error;
    }
  }

  /**
   * Get active healing sessions for a user
   */
  static async getUserHealingSessions(user_id: string): Promise<HealingSession[]> {
    try {
      const result = await query(
        `SELECT chs.* FROM character_healing_sessions chs
         JOIN user_characters uc ON chs.character_id = uc.id
         WHERE uc.user_id = $1 AND chs.is_active = true
         ORDER BY chs.estimated_completion_time ASC`,
        [user_id]
      );

      return (result.rows as HealingSession[]).map(row => ({
        id: row.id,
        character_id: row.character_id,
        facility_id: row.facility_id,
        session_type: row.session_type,
        start_time: new Date(row.start_time),
        estimated_completion_time: new Date(row.estimated_completion_time),
        currency_paid: row.currency_paid,
        premium_paid: row.premium_paid,
        is_active: row.is_active,
        is_completed: row.is_completed
      }));
    } catch (error) {
      console.error('Error getting user healing sessions:', error);
      throw error;
    }
  }
}