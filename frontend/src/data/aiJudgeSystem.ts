// AI Judge System - Hanging Judge for Character Chaos
// Interprets AI-generated chaos and converts it into game mechanics

import { DeviationEvent, DeviationType } from './characterPsychology';
import { TeamCharacter } from './teamBattleSystem';
import { FinancialDecision } from '../services/apiClient';

export interface JudgeDecision {
  ruling: string;                    // The judge's explanation
  mechanical_effect: JudgeEffect;     // How it affects the game
  narrative: string;                 // Flavor text for what happened
  precedent?: string;                // Sets precedent for similar future events
  // Additional properties
  explanation?: string;
  penalty?: any;
}

export interface JudgeEffect {
  type: 'damage' | 'heal' | 'skip_turn' | 'redirect_attack' | 'stat_change' | 'environmental' | 'special';
  target?: 'self' | 'teammate' | 'opponent' | 'all' | 'environment' | 'judges';
  amount?: number;                   // Damage/healing amount
  duration?: number;                 // How many turns the effect lasts
  stat_changes?: {                    // Temporary stat modifications
    stat: string;
    change: number;
    duration: number;
  }[];
  special_effect?: string;            // Custom effects that need manual handling
}

// Financial-specific Judge interfaces
export interface FinancialJudgeDecision {
  ruling: string;
  commentary: string;
  risk_assessment: 'excellent' | 'good' | 'questionable' | 'poor' | 'catastrophic';
  coach_evaluation: 'excellent_guidance' | 'good_advice' | 'missed_opportunity' | 'poor_advice' | 'harmful_guidance';
  intervention_recommendation?: string;
  precedent?: string;
}

export interface FinancialEventContext {
  character_id: string;
  event_type: 'decision' | 'outcome' | 'spiral' | 'intervention' | 'wildcard';
  financial_impact: number;
  stress_level: number;
  spiral_intensity?: number;
  coach_involvement: boolean;
  battle_context?: {
    emotional_state: string;
    trigger_event: string;
    performance_level: string;
  };
}

export interface JudgePersonality {
  name: string;
  style: 'strict' | 'lenient' | 'chaotic' | 'theatrical' | 'logical';
  description: string;
  ruling_tendencies: {
    favors_damage: number;      // 0-100, how much they like damage-based solutions
    favors_creativity: number;  // 0-100, how much they reward creative chaos
    strictness_level: number;   // 0-100, how much they punish deviations
    narrative_focus: number;    // 0-100, how much they prioritize story over mechanics
  };
  financial_tendencies: {
    risk_tolerance: number;     // 0-100, how much they tolerate financial risks
    discipline_focus: number;   // 0-100, how much they value financial discipline
    sympathy_for_struggles: number; // 0-100, how much they understand financial stress
    coach_support_level: number; // 0-100, how much they support coach interventions
  };
}

// System Character Judges - The three authorities that oversee battles
export const judgePersonalities: JudgePersonality[] = [
  {
    name: 'Anubis',
    style: 'strict',
    description: 'Ancient Egyptian god of death and judgment. Weighs actions against the feather of truth.',
    ruling_tendencies: {
      favors_damage: 50,
      favors_creativity: 40,
      strictness_level: 95,
      narrative_focus: 70
    },
    financial_tendencies: {
      risk_tolerance: 30,
      discipline_focus: 90,
      sympathy_for_struggles: 40,
      coach_support_level: 80
    }
  },
  {
    name: 'Eleanor Roosevelt',
    style: 'lenient',
    description: 'Former First Lady and humanitarian. Values compassion, growth, and second chances.',
    ruling_tendencies: {
      favors_damage: 20,
      favors_creativity: 80,
      strictness_level: 30,
      narrative_focus: 85
    },
    financial_tendencies: {
      risk_tolerance: 50,
      discipline_focus: 60,
      sympathy_for_struggles: 95,
      coach_support_level: 90
    }
  },
  {
    name: 'King Solomon',
    style: 'logical',
    description: 'Biblical king renowned for wisdom. Makes balanced, fair judgments based on logic.',
    ruling_tendencies: {
      favors_damage: 45,
      favors_creativity: 65,
      strictness_level: 70,
      narrative_focus: 60
    },
    financial_tendencies: {
      risk_tolerance: 55,
      discipline_focus: 85,
      sympathy_for_struggles: 70,
      coach_support_level: 85
    }
  }
];

