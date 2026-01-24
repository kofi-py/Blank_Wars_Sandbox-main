/**
 * Loadout Adherence Service
 * Handles character rebellion and autonomous decision-making for power/spell loadouts
 * when adherence check fails
 */

import { db_adapter } from './databaseAdapter';
import { query } from '../database/index';
import Open_ai from 'openai';
import { REBELLION_PENALTY, LOADOUT_CONFIG } from '../config/gameConstants';
import { performSimpleAdherenceRoll } from './battleAdherenceService';
import { recordBondActivity } from './bondTrackingService';

const openai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY
});

interface LoadoutChoice {
  id: string;
  name: string;
  description: string;
  tier?: string;
  category?: string;
  effects?: any;
  current_rank?: number;
}

interface LoadoutDecisionResult {
  adhered: boolean;
  final_choice: string;
  reason: string;
  ai_response?: string;
  adherence_score?: number;
  lockout_until?: string; // ISO timestamp
  rebellion_result?: {
    type: 'power' | 'spell';
    name: string;
    id: string;
  };
}

/**
 * Get AI's power choice from available options with in-character dialogue
 */
async function getAIPowerChoice(params: {
  character_name: string;
  character_id: string;
  user_id: string;
  coach_choice: LoadoutChoice;
  available_choices: LoadoutChoice[];
  slot_number: number;
  adherence_score: number;
  bond_level: number;
  personality: {
    archetype: string;
    traits: string[];
    backstory?: string;
    conversation_style?: string;
  };
  current_loadout: any[];
}): Promise<{ choice: string; reasoning: string }> {

  const { character_name, coach_choice, available_choices, slot_number, adherence_score, bond_level, personality, current_loadout } = params;

  // Build multiple choice prompt
  const choice_letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const choices_list = available_choices
    .slice(0, 6)
    .map((choice, i) => {
      const rank_info = choice.current_rank ? ` (Rank ${choice.current_rank}/3)` : '';
      const effect_info = choice.effects ? ` - ${JSON.stringify(choice.effects).slice(0, 50)}` : '';
      return `${choice_letters[i]}) ${choice.name}${rank_info} - ${choice.description}${effect_info}`;
    })
    .join('\n');

  const loadout_info = current_loadout.length > 0
    ? `\n\nCURRENT LOADOUT:\n${current_loadout.map((p, i) => `Slot ${i + 1}: ${p ? p.name : '[EMPTY]'}`).join('\n')}`
    : '';

  const prompt = `LOADOUT REBELLION SCENARIO:

Your coach wants you to equip: ${coach_choice.name}${coach_choice.current_rank ? ` (Rank ${coach_choice.current_rank}/3)` : ''}
${coach_choice.description}
Tier: ${coach_choice.tier}

However, you don't fully trust their judgment right now:
- Your bond with the coach: ${bond_level}/100
- Your adherence to their plans: ${adherence_score}/100

This is for SLOT ${slot_number} of your power loadout (you have 8 slots total).${loadout_info}

You're REJECTING the coach's choice and picking something DIFFERENT from your unlocked powers.

ABOUT YOU:
- Archetype: ${personality.archetype}
- Personality Traits: ${personality.traits.join(', ')}
- Conversation Style: ${personality.conversation_style || 'Direct'}
${personality.backstory ? `- Background: ${personality.backstory.slice(0, 200)}...` : ''}

ALTERNATIVE ${coach_choice.tier} POWERS (same tier, different powers):
${choices_list}

CRITICAL: You are OVERRIDING the coach. DO NOT pick anything that isn't on the list above.

TASK: Pick ONE power for Slot ${slot_number} that fits your personality and fighting style.

RESPOND IN JSON FORMAT:
{
  "choice": "A" (or B, C, etc. - MUST be from the alternatives list),
  "dialogue": "Your in-character response to the coach explaining why you're rejecting their choice"
}

Requirements for dialogue:
- DO NOT start with "As [your name]" or introduce yourself
- Speak naturally and directly to your coach
- Explain why you're choosing something different in 1-3 sentences
- Match your personality: ${personality.archetype} with traits like ${personality.traits.join(', ')}
- Sound like a real person talking, not roleplaying

Example GOOD responses:
- "Coach, I get it, but the ${available_choices[0]?.name || 'other power'} works better for how I fight. Trust me."
- "Nah, I'm going with ${available_choices[0]?.name || 'something else'}. It's just better for what I do."

Your response:`;

  try {
    const ai_response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are ${character_name}. Your coach wants you to use ${coach_choice.name} but you don't trust their judgment (adherence: ${adherence_score}/100, bond: ${bond_level}/100). You're choosing different equipment. Respond naturally like you're texting your coach. Personality: ${personality.traits.join(', ')}.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const response_text = ai_response.choices[0]?.message?.content?.trim() || '';
    console.log(`🤖 [AI-POWER-DECISION] ${character_name} raw response:`, response_text);

    const parsed = JSON.parse(response_text);
    const choice_letter = parsed.choice?.toUpperCase();
    const dialogue = parsed.dialogue || '';

    if (!choice_letter || !dialogue) {
      throw new Error(`Invalid AI response: missing choice or dialogue`);
    }

    const choice_index = choice_letters.indexOf(choice_letter);
    if (choice_index === -1 || choice_index >= available_choices.length) {
      throw new Error(`Invalid choice letter: ${choice_letter}`);
    }

    const selected_choice = available_choices[choice_index];

    console.log(`✅ [AI-POWER-DECISION] ${character_name} chose ${selected_choice.name}`);
    console.log(`💬 [AI-DIALOGUE] "${dialogue}"`);

    return {
      choice: selected_choice.id,
      reasoning: dialogue
    };

  } catch (error: any) {
    console.error(`❌ [AI-POWER-DECISION-ERROR] Failed:`, error);
    throw error;
  }
}

