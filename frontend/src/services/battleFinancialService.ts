// Battle Financial Service - AI-Driven Financial Wildcard Decisions
// Integrates financial psychology with battle outcomes for dynamic decision-making

import { BattleCharacter, BattleState, MoraleEvent } from '../data/battleFlow';
import { FinancialDecision, FinancialPersonality } from './apiClient';
import FinancialPsychologyService from './financialPsychologyService';
import GameEventBus from './gameEventBus';
import { makeFinancialJudgeDecision, FinancialEventContext, getRandomJudge } from '../data/aiJudgeSystem';

export interface BattleFinancialState {
  character_id: string;
  pre_earnings: number;
  current_earnings: number;
  battle_performance: BattlePerformanceMetrics;
  emotional_state: BattleEmotionalState;
  wildcard_triggers: WildcardTrigger[];
}

export interface BattlePerformanceMetrics {
  damage_dealt: number;
  damage_taken: number;
  critical_hits: number;
  heroic_actions: number;
  teamwork_score: number;
  survival_rate: number; // 0-100%
  comeback_moments: number;
  victory_contribution: number; // 0-100%
}

export interface BattleEmotionalState {
  adrenaline_level: number; // 0-100, affects risk tolerance
  confidence: number; // 0-100, from battle performance
  team_bond_feeling: number; // 0-100, affects generous decisions
  victory_euphoria: number; // 0-100, affects impulsive spending
  defeat_frustration: number; // 0-100, affects desperate decisions
  pride_level: number; // 0-100, affects showing off decisions
}

export interface WildcardTrigger {
  trigger_type: 'critical_hit' | 'near_death' | 'comeback' | 'victory' | 'defeat' | 'heroic_save' | 'betrayal' | 'ally_down';
  intensity: number; // 0-100, how intense the moment was
  timestamp: Date;
  description: string;
  financial_impact: 'impulsive_spending' | 'conservative_saving' | 'risky_investment' | 'generous_giving' | 'desperate_gamble';
}

export interface WildcardDecision {
  decision_id: string;
  character_id: string;
  trigger_event: WildcardTrigger;
  decision_type: 'victory_splurge' | 'defeat_desperation' | 'adrenaline_investment' | 'team_celebration' | 'pride_purchase' | 'panic_selling';
  amount: number;
  options: WildcardOption[];
  urgency: 'immediate' | 'post_battle' | 'next_day';
  ai_recommendation?: string;
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
}

export interface WildcardOption {
  id: string;
  name: string;
  description: string;
  amount: number;
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  emotional_appeal: number; // 0-100, how appealing in current emotional state
  logical_score: number; // 0-100, how logical the choice is
  outcomes: {
    best: { description: string; financial_impact: number; stress_impact: number };
    likely: { description: string; financial_impact: number; stress_impact: number };
    worst: { description: string; financial_impact: number; stress_impact: number };
  };
}

export class BattleFinancialService {
  private static instance: BattleFinancialService;
  private psychologyService: FinancialPsychologyService;
  private eventBus: GameEventBus;
  private battle_states: Map<string, BattleFinancialState> = new Map();

  private constructor() {
    this.psychologyService = FinancialPsychologyService.getInstance();
    this.eventBus = GameEventBus.getInstance();
  }

  static getInstance(): BattleFinancialService {
    if (!BattleFinancialService.instance) {
      BattleFinancialService.instance = new BattleFinancialService();
    }
    return BattleFinancialService.instance;
  }

  /**
   * Initialize financial state tracking for a character entering battle
   */
  initializeBattleFinancialState(character: BattleCharacter): void {
    const state: BattleFinancialState = {
      character_id: character.id,
      pre_earnings: character.financials?.wallet || 0,
      current_earnings: 0,
      battle_performance: {
        damage_dealt: 0,
        damage_taken: 0,
        critical_hits: 0,
        heroic_actions: 0,
        teamwork_score: 50,
        survival_rate: 100,
        comeback_moments: 0,
        victory_contribution: 0
      },
      emotional_state: {
        adrenaline_level: 30,
        confidence: character.psych_stats?.mental_health || 50,
        team_bond_feeling: character.psych_stats?.team_player || 50,
        victory_euphoria: 0,
        defeat_frustration: 0,
        pride_level: character.psych_stats?.ego || 50
      },
      wildcard_triggers: []
    };

    this.battle_states.set(character.id, state);
  }

