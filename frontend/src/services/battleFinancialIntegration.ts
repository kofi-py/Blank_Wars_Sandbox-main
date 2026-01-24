// Battle Financial Integration Service
// Connects battle events to financial decision-making and AI behavior

import { BattleCharacter, BattleState, MoraleEvent } from '../data/battleFlow';
import BattleFinancialService, { WildcardDecision, BattleFinancialState } from './battleFinancialService';
import FinancialPsychologyService from './financialPsychologyService';
import GameEventBus from './gameEventBus';
import { makeFinancialJudgeDecision, FinancialEventContext } from '../data/aiJudgeSystem';
import { FinancialDecision } from './apiClient';

export interface BattleFinancialModifiers {
  character_id: string;
  stress_modifier: number; // -50 to +50, affects battle performance
  confidence_modifier: number; // -50 to +50, affects ability selection
  risk_tolerance: number; // 0-100, affects AI decision making
  teamwork_modifier: number; // -25 to +25, affects team synergy
  focus_modifier: number; // -25 to +25, affects accuracy
}

export interface FinancialStressEffects {
  stat_modifiers: {
    strength: number;
    dexterity: number;
    intelligence: number;
    charisma: number;
    defense: number;
    speed: number;
  };
  mental_effects: {
    anxiety: number;
    focus: number;
    decision_quality: number;
  };
  battle_behavior: {
    aggressiveness: number;
    teamwork: number;
    risk_taking: number;
  };
}

export class BattleFinancialIntegration {
  private static instance: BattleFinancialIntegration;
  private battleFinancialService: BattleFinancialService;
  private psychologyService: FinancialPsychologyService;
  private eventBus: GameEventBus;
  private activeDecisions: Map<string, WildcardDecision[]> = new Map();

  private constructor() {
    this.battleFinancialService = BattleFinancialService.getInstance();
    this.psychologyService = FinancialPsychologyService.getInstance();
    this.eventBus = GameEventBus.getInstance();
  }

  static getInstance(): BattleFinancialIntegration {
    if (!BattleFinancialIntegration.instance) {
      BattleFinancialIntegration.instance = new BattleFinancialIntegration();
    }
    return BattleFinancialIntegration.instance;
  }

  /**
   * Initialize financial state for all characters entering battle
   */
  async initializeBattleFinancialState(battle_state: BattleState): Promise<void> {
    const allCharacters = [
      ...battle_state.teams.player.characters,
      ...battle_state.teams.opponent.characters
    ];

    for (const character of allCharacters) {
      // Initialize battle financial state
      this.battleFinancialService.initializeBattleFinancialState(character);

      // Initialize active decisions list
      this.activeDecisions.set(character.id, []);
    }
  }

  /**
   * Calculate financial stress effects on battle performance
   */
  calculateFinancialStressEffects(character: BattleCharacter): FinancialStressEffects {
    const financial_stress = this.calculateCharacterFinancialStress(character);
    const stress_level = financial_stress / 100; // Normalize to 0-1

    return {
      stat_modifiers: {
        strength: Math.round(-stress_level * 15), // High stress reduces physical performance
        dexterity: Math.round(-stress_level * 10), // Stress affects coordination
        intelligence: Math.round(-stress_level * 20), // Financial worry clouds judgment
        charisma: Math.round(-stress_level * 12), // Stress affects social presence
        defense: Math.round(-stress_level * 8), // Stress drains energy and resilience
        speed: Math.round(-stress_level * 5), // Slight speed reduction
      },
      mental_effects: {
        anxiety: Math.round(stress_level * 40), // 0-40 anxiety points
        focus: Math.round(-stress_level * 30), // -30 to 0 focus
        decision_quality: Math.round(-stress_level * 25), // -25 to 0 decision quality
      },
      battle_behavior: {
        aggressiveness: Math.round(stress_level * 20), // Stress can make characters more aggressive
        teamwork: Math.round(-stress_level * 15), // Hard to work with others when stressed
        risk_taking: Math.round(stress_level * 25), // Desperate behavior
      }
    };
  }

