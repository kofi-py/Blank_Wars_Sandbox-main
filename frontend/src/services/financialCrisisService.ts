// Financial Crisis Event Generator
// Creates realistic financial emergencies based on character behavior and probability systems

import { FinancialPersonality, FinancialDecision } from './apiClient';
import GameEventBus from './gameEventBus';
import { FinancialPsychologyService } from './financialPsychologyService';
import LuxuryPurchaseService from './luxuryPurchaseService';

export interface FinancialCrisis {
  id: string;
  type: CrisisType;
  character_id: string;
  triggered_date: Date;
  severity: 'minor' | 'moderate' | 'major' | 'catastrophic';
  amount: number; // Financial impact
  description: string;
  trigger_factors: string[]; // What led to this crisis
  time_to_resolve: number; // Days
  is_resolved: boolean;
  resolution_method?: string;
  resolution_date?: Date;
  psychological_impact: {
    stress_increase: number;
    trust_impact: number;
    trauma_level: number; // 0-100, creates lasting effects
  };
  ongoing_effects: {
    monthly_stress_penalty: number;
    decision_qualityPenalty: number;
    duration_days: number;
  };
}

export type CrisisType =
  | 'medical_emergency' | 'job_loss' | 'major_expense' | 'legal_issue'
  | 'family_emergency' | 'market_crash' | 'scam_victim' | 'theft'
  | 'housing_crisis' | 'vehicle_breakdown' | 'tax_audit' | 'debt_call'
  | 'investment_loss' | 'equipment_failure' | 'natural_disaster' | 'fraud';

export interface CrisisTemplate {
  type: CrisisType;
  name: string;
  base_probability: number; // 0-1, base chance per month
  amount_range: [number, number]; // Min/max financial impact
  severity_distribution: {
    minor: number;
    moderate: number;
    major: number;
    catastrophic: number;
  };
  personality_modifiers: {
    [key: string]: number; // Personality trait -> probability modifier
  };
  behavior_triggers: {
    luxury_spending: number; // High luxury spending increases risk
    poor_decisions: number; // Recent poor decisions increase risk
    low_savings: number; // Low emergency fund increases risk
    risk_taking: number; // High risk behavior increases risk
  };
  description: string;
  resolution_time_range: [number, number]; // Min/max days to resolve
  trauma_factors: {
    unexpectedness: number; // How unexpected this crisis type is
    controllability: number; // How much control character has
    social_impact: number; // How much it affects reputation
  };
}

export class FinancialCrisisService {
  private static instance: FinancialCrisisService;
  private eventBus: GameEventBus;
  private financialPsychology: FinancialPsychologyService;
  private luxuryService: LuxuryPurchaseService;
  private activeCrises: Map<string, FinancialCrisis[]> = new Map(); // character_id -> crises
  private crisisCheckInterval: NodeJS.Timeout | null = null;

