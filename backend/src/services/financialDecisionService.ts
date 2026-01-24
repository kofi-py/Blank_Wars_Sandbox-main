/**
 * Financial Decision Service
 *
 * Handles financial decision events in the Financial Advisor chat.
 * - Triggers random decision events based on character state
 * - Generates decisions from store items/equipment
 * - Resolves decisions with adherence roll and judge evaluation
 *
 * Blueprint reference: cc_12_31_25_11.03am_chats.md (Sections 3, 5)
 */

import { query } from '../database/index';
import OpenAI from 'openai';
import {
  FinancialDecisionCategory,
  FinancialPersonality,
  getFinancialPersonality,
  getGameplanAdherence,
  rollFinancialAdherence
} from './financialAdherenceService';
import buildFinancialJudgeRole, { FinancialJudgeInput, getGradeRewardStrings } from './prompts/domains/financial/roles/judge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface FinancialDecision {
  id: string;
  user_character_id: string;
  item_id: string | null;
  equipment_id: string | null;
  category: FinancialDecisionCategory;
  amount: number;
  character_reasoning: string;
  is_risky: boolean;
  coach_response: 'endorse' | 'advise_against' | null;
  character_response: 'comply' | 'defy' | null;
  adherence_roll: number | null;
  outcome: 'executed' | 'rejected' | null;
  judge_character_id: string | null;
  judge_grade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  judge_ruling: string | null;
  trust_change: number | null;
  stress_change: number | null;
  wallet_change: number | null;
  debt_change: number | null;
  xp_change: number | null;
  created_at: string;
  resolved_at: string | null;
  // Joined data
  item_name?: string;
  equipment_name?: string;
}

interface CharacterFinancialState {
  wallet: number;
  debt: number;
  financial_stress: number;
  financial_personality: FinancialPersonality;
}

/**
 * Check if a decision event should trigger this turn.
 *
 * Base: 15%
 * Modifiers from blueprint:
 * - financial_stress > 70: +10%
 * - luxury_desire > 70: +10%
 * - spending_style = 'impulsive': +15%
 * - spending_style = 'conservative': -10%
 * - wallet > 1000: +5%
 * - debt > wallet * 2: +10%
 */
export async function shouldTriggerEvent(character_id: string): Promise<boolean> {
  // Check if there's already a pending decision
  const pending = await getPendingDecision(character_id);
  if (pending) {
    console.log(`💰 [FINANCIAL-TRIGGER] Character ${character_id} already has pending decision`);
    return false;
  }

  // Get character state
  const state = await getCharacterFinancialState(character_id);
  const fp = state.financial_personality;

  let probability = 15; // Base 15%

  // Apply modifiers
  if (state.financial_stress > 70) probability += 10;
  if (fp.luxury_desire > 70) probability += 10;
  if (fp.spending_style === 'impulsive') probability += 15;
  if (fp.spending_style === 'conservative') probability -= 10;
  if (state.wallet > 1000) probability += 5;
  if (state.debt > state.wallet * 2) probability += 10;

  // Clamp between 5% and 60%
  probability = Math.max(5, Math.min(60, probability));

  const roll = Math.floor(Math.random() * 100) + 1;
  const triggered = roll <= probability;

  console.log(`💰 [FINANCIAL-TRIGGER] Roll: ${roll}, Threshold: ${probability}%, Triggered: ${triggered}`);

  return triggered;
}

/**
 * Get character's financial state from user_characters.
 */
