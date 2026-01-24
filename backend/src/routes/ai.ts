import express from 'express';
import axios from 'axios';
import http from 'http';
import https from 'https';
import dns from 'dns';
import Open_ai from 'openai';
import { deliverMessage } from '../services/agiInbox';
import GameEventBus from '../services/gameEventBus';
import EventContextService, { ECS_VERSION } from '../services/eventContextService';
import { consumeIfPresent } from '../services/branchInjection';
import { authenticate_token } from '../services/auth';
import { require_ticket } from '../middleware/ticketMiddleware';
import { AuthRequest } from '../types/index';
import { encode, decode } from 'gpt-3-encoder';
import { getTokenizerService } from '../services/tokenizer';
// Memory system imports
import { PgMemoryStore } from '../services/pgMemoryStore';
import { shouldRefresh, nextStatsBeforeRefresh, markRefreshed, rebalanceCard } from '../services/sessionSummarizer';
import { writeFinancialPatch } from '../services/domainUpdaters/financial';
import { writeTherapyPatch } from '../services/domainUpdaters/therapy';
import { assemblePrompt } from '../services/prompts';
import { resolveAgentId } from '../services/agentResolver';
import { mustResolveAgentKey } from '../utils/mapping';
import { handleTherapyEvaluation, handleBatchTherapyEvaluation } from '../services/therapy/evaluation';
import { getTherapistEvaluation, getBatchTherapistEvaluation, getChoiceMultiplier, calculateStatChange } from '../services/therapyEvaluationService';
import type { PatientInfo, EvaluationChoice } from '../services/therapyEvaluationService';
import { fetchCharacterData, fetchSystemCharacterData } from '../services/prompts/universalTemplate';
import { generatePersonalProblem } from '../services/personalProblemGeneratorService';

// Session state management for preventing duplicate sessions
type SessionState = {
  active: boolean;
};

const sessions = new Map<string, SessionState>();

function getSessionState(session_id: string): SessionState {
  let s = sessions.get(session_id);
  if (!s) {
    s = { active: false };
    sessions.set(session_id, s);
  }
  return s;
}

interface HistoryMessage {
  message: string;
  speaker_name: string;
  speaker_id: string;
}

function buildConversationHistory(messages: HistoryMessage[]): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  // Validate messages have required fields - fail fast if data is bad
  for (const msg of messages) {
    if (!msg.message) {
      throw new Error(`STRICT MODE: Message missing message field: ${JSON.stringify(msg)}`);
    }
    if (!msg.speaker_name) {
      throw new Error(`STRICT MODE: Message missing speaker_name field: ${JSON.stringify(msg)}`);
    }
    if (!msg.speaker_id) {
      throw new Error(`STRICT MODE: Message missing speaker_id field: ${JSON.stringify(msg)}`);
    }
  }

  const last = messages.slice(-4);

  // Format with speaker names - no cleanup, data should be clean at source
  const lines = last.map(m => `${m.speaker_name}: ${m.message.trim()}`);

  return 'RECENT CONVERSATION:\n' + lines.join('\n');
}

function sanitize_therapy_reply(text: string): string {
  if (!text) return '';
  // Remove wrapping quotes
  text = text.replace(/^["""]+|["""]+$/g, '');
  // Remove leading speaker labels
  text = text.replace(/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?:\s*/, '');
  // Remove obvious stage directions (*...*, ( ... ), [ ... ])
  text = text.replace(/\*.*?\*|\(.*?\)|\[.*?\]/g, ' ').trim();
  // Apply sentence limiting to prevent mid-sentence truncation
  return limitSentences(text, 2);
}

function limitSentences(text: string, max: number = 2): string {
  // Strip trailing spaces/newlines
  const t = (text ?? '').trim();
  if (!t) return t;

  // Split on sentence enders while keeping them
  const parts = t.split(/(?<=[.!?])\s+/);
  // If the model didn't actually close a sentence, just return as-is to avoid cutting mid-sentence
  if (parts.length === 1 && !/[.!?]$/.test(parts[0])) return parts[0];

  const kept = parts.slice(0, max).join(' ');
  return kept;
}
import { log } from '../services/log';
import type { SessionStats } from '../services/types';
import { getCharactersByRole } from '../config/roleRegistry';

console.log('[FINANCIAL][BOOT] ECS_VERSION =', ECS_VERSION);
import db_adapter from '../services/databaseAdapter';
import { query } from '../database/index';

const router = express.Router();

// ========== MEMORY SYSTEM HELPERS ==========

// Helper functions for memory system
function normalizeSessionId(raw?: string): string {
  if (!raw) return '';
  if (raw.startsWith('bw:')) {
    const parts = raw.split(':'); // ["bw", "<agent_key>", "<sid>"]
    return parts.slice(2).join(':') || '';
  }
  return raw;
}

// Accept hints from several request fields; classify domain type
function detectDomain(body: any): 'performance' | 'personal_problems' | 'financial' | 'therapy' | 'group_therapy' | 'group_activities' | 'equipment' | 'skills' | 'powers' | 'spells' | 'attributes' | 'kitchen_table' | 'confessional' | 'real_estate' | 'training' | 'battle' | 'message_board' | 'drama_board' | 'social_lounge' | 'progression' | 'magic' | 'abilities' | 'employee_lounge' {
  const cands = [
    body?.domain,
    body?.meta?.domain,
    body?.meta?.domain_specific,
    body?.chat_type,
    // Extract domain from chat_id format: therapy:userchar_id or chat:equipment:userchar_id:uuid
    body?.chat_id?.split(':')?.[0], // First part for therapy:userchar format
    body?.chat_id?.split(':')?.[1], // Second part for chat:domain:userchar format
    // Force therapy domain for therapy agents and judges
    ['zxk14bw7', 'carl_jung', 'seraphina', 'eleanor_roosevelt', 'king_solomon', 'anubis'].includes(body?.agent_key) ? 'therapy' : null,
  ].filter(Boolean).map((s: string) => String(s).toLowerCase());

  console.log('🔍 [DOMAIN-DETECT] candidates:', cands, 'from body:', { domain: body?.domain, chat_type: body?.chat_type, chat_id: body?.chat_id });

  if (cands.some((s) => s.includes('financial') || s.includes('finance'))) {
    console.log('🔍 [DOMAIN-DETECT] result: financial');
    return 'financial';
  }
  if (cands.some((s) => s.includes('group_therapy') || s.includes('group therapy'))) {
    console.log('🔍 [DOMAIN-DETECT] result: group_therapy');
    return 'group_therapy';
  }
  if (cands.some((s) => s.includes('therapy') || s.includes('evaluation'))) {
    console.log('🔍 [DOMAIN-DETECT] result: therapy');
    return 'therapy';
  }
  if (cands.some((s) => s.includes('performance'))) {
    console.log('🔍 [DOMAIN-DETECT] result: performance');
    return 'performance';
  }
  if (cands.some((s) => s.includes('personal_problems') || s.includes('personal'))) {
    console.log('🔍 [DOMAIN-DETECT] result: personal_problems');
    return 'personal_problems';
  }
  if (cands.some((s) => s.includes('group_activities') || s.includes('group'))) {
    console.log('🔍 [DOMAIN-DETECT] result: group_activities');
    return 'group_activities';
  }
  if (cands.some((s) => s.includes('equipment'))) {
    console.log('🔍 [DOMAIN-DETECT] result: equipment');
    return 'equipment';
  }
  if (cands.some((s) => s.includes('skills') || s.includes('abilities'))) {
    console.log('🔍 [DOMAIN-DETECT] result: abilities');
    return 'abilities';
  }
  if (cands.some((s) => s.includes('powers') || s.includes('power'))) {
    console.log('🔍 [DOMAIN-DETECT] result: powers');
    return 'powers';
  }
  if (cands.some((s) => s.includes('spells') || s.includes('spell') || s.includes('magic'))) {
    console.log('🔍 [DOMAIN-DETECT] result: spells');
    return 'spells';
  }
  if (cands.some((s) => s.includes('attributes') || s.includes('attribute'))) {
    console.log('🔍 [DOMAIN-DETECT] result: attributes');
    return 'attributes';
  }
  if (cands.some((s) => s.includes('kitchen_table') || s.includes('kitchen'))) {
    console.log('🔍 [DOMAIN-DETECT] result: kitchen_table');
    return 'kitchen_table';
  }
  if (cands.some((s) => s.includes('confessional'))) {
    console.log('🔍 [DOMAIN-DETECT] result: confessional');
    return 'confessional';
  }
  if (cands.some((s) => s.includes('real_estate') || s.includes('realty') || s.includes('real estate'))) {
    console.log('🔍 [DOMAIN-DETECT] result: real_estate');
    return 'real_estate';
  }
  if (cands.some((s) => s.includes('training'))) {
    console.log('🔍 [DOMAIN-DETECT] result: training');
    return 'training';
  }
  if (cands.some((s) => s.includes('battle'))) {
    console.log('🔍 [DOMAIN-DETECT] result: battle');
    return 'battle';
  }
  if (cands.some((s) => s.includes('message_board') || s.includes('message board'))) {
    console.log('🔍 [DOMAIN-DETECT] result: message_board');
    return 'message_board';
  }
  if (cands.some((s) => s.includes('drama_board') || s.includes('drama board') || s.includes('ai_drama'))) {
    console.log('🔍 [DOMAIN-DETECT] result: drama_board');
    return 'drama_board';
  }
  if (cands.some((s) => s.includes('employee_lounge') || s.includes('employee lounge') || s.includes('staff_meeting'))) {
    console.log('🔍 [DOMAIN-DETECT] result: employee_lounge');
    return 'employee_lounge';
  }
  if (cands.some((s) => s.includes('social_lounge') || s.includes('social lounge') || s.includes('social'))) {
    console.log('🔍 [DOMAIN-DETECT] result: social_lounge');
    return 'social_lounge';
  }
  if (cands.some((s) => s.includes('progression'))) {
    console.log('🔍 [DOMAIN-DETECT] result: progression');
    return 'progression';
  }
  console.error('❌ [DOMAIN-DETECT] FAILED - no domain matched, candidates:', cands);
  throw new Error(`Domain detection failed - no valid domain found in candidates: ${JSON.stringify(cands)}`);
}

// Financial system will be rebuilt to match therapy's clean architecture later
function modelCtx(_agent_key: string): number { return 4096; }
async function maybePrevAssistant(_sid: string): Promise<string | undefined> { return undefined; }

// Initialize Open_ai client with cleaned API key (prevents header errors from whitespace)
const clean_api_key = process.env.OPENAI_API_KEY?.replace(/\s/g, '').trim();
const openai = new Open_ai({ apiKey: clean_api_key });

// 1. FINANCIAL DOMAIN HANDLER
async function handleFinancialRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('💰 FINANCIAL: Processing financial request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;
    let character_name = '';
    let mood = '';
    let energy_level: number | null = null;

    // Get user_id from userchar_id
    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    // Get roommates (exclude current character)
    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    // Get financial data
    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;
    const speaker_character_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Get character name and current emotional state
    const char_result = await db_adapter.query(
      `SELECT c.name, uc.current_mood, uc.current_energy, uc.current_max_energy
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1`,
      [userchar_id]
    );
    const char_row = char_result.rows[0];
    if (!char_row?.name) {
      throw new Error(`STRICT MODE: Character name not found for userchar_id ${userchar_id}`);
    }
    if (char_row.current_mood === null || char_row.current_mood === undefined) {
      throw new Error(`STRICT MODE: current_mood missing for character ${canonical_id}`);
    }
    if (char_row.current_energy === null || char_row.current_energy === undefined) {
      throw new Error(`STRICT MODE: current_energy missing for character ${canonical_id}`);
    }
    if (char_row.current_max_energy === null || char_row.current_max_energy === undefined) {
      throw new Error(`STRICT MODE: current_max_energy missing for character ${canonical_id}`);
    }
    character_name = char_row.name;
    mood = char_row.current_mood;
    energy_level = Math.round((char_row.current_energy / char_row.current_max_energy) * 100);
    if (Number.isNaN(energy_level)) {
      throw new Error(`STRICT MODE: energy calculation invalid for character ${canonical_id}`);
    }

    // Get memory context
    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['financial', 'social'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[MEMORY] timeout', e?.message);
      memory_section = '';
    }

    // Build conversation history
    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    // Get user's active team from teams table (matching therapy pattern)
    let actual_team_id: string | null = null;
    try {
      const team_result = await db_adapter.query(
        'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
        [actual_user_id]
      );
      actual_team_id = team_result.rows[0]?.id;
      console.log('💰 [FINANCIAL-TEAM-FETCH] Resolved team_id:', actual_team_id, 'for user:', actual_user_id);

      if (!actual_team_id) {
        console.error('🚨 STRICT MODE: No active team found for user:', actual_user_id);
        throw new Error(`STRICT MODE: No active team set for user: ${actual_user_id}`);
      }
    } catch (error) {
      console.error('💰 [FINANCIAL-TEAM-FETCH] Error fetching team:', error);
      throw error; // NO FALLBACK - fail loudly
    }

    // Import financial decision services
    const { getPendingDecision, shouldTriggerEvent, generateDecisionEvent } = await import('../services/financialDecisionService');

    // Check for pending decision from DATABASE
    const pending_decision = await getPendingDecision(userchar_id);

    if (pending_decision) {
      // Coach must respond to pending decision via endpoint before continuing chat
      return res.json({
        ok: true,
        text: '',
        pending_decision: {
          id: pending_decision.id,
          category: pending_decision.category,
          amount: pending_decision.amount,
          character_reasoning: pending_decision.character_reasoning,
          is_risky: pending_decision.is_risky,
          item_name: pending_decision.item_name,
          equipment_name: pending_decision.equipment_name,
          created_at: pending_decision.created_at
        },
        requires_response: true,
        message: `${character_name} wants to make a financial decision. Respond via POST /api/financials/decisions/${pending_decision.id}/respond with "endorse" or "advise_against".`
      });
    }

    // No pending decision - process normal financial chat
    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'financial',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      financial_options: {
        coach_message: message,
        memory_context: memory_section,
      },
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = [
      "\n\n",
      "Financial Session:",
      "Scene:"
    ];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API
    console.log('[FINANCIAL] Calling Open_ai API');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[FINANCIAL] Open_ai response length:', response_text.length);

    // Memory patching
    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
      await writeFinancialPatch({ sid, model_text: response_text, state: store, character_id: canonical_id });
    } catch (e) {
      console.warn('[FINANCIAL][memory] patch failed (non-fatal):', e);
    }

    // Turn counting
    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    // After chat response, roll for decision event
    let triggered_decision = null;
    const should_trigger = await shouldTriggerEvent(userchar_id);
    if (should_trigger) {
      console.log(`💰 [FINANCIAL-DECISION] Decision event triggered for ${character_name} after chat turn`);
      await generateDecisionEvent(userchar_id);
      triggered_decision = await getPendingDecision(userchar_id);
    }

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      triggered_decision: triggered_decision ? {
        id: triggered_decision.id,
        category: triggered_decision.category,
        amount: triggered_decision.amount,
        character_reasoning: triggered_decision.character_reasoning,
        is_risky: triggered_decision.is_risky,
        item_name: triggered_decision.item_name,
        equipment_name: triggered_decision.equipment_name
      } : null,
      metadata: {
        domain: 'financial',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('💰 FINANCIAL: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'financial_processing_failed',
      detail: error.message
    });
  }
}

// 2. EQUIPMENT DOMAIN HANDLER
async function handleEquipmentRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('⚔️ EQUIPMENT: Processing equipment request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Get user's active team from teams table
    let actual_team_id: string | null = null;
    try {
      const team_result = await db_adapter.query(
        'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
        [actual_user_id]
      );
      actual_team_id = team_result.rows[0]?.id;
      console.log('⚔️ [EQUIPMENT-TEAM-FETCH] Resolved team_id:', actual_team_id, 'for user:', actual_user_id);

      if (!actual_team_id) {
        console.error('🚨 STRICT MODE: No active team found for user:', actual_user_id);
        throw new Error(`STRICT MODE: No active team set for user: ${actual_user_id}`);
      }
    } catch (error) {
      console.error('⚔️ [EQUIPMENT-TEAM-FETCH] Error fetching team:', error);
      throw error; // NO FALLBACK - fail loudly
    }

    // Get teammates from the active team (now stored in teams table, not team_context)
    const team_slots_result = await db_adapter.query(
      'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
      [actual_team_id]
    );
    if (team_slots_result.rows.length > 0) {
      const teammate_ids = [
        team_slots_result.rows[0].character_slot_1,
        team_slots_result.rows[0].character_slot_2,
        team_slots_result.rows[0].character_slot_3
      ].filter(id => id && id !== userchar_id); // Exclude current character and null slots

      if (teammate_ids.length > 0) {
        const teammate_result = await db_adapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
          [teammate_ids]
        );
        teammates = teammate_result.rows.map((row: { name: string }) => row.name);
      }
    }

    // Fetch character data including equipment preferences
    const character_result = await db_adapter.query(
      'SELECT name, weapon_proficiencies, preferred_weapons, armor_proficiency, preferred_armor_type, equipment_notes FROM characters WHERE id = $1',
      [canonical_id]
    );

    if (!character_result.rows[0]) {
      throw new Error(`Character not found for equipment: ${canonical_id}`);
    }

    const character_name = character_result.rows[0].name;
    const equipment_prefs = {
      weapon_profs: character_result.rows[0].weapon_proficiencies,
      preferred_weapons: character_result.rows[0].preferred_weapons,
      armor_prof: character_result.rows[0].armor_proficiency,
      preferred_armor: character_result.rows[0].preferred_armor_type,
      notes: character_result.rows[0].equipment_notes
    };

    const equipment_result = await db_adapter.query(
      'SELECT * FROM equipment WHERE restricted_to_character = $1 OR restricted_to_character = ANY($2) ORDER BY rarity, required_level',
      ['universal', [canonical_id, character_name]]
    );
    const available_equipment = equipment_result.rows;
    console.log(`⚔️ EQUIPMENT: Loaded ${available_equipment.length} equipment items for ${canonical_id}`);

    // [NEW] Fetch actual inventory
    const inventory_result = await db_adapter.query(`
      SELECT ce.equipment_id, ce.is_equipped, e.name, e.slot, e.rarity, e.stats
      FROM character_equipment ce
      JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = $1
    `, [userchar_id]);
    const inventory = inventory_result.rows;
    console.log(`⚔️ EQUIPMENT: Loaded ${inventory.length} owned items for ${userchar_id}`);

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['equipment', 'social', 'battle'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[EQUIPMENT][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    // Build clean conversation history
    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'equipment',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      equipment_options: {
        coach_message: message,
        memory_context: memory_section,
        inventory: inventory,
        available_equipment: available_equipment,
        equipment_prefs: equipment_prefs,
      },
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API
    console.log('[EQUIPMENT] Calling Open_ai API');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[EQUIPMENT] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[EQUIPMENT][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'equipment',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('⚔️ EQUIPMENT: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'equipment_processing_failed',
      detail: error.message
    });
  }
}

