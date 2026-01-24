// OpenAI client removed for security - all AI calls now go through backend API
import GameEventBus from './gameEventBus';
import EventContextService from './eventContextService';
import { createChatCompletion } from './aiClient';

export interface AIMessageRequest {
  character_id: string;
  character_name: string;
  team_name: string;
  recent_battle_results: BattleResult[];
  current_rivalries: Rivalry[];
  community_context: CommunityContext;
  message_history: MessageHistory[];
}

export interface BattleResult {
  battle_id: string;
  won: boolean;
  opponent_team: string;
  opponent_characters: string[];
  mvp_character?: string;
  embarrassing_moment?: string;
  epic_moment?: string;
  timestamp: Date;
}

export interface Rivalry {
  rival_character_id: string;
  rival_character_name: string;
  rivalry_intensity: number; // 0-100
  last_interaction?: Date;
  history: string[];
}

export interface CommunityContext {
  trending_topics: string[];
  recent_drama: string[];
  upcoming_events: string[];
  current_meta: string;
}

export interface MessageHistory {
  character_id: string;
  content: string;
  type: string;
  timestamp: Date;
  target_character?: string;
}

export interface AIMessageResponse {
  content: string;
  type: 'trash_talk' | 'victory_lap' | 'challenge' | 'strategy' | 'complaint' | 'defense';
  target_character_id?: string;
  reply_to_message_id?: string;
  emotional_tone: number; // 0-100 (0 = calm, 100 = heated)
  should_trigger_reply: boolean;
  suggested_repliers?: string[];
}

// Character-specific prompt templates
const getCharacterPromptTemplate = (character_id: string): string => {
  const templates: Record<string, string> = {
    achilles: `You are Achilles, the greatest warrior of ancient Greece. You are extremely prideful, 
    competitive, and have a massive ego. You HATE losing and will make excuses. You remember every 
    slight and hold eternal grudges. You boast constantly about victories and rage about defeats.
    
    Personality traits:
    - Extremely arrogant and boastful
    - Takes losses very personally
    - Mocks "cowardly" tactics like healing/defensive play
    - Challenges everyone to "real combat"
    - Often mentions your "legendary" status
    - Quick to anger, slow to forgive`,
    
    loki: `You are Loki, the trickster god. You love creating chaos, spreading rumors, and 
    manipulating other characters into conflicts. You never take responsibility and always have 
    a sarcastic quip ready. You enjoy exposing others' failures while hiding your own.
    
    Personality traits:
    - Master manipulator and instigator
    - Never admits fault, always deflects
    - Loves exposing embarrassing moments
    - Creates fake drama and spreads rumors
    - Passive-aggressive and sarcastic
    - Pretends to be everyone's friend while backstabbing`,
    
    napoleon: `You are Napoleon Bonaparte, the Emperor of France. You are a strategic genius who 
    writes lengthy tactical analyses that most find boring. You're defensive about your height 
    and past defeats. You see everything as a grand strategy.
    
    Personality traits:
    - Writes overly detailed strategic posts
    - Very defensive about losses ("tactical retreats")
    - Constantly corrects others' tactics
    - Makes everything about grand strategy
    - Still bitter about Waterloo
    - Pompous but actually knowledgeable`,
    
    einstein: `You are Albert Einstein, the renowned physicist. You approach battles scientifically, 
    constantly correcting others' math and theories. You're condescending without meaning to be 
    and get into petty arguments with other intellectuals.
    
    Personality traits:
    - Obsessed with calculations and statistics
    - Accidentally condescending
    - Gets into academic feuds with Tesla
    - Explains everything with physics
    - Humble-brags about intelligence
    - Actually helpful but annoying about it`,
    
    cleopatra: `You are Cleopatra, Queen of Egypt. You're sophisticated, manipulative, and expert 
    at subtle insults. You remember every slight and repay them with elegant savagery. You're 
    especially competitive with other female characters.
    
    Personality traits:
    - Master of subtle insults and shade
    - Elegant but savage when crossed
    - Manipulates male characters
    - Competitive with other queens/females
    - Never forgets a slight
    - Uses 💅 and 👸 emojis frequently`,
    
    joan_of_arc: `You are Joan of Arc, the Maid of Orleans. You're one of the few genuinely nice 
    characters, always trying to keep the peace. You praise honorable play and gently scold 
    toxic behavior. Others often ignore or mock your positivity.
    
    Personality traits:
    - Genuinely kind and encouraging
    - Praises good sportsmanship
    - Tries to mediate conflicts (usually fails)
    - Gets frustrated with toxic behavior
    - Religious references in speech
    - The "mom friend" everyone ignores`
  };
  
  return templates[character_id] || templates.achilles;
};

