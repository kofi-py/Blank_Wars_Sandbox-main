/**
 * Autonomous Decision Service
 * Handles character rebellion and autonomous decision-making
 * when adherence check fails
 */

import { db_adapter } from './databaseAdapter';
import { db, query } from '../database/index';
import Open_ai from 'openai';
import { ADHERENCE_THRESHOLD, REBELLION_PENALTY, RELUCTANT_COMPLIANCE_PENALTY } from '../config/gameConstants';
import { recordBondActivity } from './bondTrackingService';

const openai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY
});

interface EquipmentChoice {
  id: string;
  name: string;
  description: string;
  slot: string;
}

interface AutonomousDecisionResult {
  adhered: boolean;
  final_choice: string; // Equipment ID that was chosen
  message: string; // Description of outcome
  ai_response?: string; // Raw AI response if rebellion occurred
}

/**
 * Get AI's equipment choice from available options with in-character dialogue
 * Works for both rebellion (with coach choice) and free choice (without coach)
 */
async function getAIEquipmentChoice(params: {
  character_name: string;
  character_id: string;
  user_id: string;
  coach_choice: EquipmentChoice | null;
  available_choices: EquipmentChoice[];
  adherence_score: number;
  bond_level: number;
  wallet: number;
  personality?: {
    archetype: string;
    traits: string[];
    backstory?: string;
    conversation_style?: string;
  };
}): Promise<{ choice: string; reasoning: string }> {

  const { character_name, character_id, user_id, coach_choice, available_choices, adherence_score, bond_level, wallet, personality } = params;

  // Build multiple choice prompt
  const choice_letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const choices_list = available_choices
    .slice(0, 6) // Max 6 options
    .map((choice, i) => `${choice_letters[i]}) ${choice.name} - ${choice.description}`)
    .join('\n');

  const personality_context = personality ? `
ABOUT YOU:
- Archetype: ${personality.archetype}
- Personality Traits: ${personality.traits.join(', ')}
- Conversation Style: ${personality.conversation_style || 'Direct'}
${personality.backstory ? `- Background: ${personality.backstory.slice(0, 200)}...` : ''}
` : '';

  const prompt = coach_choice
    ? `EQUIPMENT REBELLION SCENARIO:

Your coach wants you to equip: ${coach_choice.name}
${coach_choice.description}

However, you don't fully trust their judgment right now:
- Your bond with the coach: ${bond_level}/100
- Your adherence to their plans: ${adherence_score}/100

You're REJECTING the coach's choice and picking something DIFFERENT from your inventory.
${personality_context}
ALTERNATIVE EQUIPMENT OPTIONS (these DO NOT include ${coach_choice.name}):
${choices_list}

CRITICAL: You are OVERRIDING the coach. DO NOT pick anything that isn't on the list above.

TASK: Pick equipment from the alternatives above and tell your coach why you're choosing it instead.

RESPOND IN JSON FORMAT:
{
  "choice": "A" (or B, C, etc. - MUST be from the alternatives list),
  "dialogue": "Your in-character response to the coach explaining why you're rejecting their choice"
}

Requirements for dialogue:
- DO NOT start with "As [your name]" or introduce yourself - you're already in a conversation
- Speak naturally and directly to your coach - this is an ongoing conversation, not a formal statement
- Explain why you're choosing something different in 1-3 sentences
- Match your personality: ${personality?.archetype || 'fighter'} with traits like ${personality?.traits.join(', ') || 'determined'}
- Sound like a real person talking, not like you're roleplaying or giving a mission briefing

Example GOOD responses (natural, conversational):
- "Coach, I get it, but the [chosen item] works better for how I fight. Trust me."
- "Nah, I'm going with the [chosen item]. It's just better for what I do."
- "The ${coach_choice.name} doesn't fit my style. I need the [chosen item] instead."

Example BAD responses (don't do this):
- "As Agent X, I prioritize..." ❌ (Don't introduce yourself)
- "In my professional opinion as an assassin..." ❌ (Too formal)
- "Given my background and training..." ❌ (Too stiff)

Your response:`
    : `EQUIPMENT SELECTION:

${personality_context}
Available equipment options:
${choices_list}

Choose equipment and explain your choice briefly (1-2 sentences).

JSON format:
{
  "choice": "A",
  "dialogue": "Your reasoning"
}`;

  try {
    // Fetch roommates
    const roommates_result = await query(
      `SELECT c.name FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.user_id = $1 AND uc.id != $2`,
      [user_id, character_id]
    );
    const roommates = roommates_result.rows.map((r: any) => r.name);

    // Get user's active team
    const user_result = await query(
      'SELECT user_id FROM user_characters WHERE id = $1',
      [character_id]
    );
    const actual_user_id = user_result.rows[0]?.user_id;

    const team_result = await query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );
    const team_id = team_result.rows[0]?.id;

    // Get teammates from active team
    let teammates: string[] = [];
    if (team_id) {
      const team_slots_result = await query(
        'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
        [team_id]
      );
      if (team_slots_result.rows.length > 0) {
        const teammate_ids = [
          team_slots_result.rows[0].character_slot_1,
          team_slots_result.rows[0].character_slot_2,
          team_slots_result.rows[0].character_slot_3
        ].filter(id => id && id !== character_id);

        if (teammate_ids.length > 0) {
          const teammate_result = await query(
            'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
            [teammate_ids]
          );
          teammates = teammate_result.rows.map((row: any) => row.name);
        }
      }
    }

    // NOTE: wallet is now passed as a parameter from the calling function
    // roommates, teammates, wallet, debt are fetched and available for future enhancements
    // Currently using the detailed prompt built on lines 67-122

    // Call Open_ai with enriched context and multiple-choice prompt
    const ai_response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: coach_choice
            ? `You are ${character_name}. Your coach wants you to use ${coach_choice.name} but you don't trust their judgment (adherence: ${adherence_score}/100, bond: ${bond_level}/100). You're choosing different equipment. Respond naturally like you're texting your coach. Personality: ${personality?.traits.join(', ') || 'independent'}.`
            : `You are ${character_name}. Choose equipment based on your fighting style.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const response_text = ai_response.choices[0]?.message?.content?.trim() || '';
    console.log(`🤖 [AI-DECISION] ${character_name} raw response:`, response_text);

    const parsed = JSON.parse(response_text);
    const choice_letter = parsed.choice?.toUpperCase();
    const dialogue = parsed.dialogue || '';

    if (!choice_letter || !dialogue) {
      throw new Error(`Invalid AI response: missing choice or dialogue`);
    }

    // Parse the letter choice
    const choice_index = choice_letters.indexOf(choice_letter);
    if (choice_index === -1 || choice_index >= available_choices.length) {
      throw new Error(`Invalid choice letter: ${choice_letter}`);
    }

    const selected_choice = available_choices[choice_index];

    console.log(`✅ [AI-DECISION] ${character_name} chose ${selected_choice.name}`);
    console.log(`💬 [AI-DIALOGUE] "${dialogue}"`);

    return {
      choice: selected_choice.id,
      reasoning: dialogue
    };

  } catch (error: any) {
    console.error(`❌ [AI-DECISION-ERROR] Failed to get autonomous decision:`, error);
    throw error; // Let error propagate - no fallbacks
  }
}

/**
 * Present character with equipment choices and get their autonomous decision
 * Called when adherence check fails (adherence <= 50)
 */
export async function getAutonomousEquipmentDecision(params: {
  character_id: string;
  character_name: string;
  user_id: string;
  coach_choice: EquipmentChoice;
  available_choices: EquipmentChoice[];
  adherence_score: number;
  bond_level: number;
  wallet: number;
  personality?: {
    archetype: string;
    traits: string[];
    backstory?: string;
    conversation_style?: string;
  };
}): Promise<{ choice: string; reasoning: string }> {

  return getAIEquipmentChoice({
    character_name: params.character_name,
    character_id: params.character_id,
    user_id: params.user_id,
    coach_choice: params.coach_choice,
    available_choices: params.available_choices,
    adherence_score: params.adherence_score,
    bond_level: params.bond_level,
    wallet: params.wallet,
    personality: params.personality
  });
}

/**
 * Check adherence and execute equipment decision (either coach's or character's choice)
 */
export async function check_adherence_and_equip(params: {
  user_id: string;
  character_id: string;
  coach_equipment_choice: string; // Equipment ID coach wants to equip
}): Promise<AutonomousDecisionResult> {

  const { user_id, character_id, coach_equipment_choice } = params;

  // 1. Get character data including adherence and state
  const character = await db_adapter.user_characters.find_by_id(character_id);
  if (!character) {
    throw new Error('Character not found');
  }

  // Verify ownership
  if (character.user_id !== user_id) {
    throw new Error('Character does not belong to user');
  }

  // 2. Get gameplan_adherence from DB (all psych stats already factored in by generated column)
  const adherence = character.gameplan_adherence;

  // 3. Perform d100 roll vs gameplan_adherence (non-battle context: no battle modifiers)
  const roll = Math.floor(Math.random() * 100) + 1; // d100: 1-100
  const passed = roll <= adherence;

  console.log(`🎯 [ADHERENCE-CHECK] ${character.name}: rolled ${roll} vs threshold ${adherence} - ${passed ? 'PASS' : 'FAIL'}`);

  // 4. Check adherence result
  if (passed) {
    // Character follows coach
    console.log(`✅ [ADHERENCE-SUCCESS] ${character.name} follows coach's choice (rolled ${roll} <= ${adherence})`);

    const success = await db_adapter.character_equipment.equip(character_id, coach_equipment_choice);
    if (!success) {
      throw new Error('Failed to equip coach\'s choice');
    }

    return {
      adhered: true,
      final_choice: coach_equipment_choice,
      message: `${character.name} equipped your choice.`
    };
  }

  // 5. Adherence failed - character rebels
  console.log(`🚨 [ADHERENCE-FAILED] ${character.name} rebelling! Rolled ${roll} vs threshold ${adherence}`);

  // Get character's available equipment from inventory (only eligible items)
  const { getEligibleInventory } = await import('./equipmentEligibility');
  const inventory = await getEligibleInventory(character_id);

  // Find coach's equipment choice details
  const coach_equipment = inventory.find((eq: any) => eq.equipment_id === coach_equipment_choice);
  if (!coach_equipment) {
    throw new Error('Coach\'s equipment choice not found in character inventory');
  }

  // Filter to same slot as coach's choice, EXCLUDING the coach's choice itself
  // CRITICAL: Must only include items from the SAME slot - can't equip a weapon in an armor slot!
  const available_choices = inventory.filter((item: any) =>
    item.slot === coach_equipment.slot && item.equipment_id !== coach_equipment_choice
  );

  console.log(`🎯 [REBELLION] Coach chose: ${coach_equipment.name}`);
  console.log(`🎯 [REBELLION] Alternative options (${available_choices.length}):`, available_choices.map((i: any) => i.name).join(', '));

  // If no alternatives, character must use coach's choice but generate AI dialogue explaining reluctance
  if (available_choices.length === 0) {
    const success = await db_adapter.character_equipment.equip(character_id, coach_equipment_choice);
    if (!success) {
      throw new Error('Failed to equip equipment');
    }

    // TODO: Generate AI dialogue for reluctant acceptance using proper equipment prompt system
    const reluctant_dialogue = `I don't have anything else for that slot, coach. I'll use the ${coach_equipment.name}.`;

    // Create event for reluctant compliance - still worth remembering
    try {
      const GameEventBus = (await import('./gameEventBus')).default;
      const event_bus = GameEventBus.get_instance();

      await event_bus.publish({
        type: 'equipment:reluctant_compliance',
        source: 'equipment_room',
        userchar_ids: [character_id],
        severity: 'low',
        category: 'progression',
        description: `${character.name} wanted to rebel but had no alternatives, reluctantly accepted coach's choice`,
        metadata: {
          coach_choice: coach_equipment.name,
          reasoning: reluctant_dialogue,
          adherence_level: adherence,
          slot: coach_equipment.slot,
          effects: {
            adherence: RELUCTANT_COMPLIANCE_PENALTY,
            ego: -1
          }
        },
        tags: ['equipment', 'rebellion', 'compliance', 'frustration'],
        importance: 5,
        emotional_impact: [{
          character_id: character_id,
          impact: 'negative',
          intensity: 4
        }]
      });

      // Update coach↔character bond
      await recordBondActivity({
        user_character_id: character_id,
        activity_type: 'equipment_reluctant_compliance',
        context: {
          coach_choice: coach_equipment.name,
          reasoning: reluctant_dialogue
        },
        source: 'equipment_system'
      });

      console.log(`📚 [MEMORY] Stored reluctant compliance event for ${character.name}`);
    } catch (error) {
      console.error('Failed to create reluctant compliance event or update bond:', error);
    }

    return {
      adhered: false,
      final_choice: coach_equipment_choice,
      message: `${character.name} reluctantly equipped ${coach_equipment.name}.`,
      ai_response: reluctant_dialogue
    };
  }

  // Get AI decision with personality context
  const decision = await getAutonomousEquipmentDecision({
    character_id,
    character_name: character.name,
    user_id,
    coach_choice: {
      id: coach_equipment.equipment_id,
      name: coach_equipment.name,
      description: coach_equipment.description || '',
      slot: coach_equipment.slot
    },
    available_choices: available_choices.map((item: any) => ({
      id: item.equipment_id,
      name: item.name,
      description: item.description || '',
      slot: item.slot
    })),
    adherence_score: adherence,
    bond_level: character.bond_level,
    wallet: character.wallet,
    personality: {
      archetype: character.archetype,
      traits: character.personality_traits,
      backstory: character.backstory,
      conversation_style: character.conversation_style
    }
  });

  // Equip the AI's choice
  const success = await db_adapter.character_equipment.equip(character_id, decision.choice);
  if (!success) {
    throw new Error('Failed to equip AI\'s choice');
  }

  // Update adherence level (gambling system)
  const new_adherence = Math.max(0, adherence + REBELLION_PENALTY);
  await db_adapter.user_characters.update(character_id, {
    gameplan_adherence: new_adherence
  });

  // Create event for memory system - this rebellion will be remembered
  try {
    const GameEventBus = (await import('./gameEventBus')).default;
    const event_bus = GameEventBus.get_instance();

    const ai_chosen_equipment = available_choices.find(eq => eq.id === decision.choice);

    if (!ai_chosen_equipment) {
      throw new Error(`AI chose equipment ID ${decision.choice} but it was not found in available choices`);
    }

    await event_bus.publish({
      type: 'equipment:autonomous_rebellion',
      source: 'equipment_room',
      userchar_ids: [character_id],
      severity: 'medium',
      category: 'progression',
      description: `${character.name} rejected coach's equipment choice and made their own decision`,
      metadata: {
        coach_choice: coach_equipment.name,
        character_choice: ai_chosen_equipment.name,
        reasoning: decision.reasoning,
        adherence_before: adherence,
        adherence_after: new_adherence,
        slot: coach_equipment.slot,
        effects: {
          adherence: REBELLION_PENALTY,
          ego: +2
        }
      },
      tags: ['equipment', 'rebellion', 'autonomy', 'empowerment'],
      importance: 7,
      emotional_impact: [{
        character_id: character_id,
        impact: 'positive',
        intensity: 6
      }]
    });

    // Update coach↔character bond (rebellion damages trust)
    await recordBondActivity({
      user_character_id: character_id,
      activity_type: 'equipment_autonomous_rebellion',
      context: {
        coach_choice: coach_equipment.name,
        character_choice: ai_chosen_equipment.name,
        reasoning: decision.reasoning
      },
      source: 'equipment_system'
    });

    console.log(`📚 [MEMORY] Stored rebellion event for ${character.name}`);
  } catch (error) {
    console.error('Failed to create rebellion event or update bond:', error);
  }

  return {
    adhered: false,
    final_choice: decision.choice,
    message: `${character.name} made their own choice.`,
    ai_response: decision.reasoning
  };
}