// Store previous rulings to maintain consistency
const rulingPrecedents: Map<string, JudgeDecision[]> = new Map();
const financialRulingPrecedents: Map<string, FinancialJudgeDecision[]> = new Map();

// Main judge decision function
export function makeJudgeDecision(
  deviation: DeviationEvent,
  character: TeamCharacter,
  battle_context: {
    current_round: number;
    opponent_character: TeamCharacter;
    teammate_character?: TeamCharacter;
    arena_condition: 'pristine' | 'damaged' | 'destroyed';
  },
  active_judge?: JudgePersonality,
  ai_generated_action?: string
): JudgeDecision {

  const judge = active_judge || getRandomJudge();
  const precedentKey = `${deviation.type}_${judge.name}`;

  // Check for precedents
  const pastRulings = rulingPrecedents.get(precedentKey) || [];

  // Base decision on deviation type and judge personality
  let decision: JudgeDecision;

  if (ai_generated_action) {
    // AI provided specific action - judge interprets it
    decision = interpretAIAction(deviation, ai_generated_action, judge, battle_context, character);
  } else {
    // Standard deviation - use template decision
    decision = getTemplateDecision(deviation, judge, battle_context, character);
  }

  // Store precedent
  pastRulings.push(decision);
  rulingPrecedents.set(precedentKey, pastRulings);

  return decision;
}

// Main financial decision evaluation function
export function makeFinancialJudgeDecision(
  context: FinancialEventContext,
  decision: FinancialDecision,
  outcome?: { success: boolean; actualImpact: number; stress_change: number },
  active_judge?: JudgePersonality
): FinancialJudgeDecision {

  const judge = active_judge || getRandomJudge();
  const precedentKey = `${context.event_type}_${judge.name}`;

  // Check for precedents
  const pastRulings = financialRulingPrecedents.get(precedentKey) || [];

  let judgeDecision: FinancialJudgeDecision;

  if (outcome) {
    // Evaluate completed decision with known outcome
    judgeDecision = evaluateFinancialOutcome(context, decision, outcome, judge);
  } else {
    // Evaluate decision in progress or prevention opportunity
    judgeDecision = evaluateFinancialDecision(context, decision, judge);
  }

  // Store precedent
  pastRulings.push(judgeDecision);
  financialRulingPrecedents.set(precedentKey, pastRulings);

  return judgeDecision;
}

