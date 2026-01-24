'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hammer, 
  Clock, 
  Star, 
  CheckCircle, 
  XCircle, 
  Package,
  Zap,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Timer
} from 'lucide-react';
import { 
  CraftingRecipe, 
  CraftingMaterial, 
  CraftingStation,
  PlayerCrafting,
  CraftingSystem,
  craftingStations
} from '@/data/craftingSystem';
import { equipmentCache } from '@/services/equipmentCache';
import { Contestant as Character } from '@blankwars/types';

interface CraftingInterfaceProps {
  character: Character;
  player_crafting: PlayerCrafting;
  onStartCrafting?: (recipe: CraftingRecipe, station_id?: string) => void;
  onCompleteCrafting?: (craftId: string) => void;
  available_stations?: string[];
}

export default function CraftingInterface({
  character,
  player_crafting: playerCrafting,
  onStartCrafting,
  onCompleteCrafting,
  available_stations: availableStations = ['basic_forge']
}: CraftingInterfaceProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>(() => {
    if (!availableStations[0]) {
      throw new Error('No available crafting stations');
    }
    return availableStations[0];
  });
  const [filterCategory, setFilterCategory] = useState<'all' | 'weapon' | 'armor' | 'accessory' | 'upgrade'>('all');
  
  // Database state
  const [craftingRecipes, setCraftingRecipes] = useState<CraftingRecipe[]>([]);
  const [craftingMaterials, setCraftingMaterials] = useState<CraftingMaterial[]>([]);
  const [is_loading, setIsLoading] = useState(true);

  // Load crafting data from database
  useEffect(() => {
    const loadCraftingData = async () => {
      try {
        setIsLoading(true);
        const [recipes, materials] = await Promise.all([
          equipmentCache.getCraftingRecipes(),
          equipmentCache.getCraftingMaterials()
        ]);
        setCraftingRecipes(recipes);
        setCraftingMaterials(materials);
      } catch (error) {
        console.error('Failed to load crafting data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCraftingData();
  }, []);

  // Filter recipes based on character and category
  const availableRecipes = useMemo((): CraftingRecipe[] => {
    let filtered = craftingRecipes.filter(recipe => {
      // Check if recipe is unlocked
      if (!playerCrafting.unlocked_recipes.includes(recipe.id)) {
        return false;
      }

      // Filter by category
      if (filterCategory !== 'all' && recipe.category !== filterCategory) {
        return false;
      }

      // Check if recipe is relevant to character
      if (recipe.result_equipment_id.includes(character.id) ||
          recipe.base_equipment_id?.includes(character.id) ||
          !recipe.result_equipment_id.includes('_')) {
        return true;
      }

      return false;
    });

    return filtered;
  }, [playerCrafting.unlocked_recipes, filterCategory, character.id, craftingRecipes]);

  const getRecipeStatus = (recipe: CraftingRecipe) => {
    return CraftingSystem.canCraftRecipe(recipe, playerCrafting, character.level);
  };

  const getMaterial = (materialId: string): CraftingMaterial | undefined => {
    return craftingMaterials.find(m => m.id === materialId);
  };

  const getStation = (stationId: string): CraftingStation | undefined => {
    return craftingStations.find(s => s.id === stationId);
  };

  const getCurrentMaterialCount = (materialId: string): number => {
    const material = playerCrafting.materials.find(m => m.material_id === materialId);
    if (!material) {
      return 0;
    }
    if (material.quantity === undefined || material.quantity === null) {
      throw new Error(`Material ${materialId} missing quantity property`);
    }
    return material.quantity;
  };

  const RecipeCard: React.FC<{ recipe: CraftingRecipe }> = ({ recipe }) => {
    const status = getRecipeStatus(recipe);
    const station = selectedStation ? getStation(selectedStation) : null;
    const success_rate = CraftingSystem.calculateCraftingSuccess(recipe, selectedStation);
    const crafting_time = CraftingSystem.calculateCraftingTime(recipe, selectedStation);

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          bg-white rounded-lg border-2 cursor-pointer overflow-hidden transition-all duration-200
          ${selectedRecipe?.id === recipe.id ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
          ${!status.can_craft ? 'opacity-60' : ''}
        `}
        onClick={() => setSelectedRecipe(recipe)}
      >
        <div className="p-4">
          {/* Recipe header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-800">{recipe.name}</h3>
              <p className="text-sm text-gray-600">{recipe.description}</p>
            </div>
            <div className="text-right">
              <div className={`text-xs px-2 py-1 rounded font-medium ${
                recipe.category === 'weapon' ? 'bg-red-100 text-red-700' :
                recipe.category === 'armor' ? 'bg-blue-100 text-blue-700' :
                recipe.category === 'accessory' ? 'bg-purple-100 text-purple-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {recipe.category.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Materials required */}
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-2">Materials Required</div>
            <div className="grid grid-cols-2 gap-2">
              {recipe.materials.map((req, index) => {
                const material = getMaterial(req.material_id);
                if (!material) {
                  throw new Error(`Material not found in database: ${req.material_id}`);
                }
                if (!material.icon) {
                  throw new Error(`Material ${req.material_id} missing icon property`);
                }
                if (!material.name) {
                  throw new Error(`Material ${req.material_id} missing name property`);
                }
                const owned = getCurrentMaterialCount(req.material_id);
                const hasEnough = owned >= req.quantity;

                return (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="text-lg">{material.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{material.name}</div>
                      <div className={`${hasEnough ? 'text-green-600' : 'text-red-600'}`}>
                        {owned}/{req.quantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recipe stats */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-500" />
              <span>{crafting_time}m</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-gray-500" />
              <span>{success_rate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 text-gray-500" />
              <span>{recipe.experience_gained} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-3 h-3 text-gray-500" />
              <span>{recipe.gold}g</span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            {status.can_craft ? (
              <div className="flex items-center gap-2 text-green-600 text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Can craft</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 text-xs">
                <XCircle className="w-4 h-4" />
                <span>Missing requirements</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const ActiveCraftItem: React.FC<{ craft: { recipe_id: string; start_time: Date; completionTime: Date; station_id?: string; }; index: number }> = ({ craft, index }) => {
    const recipe = craftingRecipes.find(r => r.id === craft.recipe_id);
    const now = new Date();
    const progress = Math.min((now.getTime() - craft.start_time.getTime()) / (craft.completionTime.getTime() - craft.start_time.getTime()), 1);
    const is_complete = now >= craft.completionTime;

    if (!recipe) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-800">{recipe.name}</h4>
          <div className="flex items-center gap-2">
            {is_complete ? (
              <button
                onClick={() => onCompleteCrafting?.(craft.recipe_id)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Collect
              </button>
            ) : (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Timer className="w-4 h-4" />
                <span>{Math.ceil((craft.completionTime.getTime() - now.getTime()) / 60000)}m</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              is_complete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-600 mt-1">
          {is_complete ? 'Ready to collect!' : `${Math.round(progress * 100)}% complete`}
        </div>
      </div>
    );
  };

  // Show loading state while data is being loaded
  if (is_loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
          <div className="flex items-center gap-3">
            <Hammer className="w-6 h-6" />
            <h2 className="text-xl font-bold">Equipment Crafting</h2>
          </div>
          <p className="text-orange-100 mt-2">Loading crafting data from database...</p>
        </div>
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading recipes and materials...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
        <div className="flex items-center gap-3">
          <Hammer className="w-6 h-6" />
          <h2 className="text-xl font-bold">Equipment Crafting</h2>
        </div>
        <p className="text-orange-100 mt-2">Forge powerful equipment for {character.name}</p>
      </div>

      {/* Active crafts */}
      {playerCrafting.active_crafts.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Active Crafts ({playerCrafting.active_crafts.length})
          </h3>
          <div className="space-y-3">
            {playerCrafting.active_crafts.map((craft, index) => (
              <ActiveCraftItem key={index} craft={craft} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as 'all' | 'weapon' | 'armor' | 'accessory' | 'upgrade')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="weapon">Weapons</option>
              <option value="armor">Armor</option>
              <option value="accessory">Accessories</option>
              <option value="upgrade">Upgrades</option>
            </select>
          </div>

          {/* Crafting station */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Crafting Station</label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {availableStations.map(stationId => {
                const station = getStation(stationId);
                if (!station) {
                  throw new Error(`Station not found in database: ${stationId}`);
                }
                if (!station.name) {
                  throw new Error(`Station ${stationId} missing name property`);
                }
                return (
                  <option key={stationId} value={stationId}>
                    {station.name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Recipe selection */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Available Recipes ({availableRecipes.length})
        </h3>
        
        {availableRecipes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recipes available for the selected category</p>
            <p className="text-sm mt-2">Complete quests to unlock new recipes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>

      {/* Recipe details and crafting */}
      {selectedRecipe && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recipe details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recipe Details</h3>
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div>
                  <div className="font-medium text-gray-800">{selectedRecipe.name}</div>
                  <div className="text-sm text-gray-600">{selectedRecipe.description}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Level Required:</span>
                    <span className="ml-2 font-medium">{selectedRecipe.required_level}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Gold Cost:</span>
                    <span className="ml-2 font-medium">{selectedRecipe.gold}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Experience:</span>
                    <span className="ml-2 font-medium">{selectedRecipe.experience_gained} XP</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="ml-2 font-medium">
                      {CraftingSystem.calculateCraftingSuccess(selectedRecipe, selectedStation)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Crafting action */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Start Crafting</h3>
              <div className="bg-white rounded-lg p-4">
                {(() => {
                  const status = getRecipeStatus(selectedRecipe);
                  
                  if (status.can_craft) {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Ready to craft!</span>
                        </div>
                        
                        <button
                          onClick={() => onStartCrafting?.(selectedRecipe, selectedStation)}
                          className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Hammer className="w-4 h-4" />
                          Start Crafting
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-medium">Missing requirements</span>
                        </div>
                        
                        <ul className="text-sm text-gray-600 space-y-1">
                          {status.missing_requirements.map((req, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <XCircle className="w-3 h-3 text-red-500" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}