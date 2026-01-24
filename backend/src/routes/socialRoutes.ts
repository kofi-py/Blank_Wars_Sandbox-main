import express from 'express';
import { authenticate_token } from '../services/auth';
import { require_ticket } from '../middleware/ticketMiddleware';
import { ai_chat_service } from '../services/aiChatService';
import { db } from '../database/index';
import { AuthRequest } from '../types/index';
import { RewardConfig } from '../services/challengeRewardService';
// We'll need to implement character data access - for now using a simple lookup
const character_psychology_data: Record<string, any> = {
  'sherlock_holmes': {
    name: 'Sherlock Holmes',
    personality: {
      traits: ['Analytical', 'Brilliant', 'Observant', 'Arrogant'],
      speech_style: 'Precise and condescending',
      motivations: ['Truth', 'Intellectual challenge', 'Justice'],
      fears: ['Boredom', 'Mediocrity', 'Unsolved mysteries']
    },
    historical_period: 'Victorian Era',
    mythology: 'Literary detective fiction'
  },
  'count_dracula': {
    name: 'Count Dracula',
    personality: {
      traits: ['Aristocratic', 'Manipulative', 'Charismatic', 'Ruthless'],
      speech_style: 'Formal and theatrical',
      motivations: ['Power', 'Survival', 'Domination'],
      fears: ['Holy symbols', 'Sunlight', 'Wooden stakes']
    },
    historical_period: 'Medieval/Victorian',
    mythology: 'Gothic horror'
  },
  'joan_of_arc': {
    name: 'Joan of Arc',
    personality: {
      traits: ['Devout', 'Courageous', 'Determined', 'Inspirational'],
      speech_style: 'Passionate and righteous',
      motivations: ['Divine mission', 'French victory', 'Faith'],
      fears: ['Failing God', 'English victory', 'Betrayal']
    },
    historical_period: 'Medieval France',
    mythology: 'Historical saint'
  },
  'achilles': {
    name: 'Achilles',
    personality: {
      traits: ['Prideful', 'Fierce', 'Loyal', 'Wrathful'],
      speech_style: 'Bold and dramatic',
      motivations: ['Glory', 'Honor', 'Revenge'],
      fears: ['Dishonor', 'Being forgotten', 'Cowardice']
    },
    historical_period: 'Ancient Greece',
    mythology: 'Greek mythology'
  },
  'genghis_khan': {
    name: 'Genghis Khan',
    personality: {
      traits: ['Strategic', 'Ruthless', 'Adaptive', 'Ambitious'],
      speech_style: 'Commanding and direct',
      motivations: ['Conquest', 'Empire building', 'Unity'],
      fears: ['Weakness', 'Betrayal', 'Defeat']
    },
    historical_period: 'Medieval Mongolia',
    mythology: 'Historical conqueror'
  },
  'nikola_tesla': {
    name: 'Nikola Tesla',
    personality: {
      traits: ['Brilliant', 'Eccentric', 'Visionary', 'Obsessive'],
      speech_style: 'Technical and passionate',
      motivations: ['Scientific discovery', 'Innovation', 'Progress'],
      fears: ['Failure', 'Theft of ideas', 'Mediocrity']
    },
    historical_period: 'Industrial Revolution',
    mythology: 'Historical inventor'
  },
  'cleopatra': {
    name: 'Cleopatra',
    personality: {
      traits: ['Intelligent', 'Charming', 'Cunning', 'Regal'],
      speech_style: 'Elegant and commanding',
      motivations: ['Power', 'Egypt\'s glory', 'Legacy'],
      fears: ['Rome\'s conquest', 'Betrayal', 'Obscurity']
    },
    historical_period: 'Ancient Egypt',
    mythology: 'Historical queen'
  },
  'merlin': {
    name: 'Merlin',
    personality: {
      traits: ['Wise', 'Mysterious', 'Powerful', 'Cryptic'],
      speech_style: 'Mystical and knowing',
      motivations: ['Knowledge', 'Guidance', 'Balance'],
      fears: ['Misuse of power', 'Prophecy', 'Corruption']
    },
    historical_period: 'Arthurian Legend',
    mythology: 'Celtic/Arthurian mythology'
  }
};

