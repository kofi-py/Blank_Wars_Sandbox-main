// AI Judge System - Handles unpredictable character actions dynamically
// This system interprets when characters go "off-script" and determines outcomes

import { TeamCharacter, RoundResult, CharacterAbility } from './teamBattleSystem';

export interface RogueAction {
  type: 'reckless_attack' | 'refuse_fight' | 'attack_teammate' | 'creative_strategy' | 'panic_flee' | 'berserker_rage' | 'protective_sacrifice';
  description: string;
  reason: string;
  character: TeamCharacter;
}

export interface JudgeRuling {
  damage: number;
  target_damage?: number; // If action affects multiple targets
  morale_change: number;
  status_effects: string[];
  narrative_description: string;
  team_chemistryChange?: number;
  character_mental_health_change?: number;
}

export class AIJudge {
  
  static generateRogueAction(
    character: TeamCharacter, 
    opponent: TeamCharacter,
    team_morale: number,
    situation: 'winning' | 'losing' | 'even'
  ): RogueAction {
    
    const mental_healthLevel = character.psych_stats.mental_health;
    const ego = character.psych_stats.ego;
    const team_player = character.psych_stats.team_player;
    
    // Determine most likely rogue action based on character psychology
    if (mental_healthLevel < 25) {
      // Crisis level - extreme actions
      if (ego > 80) {
        return {
          type: 'berserker_rage',
          description: `${character.name} loses all control and enters a berserker rage!`,
          reason: 'Mental breakdown combined with massive ego',
          character
        };
      } else {
        return {
          type: 'panic_flee',
          description: `${character.name} panics and tries to flee the battle!`,
          reason: 'Complete mental breakdown',
          character
        };
      }
    }
    
    if (situation === 'losing' && ego > 70) {
      return {
        type: 'reckless_attack',
        description: `${character.name} ignores defense and charges recklessly!`,
        reason: 'Pride refuses to accept defeat',
        character
      };
    }
    
    if (team_player < 30 && team_morale < 40) {
      return {
        type: 'refuse_fight',
        description: `${character.name} crosses their arms and refuses to fight!`,
        reason: 'Low team loyalty and poor morale',
        character
      };
    }
    
    if (character.psych_stats.ego > 85 && situation === 'winning') {
      return {
        type: 'creative_strategy',
        description: `${character.name} improvises a flashy, unorthodox attack!`,
        reason: 'Ego drives showboating when ahead',
        character
      };
    }
    
    // Default fallback
    return {
      type: 'reckless_attack',
      description: `${character.name} acts unpredictably!`,
      reason: 'General deviation from gameplan',
      character
    };
  }
  
  static judgeRogueAction(
    action: RogueAction,
    opponent: TeamCharacter,
    team_morale: number
  ): JudgeRuling {
    
    switch (action.type) {
      case 'reckless_attack':
        return this.judgeRecklessAttack(action, opponent, team_morale);
      
      case 'refuse_fight':
        return this.judgeRefuseFight(action, opponent, team_morale);
      
      case 'attack_teammate':
        return this.judgeTeammateAttack(action, team_morale);
      
      case 'creative_strategy':
        return this.judgeCreativeStrategy(action, opponent, team_morale);
      
      case 'panic_flee':
        return this.judgePanicFlee(action, opponent, team_morale);
      
      case 'berserker_rage':
        return this.judgeBerserkerRage(action, opponent, team_morale);
      
      case 'protective_sacrifice':
        return this.judgeProtectiveSacrifice(action, opponent, team_morale);
      
      default:
        return this.judgeDefault(action, opponent, team_morale);
    }
  }
  
  private static judgeRecklessAttack(
    action: RogueAction, 
    opponent: TeamCharacter, 
    team_morale: number
  ): JudgeRuling {
    
    const baseDamage = action.character.strength * 1.5; // 50% more damage
    const damage_taken = opponent.strength * 2; // But takes double damage
    
    return {
      damage: Math.floor(baseDamage),
      target_damage: Math.floor(damage_taken), // Damage to self
      morale_change: team_morale > 60 ? -10 : -5, // Team worried about recklessness
      status_effects: ['vulnerable'], // Easier to hit next round
      narrative_description: `${action.character.name} throws caution to the wind! Their reckless assault hits hard but leaves them exposed!`,
      character_mental_health_change: -5 // Acting against training is stressful
    };
  }
  