  /**
   * Process battle events that could trigger financial decisions
   */
  async processBattleEvent(
    character: BattleCharacter,
    event: MoraleEvent,
    battle_state: BattleState
  ): Promise<WildcardDecision | null> {
    
    const financial_state = this.battle_states.get(character.id);
    if (!financial_state) return null;

    // Update emotional state based on event
    this.updateEmotionalState(financial_state, event);

    // Check if this event should trigger a wildcard decision
    const wildcardTrigger = this.evaluateWildcardTrigger(event, financial_state, character);
    if (!wildcardTrigger) return null;

    // Add trigger to history
    financial_state.wildcard_triggers.push(wildcardTrigger);

    // Generate AI-driven wildcard decision
    const wildcardDecision = await this.generateWildcardDecision(
      character,
      wildcardTrigger,
      financial_state,
      battle_state
    );

    // Publish wildcard decision event
    await this.eventBus.publishFinancialEvent(
      'financial_wildcard_triggered',
      character.id,
      `${character.name} triggered ${wildcardTrigger.trigger_type} wildcard decision: ${wildcardDecision.decision_type}`,
      {
        trigger_event: wildcardTrigger.trigger_type,
        decision_type: wildcardDecision.decision_type,
        amount: wildcardDecision.amount,
        risk_level: wildcardDecision.risk_level,
        type: 'wildcard_trigger'
      },
      wildcardDecision.risk_level === 'extreme' ? 'critical' : 'high'
    );

    return wildcardDecision;
  }

  /**
   * Update character's emotional state based on battle events
   */
  private updateEmotionalState(state: BattleFinancialState, event: MoraleEvent): void {
    switch (event.event_type) {
      case 'critical_hit':
        state.emotional_state.adrenaline_level = Math.min(100, state.emotional_state.adrenaline_level + 25);
        state.emotional_state.confidence = Math.min(100, state.emotional_state.confidence + 15);
        state.emotional_state.pride_level = Math.min(100, state.emotional_state.pride_level + 20);
        break;
        
      case 'near_death':
        state.emotional_state.adrenaline_level = Math.min(100, state.emotional_state.adrenaline_level + 40);
        state.emotional_state.confidence = Math.max(0, state.emotional_state.confidence - 20);
        break;
        
      case 'comeback':
        state.emotional_state.adrenaline_level = Math.min(100, state.emotional_state.adrenaline_level + 35);
        state.emotional_state.confidence = Math.min(100, state.emotional_state.confidence + 30);
        state.emotional_state.pride_level = Math.min(100, state.emotional_state.pride_level + 25);
        break;
        
      case 'victory':
        state.emotional_state.victory_euphoria = Math.min(100, state.emotional_state.victory_euphoria + 50);
        state.emotional_state.confidence = Math.min(100, state.emotional_state.confidence + 25);
        state.emotional_state.pride_level = Math.min(100, state.emotional_state.pride_level + 20);
        break;
        
      case 'defeat':
        state.emotional_state.defeat_frustration = Math.min(100, state.emotional_state.defeat_frustration + 40);
        state.emotional_state.confidence = Math.max(0, state.emotional_state.confidence - 30);
        break;
        
      case 'heroic_save':
        state.emotional_state.team_bond_feeling = Math.min(100, state.emotional_state.team_bond_feeling + 30);
        state.emotional_state.pride_level = Math.min(100, state.emotional_state.pride_level + 25);
        break;
        
      case 'betrayal':
        state.emotional_state.team_bond_feeling = Math.max(0, state.emotional_state.team_bond_feeling - 40);
        state.emotional_state.defeat_frustration = Math.min(100, state.emotional_state.defeat_frustration + 30);
        break;
        
      case 'ally_down':
        state.emotional_state.team_bond_feeling = Math.max(0, state.emotional_state.team_bond_feeling - 20);
        state.emotional_state.confidence = Math.max(0, state.emotional_state.confidence - 15);
        break;
    }
  }

