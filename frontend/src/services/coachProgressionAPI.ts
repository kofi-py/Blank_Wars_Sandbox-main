// Coach Progression API Client
import { apiClient } from './apiClient';

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
  progress_in_current_level: number;
  xp_to_next_level: number;
  next_level_xp: number;
  current_level_xp: number;
}

export interface CoachBonuses {
  gameplan_adherence_bonus: number;
  deviation_risk_reduction: number;
  team_chemistry_bonus: number;
  battle_xpmultiplier: number;
  character_development_multiplier: number;
}

export interface CoachProgressionResponse {
  progression: CoachProgression;
  bonuses: CoachBonuses;
  timestamp: string;
}

export interface CoachXPEvent {
  id: string;
  user_id: string;
  event_type: 'battle_win' | 'battle_loss' | 'psychology_management' | 'character_development';
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

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  coach_level: number;
  coach_experience: number;
  coach_title: string;
  total_battles_coached: number;
  total_wins_coached: number;
  win_rate: number;
}

class CoachProgressionAPI {
  
  // Get coach progression
  async getProgression(): Promise<CoachProgressionResponse> {
    const response = await apiClient.get('/coach-progression');
    return response.data;
  }

  // Get XP history
  async getXPHistory(limit: number = 50): Promise<{ history: CoachXPEvent[]; count: number }> {
    const response = await apiClient.get(`/coach-progression/xp-history?limit=${limit}`);
    return response.data;
  }

  // Get coach skills
  async getSkills(): Promise<{ skills: CoachSkill[]; count: number }> {
    const response = await apiClient.get('/coach-progression/skills');
    return response.data;
  }

  // Get coach skills with overall_skill calculation
  async getSkillsWithOverall(): Promise<{ skills: CoachSkillsWithOverall; timestamp: string }> {
    const response = await apiClient.get('/coach-progression/skills-with-overall');
    return response.data;
  }

  // Get leaderboard
  async getLeaderboard(limit: number = 10): Promise<{ leaderboard: LeaderboardEntry[]; count: number }> {
    const response = await apiClient.get(`/coach-progression/leaderboard?limit=${limit}`);
    return response.data;
  }

  // Award battle XP
  async awardBattleXP(
    is_win: boolean,
    battle_id: string,
    character_id?: string,
    bonus_multiplier?: number,
    bonus_reason?: string
  ): Promise<{ success: boolean; battleResult: string; leveledUp: boolean; newLevel?: number; oldLevel?: number }> {
    const response = await apiClient.post('/coach-progression/award-battle-xp', {
      is_win: is_win,
      battle_id,
      character_id,
      bonus_multiplier: bonus_multiplier,
      bonus_reason
    });
    return response.data;
  }

  // Award gameplan adherence XP (includes breakdown prevention)
  async awardGameplanAdherenceXP(
    adherence_rate: number,
    deviations_blocked: number,
    average_deviation_severity: 'minor' | 'moderate' | 'major' | 'extreme',
    battle_id: string
  ): Promise<{ success: boolean; adherence_rate: number; deviations_blocked: number; leveledUp: boolean; newLevel?: number; oldLevel?: number }> {
    const response = await apiClient.post('/coach-progression/award-gameplan-adherence-xp', {
      adherence_rate: adherence_rate,
      deviations_blocked: deviations_blocked,
      average_deviation_severity: average_deviation_severity,
      battle_id
    });
    return response.data;
  }

  // Award team chemistry XP
  async awardTeamChemistryXP(
    chemistry_improvement: number,
    final_chemistry: number,
    battle_id: string
  ): Promise<{ success: boolean; chemistry_improvement: number; final_chemistry: number; leveledUp: boolean; newLevel?: number; oldLevel?: number }> {
    const response = await apiClient.post('/coach-progression/award-team-chemistry-xp', {
      chemistry_improvement: chemistry_improvement,
      final_chemistry: final_chemistry,
      battle_id
    });
    return response.data;
  }

  // Award character development XP
  async awardCharacterDevelopmentXP(
    development_type: string,
    xp_amount: number,
    description: string,
    character_id?: string
  ): Promise<{ success: boolean; development_type: string; xpAwarded: number; leveledUp: boolean; newLevel?: number; oldLevel?: number }> {
    const response = await apiClient.post('/coach-progression/award-character-development-xp', {
      development_type: development_type,
      xp_amount: xp_amount,
      description,
      character_id
    });
    return response.data;
  }

  // Helper method to calculate XP for level
  calculateXPForLevel(level: number): number {
    return level * 1000 + (level * level * 100);
  }

  // Helper method to get coach title
  getCoachTitle(level: number): string {
    if (level >= 101) return 'Legendary Coach';
    if (level >= 76) return 'Elite Coach';
    if (level >= 51) return 'Master Coach';
    if (level >= 26) return 'Head Coach';
    if (level >= 11) return 'Assistant Coach';
    return 'Rookie Coach';
  }

  // Helper method to get skill tree description
  getSkillTreeDescription(tree: string): string {
    switch (tree) {
      case 'psychology_mastery':
        return 'Enhance gameplan adherence and reduce character breakdowns';
      case 'battle_strategy':
        return 'Improve battle performance and tactical bonuses';
      case 'character_development':
        return 'Accelerate character growth and development';
      default:
        return 'Unknown skill tree';
    }
  }

  // Helper method to format XP numbers
  formatXP(xp: number): string {
    if (xp >= 1000000) {
      return (xp / 1000000).toFixed(1) + 'M';
    } else if (xp >= 1000) {
      return (xp / 1000).toFixed(1) + 'K';
    }
    return xp.toString();
  }
}

export const coachProgressionAPI = new CoachProgressionAPI();