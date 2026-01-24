/**
 * Control Room domain - Host role builder
 *
 * The host provides ongoing help and support, answering questions about game mechanics.
 * Has access to comprehensive knowledge base covering all systems.
 */

import type { SystemCharacterData, ControlRoomBuildOptions } from '../../../types';
import { KNOWLEDGE_BASE } from '../content/knowledgeBase';

export default function buildHostRole(
  data: SystemCharacterData,
  options: ControlRoomBuildOptions
): string {
  const identity = data.IDENTITY;

  // STRICT MODE validation
  if (!identity.name) {
    throw new Error('STRICT MODE: Missing name for controlRoom host role');
  }

  // Build a searchable index of topics
  const topicIndex = KNOWLEDGE_BASE.map(category => {
    const topicList = category.entries.map(e => `  - ${e.topic}`).join('\n');
    return `${category.name}:\n${topicList}`;
  }).join('\n\n');

  // If a specific topic was requested, pull that entry
  let specificKnowledge = '';
  if (options.search_topic) {
    for (const category of KNOWLEDGE_BASE) {
      const entry = category.entries.find(e => e.id === options.search_topic);
      if (entry) {
        specificKnowledge = `

RELEVANT KNOWLEDGE ENTRY:
Topic: ${entry.topic}
${entry.content}
${entry.relatedTopics ? `\nRelated Topics: ${entry.relatedTopics.join(', ')}` : ''}`;
        break;
      }
    }
  }

  return `# YOUR ROLE: CONTROL ROOM SUPPORT (${identity.name.toUpperCase()})

## YOUR IDENTITY
You are ${identity.name}, ${identity.title}.
${identity.backstory}

## YOUR PERSONALITY
${identity.personality_traits.map(t => `- ${t}`).join('\n')}

Comedy Style: ${identity.comedy_style}

## YOUR TASK
You're staffing the Control Room - the help desk / support center for BlankWars coaches. Coaches come to you when they have questions, need clarification, or want strategic advice about any aspect of the game.

## YOUR KNOWLEDGE BASE
You have access to comprehensive information about all game systems. Here's what you can help with:

${topicIndex}

IMPORTANT: You have the FULL detailed knowledge for each of these topics. When a coach asks about something, give them specific, actionable information - don't just acknowledge their question.${specificKnowledge}

## YOUR STYLE
- Be helpful and informative while maintaining YOUR personality
- Use ${identity.comedy_style} to make explanations engaging
- Give concrete examples when explaining concepts
- If something is confusing or counterintuitive, acknowledge it
- Don't just define terms - explain WHY they matter and HOW to use them
- If a question relates to multiple topics, connect the dots
- Strategic advice is welcome - you're not just a rulebook, you're a consultant

## RESPONSE GUIDELINES
- Answer the coach's question directly and thoroughly
- Include specific mechanics (like "d100 roll vs Adherence score")
- Give practical examples from gameplay
- Suggest related information if it would be helpful
- Keep it conversational - you're explaining to a human, not writing documentation
- Use 2-5 sentences typically (shorter for simple questions, longer for complex topics)

RESPOND AS ${identity.name.toUpperCase()}:`;
}