  /**
   * Evaluate if a battle event should trigger a wildcard financial decision
   */
  private evaluateWildcardTrigger(
    event: MoraleEvent,
    state: BattleFinancialState,
    character: BattleCharacter
  ): WildcardTrigger | null {
    
    const personality = character.financial_personality;
    const currentStress = this.calculateCurrentStress(state, personality);
    
    // Base trigger chances for different event types
    const baseTriggerChances = {
      'critical_hit': 0.3,
      'near_death': 0.4,
      'comeback': 0.5,
      'victory': 0.6,
      'defeat': 0.4,
      'heroic_save': 0.3,
      'betrayal': 0.2,
      'ally_down': 0.1
    };
    
    let triggerChance = baseTriggerChances[event.event_type] || 0;
    
    // Personality modifiers
    if (personality?.spending_style === 'impulsive') {
      triggerChance *= 1.5;
    } else if (personality?.spending_style === 'conservative') {
      triggerChance *= 0.7;
    }
    
    // Emotional state modifiers
    if (state.emotional_state.adrenaline_level > 70) {
      triggerChance *= 1.3;
    }
    
    if (state.emotional_state.victory_euphoria > 50) {
      triggerChance *= 1.4;
    }
    
    if (state.emotional_state.defeat_frustration > 60) {
      triggerChance *= 1.2;
    }
    
    // Stress modifiers
    if (currentStress > 70) {
      triggerChance *= 1.2; // High stress = more impulsive
    }
    
    // Random check
    if (Math.random() > triggerChance) return null;
    
    // Determine financial impact type
    const financial_impact = this.determineFinancialImpact(event, state, personality);
    
    return {
      trigger_type: event.event_type,
      intensity: this.calculateEventIntensity(event, state),
      timestamp: new Date(),
      description: event.description,
      financial_impact
    };
  }

