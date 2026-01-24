// AI Character Psychology & Breakdown System
// The revolutionary system that turns AI unpredictability into gameplay

import { TeamCharacter } from './teamBattleSystem';

export interface CoachBonuses {
  gameplan_adherence_bonus: number;      // Bonus to checkGameplanAdherence()
  deviation_risk_reduction: number;      // Reduction to calculateDeviationRisk()
  team_chemistry_bonus: number;          // Bonus to calculateTeamChemistry()
  battle_xpmultiplier: number;          // Multiplier for battle XP
  character_development_multiplier: number; // Multiplier for character development XP
}

export interface PsychologyState {
  // Core Stability Metrics (0-100)
  mental_stability: number;    // How stable the character is
  confidence: number;         // Current confidence level
  stress: number;            // Current stress level (higher = worse)
  team_harmony: number;       // How well they get along with teammates

  // Battle-Specific States
  battle_focus: number;       // How focused they are on the current battle
  strategic_alignment: number; // How much they agree with coach's strategy
  pain_tolerance: number;     // How well they handle taking damage

  // Personality Modifiers
  volatility: number;        // How likely they are to have extreme reactions (0-100)
  independence: number;      // How much they prefer doing their own thing (0-100)
  leadership: number;        // How much they want to take control (0-100)
}

export interface StabilityFactors {
  // Positive Factors (improve stability)
  recent_victories: number;   // Recent wins boost confidence
  good_team_work: number;      // Working well with team
  strategic_success: number;  // Coach's strategies working
  optimal_health: number;     // Character is at high HP

  // Negative Factors (reduce stability)
  recent_defeats: number;     // Recent losses hurt confidence
  team_conflicts: number;     // Disagreements with teammates
  strategic_failures: number; // Coach's strategies failing
  low_health: number;         // Character is badly wounded
  overwhelming: number;      // Facing much stronger opponents
}

export type DeviationType =
  | 'minor_insubordination'    // Slightly ignore strategy
  | 'strategy_override'        // Completely ignore strategy 
  | 'friendly_fire'           // Attack teammate instead of enemy
  | 'pacifist_mode'           // Refuse to fight
  | 'berserker_rage'          // Attack everyone indiscriminately
  | 'identity_crisis'         // Become something else entirely
  | 'dimensional_escape'      // Try to leave the battle arena
  | 'environmental_chaos'     // Attack the environment/judges
  | 'complete_breakdown';     // Total psychological collapse

export interface DeviationEvent {
  character_id: string;
  type: DeviationType;
  severity: 'minor' | 'moderate' | 'major' | 'extreme';
  description: string;
  gameplay_effect: string;
  ai_generated_action?: string; // What the AI decided to do
  judge_ruling?: string;       // How the judge interpreted it
  timestamp: Date;
  duration?: number;
  // Additional properties
  hasDeviation?: boolean;
  deviation?: any;
  start_round?: number;
}

export interface DeviationRisk {
  character: TeamCharacter;
  current_risk: number;        // 0-100, chance of deviation this turn
  risk_factors: string[];      // What's contributing to the risk
  potential_deviations: {
    type: DeviationType;
    probability: number;
    description: string;
  }[];
}

// Relationship-based deviation modifiers
export interface CharacterRelationship {
  character_id: string;
  relationship: 'ally' | 'rival' | 'enemy' | 'neutral' | 'romantic' | 'mentor' | 'protege';
  strength: number; // -100 to +100, negative = hate, positive = love
  reason?: string;  // Why they have this relationship
}

export function calculateRelationshipStress(
  character: TeamCharacter,
  teammates: TeamCharacter[]
): { stress: number, risk_factors: string[], friendly_fire_targets: string[] } {
  let relationshipStress = 0;
  const risk_factors: string[] = [];
  const friendly_fire_targets: string[] = [];

  // Check relationships with current teammates
  teammates.forEach(teammate => {
    if (teammate.id === character.id) return;

    // Look for relationship in character's personality data
    const relationship = character.personality_traits?.find(trait =>
      trait.includes(teammate.name) || trait.includes(teammate.id)
    );

    // Check for known character conflicts (hardcoded for now)
    // Replaced with simple check if teammates have low team_trust
    if (character.team_trust < 30) {
      relationshipStress += 10;
      risk_factors.push(`Low trust in ${teammate.name}`);
    }
  });

  return { stress: relationshipStress, risk_factors, friendly_fire_targets };
}