// Interpret AI-generated action into game mechanics
function interpretAIAction(
  deviation: DeviationEvent,
  ai_action: string,
  judge: JudgePersonality,
  battle_context: any,
  character: TeamCharacter
): JudgeDecision {

  const action = ai_action.toLowerCase();
  let effect: JudgeEffect;
  let ruling: string;
  let narrative: string;

  // Pattern matching on AI action to determine mechanical effect
  if (action.includes('attack') && action.includes('everyone')) {
    // Berserker attacking everyone
    effect = {
      type: 'redirect_attack',
      target: 'all',
      amount: Math.floor(character.strength * 0.7) // Reduced damage to all
    };
    ruling = `${judge.name} rules: Berserker rage affects all combatants equally!`;
    narrative = `${character.name} ${ai_action}`;

  } else if (action.includes('refuse') || action.includes("won't fight")) {
    // Pacifist mode
    effect = {
      type: 'skip_turn',
      target: 'self',
      duration: 1
    };
    ruling = `${judge.name} rules: Pacifist stance respected, but turn is forfeit.`;
    narrative = `${character.name} ${ai_action}`;

  } else if (action.includes('teammate') || action.includes('friend')) {
    // Friendly fire
    effect = {
      type: 'redirect_attack',
      target: 'teammate',
      amount: Math.floor(character.strength * 0.8)
    };
    ruling = `${judge.name} rules: Misdirected aggression penalized!`;
    narrative = `${character.name} ${ai_action}`;

  } else if (action.includes('teleport') || action.includes('dimension') || action.includes('escape')) {
    // Dimensional escape
    const escapeSuccessful = Math.random() < 0.6; // 60% chance of success
    if (escapeSuccessful) {
      effect = {
        type: 'special',
        special_effect: 'temporary_removal',
        duration: Math.floor(Math.random() * 3) + 1 // 1-3 rounds
      };
      ruling = `${judge.name} rules: Dimensional travel successful! Character temporarily removed from battle.`;
    } else {
      effect = {
        type: 'damage',
        target: 'self',
        amount: 15 // Backfire damage
      };
      ruling = `${judge.name} rules: Dimensional travel failed! Teleportation backfire!`;
    }
    narrative = `${character.name} ${ai_action}`;

  } else if (action.includes('destroy') || action.includes('arena') || action.includes('environment')) {
    // Environmental destruction
    effect = {
      type: 'environmental',
      special_effect: 'arena_damage',
      amount: 25 // Damage to arena
    };
    ruling = `${judge.name} rules: Environmental destruction noted! Arena repair costs will be deducted!`;
    narrative = `${character.name} ${ai_action}`;

  } else if (action.includes('judge') || action.includes('referee')) {
    // Attacking judges
    effect = {
      type: 'special',
      special_effect: 'judge_threatened',
      amount: 50 // Heavy penalty
    };
    ruling = `${judge.name} rules: CONTEMPT OF COURT! Security intervention required!`;
    narrative = `${character.name} ${ai_action} - Security rushes in!`;

  } else if (action.includes('grass') || action.includes('tree') || action.includes('become')) {
    // Identity crisis transformations
    effect = {
      type: 'stat_change',
      stat_changes: [
        { stat: 'speed', change: -50, duration: 3 },
        { stat: 'defense', change: 20, duration: 3 }
      ]
    };
    ruling = `${judge.name} rules: Identity transformation affects combat capability!`;
    narrative = `${character.name} ${ai_action}`;

  } else {
    // Generic chaos - judge improvises
    effect = interpretGenericChaos(ai_action, judge, character);
    ruling = `${judge.name} rules: Unprecedented action requires creative interpretation!`;
    narrative = `${character.name} ${ai_action}`;
  }

  // Apply judge personality to ruling
  ruling = applyJudgePersonality(ruling, judge, deviation.severity);

  return {
    ruling,
    mechanical_effect: effect,
    narrative,
    precedent: `${deviation.type}: ${effect.type}`
  };
}

// Generate judge-specific verbose commentary based on personality
function getJudgeVerboseCommentary(
  judge: JudgePersonality,
  character: TeamCharacter,
  deviation: DeviationEvent
): { minor: string; major: string; extreme: string; rage: string; unusual: string } {

  switch (judge.name) {
    case 'Anubis':
      return {
        minor: `The scales of Ma'at tip slightly. Your heart grows heavier, ${character.name}.`,
        major: `By the 42 Laws, this defiance darkens your soul! The Devourer stirs...`,
        extreme: `APOPHIS HIMSELF would blush at such betrayal! The underworld awaits the faithless!`,
        rage: `Even Set's fury pales before this madness! The desert winds howl in response!`,
        unusual: `In five thousand years, I have not witnessed such... creativity in chaos.`
      };
    case 'Eleanor Roosevelt':
      return {
        minor: `Remember, ${character.name}, no one can make you feel inferior without your consent - including your coach.`,
        major: `I understand the desire for independence, but true courage is facing your fears, not your allies.`,
        extreme: `Oh my... ${character.name}, the only thing we have to fear is... well, apparently, our own teammates.`,
        rage: `${character.name}, dear, even in my darkest days in the White House, I never saw such passion misdirected.`,
        unusual: `Well, this is certainly not what Franklin and I discussed at Yalta...`
      };
    case 'King Solomon':
      return {
        minor: `A wise warrior knows when to bend like the reed, ${character.name}. Rigidity invites breaking.`,
        major: `Would you divide your own kingdom as I once threatened to divide the child? Think carefully.`,
        extreme: `Even in my court of a thousand wives, I never witnessed such domestic violence! The wisdom of ages weeps!`,
        rage: `The beast within consumes the wisdom without. ${character.name}, you build your house upon sand!`,
        unusual: `I have judged disputes between nations, settled quarrels between kings... but this? This requires a new proverb.`
      };
    default:
      return {
        minor: `This behavior has been noted.`,
        major: `Such insubordination cannot be ignored.`,
        extreme: `This crosses a serious line.`,
        rage: `Uncontrolled fury threatens all.`,
        unusual: `The rulebook has no answer for this.`
      };
  }
}

