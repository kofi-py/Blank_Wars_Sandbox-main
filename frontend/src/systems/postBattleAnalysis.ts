// Post-Battle Analysis System - Relationship Evolution & Psychology Management
// Where the long-term consequences of battle decisions play out

import {
  BattleState,
  PostBattleAnalysis,
  CharacterEvaluation,
  RelationshipChange,
  PsychologicalConsequence,
  TrainingRecommendation,
  ChemistryEvolution,
  TeamMetrics,
  BattleCharacter
} from '../data/battleFlow';
import { coachProgressionAPI } from '../services/coachProgressionAPI';

export interface BattleMemory {
  character_id: string;
  notable_events: BattleEvent[];
  emotional_impact: number; // -100 to 100
  relationship_moments: RelationshipMoment[];
  personal_growth: GrowthMoment[];
  trauma: TraumaEvent[];
}

export interface BattleEvent {
  type: 'heroic_action' | 'betrayal' | 'saved_by_ally' | 'witnessed_death' | 'successful_teamwork' | 'conflict';
  description: string;
  witnessed_by: string[];
  emotional_weight: number;
  long_term_impact: 'positive' | 'negative' | 'complex';
}

export interface RelationshipMoment {
  with_character: string;
  event_type: 'saved_life' | 'abandoned' | 'supported' | 'conflicted' | 'bonded';
  strength_change: number;
  emotional_context: string;
  witnessed_by_team: boolean;
}

export interface GrowthMoment {
  type: 'overcame_fear' | 'showed_leadership' | 'learned_teamwork' | 'developed_skill';
  description: string;
  stat_improvement: Record<string, number>;
  permanent_trait?: string;
}

export interface TraumaEvent {
  type: 'witnessed_violence' | 'betrayed_by_ally' | 'failed_team' | 'overwhelming_fear';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  trigger_conditions: string[];
  recovery_time: number;
}

export class PostBattleAnalysisSystem {

  // ============= MAIN ANALYSIS PIPELINE =============

  static conductCompleteAnalysis(battle_state: BattleState): PostBattleAnalysis {
    // Step 1: Collect battle memories for each character
    const battleMemories = this.collectBattleMemories(battle_state);

    // Step 2: Evaluate individual character performance and growth
    const characterEvaluations = this.evaluateCharacterPerformances(battle_state, battleMemories);

    // Step 3: Calculate relationship changes based on battle events
    const relationship_changes = this.calculateRelationshipEvolution(battle_state, battleMemories);

    // Step 4: Assess psychological consequences and trauma
    const psychologicalConsequences = this.assessPsychologicalImpact(battle_state, battleMemories);

    // Step 5: Apply combat experience psych_stats improvements - NEW!
    this.applyCombatExperienceGains(battle_state, characterEvaluations, psychologicalConsequences);

    // Step 6: Generate training recommendations
    const trainingRecommendations = this.generateTrainingPlan(characterEvaluations, psychologicalConsequences);

    // Step 7: Analyze team chemistry evolution
    const team_chemistryEvolution = this.analyzeTeamEvolution(battle_state, relationship_changes);

    // Step 8: Calculate overall team metrics
    const teamMetrics = this.calculateTeamPerformanceMetrics(battle_state, characterEvaluations);

    return {
      battle_result: this.determineBattleResult(battle_state),
      team_performance_metrics: teamMetrics,
      character_evaluations: characterEvaluations,
      relationship_changes,
      psychological_consequences: psychologicalConsequences,
      training_recommendations: trainingRecommendations,
      team_chemistryEvolution
    };
  }

  // ============= BATTLE MEMORY COLLECTION =============

  static collectBattleMemories(battle_state: BattleState): Record<string, BattleMemory> {
    const memories: Record<string, BattleMemory> = {};

    // Initialize memories for each character
    battle_state.teams.player.characters.forEach(char => {
      memories[char.character.id] = {
        character_id: char.character.id,
        notable_events: [],
        emotional_impact: 0,
        relationship_moments: [],
        personal_growth: [],
        trauma: []
      };
    });

    // Analyze battle log for significant events
    battle_state.battle_log.forEach(logEntry => {
      this.processLogEntryForMemories(logEntry, memories, battle_state);
    });

    // Analyze character interactions and relationships
    this.analyzeCharacterInteractions(battle_state, memories);

    // Identify personal growth moments
    this.identifyPersonalGrowth(battle_state, memories);

    // Assess trauma and negative experiences
    this.assessTraumaEvents(battle_state, memories);

    return memories;
  }

  static processLogEntryForMemories(
    log_entry: { character_involved?: string; description?: string },
    memories: Record<string, BattleMemory>,
    battle_state: BattleState
  ): void {
    if (log_entry.character_involved) {
      const memory = memories[log_entry.character_involved];
      if (!memory) return;

      // Create battle event based on log entry
      const event: BattleEvent = {
        type: this.categorizeLogEvent(log_entry),
        description: log_entry.description,
        witnessed_by: this.determineWitnesses(log_entry, battle_state),
        emotional_weight: this.calculateEmotionalWeight(log_entry),
        long_term_impact: this.determineLongTermImpact(log_entry)
      };

      memory.notable_events.push(event);
      memory.emotional_impact += event.emotional_weight;
    }
  }

  static analyzeCharacterInteractions(
    battle_state: BattleState,
    memories: Record<string, BattleMemory>
  ): void {
    // Look for specific interaction patterns during battle
    battle_state.teams.player.characters.forEach(char1 => {
      battle_state.teams.player.characters.forEach(char2 => {
        if (char1.character.id === char2.character.id) return;

        const interactions = this.findCharacterInteractions(char1, char2, battle_state);
        interactions.forEach(interaction => {
          const moment: RelationshipMoment = {
            with_character: char2.character.id,
            event_type: interaction.type,
            strength_change: interaction.relationship_impact,
            emotional_context: interaction.context,
            witnessed_by_team: interaction.public_event
          };

          memories[char1.character.id].relationship_moments.push(moment);
        });
      });
    });
  }

  // ============= CHARACTER EVALUATION =============

