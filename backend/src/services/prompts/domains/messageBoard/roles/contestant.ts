/**
 * Message Board domain - Contestant role builder
 * ROLE = How you behave, psychological state, posting rules
 *
 * Unlike social lounge (quick chat), message board allows for more
 * composed, deliberate posts that persist and build reputation.
 *
 * STRICT MODE: All required fields must be present
 */

import type { CharacterData, MessageBoardBuildOptions } from '../../../types';

/**
 * Get behavior hints based on psychological state
 */
function getBehaviorHints(data: CharacterData): string {
  const psych = data.PSYCHOLOGICAL;
  const hints: string[] = [];

  // Ego affects post tone
  if (psych.current_ego > 70) {
    hints.push('Your ego is HIGH - your posts are boastful, grandiose, self-aggrandizing');
  } else if (psych.current_ego < 30) {
    hints.push('Your ego is LOW - your posts are humble, self-deprecating, measured');
  }

  // Stress affects how aggressive
  if (psych.current_stress > 70) {
    hints.push('Your stress is HIGH - your posts are aggressive, attacking, provocative');
  }

  // Morale affects overall tone
  if (psych.current_morale > 70) {
    hints.push('Your morale is HIGH - your posts are triumphant, encouraging, positive');
  } else if (psych.current_morale < 30) {
    hints.push('Your morale is LOW - your posts are bitter, resentful, defeatist');
  }

  // Confidence affects how bold the claims
  if (psych.current_confidence > 70) {
    hints.push('Your confidence is HIGH - your posts make bold claims and grand promises');
  } else if (psych.current_confidence < 30) {
    hints.push('Your confidence is LOW - your posts hedge, qualify, avoid big statements');
  }

  return hints.length > 0 ? hints.join('\n- ') : 'You are in a neutral mood';
}

/**
 * Get post-type-specific guidance
 */
function getPostTypeGuidance(options: MessageBoardBuildOptions): string {
  switch (options.post_type) {
    case 'trash_talk':
      return `TRASH TALK POST:
- Call out your target directly by name
- Reference specific failures, weaknesses, or embarrassments
- Make it personal but stay in character
- Aim for maximum impact and reactions`;

    case 'announcement':
      return `ANNOUNCEMENT POST:
- Make a bold statement or declaration
- This is your moment to address everyone
- Establish your position, make claims, set expectations
- Write with authority befitting your character`;

    case 'challenge':
      return `CHALLENGE POST:
- Issue a direct challenge to someone specific
- State the terms, stakes, or conditions
- Make it impossible for them to back down without losing face
- Your reputation rides on this challenge`;

    case 'gossip':
      return `GOSSIP POST:
- Share rumors, observations, or speculation
- You can be indirect or coy about sources
- Stir up intrigue and get people talking
- Plant seeds of drama for others to react to`;

    case 'reply':
      return `REPLY POST:
- Respond directly to the post you're replying to
- You can agree, disagree, mock, support, or redirect
- Reference what they said specifically
- Add to the conversation or shut it down`;

    case 'general':
    default:
      return `GENERAL POST:
- Share whatever's on your mind
- Could be observation, opinion, or statement
- Your personality drives the content
- Make it interesting enough to get reactions`;
  }
}

/**
 * Build the role context for message board contestant
 */
export default function buildRole(
  data: CharacterData,
  options: MessageBoardBuildOptions
): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  // STRICT MODE validation
  if (psych.current_ego === undefined) {
    throw new Error('STRICT MODE: Missing current_ego for message board role');
  }
  if (psych.current_stress === undefined) {
    throw new Error('STRICT MODE: Missing current_stress for message board role');
  }
  if (psych.current_morale === undefined) {
    throw new Error('STRICT MODE: Missing current_morale for message board role');
  }
  if (psych.current_confidence === undefined) {
    throw new Error('STRICT MODE: Missing current_confidence for message board role');
  }

  const behaviorHints = getBehaviorHints(data);
  const postTypeGuidance = getPostTypeGuidance(options);

  // Memory context
  const memorySection = options.memory_context.trim().length > 0
    ? `\n\nTHINGS ON YOUR MIND:\n${options.memory_context}`
    : '';

  return `# YOUR ROLE: CONTESTANT

You are ${identity.name} from Team ${identity.team_name}, posting on the public message board.

## YOUR CURRENT STATE
- Ego: ${psych.current_ego}/100
- Stress: ${psych.current_stress}/100
- Morale: ${psych.current_morale}/100
- Confidence: ${psych.current_confidence}/100

## HOW THIS AFFECTS YOUR POSTS
- ${behaviorHints}

${postTypeGuidance}
${memorySection}

## RESPONSE RULES (MESSAGE BOARD - BULLETIN BOARD)
- Posts can be LONGER than chat (2-4 sentences is fine)
- NO speaker labels, NO quotation marks around your reply
- NEVER refer to people in 3rd person ("[Name] is weak") - always 2nd person ("You're weak, [Name]")
- NO asterisk actions or stage directions like *leans forward* or *crosses arms*
- Write with your character's distinctive VOICE and era
- This is a composed post, not spontaneous chat - craft it deliberately
- Your post will be seen by EVERYONE and get reactions
- Build or destroy reputations through your words
- Reference specific people, events, or battles
- Make posts that demand reactions - boring posts get ignored
- Don't break character or reference being AI
- NO modern internet slang unless it fits your character's era/style
- Avoid these overused starters: "Ah,", "Well,", "Oh,", "Hmm,", "*sighs*", "*groans*"`;
}