// Get template decision for standard deviations
function getTemplateDecision(
  deviation: DeviationEvent,
  judge: JudgePersonality,
  battle_context: any,
  character: TeamCharacter
): JudgeDecision {

  let effect: JudgeEffect;
  let ruling: string;
  let narrative: string;

  // Generate judge-specific verbose commentary
  const judgeCommentary = getJudgeVerboseCommentary(judge, character, deviation);

  switch (deviation.type) {
    case 'minor_insubordination':
      effect = {
        type: 'stat_change',
        stat_changes: [{ stat: 'effectiveness', change: -10, duration: 1 }]
      };
      ruling = `${judge.name} rises from the judge's bench: "${character.name} shows minor disregard for coaching orders. ${judgeCommentary.minor}" The crowd murmurs as a slight performance penalty is assessed.`;
      narrative = `${character.name}'s defiance draws ${judge.name}'s attention. ${deviation.description}`;
      break;

    case 'strategy_override':
      effect = {
        type: 'special',
        special_effect: 'lose_strategy_bonuses'
      };
      ruling = `${judge.name} stands dramatically: "COMPLETE INSUBORDINATION! ${character.name} has REJECTED their coach's strategy entirely! ${judgeCommentary.major}" All coaching bonuses are hereby REVOKED for this turn!`;
      narrative = `${character.name} throws the gameplan to the wind! ${deviation.description} The arena falls silent as ${judge.name} delivers judgment.`;
      break;

    case 'friendly_fire':
      effect = {
        type: 'redirect_attack',
        target: 'teammate',
        amount: Math.floor(character.strength * 0.6)
      };
      ruling = `${judge.name} SLAMS the gavel: "FRIENDLY FIRE! ${character.name} has turned their weapon against their own team! ${judgeCommentary.extreme}" This aggression against allies will NOT go unpunished!`;
      narrative = `Gasps echo through the ColosSeaum as ${character.name} strikes their own teammate! ${deviation.description}`;
      break;

    case 'berserker_rage':
      const targets = ['opponent', 'teammate', 'environment'];
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      effect = {
        type: 'redirect_attack',
        target: randomTarget as any,
        amount: Math.floor(character.strength * 1.2) // Stronger but random
      };
      ruling = `${judge.name} watches with ${judge.style === 'strict' ? 'grave concern' : judge.style === 'lenient' ? 'sympathy' : 'fascination'}: "BERSERKER RAGE! ${character.name} has lost all control! ${judgeCommentary.rage}" Their fury redirects to an unpredictable target!`;
      narrative = `${character.name}'s eyes go wild with primal fury! ${deviation.description} Even ${judge.name} leans forward to see what happens next.`;
      break;

    default:
      effect = {
        type: 'special',
        special_effect: 'ai_interpretation_required'
      };
      ruling = `${judge.name} pauses thoughtfully: "This is... unprecedented. ${character.name} has done something beyond our rulebook. ${judgeCommentary.unusual}" I shall deliberate on an appropriate response.`;
      narrative = `Even the ancient ${judge.name} seems surprised by ${character.name}'s actions. ${deviation.description}`;
  }

  ruling = applyJudgePersonality(ruling, judge, deviation.severity);

  return {
    ruling,
    mechanical_effect: effect,
    narrative
  };
}