  /**
   * Apply financial stress modifiers to character's effective stats
   */
  applyFinancialStressModifiers(character: BattleCharacter): BattleCharacter {
    const effects = this.calculateFinancialStressEffects(character);

    // Apply stat modifiers
    const modifiedCharacter = { ...character };

    // Apply temporary stat modifications
    if (modifiedCharacter.temporary_stats) {
      modifiedCharacter.temporary_stats.strength += effects.stat_modifiers.strength;
      modifiedCharacter.temporary_stats.dexterity += effects.stat_modifiers.dexterity;
      modifiedCharacter.temporary_stats.intelligence += effects.stat_modifiers.intelligence;
      modifiedCharacter.temporary_stats.charisma += effects.stat_modifiers.charisma;
      modifiedCharacter.temporary_stats.defense += effects.stat_modifiers.defense;
      modifiedCharacter.temporary_stats.speed += effects.stat_modifiers.speed;
    }

    // Apply psychological effects
    if (modifiedCharacter.psych_stats) {
      modifiedCharacter.psych_stats.mental_health = Math.max(0,
        modifiedCharacter.psych_stats.mental_health - effects.mental_effects.anxiety
      );
      modifiedCharacter.psych_stats.gameplan_adherence = Math.max(0,
        modifiedCharacter.psych_stats.gameplan_adherence + effects.mental_effects.focus
      );
    }

    return modifiedCharacter;
  }

  /**
   * Enhance AI ability selection with financial risk assessment
   */
  enhanceAIAbilitySelection(
    character: BattleCharacter,
    available_abilities: any[],
    battle_state: BattleState
  ): any {

    const effects = this.calculateFinancialStressEffects(character);
    const risk_tolerance = this.calculateRiskTolerance(character, effects);

    // Filter abilities based on risk tolerance
    const suitableAbilities = available_abilities.filter(ability => {
      const abilityRisk = this.calculateAbilityRisk(ability);
      return abilityRisk <= risk_tolerance;
    });

    // If no suitable abilities (very low risk tolerance), use safest option
    if (suitableAbilities.length === 0) {
      return this.findSafestAbility(available_abilities);
    }

    // Weight abilities based on financial psychology
    const weightedAbilities = suitableAbilities.map(ability => ({
      ...ability,
      weight: this.calculateAbilityWeight(ability, character, effects)
    }));

    // Select ability using weighted random selection
    return this.selectWeightedAbility(weightedAbilities);
  }

  /**
   * Process battle events that could trigger financial decisions
   */
  async processBattleEvent(
    character: BattleCharacter,
    event: MoraleEvent,
    battle_state: BattleState
  ): Promise<void> {

    // Process event through battle financial service
    const wildcardDecision = await this.battleFinancialService.processBattleEvent(
      character,
      event,
      battle_state
    );

    if (wildcardDecision) {
      // Add to active decisions
      const characterDecisions = this.activeDecisions.get(character.id) || [];
      characterDecisions.push(wildcardDecision);
      this.activeDecisions.set(character.id, characterDecisions);

      // Publish battle financial decision event
      await this.eventBus.publishFinancialEvent(
        'battle_financial_decision',
        character.id,
        `${character.name} triggered ${wildcardDecision.decision_type} decision from ${event.event_type}`,
        {
          battle_event: event.event_type,
          decision_type: wildcardDecision.decision_type,
          amount: wildcardDecision.amount,
          urgency: wildcardDecision.urgency,
          risk_level: wildcardDecision.risk_level,
          type: 'battle_triggered'
        },
        event.event_type === 'victory' ? 'high' : 'critical'
      );
    }
  }

  /**
   * Auto-execute immediate wildcard decisions using AI
   */
  async executeImmediateWildcardDecisions(character_id: string): Promise<void> {
    const decisions = this.activeDecisions.get(character_id) || [];
    const immediateDecisions = decisions.filter(d => d.urgency === 'immediate');

    for (const decision of immediateDecisions) {
      const selectedOption = await this.selectWildcardOptionUsingAI(decision);

      if (selectedOption) {
        await this.processWildcardDecision(decision, selectedOption);

        // Remove from active decisions
        const remainingDecisions = decisions.filter(d => d.decision_id !== decision.decision_id);
        this.activeDecisions.set(character_id, remainingDecisions);
      }
    }
  }

