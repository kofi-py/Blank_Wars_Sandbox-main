// Team Battle System - Revolutionary Character Management
// Implements the psychological stat system and team dynamics

import { Equipment, EquipmentStats } from './equipment';
import { PowerDefinition, SpellDefinition } from './magic';

export interface TraditionalStats {
  strength: number; // Physical damage output (0-100)
  defense: number; // HP and damage resistance (0-100)
  speed: number; // Turn order, dodge chance (0-100)
  dexterity: number; // Accuracy, critical chance (0-100)
  intelligence: number; // Spell power, tactics (0-100)
  wisdom: number; // Magical resistance, insight (0-100)
  charisma: number; // Social attacks, inspiration (0-100)
  spirit: number; // Special ability power (0-100)
}

export interface PsychologicalStats {
  training: number; // How well they follow coaching (0-100)
  team_player: number; // Natural cooperation inclination (0-100)
  ego: number; // Need for personal glory (0-100)
  mental_health: number; // Current psychological state (0-100)
  communication: number; // Team coordination ability (0-100)
}

export interface TeamCharacter {
  // Basic Identity
  id: string;
  character_id?: string;
  name: string;
  title?: string;
  avatar: string;
  archetype: 'warrior' | 'mage' | 'trickster' | 'beast' | 'leader' | 'detective' | 'monster' | 'alien' | 'mercenary' | 'cowboy' | 'biker' | 'assassin' | 'tank' | 'support' | 'mystic' | 'elementalist' | 'berserker' | 'scholar';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'uncommon';

  // Battle Image Data (Required from DB)
  battle_image_name: string;
  battle_image_variants: number;
  scene_image_slug?: string;

  // Core Stats
  level: number;
  experience: number;
  experience_to_next: number;

  // Health
  current_health: number;
  max_health: number;

  // Traditional Stats (Flat - from database)
  strength: number; // Physical damage output (0-100)
  dexterity: number; // Accuracy, critical chance (0-100)
  defense: number; // HP and damage resistance (0-100)
  intelligence: number; // Spell power, tactics (0-100)
  wisdom: number; // Magical resistance, insight (0-100)
  charisma: number; // Social attacks, inspiration (0-100)
  spirit: number; // Special ability power (0-100)
  speed: number; // Turn order, dodge chance (0-100)

  // Resources (snake_case to match database)
  current_mana: number;
  max_mana: number;
  current_energy: number;
  max_energy: number;

  // Psychological Stats (Revolutionary)
  psych_stats: PsychologicalStats;

  // Adherence system fields (from database)
  gameplan_adherence: number;
  current_stress: number;
  team_trust: number;
  current_mental_health: number;
  battle_focus: number;
  current_confidence: number;

  // In-battle temporary stats (from coaching boosts)
  // These are applied during battle and reset when a new battle starts
  // Coaching sessions add to these stats for the duration of the battle
  temporary_stats: TraditionalStats;

  // Character Personality
  personality_traits: string[];
  speaking_style: 'formal' | 'casual' | 'archaic' | 'technical' | 'poetic' | 'gruff' | 'mysterious';
  decision_making: 'logical' | 'emotional' | 'impulsive' | 'calculated';
  conflict_response: 'aggressive' | 'diplomatic' | 'withdrawn' | 'manipulative';

  // Current Status
  status_effects: string[];
  injuries: string[];
  rest_days_needed: number;

  // Abilities
  abilities: CharacterAbility[];
  special_powers: SpecialPower[];

  // Powers & Spells (New System)
  powers: PowerDefinition[];
  spells: SpellDefinition[];
  equipped_powers: PowerDefinition[];
  equipped_spells: SpellDefinition[];

  // Equipment Integration
  equipped_items: {
    weapon?: Equipment;
    armor?: Equipment;
    accessory?: Equipment;
  };

  // Equipment-derived stats (calculated from equipped items)
  equipment_bonuses: EquipmentStats;

