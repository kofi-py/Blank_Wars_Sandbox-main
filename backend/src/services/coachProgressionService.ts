import { query } from '../database/index';
import { v4 as uuidv4 } from 'uuid';
import { InternalMailService } from './internalMailService';

export interface CoachProgression {
  user_id: string;
  coach_level: number;
  coach_experience: number;
  coach_title: string;
  psychology_skill_points: number;
  battle_strategy_skill_points: number;
  character_development_skill_points: number;
  total_battles_coached: number;
  total_wins_coached: number;
  psychology_interventions: number;
  successful_interventions: number;
  gameplan_adherence_rate: number;
  team_chemistry_improvements: number;
  character_developments: number;
  // Financial coaching stats
  financial_advice_given: number;
  successful_financial_advice: number;
  spirals_prevented: number;
  financial_conflicts_resolved: number;
}

export interface CoachXPEvent {
  id: string;
  user_id: string;
  event_type: 'battle_win' | 'battle_loss' | 'psychology_management' | 'character_development' | 'financial_coaching';
  event_subtype?: string;
  xp_gained: number;
  description: string;
  battle_id?: string;
  character_id?: string;
  created_at: Date;
}

export interface CoachSkill {
  id: string;
  user_id: string;
  skill_tree: 'psychology_mastery' | 'battle_strategy' | 'character_development';
  skill_name: string;
  skill_level: number;
  unlocked_at: Date;
}

export interface CoachSkillsWithOverall {
  psychology_mastery: number;
  battle_strategy: number;
  character_development: number;
  overall_skill: number;
  win_rate: number;
  avg_gameplan_adherence: number;
  avg_team_chemistry: number;
}

export class CoachProgressionService {

  // XP Distribution: Battle 40%, Character Development 30%, Team Chemistry 20%, Gameplan Adherence 10%

  // Get coach progression for a user
  static async getCoachProgression(user_id: string): Promise<CoachProgression | null> {
    try {
      const result = await query(
        'SELECT * FROM coach_progression WHERE user_id = $1',
        [user_id]
      );

      if (result.rows.length === 0) {
        // Create initial coach progression
        return await this.createInitialProgression(user_id);
      }

      const row = result.rows[0];
      return {
        user_id: row.user_id,
        coach_level: row.coach_level,
        coach_experience: row.coach_experience,
        coach_title: row.coach_title,
        psychology_skill_points: row.psychology_skill_points,
        battle_strategy_skill_points: row.battle_strategy_skill_points,
        character_development_skill_points: row.character_development_skill_points,
        total_battles_coached: row.total_battles_coached,
        total_wins_coached: row.total_wins_coached,
        psychology_interventions: row.psychology_interventions,
        successful_interventions: row.successful_interventions,
        gameplan_adherence_rate: row.gameplan_adherence_rate,
        team_chemistry_improvements: row.team_chemistry_improvements,
        character_developments: row.character_developments,
        // Financial coaching stats
        financial_advice_given: row.financial_advice_given || 0,
        successful_financial_advice: row.successful_financial_advice || 0,
        spirals_prevented: row.spirals_prevented || 0,
        financial_conflicts_resolved: row.financial_conflicts_resolved || 0
      };
    } catch (error) {
      console.error('Error getting coach progression:', error);
      return null;
    }
  }

