'use client';

import { useState, useRef, useCallback } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import {
  Package,
  Sword,
  Shield,
  Sparkles,
  Search,
  Filter,
  Grid,
  List,
  Star,
  Lock,
  Heart,
  Trash2,
  ArrowUpDown,
  Plus,
  Minus,
  Eye,
  X,
  Check,
  AlertTriangle,
  Zap,
  Clock,
  Target,
  Settings,
  Save,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info
} from 'lucide-react';
import {
  CharacterInventory,
  InventoryItem,
  InventoryFilter,
  EquipmentLoadout,
  addItemToInventory,
  removeItemFromInventory,
  equipItem,
  unequipItem,
  setQuickAccessSlot,
  filterInventoryItems,
  sortInventoryItems,
  calculateInventoryStats,
  createLoadout,
  applyLoadout
} from '@/data/inventory';
import { Equipment } from '@/data/equipment';
import { Item } from '@/data/items';
import { equipmentCache } from '@/services/equipmentCache';
import { getEquipmentById as getEquipmentByIdAsync, getItemById as getItemByIdAsync } from '@/services/optimizedDataService';
import { characterService } from '@/services/characterService';

// Create synchronous lookups using pre-loaded data
// This will be populated by the parent component to avoid async calls in render
let equipmentDataCache = new Map<string, any>();
let itemDataCache = new Map<string, any>();

// Synchronous versions that use cached data
const getEquipmentById = (id: string) => {
  if (!id || !equipmentDataCache) return null;
  return equipmentDataCache.get(id) || null;
};

const getItemById = (id: string) => {
  if (!id || !itemDataCache) return null;
  return itemDataCache.get(id) || null;
};

// Function to populate cache from parent component
export const populateInventoryDataCache = (equipment: Equipment[], items: Item[]) => {
  let equipmentCount = 0;
  let itemCount = 0;
  
  (equipment || []).forEach(eq => {
    if (eq?.id) {
      equipmentDataCache.set(eq.id, eq);
      equipmentCount++;
    }
  });
  
  (items || []).forEach(item => {
    if (item?.id) {
      itemDataCache.set(item.id, item);
      itemCount++;
    }
  });
  
  console.log('📦 Populated inventory data cache (v2):', { 
    equipment: equipmentCount, 
    items: itemCount, 
    sample_equipment: (equipment || []).slice(0, 3).map(eq => ({ id: eq?.id, name: eq?.name, slot: eq?.slot })),
    sample_items: (items || []).slice(0, 3).map(item => ({ id: item?.id, name: item?.name, type: item?.type }))
  });
};

// Helper function for rarity colors
// Enhanced rarity styling utilities
const getRarityStyles = (rarity: string) => {
  const styles = {
    common: {
      color: 'text-gray-300',
      gradient: 'from-gray-500 to-gray-600',
      background: 'bg-gray-500/20',
      border: 'border-gray-500'
    },
    uncommon: {
      color: 'text-green-300',
      gradient: 'from-green-500 to-green-600',
      background: 'bg-green-500/20',
      border: 'border-green-500'
    },
    rare: {
      color: 'text-blue-300',
      gradient: 'from-blue-500 to-blue-600',
      background: 'bg-blue-500/20',
      border: 'border-blue-500'
    },
    epic: {
      color: 'text-purple-300',
      gradient: 'from-purple-500 to-purple-600',
      background: 'bg-purple-500/20',
      border: 'border-purple-500'
    },
    legendary: {
      color: 'text-yellow-300',
      gradient: 'from-yellow-500 to-yellow-600',
      background: 'bg-yellow-500/20',
      border: 'border-yellow-500'
    },
    mythic: {
      color: 'text-red-300',
      gradient: 'from-red-500 to-red-600',
      background: 'bg-red-500/20',
      border: 'border-red-500'
    }
  };

  return styles[rarity?.toLowerCase() as keyof typeof styles] || styles.common;
};

// Legacy function for backward compatibility
const getRarityColor = (rarity: string): string => {
  const styles = getRarityStyles(rarity);
  return styles.gradient;
};

// Placeholder functions for missing exports
// Note: getEquipmentById now needs to be async and use equipmentCache.getEquipmentById(id)
// Note: getItemById now needs to be async and use equipmentCache.getItems()
  // Enhanced equipment checking function with proper archetype and level validation
  const canEquipItem = (item: Equipment, character: { level: number; archetype: string }, slot: string): boolean => {
    // Basic slot compatibility check
    if (item.slot !== slot) {
      return false;
    }

    // Level requirement check
    if (character.level < item.required_level) {
      return false;
    }

    // Archetype requirement check (case-insensitive)
    if (item.required_archetype && !item.required_archetype.some(arch => arch.toLowerCase() === character.archetype.toLowerCase())) {
      return false;
    }

    return true;
  };

interface InventoryManagerProps {
  character: {
    id: string;
    name: string;
    avatar: string;
    archetype: string;
    level: number;
    stats: Record<string, number>;
  };
  inventory?: CharacterInventory;
  initial_inventory: CharacterInventory;
  onInventoryChange?: (inventory: CharacterInventory) => void;
  onStatsChange?: (newStats: Record<string, number>) => void;
  available_characters?: Array<{
    id: string;
    name: string;
    avatar: string;
    current_health: number;
    max_health: number;
    is_alive: boolean;
    is_dead: boolean;
  }>;
}