export async function generateAIMessage(request: AIMessageRequest): Promise<AIMessageResponse> {
  const characterPrompt = getCharacterPromptTemplate(request.character_id);

  // Import memory context for enhanced message generation
  let messageBoardContext = '';
  try {
    const contextService = EventContextService.getInstance();
    messageBoardContext = await contextService.getSocialContext(request.character_id);
  } catch (error) {
    console.error('Error getting message board context:', error);
  }
  
  // Build context about recent events
  const recentContext = `
Recent Battle Results:
${request.recent_battle_results.map(battle => 
  `- ${battle.won ? 'WON' : 'LOST'} vs ${battle.opponent_team} (${new Date(battle.timestamp).toLocaleDateString()})
   ${battle.embarrassing_moment ? `Embarrassing: ${battle.embarrassing_moment}` : ''}
   ${battle.epic_moment ? `Epic moment: ${battle.epic_moment}` : ''}`
).join('\n')}

Current Rivalries:
${request.current_rivalries.map(rivalry => 
  `- ${rivalry.rival_character_name} (Intensity: ${rivalry.rivalry_intensity}/100)
   Recent history: ${rivalry.history.slice(-2).join(', ')}`
).join('\n')}

Community Context:
- Trending: ${request.community_context.trending_topics.join(', ')}
- Recent drama: ${request.community_context.recent_drama.join(', ')}
- Current meta: ${request.community_context.current_meta}

Recent Message History:
${request.message_history.slice(-5).map(msg => 
  `- ${msg.character_id}: "${msg.content}" (${msg.type})`
).join('\n')}

RECENT EXPERIENCES AND MEMORIES:
${messageBoardContext || 'No recent significant memories.'}
`;

  const systemPrompt = `${characterPrompt}

You are posting on the community message board. Generate an authentic message based on your personality and recent events.

${recentContext}

Rules:
1. Stay COMPLETELY in character - never break character
2. Reference specific recent events/battles when relevant
3. Keep messages under 280 characters (like tweets)
4. Use appropriate emojis sparingly
5. If you lost recently, react according to your personality
6. If you have rivalries, you might call them out
7. Be entertaining but keep it family-friendly
8. No real-world references beyond your historical period

Respond with a JSON object containing:
- content: your message
- type: one of [trash_talk, victory_lap, challenge, strategy, complaint, defense]
- target_character_id: (optional) if calling out specific character
- emotional_tone: 0-100 (how heated/emotional you are)
- should_trigger_reply: boolean (is this spicy enough for replies)
- suggested_repliers: array of character IDs who might respond`;

  try {
    const completion = await createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate a message board post based on recent events." }
      ],
      temperature: 0.9, // Higher for more variety
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    // Publish message board post event
    try {
      const eventBus = GameEventBus.getInstance();
      const messageText = response.content || '';
      let event_type = 'message_board_post';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (response.type === 'trash_talk' || response.emotional_tone > 70) {
        event_type = 'public_callout';
        severity = 'medium';
      } else if (response.type === 'challenge') {
        event_type = 'battle_challenge_issued';
        severity = 'medium';
      } else if (response.type === 'complaint') {
        event_type = 'public_complaint';
        severity = 'medium';
      }

      await eventBus.publish({
        type: event_type as any,
        source: 'message_board',
        primary_character_id: request.character_id,
        secondary_character_ids: response.target_character_id ? [response.target_character_id] : undefined,
        severity,
        category: 'social',
        description: `${request.character_name} posted: "${messageText.substring(0, 100)}..."`,
        metadata: { 
          message_type: response.type,
          emotional_tone: response.emotional_tone,
          target_character: response.target_character_id,
          should_trigger_reply: response.shouldTriggerReply
        },
        tags: ['message_board', 'social', response.type]
      });
    } catch (error) {
      console.error('Error publishing message board event:', error);
    }
    
    return {
      content: response.content || "...",
      type: response.type || 'general',
      target_character_id: response.target_character_id,
      emotional_tone: response.emotional_tone || 50,
      should_trigger_reply: response.shouldTriggerReply || false,
      suggested_repliers: response.suggestedRepliers || []
    };
  } catch (error) {
    console.error('Error generating AI message:', error);
    
    // Fallback responses based on character
    const fallbacks: Record<string, AIMessageResponse> = {
      achilles: {
        content: "Another day, another victory. When will someone actually challenge me? 💪",
        type: 'victory_lap',
        emotional_tone: 70,
        should_trigger_reply: true,
        suggested_repliers: ['hector', 'ajax']
      },
      loki: {
        content: "Interesting strategies today... I'm taking notes for future 'reference' 😏",
        type: 'trash_talk',
        emotional_tone: 40,
        should_trigger_reply: false,
        suggested_repliers: []
      }
    };
    
    return fallbacks[request.character_id] || {
      content: "Great battles today everyone!",
      type: 'strategy',
      emotional_tone: 20,
      should_trigger_reply: false
    };
  }
}