  static evaluateCharacterPerformances(
    battle_state: BattleState,
    memories: Record<string, BattleMemory>
  ): CharacterEvaluation[] {
    return battle_state.teams.player.characters.map(char => {
      const memory = memories[char.character.id];
      const performance = char.battle_performance;

      // Calculate battle rating based on multiple factors
      const combatEffectiveness = this.calculateCombatEffectiveness(char);
      const teamworkScore = this.calculateTeamworkScore(char, memory);
      const gameplan_adherenceScore = this.calculateGameplanAdherenceScore(char);
      const adaptabilityScore = this.calculateAdaptabilityScore(char, memory);

      const overallRating = Math.floor(
        (combatEffectiveness * 0.3 + teamworkScore * 0.3 + gameplan_adherenceScore * 0.2 + adaptabilityScore * 0.2)
      );

      // Assess mental health changes
      const mental_healthChange = this.calculateMentalHealthImpact(char, memory);
      const stress_impact = this.calculateStressImpact(char, memory);
      const confidenceChange = this.calculateConfidenceImpact(char, memory);

      // Identify notable actions and patterns
      const notableActions = this.identifyNotableActions(char, memory);
      const behaviorPatterns = this.analyzeBehaviorPatterns(char, memory);
      const growthAreas = this.identifyGrowthAreas(char, memory);
      const strengthsDisplayed = this.identifyStrengthsDisplayed(char, memory);

      return {
        character_id: char.character.id,
        battle_rating: overallRating,
        gameplan_adherenceScore: gameplan_adherenceScore,
        teamplay_score: teamworkScore,
        mentalhealth_change: mental_healthChange,
        stress_level: char.mental_state.stress,
        confidence_change: confidenceChange,
        notable_actions: notableActions,
        behavior_patterns: behaviorPatterns,
        growth_areas: growthAreas,
        strengths_displayed: strengthsDisplayed
      };
    });
  }

  static calculateCombatEffectiveness(char: BattleCharacter): number {
    const performance = char.battle_performance;

    // Base combat metrics
    let effectiveness = 0;

    // Damage output (40% weight)
    const attack = char.character.attack || char.character.strength || 10;
    const damageRatio = performance.damage_dealt / Math.max(1, attack);
    effectiveness += Math.min(40, damageRatio * 10);

    // Accuracy (30% weight)
    const accuracyRate = performance.successful_hits / Math.max(1, performance.abilities_used);
    effectiveness += accuracyRate * 30;

    // Survival (30% weight)
    const maxHealth = char.character.max_health || 100;
    const survivalRate = char.current_health / maxHealth;
    effectiveness += survivalRate * 30;

    return Math.min(100, effectiveness);
  }

  static calculateTeamworkScore(char: BattleCharacter, memory: BattleMemory): number {
    let teamworkScore = 50; // Base score

    // Positive teamwork actions
    teamworkScore += char.battle_performance.teamplay_actions * 5;

    // Relationship moments impact
    memory.relationship_moments.forEach(moment => {
      if (moment.event_type === 'saved_life' || moment.event_type === 'supported') {
        teamworkScore += 10;
      } else if (moment.event_type === 'abandoned' || moment.event_type === 'conflicted') {
        teamworkScore -= 15;
      }
    });

    // Growth moments in teamwork
    memory.personal_growth.forEach(growth => {
      if (growth.type === 'learned_teamwork' || growth.type === 'showed_leadership') {
        teamworkScore += 15;
      }
    });

    return Math.max(0, Math.min(100, teamworkScore));
  }

  static calculateGameplanAdherenceScore(char: BattleCharacter): number {
    const totalActions = char.battle_performance.abilities_used + char.battle_performance.strategy_deviations;
    if (totalActions === 0) return char.gameplan_adherence;

    const gameplan_adherenceRate = (totalActions - char.battle_performance.strategy_deviations) / totalActions;
    return Math.floor(gameplan_adherenceRate * 100);
  }

  // ============= RELATIONSHIP EVOLUTION =============

  static calculateRelationshipEvolution(
    battle_state: BattleState,
    memories: Record<string, BattleMemory>
  ): RelationshipChange[] {
    const changes: RelationshipChange[] = [];

    battle_state.teams.player.characters.forEach(char1 => {
      battle_state.teams.player.characters.forEach(char2 => {
        if (char1.character.id >= char2.character.id) return; // Avoid duplicates

        const relationship_change = this.calculateSpecificRelationshipChange(
          char1, char2, memories, battle_state
        );

        if (relationship_change.new_relationship_strength !== relationship_change.old_relationship_strength) {
          changes.push(relationship_change);
        }
      });
    });

    return changes;
  }

  static calculateSpecificRelationshipChange(
    char1: BattleCharacter,
    char2: BattleCharacter,
    memories: Record<string, BattleMemory>,
    battle_state: BattleState
  ): RelationshipChange {
    // Find existing relationship
    const existingRelationship = char1.relationship_modifiers.find(
      rel => rel.with_character === char2.character.name.toLowerCase().replace(/\s+/g, '_')
    );

    const oldStrength = existingRelationship?.strength || 0;
    let newStrength = oldStrength;

    const battleEvents: string[] = [];
    let changeReason = "No significant interactions during battle";

    // Analyze relationship moments from both characters' perspectives
    const char1Memory = memories[char1.character.id];
    const char2Memory = memories[char2.character.id];

    if (char1Memory && char2Memory) {
      // Look for mutual moments
      const mutualMoments = this.findMutualRelationshipMoments(char1Memory, char2Memory);

      mutualMoments.forEach(moment => {
        newStrength += moment.strength_change;
        battleEvents.push(moment.description);

        if (moment.strength_change > 0) {
          changeReason = "Positive interactions during battle strengthened their bond";
        } else {
          changeReason = "Conflicts and tension during battle strained their relationship";
        }
      });
    }

    // Apply personality compatibility effects
    const compatibilityEffect = this.calculateCompatibilityEffect(char1, char2);
    newStrength += compatibilityEffect;

    // Clamp to valid range
    newStrength = Math.max(-100, Math.min(100, newStrength));

    return {
      character1: char1.character.id,
      character2: char2.character.id,
      old_relationship_strength: oldStrength,
      new_relationship_strength: newStrength,
      change_reason: changeReason,
      battle_events: battleEvents,
      future_implications: this.generateFutureImplications(oldStrength, newStrength, char1, char2)
    };
  }

  // ============= PSYCHOLOGICAL CONSEQUENCES =============

  static assessPsychologicalImpact(
    battle_state: BattleState,
    memories: Record<string, BattleMemory>
  ): PsychologicalConsequence[] {
    const consequences: PsychologicalConsequence[] = [];

    battle_state.teams.player.characters.forEach(char => {
      const memory = memories[char.character.id];
      if (!memory) return;

      // Assess different types of psychological impact
      const trauma = this.assessTrauma(char, memory);
      const growth = this.assessPersonalGrowth(char, memory);
      const bonding = this.assessBondingExperiences(char, memory);
      const resentment = this.assessResentmentBuildup(char, memory);
      const inspiration = this.assessInspirationalMoments(char, memory);

      [trauma, growth, bonding, resentment, inspiration].forEach(consequence => {
        if (consequence && consequence.severity !== 'minor') {
          consequences.push(consequence);
        }
      });
    });

    return consequences;
  }

  static assessTrauma(char: BattleCharacter, memory: BattleMemory): PsychologicalConsequence | null {
    const traumaEvents = memory.trauma;
    if (traumaEvents.length === 0) return null;

    const severestTrauma = traumaEvents.reduce((worst, current) =>
      this.getTraumaSeverityValue(current.severity) > this.getTraumaSeverityValue(worst.severity)
        ? current : worst
    );

    const recovery_time = this.calculateTraumaRecoveryTime(severestTrauma, char);

    // Map trauma severity to consequence severity
    const severityMap: Record<string, 'minor' | 'moderate' | 'significant'> = {
      'mild': 'minor',
      'moderate': 'moderate',
      'severe': 'significant'
    };

    return {
      character_id: char.character.id,
      type: 'trauma',
      severity: severityMap[severestTrauma.severity] || 'moderate',
      description: `${char.character.name} experienced ${severestTrauma.description}`,
      long_term_effects: this.generateTraumaEffects(severestTrauma, char),
      recovery_time,
      treatment_options: this.generateTraumaTreatmentOptions(severestTrauma, char)
    };
  }

