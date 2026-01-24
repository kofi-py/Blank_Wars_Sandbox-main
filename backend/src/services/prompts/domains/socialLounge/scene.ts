/**
 * Social Lounge domain - Scene context builder
 * SCENE = Where you are, what's happening, who's present
 *
 * The social lounge is a real-time chat where contestants and coaches
 * from different teams interact. AI characters can post autonomously
 * based on triggers (battle results, rivalries, random drama).
 *
 * STRICT MODE: All required fields must be present
 */

import type { CharacterData, SocialLoungeBuildOptions, SocialParticipant, RecentSocialMessage, RecentEvent } from '../../types';

/**
 * Format a participant for display
 */
function formatParticipant(p: SocialParticipant, characterName: string): string {
  const teamLabel = p.is_own_team ? '(teammate)' : `(Team ${p.team_name})`;

  // Add relationship context if available
  let relationshipHint = '';
  if (p.relationship) {
    if (p.relationship.rivalry > 70) {
      relationshipHint = ' - RIVAL';
    } else if (p.relationship.affection > 70) {
      relationshipHint = ' - friend';
    } else if (p.relationship.trust < 30) {
      relationshipHint = ' - distrusted';
    }
  }

  return `${p.name} ${teamLabel}${relationshipHint}`;
}

/**
 * Format recent messages for context
 * Note: Empty array is valid (quiet chat)
 */
function formatRecentMessages(messages: RecentSocialMessage[]): string {
  if (messages.length === 0) {
    return '(The chat has been quiet)';
  }

  return messages
    .slice(-5)  // Last 5 messages
    .map(m => {
      const prefix = m.is_own_message ? ' (you)' : '';
      return `${m.author_name}${prefix}: "${m.content}"`;
    })
    .join('\n');
}

/**
 * Format recent events for reference
 * Note: Empty array is valid (no notable events)
 */
function formatRecentEvents(events: RecentEvent[]): string {
  if (events.length === 0) {
    return '';
  }

  const eventLines = events
    .slice(0, 5)
    .map(e => `- ${e.description}`)
    .join('\n');

  return `\n\nRECENT EVENTS YOU MIGHT REFERENCE:\n${eventLines}`;
}

/**
 * Build trigger-specific context
 */
function buildTriggerContext(options: SocialLoungeBuildOptions): string {
  switch (options.trigger_type) {
    case 'battle_victory':
      if (!options.battle_context) {
        throw new Error('STRICT MODE: battle_context required for battle_victory trigger');
      }
      const winIntensity = options.battle_context.was_close_match
        ? 'You barely pulled it off - a close match!'
        : 'You dominated!';
      return `\nTRIGGER: You just WON a battle against ${options.battle_context.opponent_name}. ${winIntensity} Time to celebrate (or gloat).`;

    case 'battle_defeat':
      if (!options.battle_context) {
        throw new Error('STRICT MODE: battle_context required for battle_defeat trigger');
      }
      const lossIntensity = options.battle_context.was_close_match
        ? 'It was close - you almost had them.'
        : 'You got crushed.';
      return `\nTRIGGER: You just LOST to ${options.battle_context.opponent_name}. ${lossIntensity} How do you handle defeat?`;

    case 'rivalry_escalation':
      if (!options.rivalry_context) {
        throw new Error('STRICT MODE: rivalry_context required for rivalry_escalation trigger');
      }
      return `\nTRIGGER: Your rivalry with ${options.rivalry_context.rival_name} has escalated! Recent incident: ${options.rivalry_context.recent_incident}. Time to call them out.`;

    case 'random_drama':
      return `\nTRIGGER: You feel like stirring things up. Start some drama, throw shade, or make a bold claim.`;

    case 'user_message':
      if (!options.user_message) {
        throw new Error('STRICT MODE: user_message required for user_message trigger');
      }
      return `\nTRIGGER: A coach just said: "${options.user_message}". Respond naturally.`;

    case 'character_interaction':
      return `\nTRIGGER: Another character said something. React to the conversation.`;

    case 'idle_chat':
      return `\nTRIGGER: You're just hanging out. Make casual conversation, comment on something, or observe the room.`;

    default:
      throw new Error(`STRICT MODE: Unknown trigger_type "${options.trigger_type}" for social lounge`);
  }
}

/**
 * Build the scene context for social lounge
 */
export default function buildScene(
  data: CharacterData,
  options: SocialLoungeBuildOptions
): string {
  const identity = data.IDENTITY;

  // STRICT MODE validation
  if (!options.trigger_type) {
    throw new Error('STRICT MODE: Missing trigger_type for social lounge scene');
  }
  if (!options.present_participants) {
    throw new Error('STRICT MODE: Missing present_participants for social lounge scene');
  }
  if (!options.recent_messages) {
    throw new Error('STRICT MODE: Missing recent_messages for social lounge scene');
  }
  if (!options.recent_events) {
    throw new Error('STRICT MODE: Missing recent_events for social lounge scene');
  }

  // Build participant list - at minimum your teammates should be present
  if (options.present_participants.length === 0) {
    throw new Error('STRICT MODE: present_participants cannot be empty - at minimum teammates should be present');
  }
  const participantList = options.present_participants
    .map(p => formatParticipant(p, identity.name))
    .join('\n- ');

  const recentChat = formatRecentMessages(options.recent_messages);
  const eventsContext = formatRecentEvents(options.recent_events);
  const triggerContext = buildTriggerContext(options);

  return `# CURRENT SCENE: SOCIAL LOUNGE

You are in the BlankWars social lounge - a shared space where contestants from different teams (and their coaches) hang out and chat in real-time.

## WHO'S HERE RIGHT NOW
- ${participantList}

## RECENT CHAT
${recentChat}
${eventsContext}
${triggerContext}

## THE VIBE
- This is multiplayer - multiple teams sharing one space
- Anything you say is PUBLIC - everyone can see it
- Cross-team drama, trash talk, and alliances happen here
- Your personality and current mood affect how you interact
- Coaches can see everything their contestants say`;
}
