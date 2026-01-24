// Coaching System - The heart of character psychology management
// This system handles all coach-character interactions and mental health management

import { TeamCharacter, Team, checkObedience } from './teamBattleSystem';

type TherapyFocus = 'trauma' | 'anger' | 'depression' | 'anxiety' | 'ego' | 'relationships';

export interface CoachingSession {
  id: string;
  character_id: string;
  coach_name: string;
  session_type: 'individual' | 'team' | 'therapy' | 'strategy' | 'motivational';
  start_time: Date;
  duration: number; // minutes
  topics: string[];
  character_mood: 'receptive' | 'resistant' | 'neutral' | 'desperate';
  outcome: CoachingOutcome;
}

export interface CoachingOutcome {
  mental_healthChange: number;
  training_change: number;
  team_playerChange: number;
  ego_change: number;
  communication_change: number;
  character_response: string;
  coach_notes: string;
  relationship_change: number; // How much the character trusts/likes the coach
  financial_trust_change?: number; // How much the character trusts coach's financial advice
}

export interface TherapySessionResult {
  id: string;
  character_id: string;
  therapist_name: string;
  session_number: number;
  focusArea: 'trauma' | 'anger' | 'depression' | 'anxiety' | 'ego' | 'relationships';
  breakthrough: boolean;
  mental_healthGain: number;
  character_insights: string[];
  next_session_recommendation: string;
  // Additional properties
  rounds?: any;
}

export interface TeamBuildingActivity {
  id: string;
  activityType: 'dinner' | 'retreat' | 'training' | 'game_night' | 'group_therapy';
  participants: string[]; // character IDs
  duration: number; // hours
  cost: number; // in-game currency
  team_chemistryGain: number;
  individual_effects: { character_id: string; effect: string; stat_change: number }[];
  conflicts: { character1: string; character2: string; description: string }[];
  bonds: { character1: string; character2: string; description: string }[];
}

export class CoachingEngine {
  