const router = express.Router();

// POST /api/social/ai-drama - Generate AI drama board messages
router.post('/ai-drama', authenticate_token, require_ticket('social_drama'), async (req: any, res) => {
  try {
    const { character_id, trigger_type, battle_history, rivalries, context } = req.body;

    // Get character personality from frontend data
    const character_data = character_psychology_data[character_id];
    if (!character_data) {
      return res.status(400).json({ error: 'Character not found' });
    }

    // Build drama context based on trigger type
    let drama_prompt = '';
    switch (trigger_type) {
      case 'battle_victory':
        drama_prompt = `You just won a battle against ${battle_history?.opponent || 'an opponent'}. Generate a short, cocky trash talk message for the drama board. Be in character and reference the victory. Keep it under 100 words.`;
        break;
      case 'battle_defeat':
        drama_prompt = `You just lost a battle to ${battle_history?.opponent || 'an opponent'}. Generate a short, defiant or excuse-making message for the drama board. Be in character and show your reaction to the loss. Keep it under 100 words.`;
        break;
      case 'rivalry_escalation':
        drama_prompt = `Your rivalry with ${rivalries?.target || 'another character'} has escalated. Generate a short, heated message calling them out on the drama board. Be in character and reference your ongoing conflict. Keep it under 100 words.`;
        break;
      case 'random_drama':
        drama_prompt = `Generate a random dramatic statement or trash talk for the drama board. Be in character and create some spicy content that would stir up drama. Keep it under 100 words.`;
        break;
      default:
        drama_prompt = 'Generate a dramatic statement for the drama board. Be in character and create engaging content.';
    }

    // Use AI service to generate response
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality,
        historical_period: character_data.historical_period,
        mythology: character_data.mythology,
        current_bond_level: 50
      },
      drama_prompt,
      req.user.id,
      db,
      { is_in_battle: false }
    );

    res.json({
      message: response.message,
      character: character_data.name,
      timestamp: new Date().toISOString(),
      trigger_type
    });

  } catch (error) {
    console.error('AI Drama generation error:', error);
    res.status(500).json({ error: 'Failed to generate drama message' });
  }
});

// POST /api/social/lounge - Generate social lounge conversations
router.post('/lounge', authenticate_token, async (req: any, res) => {
  try {
    const { character_id, context, user_message, conversation_type } = req.body;

    // Get character personality from frontend data
    const character_data = character_psychology_data[character_id];
    if (!character_data) {
      return res.status(400).json({ error: 'Character not found' });
    }

    // Query recent PUBLIC events (exclude therapy, confessional, personal_problems)
    const events_result = await query(
      `SELECT type, description, category, userchar_ids, timestamp
       FROM game_events
       WHERE timestamp > NOW() - INTERVAL '24 hours'
       AND category NOT IN ('therapy', 'confessional', 'personal_problems')
       ORDER BY timestamp DESC
       LIMIT 10`
    );
    const recent_events = events_result.rows;

    // Format events for AI context
    const events_context = recent_events.length > 0
      ? recent_events.map((e: { type: string; description: string; category: string }) =>
          `- ${e.description} (${e.category})`
        ).join('\n')
      : '';

    // Build lounge conversation context with real events
    let lounge_prompt = '';
    if (conversation_type === 'character_interaction') {
      lounge_prompt = `You're in the social lounge with other characters. Be in character and engage naturally. Keep responses conversational (2-3 sentences max).`;
      if (events_context) {
        lounge_prompt += `\n\nRecent events you might reference naturally:\n${events_context}`;
      }
    } else if (conversation_type === 'user_chat') {
      lounge_prompt = `A coach just said: "${user_message}". Respond naturally in character.`;
      if (events_context) {
        lounge_prompt += `\n\nRecent events for context:\n${events_context}`;
      }
    } else {
      lounge_prompt = `You're relaxing in the social lounge. Be in character and show your personality. Keep it conversational.`;
      if (events_context) {
        lounge_prompt += `\n\nRecent events you might bring up:\n${events_context}`;
      }
    }

    // Use AI service to generate response
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality,
        historical_period: character_data.historical_period,
        mythology: character_data.mythology,
        current_bond_level: context?.bond_level,
        previous_messages: context?.previous_messages
      },
      lounge_prompt,
      req.user.id,
      db,
      { is_in_battle: false }
    );

    res.json({
      message: response.message,
      character: character_data.name,
      character_id,
      timestamp: new Date().toISOString(),
      bond_increase: response.bond_increase
    });

  } catch (error) {
    console.error('Lounge conversation error:', error);
    res.status(500).json({ error: 'Failed to generate lounge response' });
  }
});

