// Team Battle System - Revolutionary Character Management
// Implements the psychological stat system and team dynamics

import { Equipment, EquipmentStats } from './equipment';

export interface TraditionalStats {
  strength: number; // Physical damage output (0-100)
  stamina: number; // HP and damage resistance (0-100)
  speed: number; // Turn order, dodge chance (0-100)
  dexterity: number; // Accuracy, critical chance (0-100)
  stamina: number; // Actions per turn (0-100)
  intelligence: number; // Spell power, tactics (0-100)
  charisma: number; // Social attacks, inspiration (0-100)
  spirit: number; // Special ability power (0-100)
}

export interface PsychologicalStats {
  training: number; // How well they follow coaching (0-100)
  teamPlayer: number; // Natural cooperation inclination (0-100)
  ego: number; // Need for personal glory (0-100)
  mentalHealth: number; // Current psychological state (0-100)
  communication: number; // Team coordination ability (0-100)
}

export interface TeamCharacter {
  // Basic Identity
  id: string;
  name: string;
  avatar: string;
  archetype: 'warrior' | 'mage' | 'trickster' | 'beast' | 'leader' | 'detective' | 'monster' | 'alien' | 'mercenary' | 'cowboy' | 'biker' | 'assassin' | 'tank' | 'support' | 'mystic' | 'elementalist' | 'berserker' | 'scholar' | 'dragon';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'uncommon';

  // Core Stats
  level: number;
  experience: number;
  experienceToNext: number;

  // Combat Stats (Traditional)
  traditionalStats: TraditionalStats;
  currentHp: number;
  maxHp: number;

  // Resources
  currentMana: number;
  maxMana: number;
  currentEnergy: number;
  maxEnergy: number;

  // Psychological Stats (Revolutionary)
  psychStats: PsychologicalStats;

  // Adherence system fields (from database)
  gameplan_adherence_level: number;
  stress_level: number;
  team_trust: number;
  current_mental_health: number;
  battle_focus: number;

  // In-battle temporary stats (from coaching boosts)
  // These are applied during battle and reset when a new battle starts
  // Coaching sessions add to these stats for the duration of the battle
  temporaryStats: TraditionalStats;

  // Character Personality
  personalityTraits: string[];
  speakingStyle: 'formal' | 'casual' | 'archaic' | 'technical' | 'poetic' | 'gruff' | 'mysterious';
  decisionMaking: 'logical' | 'emotional' | 'impulsive' | 'calculated';
  conflictResponse: 'aggressive' | 'diplomatic' | 'withdrawn' | 'manipulative';

  // Current Status
  statusEffects: string[];
  injuries: string[];
  restDaysNeeded: number;

  // Abilities
  abilities: CharacterAbility[];
  specialPowers: SpecialPower[];

  // Powers & Spells (New System)
  equippedPowers?: Array<{
    id: string;
    name: string;
    tier: string;
    description: string;
    power_type: string;
    effects: any[];
    cooldown: number;
    current_rank: number;
    max_rank: number;
    icon?: string;
  }>;
  equippedSpells?: Array<{
    id: string;
    name: string;
    tier: string;
    description: string;
    effects: any[];
    mana_cost: number;
    cooldown_turns: number;
    current_rank: number;
    max_rank: number;
    icon?: string;
  }>;

  // Equipment Integration
  equippedItems: {
    weapon?: Equipment;
    armor?: Equipment;
    accessory?: Equipment;
  };

  // Equipment-derived stats (calculated from equipped items)
  equipmentBonuses: EquipmentStats;

  // Core Skills - affect battle performance and progression
  coreSkills: {
    combat: { level: number; experience: number; maxLevel: number; };
    survival: { level: number; experience: number; maxLevel: number; };
    mental: { level: number; experience: number; maxLevel: number; };
    social: { level: number; experience: number; maxLevel: number; };
    spiritual: { level: number; experience: number; maxLevel: number; };
  };
}

export interface CharacterAbility {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'special' | 'support';
  power: number;
  cooldown: number;
  currentCooldown: number;
  description: string;
  icon: string;
  mentalHealthRequired: number; // Minimum mental health to use reliably
}

export interface SpecialPower {
  id: string;
  name: string;
  type: 'passive' | 'active' | 'combo';
  description: string;
  effect: string;
  icon: string;
  cooldown: number;
  currentCooldown: number;
  teamPlayerRequired?: number; // Some abilities require teamwork
}

export interface Team {
  id: string;
  name: string;
  coachName: string;
  characters: TeamCharacter[];

  // Team Dynamics
  coachingPoints: number; // Points to spend on coaching actions
  consecutiveLosses: number; // Track losses for coaching points degradation (0-3)
  teamChemistry: number; // 0-100, affects all battles
  teamCulture: 'military' | 'family' | 'divas' | 'chaos' | 'brotherhood' | 'balanced';

