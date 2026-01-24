/**
 * Real Estate Agent Bonus Service
 * 
 * This service handles applying real estate agent bonuses to facility purchases,
 * training, and other game systems as promised by the agents.
 */

import { ExperienceBonus } from '../data/experience';

interface AgentBonus {
  name: string;
  effects: string[];
  icon: string;
  color: string;
}

interface Cost {
  coins: number;
  gems: number;
}

interface AgentBonusEffects {
  facility_cost_reduction: number; // Percentage (0-100)
  training_speed_boost: number;    // Percentage
  xp_gain_increase: number;        // Percentage
  energy_regenBonus: number;      // Percentage
  has_team_ambition_trait: boolean;
  has_climate_immunity: boolean;
}

interface FacilityTier {
  name: string;
  min_cost: number;
  max_cost: number;
  tier: 'spartan' | 'standard' | 'luxury';
}

const FACILITY_TIERS: FacilityTier[] = [
  { name: 'Spartan', min_cost: 0, max_cost: 10000, tier: 'spartan' },
  { name: 'Standard', min_cost: 10001, max_cost: 50000, tier: 'standard' },
  { name: 'Luxury', min_cost: 50001, max_cost: Infinity, tier: 'luxury' }
];

const AGENT_BONUSES = {
  'barry': {
    name: 'Speed Deals',
    effects: ['3-8% facility cost reduction (by tier)', '10% training speed boost'],
    icon: '⚡',
    color: 'text-yellow-400'
  },
  'lmb_3000': {
    name: 'Dramatic Ambition', 
    effects: ['5-12% XP gain increase (by tier)', 'Team "Ambition" trait unlock'],
    icon: '👑',
    color: 'text-purple-400'
  },
  'zyxthala': {
    name: 'Optimal Efficiency',
    effects: ['3-8% training bonus (by tier)', 'Climate immunity for team'],
    icon: '🦎',
    color: 'text-green-400'
  }
};

class RealEstateAgentBonusService {
  private static instance: RealEstateAgentBonusService;
  private selectedAgentId: string | null = null;
  private readonly STORAGE_KEY = 'selectedRealEstateAgent';

  constructor() {
    this.loadFromStorage();
  }

  static getInstance(): RealEstateAgentBonusService {
    if (!RealEstateAgentBonusService.instance) {
      RealEstateAgentBonusService.instance = new RealEstateAgentBonusService();
    }
    return RealEstateAgentBonusService.instance;
  }

  /**
   * Set the currently selected real estate agent
   */
  setSelectedAgent(agent_id: string): void {
    this.selectedAgentId = agent_id;
    this.saveToStorage();
    console.log(`🏠 Real Estate Agent selected: ${agent_id}`);
    this.logCurrentBonuses();
  }

  /**
   * Get the currently selected agent ID
   */
  getSelectedAgent(): string | null {
    return this.selectedAgentId;
  }

  /**
   * Calculate agent bonus effects with tiered scaling based on facility cost
   */
  getAgentBonusEffects(facilityCost?: Cost): AgentBonusEffects {
    if (!this.selectedAgentId) {
      return this.getDefaultEffects();
    }

    const totalCost = facilityCost ? facilityCost.coins + (facilityCost.gems * 100) : 0;
    const tier = this.getFacilityTier(totalCost);

    switch (this.selectedAgentId) {
      case 'barry':
        return {
          facility_cost_reduction: this.getBarryTieredBonus(tier),
          training_speed_boost: 10,
          xp_gain_increase: 0,
          energy_regenBonus: 0,
          has_team_ambition_trait: false,
          has_climate_immunity: false
        };
      
      case 'lmb_3000':
        return {
          facility_cost_reduction: 0,
          training_speed_boost: 0,
          xp_gain_increase: this.getLmbTieredBonus(tier),
          energy_regenBonus: 0,
          has_team_ambition_trait: true,
          has_climate_immunity: false
        };
      
      case 'zyxthala':
        return {
          facility_cost_reduction: 0,
          training_speed_boost: this.getZyxthalaTieredBonus(tier),
          xp_gain_increase: 0,
          energy_regenBonus: 15,
          has_team_ambition_trait: false,
          has_climate_immunity: true
        };
      
      default:
        return this.getDefaultEffects();
    }
  }