  private static judgeRefuseFight(
    action: RogueAction, 
    opponent: TeamCharacter, 
    team_morale: number
  ): JudgeRuling {
    
    return {
      damage: 0, // No damage dealt
      target_damage: opponent.strength, // Takes full hit
      morale_change: -15, // Team demoralized by cowardice
      status_effects: ['demoralized'],
      narrative_description: `${action.character.name} refuses to engage! The opponent gets a free hit while the team watches in dismay!`,
      team_chemistryChange: -10,
      character_mental_health_change: -10 // Guilt and shame
    };
  }
  
  private static judgeTeammateAttack(
    action: RogueAction, 
    team_morale: number
  ): JudgeRuling {
    
    const friendlyDamage = action.character.strength * 0.8;
    
    return {
      damage: 0, // No damage to opponent
      target_damage: Math.floor(friendlyDamage), // Friendly fire
      morale_change: -25, // Devastating to team morale
      status_effects: ['betrayal_trauma'],
      narrative_description: `In a shocking turn, ${action.character.name} turns on their own teammate! The crowd gasps in horror!`,
      team_chemistryChange: -30, // Permanent chemistry damage
      character_mental_health_change: -15 // Acting against core values
    };
  }
  
  private static judgeCreativeStrategy(
    action: RogueAction, 
    opponent: TeamCharacter, 
    team_morale: number
  ): JudgeRuling {
    
    // Creative strategies can backfire or succeed spectacularly
    const success = Math.random() > 0.3; // 70% chance of success
    
    if (success) {
      const creativeDamage = action.character.strength * 1.3;
      return {
        damage: Math.floor(creativeDamage),
        target_damage: 0,
        morale_change: 15, // Team inspired by creativity
        status_effects: ['inspired'],
        narrative_description: `${action.character.name}'s improvised strategy catches everyone off guard! A brilliant display of tactical innovation!`,
        character_mental_health_change: 5 // Success feels good
      };
    } else {
      return {
        damage: Math.floor(action.character.strength * 0.5),
        target_damage: Math.floor(action.character.strength * 0.3), // Backfire
        morale_change: -8, // Team disappointed
        status_effects: ['overconfident_backfire'],
        narrative_description: `${action.character.name}'s flashy move backfires! Sometimes simpler is better!`,
        character_mental_health_change: -8 // Embarrassment hurts
      };
    }
  }
  
  private static judgePanicFlee(
    action: RogueAction, 
    opponent: TeamCharacter, 
    team_morale: number
  ): JudgeRuling {
    
    return {
      damage: 0,
      target_damage: 0, // No damage exchanged
      morale_change: -20, // Team loses hope
      status_effects: ['fled', 'cowardice'],
      narrative_description: `${action.character.name} breaks under pressure and flees the battle! Their teammates watch in disbelief!`,
      team_chemistryChange: -15,
      character_mental_health_change: -20 // Shame spiral
    };
  }
  
  private static judgeBerserkerRage(
    action: RogueAction, 
    opponent: TeamCharacter, 
    team_morale: number
  ): JudgeRuling {
    
    // Berserker rage: massive damage but completely unpredictable
    const rageDamage = action.character.strength * 2;
    const selfDamage = action.character.max_health * 0.15; // 15% self damage from exhaustion
    
    return {
      damage: Math.floor(rageDamage),
      target_damage: Math.floor(selfDamage),
      morale_change: 0, // Team doesn't know how to feel
      status_effects: ['berserker_exhaustion'],
      narrative_description: `${action.character.name} enters a terrifying berserker rage! Devastating but uncontrollable fury!`,
      character_mental_health_change: -15 // Mental strain from losing control
    };
  }
  