  // Team Stats (derived from characters)
  averageLevel: number;
  totalPower: number;
  psychologyScore: number; // Overall team mental health

  // History
  wins: number;
  losses: number;
  battlesPlayed: number;
  lastBattleDate: Date;
}

export interface BattleSetup {
  playerTeam: Team;
  opponentTeam: Team;
  battleType: 'friendly' | 'ranked' | 'tournament';
  weightClass: 'rookie' | 'amateur' | 'pro' | 'championship';
  stakes: 'normal' | 'high' | 'death_match';
}

export interface BattleMorale {
  currentMorale: number; // 0-100, affects all team members
  moraleHistory: MoraleEvent[];
}

export interface MoraleEvent {
  round: number;
  event: string;
  moraleChange: number;
  affectedCharacters: string[];
  timestamp: Date;
}

export interface RoundResult {
  round: number;
  attacker: TeamCharacter;
  defender: TeamCharacter;
  attackerAction: CharacterAbility | 'refused' | 'rogue_action';
  damage: number;
  wasStrategyAdherent: boolean; // Did they follow strategy?
  rogueDescription?: string; // If they went off-script
  moraleImpact: number;
  newAttackerHp: number;
  newDefenderHp: number;
  narrativeDescription: string;
}

export interface BattleState {
  setup: BattleSetup;
  currentRound: number;
  phase: 'pre_battle' | 'huddle' | 'round_combat' | 'coaching_timeout' | 'post_battle';

  // Dynamic Battle State
  playerMorale: BattleMorale;
  opponentMorale: BattleMorale;

  // Round History
  roundResults: RoundResult[];

  // Current Round
  currentFighters: {
    player: TeamCharacter;
    opponent: TeamCharacter;
  };

  // Battle Outcome
  winner?: 'player' | 'opponent' | 'draw';
  battleEndReason?: 'total_victory' | 'forfeit' | 'mutual_destruction' | 'time_limit';
}

// Mental Health Categories
export type MentalHealthLevel = 'stable' | 'stressed' | 'troubled' | 'crisis';

export function getMentalHealthLevel(mentalHealth: number): MentalHealthLevel {
  if (mentalHealth >= 80) return 'stable';
  if (mentalHealth >= 50) return 'stressed';
  if (mentalHealth >= 25) return 'troubled';
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
  headquartersEffects?: { bonuses: Record<string, number>, penalties: Record<string, number> }
): number {
  if (characters.length === 0) return 0;

  const avgTeamPlayer = characters.reduce((sum, char) => sum + char.psychStats.teamPlayer, 0) / characters.length;
  const avgCommunication = characters.reduce((sum, char) => sum + char.psychStats.communication, 0) / characters.length;
  const avgEgo = characters.reduce((sum, char) => sum + char.psychStats.ego, 0) / characters.length;
  const avgMentalHealth = characters.reduce((sum, char) => sum + char.psychStats.mentalHealth, 0) / characters.length;

  // Factor in social skills - higher social skills improve team chemistry
  const avgSocialSkill = characters.reduce((sum, char) => sum + char.coreSkills.social.level, 0) / characters.length;
  const socialSkillBonus = avgSocialSkill * 0.5; // +0.5 chemistry per average social skill level

  // High team player and communication boost chemistry
  // High ego hurts chemistry
  // Good mental health helps chemistry
  const baseChemistry = (avgTeamPlayer + avgCommunication + avgMentalHealth) / 3 + socialSkillBonus;
  const egoReduction = (avgEgo - 50) * 0.3; // Ego above 50 hurts chemistry

  // Factor in living conditions
  let environmentalPenalty = 0;
  if (headquartersEffects?.penalties) {
    const moralePenalty = Math.abs(headquartersEffects.penalties['Morale'] || 0);
    const teamworkPenalty = Math.abs(headquartersEffects.penalties['Teamwork'] || 0);

    // Poor living conditions and personality conflicts devastate team chemistry
    environmentalPenalty = moralePenalty + teamworkPenalty; // -30 morale + -25 teamwork = -55 chemistry
  }

  return Math.max(0, Math.min(100, baseChemistry - egoReduction - environmentalPenalty));
}