// 3. SKILLS DOMAIN HANDLER
async function handleSkillsRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('🎯 SKILLS: Processing skills request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Get user's active team from teams table
    const team_result = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );
    const actual_team_id = team_result.rows[0]?.id;
    if (!actual_team_id) {
      throw new Error(`No active team set for user: ${actual_user_id}`);
    }
    console.log('🎯 [SKILLS-TEAM-FETCH] Using team_id:', actual_team_id);

    // Get teammates from the active team (now stored in teams table, not team_context)
    const team_slots_result = await db_adapter.query(
      'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
      [actual_team_id]
    );
    if (team_slots_result.rows.length > 0) {
      const teammate_ids = [
        team_slots_result.rows[0].character_slot_1,
        team_slots_result.rows[0].character_slot_2,
        team_slots_result.rows[0].character_slot_3
      ].filter(id => id && id !== userchar_id); // Exclude current character and null slots

      if (teammate_ids.length > 0) {
        const teammate_result = await db_adapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
          [teammate_ids]
        );
        teammates = teammate_result.rows.map((row: { name: string }) => row.name);
      }
    }

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['skills', 'training', 'battle'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[SKILLS][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'abilities',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API
    console.log('[SKILLS] Calling Open_ai API');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[SKILLS] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[SKILLS][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'skills',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('🎯 SKILLS: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'skills_processing_failed',
      detail: error.message
    });
  }
}

// 4. KITCHEN_TABLE DOMAIN HANDLER
async function handleKitchenTableRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('🍽️ KITCHEN_TABLE: Processing kitchen table request with Prose Builder');

    // Extract message/immediate situation from request
    const message = String(req.body?.message ?? '');
    if (!message.trim()) {
      throw new Error('STRICT MODE: message is required for kitchen table immediate situation');
    }

    // Build conversation history
    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    // Fetch memory context for social/kitchen context (no fallback - must succeed)
    const ecs = EventContextService.get_instance();
    const memoryResult = await Promise.race([
      ecs.buildMemoryContext({
        subject_character_id: userchar_id,
        partner_character_id: userchar_id,
        domains: ['kitchen', 'social', 'conflict'],
        max_items: 20,
        max_bytes: 2400,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);
    const memory_section = memoryResult.text;

    // Fetch character data (includes IDENTITY, COMBAT, PSYCHOLOGICAL packages via get_full_character_data)
    const characterData = await fetchCharacterData(userchar_id);

    // Extract data from packages for kitchen_options
    const character_name = characterData.IDENTITY.name;
    const canonical_id = characterData.IDENTITY.id;
    const roommate_names = (characterData.IDENTITY.roommates || []).map((r: any) => r.name);
    const current_mood = characterData.PSYCHOLOGICAL.current_mood;
    const energy_level = characterData.COMBAT.current_energy;

    // Build simple relationship context string (optional enrichment)
    const relationship_context = 'Relationships are handled by the Prose Builder via data packages.';

    // Assemble prompt via Prose Builder (uses character data packages automatically)
    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'kitchenTable',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      kitchen_options: {
        immediate_situation: message,
        memory: memory_section,
        relationship_context,
        mood: String(current_mood),
        energy_level,
      },
    });
    const final_prompt = prompt_result.system_prompt;

    // DEBUG: Log full prompt to diagnose contamination
    console.log('[KITCHEN_TABLE] ========== FULL PROMPT START ==========');
    console.log(final_prompt);
    console.log('[KITCHEN_TABLE] ========== FULL PROMPT END ==========');
    console.log('[KITCHEN_TABLE] Prompt length:', final_prompt.length);
    console.log('[KITCHEN_TABLE] Character:', character_name);
    console.log('[KITCHEN_TABLE] Conversation history from frontend:', conversation_history ? conversation_history.substring(0, 200) + '...' : 'EMPTY');
    console.log('[KITCHEN_TABLE] Memory section from EventContextService:', memory_section ? memory_section.substring(0, 200) + '...' : 'EMPTY');

    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('[KITCHEN_TABLE] Calling Open_ai API');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4
      // No stop tokens needed - one character speaks per turn
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[KITCHEN_TABLE] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[KITCHEN_TABLE][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'kitchen_table',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('🍽️ KITCHEN_TABLE: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'kitchen_table_processing_failed',
      detail: error.message
    });
  }
}

// 5. TRAINING DOMAIN HANDLER
async function handleTrainingRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('🏋️ TRAINING: Processing training request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    // Determine role: trainer (Athena/Popeye) vs trainee (contestant)
    const trainer_id = req.body?.trainer_id;
    if (!trainer_id) {
      throw new Error('STRICT MODE: trainer_id is required for training domain');
    }
    const role = (agent_key === trainer_id) ? 'trainer' : 'trainee';
    console.log('🏋️ [TRAINING-DEBUG] agent_key=', agent_key, ' trainer=', trainer_id, ' role=', role);

    wallet = character.wallet;
    debt = character.debt;

    const ecs = EventContextService.get_instance();
    const memory_result = await Promise.race([
      ecs.buildMemoryContext({
        subject_character_id: userchar_id,
        partner_character_id: userchar_id,
        domains: ['training', 'skills', 'battle'],
        max_items: 20,
        max_bytes: 2400,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('STRICT MODE: Memory context timed out for training domain')), 10000)),
    ]);
    const memory_section = (memory_result as any).text;

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    // STRICT MODE: Validate required training session options from request body
    const intensity_level = req.body?.intensity_level;
    if (!intensity_level) {
      throw new Error('STRICT MODE: intensity_level is required for training domain');
    }
    const training_phase = req.body?.training_phase;
    if (!training_phase) {
      throw new Error('STRICT MODE: training_phase is required for training domain');
    }
    const session_duration = req.body?.session_duration;
    if (session_duration === undefined || session_duration === null) {
      throw new Error('STRICT MODE: session_duration is required for training domain');
    }
    const time_of_day = req.body?.time_of_day;
    if (!time_of_day) {
      throw new Error('STRICT MODE: time_of_day is required for training domain');
    }
    const facility_tier = req.body?.facility_tier;
    if (!facility_tier) {
      throw new Error('STRICT MODE: facility_tier is required for training domain');
    }
    const available_equipment = req.body?.available_equipment;
    if (!available_equipment || !Array.isArray(available_equipment)) {
      throw new Error('STRICT MODE: available_equipment array is required for training domain');
    }
    const participant_ids = req.body?.participant_ids;
    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      throw new Error('STRICT MODE: participant_ids array is required for training domain');
    }

    // Get trainer name from database
    const trainer_name_result = await db_adapter.query(
      "SELECT name FROM characters WHERE id = $1",
      [trainer_id]
    );
    if (!trainer_name_result.rows[0]?.name) {
      throw new Error(`STRICT MODE: Trainer name not found for trainer_id: ${trainer_id}`);
    }
    const trainer_name = trainer_name_result.rows[0].name;

    // Get trainee info from database
    const trainee_info_result = await db_adapter.query(
      "SELECT c.name, c.species FROM characters c WHERE c.id = $1",
      [canonical_id]
    );
    if (!trainee_info_result.rows[0]) {
      throw new Error(`STRICT MODE: Trainee info not found for canonical_id: ${canonical_id}`);
    }
    if (!trainee_info_result.rows[0].name) {
      throw new Error(`STRICT MODE: Trainee name is null for canonical_id: ${canonical_id}`);
    }
    if (!trainee_info_result.rows[0].species) {
      throw new Error(`STRICT MODE: Trainee species is null for canonical_id: ${canonical_id}`);
    }
    const trainee_name = trainee_info_result.rows[0].name;
    const trainee_species = trainee_info_result.rows[0].species;

    // Get HQ tier for trainee
    const hq_result = await db_adapter.query(
      "SELECT h.tier_id FROM user_headquarters h JOIN user_characters uc ON uc.headquarters_id = h.id WHERE uc.id = $1",
      [userchar_id]
    );
    if (!hq_result.rows[0]?.tier_id) {
      throw new Error(`STRICT MODE: HQ tier not found for userchar_id: ${userchar_id}`);
    }
    const trainee_hq_tier = hq_result.rows[0].tier_id;

    // Build group participants from database
    const participants_result = await db_adapter.query(
      `SELECT uc.id, uc.character_id, uc.level, uc.current_health, uc.current_max_health, uc.total_wins, uc.total_losses, uc.win_percentage, uc.wallet, uc.debt,
              c.name, c.archetype, c.species
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = ANY($1)`,
      [participant_ids]
    );
    if (participants_result.rows.length === 0) {
      throw new Error(`STRICT MODE: No participants found for participant_ids: ${participant_ids.join(', ')}`);
    }
    if (participants_result.rows.length !== participant_ids.length) {
      throw new Error(`STRICT MODE: Expected ${participant_ids.length} participants but found ${participants_result.rows.length}`);
    }
    const group_participants = participants_result.rows.map((p: any) => {
      if (!p.name) throw new Error(`STRICT MODE: Participant ${p.id} has no name`);
      if (!p.current_max_health) throw new Error(`STRICT MODE: Participant ${p.name} has no current_max_health`);
      if (p.level === undefined || p.level === null) throw new Error(`STRICT MODE: Participant ${p.name} has no level`);
      if (!p.character_id) throw new Error(`STRICT MODE: Participant ${p.name} has no character_id`);
      return {
        userchar_id: p.id,
        character_id: p.character_id,
        name: p.name,
        archetype: p.archetype,
        species: p.species,
        level: p.level,
        current_health: p.current_health,
        max_health: p.current_max_health,
        wins: p.total_wins,
        losses: p.total_losses,
        win_percentage: p.win_percentage,
        wallet: p.wallet,
        debt: p.debt,
      };
    });

    let final_prompt: string;

    if (role === 'trainer') {
      // TRAINER FLOW: Trainer speaking - fetch system character data
      console.log('🏋️ [TRAINING] Trainer flow - fetching system character data');

      // Get trainer's userchar_id
      const trainer_userchar_result = await db_adapter.query(
        "SELECT id FROM user_characters WHERE character_id = $1 LIMIT 1",
        [trainer_id]
      );
      const trainer_userchar_id = trainer_userchar_result.rows[0]?.id;
      if (!trainer_userchar_id) {
        throw new Error(`STRICT MODE: Trainer userchar not found for trainer_id: ${trainer_id}`);
      }

      const prompt_result = await assemblePrompt({
        userchar_id: trainer_userchar_id,
        domain: 'training',
        role: 'trainer',
        role_type: 'system',
        conversation_history,
        context_userchar_id: userchar_id,
        training_options: {
          role: 'trainer',
          coach_message: message,
          memory_context: memory_section,
          trainer_name,
          trainee_name,
          trainee_species,
          trainee_userchar_id: userchar_id,
          intensity_level,
          training_phase,
          session_duration,
          time_of_day,
          trainee_hq_tier,
          group_participants,
          available_equipment,
          facility_tier,
        },
      });
      final_prompt = prompt_result.system_prompt;
    } else {
      // TRAINEE FLOW: Contestant speaking - fetch full character data
      console.log('🏋️ [TRAINING] Trainee flow - fetching contestant character data');

      const prompt_result = await assemblePrompt({
        userchar_id,
        domain: 'training',
        role: 'trainee',
        role_type: 'contestant',
        conversation_history,
        training_options: {
          role: 'trainee',
          coach_message: message,
          memory_context: memory_section,
          trainer_name,
          intensity_level,
          training_phase,
          session_duration,
          time_of_day,
          trainee_hq_tier,
          group_participants,
          available_equipment,
          facility_tier,
        },
      });
      final_prompt = prompt_result.system_prompt;
    }

    const stop_tokens = ["\n\n"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('[TRAINING] Calling Open_ai API');
    console.log('[TRAINING] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[TRAINING] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[TRAINING][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'training',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('🏋️ TRAINING: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'training_processing_failed',
      detail: error.message
    });
  }
}

// ===== POWERS DOMAIN HANDLER =====
async function handlePowersRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('⚡ POWERS: Processing powers request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    // Fetch team_id for team context
    const team_result = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );

    if (!team_result.rows[0]?.id) {
      throw new Error(`STRICT MODE: No active team set for user: ${actual_user_id}`);
    }

    const actual_team_id: string = team_result.rows[0].id;
    console.log('⚡ [POWERS-TEAM-FETCH] Resolved team_id:', actual_team_id, 'for user:', actual_user_id);

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    // Get teammates
    const teammate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    teammates = teammate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Query powers data from database
    const unlocked_powersResult = await db_adapter.query(`
      SELECT cp.id, pd.name, pd.tier, cp.current_rank, pd.max_rank, pd.category, pd.description
      FROM character_powers cp
      JOIN power_definitions pd ON cp.power_id = pd.id
      WHERE cp.character_id = $1 AND cp.unlocked = true
      ORDER BY pd.tier, pd.name
    `, [userchar_id]);

    const available_powersResult = await db_adapter.query(`
      SELECT pd.id, pd.name, pd.tier, pd.unlock_cost, pd.unlock_level, pd.archetype, pd.species, pd.description
      FROM power_definitions pd
      WHERE pd.id NOT IN (
        SELECT power_id FROM character_powers WHERE character_id = $1 AND unlocked = true
      )
      AND (pd.unlock_level IS NULL OR pd.unlock_level <= $2)
      ORDER BY pd.tier, pd.unlock_level, pd.name
      LIMIT 20
    `, [userchar_id, character.level]);

    const powers_data = {
      ability_points: character.ability_points,
      level: character.level,
      unlocked_powers: unlocked_powersResult.rows,
      available_powers: available_powersResult.rows
    };

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['powers', 'skills', 'battle'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[POWERS][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'abilities',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n", "Powers:", "Scene:"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    console.log('[POWERS] Calling Open_ai API');
    console.log('[POWERS] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[POWERS] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[POWERS][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'powers',
        prompt_length: final_prompt.length,
        response_length: response_text.length,
        ability_points: powers_data.ability_points,
        unlocked_count: powers_data.unlocked_powers.length
      }
    });

  } catch (error: any) {
    console.error('⚡ POWERS: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'powers_processing_failed',
      detail: error.message
    });
  }
}

// ===== SPELLS DOMAIN HANDLER =====
async function handleSpellsRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('🔮 SPELLS: Processing spells request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    // Fetch team_id for team context
    const team_resultSpells = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );

    if (!team_resultSpells.rows[0]?.id) {
      throw new Error(`STRICT MODE: No active team set for user: ${actual_user_id}`);
    }

    const actual_team_id: string = team_resultSpells.rows[0].id;
    console.log('🔮 [SPELLS-TEAM-FETCH] Resolved team_id:', actual_team_id, 'for user:', actual_user_id);

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    // Get teammates
    const teammate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    teammates = teammate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Query spells data from database
    // FIXED: Use character_spells table (user_spells was dropped)
    const learned_spellsResult = await db_adapter.query(`
      SELECT cs.id, sd.name, sd.tier, cs.current_rank as proficiency_level, cs.times_cast as times_used, sd.description, sd.category
      FROM character_spells cs
      JOIN spell_definitions sd ON cs.spell_id = sd.id
      WHERE cs.character_id = $1 AND cs.unlocked = true
      ORDER BY sd.tier, sd.name
    `, [userchar_id]);

    const available_spellsResult = await db_adapter.query(`
      SELECT sd.id, sd.name, sd.tier, sd.unlock_cost, sd.required_level, sd.category, sd.description
      FROM spell_definitions sd
      WHERE sd.id NOT IN (
        SELECT spell_id FROM character_spells WHERE character_id = $1 AND unlocked = true
      )
      AND (sd.required_level IS NULL OR sd.required_level <= $2)
      ORDER BY sd.tier, sd.required_level, sd.name
      LIMIT 20
    `, [userchar_id, character.level]);

    const spells_data = {
      ability_points: character.ability_points,
      level: character.level,
      learned_spells: learned_spellsResult.rows,
      available_spells: available_spellsResult.rows
    };

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['spells', 'magic', 'battle'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[SPELLS][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'abilities',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n", "Spells:", "Scene:"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    console.log('[SPELLS] Calling Open_ai API');
    console.log('[SPELLS] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[SPELLS] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[SPELLS][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'spells',
        prompt_length: final_prompt.length,
        response_length: response_text.length,
        ability_points: spells_data.ability_points,
        learned_count: spells_data.learned_spells.length
      }
    });

  } catch (error: any) {
    console.error('🔮 SPELLS: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'spells_processing_failed',
      detail: error.message
    });
  }
}

// ===== ATTRIBUTES DOMAIN HANDLER =====
async function handleAttributesRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('⚡ ATTRIBUTES: Processing attributes request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet: number;
    let debt: number;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );

    if (!user_id_result.rows[0]) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    actual_user_id = user_id_result.rows[0].user_id;

    // Fetch team_id for team context
    const team_result = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );

    if (!team_result.rows[0]) {
      throw new Error(`STRICT MODE: No active team set for user: ${actual_user_id}`);
    }

    const actual_team_id: string = team_result.rows[0].id;
    console.log('⚡ [ATTRIBUTES-TEAM-FETCH] Resolved team_id:', actual_team_id, 'for user:', actual_user_id);

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    // Get teammates
    const teammate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    teammates = teammate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Query attributes data from database
    const attributesResult = await db_adapter.query(`
      SELECT
        uc.level,
        uc.attribute_points,
        uc.attribute_allocations,
        uc.attribute_pending_survey,
        c.name,
        c.strength,
        c.dexterity,
        c.attack,
        c.defense,
        c.speed,
        c.intelligence,
        c.wisdom,
        c.charisma,
        c.spirit,
        c.energy_regen
      FROM user_characters uc
      JOIN characters c ON c.id = uc.character_id
      WHERE uc.id = $1
    `, [userchar_id]);

    if (!attributesResult.rows[0]) {
      throw new Error(`Attributes data not found for character: ${userchar_id}`);
    }

    const attr_row = attributesResult.rows[0];

    const attributes_data = {
      character_name: attr_row.name,
      level: attr_row.level,
      unspent_points: attr_row.attribute_points,
      base_stats: {
        strength: attr_row.strength,
        dexterity: attr_row.dexterity,
        attack: attr_row.attack,
        defense: attr_row.defense,
        speed: attr_row.speed,
        intelligence: attr_row.intelligence,
        wisdom: attr_row.wisdom,
        charisma: attr_row.charisma,
        spirit: attr_row.spirit,
        energy_regen: attr_row.energy_regen
      },
      allocations: attr_row.attribute_allocations,
      pending_survey: attr_row.attribute_pending_survey
    };

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['attributes', 'progression', 'battle'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[ATTRIBUTES][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'attributes',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n", "Attributes:", "Scene:"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    console.log('[ATTRIBUTES] Calling OpenAI API');
    console.log('[ATTRIBUTES] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[ATTRIBUTES] OpenAI response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[ATTRIBUTES][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );

    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }

    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'attributes',
        prompt_length: final_prompt.length,
        response_length: response_text.length,
        unspent_points: attributes_data.unspent_points,
        level: attributes_data.level
      }
    });

  } catch (error: any) {
    console.error('⚡ ATTRIBUTES: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'attributes_processing_failed',
      detail: error.message
    });
  }
}

