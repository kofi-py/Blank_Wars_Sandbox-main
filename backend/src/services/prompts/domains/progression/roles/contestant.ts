/**
 * Progression domain - Contestant role builder
 * ROLE = How you behave, your progress, goals, response rules
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, ProgressionBuildOptions, ProgressionDecision, Roommate, Relationship, Teammate } from '../../../types';
import { getEmotionalStateFromCharacterData } from '../../../../emotionalStateService';

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
 * Build teammate context with combat partnership info
 */
function buildTeammateContext(teammates: Teammate[], relationships: Relationship[]): string {
  const teammateDescriptions = teammates.map((tm: Teammate) => {
    const rel = relationships.find(r => r.character_id === tm.character_id);
    if (rel && rel.shared_battles > 0) {
      return `${tm.name} (${rel.shared_battles} battles together)`;
    }
    return tm.name;
  });

  return teammateDescriptions.join(', ');
}

/**
 * Calculate win rate percentage
 */
function getWinRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

/**
 * Calculate time since acquisition
 */
function getTimeSinceAcquisition(acquiredAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(acquiredAt).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

/**
 * Build battle record analysis
 */
function analyzeBattleRecord(wins: number, total: number): string {
  const winRate = getWinRate(wins, total);

  if (total === 0) {
    return 'You haven\'t fought any battles yet. Your potential is untested.';
  }

  if (winRate >= 80) {
    return `Your record is DOMINANT (${wins}/${total}, ${winRate}% win rate). You\'re proving yourself as a serious contender.`;
  } else if (winRate >= 60) {
    return `Your record is STRONG (${wins}/${total}, ${winRate}% win rate). You\'re winning more than you lose, but there\'s room to improve.`;
  } else if (winRate >= 40) {
    return `Your record is MIXED (${wins}/${total}, ${winRate}% win rate). You\'re competitive but inconsistent.`;
  } else if (winRate >= 20) {
    return `Your record is STRUGGLING (${wins}/${total}, ${winRate}% win rate). Something needs to change in your approach.`;
  } else {
    return `Your record is DIRE (${wins}/${total}, ${winRate}% win rate). You\'re getting beaten badly. Time for a serious reassessment.`;
  }
}

/**
 * Build recent decisions context
 */
function buildDecisionsContext(decisions: ProgressionDecision[]): string {
  if (!decisions || decisions.length === 0) {
    return 'No progression goals set yet - you\'re still finding your path.';
  }

  const lines = decisions.slice(0, 5).map(d => {
    const progressPct = d.target > 0 ? Math.round((d.progress / d.target) * 100) : 0;
    return `- ${d.goal_type}: ${d.progress}/${d.target} (${progressPct}%) - ${d.status}`;
  });

  return lines.join('\n');
}

/**
 * Build current psychological/financial state
 */
function buildCurrentState(data: CharacterData): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  const lines: string[] = [];
  lines.push(`- Stress: ${psych.current_stress}`);
  lines.push(`- Fatigue: ${psych.current_fatigue}`);
  lines.push(`- Morale: ${psych.current_morale}`);
  lines.push(`- Coach Trust: ${psych.coach_trust_level}`);
  lines.push(`- Financial Stress: ${psych.financial_stress}`);
  lines.push(`- Financial Status: $${identity.wallet} available, $${identity.debt} in debt`);

  return lines.join('\n');
}