  // One-on-one coaching session
  // COACHING POINTS SYSTEM:
  // - Each coaching session costs 1 point
  // - Teams start with 3 points (distribute among 3 characters)
  // - Win: Reset to 3 points | Loss progression: 3→2→1→0, reset to 3 on any win
  // - Strategic decisions: spread coaching or focus on key characters
  static conductIndividualCoaching(
    character: TeamCharacter,
    team: Team,
    focus: 'performance' | 'mental_health' | 'team_relations' | 'strategy' | 'financial_management',
    coaching_skill: number = 75 // Coach's skill level
  ): CoachingSession {
    const coachingCost = 1; // Each coaching session costs 1 point

    if (team.coaching_points < coachingCost) {
      return {
        id: `coaching_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        character_id: character.id,
        coach_name: team.coach_name,
        session_type: 'individual',
        start_time: new Date(),
        duration: 0,
        topics: [focus],
        character_mood: 'neutral',
        outcome: {
          mental_healthChange: 0,
          training_change: 0,
          team_playerChange: 0,
          ego_change: 0,
          communication_change: 0,
          character_response: "I'm ready for my coaching, coach.",
          coach_notes: "Not enough coaching points to conduct the session.",
          relationship_change: 0,
        },
      };
    }

    // Deduct points
    team.coaching_points -= coachingCost;
    
    const character_mood = this.determineCharacterMood(character);
    const sessionEffectiveness = this.calculateSessionEffectiveness(character, character_mood, coaching_skill);
    
    let outcome: CoachingOutcome;
    
    switch (focus) {
      case 'performance':
        outcome = this.handlePerformanceCoaching(character, sessionEffectiveness, character_mood);
        break;
      case 'mental_health':
        outcome = this.handleMentalHealthCoaching(character, sessionEffectiveness, character_mood);
        break;
      case 'team_relations':
        outcome = this.handleTeamRelationsCoaching(character, sessionEffectiveness, character_mood);
        break;
      case 'strategy':
        outcome = this.handleStrategyCoaching(character, sessionEffectiveness, character_mood);
        break;
      case 'financial_management':
        outcome = this.handleFinancialCoaching(character, sessionEffectiveness, character_mood);
        break;
      default:
        outcome = this.handleGeneralCoaching(character, sessionEffectiveness, character_mood);
    }
    
    return {
      id: `coaching_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      character_id: character.id,
      coach_name: team.coach_name,
      session_type: 'individual',
      start_time: new Date(),
      duration: 30,
      topics: [focus],
      character_mood,
      outcome
    };
  }
  
  // Group therapy session
  static async conductGroupTherapy(
    characters: TeamCharacter[],
    therapist_name: string = 'Dr. Mindwell'
  ): Promise<{ sessions: TherapySessionResult[]; team_chemistryChange: number }> {
    const { characterAPI } = await import('../services/apiClient');

    const character_ids = characters.map(c => c.id);
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/therapy/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ character_ids, therapist_name })
    });

    const data = await response.json();
    return {
      sessions: data.sessions,
      team_chemistryChange: data.team_chemistryChange
    };
  }
  
  // Individual therapy session
  static async conductTherapySession(
    character: TeamCharacter,
    therapist_name: string = 'Dr. Mindwell'
  ): Promise<TherapySessionResult> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/therapy/individual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ character_id: character.id, therapist_name })
    });

    const session = await response.json();
    return session;
  }
  
  // Team building activities
  static planTeamBuildingActivity(
    team: Team,
    activityType: TeamBuildingActivity['activityType'],
    budget: number
  ): TeamBuildingActivity {
    
    const activityCosts = {
      dinner: 100,
      retreat: 500,
      training: 200,
      game_night: 50,
      group_therapy: 300
    };
    
    const cost = activityCosts[activityType];
    
    if (budget < cost) {
      throw new Error(`Insufficient funds. Need ${cost}, have ${budget}`);
    }
    
    const baseChemistryGain = {
      dinner: 8,
      retreat: 20,
      training: 5,
      game_night: 12,
      group_therapy: 15
    }[activityType];
    
    // Calculate individual effects based on character personalities
    const individualEffects = team.characters.map(char => ({
      character_id: char.id,
      effect: this.getActivityEffect(char, activityType),
      stat_change: this.getActivityStatChange(char, activityType)
    }));
    
    // Determine potential conflicts and bonds
    const { conflicts, bonds } = this.calculateActivityDynamics(team.characters, activityType);
    
    return {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      activityType,
      participants: team.characters.map(c => c.id),
      duration: this.getActivityDuration(activityType),
      cost,
      team_chemistryGain: baseChemistryGain,
      individual_effects: individualEffects,
      conflicts,
      bonds
    };
  }
  
  // Helper methods
  private static determineCharacterMood(character: TeamCharacter): CoachingSession['character_mood'] {
    const mental_health = character.psych_stats.mental_health;
    const ego = character.psych_stats.ego;
    const training = character.psych_stats.training;
    
    if (mental_health < 25) return 'desperate';
    if (ego > 80 && training < 50) return 'resistant';
    if (mental_health > 70 && training > 70) return 'receptive';
    return 'neutral';
  }
  
  private static calculateSessionEffectiveness(
    character: TeamCharacter,
    mood: CoachingSession['character_mood'],
    coach_skill: number
  ): number {
    let effectiveness = coach_skill;
    
    // Mood modifiers
    switch (mood) {
      case 'receptive': effectiveness += 20; break;
      case 'resistant': effectiveness -= 30; break;
      case 'desperate': effectiveness += 10; break;
      case 'neutral': break;
    }
    
    // Character trait modifiers
    if (character.psych_stats.ego > 90) effectiveness -= 15;
    if (character.psych_stats.communication < 40) effectiveness -= 10;
    
    return Math.max(0, Math.min(100, effectiveness));
  }
  
  private static handlePerformanceCoaching(
    character: TeamCharacter,
    effectiveness: number,
    mood: CoachingSession['character_mood']
  ): CoachingOutcome {
    
    // Apply temporary stat boosts directly to the character's temporary_stats
    const strengthGain = Math.floor((effectiveness / 100) * 5); // Example: up to 5 strength
    const dexterityGain = Math.floor((effectiveness / 100) * 5); // Example: up to 5 dexterity
    const speedGain = Math.floor((effectiveness / 100) * 3); // Example: up to 3 speed

    character.temporary_stats.strength += strengthGain;
    character.temporary_stats.dexterity += dexterityGain;
    character.temporary_stats.speed += speedGain;
    
    const mental_healthChange = mood === 'desperate' ? 5 : 0;
    
    const responses = {
      'receptive': `I appreciate the feedback, coach. I'll work on those techniques.`,
      'resistant': `I've been doing this my way for years. But... I'll consider your suggestions.`,
      'neutral': `Understood. I see what you're getting at.`,
      'desperate': `Please, I need to get better. Tell me what to do!`
    };
    
    return {
      mental_healthChange,
      training_change: 0, // No direct training change from this coaching type
      team_playerChange: 0,
      ego_change: character.psych_stats.ego > 80 ? -2 : 0,
      communication_change: 1,
      character_response: responses[mood],
      coach_notes: `Worked on combat techniques and strategy execution. ${character.name} showed ${mood} attitude. Applied temporary boosts: Str +${strengthGain}, Dex +${dexterityGain}, Spd +${speedGain}.`,
      relationship_change: effectiveness > 70 ? 2 : -1
    };
  }
  
  private static handleMentalHealthCoaching(
    character: TeamCharacter,
    effectiveness: number,
    mood: CoachingSession['character_mood']
  ): CoachingOutcome {
    
    const mental_healthGain = Math.floor((effectiveness / 100) * 15);
    const vitalityGain = Math.floor((effectiveness / 100) * 4); // Example: temporary HP boost
    const spiritGain = Math.floor((effectiveness / 100) * 3); // Example: temporary spirit boost

    character.temporary_stats.defense += vitalityGain;
    character.temporary_stats.spirit += spiritGain;

    const responses = {
      'receptive': `Thank you for listening, coach. It helps to talk about these things.`,
      'resistant': `I don't need therapy! But... maybe it's good to vent sometimes.`,
      'neutral': `I suppose talking through problems can be useful.`,
      'desperate': `I really needed this. Thank you for being here for me.`
    };
    
    return {
      mental_healthChange: mental_healthGain,
      training_change: 0,
      team_playerChange: 2,
      ego_change: mood === 'resistant' ? -5 : 0,
      communication_change: 3,
      character_response: responses[mood],
      coach_notes: `Focused on mental wellness and emotional support. Progress made on psychological barriers. Applied temporary boosts: Vit +${vitalityGain}, Spirit +${spiritGain}.`,
      relationship_change: effectiveness > 60 ? 5 : 1
    };
  }
  
  private static handleTeamRelationsCoaching(
    character: TeamCharacter,
    effectiveness: number,
    mood: CoachingSession['character_mood']
  ): CoachingOutcome {
    
    const team_playerGain = Math.floor((effectiveness / 100) * 8);
    const communicationGain = Math.floor((effectiveness / 100) * 6);
    const charismaGain = Math.floor((effectiveness / 100) * 5); // Example: temporary charisma boost

    character.temporary_stats.charisma += charismaGain;

    const responses = {
      'receptive': `You're right, working together makes us all stronger.`,
      'resistant': `Fine, I'll try to be more... collaborative. But I work best alone.`,
      'neutral': `I can see the value in better teamwork.`,
      'desperate': `I don't want to be the reason we lose. Help me be a better teammate.`
    };
    
    return {
      mental_healthChange: 2,
      training_change: 1,
      team_playerChange: team_playerGain,
      ego_change: -3,
      communication_change: communicationGain,
      character_response: responses[mood],
      coach_notes: `Discussed team dynamics and cooperation strategies. Emphasized shared goals. Applied temporary boosts: Charisma +${charismaGain}.`,
      relationship_change: 3
    };
  }
  
  private static handleStrategyCoaching(
    character: TeamCharacter,
    effectiveness: number,
    mood: CoachingSession['character_mood']
  ): CoachingOutcome {
    
    const intelligenceGain = Math.floor((effectiveness / 100) * 6); // Example: temporary intelligence boost
    const defenseGain = Math.floor((effectiveness / 100) * 4); // Example: temporary defense boost

    character.temporary_stats.intelligence += intelligenceGain;
    character.temporary_stats.defense += defenseGain;

    return {
      mental_healthChange: 1,
      training_change: 0,
      team_playerChange: 1,
      ego_change: 0,
      communication_change: 2,
      character_response: `I understand the tactical considerations better now.`,
      coach_notes: `Reviewed battle strategies and decision-making frameworks. Applied temporary boosts: Int +${intelligenceGain}, Defense +${defenseGain}.`,
      relationship_change: 2
    };
  }

  private static handleFinancialCoaching(
    character: TeamCharacter,
    effectiveness: number,
    mood: CoachingSession['character_mood']
  ): CoachingOutcome {
    
    const intelligenceGain = Math.floor((effectiveness / 100) * 4); // Financial intelligence boost
    const charismaGain = Math.floor((effectiveness / 100) * 3); // Confidence boost

    character.temporary_stats.intelligence += intelligenceGain;
    character.temporary_stats.charisma += charismaGain;

    // Financial coaching builds different levels of trust based on character mood
    const financialTrustChange = (() => {
      switch (mood) {
        case 'receptive': return 8; // Very open to financial advice
        case 'resistant': return -2; // Resistant to being told how to spend money
        case 'neutral': return 3; // Moderate trust building
        case 'desperate': return 12; // High trust when desperate for help
        default: return 3;
      }
    })();

    const responses = {
      'receptive': `I appreciate your financial guidance, coach. I want to make smarter money decisions.`,
      'resistant': `I've managed my money fine so far... but I guess some advice couldn't hurt.`,
      'neutral': `Financial planning makes sense. I'll consider your suggestions.`,
      'desperate': `Please help me! I don't know what to do with my money anymore.`
    };

    return {
      mental_healthChange: mood === 'desperate' ? 8 : 3,
      training_change: 0,
      team_playerChange: 1,
      ego_change: mood === 'resistant' ? -3 : 0,
      communication_change: 2,
      character_response: responses[mood],
      coach_notes: `Discussed financial planning, budgeting, and investment strategies. Addressed money-related stress and decision-making. Applied temporary boosts: Int +${intelligenceGain}, Charisma +${charismaGain}.`,
      relationship_change: effectiveness > 70 ? 4 : 1,
      financial_trust_change: financialTrustChange
    };
  }
  
  private static handleGeneralCoaching(
    character: TeamCharacter,
    effectiveness: number,
    mood: CoachingSession['character_mood']
  ): CoachingOutcome {
    
    const allStatGain = Math.floor((effectiveness / 100) * 2); // Small boost to all stats

    character.temporary_stats.strength += allStatGain;
    character.temporary_stats.defense += allStatGain;
    character.temporary_stats.speed += allStatGain;
    character.temporary_stats.dexterity += allStatGain;
    character.temporary_stats.defense += allStatGain;
    character.temporary_stats.intelligence += allStatGain;
    character.temporary_stats.charisma += allStatGain;
    character.temporary_stats.spirit += allStatGain;

    return {
      mental_healthChange: 3,
      training_change: 2,
      team_playerChange: 1,
      ego_change: -1,
      communication_change: 2,
      character_response: `Thanks for the chat, coach. It's good to have someone in your corner.`,
      coach_notes: `General check-in and motivation session. Applied small temporary boosts to all stats.`,
      relationship_change: 1
    };
  }
  
  private static getSessionNumber(character_id: string): number {
    // In a real implementation, this would query the database
    return Math.floor(Math.random() * 10) + 1;
  }
  
  private static determineFocusArea(character: TeamCharacter): TherapyFocus {
    const mental_health = character.psych_stats.mental_health;
    const ego = character.psych_stats.ego;
    const team_player = character.psych_stats.team_player;
    
    if (mental_health < 30) return 'depression';
    if (ego > 90) return 'ego';
    if (team_player < 30) return 'relationships';
    if (character.personality_traits.includes('Angry')) return 'anger';
    
    return 'anxiety'; // Default
  }
  
  private static calculateBreakthrough(character: TeamCharacter, session_number: number): boolean {
    // Higher chance of breakthrough with more sessions and lower mental health
    const baseChance = 0.15;
    const sessionBonus = session_number * 0.02;
    const desperation = character.psych_stats.mental_health < 40 ? 0.1 : 0;
    
    return Math.random() < (baseChance + sessionBonus + desperation);
  }
  
  private static generateTherapyInsights(
    character: TeamCharacter,
    focus_area: TherapyFocus,
    breakthrough: boolean
  ): string[] {
    
    const insights = [];
    
    if (breakthrough) {
      insights.push(`Major breakthrough: ${character.name} finally opened up about their core fears.`);
    }
    
    const focusInsights = {
      trauma: [`Identified source of combat anxiety`, `Worked through past battlefield experiences`],
      anger: [`Explored anger triggers`, `Developed coping mechanisms for frustration`],
      depression: [`Addressed feelings of hopelessness`, `Built positive self-talk strategies`],
      anxiety: [`Identified anxiety patterns`, `Practiced relaxation techniques`],
      ego: [`Challenged superiority complex`, `Explored need for validation`],
      relationships: [`Discussed trust issues`, `Worked on empathy development`]
    };
    
    insights.push(...focusInsights[focus_area]);
    
    return insights;
  }
  
  private static generateNextSessionRecommendation(
    character: TeamCharacter,
    focus_area: TherapyFocus
  ): string {
    
    const recommendations = {
      trauma: `Continue EMDR therapy for combat trauma processing`,
      anger: `Practice anger management techniques before next battle`,
      depression: `Work on building positive daily routines`,
      anxiety: `Implement mindfulness meditation practice`,
      ego: `Focus on team contribution over individual glory`,
      relationships: `Practice active listening with teammates`
    };
    
    return recommendations[focus_area];
  }
  
  private static getActivityEffect(character: TeamCharacter, activityType: TeamBuildingActivity['activityType']): string {
    // Different characters respond differently to activities
    const effects = {
      dinner: `Enjoyed good food and conversation`,
      retreat: `Found peace in nature`,
      training: `Appreciated skill development`,
      game_night: `Had fun with competitive games`,
      group_therapy: `Opened up about personal struggles`
    };
    
    return effects[activityType];
  }
  
  private static getActivityStatChange(character: TeamCharacter, activityType: TeamBuildingActivity['activityType']): number {
    // Mental health gains vary by character and activity
    const baseGains = {
      dinner: 5,
      retreat: 12,
      training: 3,
      game_night: 8,
      group_therapy: 10
    };
    
    let gain = baseGains[activityType];
    
    // Character-specific modifiers
    if (activityType === 'training' && character.archetype === 'warrior') gain += 3;
    if (activityType === 'group_therapy' && character.psych_stats.mental_health < 40) gain += 5;
    
    return gain;
  }
  
  private static calculateActivityDynamics(
    characters: TeamCharacter[],
    activityType: TeamBuildingActivity['activityType']
  ): { conflicts: TeamBuildingActivity['conflicts']; bonds: TeamBuildingActivity['bonds'] } {
    
    const conflicts: TeamBuildingActivity['conflicts'] = [];
    const bonds: TeamBuildingActivity['bonds'] = [];
    
    // Check for personality clashes
    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const char1 = characters[i];
        const char2 = characters[j];
        
        // High ego characters clash
        if (char1.psych_stats.ego > 80 && char2.psych_stats.ego > 80) {
          conflicts.push({
            character1: char1.id,
            character2: char2.id,
            description: `${char1.name} and ${char2.name} compete for attention during the activity`
          });
        }
        
        // High team players bond
        if (char1.psych_stats.team_player > 80 && char2.psych_stats.team_player > 80) {
          bonds.push({
            character1: char1.id,
            character2: char2.id,
            description: `${char1.name} and ${char2.name} work together naturally`
          });
        }
      }
    }
    
    return { conflicts, bonds };
  }
  
  private static getActivityDuration(activityType: TeamBuildingActivity['activityType']): number {
    const durations = {
      dinner: 2,
      retreat: 24,
      training: 4,
      game_night: 3,
      group_therapy: 2
    };
    
    return durations[activityType];
  }
}