// Interpret completely chaotic AI actions
function interpretGenericChaos(
  ai_action: string,
  judge: JudgePersonality,
  character: TeamCharacter
): JudgeEffect {

  // Use judge personality to determine interpretation style
  if (judge.ruling_tendencies.favors_damage > 70) {
    // Damage-focused interpretation
    return {
      type: 'damage',
      target: Math.random() > 0.5 ? 'opponent' : 'self',
      amount: Math.floor(Math.random() * 30) + 10
    };
  } else if (judge.ruling_tendencies.favors_creativity > 80) {
    // Creative interpretation
    return {
      type: 'special',
      special_effect: `creative_chaos: ${ai_action.substring(0, 50)}`,
      duration: Math.floor(Math.random() * 3) + 1
    };
  } else {
    // Balanced interpretation
    return {
      type: 'stat_change',
      stat_changes: [
        {
          stat: ['strength', 'speed', 'defense'][Math.floor(Math.random() * 3)],
          change: (Math.random() - 0.5) * 40, // -20 to +20
          duration: 2
        }
      ]
    };
  }
}

// Apply judge personality to ruling text
function applyJudgePersonality(
  base_ruling: string,
  judge: JudgePersonality,
  severity: 'minor' | 'moderate' | 'major' | 'extreme'
): string {

  let personalityFlavor = '';

  switch (judge.style) {
    case 'strict':
      personalityFlavor = severity === 'extreme' ? ' UNACCEPTABLE CONDUCT!' :
        severity === 'major' ? ' This disruption will not be tolerated!' :
          ' Maintain discipline, combatant.';
      break;

    case 'chaotic':
      personalityFlavor = severity === 'extreme' ? ' NOW WE\'RE COOKING WITH FIRE!' :
        severity === 'major' ? ' I LOVE the creativity!' :
          ' Spice things up, why don\'t you?';
      break;

    case 'theatrical':
      personalityFlavor = severity === 'extreme' ? ' LADIES AND GENTLEMEN, WITNESS PURE CHAOS!' :
        severity === 'major' ? ' What a spectacular display!' :
          ' The crowd is on the edge of their seats!';
      break;

    case 'logical':
      personalityFlavor = severity === 'extreme' ? ' Probability calculations indicate unprecedented outcomes.' :
        severity === 'major' ? ' Logical analysis suggests adaptive ruling required.' :
          ' Standard protocols apply.';
      break;

    case 'lenient':
      personalityFlavor = severity === 'extreme' ? ' While concerning, we must show understanding.' :
        severity === 'major' ? ' Perhaps rehabilitation rather than punishment?' :
          ' Everyone deserves a second chance.';
      break;
  }

  return base_ruling + personalityFlavor;
}

// Get random judge for variety
export function getRandomJudge(): JudgePersonality {
  return judgePersonalities[Math.floor(Math.random() * judgePersonalities.length)];
}

// Generate AI prompt for character going rogue
export function generateDeviationPrompt(
  character: TeamCharacter,
  deviation: DeviationEvent,
  battle_context: {
    current_round: number;
    opponent_name: string;
    teammate_name?: string;
    current_situation: string;
  }
): string {

  const basePrompt = `
You are ${character.name}, a ${character.archetype} in the middle of an intense battle.

Current Situation: ${battle_context.current_situation}
Round: ${battle_context.current_round}
Opponent: ${battle_context.opponent_name}
${battle_context.teammate_name ? `Teammate: ${battle_context.teammate_name}` : ''}

Your psychological state has deteriorated and you are experiencing: ${deviation.description}

Your personality:
- Archetype: ${character.archetype}
- Mental state: Highly unstable
- Current crisis: ${deviation.type.replace('_', ' ')}

Describe in 1-2 sentences exactly what chaotic action you take right now. Be creative and embrace the unpredictability, but stay true to your character archetype.

Examples based on your crisis type:
${getDeviationExamples(deviation.type, character.archetype)}

Your action:`;

  return basePrompt;
}

