import { apiClient } from './apiClient';
import { calculateTeamChemistry, type TeamCharacter } from '../data/teamBattleSystem';

// Helper function to determine team culture from character archetypes
function determineTeamCulture(characters: PvECharacter[]): 'military' | 'family' | 'divas' | 'chaos' | 'brotherhood' {
  const archetypes = characters.map(c => c.archetype);

  // Count archetype types
  const archetypeCounts = archetypes.reduce((counts, archetype) => {
    counts[archetype] = (counts[archetype] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Determine culture based on archetype combinations
  if (archetypes.includes('warrior') && archetypes.includes('leader')) {
    return 'military'; // Warriors + leaders = disciplined military culture
  }

  if (archetypeCounts['warrior'] >= 2) {
    return 'brotherhood'; // Multiple warriors = warrior brotherhood
  }

  if (archetypes.includes('trickster') && archetypes.includes('beast')) {
    return 'chaos'; // Tricksters + beasts = chaotic team
  }

  if (archetypes.includes('mage') && archetypes.includes('detective')) {
    return 'divas'; // Intellectual characters = prima donna culture
  }

  // Default to family for balanced or supportive combinations
  return 'family';
}

// Helper function to convert PvECharacter to TeamCharacter for chemistry calculation
function convertToTeamCharacter(character: PvECharacter): TeamCharacter {
  return {
    id: character.id,
    name: character.name,
    avatar: '', // Not needed for chemistry calculation
    archetype: character.archetype as any,
    rarity: 'common' as any, // Not needed for chemistry calculation
    level: character.level,
    experience: character.experience,
    experience_to_next: 0, // Not needed for chemistry calculation
    strength: character.strength,
    defense: character.defense,
    speed: character.speed,
    dexterity: character.dexterity,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
    spirit: character.spirit,
    current_health: character.current_health,
    max_health: character.current_max_health,
    current_mana: character.current_mana,
    max_mana: character.current_max_mana,
    current_energy: character.current_energy,
    max_energy: character.current_max_energy,
    psych_stats: character.psych_stats,
    temporary_stats: {
      strength: 0, defense: 0, speed: 0, dexterity: 0,
      intelligence: 0, wisdom: 0, charisma: 0, spirit: 0
    },
    personality_traits: character.personality_traits,
    speaking_style: 'casual' as any,
    decision_making: 'logical' as any,
    conflict_response: 'diplomatic' as any,
    status_effects: [],
    injuries: [],
    rest_days_needed: 0,
    abilities: [],
    special_powers: [],
    equipped_items: {},
    equipment_bonuses: {
      strength: 0, defense: 0, speed: 0, dexterity: 0,
      intelligence: 0, charisma: 0, spirit: 0
    },
    core_skills: {
      combat: { level: 1, experience: 0, max_level: 100 },
      survival: { level: 1, experience: 0, max_level: 100 },
      mental: { level: 1, experience: 0, max_level: 100 },
      social: { level: 1, experience: 0, max_level: 100 },
      spiritual: { level: 1, experience: 0, max_level: 100 }
    },
    gameplan_adherence: character.gameplan_adherence,
    current_stress: character.current_stress,
    team_trust: character.team_trust,
    current_mental_health: character.current_mental_health,
    battle_focus: character.battle_focus,
    current_confidence: character.current_confidence,
    powers: [],
    spells: [],
    equipped_powers: [],
    equipped_spells: [],
    // Battle Image Data (Required from DB)
    battle_image_name: character.battle_image_name,
    battle_image_variants: character.battle_image_variants
  };
}

// Types matching backend PvE interfaces
export interface PvECharacter {
  id: string;
  user_id: string;
  name: string;
  title?: string;
  archetype: string;
  level: number;
  experience: number;
  current_health: number;
  current_max_health: number;
  current_mana: number;
  current_max_mana: number;
  current_energy: number;
  current_max_energy: number;
  base_attack: number;
  base_defense: number;
  base_speed: number;
  base_special: number;
  abilities: PvEAbility[];
  personality_traits: string[];
  equipment: any[];
  is_injured: boolean;
  recovery_time?: Date;
  total_battles: number;
  total_wins: number;
  // Traditional stats (flat snake_case)
  strength: number;
  defense: number;
  dexterity: number;
  intelligence: number;
  spirit: number;
  wisdom: number;
  charisma: number;
  speed: number;
  psych_stats: {
    training: number;
    team_player: number;
    ego: number;
    mental_health: number;
    communication: number;
  };
  // Psychology/adherence fields
  gameplan_adherence: number;
  current_stress: number;
  team_trust: number;
  current_mental_health: number;
  battle_focus: number;
  current_confidence: number;
  // Battle image fields
  battle_image_name: string;
  battle_image_variants: number;
}

export interface PvEAbility {
  name: string;
  power: number;
  cooldown: number;
  type: string;
  effect?: string;
}

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
  financial_advice_given: number;
  successful_financial_advice: number;
  spirals_prevented: number;
  financial_conflicts_resolved: number;
}

export interface AIOpponent {
  id: string;
  name: string;
  coach_name: string;
  characters: PvECharacter[];
  coaching_points: number;
  consecutive_losses: number;
  team_chemistry: number;
  team_culture: 'military' | 'family' | 'divas' | 'chaos' | 'brotherhood';
  average_level: number;
  total_power: number;
  psychology_score: number;
  wins: number;
  losses: number;
  battles_played: number;
  last_battle_date: Date;
  // AI-specific fields
  difficulty: 'rookie' | 'veteran' | 'champion';
  ai_coach_profile: {
    coaching_skill: number;
    strategy_style: string;
    current_strategy: string;
  };
}

export interface PvETeam {
  id: string;
  name: string;
  coach_name: string;
  characters: PvECharacter[];
  coaching_points: number;
  consecutive_losses: number;
  team_chemistry: number;
  team_culture: 'military' | 'family' | 'divas' | 'chaos' | 'brotherhood';
  average_level: number;
  total_power: number;
  psychology_score: number;
  wins: number;
  losses: number;
  battles_played: number;
  last_battle_date: Date;
}

export interface PvEBattleRequest {
  player_team: PvETeam;
  ai_opponent: AIOpponent;
  battle_type: 'pve';
}

export interface PvEBattleResult {
  id: string;
  player_team: PvETeam;
  ai_opponent: AIOpponent;
  status: 'created' | 'in_progress' | 'completed';
  created_at: Date;
}

class PvEAPIService {

  // Get player's characters with full progression data
  async getPlayerCharacters(user_id: string): Promise<PvECharacter[]> {
    try {
      const response = await apiClient.get(`/pve/characters/${user_id}`);
      return response.data.characters || [];
    } catch (error) {
      console.error('Error loading player characters:', error);
      throw new Error('Failed to load your characters');
    }
  }

  // Get coach progression data 
  async getCoachProgression(user_id: string): Promise<CoachProgression | null> {
    try {
      const response = await apiClient.get(`/pve/coach/${user_id}`);
      return response.data.coachProgression || null;
    } catch (error) {
      console.error('Error loading coach progression:', error);
      throw new Error('Failed to load coaching data');
    }
  }

  // Generate realistic AI opponent based on player data
  async generateAIOpponent(playerData: {
    level: number;
    team_power: number;
    win_rate?: number;
    selected_characters: PvECharacter[];
  }): Promise<AIOpponent> {
    try {
      const response = await apiClient.post('/pve/generate-opponent', {
        player_level: playerData.level,
        player_teamPower: playerData.team_power,
        player_win_rate: playerData.win_rate || 0.5,
        player_characters: playerData.selected_characters.map(c => ({
          id: c.id,
          archetype: c.archetype,
          level: c.level
        }))
      });

      return response.data.aiOpponent;
    } catch (error) {
      console.error('Error generating AI opponent:', error);
      throw new Error('Failed to create AI opponent');
    }
  }

  // Create PvE battle with backend tracking
  async createPvEBattle(battleRequest: PvEBattleRequest): Promise<PvEBattleResult> {
    try {
      const response = await apiClient.post('/pve/battle', battleRequest);
      return response.data.battle;
    } catch (error) {
      console.error('Error creating PvE battle:', error);
      throw new Error('Failed to start battle');
    }
  }

  // Create player team from selected characters with real backend data
  async createPlayerTeam(user_id: string, selected_characterIds: string[]): Promise<PvETeam> {
    try {
      // Load real character data
      const userCharacters = await this.getPlayerCharacters(user_id);
      const coachProgression = await this.getCoachProgression(user_id);

      // Get selected characters
      const selected_characters = selected_characterIds.map(id =>
        userCharacters.find(char => char.id === id)
      ).filter(char => char !== undefined) as PvECharacter[];

      if (selected_characters.length !== 3) {
        throw new Error('Please select exactly 3 characters');
      }

      // Calculate real team stats
      const average_level = Math.round(
        selected_characters.reduce((sum, char) => sum + char.level, 0) / selected_characters.length
      );

      const total_power = selected_characters.reduce((sum, char) =>
        sum + char.strength + char.defense, 0
      );

      const psychology_score = Math.round(
        selected_characters.reduce((sum, char) => sum + char.psych_stats.mental_health, 0) / selected_characters.length
      );

      if (!coachProgression) {
        throw new Error('Coach progression data is required to create a team');
      }

      const coaching_points = Math.min(5, Math.max(1, Math.floor(coachProgression.coach_level / 2) + 1));
      const wins = coachProgression.total_wins_coached;
      const losses = coachProgression.total_battles_coached - wins;

      // Convert to TeamCharacter format for chemistry calculation
      const teamCharacters = selected_characters.map(convertToTeamCharacter);

      // Calculate real team chemistry using existing game systems
      // Note: No headquarters effects available at team creation, will be 0
      const team_chemistry = calculateTeamChemistry(teamCharacters);

      // Determine team culture from character archetypes
      const team_culture = determineTeamCulture(selected_characters);

      return {
        id: `player_team_${user_id}_${Date.now()}`,
        name: 'Player Team',
        coach_name: 'You',
        characters: selected_characters,
        coaching_points,
        consecutive_losses: Math.max(0, losses - wins), // Simple consecutive loss approximation
        team_chemistry,
        team_culture,
        average_level,
        total_power,
        psychology_score,
        wins,
        losses,
        battles_played: coachProgression.total_battles_coached,
        last_battle_date: new Date()
      };
    } catch (error) {
      console.error('Error creating player team:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pveAPI = new PvEAPIService();
export default pveAPI;