/**
 * Get AI's spell choice from available options with in-character dialogue
 */
async function getAISpellChoice(params: {
  character_name: string;
  character_id: string;
  user_id: string;
  coach_choice: LoadoutChoice;
  available_choices: LoadoutChoice[];
  slot_number: number;
  adherence_score: number;
  bond_level: number;
  personality: {
    archetype: string;
    traits: string[];
    backstory?: string;
    conversation_style?: string;
  };
  current_loadout: any[];
}): Promise<{ choice: string; reasoning: string }> {

  const { character_name, coach_choice, available_choices, slot_number, adherence_score, bond_level, personality, current_loadout } = params;

  const choice_letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const choices_list = available_choices
    .slice(0, 6)
    .map((choice, i) => {
      const rank_info = choice.current_rank ? ` (Rank ${choice.current_rank}/3)` : '';
      const effect_info = choice.effects ? ` - ${JSON.stringify(choice.effects).slice(0, 50)}` : '';
      return `${choice_letters[i]}) ${choice.name}${rank_info} - ${choice.description}${effect_info}`;
    })
    .join('\n');

  const loadout_info = current_loadout.length > 0
    ? `\n\nCURRENT LOADOUT:\n${current_loadout.map((s, i) => `Slot ${i + 1}: ${s ? s.name : '[EMPTY]'}`).join('\n')}`
    : '';

  const prompt = `LOADOUT REBELLION SCENARIO:

Your coach wants you to equip: ${coach_choice.name}${coach_choice.current_rank ? ` (Rank ${coach_choice.current_rank}/3)` : ''}
${coach_choice.description}
Category: ${coach_choice.category}

However, you don't fully trust their judgment right now:
- Your bond with the coach: ${bond_level}/100
- Your adherence to their plans: ${adherence_score}/100

This is for SLOT ${slot_number} of your spell loadout (you have 8 slots total).${loadout_info}

You're REJECTING the coach's choice and picking something DIFFERENT from your unlocked spells.

ABOUT YOU:
- Archetype: ${personality.archetype}
- Personality Traits: ${personality.traits.join(', ')}
- Conversation Style: ${personality.conversation_style || 'Direct'}

ALTERNATIVE ${coach_choice.category} SPELLS (same category, different spells):
${choices_list}

TASK: Pick ONE spell for Slot ${slot_number} that fits your personality and fighting style.

RESPOND IN JSON FORMAT:
{
  "choice": "A",
  "dialogue": "Your in-character response explaining why (1-3 sentences)"
}

Requirements:
- Speak naturally to your coach
- Explain why in 1-3 sentences
- Match your personality
- Sound like a real person talking

Your response:`;

  try {
    const ai_response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are ${character_name}. Your coach wants you to use ${coach_choice.name} but you don't trust their judgment. Respond naturally. Personality: ${personality.traits.join(', ')}.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const response_text = ai_response.choices[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(response_text);
    const choice_letter = parsed.choice?.toUpperCase();
    const dialogue = parsed.dialogue || '';

    const choice_index = choice_letters.indexOf(choice_letter);
    if (choice_index === -1 || choice_index >= available_choices.length) {
      throw new Error(`Invalid choice letter: ${choice_letter}`);
    }

    const selected_choice = available_choices[choice_index];
    console.log(`✅ [AI-SPELL-DECISION] ${character_name} chose ${selected_choice.name}`);

    return {
      choice: selected_choice.id,
      reasoning: dialogue
    };

  } catch (error: any) {
    console.error(`❌ [AI-SPELL-DECISION-ERROR] Failed:`, error);
    throw error;
  }
}

/**
 * Check adherence and execute power loadout decision
 */