/**
 * Let character autonomously decide equipment (bypasses adherence check)
 * User explicitly wants the character to make their own choice
 */
export async function letCharacterDecideEquipment({
  user_id,
  character_id
}: {
  user_id: string;
  character_id: string;
}) {
  console.log(`🎯 [AUTONOMOUS-DECISION] Character ${character_id} making own equipment choice`);

  // 1. Fetch character data
  const character = await db_adapter.user_characters.find_by_id(character_id);
  if (!character) {
    throw new Error('Character not found');
  }

  // 2. Verify ownership
  if (character.user_id !== user_id) {
    throw new Error('Character does not belong to user');
  }

  // 3. Get character's available equipment from inventory
  const inventory = await db_adapter.character_equipment.find_by_character_id(character_id);

  if (inventory.length === 0) {
    throw new Error('Character has no equipment in inventory');
  }

  // 4. Present all equipment to AI for decision
  const decision = await getAIEquipmentChoice({
    character_name: character.name,
    character_id: character.character_id,
    user_id: user_id,
    coach_choice: null, // No coach recommendation
    available_choices: inventory.map((item: any) => ({
      id: item.equipment_id,
      name: item.name,
      description: item.description || '',
      slot: item.slot
    })),
    adherence_score: 0, // Not relevant - character is choosing freely
    bond_level: character.bond_level,
    wallet: character.wallet
  });

  // 5. Equip the AI's choice
  const success = await db_adapter.character_equipment.equip(character_id, decision.choice);
  if (!success) {
    throw new Error('Failed to equip AI\'s choice');
  }

  console.log(`✅ [AUTONOMOUS-DECISION] Character ${character_id} chose: ${decision.choice}`);

  return {
    final_choice: decision.choice,
    message: `Character chose ${decision.choice}.`,
    ai_reasoning: decision.reasoning
  };
}