  /**
   * Generate AI-driven wildcard decision based on trigger and character state
   */
  private async generateWildcardDecision(
    character: BattleCharacter,
    trigger: WildcardTrigger,
    state: BattleFinancialState,
    battle_state: BattleState
  ): Promise<WildcardDecision> {
    
    const personality = character.financial_personality;
    const currentWallet = character.financials?.wallet || 0;
    const earnings = state.current_earnings;
    
    // Determine decision type based on trigger and emotional state
    const decision_type = this.determineDecisionType(trigger, state, personality);
    
    // Calculate decision amount based on emotional state and wallet
    const amount = this.calculateDecisionAmount(decision_type, currentWallet, earnings, state);
    
    // Generate options using AI decision-making
    const options = await this.generateWildcardOptions(
      decision_type,
      amount,
      state,
      personality,
      trigger
    );
    
    // Determine urgency
    const urgency = this.determineUrgency(trigger, state);
    
    // Generate AI recommendation
    const ai_recommendation = await this.generateAIRecommendation(
      character,
      trigger,
      options,
      state
    );
    
    return {
      decision_id: `wildcard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      character_id: character.id,
      trigger_event: trigger,
      decision_type,
      amount,
      options,
      urgency,
      ai_recommendation,
      risk_level: this.calculateOverallRisk(options, state, personality)
    };
  }

  /**
   * Generate wildcard options using AI decision-making
   */
  private async generateWildcardOptions(
    decision_type: WildcardDecision['decision_type'],
    amount: number,
    state: BattleFinancialState,
    personality: FinancialPersonality | undefined,
    trigger: WildcardTrigger
  ): Promise<WildcardOption[]> {
    
    const options: WildcardOption[] = [];
    
    switch (decision_type) {
      case 'victory_splurge':
        options.push(
          this.createWildcardOption(
            'luxury_celebration',
            'Luxury Victory Celebration',
            'Rent a private venue and celebrate with the team in style',
            amount * 0.6,
            'high',
            85, // High emotional appeal after victory
            30, // Low logical score
            state
          ),
          this.createWildcardOption(
            'victory_investment',
            'Victory Investment',
            'Invest the winnings in a high-growth opportunity',
            amount * 0.8,
            'medium',
            65,
            75,
            state
          ),
          this.createWildcardOption(
            'save_winnings',
            'Save Victory Earnings',
            'Put the earnings aside for future needs',
            amount * 0.9,
            'low',
            25,
            90,
            state
          )
        );
        break;
        
      case 'defeat_desperation':
        options.push(
          this.createWildcardOption(
            'desperate_gamble',
            'High-Risk Gamble',
            'Try to win back losses with a risky investment',
            amount * 1.5,
            'extreme',
            75,
            15,
            state
          ),
          this.createWildcardOption(
            'comfort_spending',
            'Comfort Purchase',
            'Buy something to feel better about the loss',
            amount * 0.4,
            'medium',
            60,
            35,
            state
          ),
          this.createWildcardOption(
            'conservative_recovery',
            'Conservative Recovery',
            'Focus on steady income and avoid risks',
            amount * 0.2,
            'low',
            30,
            85,
            state
          )
        );
        break;
        
      case 'adrenaline_investment':
        options.push(
          this.createWildcardOption(
            'high_risk_trade',
            'Adrenaline Trade',
            'Make a bold investment while feeling invincible',
            amount * 1.2,
            'extreme',
            80,
            25,
            state
          ),
          this.createWildcardOption(
            'equipment_upgrade',
            'Battle Equipment',
            'Invest in better gear for future battles',
            amount * 0.7,
            'medium',
            70,
            70,
            state
          ),
          this.createWildcardOption(
            'training_investment',
            'Skill Training',
            'Invest in training to improve performance',
            amount * 0.5,
            'low',
            45,
            85,
            state
          )
        );
        break;
        
      case 'team_celebration':
        options.push(
          this.createWildcardOption(
            'team_party',
            'Team Victory Party',
            'Throw a party for the whole team',
            amount * 0.8,
            'medium',
            90,
            50,
            state
          ),
          this.createWildcardOption(
            'team_gifts',
            'Team Gifts',
            'Buy meaningful gifts for teammates',
            amount * 0.6,
            'low',
            85,
            60,
            state
          ),
          this.createWildcardOption(
            'team_investment',
            'Team Business',
            'Invest in a business venture with teammates',
            amount * 1.0,
            'high',
            70,
            65,
            state
          )
        );
        break;
        
      case 'pride_purchase':
        options.push(
          this.createWildcardOption(
            'status_symbol',
            'Status Symbol',
            'Buy something impressive to show off success',
            amount * 0.9,
            'high',
            85,
            20,
            state
          ),
          this.createWildcardOption(
            'modest_celebration',
            'Modest Celebration',
            'Celebrate success without going overboard',
            amount * 0.3,
            'low',
            40,
            80,
            state
          ),
          this.createWildcardOption(
            'reinvest_success',
            'Reinvest in Success',
            'Use success to fund future opportunities',
            amount * 0.7,
            'medium',
            55,
            75,
            state
          )
        );
        break;
        
      case 'panic_selling':
        options.push(
          this.createWildcardOption(
            'liquidate_assets',
            'Emergency Liquidation',
            'Sell investments to feel more secure',
            amount * 0.8,
            'high',
            70,
            30,
            state
          ),
          this.createWildcardOption(
            'hold_steady',
            'Hold Steady',
            'Resist panic and maintain current investments',
            amount * 0.1,
            'low',
            25,
            85,
            state
          ),
          this.createWildcardOption(
            'diversify_risk',
            'Diversify Portfolio',
            'Spread investments to reduce risk',
            amount * 0.6,
            'medium',
            50,
            70,
            state
          )
        );
        break;
    }
    
    return options;
  }

  /**
   * Create a wildcard option with calculated outcomes
   */
  private createWildcardOption(
    id: string,
    name: string,
    description: string,
    amount: number,
    risk_level: WildcardOption['risk_level'],
    emotional_appeal: number,
    logical_score: number,
    state: BattleFinancialState
  ): WildcardOption {
    
    // Calculate outcomes based on risk level and emotional state
    const riskMultiplier = {
      'low': 0.1,
      'medium': 0.3,
      'high': 0.6,
      'extreme': 1.0
    }[risk_level];
    
    const emotionalBonus = state.emotional_state.confidence > 70 ? 0.2 : 0;
    const stressModifier = state.emotional_state.adrenaline_level > 80 ? 0.5 : 0;
    
    return {
      id,
      name,
      description,
      amount,
      risk_level,
      emotional_appeal,
      logical_score,
      outcomes: {
        best: {
          description: `Best case: ${name} succeeds spectacularly`,
          financial_impact: amount * (0.5 + riskMultiplier + emotionalBonus),
          stress_impact: -10 - (emotional_appeal * 0.2)
        },
        likely: {
          description: `Most likely: ${name} has moderate results`,
          financial_impact: amount * (0.1 + riskMultiplier * 0.5),
          stress_impact: -5 + (riskMultiplier * 10)
        },
        worst: {
          description: `Worst case: ${name} backfires significantly`,
          financial_impact: -amount * (0.3 + riskMultiplier + stressModifier),
          stress_impact: 15 + (riskMultiplier * 20)
        }
      }
    };
  }

  // Helper methods
  private calculateCurrentStress(state: BattleFinancialState, personality: FinancialPersonality | undefined): number {
    return Math.min(100, 
      (state.emotional_state.adrenaline_level * 0.3) +
      (state.emotional_state.defeat_frustration * 0.4) +
      ((100 - state.emotional_state.confidence) * 0.3)
    );
  }

  private determineFinancialImpact(
    event: MoraleEvent,
    state: BattleFinancialState,
    personality: FinancialPersonality | undefined
  ): WildcardTrigger['financial_impact'] {
    
    if (event.event_type === 'victory' || event.event_type === 'critical_hit') {
      return state.emotional_state.pride_level > 70 ? 'impulsive_spending' : 'generous_giving';
    }
    
    if (event.event_type === 'defeat' || event.event_type === 'near_death') {
      return state.emotional_state.defeat_frustration > 60 ? 'desperate_gamble' : 'conservative_saving';
    }
    
    if (event.event_type === 'comeback') {
      return 'risky_investment';
    }
    
    return 'conservative_saving';
  }

  private determineDecisionType(
    trigger: WildcardTrigger,
    state: BattleFinancialState,
    personality: FinancialPersonality | undefined
  ): WildcardDecision['decision_type'] {
    
    if (trigger.trigger_type === 'victory') {
      return state.emotional_state.team_bond_feeling > 70 ? 'team_celebration' : 'victory_splurge';
    }
    
    if (trigger.trigger_type === 'defeat') {
      return 'defeat_desperation';
    }
    
    if (trigger.trigger_type === 'critical_hit' || trigger.trigger_type === 'comeback') {
      return state.emotional_state.adrenaline_level > 80 ? 'adrenaline_investment' : 'pride_purchase';
    }
    
    if (trigger.trigger_type === 'heroic_save') {
      return 'team_celebration';
    }
    
    if (trigger.trigger_type === 'near_death' || trigger.trigger_type === 'ally_down') {
      return 'panic_selling';
    }
    
    return 'pride_purchase';
  }

  private calculateDecisionAmount(
    decision_type: WildcardDecision['decision_type'],
    wallet: number,
    earnings: number,
    state: BattleFinancialState
  ): number {
    
    const availableMoney = wallet + earnings;
    const emotionalMultiplier = (state.emotional_state.adrenaline_level + state.emotional_state.victory_euphoria) / 100;
    
    let baseAmount = availableMoney * 0.3; // Default 30% of available money
    
    switch (decision_type) {
      case 'victory_splurge':
        baseAmount = availableMoney * 0.4;
        break;
      case 'defeat_desperation':
        baseAmount = availableMoney * 0.6;
        break;
      case 'adrenaline_investment':
        baseAmount = availableMoney * 0.5;
        break;
      case 'team_celebration':
        baseAmount = availableMoney * 0.25;
        break;
      case 'pride_purchase':
        baseAmount = availableMoney * 0.35;
        break;
      case 'panic_selling':
        baseAmount = availableMoney * 0.8;
        break;
    }
    
    return Math.round(baseAmount * (1 + emotionalMultiplier * 0.5));
  }

  private calculateEventIntensity(event: MoraleEvent, state: BattleFinancialState): number {
    const baseMorale = Math.abs(event.morale_impact);
    const emotionalAmplifier = (state.emotional_state.adrenaline_level + state.emotional_state.pride_level) / 200;
    return Math.min(100, baseMorale * 2 + emotionalAmplifier * 50);
  }

  private determineUrgency(trigger: WildcardTrigger, state: BattleFinancialState): WildcardDecision['urgency'] {
    if (trigger.trigger_type === 'critical_hit' || trigger.trigger_type === 'near_death') {
      return 'immediate';
    }
    
    if (trigger.trigger_type === 'victory' || trigger.trigger_type === 'defeat') {
      return 'post_battle';
    }
    
    return 'next_day';
  }

  private async generateAIRecommendation(
    character: BattleCharacter,
    trigger: WildcardTrigger,
    options: WildcardOption[],
    state: BattleFinancialState
  ): Promise<string> {
    
    // Find the most logical option
    const bestLogicalOption = options.reduce((best, option) => 
      option.logical_score > best.logical_score ? option : best
    );
    
    // Find the most emotionally appealing option
    const mostEmotionalOption = options.reduce((best, option) => 
      option.emotional_appeal > best.emotional_appeal ? option : best
    );
    
    // Generate recommendation based on character state
    if (state.emotional_state.adrenaline_level > 80) {
      return `Consider waiting until the adrenaline subsides. ${bestLogicalOption.name} would be the wisest choice.`;
    }
    
    if (state.emotional_state.confidence < 30) {
      return `Focus on rebuilding confidence first. ${bestLogicalOption.name} offers the best long-term stability.`;
    }
    
    if (bestLogicalOption.id === mostEmotionalOption.id) {
      return `Both logic and emotion align - ${bestLogicalOption.name} is the clear choice.`;
    }
    
    return `Your heart wants ${mostEmotionalOption.name}, but ${bestLogicalOption.name} would be more strategic.`;
  }

  private calculateOverallRisk(
    options: WildcardOption[],
    state: BattleFinancialState,
    personality: FinancialPersonality | undefined
  ): WildcardDecision['risk_level'] {
    
    const highRiskOptions = options.filter(o => o.risk_level === 'high' || o.risk_level === 'extreme').length;
    const emotional_state = state.emotional_state.adrenaline_level + state.emotional_state.victory_euphoria;
    
    if (highRiskOptions >= 2 && emotional_state > 150) {
      return 'extreme';
    }
    
    if (highRiskOptions >= 1 || emotional_state > 120) {
      return 'high';
    }
    
    if (emotional_state > 80) {
      return 'medium';
    }
    
    return 'low';
  }


  /**
   * Get current battle financial state for a character
   */
  getBattleFinancialState(character_id: string): BattleFinancialState | undefined {
    return this.battle_states.get(character_id);
  }

  /**
   * Clean up battle state after battle ends
   */
  finalizeBattleFinancialState(character_id: string): void {
    this.battle_states.delete(character_id);
  }
}

export default BattleFinancialService;