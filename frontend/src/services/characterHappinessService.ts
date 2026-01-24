import { ROOM_THEMES, HEADQUARTERS_TIERS } from '../data/headquartersData';
import { calculateRoomCapacity } from '../utils/roomCalculations';
import FinancialRoomMoodService from './financialRoomMoodService';
import { FinancialPersonality } from './apiClient';

/**
 * Character Happiness Service
 * 
 * This service handles all character mood and compatibility calculations.
 * Extracted from TeamHeadquarters.tsx to improve maintainability and testability.
 */

// getCharacterConflicts function - extracted from TeamHeadquarters.tsx (lines 246-266)
export const getCharacterConflicts = (room_id: string, headquarters: any) => {
  if (!headquarters?.rooms) return [];
  
  const room = headquarters.rooms.find(r => r.id === room_id);
  if (!room || room.assigned_characters.length < 2) return [];

  const conflicts = [];
  
  if (room.assigned_characters.includes('holmes') && room.assigned_characters.includes('dracula')) {
    conflicts.push('Holmes keeps analyzing Dracula\'s sleeping patterns');
  }
  if (room.assigned_characters.includes('achilles') && room.assigned_characters.includes('merlin')) {
    conflicts.push('Achilles thinks Merlin\'s midnight spell practice is too loud');
  }
  if (room.assigned_characters.includes('cleopatra') && room.assigned_characters.includes('joan')) {
    conflicts.push('Cleopatra insists on royal treatment, Joan prefers humble quarters');
  }
  if (room.assigned_characters.includes('frankenstein_monster') && room.assigned_characters.includes('sun_wukong')) {
    conflicts.push('Sun Wukong\'s energy annoys the contemplative Monster');
  }

  return conflicts;
};

// getCharacterHappiness function - extracted from TeamHeadquarters.tsx (lines 269-311)
export const getCharacterHappiness = (charName: string, room_id: string, headquarters: any) => {
  if (!headquarters?.rooms) return { level: 3, status: 'Content', emoji: '😐' };
  
  const room = headquarters.rooms.find(r => r.id === room_id);
  if (!room) return { level: 3, status: 'Content', emoji: '😐' };

  let happiness = 3; // Base happiness (1-5 scale)
  
  // Theme compatibility
  const compatibility = getThemeCompatibility(charName, room.theme);
  if (compatibility.type === 'compatible') {
    happiness += 1;
  } else if (compatibility.type === 'incompatible') {
    happiness -= 1; // Penalty for wrong theme
  }
  
  // Overcrowding penalty
  const roomCapacity = calculateRoomCapacity(room);
  if (room.assigned_characters.length > roomCapacity) {
    happiness -= 1;
  }
  
  // Character conflicts
  const conflicts = getCharacterConflicts(room_id, headquarters);
  if (conflicts.length > 0) {
    happiness -= 1;
  }
  
  // Tier bonus
  const tierIndex = HEADQUARTERS_TIERS.findIndex(t => t.id === headquarters.current_tier);
  happiness += Math.floor(tierIndex / 2);
  
  // Clamp between 1-5
  happiness = Math.max(1, Math.min(5, happiness));
  
  const statusMap = {
    1: { status: 'Miserable', emoji: '😫' },
    2: { status: 'Unhappy', emoji: '😒' },
    3: { status: 'Content', emoji: '😐' },
    4: { status: 'Happy', emoji: '😊' },
    5: { status: 'Ecstatic', emoji: '🤩' }
  };
  
  return { level: happiness, ...statusMap[happiness as keyof typeof statusMap] };
};

// Enhanced getCharacterHappiness with financial mood effects
export const getCharacterHappinessWithFinancialEffects = (
  char_name: string, 
  room_id: string, 
  headquarters: any,
  current_wallet: number = 5000,
  monthly_earnings: number = 3000,
  financial_personality?: FinancialPersonality
) => {
  // Get base happiness from existing system
  const baseHappiness = getCharacterHappiness(char_name, room_id, headquarters);
  
  // If no financial data provided, return base happiness
  if (!financial_personality) {
    return {
      ...baseHappiness,
      financial_effects: {
        applied: false,
        modifier: 0,
        factors: {}
      }
    };
  }
  
  // Calculate financial mood effects
  const financialRoomService = FinancialRoomMoodService.getInstance();
  const financialMoodData = financialRoomService.calculateFinancialEnhancedHappiness(
    char_name,
    room_id,
    headquarters,
    current_wallet,
    monthly_earnings,
    financial_personality
  );
  
  // Apply financial modifier to base happiness
  const enhancedHappiness = Math.max(1, Math.min(5, 
    baseHappiness.level + financialMoodData.financial_mood_modifier
  ));
  
  const statusMap = {
    1: { status: 'Miserable', emoji: '😫' },
    2: { status: 'Unhappy', emoji: '😒' },
    3: { status: 'Content', emoji: '😐' },
    4: { status: 'Happy', emoji: '😊' },
    5: { status: 'Ecstatic', emoji: '🤩' }
  };
  
  return {
    level: enhancedHappiness,
    ...statusMap[enhancedHappiness as keyof typeof statusMap],
    base_level: baseHappiness.level,
    financial_effects: {
      applied: true,
      modifier: financialMoodData.financial_mood_modifier,
      factors: financialMoodData.mood_factors
    }
  };
};

// getThemeCompatibility function - extracted from TeamHeadquarters.tsx (lines 314-328)
export const getThemeCompatibility = (charName: string, theme_id: string | null) => {
  if (!theme_id) return { compatible: true, type: 'no_theme' };

  const theme = ROOM_THEMES.find(t => t.id === theme_id);
  if (!theme) return { compatible: true, type: 'no_theme' };

  const isCompatible = theme.suitable_characters.includes(charName);
  return {
    compatible: isCompatible,
    type: isCompatible ? 'compatible' : 'incompatible',
    theme,
    bonus_value: isCompatible ? theme.bonus_value : 0,
    penalty: isCompatible ? 0 : -5 // Small happiness penalty for wrong theme
  };
};

// getCharacterSuggestedThemes function - extracted from TeamHeadquarters.tsx (lines 355-357)
export const getCharacterSuggestedThemes = (charName: string) => {
  return ROOM_THEMES.filter(theme => theme.suitable_characters.includes(charName));
};