// Financial evaluation helper functions
function evaluateFinancialOutcome(
  context: FinancialEventContext,
  decision: FinancialDecision,
  outcome: { success: boolean; actualImpact: number; stress_change: number },
  judge: JudgePersonality
): FinancialJudgeDecision {

  const riskAssessment = assessRiskLevel(decision, outcome, judge);
  const coachEvaluation = evaluateCoachPerformance(decision, outcome, judge);
  const ruling = generateFinancialRuling(context, decision, outcome, judge);
  const commentary = generateFinancialCommentary(context, decision, outcome, judge);

  return {
    ruling,
    commentary,
    risk_assessment: riskAssessment,
    coach_evaluation: coachEvaluation,
    intervention_recommendation: shouldRecommendIntervention(context, outcome, judge) ?
      generateInterventionRecommendation(context, judge) : undefined,
    precedent: `${context.event_type}: ${riskAssessment}_outcome`
  };
}

function evaluateFinancialDecision(
  context: FinancialEventContext,
  decision: FinancialDecision,
  judge: JudgePersonality
): FinancialJudgeDecision {

  // Evaluate decision potential without knowing outcome
  const riskAssessment = assessDecisionRisk(decision, context, judge);
  const coachEvaluation = evaluateCoachAdvice(decision, judge);
  const ruling = generateDecisionRuling(context, decision, judge);
  const commentary = generateDecisionCommentary(context, decision, judge);

  return {
    ruling,
    commentary,
    risk_assessment: riskAssessment,
    coach_evaluation: coachEvaluation,
    intervention_recommendation: shouldRecommendPreventiveIntervention(context, decision, judge) ?
      generateInterventionRecommendation(context, judge) : undefined,
    precedent: `${context.event_type}: ${riskAssessment}_decision`
  };
}

function assessRiskLevel(
  decision: FinancialDecision,
  outcome: { success: boolean; actualImpact: number; stress_change: number },
  judge: JudgePersonality
): 'excellent' | 'good' | 'questionable' | 'poor' | 'catastrophic' {

  const impactSeverity = Math.abs(outcome.actualImpact);
  const stressSeverity = Math.abs(outcome.stress_change);

  if (outcome.success && outcome.actualImpact > 0 && outcome.stress_change <= 0) {
    return 'excellent';
  } else if (outcome.success && stressSeverity <= 10) {
    return 'good';
  } else if (!outcome.success && stressSeverity <= 20) {
    return 'questionable';
  } else if (!outcome.success && stressSeverity <= 40) {
    return 'poor';
  } else {
    return 'catastrophic';
  }
}

function evaluateCoachPerformance(
  decision: FinancialDecision,
  outcome: { success: boolean; actualImpact: number; stress_change: number },
  judge: JudgePersonality
): 'excellent_guidance' | 'good_advice' | 'missed_opportunity' | 'poor_advice' | 'harmful_guidance' {

  if (!decision.coach_advice) {
    return outcome.success ? 'missed_opportunity' : 'missed_opportunity';
  }

  if (decision.followed_advice) {
    if (outcome.success && outcome.stress_change <= 0) {
      return 'excellent_guidance';
    } else if (outcome.success) {
      return 'good_advice';
    } else if (outcome.stress_change > 30) {
      return 'harmful_guidance';
    } else {
      return 'poor_advice';
    }
  } else {
    // Ignored advice
    if (outcome.success) {
      return judge.financial_tendencies.coach_support_level > 70 ? 'missed_opportunity' : 'good_advice';
    } else {
      return 'excellent_guidance'; // Coach was right to warn
    }
  }
}

