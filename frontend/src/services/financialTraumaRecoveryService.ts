// Financial Trauma Recovery System
// Integrates with existing therapy system to help characters recover from financial trauma

import { FinancialPersonality, FinancialDecision } from './apiClient';
import GameEventBus from './gameEventBus';
import { FinancialPsychologyService } from './financialPsychologyService';
import FinancialCrisisService, { FinancialCrisis } from './financialCrisisService';

export interface FinancialTrauma {
  id: string;
  character_id: string;
  trauma_type: 'crisis' | 'loss' | 'betrayal' | 'spiral' | 'shame' | 'anxiety';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  triggered_date: Date;
  description: string;
  origin_event?: string; // Event ID that caused the trauma
  symptoms: FinancialTraumaSymptom[];
  current_intensity: number; // 0-100, how much it currently affects the character
  healing_progress: number; // 0-100, progress toward recovery
  last_therapy_session?: Date;
  is_resolved: boolean;
  resolution_date?: Date;
  triggers: string[]; // Things that can re-activate this trauma
  coping_mechanisms: string[]; // Healthy ways the character deals with it
}

export interface FinancialTraumaSymptom {
  type: 'decision_paralysis' | 'impulsive_spending' | 'extreme_caution' | 'trust_issues' | 'anxiety_attacks' | 'avoidance';
  intensity: number; // 0-100
  affected_areas: ('decisions' | 'relationships' | 'mood' | 'performance')[];
  description: string;
}

export interface TraumaRecoverySession {
  id: string;
  trauma_id: string;
  character_id: string;
  therapist_type: 'jung' | 'alien' | 'fairy_godmother';
  session_date: Date;
  focus_areas: string[]; // What aspects of trauma were addressed
  techniques: string[]; // Therapeutic techniques used
  breakthrough_achieved: boolean;
  healing_gained: number; // 0-100, progress made this session
  intensity_reduction: number; // How much current intensity was reduced
  new_coping_mechanisms: string[]; // New healthy coping strategies learned
  setbacks: string[]; // Any regression or new issues discovered
  next_session_recommendations: string[];
  character_response: string; // How the character reacted to the session
}

export interface TraumaRecoveryPlan {
  trauma_id: string;
  character_id: string;
  estimated_sessions: number;
  priority_order: number; // 1 = highest priority
  recommended_therapist: 'jung' | 'alien' | 'fairy_godmother';
  proposed_techniques: string[];
  milestones: RecoveryMilestone[];
  risk_factors: string[]; // Things that could slow recovery
  support_strategies: string[]; // Non-therapy interventions
}

export interface RecoveryMilestone {
  name: string;
  description: string;
  target_intensity_reduction: number;
  estimated_sessions: number;
  required_coping_mechanisms: string[];
  measurable_outcomes: string[];
}

export class FinancialTraumaRecoveryService {
  private static instance: FinancialTraumaRecoveryService;
  private eventBus: GameEventBus;
  private financialPsychology: FinancialPsychologyService;
  private crisisService: FinancialCrisisService;
  private activeTraumas: Map<string, FinancialTrauma[]> = new Map(); // character_id -> traumas
  private recoveryPlans: Map<string, TraumaRecoveryPlan[]> = new Map(); // character_id -> plans
  private session_history: Map<string, TraumaRecoverySession[]> = new Map(); // traumaId -> sessions

