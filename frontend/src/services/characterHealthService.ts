import { characterAPI } from './apiClient';

export interface CharacterHealthStatus {
  id: string;
  name: string;
  is_alive: boolean;
  is_dead: boolean;
  is_injured: boolean;
  injury_severity?: 'healthy' | 'light' | 'moderate' | 'severe' | 'critical' | 'dead';
  current_health: number;
  max_health: number;
  recovery_time?: Date;
  resurrection_available_at?: Date;
  can_fight: boolean;
  status_message: string;
}

export class CharacterHealthService {
  /**
   * Check if a character is eligible for PVP combat
   */
  static async checkCharacterEligibility(character_id: string): Promise<CharacterHealthStatus> {
    try {
      // Fetch character status from healing API
      const response = await fetch(`/api/healing/character-status/${character_id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Healing API returned ${response.status}`);
      }

      const healthData = await response.json();
      return this.processHealthStatus(healthData);
    } catch (error) {
      console.error('Failed to check character health:', error);
      // Return conservative status on error
      return {
        id: character_id,
        name: 'Unknown',
        is_alive: false,
        is_dead: false,
        is_injured: true,
        current_health: 0,
        max_health: 100,
        can_fight: false,
        status_message: 'Unable to verify character health status'
      };
    }
  }

  /**
   * Get all eligible characters for PVP
   */
  static async getEligibleCharacters(): Promise<CharacterHealthStatus[]> {
    try {
      const characters = await characterAPI.get_user_characters();
      const healthChecks = await Promise.all(
        characters.map(char => this.checkCharacterEligibility(char.id))
      );
      
      return healthChecks.filter(status => status.can_fight);
    } catch (error) {
      console.error('Failed to get eligible characters:', error);
      return [];
    }
  }

  /**
   * Process health status data from API
   */
  private static processHealthStatus(healthData: any): CharacterHealthStatus {
    const isDead = healthData.is_dead || healthData.injurySeverity === 'dead';
    const isInjured = healthData.is_injured || false;
    const injurySeverity = healthData.injury_severity || 'healthy';
    const current_health = healthData.current_health || 0;
    const max_health = healthData.max_health || 100;
    const recovery_time = healthData.recovery_time ? new Date(healthData.recovery_time) : undefined;
    const resurrectionAvailableAt = healthData.resurrection_available_at ? new Date(healthData.resurrection_available_at) : undefined;

    // Determine if character can fight
    const canFight = !isDead && !isInjured && current_health > 0;
    
    // Generate status message
    let statusMessage = '';
    if (isDead) {
      if (resurrectionAvailableAt && new Date() < resurrectionAvailableAt) {
        const timeLeft = Math.ceil((resurrectionAvailableAt.getTime() - Date.now()) / (1000 * 60));
        statusMessage = `Dead - resurrection available in ${timeLeft} minutes`;
      } else if (resurrectionAvailableAt) {
        statusMessage = 'Dead - resurrection available now';
      } else {
        statusMessage = 'Dead - resurrection not available';
      }
    } else if (isInjured) {
      if (recovery_time && new Date() < recovery_time) {
        const timeLeft = Math.ceil((recovery_time.getTime() - Date.now()) / (1000 * 60));
        statusMessage = `Injured (${injurySeverity}) - healing completes in ${timeLeft} minutes`;
      } else {
        statusMessage = `Injured (${injurySeverity}) - healing available`;
      }
    } else if (current_health < max_health) {
      statusMessage = `Wounded - ${current_health}/${max_health} HP`;
    } else {
      statusMessage = 'Healthy and ready for battle';
    }

    return {
      id: healthData.id,
      name: healthData.name || 'Unknown',
      is_alive: !isDead,
      is_dead: isDead,
      is_injured: isInjured,
      injury_severity: injurySeverity,
      current_health: current_health,
      max_health: max_health,
      recovery_time,
      resurrection_available_at: resurrectionAvailableAt,
      can_fight: canFight,
      status_message: statusMessage
    };
  }

  /**
   * Fallback method to create health status from character data
   */
  private static createHealthStatusFromCharacter(character: any): CharacterHealthStatus {
    const current_health = character.current_health || character.health || 100;
    const max_health = character.max_health || 100;
    const isInjured = character.is_injured || false;
    const isDead = character.is_dead || false;
    const canFight = !isDead && !isInjured && current_health > 0;

    let statusMessage = 'Status unknown - using fallback data';
    if (isDead) {
      statusMessage = 'Dead - cannot participate in PVP';
    } else if (isInjured) {
      statusMessage = 'Injured - cannot participate in PVP';
    } else if (current_health < max_health) {
      statusMessage = `Wounded - ${current_health}/${max_health} HP`;
    } else {
      statusMessage = 'Healthy and ready for battle';
    }

    return {
      id: character.id,
      name: character.name,
      is_alive: !isDead,
      is_dead: isDead,
      is_injured: isInjured,
      injury_severity: character.injury_severity || 'healthy',
      current_health: current_health,
      max_health: max_health,
      can_fight: canFight,
      status_message: statusMessage
    };
  }

  /**
   * Check if character needs healing before PVP
   */
  static needsHealing(healthStatus: CharacterHealthStatus): boolean {
    return healthStatus.is_dead || healthStatus.is_injured || healthStatus.current_health < healthStatus.max_health;
  }

  /**
   * Get healing options for a character
   */
  static async getHealingOptions(character_id: string) {
    try {
      const response = await fetch(`/api/healing/options/${character_id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch healing options');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get healing options:', error);
      return null;
    }
  }

  /**
   * Get resurrection options for a dead character
   */
  static async getResurrectionOptions(character_id: string) {
    try {
      const response = await fetch(`/api/healing/resurrection/options/${character_id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resurrection options');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get resurrection options:', error);
      return null;
    }
  }
}

export default CharacterHealthService;