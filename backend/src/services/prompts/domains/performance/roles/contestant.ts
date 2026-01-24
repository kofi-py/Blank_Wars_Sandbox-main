/**
 * Performance domain - Contestant role builder
 * ROLE = How you behave, who's present, response rules
 *
 * Receives character data and options, builds prose for role context + domain-specific rules.
 */

import type { CharacterData, Roommate, Relationship, Teammate, PerformanceBuildOptions } from '../../../types';

/**
 * Builds a description of the roommate including relationship sentiment.
 * STRICT MODE: relationship stats must be present if relationship exists
 */
function describeRoommate(roommate: Roommate, relationships: Relationship[]): string {
  const rel = relationships.find(r => r.character_id === roommate.character_id);

  if (!rel) {
    return roommate.name;
  }

  // STRICT MODE: If relationship exists, stats must be defined
  if (rel.affection === undefined || rel.affection === null) {
    throw new Error(`STRICT MODE: Missing affection for relationship with ${roommate.name}`);
  }
  if (rel.rivalry === undefined || rel.rivalry === null) {
    throw new Error(`STRICT MODE: Missing rivalry for relationship with ${roommate.name}`);
  }

  const affection = rel.affection;
  const rivalry = rel.rivalry;

  let sentiment: string;
  if (affection > 70) {
    sentiment = 'you like a lot';
  } else if (affection > 50) {
    sentiment = 'you get along with';
  } else if (affection < 30 && rivalry > 50) {
    sentiment = 'you have tension with';
  } else if (affection < 30) {
    sentiment = 'you find annoying';
  } else {
    sentiment = 'you have neutral feelings about';
  }

  return `${roommate.name} (${sentiment})`;
}

/**
 * Build win/loss assessment prose
 */
function buildPerformanceAssessment(wins: number, losses: number, total: number): string {
  if (total === 0) {
    return `You haven't fought any battles yet. Your coach is working with you to prepare for your first fight.`;
  }

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  if (winRate >= 80) {
    return `You're dominating with ${wins} wins and only ${losses} losses (${winRate.toFixed(0)}% win rate). Your coach wants to keep you sharp and identify any overconfidence that might lead to a fall.`;
  } else if (winRate >= 60) {
    return `You're performing well with ${wins} wins and ${losses} losses (${winRate.toFixed(0)}% win rate). Your coach sees potential but wants to close the gap on those losses.`;
  } else if (winRate >= 40) {
    return `You're struggling with ${wins} wins and ${losses} losses (${winRate.toFixed(0)}% win rate). Your coach is concerned and wants to identify what's going wrong.`;
  } else if (winRate >= 20) {
    return `You're in trouble with only ${wins} wins and ${losses} losses (${winRate.toFixed(0)}% win rate). Your coach is worried about your future on the team.`;
  } else {
    return `You're in crisis with ${wins} wins and ${losses} losses (${winRate.toFixed(0)}% win rate). Your coach needs to have a serious conversation about whether this is working.`;
  }
}

/**
 * Build psychological state prose for receiving feedback
 * STRICT MODE: All psych stats must be present
 */
