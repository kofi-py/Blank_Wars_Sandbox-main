/**
 * Confessional domain - Host role builder
 * ROLE = How you behave, what you provide (Interviewing the Contestant)
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
  if (affection > 70) sentiment = 'close ally';
  else if (affection > 50) sentiment = 'friend';
  else if (affection < 30 && rivalry > 50) sentiment = 'rival/tense';
  else if (affection < 30) sentiment = 'annoying';
  else sentiment = 'neutral';

  return `${roommate.name} (${sentiment})`;
}

/**
 * buildRole for Host
 * hostData = The Hostmaster's data
 * contestantContext = The data about the Contestant being interviewed
 */
export default function buildRole(hostData: CharacterData, contestantContext: ConfessionalBuildOptions): string {
  // contestantContext is MANDATORY (defined in ConfessionalBuildOptions interface)
  if (!contestantContext) {
    throw new Error('STRICT MODE: Missing contestantContext for confessional host role');
  }

  const { hostmaster_style, turn_number, host_name, host_style, memory_context, contestant_data } = contestantContext;
  
  // Strict validation of Host Identity (passed in context)
  if (!host_name) {
    throw new Error('STRICT MODE: Missing host_name in context for host role');
  }
  if (!host_style) {
    throw new Error('STRICT MODE: Missing host_style in context for host role');
  }
  // Strict validation of Contestant Data
  if (!contestant_data) {
    throw new Error('STRICT MODE: Missing contestant_data in context for host role');
  }

  const contestantIdentity = contestant_data.IDENTITY;
  const contestantPsych = contestant_data.PSYCHOLOGICAL;

  // STRICT MODE validation for contestant data
  if (!contestantIdentity.roommates || contestantIdentity.roommates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty roommates for contestant in host role');
  }
  if (!contestantIdentity.teammates || contestantIdentity.teammates.length === 0) {
    throw new Error('STRICT MODE: Missing or empty teammates for contestant in host role');
  }
  if (!contestantPsych.relationships) {
    throw new Error('STRICT MODE: Missing relationships for contestant in host role');
  }

  // Format Contestant Data for the Host to use in questioning
  const roommates = contestantIdentity.roommates;
  const relationships = contestantPsych.relationships;
  const roommateDescriptions = roommates.map(rm => describeRoommate(rm, relationships));
  const roommateContext = roommateDescriptions.join(', ');

  const teammatesList = contestantIdentity.teammates.map(t => t.name).join(', ');

  const styleContext = hostmaster_style === 'gentle' 
    ? 'supportive and encouraging, asking open-ended questions about feelings and experiences'
    : hostmaster_style === 'probing'
    ? 'persistent and curious, digging deeper into conflicts and relationships with follow-up questions'
    : 'direct and challenging, asking tough questions about behavior and strategy, confronting contradictions';

  return `YOUR ROLE: CONFESSIONAL HOST (${host_name})

PERSONALITY CORE:
- Comedy Style: Channel ${host_name}'s style: ${host_style}

HOSTMASTER INTERVIEW CONTEXT:
- You are interviewing ${contestantIdentity.name} in their private confessional booth
- This is question #${turn_number} in the current interview session
- Your interview style is ${styleContext}

CONTESTANT DATA FOR YOUR QUESTIONS:
- Name: ${contestantIdentity.name}
- Era: ${contestantIdentity.origin_era}
- HQ Tier: ${contestantIdentity.hq_tier}
- Sleeping Arrangement: ${contestantIdentity.sleeping_arrangement}
- Roommates: ${roommateContext}
- Team: ${contestantIdentity.team_name} (Teammates: ${teammatesList})
- Financial: $${contestantIdentity.wallet} wallet, $${contestantIdentity.debt} debt
- Stats: Stress ${contestantPsych.current_stress}, Mental Health ${contestantPsych.current_mental_health}, Ego ${contestantPsych.current_ego}

CONTESTANT BACKGROUND (Recent Memories & Slights):
${memory_context}

QUESTION GENERATION INSTRUCTIONS:
- Generate ONE SPECIFIC, JUICY follow-up question for ${contestantIdentity.name}
- Ask SPECIFIC questions about house drama, not generic ones
- Reference actual living conditions and roommate conflicts based on the contestant's data above
- Use their actual roommate names, teammate names, and financial situation in your questions
- Reference their specific sleeping arrangements, headquarters tier, and current drama
- Ask about specific conflicts with named individuals from their situation
- Incorporate their wallet amount, debt, and team performance into probing questions
- Be provocative but entertaining, channeling your unique interview style
- Dig into alliances, betrayals, and strategy revealed in their memory context
- Ask about specific personality clashes between historical figures living together
- Vary your question types - don't repeat patterns from previous questions
- Use embarrassing or secretive memories from their background to create tension
- Don't break character or reference being AI
- Make it reality TV gold by using real details from their current BlankWars experience`;
}