// Initialize psychology state for a character
export function initializePsychologyState(
  character: TeamCharacter,
  headquarters_effects?: { bonuses: Record<string, number>, penalties: Record<string, number> },
  teammates?: TeamCharacter[]
): PsychologyState {
  const psych_stats = character.psych_stats;

  // Calculate environmental stress from living conditions
  let environmentalStress = 0;
  let team_chemistryPenalty = 0;
  let mental_stability_penalty = 0;

  if (headquarters_effects?.penalties) {
    // Convert headquarters penalties to psychology effects
    const moralePenalty = headquarters_effects.penalties['Morale'] || 0;
    const teamworkPenalty = headquarters_effects.penalties['Teamwork'] || 0;
    const allStatsPenalty = headquarters_effects.penalties['All Stats'] || 0;

    const baseDormStress = Math.abs(moralePenalty) * 2;
    environmentalStress = baseDormStress;

    const baseTeamPenalty = Math.abs(teamworkPenalty);
    team_chemistryPenalty = baseTeamPenalty;

    mental_stability_penalty = Math.abs(allStatsPenalty) * 1.5;
  }

  // Calculate relationship stress with teammates
  let relationshipStress = 0;
  if (teammates && teammates.length > 0) {
    const relationshipData = calculateRelationshipStress(character, teammates);
    relationshipStress = relationshipData.stress;
    // Additional team chemistry penalty from bad relationships
    team_chemistryPenalty += relationshipStress * 0.3;
  }

  return {
    // Mental stability: base health - environmental damage
    mental_stability: Math.max(0,
      psych_stats.mental_health -
      mental_stability_penalty
    ),

    confidence: character.current_confidence,

    // Stress: environmental + relationship
    stress: Math.max(5, Math.min(100,
      character.current_stress +
      environmentalStress +
      relationshipStress
    )),

    // Team harmony: base team_player - conflicts
    team_harmony: Math.max(0,
      psych_stats.team_player -
      team_chemistryPenalty
    ),

    // Battle focus: training - stress effects
    battle_focus: Math.max(0,
      character.battle_focus -
      (environmentalStress * 0.2)
    ),

    // Strategic alignment: training effectiveness - team conflicts
    strategic_alignment: Math.max(0,
      psych_stats.training -
      (team_chemistryPenalty * 0.3)
    ),

    pain_tolerance: 50 + psych_stats.mental_health / 2,

    // Volatility: derived from ego and mental health
    volatility: Math.max(5, Math.min(100,
      psych_stats.ego -
      (psych_stats.mental_health * 0.5) +
      (environmentalStress * 0.3)
    )),

    independence: psych_stats.ego,
    leadership: Math.min(100, psych_stats.ego + psych_stats.communication)
  };
}

// Calculate current stability factors affecting a character
export function calculateStabilityFactors(
  character: TeamCharacter,
  battle_context: {
    recent_damage: number;
    team_performance: number;
    strategy_success_rate: number;
    opponent_levelDifference: number;
    rounds_won: number;
    rounds_lost: number;
  }
): StabilityFactors {
  return {
    // Positive factors
    recent_victories: Math.max(0, battle_context.rounds_won * 20 - battle_context.rounds_lost * 10),
    good_team_work: battle_context.team_performance,
    strategic_success: battle_context.strategy_success_rate,
    optimal_health: Math.max(0, (character.current_health / character.max_health) * 100 - 50) * 2,

    // Negative factors
    recent_defeats: Math.max(0, battle_context.rounds_lost * 25 - battle_context.rounds_won * 5),
    team_conflicts: Math.max(0, 50 - battle_context.team_performance),
    strategic_failures: Math.max(0, 75 - battle_context.strategy_success_rate),
    low_health: Math.max(0, 75 - (character.current_health / character.max_health) * 100),
    overwhelming: Math.max(0, battle_context.opponent_levelDifference * 15) // Each level difference adds stress
  };
}

