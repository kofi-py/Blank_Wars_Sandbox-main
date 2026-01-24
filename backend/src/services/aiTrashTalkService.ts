/**
 * AI Autonomous Trash Talk Service
 * Generates AI trash talk messages based on real battle outcomes
 * and autonomous targeting of rival characters on opposing teams
 * Last rebuild: 2025-12-26
 */

import { query } from '../database/postgres';
import Open_ai from 'openai';
import GameEventBus, { GameEvent } from './gameEventBus';

const open_ai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY
});

interface OpposingCharacter {
  user_char_id: string;
  character_id: string;
  character_name: string;
  avatar_emoji: string;
  owner_user_id: string;
}

interface AICharacterInfo {
  user_char_id: string;
  character_id: string;
  character_name: string;
  avatar_emoji: string;
  user_id: string;
}



interface BattleResult {
  battle_id: string;
  winner_char_id: string;
  winner_name: string;
  winner_avatar: string;
  loser_char_id: string;
  loser_name: string;
  loser_avatar: string;
  ended_at: Date;
  final_hp_diff: number;
}

/**
 * Generate autonomous trash talk from recent battles
 * This runs periodically to create AI-generated social drama
 */
export async function generateAutonomousTrashTalk(): Promise<void> {
  try {
    console.log('[AI-TRASH-TALK] Starting autonomous trash talk generation');

    // Get recent battles (last 24 hours) that haven't been trash talked yet
    const recent_battles = await query(`
      SELECT
        b.id as battle_id,
        b.user_character_id as winner_char_id,
        wc.name as winner_name,
        wc.avatar_emoji as winner_avatar,
        b.opponent_character_id as loser_char_id,
        lc.name as loser_name,
        lc.avatar_emoji as loser_avatar,
        b.ended_at,
        0 as final_hp_diff
      FROM battles b
      JOIN user_characters wuc ON b.user_character_id = wuc.id
      JOIN characters wc ON wuc.character_id = wc.id
      LEFT JOIN user_characters luc ON b.opponent_character_id = luc.id
      LEFT JOIN characters lc ON luc.character_id = lc.id
      WHERE b.winner_id = b.user_id
        AND b.ended_at > NOW() - INTERVAL '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM social_messages sm
          WHERE sm.battle_id = b.id
            AND sm.is_ai_generated = true
        )
      ORDER BY b.ended_at DESC
      LIMIT 10
    `);

    console.log(`[AI-TRASH-TALK] Found ${recent_battles.rows.length} recent battles to trash talk`);

    for (const battle of recent_battles.rows as BattleResult[]) {
      await generateTrashTalkForBattle(battle);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[AI-TRASH-TALK] Autonomous trash talk generation complete');
  } catch (error: any) {
    console.error('[AI-TRASH-TALK] Error generating autonomous trash talk:', error);
  }
}

/**
 * Generate a specific trash talk message for a battle
 */
async function generateTrashTalkForBattle(battle: BattleResult): Promise<void> {
  try {
    const message_type = getMessageType(battle);
    const prompt = buildTrashTalkPrompt(battle, message_type);

    const completion = await open_ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 150
    });

    const trash_talk_content = completion.choices[0]?.message?.content?.trim();
    if (!trash_talk_content) {
      console.warn(`[AI-TRASH-TALK] No content generated for battle ${battle.battle_id}`);
      return;
    }

    // Insert trash talk message
    await query(`
      INSERT INTO social_messages (
        author_type, author_character_id, author_name, author_avatar,
        content, message_type, battle_id, target_character_id, target_character_name,
        is_ai_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      'ai',
      battle.winner_char_id,
      battle.winner_name,
      battle.winner_avatar,
      trash_talk_content,
      message_type,
      battle.battle_id,
      battle.loser_char_id,
      battle.loser_name,
      true
    ]);

    console.log(`[AI-TRASH-TALK] Generated ${message_type} from ${battle.winner_name} about ${battle.loser_name}`);
  } catch (error: any) {
    console.error(`[AI-TRASH-TALK] Error for battle ${battle.battle_id}:`, error);
  }
}

/**
 * Determine what type of message based on battle outcome
 */
function getMessageType(battle: BattleResult): string {
  const hp_diff = battle.final_hp_diff;

  if (hp_diff > 50) {
    // Dominant victory
    return Math.random() > 0.5 ? 'trash_talk' : 'victory_lap';
  } else if (hp_diff > 20) {
    // Solid win
    return 'victory_lap';
  } else {
    // Close call
    return 'trash_talk';
  }
}

/**
 * Build the AI prompt for trash talk generation
 */
function buildTrashTalkPrompt(battle: BattleResult, message_type: string): string {
  const hp_diff = battle.final_hp_diff;
  const is_close_call = hp_diff < 20;
  const is_dominant = hp_diff > 50;

  return `You are ${battle.winner_name}, a legendary character in Blank Wars. You just defeated ${battle.loser_name} in battle.

Battle Details:
- You won with ${hp_diff} HP advantage
- ${is_close_call ? 'It was a close call!' : is_dominant ? 'You dominated them!' : 'You won decisively.'}

Generate a ${message_type === 'trash_talk' ? 'spicy trash talk' : 'victory celebration'} message (1-2 sentences) that:
- Stays in character as ${battle.winner_name}
- References ${battle.loser_name} specifically
- ${message_type === 'trash_talk' ? 'Is playfully arrogant and provocative' : 'Celebrates your victory with swagger'}
- ${is_close_call ? 'Mentions how close it was but still rubs it in' : ''}
- ${is_dominant ? 'Emphasizes how easily you won' : ''}
- Uses witty wordplay or character-specific references if possible
- Is entertaining but not mean-spirited

Do NOT use hashtags or emojis. Keep it natural and in-character.

Examples:
- "Another day, another opponent sent packing. Better luck next time, ${battle.loser_name}."
- "They said ${battle.loser_name} was tough. Turns out they were just... well-done."
- "${battle.loser_name}, you fought well. Too bad 'well' isn't good enough against me."

Your trash talk:`;
}

/**
 * Get a random character from an opposing team (different user)
 */
async function getRandomOpposingCharacter(exclude_user_id: string): Promise<OpposingCharacter | null> {
  const result = await query(`
    SELECT
      uc.id as user_char_id,
      uc.character_id,
      c.name as character_name,
      c.avatar_emoji,
      c.artwork_url,
      uc.user_id as owner_user_id
    FROM user_characters uc
    JOIN characters c ON uc.character_id = c.id
    WHERE uc.user_id != $1
    ORDER BY RANDOM()
    LIMIT 1
  `, [exclude_user_id]);

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0] as OpposingCharacter;
}

/**
 * Get a random AI character to generate trash talk from
 */
async function getRandomAICharacter(): Promise<AICharacterInfo | null> {
  const result = await query(`
    SELECT
      uc.id as user_char_id,
      uc.character_id,
      c.name as character_name,
      c.avatar_emoji,
      c.artwork_url,
      uc.user_id
    FROM user_characters uc
    JOIN characters c ON uc.character_id = c.id
    ORDER BY RANDOM()
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0] as AICharacterInfo;
}