  // Core Skills - affect battle performance and progression
  core_skills: {
    combat: { level: number; experience: number; max_level: number; };
    survival: { level: number; experience: number; max_level: number; };
    mental: { level: number; experience: number; max_level: number; };
    social: { level: number; experience: number; max_level: number; };
    spiritual: { level: number; experience: number; max_level: number; };
  };
  // Additional battle properties
  attack?: number;
  health?: number;
  training_level?: number;
  position?: { q: number; r: number; s: number };
  buffs?: any[];
  debuffs?: any[];
  relationship_modifiers?: any[];
  traditionalStats?: any;
  initiative?: number; // Added for battle turn order
}

export interface CharacterAbility {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'special' | 'support';
  power: number;
  cooldown: number;
  current_cooldown: number;
  description: string;
  icon: string;
  mental_healthRequired: number; // Minimum mental health to use reliably
}

export interface SpecialPower {
  id: string;
  name: string;
  type: 'passive' | 'active' | 'combo';
  description: string;
  effect: string;
  icon: string;
  cooldown: number;
  current_cooldown: number;
  team_playerRequired?: number; // Some abilities require teamwork
}

export interface Team {
  id: string;
  name: string;
  coach_name: string;
  characters: TeamCharacter[];

  // Team Dynamics
  coaching_points: number; // Points to spend on coaching actions
  consecutive_losses: number; // Track losses for coaching points degradation (0-3)
  team_chemistry: number; // 0-100, affects all battles
  team_culture: 'military' | 'family' | 'divas' | 'chaos' | 'brotherhood' | 'balanced';
  current_morale?: number; // Current team morale (0-100)
  max_morale?: number; // Maximum team morale

  // Team Stats (derived from characters)
  average_level: number;
  total_power: number;
  psychology_score: number; // Overall team mental health

  // History
  wins: number;
  losses: number;
  battles_played: number;
  last_battle_date: Date;
}

export interface BattleSetup {
  player_team: Team;
  opponent_team: Team;
  player_morale?: number;
  battle_type: 'friendly' | 'ranked' | 'tournament';
  weight_class: 'rookie' | 'amateur' | 'pro' | 'championship';
  stakes: 'normal' | 'high' | 'death_match';
  current_fighters?: {
    player: TeamCharacter;
    opponent: TeamCharacter;
  };
  // Battle Image Data (Required from DB)
}

export interface BattleMorale {
  current_morale: number; // 0-100, affects all team members
  morale_history: MoraleEvent[];
}

export interface MoraleEvent {
  round: number;
  event: string;
  morale_change: number;
  affected_characters: string[];
  timestamp: Date;
}

export interface RoundResult {
  round: number;
  attacker: TeamCharacter;
  defender: TeamCharacter;
  attacker_action: CharacterAbility | 'refused' | 'rogue_action';
  damage: number;
  was_strategy_adherent: boolean; // Did they follow strategy?
  rogue_description?: string; // If they went off-script
  morale_impact: number;
  new_attacker_hp: number;
  new_defender_hp: number;
  narrative_description: string;
}

export interface BattleState {
  setup: BattleSetup;
  current_round: number;
  phase: 'pre_battle' | 'huddle' | 'round_combat' | 'coaching_timeout' | 'post_battle';

  // Dynamic Battle State
  player_morale: BattleMorale;
  opponent_morale: BattleMorale;

  // Round History
  round_results: RoundResult[];

  // Current Round
  current_fighters: {
    player: TeamCharacter;
    opponent: TeamCharacter;
  };

  // Battle Outcome
  winner?: 'player' | 'opponent' | 'draw';
  battle_end_reason?: 'total_victory' | 'forfeit' | 'mutual_destruction' | 'time_limit';
}

// Mental Health Categories
export type MentalHealthLevel = 'stable' | 'stressed' | 'troubled' | 'crisis';

export function getMentalHealthLevel(mental_health: number): MentalHealthLevel {
  if (mental_health >= 80) return 'stable';
  if (mental_health >= 50) return 'stressed';
  if (mental_health >= 25) return 'troubled';
  return 'crisis';
}

export function getMentalHealthModifier(level: MentalHealthLevel): number {
  switch (level) {
    case 'stable': return 1.0; // No penalty
    case 'stressed': return 0.9; // -10% performance
    case 'troubled': return 0.8; // -20% performance
    case 'crisis': return 0.7; // -30% performance
  }
}