export async function check_adherence_and_equip_power(params: {
  user_id: string;
  character_id: string;
  coach_power_choice: string;
  slot_number: number;
}): Promise<LoadoutDecisionResult> {

  const { user_id, character_id, coach_power_choice, slot_number } = params;

  // Get character data
  const character = await db_adapter.user_characters.find_by_id(character_id);
  if (!character) {
    throw new Error('Character not found');
  }

  if (character.user_id !== user_id) {
    throw new Error('Character does not belong to user');
  }

  // Get base character data
  const base_char_result = await db_adapter.characters.find_by_id(character.character_id);
  if (!base_char_result) {
    throw new Error('Base character not found');
  }

  // Fetch preference score for the coach's choice
  const pref_result = await query(
    `SELECT preference_score FROM character_powers WHERE character_id = $1 AND power_id = $2`,
    [character_id, coach_power_choice]
  );
  const preference_score = pref_result.rows[0]?.preference_score || 50;

  // Use adherence directly from DB (generated column already includes all modifiers)
  const adherence_roll = performSimpleAdherenceRoll(character.gameplan_adherence, preference_score);
  console.log(`🎯 [POWER-ADHERENCE-CHECK] ${character.name}: adherence=${character.gameplan_adherence}, roll=${adherence_roll.roll}, passed=${adherence_roll.passed}`);

  if (adherence_roll.passed) {
    console.log(`✅ [POWER-ADHERENCE-SUCCESS] ${character.name} follows coach's choice`);

    // Equip coach's choice directly
    const { equip_power } = await import('./powerService');
    await equip_power({ character_id, power_id: coach_power_choice, slot_number });

    return {
      adhered: true,
      final_choice: coach_power_choice,
      reason: `${character.name} trusts your judgment (adherence: ${character.gameplan_adherence}/100) and equipped your choice.`,
      adherence_score: character.gameplan_adherence
    };
  }

  // Adherence failed - character rebels
  console.log(`🚨 [POWER-ADHERENCE-FAILED] ${character.name} rebelling! Adherence: ${character.gameplan_adherence}/100`);

  // Get coach's power choice details
  const coach_powerResult = await query(
    `SELECT pd.*, cp.current_rank
     FROM power_definitions pd
     LEFT JOIN character_powers cp ON pd.id = cp.power_id AND cp.character_id = $1
     WHERE pd.id = $2`,
    [character_id, coach_power_choice]
  );

  if (coach_powerResult.rows.length === 0) {
    throw new Error('Coach\'s power choice not found');
  }

  const coach_power = coach_powerResult.rows[0];

  // Get unlocked powers in same tier (alternatives)
  const unlocked_result = await query(
    `SELECT pd.*, cp.current_rank
     FROM character_powers cp
     JOIN power_definitions pd ON cp.power_id = pd.id
     WHERE cp.character_id = $1 AND cp.unlocked = true AND pd.tier = $2 AND pd.id != $3`,
    [character_id, coach_power.tier, coach_power_choice]
  );

  const available_choices = unlocked_result.rows;

  console.log(`🎯 [POWER-REBELLION] Coach chose: ${coach_power.name} (${coach_power.tier})`);
  console.log(`🎯 [POWER-REBELLION] Alternatives (${available_choices.length}):`, available_choices.map((p: any) => p.name).join(', '));

  // No alternatives - reluctant compliance
  if (available_choices.length === 0) {
    const { equip_power } = await import('./powerService');
    await equip_power({ character_id, power_id: coach_power_choice, slot_number });

    const reluctant_dialogue = `I don't have anything else in that tier, coach. I'll use the ${coach_power.name}.`;

    // Event for reluctant compliance
    try {
      const GameEventBus = (await import('./gameEventBus')).default;
      const event_bus = GameEventBus.get_instance();

      await event_bus.publish({
        type: 'loadout:reluctant_compliance',
        source: 'power_loadout',
        userchar_ids: [character_id],
        severity: 'low',
        category: 'progression',
        description: `${character.name} wanted to rebel but had no alternative powers`,
        metadata: {
          coach_choice: coach_power.name,
          reasoning: reluctant_dialogue,
          adherence_level: character.gameplan_adherence,
          tier: coach_power.tier,
          slot_number,
          effects: { adherence: REBELLION_PENALTY, ego: -1 }
        },
        tags: ['loadout', 'rebellion', 'compliance', 'powers'],
        importance: 5
      });

      // Update coach↔character bond
      await recordBondActivity({
        user_character_id: character_id,
        activity_type: 'loadout_reluctant_compliance',
        context: {
          coach_choice: coach_power.name,
          reasoning: reluctant_dialogue
        },
        source: 'loadout_system'
      });
    } catch (error) {
      console.error('Failed to create reluctant compliance event or update bond:', error);
    }

    return {
      adhered: false,
      final_choice: coach_power_choice,
      reason: `${character.name} wanted to rebel but has no alternative powers.`,
      ai_response: reluctant_dialogue,
      adherence_score: character.gameplan_adherence
    };
  }

  // Get current loadout
  const loadout_result = await query(
    `SELECT pd.name, cpl.slot_number
     FROM character_power_loadout cpl
     JOIN power_definitions pd ON cpl.power_id = pd.id
     WHERE cpl.user_character_id = $1
     ORDER BY cpl.slot_number`,
    [character_id]
  );

  // AI makes decision
  const decision = await getAIPowerChoice({
    character_id,
    character_name: character.name,
    user_id,
    coach_choice: {
      id: coach_power.id,
      name: coach_power.name,
      description: coach_power.description || '',
      tier: coach_power.tier,
      effects: coach_power.effects,
      current_rank: coach_power.current_rank
    },
    available_choices: available_choices.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      tier: p.tier,
      effects: p.effects,
      current_rank: p.current_rank
    })),
    slot_number,
    adherence_score: character.gameplan_adherence,
    bond_level: character.bond_level,
    personality: {
      archetype: base_char_result.archetype,
      traits: base_char_result.personality_traits || [],
      backstory: base_char_result.backstory,
      conversation_style: base_char_result.conversation_style
    },
    current_loadout: loadout_result.rows
  });

  // Equip AI's choice
  const { equip_power } = await import('./powerService');
  await equip_power({ character_id, power_id: decision.choice, slot_number });

  // Decrease adherence (gambling system)
  const new_adherence = Math.max(0, character.gameplan_adherence + REBELLION_PENALTY);
  await db_adapter.user_characters.update(character_id, {
    gameplan_adherence: new_adherence
  });

  // Create rebellion event
  try {
    const GameEventBus = (await import('./gameEventBus')).default;
    const event_bus = GameEventBus.get_instance();

    const ai_chosen_power = available_choices.find((p: any) => p.id === decision.choice);

    if (!ai_chosen_power) {
      throw new Error(`AI chose power ID ${decision.choice} but it was not found in available choices`);
    }

    await event_bus.publish({
      type: 'loadout:power_rebellion',
      source: 'power_loadout',
      userchar_ids: [character_id],
      severity: 'medium',
      category: 'progression',
      description: `${character.name} rejected coach's power loadout choice`,
      metadata: {
        coach_choice: coach_power.name,
        character_choice: ai_chosen_power.name,
        reasoning: decision.reasoning,
        adherence_before: character.gameplan_adherence,
        adherence_after: new_adherence,
        tier: coach_power.tier,
        slot_number,
        effects: { adherence: REBELLION_PENALTY, ego: +2 }
      },
      tags: ['loadout', 'rebellion', 'autonomy', 'powers'],
      importance: 7
    });

    // Update coach↔character bond (rebellion damages trust)
    await recordBondActivity({
      user_character_id: character_id,
      activity_type: 'loadout_power_rebellion',
      context: {
        coach_choice: coach_power.name,
        character_choice: ai_chosen_power.name,
        reasoning: decision.reasoning
      },
      source: 'loadout_system'
    });
  } catch (error) {
    console.error('Failed to create power rebellion event or update bond:', error);
  }

  return {
    adhered: false,
    final_choice: decision.choice,
    reason: `${character.name} made their own choice: ${decision.reasoning}`,
    ai_response: decision.reasoning,
    adherence_score: new_adherence
  };
}