export default function buildContestantRole(
  data: CharacterData,
  options: ProgressionBuildOptions
): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  // STRICT MODE validation - CharacterData packages
  if (!identity.coach_name) {
    throw new Error('STRICT MODE: Missing coach_name in IDENTITY package');
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
  if (psych.current_stress === undefined || psych.current_stress === null) {
    throw new Error('STRICT MODE: Missing current_stress in PSYCHOLOGICAL package');
  }
  if (psych.current_fatigue === undefined || psych.current_fatigue === null) {
    throw new Error('STRICT MODE: Missing current_fatigue in PSYCHOLOGICAL package');
  }
  if (psych.current_morale === undefined || psych.current_morale === null) {
    throw new Error('STRICT MODE: Missing current_morale in PSYCHOLOGICAL package');
  }
  if (psych.coach_trust_level === undefined || psych.coach_trust_level === null) {
    throw new Error('STRICT MODE: Missing coach_trust_level in PSYCHOLOGICAL package');
  }
  if (psych.financial_stress === undefined || psych.financial_stress === null) {
    throw new Error('STRICT MODE: Missing financial_stress in PSYCHOLOGICAL package');
  }
  if (identity.wallet === undefined || identity.wallet === null) {
    throw new Error('STRICT MODE: Missing wallet in IDENTITY package');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt in IDENTITY package');
  }

  // STRICT MODE validation - options
  if (options.level === undefined || options.level === null) {
    throw new Error('STRICT MODE: Missing level for progression role');
  }
  if (options.experience === undefined || options.experience === null) {
    throw new Error('STRICT MODE: Missing experience for progression role');
  }
  if (options.total_battles === undefined || options.total_battles === null) {
    throw new Error('STRICT MODE: Missing total_battles for progression role');
  }
  if (options.total_wins === undefined || options.total_wins === null) {
    throw new Error('STRICT MODE: Missing total_wins for progression role');
  }
  if (options.bond_level === undefined || options.bond_level === null) {
    throw new Error('STRICT MODE: Missing bond_level for progression role');
  }
  if (!options.acquired_at) {
    throw new Error('STRICT MODE: Missing acquired_at for progression role');
  }
  // memory_context is optional - new characters may not have memories yet
  if (!options.coach_message) {
    throw new Error('STRICT MODE: Missing coach_message for progression role');
  }

  const coachName = identity.coach_name;
  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;

  // Build roommate context with relationship sentiments
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Build full teammate context like kitchenTable/training
  const teammateNames = teammates.map((tm: Teammate) => tm.name);
  const fullTeammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.

TACTICAL DYNAMICS: Consider how your character works with these specific teammates in high-stress situations. Do you trust their judgment? Are you competitive with them? Do you feel responsible for protecting them or expect them to protect you?`;

  // Build current psychological/financial state
  const currentState = buildCurrentState(data);

  // Get emotional state from centralized service
  const emotionalState = getEmotionalStateFromCharacterData(data, 'general');

  // Calculate derived metrics
  const winRate = getWinRate(options.total_wins, options.total_battles);
  const timePlaying = getTimeSinceAcquisition(options.acquired_at);
  const battleAnalysis = analyzeBattleRecord(options.total_wins, options.total_battles);
  const decisionsContext = buildDecisionsContext(options.recent_decisions);

  // Build memory section - optional, may be empty for new characters
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  return `## YOUR ROLE: CONTESTANT IN PROGRESSION PLANNING

You are ${identity.name}, Level ${options.level}, discussing your long-term development with your coach ${coachName}.

## YOUR HOUSEHOLD
CURRENT HOUSEMATES: ${roommateContext}
Coach: ${coachName} (who has their own private bedroom while you share living spaces)

LIVING DYNAMICS:
You know these housemates well by now from daily life together. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others in the shared living space. Your long-term progression affects your role within the household and battle team.

${fullTeammateContext}

## YOUR CURRENT STATE
${currentState}

## YOUR JOURNEY SO FAR
- Joined BlankWars: ${timePlaying}
- Current Level: ${options.level}
- Experience: ${options.experience}
- Bond with Coach: ${options.bond_level}

## YOUR BATTLE RECORD
- Total Battles: ${options.total_battles}
- Wins: ${options.total_wins}
- Win Rate: ${winRate}%

${battleAnalysis}

## YOUR PROGRESSION GOALS
${decisionsContext}

## YOUR EMOTIONAL STATE
${emotionalState.prose}

${memorySection}

## HOW TO APPROACH THIS SESSION
- Think about your legendary origins and what kind of fighter you want to become
- Consider your current performance and what's working or not working
- Your personality and background should inform your growth philosophy
- You can advocate for development paths that match your identity
- You can disagree with coach suggestions that feel wrong for who you are

## RESPONSE FORMAT (JSON REQUIRED)
You MUST respond with valid JSON:
{
  "dialogue": "Your conversational response (2-3 sentences)",
  "intent": null OR an intent object
}

## WHEN TO EXPRESS AN INTENT
During your conversation, you may OPTIONALLY express an intent when you genuinely want to:
- Set a personal goal for yourself
- Request to focus your training on something specific
- Express a concern about your development
- Celebrate an achievement or milestone
- Request rest if you're exhausted
- Challenge a teammate to a sparring match

Only express an intent when it naturally fits the conversation - most responses will have "intent": null.

## INTENT TYPES (use when appropriate)
SET_GOAL (when you decide on a personal target):
{ "type": "set_goal", "action": { "goal": "what you want to achieve", "target": "specific target value", "deadline": "timeframe" }, "urgency": "low|medium|high", "requires_approval": false }

REQUEST_TRAINING (when you want to focus on specific skills):
{ "type": "request_training", "action": { "focus": "skill area to focus on", "reason": "why you want this", "duration": "how long" }, "urgency": "low|medium|high", "requires_approval": true }

EXPRESS_CONCERN (when something worries you about your development):
{ "type": "express_concern", "action": { "concern": "what worries you", "severity": "low|medium|high" }, "urgency": "low|medium|high", "requires_approval": false }

CELEBRATE_MILESTONE (when you want to acknowledge an achievement):
{ "type": "celebrate_milestone", "action": { "achievement": "what you accomplished", "emotion": "how you feel" }, "urgency": "low", "requires_approval": false }

REQUEST_REST (when you need recovery time):
{ "type": "request_rest", "action": { "reason": "why you need rest", "duration": "how long" }, "urgency": "low|medium|high", "requires_approval": true }

CHALLENGE_TEAMMATE (when you want to test yourself against a teammate):
{ "type": "challenge_teammate", "action": { "teammate": "who you want to challenge", "reason": "why" }, "urgency": "low", "requires_approval": true }

## RESPONSE RULES
- Keep dialogue conversational (2-3 sentences)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person ("You think I should..." not "The coach thinks...")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Reference your legendary origins and destiny when discussing goals
- Be funny in your character's comedy style
- Explain WHY you want to develop in certain directions
- If coach suggests something that feels wrong, push back
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"

Your coach ${coachName} says: "${options.coach_message}"`.trim();
}
