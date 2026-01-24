// Equipment Progression and Upgrade System
// Tracks character equipment advancement and unlock conditions

import { Equipment } from './equipment';
import { Contestant } from '@blankwars/types';
import { CraftingRecipe, craftingRecipes } from './craftingSystem';
import { equipmentCache } from '@/services/equipmentCache';

export interface EquipmentProgressionNode {
  equipment_id: string;
  level: number;
  rarity: 'common' | 'rare' | 'legendary';
  unlock_conditions: {
    character_level: number;
    previous_equipment?: string;
    completed_quests?: string[];
    defeated_enemies?: string[];
    materials_gathered?: { material_id: string; quantity: number }[];
    battles_won?: number;
  };
  is_unlocked: boolean;
  is_equipped: boolean;
}

export interface CharacterEquipmentProgression {
  character_id: string;
  weapon_tree: EquipmentProgressionNode[];
  armor_tree: EquipmentProgressionNode[];
  accessory_tree: EquipmentProgressionNode[];
  total_progress: number; // 0-100 percentage
  next_unlock?: {
    equipment: Equipment;
    requirements: string[];
    priority: 'high' | 'medium' | 'low';
  };
}

export interface ProgressionQuest {
  id: string;
  name: string;
  description: string;
  character_id: string;
  target_equipment: string;
  steps: {
    id: string;
    description: string;
    type: 'battle' | 'gather' | 'craft' | 'explore';
    target: string;
    quantity?: number;
    completed: boolean;
  }[];
  rewards: {
    experience: number;
    materials?: { material_id: string; quantity: number }[];
    equipment?: string[];
    unlocks_recipe?: string;
  };
  is_completed: boolean;
}

// Equipment progression trees for each character
export const characterProgressionTrees: Record<string, CharacterEquipmentProgression> = {
  achilles: {
    character_id: 'achilles',
    weapon_tree: [
      {
        equipment_id: 'bronze_spear_achilles',
        level: 1,
        rarity: 'common',
        unlock_conditions: {
          character_level: 1
        },
        is_unlocked: true,
        is_equipped: false
      },
      {
        equipment_id: 'iron_sword_achilles',
        level: 15,
        rarity: 'rare',
        unlock_conditions: {
          character_level: 15,
          previous_equipment: 'bronze_spear_achilles',
          materials_gathered: [
            { material_id: 'steel_ingot', quantity: 3 },
            { material_id: 'rune_stone', quantity: 1 }
          ]
        },
        is_unlocked: false,
        is_equipped: false
      },
      {
        equipment_id: 'shield_invulnerability',
        level: 30,
        rarity: 'legendary',
        unlock_conditions: {
          character_level: 30,
          previous_equipment: 'iron_sword_achilles',
          completed_quests: ['divine_blessing_quest'],
          battles_won: 100,
          materials_gathered: [
            { material_id: 'mithril_ore', quantity: 10 },
            { material_id: 'phoenix_feather', quantity: 1 },
            { material_id: 'dragon_scale', quantity: 3 }
          ]
        },
        is_unlocked: false,
        is_equipped: false
      }
    ],
    armor_tree: [],
    accessory_tree: [],
    total_progress: 33 // 1 out of 3 unlocked
  },

  sherlock_holmes: {
    character_id: 'sherlock_holmes',
    weapon_tree: [
      {
        equipment_id: 'police_club_holmes',
        level: 1,
        rarity: 'common',
        unlock_conditions: {
          character_level: 1
        },
        is_unlocked: true,
        is_equipped: false
      },
      {
        equipment_id: 'sword_cane_holmes',
        level: 15,
        rarity: 'rare',
        unlock_conditions: {
          character_level: 15,
          previous_equipment: 'police_club_holmes',
          completed_quests: ['investigate_mystery'],
          materials_gathered: [
            { material_id: 'steel_ingot', quantity: 2 },
            { material_id: 'leather_hide', quantity: 1 }
          ]
        },
        is_unlocked: false,
        is_equipped: false
      },
      {
        equipment_id: 'minds_eye_revolver',
        level: 30,
        rarity: 'legendary',
        unlock_conditions: {
          character_level: 30,
          previous_equipment: 'sword_cane_holmes',
          completed_quests: ['solve_impossible_case'],
          materials_gathered: [
            { material_id: 'titanium_alloy', quantity: 5 },
            { material_id: 'mana_crystal', quantity: 3 }
          ]
        },
        is_unlocked: false,
        is_equipped: false
      }
    ],
    armor_tree: [],
    accessory_tree: [],
    total_progress: 33
  }
};