// PROGRESSION DOMAIN HANDLER
async function handleProgressionRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('📈 PROGRESSION: Processing progression request with dedicated handler');

    // db_adapter already imported at top of file
    const { executeProgressionIntent } = require('../services/progressionIntentService');

    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    // Fetch team_id for team context
    const team_resultProgression = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );

    if (!team_resultProgression.rows[0]?.id) {
      throw new Error(`STRICT MODE: No active team set for user: ${actual_user_id}`);
    }

    const actual_team_id: string = team_resultProgression.rows[0].id;
    console.log('📈 [PROGRESSION-TEAM-FETCH] Resolved team_id:', actual_team_id, 'for user:', actual_user_id);

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const teammate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    teammates = teammate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Query progression-specific data
    const progression_data = {
      level: character.level,
      experience: character.experience,
      total_battles: character.total_battles,
      total_wins: character.total_wins,
      bond_level: character.bond_level,
      acquired_at: character.acquired_at,
      recent_decisions: character.recent_decisions
    };

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['progression', 'journey', 'goals'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[PROGRESSION][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'progression',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      progression_options: {
        coach_message: message,
        memory_context: memory_section,
        level: progression_data.level,
        experience: progression_data.experience,
        total_battles: progression_data.total_battles,
        total_wins: progression_data.total_wins,
        bond_level: progression_data.bond_level,
        acquired_at: progression_data.acquired_at,
        recent_decisions: progression_data.recent_decisions || [],
      },
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n", "Progression:", "Scene:"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    console.log('[PROGRESSION] Calling Open_ai API');
    console.log('[PROGRESSION] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      response_format: { type: "json_object" },
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[PROGRESSION] Open_ai response length:', response_text.length);

    // Parse structured response
    let parsed_response: any;
    try {
      parsed_response = JSON.parse(response_text);
    } catch (e) {
      console.warn('[PROGRESSION] JSON parse failed, treating as pure dialogue');
      parsed_response = { dialogue: response_text, intent: null };
    }

    // Execute intent if present
    if (parsed_response.intent) {
      console.log('[PROGRESSION] Intent detected:', parsed_response.intent.type);
      try {
        await executeProgressionIntent(userchar_id, parsed_response.intent, {
          user_id: actual_user_id,
          character_name: agent_key
        });
      } catch (intent_error: any) {
        console.error('[PROGRESSION] Intent execution failed:', intent_error.message);
      }
    }

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[PROGRESSION][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    return res.json({
      ok: true,
      text: parsed_response.dialogue || parsed_response.text || response_text,
      intent: parsed_response.intent || null,
      turn_number,
      metadata: {
        domain: 'progression',
        prompt_length: final_prompt.length,
        response_length: response_text.length,
        level: progression_data.level,
        experience: progression_data.experience
      }
    });

  } catch (error: any) {
    console.error('📈 PROGRESSION: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'progression_processing_failed',
      detail: error.message
    });
  }
}

// Continue with remaining 8 handlers...
// (I'll create them all in the actual implementation)

// 6. REAL_ESTATE DOMAIN HANDLER
async function handleRealEstateRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key } = params;

  try {
    const t0 = Date.now();
    console.log('🏠 REAL_ESTATE: Processing real estate request with dedicated handler');

    // Real estate agents are system characters - get their system user_character ID
    const agent_userchar_result = await db_adapter.query(
      "SELECT id FROM user_characters WHERE character_id = $1 LIMIT 1",
      [agent_key]
    );
    if (!agent_userchar_result.rows[0]) {
      throw new Error(`STRICT MODE: Real estate agent system instance not found for: ${agent_key}`);
    }
    const agent_userchar_id = agent_userchar_result.rows[0].id;

    const user_id = req.user?.id;
    if (!user_id) {
      throw new Error('STRICT MODE: User not authenticated');
    }

    // STRICT MODE: Validate required request fields
    const meta = req.body?.meta;
    if (!meta) {
      throw new Error('STRICT MODE: Real estate requires meta in request body');
    }
    if (!meta.current_hq_tier) {
      throw new Error('STRICT MODE: Real estate requires current_hq_tier in meta');
    }
    if (meta.current_balance === undefined || meta.current_balance === null) {
      throw new Error('STRICT MODE: Real estate requires current_balance in meta');
    }
    if (meta.current_gems === undefined || meta.current_gems === null) {
      throw new Error('STRICT MODE: Real estate requires current_gems in meta');
    }
    if (meta.current_room_count === undefined || meta.current_room_count === null) {
      throw new Error('STRICT MODE: Real estate requires current_room_count in meta');
    }
    if (meta.current_bed_count === undefined || meta.current_bed_count === null) {
      throw new Error('STRICT MODE: Real estate requires current_bed_count in meta');
    }
    if (meta.current_character_count === undefined || meta.current_character_count === null) {
      throw new Error('STRICT MODE: Real estate requires current_character_count in meta');
    }
    if (meta.characters_without_beds === undefined || meta.characters_without_beds === null) {
      throw new Error('STRICT MODE: Real estate requires characters_without_beds in meta');
    }
    if (!meta.available_tiers || !Array.isArray(meta.available_tiers)) {
      throw new Error('STRICT MODE: Real estate requires available_tiers array in meta');
    }
    if (!meta.coach_name) {
      throw new Error('STRICT MODE: Real estate requires coach_name in meta');
    }
    if (!meta.team_name) {
      throw new Error('STRICT MODE: Real estate requires team_name in meta');
    }
    if (meta.team_total_wins === undefined || meta.team_total_wins === null) {
      throw new Error('STRICT MODE: Real estate requires team_total_wins in meta');
    }
    if (meta.team_total_losses === undefined || meta.team_total_losses === null) {
      throw new Error('STRICT MODE: Real estate requires team_total_losses in meta');
    }
    if (meta.team_win_percentage === undefined || meta.team_win_percentage === null) {
      throw new Error('STRICT MODE: Real estate requires team_win_percentage in meta');
    }
    if (meta.team_monthly_earnings === undefined || meta.team_monthly_earnings === null) {
      throw new Error('STRICT MODE: Real estate requires team_monthly_earnings in meta');
    }
    if (meta.team_total_earnings === undefined || meta.team_total_earnings === null) {
      throw new Error('STRICT MODE: Real estate requires team_total_earnings in meta');
    }
    if (!meta.agent) {
      throw new Error('STRICT MODE: Real estate requires agent in meta');
    }
    if (!meta.competing_agents || !Array.isArray(meta.competing_agents)) {
      throw new Error('STRICT MODE: Real estate requires competing_agents array in meta');
    }

    const message = req.body?.message ?? '';
    // Empty message is allowed for initial greeting

    const chat_id = req.body?.chat_id;
    if (!chat_id) {
      throw new Error('STRICT MODE: Real estate requires chat_id in request body');
    }

    // Memory context for coach's real estate consultations
    let memory_section: string;
    const ecs = EventContextService.get_instance();
    const result = await Promise.race([
      ecs.buildMemoryContext({
        subject_character_id: user_id,
        partner_character_id: agent_key,
        domains: ['real_estate', 'financial', 'social'],
        max_items: 20,
        max_bytes: 2400,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);
    memory_section = (result as any).text;
    if (memory_section === undefined || memory_section === null) {
      throw new Error('STRICT MODE: Memory context returned undefined');
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    // Build real_estate_options from validated meta
    const real_estate_options = {
      role: 'agent' as const,
      agent: meta.agent,
      competing_agents: meta.competing_agents,
      current_hq_tier: meta.current_hq_tier,
      current_balance: meta.current_balance,
      current_gems: meta.current_gems,
      current_room_count: meta.current_room_count,
      current_bed_count: meta.current_bed_count,
      current_character_count: meta.current_character_count,
      characters_without_beds: meta.characters_without_beds,
      available_tiers: meta.available_tiers,
      coach_name: meta.coach_name,
      team_name: meta.team_name,
      team_total_wins: meta.team_total_wins,
      team_total_losses: meta.team_total_losses,
      team_win_percentage: meta.team_win_percentage,
      team_monthly_earnings: meta.team_monthly_earnings,
      team_total_earnings: meta.team_total_earnings,
      coach_message: message,
      memory_context: memory_section,
    };

    const prompt_result = await assemblePrompt({
      userchar_id: agent_userchar_id,
      domain: 'realEstate',
      role: 'agent',
      role_type: 'system',
      conversation_history,
      real_estate_options,
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n"];

    // PRODUCTION - Open_ai API
    console.log('[REAL_ESTATE] Calling Open_ai API');
    console.log('[REAL_ESTATE] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: stop_tokens
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('STRICT MODE: OpenAI returned empty response');
    }
    const response_text = response_content.trim();
    console.log('[REAL_ESTATE] Open_ai response length:', response_text.length);

    const store = new PgMemoryStore();
    await store.save_patch(sid, { userchar_id: agent_userchar_id, canonical_id: agent_key }, { character_id: agent_key });

    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'real_estate',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('🏠 REAL_ESTATE: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'real_estate_processing_failed',
      detail: error.message
    });
  }
}

// 7. SOCIAL_LOUNGE DOMAIN HANDLER
async function handleSocialLoungeRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('🎭 SOCIAL_LOUNGE: Processing social lounge request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['social', 'conflict'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      throw new Error(`STRICT MODE: Memory context fetch failed for social lounge: ${e?.message}`);
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    // STRICT MODE: Extract and validate social lounge context from request
    const meta = req.body?.meta;
    if (!meta) {
      throw new Error('STRICT MODE: Social lounge requires meta in request body');
    }

    const trigger_type = meta.trigger_type;
    if (!trigger_type) {
      throw new Error('STRICT MODE: Social lounge requires trigger_type in meta');
    }
    const valid_triggers = ['battle_victory', 'battle_defeat', 'rivalry_escalation', 'random_drama', 'user_message', 'character_interaction', 'idle_chat'];
    if (!valid_triggers.includes(trigger_type)) {
      throw new Error(`STRICT MODE: Invalid trigger_type "${trigger_type}". Must be one of: ${valid_triggers.join(', ')}`);
    }

    // STRICT MODE: Validate message for user_message trigger
    if (trigger_type === 'user_message' && !message) {
      throw new Error('STRICT MODE: user_message trigger requires message in request body');
    }

    // Get present participants - query other characters in the lounge
    const participants_result = await db_adapter.query(
      `SELECT uc.id as userchar_id, c.id as character_id, c.name,
              COALESCE(t.name, 'Unknown Team') as team_name
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       LEFT JOIN teams t ON uc.team_id = t.id
       WHERE uc.user_id = $1`,
      [actual_user_id]
    );

    if (participants_result.rows.length === 0) {
      throw new Error('STRICT MODE: No participants found for social lounge');
    }

    const present_participants = participants_result.rows.map((p: any) => ({
      userchar_id: p.userchar_id,
      character_id: p.character_id,
      name: p.name,
      team_name: p.team_name,
      is_own_team: p.userchar_id === userchar_id || roommates.includes(p.name),
    }));

    // STRICT MODE: Validate recent_messages from request
    const recent_messages = meta.recent_messages;
    if (!recent_messages || !Array.isArray(recent_messages)) {
      throw new Error('STRICT MODE: Social lounge requires recent_messages array in meta');
    }
    for (let i = 0; i < recent_messages.length; i++) {
      const msg = recent_messages[i];
      if (!msg.author_name) {
        throw new Error(`STRICT MODE: recent_messages[${i}] requires author_name`);
      }
      if (!msg.author_type || !['coach', 'contestant'].includes(msg.author_type)) {
        throw new Error(`STRICT MODE: recent_messages[${i}] requires author_type ('coach' or 'contestant')`);
      }
      if (!msg.content) {
        throw new Error(`STRICT MODE: recent_messages[${i}] requires content`);
      }
      if (!msg.timestamp) {
        throw new Error(`STRICT MODE: recent_messages[${i}] requires timestamp`);
      }
      if (msg.is_own_message === undefined) {
        throw new Error(`STRICT MODE: recent_messages[${i}] requires is_own_message`);
      }
    }

    // STRICT MODE: Validate recent_events from request
    const recent_events = meta.recent_events;
    if (!recent_events || !Array.isArray(recent_events)) {
      throw new Error('STRICT MODE: Social lounge requires recent_events array in meta');
    }
    for (let i = 0; i < recent_events.length; i++) {
      const evt = recent_events[i];
      if (!evt.type) {
        throw new Error(`STRICT MODE: recent_events[${i}] requires type`);
      }
      if (!evt.description) {
        throw new Error(`STRICT MODE: recent_events[${i}] requires description`);
      }
      if (!evt.category) {
        throw new Error(`STRICT MODE: recent_events[${i}] requires category`);
      }
      if (!evt.timestamp) {
        throw new Error(`STRICT MODE: recent_events[${i}] requires timestamp`);
      }
    }

    // STRICT MODE: Validate battle_context if trigger is battle-related
    let battle_context: { opponent_name: string; was_victory: boolean; was_close_match: boolean } | undefined;
    if (trigger_type === 'battle_victory' || trigger_type === 'battle_defeat') {
      if (!meta.battle_context) {
        throw new Error(`STRICT MODE: ${trigger_type} requires battle_context in meta`);
      }
      if (!meta.battle_context.opponent_name) {
        throw new Error('STRICT MODE: battle_context requires opponent_name');
      }
      if (meta.battle_context.was_victory === undefined) {
        throw new Error('STRICT MODE: battle_context requires was_victory');
      }
      if (meta.battle_context.was_close_match === undefined) {
        throw new Error('STRICT MODE: battle_context requires was_close_match');
      }
      battle_context = {
        opponent_name: meta.battle_context.opponent_name,
        was_victory: meta.battle_context.was_victory,
        was_close_match: meta.battle_context.was_close_match,
      };
    }

    // STRICT MODE: Validate rivalry_context if trigger is rivalry-related
    let rivalry_context: { rival_name: string; rivalry_level: number; recent_incident: string } | undefined;
    if (trigger_type === 'rivalry_escalation') {
      if (!meta.rivalry_context) {
        throw new Error('STRICT MODE: rivalry_escalation requires rivalry_context in meta');
      }
      if (!meta.rivalry_context.rival_name) {
        throw new Error('STRICT MODE: rivalry_context requires rival_name');
      }
      if (meta.rivalry_context.rivalry_level === undefined) {
        throw new Error('STRICT MODE: rivalry_context requires rivalry_level');
      }
      if (!meta.rivalry_context.recent_incident) {
        throw new Error('STRICT MODE: rivalry_context requires recent_incident');
      }
      rivalry_context = {
        rival_name: meta.rivalry_context.rival_name,
        rivalry_level: meta.rivalry_context.rivalry_level,
        recent_incident: meta.rivalry_context.recent_incident,
      };
    }

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'socialLounge',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      social_lounge_options: {
        trigger_type,
        user_message: message,
        present_participants,
        recent_messages,
        recent_events,
        memory_context: memory_section,
        battle_context,
        rivalry_context,
      },
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('[SOCIAL_LOUNGE] Calling Open_ai API');
    console.log('[SOCIAL_LOUNGE] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[SOCIAL_LOUNGE] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[SOCIAL_LOUNGE][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'social_lounge',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('🎭 SOCIAL_LOUNGE: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'social_lounge_processing_failed',
      detail: error.message
    });
  }
}

// 7b. EMPLOYEE_LOUNGE DOMAIN HANDLER
async function handleEmployeeLoungeRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('👔 EMPLOYEE_LOUNGE: Processing employee lounge request');

    const user_id = req.user?.id;
    if (!user_id) {
      throw new Error('STRICT MODE: User not authenticated');
    }

    // STRICT MODE: Validate required request fields
    const meta = req.body?.meta;
    if (!meta) {
      throw new Error('STRICT MODE: Employee lounge requires meta in request body');
    }
    if (!meta.coach_name) {
      throw new Error('STRICT MODE: Employee lounge requires coach_name in meta');
    }
    if (!meta.speaking_character_role) {
      throw new Error('STRICT MODE: Employee lounge requires speaking_character_role in meta');
    }
    const valid_roles = ['mascot', 'judge', 'therapist', 'trainer', 'host', 'real_estate_agent'];
    if (!valid_roles.includes(meta.speaking_character_role)) {
      throw new Error(`STRICT MODE: Invalid speaking_character_role. Must be one of: ${valid_roles.join(', ')}`);
    }
    if (!meta.all_staff || !Array.isArray(meta.all_staff)) {
      throw new Error('STRICT MODE: Employee lounge requires all_staff array in meta');
    }
    if (!meta.team_context) {
      throw new Error('STRICT MODE: Employee lounge requires team_context in meta');
    }
    if (!meta.team_context.team_name) {
      throw new Error('STRICT MODE: Employee lounge requires team_context.team_name in meta');
    }
    if (meta.team_context.total_wins === undefined) {
      throw new Error('STRICT MODE: Employee lounge requires team_context.total_wins in meta');
    }
    if (meta.team_context.total_losses === undefined) {
      throw new Error('STRICT MODE: Employee lounge requires team_context.total_losses in meta');
    }
    if (meta.team_context.monthly_earnings === undefined) {
      throw new Error('STRICT MODE: Employee lounge requires team_context.monthly_earnings in meta');
    }
    if (!meta.team_context.hq_tier) {
      throw new Error('STRICT MODE: Employee lounge requires team_context.hq_tier in meta');
    }
    if (!meta.recent_messages || !Array.isArray(meta.recent_messages)) {
      throw new Error('STRICT MODE: Employee lounge requires recent_messages array in meta');
    }
    if (!meta.contestants || !Array.isArray(meta.contestants)) {
      throw new Error('STRICT MODE: Employee lounge requires contestants array in meta');
    }
    if (meta.contestants.length === 0) {
      throw new Error('STRICT MODE: Employee lounge requires at least one contestant');
    }

    // Group mode fields (optional)
    const group_mode = meta.group_mode === true;
    const message_type = meta.message_type || 'coach_message';
    const active_participants = meta.active_participants || null;
    const responding_to = meta.responding_to || null;

    // Validate message_type if provided
    const valid_message_types = ['opening', 'continuing', 'coach_message'];
    if (!valid_message_types.includes(message_type)) {
      throw new Error(`STRICT MODE: Invalid message_type. Must be one of: ${valid_message_types.join(', ')}`);
    }

    // Message is required for coach_message type, optional for opening/continuing
    const message = req.body?.message || '';
    if (message_type === 'coach_message' && !message) {
      throw new Error('STRICT MODE: Employee lounge requires message for coach_message type');
    }

    const chat_id = req.body?.chat_id;
    if (!chat_id) {
      throw new Error('STRICT MODE: Employee lounge requires chat_id in request body');
    }

    // Validate active_participants if in group mode
    if (group_mode && active_participants) {
      if (!Array.isArray(active_participants) || active_participants.length < 2) {
        throw new Error('STRICT MODE: Group mode requires at least 2 active_participants');
      }
    }

    // Find the speaking character from all_staff
    const speaking_staff = meta.all_staff.find((s: any) => s.role === meta.speaking_character_role);
    if (!speaking_staff) {
      throw new Error(`STRICT MODE: No staff member found with role: ${meta.speaking_character_role}`);
    }

    // Memory context
    let memory_section: string;
    const ecs = EventContextService.get_instance();
    const memoryResult = await Promise.race([
      ecs.buildMemoryContext({
        subject_character_id: speaking_staff.userchar_id,
        partner_character_id: user_id,
        domains: ['social', 'financial'],
        max_items: 15,
        max_bytes: 1800,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);
    memory_section = (memoryResult as any).text;
    if (memory_section === undefined || memory_section === null) {
      throw new Error('STRICT MODE: Memory context returned undefined');
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    // Build employee_lounge_options
    const employee_lounge_options: any = {
      coach_name: meta.coach_name,
      coach_message: message,
      memory_context: memory_section,
      speaking_character_role: meta.speaking_character_role,
      all_staff: meta.all_staff,
      contestants: meta.contestants,
      recent_messages: meta.recent_messages,
      team_context: {
        team_name: meta.team_context.team_name,
        total_wins: meta.team_context.total_wins,
        total_losses: meta.team_context.total_losses,
        monthly_earnings: meta.team_context.monthly_earnings,
        hq_tier: meta.team_context.hq_tier,
      },
      // Group mode fields
      group_mode,
      message_type,
    };

    // Add optional group mode fields if present
    if (active_participants) {
      employee_lounge_options.active_participants = active_participants;
    }
    if (responding_to) {
      employee_lounge_options.responding_to = responding_to;
    }

    // Assemble prompt via centralized assembler
    const { assemblePrompt } = require('../services/prompts/assembler');
    const assembled = await assemblePrompt({
      userchar_id: speaking_staff.userchar_id,
      domain: 'employeeLounge',
      role: 'staff',
      role_type: 'system',
      conversation_history,
      employee_lounge_options,
    });

    // Standard pattern: everything in a single user message (matching all other handlers)
    const final_prompt = assembled.system_prompt;

    console.log(`[EMPLOYEE_LOUNGE] Calling OpenAI API (${message_type} mode)`);
    console.log(`[EMPLOYEE_LOUNGE] Prompt length: ${final_prompt.length}`);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.85,
      max_tokens: 200,
    });

    const ai_response = completion.choices[0]?.message?.content;
    if (!ai_response) {
      throw new Error('STRICT MODE: OpenAI returned empty response');
    }
    const elapsed = Date.now() - t0;
    console.log(`👔 EMPLOYEE_LOUNGE: Response generated in ${elapsed}ms`);

    return res.json({
      ok: true,
      text: ai_response,
      speaker_name: speaking_staff.name,
      speaker_role: meta.speaking_character_role,
      elapsed_ms: elapsed,
    });

  } catch (error: any) {
    console.error('👔 EMPLOYEE_LOUNGE: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'employee_lounge_processing_failed',
      detail: error.message
    });
  }
}

// 8. MESSAGE_BOARD DOMAIN HANDLER
async function handleMessageBoardRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('📋 MESSAGE_BOARD: Processing message board request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['message_board', 'social', 'battle'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[MESSAGE_BOARD][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'messageBoard',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('[MESSAGE_BOARD] Calling Open_ai API');
    console.log('[MESSAGE_BOARD] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[MESSAGE_BOARD] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[MESSAGE_BOARD][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'message_board',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('📋 MESSAGE_BOARD: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'message_board_processing_failed',
      detail: error.message
    });
  }
}

