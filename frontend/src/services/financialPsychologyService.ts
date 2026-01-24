// Financial Psychology Service
// Implements money-stress psychological feedback system for character financial behavior

import { FinancialPersonality, FinancialDecision } from './apiClient';
import GameEventBus from './gameEventBus';
import LuxuryPurchaseService from './luxuryPurchaseService';

export interface FinancialStressFactors {
  low_money: number;           // Stress from having little money
  debt_pressure: number;       // Stress from owing money
  recent_losses: number;       // Stress from recent financial losses
  uncertainty: number;       // Stress from unpredictable income
  social_pressure: number;    // Stress from comparing to others
  goal_progress: number;      // Stress from not reaching financial goals
}

export interface FinancialDecisionQuality {
  impulsiveness: number;     // 0-100, higher = more impulsive decisions
  risk_assessment: number;    // 0-100, higher = better at evaluating risks
  long_term_thinking: number;  // 0-100, higher = considers future impact
  coach_influence: number;    // 0-100, how much coach advice matters
  overall_quality: number;    // 0-100, overall decision-making quality
  spiral_risk: number;        // 0-100, risk of entering decision spiral
  desperation_mode: boolean;  // True when in panic mode (80%+ stress)
}

export interface SpiralState {
  is_in_spiral: boolean;
  spiral_intensity: number;  // 0-100, how deep in the spiral
  consecutive_poor_decisions: number;
  spiral_trigger?: string;   // What started the spiral
  intervention_needed: boolean;
  recommendations: string[];
}