// Progression quests
export const progressionQuests: ProgressionQuest[] = [
  {
    id: 'divine_blessing_quest',
    name: 'Divine Blessing',
    description: 'Seek the blessing of the gods to forge a legendary shield',
    character_id: 'achilles',
    target_equipment: 'shield_invulnerability',
    steps: [
      {
        id: 'defeat_hydra',
        description: 'Defeat the Hydra in battle',
        type: 'battle',
        target: 'hydra',
        completed: false
      },
      {
        id: 'gather_phoenix_feather',
        description: 'Obtain a Phoenix Feather from the eternal flame',
        type: 'gather',
        target: 'phoenix_feather',
        quantity: 1,
        completed: false
      },
      {
        id: 'visit_olympus',
        description: 'Journey to Mount Olympus',
        type: 'explore',
        target: 'mount_olympus',
        completed: false
      }
    ],
    rewards: {
      experience: 1000,
      materials: [
        { material_id: 'divine_essence', quantity: 1 }
      ],
      unlocks_recipe: 'craft_divine_shield'
    },
    is_completed: false
  },

  {
    id: 'investigate_mystery',
    name: 'The Case of the Hidden Blade',
    description: 'Investigate a mysterious weapon hidden in Victorian London',
    character_id: 'sherlock_holmes',
    target_equipment: 'sword_cane_holmes',
    steps: [
      {
        id: 'gather_clues',
        description: 'Gather clues around London',
        type: 'explore',
        target: 'london_streets',
        quantity: 5,
        completed: false
      },
      {
        id: 'craft_sword_cane',
        description: 'Craft the concealed weapon',
        type: 'craft',
        target: 'craft_sword_cane',
        completed: false
      }
    ],
    rewards: {
      experience: 200,
      materials: [
        { material_id: 'steel_ingot', quantity: 2 }
      ]
    },
    is_completed: false
  },

  {
    id: 'solve_impossible_case',
    name: 'The Impossible Crime',
    description: 'Solve a case that defies all logic and reasoning',
    character_id: 'sherlock_holmes',
    target_equipment: 'minds_eye_revolver',
    steps: [
      {
        id: 'analyze_evidence',
        description: 'Use deductive reasoning to analyze impossible evidence',
        type: 'explore',
        target: 'crime_scene',
        quantity: 10,
        completed: false
      },
      {
        id: 'defeat_master_criminal',
        description: 'Confront and defeat the master criminal',
        type: 'battle',
        target: 'moriarty',
        completed: false
      },
      {
        id: 'forge_enhanced_weapon',
        description: 'Create a weapon enhanced by pure logic',
        type: 'craft',
        target: 'craft_minds_eye_revolver',
        completed: false
      }
    ],
    rewards: {
      experience: 800,
      materials: [
        { material_id: 'logic_crystal', quantity: 1 }
      ]
    },
    is_completed: false
  }
];

// Progression system functions
export class EquipmentProgressionSystem {
  static getCharacterProgression(character_id: string): CharacterEquipmentProgression | null {
    return characterProgressionTrees[character_id] || null;
  }

  static checkUnlockConditions(
    node: EquipmentProgressionNode,
    character: Contestant,
    player_progress: Record<string, { unlocked_nodes: string[]; current_tier: number; experience: number }> = {}
  ): {
    can_unlock: boolean;
    missing_requirements: string[];
  } {
    const missing: string[] = [];
    const conditions = node.unlock_conditions;

    // Check character level
    if ((character.level || 1) < conditions.character_level) {
      missing.push(`Character level ${conditions.character_level} required (current: ${character.level || 1})`);
    }

    // Check previous equipment
    if (conditions.previous_equipment) {
      const hasEquipment = character.equipment?.some((item: any) => item.id === conditions.previous_equipment) ||
        character.inventory?.some((item: any) => item.id === conditions.previous_equipment);
      if (!hasEquipment) {
        missing.push(`Must have ${conditions.previous_equipment} first`);
      }
    }

    // Check completed quests
    if (conditions.completed_quests) {
      conditions.completed_quests.forEach(questId => {
        const quest = progressionQuests.find(q => q.id === questId);
        if (quest && !quest.is_completed) {
          missing.push(`Complete quest: ${quest.name}`);
        }
      });
    }

    // Check materials
    if (conditions.materials_gathered) {
      conditions.materials_gathered.forEach(req => {
        // This would check player's material inventory
        missing.push(`Gather ${req.quantity}x ${req.material_id}`);
      });
    }

    // Check battles won
    if (conditions.battles_won) {
      // This would check player's battle statistics
      missing.push(`Win ${conditions.battles_won} battles`);
    }

    return {
      can_unlock: missing.length === 0,
      missing_requirements: missing
    };
  }

  static getNextAvailableUpgrade(character_id: string, character: Contestant): EquipmentProgressionNode | null {
    const progression = this.getCharacterProgression(character_id);
    if (!progression) return null;

    // Find next unlockable weapon
    const nextWeapon = progression.weapon_tree.find(node =>
      !node.is_unlocked && this.checkUnlockConditions(node, character).can_unlock
    );

    return nextWeapon || null;
  }

  static calculateProgressionPercentage(character_id: string): number {
    const progression = this.getCharacterProgression(character_id);
    if (!progression) return 0;

    const totalNodes = progression.weapon_tree.length + progression.armor_tree.length + progression.accessory_tree.length;
    const unlockedNodes = [
      ...progression.weapon_tree,
      ...progression.armor_tree,
      ...progression.accessory_tree
    ].filter(node => node.is_unlocked).length;

    return totalNodes > 0 ? Math.round((unlockedNodes / totalNodes) * 100) : 0;
  }

