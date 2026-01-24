// Equipment Crafting and Progression System
// Complete crafting mechanics with materials, recipes, and progression

import { Equipment, EquipmentRarity } from './equipment';
import { Item } from './items';

export interface CraftingMaterial {
  id: string;
  name: string;
  description: string;
  rarity: EquipmentRarity;
  icon: string;
  stackable: boolean;
  max_stack: number;
  obtain_method: 'drop' | 'salvage' | 'mine' | 'harvest' | 'battle' | 'shop';
  value: number;
}

export interface CraftingRecipe {
  id: string;
  result_equipment_id: string;
  name: string;
  description: string;
  category: 'weapon' | 'armor' | 'accessory' | 'upgrade';
  required_level: number;
  required_skill?: string;
  required_skill_level?: number;
  
  materials: {
    material_id: string;
    quantity: number;
  }[];
  
  gold: number;
  crafting_time: number; // in minutes
  experience_gained: number;
  success_rate: number; // 0-100
  
  // Upgrade-specific
  base_equipment_id?: string; // For upgrades
  preserve_enchantments?: boolean;
  
  unlock_conditions?: {
    completed_quests?: string[];
    defeated_enemies?: string[];
    discovered_recipes?: string[];
    character_level?: number;
  };
}

export interface CraftingStation {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  categories: ('weapon' | 'armor' | 'accessory' | 'upgrade')[];
  bonuses: {
    success_rateBonus: number;
    time_reduction: number;
    material_saving: number; // percentage chance to save materials
    experience_bonus: number;
  };
  required_materials?: {
    material_id: string;
    quantity: number;
  }[];
  cost: number;
}

export interface PlayerCrafting {
  crafting_level: number;
  crafting_experience: number;
  unlocked_recipes: string[];
  owned_stations: string[];
  active_crafts: {
    recipe_id: string;
    start_time: Date;
    completionTime: Date;
    station_id?: string;
  }[];
  materials: {
    material_id: string;
    quantity: number;
  }[];
}

// Crafting materials database
export const craftingMaterials: CraftingMaterial[] = [
  // Basic materials
  {
    id: 'iron_ore',
    name: 'Iron Ore',
    description: 'Raw iron ore for basic metalwork',
    rarity: 'common',
    icon: '⚫',
    stackable: true,
    max_stack: 999,
    obtain_method: 'mine',
    value: 5
  },
  {
    id: 'leather_hide',
    name: 'Leather Hide',
    description: 'Tough animal hide for armor crafting',
    rarity: 'common',
    icon: '🦬',
    stackable: true,
    max_stack: 99,
    obtain_method: 'drop',
    value: 8
  },
  {
    id: 'wood_plank',
    name: 'Wood Plank',
    description: 'Sturdy wooden plank for weapon handles',
    rarity: 'common',
    icon: '🪵',
    stackable: true,
    max_stack: 999,
    obtain_method: 'harvest',
    value: 3
  },
  
  // Rare materials
  {
    id: 'mithril_ore',
    name: 'Mithril Ore',
    description: 'Legendary light metal with magical properties',
    rarity: 'rare',
    icon: '✨',
    stackable: true,
    max_stack: 99,
    obtain_method: 'mine',
    value: 100
  },
  {
    id: 'dragon_scale',
    name: 'Dragon Scale',
    description: 'Incredibly tough scale from an ancient dragon',
    rarity: 'epic',
    icon: '🐲',
    stackable: true,
    max_stack: 10,
    obtain_method: 'battle',
    value: 500
  },
  {
    id: 'phoenix_feather',
    name: 'Phoenix Feather',
    description: 'Mystical feather that burns with eternal flame',
    rarity: 'legendary',
    icon: '🪶',
    stackable: true,
    max_stack: 5,
    obtain_method: 'battle',
    value: 2000
  },
  
  // Historical materials
  {
    id: 'bronze_ingot',
    name: 'Bronze Ingot',
    description: 'Refined bronze for ancient weaponry',
    rarity: 'common',
    icon: '🟫',
    stackable: true,
    max_stack: 99,
    obtain_method: 'shop',
    value: 12
  },
  {
    id: 'steel_ingot',
    name: 'Steel Ingot',
    description: 'High-quality steel for medieval weapons',
    rarity: 'uncommon',
    icon: '⚪',
    stackable: true,
    max_stack: 99,
    obtain_method: 'shop',
    value: 25
  },
  {
    id: 'titanium_alloy',
    name: 'Titanium Alloy',
    description: 'Advanced metal alloy for futuristic equipment',
    rarity: 'rare',
    icon: '🔹',
    stackable: true,
    max_stack: 50,
    obtain_method: 'salvage',
    value: 150
  },
  
  // Magical components
  {
    id: 'mana_crystal',
    name: 'Mana Crystal',
    description: 'Crystallized magical energy',
    rarity: 'uncommon',
    icon: '💎',
    stackable: true,
    max_stack: 50,
    obtain_method: 'drop',
    value: 40
  },
  {
    id: 'rune_stone',
    name: 'Rune Stone',
    description: 'Ancient stone inscribed with mystical runes',
    rarity: 'rare',
    icon: '🗿',
    stackable: true,
    max_stack: 20,
    obtain_method: 'drop',
    value: 200
  },
  {
    id: 'void_essence',
    name: 'Void Essence',
    description: 'Dark energy from the space between worlds',
    rarity: 'mythic',
    icon: '🌑',
    stackable: true,
    max_stack: 3,
    obtain_method: 'battle',
    value: 5000
  }
];