export class FinancialPsychologyService {
  private static instance: FinancialPsychologyService;
  private eventBus: GameEventBus;
  private luxuryService: LuxuryPurchaseService;

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    // Lazy load LuxuryPurchaseService to break circular dependency
  }

  private getLuxuryService(): LuxuryPurchaseService {
    if (!this.luxuryService) {
      this.luxuryService = LuxuryPurchaseService.getInstance();
    }
    return this.luxuryService;
  }

  static getInstance(): FinancialPsychologyService {
    if (!FinancialPsychologyService.instance) {
      FinancialPsychologyService.instance = new FinancialPsychologyService();
    }
    return FinancialPsychologyService.instance;
  }

  /**
   * Calculate financial stress based on multiple factors
   */
  calculateFinancialStress(
    character_id: string,
    wallet: number,
    monthly_earnings: number,
    recent_decisions: FinancialDecision[],
    financial_personality: FinancialPersonality
  ): { stress: number; factors: FinancialStressFactors; recommendations: string[] } {
    
    const factors: FinancialStressFactors = {
      low_money: this.calculateLowMoneyStress(wallet, monthly_earnings),
      debt_pressure: this.calculateDebtStress(wallet),
      recent_losses: this.calculateRecentLossStress(recent_decisions),
      uncertainty: this.calculateUncertaintyStress(monthly_earnings, recent_decisions),
      social_pressure: this.calculateSocialPressureStress(wallet, character_id),
      goal_progress: this.calculateGoalProgressStress(wallet, financial_personality)
    };

    // Weight factors based on financial personality
    const personalityWeights = this.getPersonalityStressWeights(financial_personality);
    
    const weightedStress = 
      factors.low_money * personalityWeights.money_anxiety +
      factors.debt_pressure * personalityWeights.debt_anxiety +
      factors.recent_losses * personalityWeights.loss_anxiety +
      factors.uncertainty * personalityWeights.uncertainty_anxiety +
      factors.social_pressure * personalityWeights.social_anxiety +
      factors.goal_progress * personalityWeights.goal_anxiety;

    const totalStress = Math.min(100, Math.max(0, weightedStress));

    // Generate stress-reduction recommendations
    const recommendations = this.generateStressRecommendations(factors, financial_personality);

    return { stress: totalStress, factors, recommendations };
  }

  /**
   * Calculate decision quality based on current stress and personality
   */
  calculateDecisionQuality(
    financial_stress: number,
    financial_personality: FinancialPersonality,
    coach_trust: number,
    recent_decisions: FinancialDecision[]
  ): FinancialDecisionQuality {
    
    // Calculate spiral state first
    const spiralState = this.calculateSpiralState(recent_decisions, financial_stress);
    
    // Base quality starts with financial wisdom
    let baseQuality = financial_personality.financial_wisdom;
    
    // Apply spiral penalty if in a downward spiral
    if (spiralState.is_in_spiral) {
      baseQuality *= (1 - spiralState.spiral_intensity / 100 * 0.5); // Up to 50% reduction
    }
    
    // Stress heavily impacts decision quality (high stress = poor decisions)
    const stress_impact = Math.max(0, 100 - (financial_stress * 1.5));
    
    // Calculate impulsiveness (higher stress + impulsive personality = more impulsive)
    const baseImpulsiveness = this.getSpendingStyleImpulsiveness(financial_personality.spending_style);
    const stressImpulsiveness = financial_stress * 0.8;
    const spiralImpulsiveness = spiralState.is_in_spiral ? spiralState.spiral_intensity * 0.5 : 0;
    const impulsiveness = Math.min(100, baseImpulsiveness + stressImpulsiveness + spiralImpulsiveness);
    
    // Risk assessment gets worse under stress and spiral
    const riskAssessment = Math.max(5, 
      (financial_personality.risk_tolerance + baseQuality) / 2 - (financial_stress * 0.6) - (spiralState.spiral_intensity * 0.4)
    );
    
    // Long-term thinking deteriorates under high stress and spiral
    const longTermThinking = Math.max(3, 
      baseQuality - (financial_stress * 0.7) - (impulsiveness * 0.3) - (spiralState.spiral_intensity * 0.5)
    );
    
    // Coach influence based on trust and stress (high stress can make them ignore advice)
    const desperationMode = financial_stress >= 80;
    const stressPanic = desperationMode ? 50 : financial_stress > 70 ? 30 : 0; // Desperation = major trust issues
    const spiralDistrust = spiralState.is_in_spiral ? spiralState.spiral_intensity * 0.2 : 0;
    const coachInfluence = Math.max(0, coach_trust - stressPanic - spiralDistrust);
    
    // Overall quality is average of all factors, weighted by stress and spiral
    const spiralPenalty = spiralState.is_in_spiral ? (1 - spiralState.spiral_intensity / 200) : 1;
    const overallQuality = Math.max(3, 
      (riskAssessment + longTermThinking + (100 - impulsiveness) + coachInfluence) / 4 * (stress_impact / 100) * spiralPenalty
    );

    return {
      impulsiveness,
      risk_assessment: riskAssessment,
      long_term_thinking: longTermThinking,
      coach_influence: coachInfluence,
      overall_quality: overallQuality,
      spiral_risk: spiralState.spiral_intensity,
      desperation_mode: desperationMode
    };
  }

  /**
   * Update character financial stress and publish events
   */
  async updateCharacterFinancialStress(
    character_id: string,
    old_stress: number,
    new_stress: number,
    reason: string
  ): Promise<void> {
    const stress_change = Math.abs(new_stress - old_stress);
    
    // Only publish events for significant changes
    if (stress_change >= 5) {
      await this.eventBus.publishFinancialStressChange(character_id, old_stress, new_stress, reason);
      
      // Trigger stress-related events for high stress levels
      if (new_stress >= 80) {
        await this.eventBus.publishFinancialEvent(
          'financial_crisis',
          character_id,
          `${character_id} is experiencing severe financial stress (${new_stress}%)`,
          { stress_level: new_stress, trigger_reason: reason, type: 'severe_stress' },
          'critical'
        );
      } else if (new_stress >= 60) {
        await this.eventBus.publishFinancialEvent(
          'financial_stress_increase',
          character_id,
          `${character_id} is showing signs of financial anxiety (${new_stress}%)`,
          { stress_level: new_stress, trigger_reason: reason, type: 'moderate_stress' },
          'high'
        );
      }
    }
  }

  /**
   * Simulate financial decision outcome based on choice quality
   */
  async simulateDecisionOutcome(
    decision: FinancialDecision,
    decision_quality: FinancialDecisionQuality,
    financial_personality: FinancialPersonality
  ): Promise<{ 
    financial_impact: number; 
    stress_impact: number; 
    trust_impact: number; 
    outcome: 'positive' | 'negative' | 'neutral';
    description: string;
  }> {
    
    // Better decision quality = better outcomes (but still some randomness)
    const qualityBonus = (decision_quality.overall_quality - 50) / 100; // -0.5 to +0.5
    const randomFactor = (Math.random() - 0.5) * 0.3; // -0.15 to +0.15
    const success_chance = 0.5 + qualityBonus + randomFactor;
    
    let financial_impact = 0;
    let stress_impact = 0;
    let trust_impact = 0;
    let outcome: 'positive' | 'negative' | 'neutral' = 'neutral';
    let description = '';

    // Calculate impact based on decision type and quality
    switch (decision.category) {
      case 'investment':
        if (success_chance > 0.6) {
          financial_impact = decision.amount * (0.1 + Math.random() * 0.2); // 10-30% return
          stress_impact = -10; // Reduces stress
          trust_impact = decision.followed_advice ? 5 : 0;
          outcome = 'positive';
          description = 'Investment performed well, generating solid returns';
        } else if (success_chance < 0.3) {
          financial_impact = -decision.amount * (0.05 + Math.random() * 0.15); // 5-20% loss
          stress_impact = 15; // Increases stress
          trust_impact = decision.followed_advice ? -3 : -10; // Less trust loss if followed advice
          outcome = 'negative';
          description = 'Investment underperformed, resulting in losses';
        } else {
          financial_impact = decision.amount * (-0.02 + Math.random() * 0.06); // -2% to +4%
          stress_impact = Math.random() > 0.5 ? 2 : -2;
          trust_impact = decision.followed_advice ? 1 : 0;
          outcome = 'neutral';
          description = 'Investment showed modest results';
        }
        break;

      case 'luxury_purchase':
        // Enhanced luxury purchase processing with decay mechanics
        const luxuryCategory = 'other'; // Default category since metadata not in FinancialDecision interface
        const luxuryDescription = decision.description;

        // Process through luxury service for proper effect tracking
        const luxuryPurchase = await this.getLuxuryService().processLuxuryPurchase(
          decision.character_id,
          decision.amount,
          luxuryCategory,
          luxuryDescription,
          financial_personality
        );

        // Calculate immediate psychological impact
        const immediateHappiness = luxuryPurchase.initial_happiness_boost;
        financial_impact = -decision.amount; // Money spent
        
        if (financial_personality.spending_style === 'impulsive') {
          stress_impact = -immediateHappiness * 0.5 + 8; // Initial joy then some regret
          trust_impact = decision.followed_advice ? 0 : -5;
          outcome = 'negative';
          description = `Luxury purchase: ${luxuryDescription} provided immediate satisfaction but may cause future stress`;
        } else if (financial_personality.spending_style === 'strategic') {
          stress_impact = -immediateHappiness * 0.7 + 3; // Planned purchases feel better
          trust_impact = decision.followed_advice ? 3 : -1;
          outcome = 'neutral';
          description = `Strategic luxury purchase: ${luxuryDescription} was well-considered and enjoyable`;
        } else {
          stress_impact = -immediateHappiness * 0.6 + 5; // Moderate response
          trust_impact = decision.followed_advice ? 2 : -2;
          outcome = 'neutral';
          description = `Luxury purchase: ${luxuryDescription} was enjoyed but added to expenses`;
        }
        break;

      case 'real_estate':
        // Real estate is generally safer but requires good timing
        if (success_chance > 0.5) {
          financial_impact = decision.amount * (0.05 + Math.random() * 0.15); // 5-20% appreciation
          stress_impact = -15; // Security reduces stress
          trust_impact = decision.followed_advice ? 8 : 3;
          outcome = 'positive';
          description = 'Real estate investment provided security and appreciation';
        } else {
          financial_impact = -decision.amount * (0.02 + Math.random() * 0.08); // 2-10% loss
          stress_impact = 5; // Some stress from loss
          trust_impact = decision.followed_advice ? -1 : -5;
          outcome = 'negative';
          description = 'Real estate market conditions were unfavorable';
        }
        break;

      case 'party':
        // Parties boost social but cost money
        financial_impact = -decision.amount;
        stress_impact = -5; // Social activity reduces stress
        trust_impact = decision.followed_advice ? 0 : -3; // Coach probably advised moderation
        outcome = 'neutral';
        description = 'Party was enjoyable and boosted social connections';
        break;

      case 'wildcard':
        // Wildcard decisions are unpredictable
        const wildSuccess = Math.random();
        if (wildSuccess > 0.8) {
          financial_impact = decision.amount * (0.5 + Math.random()); // 50-150% return
          stress_impact = -20;
          trust_impact = 5; // Lucky outcomes build confidence
          outcome = 'positive';
          description = 'Wildcard decision paid off spectacularly!';
        } else if (wildSuccess < 0.3) {
          financial_impact = -decision.amount * (0.3 + Math.random() * 0.7); // 30-100% loss
          stress_impact = 25;
          trust_impact = -8;
          outcome = 'negative';
          description = 'Wildcard decision backfired significantly';
        } else {
          financial_impact = decision.amount * (-0.1 + Math.random() * 0.3); // -10% to +20%
          stress_impact = Math.random() > 0.5 ? 5 : -5;
          trust_impact = Math.random() > 0.5 ? 2 : -2;
          outcome = 'neutral';
          description = 'Wildcard decision had mixed results';
        }
        break;
    }

    return { financial_impact, stress_impact, trust_impact, outcome, description };
  }

  /**
   * Calculate if character is in a financial decision spiral
   */
  calculateSpiralState(recent_decisions: FinancialDecision[], current_stress: number): SpiralState {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent_decisionsList = (recent_decisions || []).filter(d => d.timestamp > thirtyDaysAgo);
    
    // Count consecutive poor decisions
    let consecutive_poor_decisions = 0;
    let totalLosses = 0;
    let lastGoodDecision = null;
    
    // Check decisions in reverse chronological order
    const sortedDecisions = [...recent_decisionsList].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    for (const decision of sortedDecisions) {
      if (decision.outcome === 'negative' || decision.financial_impact < -1000) {
        consecutive_poor_decisions++;
        totalLosses += Math.abs(decision.financial_impact);
      } else if (decision.outcome === 'positive') {
        lastGoodDecision = decision;
        break; // Stop counting at the first good decision
      }
    }
    
    // Calculate spiral intensity based on multiple factors
    const lossIntensity = Math.min(40, totalLosses / 1000 * 5); // $1k loss = 5 intensity
    const consecutiveIntensity = Math.min(30, consecutive_poor_decisions * 10); // Each poor decision = 10 intensity
    const stressIntensity = current_stress > 70 ? 30 : current_stress > 50 ? 15 : 0;
    
    const spiralIntensity = Math.min(100, lossIntensity + consecutiveIntensity + stressIntensity);
    const is_in_spiral = consecutive_poor_decisions >= 3 || (consecutive_poor_decisions >= 2 && current_stress > 60);
    
    // Determine spiral trigger
    let spiral_trigger: string | undefined;
    if (is_in_spiral && sortedDecisions.length > 0) {
      const firstPoorDecision = sortedDecisions[consecutive_poor_decisions - 1];
      spiral_trigger = firstPoorDecision.description || 'Initial financial setback';
    }
    
    // Generate intervention recommendations
    const recommendations: string[] = [];
    const interventionNeeded = spiralIntensity > 60 || consecutive_poor_decisions >= 3;
    
    if (interventionNeeded) {
      recommendations.push('Immediate coach intervention required to break negative spiral');
      recommendations.push('Consider therapy session focused on financial anxiety');
      recommendations.push('Implement mandatory cooling-off period before next financial decision');
      
      if (current_stress > 70) {
        recommendations.push('Stress reduction activities needed before any financial choices');
      }
      if (consecutive_poor_decisions >= 4) {
        recommendations.push('Team support intervention - peer assistance can help');
      }
    }
    
    return {
      is_in_spiral,
      spiral_intensity: spiralIntensity,
      consecutive_poor_decisions,
      spiral_trigger,
      intervention_needed: interventionNeeded,
      recommendations
    };
  }

  /**
   * Detect and publish spiral events
   */
  async detectAndPublishSpiralEvents(
    character_id: string,
    spiral_state: SpiralState,
    previous_spiral_state?: SpiralState
  ): Promise<void> {
    // Entering spiral
    if (spiral_state.is_in_spiral && (!previous_spiral_state || !previous_spiral_state.is_in_spiral)) {
      await this.eventBus.publishFinancialEvent(
        'financial_spiral_started',
        character_id,
        `${character_id} has entered a financial decision spiral after ${spiral_state.consecutive_poor_decisions} poor decisions`,
        { 
          spiral_intensity: spiral_state.spiral_intensity,
          trigger: spiral_state.spiral_trigger,
          consecutive_poor_decisions: spiral_state.consecutive_poor_decisions,
          type: 'spiral_start'
        },
        'critical'
      );
    }
    
    // Spiral intensifying
    if (spiral_state.is_in_spiral && previous_spiral_state?.is_in_spiral && 
        spiral_state.spiral_intensity > previous_spiral_state.spiral_intensity + 10) {
      await this.eventBus.publishFinancialEvent(
        'financial_spiral_deepening',
        character_id,
        `${character_id}'s financial spiral is intensifying (${spiral_state.spiral_intensity}% intensity)`,
        { 
          old_intensity: previous_spiral_state.spiral_intensity,
          new_intensity: spiral_state.spiral_intensity,
          type: 'spiral_deepening'
        },
        'critical'
      );
    }
    
    // Exiting spiral
    if (!spiral_state.is_in_spiral && previous_spiral_state?.is_in_spiral) {
      await this.eventBus.publishFinancialEvent(
        'financial_spiral_broken',
        character_id,
        `${character_id} has broken out of their financial decision spiral`,
        { 
          final_intensity: previous_spiral_state.spiral_intensity,
          breaking_factor: 'positive_decision',
          type: 'spiral_broken'
        },
        'high'
      );
    }
  }

  /**
   * Calculate financial trust in coach based on advice outcomes and relationship
   */
  calculateFinancialTrust(
    character_id: string,
    recent_decisions: FinancialDecision[],
    base_coach_trust: number,
    financial_personality: FinancialPersonality,
    current_wallet: number,
    monthly_earnings: number
  ): {
    financial_trust: number;
    trust_factors: {
      advice_success: number;
      recent_outcomes: number;
      personality_match: number;
      stress_influence: number;
    };
    recommendations: string[];
  } {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentFinancialDecisions = (recent_decisions || []).filter(d => d.timestamp > thirtyDaysAgo);
    
    // Calculate advice success rate
    const advisedDecisions = recentFinancialDecisions.filter(d => d.coach_advice);
    const followedAdvice = advisedDecisions.filter(d => d.followed_advice);
    const successfulAdvice = followedAdvice.filter(d => d.outcome === 'positive');
    
    const adviceSuccessRate = followedAdvice.length > 0 ? 
      (successfulAdvice.length / followedAdvice.length) * 100 : 50;
    
    // Calculate recent outcomes impact
    const recentOutcomes = recentFinancialDecisions.slice(-5); // Last 5 decisions
    const positiveOutcomes = recentOutcomes.filter(d => d.outcome === 'positive').length;
    const negativeOutcomes = recentOutcomes.filter(d => d.outcome === 'negative').length;
    const outcomeScore = recentOutcomes.length > 0 ? 
      ((positiveOutcomes - negativeOutcomes) / recentOutcomes.length) * 50 + 50 : 50;
    
    // Calculate personality match with coach advice style
    const personalityMatch = this.calculateCoachPersonalityMatch(financial_personality);
    
    // Calculate stress influence on trust
    const currentStress = this.calculateFinancialStress(
      character_id, 
      current_wallet,
      monthly_earnings,
      recent_decisions,
      financial_personality
    ).stress;
    
    const stressInfluence = Math.max(0, 100 - (currentStress * 0.8)); // High stress reduces trust
    
    // Weight the factors
    const trustFactors = {
      advice_success: adviceSuccessRate,
      recent_outcomes: outcomeScore,
      personality_match: personalityMatch,
      stress_influence: stressInfluence
    };
    
    // Calculate weighted financial trust
    const financialTrust = Math.round(
      (base_coach_trust * 0.3) +           // Base coach relationship
      (trustFactors.advice_success * 0.3) +  // Advice track record
      (trustFactors.recent_outcomes * 0.2) +  // Recent results
      (trustFactors.personality_match * 0.1) + // Personality compatibility
      (trustFactors.stress_influence * 0.1)    // Stress impact
    );
    
    // Generate trust-building recommendations
    const recommendations = this.generateTrustRecommendations(trustFactors, financialTrust);
    
    return {
      financial_trust: Math.max(0, Math.min(100, financialTrust)),
      trust_factors: trustFactors,
      recommendations
    };
  }

  /**
   * Update financial trust based on decision outcome
   */
  async updateFinancialTrust(
    character_id: string,
    decision: FinancialDecision,
    outcome: 'positive' | 'negative' | 'neutral',
    current_trust: number
  ): Promise<number> {
    let trustChange = 0;
    
    if (decision.coach_advice) {
      if (decision.followed_advice) {
        // Character followed coach advice
        switch (outcome) {
          case 'positive':
            trustChange = 8; // Good advice builds strong trust
            break;
          case 'negative':
            trustChange = -5; // Bad advice hurts trust less if followed
            break;
          case 'neutral':
            trustChange = 1; // Neutral outcome maintains trust
            break;
        }
      } else {
        // Character ignored coach advice
        switch (outcome) {
          case 'positive':
            trustChange = -3; // Success without coach hurts trust
            break;
          case 'negative':
            trustChange = 2; // Failure validates coach advice
            break;
          case 'neutral':
            trustChange = 0; // Neutral outcome, no change
            break;
        }
      }
    }
    
    // Publish trust change event
    if (Math.abs(trustChange) >= 3) {
      await this.eventBus.publishTrustChange(
        character_id,
        current_trust,
        current_trust + trustChange,
        `Financial decision ${outcome} - ${decision.followed_advice ? 'followed' : 'ignored'} coach advice`
      );
    }
    
    return Math.max(0, Math.min(100, current_trust + trustChange));
  }

  /**
   * Apply intervention to help break spiral
   */
  async applyIntervention(
    character_id: string,
    intervention_type: 'coach_therapy' | 'team_support' | 'cooling_period' | 'emergency_fund',
    current_stress: number,
    current_spiral_intensity: number
  ): Promise<{ 
    new_stress: number; 
    new_spiral_intensity: number; 
    success: boolean;
    description: string;
  }> {
    let stressReduction = 0;
    let spiralReduction = 0;
    let success = true;
    let description = '';
    
    switch (intervention_type) {
      case 'coach_therapy':
        // Therapy sessions are highly effective for stress
        stressReduction = 15 + Math.random() * 10; // 15-25 reduction
        spiralReduction = 20 + Math.random() * 15; // 20-35 reduction
        description = 'Coach therapy session helped process financial anxiety';
        break;
        
      case 'team_support':
        // Peer support helps but less than professional help
        stressReduction = 8 + Math.random() * 7; // 8-15 reduction
        spiralReduction = 10 + Math.random() * 10; // 10-20 reduction
        description = 'Team support provided perspective and reduced isolation';
        break;
        
      case 'cooling_period':
        // Time away from decisions helps
        stressReduction = 5 + Math.random() * 5; // 5-10 reduction
        spiralReduction = 15 + Math.random() * 10; // 15-25 reduction
        description = 'Cooling-off period prevented impulsive decisions';
        break;
        
      case 'emergency_fund':
        // Financial buffer reduces stress significantly
        stressReduction = 20 + Math.random() * 10; // 20-30 reduction
        spiralReduction = 25 + Math.random() * 15; // 25-40 reduction
        description = 'Emergency fund provided financial security and peace of mind';
        break;
    }
    
    // High stress can resist interventions
    if (current_stress > 80) {
      stressReduction *= 0.7; // 30% less effective
      spiralReduction *= 0.6; // 40% less effective
      success = Math.random() > 0.3; // 70% success rate
    }
    
    const newStress = Math.max(0, current_stress - stressReduction);
    const newSpiralIntensity = Math.max(0, current_spiral_intensity - spiralReduction);
    
    // Publish intervention event
    await this.eventBus.publishFinancialEvent(
      'financial_intervention_applied',
      character_id,
      `${intervention_type.replace('_', ' ')} intervention ${success ? 'helped' : 'had limited effect on'} ${character_id}`,
      { 
        intervention_type: intervention_type,
        stressReduction,
        spiralReduction,
        success,
        type: 'intervention'
      },
      success ? 'medium' : 'high'
    );
    
    return { new_stress: newStress, new_spiral_intensity: newSpiralIntensity, success, description };
  }

  // Private helper methods
  private calculateLowMoneyStress(wallet: number, monthly_earnings: number): number {
    const monthsOfExpenses = wallet / Math.max(monthly_earnings, 1000); // Assume $1k minimum expenses
    if (monthsOfExpenses < 1) return 80; // Less than 1 month = high stress
    if (monthsOfExpenses < 3) return 50; // Less than 3 months = moderate stress
    if (monthsOfExpenses < 6) return 20; // Less than 6 months = mild stress
    return 0; // 6+ months = no stress from low money
  }

  private calculateDebtStress(wallet: number): number {
    if (wallet < 0) {
      const debtAmount = Math.abs(wallet);
      return Math.min(90, debtAmount / 1000 * 10); // $1k debt = 10 stress points
    }
    return 0;
  }

  private calculateRecentLossStress(recent_decisions: FinancialDecision[]): number {
    const recentLosses = recent_decisions
      .filter(d => d.financial_impact < 0 && d.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, d) => sum + Math.abs(d.financial_impact), 0);
    
    return Math.min(60, recentLosses / 1000 * 5); // $1k loss = 5 stress points
  }

  private calculateUncertaintyStress(monthly_earnings: number, recent_decisions: FinancialDecision[]): number {
    const earningsVariability = monthly_earnings === 0 ? 50 : 0; // No income = high uncertainty
    const recentDecisionCount = (recent_decisions || []).filter(
      d => d.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    return Math.min(40, earningsVariability + recentDecisionCount * 3);
  }

  private calculateSocialPressureStress(wallet: number, character_id: string): number {
    // Get average wealth from team members for comparison
    const averageWealth = this.getTeamAverageWealth(character_id);
    const wealthGap = (averageWealth - wallet) / averageWealth * 100;
    return Math.max(0, Math.min(30, wealthGap));
  }

  private calculateGoalProgressStress(wallet: number, personality: FinancialPersonality): number {
    // Calculate financial goal based on personality traits
    const baseGoal = 10000; // Base financial security goal
    const luxuryMultiplier = personality.luxury_desire;
    const securityMultiplier = (100 - personality.risk_tolerance) / 20; // Low risk tolerance = high security need
    
    // Goals are higher for luxury-oriented and security-conscious personalities
    const personalGoal = baseGoal * (1 + (luxuryMultiplier / 10) + (securityMultiplier / 20));
    const progressToGoal = wallet / personalGoal * 100;
    
    if (progressToGoal < 25) return 25;
    if (progressToGoal < 50) return 15;
    if (progressToGoal < 75) return 5;
    return 0;
  }

  private getPersonalityStressWeights(personality: FinancialPersonality) {
    const baseWeights = {
      money_anxiety: 1.0,
      debt_anxiety: 1.0,
      loss_anxiety: 1.0,
      uncertainty_anxiety: 1.0,
      social_anxiety: 1.0,
      goal_anxiety: 1.0
    };

    // Adjust weights based on personality
    switch (personality.spending_style) {
      case 'conservative':
        return { ...baseWeights, uncertainty_anxiety: 1.5, loss_anxiety: 1.3 };
      case 'impulsive':
        return { ...baseWeights, money_anxiety: 1.4, social_anxiety: 1.3 };
      case 'strategic':
        return { ...baseWeights, goal_anxiety: 1.3, uncertainty_anxiety: 0.8 };
      default:
        return baseWeights;
    }
  }

  private getSpendingStyleImpulsiveness(style: string): number {
    switch (style) {
      case 'impulsive': return 85;
      case 'moderate': return 50;
      case 'conservative': return 20;
      case 'strategic': return 15;
      default: return 50;
    }
  }

  private generateStressRecommendations(factors: FinancialStressFactors, personality: FinancialPersonality): string[] {
    const recommendations: string[] = [];
    
    if (factors.low_money > 40) {
      recommendations.push('Focus on building emergency fund through consistent battle earnings');
    }
    if (factors.debt_pressure > 30) {
      recommendations.push('Prioritize debt reduction over luxury purchases');
    }
    if (factors.recent_losses > 30) {
      recommendations.push('Take a break from high-risk investments to rebuild confidence');
    }
    if (factors.uncertainty > 35) {
      recommendations.push('Establish more predictable income sources through regular training');
    }
    if (factors.social_pressure > 20) {
      recommendations.push('Focus on personal financial goals rather than comparing to others');
    }
    if (factors.goal_progress > 20) {
      recommendations.push('Break down large financial goals into smaller, achievable milestones');
    }

    return recommendations;
  }

  private calculateCoachPersonalityMatch(personality: FinancialPersonality): number {
    // Calculate how well the character's personality matches typical coach advice style
    let matchScore = 50; // Base match
    
    // Conservative coaches match well with conservative personalities
    if (personality.spending_style === 'conservative') {
      matchScore += 20;
    }
    
    // Strategic personalities respond well to structured advice
    if (personality.spending_style === 'strategic') {
      matchScore += 15;
    }
    
    // Impulsive personalities struggle with coach advice
    if (personality.spending_style === 'impulsive') {
      matchScore -= 15;
    }
    
    // High wisdom characters trust coach advice more
    if (personality.financial_wisdom > 70) {
      matchScore += 10;
    }
    
    // Low wisdom characters need more coach guidance
    if (personality.financial_wisdom < 40) {
      matchScore += 5;
    }
    
    return Math.max(0, Math.min(100, matchScore));
  }

  private generateTrustRecommendations(
    trust_factors: {
      advice_success: number;
      recent_outcomes: number;
      personality_match: number;
      stress_influence: number;
    },
    current_trust: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (current_trust < 40) {
      recommendations.push('Build trust through small, low-risk advice wins');
    }
    
    if (trust_factors.advice_success < 50) {
      recommendations.push('Focus on conservative, high-probability recommendations');
    }
    
    if (trust_factors.recent_outcomes < 40) {
      recommendations.push('Address recent financial setbacks through supportive coaching');
    }
    
    if (trust_factors.personality_match < 50) {
      recommendations.push('Adapt advice style to match character personality');
    }
    
    if (trust_factors.stress_influence < 60) {
      recommendations.push('Reduce financial stress before giving major advice');
    }
    
    if (current_trust > 80) {
      recommendations.push('Leverage high trust for more strategic financial planning');
    }
    
    return recommendations;
  }

  private getTeamAverageWealth(character_id: string): number {
    // For now, return a reasonable baseline
    // In a full implementation, this would query team member data
    // from the character database or team management system
    const baselineWealth = 25000;
    
    // Could be extended to:
    // 1. Query team roster from team management service
    // 2. Get financial data for each team member
    // 3. Calculate actual average
    
    return baselineWealth;
  }

  /**
   * Get total happiness/mood effect including luxury purchases
   */
  getTotalHappinessWithLuxury(character_id: string): {
    total_happiness: number;
    luxury_happiness: number;
    prestige_bonus: number;
    practical_bonus: number;
    active_luxury_count: number;
    luxury_addiction_risk: 'low' | 'medium' | 'high' | 'critical';
  } {
    const luxuryData = this.getLuxuryService().getCurrentLuxuryHappiness(character_id);
    const addictionData = this.getLuxuryService().calculateLuxuryAddictionRisk(character_id);
    
    return {
      total_happiness: luxuryData.total_happiness,
      luxury_happiness: luxuryData.total_happiness,
      prestige_bonus: luxuryData.prestige_bonus,
      practical_bonus: luxuryData.practical_bonus,
      active_luxury_count: luxuryData.activePurchases.length,
      luxury_addiction_risk: addictionData.risk_level
    };
  }

  /**
   * Process luxury purchase decision with full psychological effects
   */
  async processLuxuryPurchaseDecision(
    character_id: string,
    amount: number,
    category: string,
    description: string,
    financial_personality: FinancialPersonality,
    followed_coach_advice: boolean = false
  ): Promise<{
    purchase: any;
    psychological_impact: {
      stress_change: number;
      trust_change: number;
      happiness_boost: number;
      outcome_type: 'positive' | 'negative' | 'neutral';
    };
  }> {
    // Process the luxury purchase
    const luxuryPurchase = await this.getLuxuryService().processLuxuryPurchase(
      character_id,
      amount,
      category as any,
      description,
      financial_personality
    );

    // Calculate psychological effects based on personality and decision context
    let stress_change = 0;
    let trustChange = 0;
    let outcome_type: 'positive' | 'negative' | 'neutral' = 'neutral';

    const immediateHappiness = luxuryPurchase.initial_happiness_boost;
    
    // Base stress calculation
    if (financial_personality.spending_style === 'impulsive') {
      stress_change = -immediateHappiness * 0.4 + 8; // Initial joy then regret
      trustChange = followed_coach_advice ? 0 : -5;
      outcome_type = amount > 5000 ? 'negative' : 'neutral';
    } else if (financial_personality.spending_style === 'strategic') {
      stress_change = -immediateHappiness * 0.7 + 2; // Well-planned purchases feel good
      trustChange = followed_coach_advice ? 3 : -1;
      outcome_type = 'neutral';
    } else {
      stress_change = -immediateHappiness * 0.5 + 5; // Moderate response
      trustChange = followed_coach_advice ? 2 : -3;
      outcome_type = 'neutral';
    }

    // Addiction risk modifier
    const addictionRisk = this.getLuxuryService().calculateLuxuryAddictionRisk(character_id);
    if (addictionRisk.risk_level === 'high' || addictionRisk.risk_level === 'critical') {
      stress_change += 5; // Additional stress from problematic spending pattern
      trustChange -= 2; // Coach loses trust if enabling addiction
      outcome_type = 'negative';
    }

    return {
      purchase: luxuryPurchase,
      psychological_impact: {
        stress_change,
        trust_change: trustChange,
        happiness_boost: immediateHappiness,
        outcome_type
      }
    };
  }
}

export default FinancialPsychologyService;