/**
 * Check adherence and execute spell loadout decision
 */
export async function check_adherence_and_equip_spell(params: {
  user_id: string;
  character_id: string;
  coach_spell_choice: string;
  slot_number: number;
}): Promise<LoadoutDecisionResult> {

  const { user_id, character_id, coach_spell_choice, slot_number } = params;

  const character = await db_adapter.user_characters.find_by_id(character_id);
  if (!character) {
    throw new Error('Character not found');
  }

  if (character.user_id !== user_id) {
    throw new Error('Character does not belong to user');
  }

  const base_char_result = await db_adapter.characters.find_by_id(character.character_id);
  if (!base_char_result) {
    throw new Error('Base character not found');
  }

  // Fetch preference score for the coach's choice
  const pref_result = await query(
    `SELECT preference_score FROM character_spells WHERE character_id = $1 AND spell_id = $2`,
    [character_id, coach_spell_choice]
  );
  const preference_score = pref_result.rows[0]?.preference_score || 50;

  // Use adherence directly from DB (generated column already includes all modifiers)
  const adherence_roll = performSimpleAdherenceRoll(character.gameplan_adherence, preference_score);
  console.log(`🎯 [SPELL-ADHERENCE-CHECK] ${character.name}: adherence=${character.gameplan_adherence}, roll=${adherence_roll.roll}, passed=${adherence_roll.passed}`);

  if (adherence_roll.passed) {
    const { equipSpell } = await import('./spellService');
    await equipSpell({ character_id, spell_id: coach_spell_choice, slot_number });

    return {
      adhered: true,
      final_choice: coach_spell_choice,
      reason: `${character.name} trusts your judgment (adherence: ${character.gameplan_adherence}/100).`,
      adherence_score: character.gameplan_adherence
    };
  }

  console.log(`🚨 [SPELL-ADHERENCE-FAILED] ${character.name} rebelling!`);

  const coach_spellResult = await query(
    `SELECT sd.*, cs.current_rank
     FROM spell_definitions sd
     LEFT JOIN character_spells cs ON sd.id = cs.spell_id AND cs.character_id = $1
     WHERE sd.id = $2`,
    [character_id, coach_spell_choice]
  );

  if (coach_spellResult.rows.length === 0) {
    throw new Error('Coach\'s spell choice not found');
  }

  const coach_spell = coach_spellResult.rows[0];

  const unlocked_result = await query(
    `SELECT sd.*, cs.current_rank
     FROM character_spells cs
     JOIN spell_definitions sd ON cs.spell_id = sd.id
     WHERE cs.character_id = $1 AND cs.unlocked = true AND sd.category = $2 AND sd.id != $3`,
    [character_id, coach_spell.category, coach_spell_choice]
  );

  const available_choices = unlocked_result.rows;

  if (available_choices.length === 0) {
    const { equipSpell } = await import('./spellService');
    await equipSpell({ character_id, spell_id: coach_spell_choice, slot_number });

    const reluctant_dialogue = `I don't have anything else in that category, coach. I'll use the ${coach_spell.name}.`;

    // Create event and update bond for reluctant compliance
    try {
      const GameEventBus = (await import('./gameEventBus')).default;
      const event_bus = GameEventBus.get_instance();

      await event_bus.publish({
        type: 'loadout:reluctant_compliance',
        source: 'spell_loadout',
        userchar_ids: [character_id],
        severity: 'low',
        category: 'progression',
        description: `${character.name} wanted to rebel but had no alternative spells`,
        metadata: {
          coach_choice: coach_spell.name,
          reasoning: reluctant_dialogue,
          adherence_level: character.gameplan_adherence,
          category: coach_spell.category,
          slot_number,
          effects: { adherence: REBELLION_PENALTY, ego: -1 }
        },
        tags: ['loadout', 'rebellion', 'compliance', 'spells'],
        importance: 5
      });

      // Update coach↔character bond
      await recordBondActivity({
        user_character_id: character_id,
        activity_type: 'loadout_reluctant_compliance',
        context: {
          coach_choice: coach_spell.name,
          reasoning: reluctant_dialogue
        },
        source: 'loadout_system'
      });
    } catch (error) {
      console.error('Failed to create spell reluctant compliance event or update bond:', error);
    }

    return {
      adhered: false,
      final_choice: coach_spell_choice,
      reason: `${character.name} wanted to rebel but has no alternative spells.`,
      ai_response: reluctant_dialogue,
      adherence_score: character.gameplan_adherence
    };
  }

  const loadout_result = await query(
    `SELECT sd.name, csl.slot_number
     FROM character_spell_loadout csl
     JOIN spell_definitions sd ON csl.spell_id = sd.id
     WHERE csl.user_character_id = $1
     ORDER BY csl.slot_number`,
    [character_id]
  );

  const decision = await getAISpellChoice({
    character_id,
    character_name: character.name,
    user_id,
    coach_choice: {
      id: coach_spell.id,
      name: coach_spell.name,
      description: coach_spell.description || '',
      category: coach_spell.category,
      effects: coach_spell.effects,
      current_rank: coach_spell.current_rank
    },
    available_choices: available_choices.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      category: s.category,
      effects: s.effects,
      current_rank: s.current_rank
    })),
    slot_number,
    adherence_score: character.gameplan_adherence,
    bond_level: character.bond_level,
    personality: {
      archetype: base_char_result.archetype,
      traits: base_char_result.personality_traits || [],
      backstory: base_char_result.backstory,
      conversation_style: base_char_result.conversation_style
    },
    current_loadout: loadout_result.rows
  });

  const { equipSpell } = await import('./spellService');
  await equipSpell({ character_id, spell_id: decision.choice, slot_number });

  // Decrease adherence (gambling system)
  const new_adherence = Math.max(0, character.gameplan_adherence + REBELLION_PENALTY);
  await db_adapter.user_characters.update(character_id, {
    gameplan_adherence: new_adherence
  });

  try {
    const GameEventBus = (await import('./gameEventBus')).default;
    const event_bus = GameEventBus.get_instance();

    const ai_chosen_spell = available_choices.find((s: any) => s.id === decision.choice);
    if (!ai_chosen_spell) {
      throw new Error(`AI chose spell ID ${decision.choice} but it was not found in available choices`);
    }

    await event_bus.publish({
      type: 'loadout:spell_rebellion',
      source: 'spell_loadout',
      userchar_ids: [character_id],
      severity: 'medium',
      category: 'progression',
      description: `${character.name} rejected coach's spell loadout choice`,
      metadata: {
        coach_choice: coach_spell.name,
        character_choice: ai_chosen_spell.name,
        reasoning: decision.reasoning,
        adherence_before: character.gameplan_adherence,
        adherence_after: new_adherence,
        category: coach_spell.category,
        slot_number,
        effects: { adherence: REBELLION_PENALTY, ego: +2 }
      },
      tags: ['loadout', 'rebellion', 'autonomy', 'spells'],
      importance: 7
    });

    // Update coach↔character bond (rebellion damages trust)
    await recordBondActivity({
      user_character_id: character_id,
      activity_type: 'loadout_spell_rebellion',
      context: {
        coach_choice: coach_spell.name,
        character_choice: ai_chosen_spell.name,
        reasoning: decision.reasoning
      },
      source: 'loadout_system'
    });
  } catch (error) {
    console.error('Failed to create spell rebellion event or update bond:', error);
  }

  return {
    adhered: false,
    final_choice: decision.choice,
    reason: `${character.name} made their own choice: ${decision.reasoning}`,
    ai_response: decision.reasoning,
    adherence_score: new_adherence
  };
}