// Crafting stations
export const craftingStations: CraftingStation[] = [
  {
    id: 'basic_forge',
    name: 'Basic Forge',
    description: 'Simple forge for basic metalworking',
    icon: '🔥',
    level: 1,
    categories: ['weapon', 'armor'],
    bonuses: {
      success_rateBonus: 0,
      time_reduction: 0,
      material_saving: 0,
      experience_bonus: 0
    },
    cost: 500
  },
  {
    id: 'master_forge',
    name: 'Master Forge',
    description: 'Advanced forge with magical enhancements',
    icon: '⚒️',
    level: 2,
    categories: ['weapon', 'armor', 'upgrade'],
    bonuses: {
      success_rateBonus: 15,
      time_reduction: 25,
      material_saving: 10,
      experience_bonus: 25
    },
    required_materials: [
      { material_id: 'mithril_ore', quantity: 10 },
      { material_id: 'rune_stone', quantity: 3 }
    ],
    cost: 2500
  },
  {
    id: 'enchanting_table',
    name: 'Enchanting Table',
    description: 'Mystical table for magical enhancements',
    icon: '🔮',
    level: 1,
    categories: ['accessory', 'upgrade'],
    bonuses: {
      success_rateBonus: 20,
      time_reduction: 0,
      material_saving: 5,
      experience_bonus: 50
    },
    required_materials: [
      { material_id: 'mana_crystal', quantity: 20 },
      { material_id: 'rune_stone', quantity: 5 }
    ],
    cost: 1500
  },
  {
    id: 'quantum_fabricator',
    name: 'Quantum Fabricator',
    description: 'Futuristic device for advanced manufacturing',
    icon: '🛸',
    level: 3,
    categories: ['weapon', 'armor', 'accessory', 'upgrade'],
    bonuses: {
      success_rateBonus: 30,
      time_reduction: 50,
      material_saving: 25,
      experience_bonus: 75
    },
    required_materials: [
      { material_id: 'titanium_alloy', quantity: 50 },
      { material_id: 'void_essence', quantity: 1 }
    ],
    cost: 10000
  }
];

