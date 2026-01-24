import { HeadquartersState } from '../types/headquarters';
import { Contestant } from '@blankwars/types';
import { calculateRoomCapacity } from '../utils/roomCalculations';
import { characterAPI, itemAPI } from './apiClient';
import { saveHeadquarters } from './bedService';

/**
 * Assign a character to a room
 */
export const assignCharacterToRoom = async (
  character_id: string,
  room_id: string,
  available_characters: Contestant[],
  headquarters: HeadquartersState,
  set_headquarters: (updater: (prev: HeadquartersState) => HeadquartersState) => void,
  set_move_notification: (notification: { message: string; type: 'success' | 'warning' } | null) => void,
  set_highlighted_room: (room_id: string | null) => void,
  notification_timeout: React.MutableRefObject<NodeJS.Timeout | null>
) => {
  console.log('🔍 assignCharacterToRoom called:', {
    character_id,
    room_id,
    available_characters_count: available_characters?.length,
    available_base_names: available_characters?.map(c => c.base_name)
  });

  const character = available_characters.find(c => c.base_name === character_id);
  const room = headquarters.rooms.find(r => r.id === room_id);

  if (!character || !room) {
    console.error('❌ Move failed:', { character_found: !!character, room_found: !!room });
    set_move_notification({
      message: `Move failed: ${!character ? 'Character not found' : 'Room not found'}`,
      type: 'warning'
    });
    return;
  }

  // Check if already in this room
  if (room.assigned_characters.includes(character_id)) {
    // Clear previous notification timeout
    if (notification_timeout.current) {
      clearTimeout(notification_timeout.current);
    }

    set_move_notification({ message: `${character.name} is already in ${room.name}`, type: 'warning' });
    notification_timeout.current = setTimeout(() => {
      set_move_notification(null);
      set_highlighted_room(null);
    }, 3000);
    return;
  }

  // Compute new headquarters state
  const new_headquarters: HeadquartersState = {
    ...headquarters,
    rooms: headquarters.rooms.map(r => {
      if (r.id === room_id) {
        return {
          ...r,
          assigned_characters: [...r.assigned_characters, character_id]
        };
      } else {
        // Remove character from other rooms
        return {
          ...r,
          assigned_characters: r.assigned_characters.filter(id => id !== character_id)
        };
      }
    })
  };

  // Update local state
  set_headquarters(() => new_headquarters);

  console.log('✅ Character moved:', character.name, '→', room.name);

  // Save to backend
  try {
    await saveHeadquarters(new_headquarters);
    console.log('💾 Headquarters saved to backend');
  } catch (error) {
    console.error('❌ Failed to save headquarters:', error);
    // Don't revert local state - user can retry
  }

  // Enhanced visual feedback
  const newCount = room.assigned_characters.length + 1;
  const roomCapacity = calculateRoomCapacity(room);
  const isOvercrowded = newCount > roomCapacity;

  if (isOvercrowded) {
    const sleepingOnFloor = newCount - roomCapacity;
    set_move_notification({
      message: `${character.name} moved to ${room.name}! ⚠️ ${sleepingOnFloor} fighter(s) now sleeping on floor/couches`,
      type: 'warning'
    });
  } else {
    set_move_notification({
      message: `${character.name} moved to ${room.name}! Room capacity: ${newCount}/${roomCapacity}`,
      type: 'success'
    });
  }

  // Clear previous notification timeout
  if (notification_timeout.current) {
    clearTimeout(notification_timeout.current);
  }

  // Highlight the room briefly
  set_highlighted_room(room_id);
  notification_timeout.current = setTimeout(() => {
    set_highlighted_room(null);
    set_move_notification(null);
  }, 3000);
};

/**
 * Remove a character from a room
 */
export const removeCharacterFromRoom = (
  character_id: string,
  room_id: string,
  set_headquarters: (updater: (prev: HeadquartersState) => HeadquartersState) => void
) => {
  set_headquarters(prev => ({
    ...prev,
    rooms: prev.rooms.map(room =>
      room.id === room_id
        ? { ...room, assigned_characters: room.assigned_characters.filter(id => id !== character_id) }
        : room
    )
  }));
};

/**
 * Get unassigned characters for the pool
 */
export const getUnassigned_characters = (
  available_characters: Contestant[],
  headquarters: HeadquartersState
) => {
  const assigned_characters = headquarters.rooms.flatMap(room => room.assigned_characters);
  return available_characters.filter(char => !assigned_characters.includes(char.base_name));
};

/**
 * Character service object with API methods
 */
export const characterService = {
  get_user_characters: () => characterAPI.get_user_characters(),
  get_system_characters: (role: 'therapist' | 'judge' | 'host' | 'trainer' | 'mascot' | 'real_estate_agent') => characterAPI.get_system_characters(role),

  /**
   * Use a health item on a character
   */
  use_health_item: async (character_id: string, item_id: string, quantity: number = 1) => {
    try {
      const data = await itemAPI.use_item(character_id, item_id, quantity);

      if (!data.success) {
        throw new Error(data.error || 'Failed to use health item');
      }

      console.log(`✅ ${data.message}`);
      return {
        success: true,
        message: data.message,
        character: data.character,
        effects_applied: data.effects_applied,
        item_used: data.item_used
      };

    } catch (error) {
      console.error('Error using health item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to use health item'
      };
    }
  }
};