/**
 * Check adherence and execute power unlock decision
 * NOW RETURNS SURVEY OPTIONS IF ADHERENCE FAILS
 */
export async function check_adherence_and_unlock_power(params: {
  user_id: string;
  character_id: string;
  coach_power_choice: string;
}): Promise<LoadoutDecisionResult & { survey_required?: boolean; survey_options?: any[] }> {

  const { user_id, character_id, coach_power_choice } = params;

  // Get character data
  const character = await db_adapter.user_characters.find_by_id(character_id);
  if (!character) {
    throw new Error('Character not found');
  }

  if (character.user_id !== user_id) {
    throw new Error('Character does not belong to user');
  }

  // Get base character data
  const base_char_result = await db_adapter.characters.find_by_id(character.character_id);
  if (!base_char_result) {
    throw new Error('Base character not found');
  }

  // Fetch preference score for the coach's choice
  const pref_result = await query(
    `SELECT preference_score FROM character_powers WHERE character_id = $1 AND power_id = $2`,
    [character_id, coach_power_choice]
  );
  const preference_score = pref_result.rows[0]?.preference_score || 50;

  // Use adherence directly from DB (generated column already includes all modifiers)
  const adherence_roll = performSimpleAdherenceRoll(character.gameplan_adherence, preference_score);
  console.log(`🎯 [POWER-UNLOCK-ADHERENCE-CHECK] ${character.name}: adherence=${character.gameplan_adherence}, roll=${adherence_roll.roll}, passed=${adherence_roll.passed}`);

  if (adherence_roll.passed) {
    console.log(`✅ [POWER-UNLOCK-SUCCESS] ${character.name} follows coach's choice`);

    // Unlock coach's choice directly
    const { unlock_power } = await import('./powerService');
    await unlock_power({
      character_id,
      power_id: coach_power_choice,
      triggered_by: 'coach_suggestion'
    });

    return {
      adhered: true,
      final_choice: coach_power_choice,
      reason: `${character.name} trusts your judgment (adherence: ${character.gameplan_adherence}/100) and unlocked your choice.`,
      adherence_score: character.gameplan_adherence,
      survey_required: false
    };
  }

  // Adherence failed - character rebels -> GENERATE SURVEY
  console.log(`🚨 [POWER-UNLOCK-ADHERENCE-FAILED] ${character.name} rebelling! Adherence: ${character.gameplan_adherence}/100`);

  // Get coach's power choice details
  const coach_powerResult = await query(
    `SELECT pd.*
     FROM power_definitions pd
     WHERE pd.id = $1`,
    [coach_power_choice]
  );

  if (coach_powerResult.rows.length === 0) {
    throw new Error("Coach's power choice not found");
  }

  const coach_power = coach_powerResult.rows[0];

  // Get available powers in same tier that character can unlock
  const available_result = await query(
    `SELECT pd.*
     FROM power_definitions pd
     LEFT JOIN character_powers cp ON pd.id = cp.power_id AND cp.character_id = $1
     WHERE pd.tier = $2
       AND pd.id != $3
       AND (cp.id IS NULL OR cp.unlocked = false)
       AND (pd.unlock_level IS NULL OR pd.unlock_level <= $4)
       AND pd.unlock_cost <= $5
       AND (
         pd.tier = 'skill'
         OR (pd.tier = 'ability' AND pd.archetype = $6)
         OR (pd.tier = 'species' AND pd.species = $7)
         OR (pd.tier = 'signature' AND pd.character_id = $8)
       )`,
    [
      character_id,
      coach_power.tier,
      coach_power_choice,
      character.level,
      character.ability_points,
      base_char_result.archetype,
      (base_char_result as any).species,
      character.character_id
    ]
  );

  const available_choices = available_result.rows;

  console.log(`🎯 [POWER-UNLOCK-REBELLION] Coach chose: ${coach_power.name} (${coach_power.tier})`);
  console.log(`🎯 [POWER-UNLOCK-REBELLION] Alternatives (${available_choices.length}):`, available_choices.map((p: any) => p.name).join(', '));

  // No alternatives - reluctant compliance
  if (available_choices.length === 0) {
    const { unlock_power } = await import('./powerService');
    await unlock_power({
      character_id,
      power_id: coach_power_choice,
      triggered_by: 'coach_suggestion'
    });

    const reluctant_dialogue = `I don't have any better options right now, coach. I'll unlock the ${coach_power.name}.`;

    return {
      adhered: false,
      final_choice: coach_power_choice,
      reason: `${character.name} wanted to rebel but has no alternative powers.`,
      ai_response: reluctant_dialogue,
      adherence_score: character.gameplan_adherence
    };
  }

  // UNIFIED REBELLION: Character chooses from ALL available powers AND spells
  const rebellion_choice = await getUnifiedRebellionChoice({
    character_id,
    character_name: character.name,
    coach_choice_name: coach_power.name,
    personality: {
      archetype: base_char_result.archetype,
      traits: base_char_result.personality_traits || [],
      backstory: base_char_result.backstory
    },
    character_level: character.level,
    ability_points: character.ability_points,
    archetype: base_char_result.archetype,
    species: (base_char_result as any).species
  });

  // Execute the autonomous choice
  if (rebellion_choice.type === 'power') {
    const { unlock_power } = await import('./powerService');
    await unlock_power({
      character_id,
      power_id: rebellion_choice.id,
      triggered_by: 'character_rebellion'
    });
  } else {
    const { unlockSpell } = await import('./spellService');
    await unlockSpell({
      character_id,
      spell_id: rebellion_choice.id
    });
  }

  // Decrease adherence
  const new_adherence = Math.max(0, character.gameplan_adherence + REBELLION_PENALTY);

  // APPLY LOCKOUT
  const lockout_until = new Date(Date.now() + LOADOUT_CONFIG.COACH_LOCKOUT_DURATION_MS);

  await db_adapter.user_characters.update(character_id, {
    gameplan_adherence: new_adherence,
    coach_lockout_until: lockout_until.toISOString()
  });

  return {
    adhered: false,
    final_choice: rebellion_choice.id,
    reason: `${character.name} rebelled and chose ${rebellion_choice.name} instead!`,
    adherence_score: new_adherence,
    lockout_until: lockout_until.toISOString(),
    rebellion_result: {
      type: rebellion_choice.type,
      name: rebellion_choice.name,
      id: rebellion_choice.id
    }
  };
}