  /**
   * Get pending wildcard decisions for a character
   */
  getPendingWildcardDecisions(character_id: string): WildcardDecision[] {
    return this.activeDecisions.get(character_id) || [];
  }

  /**
   * Process a wildcard decision outcome
   */
  async processWildcardDecision(
    decision: WildcardDecision,
    selected_option: any
  ): Promise<void> {

    // Simulate outcome based on option risk and character state
    const outcome = this.simulateWildcardOutcome(decision, selected_option);

    // Apply financial impact
    await this.applyFinancialImpact(decision.character_id, outcome);

    // Create actual FinancialDecision record for judge evaluation
    const actualDecision: FinancialDecision = {
      id: `${decision.decision_id}_outcome`,
      character_id: decision.character_id,
      amount: decision.amount,
      category: 'wildcard',
      description: `${decision.decision_type}: ${selected_option.name}`,
      options: decision.options.map(o => o.name),
      character_reasoning: decision.ai_recommendation,
      urgency: decision.urgency === 'immediate' ? 'high' : decision.urgency === 'post_battle' ? 'medium' : 'low',
      is_risky: true, // Wildcard decisions are inherently risky
      status: 'decided',
      coach_influence_attempts: 0,
      timestamp: new Date(),
      coach_advice: decision.ai_recommendation,
      followed_advice: false, // Wildcard decisions are emotional, not coach-driven
      outcome: outcome.result === 'positive' ? 'positive' : outcome.result === 'negative' ? 'negative' : 'neutral',
      financial_impact: outcome.financial_impact,
      stress_impact: outcome.stress_impact,
      relationship_impact: 0 // May be calculated elsewhere
    };

    // Get current character financial state for accurate stress level
    const battleFinancialState = this.battleFinancialService.getBattleFinancialState(decision.character_id);
    const currentStress = battleFinancialState ?
      this.calculateStressFromBattleState(battleFinancialState) :
      50; // Default if state not found

    // Get AI Judge evaluation of the actual outcome
    const context: FinancialEventContext = {
      character_id: decision.character_id,
      event_type: 'outcome',
      financial_impact: outcome.financial_impact,
      stress_level: currentStress,
      coach_involvement: !!decision.ai_recommendation,
      battle_context: {
        emotional_state: this.summarizeEmotionalState(battleFinancialState?.emotional_state),
        trigger_event: decision.decision_type,
        performance_level: battleFinancialState ?
          this.assessPerformanceLevel(battleFinancialState.battle_performance) :
          'unknown'
      }
    };

    const judgeEvaluation = makeFinancialJudgeDecision(
      context,
      actualDecision,
      {
        success: outcome.result === 'positive',
        actualImpact: outcome.financial_impact,
        stress_change: outcome.stress_impact
      }
    );

    // Publish judge evaluation
    await this.eventBus.publishFinancialEvent(
      'judge_financial_outcome_assessment',
      decision.character_id,
      `AI Judge evaluation: ${judgeEvaluation.ruling}`,
      {
        judge_ruling: judgeEvaluation.ruling,
        judge_commentary: judgeEvaluation.commentary,
        risk_assessment: judgeEvaluation.risk_assessment,
        coach_evaluation: judgeEvaluation.coach_evaluation,
        intervention_recommendation: judgeEvaluation.intervention_recommendation,
        original_decision: decision.decision_type,
        selected_option: selected_option.name,
        type: 'judge_evaluation'
      },
      judgeEvaluation.risk_assessment === 'catastrophic' ? 'critical' :
        judgeEvaluation.risk_assessment === 'poor' ? 'high' : 'medium'
    );

    // Publish outcome event
    await this.eventBus.publishFinancialEvent(
      decision.decision_type as any,
      decision.character_id,
      `${decision.character_id} executed ${selected_option.name}: ${outcome.description}`,
      {
        original_decision: decision.decision_type,
        selected_option: selected_option.name,
        financial_impact: outcome.financial_impact,
        stress_impact: outcome.stress_impact,
        outcome: outcome.result,
        type: 'wildcard_outcome'
      },
      outcome.result === 'negative' ? 'high' : 'medium'
    );
  }

