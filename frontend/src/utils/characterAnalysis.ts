import { HeadquartersState } from '../types/headquarters';
import { ROOM_THEMES, HEADQUARTERS_TIERS } from '../data/headquartersData';
import { calculateRoomCapacity } from './roomCalculations';

/**
 * Get character conflicts within a room
 */
export const getCharacterConflicts = (room_id: string, headquarters: HeadquartersState) => {
  if (!headquarters || !headquarters.rooms || !Array.isArray(headquarters.rooms)) return [];
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

/**
 * Get theme compatibility for a character
 */
export const getThemeCompatibility = (charName: string, theme_id: string | null) => {
  if (!theme_id) return { compatible: true, type: 'no_theme' };

  const theme = (ROOM_THEMES && Array.isArray(ROOM_THEMES)) ? ROOM_THEMES.find(t => t.id === theme_id) : null;
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

/**
 * Calculate character happiness in a room
 */
export const getCharacterHappiness = (charName: string, room_id: string, headquarters: HeadquartersState) => {
  if (!headquarters || !headquarters.rooms || !Array.isArray(headquarters.rooms)) return { level: 3, status: 'Content', emoji: '😐' };
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

/**
 * Get room theme warnings
 */
export const getRoomThemeWarnings = (room_id: string, headquarters: HeadquartersState) => {
  if (!headquarters || !headquarters.rooms || !Array.isArray(headquarters.rooms)) return [];
  const room = headquarters.rooms.find(r => r.id === room_id);
  if (!room || !room.theme) return [];
  
  const theme = (ROOM_THEMES && Array.isArray(ROOM_THEMES)) ? ROOM_THEMES.find(t => t.id === room.theme) : null;
  if (!theme) return [];
  
  const warnings = [];
  const incompatibleCharacters = room.assigned_characters.filter(charName => 
    !theme.suitable_characters.includes(charName)
  );
  
  if (incompatibleCharacters.length > 0) {
    warnings.push({
      type: 'theme_mismatch',
      severity: 'warning',
      characters: incompatibleCharacters,
      message: `${incompatibleCharacters.length} fighter(s) clash with ${theme.name} training environment`,
      suggestion: `Consider moving to ${getCharacterSuggestedThemes(incompatibleCharacters[0]).map(t => t.name).join(' or ')}`
    });
  }
  
  return warnings;
};

/**
 * Get suggested themes for a character
 */
export const getCharacterSuggestedThemes = (charName: string) => {
  return ROOM_THEMES.filter(theme => theme.suitable_characters.includes(charName));
};

/**
 * Calculate missed bonuses for a room
 */
export const calculateMissedBonuses = (room_id: string, headquarters: HeadquartersState) => {
  if (!headquarters || !headquarters.rooms || !Array.isArray(headquarters.rooms)) return [];
  const room = headquarters.rooms.find(r => r.id === room_id);
  if (!room) return [];
  
  const missedBonuses = [];
  
  room.assigned_characters.forEach(charName => {
    const compatibility = getThemeCompatibility(charName, room.theme);
    
    // Only show missed bonuses if character is incompatible or room has no theme
    if (compatibility.type === 'incompatible' || compatibility.type === 'no_theme') {
      const suggestedThemes = getCharacterSuggestedThemes(charName);
      suggestedThemes.forEach(theme => {
        missedBonuses.push({
          character: charName,
          theme: theme.name,
          bonus: `+${theme.bonus_value}% ${theme.bonus}`,
          theme_id: theme.id
        });
      });
    }
  });
  
  return missedBonuses;
};

/**
 * Calculate team chemistry penalties from overcrowding
 */
export const calculateTeamChemistry = (headquarters: HeadquartersState) => {
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

/**
 * Calculate total battle effects from themes and overcrowding
 */
export const calculateBattleEffects = (headquarters: HeadquartersState) => {
  const effects: Record<string, number> = {};
  
  // Positive bonuses from room themes
  headquarters.rooms.forEach(room => {
    if (room.theme) {
      const theme = (ROOM_THEMES && Array.isArray(ROOM_THEMES)) ? ROOM_THEMES.find(t => t.id === room.theme) : null;
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