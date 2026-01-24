// Coaching System - Mid-Battle Psychology Management
// This is where players actually manage their team's mental state during combat

import {
  BattleState,
  CoachingTimeout,
  TimeoutAction,
  BattleCharacter,
  TimeoutCharacterState,
  UrgentIssue,
  CoachingData
} from '../data/battleFlow';

export interface CoachingInteraction {
  character_id: string;
  approach: 'supportive' | 'firm' | 'tactical' | 'empathetic';
  message: string;
  effects: CoachingResult;
}

export interface CoachingResult {
  mental_healthChange: number;
  gameplan_adherenceChange: number;
  stress_change: number;
  confidence_change: number;
  team_trustChange: number;
  relationship_effects: Record<string, number>;
  success: boolean;
  character_reaction: string;
  team_reaction: string;
}

export class CoachingSystem {

  // ============= COACHING TIMEOUT MECHANICS =============

  static processCoachingTimeout(
    battle_state: BattleState,
    selected_actions: TimeoutAction[]
  ): CoachingTimeout {
    const timeout = this.initializeTimeout(battle_state);
    let timeRemaining = timeout.time_limit;

    // Process each selected action
    for (const action of selected_actions) {
      if (timeRemaining <= 0) break;

      const result = this.executeTimeoutAction(action, battle_state);
      this.applyTimeoutResults(result, battle_state);

      timeRemaining -= action.time_consumed;

      // Update coaching effectiveness based on results
      this.updateCoachingReputation(result, battle_state.coaching_data);
    }

    // Final assessment after timeout
    timeout.character_states = this.reassessCharacterStates(battle_state);
    timeout.urgent_issues = this.identifyRemainingIssues(battle_state);

    return timeout;
  }

  static executeTimeoutAction(action: TimeoutAction, battle_state: BattleState): CoachingResult[] {
    const results: CoachingResult[] = [];

    switch (action.type) {
      case 'individual_coaching':
        results.push(...this.conductIndividualCoaching(action, battle_state));
        break;

      case 'team_rallying':
        results.push(...this.conductTeamRallying(action, battle_state));
        break;

      case 'conflict_mediation':
        results.push(...this.conductConflictMediation(action, battle_state));
        break;

      case 'strategic_pivot':
        results.push(...this.conductStrategicPivot(action, battle_state));
        break;
    }

    return results;
  }

  // ============= INDIVIDUAL COACHING =============

  static conductIndividualCoaching(
    action: TimeoutAction,
    battle_state: BattleState
  ): CoachingResult[] {
    const results: CoachingResult[] = [];

    for (const character_id of action.target_characters) {
      const character = this.findCharacter(battle_state, character_id);
      if (!character) continue;

      const coachingApproach = this.determineOptimalApproach(character);
      const interaction = this.createCoachingInteraction(character, coachingApproach, action);

      const result = this.processIndividualInteraction(interaction, character, battle_state);
      results.push(result);

      // Apply character-specific coaching
      this.applyPersonalizedCoaching(character, result);
    }

    return results;
  }

  static determineOptimalApproach(character: BattleCharacter): 'supportive' | 'firm' | 'tactical' | 'empathetic' {
    const traits = character.character.personality_traits || [];
    const mental_state = character.mental_state;

    // Analyze character traits to determine best approach
    if (traits.includes('Prideful') || traits.includes('Defiant')) {
      return mental_state.stress > 70 ? 'empathetic' : 'tactical';
    }

    if (traits.includes('Loyal') || traits.includes('Honorable')) {
      return mental_state.confidence < 40 ? 'supportive' : 'firm';
    }

    if (traits.includes('Emotional') || traits.includes('Sensitive')) {
      return 'empathetic';
    }

    if (traits.includes('Logical') || traits.includes('Strategic')) {
      return 'tactical';
    }

    // Default based on mental state
    if (mental_state.stress > 60) return 'empathetic';
    if (mental_state.confidence < 50) return 'supportive';
    if (character.gameplan_adherence < 60) return 'firm';

    return 'tactical';
  }