  /**
   * Apply facility cost reduction from selected agent
   */
  applyFacilityCostReduction(originalCost: Cost): Cost {
    const effects = this.getAgentBonusEffects(originalCost);
    
    if (effects.facility_cost_reduction > 0) {
      const reduction = effects.facility_cost_reduction / 100;
      const reducedCost = {
        coins: Math.floor(originalCost.coins * (1 - reduction)),
        gems: Math.floor(originalCost.gems * (1 - reduction))
      };
      
      const totalCost = originalCost.coins + (originalCost.gems * 100);
      const tier = this.getFacilityTier(totalCost);
      
      console.log(`🏠 Applied ${effects.facility_cost_reduction}% cost reduction (${tier} tier):`, {
        original: originalCost,
        reduced: reducedCost,
        savings: {
          coins: originalCost.coins - reducedCost.coins,
          gems: originalCost.gems - reducedCost.gems
        }
      });
      
      return reducedCost;
    }
    
    return originalCost;
  }

  /**
   * Apply training speed boost from selected agent
   */
  applyTrainingSpeedBoost(baseTime: number): number {
    const effects = this.getAgentBonusEffects();
    
    if (effects.training_speed_boost > 0) {
      const boost = effects.training_speed_boost / 100;
      const reducedTime = Math.floor(baseTime * (1 - boost));
      
      console.log(`🏠 Applied ${effects.training_speed_boost}% training speed boost:`, {
        original_time: baseTime,
        reduced_time: reducedTime,
        time_saved: baseTime - reducedTime
      });
      
      return reducedTime;
    }
    
    return baseTime;
  }

  /**
   * Apply XP gain increase from selected agent
   */
  applyXpGainBonus(baseXp: number): number {
    const effects = this.getAgentBonusEffects();
    
    if (effects.xp_gain_increase > 0) {
      const bonus = effects.xp_gain_increase / 100;
      const boostedXp = Math.floor(baseXp * (1 + bonus));
      
      console.log(`🏠 Applied ${effects.xp_gain_increase}% XP gain bonus:`, {
        base_xp: baseXp,
        boosted_xp: boostedXp,
        bonus: boostedXp - baseXp
      });
      
      return boostedXp;
    }
    
    return baseXp;
  }

  /**
   * Apply energy regeneration bonus from selected agent
   */
  applyEnergyRegenBonus(baseRegen: number): number {
    const effects = this.getAgentBonusEffects();
    
    if (effects.energy_regenBonus > 0) {
      const bonus = effects.energy_regenBonus / 100;
      const boostedRegen = Math.floor(baseRegen * (1 + bonus));
      
      console.log(`🏠 Applied ${effects.energy_regenBonus}% energy regen bonus:`, {
        base_regen: baseRegen,
        boosted_regen: boostedRegen,
        bonus: boostedRegen - baseRegen
      });
      
      return boostedRegen;
    }
    
    return baseRegen;
  }

  /**
   * Check if team has special traits from agent
   */
  hasTeamAmbitionTrait(): boolean {
    return this.getAgentBonusEffects().has_team_ambition_trait;
  }

  /**
   * Check if team has climate immunity from agent
   */
  hasClimateImmunity(): boolean {
    return this.getAgentBonusEffects().has_climate_immunity;
  }

  /**
   * Get XP bonus for experience calculations (uses average tier for global XP)
   */
  getXpBonusForExperience(): ExperienceBonus | null {
    if (!this.selectedAgentId || this.selectedAgentId !== 'lmb_3000') {
      return null;
    }

    // Use standard tier as default for global XP calculations
    const xp_bonus = this.getLmbTieredBonus('standard');
    
    return {
      id: 'lmb_xp_bonus',
      name: 'LMB-3000 XP Boost',
      description: `+${xp_bonus}% XP gain from real estate agent`,
      multiplier: 1 + (xp_bonus / 100),
      source: 'agent',
      stackable: true
    };
  }

