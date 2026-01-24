import { HeadquartersState, Bed, PurchasableBed } from '../types/headquarters';
import apiClient from './apiClient';

/**
 * Purchase a bed for a room
 */
export const purchaseBed = async (
  room_id: string,
  bed_type: PurchasableBed,
  headquarters: HeadquartersState,
  set_headquarters: (updater: (prev: HeadquartersState) => HeadquartersState) => void,
  set_move_notification: (notification: { message: string; type: 'success' | 'warning' }) => void
) => {
  const room = headquarters.rooms.find(r => r.id === room_id);
  if (!room) return;

  // Check if player has enough currency
  if (headquarters.currency.coins < bed_type.cost.coins || headquarters.currency.gems < bed_type.cost.gems) {
    alert(`Not enough currency! Need ${bed_type.cost.coins} coins and ${bed_type.cost.gems} gems.`);
    return;
  }

  // Generate unique bed ID
  const newBedId = `${bed_type.type}_${Date.now()}`;
  const newBed: Bed = {
    id: newBedId,
    type: bed_type.type,
    position: { x: room.beds.length, y: 0 }, // Simple positioning
    capacity: bed_type.capacity,
    comfort_bonus: bed_type.comfort_bonus
  };

  try {
    // Call API to purchase bed
    const response = await apiClient.post('/headquarters/purchase-bed', {
      room_id,
      bed_data: {
        id: newBedId,
        type: bed_type.type,
        position: newBed.position,
        capacity: bed_type.capacity,
        comfort_bonus: bed_type.comfort_bonus,
        cost: bed_type.cost
      }
    });

    // Update local state on success
    set_headquarters(prev => ({
      ...prev,
      currency: {
        coins: prev.currency.coins - bed_type.cost.coins,
        gems: prev.currency.gems - bed_type.cost.gems
      },
      rooms: prev.rooms.map(r =>
        r.id === room_id
          ? { ...r, beds: [...r.beds, newBed] }
          : r
      )
    }));

    set_move_notification({
      message: `${bed_type.name} purchased for ${room.name}! +${bed_type.capacity} sleeping capacity`,
      type: 'success'
    });
  } catch (error: any) {
    console.error('Failed to purchase bed:', error);
    set_move_notification({
      message: `Failed to purchase ${bed_type.name}: ${error.message || 'Unknown error'}`,
      type: 'warning'
    });
  }
};

/**
 * Load headquarters data from API
 */
export const loadHeadquarters = async (): Promise<HeadquartersState | null> => {
  try {
    const response = await apiClient.get('/headquarters');
    return response.data.headquarters;
  } catch (error) {
    console.error('Failed to load headquarters:', error);
    return null;
  }
};

/**
 * Save headquarters data to API
 */
export const saveHeadquarters = async (headquarters: HeadquartersState): Promise<boolean> => {
  try {
    await apiClient.post('/headquarters', { headquarters });
    return true;
  } catch (error) {
    console.error('Failed to save headquarters:', error);
    return false;
  }
};