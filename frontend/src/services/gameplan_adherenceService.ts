import { characterAPI } from './apiClient';

interface CharacterMentalState {
  current_mental_health: number;
  stress: number;
  team_trust: number;
  battle_focus: number;
}

interface GameplanCalculation {
  team_adherence: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  character_count: number;
}

/**
 * Calculate gameplan adherence based on character psychology
 * This mirrors the logic from GameplanTracker.tsx but provides team-level metrics
 */
export const calculateGameplanAdherence = async (): Promise<GameplanCalculation> => {
  try {
    const characters = await characterAPI.get_user_characters();
    
    if (characters.length === 0) {
      return {
        team_adherence: 0,
        risk_level: 'critical',
        character_count: 0
      };
    }

    let totalAdherence = 0;
    let criticalCount = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;

    characters.forEach((character: any) => {
      // Use character's base gameplan adherence level (now real data)
      const baseAdherence = character.gameplan_adherence;
      
      // Get mental state (now real data)
      const mental_state: CharacterMentalState = {
        current_mental_health: character.current_mental_health,
        stress: character.current_stress,
        team_trust: character.team_trust,
        battle_focus: character.battle_focus
      };

      // Calculate psychological impacts on adherence
      const stress_impact = -(mental_state.stress * 0.3);
      const mental_healthImpact = (mental_state.current_mental_health - 50) * 0.2;
      const team_trustImpact = (mental_state.team_trust - 50) * 0.1;
      const battle_focusImpact = (mental_state.battle_focus - 50) * 0.15;

      // Calculate final adherence (without random factor for consistency)
      const finalAdherence = Math.max(0, Math.min(100, 
        baseAdherence + stress_impact + mental_healthImpact + team_trustImpact + battle_focusImpact
      ));

      totalAdherence += finalAdherence;

      // Track risk levels
      if (finalAdherence < 30) criticalCount++;
      else if (finalAdherence < 50) highRiskCount++;
      else if (finalAdherence < 70) mediumRiskCount++;
    });

    const teamAdherence = Math.round(totalAdherence / characters.length);

    // Determine overall risk level
    let risk_level: 'low' | 'medium' | 'high' | 'critical';
    if (criticalCount > 0) risk_level = 'critical';
    else if (highRiskCount > 0) risk_level = 'high';
    else if (mediumRiskCount > 0) risk_level = 'medium';
    else risk_level = 'low';

    return {
      team_adherence: teamAdherence,
      risk_level,
      character_count: characters.length
    };

  } catch (error) {
    console.error('Error calculating gameplan adherence:', error);
    return {
      team_adherence: 0,
      risk_level: 'critical',
      character_count: 0
    };
  }
};