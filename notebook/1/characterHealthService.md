import { characterAPI } from './apiClient';

export interface CharacterHealthStatus {
  id: string;
  name: string;
  isAlive: boolean;
  isDead: boolean;
  isInjured: boolean;
  injurySeverity?: 'healthy' | 'light' | 'moderate' | 'severe' | 'critical' | 'dead';
  currentHealth: number;
  maxHealth: number;
  recoveryTime?: Date;
  resurrectionAvailableAt?: Date;
  canFight: boolean;
  statusMessage: string;
}

export class CharacterHealthService {
  /**
   * Check if a character is eligible for PVP combat
   */
  static async checkCharacterEligibility(characterId: string): Promise<CharacterHealthStatus> {
    try {
      // Fetch character status from healing API
      const response = await fetch(`/api/healing/character-status/${characterId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Fallback to character API if healing API not available
        const character = await characterAPI.getCharacter(characterId);
        return this.createHealthStatusFromCharacter(character);
      }

      const healthData = await response.json();
      return this.processHealthStatus(healthData);
    } catch (error) {
      console.error('Failed to check character health:', error);
      // Return conservative status on error
      return {
        id: characterId,
        name: 'Unknown',
        isAlive: false,
        isDead: false,
        isInjured: true,
        currentHealth: 0,
        maxHealth: 100,
        canFight: false,
        statusMessage: 'Unable to verify character health status'
      };
    }
  }

  /**
   * Get all eligible characters for PVP
   */
  static async getEligibleCharacters(): Promise<CharacterHealthStatus[]> {
    try {
      const characters = await characterAPI.getUserCharacters();
      const healthChecks = await Promise.all(
        characters.map(char => this.checkCharacterEligibility(char.id))
      );
      
      return healthChecks.filter(status => status.canFight);
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
    const currentHealth = healthData.current_health || 0;
    const maxHealth = healthData.max_health || 100;
    const recoveryTime = healthData.recovery_time ? new Date(healthData.recovery_time) : undefined;
    const resurrectionAvailableAt = healthData.resurrection_available_at ? new Date(healthData.resurrection_available_at) : undefined;

    // Determine if character can fight
    const canFight = !isDead && !isInjured && currentHealth > 0;
    
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
      if (recoveryTime && new Date() < recoveryTime) {
        const timeLeft = Math.ceil((recoveryTime.getTime() - Date.now()) / (1000 * 60));
        statusMessage = `Injured (${injurySeverity}) - healing completes in ${timeLeft} minutes`;
      } else {
        statusMessage = `Injured (${injurySeverity}) - healing available`;
      }
    } else if (currentHealth < maxHealth) {
      statusMessage = `Wounded - ${currentHealth}/${maxHealth} HP`;
    } else {
      statusMessage = 'Healthy and ready for battle';
    }

    return {
      id: healthData.id,
      name: healthData.name || 'Unknown',
      isAlive: !isDead,
      isDead,
      isInjured,
      injurySeverity,
      currentHealth,
      maxHealth,
      recoveryTime,
      resurrectionAvailableAt,
      canFight,
      statusMessage
    };
  }

  /**
   * Fallback method to create health status from character data
   */
  private static createHealthStatusFromCharacter(character: any): CharacterHealthStatus {
    const currentHealth = character.current_health || character.health || 100;
    const maxHealth = character.max_health || character.maxHealth || 100;
    const isInjured = character.is_injured || false;
    const isDead = character.is_dead || false;
    const canFight = !isDead && !isInjured && currentHealth > 0;

    let statusMessage = 'Status unknown - using fallback data';
    if (isDead) {
      statusMessage = 'Dead - cannot participate in PVP';
    } else if (isInjured) {
      statusMessage = 'Injured - cannot participate in PVP';
    } else if (currentHealth < maxHealth) {
      statusMessage = `Wounded - ${currentHealth}/${maxHealth} HP`;
    } else {
      statusMessage = 'Healthy and ready for battle';
    }

    return {
      id: character.id,
      name: character.name,
      isAlive: !isDead,
      isDead,
      isInjured,
      injurySeverity: character.injury_severity || 'healthy',
      currentHealth,
      maxHealth,
      canFight,
      statusMessage
    };
  }

  /**
   * Check if character needs healing before PVP
   */
  static needsHealing(healthStatus: CharacterHealthStatus): boolean {
    return healthStatus.isDead || healthStatus.isInjured || healthStatus.currentHealth < healthStatus.maxHealth;
  }

  /**
   * Get healing options for a character
   */
  static async getHealingOptions(characterId: string) {
    try {
      const response = await fetch(`/api/healing/options/${characterId}`, {
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
  static async getResurrectionOptions(characterId: string) {
    try {
      const response = await fetch(`/api/healing/resurrection/options/${characterId}`, {
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