// Crafting recipes
export const craftingRecipes: CraftingRecipe[] = [
  // Basic weapon crafting
  {
    id: 'craft_iron_sword',
    result_equipment_id: 'iron_sword',
    name: 'Iron Sword',
    description: 'Craft a basic iron sword',
    category: 'weapon',
    required_level: 1,
    materials: [
      { material_id: 'iron_ore', quantity: 5 },
      { material_id: 'wood_plank', quantity: 2 }
    ],
    gold: 50,
    crafting_time: 30,
    experience_gained: 25,
    success_rate: 90
  },
  
  // Character-specific weapon upgrades
  {
    id: 'upgrade_achilles_spear',
    result_equipment_id: 'iron_sword_achilles',
    name: 'Upgrade Achilles Spear',
    description: 'Upgrade bronze spear to iron sword of Troy',
    category: 'upgrade',
    required_level: 15,
    base_equipment_id: 'bronze_spear_achilles',
    materials: [
      { material_id: 'steel_ingot', quantity: 3 },
      { material_id: 'rune_stone', quantity: 1 }
    ],
    gold: 200,
    crafting_time: 60,
    experience_gained: 100,
    success_rate: 75,
    preserve_enchantments: true
  },
  
  {
    id: 'craft_divine_shield',
    result_equipment_id: 'shield_invulnerability',
    name: 'Divine Shield',
    description: 'Forge the legendary shield of invulnerability',
    category: 'upgrade',
    required_level: 30,
    base_equipment_id: 'iron_sword_achilles',
    materials: [
      { material_id: 'mithril_ore', quantity: 10 },
      { material_id: 'phoenix_feather', quantity: 1 },
      { material_id: 'dragon_scale', quantity: 3 }
    ],
    gold: 1000,
    crafting_time: 180,
    experience_gained: 500,
    success_rate: 50,
    unlock_conditions: {
      character_level: 25,
      completed_quests: ['divine_blessing_quest']
    }
  },
  
  // Merlin's staff progression
  {
    id: 'upgrade_merlin_staff',
    result_equipment_id: 'crystal_orb_merlin',
    name: 'Crystal Orb of Avalon',
    description: 'Transform wooden staff into mystical orb',
    category: 'upgrade',
    required_level: 15,
    base_equipment_id: 'wooden_staff_merlin',
    materials: [
      { material_id: 'mana_crystal', quantity: 5 },
      { material_id: 'rune_stone', quantity: 2 }
    ],
    gold: 300,
    crafting_time: 90,
    experience_gained: 150,
    success_rate: 80
  },
  
  // Holmes' weapon progression
  {
    id: 'craft_sword_cane',
    result_equipment_id: 'sword_cane_holmes',
    name: 'Gentleman\'s Sword Cane',
    description: 'Craft a concealed blade walking stick',
    category: 'upgrade',
    required_level: 15,
    base_equipment_id: 'police_club_holmes',
    materials: [
      { material_id: 'steel_ingot', quantity: 2 },
      { material_id: 'leather_hide', quantity: 1 }
    ],
    gold: 150,
    crafting_time: 45,
    experience_gained: 75,
    success_rate: 85
  },
  
  // Futuristic crafting
  {
    id: 'craft_quantum_disruptor',
    result_equipment_id: 'quantum_disruptor',
    name: 'Quantum Reality Disruptor',
    description: 'Craft an advanced reality-warping weapon',
    category: 'upgrade',
    required_level: 30,
    base_equipment_id: 'plasma_rifle_vega',
    materials: [
      { material_id: 'titanium_alloy', quantity: 20 },
      { material_id: 'void_essence', quantity: 1 },
      { material_id: 'mana_crystal', quantity: 10 }
    ],
    gold: 2000,
    crafting_time: 240,
    experience_gained: 750,
    success_rate: 40,
    unlock_conditions: {
      character_level: 28,
      defeated_enemies: ['quantum_entity']
    }
  },
  
  // Material refinement recipes
  {
    id: 'smelt_iron',
    result_equipment_id: 'steel_ingot',
    name: 'Smelt Steel Ingot',
    description: 'Refine iron ore into steel ingot',
    category: 'weapon',
    required_level: 5,
    materials: [
      { material_id: 'iron_ore', quantity: 3 }
    ],
    gold: 10,
    crafting_time: 15,
    experience_gained: 10,
    success_rate: 95
  }
];

// Crafting system functions
export class CraftingSystem {
  static canCraftRecipe(recipe: CraftingRecipe, player_crafting: PlayerCrafting, character_level: number): {
    can_craft: boolean;
    missing_requirements: string[];
  } {
    const missing: string[] = [];
    
    // Check level requirement
    if (character_level < recipe.required_level) {
      missing.push(`Character level ${recipe.required_level} required`);
    }
    
    // Check crafting level
    if (player_crafting.crafting_level < recipe.required_level) {
      missing.push(`Crafting level ${recipe.required_level} required`);
    }
    
    // Check materials
    recipe.materials.forEach(req => {
      const owned = player_crafting.materials.find(m => m.material_id === req.material_id);
      if (!owned || owned.quantity < req.quantity) {
        const material = craftingMaterials.find(m => m.id === req.material_id);
        missing.push(`${req.quantity}x ${material?.name || req.material_id} (have ${owned?.quantity || 0})`);
      }
    });
    
    // Check unlock conditions
    if (recipe.unlock_conditions) {
      if (recipe.unlock_conditions.character_level && character_level < recipe.unlock_conditions.character_level) {
        missing.push(`Character level ${recipe.unlock_conditions.character_level} required`);
      }
      
      if (recipe.unlock_conditions.completed_quests) {
        recipe.unlock_conditions.completed_quests.forEach(quest => {
          missing.push(`Complete quest: ${quest}`);
        });
      }
    }
    
    return {
      can_craft: missing.length === 0,
      missing_requirements: missing
    };
  }
  
