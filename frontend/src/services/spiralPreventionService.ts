// Downward Spiral Prevention Service
// Uses coaching influence to prevent and break financial decision spirals
import { FinancialPersonality, FinancialDecision } from './apiClient';
import GameEventBus from './gameEventBus';
import { FinancialPsychologyService, SpiralState } from './financialPsychologyService';

export interface PreventionIntervention {
  id: string;
  character_id: string;
  coach_id: string;
  intervention_type: 'early_warning' | 'spiral_interruption' | 'recovery_support';
  spiral_intensity: number;
  coach_effectiveness: number;
  intervention_method: string;
  success: boolean;
  timestamp: Date;
}

export class SpiralPreventionService {
  private static instance: SpiralPreventionService;
  private eventBus: GameEventBus;
  private psychologyService: FinancialPsychologyService;

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    this.psychologyService = FinancialPsychologyService.getInstance();
  }

  static getInstance(): SpiralPreventionService {
    if (!SpiralPreventionService.instance) {
      SpiralPreventionService.instance = new SpiralPreventionService();
    }
    return SpiralPreventionService.instance;
  }

  /**
   * Monitor character for spiral risk and trigger preventive interventions
   */
  async monitorAndPrevent(
    character_id: string,
    coach_id: string,
    recent_decisions: FinancialDecision[],
    coach_level: number,
    coach_trust: number,
    financial_personality: FinancialPersonality,
    current_stress: number
  ): Promise<{
    intervention_triggered: boolean;
    intervention?: PreventionIntervention;
    spiralRiskReduction: number;
  }> {
    const spiralState = this.psychologyService.calculateSpiralState(recent_decisions, current_stress);
    
    // Calculate coach bonuses
    const coachBonuses = this.calculateCoachBonuses(coach_level);
    const adjustedEffectiveness = coach_trust * (1 + coachBonuses.spiral_prevention_bonus / 100);
    
    // Determine intervention threshold based on coach level
    const interventionThreshold = Math.max(30, 60 - coachBonuses.spiral_prevention_bonus);
    
    let interventionTriggered = false;
    let intervention: PreventionIntervention | undefined;
    let spiralRiskReduction = 0;

    // Early warning intervention (before spiral starts)
    if (!spiralState.is_in_spiral && spiralState.spiral_intensity > interventionThreshold) {
      intervention = await this.triggerEarlyWarning(
        character_id, coach_id, spiralState, adjustedEffectiveness, financial_personality
      );
      interventionTriggered = true;
      spiralRiskReduction = this.calculateRiskReduction(intervention);
    }
    
    // Active spiral interruption
    else if (spiralState.is_in_spiral && spiralState.spiral_intensity < 80) {
      intervention = await this.triggerSpiralInterruption(
        character_id, coach_id, spiralState, adjustedEffectiveness, financial_personality
      );
      interventionTriggered = true;
      spiralRiskReduction = this.calculateRiskReduction(intervention);
    }

    return {
      intervention_triggered: interventionTriggered,
      intervention,
      spiralRiskReduction
    };
  }

  /**
   * Early warning intervention before spiral starts
   */
  private async triggerEarlyWarning(
    character_id: string,
    coach_id: string,
    spiral_state: SpiralState,
    coach_effectiveness: number,
    financial_personality: FinancialPersonality
  ): Promise<PreventionIntervention> {
    const methods = this.getInterventionMethods('early_warning', financial_personality);
    const selectedMethod = methods[Math.floor(Math.random() * methods.length)];
    
    const success_rate = Math.min(95, coach_effectiveness * 0.8 + 20);
    const success = Math.random() * 100 < success_rate;
    
    const intervention: PreventionIntervention = {
      id: `early_${character_id}_${Date.now()}`,
      character_id,
      coach_id,
      intervention_type: 'early_warning',
      spiral_intensity: spiral_state.spiral_intensity,
      coach_effectiveness,
      intervention_method: selectedMethod,
      success,
      timestamp: new Date()
    };

    // Publish intervention event
    await this.eventBus.publishFinancialEvent(
      'financial_intervention_applied',
      character_id,
      `Coach provided early warning intervention: ${selectedMethod}`,
      {
        intervention,
        intervention_type: 'early_warning',
        success
      }
    );

    return intervention;
  }

  /**
   * Active spiral interruption
   */
  private async triggerSpiralInterruption(
    character_id: string,
    coach_id: string,
    spiral_state: SpiralState,
    coach_effectiveness: number,
    financial_personality: FinancialPersonality
  ): Promise<PreventionIntervention> {
    const methods = this.getInterventionMethods('spiral_interruption', financial_personality);
    const selectedMethod = methods[Math.floor(Math.random() * methods.length)];
    
    // Harder to interrupt active spirals
    const success_rate = Math.min(85, coach_effectiveness * 0.6 + 15);
    const success = Math.random() * 100 < success_rate;
    
    const intervention: PreventionIntervention = {
      id: `interrupt_${character_id}_${Date.now()}`,
      character_id,
      coach_id,
      intervention_type: 'spiral_interruption',
      spiral_intensity: spiral_state.spiral_intensity,
      coach_effectiveness,
      intervention_method: selectedMethod,
      success,
      timestamp: new Date()
    };

    // Publish intervention event
    await this.eventBus.publishFinancialEvent(
      'financial_intervention_applied',
      character_id,
      `Coach interrupted financial spiral: ${selectedMethod}`,
      {
        intervention,
        intervention_type: 'spiral_interruption',
        success
      }
    );

    return intervention;
  }

  /**
   * Get appropriate intervention methods based on personality
   */
  private getInterventionMethods(
    type: 'early_warning' | 'spiral_interruption',
    personality: FinancialPersonality
  ): string[] {
    const baseMethods = {
      early_warning: [
        'Gentle reminder about financial goals',
        'Suggestion to review recent spending patterns',
        'Encouragement to stick to the budget',
        'Recommendation for a financial check-in',
        'Advice to pause before major decisions'
      ],
      spiral_interruption: [
        'Strong recommendation to stop current spending',
        'Urgent suggestion for financial timeout',
        'Intervention meeting to reset priorities',
        'Emergency budget review session',
        'Direct challenge of current decision pattern'
      ]
    };

    const methods = [...baseMethods[type]];

    // Personality-specific methods
    if (personality.spending_style === 'impulsive') {
      if (type === 'early_warning') {
        methods.push('Implementation of 24-hour rule for purchases');
        methods.push('Setup of automatic savings transfers');
      } else {
        methods.push('Immediate removal of payment methods');
        methods.push('Accountability partner activation');
      }
    } else if (personality.spending_style === 'strategic') {
      if (type === 'early_warning') {
        methods.push('Analysis of decision-making framework');
        methods.push('Review of financial strategy alignment');
      } else {
        methods.push('Strategic reassessment of current approach');
        methods.push('Return to structured decision process');
      }
    }

    return methods;
  }

  /**
   * Calculate spiral risk reduction from intervention
   */
  private calculateRiskReduction(intervention: PreventionIntervention): number {
    if (!intervention.success) return 0;

    const baseReduction = {
      early_warning: 30,
      spiral_interruption: 45,
      recovery_support: 25
    }[intervention.intervention_type];

    // Effectiveness modifier
    const effectivenessMultiplier = intervention.coach_effectiveness / 100;
    
    return Math.floor(baseReduction * effectivenessMultiplier);
  }

  /**
   * Calculate coach bonuses for spiral prevention
   */
  private calculateCoachBonuses(coachLevel: number): {
    spiral_prevention_bonus: number;
    early_detection_bonus: number;
    intervention_effectiveness: number;
  } {
    let spiralPreventionBonus = 0;
    let earlyDetectionBonus = 0;
    let interventionEffectiveness = 0;

    // Tier-based bonuses
    if (coachLevel >= 1) {
      spiralPreventionBonus += 25;
      earlyDetectionBonus += 15;
      interventionEffectiveness += 10;
    }
    if (coachLevel >= 26) {
      spiralPreventionBonus += 35;
      earlyDetectionBonus += 20;
      interventionEffectiveness += 15;
    }
    if (coachLevel >= 51) {
      spiralPreventionBonus += 40;
      earlyDetectionBonus += 25;
      interventionEffectiveness += 20;
    }
    if (coachLevel >= 76) {
      spiralPreventionBonus += 50;
      earlyDetectionBonus += 30;
      interventionEffectiveness += 25;
    }
    if (coachLevel >= 101) {
      spiralPreventionBonus += 50; // Total: 200% (triple effectiveness)
      earlyDetectionBonus += 35;   // Total: 125%
      interventionEffectiveness += 30; // Total: 100%
    }

    return {
      spiral_prevention_bonus: spiralPreventionBonus,
      early_detection_bonus: earlyDetectionBonus,
      intervention_effectiveness: interventionEffectiveness
    };
  }
}

export default SpiralPreventionService;