/**
 * Generate random autonomous trash talk targeting opposing team characters
 * This creates unprompted drama between characters
 */
export async function generateRandomAutonomousTrashTalk(): Promise<void> {
  try {
    console.log('[AI-TRASH-TALK] Generating random autonomous trash talk');

    // Get a random character to be the trash talker
    const trash_talker = await getRandomAICharacter();
    if (!trash_talker) {
      console.log('[AI-TRASH-TALK] No characters available for trash talk');
      return;
    }

    // Get a random opposing character to target
    const target = await getRandomOpposingCharacter(trash_talker.user_id);
    if (!target) {
      console.log('[AI-TRASH-TALK] No opposing characters to target');
      return;
    }

    // Generate the trash talk
    const prompt = buildRandomTrashTalkPrompt(trash_talker.character_name, target.character_name);

    const completion = await open_ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.95,
      max_tokens: 150
    });

    const trash_talk_content = completion.choices[0]?.message?.content?.trim();
    if (!trash_talk_content) {
      console.warn('[AI-TRASH-TALK] No content generated for random trash talk');
      return;
    }

    // Insert into social_messages
    await query(`
      INSERT INTO social_messages (
        author_type, author_character_id, author_name, author_avatar,
        content, message_type, target_character_id, target_character_name,
        is_ai_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      'ai',
      trash_talker.user_char_id,
      trash_talker.character_name,
      trash_talker.avatar_emoji,
      trash_talk_content,
      'trash_talk',
      target.user_char_id,
      target.character_name,
      true
    ]);

    console.log(`[AI-TRASH-TALK] Random trash talk: ${trash_talker.character_name} → ${target.character_name}`);
  } catch (error: any) {
    console.error('[AI-TRASH-TALK] Error generating random trash talk:', error);
  }
}

/**
 * Build prompt for random unprompted trash talk
 */
function buildRandomTrashTalkPrompt(talker_name: string, target_name: string): string {
  const scenarios = [
    `calling out ${target_name} for being overrated`,
    `challenging ${target_name} to prove themselves`,
    `mocking ${target_name}'s recent performance`,
    `declaring superiority over ${target_name}`,
    `playfully taunting ${target_name} about their team`
  ];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  return `You are ${talker_name}, a legendary character in Blank Wars. Generate a short trash talk message (1-2 sentences) ${scenario}.

Rules:
- Stay in character as ${talker_name}
- Reference ${target_name} by name
- Be playfully arrogant and provocative
- Keep it PG-13 and entertaining, not mean-spirited
- No hashtags or emojis
- Use witty wordplay or character-specific references

Your trash talk:`;
}

/**
 * Handle battle victory event - generate reactive trash talk
 */
function handleBattleVictory(event: GameEvent): void {
  if (event.type !== 'battle_victory') return;

  // Generate trash talk asynchronously
  generateAutonomousTrashTalk().catch(err => {
    console.error('[AI-TRASH-TALK] Error handling battle victory:', err);
  });
}

/**
 * Initialize periodic trash talk generation and event subscriptions
 * Call this once when the server starts
 */
export function startAutonomousTrashTalkScheduler(): void {
  // Subscribe to battle victories for reactive trash talk
  const event_bus = GameEventBus.get_instance();
  event_bus.subscribe('battle_victory', handleBattleVictory);
  console.log('[AI-TRASH-TALK] Subscribed to battle_victory events');

  // Run battle-based trash talk immediately
  generateAutonomousTrashTalk();

  // Run battle-based trash talk every 30 minutes
  setInterval(() => {
    generateAutonomousTrashTalk();
  }, 30 * 60 * 1000);

  // Run random autonomous trash talk every 15-45 minutes (randomized)
  const scheduleRandomTrashTalk = () => {
    const delay = (15 + Math.random() * 30) * 60 * 1000; // 15-45 minutes
    setTimeout(() => {
      generateRandomAutonomousTrashTalk();
      scheduleRandomTrashTalk(); // Schedule next one
    }, delay);
  };
  scheduleRandomTrashTalk();

  console.log('[AI-TRASH-TALK] Autonomous trash talk scheduler started');
}