  /**
   * Get gameplan adherence multiplier for battle systems
   */
  getGameplanAdherenceMultiplier(facilityCost?: Cost): number {
    if (!this.selectedAgentId || this.selectedAgentId !== 'zyxthala') {
      return 1;
    }

    const totalCost = facilityCost ? facilityCost.coins + (facilityCost.gems * 100) : 0;
    const tier = this.getFacilityTier(totalCost);
    const bonus = this.getZyxthalaTieredBonus(tier);
    
    return 1 + (bonus / 100);
  }

  /**
   * Get agent bonus description for UI display
   */
  getSelectedAgentBonus(): AgentBonus | null {
    if (!this.selectedAgentId) {
      return null;
    }
    
    return AGENT_BONUSES[this.selectedAgentId] || null;
  }

  /**
   * Log current bonuses for debugging
   */
  private logCurrentBonuses(): void {
    const effects = this.getAgentBonusEffects();
    const agent_name = this.selectedAgentId ? 
      AGENT_BONUSES[this.selectedAgentId]?.name || 'Unknown' : 
      'None';
    
    console.log(`🏠 Active Real Estate Agent Bonuses (${agent_name}):`, {
      facility_cost_reduction: `${effects.facility_cost_reduction}%`,
      training_speed_boost: `${effects.training_speed_boost}%`,
      xp_gain_increase: `${effects.xp_gain_increase}%`,
      energy_regenBonus: `${effects.energy_regenBonus}%`,
      special_traits: {
        team_ambition: effects.has_team_ambition_trait,
        climate_immunity: effects.has_climate_immunity
      }
    });
  }

  /**
   * Default effects when no agent is selected
   */
  private getDefaultEffects(): AgentBonusEffects {
    return {
      facility_cost_reduction: 0,
      training_speed_boost: 0,
      xp_gain_increase: 0,
      energy_regenBonus: 0,
      has_team_ambition_trait: false,
      has_climate_immunity: false
    };
  }

  /**
   * Save selected agent to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        if (this.selectedAgentId) {
          localStorage.setItem(this.STORAGE_KEY, this.selectedAgentId);
        } else {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to save agent selection to localStorage:', error);
    }
  }

  /**
   * Load selected agent from localStorage
   */
  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const savedAgentId = localStorage.getItem(this.STORAGE_KEY);
        if (savedAgentId && AGENT_BONUSES[savedAgentId]) {
          this.selectedAgentId = savedAgentId;
          console.log(`🏠 Restored agent selection from storage: ${savedAgentId}`);
        }
      }
    } catch (error) {
      console.warn('Failed to load agent selection from localStorage:', error);
    }
  }

  /**
   * Determine facility tier based on total cost
   */
  private getFacilityTier(totalCost: number): 'spartan' | 'standard' | 'luxury' {
    const tier = FACILITY_TIERS.find(t => totalCost >= t.min_cost && totalCost <= t.max_cost);
    return tier?.tier || 'spartan';
  }

  /**
   * Get Barry's tiered cost reduction bonus (3%, 5%, 8%)
   */
  private getBarryTieredBonus(tier: 'spartan' | 'standard' | 'luxury'): number {
    switch (tier) {
      case 'spartan': return 3;
      case 'standard': return 5;
      case 'luxury': return 8;
      default: return 3;
    }
  }

  /**
   * Get LMB-3000's tiered XP gain bonus (5%, 8%, 12%)
   */
  private getLmbTieredBonus(tier: 'spartan' | 'standard' | 'luxury'): number {
    switch (tier) {
      case 'spartan': return 5;
      case 'standard': return 8;
      case 'luxury': return 12;
      default: return 5;
    }
  }

  /**
   * Get Zyxthala's tiered training bonus (3%, 5%, 8%)
   */
  private getZyxthalaTieredBonus(tier: 'spartan' | 'standard' | 'luxury'): number {
    switch (tier) {
      case 'spartan': return 3;
      case 'standard': return 5;
      case 'luxury': return 8;
      default: return 3;
    }
  }
}

export default RealEstateAgentBonusService;
export type { AgentBonus, AgentBonusEffects, FacilityTier };