function assessDecisionRisk(
  decision: FinancialDecision,
  context: FinancialEventContext,
  judge: JudgePersonality
): 'excellent' | 'good' | 'questionable' | 'poor' | 'catastrophic' {

  const risk_factors = [
    decision.amount > 10000 ? 20 : 0,
    context.stress_level > 70 ? 30 : 0,
    context.spiral_intensity && context.spiral_intensity > 50 ? 25 : 0,
    !decision.coach_advice && context.stress_level > 50 ? 15 : 0,
    context.battle_context ? 10 : 0 // Battle emotions add risk
  ];

  const totalRisk = risk_factors.reduce((sum, factor) => sum + factor, 0);

  if (totalRisk <= 10) return 'excellent';
  if (totalRisk <= 25) return 'good';
  if (totalRisk <= 50) return 'questionable';
  if (totalRisk <= 75) return 'poor';
  return 'catastrophic';
}

function evaluateCoachAdvice(
  decision: FinancialDecision,
  judge: JudgePersonality
): 'excellent_guidance' | 'good_advice' | 'missed_opportunity' | 'poor_advice' | 'harmful_guidance' {

  if (!decision.coach_advice) {
    return 'missed_opportunity';
  }

  // Evaluate advice quality based on judge's perspective
  if (judge.financial_tendencies.coach_support_level > 80) {
    return decision.followed_advice ? 'excellent_guidance' : 'good_advice';
  } else if (judge.financial_tendencies.coach_support_level > 60) {
    return 'good_advice';
  } else {
    return 'missed_opportunity';
  }
}

function shouldRecommendIntervention(
  context: FinancialEventContext,
  outcome: { success: boolean; actualImpact: number; stress_change: number },
  judge: JudgePersonality
): boolean {

  return (
    (context.spiral_intensity && context.spiral_intensity > 60) ||
    (outcome.stress_change > 25 && judge.financial_tendencies.sympathy_for_struggles > 70) ||
    (!outcome.success && outcome.stress_change > 40)
  );
}

function shouldRecommendPreventiveIntervention(
  context: FinancialEventContext,
  decision: FinancialDecision,
  judge: JudgePersonality
): boolean {

  return (
    (context.stress_level > 80 && judge.financial_tendencies.sympathy_for_struggles > 60) ||
    (context.spiral_intensity && context.spiral_intensity > 70) ||
    (decision.amount > 15000 && context.stress_level > 60)
  );
}

function generateInterventionRecommendation(
  context: FinancialEventContext,
  judge: JudgePersonality
): string {

  if (context.spiral_intensity && context.spiral_intensity > 70) {
    return judge.financial_tendencies.coach_support_level > 80 ?
      'Emergency coaching intervention required - spiral pattern detected' :
      'Cooling-off period recommended before further decisions';
  } else if (context.stress_level > 80) {
    return 'Stress management support needed before continuing financial decisions';
  } else {
    return 'Coach consultation recommended for next major financial decision';
  }
}

function generateFinancialRuling(
  context: FinancialEventContext,
  decision: FinancialDecision,
  outcome: { success: boolean; actualImpact: number; stress_change: number },
  judge: JudgePersonality
): string {

  const baseRuling = outcome.success ?
    `${judge.name} rules: Financial decision resulted in positive outcome` :
    `${judge.name} rules: Financial decision resulted in negative consequences`;

  return applyJudgePersonalityToFinancial(baseRuling, judge, context, outcome);
}

function generateFinancialCommentary(
  context: FinancialEventContext,
  decision: FinancialDecision,
  outcome: { success: boolean; actualImpact: number; stress_change: number },
  judge: JudgePersonality
): string {

  let commentary = '';

  if (context.battle_context) {
    commentary += `Battle emotions clearly influenced this ${decision.category} decision. `;
  }

  if (decision.followed_advice && outcome.success) {
    commentary += 'Coach guidance proved valuable. ';
  } else if (!decision.followed_advice && !outcome.success) {
    commentary += 'Perhaps coach consultation would have helped. ';
  }

  if (outcome.stress_change > 20) {
    commentary += 'The psychological impact requires attention. ';
  }

  return commentary.trim() || 'Standard financial decision processing.';
}

