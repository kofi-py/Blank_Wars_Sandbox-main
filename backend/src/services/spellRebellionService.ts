/**
 * Spell Rebellion Service - AI auto-spends points when adherence fails
 *
 * When character earns points and adherence check fails:
 * - AI immediately chooses which spells to unlock/rank based on personality
 * - Points are spent permanently (can't undo)
 * - Coach loses control until adherence is restored
 *
 * Mirrors powerRebellionService.ts for spell system
 */

import { query } from '../database/index';
import { unlockSpell, rankUpSpell, getAvailableSpells } from './spellService';
import Open_ai from 'openai';

const openai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SpellChoice {
  spell_id: string;
  action: 'unlock' | 'rank_up';
  reasoning: string;
}

/**
 * AI auto-spends points when character rebels
 *
 * @param character_id - Character instance ID
 * @param points_earned - Points just earned that triggered rebellion
 * @returns Array of spells unlocked/ranked by AI
 */
export async function spell_rebellion_auto_spend_points(params: {
  character_id: string;
  points_earned: number;
}): Promise<any> {
  const { character_id, points_earned } = params;

  console.log(`🚨 SPELL REBELLION: Character ${character_id} is auto-spending ${points_earned} points on spells`);

  // Get character details and available spells
  const spell_data = await getAvailableSpells(character_id);
  const { character, spells } = spell_data;

  // Get character personality
  const char_result = await query(
    `SELECT uc.*, c.name, c.archetype, c.personality_traits
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [character_id]
  );

  if (char_result.rows.length === 0) {
    throw new Error(`Character ${character_id} not found`);
  }

  const character_data = char_result.rows[0];

  const personality_traits = character_data.personality_traits || [];

  // Separate spells by what AI can do with current points
  const available_to_unlock = spells.filter((s: any) => !s.is_unlocked && s.can_unlock.can);
  const available_to_rank = spells.filter((s: any) => s.is_unlocked && s.can_rank_up.can);

  if (available_to_unlock.length === 0 && available_to_rank.length === 0) {
    console.log('⚠️  No spells available to unlock or rank up');
    return {
      success: true,
      choices: [],
      message: 'No available spells to spend points on',
    };
  }

  // Ask AI to choose how to spend points
  const ai_choices = await getAISpellChoices({
    character_name: character_data.name,
    archetype: character_data.archetype,
    personality_traits: personality_traits,
    points_available: character.ability_points,
    available_to_unlock,
    available_to_rank,
  });

  // Execute AI's choices
  const results = [];
  for (const choice of ai_choices) {
    try {
      if (choice.action === 'unlock') {
        const result = await unlockSpell({
          character_id,
          spell_id: choice.spell_id,
        });
        results.push({
          ...result,
          reasoning: choice.reasoning,
        });
      } else if (choice.action === 'rank_up') {
        const result = await rankUpSpell({
          character_id,
          spell_id: choice.spell_id,
        });
        results.push({
          ...result,
          reasoning: choice.reasoning,
        });
      }
    } catch (error: any) {
      console.error(`❌ Failed to ${choice.action} spell ${choice.spell_id}:`, error.message);
      // Continue with other choices even if one fails
    }
  }

  console.log(`✅ Spell Rebellion complete. AI made ${results.length} spell choices.`);

  return {
    success: true,
    rebellion: true,
    choices: results,
    message: `${character_data.name} rebelled and spent points on their own spell choices!`,
  };
}

/**
 * Ask AI to choose which spells to unlock/rank
 * Uses multiple-choice format (A, B, C...) matching power rebellion pattern
 */
async function getAISpellChoices(params: {
  character_name: string;
  archetype: string;
  personality_traits: string[];
  points_available: number;
  available_to_unlock: any[];
  available_to_rank: any[];
}): Promise<SpellChoice[]> {
  const {
    character_name,
    archetype,
    personality_traits,
    points_available,
    available_to_unlock,
    available_to_rank,
  } = params;

  const results: SpellChoice[] = [];
  let remaining_points = points_available;

  // Keep choosing spells until no points left or no valid options
  while (remaining_points > 0) {
    // Filter spells by what we can afford with remaining points
    const affordable_unlock = available_to_unlock.filter((s: any) => remaining_points >= s.unlock_cost);
    const affordable_rank = available_to_rank.filter((s: any) => {
      const cost = s.current_rank === 1 ? s.rank_up_cost : s.rank_up_cost_r3;
      return remaining_points >= cost;
    });

    // Combine all affordable options
    const all_options = [
      ...affordable_unlock.map((s: any) => ({ ...s, action: 'unlock' as const, cost: s.unlock_cost })),
      ...affordable_rank.map((s: any) => ({
        ...s,
        action: 'rank_up' as const,
        cost: s.current_rank === 1 ? s.rank_up_cost : s.rank_up_cost_r3
      }))
    ];

    if (all_options.length === 0) {
      break; // No more affordable options
    }

    // Get AI to pick one spell from available options
    const choice = await getAISingleSpellChoice({
      character_name,
      archetype,
      personality_traits,
      remaining_points,
      available_options: all_options
    });

    results.push(choice);

    // Deduct spent points
    const spell = all_options.find(s => s.id === choice.spell_id);
    if (spell) {
      remaining_points -= spell.cost;
    }

    // Remove chosen spell from available lists
    const chosen_index = all_options.findIndex(s => s.id === choice.spell_id);
    if (chosen_index !== -1) {
      if (all_options[chosen_index].action === 'unlock') {
        const idx = available_to_unlock.findIndex(s => s.id === choice.spell_id);
        if (idx !== -1) available_to_unlock.splice(idx, 1);
      } else {
        const idx = available_to_rank.findIndex(s => s.id === choice.spell_id);
        if (idx !== -1) available_to_rank.splice(idx, 1);
      }
    }
  }

  return results;
}

/**
 * Get AI to pick a single spell from available options using multiple choice
 * Matches power rebellion pattern exactly
 */
async function getAISingleSpellChoice(params: {
  character_name: string;
  archetype: string;
  personality_traits: string[];
  remaining_points: number;
  available_options: Array<{
    id: string;
    name: string;
    description: string;
    tier: string;
    action: 'unlock' | 'rank_up';
    cost: number;
    current_rank?: number;
    max_rank?: number;
    mana_cost?: number;
    cooldown_turns?: number;
  }>;
}): Promise<SpellChoice> {
  const { character_name, archetype, personality_traits, remaining_points, available_options } = params;

  // Build multiple choice list (A, B, C, D, E, F)
  const choice_letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const limited_options = available_options.slice(0, 6); // Max 6 options

  const choices_list = limited_options.map((option, i) => {
    const rank_info = option.action === 'rank_up' ? ` (Rank ${option.current_rank}/${option.max_rank})` : '';
    const spell_stats = ` [${option.mana_cost || 0} mana, ${option.cooldown_turns || 0}T CD]`;
    return `${choice_letters[i]}) ${option.name}${rank_info} - ${option.description}${spell_stats} [${option.tier}, ${option.cost} points]`;
  }).join('\n');

  const personality_context = `
ABOUT YOU:
- Archetype: ${archetype}
- Personality Traits: ${personality_traits.join(', ')}`;

  const prompt = `SPELL REBELLION SCENARIO:

You have just gained character points but you don't trust your coach's judgment right now.
You're REJECTING their guidance and picking SPELLS that fit YOUR personality and magical style.
${personality_context}

REMAINING POINTS: ${remaining_points}

SPELL OPTIONS (all are affordable with your remaining points):
${choices_list}

CRITICAL: You are OVERRIDING the coach. Pick ONE spell from the list above that best fits your personality and combat style.

RESPOND IN JSON FORMAT:
{
  "choice": "A" (or B, C, etc. - MUST be from the list),
  "reasoning": "Brief explanation of why this spell fits your personality (1-2 sentences)"
}

Requirements for reasoning:
- Explain how this spell aligns with your personality traits
- Keep it natural and conversational (1-2 sentences)
- Don't introduce yourself or be overly formal

Your response:`;

  try {
    if (!process.env.OPENAI_MODEL) {
      throw new Error('OPENAI_MODEL environment variable is not configured');
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are ${character_name}. You're choosing a spell that fits your personality: ${personality_traits.join(', ')}. Respond with valid JSON only.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error('Open_ai returned empty response');
    }

    const parsed = JSON.parse(response.choices[0].message.content);
    const choice_letter = parsed.choice?.toUpperCase();
    const reasoning = parsed.reasoning;

    if (!choice_letter || !reasoning) {
      throw new Error('Invalid AI response: missing choice or reasoning');
    }

    // Parse letter to index
    const choice_index = choice_letters.indexOf(choice_letter);
    if (choice_index === -1 || choice_index >= limited_options.length) {
      throw new Error(`Invalid choice letter: ${choice_letter}`);
    }

    const selected_spell = limited_options[choice_index];

    console.log(`✅ [AI-SPELL-CHOICE] ${character_name} chose ${selected_spell.name} (${selected_spell.action})`);
    console.log(`💬 [AI-REASONING] "${reasoning}"`);

    return {
      spell_id: selected_spell.id,
      action: selected_spell.action,
      reasoning
    };

  } catch (error) {
    console.error('❌ AI spell choice failed:', error);
    throw error; // Re-throw so caller knows AI failed
  }
}