export default function InventoryManager({
  character,
  inventory: providedInventory,
  initial_inventory,
  onInventoryChange,
  onStatsChange,
  available_characters = []
}: InventoryManagerProps) {
  const [inventory, setInventory] = useState<CharacterInventory>(
    providedInventory || initial_inventory
  );
  const [activeTab, setActiveTab] = useState<'equipment' | 'items' | 'loadouts'>('items'); // Default to items to show consumables
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<InventoryFilter>({ type: 'all', rarity: 'all', equipped: 'all' });
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [loadouts, setLoadouts] = useState<EquipmentLoadout[]>([]);
  const [showLoadoutCreator, setShowLoadoutCreator] = useState(false);
  const [newLoadoutName, setNewLoadoutName] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [showEquipConfirmation, setShowEquipConfirmation] = useState(false);
  const [equipmentToReplace, setEquipmentToReplace] = useState<{ new_item: InventoryItem; current_item: InventoryItem; slot: 'weapon' | 'armor' | 'accessory' } | null>(null);
  
  // Health item usage state
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [itemToUse, setItemToUse] = useState<InventoryItem | null>(null);
  const [isUsingItem, setIsUsingItem] = useState(false);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);

  // Calculate inventory stats
  const inventoryStats = calculateInventoryStats(inventory);

  // Get item data with enhanced type safety and null checking
  const getItemData = useCallback((inventoryItem: InventoryItem): Equipment | Item | null => {
    if (!inventoryItem?.item_id) {
      console.warn('Invalid inventory item - missing item_id');
      return null;
    }

    // First try to use embedded data from the InventoryItem
    if ((inventoryItem as any).equipment) {
      return (inventoryItem as any).equipment;
    }
    if ((inventoryItem as any).item) {
      return (inventoryItem as any).item;
    }

    // Fallback to cache lookup
    const equipment = getEquipmentById(inventoryItem.item_id);
    if (equipment) return equipment;

    const item = getItemById(inventoryItem.item_id);
    if (item) return item;

    console.warn(`❌ Item not found anywhere:`, {
      item_id: inventoryItem.item_id,
      has_embedded_equipment: !!(inventoryItem as any).equipment,
      has_embedded_item: !!(inventoryItem as any).item,
      cache_equipment_result: equipment,
      cache_item_result: item,
      equipment_cache_size: equipmentDataCache.size,
      item_cache_size: itemDataCache.size,
      full_inventory_item: inventoryItem
    });
    return null;
  }, []);

  // Get filtered and sorted items with improved type safety and performance
  const getFilteredItems = useCallback((): InventoryItem[] => {
    let items = inventory.items || [];
    
    console.log('🔍 getFilteredItems debug:', {
      activeTab,
      total_items: items.length,
      sample_items: items.slice(0, 2).map(item => ({
        id: item.id,
        item_id: item.item_id,
        has_item_data: !!(item as any).item,
        has_equipment_data: !!(item as any).equipment
      })),
      equipment_cache_size: equipmentDataCache.size,
      item_cache_size: itemDataCache.size
    });

    // Apply tab filter with type-safe checks
    if (activeTab === 'equipment') {
      items = items.filter(item => {
        const equipment = (item as any).equipment || getEquipmentById(item.item_id);
        return equipment !== null && equipment !== undefined;
      });
    } else if (activeTab === 'items') {
      // Show ONLY consumable items (potions, materials, etc.) - NO EQUIPMENT EVER!
      items = items.filter(item => {
        console.log('🔍 Items tab filtering item:', item.item_id, item);
        
        // FIRST: If this item has ANY equipment data attached, EXCLUDE IT completely
        const attachedEquipment = (item as any).equipment;
        if (attachedEquipment) {
          console.log('🚫 EXCLUDED - Has equipment data:', attachedEquipment.name || item.item_id);
          return false;
        }
        
        // SECOND: If this item shows up in equipment cache, EXCLUDE IT completely
        const equipmentData = getEquipmentById(item.item_id);
        if (equipmentData) {
          console.log('🚫 EXCLUDED - Found in equipment cache:', equipmentData.name || item.item_id);
          return false;
        }
        
        // THIRD: Only show items from the consumables/items cache
        const gameItem = getItemById(item.item_id);
        if (gameItem) {
          console.log('✅ INCLUDED - Found in items cache:', gameItem.name || item.item_id);
          return true; // If it's in the items cache, it's a consumable
        }
        
        // FOURTH: Check attached item data for consumables
        const attachedItem = (item as any).item;
        if (attachedItem && (attachedItem.name || attachedItem.id)) {
          console.log('✅ INCLUDED - Has attached item data:', attachedItem.name || item.item_id);
          return true; // If it has item data (not equipment data), it's a consumable
        }
        
        console.log('❌ EXCLUDED - Unknown item type:', item.item_id);
        return false; // Exclude anything we can't identify as a consumable
      });
    }

    // Apply additional filters ONLY if NOT on Items tab (Items tab already filtered out all equipment)
    if (activeTab !== 'items' && filter.type && filter.type !== 'all') {
      items = items.filter(item => {
        const equipment = (item as any).equipment || getEquipmentById(item.item_id);
        const gameItem = (item as any).item || getItemById(item.item_id);

        if (filter.type === 'equipment' && equipment) return true;
        if (filter.type === 'consumables' && gameItem && gameItem.type === 'healing') return true;
        if (filter.type === 'weapon' && equipment && equipment.slot === 'weapon') return true;
        if (filter.type === 'armor' && equipment && equipment.slot === 'armor') return true;
        if (filter.type === 'accessory' && equipment && equipment.slot === 'accessory') return true;
        if (filter.type === 'enhancers' && gameItem && gameItem.type === 'enhancement') return true;
        if (filter.type === 'crafting' && gameItem && gameItem.type === 'material') return true;
        if (filter.type === 'special' && gameItem && gameItem.type === 'special') return true;

        return false;
      });
    }

    // Apply rarity filter
    if (filter.rarity && filter.rarity !== 'all') {
      items = items.filter(item => {
        const equipment = getEquipmentById(item.item_id);
        const gameItem = getItemById(item.item_id);
        const itemData = equipment || gameItem;
        return itemData?.rarity === filter.rarity;
      });
    }

    // Apply equipped filter
    if (filter.equipped && filter.equipped !== 'all') {
      items = items.filter(item => {
        if (filter.equipped === 'equipped') return item.is_equipped;
        if (filter.equipped === 'unequipped') return !item.is_equipped;
        return true;
      });
    }

    // Apply search with performance optimization
    if (filter.search?.trim()) {
      const searchTerm = filter.search.toLowerCase().trim();
      items = items.filter(item => {
        const itemData = getItemData(item);

        if (!itemData) return false;

        return itemData.name?.toLowerCase()?.includes(searchTerm) ||
               itemData.description?.toLowerCase()?.includes(searchTerm);
      });
    }

    // Apply sorting
    return items.sort((a, b) => {
      const itemDataA = getItemData(a);
      const itemDataB = getItemData(b);

      if (!itemDataA || !itemDataB) return 0;

      switch (inventory.sort_preference) {
        case 'name':
          return itemDataA.name?.localeCompare(itemDataB.name || '') || 0;
        case 'rarity': {
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
          return rarityOrder.indexOf(itemDataB.rarity || 'common') - rarityOrder.indexOf(itemDataA.rarity || 'common');
        }
        case 'type':
          if ('slot' in itemDataA && 'slot' in itemDataB) {
            return (itemDataA.slot || '').localeCompare(itemDataB.slot || '');
          } else if ('type' in itemDataA && 'type' in itemDataB) {
            return (itemDataA.type || '').localeCompare(itemDataB.type || '');
          }
          return 0;
        case 'recent':
          return new Date(b.acquired_date).getTime() - new Date(a.acquired_date).getTime();
        default:
          return 0;
      }
    });
  }, [inventory.items, inventory.sort_preference, activeTab, filter]);

  const filteredItems = getFilteredItems();

  // Calculate total character stats with equipment using memoization and type safety
  const calculateTotalStats = useCallback((): Record<string, number> => {
    const base_stats = { ...(character.stats || {}) };

    Object.values(inventory.equipped).forEach((item: InventoryItem | undefined) => {
      if (!item?.item_id) return;

      const equipment = getEquipmentById(item.item_id);
      if (equipment?.stats) {
        Object.entries(equipment.stats).forEach(([stat, value]) => {
          if (typeof value === 'number') {
            base_stats[stat] = (base_stats[stat] || 0) + value;
          }
        });
      }
    });

    return base_stats;
  }, [character.stats, inventory.equipped]);

  const totalStats = calculateTotalStats() || {};

  // Drag and drop handlers
  const handleDragStart = (item: InventoryItem) => {
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDrop = (target: string) => {
    if (!draggedItem) return;

    if (target.startsWith('equip_')) {
      const slot = target.replace('equip_', '') as 'weapon' | 'armor' | 'accessory';
      const equipment = getEquipmentById(draggedItem.item_id) as Equipment;

      if (equipment && equipment.slot === slot) {
        const result = equipItem(inventory, draggedItem.id, slot);
        if (result.success) {
          setInventory(result.updated_inventory);
          onInventoryChange?.(result.updated_inventory);
        }
      }
    } else if (target.startsWith('quick_')) {
      const slotNumber = parseInt(target.replace('quick_', '')) as 1 | 2 | 3 | 4;
      const result = setQuickAccessSlot(inventory, slotNumber, draggedItem.id);
      if (result.success) {
        setInventory(result.updated_inventory);
        onInventoryChange?.(result.updated_inventory);
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
  };

  // Equipment handlers with enhanced error handling and type safety
  const handleEquipItem = useCallback((item: InventoryItem) => {
    if (!item?.item_id) {
      console.error('Cannot equip item - invalid item data');
      return;
    }

    const equipment = getEquipmentById(item.item_id);
    if (!equipment) {
      console.error(`Equipment not found: ${item.item_id}`);
      return;
    }

    // Validate equipment requirements before attempting to equip
    if (!canEquipItem(equipment, { level: character.level, archetype: character.archetype }, equipment.slot)) {
      console.warn(`Cannot equip ${equipment.name} - requirements not met (Level: ${equipment.required_level}, Archetype: ${equipment.required_archetype?.join(', ')})`);
      return;
    }

    const slot = equipment.slot as 'weapon' | 'armor' | 'accessory';
    const currentlyEquipped = inventory.equipped[slot];

    // If slot is empty, equip directly
    if (!currentlyEquipped) {
      const result = equipItem(inventory, item.id, slot);

      if (result.success) {
        setInventory(result.updated_inventory);
        onInventoryChange?.(result.updated_inventory);

        // Recalculate stats with new equipment
        const newStats = calculateTotalStats();
        onStatsChange?.(newStats);

        // Close the item details modal on successful equip
        setShowItemDetails(false);

        console.log(`✅ Equipped ${equipment.name} to ${slot} slot`);
      } else {
        console.error(`Failed to equip item: ${result.error || 'Unknown error'}`);
      }
    } else {
      // Slot is occupied, show confirmation dialog
      setEquipmentToReplace({
        new_item: item,
        current_item: currentlyEquipped,
        slot: slot
      });
      setShowEquipConfirmation(true);
    }
  }, [inventory, character.level, character.archetype, onInventoryChange, onStatsChange, calculateTotalStats]);

  const handleConfirmEquipReplacement = useCallback(() => {
    if (!equipmentToReplace) return;

    const { new_item, slot } = equipmentToReplace;
    const result = equipItem(inventory, new_item.id, slot);

    if (result.success) {
      setInventory(result.updated_inventory);
      onInventoryChange?.(result.updated_inventory);

      // Recalculate stats with new equipment
      const newStats = calculateTotalStats();
      onStatsChange?.(newStats);

      const newEquipment = getEquipmentById(new_item.item_id);
      const oldEquipment = getEquipmentById(equipmentToReplace.current_item.item_id);

      console.log(`✅ Replaced ${oldEquipment?.name || 'item'} with ${newEquipment?.name || 'item'} in ${slot} slot`);
    } else {
      console.error(`Failed to replace equipment: ${result.error || 'Unknown error'}`);
    }

    // Close confirmation dialog
    setShowEquipConfirmation(false);
    setEquipmentToReplace(null);
    setShowItemDetails(false); // Also close item details modal
  }, [equipmentToReplace, inventory, onInventoryChange, onStatsChange, calculateTotalStats]);

  const handleUnequipItem = useCallback((slot: 'weapon' | 'armor' | 'accessory') => {
    if (!inventory.equipped[slot]) {
      console.warn(`No item equipped in ${slot} slot`);
      return;
    }

    const result = unequipItem(inventory, slot);
    if (result.success) {
      setInventory(result.updated_inventory);
      onInventoryChange?.(result.updated_inventory);

      // Recalculate stats after unequipping
      const newStats = calculateTotalStats();
      onStatsChange?.(newStats);
    } else {
      console.error(`Failed to unequip ${slot}: ${result.error || 'Unknown error'}`);
    }
  }, [inventory, onInventoryChange, onStatsChange, calculateTotalStats]);

  // Item usage with character selection
  const handleUseItem = useCallback((item: InventoryItem) => {
    if (!item?.item_id) {
      console.error('Cannot use item - invalid item data');
      return;
    }

    const gameItem = getItemById(item.item_id);
    if (!gameItem) {
      console.error(`Item not found: ${item.item_id}`);
      return;
    }

    if (gameItem.type !== 'healing') {
      console.warn(`Item ${gameItem.name} is not consumable`);
      return;
    }

    // Check if we have enough quantity
    if (item.quantity <= 0) {
      console.warn(`No ${gameItem.name} available to use`);
      return;
    }

    // If we have available characters, show character selection
    if (available_characters.length > 0) {
      setItemToUse(item);
      setShowCharacterSelect(true);
    } else {
      // Fallback to current character
      useItemOnCharacter(item, character.id);
    }
  }, [inventory, available_characters, character.id]);

  // Actually use the item on a specific character
  const useItemOnCharacter = useCallback(async (item: InventoryItem, target_character_id: string) => {
    if (!item?.item_id) return;

    setIsUsingItem(true);
    setUsageMessage(null);

    try {
      const result = await characterService.use_health_item(target_character_id, item.item_id, 1);
      
      if (result.success) {
        // Remove item from local inventory
        const inventoryResult = removeItemFromInventory(inventory, item.id, 1);
        if (inventoryResult.success) {
          setInventory(inventoryResult.updated_inventory);
          onInventoryChange?.(inventoryResult.updated_inventory);
        }

        // Show success message
        setUsageMessage(`✅ ${result.message}`);
        console.log(`✅ ${result.message}`);

        // Auto-hide message after 3 seconds
        setTimeout(() => setUsageMessage(null), 3000);
      } else {
        setUsageMessage(`❌ ${result.error}`);
        console.error('Failed to use item:', result.error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to use item';
      setUsageMessage(`❌ ${errorMsg}`);
      console.error('Error using item:', error);
    } finally {
      setIsUsingItem(false);
      setShowCharacterSelect(false);
      setItemToUse(null);
    }
  }, [inventory, onInventoryChange]);

  // Get item icon based on type with better fallback handling
  const getItemIcon = useCallback((itemData: Equipment | Item): string => {
    if (!itemData) return '❓';

    if ('slot' in itemData) {
      // Equipment icons
      const slotIcons: Record<string, string> = {
        weapon: '⚔️',
        armor: '🛡️',
        accessory: '💍'
      };
      return slotIcons[itemData.slot] || '�';
    } else {
      // Item type icons
      const typeIcons: Record<string, string> = {
        consumable: '🧪',
        enhancer: '⭐',
        crafting: '🔧',
        special: '✨'
      };
      return typeIcons[itemData.type] || '📦';
    }
  }, []);

  // Loadout management functions
  const handleCreateLoadout = useCallback(() => {
    if (!newLoadoutName.trim()) {
      console.warn('Loadout name cannot be empty');
      return;
    }

    const loadout = createLoadout(
      newLoadoutName.trim(),
      `Equipment loadout for ${character.name}`,
      inventory.equipped,
      inventory.quick_access || {},
      ['auto-generated']
    );
    setLoadouts(prev => [...prev, loadout]);
    setNewLoadoutName('');
    setShowLoadoutCreator(false);

    console.log(`Created loadout: ${loadout.name}`);
  }, [newLoadoutName, inventory.equipped]);

  const handleApplyLoadout = useCallback((loadout: EquipmentLoadout) => {
    const result = applyLoadout(inventory, loadout);
    if (result.success) {
      setInventory(result.updated_inventory);
      onInventoryChange?.(result.updated_inventory);

      // Recalculate stats with new loadout
      const newStats = calculateTotalStats();
      onStatsChange?.(newStats);

      console.log(`Applied loadout: ${loadout.name}`);
    } else {
      console.error(`Failed to apply loadout: ${result.errors.join(', ') || 'Unknown error'}`);
    }
  }, [inventory, onInventoryChange, onStatsChange, calculateTotalStats]);

  const handleDeleteLoadout = useCallback((loadoutId: string) => {
    setLoadouts(prev => prev.filter(loadout => loadout.id !== loadoutId));
    console.log(`Deleted loadout: ${loadoutId}`);
  }, []);

  // Filter and form handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, search: e.target.value }));
  }, []);

  const handleRarityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(prev => ({ ...prev, rarity: e.target.value as InventoryFilter['rarity'] }));
  }, []);

  const handleEquippedChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(prev => ({ ...prev, equipped: e.target.value as InventoryFilter['equipped'] }));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4">
      {/* Header - Mobile-optimized layout */}
      <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-700 space-y-3">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-3xl sm:text-4xl">{character.avatar}</div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                <span className="break-words">{character.name}'s Inventory</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-400">Level {character.level} {character.archetype}</p>
            </div>
          </div>

          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-sm self-start sm:self-auto"
          >
            <Eye className="w-4 h-4" />
            {showStats ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Enhanced Inventory Stats - Improved Mobile Layout */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-700/30 rounded-lg">
            <div className="text-xl font-bold text-blue-400">{filteredItems.length}</div>
            <div className="text-sm text-gray-400">Items Showing</div>
          </div>
          <div className="text-center p-3 bg-gray-700/30 rounded-lg">
            <div className="text-xl font-bold text-green-400">{inventoryStats.available_slots}</div>
            <div className="text-sm text-gray-400">Free Slots</div>
          </div>
          <div className="text-center p-3 bg-gray-700/30 rounded-lg">
            <div className="text-xl font-bold text-purple-400">{inventoryStats.equipped_items}</div>
            <div className="text-sm text-gray-400">Equipped</div>
          </div>
          <div className="text-center p-3 bg-gray-700/30 rounded-lg">
            <div className="text-xl font-bold text-yellow-400">{inventoryStats.used_slots}/{inventory.max_slots}</div>
            <div className="text-sm text-gray-400">Total Used</div>
          </div>
        </div>
      </div>

      {/* Character Stats Panel - Compact */}
      <AnimatePresence>
        {showStats && (
          <SafeMotion as="div"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            class_name="bg-gray-900/50 rounded-lg border border-gray-700 p-4"
          >
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              Character Stats
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(totalStats || {}).map(([stat, value]) => {
                const baseStat = (character.stats && character.stats[stat]) || 0;
                const bonus = value - baseStat;

                return (
                  <div key={stat} className="text-center bg-gray-800/50 rounded p-2">
                    <div className="text-lg font-bold text-white mb-1">
                      {value}
                      {bonus > 0 && (
                        <span className="text-green-400 text-xs ml-1">+{bonus}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 uppercase">{stat}</div>
                  </div>
                );
              })}
            </div>
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Compact Equipment Slots & Quick Actions - Only show on Equipment tab */}
      {activeTab === 'equipment' && (
      <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          Equipment Slots
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
            const equippedItem = inventory.equipped[slot];
            const itemData = equippedItem ? getItemData(equippedItem) : null;

            return (
              <div
                key={slot}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-all min-h-[100px] flex flex-col justify-center ${
                  dropTarget === `equip_${slot}`
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(`equip_${slot}`);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(`equip_${slot}`);
                }}
              >
                <div className="text-3xl mb-2">
                  {equippedItem ? getItemIcon(itemData!) :
                   slot === 'weapon' ? '⚔️' :
                   slot === 'armor' ? '🛡️' : '💍'}
                </div>

                {equippedItem && itemData ? (
                  <div className="space-y-1">
                    <h3 className={`font-bold text-sm ${getRarityColor(itemData.rarity).replace('from-', 'text-').replace('to-', '').split(' ')[0]}`}>
                      {itemData.name}
                    </h3>
                    <button
                      onClick={() => handleUnequipItem(slot)}
                      className="text-red-400 hover:text-red-300 text-xs transition-colors px-2 py-1 bg-red-600/10 rounded"
                    >
                      Unequip
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-bold text-gray-400 text-xs capitalize">{slot}</h3>
                    <p className="text-xs text-gray-500">Empty</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Consumable Slots - Character-specific */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-2">Consumable Items</h3>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((slotNumber) => {
              const slotItem = inventory.quick_access?.[`slot${slotNumber}` as keyof typeof inventory.quick_access];
              const itemData = slotItem ? getItemData(slotItem) : null;

              return (
                <div
                  key={slotNumber}
                  className={`border-2 border-dashed rounded-lg p-2 text-center transition-all ${
                    dropTarget === `quick_${slotNumber}`
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTarget(`quick_${slotNumber}`);
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(`quick_${slotNumber}`);
                  }}
                >
                  <div className="text-lg mb-1">
                    {slotItem ? getItemIcon(itemData!) : '📦'}
                  </div>
                  <div className="text-xs">
                    {slotItem && itemData ? (
                      <div>
                        <div className="font-semibold text-white truncate">{slotItem.quantity}</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">{slotNumber}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Tab Navigation - Mobile Friendly */}
      <div className="flex justify-center">
        <div className="bg-gray-800/50 rounded-lg p-1 flex gap-1 w-full max-w-md">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm ${
              activeTab === 'equipment'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Sword className="w-4 h-4" />
            <span className="hidden sm:inline">Equipment</span>
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm ${
              activeTab === 'items'
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Items</span>
          </button>
          <button
            onClick={() => setActiveTab('loadouts')}
            className={`flex-1 px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm ${
              activeTab === 'loadouts'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Loadouts</span>
          </button>
        </div>
      </div>

      {/* Consumable Items - Prominent Display on Items Tab */}
      {activeTab === 'items' && (
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg border border-green-500/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            Consumable Items
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredItems.filter(item => {
              const itemData = getItemData(item);
              return itemData && !('slot' in itemData); // Only consumables, no equipment
            }).map((item) => {
              const itemData = getItemData(item);
              if (!itemData) return null;
              
              return (
                <div
                  key={item.id}
                  className="bg-gray-800/70 border border-green-500/30 rounded-lg p-3 text-center hover:bg-gray-700/70 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedItem(item);
                    setShowItemDetails(true);
                  }}
                >
                  <div className="text-3xl mb-2">{getItemIcon(itemData)}</div>
                  <div className="text-sm font-semibold text-white truncate">{itemData.name}</div>
                  <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
                  {(itemData as Item).effects && (
                    <div className="text-xs text-green-400 mt-1">
                      {(itemData as Item).effects.map(effect => 
                        `${effect.type === 'heal' ? '❤️' : effect.type === 'energy_restore' ? '⚡' : '✨'} ${effect.value}`
                      ).join(' ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {filteredItems.filter(item => {
            const itemData = getItemData(item);
            return itemData && !('slot' in itemData);
          }).length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🧪</div>
              <div className="text-gray-400">No consumable items found</div>
              <div className="text-sm text-gray-500 mt-1">Visit the shop to buy health potions and other items</div>
            </div>
          )}
        </div>
      )}

      {/* Quick Access Consumable Slots - Items Tab Only */}
      {activeTab === 'items' && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-600 p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Quick Access Slots ({Object.keys(inventory.quick_access || {}).filter(key => key.startsWith('slot') && inventory.quick_access![key as keyof typeof inventory.quick_access]).length}/2)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((slotNumber) => {
              const slotKey = `slot${slotNumber}` as keyof typeof inventory.quick_access;
              const slotItem = inventory.quick_access?.[slotKey];
              const itemData = slotItem ? getItemData(slotItem) : null;

              return (
                <div
                  key={slotNumber}
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-all min-h-[120px] flex flex-col justify-center ${
                    dropTarget === `quick_${slotNumber}`
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-900/30'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTarget(`quick_${slotNumber}`);
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(`quick_${slotNumber}`);
                  }}
                >
                  <div className="text-3xl mb-2">
                    {slotItem ? getItemIcon(itemData!) : `${slotNumber}️⃣`}
                  </div>
                  
                  {slotItem && itemData ? (
                    <div className="space-y-2">
                      <div className="font-semibold text-white text-sm truncate">{itemData.name}</div>
                      <div className="text-xs text-gray-400">Qty: {slotItem.quantity}</div>
                      {(itemData as Item).effects && (
                        <div className="text-xs text-green-400">
                          {(itemData as Item).effects.map(effect => 
                            `${effect.type === 'heal' ? '❤️' : effect.type === 'energy_restore' ? '⚡' : '✨'} ${effect.value}`
                          ).join(' ')}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          // Remove from quick access slot
                          setInventory(prev => ({
                            ...prev,
                            quick_access: {
                              ...prev.quick_access,
                              [slotKey]: undefined
                            }
                          }));
                        }}
                        className="text-red-400 hover:text-red-300 text-xs transition-colors px-2 py-1 bg-red-600/10 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold text-gray-400 text-sm">Slot {slotNumber}</div>
                      <div className="text-xs text-gray-500 mt-1">Drag item here</div>
                      <div className="text-xs text-gray-600 mt-2">For quick use in battle</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-xs text-gray-400 mt-3 text-center">
            Drag consumable items here for quick access during battles
          </div>
        </div>
      )}

      {/* Filters and Search - Mobile First */}
      {activeTab !== 'loadouts' && (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={filter.search || ''}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select
                value={filter.type || 'all'}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as InventoryFilter['type'] }))}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="equipment">All Equipment</option>
                <option value="weapon">Weapons</option>
                <option value="armor">Armor</option>
                <option value="accessory">Accessories</option>
                <option value="consumables">Consumables</option>
                <option value="enhancers">Enhancers</option>
                <option value="crafting">Materials</option>
                <option value="special">Special</option>
              </select>

              <select
                value={filter.rarity}
                onChange={handleRarityChange}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="mythic">Mythic</option>
              </select>

              <select
                value={filter.equipped}
                onChange={handleEquippedChange}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="all">All Items</option>
                <option value="equipped">Equipped</option>
                <option value="unequipped">Unequipped</option>
              </select>

              <select
                value={inventory.sort_preference}
                onChange={(e) => {
                  const newInventory = {
                    ...inventory,
                    sort_preference: e.target.value as any
                  };
                  setInventory(newInventory);
                  onInventoryChange?.(newInventory);
                }}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="type">Sort by Type</option>
                <option value="name">Sort by Name</option>
                <option value="rarity">Sort by Rarity</option>
                <option value="recent">Sort by Recent</option>
              </select>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{filteredItems.length} items</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Grid/List - Mobile First */}
      {activeTab !== 'loadouts' && (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
          <div className={`grid gap-3 ${
            viewMode === 'grid'
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
              : 'grid-cols-1'
          }`}>
            {filteredItems.map((item) => {
              try {
                const itemData = getItemData(item);
                if (!itemData) {
                  console.warn(`Item data not found for item: ${item.item_id}`);
                  // Fallback: render item with basic info even if itemData is missing
                  return (
                    <div
                      key={item.id}
                      className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-center"
                    >
                      <div className="text-2xl">❓</div>
                      <div className="text-xs text-red-300">Missing Data</div>
                      <div className="text-xs text-gray-400">{item.item_id}</div>
                      <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
                    </div>
                  );
                }

                const isEquipment = 'slot' in itemData;
                const canEquip = isEquipment && !item.is_equipped &&
                  canEquipItem(itemData as Equipment, { level: character.level, archetype: character.archetype }, (itemData as Equipment).slot);

                // Get detailed reason why item can't be equipped
                const getEquipmentRestriction = (): string | null => {
                  if (!isEquipment) return null;
                  if (item.is_equipped) return 'Already equipped';

                  const equipment = itemData as Equipment;
                  if (character.level < equipment.required_level) {
                    return `Requires level ${equipment.required_level} (you are level ${character.level})`;
                  }
                  if (equipment.required_archetype && !equipment.required_archetype.some(arch => arch.toLowerCase() === character.archetype.toLowerCase())) {
                    return `Requires archetype: ${equipment.required_archetype.join(' or ')} (you are ${character.archetype})`;
                  }
                  return null;
                };

                const equipmentRestriction = getEquipmentRestriction();
                const rarityStyles = getRarityStyles(itemData.rarity);

                return (
                  <SafeMotion as="div"
                    key={item.id}
                    layout
                    class_name={`border rounded-lg cursor-pointer transition-all relative ${
                      item.is_equipped
                        ? 'border-green-500 bg-green-500/10'
                        : equipmentRestriction
                        ? 'border-red-500/50 bg-red-500/5'
                        : 'border-gray-600 hover:border-blue-500'
                    } ${viewMode === 'list' ? 'flex gap-3 p-3' : 'p-3'}`}
                    draggable
                    onDragStart={() => handleDragStart(item)}
                    onDragEnd={handleDragEnd}
                    while_hover={{ scale: viewMode === 'grid' ? 1.02 : 1 }}
                    onClick={() => {
                      setSelectedItem(item);
                      setShowItemDetails(true);
                    }}
                  >
                    <div className={`${viewMode === 'list' ? 'w-12 h-12' : 'aspect-square mb-2'} bg-gradient-to-br ${rarityStyles.gradient}/20 rounded-lg flex items-center justify-center relative`}>
                      <div className={viewMode === 'list' ? 'text-xl' : 'text-2xl'}>{getItemIcon(itemData)}</div>

                      {/* Restriction overlay */}
                      {equipmentRestriction && (
                        <div className="absolute inset-0 bg-red-900/50 rounded-lg flex items-center justify-center">
                          <Lock className="w-4 h-4 text-red-300" />
                        </div>
                      )}

                      {/* Quantity badge */}
                      {item.quantity > 1 && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full min-w-[16px] text-center">
                          {item.quantity}
                        </div>
                      )}

                      {/* Status badges */}
                      <div className="absolute top-1 left-1 flex flex-col gap-1">
                        {item.is_equipped && (
                          <div className="bg-green-500 text-white text-xs px-1 py-0.5 rounded">E</div>
                        )}
                        {item.is_locked && (
                          <Lock className="w-3 h-3 text-yellow-400" />
                        )}
                        {item.is_favorite && (
                          <Heart className="w-3 h-3 text-red-400 fill-current" />
                        )}
                      </div>
                    </div>

                    <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <h3 className={`font-bold text-sm ${getRarityColor(itemData.rarity).replace('from-', 'text-').replace('to-', '').split(' ')[0]} mb-1`}>
                        {viewMode === 'grid' && itemData.name.length > 12
                          ? itemData.name.substring(0, 12) + '...'
                          : itemData.name}
                      </h3>
                      <p className="text-xs text-gray-400 capitalize mb-2">{itemData.rarity}</p>

                      {/* Show restriction message */}
                      {equipmentRestriction && (
                        <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          {equipmentRestriction.length > 30 && viewMode === 'grid'
                            ? equipmentRestriction.substring(0, 30) + '...'
                            : equipmentRestriction}
                        </p>
                      )}

                      {viewMode === 'list' && (
                        <p className="text-xs text-gray-300 mb-2">{itemData.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          {isEquipment && (
                            <span className="text-blue-400 capitalize">{(itemData as Equipment).slot}</span>
                          )}
                          {!isEquipment && (
                            <span className="text-green-400 capitalize">{(itemData as Item).type}</span>
                          )}
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex gap-1">
                          {/* Show Equip button only if item can be equipped */}
                          {canEquip && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEquipItem(item);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors"
                            >
                              Equip
                            </button>
                          )}

                          {/* Show restriction reason if equipment can't be equipped */}
                          {isEquipment && equipmentRestriction && (
                            <div
                              className="bg-red-600/20 border border-red-500/50 text-red-300 text-xs px-2 py-1 rounded cursor-help"
                              title={equipmentRestriction}
                            >
                              <Lock className="w-3 h-3" />
                            </div>
                          )}

                          {/* Show Use button for consumable items */}
                          {!isEquipment && (itemData as Item).type === 'healing' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUseItem(item);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
                            >
                              Use
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </SafeMotion>
                );
              } catch (error) {
                console.error(`Error rendering item ${item.id}:`, error);
                return null;
              }
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Items Found</h3>
              <p className="text-gray-500">
                {filter.search || filter.rarity !== 'all' || filter.equipped !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Your inventory is empty'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loadouts Tab */}
      {activeTab === 'loadouts' && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Equipment Loadouts</h2>
            <button
              onClick={() => setShowLoadoutCreator(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Loadout
            </button>
          </div>

          {loadouts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadouts.map((loadout) => (
                <div key={loadout.id} className="border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white">{loadout.name}</h3>
                    {loadout.is_active && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">ACTIVE</span>
                    )}
                  </div>

                  {loadout.description && (
                    <p className="text-sm text-gray-400 mb-3">{loadout.description}</p>
                  )}

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                        const result = applyLoadout(inventory, loadout);
                        if (result.success) {
                          setInventory(result.updated_inventory);
                          onInventoryChange?.(result.updated_inventory);
                        }
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setLoadouts(loadouts.filter(l => l.id !== loadout.id));
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-gray-500">
                    Created {loadout.created_date.toLocaleDateString()}
                    {loadout.last_used && (
                      <div>Last used {loadout.last_used.toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Save className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Loadouts Saved</h3>
              <p className="text-gray-500 mb-4">
                Create loadouts to quickly switch between equipment configurations
              </p>
              <button
                onClick={() => setShowLoadoutCreator(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Create Your First Loadout
              </button>
            </div>
          )}
        </div>
      )}

      {/* Item Details Modal */}
      <AnimatePresence>
        {showItemDetails && selectedItem && (
          <SafeMotion as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowItemDetails(false)}
          >
            <SafeMotion as="div"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const itemData = getItemData(selectedItem);
                if (!itemData) return null;

                const isEquipment = 'slot' in itemData;

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">{itemData.name}</h3>
                      <button
                        onClick={() => setShowItemDetails(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className={`aspect-square w-24 mx-auto bg-gradient-to-br ${getRarityColor(itemData.rarity)}/20 rounded-lg flex items-center justify-center`}>
                        <div className="text-4xl">{getItemIcon(itemData)}</div>
                      </div>

                      <div className="text-center">
                        <div className={`text-lg font-bold ${getRarityColor(itemData.rarity).replace('from-', 'text-').replace('to-', '').split(' ')[0]} mb-1`}>
                          {itemData.rarity.charAt(0).toUpperCase() + itemData.rarity.slice(1)}
                        </div>
                        {isEquipment && (
                          <div className="text-sm text-blue-400 capitalize">{(itemData as Equipment).slot}</div>
                        )}
                        {!isEquipment && (
                          <div className="text-sm text-green-400 capitalize">{(itemData as Item).type}</div>
                        )}
                      </div>

                      <p className="text-gray-300 text-center">{itemData.description}</p>

                      {isEquipment && (itemData as Equipment).stats && (
                        <div>
                          <h4 className="font-semibold text-white mb-2">Stats:</h4>
                          <div className="space-y-1">
                            {Object.entries((itemData as Equipment).stats || {}).map(([stat, value]) => (
                              <div key={stat} className="flex justify-between">
                                <span className="text-gray-400 capitalize">{stat}:</span>
                                <span className="text-green-400">+{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Equipment Requirements */}
                      {isEquipment && (
                        <div>
                          <h4 className="font-semibold text-white mb-2">Requirements:</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Level:</span>
                              <span className={character.level >= (itemData as Equipment).required_level ? 'text-green-400' : 'text-red-400'}>
                                {(itemData as Equipment).required_level}
                                {character.level >= (itemData as Equipment).required_level ? ' ✓' : ` (you are ${character.level})`}
                              </span>
                            </div>
                            {(itemData as Equipment).required_archetype && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Archetype:</span>
                                <span className={(itemData as Equipment).required_archetype!.some(arch => arch.toLowerCase() === character.archetype.toLowerCase()) ? 'text-green-400' : 'text-red-400'}>
                                  {(itemData as Equipment).required_archetype!.join(' or ')}
                                  {(itemData as Equipment).required_archetype!.some(arch => arch.toLowerCase() === character.archetype.toLowerCase()) ? ' ✓' : ` (you are ${character.archetype})`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedItem.quantity > 1 && (
                        <div className="text-center">
                          <span className="text-gray-400">Quantity: </span>
                          <span className="text-white font-bold">{selectedItem.quantity}</span>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        {/* Show Equip button only if item can be equipped */}
                        {isEquipment && !selectedItem.is_equipped && (
                          <>
                            {canEquipItem(itemData as Equipment, { level: character.level, archetype: character.archetype }, (itemData as Equipment).slot) ? (
                              <button
                                onClick={() => {
                                  handleEquipItem(selectedItem);
                                  // Don't automatically close modal - let the equip handler decide
                                  // based on whether confirmation is needed
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-colors"
                              >
                                Equip
                              </button>
                            ) : (
                              <div className="flex-1">
                                <div className="bg-red-600/20 border border-red-500/50 text-red-300 py-2 px-4 rounded-lg text-center text-sm">
                                  <div className="flex items-center justify-center gap-2 mb-1">
                                    <Lock className="w-4 h-4" />
                                    <span className="font-semibold">Cannot Equip</span>
                                  </div>
                                  <div className="text-xs">
                                    {(() => {
                                      const equipment = itemData as Equipment;
                                      if (character.level < equipment.required_level) {
                                        return `Requires level ${equipment.required_level} (you are level ${character.level})`;
                                      }
                                      if (equipment.required_archetype && !equipment.required_archetype.some(arch => arch.toLowerCase() === character.archetype.toLowerCase())) {
                                        return `Requires: ${equipment.required_archetype.join(' or ')} (you are ${character.archetype})`;
                                      }
                                      return 'Requirements not met';
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {!isEquipment && (itemData as Item).type === 'healing' && (
                          <button
                            onClick={() => {
                              handleUseItem(selectedItem);
                              setShowItemDetails(false);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors"
                          >
                            Use Item
                          </button>
                        )}

                        <button
                          onClick={() => setShowItemDetails(false)}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Equipment Replacement Confirmation Modal */}
      <AnimatePresence>
        {showEquipConfirmation && equipmentToReplace && (
          <SafeMotion as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowEquipConfirmation(false);
              setEquipmentToReplace(null);
            }}
          >
            <SafeMotion as="div"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Replace Equipment?
                </h3>
                <button
                  onClick={() => {
                    setShowEquipConfirmation(false);
                    setEquipmentToReplace(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {(() => {
                  const newItemData = getItemData(equipmentToReplace.new_item);
                  const currentItemData = getItemData(equipmentToReplace.current_item);

                  if (!newItemData || !currentItemData) return null;

                  return (
                    <>
                      <p className="text-gray-300 text-center">
                        You currently have <span className="text-blue-400 font-semibold">{currentItemData.name}</span> equipped in your {equipmentToReplace.slot} slot.
                      </p>

                      <p className="text-gray-300 text-center">
                        Do you want to replace it with <span className="text-green-400 font-semibold">{newItemData.name}</span>?
                      </p>

                      {/* Equipment Comparison */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {/* Current Equipment */}
                        <div className="bg-gray-800 rounded-lg p-3 border border-red-500/30">
                          <div className="text-center mb-2">
                            <div className="text-red-400 font-semibold text-sm">Currently Equipped</div>
                            <div className="text-white font-bold">{currentItemData.name}</div>
                            <div className={`text-xs ${getRarityColor(currentItemData.rarity).replace('from-', 'text-').replace('to-', '').split(' ')[0]}`}>
                              {currentItemData.rarity.charAt(0).toUpperCase() + currentItemData.rarity.slice(1)}
                            </div>
                          </div>
                          {('stats' in currentItemData) && currentItemData.stats && (
                            <div className="space-y-1">
                              {Object.entries(currentItemData.stats).map(([stat, value]) => (
                                <div key={stat} className="flex justify-between text-xs">
                                  <span className="text-gray-400 capitalize">{stat}:</span>
                                  <span className="text-red-400">+{value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* New Equipment */}
                        <div className="bg-gray-800 rounded-lg p-3 border border-green-500/30">
                          <div className="text-center mb-2">
                            <div className="text-green-400 font-semibold text-sm">New Equipment</div>
                            <div className="text-white font-bold">{newItemData.name}</div>
                            <div className={`text-xs ${getRarityColor(newItemData.rarity).replace('from-', 'text-').replace('to-', '').split(' ')[0]}`}>
                              {newItemData.rarity.charAt(0).toUpperCase() + newItemData.rarity.slice(1)}
                            </div>
                          </div>
                          {('stats' in newItemData) && newItemData.stats && (
                            <div className="space-y-1">
                              {Object.entries(newItemData.stats).map(([stat, value]) => (
                                <div key={stat} className="flex justify-between text-xs">
                                  <span className="text-gray-400 capitalize">{stat}:</span>
                                  <span className="text-green-400">+{value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => {
                            setShowEquipConfirmation(false);
                            setEquipmentToReplace(null);
                          }}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmEquipReplacement}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-colors"
                        >
                          Replace Equipment
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Loadout Creator Modal */}
      <AnimatePresence>
        {showLoadoutCreator && (
          <SafeMotion as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowLoadoutCreator(false)}
          >
            <SafeMotion as="div"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Create Loadout</h3>
                <button
                  onClick={() => setShowLoadoutCreator(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Loadout Name</label>
                  <input
                    type="text"
                    value={newLoadoutName}
                    onChange={(e) => setNewLoadoutName(e.target.value)}
                    placeholder="My Epic Loadout"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="text-sm text-gray-400">
                  This will save your current equipment and quick access configuration.
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowLoadoutCreator(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newLoadoutName.trim()) {
                        const newLoadout = createLoadout(
                          newLoadoutName,
                          'Custom loadout',
                          inventory.equipped,
                          inventory.quick_access
                        );
                        setLoadouts([...loadouts, newLoadout]);
                        setNewLoadoutName('');
                        setShowLoadoutCreator(false);
                      }
                    }}
                    disabled={!newLoadoutName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Character Selection Modal for Health Items */}
      <AnimatePresence>
        {showCharacterSelect && itemToUse && (
          <SafeMotion
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowCharacterSelect(false);
              setItemToUse(null);
            }}
          >
            <SafeMotion
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-400" />
                  Use {getItemData(itemToUse)?.name}
                </h3>
                <button
                  onClick={() => {
                    setShowCharacterSelect(false);
                    setItemToUse(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Usage message */}
              {usageMessage && (
                <div className={`p-3 rounded-lg mb-4 ${
                  usageMessage.includes('✅') 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {usageMessage}
                </div>
              )}

              {/* Character Selection */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                <p className="text-gray-400 text-sm mb-3">
                  Select which character should use this item:
                </p>
                
                {available_characters.filter(char => char.is_alive && !char.is_dead).map((char) => {
                  const healthPercent = Math.round((char.current_health / char.max_health) * 100);
                  const needsHealing = char.current_health < char.max_health;
                  
                  return (
                    <button
                      key={char.id}
                      onClick={() => useItemOnCharacter(itemToUse, char.id)}
                      disabled={isUsingItem}
                      className={`w-full p-3 rounded-lg transition-colors text-left ${
                        needsHealing
                          ? 'bg-gray-800 hover:bg-gray-700 border border-gray-600'
                          : 'bg-gray-800/50 border border-gray-700 opacity-75'
                      } ${isUsingItem ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{char.avatar}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">{char.name}</div>
                          <div className="text-sm text-gray-400">
                            Health: {char.current_health} / {char.max_health} ({healthPercent}%)
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${
                                healthPercent > 75 ? 'bg-green-500' :
                                healthPercent > 50 ? 'bg-yellow-500' :
                                healthPercent > 25 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${healthPercent}%` }}
                            />
                          </div>
                        </div>
                        {!needsHealing && (
                          <div className="text-xs text-gray-500">
                            Full Health
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {available_characters.filter(char => char.is_alive && !char.is_dead).length === 0 && (
                  <div className="text-center text-gray-400 py-4">
                    No characters available for healing
                  </div>
                )}
              </div>

              {/* Cancel button */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCharacterSelect(false);
                    setItemToUse(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  disabled={isUsingItem}
                >
                  Cancel
                </button>
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