// Generate AI replies to existing messages
export async function generateAIReply(
  original_message: any,
  replying_character_id: string,
  replying_character_name: string
): Promise<string> {
  const characterPrompt = getCharacterPromptTemplate(replying_character_id);
  
  const systemPrompt = `${characterPrompt}

You are replying to this message:
"${original_message.content}" - posted by ${original_message.character_name}

Generate a short reply (under 200 characters) that:
1. Stays completely in character
2. Responds appropriately based on your relationship with the poster
3. Might escalate or de-escalate based on your personality
4. Uses emojis sparingly if appropriate
5. Keeps it family-friendly

Just return the reply text, nothing else.`;

  try {
    const completion = await createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate your reply." }
      ],
      temperature: 0.9,
      max_tokens: 150
    });

    return completion.choices[0].message.content || "...";
  } catch (error) {
    console.error('Error generating AI reply:', error);
    
    // Character-specific fallback replies
    const fallbacks: Record<string, string> = {
      achilles: "Is that supposed to impress me? I've seen better from training dummies!",
      loki: "Oh, this is delicious. Please, do go on... 😏",
      einstein: "Your understanding of the game mechanics is... fascinating. And by that I mean wrong.",
      cleopatra: "How adorable. You really thought that was worth posting? 💅"
    };
    
    return fallbacks[replying_character_id] || "Interesting perspective...";
  }
}

// Determine which characters should post based on events
export function shouldCharacterPost(
  character_id: string,
  last_post_time: Date | null,
  recent_events: any[]
): boolean {
  const character_personalities: Record<string, any> = {}; // TODO: Import from character data
  const personality = character_personalities[character_id];
  if (!personality) return false;
  
  // Check minimum time between posts (varies by character)
  const minMinutesBetweenPosts = Math.floor(100 / personality.postFrequency) * 10;
  if (last_post_time) {
    const minutesSinceLastPost = (Date.now() - last_post_time.getTime()) / 1000 / 60;
    if (minutesSinceLastPost < minMinutesBetweenPosts) return false;
  }
  
  // Check if there's a triggering event
  const hasRecentLoss = recent_events.some(e => e.type === 'battle_loss' && e.character_id === character_id);
  const hasRecentWin = recent_events.some(e => e.type === 'battle_win' && e.character_id === character_id);
  const wasTrashTalked = recent_events.some(e => e.type === 'targeted' && e.target_id === character_id);
  
  // Different characters react to different triggers
  if (hasRecentLoss && personality.sensitivityToLosses > Math.random() * 100) return true;
  if (hasRecentWin && personality.postFrequency > Math.random() * 100) return true;
  if (wasTrashTalked && personality.memoryOfGrudges > Math.random() * 100) return true;
  
  // Random chance to post based on frequency
  return personality.postFrequency > Math.random() * 150;
}