  static createCoachingInteraction(
    character: BattleCharacter,
    approach: string,
    action: TimeoutAction
  ): CoachingInteraction {
    const messages = this.generateCoachingMessages(character, approach);
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)];

    return {
      character_id: character.character.id,
      approach: approach as 'supportive' | 'firm' | 'tactical' | 'empathetic',
      message: selectedMessage,
      effects: {
        mental_healthChange: 0,
        gameplan_adherenceChange: 0,
        stress_change: 0,
        confidence_change: 0,
        team_trustChange: 0,
        relationship_effects: {},
        success: false,
        character_reaction: '',
        team_reaction: ''
      }
    };
  }

  static generateCoachingMessages(character: BattleCharacter, approach: string): string[] {
    const name = character.character.name;

    switch (approach) {
      case 'supportive':
        return [
          `${name}, I believe in you. You've got this.`,
          `${name}, remember why you're fighting. Your team needs you.`,
          `${name}, you're stronger than you think. Trust yourself.`,
          `${name}, we're all here for you. You're not alone in this.`
        ];

      case 'firm':
        return [
          `${name}, I need you to focus. The team is counting on you.`,
          `${name}, this is what we trained for. Execute the plan.`,
          `${name}, put aside your doubts and do your job.`,
          `${name}, the mission comes first. Stay disciplined.`
        ];

      case 'tactical':
        return [
          `${name}, here's the situation and what we need from you...`,
          `${name}, analyze their weaknesses and exploit them.`,
          `${name}, adapt your strategy to their movements.`,
          `${name}, think three moves ahead. What's your counter?`
        ];

      case 'empathetic':
        return [
          `${name}, I can see you're struggling. Let's work through this.`,
          `${name}, it's okay to feel overwhelmed. What do you need?`,
          `${name}, your feelings are valid. How can I help?`,
          `${name}, take a breath. We'll figure this out together.`
        ];

      default:
        return [`${name}, stay focused and do your best.`];
    }
  }

  static processIndividualInteraction(
    interaction: CoachingInteraction,
    character: BattleCharacter,
    battle_state: BattleState
  ): CoachingResult {
    const coaching_effectiveness = battle_state.coaching_data.coaching_effectiveness;
    const team_respect = battle_state.coaching_data.team_respect;
    const characterTrust = character.mental_state.team_trust;

    // Calculate base effectiveness
    let effectiveness = (coaching_effectiveness + team_respect + characterTrust) / 3;

    // Modify based on approach and character personality
    effectiveness *= this.getApproachEffectiveness(interaction.approach, character);

    // Modify based on character's current state
    effectiveness *= this.getStateEffectiveness(character);

    // Generate results based on effectiveness
    const result: CoachingResult = {
      mental_healthChange: 0,
      gameplan_adherenceChange: 0,
      stress_change: 0,
      confidence_change: 0,
      team_trustChange: 0,
      relationship_effects: {},
      success: effectiveness > 60,
      character_reaction: '',
      team_reaction: ''
    };

    if (result.success) {
      // Positive coaching outcome
      result.mental_healthChange = Math.floor(effectiveness * 0.3);
      result.stress_change = -Math.floor(effectiveness * 0.4);
      result.confidence_change = Math.floor(effectiveness * 0.25);
      result.gameplan_adherenceChange = Math.floor(effectiveness * 0.2);
      result.team_trustChange = Math.floor(effectiveness * 0.15);

      result.character_reaction = this.generatePositiveReaction(character, interaction.approach);
    } else {
      // Coaching backfired
      result.mental_healthChange = -Math.floor((100 - effectiveness) * 0.1);
      result.stress_change = Math.floor((100 - effectiveness) * 0.2);
      result.team_trustChange = -Math.floor((100 - effectiveness) * 0.1);

      result.character_reaction = this.generateNegativeReaction(character, interaction.approach);
    }

    result.team_reaction = this.generateTeamReaction(result.success, character, battle_state);

    return result;
  }

  // ============= TEAM RALLYING =============

  static conductTeamRallying(action: TimeoutAction, battle_state: BattleState): CoachingResult[] {
    const team_morale = battle_state.teams.player.current_morale;
    const team_chemistry = battle_state.teams.player.team_chemistry;

    // Assess team receptiveness to rallying
    const receptiveness = (team_morale + team_chemistry + battle_state.coaching_data.team_respect) / 3;

    const results: CoachingResult[] = [];

    // Apply team-wide effects
    for (const character of battle_state.teams.player.characters) {
      if (character.current_health <= 0) continue; // Skip defeated characters

      const individualResult = this.applyTeamRallying(character, receptiveness, action);
      results.push(individualResult);
    }

    // Update team-level stats
    this.updateTeamMorale(battle_state, receptiveness > 60 ? 15 : -10);

    return results;
  }

  static applyTeamRallying(
    character: BattleCharacter,
    receptiveness: number,
    action: TimeoutAction
  ): CoachingResult {
    const personalityModifier = this.getRallyingPersonalityModifier(character);
    const finalEffectiveness = receptiveness * personalityModifier;

    const result: CoachingResult = {
      mental_healthChange: 0,
      gameplan_adherenceChange: 0,
      stress_change: 0,
      confidence_change: 0,
      team_trustChange: 0,
      relationship_effects: {},
      success: finalEffectiveness > 50,
      character_reaction: '',
      team_reaction: ''
    };

    if (result.success) {
      result.confidence_change = Math.floor(finalEffectiveness * 0.2);
      result.team_trustChange = Math.floor(finalEffectiveness * 0.15);
      result.stress_change = -Math.floor(finalEffectiveness * 0.1);

      result.character_reaction = this.generateRallyingReaction(character, true);
    } else {
      result.confidence_change = -5;
      result.team_trustChange = -5;

      result.character_reaction = this.generateRallyingReaction(character, false);
    }

    return result;
  }

  // ============= CONFLICT MEDIATION =============

  static conductConflictMediation(action: TimeoutAction, battle_state: BattleState): CoachingResult[] {
    // Identify conflicting characters
    const conflicts = this.identifyActiveConflicts(battle_state);
    const results: CoachingResult[] = [];

    for (const conflict of conflicts) {
      const char1 = this.findCharacter(battle_state, conflict.character1);
      const char2 = this.findCharacter(battle_state, conflict.character2);

      if (!char1 || !char2) continue;

      const conflictData = {
        type: 'interpersonal',
        severity: conflict.severity > 70 ? 'high' : conflict.severity > 40 ? 'medium' : 'low',
        description: `Conflict between ${char1.character.name} and ${char2.character.name}`
      };

      const mediationResult = this.mediateConflict(char1, char2, conflictData, battle_state);
      results.push(...mediationResult);

      // Update relationship between characters
      this.updateRelationship(char1, char2, mediationResult[0].success ? 10 : -5);
    }

    return results;
  }

  static identifyActiveConflicts(battle_state: BattleState): Array<{ character1: string, character2: string, severity: number }> {
    const conflicts = [];
    const characters = battle_state.teams.player.characters;

    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const char1 = characters[i];
        const char2 = characters[j];

        const relationship = char1.relationship_modifiers.find(
          rel => rel.with_character === char2.character.name.toLowerCase().replace(/\s+/g, '_')
        );

        if (relationship && relationship.strength < -30) {
          conflicts.push({
            character1: char1.character.id,
            character2: char2.character.id,
            severity: Math.abs(relationship.strength)
          });
        }
      }
    }

    return conflicts.sort((a, b) => b.severity - a.severity);
  }

  // ============= STRATEGIC PIVOT =============

  static conductStrategicPivot(action: TimeoutAction, battle_state: BattleState): CoachingResult[] {
    // Analyze current battle situation
    const battleAnalysis = this.analyzeBattleSituation(battle_state);

    // Generate new strategy
    const newStrategy = this.generateAdaptiveStrategy(battleAnalysis, battle_state);

    // Communicate strategy to team
    const results = this.communicateStrategy(newStrategy, battle_state);

    // Update team tactical understanding
    this.updateTacticalKnowledge(battle_state, newStrategy);

    return results;
  }

  // ============= UTILITY METHODS =============

  static findCharacter(battle_state: BattleState, character_id: string): BattleCharacter | null {
    return battle_state.teams.player.characters.find(char => char.character.id === character_id) || null;
  }

  static getApproachEffectiveness(approach: string, character: BattleCharacter): number {
    const traits = character.character.personality_traits || [];

    switch (approach) {
      case 'supportive':
        if (traits.includes('Insecure') || traits.includes('Emotional')) return 1.3;
        if (traits.includes('Proud') || traits.includes('Independent')) return 0.7;
        return 1.0;

      case 'firm':
        if (traits.includes('Disciplined') || traits.includes('Military')) return 1.3;
        if (traits.includes('Rebellious') || traits.includes('Free-spirited')) return 0.6;
        return 1.0;

      case 'tactical':
        if (traits.includes('Strategic') || traits.includes('Intelligent')) return 1.4;
        if (traits.includes('Emotional') || traits.includes('Impulsive')) return 0.8;
        return 1.0;

      case 'empathetic':
        if (traits.includes('Traumatized') || traits.includes('Sensitive')) return 1.5;
        if (traits.includes('Stoic') || traits.includes('Unemotional')) return 0.7;
        return 1.0;

      default:
        return 1.0;
    }
  }

  static getStateEffectiveness(character: BattleCharacter): number {
    let multiplier = 1.0;

    // High stress makes coaching harder
    if (character.mental_state.stress > 70) multiplier *= 0.7;
    else if (character.mental_state.stress > 50) multiplier *= 0.85;

    // Low trust makes coaching less effective
    if (character.mental_state.team_trust < 30) multiplier *= 0.6;
    else if (character.mental_state.team_trust < 50) multiplier *= 0.8;

    // Low mental health reduces receptiveness
    if (character.mental_state.current_mental_health < 30) multiplier *= 0.5;
    else if (character.mental_state.current_mental_health < 50) multiplier *= 0.75;

    return multiplier;
  }

  static generatePositiveReaction(character: BattleCharacter, approach: string): string {
    const name = character.character.name;
    const reactions = {
      supportive: [
        `${name} nods with renewed determination.`,
        `${name} takes a deep breath and seems more focused.`,
        `${name} smiles slightly, confidence returning.`
      ],
      firm: [
        `${name} straightens up and acknowledges the command.`,
        `${name} nods curtly, discipline restored.`,
        `${name} refocuses with military precision.`
      ],
      tactical: [
        `${name} analyzes the information and nods in understanding.`,
        `${name} adjusts their stance, strategy clear.`,
        `${name} calculates possibilities, mind sharpened.`
      ],
      empathetic: [
        `${name} visibly relaxes, stress melting away.`,
        `${name} seems grateful for the understanding.`,
        `${name} takes comfort in the compassionate words.`
      ]
    };

    const reactionList = reactions[approach as keyof typeof reactions] || [`${name} responds positively.`];
    return reactionList[Math.floor(Math.random() * reactionList.length)];
  }

  static generateNegativeReaction(character: BattleCharacter, approach: string): string {
    const name = character.character.name;
    return `${name} seems resistant to the coaching approach and becomes more withdrawn.`;
  }

  static generateTeamReaction(success: boolean, character: BattleCharacter, battle_state: BattleState): string {
    if (success) {
      return `The team watches as ${character.character.name} responds well to coaching, boosting overall morale.`;
    } else {
      return `The team notices the failed coaching attempt, creating some tension.`;
    }
  }

  static applyTimeoutResults(results: CoachingResult[], battle_state: BattleState): void {
    for (const result of results) {
      const character = this.findCharacter(battle_state, result.character_reaction.split(' ')[0]);
      if (!character) continue;

      // Apply mental state changes
      character.mental_state.current_mental_health = Math.max(0, Math.min(100,
        character.mental_state.current_mental_health + result.mental_healthChange
      ));

      character.mental_state.stress = Math.max(0, Math.min(100,
        character.mental_state.stress + result.stress_change
      ));

      character.mental_state.confidence = Math.max(0, Math.min(100,
        character.mental_state.confidence + result.confidence_change
      ));

      character.mental_state.team_trust = Math.max(0, Math.min(100,
        character.mental_state.team_trust + result.team_trustChange
      ));

      character.gameplan_adherence = Math.max(0, Math.min(100,
        character.gameplan_adherence + result.gameplan_adherenceChange
      ));
    }
  }

  static updateCoachingReputation(results: CoachingResult[], coaching_data: CoachingData): void {
    const success_rate = results.filter(r => r.success).length / results.length;

    if (success_rate > 0.7) {
      coaching_data.coaching_effectiveness = Math.min(100, coaching_data.coaching_effectiveness + 2);
      coaching_data.team_respect = Math.min(100, coaching_data.team_respect + 3);
    } else if (success_rate < 0.3) {
      coaching_data.coaching_effectiveness = Math.max(0, coaching_data.coaching_effectiveness - 3);
      coaching_data.team_respect = Math.max(0, coaching_data.team_respect - 5);
    }
  }

  // Additional methods would be implemented for full functionality...
  private static initializeTimeout(battle_state: BattleState): CoachingTimeout {
    return {
      trigger_condition: {
        type: 'player_requested',
        severity: 'moderate',
        description: 'Coach called timeout',
        time_remaining: 90
      },
      available_actions: [],
      time_limit: 90,
      character_states: [],
      urgent_issues: [],
      strategic_options: []
    };
  }

  private static reassessCharacterStates(battle_state: BattleState): TimeoutCharacterState[] {
    return [];
  }

  private static identifyRemainingIssues(battle_state: BattleState): UrgentIssue[] {
    return [];
  }

  private static applyPersonalizedCoaching(character: BattleCharacter, result: CoachingResult): void {
    // Apply coaching results to character
  }

  private static getRallyingPersonalityModifier(character: BattleCharacter): number {
    return 1.0;
  }

  private static generateRallyingReaction(character: BattleCharacter, success: boolean): string {
    return success ? `${character.character.name} is inspired!` : `${character.character.name} seems unmoved.`;
  }

  private static updateTeamMorale(battle_state: BattleState, change: number): void {
    battle_state.teams.player.current_morale = Math.max(0, Math.min(100,
      battle_state.teams.player.current_morale + change
    ));
  }

  private static mediateConflict(char1: BattleCharacter, char2: BattleCharacter, conflict: { type: string; severity: string; description: string }, battle_state: BattleState): CoachingResult[] {
    return [];
  }

  private static updateRelationship(char1: BattleCharacter, char2: BattleCharacter, change: number): void {
    // Update relationship strength
  }

  private static analyzeBattleSituation(battle_state: BattleState): {
    team_morale: number;
    average_health: number;
    strategic_position: string;
    emerging_patterns: string[];
    key_threats: string[];
    opportunities: string[];
  } {
    // Calculate actual average health percentage from team characters
    const playerChars = battle_state.teams.player.characters;
    const average_health = playerChars.length > 0
      ? Math.round(playerChars.reduce((sum, c) => {
          const maxHp = c.character.max_health || 100;
          const currentHp = c.current_health || 0;
          return sum + (currentHp / maxHp) * 100;
        }, 0) / playerChars.length)
      : 100;

    return {
      team_morale: battle_state.teams.player.current_morale,
      average_health,
      strategic_position: 'neutral',
      emerging_patterns: [],
      key_threats: [],
      opportunities: []
    };
  }

  private static generateAdaptiveStrategy(analysis: { team_morale: number; average_health: number; strategic_position: string; emerging_patterns: string[]; key_threats: string[]; opportunities: string[] }, battle_state: BattleState): {
    type: string;
    description: string;
    character_assignments: Record<string, string>;
    expected_outcome: string;
    risk_level: string;
  } {
    return {
      type: 'balanced',
      description: 'Maintain current formation',
      character_assignments: {},
      expected_outcome: 'stable',
      risk_level: 'low'
    };
  }

  private static communicateStrategy(strategy: { type: string; description: string; character_assignments: Record<string, string>; expected_outcome: string; risk_level: string }, battle_state: BattleState): CoachingResult[] {
    return [];
  }

  private static updateTacticalKnowledge(battle_state: BattleState, strategy: { type: string; description: string; character_assignments: Record<string, string> }): void {
    // Update team's tactical understanding
  }
}

export default CoachingSystem;