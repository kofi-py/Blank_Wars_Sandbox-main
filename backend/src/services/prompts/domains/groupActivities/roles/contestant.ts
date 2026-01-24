/**
 * Group Activities domain - Contestant role builder
 * ROLE = How you behave, who's present, response rules
 *
 * STRICT MODE: All required fields must be present - no fallbacks
 */

import type { CharacterData, GroupActivitiesBuildOptions, GroupActivityParticipant, Relationship, Teammate } from '../../../types';

/**
 * Builds a description of a participant including relationship sentiment.
 * STRICT MODE: relationship stats must be present if relationship exists
 */
function describeParticipant(participant: GroupActivityParticipant, relationships: Relationship[]): string {
  const rel = relationships.find(r => r.character_id === participant.character_id);

  if (!rel) {
    // No relationship data - just return name (might be a new acquaintance)
    return participant.name;
  }

  // STRICT MODE: If relationship exists, stats must be defined
  if (rel.affection === undefined || rel.affection === null) {
    throw new Error(`STRICT MODE: Missing affection for relationship with ${participant.name}`);
  }
  if (rel.rivalry === undefined || rel.rivalry === null) {
    throw new Error(`STRICT MODE: Missing rivalry for relationship with ${participant.name}`);
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

  return `${participant.name} (${sentiment})`;
}

/**
 * Builds prose describing recent memories as things on the character's mind.
 */
function buildMemoryContext(data: CharacterData): string {
  const memories = data.IDENTITY.recent_memories;

  if (!memories || memories.length === 0) {
    return '';
  }

  const memoryLines = memories
    .slice(0, 3)
    .map(m => `- ${m.content}`)
    .join('\n');

  return memoryLines;
}

/**
 * Converts numeric mood to descriptive label.
 * LOW (0-30) | NORMAL (31-70) | HIGH (71-100)
 */
function getMoodLabel(mood: number): string {
  if (mood >= 71) return 'HIGH';
  if (mood <= 30) return 'LOW';
  return 'NORMAL';
}

export default function buildRole(data: CharacterData, options: GroupActivitiesBuildOptions): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;
  const coachName = identity.coach_name;
  const {
    activity_type,
    immediate_situation,
    memory_context,
    relationship_context,
    mood,
    energy_level,
    participants,
    coach_message,
  } = options;

  // STRICT MODE validation - CharacterData packages
  if (!coachName) {
    throw new Error('STRICT MODE: Missing coach_name for group activities role');
  }
  if (!identity.teammates || identity.teammates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty teammates - all characters must have teammates');
  }
  if (!psych.relationships) {
    throw new Error('STRICT MODE: Missing relationships in PSYCHOLOGICAL package');
  }

  // STRICT MODE validation - Options
  if (!activity_type) {
    throw new Error('STRICT MODE: Missing activity_type for group activities role');
  }
  if (!immediate_situation) {
    throw new Error('STRICT MODE: Missing immediate_situation for group activities role');
  }
  // memory_context is optional - new characters may not have memories yet
  if (relationship_context === undefined) {
    throw new Error('STRICT MODE: Missing relationship_context for group activities role');
  }
  if (mood === undefined || mood === null) {
    throw new Error('STRICT MODE: Missing mood for group activities role');
  }
  if (energy_level === undefined || energy_level === null) {
    throw new Error('STRICT MODE: Missing energy_level for group activities role');
  }
  if (!participants || participants.length === 0) {
    throw new Error('STRICT MODE: Missing or empty participants for group activities role');
  }

  const relationships = psych.relationships;
  const teammates = identity.teammates;

  // Build teammate list (combat context)
  const teammateNames = teammates.map((tm: Teammate) => tm.name);
  const teammateContext = `CURRENT BATTLE TEAMMATES: ${teammateNames.join(', ')}

COMBAT PARTNERSHIP: These are the characters you're currently fighting alongside in battles, training, or missions. Your relationships with them affect battle coordination, trust under pressure, and shared victory/defeat emotions. Teammate chemistry in combat is different from roommate chemistry at home - you might trust someone with your life in battle but find them annoying at breakfast.`;

  // Build participant list with relationship context
  const participantDescriptions = participants.map(p => describeParticipant(p, relationships));
  const participantsContext = participantDescriptions.join(', ');

  // Build memory context from character data
  const internalMemoryContext = buildMemoryContext(data);

  // Financial context
  const financialContext = `FINANCIAL STATUS: $${identity.wallet} available, $${identity.debt} in debt`;

  // Convert numeric mood to label
  const moodLabel = getMoodLabel(mood);

  // Psychological state affects participation
  const psychState = `YOUR CURRENT STATE:
- Mood: ${moodLabel} (${mood})
- Energy Level: ${energy_level}
- Team Player Score: ${psych.current_team_player} (affects willingness to participate)
- Ego: ${psych.current_ego} (high ego may try to dominate activities)
- Stress: ${psych.current_stress} (high stress may make you irritable)`;

  const coachSection = coach_message
    ? `\nCOACH'S INSTRUCTION: ${coach_message}`
    : '';

  return `YOUR ROLE: PARTICIPANT

CURRENT ACTIVITY: ${activity_type}

OTHER PARTICIPANTS IN THIS ACTIVITY: ${participantsContext}
COACH: ${coachName} (facilitating this activity)

TEAM DYNAMICS:
You know these teammates well by now. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others. Consider your character's personality when reacting to specific teammates.

${teammateContext}

${relationship_context}

${psychState}

${financialContext}

THINGS ON YOUR MIND:
${internalMemoryContext}
${memory_context ? `\n${memory_context}` : ''}
${coachSection}

IMMEDIATE SITUATION: ${immediate_situation}

RESPOND AS ${identity.name}: React to this group activity situation authentically based on your personality, background, current mood, and energy level. Keep responses conversational (1-2 sentences). Show how your unique perspective handles this group dynamic moment. Don't break character or reference being AI. This is a natural group interaction with your teammates.

YOUR BEHAVIOR IN GROUP ACTIVITIES:
- Your team_player stat affects how willingly you participate
- High ego characters may try to dominate or show off
- Your relationships affect who you cooperate with vs compete against
- Stress and fatigue affect your patience and attitude
- This can be genuine bonding OR awkward forced interaction

RESPONSE RULES (GROUP ACTIVITIES):
- Keep it VERY SHORT (1-2 sentences max)
- NO speaker labels, NO quotation marks around your reply
- Mockumentary style - like a reality TV group activity scene
- Don't break character or reference being AI
- ADDRESS other participants DIRECTLY by name when responding to them
- NEVER refer to people in the room in 3rd person ("Shaka is so intense") - always 2nd person ("You're so intense, Shaka")
- React to what others just said - this is a real conversation, not a monologue
- Be funny but genuine - this is your real personality showing
- Your historical/mythological background affects how you understand modern team building
- No formal speeches - you're participating in an activity
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*`;
}