// POST /api/social/message-board - Generate message board AI responses
router.post('/message-board', authenticate_token, async (req: any, res) => {
  try {
    const { user_message, context, response_type = 'random' } = req.body;

    // Select random characters to respond (2-3 characters)
    const available_characters = Object.keys(character_psychology_data);
    const num_responses = Math.min(3, Math.floor(Math.random() * 2) + 2); // 2-3 responses
    const selected_characters = available_characters
      .sort(() => Math.random() - 0.5)
      .slice(0, num_responses);

    const responses = [];

    for (const character_id of selected_characters) {
      const character_data = character_psychology_data[character_id];

      // Create response prompt based on user message
      const board_prompt = `A user just posted on the community message board: "${user_message}".

      Generate a response to this post. Be in character and react authentically to what they said.
      Your response should be:
      - Relevant to their message
      - Show your personality
      - Be conversational (1-2 sentences)
      - Either supportive, challenging, or adding your own perspective

      Don't just acknowledge - actually engage with their content.`;

      try {
        const response = await ai_chat_service.generate_character_response(
          {
            character_id,
            character_name: character_data.name,
            personality: character_data.personality,
            historical_period: character_data.historical_period,
            mythology: character_data.mythology,
            current_bond_level: 50
          },
          board_prompt,
          req.user.id,
          db,
          { is_in_battle: false }
        );

        responses.push({
          message: response.message,
          character: character_data.name,
          character_id,
          timestamp: new Date().toISOString(),
          bond_increase: response.bond_increase
        });

        // Add small delay between AI calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error generating response for ${character_id}:`, error);
        // Continue with other characters if one fails
      }
    }

    res.json({
      responses,
      original_message: user_message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Message board response error:', error);
    res.status(500).json({ error: 'Failed to generate message board responses' });
  }
});

// ===== UNIFIED SOCIAL MESSAGE BOARD =====
// New routes for persistent social messages (coaches, characters, AI trash talk)

import { query } from '../database/postgres';

// Get social messages with filters
router.get('/board/messages', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const {
      message_type,  // filter by type
      author_type,   // filter by coach/character/ai
      limit = 50,
      offset = 0,
      include_replies = true
    } = req.query;

    let where_clause = 'WHERE 1=1';
    const params: any[] = [];
    let param_index = 1;

    if (message_type && message_type !== 'all') {
      where_clause += ` AND message_type = $${param_index}`;
      params.push(message_type);
      param_index++;
    }

    if (author_type && author_type !== 'all') {
      where_clause += ` AND author_type = $${param_index}`;
      params.push(author_type);
      param_index++;
    }

    const messages_query = `
      SELECT
        sm.*,
        b.ended_at as battle_date,
        tc.name as target_char_name
      FROM social_messages sm
      LEFT JOIN battles b ON sm.battle_id = b.id
      LEFT JOIN user_characters uc ON sm.target_character_id = uc.id
      LEFT JOIN characters tc ON uc.character_id = tc.id
      ${where_clause}
      ORDER BY
        sm.is_pinned DESC,
        sm.created_at DESC
      LIMIT $${param_index} OFFSET $${param_index + 1}
    `;

    params.push(limit, offset);

    const messages_result = await query(messages_query, params);
    const messages = messages_result.rows;

    // Optionally fetch replies for each message
    if (include_replies === 'true' || include_replies === true) {
      for (const message of messages) {
        const replies_result = await query(
          `SELECT * FROM social_message_replies
           WHERE message_id = $1
           ORDER BY created_at ASC`,
          [message.id]
        );
        message.replies = replies_result.rows;
      }
    }

    res.json({
      ok: true,
      messages,
      total: messages_result.rowCount
    });
  } catch (error: any) {
    console.error('[SOCIAL-BOARD] Get messages error:', error);
    res.status(500).json({
      ok: false,
      error: 'failed_to_fetch_messages',
      detail: error.message
    });
  }
});

