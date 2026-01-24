import { Room } from '../types/headquarters';
import { ROOM_ELEMENTS } from '../data/headquartersData';

/**
 * Calculate the total sleeping capacity of a room based on its beds
 */
export const calculateRoomCapacity = (room: Room): number => {
  return room.beds.reduce((total, bed) => total + bed.capacity, 0);
};

/**
 * Calculate sleeping arrangement for a character in a room
 * Returns details about where the character sleeps and comfort bonus
 */
export const calculateSleepingArrangement = (room: Room, character_name: string) => {
  const charIndex = room.assigned_characters.indexOf(character_name);
  if (charIndex === -1) return { sleeps_on_floor: true, bed_type: 'floor', comfort_bonus: 0 };

  let assignedSlot = 0;
  for (const bed of room.beds) {
    if (charIndex < assignedSlot + bed.capacity) {
      // Character gets this bed
      return {
        sleeps_on_floor: false,
        bed_type: bed.type,
        comfort_bonus: bed.comfort_bonus,
        sleeps_on_couch: bed.type === 'couch',
        sleeps_in_bed: bed.type === 'bed' || bed.type === 'bunk_bed'
      };
    }
    assignedSlot += bed.capacity;
  }

  // Character sleeps on floor (overcrowded)
  return {
    sleeps_on_floor: true,
    bed_type: 'floor',
    comfort_bonus: -10, // Penalty for floor sleeping
    sleeps_on_couch: false,
    sleeps_in_bed: false
  };
};

/**
 * Calculate room bonuses from elements including synergy bonuses
 */
export const calculateRoomBonuses = (room: Room) => {
  if (!room) return {};

  const bonuses: Record<string, number> = {};
  
  // Base element bonuses
  room.elements.forEach(elementId => {
    const element = ROOM_ELEMENTS.find(e => e.id === elementId);
    if (element) {
      bonuses[element.bonus] = (bonuses[element.bonus] || 0) + element.bonus_value;
    }
  });

  // Synergy bonuses for compatible elements
  room.elements.forEach(elementId => {
    const element = ROOM_ELEMENTS.find(e => e.id === elementId);
    if (element) {
      const compatibleInRoom = element.compatible_with.filter(compatId => 
        room.elements.includes(compatId)
      );
      
      // Add 25% bonus for each compatible element
      compatibleInRoom.forEach(() => {
        bonuses[element.bonus] = (bonuses[element.bonus] || 0) + Math.floor(element.bonus_value * 0.25);
      });
    }
  });

  return bonuses;
};

/**
 * Get element capacity for current tier
 */
export const getElementCapacity = (current_tier: string): number => {
  const tierCapacity = {
    'spartan_apartment': 2,
    'basic_house': 3,
    'team_mansion': 5,
    'elite_compound': 10
  };
  return tierCapacity[current_tier as keyof typeof tierCapacity] || 2;
};