  static unlockEquipment(character_id: string, equipment_id: string): boolean {
    const progression = this.getCharacterProgression(character_id);
    if (!progression) return false;

    // Find the node in any tree
    const allNodes = [...progression.weapon_tree, ...progression.armor_tree, ...progression.accessory_tree];
    const node = allNodes.find(n => n.equipment_id === equipment_id);

    if (node) {
      node.is_unlocked = true;
      progression.total_progress = this.calculateProgressionPercentage(character_id);
      return true;
    }

    return false;
  }

  static getAvailableQuests(character_id: string): ProgressionQuest[] {
    return progressionQuests.filter(quest =>
      quest.character_id === character_id && !quest.is_completed
    );
  }

  static updateQuestProgress(questId: string, step_id: string): boolean {
    const quest = progressionQuests.find(q => q.id === questId);
    if (!quest) return false;

    const step = quest.steps.find(s => s.id === step_id);
    if (!step) return false;

    step.completed = true;

    // Check if all steps are completed
    const allCompleted = quest.steps.every(s => s.completed);
    if (allCompleted) {
      quest.is_completed = true;
    }

    return true;
  }

  static getEquipmentUpgradePath(equipment_id: string): CraftingRecipe[] {
    // Legacy synchronous version - kept for backward compatibility
    return craftingRecipes.filter(recipe =>
      recipe.base_equipment_id === equipment_id || recipe.result_equipment_id === equipment_id
    );
  }

  /**
   * Database-backed version of getEquipmentUpgradePath
   */
  static async getEquipmentUpgradePathAsync(equipment_id: string): Promise<CraftingRecipe[]> {
    try {
      const recipes = await equipmentCache.getCraftingRecipes();
      return recipes.filter(recipe =>
        recipe.base_equipment_id === equipment_id || recipe.result_equipment_id === equipment_id
      );
    } catch (error) {
      console.error('Failed to get equipment upgrade path from database:', error);
      // Fallback to hardcoded version
      return this.getEquipmentUpgradePath(equipment_id);
    }
  }

  static generateProgressionSummary(character_id: string, character: Contestant): {
    current_progress: number;
    next_upgrade: EquipmentProgressionNode | null;
    available_quests: ProgressionQuest[];
    completed_upgrades: string[];
    total_upgrades: number;
  } {
    const progression = this.getCharacterProgression(character_id);
    const currentProgress = this.calculateProgressionPercentage(character_id);
    const nextUpgrade = this.getNextAvailableUpgrade(character_id, character);
    const availableQuests = this.getAvailableQuests(character_id);

    let completed_upgrades: string[] = [];
    let totalUpgrades = 0;

    if (progression) {
      const allNodes = [...progression.weapon_tree, ...progression.armor_tree, ...progression.accessory_tree];
      completed_upgrades = allNodes.filter(n => n.is_unlocked).map(n => n.equipment_id);
      totalUpgrades = allNodes.length;
    }

    return {
      current_progress: currentProgress,
      next_upgrade: nextUpgrade,
      available_quests: availableQuests,
      completed_upgrades: completed_upgrades,
      total_upgrades: totalUpgrades
    };
  }
}

// Helper functions
export function createProgressionTree(character_id: string, equipment_ids: string[]): EquipmentProgressionNode[] {
  return equipment_ids.map((id, index) => ({
    equipment_id: id,
    level: 1 + (index * 14), // Levels 1, 15, 29, etc.
    rarity: index === 0 ? 'common' : index === 1 ? 'rare' : 'legendary',
    unlock_conditions: {
      character_level: 1 + (index * 14),
      previous_equipment: index > 0 ? equipment_ids[index - 1] : undefined
    },
    is_unlocked: index === 0, // First item is always unlocked
    is_equipped: false
  }));
}

export function getProgressionRecommendations(character_id: string, character: Contestant): {
  priority: 'high' | 'medium' | 'low';
  action: string;
  description: string;
  requirements?: string[];
}[] {
  const recommendations = [];
  const progression = EquipmentProgressionSystem.getCharacterProgression(character_id);

  if (!progression) return [];

  // Check for available upgrades
  const nextUpgrade = EquipmentProgressionSystem.getNextAvailableUpgrade(character_id, character);
  if (nextUpgrade) {
    const check = EquipmentProgressionSystem.checkUnlockConditions(nextUpgrade, character);
    recommendations.push({
      priority: 'high' as const,
      action: `Unlock ${nextUpgrade.equipment_id}`,
      description: 'Next weapon upgrade available',
      requirements: check.missing_requirements
    });
  }

  // Check for available quests
  const quests = EquipmentProgressionSystem.getAvailableQuests(character_id);
  quests.forEach(quest => {
    recommendations.push({
      priority: 'medium' as const,
      action: `Complete ${quest.name}`,
      description: quest.description
    });
  });

  return recommendations;
}