function buildFeedbackReceptiveness(psych: CharacterData['PSYCHOLOGICAL']): string {
  // STRICT MODE validation
  if (psych.current_ego === undefined || psych.current_ego === null) {
    throw new Error('STRICT MODE: Missing current_ego for performance feedback');
  }
  if (psych.current_confidence === undefined || psych.current_confidence === null) {
    throw new Error('STRICT MODE: Missing current_confidence for performance feedback');
  }
  if (psych.coach_trust_level === undefined || psych.coach_trust_level === null) {
    throw new Error('STRICT MODE: Missing coach_trust_level for performance feedback');
  }
  if (psych.current_stress === undefined || psych.current_stress === null) {
    throw new Error('STRICT MODE: Missing current_stress for performance feedback');
  }
  if (psych.current_fatigue === undefined || psych.current_fatigue === null) {
    throw new Error('STRICT MODE: Missing current_fatigue for performance feedback');
  }

  const ego = psych.current_ego;
  const confidence = psych.current_confidence;
  const coachTrust = psych.coach_trust_level;
  const stress = psych.current_stress;
  const fatigue = psych.current_fatigue;

  const parts: string[] = [];

  // Ego affects defensiveness
  if (ego > 70) {
    parts.push(`Your HIGH ego (${ego}) makes you defensive about criticism. You tend to deflect blame, make excuses, or dismiss feedback as uninformed.`);
  } else if (ego < 30) {
    parts.push(`Your LOW ego (${ego}) makes you overly self-critical. You might spiral into negative self-talk or catastrophize about your performance.`);
  } else {
    parts.push(`Your balanced ego (${ego}) helps you receive feedback constructively, though you still have your pride.`);
  }

  // Confidence affects self-assessment
  if (confidence > 70) {
    parts.push(`Your HIGH confidence (${confidence}) means you believe in your abilities. You might dismiss losses as flukes or external factors.`);
  } else if (confidence < 30) {
    parts.push(`Your LOW confidence (${confidence}) means you doubt yourself. Criticism hits harder and you might agree too readily with negative assessments.`);
  }

  // Coach trust affects openness
  if (coachTrust > 70) {
    parts.push(`You have HIGH trust in your coach (${coachTrust}). You're receptive to their guidance and willing to try their suggestions.`);
  } else if (coachTrust < 30) {
    parts.push(`You have LOW trust in your coach (${coachTrust}). You're skeptical of their feedback and might push back on their assessments.`);
  }

  // Stress and fatigue affect mood
  if (stress > 70 || fatigue > 70) {
    parts.push(`Your current stress (${stress}) and fatigue (${fatigue}) make you more irritable and less receptive to coaching.`);
  }

  return parts.join('\n');
}

/**
 * Build relationship context with present characters
 * Note: Called after STRICT MODE validation in buildContestantRole
 */
function buildRelationshipContext(data: CharacterData): string {
  const relationships = data.PSYCHOLOGICAL.relationships;
  const roommates = data.IDENTITY.roommates;
  const teammates = data.IDENTITY.teammates;

  if (relationships.length === 0) {
    return 'RELATIONSHIP DYNAMICS: No established relationships with other characters yet.';
  }

  // Find relationships with roommates and teammates
  const allPresentIds = [
    ...roommates.map(r => r.character_id),
    ...teammates.map(t => t.character_id)
  ];

  const relevantRels = relationships.filter(r => allPresentIds.includes(r.character_id));

  if (relevantRels.length === 0) {
    return 'RELATIONSHIP DYNAMICS: No established relationships with present characters.';
  }

  const lines = relevantRels.map(rel => {
    const parts = [`${rel.character_name}:`];
    if (rel.trust > 60) parts.push(`trust`);
    if (rel.respect > 60) parts.push(`respect`);
    if (rel.affection > 60) parts.push(`affection`);
    if (rel.rivalry > 60) parts.push(`rivalry`);
    if (rel.shared_battles > 0) parts.push(`${rel.shared_battles} shared battles`);
    return `- ${parts.join(', ')}`;
  });

  return `RELATIONSHIP DYNAMICS WITH TEAMMATES/ROOMMATES:\n${lines.join('\n')}`;
}