  // Create initial coach progression
  static async createInitialProgression(user_id: string): Promise<CoachProgression> {
    try {
      await query(
        `INSERT INTO coach_progression (
          user_id, coach_level, coach_experience, coach_title,
          psychology_skill_points, battle_strategy_skill_points, character_development_skill_points,
          total_battles_coached, total_wins_coached, psychology_interventions,
          successful_interventions, gameplan_adherence_rate, team_chemistry_improvements,
          character_developments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [user_id, 1, 0, 'Rookie Coach', 0, 0, 0, 0, 0, 0, 0, 0.0, 0, 0]
      );

      return {
        user_id,
        coach_level: 1,
        coach_experience: 0,
        coach_title: 'Rookie Coach',
        psychology_skill_points: 0,
        battle_strategy_skill_points: 0,
        character_development_skill_points: 0,
        total_battles_coached: 0,
        total_wins_coached: 0,
        psychology_interventions: 0,
        successful_interventions: 0,
        gameplan_adherence_rate: 0.0,
        team_chemistry_improvements: 0,
        character_developments: 0,
        // Financial coaching stats
        financial_advice_given: 0,
        successful_financial_advice: 0,
        spirals_prevented: 0,
        financial_conflicts_resolved: 0
      };
    } catch (error) {
      console.error('Error creating initial coach progression:', error);
      throw error;
    }
  }

  // Get level requirement from database (Infinite Leveling)
  static async getLevelRequirement(level: number): Promise<{ total_xp_required: number, title: string, tier: string } | null> {
    try {
      const result = await query(
        `SELECT * FROM get_or_create_coach_level_requirement($1)`,
        [level]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        total_xp_required: parseInt(row.total_xp_req),
        title: row.c_title,
        tier: row.c_tier
      };
    } catch (error) {
      console.error('Error getting coach level requirement:', error);
      return null;
    }
  }

  // Award XP and handle level ups
  static async awardXP(
    user_id: string,
    event_type: CoachXPEvent['event_type'],
    xp_gained: number,
    description: string,
    event_subtype?: string,
    battle_id?: string,
    character_id?: string
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    try {
      // Record XP event
      const event_id = uuidv4();
      await query(
        `INSERT INTO coach_xp_events (
          id, user_id, event_type, event_subtype, xp_gained, description, battle_id, character_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [event_id, user_id, event_type, event_subtype, xp_gained, description, battle_id, character_id]
      );

      // Get current progression
      const progression = await this.getCoachProgression(user_id);
      if (!progression) throw new Error('Coach progression not found');

      const old_level = progression.coach_level;
      const new_experience = progression.coach_experience + xp_gained;

      // Check for level up using database
      let new_level = old_level;
      let remaining_xp = new_experience;

      // Get next level requirement
      let next_level_req = await this.getLevelRequirement(new_level + 1);

      // While we have enough total XP for the next level
      // Note: In this system, 'coach_experience' tracks TOTAL XP, not XP into current level
      // So we compare total accumulated XP against the requirement
      while (next_level_req && remaining_xp >= next_level_req.total_xp_required) {
        new_level++;
        next_level_req = await this.getLevelRequirement(new_level + 1);
      }

      const leveled_up = new_level > old_level;

      // Get title for the new level
      const current_level_req = await this.getLevelRequirement(new_level);
      const new_title = current_level_req ? current_level_req.title : progression.coach_title;

      // Update progression
      await query(
        `UPDATE coach_progression SET 
          coach_level = $1, 
          coach_experience = $2, 
          coach_title = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4`,
        [new_level, remaining_xp, new_title, user_id]
      );

      // Award skill points for level ups
      if (leveled_up) {
        const levels_gained = new_level - old_level;
        // Standard is 1 point per level, but DB could define more in future
        const skill_pointsToAward = levels_gained;

        await this.awardSkillPoints(user_id, skill_pointsToAward);

        // Send coach level-up mail notification (async, don't wait)
        try {
          const mail_service = new InternalMailService();
          const bonuses = this.calculateCoachBonuses({ ...progression, coach_level: new_level, coach_title: new_title } as CoachProgression);

          await mail_service.sendCoachLevelUpMail(
            user_id,
            new_level,
            new_title,
            skill_pointsToAward,
            {
              battle_xpmultiplier: bonuses.battle_xpmultiplier,
              psychology_bonus: bonuses.gameplan_adherence_bonus,
              character_dev_multiplier: bonuses.character_development_multiplier
            }
          );
        } catch (mail_error) {
          console.error('Error sending coach level-up mail:', mail_error);
          // Don't fail level-up if mail fails
        }
      }

      return {
        leveled_up,
        new_level: leveled_up ? new_level : undefined,
        old_level: leveled_up ? old_level : undefined
      };
    } catch (error) {
      console.error('Error awarding XP:', error);
      throw error;
    }
  }

  // Award skill points (distributed evenly across trees)
  static async awardSkillPoints(user_id: string, skill_points: number): Promise<void> {
    try {
      const points_per_tree = Math.floor(skill_points / 3);
      const remainder = skill_points % 3;

      await query(
        `UPDATE coach_progression SET
          psychology_skill_points = psychology_skill_points + $1,
          battle_strategy_skill_points = battle_strategy_skill_points + $2,
          character_development_skill_points = character_development_skill_points + $3
        WHERE user_id = $4`,
        [
          points_per_tree + (remainder > 0 ? 1 : 0), // Psychology gets first remainder point
          points_per_tree + (remainder > 1 ? 1 : 0), // Battle Strategy gets second remainder point
          points_per_tree,                           // Character Development gets base points
          user_id
        ]
      );
    } catch (error) {
      console.error('Error awarding skill points:', error);
      throw error;
    }
  }

  // Award battle XP (40% of total progression)
  static async awardBattleXP(
    user_id: string,
    is_win: boolean,
    battle_id: string,
    character_id?: string,
    bonus_multiplier: number = 1.0,
    bonus_reason?: string
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    const battle_xp = is_win ? 400 : 160; // 40% of progression - win: 400, loss: 160
    const adjusted_xp = Math.floor(battle_xp * bonus_multiplier);

    const description = is_win
      ? `Battle Victory${bonus_reason ? ` (${bonus_reason})` : ''}`
      : `Battle Experience${bonus_reason ? ` (${bonus_reason})` : ''}`;

    // Update battle stats
    await this.updateBattleStats(user_id, is_win);

    return await this.awardXP(
      user_id,
      is_win ? 'battle_win' : 'battle_loss',
      adjusted_xp,
      description,
      bonus_reason,
      battle_id,
      character_id
    );
  }

  // Award psychology management XP (30% of total progression)
  static async awardPsychologyXP(
    user_id: string,
    psychology_eventType: string,
    xp_amount: number,
    description: string,
    battle_id?: string,
    character_id?: string
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    return await this.awardXP(
      user_id,
      'psychology_management',
      xp_amount,
      description,
      psychology_eventType,
      battle_id,
      character_id
    );
  }

  // Award character development XP (30% of total progression)
  static async awardCharacterDevelopmentXP(
    user_id: string,
    development_type: string,
    xp_amount: number,
    description: string,
    character_id?: string
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {

    return await this.awardXP(
      user_id,
      'character_development',
      xp_amount,
      description,
      development_type,
      undefined,
      character_id
    );
  }

  // Specific psychology management XP methods based on your actual systems

  // Award XP for gameplan adherence (includes breakdown prevention - same coaching activity)
  static async awardGameplanAdherenceXP(
    user_id: string,
    adherence_rate: number,
    deviations_blocked: number,
    average_deviation_severity: 'minor' | 'moderate' | 'major' | 'extreme',
    battle_id: string
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    let xp_amount = 0;
    let description = '';

    // Base XP from gameplan adherence (10% of progression)
    let adherence_xp = 0;
    if (adherence_rate >= 90) {
      adherence_xp = 100; // 10% gameplan adherence
    } else if (adherence_rate >= 80) {
      adherence_xp = 80;
    } else if (adherence_rate >= 70) {
      adherence_xp = 60;
    } else if (adherence_rate >= 60) {
      adherence_xp = 40;
    }

    // Bonus XP for preventing breakdowns (same skill as adherence)
    let breakdown_xp = 0;
    if (deviations_blocked > 0) {
      const breakdown_xp_base = {
        'minor': 20,
        'moderate': 40,
        'major': 60,
        'extreme': 80
      }[average_deviation_severity];
      breakdown_xp = breakdown_xp_base * deviations_blocked;
    }

    xp_amount = adherence_xp + breakdown_xp;

    if (deviations_blocked > 0) {
      description = `Gameplan Adherence: ${adherence_rate}% adherence, prevented ${deviations_blocked} breakdown(s)`;
    } else {
      description = `Gameplan Adherence: ${adherence_rate}% adherence`;
    }

    if (xp_amount > 0) {
      return await this.awardPsychologyXP(
        user_id,
        'gameplan_adherence',
        xp_amount,
        description,
        battle_id
      );
    }

    return { leveled_up: false };
  }

  // Award XP for team chemistry management
  static async awardTeamChemistryXP(
    user_id: string,
    chemistry_improvement: number,
    final_chemistry: number,
    battle_id: string
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    let xp_amount = 0;
    let description = '';

    if (final_chemistry >= 90) {
      xp_amount = 200; // 20% team chemistry
      description = `Perfect Team Chemistry (${final_chemistry}%)`;
    } else if (final_chemistry >= 80) {
      xp_amount = 160;
      description = `Great Team Chemistry (${final_chemistry}%)`;
    } else if (final_chemistry >= 70) {
      xp_amount = 120;
      description = `Good Team Chemistry (${final_chemistry}%)`;
    }

    // Bonus for improvement during battle
    if (chemistry_improvement > 10) {
      xp_amount += Math.floor(chemistry_improvement * 10);
      description += ` (+${chemistry_improvement} improvement)`;
    }

    if (xp_amount > 0) {
      return await this.awardPsychologyXP(
        user_id,
        'team_chemistry',
        xp_amount,
        description,
        battle_id
      );
    }

    return { leveled_up: false };
  }

  // Award XP for financial coaching (20% of total progression)
  static async awardFinancialCoachingXP(
    user_id: string,
    financial_event_type: string,
    xp_amount: number,
    description: string,
    character_id?: string,
    was_successful: boolean = true
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    // Update financial coaching stats
    await this.updateFinancialCoachingStats(user_id, financial_event_type, was_successful);

    return await this.awardXP(
      user_id,
      'financial_coaching',
      xp_amount,
      description,
      financial_event_type,
      undefined,
      character_id
    );
  }

  // Award XP for successful financial advice
  static async awardFinancialAdviceXP(
    user_id: string,
    advice_success: boolean,
    stress_reduction: number,
    character_id: string
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    let xp_amount = 0;
    let description = '';

    if (advice_success) {
      // Base XP for successful advice (15% of progression)
      xp_amount = 150;

      // Bonus XP for significant stress reduction
      if (stress_reduction >= 20) {
        xp_amount += 50; // Major stress relief bonus
        description = `Excellent Financial Advice (${stress_reduction}% stress reduction)`;
      } else if (stress_reduction >= 10) {
        xp_amount += 25; // Moderate stress relief bonus
        description = `Good Financial Advice (${stress_reduction}% stress reduction)`;
      } else {
        description = `Successful Financial Advice`;
      }
    } else {
      // Small XP for attempting advice (learning experience)
      xp_amount = 30;
      description = `Financial Advice Learning Experience`;
    }

    return await this.awardFinancialCoachingXP(
      user_id,
      'financial_advice',
      xp_amount,
      description,
      character_id,
      advice_success
    );
  }

  // Award XP for preventing financial spirals
  static async awardSpiralPreventionXP(
    user_id: string,
    spiral_intensity: number,
    character_id: string
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    // Major XP for preventing spirals (20% of progression)
    let xp_amount = 200;

    // Bonus based on spiral intensity prevented
    if (spiral_intensity >= 80) {
      xp_amount += 100; // Prevented severe spiral
    } else if (spiral_intensity >= 60) {
      xp_amount += 50; // Prevented moderate spiral
    }

    const description = `Prevented Financial Spiral (${spiral_intensity}% intensity)`;

    return await this.awardFinancialCoachingXP(
      user_id,
      'spiral_prevention',
      xp_amount,
      description,
      character_id,
      true
    );
  }

  // Award XP for resolving financial conflicts
  static async awardFinancialConflictResolutionXP(
    user_id: string,
    conflict_severity: 'low' | 'medium' | 'high' | 'critical',
    character_ids: string[]
  ): Promise<{ leveled_up: boolean; new_level?: number; old_level?: number }> {
    const xp_amounts = {
      'low': 100,
      'medium': 150,
      'high': 200,
      'critical': 250
    };

    const xp_amount = xp_amounts[conflict_severity];
    const description = `Resolved ${conflict_severity} financial conflict`;

    return await this.awardFinancialCoachingXP(
      user_id,
      'conflict_resolution',
      xp_amount,
      description,
      character_ids[0], // Primary character
      true
    );
  }

  // Update financial coaching statistics
  static async updateFinancialCoachingStats(
    user_id: string,
    event_type: string,
    was_successful: boolean
  ): Promise<void> {
    try {
      let update_query = '';
      const params = [user_id];

      switch (event_type) {
        case 'financial_advice':
          if (was_successful) {
            update_query = `UPDATE coach_progression SET 
              financial_advice_given = financial_advice_given + 1,
              successful_financial_advice = successful_financial_advice + 1,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1`;
          } else {
            update_query = `UPDATE coach_progression SET 
              financial_advice_given = financial_advice_given + 1,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1`;
          }
          break;

        case 'spiral_prevention':
          update_query = `UPDATE coach_progression SET 
            spirals_prevented = spirals_prevented + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1`;
          break;

        case 'conflict_resolution':
          update_query = `UPDATE coach_progression SET 
            financial_conflicts_resolved = financial_conflicts_resolved + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1`;
          break;
      }

      if (update_query) {
        await query(update_query, params);
      }
    } catch (error) {
      console.error('Error updating financial coaching stats:', error);
      throw error;
    }
  }

  // Update battle statistics
  static async updateBattleStats(user_id: string, is_win: boolean): Promise<void> {
    try {
      await query(
        `UPDATE coach_progression SET 
          total_battles_coached = total_battles_coached + 1,
          total_wins_coached = total_wins_coached + $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1`,
        [user_id, is_win ? 1 : 0]
      );
    } catch (error) {
      console.error('Error updating battle stats:', error);
      throw error;
    }
  }

  // Get coach XP history
  static async getXPHistory(user_id: string, limit: number = 50): Promise<CoachXPEvent[]> {
    try {
      const result = await query(
        `SELECT * FROM coach_xp_events 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [user_id, limit]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        event_type: row.event_type,
        event_subtype: row.event_subtype,
        xp_gained: row.xp_gained,
        description: row.description,
        battle_id: row.battle_id,
        character_id: row.character_id,
        created_at: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('Error getting XP history:', error);
      return [];
    }
  }

  // Get coach skills
  static async getCoachSkills(user_id: string): Promise<CoachSkill[]> {
    try {
      const result = await query(
        'SELECT * FROM coach_skills WHERE user_id = $1 ORDER BY unlocked_at ASC',
        [user_id]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        skill_tree: row.skill_tree,
        skill_name: row.skill_name,
        skill_level: row.skill_level,
        unlocked_at: new Date(row.unlocked_at)
      }));
    } catch (error) {
      console.error('Error getting coach skills:', error);
      return [];
    }
  }

  // Calculate coach bonuses based on level and skills for your psychology systems
  static calculateCoachBonuses(progression: CoachProgression): {
    gameplan_adherence_bonus: number;      // Bonus to checkGameplanAdherence()
    deviation_risk_reduction: number;      // Reduction to calculateDeviationRisk()
    team_chemistry_bonus: number;          // Bonus to calculateTeamChemistry()
    battle_xpmultiplier: number;          // Multiplier for battle XP
    character_development_multiplier: number; // Multiplier for character development XP
    // Financial coaching bonuses
    financial_stress_reduction: number;    // Reduction to financial stress calculations
    financial_decision_quality_bonus: number; // Bonus to financial decision quality
    financial_trust_bonus: number;         // Bonus to coach financial trust
    spiral_prevention_bonus: number;       // Bonus to spiral prevention effectiveness
  } {
    const level = progression.coach_level;

    // Base bonuses from level (every 25 levels unlocks a tier)
    let gameplan_adherence_bonus = 0;
    let deviation_risk_reduction = 0;
    let team_chemistry_bonus = 0;
    let battle_xpmultiplier = 1.0;
    let character_development_multiplier = 1.0;
    // Financial coaching bonuses
    let financial_stress_reduction = 0;
    let financial_decision_quality_bonus = 0;
    let financial_trust_bonus = 0;
    let spiral_prevention_bonus = 0;

    // Tier 1 (Levels 1-25): Basic Psychology Management
    if (level >= 1) {
      gameplan_adherence_bonus += 10;    // +10% to adherence calculations
      deviation_risk_reduction += 15;    // -15% deviation risk
      // Financial coaching bonuses
      financial_stress_reduction += 10;  // -10% financial stress
      financial_trust_bonus += 15;       // +15% financial trust gain
    }

    // Tier 2 (Levels 26-50): Advanced Psychology Skills  
    if (level >= 26) {
      gameplan_adherence_bonus += 10;    // Total: +20%
      team_chemistry_bonus += 20;        // +20% team chemistry
      deviation_risk_reduction += 35;    // Total: -50% deviation risk
      // Financial coaching bonuses
      financial_decision_quality_bonus += 20; // +20% decision quality
      spiral_prevention_bonus += 25;     // +25% spiral prevention
    }

    // Tier 3 (Levels 51-75): Master Psychology Coach
    if (level >= 51) {
      gameplan_adherence_bonus += 15;    // Total: +35%
      deviation_risk_reduction += 25;    // Total: -75% deviation risk
      battle_xpmultiplier += 0.25;      // Total: 1.25x battle XP
      // Financial coaching bonuses
      financial_stress_reduction += 15;  // Total: -25% financial stress
      financial_trust_bonus += 20;       // Total: +35% financial trust gain
    }

    // Tier 4 (Levels 76-100): Psychology Legend
    if (level >= 76) {
      gameplan_adherence_bonus += 15;    // Total: +50%
      deviation_risk_reduction += 20;    // Total: -95% deviation risk (nearly elimination)
      team_chemistry_bonus += 15;        // Total: +35% team chemistry
      character_development_multiplier += 0.5; // Total: 1.5x character development XP
      // Financial coaching bonuses
      financial_decision_quality_bonus += 25; // Total: +45% decision quality
      spiral_prevention_bonus += 35;     // Total: +60% spiral prevention
    }

    // Legendary (Levels 101+): Ultimate Coach
    if (level >= 101) {
      gameplan_adherence_bonus += 25;    // Total: +75%
      battle_xpmultiplier += 0.25;      // Total: 1.5x battle XP
      character_development_multiplier += 0.5; // Total: 2.0x character development XP
      // Financial coaching bonuses
      financial_stress_reduction += 20;  // Total: -45% financial stress
      financial_trust_bonus += 25;       // Total: +60% financial trust gain
      spiral_prevention_bonus += 40;     // Total: +100% spiral prevention (double effectiveness)
    }

    return {
      gameplan_adherence_bonus,
      deviation_risk_reduction,
      team_chemistry_bonus,
      battle_xpmultiplier,
      character_development_multiplier,
      financial_stress_reduction,
      financial_decision_quality_bonus,
      financial_trust_bonus,
      spiral_prevention_bonus
    };
  }

  // Get coach leaderboard
  static async getCoachLeaderboard(limit: number = 10): Promise<Array<{
    user_id: string;
    username: string;
    coach_level: number;
    coach_experience: number;
    coach_title: string;
    total_battles_coached: number;
    total_wins_coached: number;
    win_rate: number;
  }>> {
    try {
      const result = await query(
        `SELECT 
          cp.user_id,
          u.username,
          cp.coach_level,
          cp.coach_experience,
          cp.coach_title,
          cp.total_battles_coached,
          cp.total_wins_coached,
          CASE 
            WHEN cp.total_battles_coached > 0 
            THEN CAST(cp.total_wins_coached AS REAL) / cp.total_battles_coached 
            ELSE 0 
          END as win_rate
        FROM coach_progression cp
        JOIN users u ON cp.user_id = u.id
        ORDER BY cp.coach_level DESC, cp.coach_experience DESC
        LIMIT $1`,
        [limit]
      );

      return result.rows.map((row: any) => ({
        user_id: row.user_id,
        username: row.username,
        coach_level: row.coach_level,
        coach_experience: row.coach_experience,
        coach_title: row.coach_title,
        total_battles_coached: row.total_battles_coached,
        total_wins_coached: row.total_wins_coached,
        win_rate: row.win_rate
      }));
    } catch (error) {
      console.error('Error getting coach leaderboard:', error);
      return [];
    }
  }

  /**
   * Get coach skills with calculated overall_skill score
   * Formula: base_skill_avg + (win_rate * 20) + (adherence / 5) + (chemistry / 5)
   */
  static async getCoachSkillsWithOverall(user_id: string): Promise<CoachSkillsWithOverall> {
    try {
      // Get coach skills for the three trees - must have exactly 3 rows (one per skill tree)
      const skills_result = await query(
        `SELECT skill_tree, MAX(skill_level) as max_level
         FROM coach_skills
         WHERE user_id = $1
         GROUP BY skill_tree`,
        [user_id]
      );

      if (skills_result.rows.length !== 3) {
        throw new Error(`User ${user_id} must have exactly 3 coach skill trees. Found ${skills_result.rows.length}.`);
      }

      interface SkillTreeRow { skill_tree: string; max_level: number; }
      const rows = skills_result.rows as SkillTreeRow[];

      const psych_row = rows.find((row: SkillTreeRow) => row.skill_tree === 'psychology_mastery');
      const battle_row = rows.find((row: SkillTreeRow) => row.skill_tree === 'battle_strategy');
      const char_row = rows.find((row: SkillTreeRow) => row.skill_tree === 'character_development');

      if (!psych_row || !battle_row || !char_row) {
        throw new Error(`STRICT MODE: Missing skill tree for user ${user_id}`);
      }

      const psychology_mastery = psych_row.max_level;
      const battle_strategy = battle_row.max_level;
      const character_development = char_row.max_level;

      // Get win rate from users table
      const user_result = await query(
        `SELECT total_wins, total_battles
         FROM users
         WHERE id = $1`,
        [user_id]
      );

      const total_wins = user_result.rows[0].total_wins;
      const total_battles = user_result.rows[0].total_battles;
      const win_rate = total_battles > 0 ? total_wins / total_battles : 0;

      // Get average team chemistry from team_relationships
      const chemistry_result = await query(
        `SELECT AVG(tr.chemistry_score) as avg_chemistry
         FROM team_relationships tr
         JOIN teams t ON tr.team_id = t.id
         WHERE t.user_id = $1`,
        [user_id]
      );

      const avg_team_chemistry = chemistry_result.rows[0].avg_chemistry;

      // Get average gameplan adherence from user_characters
      const adherence_result = await query(
        `SELECT AVG(gameplan_adherence) as avg_adherence
         FROM user_characters
         WHERE user_id = $1 AND gameplan_adherence IS NOT NULL`,
        [user_id]
      );

      const avg_gameplan_adherence = adherence_result.rows[0].avg_adherence;

      // Calculate overall_skill using the formula
      const base_skill_avg = (psychology_mastery + battle_strategy + character_development) / 3;
      const overall_skill =
        base_skill_avg +
        (win_rate * 20) +
        (avg_gameplan_adherence / 5) +
        (avg_team_chemistry / 5);

      return {
        psychology_mastery,
        battle_strategy,
        character_development,
        overall_skill,
        win_rate,
        avg_gameplan_adherence,
        avg_team_chemistry
      };
    } catch (error) {
      console.error('Error getting coach skills with overall:', error);
      throw error;
    }
  }
}