/**
 * Message Board domain - Scene context builder
 * SCENE = Where you are, what's happening, recent posts
 *
 * The message board is a persistent bulletin board where contestants and coaches
 * post announcements, challenges, trash talk, and gossip. Posts persist and
 * accumulate reactions (likes, flames). AI characters can post autonomously.
 *
 * STRICT MODE: All required fields must be present
 */

import type { CharacterData, MessageBoardBuildOptions, MessageBoardPost, RecentEvent } from '../../types';

/**
 * Format a post for display
 */
function formatPost(post: MessageBoardPost): string {
  const reactions = post.likes > 0 || post.flames > 0
    ? ` [${post.likes} 👍 ${post.flames} 🔥]`
    : '';
  return `${post.author_name} (${post.author_team}): "${post.content}"${reactions}`;
}

/**
 * Format recent posts for context
 * Note: Empty array is valid (quiet board)
 */
function formatRecentPosts(posts: MessageBoardPost[]): string {
  if (posts.length === 0) {
    return '(The board has been quiet lately)';
  }

  return posts
    .slice(-5)  // Last 5 posts
    .map(p => formatPost(p))
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
 * Build trigger-specific context for board posts
 */
function buildTriggerContext(options: MessageBoardBuildOptions): string {
  switch (options.trigger_type) {
    case 'battle_victory':
      if (!options.battle_context) {
        throw new Error('STRICT MODE: battle_context required for battle_victory trigger');
      }
      const winIntensity = options.battle_context.was_close_match
        ? 'It was close, but you pulled through.'
        : 'You dominated completely.';
      return `\nTRIGGER: You just WON a battle against ${options.battle_context.opponent_name}. ${winIntensity} Time to post about your victory for all to see.`;

    case 'battle_defeat':
      if (!options.battle_context) {
        throw new Error('STRICT MODE: battle_context required for battle_defeat trigger');
      }
      const lossIntensity = options.battle_context.was_close_match
        ? 'It was close - almost had them.'
        : 'You got crushed.';
      return `\nTRIGGER: You just LOST to ${options.battle_context.opponent_name}. ${lossIntensity} How do you address this publicly?`;

    case 'rivalry_escalation':
      if (!options.rivalry_context) {
        throw new Error('STRICT MODE: rivalry_context required for rivalry_escalation trigger');
      }
      return `\nTRIGGER: Your rivalry with ${options.rivalry_context.rival_name} has escalated! Recent incident: ${options.rivalry_context.recent_incident}. Time to put them on blast.`;

    case 'random_drama':
      return `\nTRIGGER: You feel like making a statement. Post something to stir things up, challenge someone, or make a bold claim.`;

    case 'user_message':
      if (!options.user_post) {
        throw new Error('STRICT MODE: user_post required for user_message trigger');
      }
      return `\nTRIGGER: Your coach just posted: "${options.user_post}". Respond with your own post.`;

    case 'character_interaction':
      return `\nTRIGGER: Another character posted something worth responding to. Craft your reply.`;

    case 'idle_chat':
      return `\nTRIGGER: You have something to say. Make a post - could be an observation, gossip, or just your thoughts.`;

    default:
      throw new Error(`STRICT MODE: Unknown trigger_type "${options.trigger_type}" for message board`);
  }
}

/**
 * Build reply context if responding to a specific post
 */
function buildReplyContext(options: MessageBoardBuildOptions): string {
  if (!options.replying_to) {
    return '';
  }

  const original = options.replying_to;
  return `\n\nYOU ARE REPLYING TO:
${original.author_name} (${original.author_team}) posted:
"${original.content}"
[${original.likes} likes, ${original.flames} flames]`;
}

/**
 * Build the scene context for message board
 */
export default function buildScene(
  data: CharacterData,
  options: MessageBoardBuildOptions
): string {
  // STRICT MODE validation
  if (!options.trigger_type) {
    throw new Error('STRICT MODE: Missing trigger_type for message board scene');
  }
  if (!options.post_type) {
    throw new Error('STRICT MODE: Missing post_type for message board scene');
  }
  if (!options.recent_posts) {
    throw new Error('STRICT MODE: Missing recent_posts for message board scene');
  }
  if (!options.recent_events) {
    throw new Error('STRICT MODE: Missing recent_events for message board scene');
  }

  const recentPostsText = formatRecentPosts(options.recent_posts);
  const eventsContext = formatRecentEvents(options.recent_events);
  const triggerContext = buildTriggerContext(options);
  const replyContext = buildReplyContext(options);

  return `# CURRENT SCENE: MESSAGE BOARD

You are on the BlankWars message board - a public bulletin board where contestants and coaches from all teams post messages that everyone can see and react to.

## POST TYPE YOU'RE CREATING
${options.post_type.toUpperCase()} - ${getPostTypeDescription(options.post_type)}

## RECENT POSTS ON THE BOARD
${recentPostsText}
${eventsContext}
${triggerContext}
${replyContext}

## THE BOARD DYNAMICS
- Posts are PERMANENT - everyone will see what you write
- Posts get reactions: 👍 (likes) and 🔥 (flames)
- Your reputation is built through your posts
- Cross-team drama, call-outs, and challenges live here
- Coaches can see everything their contestants post`;
}

/**
 * Get description for post type
 */
function getPostTypeDescription(postType: string): string {
  switch (postType) {
    case 'trash_talk':
      return 'Calling someone out, throwing shade, or talking smack';
    case 'announcement':
      return 'Making a statement, declaring something, sharing news';
    case 'challenge':
      return 'Challenging someone to battle, making a bet, issuing a dare';
    case 'gossip':
      return 'Sharing rumors, speculating about others, spreading information';
    case 'reply':
      return 'Responding to someone else\'s post';
    case 'general':
    default:
      return 'General post - could be anything';
  }
}