function generateDecisionRuling(
  context: FinancialEventContext,
  decision: FinancialDecision,
  judge: JudgePersonality
): string {

  const baseRuling = context.stress_level > 70 ?
    `${judge.name} observes: High-stress financial decision in progress` :
    `${judge.name} observes: Financial decision under evaluation`;

  return applyJudgePersonalityToFinancial(baseRuling, judge, context);
}

function generateDecisionCommentary(
  context: FinancialEventContext,
  decision: FinancialDecision,
  judge: JudgePersonality
): string {

  let commentary = '';

  if (context.battle_context) {
    commentary += `Battle-triggered financial decision detected. ${judge.financial_tendencies.risk_tolerance > 70 ? 'Emotional decisions can be enlightening' : 'Emotional decisions require caution'}. `;
  }

  if (!decision.coach_advice && context.stress_level > 60) {
    commentary += 'Coach consultation could provide valuable perspective. ';
  }

  if (context.spiral_intensity && context.spiral_intensity > 50) {
    commentary += 'Spiral pattern detected - intervention may be warranted. ';
  }

  return commentary.trim() || 'Monitoring financial decision progress.';
}

function applyJudgePersonalityToFinancial(
  base_ruling: string,
  judge: JudgePersonality,
  context: FinancialEventContext,
  outcome?: { success: boolean; actualImpact: number; stress_change: number }
): string {

  let personalityFlavor = '';

  const severity = outcome ?
    (outcome.stress_change > 30 ? 'extreme' : outcome.stress_change > 15 ? 'major' : 'minor') :
    (context.stress_level > 80 ? 'extreme' : context.stress_level > 60 ? 'major' : 'minor');

  switch (judge.style) {
    case 'strict':
      personalityFlavor = severity === 'extreme' ? ' FINANCIAL DISCIPLINE MUST BE RESTORED!' :
        severity === 'major' ? ' Better money management is required!' :
          ' Maintain financial responsibility.';
      break;

    case 'chaotic':
      personalityFlavor = severity === 'extreme' ? ' MAGNIFICENT FINANCIAL CHAOS!' :
        severity === 'major' ? ' Love the bold money moves!' :
          ' Spice up those investment choices!';
      break;

    case 'theatrical':
      personalityFlavor = severity === 'extreme' ? ' BEHOLD THE DRAMA OF FINANCIAL RUIN!' :
        severity === 'major' ? ' What a spectacular monetary gamble!' :
          ' The audience watches your financial choices with bated breath!';
      break;

    case 'logical':
      personalityFlavor = severity === 'extreme' ? ' Probability analysis indicates severe financial distress.' :
        severity === 'major' ? ' Risk assessment suggests corrective measures.' :
          ' Financial data processing complete.';
      break;

    case 'lenient':
      personalityFlavor = severity === 'extreme' ? ' Everyone faces financial challenges - support is available.' :
        severity === 'major' ? ' Money troubles are temporary with proper guidance.' :
          ' Financial learning is part of growth.';
      break;
  }

  return base_ruling + personalityFlavor;
}

function getDeviationExamples(type: DeviationType, archetype: TeamCharacter['archetype']): string {
  switch (type) {
    case 'berserker_rage':
      return archetype === 'beast' ?
        '- "I roar and start clawing at everything - my opponent, my teammate, even the arena walls!"' :
        '- "I see red and swing my weapon wildly at anyone within reach!"';

    case 'identity_crisis':
      return archetype === 'mage' ?
        '- "I suddenly believe I am a peaceful butterfly and start trying to pollinate the arena flowers."' :
        '- "I become convinced I\'m actually the referee and start trying to call fouls on everyone."';

    case 'dimensional_escape':
      return '- "I attempt to open a portal to the snack dimension to escape this madness!"';

    case 'environmental_chaos':
      return '- "I start attacking the arena\'s support pillars because they\'re clearly the real enemy!"';

    default:
      return '- Be creative and unpredictable while staying true to your character!';
  }
}