  /**
   * Finalize battle financial state
   */
  async finalizeBattleFinancialState(battle_state: BattleState): Promise<void> {
    const allCharacters = [
      ...battle_state.teams.player.characters,
      ...battle_state.teams.opponent.characters
    ];

    for (const character of allCharacters) {
      // Process any remaining post-battle decisions
      await this.processPostBattleDecisions(character.id);

      // Clean up battle state
      this.battleFinancialService.finalizeBattleFinancialState(character.id);
      this.activeDecisions.delete(character.id);
    }
  }

  // Private helper methods
  private calculateStressFromBattleState(state: BattleFinancialState): number {
    // Calculate stress based on emotional state
    const adrenaline = state.emotional_state.adrenaline_level;
    const frustration = state.emotional_state.defeat_frustration;
    const confidence = state.emotional_state.confidence;

    // High adrenaline and frustration = high stress, confidence reduces stress
    return Math.max(0, Math.min(100, (adrenaline + frustration) / 2 - confidence / 3));
  }

  private summarizeEmotionalState(emotional?: any): string {
    if (!emotional) return 'neutral';

    const states = [];
    if (emotional.adrenaline_level > 70) states.push('high_adrenaline');
    if (emotional.confidence > 80) states.push('confident');
    if (emotional.defeat_frustration > 60) states.push('frustrated');
    if (emotional.victoryEuphoria > 70) states.push('euphoric');
    if (emotional.prideLevel > 80) states.push('proud');

    return states.length > 0 ? states.join('_') : 'neutral';
  }

  private assessPerformanceLevel(performance?: any): string {
    if (!performance) return 'unknown';

    const score = (
      performance.victoryContribution * 0.3 +
      performance.teamworkScore * 0.2 +
      performance.critical_hits * 10 +
      performance.heroicActions * 15 +
      (performance.survivalRate / 100) * 25
    );

    if (score > 80) return 'excellent';
    if (score > 60) return 'good';
    if (score > 40) return 'average';
    if (score > 20) return 'poor';
    return 'terrible';
  }

  private calculateCharacterFinancialStress(character: BattleCharacter): number {
    if (!character.financial_personality) return 0;
    if (typeof character.wallet !== 'number') {
      throw new Error('wallet must be a number from database');
    }
    if (typeof character.monthly_earnings !== 'number') {
      throw new Error('monthly_earnings must be a number from database');
    }
    if (!character.recent_decisions) {
      throw new Error('recent_decisions must exist from database');
    }

    const stressAnalysis = this.psychologyService.calculateFinancialStress(
      character.id,
      character.wallet,
      character.monthly_earnings,
      character.recent_decisions,
      character.financial_personality
    );

    return stressAnalysis.stress;
  }

  private calculateRiskTolerance(character: BattleCharacter, effects: FinancialStressEffects): number {
    if (!character.financial_personality?.risk_tolerance) {
      throw new Error('financial_personality.risk_tolerance must exist from database');
    }
    const baseRiskTolerance = character.financial_personality.risk_tolerance;
    const stressModifier = effects.battle_behavior.risk_taking;
    if (typeof character.psych_stats?.mental_health !== 'number') {
      throw new Error('psych_stats.mental_health must be a number from database');
    }
    const confidenceModifier = character.psych_stats.mental_health;

    return Math.max(0, Math.min(100, baseRiskTolerance + stressModifier + (confidenceModifier - 50) * 0.5));
  }

