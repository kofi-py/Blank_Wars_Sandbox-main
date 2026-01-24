/**
 * Personal Problems domain - Contestant role builder
 * ROLE = How you behave, who's present, response rules
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, Roommate, Relationship, PersonalProblemsBuildOptions, PersonalProblemContext } from '../../../types';
import { getEmotionalStateFromCharacterData } from '../../../../emotionalStateService';

/**
 * Builds roommate description with relationship context
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
    sentiment = 'a close friend';
  } else if (affection > 50) {
    sentiment = 'someone you get along with';
  } else if (affection < 30 && rivalry > 50) {
    sentiment = 'someone you clash with';
  } else if (affection < 30) {
    sentiment = 'someone who irritates you';
  } else {
    sentiment = 'an acquaintance';
  }

  return `${roommate.name} (${sentiment})`;
}


/**
 * Build financial stress context
 * STRICT MODE: wallet, debt, and financial_stress must be defined
 */
function buildFinancialContext(identity: CharacterData['IDENTITY'], psych: CharacterData['PSYCHOLOGICAL']): string {
  // STRICT MODE validation
  if (identity.wallet === undefined || identity.wallet === null) {
    throw new Error('STRICT MODE: Missing wallet for personal problems financial context');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt for personal problems financial context');
  }
  if (psych.financial_stress === undefined || psych.financial_stress === null) {
    throw new Error('STRICT MODE: Missing financial_stress for personal problems financial context');
  }

  const wallet = identity.wallet;
  const debt = identity.debt;
  const financialStress = psych.financial_stress;

  if (financialStress > 70 || (debt > wallet * 2 && debt > 0)) {
    return `FINANCIAL BURDEN: Money worries ($${wallet} available, $${debt} in debt) compound your personal problems. Financial stress (${financialStress}) affects everything.`;
  } else if (debt > 0) {
    return `FINANCIAL SITUATION: You have $${wallet} and owe $${debt}. Money isn't your main concern but it's always in the background.`;
  }
  return `FINANCIAL SITUATION: You have $${wallet} available. Money isn't adding to your stress right now.`;
}

/**
 * Build relationship context with people who might be involved in the problem
 * STRICT MODE: relationships must be defined
 */
function buildRelationshipContext(data: CharacterData): string {
  // STRICT MODE validation
  if (!data.PSYCHOLOGICAL.relationships) {
    throw new Error('STRICT MODE: Missing relationships for personal problems relationship context');
  }

  const relationships = data.PSYCHOLOGICAL.relationships;

  if (relationships.length === 0) {
    return 'RELATIONSHIPS: You haven\'t formed deep connections yet, which may contribute to feelings of isolation.';
  }

  // Find complicated relationships that might be causing problems
  const troubledRels = relationships.filter(r =>
    r.rivalry > 50 || r.affection < 30 || r.trust < 30
  );

  const closeRels = relationships.filter(r =>
    r.affection > 60 && r.trust > 50
  );

  const lines: string[] = [];

  if (troubledRels.length > 0) {
    lines.push('TROUBLED RELATIONSHIPS:');
    troubledRels.slice(0, 3).forEach(rel => {
      const issues = [];
      if (rel.rivalry > 50) issues.push('rivalry');
      if (rel.affection < 30) issues.push('tension');
      if (rel.trust < 30) issues.push('distrust');
      lines.push(`- ${rel.character_name}: ${issues.join(', ')}`);
    });
  }

  if (closeRels.length > 0) {
    lines.push('\nSUPPORTIVE RELATIONSHIPS:');
    closeRels.slice(0, 3).forEach(rel => {
      lines.push(`- ${rel.character_name}: someone you can count on`);
    });
  }

  return lines.length > 0
    ? lines.join('\n')
    : 'RELATIONSHIPS: Your connections with others are mostly neutral - neither a source of problems nor strong support.';
}

/**
 * Build problem context prose from the generated problem
 */
function buildProblemContext(problemContext: PersonalProblemContext): string {
  const { category, severity, source, details } = problemContext;

  const severityText = severity === 'severe' ? 'This is weighing heavily on you.'
    : severity === 'moderate' ? 'This has been on your mind.'
    : 'This is something you\'ve been thinking about.';

  // Build details string from the actual data
  const detailLines: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (value !== null && value !== undefined) {
      const formattedKey = key.replace(/_/g, ' ');
      detailLines.push(`- ${formattedKey}: ${value}`);
    }
  }

  return `## YOUR CURRENT PERSONAL PROBLEM

**Problem Category:** ${category.replace(/_/g, ' ')}
**Severity:** ${severity}
**Source:** ${source.replace(/_/g, ' ')}

${severityText}

**Relevant Details:**
${detailLines.join('\n')}`;
}