async function getCharacterFinancialState(character_id: string): Promise<CharacterFinancialState> {
  const result = await query(
    `SELECT wallet, debt, financial_stress, financial_personality
     FROM user_characters WHERE id = $1`,
    [character_id]
  );

  if (result.rows.length === 0) {
    throw new Error(`Character ${character_id} not found`);
  }

  const row = result.rows[0];

  if (row.wallet === null || row.wallet === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing wallet`);
  }
  if (row.debt === null || row.debt === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing debt`);
  }
  if (row.financial_stress === null || row.financial_stress === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_stress`);
  }
  if (!row.financial_personality) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality`);
  }

  const fp = row.financial_personality;

  if (!fp.spending_style) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.spending_style`);
  }
  if (fp.financial_wisdom === null || fp.financial_wisdom === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.financial_wisdom`);
  }
  if (fp.risk_tolerance === null || fp.risk_tolerance === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.risk_tolerance`);
  }
  if (fp.luxury_desire === null || fp.luxury_desire === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.luxury_desire`);
  }
  if (fp.generosity === null || fp.generosity === undefined) {
    throw new Error(`STRICT MODE: Character ${character_id} missing financial_personality.generosity`);
  }

  return {
    wallet: row.wallet,
    debt: row.debt,
    financial_stress: row.financial_stress,
    financial_personality: {
      spending_style: fp.spending_style,
      financial_wisdom: fp.financial_wisdom,
      risk_tolerance: fp.risk_tolerance,
      luxury_desire: fp.luxury_desire,
      generosity: fp.generosity
    }
  };
}

/**
 * Select a category based on character's financial personality.
 */
function selectCategory(fp: FinancialPersonality, wallet: number, debt: number): FinancialDecisionCategory {
  // Weight categories by personality
  const weights: Record<FinancialDecisionCategory, number> = {
    luxury: fp.luxury_desire,
    investment: fp.risk_tolerance,
    impulse: fp.spending_style === 'impulsive' ? 80 : 20,
    generosity: fp.generosity,
    essentials: 50, // Always possible
    debt_payment: debt > 0 ? fp.financial_wisdom : 0 // Only if in debt
  };

  // Build weighted array
  const entries = Object.entries(weights) as [FinancialDecisionCategory, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);

  let roll = Math.random() * total;
  for (const [category, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return category;
  }

  return 'essentials'; // Fallback
}

/**
 * Get a random item or equipment from the store based on category and wallet.
 */
async function getStoreItem(
  category: FinancialDecisionCategory,
  wallet: number,
  debt: number
): Promise<{ type: 'item' | 'equipment'; id: string; name: string; price: number; rarity: string } | null> {

  // For debt_payment, no item needed
  if (category === 'debt_payment') {
    return null;
  }

  // Determine price range based on category
  let min_price = 100;
  let max_price = wallet * 2; // Can go into debt

  if (category === 'luxury') {
    min_price = wallet * 0.3; // At least 30% of wallet
  } else if (category === 'impulse') {
    max_price = wallet * 0.5; // Small impulse purchases
  } else if (category === 'essentials') {
    min_price = 50;
    max_price = wallet * 0.3; // Affordable essentials
  }

  // Try equipment first (more variety)
  const equipment_result = await query(
    `SELECT id, name, shop_price, rarity
     FROM equipment
     WHERE shop_price IS NOT NULL
       AND shop_price >= $1
       AND shop_price <= $2
     ORDER BY RANDOM()
     LIMIT 1`,
    [min_price, max_price]
  );

  if (equipment_result.rows.length > 0) {
    const eq = equipment_result.rows[0];
    return { type: 'equipment', id: eq.id, name: eq.name, price: eq.shop_price, rarity: eq.rarity };
  }

  // Fall back to items
  const item_result = await query(
    `SELECT id, name, shop_price, rarity
     FROM items
     WHERE shop_price IS NOT NULL
       AND shop_price >= $1
       AND shop_price <= $2
     ORDER BY RANDOM()
     LIMIT 1`,
    [min_price, max_price]
  );

  if (item_result.rows.length > 0) {
    const item = item_result.rows[0];
    return { type: 'item', id: item.id, name: item.name, price: item.shop_price, rarity: item.rarity };
  }

  // If nothing in range, get cheapest available
  const fallback = await query(
    `SELECT id, name, shop_price, rarity, 'equipment' as type
     FROM equipment WHERE shop_price IS NOT NULL
     UNION ALL
     SELECT id, name, shop_price, rarity, 'item' as type
     FROM items WHERE shop_price IS NOT NULL
     ORDER BY shop_price ASC
     LIMIT 1`
  );

  if (fallback.rows.length > 0) {
    const f = fallback.rows[0];
    return { type: f.type, id: f.id, name: f.name, price: f.shop_price, rarity: f.rarity };
  }

  return null;
}

/**
 * Generate character reasoning for wanting this item using AI.
 */
async function generateCharacterReasoning(
  character_name: string,
  personality_traits: string[],
  money_beliefs: string[],
  item_name: string,
  category: FinancialDecisionCategory
): Promise<string> {
  const prompt = `You are ${character_name}. Generate a 1-2 sentence in-character reason why you want to buy "${item_name}".

Category: ${category}
Your personality: ${personality_traits.join(', ')}
Your money beliefs: ${money_beliefs.join(', ')}

Speak naturally as ${character_name}. Be direct and in character. Don't start with "I" - vary your sentence structure.`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 100
    });

    return response.choices[0]?.message?.content?.trim() || `${character_name} wants this item.`;
  } catch (error) {
    console.error('Failed to generate character reasoning:', error);
    return `This ${item_name} would serve ${character_name} well.`;
  }
}