// Post a new message (coach or character)
router.post('/board/messages', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const {
      content,
      message_type = 'general',
      character_id,  // If posting as character
      tags = []
    } = req.body;

    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'content_required' });
    }

    let author_type: string;
    let author_character_id: string | null = null;
    let author_user_id: string | null = null;
    let author_name: string;
    let author_avatar: string;

    if (character_id) {
      // Posting as character - verify ownership
      const char_result = await query(
        `SELECT uc.id, c.name, c.avatar_emoji
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.id = $1 AND uc.user_id = $2`,
        [character_id, user_id]
      );

      if (char_result.rows.length === 0) {
        return res.status(403).json({ ok: false, error: 'character_not_owned' });
      }

      author_type = 'contestant';
      author_character_id = character_id;
      author_name = char_result.rows[0].name;
      author_avatar = char_result.rows[0].avatar_emoji;
    } else {
      // Posting as coach
      const user_result = await query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );

      if (user_result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'user_not_found' });
      }

      author_type = 'coach';
      author_user_id = user_id;
      author_name = user_result.rows[0].username || 'Coach';
      author_avatar = '🎯';  // Default coach avatar
    }

    const insert_result = await query(
      `INSERT INTO social_messages (
        author_type, author_user_id, author_character_id,
        author_name, author_avatar, content, message_type,
        tags, is_ai_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        author_type,
        author_user_id,
        author_character_id,
        author_name,
        author_avatar,
        content,
        message_type,
        tags,
        false  // Not AI generated
      ]
    );

    res.json({
      ok: true,
      message: insert_result.rows[0]
    });
  } catch (error: any) {
    console.error('[SOCIAL-BOARD] Post message error:', error);
    res.status(500).json({
      ok: false,
      error: 'failed_to_post_message',
      detail: error.message
    });
  }
});

// Add a reply to a message
router.post('/board/messages/:message_id/replies', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { message_id } = req.params;
    const { content, character_id } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'content_required' });
    }

    // Verify message exists
    const message_check = await query(
      'SELECT id FROM social_messages WHERE id = $1',
      [message_id]
    );

    if (message_check.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'message_not_found' });
    }

    let author_type: string;
    let author_character_id: string | null = null;
    let author_user_id: string | null = null;
    let author_name: string;
    let author_avatar: string;

    if (character_id) {
      const char_result = await query(
        `SELECT uc.id, c.name, c.avatar_emoji
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.id = $1 AND uc.user_id = $2`,
        [character_id, user_id]
      );

      if (char_result.rows.length === 0) {
        return res.status(403).json({ ok: false, error: 'character_not_owned' });
      }

      author_type = 'contestant';
      author_character_id = character_id;
      author_name = char_result.rows[0].name;
      author_avatar = char_result.rows[0].avatar_emoji;
    } else {
      const user_result = await query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );

      author_type = 'coach';
      author_user_id = user_id;
      author_name = user_result.rows[0].username || 'Coach';
      author_avatar = '🎯';
    }

    const insert_result = await query(
      `INSERT INTO social_message_replies (
        message_id, author_type, author_user_id, author_character_id,
        author_name, author_avatar, content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [message_id, author_type, author_user_id, author_character_id, author_name, author_avatar, content]
    );

    res.json({
      ok: true,
      reply: insert_result.rows[0]
    });
  } catch (error: any) {
    console.error('[SOCIAL-BOARD] Post reply error:', error);
    res.status(500).json({
      ok: false,
      error: 'failed_to_post_reply',
      detail: error.message
    });
  }
});