// 9. GROUP_ACTIVITIES DOMAIN HANDLER
async function handleGroupActivitiesRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('👥 GROUP_ACTIVITIES: Processing group activities request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['group_activities', 'social'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      throw new Error(`STRICT MODE: Memory context fetch failed for group activities: ${e?.message}`);
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    // STRICT MODE: Extract and validate group activity context from request
    const meta = req.body?.meta;
    if (!meta) {
      throw new Error('STRICT MODE: Group activities requires meta in request body');
    }

    const activity_type = meta.event_type || meta.activity_type;
    if (!activity_type) {
      throw new Error('STRICT MODE: Group activities requires event_type or activity_type in meta');
    }

    const session_participants = meta.session_participants;
    if (!session_participants || !Array.isArray(session_participants) || session_participants.length === 0) {
      throw new Error('STRICT MODE: Group activities requires non-empty session_participants array in meta');
    }

    // Get character's current mood and energy
    const char_stats = await db_adapter.query(
      `SELECT uc.current_energy, uc.current_max_energy, uc.current_mood
       FROM user_characters uc
       WHERE uc.id = $1`,
      [userchar_id]
    );
    if (!char_stats.rows[0]) {
      throw new Error(`STRICT MODE: Character stats not found for userchar_id ${userchar_id}`);
    }
    if (char_stats.rows[0].current_mood === null || char_stats.rows[0].current_mood === undefined) {
      throw new Error(`STRICT MODE: current_mood missing for userchar_id ${userchar_id}`);
    }
    if (char_stats.rows[0].current_energy === null || char_stats.rows[0].current_energy === undefined) {
      throw new Error(`STRICT MODE: current_energy missing for userchar_id ${userchar_id}`);
    }
    if (char_stats.rows[0].current_max_energy === null || char_stats.rows[0].current_max_energy === undefined) {
      throw new Error(`STRICT MODE: current_max_energy missing for userchar_id ${userchar_id}`);
    }
    const mood = char_stats.rows[0].current_mood;
    const energy_level = Math.round((char_stats.rows[0].current_energy / char_stats.rows[0].current_max_energy) * 100);

    // Build participants array from session_participants names
    const participants: Array<{ character_id: string; name: string }> = [];
    for (const name of session_participants) {
      if (typeof name === 'string' && name.trim()) {
        const participant_result = await db_adapter.query(
          `SELECT c.id, c.name FROM characters c WHERE LOWER(c.name) = LOWER($1) LIMIT 1`,
          [name.trim()]
        );
        if (participant_result.rows[0]) {
          participants.push({
            character_id: participant_result.rows[0].id,
            name: participant_result.rows[0].name,
          });
        }
      }
    }

    // If no participants found, add the current character
    if (participants.length === 0) {
      const self_result = await db_adapter.query(
        `SELECT c.id, c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = $1`,
        [userchar_id]
      );
      if (self_result.rows[0]) {
        participants.push({
          character_id: self_result.rows[0].id,
          name: self_result.rows[0].name,
        });
      }
    }

    if (participants.length === 0) {
      throw new Error('STRICT MODE: No participants found for group activity');
    }

    // STRICT MODE: Roommates are required for contestants
    if (roommates.length === 0) {
      throw new Error('STRICT MODE: Contestants must have roommates for group activities');
    }

    // Build relationship context from roommates
    const relationship_context = `Lives with: ${roommates.join(', ')}`;

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'groupActivities',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      group_activities_options: {
        activity_type,
        immediate_situation: (() => {
          // Use provided immediate_situation, or construct from context
          const situation = meta.group_activities_context?.immediate_situation;
          if (situation) {
            return situation;
          }
          // Construct from session_stage, event_type, and objectives
          const stage = meta.group_activities_context?.session_stage || meta.session_stage || 'conversation';
          const event_type = meta.group_activities_context?.event_type || meta.event_type || 'group activity';
          const objectives = meta.group_activities_context?.activity_objectives;
          const objectives_str = objectives && objectives.length > 0
            ? ` Focus: ${objectives.join(', ')}.`
            : '';
          return `${event_type} - ${stage} phase.${objectives_str} Coach says: "${message}"`;
        })(),
        memory_context: memory_section,
        relationship_context,
        mood,
        energy_level,
        participants,
        coach_message: message,
      },
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('[GROUP_ACTIVITIES] Calling Open_ai API');
    console.log('[GROUP_ACTIVITIES] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[GROUP_ACTIVITIES] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[GROUP_ACTIVITIES][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'group_activities',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('👥 GROUP_ACTIVITIES: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'group_activities_processing_failed',
      detail: error.message
    });
  }
}

// 10. PERFORMANCE DOMAIN HANDLER
async function handlePerformanceRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  const t0 = Date.now();
  console.log('⭐ PERFORMANCE: Processing performance request with dedicated handler');

  const { dbAdapter } = require('../services/databaseAdapter');
  let roommates: string[] = [];
  let wallet = 0;
  let debt = 0;
  let actual_user_id: string;

  const user_id_result = await db_adapter.query(
    'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
    [userchar_id]
  );
  actual_user_id = user_id_result.rows[0]?.user_id;

  if (!actual_user_id) {
    throw new Error(`No user found for userchar_id: ${userchar_id}`);
  }

  const roommate_result = await db_adapter.query(
    'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
    [actual_user_id, userchar_id]
  );
  roommates = roommate_result.rows.map((row: { name: string }) => row.name);

  const character = await db_adapter.user_characters.find_by_id(userchar_id);
  const canonical_id = character.character_id;

  wallet = character.wallet;
  debt = character.debt;

  let memory_section = '';
  try {
    const ecs = EventContextService.get_instance();
    const result = await Promise.race([
      ecs.buildMemoryContext({
        subject_character_id: userchar_id,
        partner_character_id: userchar_id,
        domains: ['performance', 'battle', 'training'],
        max_items: 20,
        max_bytes: 2400,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
    ]);
    memory_section = (result as any)?.text || '';
  } catch (e: any) {
    console.warn('[PERFORMANCE][MEMORY] timeout', e?.message);
  }

  let conversation_history = '';
  if (Array.isArray(req.body?.messages)) {
    conversation_history = buildConversationHistory(req.body.messages);
  }

  const message = String(req.body?.message ?? '');

  const prompt_result = await assemblePrompt({
    userchar_id,
    domain: 'performance',
    role: 'contestant',
    role_type: 'contestant',
    conversation_history,
    performance_options: {
      immediate_situation: message,
      memory_context: memory_section,
      coach_message: message,
    },
  });
  const final_prompt = prompt_result.system_prompt;

  const stop_tokens = [
    "\n\n",
    "Performance:",
    "Scene:"
  ];
  const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

  // PRODUCTION - Open_ai API (matching therapy pattern)
  console.log('[PERFORMANCE] Calling Open_ai API');
  console.log('[PERFORMANCE] Prompt length:', final_prompt.length);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: final_prompt }],
    temperature: 0.7,
    frequency_penalty: 0.4,
    stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
  });

  let response_text = completion.choices[0]?.message?.content?.trim() || '';
  console.log('[PERFORMANCE] Open_ai response length:', response_text.length);

  try {
    const store = new PgMemoryStore();
    await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
  } catch (e) {
    console.warn('[PERFORMANCE][memory] patch failed (non-fatal):', e);
  }

  const chat_id = req.body?.chat_id || 'default_chat';
  const user_id = req.user?.id || 'system';
  const today = new Date().toISOString().split('T')[0];
  const { query } = require('../database/postgres');

  await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

  const chat_turn_result = await query(
    'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
    [chat_id]
  );

  if (!chat_turn_result.rows[0]) {
    throw new Error(`Chat session not found after insert: ${chat_id}`);
  }

  const turn_number = chat_turn_result.rows[0].current_turn_count;

  await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

  await query(
    'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
    [user_id]
  );

  log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

  return res.json({
    ok: true,
    text: response_text,
    turn_number,
    metadata: {
      domain: 'performance',
      prompt_length: final_prompt.length,
      response_length: response_text.length
    }
  });
}

// 11. PERSONAL_PROBLEMS DOMAIN HANDLER
async function handlePersonalProblemsRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('💭 PERSONAL_PROBLEMS: Processing personal problems request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['personal_problems', 'social', 'therapy'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[PERSONAL_PROBLEMS][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    // Fetch full character data for problem generation
    const characterData = await fetchCharacterData(userchar_id);

    // Generate problem context from real character data (backend service)
    const problemContext = generatePersonalProblem(characterData);
    console.log('[PERSONAL_PROBLEMS] Generated problem:', problemContext.category, problemContext.severity, problemContext.source);

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'personalProblems',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      personal_problems_options: {
        problem_context: problemContext,
        coach_message: message,
        memory_context: memory_section,
      },
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = [
      "\n\n",
      "Personal Problems:",
      "Scene:"
    ];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('[PERSONAL_PROBLEMS] Calling Open_ai API');
    console.log('[PERSONAL_PROBLEMS] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[PERSONAL_PROBLEMS] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[PERSONAL_PROBLEMS][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'personal_problems',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('💭 PERSONAL_PROBLEMS: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'personal_problems_processing_failed',
      detail: error.message
    });
  }
}

// 12. BATTLE DOMAIN HANDLER
async function handleBattleRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('⚔️ BATTLE: Processing battle request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Get user's active team from teams table
    const team_result = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );
    const actual_team_id = team_result.rows[0]?.id;
    if (!actual_team_id) {
      throw new Error(`No active team set for user: ${actual_user_id}`);
    }
    console.log('⚔️ [BATTLE-TEAM-FETCH] Using team_id:', actual_team_id);

    // Get teammates from the active team (now stored in teams table, not team_context)
    const team_slots_result = await db_adapter.query(
      'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
      [actual_team_id]
    );
    if (team_slots_result.rows.length > 0) {
      const teammate_ids = [
        team_slots_result.rows[0].character_slot_1,
        team_slots_result.rows[0].character_slot_2,
        team_slots_result.rows[0].character_slot_3
      ].filter(id => id && id !== userchar_id); // Exclude current character and null slots

      if (teammate_ids.length > 0) {
        const teammate_result = await db_adapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
          [teammate_ids]
        );
        teammates = teammate_result.rows.map((row: { name: string }) => row.name);
      }
    }

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['battle', 'training', 'equipment'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[BATTLE][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'battle',
      role: 'combatant',
      role_type: 'contestant',
      conversation_history,
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = [
      "\n\n",
      "Battle:",
      "Scene:"
    ];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('[BATTLE] Calling Open_ai API');
    console.log('[BATTLE] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[BATTLE] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[BATTLE][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'battle',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('⚔️ BATTLE: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'battle_processing_failed',
      detail: error.message
    });
  }
}

// 13. DRAMA_BOARD DOMAIN HANDLER
async function handleDramaBoardRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('🎬 DRAMA_BOARD: Processing drama board request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // Get user's active team from teams table
    const team_result = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );
    const actual_team_id = team_result.rows[0]?.id;
    if (!actual_team_id) {
      throw new Error(`No active team set for user: ${actual_user_id}`);
    }
    console.log('🎬 [DRAMA_BOARD-TEAM-FETCH] Using team_id:', actual_team_id);

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['drama_board', 'social', 'conflict'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[DRAMA_BOARD][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'messageBoard',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = [
      "\n\n",
      "Drama Board:",
      "Scene:"
    ];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('[DRAMA_BOARD] Calling Open_ai API');
    console.log('[DRAMA_BOARD] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[DRAMA_BOARD] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[DRAMA_BOARD][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'drama_board',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('🎬 DRAMA_BOARD: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'drama_board_processing_failed',
      detail: error.message
    });
  }
}