/**
 * Get Unified Rebellion Choice (Power OR Spell)
 */
async function getUnifiedRebellionChoice(params: {
  character_id: string;
  character_name: string;
  coach_choice_name: string;
  personality: any;
  character_level: number;
  ability_points: number;
  archetype: string;
  species: string;
}): Promise<{ id: string; name: string; type: 'power' | 'spell'; reasoning: string }> {

  const { character_id, character_name, coach_choice_name, personality, character_level, ability_points, archetype, species } = params;

  // 1. Fetch available Powers
  const power_result = await query(
    `SELECT pd.id, pd.name, pd.description, pd.tier, 'power' as type
     FROM power_definitions pd
     LEFT JOIN character_powers cp ON pd.id = cp.power_id AND cp.character_id = $1
     WHERE (cp.id IS NULL OR cp.unlocked = false)
       AND (pd.unlock_level IS NULL OR pd.unlock_level <= $2)
       AND pd.unlock_cost <= $3
       AND (
         pd.tier = 'skill'
         OR (pd.tier = 'ability' AND pd.archetype = $4)
         OR (pd.tier = 'species' AND pd.species = $5)
         OR (pd.tier = 'signature' AND pd.character_id = $6)
       )`,
    [character_id, character_level, ability_points, archetype, species, character_id]
  );

  // 2. Fetch available Spells
  const spell_result = await query(
    `SELECT sd.id, sd.name, sd.description, sd.tier, 'spell' as type
     FROM spell_definitions sd
     LEFT JOIN character_spells cs ON sd.id = cs.spell_id AND cs.character_id = $1
     WHERE (cs.id IS NULL OR cs.unlocked = false)
       AND (sd.required_level IS NULL OR sd.required_level <= $2)
       AND sd.unlock_cost <= $3
       AND (
         sd.tier = 'universal'
         OR (sd.tier = 'archetype' AND sd.archetype = $4)
         OR (sd.tier = 'species' AND sd.species = $5)
         OR (sd.tier = 'signature' AND sd.character_id = $6)
       )`,
    [character_id, character_level, ability_points, archetype, species, character_id]
  );

  const all_options = [...power_result.rows, ...spell_result.rows];

  // If absolutely nothing is available (rare), return a dummy fallback to avoid crash
  if (all_options.length === 0) {
    throw new Error("No available upgrades for rebellion.");
  }

  // Randomly select up to 5 options for the AI to choose from to keep prompt size down
  const shuffled = all_options.sort(() => 0.5 - Math.random()).slice(0, 5);

  const prompt = `UNIFIED REBELLION DECISION:
  
  Character: ${character_name} (${personality.archetype})
  Traits: ${personality.traits.join(', ')}
  
  Coach wanted to unlock: ${coach_choice_name}
  Character REJECTS this and must choose their own upgrade autonomously.
  
  Available Options:
  ${JSON.stringify(shuffled.map(o => ({ id: o.id, name: o.name, type: o.type, desc: o.description })), null, 2)}
  
  TASK: Pick ONE option that fits the character's personality and desires.
  
  RESPOND IN JSON:
  {
    "choice_id": "id_of_choice",
    "reasoning": "I'm taking this because..."
  }`;

  try {
    const ai_response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9, // High creativity for rebellion
      response_format: { type: "json_object" }
    });

    const content = ai_response.choices[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');
    const choice_id = parsed.choice_id;

    const selected = shuffled.find(o => o.id === choice_id) || shuffled[0]; // Fallback to first if AI hallucinates ID

    console.log(`🤖 [UNIFIED-REBELLION] ${character_name} chose ${selected.name} (${selected.type})`);

    return {
      id: selected.id,
      name: selected.name,
      type: selected.type as 'power' | 'spell',
      reasoning: parsed.reasoning || "I want this."
    };

  } catch (error) {
    console.error('AI Rebellion failed, picking random:', error);
    const random = shuffled[0];
    return {
      id: random.id,
      name: random.name,
      type: random.type as 'power' | 'spell',
      reasoning: "I'm doing it my way."
    };
  }
}