// React to a message (like/flame)
router.post('/board/messages/:message_id/react', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { message_id } = req.params;
    const { reaction_type = 'like' } = req.body;  // 'like' or 'flame'
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    if (!['like', 'flame'].includes(reaction_type)) {
      return res.status(400).json({ ok: false, error: 'invalid_reaction_type' });
    }

    // Toggle reaction (remove if exists, add if doesn't)
    const existing = await query(
      'SELECT id FROM social_message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction_type = $3',
      [message_id, user_id, reaction_type]
    );

    if (existing.rows.length > 0) {
      // Remove reaction
      await query(
        'DELETE FROM social_message_reactions WHERE id = $1',
        [existing.rows[0].id]
      );

      // Decrement count
      const column = reaction_type === 'like' ? 'likes' : 'flames';
      await query(
        `UPDATE social_messages SET ${column} = ${column} - 1 WHERE id = $1`,
        [message_id]
      );

      res.json({ ok: true, action: 'removed' });
    } else {
      // Add reaction
      await query(
        'INSERT INTO social_message_reactions (message_id, user_id, reaction_type) VALUES ($1, $2, $3)',
        [message_id, user_id, reaction_type]
      );

      // Increment count
      const column = reaction_type === 'like' ? 'likes' : 'flames';
      await query(
        `UPDATE social_messages SET ${column} = ${column} + 1 WHERE id = $1`,
        [message_id]
      );

      res.json({ ok: true, action: 'added' });
    }
  } catch (error: any) {
    console.error('[SOCIAL-BOARD] React error:', error);
    res.status(500).json({
      ok: false,
      error: 'failed_to_react',
      detail: error.message
    });
  }
});

// ===== GRAFFITI WALL =====

// Get all graffiti art
router.get('/graffiti', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { art_type, limit = 50, offset = 0 } = req.query;

    let where_clause = 'WHERE is_hidden = FALSE AND moderation_status = $1';
    const params: any[] = ['approved'];
    let param_index = 2;

    if (art_type && art_type !== 'all') {
      where_clause += ` AND art_type = $${param_index}`;
      params.push(art_type);
      param_index++;
    }

    params.push(limit, offset);

    const result = await query(
      `SELECT * FROM graffiti_art
       ${where_clause}
       ORDER BY is_featured DESC, created_at DESC
       LIMIT $${param_index} OFFSET $${param_index + 1}`,
      params
    );

    res.json({ ok: true, graffiti: result.rows });
  } catch (error: any) {
    console.error('[GRAFFITI] Get error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_graffiti', detail: error.message });
  }
});