async function handleGroupTherapyRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  console.log('🟢 HANDLEGROUPTHERAPYREQUEST ENTRY');
  const { sid, agent_key, userchar_id } = params;
  const speaker_id = agent_key;

  try {
    const t0 = Date.now();
    console.log('🎭 GROUP_THERAPY: Processing group therapy request with dedicated handler');

    // Get character for canonical_id
    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    const therapist_id = req.body?.therapist_id;
    const role = (speaker_id === therapist_id) ? 'therapist' : 'patient';

    console.log('🔥 [GROUP-THERAPY-DEBUG] speaker=', speaker_id, ' canonical=', canonical_id, ' therapist=', therapist_id, ' role=', role);

    const session_id = req.body?.session_id || sid;
    if (session_id && sessions.has(session_id)) {
      console.log('🧹 [SESSION-CLEANUP] Clearing stale session state for:', session_id);
      sessions.delete(session_id);
    }

    const { dbAdapter } = require('../services/databaseAdapter');
    const participant_ids = req.body?.participant_ids;

    if (!Array.isArray(participant_ids) || participant_ids.length < 2) {
      throw new Error('Group therapy requires at least 2 participant_ids');
    }

    console.log('🎭 GROUP_THERAPY: Querying data for', participant_ids.length, 'participants');

    // Get user_id from first participant
    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [participant_ids[0]]
    );
    const actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for participant: ${participant_ids[0]}`);
    }

    // Get roommates
    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1',
      [actual_user_id]
    );
    const roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    // Get team data
    const team_result = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );
    const actual_team_id = team_result.rows[0]?.id;
    if (!actual_team_id) {
      throw new Error(`No active team set for user: ${actual_user_id}`);
    }

    // Get teammates
    let teammates: string[] = [];
    const team_slots_result = await db_adapter.query(
      'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
      [actual_team_id]
    );
    if (team_slots_result.rows.length > 0) {
      const teammate_ids = [
        team_slots_result.rows[0].character_slot_1,
        team_slots_result.rows[0].character_slot_2,
        team_slots_result.rows[0].character_slot_3
      ].filter((id: string) => id);

      if (teammate_ids.length > 0) {
        const teammate_result = await db_adapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
          [teammate_ids]
        );
        teammates = teammate_result.rows.map((row: { name: string }) => row.name);
      }
    }

    // Query ALL participants' data
    const participants_data = await Promise.all(
      participant_ids.map(async (pid: string) => {
        const char = await db_adapter.user_characters.find_by_id(pid);
        if (!char) throw new Error(`Character not found: ${pid}`);

        // Get character template data
        const char_template_result = await db_adapter.query(
          'SELECT name, archetype, species FROM characters WHERE id = $1',
          [char.character_id]
        );
        const char_template = char_template_result.rows[0];

        // Get battle record for this specific character (not coach's overall record)
        // Use the character's stored stats instead of querying battles table
        const wins = char.total_wins;
        const losses = char.total_losses;

        // Get conflicts
        let conflicts: string[] = [];
        try {
          const ConflictDatabaseService = require('../services/ConflictDatabaseService').default;
          const conflict_service = ConflictDatabaseService.get_instance();
          const conflict_data = conflict_service.getConflictsByCharacter(pid);
          conflicts = conflict_data.map((c: any) => c.target_name);
        } catch (e) {
          console.warn('Could not load conflicts for', pid);
        }

        if (!char_template) {
          throw new Error(`Character template not found for character_id: ${char.character_id}`);
        }

        return {
          id: pid,                                    // user_character ID
          character_id: char.character_id,            // canonical character ID (needed for CharacterData)
          name: char_template.name,
          archetype: char_template.archetype,
          species: char_template.species,
          level: char.level,
          wallet: char.wallet,
          debt: char.debt,
          monthly_earnings: char.monthly_earnings,
          financial_stress: char.financial_stress,
          current_stress: char.current_stress,
          wins: wins,
          losses: losses,
          conflicts: conflicts
        };
      })
    );

    // Separate patients from therapist for evaluation logic
    // patients_data excludes the therapist - these are the ones who get evaluated
    const patients_data = participants_data.filter(p => p.character_id !== therapist_id);
    const patient_count = patients_data.length;

    if (patient_count < 2) {
      throw new Error(`STRICT MODE: Group therapy requires at least 2 patients, found ${patient_count}`);
    }

    console.log(`🎭 GROUP_THERAPY: ${patient_count} patients in group: ${patients_data.map(p => p.name).join(', ')}`);

    console.log('🎭 GROUP_THERAPY DATA LOADED:', participants_data.map(p => `${p.name}: $${p.wallet}, ${p.wins}W-${p.losses}L`).join(' | '));

    // Get memory context
    let therapy_memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: therapist_id || userchar_id,
          domains: ['therapy', 'group_therapy'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      therapy_memory_section = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[GROUP_THERAPY][MEMORY] timeout', e?.message);
    }

    // Build conversation history
    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    // Get patient name for prompt
    let patient_name = '';
    let patient_character_id = '';
    if (role === 'patient') {
      patient_name = agent_key;
      const patient_char = await db_adapter.user_characters.find_by_id(userchar_id);
      patient_character_id = patient_char?.character_id;
    } else {
      const character = await db_adapter.user_characters.find_by_id(userchar_id);
      if (character) {
        patient_name = character.name;
        patient_character_id = character.character_id;
      }
    }

    // Get patient species for therapist role
    let patient_species: string | undefined;
    if (role === 'therapist' && patient_character_id) {
      const species_result = await query(
        'SELECT species FROM characters WHERE id = $1',
        [patient_character_id]
      );
      patient_species = species_result.rows?.[0]?.species;
    }

    // STRICT MODE: Validate required fields
    const intensity_strategy = req.body?.intensity_strategy as 'soft' | 'medium' | 'hard' | undefined;
    if (!intensity_strategy) {
      throw new Error('STRICT MODE: intensity_strategy is required for group therapy (selected by coach in UI)');
    }

    const therapist_userchar_id = req.body?.therapist_userchar_id as string | undefined;
    if (!therapist_userchar_id) {
      throw new Error('STRICT MODE: therapist_userchar_id is required for group therapy (frontend knows this)');
    }

    // Convert participants_data to group_participants format for prompt system
    const group_participants = participants_data.map(p => ({
      userchar_id: p.id,
      name: p.name,
      financial_stress: p.financial_stress,
      current_stress: p.current_stress,
    }));

    // Determine context character based on role
    const context_char_id = role === 'therapist' ? patient_character_id : therapist_id;
    const context_uc_id = role === 'therapist' ? userchar_id : therapist_userchar_id;

    // Assemble group therapy prompt WITHOUT conversation history
    // History will be sent as separate assistant messages with speaker names
    const prompt_result = await assemblePrompt({
      userchar_id: role === 'therapist' ? therapist_userchar_id : userchar_id,
      domain: 'therapy',
      role: role as 'patient' | 'therapist',
      role_type: role === 'therapist' ? 'system' : 'contestant',
      conversation_history: '',  // Empty - history goes in assistant messages
      context_userchar_id: context_uc_id,
      therapy_options: {
        session_type: 'group',
        intensity_strategy,
        group_participants,
      },
    });
    const system_instructions = prompt_result.system_prompt;

    console.log('🎭 GROUP_THERAPY: Assembled system instructions length:', system_instructions.length);

    // Build OpenAI messages array with proper role structure
    // - system: character persona + instructions
    // - assistant with name: each prior conversation turn (NO 'user' role - there's no human)
    const openai_messages: Array<{ role: 'system' | 'assistant'; content: string; name?: string }> = [
      { role: 'system', content: system_instructions }
    ];

    // Add conversation history as assistant messages with speaker names
    const raw_messages = req.body?.messages || [];
    for (const msg of raw_messages) {
      // Get speaker name from speaker_id (user_character ID)
      const speaker_id = msg.speaker_id;
      if (!speaker_id) {
        throw new Error(`STRICT MODE: Message missing speaker_id: ${JSON.stringify(msg)}`);
      }

      // Check if speaker is the therapist first
      let speaker_name: string;
      if (speaker_id === therapist_userchar_id) {
        // Therapist message - get name from therapist_id (canonical ID)
        const therapist_result = await query(
          'SELECT name FROM characters WHERE id = $1',
          [therapist_id]
        );
        speaker_name = therapist_result.rows[0]?.name || therapist_id;
      } else {
        // Look up speaker name from participants_data (which has id = user_character ID)
        const speaker = participants_data.find(p => p.id === speaker_id);
        if (!speaker) {
          throw new Error(`STRICT MODE: Speaker "${speaker_id}" not found in participants_data`);
        }
        speaker_name = speaker.name;
      }

      // Sanitize name for OpenAI (alphanumeric and underscores only, max 64 chars)
      const safe_name = speaker_name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 64);

      openai_messages.push({
        role: 'assistant',
        name: safe_name,
        content: msg.message  // Frontend sends 'message', not 'content'
      });
    }

    console.log(`🎭 GROUP_THERAPY: Built ${openai_messages.length} messages (1 system + ${raw_messages.length} history)`);

    // Call OpenAI
    const stop_tokens = ["\n\n", "Group Session:"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    console.log('[GROUP_THERAPY] Calling OpenAI API');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openai_messages,
      temperature: 0.7,
      max_tokens: 150,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    let response_text = response.choices[0].message.content?.trim() || '';

    // Sanitize response
    response_text = sanitize_therapy_reply(response_text);

    console.log('🎭 GROUP_THERAPY: Response generated, length:', response_text.length);
    console.log('🎭 GROUP_THERAPY: Total time:', Date.now() - t0, 'ms');

    // ====================================================================
    // TURN COUNTING (same as individual therapy)
    // ====================================================================
    const chat_id = req.body?.chat_id;
    if (!chat_id) {
      throw new Error('STRICT MODE: chat_id is required for group therapy');
    }
    const user_id = req.user?.id;
    if (!user_id) {
      throw new Error('STRICT MODE: user_id is required (must be authenticated)');
    }
    const today = new Date().toISOString().split('T')[0];

    // Increment chat session turn count
    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    // Get the new turn number
    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    // Update daily stats
    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    // Update lifetime turn count
    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    console.log(`🔄 [GROUP_THERAPY-TURN] Turn ${turn_number} complete`);

    // ====================================================================
    // GROUP THERAPY BATCH EVALUATION
    // Triggers after the LAST patient responds in each round
    // Evaluates ALL patients at once with one API call
    // ====================================================================
    let round_evaluation = null;

    // Calculate turn structure based on patient count
    // For N patients: each round = 1 therapist turn + N patient turns = N+1 turns
    const turns_per_round = patient_count + 1;
    const position_in_round = ((turn_number - 1) % turns_per_round) + 1;
    const round_number = Math.ceil(turn_number / turns_per_round);
    const is_last_patient_in_round = position_in_round === turns_per_round;
    const is_pre_judge_round = round_number <= 3;
    const total_turns_before_judge = 3 * turns_per_round;
    const judge_turn = total_turns_before_judge + 1;

    console.log(`🔢 [GROUP-TURN-CALC] turn=${turn_number}, patients=${patient_count}, turns_per_round=${turns_per_round}, position=${position_in_round}, round=${round_number}, is_last_patient=${is_last_patient_in_round}`);

    if (is_last_patient_in_round && is_pre_judge_round) {
      console.log(`🎯 [GROUP-BATCH-EVAL] Starting batch evaluation for round ${round_number} after turn ${turn_number}`);

      try {
        const intensity = intensity_strategy;

        // Fetch therapist character data (system character - uses SystemCharacterData)
        const therapistData = await fetchSystemCharacterData(therapist_userchar_id);

        // Fetch therapist bonuses
        const bonusResult = await query(
          `SELECT bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
           FROM therapist_bonuses WHERE character_id = $1`,
          [therapist_id]
        );
        if (bonusResult.rows.length === 0) {
          throw new Error(`STRICT MODE: No therapist_bonuses found for therapist "${therapist_id}"`);
        }
        const therapistBonuses = bonusResult.rows;

        // Build patients info array for batch evaluation
        // Need to fetch CharacterData for each patient and extract their response this round
        const messages = req.body?.messages || [];

        // Extract this round's messages from conversation history
        // This round's messages start at index: (round_number - 1) * turns_per_round
        const round_start_index = (round_number - 1) * turns_per_round;
        const round_messages = messages.slice(round_start_index);

        // Add the current response (just generated) to the messages
        // The current speaker is the last patient in the round
        const all_round_messages = [...round_messages, { role: 'assistant', content: response_text, speaker: agent_key }];

        // Build round transcript with speaker attribution
        const roundTranscript: Array<{ message: string; speaker_name: string; speaker_id: string }> = [];

        // First message in round should be therapist's question
        if (all_round_messages.length === 0) {
          throw new Error(`STRICT MODE: No messages found for round ${round_number}`);
        }

        const therapist_msg = all_round_messages[0];
        if (!therapist_msg || !therapist_msg.content) {
          throw new Error(`STRICT MODE: Therapist message missing for round ${round_number}`);
        }

        const therapist_data = participants_data.find(p => p.character_id === therapist_id);
        if (!therapist_data) {
          throw new Error(`STRICT MODE: Therapist "${therapist_id}" not found in participants_data`);
        }

        roundTranscript.push({
          message: therapist_msg.content,
          speaker_name: therapist_data.name,
          speaker_id: therapist_data.id
        });

        // Build patient info array and extract their responses
        const patientsForEval: PatientInfo[] = [];

        for (let i = 0; i < patients_data.length; i++) {
          const patient = patients_data[i];

          // Fetch full CharacterData for this patient (canonical ID derived internally)
          const patientCharData = await fetchCharacterData(patient.id);

          // Find this patient's response in this round's messages
          // Patient responses are messages 1 through N (after therapist's message at index 0)
          const patient_response_index = i + 1;

          if (patient_response_index >= all_round_messages.length) {
            throw new Error(`STRICT MODE: Missing response for patient "${patient.name}" (index ${patient_response_index}) in round ${round_number}. Expected ${patients_data.length} patient responses but only have ${all_round_messages.length - 1}`);
          }

          const patient_msg = all_round_messages[patient_response_index];
          if (!patient_msg || !patient_msg.content) {
            throw new Error(`STRICT MODE: Empty response for patient "${patient.name}" in round ${round_number}`);
          }

          const patient_response = patient_msg.content;

          // Add to transcript
          roundTranscript.push({
            message: patient_response,
            speaker_name: patient.name,
            speaker_id: patient.id
          });

          patientsForEval.push({
            patient_id: patient.character_id,
            patient_name: patient.name,
            patientData: patientCharData,
            userchar_id: patient.id,
            response: patient_response
          });
        }

        console.log(`🎯 [GROUP-BATCH-EVAL] Evaluating ${patientsForEval.length} patients: ${patientsForEval.map(p => p.patient_name).join(', ')}`);

        // Call batch evaluation service (ONE API call for all patients)
        const batchResult = await getBatchTherapistEvaluation({
          therapistData,
          patients: patientsForEval,
          intensity,
          roundNumber: round_number,
          therapistBonuses,
          roundTranscript
        });

        console.log(`✅ [GROUP-BATCH-EVAL] ${batchResult.therapistName} evaluated ${batchResult.evaluations.length} patients`);

        // Apply bonuses to EACH patient individually
        const evaluationsWithBonuses: Array<{
          patient_id: string;
          patient_name: string;
          choice: string;
          reasoning: string;
          bonusesApplied: Array<{ stat: string; change: number }>;
        }> = [];

        for (const eval_item of batchResult.evaluations) {
          const patient = patientsForEval.find(p => p.patient_id === eval_item.patient_id);
          if (!patient) {
            console.error(`🚨 [GROUP-BATCH-EVAL] Patient not found for eval: ${eval_item.patient_id}`);
            continue;
          }

          const patientBonuses: Array<{ stat: string; change: number }> = [];

          for (const bonus of therapistBonuses) {
            let bonus_value: number;
            let penalty_value: number;

            if (intensity === 'soft') {
              bonus_value = bonus.easy_bonus;
              penalty_value = bonus.easy_penalty;
            } else if (intensity === 'medium') {
              bonus_value = bonus.medium_bonus;
              penalty_value = bonus.medium_penalty;
            } else {
              bonus_value = bonus.hard_bonus;
              penalty_value = bonus.hard_penalty;
            }

            const change = calculateStatChange(eval_item.choice, intensity, bonus_value, penalty_value);

            if (change !== 0) {
              await query(
                `UPDATE user_characters
                 SET ${bonus.bonus_type} = GREATEST(0, ${bonus.bonus_type} + $1)
                 WHERE id = $2`,
                [change, patient.userchar_id]
              );

              patientBonuses.push({ stat: bonus.bonus_type, change });
              console.log(`📊 [GROUP-STAT-UPDATE] ${eval_item.patient_name} ${bonus.bonus_type}: ${change > 0 ? '+' : ''}${change}`);
            }
          }

          // Store evaluation for this patient
          await query(
            `INSERT INTO therapy_evaluations
             (session_id, user_character_id, evaluator_id, evaluator_type, round_number, intensity, choice, reasoning, bonuses_applied)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              chat_id,
              patient.userchar_id,
              therapist_id,
              'therapist',
              round_number,
              intensity,
              eval_item.choice,
              eval_item.reasoning,
              JSON.stringify(patientBonuses)
            ]
          );

          evaluationsWithBonuses.push({
            patient_id: eval_item.patient_id,
            patient_name: eval_item.patient_name,
            choice: eval_item.choice,
            reasoning: eval_item.reasoning,
            bonusesApplied: patientBonuses
          });
        }

        // Build response for UI with ALL evaluations
        round_evaluation = {
          round: round_number,
          therapistName: batchResult.therapistName,
          evaluations: evaluationsWithBonuses
        };

        console.log(`✅ [GROUP-BATCH-EVAL] Round ${round_number} complete, evaluated ${evaluationsWithBonuses.length} patients`);

      } catch (evalError: any) {
        console.error(`🚨 [GROUP-BATCH-EVAL] Evaluation failed:`, evalError.message);
        round_evaluation = {
          round: round_number,
          error: evalError.message
        };
      }
    }

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      session_complete: turn_number >= total_turns_before_judge,
      judge_turn,
      round_evaluation,
      metadata: {
        domain: 'group_therapy',
        patient_count,
        turns_per_round,
        prompt_length: system_instructions.length,
        response_length: response_text.length
      }
    });

  } catch (err: any) {
    console.error('[GROUP_THERAPY_ERROR]', err?.stack || err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

async function handleTherapyRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  console.log('🟢 HANDLETHERAPYREQUEST ENTRY - This should ALWAYS appear');
  const { sid, agent_key, userchar_id } = params;
  const speaker_id = agent_key;                     // who speaks THIS turn (the only model call)

  try {
    const t0 = Date.now(); // Start timing
    console.log('🎭 THERAPY: Processing therapy request with dedicated handler');

    // Get character for canonical_id
    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    console.log('🔥 [ID-DEBUG] canonical_id:', canonical_id);
    console.log('🔥 [ID-DEBUG] userchar_id:', userchar_id);
    console.log('🔥 [ID-DEBUG] speaker_id:', speaker_id);

    // Get therapist_id from request body (sent by frontend)
    const therapist_id = req.body?.therapist_id;

    // Determine role simply for prompt assembly (not for complex logic)
    const role = (speaker_id === therapist_id) ? 'therapist' : 'patient';

    console.log('🔥 [THERAPY-DEBUG] speaker=', speaker_id, ' canonical=', canonical_id, ' therapist=', therapist_id, ' role=', role);

    // DEBUG: Check what message and messages are being sent for therapist calls
    if (role === 'therapist') {
      console.log('🔍 [THERAPIST-PAYLOAD-DEBUG] message field length:', (req.body?.message || '').length);
      console.log('🔍 [THERAPIST-PAYLOAD-DEBUG] messages array length:', Array.isArray(req.body?.messages) ? req.body.messages.length : 'NOT_ARRAY');
      console.log('🔍 [THERAPIST-PAYLOAD-DEBUG] messages content (first 3):', req.body?.messages?.slice(0, 3));
    }

    // Session isolation - clear any stale session state 
    const session_id = req.body?.session_id || sid;
    if (session_id && sessions.has(session_id)) {
      console.log('🧹 [SESSION-CLEANUP] Clearing stale session state for:', session_id);
      sessions.delete(session_id);
    }

    // Fetch ALL character data from DB (no more frontend meta!)
    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let therapist_name = therapist_id;

    // Get user_id from userchar_id - row must exist
    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    const actual_user_id: string = user_id_result.rows[0].user_id;

    console.log('🔍 [ROOMMATE DEBUG] Looking up roommates for userchar_id:', userchar_id, 'resolved user_id:', actual_user_id);

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    console.log('🔍 [ROOMMATE DEBUG] Query result:', roommate_result.rows);
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    // Get financial data from the character we already looked up
    const wallet = character.wallet;
    const debt = character.debt;

    console.log('🔥 [DB-FETCH] Character data:', {
      roommates: roommates.length,
      roommate_names: roommates,
      wallet,
      debt
    });

    // Get user's active team from teams table
    let actual_team_id: string | null = null;
    let teammates: string[] = [];
    try {
      const team_result = await db_adapter.query(
        'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
        [actual_user_id]
      );
      actual_team_id = team_result.rows[0]?.id;
      console.log('🔥 [TEAM-FETCH] Resolved team_id:', actual_team_id, 'for user:', actual_user_id);

      if (!actual_team_id) {
        console.error('🚨 STRICT MODE: No active team found for user:', actual_user_id);
        throw new Error(`STRICT MODE: No active team set for user: ${actual_user_id}`);
      }

      // Get teammates from the active team
      const team_slots_result = await db_adapter.query(
        'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
        [actual_team_id]
      );
      if (team_slots_result.rows.length > 0) {
        const teammate_ids = [
          team_slots_result.rows[0].character_slot_1,
          team_slots_result.rows[0].character_slot_2,
          team_slots_result.rows[0].character_slot_3
        ].filter(id => id && id !== userchar_id); // Exclude current character and null slots

        if (teammate_ids.length > 0) {
          const teammate_result = await db_adapter.query(
            'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
            [teammate_ids]
          );
          teammates = teammate_result.rows.map((row: { name: string }) => row.name);
        }
      }
    } catch (error) {
      console.error('🔥 [TEAM-FETCH] Error fetching team:', error);
      throw error; // NO FALLBACK - fail loudly
    }

    // Get therapy-specific memory context (USER-SCOPED: this user's therapy relationship with this therapist)
    let therapy_memory_section = '';
    // Create a unique therapy relationship ID to prevent cross-user contamination
    // Format: "therapy_relationship_{userchar_id}_{therapistCanonicalId}"
    const therapy_relationship_id = `therapy_relationship_${userchar_id}_${canonical_id}`;
    console.log(`🔍 [THERAPY-MEMORY] Using scoped relationship ID: ${therapy_relationship_id}`);

    try {
      const ecs = EventContextService.get_instance();

      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: therapy_relationship_id,  // Unique per user-therapist pairing
          partner_character_id: userchar_id,            // For relevance filtering
          domains: ['therapy', 'social'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10000)
        ),
      ]);
      therapy_memory_section = (result as any)?.text || '';
      console.log(`🔍 [THERAPY-MEMORY-DEBUG] buildMemoryContext returned ${therapy_memory_section.length} chars`);
    } catch (e: any) {
      console.warn('[THERAPY][MEMORY] timeout', e?.message);
    }

    // Build clean conversation history without quotes or stage directions
    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
      console.log('🔍 [DEBUG] CONVERSATION HISTORY LENGTH:', conversation_history.length);
      console.log('🔍 [DEBUG] MESSAGES ARRAY LENGTH:', req.body.messages.length);
      if (req.body.messages.length === 0) {
        console.log('🔍 [DEBUG] EMPTY MESSAGES ARRAY - Session start');
      }
    } else {
      console.log('🔍 [DEBUG] NO MESSAGES ARRAY PROVIDED');
      console.log('🔍 [DEBUG] agent_key:', req.body?.agent_key);
      console.log('🔍 [DEBUG] chat_type:', req.body?.chat_type);
    }

    // Assemble therapy prompt using single source of truth
    console.log('🔥 [ASSEMBLY-DEBUG] About to call assembleTherapyPromptUniversal');
    console.log('🔥 [ASSEMBLY-DEBUG] Parameters: agent_key=' + agent_key + ', role=' + role);

    // Get patient name from the character data we already fetched
    let patient_name = '';
    if (role === 'patient') {
      patient_name = agent_key; // When generating patient response, agent_key is the patient
    } else {
      // When generating therapist response, get patient name from DB
      try {
        const character = await db_adapter.user_characters.find_by_id(userchar_id);
        if (character && character.name) {
          patient_name = character.name;
        } else if (character && character.character_id) {
          patient_name = character.character_id;
        } else {
          // Extract name from userchar_id as last resort
          patient_name = userchar_id.split('_').pop() || userchar_id;
        }
      } catch (error) {
        console.error('🔥 [DB-FETCH] Error getting patient name:', error);
        patient_name = userchar_id; // Fallback to userchar_id
      }
    }
    console.log('🔥 [PATIENT-NAME] Resolved patient name:', patient_name);

    // Get patient's character ID from userchar_id for species lookup
    let patient_character_id = null;
    try {
      const patient_charResult = await db_adapter.query(
        'SELECT character_id FROM user_characters WHERE id = $1',
        [userchar_id]
      );
      patient_character_id = patient_charResult.rows[0]?.character_id;
      console.log('🔥 [PATIENT-CHAR-ID] Resolved patient character ID:', patient_character_id);
    } catch (error) {
      console.error('🔥 [PATIENT-CHAR-ID] Error getting patient character ID:', error);
    }

    // Extract required fields from request body (all selected by coach in UI)
    const intensity_strategy = req.body?.intensity_strategy as 'soft' | 'medium' | 'hard' | undefined;
    const therapist_userchar_id = req.body?.therapist_userchar_id as string | undefined;

    console.log('🎯 [THERAPY-PARAMS] intensity_strategy:', intensity_strategy, 'therapist_userchar_id:', therapist_userchar_id);

    // Only therapist role needs intensity_strategy - patient doesn't need to know about it
    // Judge evaluation goes through a separate endpoint (therapy-evaluation)
    if (role === 'therapist' && !intensity_strategy) {
      throw new Error('STRICT MODE: intensity_strategy is required for therapist role (selected by coach in UI)');
    }
    if (!therapist_userchar_id) {
      throw new Error('STRICT MODE: therapist_userchar_id is required (frontend knows this)');
    }

    // Determine main character and context character based on role
    // For therapist role: main=therapist, context=patient
    // For patient role: main=patient, context=therapist
    const main_character_id = agent_key;
    const main_userchar_id = role === 'therapist' ? therapist_userchar_id : userchar_id;
    const context_char_id = role === 'therapist' ? patient_character_id : therapist_id;
    const context_uc_id = role === 'therapist' ? userchar_id : therapist_userchar_id;

    console.log('🔥 [THERAPY-ASSEMBLY] Role:', role, 'Main:', main_character_id, main_userchar_id, 'Context:', context_char_id, context_uc_id);

    const prompt_result = await assemblePrompt({
      userchar_id: main_userchar_id,
      domain: 'therapy',
      role: role as 'patient' | 'therapist',
      role_type: role === 'therapist' ? 'system' : 'contestant',
      conversation_history,
      context_userchar_id: context_uc_id,
      therapy_options: {
        session_type: 'individual',
        intensity_strategy,
      },
    });
    const final_therapy_prompt = prompt_result.system_prompt;

    console.log('🔥 [ASSEMBLY-DEBUG] assembleTherapyPromptUniversal returned, length: ' + final_therapy_prompt.length);
    console.log('🎭 THERAPY: Assembled prompt length (FROM HANDLETHERAPYREQUEST):', final_therapy_prompt.length);
    console.log('🎭 THERAPY: Full prompt content:', JSON.stringify(final_therapy_prompt));

    // Put the full prompt in the user message for LocalAI (not split between system + empty user)
    const safe_user_message = final_therapy_prompt;

    // Build dynamic stop tokens based on actual characters in conversation
    const stop_tokens = [
      "\n\n",
      "Group Session:",
      `${agent_key}:`,           // Current speaker shouldn't label themselves
      `${therapist_name}:`,      // Therapist name
      `${patient_name}:`         // Patient name
    ];
    // Remove duplicates and filter out empty strings
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    // PRODUCTION - Open_ai API
    console.log('🚀 [THERAPY] Calling Open_ai API');
    console.log('🚀 [THERAPY] Prompt length:', final_therapy_prompt.length);
    console.log('🚀 [THERAPY] User message:', safe_user_message);
    console.log('🚀 [THERAPY] Stop tokens:', unique_stop_tokens);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: safe_user_message }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('✅ [THERAPY] Open_ai response received, length:', response_text.length);
    console.log('🚨 [DEBUG] Raw response from Open_ai:', response_text.substring(0, 100));

    // Apply comprehensive reply sanitizer
    response_text = sanitize_therapy_reply(response_text);
    console.log('🚨 [DEBUG] After sanitize_therapy_reply:', response_text.substring(0, 100));


    console.log('🎭 THERAPY: Direct llama-server response length:', response_text.length);
    console.log('🎯 EXECUTION PATH FOUND - This line definitely executes');
    console.log('🎭 THERAPY: Direct llama-server response content:', JSON.stringify(response_text));

    // Performance logging
    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    // Memory patching - save conversation to memory system
    try {
      const store = new PgMemoryStore();
      // Pre-write row so legacy NOT NULL passes
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });

      // Save therapy conversation to memory
      await writeTherapyPatch({ sid, model_text: response_text, state: store, character_id: canonical_id });
    } catch (e) {
      console.warn('[THERAPY][memory] patch failed (non-fatal):', e);
    }

    // ====================================================================
    // ANALYST + JUDGE WORKFLOW INTEGRATION
    // ====================================================================

    // After therapy response, analyze the patient's message for this turn
    const user_message = req.body?.messages?.[req.body.messages.length - 1]?.content || req.body?.message || '';

    // Universal turn counting - dedicated counter system
    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const { query } = require('../database/postgres');

    // Increment chat session turn count
    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count) 
      VALUES ($1, 1) 
      ON CONFLICT (chat_id) 
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1, 
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    // Get the new turn number for this chat
    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    // Update daily stats
    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count) 
      VALUES ($1, $2, 1) 
      ON CONFLICT (user_id, date) 
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    // Update lifetime turn count
    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    console.log(`🔄 [TURN] Turn ${turn_number} complete - judges will handle analysis internally`);

    // JUDGE EVALUATION NOW HANDLED SEQUENTIALLY BY FRONTEND - NO CONCURRENT JUDGE CALLS
    console.log(`🔄 [TURN] Turn ${turn_number} complete - judge evaluation handled by frontend on turn 7`);
    let judge_results = null;

    // ====================================================================
    // THERAPIST ROUND EVALUATION (after patient turns 2, 4, 6)
    // ====================================================================
    let round_evaluation = null;
    const is_patient_turn = role === 'patient';
    const is_evaluation_turn = [2, 4, 6].includes(turn_number);

    if (is_patient_turn && is_evaluation_turn) {
      const round_number = turn_number / 2; // Turn 2 = Round 1, Turn 4 = Round 2, Turn 6 = Round 3
      console.log(`🎯 [ROUND-EVAL] Starting round ${round_number} evaluation after turn ${turn_number}`);

      try {
        // Get intensity from request (required - selected by coach in UI)
        const intensity = req.body?.intensity;
        if (!intensity) {
          throw new Error('STRICT MODE: intensity is required for therapy evaluation');
        }

        // Fetch therapist character data (system character - uses SystemCharacterData)
        const therapistData = await fetchSystemCharacterData(therapist_userchar_id);

        // Fetch patient character data (contestant - uses CharacterData)
        const patientData = await fetchCharacterData(userchar_id);

        // Fetch therapist bonuses from database
        const bonusResult = await query(
          `SELECT bonus_type, easy_bonus, easy_penalty, medium_bonus, medium_penalty, hard_bonus, hard_penalty
           FROM therapist_bonuses WHERE character_id = $1`,
          [therapist_id]
        );
        if (bonusResult.rows.length === 0) {
          throw new Error(`STRICT MODE: No therapist_bonuses found for therapist "${therapist_id}"`);
        }
        const therapistBonuses = bonusResult.rows;

        // Build transcript from messages array
        // Frontend sends: { message, speaker_name, speaker_id }
        const transcript = (req.body?.messages || []).map((m: any) => {
          if (!m.message) throw new Error(`STRICT MODE: Message missing 'message' field: ${JSON.stringify(m)}`);
          if (!m.speaker_name) throw new Error(`STRICT MODE: Message missing 'speaker_name' field: ${JSON.stringify(m)}`);
          if (!m.speaker_id) throw new Error(`STRICT MODE: Message missing 'speaker_id' field: ${JSON.stringify(m)}`);
          return {
            message: m.message,
            speaker_name: m.speaker_name,
            speaker_id: m.speaker_id
          };
        });
        // Add the current patient response
        transcript.push({
          message: response_text,
          speaker_name: patient_name,
          speaker_id: userchar_id
        });

        // Call the evaluation service
        const evalResult = await getTherapistEvaluation({
          therapistData,
          patientData,
          patientMessage: response_text,
          intensity,
          roundNumber: round_number,
          therapistBonuses,
          transcript
        });

        console.log(`✅ [ROUND-EVAL] ${evalResult.therapistName} evaluated ${evalResult.patientName}: ${evalResult.choice}`);

        // Calculate and apply bonuses for each stat
        const bonusesApplied: Array<{ stat: string; change: number }> = [];

        for (const bonus of therapistBonuses) {
          let bonus_value: number;
          let penalty_value: number;

          if (intensity === 'soft') {
            bonus_value = bonus.easy_bonus;
            penalty_value = bonus.easy_penalty;
          } else if (intensity === 'medium') {
            bonus_value = bonus.medium_bonus;
            penalty_value = bonus.medium_penalty;
          } else {
            bonus_value = bonus.hard_bonus;
            penalty_value = bonus.hard_penalty;
          }

          const change = calculateStatChange(evalResult.choice, intensity, bonus_value, penalty_value);

          if (change !== 0) {
            // bonus_type IS the exact column name in user_characters (no mapping)
            await query(
              `UPDATE user_characters
               SET ${bonus.bonus_type} = GREATEST(0, ${bonus.bonus_type} + $1)
               WHERE id = $2`,
              [change, userchar_id]
            );

            bonusesApplied.push({ stat: bonus.bonus_type, change });
            console.log(`📊 [STAT-UPDATE] ${bonus.bonus_type}: ${change > 0 ? '+' : ''}${change} for ${userchar_id}`);
          }
        }

        // Store evaluation in therapy_evaluations table
        await query(
          `INSERT INTO therapy_evaluations
           (session_id, user_character_id, evaluator_id, evaluator_type, round_number, intensity, choice, reasoning, bonuses_applied)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            chat_id,
            userchar_id,
            therapist_id,
            'therapist',
            round_number,
            intensity,
            evalResult.choice,
            evalResult.reasoning,
            JSON.stringify(bonusesApplied)
          ]
        );

        // Build response for UI
        round_evaluation = {
          round: round_number,
          choice: evalResult.choice,
          reasoning: evalResult.reasoning,
          therapistName: evalResult.therapistName,
          bonusesApplied
        };

        console.log(`✅ [ROUND-EVAL] Round ${round_number} evaluation complete, bonuses applied:`, bonusesApplied);

      } catch (evalError: any) {
        console.error(`🚨 [ROUND-EVAL] Evaluation failed for round ${round_number}:`, evalError.message);
        // Don't fail the whole request - just log the error and continue
        round_evaluation = {
          round: round_number,
          error: evalError.message
        };
      }
    }

    // Return successful therapy response with evaluation data for UI
    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      session_complete: turn_number >= 6,
      judge_results,
      round_evaluation,
      metadata: {
        domain: 'therapy',
        prompt_length: final_therapy_prompt.length,
        response_length: response_text.length,
        memory_length: therapy_memory_section.length
      }
    });

  } catch (error: any) {
    console.error('🎭 THERAPY: Error in dedicated handler:', error);
    return res.status(500).json({
      ok: false,
      error: 'therapy_processing_failed',
      detail: error.message
    });
  }
}

// Dedicated confessional request handler - single source of truth for confessional
async function handleConfessionalRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  console.log('🟢 HANDLECONFESSIONALREQUEST ENTRY - This should ALWAYS appear');
  const { sid, agent_key, userchar_id } = params;
  let canonical_id = agent_key; // Will be updated with actual character_id from DB
  const speaker_id = agent_key;

  // Host character IDs (P.T. Barnum, Mad Hatter, Betty Boop replaced hostmaster_v8_72)
  const HOST_CHARACTER_IDS = ['pt_barnum', 'mad_hatter', 'betty_boop'];

  const message = req.body?.message || '';

  console.log('🔥 [CONFESSIONAL-DEBUG] speaker=', speaker_id, ' canonical=', canonical_id);

  // Initialize database adapter and fetch character data
  const { db_adapter } = require('../services/databaseAdapter');
  let roommates: string[] = [];
  let teammates: string[] = [];
  let wallet = 0;
  let debt = 0;
  let actual_user_id: string;
  let actual_team_id: string;
  let contestant_name = '';

  try {
    // Get user_id from userchar_id
    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    console.log('🔍 [CONFESSIONAL-DEBUG] Looking up data for userchar_id:', userchar_id, 'resolved user_id:', actual_user_id);

    // Get user's active team from teams table
    const team_result = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );
    actual_team_id = team_result.rows[0]?.id;
    if (!actual_team_id) {
      throw new Error(`No active team set for user: ${actual_user_id}`);
    }
    console.log('🔥 [CONFESSIONAL-TEAM-FETCH] Using team_id:', actual_team_id);

    // Get roommates (exclude the current character)
    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    // Get teammates from the active team (now stored in teams table, not team_context)
    if (actual_team_id) {
      const team_slots_result = await db_adapter.query(
        'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
        [actual_team_id]
      );

      if (team_slots_result.rows.length > 0) {
        const teammate_ids = [
          team_slots_result.rows[0].character_slot_1,
          team_slots_result.rows[0].character_slot_2,
          team_slots_result.rows[0].character_slot_3
        ].filter(id => id && id !== userchar_id); // Exclude current character and null slots

        if (teammate_ids.length > 0) {
          const teammate_result = await db_adapter.query(
            'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
            [teammate_ids]
          );
          teammates = teammate_result.rows.map((row: { name: string }) => row.name);
        }
      }
    }

    // Get financial data for the character
    const character = await db_adapter.user_characters.find_by_id(userchar_id);

    wallet = character.wallet;
    debt = character.debt;
    // Update canonical_id to use the character's canonical ID for LocalAGI
    // BUT only if speaker is contestant (not a host character)
    if (character.character_id && !HOST_CHARACTER_IDS.includes(speaker_id)) {
      canonical_id = character.character_id;
      console.log('🎭 [CONFESSIONAL-FIX] Updated canonical_id from DB:', canonical_id);
    }

    // Get contestant name for stop tokens
    const contestant_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = $1',
      [userchar_id]
    );
    contestant_name = contestant_result.rows[0]?.name || 'Contestant';

    console.log('🔥 [CONFESSIONAL-DB-FETCH] Character data:', {
      roommates: roommates.length,
      roommate_names: roommates,
      teammates: teammates.length,
      teammate_names: teammates,
      wallet,
      debt,
      contestant_name
    });
  } catch (error) {
    console.error('🔥 [CONFESSIONAL-DB-FETCH] Error fetching character data:', error);
  }

  // Universal turn counting - dedicated counter system (copied from therapy)
  const chat_id = req.body?.chat_id || 'default_chat';
  const user_id = req.user?.id || 'system';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const { query } = require('../database/postgres');

  // Increment chat session turn count
  await query(`
    INSERT INTO chat_sessions (chat_id, current_turn_count) 
    VALUES ($1, 1) 
    ON CONFLICT (chat_id) 
    DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1, 
                  updated_at = CURRENT_TIMESTAMP
  `, [chat_id]);

  // Get the new turn number for this chat
  const chat_turn_result = await query(
    'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
    [chat_id]
  );

  if (!chat_turn_result.rows[0]) {
    throw new Error(`Chat session not found after insert: ${chat_id}`);
  }

  const turn_number = chat_turn_result.rows[0].current_turn_count;

  // Update daily stats
  await query(`
    INSERT INTO user_daily_stats (user_id, date, daily_turn_count) 
    VALUES ($1, $2, 1) 
    ON CONFLICT (user_id, date) 
    DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                  updated_at = CURRENT_TIMESTAMP
  `, [user_id, today]);

  // Update lifetime turn count
  await query(
    'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
    [user_id]
  );

  console.log(`🔄 [CONFESSIONAL-TURN] Turn ${turn_number} for chat ${chat_id}`);

  // Build clean conversation history without quotes or stage directions (copied from therapy)
  let conversation_history = '';
  if (Array.isArray(req.body?.messages)) {
    conversation_history = buildConversationHistory(req.body.messages);
    console.log('🔍 [CONFESSIONAL-DEBUG] CONVERSATION HISTORY LENGTH:', conversation_history.length);
    console.log('🔍 [CONFESSIONAL-DEBUG] MESSAGES ARRAY LENGTH:', req.body.messages.length);
    if (req.body.messages.length === 0) {
      console.log('🔍 [CONFESSIONAL-DEBUG] EMPTY MESSAGES ARRAY - Session start');
    }
  } else {
    console.log('🔍 [CONFESSIONAL-DEBUG] NO MESSAGES ARRAY PROVIDED');
    console.log('🔍 [CONFESSIONAL-DEBUG] agent_key:', req.body?.agent_key);
    console.log('🔍 [CONFESSIONAL-DEBUG] chat_type:', req.body?.chat_type);
  }

  // Extract confessional-specific parameters
  const hostmaster_style = ['gentle', 'probing', 'confrontational'].includes(req.body.meta?.hostmaster_style)
    ? req.body.meta.hostmaster_style
    : 'probing';

  // Fetch memory context for confessional reflection/informed questioning
  let memory_context = '';
  try {
    const ecs = EventContextService.get_instance();
    memory_context = await ecs.getConfessionalContext(userchar_id);
    console.log(`🔍 [CONFESSIONAL-MEMORY] Loaded ${memory_context.length} chars of context`);
  } catch (error) {
    console.error(`🚨 [CONFESSIONAL-MEMORY] Failed to load context:`, error);
    // Continue without memory context if it fails (not fatal but warn)
  }

  // Fetch the user's assigned host character for the prompt context
  // First get the host_id from the user's character record
  const userHostResult = await db_adapter.query(
    'SELECT host_id FROM user_characters WHERE id = $1',
    [userchar_id]
  );
  const assigned_host_id = userHostResult.rows[0]?.host_id;

  if (!assigned_host_id) {
    throw new Error(`STRICT MODE: No host assigned to user_character ${userchar_id}`);
  }

  // Then get the host's character data
  const hostResult = await db_adapter.query(
    'SELECT c.id, c.name, c.comedy_style FROM characters c WHERE c.id = $1',
    [assigned_host_id]
  );
  const hostData = hostResult.rows[0];

  if (!hostData) {
    throw new Error(`STRICT MODE: Host character (${assigned_host_id}) not found in database`);
  }
  if (!hostData.name) {
    throw new Error(`STRICT MODE: Host (${assigned_host_id}) has no name`);
  }
  if (!hostData.comedy_style) {
    throw new Error(`STRICT MODE: Host (${assigned_host_id}) has no comedy_style`);
  }

  // Fetch full contestant data once for use in options (mandatory)
  const contestantData = await fetchCharacterData(userchar_id);
  
  const confessional_options = {
    hostmaster_style: hostmaster_style as any,
    memory_context,
    turn_number,
    host_name: hostData.name,
    host_style: hostData.comedy_style,
    contestant_data: contestantData
  };

  let prompt: string;

  // Role detection logic based on agent_key
  // Check if speaker is one of the host characters
  const isHostSpeaking = HOST_CHARACTER_IDS.includes(speaker_id);

  if (isHostSpeaking) {
    // HOST FLOW: A host character is speaking (system persona), but needs Contestant data for context
    console.log(`🔥 [CONFESSIONAL-DEBUG] HOST FLOW - Speaker is ${speaker_id}`);

    // Get the Host's system user_character ID
    const systemInstanceResult = await db_adapter.query(
      "SELECT id FROM user_characters WHERE character_id = $1 LIMIT 1",
      [speaker_id]
    );
    const host_userchar_id = systemInstanceResult.rows[0]?.id;
    if (!host_userchar_id) {
      throw new Error(`STRICT MODE: Host system instance not found in user_characters for ${speaker_id}`);
    }

    const prompt_result = await assemblePrompt({
      userchar_id: host_userchar_id, // Subject is the HOST
      domain: 'confessional',
      role: 'host',
      role_type: 'system',
      conversation_history,
      confessional_options
    });
    prompt = prompt_result.system_prompt;
  } else {
    // CONTESTANT FLOW: Generating candid responses (subject is the contestant)
    console.log('🔥 [CONFESSIONAL-DEBUG] CONTESTANT FLOW - Using assemblePrompt');

    const prompt_result = await assemblePrompt({
      userchar_id, // Subject is the CONTESTANT
      domain: 'confessional',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      confessional_options
    });
    prompt = prompt_result.system_prompt;
  }

  console.log('🔥 [CONFESSIONAL-DEBUG] Prompt assembled, length: ' + prompt.length);
  console.log('🔥🔥🔥 [CONFESSIONAL-FULL-PROMPT]', prompt);

  // Build dynamic stop tokens based on role to prevent excessive generation
  const stop_tokens = [
    "\n\n",  // Prevent rambling with double line breaks
    `${hostData.name}:`,  // Prevent role-playing both sides (use actual host name)
    `${contestant_name}:`,  // Prevent speaking for contestant
    "Interview:"  // Prevent meta-commentary
  ];
  // Remove duplicates and filter out empty strings
  const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

  try {
    // PRODUCTION - Open_ai API (matching therapy pattern)
    console.log('🚀 [CONFESSIONAL] Calling Open_ai API');
    console.log('🚀 [CONFESSIONAL] Prompt length:', prompt.length);
    console.log('🚀 [CONFESSIONAL] Stop tokens:', unique_stop_tokens);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_text = completion.choices[0]?.message?.content?.trim() || '';
    console.log('✅ [CONFESSIONAL] Open_ai response received, length:', response_text.length);

    // Return successful confessional response with turn_number like therapy
    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      session_complete: turn_number >= 6,
      metadata: {
        domain: 'confessional',
        prompt_length: prompt.length,
        response_length: response_text.length,
        speaker: canonical_id,
        timestamp: new Date().toISOString(),
        session_id: sid
      }
    });

  } catch (error: any) {
    console.error('🚨 CONFESSIONAL ERROR:', error.message);
    console.error('🚨 CONFESSIONAL ERROR STACK:', error.stack);
    console.error('🚨 CONFESSIONAL ERROR FULL:', error);
    res.status(500).json({
      ok: false,
      error: 'confessional_processing_failed',
      detail: error.message,
      stack: error.stack
    });
  }
}

// Analysis agent removed - discontinued feature from therapy that should not be used

async function handleMemoryChat(req: AuthRequest, res: express.Response) {
  console.log('🚀 [MEMORY-CHAT-ENTRY] handleMemoryChat called');
  try {
    // accept both session_id and session_id
    const raw_sid = (req.body?.session_id ?? req.body?.session_id) as string | undefined;
    const sid = normalizeSessionId(String(raw_sid || ''));

    // accept character_id, character, or meta.character_idCanonical
    const body_character_id = req.body?.character_id as string | undefined;
    const body_character = req.body?.character as string | undefined;
    const meta_canon = req.body?.meta?.character_idCanonical as string | undefined;
    // For therapy requests, use therapist_id as the character ID
    const therapist_id = req.body?.therapist_id as string | undefined;
    const userchar_id = req.body.userchar_id;
    if (!userchar_id) {
      return res.status(400).json({ ok: false, error: 'userchar_id required' });
    }

    // VALIDATION: Ensure userchar_id is a UUID, not a canonical ID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof userchar_id !== 'string' || !UUID_REGEX.test(userchar_id)) {
      console.error('[AI] ❌ INVALID userchar_id DETECTED - Expected UUID, got canonical ID or invalid format');
      console.error('[AI] ❌ Bad userchar_id:', userchar_id);
      console.error('[AI] ❌ Full request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        ok: false,
        error: `Invalid userchar_id format: "${userchar_id}" is not a UUID.`,
        hint: 'userchar_id must be a UUID like "b252bd0f-1226-46e2-a622-5095d9b803c0", not a canonical ID like "sun_wukong"',
        received_userchar_id: userchar_id
      });
    }

    // Set effective_character_id to match the speaker (agent_key's canonical ID)
    // The speaker could be patient or therapist, but we need their canonical character ID
    const effective_character_id = String(body_character_id || body_character || meta_canon || userchar_id || '');

    // Resolve character ID to canonical agent key - STRICT MODE (NO FALLBACKS)
    const { agent_key: raw_agent_key } = req.body;

    if (!raw_agent_key) {
      return res.status(400).json({ error: 'agent_key required' });
    }

    let agent_key: string;
    console.log('🔍 [AGENT-KEY-RESOLVE] About to resolve raw_agent_key:', raw_agent_key);
    try {
      agent_key = await mustResolveAgentKey(raw_agent_key); // throws if unknown
      console.log('✅ [AGENT-KEY-RESOLVE] Success, resolved to:', agent_key);
    } catch (e) {
      console.error('❌ [AGENT-KEY-RESOLVE] Failed:', String(e));
      return res.status(400).json({ error: 'Unknown agent_key', detail: String(e) });
    }
    const message = String(req.body?.message ?? '');

    if (process.env.AGI_DEBUG) {
      console.log('[NEW-ROUTE] Memory-aware chat handler', JSON.stringify({
        raw_sid, sid, effective_character_id, agent_key, has_userchar: !!userchar_id
      }, null, 2));
    }

    console.log('🔍 [MEMORY-HANDLER-DEBUG] sid:', sid, 'effective_character_id:', effective_character_id, 'userchar_id:', userchar_id);

    // Detect domain first before validation
    let domain: string;
    try {
      domain = detectDomain(req.body);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_DOMAIN',
        detail: String(error)
      });
    }
    console.warn('[ROUTE-DEBUG]', { sid, agent_key, domain, chat_type: req.body?.chat_type });
    console.warn('[ROUTE-DEBUG] Domain detected:', domain);

    // Validate required fields (real_estate doesn't need userchar_id - it's coach-level)
    if (!sid || !effective_character_id) {
      console.error('❌ [MEMORY-HANDLER-VALIDATION-FAIL]', { sid, effective_character_id, userchar_id });
      return res.status(400).json({
        ok: false, error: 'ID_MISSING',
        detail: { have_sid: !!sid, have_canonical_character_id: !!effective_character_id, have_userchar_id: !!userchar_id }
      });
    }

    // ===== THERAPY DOMAIN - HANDLE FIRST AND RETURN IMMEDIATELY =====
    if (domain === 'therapy') {
      console.log('✅ Correct therapy branch hit - processing therapy request completely');

      // Judges go to evaluation; therapists/patients go to therapy chat.
      const JUDGES = new Set(['king_solomon', 'eleanor_roosevelt', 'anubis']);
      if (JUDGES.has(agent_key)) {
        if (req.body.therapist_id !== undefined) {
          return res.status(400).json({ error: 'therapist_id not allowed for judge' });
        }
        return handleTherapyEvaluation(req, res);
      }
      return await handleTherapyRequest(req, res, { sid, agent_key, userchar_id });
    }

    if (domain === 'group_therapy') {
      console.log('✅ Group therapy branch hit - processing group therapy request');

      // Judges go to evaluation; therapists/patients go to group therapy chat.
      const JUDGES = new Set(['king_solomon', 'eleanor_roosevelt', 'anubis']);
      if (JUDGES.has(agent_key)) {
        if (req.body.therapist_id !== undefined) {
          return res.status(400).json({ error: 'therapist_id not allowed for judge' });
        }
        return handleTherapyEvaluation(req, res);
      }
      return await handleGroupTherapyRequest(req, res, { sid, agent_key, userchar_id });
    }

    if (domain === 'confessional') {
      console.log('✅ Correct confessional branch hit - processing confessional request completely');
      return await handleConfessionalRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== FINANCIAL DOMAIN =====
    if (domain === 'financial') {
      console.log('✅ Financial branch hit - processing financial request');
      return await handleFinancialRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== EQUIPMENT DOMAIN =====
    if (domain === 'equipment') {
      console.log('✅ Equipment branch hit - processing equipment request');
      return await handleEquipmentRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== SKILLS DOMAIN (Legacy - now part of abilities) =====
    if (domain === 'skills') {
      console.log('✅ Skills branch hit - routing to abilities handler');
      return await handleAbilitiesRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== ABILITIES DOMAIN (Unified) =====
    if (domain === 'abilities') {
      console.log('✅ Abilities branch hit - processing unified abilities request');
      return await handleAbilitiesRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== KITCHEN_TABLE DOMAIN =====
    if (domain === 'kitchen_table') {
      console.log('✅ Kitchen Table branch hit - processing kitchen table request');
      return await handleKitchenTableRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== TRAINING DOMAIN =====
    if (domain === 'training') {
      console.log('✅ Training branch hit - processing training request');
      return await handleTrainingRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== POWERS DOMAIN =====
    if (domain === 'powers') {
      console.log('✅ Powers branch hit - processing powers request');
      return await handlePowersRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== SPELLS DOMAIN =====
    if (domain === 'spells') {
      console.log('✅ Spells branch hit - processing spells request');
      return await handleSpellsRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== ATTRIBUTES DOMAIN =====
    if (domain === 'attributes') {
      console.log('✅ Attributes branch hit - processing attributes request');
      return await handleAttributesRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== PROGRESSION DOMAIN =====
    if (domain === 'progression') {
      console.log('✅ Progression branch hit - processing progression request');
      return await handleProgressionRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== REAL_ESTATE DOMAIN =====
    if (domain === 'real_estate') {
      console.log('✅ Real Estate branch hit - processing real estate request');
      return await handleRealEstateRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== SOCIAL_LOUNGE DOMAIN =====
    if (domain === 'social_lounge') {
      console.log('✅ Social Lounge branch hit - processing social lounge request');
      return await handleSocialLoungeRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== EMPLOYEE_LOUNGE DOMAIN =====
    if (domain === 'employee_lounge') {
      console.log('✅ Employee Lounge branch hit - processing employee lounge request');
      return await handleEmployeeLoungeRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== MESSAGE_BOARD DOMAIN =====
    if (domain === 'message_board') {
      console.log('✅ Message Board branch hit - processing message board request');
      return await handleMessageBoardRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== GROUP_ACTIVITIES DOMAIN =====
    if (domain === 'group_activities') {
      console.log('✅ Group Activities branch hit - processing group activities request');
      return await handleGroupActivitiesRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== PERFORMANCE DOMAIN =====
    if (domain === 'performance') {
      console.log('✅ Performance branch hit - processing performance request');
      return await handlePerformanceRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== PERSONAL_PROBLEMS DOMAIN =====
    if (domain === 'personal_problems') {
      console.log('✅ Personal Problems branch hit - processing personal problems request');
      return await handlePersonalProblemsRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== BATTLE DOMAIN =====
    if (domain === 'battle') {
      console.log('✅ Battle branch hit - processing battle request');
      return await handleBattleRequest(req, res, { sid, agent_key, userchar_id });
    }

    // ===== DRAMA_BOARD DOMAIN =====
    if (domain === 'drama_board') {
      console.log('✅ Drama Board branch hit - processing drama board request');
      return await handleDramaBoardRequest(req, res, { sid, agent_key, userchar_id });
    }

    // If we reach here, the domain is not supported
    throw new Error(`Unsupported domain: ${domain}`);
  } catch (err: any) {
    console.error('[AI_CHAT_ERROR] Error in memory chat:', {
      error: err?.message,
      stack: err?.stack?.split('\n').slice(0, 5).join('\n'),
      domain: req.body?.domain,
      agent_key: req.body?.agent_key,
      session_id: req.body?.session_id || req.body?.session_id,
      userchar_id: req.body?.userchar_id,
      character_id: req.body?.character_id
    });
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({
        ok: false,
        error: String(err?.message || err),
        stack: String(err?.stack || ''),
        detail: err?.message || 'Unknown error in handler'
      });
    }
    return res.status(500).json({
      ok: false,
      error: 'Server error',
      detail: err?.message || 'Unknown error in handler'
    });
  }
}

/** ---------- IMAGE GENERATION (Open_ai-compatible-ish) ----------
 * Request: { prompt, size?, n?, negative_prompt?, seed?, format? }
 * Response: { images: [{ mime, data_url }] }
 */
router.post('/image', async (req, res) => {
  res.setTimeout(65_000);
  try {
    const { prompt, size = '1024x1024', n = 1 } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });

    console.log('[IMAGE] Generating with Open_ai DALL-E:', { prompt, size, n });

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size === '1024x1024' ? '1024x1024' : '1024x1024',
      response_format: 'url'
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from OpenAI');
    }
    const image_url = response.data[0].url;
    if (!image_url) {
      throw new Error('No image URL returned from OpenAI');
    }

    const image_response = await fetch(image_url);
    const array_buffer = await image_response.arrayBuffer();
    const buffer = Buffer.from(array_buffer);
    const base64 = buffer.toString('base64');
    const data_url = `data:image/png;base64,${base64}`;

    return res.json({
      images: [{
        mime: 'image/png',
        dataUrl: data_url
      }]
    });
  } catch (err: any) {
    console.error('AI image error:', err);
    return res.status(500).json({ error: 'Failed to generate image', message: err?.message || 'Unknown error' });
  }
});

/** ---------- CHAT COMPLETIONS (Open_ai-compatible) ----------
 * Request: { model?, messages, temperature?, max_tokens?, response_format? }
 * Response: { choices: [{ message: { content, role:'assistant' } }], usage:{...} }
 */
router.post('/chat', authenticate_token, async (req: AuthRequest, res) => {
  const timestamp = new Date().toISOString();
  const call_id = Math.random().toString(36).substr(2, 9);

  console.error(`🚨 [${timestamp}] [CALL-${call_id}] AI CHAT ROUTE HIT: agent_key="${req.body?.agent_key}"`);
  console.error(`🚨 [CALL-${call_id}] Request origin: ${req.headers['user-agent']}`);
  console.error(`🚨 [CALL-${call_id}] Stack trace:`);
  console.trace();

  console.log(`[DEBUG] [CALL-${call_id}] Full req.body:`, JSON.stringify(req.body));
  console.log(`[DEBUG] [CALL-${call_id}] req.body keys:`, req.body ? Object.keys(req.body) : 'undefined');
  console.log(`[DEBUG] [CALL-${call_id}] chat_id specifically:`, req.body?.chat_id);
  try {
    console.log('[AI ROUTE] /api/ai/chat hit with body:', JSON.stringify(req.body?.meta));

    // Entry tripwire - log all requests before any routing decisions
    try {
      const ak = String(req.body?.agent_key ?? '');
      const ct = String(req.body?.chat_type ?? '');
      const has_msg = !!req.body?.message;
      const msg_count = Array.isArray(req.body?.messages) ? req.body.messages.length : 0;
      const is_judge = ['eleanor_roosevelt', 'king_solomon', 'anubis'].includes(ak);
      console.log('[ROUTE][ENTRY]', { agent_key: ak, chat_type: ct, is_judge, has_msg, msg_count });
    } catch (e) {
      console.error('[ROUTE][ENTRY][ERROR]', String(e));
    }


    // ────────────────────────────────────────────────────────────────
    // REQUIRED: chat_id is the thread key for memory and routing
    // Do not autogenerate; force clients to send a stable value
    // ────────────────────────────────────────────────────────────────
    if (!req.body?.chat_id) {
      console.warn('[AI ROUTE] missing chat_id', {
        has_messages: !!req.body?.messages,
        domain: req.body?.meta?.domain,
        userchar_id: req.body?.meta?.userchar_id
      });
      return res.status(400).json({
        error: 'chat_id_required',
        hint: 'Provide a stable chat_id per thread, e.g. chat:<domain>:<userchar_id>[:<uuid>]'
      });
    }

    // Strict boundary validation - no aliases allowed
    const {
      agent_key,
      chat_type,       // use existing values
      session_id,
      userchar_id,
      character_id,
      message,
      therapist_id     // only for therapist chats
    } = req.body;

    // Debug validation failures
    console.log('🔍 [VALIDATION] agent_key:', agent_key, 'session_id:', session_id, 'userchar_id:', userchar_id, 'character_id:', character_id);

    if (!agent_key?.trim()) return res.status(400).json({ error: 'agent_key required' });
    if (!session_id?.trim()) return res.status(400).json({ error: 'session_id required' });
    // Detect domain early for validation
    const domain = detectDomain(req.body);

    // Real estate doesn't need userchar_id or character_id (coach-level, not character-level)
    if (domain !== 'real_estate') {
      if (!userchar_id?.trim()) return res.status(400).json({ error: 'userchar_id required' });
      if (!character_id?.trim()) return res.status(400).json({ error: 'character_id required' });
    }

    // Message validation - allow undefined message for confessional hostmaster requests
    if (domain !== 'confessional' && typeof message !== 'string') {
      return res.status(400).json({ error: 'message required' });
    }
    // For confessional, message can be undefined (hostmaster) or string (contestant)
    if (domain === 'confessional' && message !== undefined && typeof message !== 'string') {
      return res.status(400).json({ error: 'message must be string if provided' });
    }

    // Note: character field is now REQUIRED by new memory-aware system (therapy, confessional)
    // Removed validation that rejected it - was blocking new routing logic

    // Domain already detected above for validation
    console.log('--- RAW REQUEST BODY ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('------------------------');

    // Real estate domain routing - coach-level, no userchar_id required
    if (domain === 'real_estate') {
      console.log('🏠 [REAL-ESTATE-ROUTE] Routing to handleMemoryChat for real estate');
      return await handleMemoryChat(req, res);
    }

    // Check if this should use the new memory-aware system (includes therapy)
    // Get userchar_id from either direct field or meta (for backwards compatibility)
    const has_usercharId = req.body?.userchar_id || req.body?.meta?.userchar_id;
    const has_memory_fields = has_usercharId &&
      (req.body?.session_id || req.body?.session_id) &&
      (req.body?.character || req.body?.character_id || req.body?.meta?.character_idCanonical);

    if (has_memory_fields) {
      // Use new memory-aware handler
      console.log('[ROUTE-PROXY] Using memory-aware handler with fields:', {
        userchar_id: req.body?.userchar_id || req.body?.meta?.userchar_id,
        session_id: req.body?.session_id,
        character: req.body?.character,
        character_id: req.body?.character_id
      });
      console.log('🔄 [ROUTE-PROXY] About to call handleMemoryChat');
      try {
        return await handleMemoryChat(req, res);
      } catch (error) {
        console.error('💥 [ROUTE-PROXY] handleMemoryChat threw error:', error);
        return res.status(400).json({ error: 'Memory handler failed', detail: String(error) });
      }
    } else {
      console.log('[ROUTE-PROXY] NOT using memory-aware handler, missing fields:', {
        userchar_id: !!(req.body?.userchar_id || req.body?.meta?.userchar_id),
        session_id: !!(req.body?.session_id || req.body?.session_id),
        character: !!(req.body?.character || req.body?.character_id)
      });
    }

    // NO FALLBACK - All requests must go through memory-aware handler
    console.error('[ROUTE-ERROR] Request missing required fields for memory-aware handler');
    return res.status(400).json({
      error: 'missing_required_fields',
      required: {
        'meta.userchar_id': 'User character ID',
        'session_id': 'Session identifier',
        'character_id': 'Character identifier'
      },
      received: {
        userchar_id: !!req.body?.meta?.userchar_id,
        session_id: !!(req.body?.session_id || req.body?.session_id),
        character_id: !!(req.body?.character || req.body?.character_id)
      }
    });
  } catch (error: any) {
    console.error('[AI ROUTE] Error in chat route:', error);
    return res.status(500).json({ error: 'internal_server_error' });
  }
});

// End session endpoint for clearing session state
router.post('/end-session', authenticate_token, async (req: AuthRequest, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const s = sessions.get(session_id);
    if (s) {
      sessions.delete(session_id); // Hard reset - remove entire session state
      console.log(`🧠 Session cleared: ${session_id}`);
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Error ending session:', error);
    return res.status(500).json({ error: 'Failed to end session' });
  }
});



// Test Open_ai connection
router.get('/test', async (req, res) => {
  try {
    const response = await openai.models.list();
    const models = response.data;

    res.json({
      success: true,
      connected: true,
      message: 'Open_ai API is connected and working',
      models: models.slice(0, 5).map(m => m.id)
    });
  } catch (error) {
    console.error('Open_ai connection test failed:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint for Open_ai
router.get('/localai/health', async (req, res) => {
  try {
    const response = await openai.models.retrieve('gpt-4o-mini');

    res.json({
      ok: true,
      provider: 'Open_ai',
      model: response.id,
      created: response.created
    });
  } catch (err: any) {
    console.error('Open_ai health check failed:', err);
    res.status(500).json({
      ok: false,
      error: 'Open_ai health check failed',
      details: err?.message
    });
  }
});

// --- webhook receiver (LocalAGI → our server)
// Accepts a variety of shapes; must include a message id + text
router.post('/webhook/response', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const b = req.body || {};
    const message_id = b.message_id || b.id || b.message_id;
    const text =
      b.text ??
      b.output ??
      b.content ??
      b.choices?.[0]?.message?.content ??
      null;
    if (!message_id || !text) return res.status(400).json({ error: 'missing message_id or text' });
    deliverMessage(String(message_id), String(text));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

// Battle Announcer AI - Generates dynamic narrative descriptions for battle actions
router.post('/battle-announcer', async (req, res) => {
  try {
    const { attacker, target, action, outcome, battle_context, previous_narrations } = req.body;

    const openai = new Open_ai({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are the Battle Announcer for an epic arena combat game. Your role is to narrate what just happened in vivid, exciting detail.

ANNOUNCER PERSONALITY: Enthusiastic sports commentator style, dramatic but not overwrought, focuses on the action and its impact.

WHAT JUST HAPPENED:
- Attacker: ${attacker.name} (${attacker.archetype}, HP: ${attacker.current_health})
- Target: ${target.name} (${target.archetype}, HP: ${target.current_health})
- Action Type: ${action.type}
- Damage Dealt: ${outcome.damage}
- Health Lost: ${outcome.health_change}
- Status Effects Applied: ${outcome.status_effects_applied.join(', ') || 'none'}
- Counter Attack: ${outcome.counter_attack_triggered ? 'YES' : 'NO'}
- Success: ${outcome.success ? 'YES' : 'NO'}

BATTLE CONTEXT:
- Round: ${battle_context.round_number}
- ${battle_context.player_team_name} (${battle_context.player_characters_alive} alive) vs ${battle_context.opponent_team_name} (${battle_context.opponent_characters_alive} alive)

${previous_narrations && previous_narrations.length > 0 ? `PREVIOUS NARRATIONS (for variety):
${previous_narrations.join('\n')}` : ''}

Generate a dynamic 1-2 sentence narration of what just happened. Vary your style from previous narrations. Include:
1. What the attacker did
2. The result/impact
3. Any dramatic elements (counter-attacks, status effects, critical hits)

Also provide animation metadata in this format:
{
  "narrative_description": "your narration here",
  "animation_metadata": {
    "action_type": "thrust_attack|defensive_stance|spell_cast|etc",
    "intensity": "low|medium|high|critical",
    "hit_result": "miss|glancing|solid|critical",
    "visual_effects": ["blood_spray", "shield_spark", etc]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a battle announcer AI. Respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const response_text = completion.choices[0]?.message?.content;

    if (!response_text) {
      throw new Error('OpenAI returned empty response');
    }

    const narration = JSON.parse(response_text);

    return res.json({
      success: true,
      narration
    });

  } catch (error: any) {
    console.error('Battle announcer AI error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ===== ABILITIES DOMAIN HANDLER (Unified Powers + Spells) =====
async function handleAbilitiesRequest(req: AuthRequest, res: express.Response, params: { sid: string, agent_key: string, userchar_id: string }) {
  const { sid, agent_key, userchar_id } = params;

  try {
    const t0 = Date.now();
    console.log('🌟 ABILITIES: Processing unified abilities request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actual_user_id: string;

    const user_id_result = await db_adapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [userchar_id]
    );
    actual_user_id = user_id_result.rows[0]?.user_id;

    if (!actual_user_id) {
      throw new Error(`No user found for userchar_id: ${userchar_id}`);
    }

    // Fetch team_id for team context
    const team_result = await db_adapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actual_user_id]
    );

    if (!team_result.rows[0]?.id) {
      throw new Error(`STRICT MODE: No active team set for user: ${actual_user_id}`);
    }

    const actual_team_id: string = team_result.rows[0].id;
    console.log('🌟 [ABILITIES-TEAM-FETCH] Resolved team_id:', actual_team_id, 'for user:', actual_user_id);

    const roommate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    roommates = roommate_result.rows.map((row: { name: string }) => row.name);

    // Get teammates
    const teammate_result = await db_adapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actual_user_id, userchar_id]
    );
    teammates = teammate_result.rows.map((row: { name: string }) => row.name);

    const character = await db_adapter.user_characters.find_by_id(userchar_id);
    const canonical_id = character.character_id;

    wallet = character.wallet;
    debt = character.debt;

    // --- FETCH POWERS DATA ---
    const unlocked_powersResult = await db_adapter.query(`
      SELECT cp.id, pd.name, pd.tier, cp.current_rank, pd.max_rank, pd.category, pd.description
      FROM character_powers cp
      JOIN power_definitions pd ON cp.power_id = pd.id
      WHERE cp.character_id = $1 AND cp.unlocked = true
      ORDER BY pd.tier, pd.name
    `, [userchar_id]);

    const available_powersResult = await db_adapter.query(`
      SELECT pd.id, pd.name, pd.tier, pd.unlock_cost, pd.unlock_level, pd.archetype, pd.species, pd.description
      FROM power_definitions pd
      WHERE pd.id NOT IN (
        SELECT power_id FROM character_powers WHERE character_id = $1 AND unlocked = true
      )
      AND (pd.unlock_level IS NULL OR pd.unlock_level <= $2)
      ORDER BY pd.tier, pd.unlock_level, pd.name
      LIMIT 10
    `, [userchar_id, character.level]);

    // --- FETCH SPELLS DATA ---
    const learned_spellsResult = await db_adapter.query(`
      SELECT cs.id, sd.name, sd.tier, cs.current_rank as proficiency_level, cs.times_cast as times_used, sd.description, sd.category as school
      FROM character_spells cs
      JOIN spell_definitions sd ON cs.spell_id = sd.id
      WHERE cs.character_id = $1 AND cs.unlocked = true
      ORDER BY sd.tier, sd.name
    `, [userchar_id]);

    // Fetch equipped powers from loadout
    const equipped_powersResult = await db_adapter.query(`
      SELECT cpl.slot_number, pd.id, pd.name, pd.tier, pd.category, pd.description
      FROM character_power_loadout cpl
      JOIN power_definitions pd ON cpl.power_id = pd.id
      WHERE cpl.user_character_id = $1
      ORDER BY cpl.slot_number
    `, [userchar_id]);

    // Fetch equipped spells from loadout
    const equipped_spellsResult = await db_adapter.query(`
      SELECT csl.slot_number, sd.id, sd.name, sd.tier, sd.category, sd.description
      FROM character_spell_loadout csl
      JOIN spell_definitions sd ON csl.spell_id = sd.id
      WHERE csl.user_character_id = $1
      ORDER BY csl.slot_number
    `, [userchar_id]);

    const available_spellsResult = await db_adapter.query(`
      SELECT sd.id, sd.name, sd.tier, sd.unlock_cost, sd.required_level as unlock_level, sd.category as school, sd.description
      FROM spell_definitions sd
      WHERE sd.id NOT IN (
        SELECT spell_id FROM character_spells WHERE character_id = $1 AND unlocked = true
      )
      AND (sd.required_level IS NULL OR sd.required_level <= $2)
      ORDER BY sd.tier, sd.required_level, sd.name
      LIMIT 10
    `, [userchar_id, character.level]);

    const abilities_data = {
      ability_points: character.ability_points,
      level: character.level,
      unlocked_powers: unlocked_powersResult.rows,
      available_powers: available_powersResult.rows,
      learned_spells: learned_spellsResult.rows,
      available_spells: available_spellsResult.rows,
      coach_lockout_until: character.coach_lockout_until
    };

    let memory_section = '';
    try {
      const ecs = EventContextService.get_instance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subject_character_id: userchar_id,
          partner_character_id: userchar_id,
          domains: ['powers', 'spells', 'skills', 'battle'],
          max_items: 20,
          max_bytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memory_section = (result as any).text;
    } catch (e: any) {
      console.warn('[ABILITIES][MEMORY] timeout', e?.message);
      memory_section = '';
    }

    let conversation_history = '';
    if (Array.isArray(req.body?.messages)) {
      conversation_history = buildConversationHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const prompt_result = await assemblePrompt({
      userchar_id,
      domain: 'abilities',
      role: 'contestant',
      role_type: 'contestant',
      conversation_history,
      abilities_options: {
        coach_message: message,
        memory_context: memory_section,
        ability_points: abilities_data.ability_points,
        level: abilities_data.level,
        unlocked_powers: abilities_data.unlocked_powers,
        equipped_powers: equipped_powersResult.rows,
        unlocked_spells: abilities_data.learned_spells,
        equipped_spells: equipped_spellsResult.rows,
      },
    });
    const final_prompt = prompt_result.system_prompt;

    const stop_tokens = ["\n\n", "Abilities:", "Scene:"];
    const unique_stop_tokens = [...new Set(stop_tokens)].filter(Boolean);

    console.log('[ABILITIES] Calling Open_ai API');
    console.log('[ABILITIES] Prompt length:', final_prompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: final_prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: unique_stop_tokens.length > 0 ? unique_stop_tokens : undefined
    });

    const response_content = completion.choices[0]?.message?.content;
    if (!response_content) {
      throw new Error('OpenAI returned empty response');
    }
    let response_text = response_content.trim();
    console.log('[ABILITIES] Open_ai response length:', response_text.length);

    try {
      const store = new PgMemoryStore();
      await store.save_patch(sid, { userchar_id, canonical_id }, { character_id: canonical_id });
    } catch (e) {
      console.warn('[ABILITIES][memory] patch failed (non-fatal):', e);
    }

    const chat_id = req.body?.chat_id || 'default_chat';
    const user_id = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chat_id]);

    const chat_turn_result = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chat_id]
    );
    if (!chat_turn_result.rows[0]) {
      throw new Error(`Chat session not found after insert: ${chat_id}`);
    }
    const turn_number = chat_turn_result.rows[0].current_turn_count;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [user_id, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [user_id]
    );

    log.llm_timing({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: response_text,
      turn_number,
      metadata: {
        domain: 'abilities',
        prompt_length: final_prompt.length,
        response_length: response_text.length
      }
    });

  } catch (error: any) {
    console.error('🌟 ABILITIES: Error:', error);
    return res.status(500).json({
      ok: false,
      error: 'abilities_processing_failed',
      detail: error.message
    });
  }
}

// =====================================================
// DEDICATED THERAPY EVALUATION ENDPOINTS
// =====================================================

/**
 * Single-patient judge evaluation (Individual Therapy)
 * POST /api/ai/therapy-evaluation
 */
router.post('/therapy-evaluation', authenticate_token, async (req: AuthRequest, res) => {
  console.log('⚖️ [THERAPY-EVALUATION] Dedicated endpoint hit');
  return handleTherapyEvaluation(req, res);
});

/**
 * Multi-patient judge evaluation (Group Therapy)
 * POST /api/ai/therapy-evaluation-batch
 */
router.post('/therapy-evaluation-batch', authenticate_token, async (req: AuthRequest, res) => {
  console.log('⚖️ [THERAPY-EVALUATION-BATCH] Dedicated endpoint hit');
  return handleBatchTherapyEvaluation(req, res);
});

export default router;