  private static judgeProtectiveSacrifice(
    action: RogueAction, 
    opponent: TeamCharacter, 
    team_morale: number
  ): JudgeRuling {

    const sacrificeDamage = action.character.max_health * 0.4; // Takes heavy damage

    return {
      damage: Math.floor(action.character.strength * 0.8),
      target_damage: Math.floor(sacrificeDamage),
      morale_change: 20, // Team inspired by sacrifice
      status_effects: ['heroic_inspiration'],
      narrative_description: `${action.character.name} throws themselves into harm's way to protect their team! A noble sacrifice!`,
      team_chemistryChange: 10,
      character_mental_health_change: 10 // Heroic acts boost confidence
    };
  }
  
  private static judgeDefault(
    action: RogueAction, 
    opponent: TeamCharacter, 
    team_morale: number
  ): JudgeRuling {
    
    return {
      damage: Math.floor(action.character.strength * 0.7),
      target_damage: Math.floor(opponent.strength * 0.8),
      morale_change: -5,
      status_effects: ['unpredictable'],
      narrative_description: `${action.character.name} acts erratically! The battle becomes chaotic!`,
      character_mental_health_change: -3
    };
  }
  
  // Generate coaching dialogue based on character actions
  static generateCoachingResponse(
    action: RogueAction,
    ruling: JudgeRuling,
    coach_name: string
  ): string {
    
    const responses = {
      'reckless_attack': [
        `${coach_name}: ${action.character.name}! What are you doing?! Stick to the plan!`,
        `${coach_name}: That's not what we practiced! Control yourself!`,
        `${coach_name}: Brilliant damage, but you're going to get yourself killed!`
      ],
      'refuse_fight': [
        `${coach_name}: Get back in there! This is not the time for this!`,
        `${coach_name}: ${action.character.name}, your team needs you! Fight!`,
        `${coach_name}: What's gotten into you? We talked about this!`
      ],
      'creative_strategy': [
        `${coach_name}: That wasn't the plan, but... not bad!`,
        `${coach_name}: Improvisation! I like the creativity!`,
        `${coach_name}: Next time warn me before you try something like that!`
      ],
      'panic_flee': [
        `${coach_name}: Come back here! We can work through this!`,
        `${coach_name}: ${action.character.name}! Remember your training!`,
        `${coach_name}: It's okay to be scared, but don't abandon your team!`
      ]
    };
    
    const actionResponses = responses[action.type] || [
      `${coach_name}: What are you thinking?! Get it together!`
    ];
    
    return actionResponses[Math.floor(Math.random() * actionResponses.length)];
  }
}

// Character response generator for rogue actions
export class CharacterResponseGenerator {
  
  static generateResponse(
    character: TeamCharacter,
    action: RogueAction,
    coach_response: string
  ): string {
    
    const personality = character.personality_traits;
    const ego = character.psych_stats.ego;
    const mental_health = character.psych_stats.mental_health;
    
    // High ego characters defend their actions
    if (ego > 80) {
      const defensiveResponses = [
        `I know what I'm doing!`,
        `Trust me, I've been doing this longer than you!`,
        `My way is better!`,
        `Don't question my methods!`
      ];
      return defensiveResponses[Math.floor(Math.random() * defensiveResponses.length)];
    }
    
    // Low mental health characters are erratic
    if (mental_health < 30) {
      const erraticResponses = [
        `I... I can't think straight!`,
        `Everything is falling apart!`,
        `I don't know what came over me!`,
        `The pressure... it's too much!`
      ];
      return erraticResponses[Math.floor(Math.random() * erraticResponses.length)];
    }
    
    // Default apologetic response
    const apologeticResponses = [
      `Sorry coach, I lost my focus for a moment.`,
      `You're right, I should stick to the gameplan.`,
      `I'll do better next time.`,
      `My emotions got the better of me.`
    ];
    
    return apologeticResponses[Math.floor(Math.random() * apologeticResponses.length)];
  }
}