/**
 * Generate a financial decision event.
 */
export async function generateDecisionEvent(character_id: string): Promise<FinancialDecision> {
  const state = await getCharacterFinancialState(character_id);
  const category = selectCategory(state.financial_personality, state.wallet, state.debt);

  // Get character info for AI reasoning
  const char_result = await query(
    `SELECT c.name, c.personality_traits, c.money_beliefs
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [character_id]
  );

  if (char_result.rows.length === 0) {
    throw new Error(`STRICT MODE: Character ${character_id} not found for decision generation`);
  }
  const char = char_result.rows[0];
  if (!char.name) {
    throw new Error(`STRICT MODE: Character ${character_id} missing name`);
  }
  if (!char.personality_traits) {
    throw new Error(`STRICT MODE: Character ${character_id} missing personality_traits`);
  }
  if (!char.money_beliefs) {
    throw new Error(`STRICT MODE: Character ${character_id} missing money_beliefs`);
  }
  const character_name = char.name;
  const personality_traits = char.personality_traits;
  const money_beliefs = char.money_beliefs;

  let item_id: string | null = null;
  let equipment_id: string | null = null;
  let item_name = '';
  let amount = 0;
  let is_risky = false;

  if (category === 'debt_payment') {
    // For debt payment, amount is a portion of debt
    amount = Math.min(state.debt, Math.floor(state.wallet * 0.5));
    item_name = 'debt payment';
    is_risky = false;
  } else {
    const store_item = await getStoreItem(category, state.wallet, state.debt);
    if (!store_item) {
      throw new Error('No items available in store');
    }

    if (store_item.type === 'equipment') {
      equipment_id = store_item.id;
    } else {
      item_id = store_item.id;
    }
    item_name = store_item.name;
    amount = store_item.price;
    is_risky = amount > state.wallet || store_item.rarity === 'legendary' || store_item.rarity === 'mythic';
  }

  // Generate character's reasoning
  const character_reasoning = await generateCharacterReasoning(
    character_name,
    personality_traits,
    money_beliefs,
    item_name,
    category
  );

  // Insert the decision
  const insert_result = await query(
    `INSERT INTO financial_decisions
     (user_character_id, item_id, equipment_id, category, amount, character_reasoning, is_risky)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [character_id, item_id, equipment_id, category, amount, character_reasoning, is_risky]
  );

  const decision = insert_result.rows[0];

  console.log(`💰 [FINANCIAL-DECISION] Generated ${category} decision for ${character_name}: ${item_name} ($${amount})`);

  return {
    ...decision,
    item_name: item_id ? item_name : undefined,
    equipment_name: equipment_id ? item_name : undefined
  };
}