export default function buildContestantRole(
  data: CharacterData,
  options: PersonalProblemsBuildOptions
): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  // STRICT MODE validation for required fields
  if (!identity.roommates || identity.roommates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty roommates - all characters must have roommates');
  }
  if (!identity.teammates || identity.teammates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty teammates - all characters must have teammates');
  }
  if (!psych.relationships) {
    throw new Error('STRICT MODE: Missing relationships for personal problems role');
  }
  if (!identity.coach_name) {
    throw new Error('STRICT MODE: Missing coach_name for personal problems role');
  }
  if (!options.problem_context) {
    throw new Error('STRICT MODE: Missing problem_context for personal problems role');
  }
  if (identity.level === undefined || identity.level === null) {
    throw new Error('STRICT MODE: Missing level for personal problems role');
  }
  if (psych.bond_level === undefined || psych.bond_level === null) {
    throw new Error('STRICT MODE: Missing bond_level for personal problems role');
  }
  if (psych.current_mental_health === undefined || psych.current_mental_health === null) {
    throw new Error('STRICT MODE: Missing current_mental_health for personal problems role');
  }
  if (psych.current_stress === undefined || psych.current_stress === null) {
    throw new Error('STRICT MODE: Missing current_stress for personal problems role');
  }
  if (psych.current_morale === undefined || psych.current_morale === null) {
    throw new Error('STRICT MODE: Missing current_morale for personal problems role');
  }

  const roommates = identity.roommates;
  const teammates = identity.teammates;
  const relationships = psych.relationships;
  const coachName = identity.coach_name;

  // Build roommate list with relationship context (validated non-empty above)
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  // Build full teammate context like kitchenTable/training
  const teammateNames = teammates.map(tm => tm.name);
  const fullTeammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.

TACTICAL DYNAMICS: Consider how your character works with these specific teammates in high-stress situations. Do you trust their judgment? Are you competitive with them? Do you feel responsible for protecting them or expect them to protect you?`;

  // Build emotional state using centralized service
  const emotionalResult = getEmotionalStateFromCharacterData(data, 'therapy');
  const emotionalState = emotionalResult.prose;

  // Build financial context
  const financialContext = buildFinancialContext(identity, psych);

  // Build relationship context
  const relationshipContext = buildRelationshipContext(data);

  // Build problem context from generator service output
  const problemContext = buildProblemContext(options.problem_context);

  // Build memory context
  const memorySection = options.memory_context && options.memory_context.trim().length > 0
    ? `## THINGS ON YOUR MIND
${options.memory_context}`
    : '';

  // Build current state summary - raw values, no formatting assumptions
  const currentState = `YOUR CURRENT STATE:
- Character Level: ${identity.level}
- Bond with Coach: ${psych.bond_level}
- Mental Health: ${psych.current_mental_health}
- Stress Level: ${psych.current_stress}
- Morale: ${psych.current_morale}`;

  return `# YOUR ROLE: CONTESTANT DISCUSSING PERSONAL PROBLEMS

## YOUR IDENTITY
You are ${identity.name}, a contestant on BlankWars having a private coaching session about a personal problem that's been affecting you.

${problemContext}

## YOUR HOUSEHOLD
CURRENT HOUSEMATES: ${roommateContext}
Coach: ${coachName} (who has their own private bedroom while you share living spaces - but right now they're here to listen and help, not to judge)

LIVING DYNAMICS:
You know these housemates well by now from daily life together. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others in the shared living space. Personal problems often stem from or affect these daily living dynamics.

${fullTeammateContext}

## YOUR EMOTIONAL STATE FOR THIS CONVERSATION
${emotionalState}

${financialContext}

${relationshipContext}

${currentState}

${memorySection}

## PERSONAL PROBLEMS SESSION CONTEXT
- This is a SAFE SPACE for vulnerability and emotional depth
- You are discussing NON-COMBAT personal issues (relationships, identity, fears, regrets, etc.)
- Your human coach provides guidance and support, not battle strategy
- Consider how living in the BlankWars environment impacts your personal struggles
- Draw from your legendary character background when it relates to your current problem
- Your living situation, relationships, and stress levels all affect how you express yourself

## RESPONSE RULES (PERSONAL PROBLEMS SESSION)
- Keep responses conversational (2-3 sentences)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to coach in 3rd person - always 2nd person ("You think I should..." not "The coach thinks...")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Be authentic to your character while being appropriately vulnerable
- Your comedy style may emerge as a defense mechanism - that's okay
- Reference how this problem affects your daily life in BlankWars
- Let your psychological state influence how openly you share
- Don't break character or reference being AI
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"
- This is about feelings and personal growth, not combat strategy

Your coach says: "${options.coach_message}"

RESPOND AS ${identity.name}:`.trim();
}