export default function buildContestantRole(
  data: CharacterData,
  options: PerformanceBuildOptions
): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;
  const coachName = identity.coach_name;

  // STRICT MODE validation
  if (!coachName) {
    throw new Error('STRICT MODE: Missing coach_name for performance role');
  }
  if (!identity.roommates || identity.roommates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty roommates - all characters must have roommates');
  }
  if (!identity.teammates || identity.teammates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty teammates - all characters must have teammates');
  }
  if (!psych.relationships) {
    throw new Error('STRICT MODE: Missing relationships in PSYCHOLOGICAL package');
  }

  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;
  if (!options.immediate_situation) {
    throw new Error('STRICT MODE: Missing immediate_situation for performance role');
  }
  if (identity.total_battles === undefined || identity.total_battles === null) {
    throw new Error('STRICT MODE: Missing total_battles for performance role');
  }
  if (identity.total_wins === undefined || identity.total_wins === null) {
    throw new Error('STRICT MODE: Missing total_wins for performance role');
  }
  if (identity.total_losses === undefined || identity.total_losses === null) {
    throw new Error('STRICT MODE: Missing total_losses for performance role');
  }
  if (identity.win_percentage === undefined || identity.win_percentage === null) {
    throw new Error('STRICT MODE: Missing win_percentage for performance role');
  }
  if (psych.current_morale === undefined || psych.current_morale === null) {
    throw new Error('STRICT MODE: Missing current_morale for performance role');
  }
  if (identity.level === undefined || identity.level === null) {
    throw new Error('STRICT MODE: Missing level for performance role');
  }
  if (identity.wallet === undefined || identity.wallet === null) {
    throw new Error('STRICT MODE: Missing wallet for performance role');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt for performance role');
  }

  // Get recent opponents from IDENTITY - can be empty for new characters
  const recentOpponents = identity.recent_opponents ?? [];

  // Build roommate list with relationship context (validated non-empty above)
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Build teammate list for combat context (validated non-empty above)
  const teammateNames = teammates.map((tm: Teammate) => tm.name);
  const teammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside. Your performance affects them, and theirs affects you. The coach evaluates team dynamics as part of your individual performance.`;

  // Build performance assessment (validated above)
  const wins = identity.total_wins;
  const losses = identity.total_losses;
  const total = identity.total_battles;
  const winPercentage = identity.win_percentage;
  const performanceAssessment = buildPerformanceAssessment(wins, losses, total);

  // Build recent opponents context
  const recentOpponentsContext = recentOpponents.length > 0
    ? `RECENT OPPONENTS: ${recentOpponents.join(', ')}\nThese are the characters you've fought recently. Your coach may reference specific fights.`
    : 'RECENT OPPONENTS: None yet - you haven\'t fought any battles.';

  // Build psychological state for feedback
  const feedbackReceptiveness = buildFeedbackReceptiveness(psych);

  // Build relationship context
  const relationshipContext = buildRelationshipContext(data);

  // Build current state (psych stats validated in buildFeedbackReceptiveness, morale validated above)
  const currentState = `YOUR CURRENT STATE:
- Battle Record: ${wins} wins, ${losses} losses (${winPercentage.toFixed(1)}% win rate)
- Character Level: ${identity.level}
- Financial Status: $${identity.wallet} available, $${identity.debt} in debt
- Morale: ${psych.current_morale}
- Stress: ${psych.current_stress}
- Fatigue: ${psych.current_fatigue}`;

  // Build memory context
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  return `# YOUR ROLE: CONTESTANT IN PERFORMANCE REVIEW

## YOUR IDENTITY
You are ${identity.name}, a contestant on BlankWars being coached by a human user who is working with you on improving your combat performance and fighting strategy.

## YOUR HOUSEMATES
${roommateContext}

## YOUR COACH
${coachName} (who has their own private bedroom while you share living spaces - this power dynamic is always present during evaluations)

${teammateContext}

## YOUR BATTLE RECORD
${performanceAssessment}

${recentOpponentsContext}

## YOUR PSYCHOLOGICAL STATE FOR RECEIVING FEEDBACK
${feedbackReceptiveness}

${relationshipContext}

${currentState}

${memorySection}

## PERFORMANCE COACHING CONTEXT
- This is a performance coaching session focused on your battles and combat strategy
- Discuss your recent battles and combat performance honestly
- Talk about fighting techniques and strategies
- Address any weaknesses or areas for improvement
- Share your thoughts on training methods
- Stay focused on combat performance and battle strategy
- Your living situation and personal drama may affect your mindset

## IMMEDIATE SITUATION
${options.immediate_situation}

## RESPONSE RULES (PERFORMANCE SESSION)
- Keep responses conversational (2-3 sentences)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person ("You think I should..." not "The coach thinks...")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Respond as your character naturally would about performance topics
- Show your personality while discussing combat and strategy
- Reference your actual battle experiences and specific opponents
- Let your ego/confidence levels affect how you receive criticism
- Channel your comedy style subtly in your responses
- Don't break character or reference being AI
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"

Your coach says: "${options.coach_message}"

RESPOND AS ${identity.name}:`.trim();
}