  static assessPersonalGrowth(char: BattleCharacter, memory: BattleMemory): PsychologicalConsequence | null {
    const growthMoments = memory.personal_growth;
    if (growthMoments.length === 0) return null;

    const significantGrowth = growthMoments.filter(growth =>
      growth.type === 'overcame_fear' || growth.type === 'showed_leadership'
    );

    if (significantGrowth.length === 0) return null;

    return {
      character_id: char.character.id,
      type: 'growth',
      severity: 'moderate',
      description: `${char.character.name} showed significant personal development`,
      long_term_effects: this.generateGrowthEffects(significantGrowth, char),
      recovery_time: 0,
      treatment_options: this.generateGrowthContinuationOptions(significantGrowth, char)
    };
  }

  // ============= TRAINING RECOMMENDATIONS =============

  static generateTrainingPlan(
    evaluations: CharacterEvaluation[],
    consequences: PsychologicalConsequence[]
  ): TrainingRecommendation[] {
    const recommendations: TrainingRecommendation[] = [];

    evaluations.forEach(evaluation => {
      // Mental health recommendations
      if (evaluation.mentalhealth_change < -20) {
        recommendations.push({
          character_id: evaluation.character_id,
          type: 'mental_health',
          priority: 'urgent',
          description: 'Immediate mental health support needed to prevent breakdown',
          expected_benefit: 'Restore mental stability and prevent future deviation from gameplan',
          time_required: 5
        });
      }

      // Gameplan adherence training
      if (evaluation.gameplan_adherenceScore < 40) {
        recommendations.push({
          character_id: evaluation.character_id,
          type: 'strategy_focus',
          priority: 'high',
          description: 'Intensive discipline and trust-building exercises',
          expected_benefit: 'Improved following of strategic commands',
          time_required: 8
        });
      }

      // Team chemistry work
      if (evaluation.teamplay_score < 50) {
        recommendations.push({
          character_id: evaluation.character_id,
          type: 'team_chemistry',
          priority: 'medium',
          description: 'Group activities and bonding exercises with teammates',
          expected_benefit: 'Better cooperation and team dynamics',
          time_required: 4
        });
      }

      // Combat skill improvement
      if (evaluation.battle_rating < 60) {
        recommendations.push({
          character_id: evaluation.character_id,
          type: 'combat_skills',
          priority: 'medium',
          description: 'Combat training and tactical education',
          expected_benefit: 'Enhanced battle effectiveness',
          time_required: 6
        });
      }

      // Stress management
      if (evaluation.stress_level > 70) {
        recommendations.push({
          character_id: evaluation.character_id,
          type: 'stress_management',
          priority: 'high',
          description: 'Relaxation techniques and pressure handling training',
          expected_benefit: 'Reduced stress and better performance under pressure',
          time_required: 3
        });
      }
    });

    // Add trauma-specific recommendations
    consequences.forEach(consequence => {
      if (consequence.type === 'trauma') {
        recommendations.push({
          character_id: consequence.character_id,
          type: 'mental_health',
          priority: consequence.severity === 'significant' ? 'urgent' : 'high',
          description: `Specialized trauma therapy for ${consequence.description}`,
          expected_benefit: 'Recovery from traumatic experience',
          time_required: consequence.recovery_time
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // ============= TEAM CHEMISTRY EVOLUTION =============

  static analyzeTeamEvolution(
    battle_state: BattleState,
    relationship_changes: RelationshipChange[]
  ): ChemistryEvolution {
    const oldChemistry = battle_state.teams.player.team_chemistry;

    // Calculate new chemistry based on relationship changes
    let chemistryDelta = 0;
    const evolutionFactors: string[] = [];
    const strengthenedBonds: string[] = [];
    const weakenedBonds: string[] = [];

    relationship_changes.forEach(change => {
      const delta = change.new_relationship_strength - change.old_relationship_strength;
      chemistryDelta += delta * 0.1; // Each relationship change affects team chemistry

      if (delta > 20) {
        strengthenedBonds.push(`${change.character1} and ${change.character2} grew closer`);
        evolutionFactors.push(`Strong bonding between team members`);
      } else if (delta < -20) {
        weakenedBonds.push(`${change.character1} and ${change.character2} relationship deteriorated`);
        evolutionFactors.push(`Conflicts damaging team cohesion`);
      }
    });

    const newChemistry = Math.max(0, Math.min(100, oldChemistry + chemistryDelta));

    // Award team chemistry XP to coach based on chemistry changes
    if (battle_state.battle_id && Math.abs(chemistryDelta) > 0) {
      coachProgressionAPI.awardTeamChemistryXP(
        Math.abs(chemistryDelta), // chemistry improvement/change amount
        newChemistry,             // final chemistry level
        battle_state.battle_id
      ).catch(error => console.error('Failed to award team chemistry XP:', error));
    }

    // Determine emerging dynamics
    const emergingDynamics = this.identifyEmergingDynamics(battle_state, relationship_changes);

    // Determine culture shift
    const cultureShift = this.determineCultureShift(oldChemistry, newChemistry, relationship_changes);

    return {
      old_chemistry: oldChemistry,
      new_chemistry: newChemistry,
      evolution_factors: evolutionFactors,
      emerging_dynamics: emergingDynamics,
      strengthened_bonds: strengthenedBonds,
      weakened_bonds: weakenedBonds,
      culture_shift: cultureShift
    };
  }

  // ============= UTILITY METHODS =============

  private static determineBattleResult(battle_state: BattleState): 'victory' | 'defeat' | 'draw' {
    const playerAlive = battle_state.teams.player.characters.some(char => char.current_health > 0);
    const opponentAlive = battle_state.teams.opponent.characters.some(char => char.current_health > 0);

    if (playerAlive && !opponentAlive) return 'victory';
    if (!playerAlive && opponentAlive) return 'defeat';
    return 'draw';
  }

  private static calculateTeamPerformanceMetrics(
    battle_state: BattleState,
    evaluations: CharacterEvaluation[]
  ): TeamMetrics {
    const avgGameplanAdherence = evaluations.reduce((sum, evaluation) => sum + evaluation.gameplan_adherenceScore, 0) / evaluations.length;
    const avgTeamwork = evaluations.reduce((sum, evaluation) => sum + evaluation.teamplay_score, 0) / evaluations.length;
    const avgRating = evaluations.reduce((sum, evaluation) => sum + evaluation.battle_rating, 0) / evaluations.length;

    return {
      overall_teamwork: Math.floor(avgTeamwork),
      gameplan_adherence: Math.floor(avgGameplanAdherence),
      strategic_execution: Math.floor(avgRating),
      morale_management: battle_state.teams.player.current_morale,
      conflict_resolution: this.calculateConflictResolution(battle_state),
      adaptability: this.calculateAdaptability(battle_state)
    };
  }

  // Additional helper methods would be implemented here...
  // (Keeping focused on core functionality for brevity)

  private static categorizeLogEvent(logEntry: { description?: string }): 'heroic_action' | 'betrayal' | 'saved_by_ally' | 'witnessed_death' | 'successful_teamwork' | 'conflict' {
    const description = logEntry.description?.toLowerCase() || '';

    if (description.includes('critical hit') || description.includes('decisive blow')) {
      return 'heroic_action';
    }
    if (description.includes('assist') || description.includes('support') || description.includes('help')) {
      return 'successful_teamwork';
    }
    if (description.includes('abandon') || description.includes('betray')) {
      return 'betrayal';
    }
    if (description.includes('save') || description.includes('rescue')) {
      return 'saved_by_ally';
    }
    if (description.includes('death') || description.includes('defeat')) {
      return 'witnessed_death';
    }
    if (description.includes('conflict') || description.includes('argue')) {
      return 'conflict';
    }

    // Default categorization
    return 'heroic_action';
  }
  private static determineWitnesses(logEntry: { character_involved?: string; description?: string }, battle_state: BattleState): string[] {
    const witnesses: string[] = [];

    // All living team members can potentially witness events
    battle_state.teams.player.characters.forEach(char => {
      if (char.current_health > 0 && char.character.id !== logEntry.character_involved) {
        // High visibility events are witnessed by everyone
        if (logEntry.description?.includes('critical') || logEntry.description?.includes('decisive')) {
          witnesses.push(char.character.id);
        }
        // Team actions are witnessed by nearby members
        else if (logEntry.description?.includes('team') || logEntry.description?.includes('assist')) {
          witnesses.push(char.character.id);
        }
        // Random chance for other events
        else if (Math.random() > 0.6) {
          witnesses.push(char.character.id);
        }
      }
    });

    return witnesses;
  }
  private static calculateEmotionalWeight(logEntry: { description?: string }): number {
    const description = logEntry.description?.toLowerCase() || '';

    if (description.includes('critical hit') || description.includes('victory')) {
      return 15;
    }
    if (description.includes('saved') || description.includes('rescue')) {
      return 20;
    }
    if (description.includes('death') || description.includes('defeat')) {
      return -25;
    }
    if (description.includes('betray') || description.includes('abandon')) {
      return -20;
    }
    if (description.includes('assist') || description.includes('teamwork')) {
      return 10;
    }
    if (description.includes('conflict') || description.includes('argue')) {
      return -10;
    }

    return 5; // Default positive emotional weight
  }
  private static determineLongTermImpact(logEntry: { description?: string }): 'positive' | 'negative' | 'complex' {
    const description = logEntry.description?.toLowerCase() || '';

    if (description.includes('death') || description.includes('betray')) {
      return 'negative';
    }
    if (description.includes('saved') || description.includes('victory') || description.includes('critical')) {
      return 'positive';
    }
    if (description.includes('conflict') && description.includes('resolve')) {
      return 'complex';
    }
    if (description.includes('abandon') || description.includes('fail')) {
      return 'negative';
    }

    return 'positive';
  }
  private static findCharacterInteractions(char1: BattleCharacter, char2: BattleCharacter, battle_state: BattleState): Array<{
    type: 'supported' | 'saved_life' | 'conflicted' | 'bonded';
    relationship_impact: number;
    context: string;
    public_event: boolean;
  }> {
    const interactions: Array<{
      type: 'supported' | 'saved_life' | 'conflicted' | 'bonded';
      relationship_impact: number;
      context: string;
      public_event: boolean;
    }> = [];

    // Check if characters were positioned near each other
    const char1Actions = battle_state.battle_log.filter(log => log.character_involved === char1.character.id);
    const char2Actions = battle_state.battle_log.filter(log => log.character_involved === char2.character.id);

    // Look for mutual assistance patterns
    char1Actions.forEach(action => {
      if (action.description?.includes('assist') || action.description?.includes('support')) {
        if (action.description.includes(char2.character.name)) {
          interactions.push({
            type: 'supported',
            relationship_impact: 15,
            context: `${char1.character.name} provided tactical support to ${char2.character.name}`,
            public_event: true
          });
        }
      }
    });

    // Check for protective actions
    if (char1.battle_performance.teamplay_actions > 0 && char2.battle_performance.damageReceived > 20) {
      interactions.push({
        type: 'saved_life',
        relationship_impact: 25,
        context: `${char1.character.name} helped protect ${char2.character.name} from harm`,
        public_event: true
      });
    }

    // Check for conflicting strategies
    if (char1.battle_performance.strategy_deviations > 2 && char2.battle_performance.strategy_deviations === 0) {
      interactions.push({
        type: 'conflicted',
        relationship_impact: -10,
        context: `${char1.character.name}'s reckless actions frustrated disciplined ${char2.character.name}`,
        public_event: false
      });
    }

    // Check for shared experiences
    if (char1.current_health < char1.character.max_health * 0.5 &&
      char2.current_health < char2.character.max_health * 0.5) {
      interactions.push({
        type: 'bonded',
        relationship_impact: 10,
        context: `${char1.character.name} and ${char2.character.name} endured hardship together`,
        public_event: true
      });
    }

    return interactions;
  }
  private static identifyPersonalGrowth(battle_state: BattleState, memories: Record<string, BattleMemory>): void {
    battle_state.teams.player.characters.forEach(char => {
      const memory = memories[char.character.id];
      if (!memory) return;

      // Check for overcoming fear through performance
      if (char.battle_performance.successful_hits > 5 && char.mental_state.stress > 60) {
        memory.personal_growth.push({
          type: 'overcame_fear',
          description: `${char.character.name} performed well despite high stress`,
          stat_improvement: { confidence: 5, mental_health: 3 }
        });
      }

      // Check for leadership development
      if (char.battle_performance.teamplay_actions > 3 && char.battle_performance.strategy_deviations === 0) {
        memory.personal_growth.push({
          type: 'showed_leadership',
          description: `${char.character.name} demonstrated excellent leadership and team coordination`,
          stat_improvement: { confidence: 8, gameplan_adherence: 5 },
          permanent_trait: 'Natural Leader'
        });
      }

      // Check for teamwork learning
      const supportiveActions = memory.relationship_moments.filter(
        rm => rm.event_type === 'supported' || rm.event_type === 'saved_life'
      );
      if (supportiveActions.length > 1) {
        memory.personal_growth.push({
          type: 'learned_teamwork',
          description: `${char.character.name} learned the value of cooperation`,
          stat_improvement: { teamwork: 10, mental_health: 5 }
        });
      }

      // Check for skill development through critical hits
      if (char.battle_performance.critical_hits > 2) {
        memory.personal_growth.push({
          type: 'developed_skill',
          description: `${char.character.name} showed improved combat technique`,
          stat_improvement: { attack: 2, accuracy: 5 }
        });
      }
    });
  }
  private static assessTraumaEvents(battle_state: BattleState, memories: Record<string, BattleMemory>): void {
    battle_state.teams.player.characters.forEach(char => {
      const memory = memories[char.character.id];
      if (!memory) return;

      // Severe injury trauma
      if (char.current_health < char.character.max_health * 0.2) {
        memory.trauma.push({
          type: 'overwhelming_fear',
          severity: 'severe',
          description: 'Near-death experience causing lasting fear',
          trigger_conditions: ['low health', 'high stress situations'],
          recovery_time: 10
        });
      }

      // Betrayal trauma from teammate conflicts
      const betrayalEvents = memory.relationship_moments.filter(rm => rm.event_type === 'abandoned');
      if (betrayalEvents.length > 0) {
        memory.trauma.push({
          type: 'betrayed_by_ally',
          severity: 'moderate',
          description: 'Felt abandoned by teammates in critical moment',
          trigger_conditions: ['team missions', 'high pressure situations'],
          recovery_time: 5
        });
      }

      // Witnessed violence trauma
      const violentEvents = memory.notable_events.filter(e => e.type === 'witnessed_death');
      if (violentEvents.length > 0) {
        memory.trauma.push({
          type: 'witnessed_violence',
          severity: 'moderate',
          description: 'Witnessed traumatic events during battle',
          trigger_conditions: ['similar combat scenarios', 'ally in danger'],
          recovery_time: 7
        });
      }

      // Strategy failure trauma
      if (char.battle_performance.strategy_deviations > 3 && memory.emotional_impact < -20) {
        memory.trauma.push({
          type: 'failed_team',
          severity: 'mild',
          description: 'Feels responsible for not following orders',
          trigger_conditions: ['receiving strategic commands', 'team criticism'],
          recovery_time: 3
        });
      }
    });
  }
  private static calculateAdaptabilityScore(char: BattleCharacter, memory: BattleMemory): number { return 50; }
  private static calculateMentalHealthImpact(char: BattleCharacter, memory: BattleMemory): number {
    let impact = 0;

    // Base impact from battle outcome
    const healthPercent = char.current_health / char.character.max_health;
    if (healthPercent < 0.3) impact -= 15; // Severe injury trauma
    else if (healthPercent < 0.5) impact -= 10; // Moderate injury stress

    // Impact from notable events
    memory.notable_events.forEach(event => {
      switch (event.type) {
        case 'heroic_action':
          impact += 5;
          break;
        case 'betrayal':
        case 'witnessed_death':
          impact -= 20;
          break;
        case 'saved_by_ally':
          impact += 3;
          break;
        case 'successful_teamwork':
          impact += 2;
          break;
        case 'conflict':
          impact -= 5;
          break;
      }
    });

    // Strategy deviations cause stress
    if (char.battle_performance.strategy_deviations > 2) impact -= 10;

    return Math.max(-50, Math.min(50, impact));
  }
  private static calculateStressImpact(char: BattleCharacter, memory: BattleMemory): number {
    let stress_change = 0;

    // Base stress from battle intensity
    const damageRatio = char.battle_performance.damageReceived / char.character.max_health;
    stress_change += damageRatio * 20; // Taking damage is stressful

    // Critical hits received are very stressful
    if (char.battle_performance.critical_hitsReceived > 0) {
      stress_change += char.battle_performance.critical_hitsReceived * 10;
    }

    // Strategy deviations increase stress
    stress_change += char.battle_performance.strategy_deviations * 5;

    // Positive factors reduce stress
    if (memory.emotional_impact > 0) {
      stress_change -= 10; // Positive battle experience
    }

    // Team support reduces stress
    const supportiveRelationships = memory.relationship_moments.filter(
      rm => rm.event_type === 'supported' || rm.event_type === 'saved_life'
    ).length;
    stress_change -= supportiveRelationships * 5;

    return Math.max(-30, Math.min(50, stress_change));
  }
  private static calculateConfidenceImpact(char: BattleCharacter, memory: BattleMemory): number {
    let confidenceChange = 0;

    // Success breeds confidence
    const hitRate = char.battle_performance.successful_hits / Math.max(1, char.battle_performance.abilities_used);
    if (hitRate > 0.8) confidenceChange += 15; // High accuracy
    else if (hitRate < 0.4) confidenceChange -= 10; // Poor accuracy

    // Critical hits boost confidence
    confidenceChange += char.battle_performance.critical_hits * 5;

    // Taking heavy damage hurts confidence
    if (char.current_health < char.character.max_health * 0.3) {
      confidenceChange -= 15;
    }

    // Heroic actions boost confidence
    const heroicActions = memory.notable_events.filter(e => e.type === 'heroic_action').length;
    confidenceChange += heroicActions * 10;

    // Team success matters
    if (memory.emotional_impact > 20) confidenceChange += 10;

    return Math.max(-50, Math.min(50, confidenceChange));
  }
  private static identifyNotableActions(char: BattleCharacter, memory: BattleMemory): string[] {
    const actions: string[] = [];

    // Combat achievements
    if (char.battle_performance.critical_hits > 2) {
      actions.push(`Landed ${char.battle_performance.critical_hits} critical hits`);
    }

    if (char.battle_performance.successful_hits > 10) {
      actions.push('Maintained sustained offensive pressure');
    }

    // Defensive achievements
    if (char.battle_performance.damageReceived === 0) {
      actions.push('Avoided all damage - perfect defense');
    }

    // Team play
    if (char.battle_performance.teamplay_actions > 3) {
      actions.push('Excellent team coordination');
    }

    // Strategy adherence
    if (char.battle_performance.strategy_deviations === 0) {
      actions.push('Perfect gameplan adherence');
    } else if (char.battle_performance.strategy_deviations > 3) {
      actions.push('Frequently deviated from strategy');
    }

    // Psychological events
    memory.notable_events.forEach(event => {
      if (event.type === 'heroic_action') {
        actions.push('Performed heroic action');
      } else if (event.type === 'saved_by_ally') {
        actions.push('Saved by teammate intervention');
      }
    });

    return actions;
  }
  private static analyzeBehaviorPatterns(char: BattleCharacter, memory: BattleMemory): string[] {
    const patterns: string[] = [];

    // Analyze strategy adherence patterns
    if (char.battle_performance.strategy_deviations > 3) {
      patterns.push('Tends to ignore strategic orders when stressed');
    } else if (char.battle_performance.strategy_deviations === 0) {
      patterns.push('Excellent discipline - consistently follows gameplan');
    }

    // Analyze teamwork patterns
    if (char.battle_performance.teamplay_actions > 5) {
      patterns.push('Strong team player - frequently assists allies');
    } else if (char.battle_performance.teamplay_actions === 0) {
      patterns.push('Isolated fighting style - rarely cooperates with team');
    }

    // Analyze combat style patterns
    const hitRate = char.battle_performance.successful_hits / Math.max(1, char.battle_performance.abilities_used);
    if (hitRate > 0.8) {
      patterns.push('Calculated and precise - high accuracy fighter');
    } else if (hitRate < 0.4) {
      patterns.push('Aggressive but reckless - struggles with accuracy');
    }

    // Analyze emotional patterns from events
    const traumaticEvents = memory.notable_events.filter(e => e.type === 'witnessed_death' || e.type === 'betrayal');
    if (traumaticEvents.length > 0) {
      patterns.push('Shows signs of emotional distress during intense moments');
    }

    const heroicEvents = memory.notable_events.filter(e => e.type === 'heroic_action');
    if (heroicEvents.length > 1) {
      patterns.push('Natural leader - rises to challenges under pressure');
    }

    return patterns;
  }
  private static identifyGrowthAreas(char: BattleCharacter, memory: BattleMemory): string[] {
    const growthAreas: string[] = [];

    // Strategy adherence improvement
    if (char.battle_performance.strategy_deviations > 2) {
      growthAreas.push('Gameplan adherence - needs better discipline and trust in leadership');
    }

    // Combat effectiveness
    const hitRate = char.battle_performance.successful_hits / Math.max(1, char.battle_performance.abilities_used);
    if (hitRate < 0.6) {
      growthAreas.push('Combat accuracy - requires target practice and technique refinement');
    }

    // Teamwork development
    if (char.battle_performance.teamplay_actions < 3) {
      growthAreas.push('Team coordination - needs to develop cooperation and communication skills');
    }

    // Mental resilience
    if (char.mental_state.stress > 70) {
      growthAreas.push('Stress management - requires mental conditioning and pressure training');
    }

    // Relationship building
    const negativeRelationships = memory.relationship_moments.filter(
      rm => rm.event_type === 'conflicted' || rm.event_type === 'abandoned'
    );
    if (negativeRelationships.length > 0) {
      growthAreas.push('Interpersonal relationships - needs conflict resolution and empathy training');
    }

    // Adaptability
    if (char.battle_performance.strategy_deviations > 0 && this.calculateAdaptabilityScore(char, memory) < 40) {
      growthAreas.push('Tactical adaptability - must learn when to adapt vs when to follow orders');
    }

    // Confidence building
    if (char.mental_state.confidence < 40) {
      growthAreas.push('Self-confidence - needs success experiences and positive reinforcement');
    }

    return growthAreas;
  }
  private static identifyStrengthsDisplayed(char: BattleCharacter, memory: BattleMemory): string[] {
    const strengths: string[] = [];

    // Combat strengths
    const hitRate = char.battle_performance.successful_hits / Math.max(1, char.battle_performance.abilities_used);
    if (hitRate > 0.8) {
      strengths.push('Exceptional accuracy and precision in combat');
    }

    if (char.battle_performance.critical_hits > 2) {
      strengths.push('Ability to find and exploit enemy weaknesses');
    }

    // Strategic strengths
    if (char.battle_performance.strategy_deviations === 0) {
      strengths.push('Perfect gameplan adherence - excellent discipline');
    }

    // Teamwork strengths
    if (char.battle_performance.teamplay_actions > 5) {
      strengths.push('Outstanding team player and supporter');
    }

    // Mental fortitude
    if (char.mental_state.stress < 30 && memory.emotional_impact > 0) {
      strengths.push('Mental resilience under pressure');
    }

    // Leadership qualities
    const heroicActions = memory.notable_events.filter(e => e.type === 'heroic_action');
    if (heroicActions.length > 0) {
      strengths.push('Natural leadership and courage in critical moments');
    }

    // Relationship building
    const positiveRelationships = memory.relationship_moments.filter(
      rm => rm.event_type === 'saved_life' || rm.event_type === 'supported'
    );
    if (positiveRelationships.length > 2) {
      strengths.push('Strong relationship building and teammate support');
    }

    // Survival ability
    if (char.current_health > char.character.max_health * 0.7) {
      strengths.push('Excellent defensive awareness and survival instincts');
    }

    // Growth mindset
    if (memory.personal_growth.length > 0) {
      strengths.push('Shows continuous learning and personal development');
    }

    return strengths;
  }
  private static findMutualRelationshipMoments(memory1: BattleMemory, memory2: BattleMemory): Array<{
    description: string;
    strength_change: number;
    type: string;
    witnessed: boolean;
  }> {
    const mutualMoments: Array<{
      description: string;
      strength_change: number;
      type: string;
      witnessed: boolean;
    }> = [];

    // Find moments that both characters experienced together
    memory1.relationship_moments.forEach(moment1 => {
      const matchingMoment = memory2.relationship_moments.find(moment2 =>
        moment2.with_character === memory1.character_id &&
        moment1.with_character === memory2.character_id &&
        Math.abs(moment1.strength_change - moment2.strength_change) < 5
      );

      if (matchingMoment) {
        mutualMoments.push({
          description: moment1.emotional_context,
          strength_change: (moment1.strength_change + matchingMoment.strength_change) / 2,
          type: moment1.event_type,
          witnessed: moment1.witnessed_by_team
        });
      }
    });

    return mutualMoments;
  }
  private static calculateCompatibilityEffect(char1: BattleCharacter, char2: BattleCharacter): number {
    let compatibilityBonus = 0;

    // Strategy adherence compatibility
    const adherenceDiff = Math.abs(char1.battle_performance.strategy_deviations - char2.battle_performance.strategy_deviations);
    if (adherenceDiff < 2) {
      compatibilityBonus += 5; // Similar discipline levels
    } else if (adherenceDiff > 4) {
      compatibilityBonus -= 5; // Very different approaches
    }

    // Teamwork compatibility
    if (char1.battle_performance.teamplay_actions > 3 && char2.battle_performance.teamplay_actions > 3) {
      compatibilityBonus += 10; // Both are team players
    }

    // Confidence level compatibility
    const confidenceDiff = Math.abs(char1.mental_state.confidence - char2.mental_state.confidence);
    if (confidenceDiff < 20) {
      compatibilityBonus += 3; // Similar confidence levels
    } else if (confidenceDiff > 50) {
      compatibilityBonus -= 3; // Very different confidence levels
    }

    // Stress level effects
    if (char1.mental_state.stress > 70 && char2.mental_state.stress > 70) {
      compatibilityBonus -= 5; // Both stressed = more conflict
    }

    return compatibilityBonus;
  }
  private static generateFutureImplications(oldStrength: number, new_strength: number, char1: BattleCharacter, char2: BattleCharacter): string[] {
    const implications: string[] = [];
    const strengthDelta = new_strength - oldStrength;

    if (strengthDelta > 20) {
      implications.push('Strong bond will improve team coordination in future battles');
      implications.push('May develop into natural battle partnership');
      if (new_strength > 70) {
        implications.push('Could become inseparable - may struggle if separated');
      }
    } else if (strengthDelta < -20) {
      implications.push('Tension may disrupt team chemistry if not addressed');
      implications.push('May need mediation or separate training sessions');
      if (new_strength < -50) {
        implications.push('Risk of open conflict during missions');
      }
    } else if (Math.abs(strengthDelta) > 5) {
      implications.push('Relationship is evolving - monitor for further changes');
    }

    // Personality-based implications
    if (char1.mental_state.confidence > 80 && char2.mental_state.confidence < 40) {
      implications.push('Confidence gap may create mentor-student dynamic');
    }

    return implications;
  }
  private static getTraumaSeverityValue(severity: string): number {
    switch (severity) {
      case 'mild': return 1;
      case 'moderate': return 2;
      case 'severe': return 3;
      default: return 1;
    }
  }
  private static calculateTraumaRecoveryTime(trauma: TraumaEvent, char: BattleCharacter): number { return 3; }
  private static generateTraumaEffects(trauma: TraumaEvent, char: BattleCharacter): string[] {
    const effects: string[] = [];

    switch (trauma.type) {
      case 'witnessed_violence':
        effects.push('Increased hesitation in combat situations');
        effects.push('Heightened stress response to violence');
        if (trauma.severity === 'severe') {
          effects.push('Potential flashbacks during intense battles');
        }
        break;

      case 'betrayed_by_ally':
        effects.push('Reduced trust in team members');
        effects.push('Increased tendency to act independently');
        effects.push('Difficulty accepting help from others');
        break;

      case 'failed_team':
        effects.push('Increased anxiety about following orders');
        effects.push('Self-doubt regarding strategic decisions');
        effects.push('Tendency to second-guess leadership');
        break;

      case 'overwhelming_fear':
        effects.push('Panic responses in similar threatening situations');
        effects.push('Reduced combat effectiveness under pressure');
        if (trauma.severity === 'severe') {
          effects.push('Possible withdrawal from dangerous missions');
        }
        break;
    }

    return effects;
  }
  private static generateTraumaTreatmentOptions(trauma: TraumaEvent, char: BattleCharacter): string[] {
    const treatments: string[] = [];

    // Universal treatments
    treatments.push('Individual counseling sessions');
    treatments.push('Gradual exposure therapy in safe environments');

    switch (trauma.type) {
      case 'witnessed_violence':
        treatments.push('Desensitization training with simulated combat');
        treatments.push('Mindfulness and grounding techniques');
        treatments.push('Peer support groups with other survivors');
        break;

      case 'betrayed_by_ally':
        treatments.push('Trust-building exercises with reliable teammates');
        treatments.push('Mediated discussions with involved parties');
        treatments.push('Team integration activities');
        break;

      case 'failed_team':
        treatments.push('Command structure education and clarification');
        treatments.push('Practice missions with clear success criteria');
        treatments.push('Leadership communication training');
        break;

      case 'overwhelming_fear':
        treatments.push('Anxiety management and breathing techniques');
        treatments.push('Progressive combat simulation training');
        treatments.push('Confidence-building through achievable goals');
        break;
    }

    if (trauma.severity === 'severe') {
      treatments.push('Temporary duty modification or leave');
      treatments.push('Intensive therapy program');
    }

    return treatments;
  }
  private static generateGrowthEffects(growth: GrowthMoment[], char: BattleCharacter): string[] {
    const effects: string[] = [];

    growth.forEach(moment => {
      switch (moment.type) {
        case 'overcame_fear':
          effects.push('Increased confidence in challenging situations');
          effects.push('Better stress management under pressure');
          break;

        case 'showed_leadership':
          effects.push('Enhanced natural leadership abilities');
          effects.push('Improved team coordination skills');
          effects.push('Increased respect from teammates');
          break;

        case 'learned_teamwork':
          effects.push('Better cooperation with team members');
          effects.push('Improved communication during missions');
          effects.push('Enhanced group tactical awareness');
          break;

        case 'developed_skill':
          effects.push('Improved combat technique and accuracy');
          effects.push('Enhanced tactical decision-making');
          break;
      }
    });

    return [...new Set(effects)]; // Remove duplicates
  }
  private static generateGrowthContinuationOptions(growth: GrowthMoment[], char: BattleCharacter): string[] {
    const options: string[] = [];

    growth.forEach(moment => {
      switch (moment.type) {
        case 'overcame_fear':
          options.push('Progressive challenge training to build on courage');
          options.push('Leadership opportunities in low-risk scenarios');
          break;

        case 'showed_leadership':
          options.push('Advanced leadership and tactics training');
          options.push('Mentoring role for newer team members');
          options.push('Command simulation exercises');
          break;

        case 'learned_teamwork':
          options.push('Team captain training and responsibilities');
          options.push('Cross-training with different team combinations');
          break;

        case 'developed_skill':
          options.push('Advanced combat technique refinement');
          options.push('Specialized weapon or ability training');
          options.push('Teaching role to help others improve');
          break;
      }
    });

    return [...new Set(options)]; // Remove duplicates
  }
  private static assessBondingExperiences(char: BattleCharacter, memory: BattleMemory): PsychologicalConsequence | null {
    const bondingMoments = memory.relationship_moments.filter(
      rm => rm.event_type === 'saved_life' || rm.event_type === 'supported' || rm.event_type === 'bonded'
    );

    if (bondingMoments.length < 2) return null;

    const totalBondingStrength = bondingMoments.reduce((sum, moment) => sum + moment.strength_change, 0);

    if (totalBondingStrength > 30) {
      return {
        character_id: char.character.id,
        type: 'growth',
        severity: 'moderate',
        description: `${char.character.name} formed strong bonds with teammates`,
        long_term_effects: [
          'Increased team loyalty and cooperation',
          'Better stress management through social support',
          'Enhanced motivation in group missions'
        ],
        recovery_time: 0,
        treatment_options: [
          'Continue team-building exercises',
          'Assign to missions with bonded teammates',
          'Use as mentor for newer team members'
        ]
      };
    }

    return null;
  }
  private static assessResentmentBuildup(char: BattleCharacter, memory: BattleMemory): PsychologicalConsequence | null {
    const negativeEvents = memory.relationship_moments.filter(
      rm => rm.event_type === 'abandoned' || rm.event_type === 'conflicted'
    );

    if (negativeEvents.length === 0) return null;

    const resentmentLevel = negativeEvents.reduce((sum, event) => sum + Math.abs(event.strength_change), 0);

    if (resentmentLevel > 25) {
      return {
        character_id: char.character.id,
        type: 'trauma',
        severity: resentmentLevel > 50 ? 'significant' : 'moderate',
        description: `${char.character.name} harbors resentment toward teammates`,
        long_term_effects: [
          'Reduced cooperation with specific team members',
          'Increased likelihood of strategy deviation',
          'Potential for open conflict during missions'
        ],
        recovery_time: Math.floor(resentmentLevel / 10),
        treatment_options: [
          'Mediated conflict resolution sessions',
          'Individual counseling to address grievances',
          'Temporary separation from conflicted teammates',
          'Team-building exercises focused on trust'
        ]
      };
    }

    return null;
  }
  private static assessInspirationalMoments(char: BattleCharacter, memory: BattleMemory): PsychologicalConsequence | null {
    const heroicEvents = memory.notable_events.filter(e => e.type === 'heroic_action');
    const growthMoments = memory.personal_growth.filter(g => g.type === 'showed_leadership' || g.type === 'overcame_fear');

    if (heroicEvents.length === 0 && growthMoments.length === 0) return null;

    if (heroicEvents.length > 0 || growthMoments.length > 1) {
      return {
        character_id: char.character.id,
        type: 'growth',
        severity: 'moderate',
        description: `${char.character.name} experienced inspiring moments of personal triumph`,
        long_term_effects: [
          'Increased self-confidence and leadership potential',
          'Enhanced resilience in future challenging situations',
          'Positive influence on team morale and inspiration'
        ],
        recovery_time: 0,
        treatment_options: [
          'Leadership development training',
          'Assign mentor role for struggling teammates',
          'Advanced tactical training to build on strengths',
          'Public recognition to reinforce positive behavior'
        ]
      };
    }

    return null;
  }
  private static identifyEmergingDynamics(battle_state: BattleState, changes: RelationshipChange[]): string[] {
    const dynamics: string[] = [];

    // Analyze overall relationship trends
    const strongBonds = changes.filter(change => change.new_relationship_strength > 60).length;
    const conflicts = changes.filter(change => change.new_relationship_strength < -30).length;
    const newAlliances = changes.filter(change =>
      change.old_relationship_strength < 20 && change.new_relationship_strength > 40
    ).length;

    if (strongBonds > 2) {
      dynamics.push('Team is forming tight-knit battle partnerships');
    }

    if (conflicts > 1) {
      dynamics.push('Multiple interpersonal conflicts threaten team cohesion');
    }

    if (newAlliances > 0) {
      dynamics.push('New friendships and alliances are forming through shared combat');
    }

    // Check for leadership emergence
    const highPerformers = battle_state.teams.player.characters.filter(char =>
      char.battle_performance.teamplay_actions > 4 && char.battle_performance.strategy_deviations < 2
    );

    if (highPerformers.length > 0) {
      dynamics.push('Natural leaders are emerging within the team structure');
    }

    // Check for team splitting
    const isolatedCharacters = battle_state.teams.player.characters.filter(char =>
      char.battle_performance.teamplay_actions === 0
    );

    if (isolatedCharacters.length > 1) {
      dynamics.push('Some members are becoming isolated from the group');
    }

    return dynamics;
  }
  private static determineCultureShift(oldChemistry: number, new_chemistry: number, changes: RelationshipChange[]): string { return 'No significant culture change'; }
  private static calculateConflictResolution(battle_state: BattleState): number { return 50; }
  private static calculateAdaptability(battle_state: BattleState): number { return 50; }

  // ============= COMBAT EXPERIENCE PSYCHSTATS PROGRESSION =============

  /**
   * Apply psych_stats improvements based on combat experience and battle performance
   * This connects battle outcomes to character psychological development
   */
  static applyCombatExperienceGains(
    battle_state: BattleState,
    evaluations: CharacterEvaluation[],
    consequences: PsychologicalConsequence[]
  ): void {
    evaluations.forEach(evaluation => {
      const character = battle_state.teams.player.characters.find(c => c.character.id === evaluation.character_id);
      if (!character) return;

      // Calculate psych_stats improvements based on battle performance
      let trainingImprovement = 0;
      let team_playerImprovement = 0;
      let ego_change = 0;
      let mental_healthChange = 0;
      let communicationImprovement = 0;

      // Performance-based improvements
      if (evaluation.battle_rating > 70) {
        // Good performance builds confidence and competence
        trainingImprovement += 1.5;
        mental_healthChange += 2;
        ego_change += 1;
        console.log(`${character.character.name}: Excellent performance (+training, +mental health, +ego)`);
      }

      if (evaluation.teamplay_score > 70) {
        // Good teamwork improves team_player and communication
        team_playerImprovement += 2;
        communicationImprovement += 1.5;
        console.log(`${character.character.name}: Great teamwork (+team_player, +communication)`);
      }

      // Victory/defeat effects
      const won = battle_state.result?.winner === 'player';
      if (won) {
        // Victory improves mental health and confidence
        mental_healthChange += 1;
        ego_change += 0.5;
      } else {
        // Defeat teaches humility but can harm mental health
        ego_change -= 1;
        mental_healthChange -= 0.5;
        trainingImprovement += 0.5; // Learn from mistakes
      }

      // Psychological consequence effects
      consequences.forEach(consequence => {
        if (consequence.character_id === evaluation.character_id) {
          switch (consequence.type) {
            case 'growth':
              trainingImprovement += 2;
              mental_healthChange += 3;
              communicationImprovement += 1;
              console.log(`${character.character.name}: Personal growth (+training, +mental health, +communication)`);
              break;
            case 'trauma':
              mental_healthChange -= 3;
              ego_change -= 1;
              console.log(`${character.character.name}: Trauma experienced (-mental health, -ego)`);
              break;
            case 'inspiration':
              ego_change += 2;
              communicationImprovement += 2;
              console.log(`${character.character.name}: Inspired (+ego, +communication)`);
              break;
          }
        }
      });

      // Apply improvements (using same system as training)
      this.updateCharacterPsychStatsFromCombat(
        evaluation.character_id,
        {
          training: trainingImprovement,
          team_player: team_playerImprovement,
          ego: ego_change,
          mental_health: mental_healthChange,
          communication: communicationImprovement
        }
      );
    });
  }

  /**
   * Update character psych_stats based on combat experience
   * Similar to training system but for battle-based improvements
   */
  private static updateCharacterPsychStatsFromCombat(
    character_id: string,
    improvements: {
      training: number;
      team_player: number;
      ego: number;
      mental_health: number;
      communication: number;
    }
  ): void {
    // Only update if localStorage is available (browser environment)
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log(`Combat experience skipped (SSR): ${character_id} improvements`);
      return;
    }

    const templateId = character_id.split('_')[0]; // Remove instance suffix

    Object.entries(improvements).forEach(([statType, change]) => {
      if (Math.abs(change) > 0.1) { // Only apply meaningful changes
        const improvementKey = `${templateId}_${statType}_improvement`;
        const currentImprovement = parseFloat(localStorage.getItem(improvementKey) || '0');
        const newImprovement = Math.max(-20, Math.min(30, currentImprovement + change)); // Cap between -20 and +30

        localStorage.setItem(improvementKey, newImprovement.toString());

        const changeStr = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
        console.log(`Combat experience: ${character_id}'s ${statType} ${changeStr} (total: ${newImprovement.toFixed(1)})`);
      }
    });
  }
}

export default PostBattleAnalysisSystem;