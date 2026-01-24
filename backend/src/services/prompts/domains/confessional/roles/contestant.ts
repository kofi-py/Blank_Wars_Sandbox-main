/**
 * Confessional domain - Contestant role builder
 * ROLE = How you behave, psychological state, situational context
 */
import type { CharacterData, ConfessionalBuildOptions, Roommate, Relationship } from '../../../types';

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
  if (affection > 70) sentiment = 'you like a lot';
  else if (affection > 50) sentiment = 'you get along with';
  else if (affection < 30 && rivalry > 50) sentiment = 'you have tension with';
  else if (affection < 30) sentiment = 'you find annoying';
  else sentiment = 'you have neutral feelings about';

  return `${roommate.name} (${sentiment})`;
}

/**
 * buildRole for Contestant
 * data = The character's data (Self)
 * selfContext = Mandatory configuration and memory data
 */
export default function buildRole(data: CharacterData, selfContext: ConfessionalBuildOptions): string {
  // selfContext is MANDATORY
  if (!selfContext) {
    throw new Error('STRICT MODE: Missing selfContext for confessional contestant role');
  }

  const { turn_number, memory_context } = selfContext;
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  // STRICT MODE validation
  if (!identity.roommates || identity.roommates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty roommates - all characters must have roommates');
  }
  if (!identity.teammates || identity.teammates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty teammates - all characters must have teammates');
  }
  if (!psych.relationships) {
    throw new Error('STRICT MODE: Missing relationships in PSYCHOLOGICAL package');
  }
  // memory_context is optional - new characters may not have memories yet
  if (identity.wallet === undefined || identity.wallet === null) {
    throw new Error('STRICT MODE: Missing wallet in IDENTITY package');
  }
  if (identity.debt === undefined || identity.debt === null) {
    throw new Error('STRICT MODE: Missing debt in IDENTITY package');
  }

  // Format lists for the prompt using our own data
  const roommates = identity.roommates;
  const relationships = psych.relationships;
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  const teammatesList = identity.teammates.map(t => t.name).join(', ');

  // Build memory section - optional, may be empty for new characters
  const memorySection = memory_context && memory_context.trim().length > 0
    ? `MEMORIES FOR REFLECTION:
${memory_context}`
    : '';

  return `YOUR ROLE: CONTESTANT IN CONFESSIONAL

CURRENT SITUATION:
- Living in: ${identity.hq_tier}
- Sleeping: ${identity.sleeping_arrangement}
- Roommates: ${roommateContext}
- Team: ${identity.team_name} (Teammates: ${teammatesList})
- Finances: $${identity.wallet} available, $${identity.debt} in debt
- Mental Health: ${psych.current_mental_health} | Stress: ${psych.current_stress} | Ego: ${psych.current_ego}

CONFESSIONAL INTERVIEW CONTEXT:
- This is a PRIVATE one-on-one interview - no other contestants can hear
- This is your chance to speak candidly about living with your teammates
- The interview may be edited for dramatic effect on the show
- You can be more honest here than you would be in front of your teammates
- This is question #${turn_number} in your interview
- Speak as if you're in a private interview setting
- Show your character's genuine thoughts and feelings about the BlankWars experience
- Reference specific incidents with your roommates when relevant
- Keep responses BRIEF: 2-3 SHORT sentences, 40-60 words MAXIMUM
- Stay in character - show your historical personality dealing with reality TV dynamics
- NO speaker labels, NO quotation marks, NO stage directions in parentheses
- IMPORTANT: Keep sentences SHORT and punchy, NOT run-on sentences
- Don't break character or reference being AI
- Focus on present BlankWars challenges and relationships, not your historical past

${memorySection}

YOUR BEHAVIOR:
- React based on your relationships with whoever is present
- Your current fatigue and stress levels affect your mood
- This is casual - gossip, complaints, jokes, everyday chat
- Drama from battles, therapy, and daily life often comes up`;
}