/**
 * Check adherence and execute ability rank-up decision
 * Similar to equipment, but for ability leveling
 */
export async function check_adherence_and_rank_ability({
  user_id,
  character_id,
  coach_ability_choice
}: {
  user_id: string;
  character_id: string;
  coach_ability_choice: string; // ability_id coach wants to rank up
}) {
  console.log(`🎯 [ABILITY-ADHERENCE-CHECK] Checking if character ${character_id} will follow coach's ability choice: ${coach_ability_choice}`);

  // 1. Fetch character data
  const character = await db_adapter.user_characters.find_by_id(character_id);
  if (!character) {
    throw new Error('Character not found');
  }

  // 2. Verify ownership
  if (character.user_id !== user_id) {
    throw new Error('Character does not belong to user');
  }

  // 3. Get gameplan_adherence from DB (all psych stats already factored in by generated column)
  const adherence = character.gameplan_adherence;

  // 4. Perform d100 roll vs gameplan_adherence (non-battle context: no battle modifiers)
  const roll = Math.floor(Math.random() * 100) + 1; // d100: 1-100
  const passed = roll <= adherence;

  console.log(`📊 [ABILITY-ADHERENCE] ${character.name}: rolled ${roll} vs threshold ${adherence} - ${passed ? 'PASS' : 'FAIL'}`);

  // 5. Check adherence
  if (passed) {
    // Character follows coach's choice
    console.log(`✅ [ABILITY-ADHERENCE-SUCCESS] ${character.name} will follow coach's ability choice (rolled ${roll} <= ${adherence})`);

    return {
      adhered: true,
      final_choice: coach_ability_choice,
      message: `${character.name} followed your choice to rank up ${coach_ability_choice}.`,
      should_proceed: true
    };
  }

  // 6. Adherence failed - get character's available abilities
  const available_abilities_result = await db_adapter.query(
    'SELECT ability_id, ability_name, rank, max_rank FROM character_abilities WHERE character_id = $1 AND rank < max_rank',
    [character_id]
  );

  if (available_abilities_result.rows.length === 0) {
    // No abilities to rank up - must use coach's choice
    return {
      adhered: true,
      final_choice: coach_ability_choice,
      message: `${character.name} has no other abilities to rank up. Using coach's choice: ${coach_ability_choice}.`,
      should_proceed: true
    };
  }

  // 7. Let AI choose from available abilities
  const decision = await getAIAbilityChoice({
    character_name: character.name,
    coach_choice: { id: coach_ability_choice, name: coach_ability_choice },
    available_choices: available_abilities_result.rows.map((row: any) => ({
      id: row.ability_id,
      name: row.ability_name,
      current_rank: row.rank,
      max_rank: row.max_rank
    })),
    adherence_score: adherence,
    bond_level: character.bond_level
  });

  // 8. Update adherence (decreases when character rebels)
  const new_adherence = Math.max(0, adherence + REBELLION_PENALTY);
  await db_adapter.user_characters.update(character_id, {
    gameplan_adherence: new_adherence
  });

  return {
    adhered: false,
    final_choice: decision.choice,
    message: decision.message,
    should_proceed: true
  };
}