/**
 * Check adherence and execute spell unlock decision
 */
/**
 * Check adherence and execute spell unlock decision
 * NOW RETURNS SURVEY OPTIONS IF ADHERENCE FAILS
 */
export async function check_adherence_and_unlock_spell(params: {
  user_id: string;
  character_id: string;
  coach_spell_choice: string;
}): Promise<LoadoutDecisionResult & { survey_required?: boolean; survey_options?: any[] }> {

  const { user_id, character_id, coach_spell_choice } = params;

  const character = await db_adapter.user_characters.find_by_id(character_id);
  if (!character) {
    throw new Error('Character not found');
  }

  if (character.user_id !== user_id) {
    throw new Error('Character does not belong to user');
  }

  const base_char_result = await db_adapter.characters.find_by_id(character.character_id);
  if (!base_char_result) {
    throw new Error('Base character not found');
  }

  // Use adherence directly from DB (generated column already includes all modifiers)
  const adherence_roll = performSimpleAdherenceRoll(character.gameplan_adherence);
  console.log(`🎯 [SPELL-UNLOCK-ADHERENCE-CHECK] ${character.name}: adherence=${character.gameplan_adherence}, roll=${adherence_roll.roll}, passed=${adherence_roll.passed}`);

  if (adherence_roll.passed) {
    console.log(`✅ [SPELL-UNLOCK-SUCCESS] ${character.name} follows coach's choice`);

    const { unlockSpell } = await import('./spellService');
    await unlockSpell({
      character_id,
      spell_id: coach_spell_choice
    });

    return {
      adhered: true,
      final_choice: coach_spell_choice,
      reason: `${character.name} trusts your judgment (adherence: ${character.gameplan_adherence}/100) and unlocked your choice.`,
      adherence_score: character.gameplan_adherence,
      survey_required: false
    };
  }

  console.log(`🚨 [SPELL-UNLOCK-ADHERENCE-FAILED] ${character.name} rebelling! Adherence: ${character.gameplan_adherence}/100`);

  const coach_spellResult = await query(
    `SELECT sd.*
     FROM spell_definitions sd
     WHERE sd.id = $1`,
    [coach_spell_choice]
  );

  if (coach_spellResult.rows.length === 0) {
    throw new Error("Coach's spell choice not found");
  }

  const coach_spell = coach_spellResult.rows[0];

  const available_result = await query(
    `SELECT sd.*
     FROM spell_definitions sd
     LEFT JOIN character_spells cs ON sd.id = cs.spell_id AND cs.character_id = $1
     WHERE sd.tier = $2
       AND sd.id != $3
       AND (cs.id IS NULL OR cs.unlocked = false)
       AND (sd.required_level IS NULL OR sd.required_level <= $4)
       AND sd.unlock_cost <= $5
       AND (
         sd.tier = 'universal'
         OR (sd.tier = 'archetype' AND sd.archetype = $6)
         OR (sd.tier = 'species' AND sd.species = $7)
         OR (sd.tier = 'signature' AND sd.character_id = $8)
       )`,
    [
      character_id,
      coach_spell.tier,
      coach_spell_choice,
      character.level,
      character.ability_points,
      base_char_result.archetype,
      base_char_result.species,
      character.character_id
    ]
  );

  const available_choices = available_result.rows;

  console.log(`🎯 [SPELL-UNLOCK-REBELLION] Coach chose: ${coach_spell.name} (${coach_spell.tier})`);
  console.log(`🎯 [SPELL-UNLOCK-REBELLION] Alternatives (${available_choices.length}):`, available_choices.map((s: any) => s.name).join(', '));

  if (available_choices.length === 0) {
    const { unlockSpell } = await import('./spellService');
    await unlockSpell({
      character_id,
      spell_id: coach_spell_choice
    });

    const reluctant_dialogue = `I don't have any better options right now, coach. I'll unlock the ${coach_spell.name}.`;

    return {
      adhered: false,
      final_choice: coach_spell_choice,
      reason: `${character.name} wanted to rebel but has no alternative spells.`,
      ai_response: reluctant_dialogue,
      adherence_score: character.gameplan_adherence
    };
  }

  // UNIFIED REBELLION: Character chooses from ALL available powers AND spells
  const rebellion_choice = await getUnifiedRebellionChoice({
    character_id,
    character_name: character.name,
    coach_choice_name: coach_spell.name,
    personality: {
      archetype: base_char_result.archetype,
      traits: base_char_result.personality_traits || [],
      backstory: base_char_result.backstory
    },
    character_level: character.level,
    ability_points: character.ability_points,
    archetype: base_char_result.archetype,
    species: (base_char_result as any).species
  });

  // Execute the autonomous choice
  if (rebellion_choice.type === 'power') {
    const { unlock_power } = await import('./powerService');
    await unlock_power({
      character_id,
      power_id: rebellion_choice.id,
      triggered_by: 'character_rebellion'
    });
  } else {
    const { unlockSpell } = await import('./spellService');
    await unlockSpell({
      character_id,
      spell_id: rebellion_choice.id
    });
  }

  // Decrease adherence
  const new_adherence = Math.max(0, character.gameplan_adherence + REBELLION_PENALTY);

  // APPLY LOCKOUT
  const lockout_until = new Date(Date.now() + LOADOUT_CONFIG.COACH_LOCKOUT_DURATION_MS);

  await db_adapter.user_characters.update(character_id, {
    gameplan_adherence: new_adherence,
    coach_lockout_until: lockout_until.toISOString()
  });

  return {
    adhered: false,
    final_choice: rebellion_choice.id,
    reason: `${character.name} rebelled and chose ${rebellion_choice.name} instead!`,
    adherence_score: new_adherence,
    lockout_until: lockout_until.toISOString(),
    rebellion_result: {
      type: rebellion_choice.type,
      name: rebellion_choice.name,
      id: rebellion_choice.id
    }
  };
}
