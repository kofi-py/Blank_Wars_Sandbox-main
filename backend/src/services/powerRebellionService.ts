/**
 * Power Rebellion Service - AI auto-spends points when adherence fails
 *
 * When character earns points and adherence check fails:
 * - AI immediately chooses which powers to unlock/rank based on personality
 * - Points are spent permanently (can't undo)
 * - Coach loses control until adherence is restored
 */

import { query } from '../database/index';
import { unlock_power, rank_up_power, get_character_powers } from './powerService';
import Open_ai from 'openai';

const openai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PowerChoice {
  power_id: string;
  action: 'unlock' | 'rank_up';
  reasoning: string;
}

/**
 * AI auto-spends points when character rebels
 *
 * @param character_id - Character instance ID
 * @param points_earned - Points just earned that triggered rebellion
 * @returns Array of powers unlocked/ranked by AI
 */
export async function rebellion_auto_spend_points(params: {
  character_id: string;
  points_earned: {
    skill?: number;
    archetype?: number;
    species?: number;
    signature?: number;
  };
}): Promise<any> {
  const { character_id, points_earned } = params;

  console.log(`🚨 REBELLION: Character ${character_id} is auto-spending points:`, points_earned);

  // Get character details and available powers
  const power_data = await get_character_powers(character_id);
  const { character, powers } = power_data;

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

  // Separate powers by what AI can do with current points
  const available_to_unlock = powers.filter((p: any) => !p.is_unlocked && p.can_unlock.can);
  const available_to_rank = powers.filter((p: any) => p.is_unlocked && p.can_rank_up.can);

  if (available_to_unlock.length === 0 && available_to_rank.length === 0) {
    console.log('⚠️  No powers available to unlock or rank up');
    return {
      success: true,
      choices: [],
      message: 'No available powers to spend points on',
    };
  }

  // Ask AI to choose how to spend points
  const ai_choices = await getAIPowerChoices({
    character_name: character_data.name,
    archetype: character_data.archetype,
    personality_traits: personality_traits,
    points_available: character.points,
    available_to_unlock,
    available_to_rank,
  });

  // Execute AI's choices
  const results = [];
  for (const choice of ai_choices) {
    try {
      if (choice.action === 'unlock') {
        const result = await unlock_power({
          character_id,
          power_id: choice.power_id,
          triggered_by: 'character_rebellion',
        });
        results.push({
          ...result,
          reasoning: choice.reasoning,
        });
      } else if (choice.action === 'rank_up') {
        const result = await rank_up_power({
          character_id,
          power_id: choice.power_id,
          triggered_by: 'character_rebellion',
        });
        results.push({
          ...result,
          reasoning: choice.reasoning,
        });
      }
    } catch (error: any) {
      console.error(`❌ Failed to ${choice.action} power ${choice.power_id}:`, error.message);
      // Continue with other choices even if one fails
    }
  }

  console.log(`✅ Rebellion complete. AI made ${results.length} power choices.`);

  return {
    success: true,
    rebellion: true,
    choices: results,
    message: `${character_data.name} rebelled and spent points on their own choices!`,
  };
}

/**
 * Ask AI to choose which powers to unlock/rank
 * Uses multiple-choice format (A, B, C...) matching equipment rebellion pattern
 */