  private traumaTypes = {
    crisis: {
      name: 'Financial Crisis Trauma',
      common_symptoms: ['anxiety_attacks', 'extreme_caution', 'decision_paralysis'],
      typical_triggers: ['large_expenses', 'investment_opportunities', 'unexpected_costs'],
      average_recovery_time: 45, // days
      complexity_factor: 1.2
    },
    loss: {
      name: 'Financial Loss Trauma',
      common_symptoms: ['trust_issues', 'extreme_caution', 'avoidance'],
      typical_triggers: ['investment_offers', 'risky_decisions', 'financial_advice'],
      average_recovery_time: 35,
      complexity_factor: 1.0
    },
    betrayal: {
      name: 'Financial Betrayal Trauma',
      common_symptoms: ['trust_issues', 'anxiety_attacks', 'avoidance'],
      typical_triggers: ['coach_advice', 'team_financial_decisions', 'shared_expenses'],
      average_recovery_time: 60,
      complexity_factor: 1.5
    },
    spiral: {
      name: 'Financial Spiral Trauma',
      common_symptoms: ['impulsive_spending', 'decision_paralysis', 'anxiety_attacks'],
      typical_triggers: ['poor_decisions', 'stress_situations', 'time_pressure'],
      average_recovery_time: 50,
      complexity_factor: 1.3
    },
    shame: {
      name: 'Financial Shame Trauma',
      common_symptoms: ['avoidance', 'anxiety_attacks', 'trust_issues'],
      typical_triggers: ['public_decisions', 'team_discussions', 'spending_comparisons'],
      average_recovery_time: 40,
      complexity_factor: 1.1
    },
    anxiety: {
      name: 'Financial Anxiety Trauma',
      common_symptoms: ['decision_paralysis', 'anxiety_attacks', 'extreme_caution'],
      typical_triggers: ['decision_deadlines', 'uncertainty', 'complex_choices'],
      average_recovery_time: 30,
      complexity_factor: 0.9
    }
  };

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    this.financialPsychology = FinancialPsychologyService.getInstance();
    this.crisisService = FinancialCrisisService.getInstance();