/**
 * Get pending (unresolved) decision for a character.
 */
export async function getPendingDecision(character_id: string): Promise<FinancialDecision | null> {
  const result = await query(
    `SELECT fd.*,
            i.name as item_name,
            e.name as equipment_name
     FROM financial_decisions fd
     LEFT JOIN items i ON fd.item_id = i.id
     LEFT JOIN equipment e ON fd.equipment_id = e.id
     WHERE fd.user_character_id = $1 AND fd.resolved_at IS NULL`,
    [character_id]
  );

  return result.rows[0] || null;
}

/**
 * Get user's assigned judge.
 */
async function getUserJudge(user_id: string): Promise<{ id: string; character_id: string; name: string } | null> {
  const result = await query(
    `SELECT uc.id, uc.character_id, c.name
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.user_id = $1 AND c.role = 'judge'`,
    [user_id]
  );

  return result.rows[0] || null;
}

/**
 * Evaluate a financial decision with the user's assigned judge.
 */
async function evaluateWithJudge(
  judge_userchar_id: string,
  input: FinancialJudgeInput
): Promise<{ grade: 'A' | 'B' | 'C' | 'D' | 'E'; ruling: string }> {
  // Get judge character data
  const judge_result = await query(
    `SELECT c.name, c.personality_traits, c.backstory
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [judge_userchar_id]
  );

  if (judge_result.rows.length === 0) {
    throw new Error(`STRICT MODE: Judge ${judge_userchar_id} not found`);
  }

  const judge = judge_result.rows[0];
  if (!judge.name) {
    throw new Error(`STRICT MODE: Judge ${judge_userchar_id} missing name`);
  }
  if (!judge.personality_traits) {
    throw new Error(`STRICT MODE: Judge ${judge_userchar_id} missing personality_traits`);
  }
  if (!judge.backstory) {
    throw new Error(`STRICT MODE: Judge ${judge_userchar_id} missing backstory`);
  }

  const reward_strings = getGradeRewardStrings(input.decision_amount);

  // Build minimal judge data for the prompt builder
  const judgeData = {
    IDENTITY: {
      name: judge.name,
      personality_traits: judge.personality_traits,
      backstory: judge.backstory
    }
  } as any;

  const prompt = buildFinancialJudgeRole(judgeData, {
    input,
    ...reward_strings
  });

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`STRICT MODE: OpenAI returned no content for judge evaluation`);
    }
    const parsed = JSON.parse(content);

    if (!['A', 'B', 'C', 'D', 'E'].includes(parsed.choice)) {
      throw new Error(`STRICT MODE: Judge returned invalid grade "${parsed.choice}"`);
    }
    if (!parsed.ruling) {
      throw new Error(`STRICT MODE: Judge returned no ruling`);
    }
    const grade = parsed.choice as 'A' | 'B' | 'C' | 'D' | 'E';
    const ruling = parsed.ruling;

    console.log(`⚖️ [FINANCIAL-JUDGE] ${judge.name} evaluated: Grade ${grade}`);

    return { grade, ruling };
  } catch (error: any) {
    throw new Error(`STRICT MODE: Judge evaluation failed: ${error.message}`);
  }
}

/**
 * Resolve a financial decision after coach responds.
 *
 * Flow:
 * 1. Calculate adherence roll
 * 2. Determine comply/defy
 * 3. Determine outcome (executed/rejected)
 * 4. Call judge for evaluation
 * 5. Apply changes to character
 * 6. Mark decision resolved
 */
export async function resolveDecision(
  decision_id: string,
  coach_response: 'endorse' | 'advise_against'
): Promise<FinancialDecision> {
  // Get the decision
  const decision_result = await query(
    `SELECT fd.*, uc.user_id, uc.wallet, uc.debt, uc.gameplan_adherence
     FROM financial_decisions fd
     JOIN user_characters uc ON fd.user_character_id = uc.id
     WHERE fd.id = $1`,
    [decision_id]
  );

  if (decision_result.rows.length === 0) {
    throw new Error(`Decision ${decision_id} not found`);
  }

  const decision = decision_result.rows[0];

  if (decision.resolved_at) {
    throw new Error(`Decision ${decision_id} already resolved`);
  }

  // Get financial personality
  const fp = await getFinancialPersonality(decision.user_character_id);
  if (decision.gameplan_adherence === null || decision.gameplan_adherence === undefined) {
    throw new Error(`STRICT MODE: Character ${decision.user_character_id} missing gameplan_adherence`);
  }
  const gameplan_adherence = decision.gameplan_adherence;

  // Character always wants it (they proposed the decision)
  const character_wants_it = true;

  // Roll for adherence
  const adherence_result = rollFinancialAdherence({
    gameplan_adherence,
    financial_personality: fp,
    decision_category: decision.category,
    coach_response,
    character_wants_it
  });

  // Determine outcome
  // Comply + Endorse = Execute
  // Comply + Advise Against = Don't execute
  // Defy + Endorse = Don't execute
  // Defy + Advise Against = Execute anyway
  let outcome: 'executed' | 'rejected';
  if (adherence_result.result === 'comply') {
    outcome = coach_response === 'endorse' ? 'executed' : 'rejected';
  } else {
    outcome = coach_response === 'endorse' ? 'rejected' : 'executed';
  }

  // Calculate financial changes
  let wallet_change = 0;
  let debt_change = 0;

  if (outcome === 'executed') {
    if (decision.category === 'debt_payment') {
      // Pay down debt
      wallet_change = -decision.amount;
      debt_change = -decision.amount;
    } else {
      // Purchase item
      if (decision.wallet >= decision.amount) {
        wallet_change = -decision.amount;
      } else {
        // Go into debt for the difference
        wallet_change = -decision.wallet;
        debt_change = decision.amount - decision.wallet;
      }
    }
  }

  // Get judge and character data for evaluation
  const judge = await getUserJudge(decision.user_id);
  if (!judge) {
    throw new Error(`STRICT MODE: No judge found for user ${decision.user_id}`);
  }

  // Get character info for judge input
  const char_result = await query(
    `SELECT c.name, c.personality_traits, uc.financial_stress
     FROM user_characters uc
     JOIN characters c ON uc.character_id = c.id
     WHERE uc.id = $1`,
    [decision.user_character_id]
  );
  if (char_result.rows.length === 0) {
    throw new Error(`STRICT MODE: Character ${decision.user_character_id} not found`);
  }
  const char = char_result.rows[0];
  if (char.financial_stress === null || char.financial_stress === undefined) {
    throw new Error(`STRICT MODE: Character ${decision.user_character_id} missing financial_stress`);
  }
  if (!char.personality_traits) {
    throw new Error(`STRICT MODE: Character ${decision.user_character_id} missing personality_traits`);
  }

  // Get item/equipment name for description
  let decision_description: string;
  if (decision.category === 'debt_payment') {
    decision_description = 'debt payment';
  } else if (decision.item_id) {
    const item_result = await query(`SELECT name FROM items WHERE id = $1`, [decision.item_id]);
    if (item_result.rows.length === 0) {
      throw new Error(`STRICT MODE: Item ${decision.item_id} not found`);
    }
    decision_description = item_result.rows[0].name;
  } else if (decision.equipment_id) {
    const eq_result = await query(`SELECT name FROM equipment WHERE id = $1`, [decision.equipment_id]);
    if (eq_result.rows.length === 0) {
      throw new Error(`STRICT MODE: Equipment ${decision.equipment_id} not found`);
    }
    decision_description = eq_result.rows[0].name;
  } else {
    throw new Error(`STRICT MODE: Decision ${decision_id} has no item_id, equipment_id, or debt_payment category`);
  }

  // Call judge for evaluation
  const judge_input: FinancialJudgeInput = {
    character_name: char.name,
    character_id: decision.user_character_id,
    personality_traits: char.personality_traits,
    decision_category: decision.category,
    decision_description,
    decision_amount: decision.amount,
    character_reasoning: decision.character_reasoning,
    is_risky: decision.is_risky,
    coach_response,
    character_response: adherence_result.result,
    outcome,
    wallet_before: decision.wallet,
    debt_before: decision.debt,
    financial_stress: char.financial_stress,
    spending_style: fp.spending_style,
    financial_wisdom: fp.financial_wisdom
  };

  const judge_evaluation = await evaluateWithJudge(judge.id, judge_input);
  const judge_grade = judge_evaluation.grade;
  const judge_ruling = judge_evaluation.ruling;

  // Calculate rewards/penalties based on grade
  const grade_rewards: Record<string, { trust: number; stress: number; wallet_pct: number; xp: number }> = {
    A: { trust: 5, stress: -10, wallet_pct: 10, xp: 50 },
    B: { trust: 2, stress: -5, wallet_pct: 5, xp: 25 },
    C: { trust: 0, stress: 0, wallet_pct: 0, xp: 10 },
    D: { trust: -2, stress: 10, wallet_pct: -5, xp: 0 },
    E: { trust: -5, stress: 20, wallet_pct: -10, xp: -25 }
  };

  const rewards = grade_rewards[judge_grade];
  const trust_change = rewards.trust;
  const stress_change = rewards.stress;
  const xp_change = rewards.xp;
  const bonus_wallet = Math.floor(decision.amount * rewards.wallet_pct / 100);
  wallet_change += bonus_wallet;

  // Update the decision record
  await query(
    `UPDATE financial_decisions SET
       coach_response = $1,
       character_response = $2,
       adherence_roll = $3,
       outcome = $4,
       judge_character_id = $5,
       judge_grade = $6,
       judge_ruling = $7,
       trust_change = $8,
       stress_change = $9,
       wallet_change = $10,
       debt_change = $11,
       xp_change = $12,
       resolved_at = NOW()
     WHERE id = $13`,
    [
      coach_response,
      adherence_result.result,
      adherence_result.roll,
      outcome,
      judge?.id || null,
      judge_grade,
      judge_ruling,
      trust_change,
      stress_change,
      wallet_change,
      debt_change,
      xp_change,
      decision_id
    ]
  );

  // Apply changes to character
  await query(
    `UPDATE user_characters SET
       wallet = GREATEST(0, wallet + $1),
       debt = GREATEST(0, debt + $2),
       coach_trust_level = LEAST(100, GREATEST(0, coach_trust_level + $3)),
       experience = experience + $4
     WHERE id = $5`,
    [wallet_change, debt_change, trust_change, Math.max(0, xp_change), decision.user_character_id]
  );

  // If item was purchased, add to inventory
  if (outcome === 'executed' && decision.category !== 'debt_payment') {
    if (decision.item_id) {
      await query(
        `INSERT INTO character_items (character_id, item_id, quantity, acquired_from)
         VALUES ($1, $2, 1, 'purchase')
         ON CONFLICT (character_id, item_id) DO UPDATE SET quantity = character_items.quantity + 1`,
        [decision.user_character_id, decision.item_id]
      );
    } else if (decision.equipment_id) {
      await query(
        `INSERT INTO character_equipment (character_id, equipment_id, acquired_from)
         VALUES ($1, $2, 'purchase')
         ON CONFLICT (character_id, equipment_id) DO NOTHING`,
        [decision.user_character_id, decision.equipment_id]
      );
    }
  }

  console.log(`💰 [FINANCIAL-RESOLVE] Decision ${decision_id}: ${adherence_result.result} -> ${outcome}, Grade: ${judge_grade}`);

  // Return updated decision
  return (await getPendingDecision(decision.user_character_id)) || decision;
}