/**
 * Get AI's ability rank-up choice
 */
async function getAIAbilityChoice(params: {
  character_name: string;
  coach_choice: { id: string; name: string } | null;
  available_choices: Array<{ id: string; name: string; current_rank: number; max_rank: number }>;
  adherence_score: number;
  bond_level: number;
}): Promise<{ choice: string; message: string }> {

  const { character_name, coach_choice, available_choices, adherence_score, bond_level } = params;

  const choice_letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const choices_list = available_choices
    .slice(0, 6)
    .map((choice, i) => `${choice_letters[i]}) ${choice.name} (Rank ${choice.current_rank}/${choice.max_rank})`)
    .join('\n');

  const prompt = coach_choice
    ? `AUTONOMOUS ABILITY DECISION:

Your coach wants you to rank up: ${coach_choice.name}

However, your bond with the coach is only ${bond_level}/100 (adherence: ${adherence_score}/100).
Since your adherence is ${adherence_score}, you get to make your own decision.

Available abilities you can rank up:
${choices_list}

RESPOND WITH ONLY THE LETTER (A, B, C, etc.) of your choice.
Pick based on YOUR fighting style and what YOU think is most important.

Your choice (letter only):`
    : `AUTONOMOUS ABILITY DECISION:

You get to choose which ability to rank up.

Available abilities:
${choices_list}

RESPOND WITH ONLY THE LETTER (A, B, C, etc.) of your choice.
Pick based on YOUR fighting style preferences.

Your choice (letter only):`;

  try {
    const ai_response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: coach_choice
          ? `You are ${character_name}. You are deciding which ability to rank up because you don't fully trust your coach's judgment right now.`
          : `You are ${character_name}. You are choosing which ability to rank up based on your fighting style.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 10
    });

    const response_text = ai_response.choices[0]?.message?.content?.trim() || '';
    console.log(`🤖 [AI-ABILITY-DECISION] ${character_name} chose: ${response_text}`);

    const choice_letter = response_text.match(/[A-F]/i)?.[0]?.toUpperCase();
    if (!choice_letter) {
      throw new Error(`Invalid AI response: ${response_text}`);
    }

    const choice_index = choice_letters.indexOf(choice_letter);
    if (choice_index === -1 || choice_index >= available_choices.length) {
      throw new Error(`Invalid choice letter: ${choice_letter}`);
    }

    const selected_choice = available_choices[choice_index];

    const message = coach_choice
      ? `${character_name} decided to rank up ${selected_choice.name} instead of ${coach_choice.name}.`
      : `${character_name} chose to rank up ${selected_choice.name}.`;

    return {
      choice: selected_choice.id,
      message
    };

  } catch (error: any) {
    console.error(`❌ [AI-ABILITY-DECISION-ERROR] Failed:`, error);

    if (coach_choice) {
      return {
        choice: coach_choice.id,
        message: `${character_name} followed coach's choice: ${coach_choice.name}.`
      };
    } else {
      return {
        choice: available_choices[0].id,
        message: `${character_name} selected ${available_choices[0].name}.`
      };
    }
  }
}