// Gameplan Adherence Check - Will character follow coach's strategy?
export function checkGameplanAdherence(
  character: TeamCharacter,
  teamMorale: number,
  isInjured: boolean = false,
  isLosing: boolean = false
): { willFollow: boolean; adherenceScore: number; reason: string } {

  let adherenceScore = character.psychStats.training;

  // Modifiers
  const mentalHealthMod = character.psychStats.mentalHealth * 0.4;
  const teamPlayerMod = character.psychStats.teamPlayer * 0.3;
  const egoMod = (100 - character.psychStats.ego) * 0.2;
  const moraleMod = teamMorale * 0.3;

  adherenceScore += mentalHealthMod + teamPlayerMod + egoMod + moraleMod;

  // Stress factors reduce strategy adherence
  if (isInjured) adherenceScore -= 20;
  if (isLosing) adherenceScore -= 15;
  if (character.psychStats.mentalHealth < 30) adherenceScore -= 25;

  // Random factor (chaos element)
  const randomFactor = (Math.random() - 0.5) * 20;
  adherenceScore += randomFactor;

  const willFollow = adherenceScore > 50;

  let reason = '';
  if (!willFollow) {
    if (character.psychStats.mentalHealth < 30) reason = 'Mental breakdown affects decision making';
    else if (character.psychStats.ego > 80) reason = 'Believes their approach is better than the gameplan';
    else if (isInjured) reason = 'Pain and emotion override strategic thinking';
    else if (teamMorale < 30) reason = 'Low team morale leads to independent decisions';
    else reason = 'Prefers to adapt strategy based on field conditions';
  }

  return { willFollow, adherenceScore: Math.max(0, Math.min(100, adherenceScore)), reason };
}

// Legacy compatibility function
export function checkObedience(
  character: TeamCharacter,
  teamMorale: number,
  isInjured: boolean = false,
  isLosing: boolean = false
): { willObey: boolean; obedienceScore: number; reason: string } {
  const result = checkGameplanAdherence(character, teamMorale, isInjured, isLosing);
  return {
    willObey: result.willFollow,
    obedienceScore: result.adherenceScore,
    reason: result.reason
  };
}

// Coaching Points Progression System
/**
 * Get effective stats for battle calculations (traditional + temporary + equipment bonuses)
 * NOTE: This function is implemented later in the file with equipment bonus support
 */

export function updateCoachingPointsAfterBattle(team: Team, isWin: boolean): Team {
  if (isWin) {
    // Win: Reset to 3 points and clear consecutive losses
    return {
      ...team,
      coachingPoints: 3,
      consecutiveLosses: 0,
      wins: team.wins + 1,
      battlesPlayed: team.battlesPlayed + 1
    };
  } else {
    // Loss: Increment consecutive losses and reduce coaching points
    const newConsecutiveLosses = team.consecutiveLosses + 1;
    let newCoachingPoints: number;

    switch (newConsecutiveLosses) {
      case 1: newCoachingPoints = 2; break; // 3→2
      case 2: newCoachingPoints = 1; break; // 2→1
      case 3: newCoachingPoints = 0; break; // 1→0
      default: newCoachingPoints = 0; break; // Stay at 0
    }

    return {
      ...team,
      coachingPoints: newCoachingPoints,
      consecutiveLosses: newConsecutiveLosses,
      losses: team.losses + 1,
      battlesPlayed: team.battlesPlayed + 1
    };
  }
}

// Calculate skill multipliers for stat enhancement
function calculateSkillMultipliers(coreSkills: TeamCharacter['coreSkills']) {
  return {
    combat: 1 + (coreSkills.combat.level * 0.02),    // +2% per level
    survival: 1 + (coreSkills.survival.level * 0.02), // +2% per level
    mental: 1 + (coreSkills.mental.level * 0.015),   // +1.5% per level
    social: 1 + (coreSkills.social.level * 0.01),    // +1% per level
    spiritual: 1 + (coreSkills.spiritual.level * 0.015) // +1.5% per level
  };
}

// Function to get effective stats including equipment bonuses
export function getEffectiveStats(character: TeamCharacter): TraditionalStats {
  const base = character.traditionalStats;
  const equipment = character.equipmentBonuses;
  const temporary = character.temporaryStats;

  return {
    strength: Math.min(100, (base.strength || 0) + (equipment.atk || 0) + (temporary.strength || 0)),
    stamina: Math.min(100, (base.stamina || 0) + (equipment.def || 0) + (temporary.stamina || 0)),
    speed: Math.min(100, (base.speed || 0) + (equipment.spd || 0) + (temporary.speed || 0)),
    dexterity: Math.min(100, (base.dexterity || 0) + (equipment.accuracy || 0) + (temporary.dexterity || 0)),
    stamina: Math.min(100, (base.stamina || 0) + (temporary.stamina || 0)),
    intelligence: Math.min(100, (base.intelligence || 0) + (temporary.intelligence || 0)),
    charisma: Math.min(100, (base.charisma || 0) + (temporary.charisma || 0)),
    spirit: Math.min(100, (base.spirit || 0) + (temporary.spirit || 0))
  };
}

// Function to get effective HP including equipment bonuses
export function getEffectiveMaxHp(character: TeamCharacter): number {
  return character.maxHp + (character.equipmentBonuses.hp || 0);
}

// Function to get effective critical chance including equipment bonuses
export function getEffectiveCriticalChance(character: TeamCharacter): number {
  return Math.min(100, (character.equipmentBonuses.critRate || 0));
}
