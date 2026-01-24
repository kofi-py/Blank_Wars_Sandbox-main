import { ROOM_THEMES } from '../data/headquartersData';
import { calculateRoomCapacity } from '../utils/roomCalculations';

/**
 * Team Performance Service
 * 
 * This service handles team-wide performance calculations including
 * chemistry penalties and battle effects. Extracted from TeamHeadquarters.tsx
 * to provide focused team performance analysis.
 */

// calculateTeamChemistry function - extracted from TeamHeadquarters.tsx (lines 260-273)
export const calculateTeamChemistry = (headquarters: any) => {
  if (!headquarters?.rooms) {
    return { team_coordination: 0 };
  }
  
  const total_characters = headquarters.rooms.reduce((sum, room) => sum + room.assigned_characters.length, 0);
  const totalCapacity = headquarters.rooms.reduce((sum, room) => sum + calculateRoomCapacity(room), 0);
  
  let chemistryPenalty = 0;
  if (total_characters > totalCapacity) {
    const overflow = total_characters - totalCapacity;
    if (overflow >= 4) chemistryPenalty = -35; // 12+ characters in 8-capacity apartment
    else if (overflow >= 2) chemistryPenalty = -25; // 10+ characters
    else chemistryPenalty = -15; // 8+ characters
  }
  
  return { team_coordination: chemistryPenalty };
};

// calculateBattleEffects function - extracted from TeamHeadquarters.tsx (lines 276-303)
export const calculateBattleEffects = (headquarters: any) => {
  if (!headquarters?.rooms) {
    return {};
  }
  
  const effects: Record<string, number> = {};
  
  // Positive bonuses from room themes
  headquarters.rooms.forEach(room => {
    if (room.theme) {
      const theme = ROOM_THEMES.find(t => t.id === room.theme);
      if (theme) {
        room.assigned_characters.forEach(charName => {
          if (theme.suitable_characters.includes(charName)) {
            if (!effects[theme.bonus]) effects[theme.bonus] = 0;
            effects[theme.bonus] += theme.bonus_value;
          }
        });
      }
    }
  });
  
  // Negative penalties from overcrowding
  const chemistry = calculateTeamChemistry(headquarters);
  Object.entries(chemistry).forEach(([key, value]) => {
    if (value !== 0) {
      effects[key] = value;
    }
  });

  return effects;
};