export function getMoraleModifier(morale: number): number {
  if (morale >= 80) return 1.2; // +20% all stats
  if (morale >= 60) return 1.1; // +10% stats
  if (morale >= 40) return 0.9; // -10% stats
  if (morale >= 20) return 0.8; // -20% stats
  return 0.7; // -30% stats
}

// Team Chemistry Modifier - Revolutionary team synergy system!
export function getTeamChemistryModifier(chemistry: number): number {
  if (chemistry >= 90) return 1.25; // +25% damage - Perfect synergy
  if (chemistry >= 75) return 1.15; // +15% damage - Great teamwork
  if (chemistry >= 60) return 1.05; // +5% damage - Good coordination
  if (chemistry >= 40) return 0.95; // -5% damage - Some friction
  if (chemistry >= 25) return 0.85; // -15% damage - Poor teamwork
  return 0.75; // -25% damage - Team dysfunction
}

// Team Chemistry Calculation
export function calculateTeamChemistry(
  characters: TeamCharacter[],
  headquarters_effects?: { bonuses: Record<string, number>, penalties: Record<string, number> }
): number {
  if (characters.length === 0) return 0;

  const avgTeamPlayer = characters.reduce((sum, char) => sum + char.psych_stats.team_player, 0) / characters.length;
  const avgCommunication = characters.reduce((sum, char) => sum + char.psych_stats.communication, 0) / characters.length;
  const avgEgo = characters.reduce((sum, char) => sum + char.psych_stats.ego, 0) / characters.length;
  const avgMentalHealth = characters.reduce((sum, char) => sum + char.psych_stats.mental_health, 0) / characters.length;

  // Factor in social skills - higher social skills improve team chemistry
  const avgSocialSkill = characters.reduce((sum, char) => sum + char.core_skills.social.level, 0) / characters.length;
  const socialSkillBonus = avgSocialSkill * 0.5; // +0.5 chemistry per average social skill level

  // High team player and communication boost chemistry
  // High ego hurts chemistry
  // Good mental health helps chemistry
  const baseChemistry = (avgTeamPlayer + avgCommunication + avgMentalHealth) / 3 + socialSkillBonus;
  const egoReduction = (avgEgo - 50) * 0.3; // Ego above 50 hurts chemistry

  // Factor in living conditions
  let environmentalPenalty = 0;
  if (headquarters_effects?.penalties) {
    const moralePenalty = Math.abs(headquarters_effects.penalties['Morale'] || 0);
    const teamworkPenalty = Math.abs(headquarters_effects.penalties['Teamwork'] || 0);

    // Poor living conditions and personality conflicts devastate team chemistry
    environmentalPenalty = moralePenalty + teamworkPenalty; // -30 morale + -25 teamwork = -55 chemistry
  }

  return Math.max(0, Math.min(100, baseChemistry - egoReduction - environmentalPenalty));
}

// Gameplan Adherence Check - Will character follow coach's strategy?
export function checkGameplanAdherence(
  character: { psych_stats: PsychologicalStats },
  team_morale: number,
  is_injured: boolean = false,
  is_losing: boolean = false
): { will_follow: boolean; adherence_score: number; reason: string } {

  let adherenceScore = character.psych_stats.training;

  // Modifiers
  const mental_healthMod = character.psych_stats.mental_health * 0.4;
  const team_playerMod = character.psych_stats.team_player * 0.3;
  const egoMod = (100 - character.psych_stats.ego) * 0.2;
  const moraleMod = team_morale * 0.3;
  const communicationMod = character.psych_stats.communication * 0.2;

  adherenceScore += mental_healthMod + team_playerMod + egoMod + moraleMod + communicationMod;

  // Stress factors reduce strategy adherence
  if (is_injured) adherenceScore -= 20;
  if (is_losing) adherenceScore -= 15;
  if (character.psych_stats.mental_health < 30) adherenceScore -= 25;

  // Random factor (chaos element)
  const randomFactor = (Math.random() - 0.5) * 20;
  adherenceScore += randomFactor;

  const willFollow = adherenceScore > 50;

  let reason = '';
  if (!willFollow) {
    if (character.psych_stats.mental_health < 30) reason = 'Mental breakdown affects decision making';
    else if (character.psych_stats.ego > 80) reason = 'Believes their approach is better than the gameplan';
    else if (is_injured) reason = 'Pain and emotion override strategic thinking';
    else if (team_morale < 30) reason = 'Low team morale leads to independent decisions';
    else reason = 'Prefers to adapt strategy based on field conditions';
  }

  return { will_follow: willFollow, adherence_score: Math.max(0, Math.min(100, adherenceScore)), reason };
}