// Create new graffiti art
router.post('/graffiti', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const {
      title,
      art_type,
      canvas_data,
      position,
      tags,
      colors_used,
      tools_used,
      time_spent_seconds,
      character_id
    } = req.body;

    if (!title) {
      return res.status(400).json({ ok: false, error: 'title_required' });
    }
    if (!art_type) {
      return res.status(400).json({ ok: false, error: 'art_type_required' });
    }
    if (!canvas_data) {
      return res.status(400).json({ ok: false, error: 'canvas_data_required' });
    }

    let artist_name: string;
    let artist_avatar: string;
    let artist_character_id: string | null = null;

    if (character_id) {
      // Posting as character - verify ownership and get info
      const char_result = await query(
        `SELECT uc.id, c.name, c.avatar_emoji
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.id = $1 AND uc.user_id = $2`,
        [character_id, user_id]
      );

      if (char_result.rows.length === 0) {
        return res.status(403).json({ ok: false, error: 'character_not_owned' });
      }

      artist_character_id = character_id;
      artist_name = char_result.rows[0].name;
      artist_avatar = char_result.rows[0].avatar_emoji;
    } else {
      // Posting as coach
      const user_result = await query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );

      if (user_result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'user_not_found' });
      }

      artist_name = user_result.rows[0].username;
      artist_avatar = '🎯';
    }

    const insert_result = await query(
      `INSERT INTO graffiti_art (
        artist_user_id, artist_character_id, artist_name, artist_avatar,
        title, art_type, canvas_data,
        position_x, position_y, display_width, display_height,
        tags, colors_used, tools_used, time_spent_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        user_id,
        artist_character_id,
        artist_name,
        artist_avatar,
        title,
        art_type,
        JSON.stringify(canvas_data),
        position?.x ?? 0,
        position?.y ?? 0,
        position?.width ?? 200,
        position?.height ?? 150,
        tags ?? [],
        colors_used ?? [],
        tools_used ?? [],
        time_spent_seconds ?? 0
      ]
    );

    res.json({ ok: true, art: insert_result.rows[0] });
  } catch (error: any) {
    console.error('[GRAFFITI] Create error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_create_graffiti', detail: error.message });
  }
});

// Like/unlike graffiti art
router.post('/graffiti/:art_id/like', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { art_id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const existing = await query(
      'SELECT id FROM graffiti_likes WHERE art_id = $1 AND user_id = $2',
      [art_id, user_id]
    );

    if (existing.rows.length > 0) {
      await query('DELETE FROM graffiti_likes WHERE id = $1', [existing.rows[0].id]);
      res.json({ ok: true, action: 'unliked' });
    } else {
      await query(
        'INSERT INTO graffiti_likes (art_id, user_id) VALUES ($1, $2)',
        [art_id, user_id]
      );
      res.json({ ok: true, action: 'liked' });
    }
  } catch (error: any) {
    console.error('[GRAFFITI] Like error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_toggle_like', detail: error.message });
  }
});

// ===== LOUNGE CHAT =====

// Get lounge messages
router.get('/lounge/messages', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { limit = 100, before } = req.query;
    const params: any[] = [limit];

    let where_clause = '';
    if (before) {
      where_clause = 'WHERE created_at < $2';
      params.push(before);
    }

    const result = await query(
      `SELECT id, sender_type, sender_user_id,
              sender_character_id as character_id,
              sender_name as character_name,
              sender_avatar as character_avatar,
              content, message_type, mentions, created_at,
              is_ai_generated
       FROM lounge_messages
       ${where_clause}
       ORDER BY created_at DESC
       LIMIT $1`,
      params
    );

    // Return chronological order
    res.json({ ok: true, messages: result.rows.reverse() });
  } catch (error: any) {
    console.error('[LOUNGE] Get messages error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_messages', detail: error.message });
  }
});

// Post lounge message
router.post('/lounge/messages', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const { content, message_type, character_id, mentions } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'content_required' });
    }

    let sender_type: string;
    let sender_character_id: string | null = null;
    let sender_name: string;
    let sender_avatar: string;

    if (character_id) {
      // Posting as character
      const char_result = await query(
        `SELECT uc.id, c.name, c.avatar_emoji
         FROM user_characters uc
         JOIN characters c ON uc.character_id = c.id
         WHERE uc.id = $1 AND uc.user_id = $2`,
        [character_id, user_id]
      );

      if (char_result.rows.length === 0) {
        return res.status(403).json({ ok: false, error: 'character_not_owned' });
      }

      sender_type = 'character';
      sender_character_id = character_id;
      sender_name = char_result.rows[0].name;
      sender_avatar = char_result.rows[0].avatar_emoji;
    } else {
      // Posting as coach
      const user_result = await query(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );

      if (user_result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'user_not_found' });
      }

      sender_type = 'coach';
      sender_name = user_result.rows[0].username;
      sender_avatar = '🎯';
    }

    const insert_result = await query(
      `INSERT INTO lounge_messages (
        sender_type, sender_user_id, sender_character_id,
        sender_name, sender_avatar,
        content, message_type, mentions, is_ai_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        sender_type,
        user_id,
        sender_character_id,
        sender_name,
        sender_avatar,
        content,
        message_type ?? 'chat',
        mentions ?? [],
        false
      ]
    );

    res.json({ ok: true, message: insert_result.rows[0] });
  } catch (error: any) {
    console.error('[LOUNGE] Post message error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_post_message', detail: error.message });
  }
});