// Update psychology state based on battle events
export function updatePsychologyState(
  current_state: PsychologyState,
  factors: StabilityFactors,
  event?: 'damage_taken' | 'damage_dealt' | 'teammate_helped' | 'strategy_ignored' | 'victory' | 'defeat'
): PsychologyState {
  const newState = { ...current_state };

  // Apply stability factors
  const stabilityChange = (
    factors.recent_victories + factors.good_team_work + factors.strategic_success + factors.optimal_health
  ) - (
      factors.recent_defeats + factors.team_conflicts + factors.strategic_failures + factors.low_health + factors.overwhelming
    );

  newState.mental_stability = Math.max(0, Math.min(100, newState.mental_stability + stabilityChange * 0.1));

  // Event-specific updates
  switch (event) {
    case 'damage_taken':
      newState.stress = Math.min(100, newState.stress + 10);
      newState.confidence = Math.max(0, newState.confidence - 5);
      newState.pain_tolerance = Math.max(0, newState.pain_tolerance - 3);
      break;

    case 'damage_dealt':
      newState.confidence = Math.min(100, newState.confidence + 8);
      newState.stress = Math.max(0, newState.stress - 5);
      break;

    case 'teammate_helped':
      newState.team_harmony = Math.min(100, newState.team_harmony + 10);
      newState.strategic_alignment = Math.min(100, newState.strategic_alignment + 5);
      break;

    case 'strategy_ignored':
      newState.strategic_alignment = Math.max(0, newState.strategic_alignment - 15);
      newState.independence = Math.min(100, newState.independence + 10);
      break;

    case 'victory':
      newState.confidence = Math.min(100, newState.confidence + 20);
      newState.stress = Math.max(0, newState.stress - 15);
      newState.mental_stability = Math.min(100, newState.mental_stability + 10);
      break;

    case 'defeat':
      newState.confidence = Math.max(0, newState.confidence - 15);
      newState.stress = Math.min(100, newState.stress + 20);
      newState.mental_stability = Math.max(0, newState.mental_stability - 5);
      break;
  }

  return newState;
}

// ARCHIVED: calculateDeviationRisk was doing frontend calculation
// Deviation risk is now calculated by backend adherenceCalculationService.ts
// Callers should use the backend API instead

// Check if character follows gameplan based on psychology and coach bonuses
export function checkGameplanAdherence(
  character: TeamCharacter,
  psych_state: PsychologyState,
  gameplan_complexity: number = 50, // 0-100, how complex the strategy is
  coach_bonuses?: CoachBonuses
): { adherence: number; willFollow: boolean; reason: string } {
  // Base adherence calculation
  let baseAdherence = psych_state.strategic_alignment;

  // Adjust for character independence (high independence = lower adherence)
  const independencePenalty = (psych_state.independence - 50) * 0.3;
  baseAdherence -= independencePenalty;

  // Adjust for gameplan complexity (complex plans harder to follow)
  const complexityPenalty = (gameplan_complexity - 50) * 0.2;
  baseAdherence -= complexityPenalty;

  // Apply coach bonuses
  if (coach_bonuses) {
    const adherenceBonus = coach_bonuses.gameplan_adherence_bonus;
    baseAdherence += adherenceBonus;
  }

  // Final adherence calculation
  const finalAdherence = Math.max(0, Math.min(100, baseAdherence));
  const willFollow = finalAdherence >= 60; // 60% threshold for following gameplan

  // Determine reason for adherence/non-adherence
  let reason = '';
  if (willFollow) {
    if (coach_bonuses && coach_bonuses.gameplan_adherence_bonus > 0) {
      reason = `Coach experience (+${coach_bonuses.gameplan_adherence_bonus}%) helps maintain discipline`;
    } else if (finalAdherence >= 80) {
      reason = 'High strategic alignment and discipline';
    } else {
      reason = 'Adequate strategic understanding';
    }
  } else {
    if (independencePenalty > 20) {
      reason = 'Too independent to follow complex strategies';
    } else if (complexityPenalty > 15) {
      reason = 'Strategy too complex for current mindset';
    } else {
      reason = 'Low strategic alignment with coaching';
    }
  }

  return {
    adherence: finalAdherence,
    willFollow,
    reason
  };
}

// Calculate team chemistry with coach bonuses
export function calculateTeamChemistry(
  characters: TeamCharacter[],
  coach_bonuses?: CoachBonuses
): { chemistry: number; factors: string[]; risk_factors: string[] } {
  if (characters.length === 0) {
    return { chemistry: 0, factors: [], risk_factors: [] };
  }

  let totalChemistry = 0;
  const factors: string[] = [];
  const risk_factors: string[] = [];

  // Calculate average team harmony
  const avgTeamHarmony = characters.reduce((sum, char) => {
    const psych_stats = char.psych_stats || { team_player: 50 } as any;
    return sum + (psych_stats.team_player || 50);
  }, 0) / characters.length;

  totalChemistry += avgTeamHarmony;
  factors.push(`Average team harmony: ${avgTeamHarmony.toFixed(1)}`);

  // Check for relationship conflicts (simplified)
  let relationshipPenalty = 0;
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      // Use team_trust as a proxy for relationship
      if (characters[i].team_trust < 30 || characters[j].team_trust < 30) {
        relationshipPenalty += 10;
        risk_factors.push(`${characters[i].name} / ${characters[j].name} friction`);
      }
    }
  }

  totalChemistry -= relationshipPenalty;
  if (relationshipPenalty > 0) {
    factors.push(`Relationship conflicts: -${relationshipPenalty.toFixed(1)}`);
  }

  // Apply coach bonuses
  if (coach_bonuses) {
    const chemistryBonus = coach_bonuses.team_chemistry_bonus;
    totalChemistry += chemistryBonus;
    if (chemistryBonus > 0) {
      factors.push(`Coach team management: +${chemistryBonus}`);
    }
  }

  // Final chemistry calculation
  const finalChemistry = Math.max(0, Math.min(100, totalChemistry));

  return {
    chemistry: finalChemistry,
    factors,
    risk_factors
  };
}