// Legacy compatibility function
export function checkObedience(
  character: TeamCharacter,
  team_morale: number,
  is_injured: boolean = false,
  is_losing: boolean = false
): { will_obey: boolean; obedience_score: number; reason: string } {
  const result = checkGameplanAdherence(character, team_morale, is_injured, is_losing);
  return {
    will_obey: result.will_follow,
    obedience_score: result.adherence_score,
    reason: result.reason
  };
}

// Coaching Points Progression System
/**
 * Get effective stats for battle calculations (traditional + temporary + equipment bonuses)
 * NOTE: This function is implemented later in the file with equipment bonus support
 */

export function updateCoachingPointsAfterBattle(team: Team, is_win: boolean): Team {
  if (is_win) {
    // Win: Reset to 3 points and clear consecutive losses
    return {
      ...team,
      coaching_points: 3,
      consecutive_losses: 0,
      wins: team.wins + 1,
      battles_played: team.battles_played + 1
    };
  } else {
    // Loss: Increment consecutive losses and reduce coaching points
    const newConsecutiveLosses = team.consecutive_losses + 1;
    let newCoachingPoints: number;

    switch (newConsecutiveLosses) {
      case 1: newCoachingPoints = 2; break; // 3→2
      case 2: newCoachingPoints = 1; break; // 2→1
      case 3: newCoachingPoints = 0; break; // 1→0
      default: newCoachingPoints = 0; break; // Stay at 0
    }

    return {
      ...team,
      coaching_points: newCoachingPoints,
      consecutive_losses: newConsecutiveLosses,
      losses: team.losses + 1,
      battles_played: team.battles_played + 1
    };
  }
}

// Calculate skill multipliers for stat enhancement
function calculateSkillMultipliers(core_skills: TeamCharacter['core_skills']) {
  return {
    combat: 1 + (core_skills.combat.level * 0.02),    // +2% per level
    survival: 1 + (core_skills.survival.level * 0.02), // +2% per level
    mental: 1 + (core_skills.mental.level * 0.015),   // +1.5% per level
    social: 1 + (core_skills.social.level * 0.01),    // +1% per level
    spiritual: 1 + (core_skills.spiritual.level * 0.015) // +1.5% per level
  };
}

// Function to get effective stats including equipment bonuses
export function getEffectiveStats(character: TeamCharacter): TraditionalStats {
  const equipment = character.equipment_bonuses;
  const temporary = character.temporary_stats;

  return {
    strength: Math.min(100, character.strength + equipment.atk + temporary.strength),
    defense: Math.min(100, character.defense + equipment.def + temporary.defense),
    speed: Math.min(100, character.speed + equipment.spd + temporary.speed),
    dexterity: Math.min(100, character.dexterity + equipment.accuracy + temporary.dexterity),
    intelligence: Math.min(100, character.intelligence + temporary.intelligence),
    wisdom: Math.min(100, character.wisdom + temporary.wisdom),
    charisma: Math.min(100, character.charisma + temporary.charisma),
    spirit: Math.min(100, character.spirit + temporary.spirit)
  };
}

// Function to get effective HP including equipment bonuses
export function getEffectiveMaxHp(character: TeamCharacter): number {
  return character.max_health + character.equipment_bonuses.hp;
}

// Function to get effective critical chance including equipment bonuses
export function getEffectiveCriticalChance(character: TeamCharacter): number {
  return Math.min(100, character.equipment_bonuses.crit_rate);
}