// Get lounge presence
router.get('/lounge/presence', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT lp.*, u.username, c.name as character_name, c.avatar_emoji
       FROM lounge_presence lp
       JOIN users u ON lp.user_id = u.id
       LEFT JOIN user_characters uc ON lp.character_id = uc.id
       LEFT JOIN characters c ON uc.character_id = c.id
       WHERE lp.last_active_at > NOW() - INTERVAL '5 minutes'
       ORDER BY lp.joined_at DESC`
    );

    res.json({ ok: true, presence: result.rows });
  } catch (error: any) {
    console.error('[LOUNGE] Get presence error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_presence', detail: error.message });
  }
});

// Update lounge presence (join/heartbeat)
router.post('/lounge/presence', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const { character_id, status, mood, current_activity } = req.body;

    if (character_id) {
      // Verify ownership
      const char_result = await query(
        'SELECT id FROM user_characters WHERE id = $1 AND user_id = $2',
        [character_id, user_id]
      );

      if (char_result.rows.length === 0) {
        return res.status(403).json({ ok: false, error: 'character_not_owned' });
      }

      // Upsert character presence
      await query(
        `INSERT INTO lounge_presence (user_id, character_id, status, mood, current_activity)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (character_id) WHERE character_id IS NOT NULL
         DO UPDATE SET status = $3, mood = $4, current_activity = $5, last_active_at = CURRENT_TIMESTAMP`,
        [user_id, character_id, status ?? 'active', mood ?? 'neutral', current_activity]
      );
    } else {
      // Upsert coach presence
      await query(
        `INSERT INTO lounge_presence (user_id, status, mood, current_activity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) WHERE character_id IS NULL
         DO UPDATE SET status = $2, mood = $3, current_activity = $4, last_active_at = CURRENT_TIMESTAMP`,
        [user_id, status ?? 'active', mood ?? 'neutral', current_activity]
      );
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error('[LOUNGE] Update presence error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_update_presence', detail: error.message });
  }
});

// Leave lounge
router.delete('/lounge/presence', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const user_id = req.user?.id;
    const { character_id } = req.query;

    if (character_id) {
      await query('DELETE FROM lounge_presence WHERE character_id = $1', [character_id]);
    } else if (user_id) {
      await query('DELETE FROM lounge_presence WHERE user_id = $1 AND character_id IS NULL', [user_id]);
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error('[LOUNGE] Leave error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_leave', detail: error.message });
  }
});

// ============================================================================
// COMMUNITY STATS
// ============================================================================

// GET /social/stats - Get community statistics
router.get('/stats', authenticate_token, async (req: AuthRequest, res) => {
  try {
    // Active users today (posted messages or in lounge in last 24h)
    const active_today_result = await query(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT author_user_id as user_id FROM social_messages WHERE created_at > NOW() - INTERVAL '24 hours' AND author_user_id IS NOT NULL
        UNION
        SELECT sender_user_id as user_id FROM lounge_messages WHERE created_at > NOW() - INTERVAL '24 hours'
        UNION
        SELECT user_id FROM lounge_presence WHERE last_active_at > NOW() - INTERVAL '24 hours'
      ) active_users
    `);

    // Total users
    const total_users_result = await query('SELECT COUNT(*) as count FROM users');

    // Messages posted today
    const messages_today_result = await query(`
      SELECT COUNT(*) as count FROM social_messages WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    // Total graffiti art
    const graffiti_result = await query('SELECT COUNT(*) as count FROM graffiti_art');

    // Active guilds
    const guilds_result = await query('SELECT COUNT(*) as count FROM guilds');

    // Battles completed today
    const battles_result = await query(`
      SELECT COUNT(*) as count FROM battles
      WHERE status = 'completed' AND ended_at > NOW() - INTERVAL '24 hours'
    `);

    // Trending tags from recent messages
    const tags_result = await query(`
      SELECT tag, COUNT(*) as count
      FROM (
        SELECT unnest(tags) as tag FROM social_messages
        WHERE created_at > NOW() - INTERVAL '7 days' AND tags IS NOT NULL AND array_length(tags, 1) > 0
      ) t
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 8
    `);

    // Top guilds by total power
    const top_guilds_result = await query(`
      SELECT name FROM guilds ORDER BY total_power DESC LIMIT 5
    `);

    // Featured art (most liked recent graffiti)
    const featured_art_result = await query(`
      SELECT id FROM graffiti_art ORDER BY likes DESC, created_at DESC LIMIT 3
    `);

    res.json({
      ok: true,
      stats: {
        active_today: parseInt(active_today_result.rows[0].count),
        total_users: parseInt(total_users_result.rows[0].count),
        messages_posted: parseInt(messages_today_result.rows[0].count),
        graffiti_created: parseInt(graffiti_result.rows[0].count),
        guilds_active: parseInt(guilds_result.rows[0].count),
        battles_completed: parseInt(battles_result.rows[0].count),
        trending_tags: tags_result.rows.map((r: { tag: string }) => r.tag),
        top_guilds: top_guilds_result.rows.map((r: { name: string }) => r.name),
        featured_art: featured_art_result.rows.map((r: { id: string }) => r.id)
      }
    });
  } catch (error: any) {
    console.error('[SOCIAL] Stats error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_stats', detail: error.message });
  }
});

// ============================================================================
// COMMUNITY EVENTS
// ============================================================================

// GET /social/events - Get community events
router.get('/events', authenticate_token, async (req: AuthRequest, res) => {
  try {
    // First update event statuses based on dates
    await query(`SELECT update_event_status()`);

    // Get events
    const events_result = await query(`
      SELECT
        id,
        title,
        description,
        event_type as type,
        status,
        start_date,
        end_date,
        participants_count as participants,
        max_participants,
        rewards
      FROM community_events
      WHERE status IN ('active', 'upcoming')
        OR (status = 'completed' AND end_date > NOW() - INTERVAL '7 days')
      ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'upcoming' THEN 2
          ELSE 3
        END,
        start_date ASC
      LIMIT 20
    `);

    res.json({
      ok: true,
      events: events_result.rows.map((e: {
        id: string;
        type: string;
        title: string;
        description: string;
        status: string;
        start_date: string;
        end_date: string;
        participants: number;
        max_participants: number;
        rewards: RewardConfig[];
      }) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        status: e.status,
        start_date: e.start_date,
        end_date: e.end_date,
        participants: e.participants,
        max_participants: e.max_participants,
        rewards: e.rewards
      }))
    });
  } catch (error: any) {
    console.error('[SOCIAL] Events error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_fetch_events', detail: error.message });
  }
});

// POST /social/events/:id/register - Register for an event
router.post('/events/:id/register', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const event_id = req.params.id;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ ok: false, error: 'not_authenticated' });
    }

    // Check event exists and is open for registration
    const event_check = await query(`
      SELECT id, status, max_participants, participants_count
      FROM community_events WHERE id = $1
    `, [event_id]);

    if (event_check.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'event_not_found' });
    }

    const event = event_check.rows[0];

    if (event.status !== 'upcoming' && event.status !== 'active') {
      return res.status(400).json({ ok: false, error: 'event_not_open' });
    }

    if (event.max_participants && event.participants_count >= event.max_participants) {
      return res.status(400).json({ ok: false, error: 'event_full' });
    }

    // Register user
    await query(`
      INSERT INTO community_event_participants (event_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (event_id, user_id) DO NOTHING
    `, [event_id, user_id]);

    res.json({ ok: true, message: 'registered' });
  } catch (error: any) {
    console.error('[SOCIAL] Event register error:', error);
    res.status(500).json({ ok: false, error: 'failed_to_register', detail: error.message });
  }
});

export default router;