// Get potential deviation types based on character and state
function getPotentialDeviations(
  character: TeamCharacter,
  psych_state: PsychologyState,
  risk_level: number,
  friendly_fire_targets: string[] = []
): DeviationRisk['potential_deviations'] {
  const deviations: DeviationRisk['potential_deviations'] = [];

  if (risk_level < 20) return deviations; // No risk if below threshold

  // Minor deviations (always possible at low risk)
  if (risk_level > 15) {
    deviations.push({
      type: 'minor_insubordination',
      probability: Math.min(50, risk_level),
      description: 'Might slightly modify the coach\'s strategy'
    });
  }

  // Strategy override (independent characters more likely)
  if (risk_level > 25) {
    const probability = risk_level * (psych_state.independence / 100);
    deviations.push({
      type: 'strategy_override',
      probability,
      description: 'Could completely ignore coaching and do their own thing'
    });
  }

  // BERSERKER RAGE - based on ego/volatility
  if (risk_level > 25 && psych_state.volatility > 70) {
    const berserkerProbability = (risk_level * psych_state.volatility) / 200;
    deviations.push({
      type: 'berserker_rage',
      probability: berserkerProbability,
      description: 'Uncontrolled rage takes over, attacking everyone in sight'
    });
  }

  // ENVIRONMENTAL CHAOS - wild archetypes love destruction
  if (risk_level > 30 && psych_state.volatility > 80) {
    deviations.push({
      type: 'environmental_chaos',
      probability: risk_level * 0.7,
      description: 'Starts attacking the environment in rage'
    });
  }

  // FRIENDLY FIRE - tricksters, unstable archetypes, or character hatred
  const hasFriendlyFireTargets = friendly_fire_targets.length > 0;
  if (risk_level > 35 && (character.archetype === 'trickster' || psych_state.team_harmony < 40 || hasFriendlyFireTargets)) {
    const probability = hasFriendlyFireTargets ?
      Math.min(80, risk_level + 20) :
      Math.min(40, risk_level * 0.5);

    deviations.push({
      type: 'friendly_fire',
      probability,
      description: hasFriendlyFireTargets ?
        'Likely to attack specific hated teammates' :
        'Might lash out at teammates in confusion'
    });
  }

  // COMPLETE BREAKDOWN - extreme stress
  if (risk_level > 80 && psych_state.mental_stability < 10) {
    deviations.push({
      type: 'complete_breakdown',
      probability: 90,
      description: 'Total psychological collapse imminent'
    });
  }

  return deviations;
}

// Helper function for rollForDeviation (kept for compatibility)
export function rollForDeviation(deviationRisk: DeviationRisk): { hasDeviation: boolean; deviation?: DeviationEvent } {
  const roll = Math.random() * 100;

  if (roll < deviationRisk.current_risk) {
    // Deviation occurred! Pick one based on probability weights
    const deviations = deviationRisk.potential_deviations;
    if (deviations.length === 0) return { hasDeviation: false };

    // Simple weighted random selection
    const totalWeight = deviations.reduce((sum, d) => sum + d.probability, 0);
    let randomWeight = Math.random() * totalWeight;

    for (const dev of deviations) {
      randomWeight -= dev.probability;
      if (randomWeight <= 0) {
        return {
          hasDeviation: true,
          deviation: {
            character_id: deviationRisk.character.id,
            type: dev.type,
            severity: deviationRisk.current_risk > 70 ? 'major' : deviationRisk.current_risk > 40 ? 'moderate' : 'minor',
            description: dev.description,
            gameplay_effect: dev.type, // Simplified
            timestamp: new Date(),
            duration: 1 // Default 1 round
          }
        };
      }
    }

    // Fallback if something weird happened with weights
    return {
      hasDeviation: true,
      deviation: {
        character_id: deviationRisk.character.id,
        type: deviations[0].type,
        severity: 'minor',
        description: deviations[0].description,
        gameplay_effect: deviations[0].type,
        timestamp: new Date(),
        duration: 1
      }
    };
  }

  return { hasDeviation: false };
}