import { HeadquartersState } from '../types/headquarters';
import { ROOM_THEMES, ROOM_ELEMENTS } from '../data/headquartersData';
import { roomImageService } from '../data/roomImageService';

/**
 * Set a room's theme
 */
export const setRoomTheme = (
  room_id: string,
  theme_id: string,
  headquarters: HeadquartersState,
  set_headquarters: (updater: (prev: HeadquartersState) => HeadquartersState) => void
) => {
  const theme = ROOM_THEMES.find(t => t.id === theme_id);
  if (!theme) return;

  if (headquarters.currency.coins >= theme.cost.coins && headquarters.currency.gems >= theme.cost.gems) {
    set_headquarters(prev => ({
      ...prev,
      currency: {
        coins: prev.currency.coins - theme.cost.coins,
        gems: prev.currency.gems - theme.cost.gems
      },
      rooms: prev.rooms.map(room =>
        room.id === room_id ? { ...room, theme: theme_id } : room
      ),
      unlocked_themes: [...prev.unlocked_themes, theme_id]
    }));
  }
};

/**
 * Add an element to a room
 */
export const addElementToRoom = (
  room_id: string,
  element_id: string,
  headquarters: HeadquartersState,
  set_headquarters: (updater: (prev: HeadquartersState) => HeadquartersState) => void
) => {
  const element = ROOM_ELEMENTS.find(e => e.id === element_id);
  const room = headquarters.rooms.find(r => r.id === room_id);
  
  if (!element || !room) return;

  // Check element capacity based on tier
  const tierCapacity = {
    'spartan_apartment': 2,
    'basic_house': 3,
    'team_mansion': 5,
    'elite_compound': 10
  };
  
  const maxElements = tierCapacity[headquarters.current_tier as keyof typeof tierCapacity] || 2;
  
  if (room.elements.length >= maxElements) {
    console.warn(`Room is at element capacity (${maxElements})`);
    return;
  }

  // Check if player can afford
  if (headquarters.currency.coins >= element.cost.coins && headquarters.currency.gems >= element.cost.gems) {
    set_headquarters(prev => ({
      ...prev,
      currency: {
        coins: prev.currency.coins - element.cost.coins,
        gems: prev.currency.gems - element.cost.gems
      },
      rooms: prev.rooms.map(room =>
        room.id === room_id
          ? { ...room, elements: [...room.elements, element_id] }
          : room
      )
    }));
  }
};

/**
 * Remove an element from a room
 */
export const removeElementFromRoom = (
  room_id: string,
  element_id: string,
  set_headquarters: (updater: (prev: HeadquartersState) => HeadquartersState) => void
) => {
  set_headquarters(prev => ({
    ...prev,
    rooms: prev.rooms.map(room =>
      room.id === room_id
        ? { ...room, elements: room.elements.filter(id => id !== element_id) }
        : room
    )
  }));
};