  private calculateAbilityRisk(ability: any): number {
    // Mock risk calculation - in real implementation, this would be based on ability properties
    if (ability.type === 'aggressive') return 80;
    if (ability.type === 'defensive') return 20;
    if (ability.type === 'balanced') return 50;
    return 40;
  }

  private findSafestAbility(abilities: any[]): any {
    return abilities.reduce((safest, current) =>
      this.calculateAbilityRisk(current) < this.calculateAbilityRisk(safest) ? current : safest
    );
  }

  private calculateAbilityWeight(ability: any, character: BattleCharacter, effects: FinancialStressEffects): number {
    let weight = 1;

    // High stress characters prefer aggressive abilities
    if (effects.battle_behavior.aggressiveness > 15 && ability.type === 'aggressive') {
      weight *= 1.5;
    }

    // Low teamwork characters avoid team abilities
    if (effects.battle_behavior.teamwork < -10 && ability.type === 'team') {
      weight *= 0.5;
    }

    // High risk tolerance characters prefer risky abilities
    const risk_tolerance = this.calculateRiskTolerance(character, effects);
    const abilityRisk = this.calculateAbilityRisk(ability);

    if (risk_tolerance > 70 && abilityRisk > 60) {
      weight *= 1.3;
    }

    return weight;
  }

  private selectWeightedAbility(weightedAbilities: any[]): any {
    const totalWeight = weightedAbilities.reduce((sum, ability) => sum + ability.weight, 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const ability of weightedAbilities) {
      currentWeight += ability.weight;
      if (random <= currentWeight) {
        return ability;
      }
    }

    return weightedAbilities[0]; // Fallback
  }

  private async selectWildcardOptionUsingAI(decision: WildcardDecision): Promise<any> {
    // AI selection based on emotional appeal vs logical score
    const options = decision.options;

    // For immediate decisions, AI tends to be more emotional
    const emotional_weight = decision.urgency === 'immediate' ? 0.7 : 0.3;
    const logicalWeight = 1 - emotional_weight;

    const scoredOptions = options.map(option => ({
      ...option,
      ai_score: (option.emotional_appeal * emotional_weight) + (option.logical_score * logicalWeight)
    }));

    // Add some randomness to avoid completely predictable behavior
    const randomizedOptions = scoredOptions.map(option => ({
      ...option,
      final_score: option.ai_score + (Math.random() - 0.5) * 20
    }));

    return randomizedOptions.reduce((best, current) =>
      current.final_score > best.final_score ? current : best
    );
  }

  private simulateWildcardOutcome(decision: WildcardDecision, selected_option: any): any {
    // Simulate outcome based on option risk and random factors
    const random = Math.random();

    if (random < 0.2) {
      return {
        result: 'positive',
        description: selected_option.outcomes.best.description,
        financial_impact: selected_option.outcomes.best.financial_impact,
        stress_impact: selected_option.outcomes.best.stress_impact
      };
    } else if (random < 0.8) {
      return {
        result: 'neutral',
        description: selected_option.outcomes.likely.description,
        financial_impact: selected_option.outcomes.likely.financial_impact,
        stress_impact: selected_option.outcomes.likely.stress_impact
      };
    } else {
      return {
        result: 'negative',
        description: selected_option.outcomes.worst.description,
        financial_impact: selected_option.outcomes.worst.financial_impact,
        stress_impact: selected_option.outcomes.worst.stress_impact
      };
    }
  }

  private async applyFinancialImpact(character_id: string, outcome: any): Promise<void> {
    // In a real implementation, this would update the character's financial state
    console.log(`Applied financial impact to ${character_id}:`, outcome);
  }

  private async processPostBattleDecisions(character_id: string): Promise<void> {
    const decisions = this.activeDecisions.get(character_id) || [];
    const postBattleDecisions = decisions.filter(d => d.urgency === 'post_battle');

    for (const decision of postBattleDecisions) {
      const selectedOption = await this.selectWildcardOptionUsingAI(decision);
      if (selectedOption) {
        await this.processWildcardDecision(decision, selectedOption);
      }
    }
  }
}

export default BattleFinancialIntegration;