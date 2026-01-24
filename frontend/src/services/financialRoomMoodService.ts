// Financial Room Mood Integration Service
// Connects financial decisions and stress to room atmosphere and character happiness
import { FinancialPersonality, FinancialDecision } from './apiClient';
import GameEventBus from './gameEventBus';
import { FinancialPsychologyService } from './financialPsychologyService';
import LuxuryPurchaseService from './luxuryPurchaseService';
import { getCharacterHappiness } from './characterHappinessService';

export interface FinancialRoomEffect {
  character_id: string;
  room_id: string;
  effect_type: 'stress_reduction' | 'luxury_boost' | 'financial_anxiety' | 'room_investment_mood';
  magnitude: number; // -2 to +2 happiness modifier
  duration: number; // in hours
  description: string;
  timestamp: Date;
}

export interface RoomFinancialMoodState {
  room_id: string;
  base_happiness: number;
  financial_stressModifier: number;
  luxury_boost_modifier: number;
  room_investment_modifier: number;
  conflict_financial_modifier: number;
  total_financial_mood_effect: number;
}

export class FinancialRoomMoodService {
  private static instance: FinancialRoomMoodService;
  private eventBus: GameEventBus;
  private psychologyService: FinancialPsychologyService;
  private luxuryService: LuxuryPurchaseService;
  private activeEffects: Map<string, FinancialRoomEffect[]> = new Map();

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    this.psychologyService = FinancialPsychologyService.getInstance();
    this.luxuryService = LuxuryPurchaseService.getInstance();
    this.setupEventListeners();
  }

  static getInstance(): FinancialRoomMoodService {
    if (!FinancialRoomMoodService.instance) {
      FinancialRoomMoodService.instance = new FinancialRoomMoodService();
    }
    return FinancialRoomMoodService.instance;
  }

  /**
   * Setup event listeners for financial events that affect room mood
   */
  private setupEventListeners(): void {
    // Listen for financial decisions
    this.eventBus.subscribe('financial_decision_made', this.handleFinancialDecision.bind(this));
    
    // Listen for luxury purchases
    this.eventBus.subscribe('luxury_purchase_made', this.handleLuxuryPurchase.bind(this));
    
    // Listen for financial stress changes
    this.eventBus.subscribe('financial_stress_change', this.handleStressChange.bind(this));
    
    // Listen for room investment decisions
    this.eventBus.subscribe('room_investment_made', this.handleRoomInvestment.bind(this));
    
    // Listen for financial conflicts
    this.eventBus.subscribe('financial_conflict_created', this.handleFinancialConflict.bind(this));
  }

  /**
   * Calculate enhanced character happiness including financial effects
   */
  calculateFinancialEnhancedHappiness(
    character_id: string,
    room_id: string,
    headquarters: any,
    current_wallet: number,
    monthly_earnings: number,
    financial_personality: FinancialPersonality
  ): {
    base_happiness: number;
    financial_mood_modifier: number;
    total_happiness: number;
    mood_factors: {
      financial_stress: number;
      luxury_boost: number;
      room_investments: number;
      financial_conflicts: number;
    };
  } {
    // Get base happiness from existing system
    const baseHappinessResult = getCharacterHappiness(character_id, room_id, headquarters);
    const baseHappiness = baseHappinessResult.level;

    // Calculate financial stress impact on room mood
    const stressData = this.psychologyService.calculateFinancialStress(
      character_id, current_wallet, monthly_earnings, [], financial_personality
    );
    
    // Financial stress reduces room happiness effectiveness
    const stressModifier = this.calculateStressRoomMoodEffect(stressData.stress);
    
    // Luxury purchases can boost room mood temporarily
    const luxuryBoost = this.calculateLuxuryRoomMoodBoost(character_id);
    
    // Room investments affect mood based on outcomes
    const roomInvestmentModifier = this.calculateRoomInvestmentMoodEffect(character_id, room_id);
    
    // Financial conflicts in shared rooms
    const conflictModifier = this.calculateFinancialConflictRoomEffect(room_id, headquarters);
    
    const totalFinancialModifier = stressModifier + luxuryBoost + roomInvestmentModifier + conflictModifier;
    const finalHappiness = Math.max(1, Math.min(5, baseHappiness + totalFinancialModifier));

    return {
      base_happiness: baseHappiness,
      financial_mood_modifier: totalFinancialModifier,
      total_happiness: finalHappiness,
      mood_factors: {
        financial_stress: stressModifier,
        luxury_boost: luxuryBoost,
        room_investments: roomInvestmentModifier,
        financial_conflicts: conflictModifier
      }
    };
  }

  /**
   * Calculate how financial stress affects room mood
   */
  private calculateStressRoomMoodEffect(stress_level: number): number {
    if (stress_level < 20) return 0;           // No effect at low stress
    if (stress_level < 40) return -0.5;        // Minor mood reduction
    if (stress_level < 60) return -1;          // Moderate mood reduction
    if (stress_level < 80) return -1.5;        // Significant mood reduction
    return -2;                                // Maximum mood penalty
  }

  /**
   * Calculate luxury purchase mood boost in room context
   */
  private calculateLuxuryRoomMoodBoost(character_id: string): number {
    const luxuryData = this.luxuryService.getCurrentLuxuryHappiness(character_id);
    
    // Room-specific luxury effects (furniture, decoration, etc.)
    const roomLuxuries = luxuryData.activePurchases.filter(purchase => 
      ['home_decor', 'furniture', 'electronics', 'appliances'].includes(purchase.category)
    );
    
    if (roomLuxuries.length === 0) return 0;
    
    // Calculate room luxury boost
    const totalBoost = roomLuxuries.reduce((sum, luxury) => sum + luxury.current_happiness_effect, 0);
    
    // Convert to room mood scale (-2 to +2)
    return Math.min(2, totalBoost / 25); // 50 points = +2 happiness
  }

  /**
   * Calculate room investment mood effects
   */
  private calculateRoomInvestmentMoodEffect(character_id: string, room_id: string): number {
    const effects = this.getActiveEffects(character_id);
    const roomInvestmentEffects = effects.filter(
      effect => effect.room_id === room_id && effect.effect_type === 'room_investment_mood'
    );
    
    return roomInvestmentEffects.reduce((sum, effect) => sum + effect.magnitude, 0);
  }

  /**
   * Calculate financial conflict effects on room mood
   */
  private calculateFinancialConflictRoomEffect(room_id: string, headquarters: any): number {
    const room = headquarters?.rooms?.find(r => r.id === room_id);
    if (!room || room.assigned_characters.length < 2) return 0;
    
    // Check for financial conflicts between roommates
    const effects = this.getActiveEffectsForRoom(room_id);
    const conflictEffects = effects.filter(effect => effect.effect_type === 'financial_anxiety');
    
    return Math.max(-1.5, conflictEffects.reduce((sum, effect) => sum + effect.magnitude, 0));
  }

  /**
   * Handle financial decision events
   */
  private async handleFinancialDecision(data: any): Promise<void> {
    const { character_id, decision, outcome } = data;
    
    // Poor financial decisions create room mood anxiety
    if (outcome === 'negative' && decision.amount > 1000) {
      await this.addFinancialRoomEffect({
        character_id,
        room_id: 'current', // Will be resolved to actual room
        effect_type: 'financial_anxiety',
        magnitude: -0.5,
        duration: 48, // 48 hours
        description: `Financial anxiety from poor ${decision.type} decision affecting room mood`,
        timestamp: new Date()
      });
    }
    
    // Very positive decisions boost confidence and room mood
    if (outcome === 'positive' && decision.amount > 2000) {
      await this.addFinancialRoomEffect({
        character_id,
        room_id: 'current',
        effect_type: 'stress_reduction',
        magnitude: 0.5,
        duration: 72, // 72 hours
        description: `Financial confidence boost from successful ${decision.type} decision`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle luxury purchase events
   */
  private async handleLuxuryPurchase(data: any): Promise<void> {
    const { character_id, purchase } = data;
    
    // Room-related luxury purchases boost room mood
    if (['home_decor', 'furniture', 'electronics'].includes(purchase.category)) {
      const boostAmount = Math.min(1.5, purchase.amount / 3000); // Scale with price
      
      await this.addFinancialRoomEffect({
        character_id,
        room_id: 'current',
        effect_type: 'luxury_boost',
        magnitude: boostAmount,
        duration: purchase.durationHours || 168, // 1 week default
        description: `Room mood boost from luxury ${purchase.category} purchase`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle financial stress change events
   */
  private async handleStressChange(data: any): Promise<void> {
    const { character_id, oldStress, newStress } = data;
    
    // Significant stress increases affect room mood
    const stressIncrease = newStress - oldStress;
    if (stressIncrease > 20) {
      await this.addFinancialRoomEffect({
        character_id,
        room_id: 'current',
        effect_type: 'financial_anxiety',
        magnitude: -Math.min(1, stressIncrease / 40),
        duration: 24, // 24 hours
        description: `Room mood affected by increased financial stress`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle room investment events
   */
  private async handleRoomInvestment(data: any): Promise<void> {
    const { character_id, room_id, investment, outcome } = data;
    
    const magnitude = outcome === 'positive' ? 
      Math.min(1.5, investment.amount / 2000) : 
      -Math.min(1, investment.amount / 3000);
    
    await this.addFinancialRoomEffect({
      character_id,
      room_id,
      effect_type: 'room_investment_mood',
      magnitude,
      duration: outcome === 'positive' ? 336 : 168, // 2 weeks positive, 1 week negative
      description: `Room mood ${outcome === 'positive' ? 'boost' : 'penalty'} from room investment outcome`,
      timestamp: new Date()
    });
  }

  /**
   * Handle financial conflict events
   */
  private async handleFinancialConflict(data: any): Promise<void> {
    const { room_id, charactersInvolved, severity } = data;
    
    const magnitude = {
      low: -0.3,
      medium: -0.6,
      high: -1,
      critical: -1.5
    }[severity] || -0.5;
    
    // Apply to all characters in the room
    for (const character_id of charactersInvolved) {
      await this.addFinancialRoomEffect({
        character_id,
        room_id,
        effect_type: 'financial_anxiety',
        magnitude,
        duration: 96, // 4 days
        description: `Room tension from financial conflict between roommates`,
        timestamp: new Date()
      });
    }
  }

  /**
   * Add a financial room effect
   */
  private async addFinancialRoomEffect(effect: Omit<FinancialRoomEffect, 'id'>): Promise<void> {
    const effectWithId: FinancialRoomEffect = {
      ...effect,
      character_id: effect.character_id
    };
    
    const characterEffects = this.activeEffects.get(effect.character_id) || [];
    characterEffects.push(effectWithId);
    this.activeEffects.set(effect.character_id, characterEffects);
    
    // Publish event for tracking
    await this.eventBus.publishFinancialEvent(
      'financial_room_mood_effect',
      effect.character_id,
      effect.description,
      { effect: effectWithId }
    );
  }

  /**
   * Get active effects for a character
   */
  private getActiveEffects(character_id: string): FinancialRoomEffect[] {
    const effects = this.activeEffects.get(character_id) || [];
    const now = new Date();
    
    // Filter out expired effects
    const activeEffects = effects.filter(effect => {
      const expiryTime = new Date(effect.timestamp.getTime() + effect.duration * 60 * 60 * 1000);
      return now < expiryTime;
    });
    
    this.activeEffects.set(character_id, activeEffects);
    return activeEffects;
  }

  /**
   * Get active effects for a room
   */
  private getActiveEffectsForRoom(room_id: string): FinancialRoomEffect[] {
    const allEffects: FinancialRoomEffect[] = [];
    
    for (const [character_id, effects] of this.activeEffects) {
      const activeEffects = this.getActiveEffects(character_id);
      const roomEffects = activeEffects.filter(effect => effect.room_id === room_id);
      allEffects.push(...roomEffects);
    }
    
    return allEffects;
  }

  /**
   * Get room financial mood state summary
   */
  getRoomFinancialMoodState(room_id: string, headquarters: any): RoomFinancialMoodState {
    const room = headquarters?.rooms?.find(r => r.id === room_id);
    if (!room) {
      return {
        room_id,
        base_happiness: 3,
        financial_stressModifier: 0,
        luxury_boost_modifier: 0,
        room_investment_modifier: 0,
        conflict_financial_modifier: 0,
        total_financial_mood_effect: 0
      };
    }

    const roomEffects = this.getActiveEffectsForRoom(room_id);
    
    const financial_stressModifier = roomEffects
      .filter(e => e.effect_type === 'financial_anxiety')
      .reduce((sum, e) => sum + e.magnitude, 0);
    
    const luxuryBoostModifier = roomEffects
      .filter(e => e.effect_type === 'luxury_boost')
      .reduce((sum, e) => sum + e.magnitude, 0);
    
    const roomInvestmentModifier = roomEffects
      .filter(e => e.effect_type === 'room_investment_mood')
      .reduce((sum, e) => sum + e.magnitude, 0);
    
    const stressReductionModifier = roomEffects
      .filter(e => e.effect_type === 'stress_reduction')
      .reduce((sum, e) => sum + e.magnitude, 0);

    const totalFinancialMoodEffect = financial_stressModifier + luxuryBoostModifier + 
                                    roomInvestmentModifier + stressReductionModifier;

    return {
      room_id,
      base_happiness: 3, // This would come from existing system
      financial_stressModifier,
      luxury_boost_modifier: luxuryBoostModifier,
      room_investment_modifier: roomInvestmentModifier,
      conflict_financial_modifier: financial_stressModifier, // Conflicts contribute to stress
      total_financial_mood_effect: totalFinancialMoodEffect
    };
  }
}

export default FinancialRoomMoodService;