async function getAIPowerChoices(params: {
  character_name: string;
  archetype: string;
  personality_traits: string[];
  points_available: {
    skill: number;
    archetype: number;
    species: number;
    signature: number;
  };
  available_to_unlock: any[];
  available_to_rank: any[];
}): Promise<PowerChoice[]> {
  const {
    character_name,
    archetype,
    personality_traits,
    points_available,
    available_to_unlock,
    available_to_rank,
  } = params;

  const results: PowerChoice[] = [];
  const total_points = points_available.skill + points_available.archetype + points_available.species + points_available.signature;
  let remaining_points = { ...points_available };

  // Keep choosing powers until no points left or no valid options
  while (total_points > 0) {
    // Filter powers by what we can afford with remaining points
    const affordable_unlock = available_to_unlock.filter((p: any) => {
      const pool_key = p.tier === 'skill' ? 'skill' : p.tier === 'ability' ? 'archetype' : p.tier === 'species' ? 'species' : 'signature';
      return remaining_points[pool_key] >= p.unlock_cost;
    });

    const affordable_rank = available_to_rank.filter((p: any) => {
      const pool_key = p.tier === 'skill' ? 'skill' : p.tier === 'ability' ? 'archetype' : p.tier === 'species' ? 'species' : 'signature';
      return remaining_points[pool_key] >= p.rank_up_cost;
    });

    // Combine all affordable options
    const all_options = [
      ...affordable_unlock.map((p: any) => ({ ...p, action: 'unlock' as const, cost: p.unlock_cost })),
      ...affordable_rank.map((p: any) => ({ ...p, action: 'rank_up' as const, cost: p.rank_up_cost }))
    ];

    if (all_options.length === 0) {
      break; // No more affordable options
    }

    // Get AI to pick one power from available options
    const choice = await getAISinglePowerChoice({
      character_name,
      archetype,
      personality_traits,
      remaining_points,
      available_options: all_options
    });

    results.push(choice);

    // Deduct spent points from correct pool based on power tier
    const power = all_options.find(p => p.id === choice.power_id);
    if (power) {
      const pool_key = power.tier === 'skill' ? 'skill'
        : power.tier === 'ability' ? 'archetype'
        : power.tier === 'species' ? 'species'
        : 'signature';
      remaining_points[pool_key] -= power.cost;
    }

    // Remove chosen power from available lists
    const chosen_index = all_options.findIndex(p => p.id === choice.power_id);
    if (chosen_index !== -1) {
      if (all_options[chosen_index].action === 'unlock') {
        const idx = available_to_unlock.findIndex(p => p.id === choice.power_id);
        if (idx !== -1) available_to_unlock.splice(idx, 1);
      } else {
        const idx = available_to_rank.findIndex(p => p.id === choice.power_id);
        if (idx !== -1) available_to_rank.splice(idx, 1);
      }
    }
  }

  return results;
}

/**
 * Get AI to pick a single power from available options using multiple choice
 * Matches equipment rebellion pattern exactly
 */
async function getAISinglePowerChoice(params: {
  character_name: string;
  archetype: string;
  personality_traits: string[];
  remaining_points: { skill: number; archetype: number; species: number; signature: number };
  available_options: Array<{
    id: string;
    name: string;
    description: string;
    tier: string;
    action: 'unlock' | 'rank_up';
    cost: number;
    current_rank?: number;
    max_rank?: number;
  }>;
}): Promise<PowerChoice> {
  const { character_name, archetype, personality_traits, remaining_points, available_options } = params;

  // Build multiple choice list (A, B, C, D, E, F)
  const choice_letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const limited_options = available_options.slice(0, 6); // Max 6 options

  const choices_list = limited_options.map((option, i) => {
    const rank_info = option.action === 'rank_up' ? ` (Rank ${option.current_rank}/${option.max_rank})` : '';
    return `${choice_letters[i]}) ${option.name}${rank_info} - ${option.description} [${option.tier}, ${option.cost} points]`;
  }).join('\n');

  const personality_context = `
ABOUT YOU:
- Archetype: ${archetype}
- Personality Traits: ${personality_traits.join(', ')}`;

  const prompt = `POWER REBELLION SCENARIO:

You have just gained power points but you don't trust your coach's judgment right now.
You're REJECTING their guidance and picking powers that fit YOUR personality and goals.
${personality_context}

REMAINING POINTS:
- Skill: ${remaining_points.skill}
- Archetype: ${remaining_points.archetype}
- Species: ${remaining_points.species}
- Signature: ${remaining_points.signature}

POWER OPTIONS (all are affordable with your remaining points):
${choices_list}

CRITICAL: You are OVERRIDING the coach. Pick ONE power from the list above that best fits your personality.

RESPOND IN JSON FORMAT:
{
  "choice": "A" (or B, C, etc. - MUST be from the list),
  "reasoning": "Brief explanation of why this power fits your personality (1-2 sentences)"
}

Requirements for reasoning:
- Explain how this power aligns with your personality traits
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
          content: `You are ${character_name}. You're choosing a power that fits your personality: ${personality_traits.join(', ')}. Respond with valid JSON only.`
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

    const selected_power = limited_options[choice_index];

    console.log(`✅ [AI-POWER-CHOICE] ${character_name} chose ${selected_power.name} (${selected_power.action})`);
    console.log(`💬 [AI-REASONING] "${reasoning}"`);

    return {
      power_id: selected_power.id,
      action: selected_power.action,
      reasoning
    };

  } catch (error) {
    console.error('❌ AI power choice failed:', error);
    throw error; // Re-throw so caller knows AI failed
  }
}