    this.setupTraumaEventListeners();
  }

  static getInstance(): FinancialTraumaRecoveryService {
    if (!FinancialTraumaRecoveryService.instance) {
      FinancialTraumaRecoveryService.instance = new FinancialTraumaRecoveryService();
    }
    return FinancialTraumaRecoveryService.instance;
  }

  /**
   * Detect and create trauma from significant financial events
   */
  async processFinancialEventForTrauma(
    character_id: string,
    event_type: string,
    event_data: any,
    financial_personality: FinancialPersonality
  ): Promise<FinancialTrauma | null> {

    // Determine if this event should create trauma
    const traumaRisk = this.calculateTraumaRisk(event_type, event_data, financial_personality);

    if (traumaRisk.should_create_trauma) {
      const trauma = await this.createTrauma(
        character_id,
        traumaRisk.trauma_type as keyof typeof this.traumaTypes,
        traumaRisk.severity,
        event_data,
        financial_personality
      );

      // Create recovery plan for new trauma
      const recoveryPlan = this.createRecoveryPlan(trauma, financial_personality);

      if (!this.recoveryPlans.has(character_id)) {
        this.recoveryPlans.set(character_id, []);
      }
      this.recoveryPlans.get(character_id)!.push(recoveryPlan);

      return trauma;
    }

    return null;
  }

  /**
   * Conduct a trauma-focused therapy session
   */
  async conductTraumaTherapySession(
    trauma_id: string,
    therapist_type: 'jung' | 'alien' | 'fairy_godmother',
    financial_personality: FinancialPersonality
  ): Promise<TraumaRecoverySession> {

    const trauma = this.findTraumaById(trauma_id);
    if (!trauma) {
      throw new Error(`Trauma ${trauma_id} not found`);
    }

    // Get previous session history for this trauma
    const previousSessions = this.session_history.get(trauma_id) || [];
    const sessionNumber = previousSessions.length + 1;

    // Determine session effectiveness based on therapist match and trauma type
    const effectiveness = this.calculateTherapyEffectiveness(
      trauma,
      therapist_type,
      sessionNumber,
      financial_personality
    );

    // Apply therapeutic techniques based on therapist type
    const sessionResults = this.applyTherapeuticTechniques(
      trauma,
      therapist_type,
      effectiveness,
      financial_personality
    );

    // Create session record
    const session: TraumaRecoverySession = {
      id: `trauma_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trauma_id,
      character_id: trauma.character_id,
      therapist_type,
      session_date: new Date(),
      focus_areas: sessionResults.focus_areas,
      techniques: sessionResults.techniques,
      breakthrough_achieved: sessionResults.breakthrough_achieved,
      healing_gained: sessionResults.healing_gained,
      intensity_reduction: sessionResults.intensity_reduction,
      new_coping_mechanisms: sessionResults.new_coping_mechanisms,
      setbacks: sessionResults.setbacks,
      next_session_recommendations: sessionResults.next_recommendations,
      character_response: sessionResults.character_response
    };

    // Update trauma progress
    trauma.healing_progress = Math.min(100, trauma.healing_progress + sessionResults.healing_gained);
    trauma.current_intensity = Math.max(0, trauma.current_intensity - sessionResults.intensity_reduction);
    trauma.last_therapy_session = new Date();
    trauma.coping_mechanisms.push(...sessionResults.new_coping_mechanisms);

    // Check if trauma is resolved
    if (trauma.healing_progress >= 85 && trauma.current_intensity <= 15) {
      trauma.is_resolved = true;
      trauma.resolution_date = new Date();

      await this.eventBus.publish({
        type: 'financial_breakthrough',
        source: 'financial_advisory',
        primary_character_id: trauma.character_id,
        severity: 'high',
        category: 'financial',
        description: `${trauma.character_id} has recovered from ${trauma.trauma_type} trauma through therapy`,
        metadata: {
          trauma_id: trauma_id,
          trauma_type: trauma.trauma_type,
          original_severity: trauma.severity,
          sessions_required: sessionNumber,
          therapist_type
        },
        tags: ['therapy', 'recovery', 'breakthrough', 'trauma']
      });
    }

    // Store session
    if (!this.session_history.has(trauma_id)) {
      this.session_history.set(trauma_id, []);
    }
    this.session_history.get(trauma_id)!.push(session);

    return session;
  }

  /**
   * Get all active traumas for a character (for therapy system integration)
   */
  getActiveTraumas(character_id: string): FinancialTrauma[] {
    const traumas = this.activeTraumas.get(character_id) || [];
    return traumas.filter(t => !t.is_resolved);
  }

  /**
   * Get recovery plans for a character
   */
  getRecoveryPlans(character_id: string): TraumaRecoveryPlan[] {
    return this.recoveryPlans.get(character_id) || [];
  }

  /**
   * Get therapy session history for a trauma
   */
  getSessionHistory(traumaId: string): TraumaRecoverySession[] {
    return this.session_history.get(traumaId) || [];
  }

  /**
   * Calculate how trauma affects current financial decisions
   */
  calculateTraumaImpactOnDecision(
    character_id: string,
    decision_type: string,
    decision_amount: number
  ): {
    stress_penalty: number;
    decision_qualityPenalty: number;
    triggered_traumas: FinancialTrauma[];
    coping_mechanisms_used: string[];
  } {

    const activeTraumas = this.getActiveTraumas(character_id);
    let totalStressPenalty = 0;
    let totalQualityPenalty = 0;
    const triggered_traumas: FinancialTrauma[] = [];
    const coping_mechanisms_used: string[] = [];

    for (const trauma of activeTraumas) {
      // Check if this decision triggers the trauma
      const isTriggered = trauma.triggers.some(trigger =>
        decision_type.includes(trigger) ||
        (trigger === 'large_amounts' && decision_amount > 5000)
      );

      if (isTriggered) {
        triggered_traumas.push(trauma);

        // Calculate impact based on trauma intensity and type
        const intensityFactor = trauma.current_intensity / 100;

        // Different trauma types affect decisions differently
        switch (trauma.trauma_type) {
          case 'crisis':
            totalStressPenalty += intensityFactor * 20;
            totalQualityPenalty += intensityFactor * 15;
            break;
          case 'loss':
            totalQualityPenalty += intensityFactor * 25;
            totalStressPenalty += intensityFactor * 10;
            break;
          case 'betrayal':
            totalQualityPenalty += intensityFactor * 30; // Severe decision impact
            totalStressPenalty += intensityFactor * 15;
            break;
          case 'spiral':
            totalStressPenalty += intensityFactor * 25;
            totalQualityPenalty += intensityFactor * 20;
            break;
          case 'shame':
            totalStressPenalty += intensityFactor * 15;
            totalQualityPenalty += intensityFactor * 10;
            break;
          case 'anxiety':
            totalStressPenalty += intensityFactor * 30; // High stress impact
            totalQualityPenalty += intensityFactor * 20;
            break;
        }

        // Apply coping mechanisms to reduce impact
        const applicableCoping = trauma.coping_mechanisms.filter(mechanism =>
          this.isCopingMechanismApplicable(mechanism, decision_type)
        );

        for (const coping of applicableCoping) {
          coping_mechanisms_used.push(coping);
          totalStressPenalty *= 0.8; // 20% reduction per applicable coping mechanism
          totalQualityPenalty *= 0.8;
        }
      }
    }

    return {
      stress_penalty: Math.min(50, totalStressPenalty), // Cap at 50% penalty
      decision_qualityPenalty: Math.min(40, totalQualityPenalty), // Cap at 40% penalty
      triggered_traumas,
      coping_mechanisms_used
    };
  }

  // Private helper methods

  private calculateTraumaRisk(
    event_type: string,
    event_data: any,
    personality: FinancialPersonality
  ): {
    should_create_trauma: boolean;
    trauma_type: keyof typeof this.traumaTypes;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
  } {

    let baseRisk = 0;
    let trauma_type: keyof typeof this.traumaTypes = 'anxiety';

    // Event-based risk calculation
    switch (event_type) {
      case 'financial_crisis':
        baseRisk = 0.8;
        trauma_type = 'crisis';
        break;
      case 'financial_spiral_started':
        baseRisk = 0.7;
        trauma_type = 'spiral';
        break;
      case 'trust_lost':
        if (event_data.magnitude > 20) {
          baseRisk = 0.6;
          trauma_type = 'betrayal';
        }
        break;
      case 'investment_loss':
        if (event_data.amount > 10000) {
          baseRisk = 0.5;
          trauma_type = 'loss';
        }
        break;
      case 'financial_stress_increase':
        if (event_data.newStress > 80) {
          baseRisk = 0.4;
          trauma_type = 'anxiety';
        }
        break;
    }

    // Personality modifiers
    if (personality.financial_wisdom < 40) {
      baseRisk *= 1.3; // Low wisdom = higher trauma risk
    }

    if (personality.risk_tolerance < 30) {
      baseRisk *= 1.2; // Conservative personalities more prone to trauma
    }

    if (personality.financial_traumas.length > 2) {
      baseRisk *= 1.4; // Previous traumas increase vulnerability
    }

    // Determine severity
    let severity: 'mild' | 'moderate' | 'severe' | 'critical';
    if (baseRisk > 0.8) severity = 'critical';
    else if (baseRisk > 0.6) severity = 'severe';
    else if (baseRisk > 0.4) severity = 'moderate';
    else severity = 'mild';

    return {
      should_create_trauma: Math.random() < baseRisk,
      trauma_type,
      severity
    };
  }

  private async createTrauma(
    character_id: string,
    trauma_type: keyof typeof this.traumaTypes,
    severity: 'mild' | 'moderate' | 'severe' | 'critical',
    event_data: any,
    personality: FinancialPersonality
  ): Promise<FinancialTrauma> {

    const traumaTypeData = this.traumaTypes[trauma_type];
    const severityMultipliers = { mild: 0.5, moderate: 0.7, severe: 1.0, critical: 1.3 };
    const multiplier = severityMultipliers[severity];

    const trauma: FinancialTrauma = {
      id: `trauma_${Date.now()}_${character_id}`,
      character_id,
      trauma_type,
      severity,
      triggered_date: new Date(),
      description: this.generateTraumaDescription(trauma_type, severity, event_data),
      origin_event: event_data.event_id,
      symptoms: this.generateTraumaSymptoms(trauma_type, severity),
      current_intensity: Math.min(100, 40 + (multiplier * 30)), // 40-70 base intensity
      healing_progress: 0,
      is_resolved: false,
      triggers: [...traumaTypeData.typical_triggers],
      coping_mechanisms: []
    };

    // Add to active traumas
    if (!this.activeTraumas.has(character_id)) {
      this.activeTraumas.set(character_id, []);
    }
    this.activeTraumas.get(character_id)!.push(trauma);

    // Publish trauma creation event
    await this.eventBus.publish({
      type: 'financial_trauma',
      source: 'financial_advisory',
      primary_character_id: character_id,
      severity: severity === 'critical' ? 'critical' : 'high',
      category: 'financial',
      description: `${character_id} has developed ${trauma_type} trauma: ${trauma.description}`,
      metadata: {
        trauma_id: trauma.id,
        trauma_type,
        severity,
        current_intensity: trauma.current_intensity,
        origin_event: event_data.event_id
      },
      tags: ['trauma', 'psychology', trauma_type]
    });

    return trauma;
  }

  private setupTraumaEventListeners(): void {
    // Listen for events that could create trauma
    this.eventBus.subscribe('financial_crisis', async (event) => {
      // Will be handled by the main financial psychology service
    });

    this.eventBus.subscribe('financial_spiral_started', async (event) => {
      // Will be handled by the main financial psychology service
    });

    // Listen for therapy session completion to potentially trigger trauma sessions
    this.eventBus.subscribe('therapy_breakthrough', async (event) => {
      if (event.metadata?.financialTraumaId) {
        // A regular therapy session revealed financial trauma
        const traumaId = event.metadata.financialTraumaId;
        // This would trigger follow-up trauma-specific therapy
      }
    });
  }

  private findTraumaById(traumaId: string): FinancialTrauma | null {
    for (const traumas of this.activeTraumas.values()) {
      const trauma = traumas.find(t => t.id === traumaId);
      if (trauma) return trauma;
    }
    return null;
  }

  private calculateTherapyEffectiveness(
    trauma: FinancialTrauma,
    therapist_type: 'jung' | 'alien' | 'fairy_godmother',
    session_number: number,
    personality: FinancialPersonality
  ): number {

    let baseEffectiveness = 60; // Base therapy effectiveness

    // Therapist type effectiveness for financial trauma
    const therapistEffectiveness = {
      jung: { crisis: 85, loss: 90, betrayal: 95, spiral: 80, shame: 85, anxiety: 75 },
      alien: { crisis: 70, loss: 85, betrayal: 60, spiral: 95, shame: 70, anxiety: 90 },
      fairy_godmother: { crisis: 90, loss: 75, shame: 95, spiral: 85, betrayal: 80, anxiety: 85 }
    };

    baseEffectiveness = therapistEffectiveness[therapist_type][trauma.trauma_type];

    // Session number bonus (therapy gets more effective over time)
    const sessionBonus = Math.min(20, session_number * 3);

    // Trauma severity affects therapy difficulty
    const severityPenalty = {
      mild: 0, moderate: -10, severe: -20, critical: -30
    }[trauma.severity];

    // Personality modifiers
    let personalityModifier = 0;
    if (personality.financial_wisdom > 70) personalityModifier += 10;
    if (personality.spending_style === 'strategic') personalityModifier += 5;

    return Math.max(20, Math.min(95, baseEffectiveness + sessionBonus + severityPenalty + personalityModifier));
  }

  private applyTherapeuticTechniques(
    trauma: FinancialTrauma,
    therapist_type: 'jung' | 'alien' | 'fairy_godmother',
    effectiveness: number,
    personality: FinancialPersonality
  ): {
    focus_areas: string[];
    techniques: string[];
    breakthrough_achieved: boolean;
    healing_gained: number;
    intensity_reduction: number;
    new_coping_mechanisms: string[];
    setbacks: string[];
    next_recommendations: string[];
    character_response: string;
  } {

    const effectivenessFactor = effectiveness / 100;
    const breakthroughAchieved = Math.random() < (effectivenessFactor * 0.3); // 30% max breakthrough chance

    let healingGained = Math.floor(effectivenessFactor * 20); // Up to 20 healing per session
    let intensityReduction = Math.floor(effectivenessFactor * 15); // Up to 15 intensity reduction

    if (breakthroughAchieved) {
      healingGained += 15;
      intensityReduction += 20;
    }

    // Therapist-specific approaches
    const therapistApproaches = {
      jung: {
        focus_areas: ['unconscious_patterns', 'archetypal_fears', 'shadow_work'],
        techniques: ['dream_analysis', 'active_imagination', 'symbol_exploration'],
        coping_mechanisms: ['conscious_awareness', 'ritual_practice', 'symbolic_thinking'],
        character_responses: {
          breakthrough: "I see the deeper pattern now... this fear has been controlling me unconsciously.",
          progress: "These sessions help me understand why I react this way to money.",
          resistance: "I don't see how old dreams relate to my current financial problems."
        }
      },
      alien: {
        focus_areas: ['logical_analysis', 'pattern_recognition', 'behavioral_modification'],
        techniques: ['data_analysis', 'behavioral_tracking', 'systematic_desensitization'],
        coping_mechanisms: ['logical_assessment', 'systematic_planning', 'data_driven_decisions'],
        character_responses: {
          breakthrough: "The data clearly shows how this trauma has been affecting my decision-making patterns.",
          progress: "Your analytical approach helps me see the logical flaws in my trauma responses.",
          resistance: "This feels too clinical. Money isn't just about logic and data."
        }
      },
      fairy_godmother: {
        focus_areas: ['emotional_healing', 'self_compassion', 'narrative_reframing'],
        techniques: ['guided_visualization', 'emotional_validation', 'story_rewriting'],
        coping_mechanisms: ['self_compassion', 'positive_reframing', 'emotional_regulation'],
        character_responses: {
          breakthrough: "I feel the weight lifting... I can forgive myself for those past decisions now.",
          progress: "Your kindness helps me be gentler with myself about my financial mistakes.",
          resistance: "I don't need sympathy. I need practical solutions to my problems."
        }
      }
    };

    const approach = therapistApproaches[therapist_type];
    const responseType = breakthroughAchieved ? 'breakthrough' :
                        effectiveness > 70 ? 'progress' : 'resistance';

    return {
      focus_areas: approach.focus_areas,
      techniques: approach.techniques,
      breakthrough_achieved: breakthroughAchieved,
      healing_gained: healingGained,
      intensity_reduction: intensityReduction,
      new_coping_mechanisms: breakthroughAchieved ? approach.coping_mechanisms :
                          effectiveness > 60 ? approach.coping_mechanisms.slice(0, 1) : [],
      setbacks: effectiveness < 40 ? ['resistance_to_process', 'emotional_overwhelm'] : [],
      next_recommendations: this.generateNextSessionRecommendations(trauma, therapist_type, effectiveness),
      character_response: approach.character_responses[responseType]
    };
  }

  private generateTraumaDescription(
    trauma_type: keyof typeof this.traumaTypes,
    severity: string,
    event_data: any
  ): string {
    const descriptions = {
      crisis: `Developed deep anxiety about financial security after experiencing a ${severity} financial crisis`,
      loss: `Traumatized by significant financial losses, creating fear of investment and risk-taking`,
      betrayal: `Trust deeply damaged by financial betrayal, making coach advice and team decisions triggering`,
      spiral: `Scarred by loss of control during financial spiral, creating fear of decision-making`,
      shame: `Overwhelmed by shame about financial mistakes, avoiding financial discussions and decisions`,
      anxiety: `Chronic anxiety about financial decisions, leading to paralysis and avoidance behaviors`
    };

    return descriptions[trauma_type];
  }

  private generateTraumaSymptoms(
    trauma_type: keyof typeof this.traumaTypes,
    severity: 'mild' | 'moderate' | 'severe' | 'critical'
  ): FinancialTraumaSymptom[] {

    const traumaTypeData = this.traumaTypes[trauma_type];
    const severityMultiplier = { mild: 0.5, moderate: 0.7, severe: 1.0, critical: 1.3 }[severity];

    return traumaTypeData.common_symptoms.map(symptomType => ({
      type: symptomType as FinancialTraumaSymptom['type'],
      intensity: Math.min(100, Math.floor(50 * severityMultiplier + Math.random() * 30)),
      affected_areas: this.getSymptomAffectedAreas(symptomType as FinancialTraumaSymptom['type']),
      description: this.getSymptomDescription(symptomType as FinancialTraumaSymptom['type'], severity)
    }));
  }

  private getSymptomAffectedAreas(symptomType: FinancialTraumaSymptom['type']): ('decisions' | 'relationships' | 'mood' | 'performance')[] {
    const areaMap: Record<string, ('decisions' | 'relationships' | 'mood' | 'performance')[]> = {
      decision_paralysis: ['decisions', 'performance'],
      impulsive_spending: ['decisions', 'mood'],
      extreme_caution: ['decisions', 'relationships'],
      trust_issues: ['relationships', 'decisions'],
      anxiety_attacks: ['mood', 'performance'],
      avoidance: ['decisions', 'relationships']
    };

    return areaMap[symptomType] || [];
  }

  private getSymptomDescription(symptomType: FinancialTraumaSymptom['type'], severity: string): string {
    const descriptions = {
      decision_paralysis: `${severity} difficulty making financial decisions, often freezing when faced with money choices`,
      impulsive_spending: `${severity} tendency to make quick financial decisions to avoid anxiety and overthinking`,
      extreme_caution: `${severity} over-conservative approach to money, avoiding all financial risks`,
      trust_issues: `${severity} difficulty trusting financial advice from coaches or teammates`,
      anxiety_attacks: `${severity} panic responses when dealing with significant financial decisions or losses`,
      avoidance: `${severity} tendency to avoid financial discussions, planning, or decision-making entirely`
    };

    return descriptions[symptomType];
  }

  private createRecoveryPlan(trauma: FinancialTrauma, personality: FinancialPersonality): TraumaRecoveryPlan {
    const traumaTypeData = this.traumaTypes[trauma.trauma_type];
    const complexity_factor = traumaTypeData.complexity_factor;
    const baseSessions = Math.ceil(traumaTypeData.average_recovery_time / 7); // Weekly sessions

    // Adjust for severity and personality
    let estimatedSessions = Math.ceil(baseSessions * complexity_factor);
    if (trauma.severity === 'critical') estimatedSessions *= 1.5;
    else if (trauma.severity === 'severe') estimatedSessions *= 1.3;

    if (personality.financial_wisdom > 70) estimatedSessions *= 0.8; // Faster recovery
    if (personality.financial_traumas.length > 2) estimatedSessions *= 1.2; // Slower if multiple traumas

    return {
      trauma_id: trauma.id,
      character_id: trauma.character_id,
      estimated_sessions: Math.round(estimatedSessions),
      priority_order: this.calculateTraumaPriority(trauma),
      recommended_therapist: this.recommendOptimalTherapist(trauma, personality),
      proposed_techniques: this.getProposedTechniques(trauma, personality),
      milestones: this.createRecoveryMilestones(trauma, estimatedSessions),
      risk_factors: this.identifyRiskFactors(trauma, personality),
      support_strategies: this.generateSupportStrategies(trauma, personality)
    };
  }

  private calculateTraumaPriority(trauma: FinancialTrauma): number {
    // Higher number = higher priority (1 = highest)
    let priority = 5; // Base priority

    if (trauma.severity === 'critical') priority = 1;
    else if (trauma.severity === 'severe') priority = 2;
    else if (trauma.severity === 'moderate') priority = 3;
    else priority = 4;

    // Trauma types that severely impact decisions get higher priority
    if (['betrayal', 'spiral'].includes(trauma.trauma_type)) {
      priority = Math.max(1, priority - 1);
    }

    return priority;
  }

  private recommendOptimalTherapist(trauma: FinancialTrauma, personality: FinancialPersonality): 'jung' | 'alien' | 'fairy_godmother' {
    // Match therapist to trauma type and personality
    if (trauma.trauma_type === 'betrayal' || trauma.trauma_type === 'shame') {
      return personality.spending_style === 'strategic' ? 'jung' : 'fairy_godmother';
    }

    if (trauma.trauma_type === 'spiral' || trauma.trauma_type === 'anxiety') {
      return personality.financial_wisdom > 70 ? 'alien' : 'fairy_godmother';
    }

    return 'jung'; // Default to Jung for complex cases
  }

  private getProposedTechniques(trauma: FinancialTrauma, personality: FinancialPersonality): string[] {
    const techniques = [];

    // Base techniques for trauma type
    if (trauma.trauma_type === 'crisis' || trauma.trauma_type === 'loss') {
      techniques.push('exposure_therapy', 'cognitive_restructuring');
    }

    if (trauma.trauma_type === 'betrayal') {
      techniques.push('trust_rebuilding', 'relationship_repair');
    }

    if (trauma.trauma_type === 'anxiety') {
      techniques.push('relaxation_training', 'systematic_desensitization');
    }

    // Personality-based techniques
    if (personality.spending_style === 'strategic') {
      techniques.push('logical_analysis', 'behavioral_planning');
    }

    if (personality.financial_wisdom < 50) {
      techniques.push('psychoeducation', 'skill_building');
    }

    return techniques;
  }

  private createRecoveryMilestones(trauma: FinancialTrauma, total_sessions: number): RecoveryMilestone[] {
    const milestones: RecoveryMilestone[] = [];

    // Early milestone: Symptom awareness
    milestones.push({
      name: 'Symptom Recognition',
      description: 'Character understands their trauma symptoms and triggers',
      target_intensity_reduction: 10,
      estimated_sessions: Math.ceil(total_sessions * 0.25),
      required_coping_mechanisms: ['awareness', 'trigger_identification'],
      measurable_outcomes: ['Can identify trauma triggers', 'Understands symptom patterns']
    });

    // Middle milestone: Coping development
    milestones.push({
      name: 'Coping Development',
      description: 'Character develops healthy coping mechanisms',
      target_intensity_reduction: 25,
      estimated_sessions: Math.ceil(total_sessions * 0.5),
      required_coping_mechanisms: ['grounding_techniques', 'emotional_regulation'],
      measurable_outcomes: ['Uses coping strategies effectively', 'Reduced symptom frequency']
    });

    // Late milestone: Integration
    milestones.push({
      name: 'Trauma Integration',
      description: 'Character integrates trauma experience and regains confidence',
      target_intensity_reduction: 50,
      estimated_sessions: Math.ceil(total_sessions * 0.8),
      required_coping_mechanisms: ['meaning_making', 'post_traumatic_growth'],
      measurable_outcomes: ['Makes financial decisions with confidence', 'Trauma no longer controls behavior']
    });

    return milestones;
  }

  private identifyRiskFactors(trauma: FinancialTrauma, personality: FinancialPersonality): string[] {
    const risk_factors = [];

    if (personality.financial_traumas.length > 2) {
      risk_factors.push('Multiple previous traumas may complicate recovery');
    }

    if (personality.risk_tolerance < 30) {
      risk_factors.push('Low risk tolerance may slow exposure therapy progress');
    }

    if (trauma.severity === 'critical') {
      risk_factors.push('Critical severity may require longer treatment duration');
    }

    return risk_factors;
  }

  private generateSupportStrategies(trauma: FinancialTrauma, personality: FinancialPersonality): string[] {
    const strategies = [];

    strategies.push('Team support and understanding during recovery process');
    strategies.push('Gradual re-exposure to financial decisions with coach support');
    strategies.push('Regular check-ins to monitor trauma symptoms and progress');

    if (trauma.trauma_type === 'betrayal') {
      strategies.push('Trust-building exercises with coach and teammates');
    }

    if (personality.generosity > 70) {
      strategies.push('Focus on helping others as pathway to healing');
    }

    return strategies;
  }

  private generateNextSessionRecommendations(
    trauma: FinancialTrauma,
    therapist_type: 'jung' | 'alien' | 'fairy_godmother',
    effectiveness: number
  ): string[] {
    const recommendations = [];

    if (effectiveness > 70) {
      recommendations.push('Continue current therapeutic approach, showing good progress');
    } else if (effectiveness < 40) {
      recommendations.push('Consider adjusting therapeutic approach or switching therapists');
    }

    if (trauma.current_intensity > 80) {
      recommendations.push('Focus on symptom stabilization before deeper trauma work');
    }

    recommendations.push('Practice coping mechanisms between sessions');
    recommendations.push('Monitor triggers and use grounding techniques as needed');

    return recommendations;
  }

  private isCopingMechanismApplicable(mechanism: string, decision_type: string): boolean {
    const applicableMap = {
      'grounding_techniques': ['anxiety', 'stress', 'panic'],
      'logical_assessment': ['investment', 'planning', 'analysis'],
      'emotional_regulation': ['impulse', 'anger', 'fear'],
      'systematic_planning': ['complex', 'major', 'important']
    };

    return Object.entries(applicableMap).some(([mech, keywords]) =>
      mechanism.includes(mech) && keywords.some(keyword => decision_type.includes(keyword))
    );
  }
}

export default FinancialTraumaRecoveryService;