  private crisisTemplates: CrisisTemplate[] = [
    {
      type: 'medical_emergency',
      name: 'Medical Emergency',
      base_probability: 0.05, // 5% per month
      amount_range: [2000, 25000],
      severity_distribution: { minor: 0.4, moderate: 0.35, major: 0.2, catastrophic: 0.05 },
      personality_modifiers: {
        risk_tolerance: -0.3, // Conservative people plan better for medical
        financial_wisdom: -0.2
      },
      behavior_triggers: {
        luxury_spending: 0.1,
        poor_decisions: 0.05,
        low_savings: 0.3,
        risk_taking: 0.15
      },
      description: 'Unexpected medical expenses not covered by insurance',
      resolution_time_range: [1, 30],
      trauma_factors: { unexpectedness: 0.8, controllability: 0.2, social_impact: 0.3 }
    },
    {
      type: 'job_loss',
      name: 'Job Loss',
      base_probability: 0.03, // 3% per month
      amount_range: [5000, 50000], // Lost income over time
      severity_distribution: { minor: 0.2, moderate: 0.4, major: 0.3, catastrophic: 0.1 },
      personality_modifiers: {
        charisma: -0.2, // Charismatic people less likely to be laid off
        financial_wisdom: -0.1
      },
      behavior_triggers: {
        luxury_spending: 0.2, // High spending makes job loss worse
        poor_decisions: 0.1,
        low_savings: 0.4,
        risk_taking: 0.05
      },
      description: 'Unexpected termination or layoff affecting income',
      resolution_time_range: [30, 180],
      trauma_factors: { unexpectedness: 0.7, controllability: 0.3, social_impact: 0.6 }
    },
    {
      type: 'major_expense',
      name: 'Major Unexpected Expense',
      base_probability: 0.08, // 8% per month
      amount_range: [1500, 15000],
      severity_distribution: { minor: 0.5, moderate: 0.3, major: 0.15, catastrophic: 0.05 },
      personality_modifiers: {
        financial_wisdom: -0.25,
        risk_tolerance: 0.1
      },
      behavior_triggers: {
        luxury_spending: 0.15,
        poor_decisions: 0.2,
        low_savings: 0.25,
        risk_taking: 0.1
      },
      description: 'Large unexpected expense (appliance breakdown, emergency repairs)',
      resolution_time_range: [1, 7],
      trauma_factors: { unexpectedness: 0.6, controllability: 0.4, social_impact: 0.2 }
    },
    {
      type: 'scam_victim',
      name: 'Financial Scam',
      base_probability: 0.02, // 2% per month
      amount_range: [500, 20000],
      severity_distribution: { minor: 0.3, moderate: 0.4, major: 0.25, catastrophic: 0.05 },
      personality_modifiers: {
        financial_wisdom: -0.4, // Wise people less likely to fall for scams
        risk_tolerance: 0.2 // Risk-takers more likely to be targeted
      },
      behavior_triggers: {
        luxury_spending: 0.1,
        poor_decisions: 0.3, // Poor decision-makers more vulnerable
        low_savings: 0.1,
        risk_taking: 0.25
      },
      description: 'Fell victim to financial fraud or scam',
      resolution_time_range: [1, 90],
      trauma_factors: { unexpectedness: 0.9, controllability: 0.1, social_impact: 0.7 }
    },
    {
      type: 'market_crash',
      name: 'Investment Loss',
      base_probability: 0.04, // 4% per month
      amount_range: [1000, 100000],
      severity_distribution: { minor: 0.3, moderate: 0.35, major: 0.25, catastrophic: 0.1 },
      personality_modifiers: {
        risk_tolerance: 0.3, // Risk-takers more exposed
        financial_wisdom: -0.1
      },
      behavior_triggers: {
        luxury_spending: 0.05,
        poor_decisions: 0.2,
        low_savings: 0.1,
        risk_taking: 0.4 // High correlation with risk-taking
      },
      description: 'Significant investment losses due to market volatility',
      resolution_time_range: [30, 365],
      trauma_factors: { unexpectedness: 0.5, controllability: 0.3, social_impact: 0.4 }
    },
    {
      type: 'housing_crisis',
      name: 'Housing Emergency',
      base_probability: 0.03, // 3% per month
      amount_range: [3000, 30000],
      severity_distribution: { minor: 0.25, moderate: 0.4, major: 0.25, catastrophic: 0.1 },
      personality_modifiers: {
        financial_wisdom: -0.2,
        risk_tolerance: 0.1
      },
      behavior_triggers: {
        luxury_spending: 0.2,
        poor_decisions: 0.15,
        low_savings: 0.35,
        risk_taking: 0.1
      },
      description: 'Major housing issue (eviction, major repairs, rent increase)',
      resolution_time_range: [7, 60],
      trauma_factors: { unexpectedness: 0.6, controllability: 0.4, social_impact: 0.5 }
    }
  ];

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    this.financialPsychology = FinancialPsychologyService.getInstance();
    this.luxuryService = LuxuryPurchaseService.getInstance();
  }

  static getInstance(): FinancialCrisisService {
    if (!FinancialCrisisService.instance) {
      FinancialCrisisService.instance = new FinancialCrisisService();
    }
    return FinancialCrisisService.instance;
  }

  /**
   * Start the crisis probability system - checks for potential crises periodically
   */
  startCrisisMonitoring(characters: any[]): void {
    if (this.crisisCheckInterval) {
      clearInterval(this.crisisCheckInterval);
    }

    // Check for crises every 6 hours of real time (represents ~1 game day)
    this.crisisCheckInterval = setInterval(() => {
      this.checkForCrises(characters);
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  /**
   * Stop crisis monitoring
   */
  stopCrisisMonitoring(): void {
    if (this.crisisCheckInterval) {
      clearInterval(this.crisisCheckInterval);
      this.crisisCheckInterval = null;
    }
  }

  /**
   * Check for potential financial crises for all characters
   */
  private async checkForCrises(characters: any[]): Promise<void> {
    for (const character of characters) {
      await this.evaluateCrisisRisk(character);
    }
  }

  /**
   * Evaluate crisis risk for a specific character and potentially trigger a crisis
   */
  async evaluateCrisisRisk(character: any): Promise<void> {
    const recent_decisions = character.financialDecisions || [];
    const personality = character.financial_personality || this.getDefaultPersonality();

    for (const template of this.crisisTemplates) {
      const probability = this.calculateCrisisProbability(
        character,
        template,
        recent_decisions,
        personality
      );

      // Roll for crisis occurrence
      if (Math.random() < probability) {
        await this.triggerCrisis(character.id, template, recent_decisions, personality);
        // Only trigger one crisis per check to avoid overwhelming the character
        break;
      }
    }
  }

  /**
   * Calculate the probability of a specific crisis type for a character
   */
  calculateCrisisProbability(
    character: any,
    template: CrisisTemplate,
    recent_decisions: FinancialDecision[],
    personality: FinancialPersonality
  ): number {
    let probability = template.base_probability;

    // Apply personality modifiers
    for (const [trait, modifier] of Object.entries(template.personality_modifiers)) {
      const traitValue = (personality as any)[trait] || 50;
      const normalizedValue = traitValue / 100; // 0-1
      probability += modifier * normalizedValue;
    }

    // Apply behavior trigger modifiers
    const behaviorScores = this.calculateBehaviorScores(character, recent_decisions, personality);

    probability += template.behavior_triggers.luxury_spending * behaviorScores.luxury_spending;
    probability += template.behavior_triggers.poor_decisions * behaviorScores.poor_decisions;
    probability += template.behavior_triggers.low_savings * behaviorScores.low_savings;
    probability += template.behavior_triggers.risk_taking * behaviorScores.risk_taking;

    // Apply existing crisis modifier (multiple crises compound stress)
    const existingCrises = this.activeCrises.get(character.id) || [];
    const activeCrisisCount = existingCrises.filter(c => !c.is_resolved).length;
    probability *= Math.max(0.1, 1 - (activeCrisisCount * 0.3)); // Reduce probability with active crises

    return Math.max(0, Math.min(0.2, probability)); // Cap at 20% per check
  }

  /**
   * Calculate behavior risk scores for crisis probability
   */
  private calculateBehaviorScores(
    character: any,
    recent_decisions: FinancialDecision[],
    personality: FinancialPersonality
  ): {
    luxury_spending: number;
    poor_decisions: number;
    low_savings: number;
    risk_taking: number;
  } {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent_decisionsList = recent_decisions.filter(d => d.timestamp > thirtyDaysAgo);

    // Luxury spending score (0-1)
    const luxuryPurchases = recent_decisionsList.filter(d => d.category === 'luxury_purchase');
    const totalLuxurySpent = luxuryPurchases.reduce((sum, d) => sum + d.amount, 0);
    const luxury_spending = Math.min(1, totalLuxurySpent / 10000); // Normalize to $10k

    // Poor decisions score (0-1)
    const negativeDecisions = recent_decisionsList.filter(d => d.outcome === 'negative');
    const poor_decisions = Math.min(1, negativeDecisions.length / 5); // 5+ bad decisions = max score

    // Low savings score (0-1) - higher score = lower savings
    const currentWealth = character.wallet;
    const monthly_earnings = character.monthly_earnings;
    const emergencyFundRatio = currentWealth / (monthly_earnings * 3); // 3 months expenses
    const low_savings = Math.max(0, 1 - emergencyFundRatio); // Inverse relationship

    // Risk taking score (0-1)
    const risk_taking = personality.risk_tolerance / 100;

    return { luxury_spending, poor_decisions, low_savings, risk_taking };
  }

  /**
   * Trigger a financial crisis for a character
   */
  async triggerCrisis(
    character_id: string,
    template: CrisisTemplate,
    recent_decisions: FinancialDecision[],
    personality: FinancialPersonality
  ): Promise<FinancialCrisis> {
    // Determine severity
    const severityRoll = Math.random();
    let severity: 'minor' | 'moderate' | 'major' | 'catastrophic' = 'minor';
    let cumulativeProbability = 0;

    for (const [sev, prob] of Object.entries(template.severity_distribution)) {
      cumulativeProbability += prob;
      if (severityRoll <= cumulativeProbability) {
        severity = sev as any;
        break;
      }
    }

    // Calculate crisis amount based on severity
    const [min_amount, max_amount] = template.amount_range;
    const severityMultipliers = { minor: 0.3, moderate: 0.6, major: 1.0, catastrophic: 1.5 };
    const baseAmount = min_amount + (max_amount - min_amount) * Math.random();
    const amount = Math.round(baseAmount * severityMultipliers[severity]);

    // Calculate psychological impact
    const traumaBase = template.trauma_factors.unexpectedness * 30 +
                      (1 - template.trauma_factors.controllability) * 20 +
                      template.trauma_factors.social_impact * 25;

    const severityImpactMultipliers = { minor: 0.5, moderate: 0.8, major: 1.2, catastrophic: 2.0 };
    const traumaLevel = Math.min(100, traumaBase * severityImpactMultipliers[severity]);

    const stressIncrease = traumaLevel * 0.8; // 80% of trauma becomes immediate stress
    const trustImpact = -traumaLevel * 0.3; // Crisis damages trust in financial advice

    // Determine resolution time
    const [minTime, maxTime] = template.resolution_time_range;
    const timeToResolve = Math.round(minTime + (maxTime - minTime) * Math.random() * severityImpactMultipliers[severity]);

    // Generate trigger factors
    const triggerFactors = this.generateTriggerFactors(template, recent_decisions, personality);

    const crisis: FinancialCrisis = {
      id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      character_id,
      triggered_date: new Date(),
      severity,
      amount,
      description: this.generateCrisisDescription(template, severity, amount),
      trigger_factors: triggerFactors,
      time_to_resolve: timeToResolve,
      is_resolved: false,
      psychological_impact: {
        stress_increase: stressIncrease,
        trust_impact: trustImpact,
        trauma_level: traumaLevel
      },
      ongoing_effects: {
        monthly_stress_penalty: traumaLevel * 0.1, // 10% of trauma = ongoing stress
        decision_qualityPenalty: traumaLevel * 0.15, // 15% of trauma = decision impairment
        duration_days: timeToResolve + Math.round(traumaLevel) // Trauma lasts beyond resolution
      }
    };

    // Add to active crises
    if (!this.activeCrises.has(character_id)) {
      this.activeCrises.set(character_id, []);
    }
    this.activeCrises.get(character_id)!.push(crisis);

    // Publish crisis event
    await this.eventBus.publish({
      type: 'financial_crisis',
      source: 'financial_advisory',
      primary_character_id: character_id,
      severity: severity === 'catastrophic' ? 'critical' : severity === 'major' ? 'high' : 'medium',
      category: 'financial',
      description: crisis.description,
      metadata: {
        crisis_id: crisis.id,
        crisis_type: template.type,
        amount,
        severity,
        triggerFactors,
        timeToResolve,
        traumaLevel,
        stressIncrease,
        trustImpact
      },
      tags: ['crisis', 'emergency', 'trauma', template.type],
      emotional_impact: [{
        character_id,
        impact: 'negative',
        intensity: Math.min(10, Math.ceil(traumaLevel / 10))
      }]
    });

    return crisis;
  }

  /**
   * Generate contextual trigger factors for the crisis
   */
  private generateTriggerFactors(
    template: CrisisTemplate,
    recent_decisions: FinancialDecision[],
    personality: FinancialPersonality
  ): string[] {
    const factors: string[] = [];

    // Add personality-based factors
    if (personality.risk_tolerance > 70 && template.behavior_triggers.risk_taking > 0.2) {
      factors.push('High-risk behavior increased vulnerability');
    }

    if (personality.financial_wisdom < 40) {
      factors.push('Limited financial planning and preparation');
    }

    // Add behavior-based factors
    const luxuryPurchases = recent_decisions.filter(d => d.category === 'luxury_purchase');
    if (luxuryPurchases.length > 3) {
      factors.push('Recent luxury spending reduced emergency reserves');
    }

    const poor_decisions = recent_decisions.filter(d => d.outcome === 'negative');
    if (poor_decisions.length > 2) {
      factors.push('Series of poor financial decisions created vulnerability');
    }

    return factors;
  }

  /**
   * Generate a detailed crisis description
   */
  private generateCrisisDescription(
    template: CrisisTemplate,
    severity: string,
    amount: number
  ): string {
    const severityDescriptors = {
      minor: 'minor',
      moderate: 'significant',
      major: 'serious',
      catastrophic: 'devastating'
    };

    return `${severityDescriptors[severity as keyof typeof severityDescriptors]} ${template.description.toLowerCase()} requiring $${amount.toLocaleString()} to resolve`;
  }

  /**
   * Get active crises for a character
   */
  getActiveCrises(character_id: string): FinancialCrisis[] {
    const crises = this.activeCrises.get(character_id) || [];
    return crises.filter(c => !c.is_resolved);
  }

  /**
   * Get all crises (including resolved) for a character
   */
  getAllCrises(character_id: string): FinancialCrisis[] {
    return this.activeCrises.get(character_id) || [];
  }

  /**
   * Resolve a crisis
   */
  async resolveCrisis(
    crisis_id: string,
    character_id: string,
    resolution_method: string
  ): Promise<void> {
    const crises = this.activeCrises.get(character_id) || [];
    const crisis = crises.find(c => c.id === crisis_id);

    if (!crisis || crisis.is_resolved) {
      return;
    }

    crisis.is_resolved = true;
    crisis.resolution_method = resolution_method;
    crisis.resolution_date = new Date();

    await this.eventBus.publish({
      type: 'financial_crisis',
      source: 'financial_advisory',
      primary_character_id: character_id,
      severity: 'medium',
      category: 'financial',
      description: `Financial crisis resolved: ${crisis.description}`,
      metadata: {
        crisis_id: crisis_id,
        crisis_type: crisis.type,
        resolution_method: resolution_method,
        original_amount: crisis.amount,
        resolution_time: Math.round((Date.now() - crisis.triggered_date.getTime()) / (1000 * 60 * 60 * 24))
      },
      tags: ['crisis', 'resolution', crisis.type]
    });
  }

  /**
   * Get default personality for characters without one
   */
  private getDefaultPersonality(): FinancialPersonality {
    return {
      spending_style: 'moderate',
      money_motivations: ['security'],
      financial_wisdom: 50,
      risk_tolerance: 50,
      luxury_desire: 50,
      generosity: 50,
      financial_traumas: [],
      money_beliefs: []
    };
  }
}

export default FinancialCrisisService;