  static calculateCraftingSuccess(recipe: CraftingRecipe, station_id?: string): number {
    let success_rate = recipe.success_rate;
    
    if (station_id) {
      const station = craftingStations.find(s => s.id === station_id);
      if (station) {
        success_rate += station.bonuses.success_rateBonus;
      }
    }
    
    return Math.min(success_rate, 100);
  }
  
  static calculateCraftingTime(recipe: CraftingRecipe, station_id?: string): number {
    let time = recipe.crafting_time;
    
    if (station_id) {
      const station = craftingStations.find(s => s.id === station_id);
      if (station) {
        time = Math.max(time * (1 - station.bonuses.time_reduction / 100), 5);
      }
    }
    
    return Math.round(time);
  }
  
  static startCrafting(recipe: CraftingRecipe, player_crafting: PlayerCrafting, station_id?: string): {
    success: boolean;
    updated_player: PlayerCrafting;
    message: string;
  } {
    const canCraft = this.canCraftRecipe(recipe, player_crafting, 50); // Assume max level for now
    
    if (!canCraft.can_craft) {
      return {
        success: false,
        updated_player: player_crafting,
        message: `Cannot craft: ${canCraft.missing_requirements.join(', ')}`
      };
    }
    
    const updatedPlayer = { ...player_crafting };
    
    // Consume materials
    recipe.materials.forEach(req => {
      const materialIndex = updatedPlayer.materials.findIndex(m => m.material_id === req.material_id);
      if (materialIndex >= 0) {
        updatedPlayer.materials[materialIndex].quantity -= req.quantity;
        if (updatedPlayer.materials[materialIndex].quantity <= 0) {
          updatedPlayer.materials.splice(materialIndex, 1);
        }
      }
    });
    
    // Calculate completion time
    const crafting_time = this.calculateCraftingTime(recipe, station_id);
    const start_time = new Date();
    const completionTime = new Date(start_time.getTime() + crafting_time * 60000);
    
    // Add to active crafts
    updatedPlayer.active_crafts.push({
      recipe_id: recipe.id,
      start_time,
      completionTime,
      station_id
    });
    
    return {
      success: true,
      updated_player: updatedPlayer,
      message: `Started crafting ${recipe.name}. Will complete in ${crafting_time} minutes.`
    };
  }
  
  static completeCrafting(activeCarft: { recipe_id: string; start_time: number; duration: number; station_id?: string }, player_crafting: PlayerCrafting): {
    success: boolean;
    equipment?: Equipment;
    experience: number;
    message: string;
  } {
    const recipe = craftingRecipes.find(r => r.id === activeCarft.recipe_id);
    if (!recipe) {
      return {
        success: false,
        experience: 0,
        message: 'Recipe not found'
      };
    }

    const success_rate = this.calculateCraftingSuccess(recipe, activeCarft.station_id);
    const success = Math.random() * 100 < success_rate;
    
    if (success) {
      return {
        success: true,
        experience: recipe.experience_gained,
        message: `Successfully crafted ${recipe.name}!`
      };
    } else {
      return {
        success: false,
        experience: Math.floor(recipe.experience_gained * 0.25),
        message: `Crafting failed, but gained some experience.`
      };
    }
  }
}

// Helper functions
export function getMaterialsByRarity(rarity: EquipmentRarity): CraftingMaterial[] {
  return craftingMaterials.filter(m => m.rarity === rarity);
}

export function getRecipesForCharacter(character_id: string): CraftingRecipe[] {
  return craftingRecipes.filter(r => 
    r.result_equipment_id.includes(character_id) || 
    r.base_equipment_id?.includes(character_id)
  );
}

export function calculateMaterialValue(materials: { material_id: string; quantity: number }[]): number {
  return materials.reduce((total, mat) => {
    const material = craftingMaterials.find(m => m.id === mat.material_id);
    return total + ((material?.value || 0) * mat.quantity);
  }, 0);
}