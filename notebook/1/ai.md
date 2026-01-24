import express from 'express';
import axios from 'axios';
import http from 'http';
import https from 'https';
import dns from 'dns';
import OpenAI from 'openai';
import { deliverMessage } from '../services/agiInbox';
import GameEventBus from '../services/gameEventBus';
import EventContextService, { ECS_VERSION } from '../services/eventContextService';
import { consumeIfPresent } from '../services/branchInjection';
import { authenticateToken } from '../services/auth';
import { requireTicket } from '../middleware/ticketMiddleware';
import { AuthRequest } from '../types/index';
import { encode, decode } from 'gpt-3-encoder';
import { getTokenizerService } from '../services/tokenizer';
// Memory system imports
import { PgMemoryStore } from '../services/pgMemoryStore';
import { shouldRefresh, nextStatsBeforeRefresh, markRefreshed, rebalanceCard } from '../services/sessionSummarizer';
import { writeFinancialPatch } from '../services/domainUpdaters/financial';
import { writeTherapyPatch } from '../services/domainUpdaters/therapy';
import {
  promptAssemblyService,
  assembleTherapyPromptUniversal,
  assembleGroupTherapyPromptUniversal,
  assembleFinancialPromptUniversal,
  assembleEquipmentPromptUniversal,
  assembleSkillsPromptUniversal,
  assemblePowersPromptUniversal,
  assembleSpellsPromptUniversal,
  assembleKitchenTablePromptUniversal,
  assembleTrainingPromptUniversal,
  assembleRealEstatePromptUniversal,
  assembleConfessionalPromptUniversal,
  assembleHostmasterPromptUniversal,
  assembleSocialLoungePromptUniversal,
  assembleMessageBoardPromptUniversal,
  assembleGroupActivitiesPromptUniversal,
  assemblePerformancePromptUniversal,
  assemblePersonalProblemsPromptUniversal,
  assembleBattlePromptUniversal,
  assembleDramaBoardPromptUniversal
} from '../services/promptAssemblyService';
import { resolveAgentId } from '../services/agentResolver';
import { mustResolveAgentKey } from '../utils/mapping';
import { handleTherapyEvaluation } from '../services/therapy/evaluation';
// Legacy: aiChatService (LocalAI) - replaced by OpenAI direct calls

// Session state management for preventing duplicate sessions
type SessionState = {
  active: boolean;
};

const sessions = new Map<string, SessionState>();

function getSessionState(sessionId: string): SessionState {
  let s = sessions.get(sessionId);
  if (!s) {
    s = { active: false };
    sessions.set(sessionId, s);
  }
  return s;
}

// Helper functions for conversation history cleaning
function cleanHistoryLine(s: string): string {
  // Remove stage directions in (), [], or *...*
  s = s.replace(/\(.*?\)|\[.*?\]|\*.*?\*/g, ' ');
  // Remove speaker labels like "Holmes:" / "Seraphina:" at start
  s = s.replace(/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?:\s*/, '');
  // Remove "He thinks:", "She says:", etc patterns
  s = s.replace(/^(He|She|They)\s+(thinks?|says?|responds?):.*?-\s*/gi, '');
  // Remove quotes at start/end
  s = s.replace(/^["""]+|["""]+$/g, '');
  // Collapse whitespace
  return s.replace(/\s+/g, ' ').trim();
}

function buildCleanHistory(messages: Array<{role: string, content: string}>): string {
  // --- HARDENED LOGGING ---
  console.log(`[HISTORY DEBUG] buildCleanHistory received ${messages.length} total messages.`);

  // Log the content of the last 4 messages BEFORE slicing to see what we have.
  if (messages.length > 0) {
    console.log('[HISTORY DEBUG] Last 4 messages received:');
    messages.slice(-4).forEach((msg, index) => {
      console.log(`  - Msg ${messages.length - 4 + index + 1}: Role=${msg.role}, Content="${(msg.content || '').substring(0, 50)}..."`);
    });
  }
  // --- END LOGGING ---

  const last = messages.slice(-4).map(m => cleanHistoryLine(m.content || ''));

  // --- HARDENED LOGGING ---
  console.log(`[HISTORY DEBUG] Sliced down to ${last.length} messages for the final prompt.`);
  // --- END LOGGING ---

  // No quotes, no "X said:", no colons that invite copying
  return 'RECENT POINTS (do not copy this format):\n' + last.filter(l => l.length > 0).map(l => `• ${l}`).join('\n');
}

function sanitizeTherapyReply(text: string): string {
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
// Analysis agent removed - judges do analysis internally

console.log('[FINANCIAL][BOOT] ECS_VERSION =', ECS_VERSION);
import dbAdapter from '../services/databaseAdapter';
import { query } from '../database/index';

const router = express.Router();

// ========== MEMORY SYSTEM HELPERS ==========

// Helper functions for memory system
function normalizeSessionId(raw?: string): string {
  if (!raw) return '';
  if (raw.startsWith('bw:')) {
    const parts = raw.split(':'); // ["bw", "<agentKey>", "<sid>"]
    return parts.slice(2).join(':') || '';
  }
  return raw;
}

// Accept hints from several request fields; classify domain type
function detectDomain(body: any): 'performance' | 'personal_problems' | 'financial' | 'therapy' | 'group_therapy' | 'group_activities' | 'equipment' | 'skills' | 'powers' | 'spells' | 'kitchen_table' | 'confessional' | 'real_estate' | 'training' | 'battle' | 'message_board' | 'drama_board' | 'social_lounge' | 'progression' | 'magic' {
  const cands = [
    body?.domain,
    body?.meta?.domain,
    body?.meta?.domainSpecific,
    body?.chatType,
    // Extract domain from chatId format: therapy:usercharId or chat:equipment:usercharId:uuid
    body?.chatId?.split(':')?.[0], // First part for therapy:userchar format
    body?.chatId?.split(':')?.[1], // Second part for chat:domain:userchar format
    // Force therapy domain for therapy agents and judges
    ['zxk14bw7', 'carl_jung', 'seraphina', 'eleanor_roosevelt', 'king_solomon', 'anubis'].includes(body?.agentKey) ? 'therapy' : null,
  ].filter(Boolean).map((s: string) => String(s).toLowerCase());
  
  console.log('🔍 [DOMAIN-DETECT] candidates:', cands, 'from body:', { domain: body?.domain, chatType: body?.chatType, chatId: body?.chatId });
  
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
    console.log('🔍 [DOMAIN-DETECT] result: skills');
    return 'skills';
  }
  if (cands.some((s) => s.includes('powers') || s.includes('power'))) {
    console.log('🔍 [DOMAIN-DETECT] result: powers');
    return 'powers';
  }
  if (cands.some((s) => s.includes('spells') || s.includes('spell') || s.includes('magic'))) {
    console.log('🔍 [DOMAIN-DETECT] result: spells');
    return 'spells';
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
  if (cands.some((s) => s.includes('social_lounge') || s.includes('social lounge') || s.includes('social'))) {
    console.log('🔍 [DOMAIN-DETECT] result: social_lounge');
    return 'social_lounge';
  }
  console.error('❌ [DOMAIN-DETECT] FAILED - no domain matched, candidates:', cands);
  throw new Error(`Domain detection failed - no valid domain found in candidates: ${JSON.stringify(cands)}`);
}

// systemFor function removed - was source of contamination and TypeScript errors
// Financial system will be rebuilt to match therapy's clean architecture later
function modelCtx(_agentKey: string): number { return 4096; }
async function maybePrevAssistant(_sid: string): Promise<string | undefined> { return undefined; }

// Initialize OpenAI client with cleaned API key (prevents header errors from whitespace)
const cleanApiKey = process.env.OPENAI_API_KEY?.replace(/\s/g, '').trim();
const openai = new OpenAI({ apiKey: cleanApiKey });

// 1. FINANCIAL DOMAIN HANDLER
async function handleFinancialRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('💰 FINANCIAL: Processing financial request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;
    let characterName = '';

    // Get userId from usercharId
    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    // Get roommates (exclude current character)
    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    // Get financial data
    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Get character name for stop tokens
    const charResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = $1',
      [usercharId]
    );
    characterName = charResult.rows[0]?.name || 'Character';

    // Get memory context
    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['financial', 'social'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[FINANCIAL][MEMORY] timeout', e?.message);
    }

    // Build conversation history
    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    // Get user's active team from teams table (matching therapy pattern)
    let actualTeamId: string | null = null;
    try {
      const teamResult = await dbAdapter.query(
        'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
        [actualUserId]
      );
      actualTeamId = teamResult.rows[0]?.id;
      console.log('💰 [FINANCIAL-TEAM-FETCH] Resolved team_id:', actualTeamId, 'for user:', actualUserId);

      if (!actualTeamId) {
        console.error('🚨 STRICT MODE: No active team found for user:', actualUserId);
        throw new Error(`STRICT MODE: No active team set for user: ${actualUserId}`);
      }
    } catch (error) {
      console.error('💰 [FINANCIAL-TEAM-FETCH] Error fetching team:', error);
      throw error; // NO FALLBACK - fail loudly
    }

    // Assemble prompt with team data (now matching therapy system!)
    const finalPrompt = await assembleFinancialPromptUniversal(
      agentKey,
      roommates,
      memorySection,
      conversationHistory,
      message,
      'financial',
      wallet,
      debt,
      actualUserId,
      {}, // financialSessionState
      actualTeamId, // Pass actual team_id for rich environmental context
      usercharId // Pass usercharId for sleeping arrangement lookup
    );

    const stopTokens = [
      "\n\n",
      "Financial Session:",
      "Scene:"
    ];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // COMMENTED OUT - LocalAI (for restoration when scale justifies GPU ~200 daily users)
    // const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
    // const localaiEndpoint = `${LOCALAI_URL}/v1/chat/completions`;
    // console.log('[FINANCIAL] Calling LocalAI endpoint:', localaiEndpoint);
    // const llamaResponse = await axios.post(localaiEndpoint, {
    //   model: process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct',
    //   messages: [{ role: 'user', content: finalPrompt }],
    //   temperature: 0.7,
    //   frequency_penalty: 0.4,
    //   stop: uniqueStopTokens
    // }, {
    //   timeout: 120000,
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // let responseText = llamaResponse.data.choices[0].message.content.trim();

    // PRODUCTION - OpenAI API
    console.log('[FINANCIAL] Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[FINANCIAL] OpenAI response length:', responseText.length);

    // Memory patching
    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
      await writeFinancialPatch({ sid, modelText: responseText, state: store, characterId: canonicalId });
    } catch (e) {
      console.warn('[FINANCIAL][memory] patch failed (non-fatal):', e);
    }

    // Turn counting
    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'financial',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handleEquipmentRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('⚔️ EQUIPMENT: Processing equipment request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Get user's active team from teams table
    let actualTeamId: string | null = null;
    try {
      const teamResult = await dbAdapter.query(
        'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
        [actualUserId]
      );
      actualTeamId = teamResult.rows[0]?.id;
      console.log('⚔️ [EQUIPMENT-TEAM-FETCH] Resolved team_id:', actualTeamId, 'for user:', actualUserId);

      if (!actualTeamId) {
        console.error('🚨 STRICT MODE: No active team found for user:', actualUserId);
        throw new Error(`STRICT MODE: No active team set for user: ${actualUserId}`);
      }
    } catch (error) {
      console.error('⚔️ [EQUIPMENT-TEAM-FETCH] Error fetching team:', error);
      throw error; // NO FALLBACK - fail loudly
    }

    // Get teammates from the active team (now stored in teams table, not team_context)
    const teamSlotsResult = await dbAdapter.query(
      'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
      [actualTeamId]
    );
    if (teamSlotsResult.rows.length > 0) {
      const teammateIds = [
        teamSlotsResult.rows[0].character_slot_1,
        teamSlotsResult.rows[0].character_slot_2,
        teamSlotsResult.rows[0].character_slot_3
      ].filter(id => id && id !== usercharId); // Exclude current character and null slots

      if (teammateIds.length > 0) {
        const teammateResult = await dbAdapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
          [teammateIds]
        );
        teammates = teammateResult.rows.map((row: any) => row.name);
      }
    }

    // Fetch character data including equipment preferences
    const characterResult = await dbAdapter.query(
      'SELECT name, weapon_proficiencies, preferred_weapons, armor_proficiency, preferred_armor_type, equipment_notes FROM characters WHERE id = $1',
      [canonicalId]
    );
    const characterName = characterResult.rows[0]?.name || canonicalId;
    const equipmentPrefs = {
      weaponProfs: characterResult.rows[0]?.weapon_proficiencies || [],
      preferredWeapons: characterResult.rows[0]?.preferred_weapons || [],
      armorProf: characterResult.rows[0]?.armor_proficiency || 'all',
      preferredArmor: characterResult.rows[0]?.preferred_armor_type || 'medium',
      notes: characterResult.rows[0]?.equipment_notes || ''
    };

    const equipmentResult = await dbAdapter.query(
      'SELECT * FROM equipment WHERE restricted_to_character = $1 OR restricted_to_character = ANY($2) ORDER BY rarity, required_level',
      ['universal', [canonicalId, characterName]]
    );
    const availableEquipment = equipmentResult.rows;
    console.log(`⚔️ EQUIPMENT: Loaded ${availableEquipment.length} equipment items for ${canonicalId}`);

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['equipment', 'social', 'battle'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[EQUIPMENT][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleEquipmentPromptUniversal(
      agentKey,
      roommates,
      teammates,
      availableEquipment,
      memorySection,
      conversationHistory,
      message,
      'equipment_consultation',
      wallet,
      debt,
      actualTeamId,
      usercharId,
      equipmentPrefs
    );

    const stopTokens = ["\n\n"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // COMMENTED OUT - LocalAI (for restoration when scale justifies GPU ~200 daily users)
    // const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
    // const localaiEndpoint = `${LOCALAI_URL}/v1/chat/completions`;
    // console.log('[EQUIPMENT] Calling LocalAI endpoint:', localaiEndpoint);
    // const llamaResponse = await axios.post(localaiEndpoint, {
    //   model: process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct',
    //   messages: [{ role: 'user', content: finalPrompt }],
    //   temperature: 0.7,
    //   frequency_penalty: 0.4,
    //   stop: uniqueStopTokens
    // }, {
    //   timeout: 60000,
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // let responseText = llamaResponse.data.choices[0].message.content.trim();

    // PRODUCTION - OpenAI API
    console.log('[EQUIPMENT] Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[EQUIPMENT] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[EQUIPMENT][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'equipment',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handleSkillsRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('🎯 SKILLS: Processing skills request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Get user's active team from teams table
    const teamResult = await dbAdapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actualUserId]
    );
    const actualTeamId = teamResult.rows[0]?.id;
    if (!actualTeamId) {
      throw new Error(`No active team set for user: ${actualUserId}`);
    }
    console.log('🎯 [SKILLS-TEAM-FETCH] Using team_id:', actualTeamId);

    // Get teammates from the active team (now stored in teams table, not team_context)
    const teamSlotsResult = await dbAdapter.query(
      'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
      [actualTeamId]
    );
    if (teamSlotsResult.rows.length > 0) {
      const teammateIds = [
        teamSlotsResult.rows[0].character_slot_1,
        teamSlotsResult.rows[0].character_slot_2,
        teamSlotsResult.rows[0].character_slot_3
      ].filter(id => id && id !== usercharId); // Exclude current character and null slots

      if (teammateIds.length > 0) {
        const teammateResult = await dbAdapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
          [teammateIds]
        );
        teammates = teammateResult.rows.map((row: any) => row.name);
      }
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['skills', 'training', 'battle'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[SKILLS][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleSkillsPromptUniversal(
      agentKey,
      roommates,
      teammates,
      memorySection,
      conversationHistory,
      message,
      'skills_development',
      wallet,
      debt,
      actualTeamId, // Pass actual team_id, not userId
      usercharId // Pass usercharId for sleeping arrangement lookup
    );

    const stopTokens = ["\n\n"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // COMMENTED OUT - LocalAI (for restoration when scale justifies GPU ~200 daily users)
    // const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
    // const localaiEndpoint = `${LOCALAI_URL}/v1/chat/completions`;
    // console.log('[SKILLS] Calling LocalAI endpoint:', localaiEndpoint);
    // const llamaResponse = await axios.post(localaiEndpoint, {
    //   model: process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct',
    //   messages: [{ role: 'user', content: finalPrompt }],
    //   temperature: 0.7,
    //   frequency_penalty: 0.4,
    //   stop: uniqueStopTokens
    // }, {
    //   timeout: 60000,
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // let responseText = llamaResponse.data.choices[0].message.content.trim();

    // PRODUCTION - OpenAI API
    console.log('[SKILLS] Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[SKILLS] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[SKILLS][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'skills',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handleKitchenTableRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('🍽️ KITCHEN_TABLE: Processing kitchen table request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;
    let characterName = '';

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    // Get roommates (exclude the current character)
    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Get character name for stop tokens
    const charResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = $1',
      [usercharId]
    );
    characterName = charResult.rows[0]?.name || 'Character';

    // Get user's active team from teams table (optional for kitchen conversations)
    const teamResult = await dbAdapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actualUserId]
    );
    const actualTeamId = teamResult.rows[0]?.id;

    // Kitchen conversations work with roommates even without an active team
    if (actualTeamId) {
      console.log('🍽️ [KITCHEN_TABLE-TEAM-FETCH] Using team_id:', actualTeamId);

      // Get teammates from the active team (now stored in teams table, not team_context)
      const teamSlotsResult = await dbAdapter.query(
        'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
        [actualTeamId]
      );
      if (teamSlotsResult.rows.length > 0) {
        const teammateIds = [
          teamSlotsResult.rows[0].character_slot_1,
          teamSlotsResult.rows[0].character_slot_2,
          teamSlotsResult.rows[0].character_slot_3
        ].filter(id => id && id !== usercharId); // Exclude current character and null slots

        if (teammateIds.length > 0) {
          const teammateResult = await dbAdapter.query(
            'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
            [teammateIds]
          );
          teammates = teammateResult.rows.map((row: any) => row.name);
        }
      }
    } else {
      console.log('🍽️ [KITCHEN_TABLE] No active team - using roommates only');
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['kitchen', 'social', 'conflict'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[KITCHEN_TABLE][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    // Fetch hq_tier, calculate dynamic time_of_day and scene_type
    const teamContextResult = await dbAdapter.query(
      'SELECT hq_tier FROM team_context WHERE team_id = $1',
      [actualTeamId]
    );
    const hqTier = teamContextResult.rows[0]?.hq_tier;
    if (!hqTier) {
      throw new Error(`STRICT MODE: No hq_tier found for team ${actualTeamId}`);
    }

    // Calculate dynamic values
    const { calculateTimeOfDay, calculateSceneType } = await import('../services/sceneCalculationService');
    const timeOfDay = await calculateTimeOfDay(actualUserId);
    const sceneType = await calculateSceneType(actualTeamId);

    // Fetch sleeping arrangement
    const sleepingResult = await dbAdapter.query(
      'SELECT sleeping_arrangement FROM user_characters WHERE id = $1',
      [usercharId]
    );
    const sleepingArrangement = sleepingResult.rows[0]?.sleeping_arrangement;
    const sleepingContext = {
      sleepsOnFloor: sleepingArrangement === 'floor',
      sleepsOnCouch: sleepingArrangement === 'couch',
      sleepsUnderTable: sleepingArrangement === 'under_table' || sleepingArrangement === 'coffin',
      roomOvercrowded: roommates.length > 4,
      floorSleeperCount: 0,
      roommateCount: roommates.length
    };

    const finalPrompt = await assembleKitchenTablePromptUniversal(
      agentKey,
      roommates,
      teammates,
      memorySection,
      conversationHistory,
      message,
      'kitchen_table',
      wallet,
      debt,
      actualTeamId, // Pass actual team_id, not userId
      usercharId, // Pass usercharId for sleeping arrangement lookup
      hqTier,
      sceneType,
      timeOfDay,
      sleepingContext
    );

    // Build stop tokens to prevent excessive generation
    const stopTokens = [
      "\n\n",
      `${characterName}:`,
      ...roommates.map(name => `${name}:`),
      "Kitchen Table:",
      "Scene:"
    ];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[KITCHEN_TABLE] Calling OpenAI API');
    console.log('[KITCHEN_TABLE] Prompt length:', finalPrompt.length);
    console.log('[KITCHEN_TABLE] Stop tokens:', uniqueStopTokens);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[KITCHEN_TABLE] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[KITCHEN_TABLE][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'kitchen_table',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handleTrainingRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('🏋️ TRAINING: Processing training request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['training', 'skills', 'battle'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[TRAINING][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleTrainingPromptUniversal(
      agentKey,
      roommates,
      memorySection,
      conversationHistory,
      message,
      'training',
      wallet,
      debt,
      actualUserId
    );

    const stopTokens = ["\n\n"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[TRAINING] Calling OpenAI API');
    console.log('[TRAINING] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[TRAINING] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[TRAINING][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'training',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handlePowersRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('⚡ POWERS: Processing powers request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    // Get teammates
    const teammateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    teammates = teammateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Query powers data from database
    const unlockedPowersResult = await dbAdapter.query(`
      SELECT cp.id, pd.name, pd.tier, cp.current_rank, pd.max_rank, pd.category, pd.description
      FROM character_powers cp
      JOIN power_definitions pd ON cp.power_id = pd.id
      WHERE cp.character_id = $1 AND cp.unlocked = true
      ORDER BY pd.tier, pd.name
    `, [usercharId]);

    const availablePowersResult = await dbAdapter.query(`
      SELECT pd.id, pd.name, pd.tier, pd.unlock_cost, pd.unlock_level, pd.archetype, pd.species, pd.description
      FROM power_definitions pd
      WHERE pd.id NOT IN (
        SELECT power_id FROM character_powers WHERE character_id = $1 AND unlocked = true
      )
      AND (pd.unlock_level IS NULL OR pd.unlock_level <= $2)
      ORDER BY pd.tier, pd.unlock_level, pd.name
      LIMIT 20
    `, [usercharId, character?.level || 1]);

    const powersData = {
      characterPoints: character?.character_points || 0,
      level: character?.level || 1,
      unlockedPowers: unlockedPowersResult.rows,
      availablePowers: availablePowersResult.rows
    };

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['powers', 'skills', 'battle'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[POWERS][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assemblePowersPromptUniversal(
      agentKey,
      roommates,
      teammates,
      memorySection,
      conversationHistory,
      message,
      'powers',
      wallet,
      debt,
      actualUserId,
      usercharId,
      powersData
    );

    const stopTokens = ["\n\n", "Powers:", "Scene:"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    console.log('[POWERS] Calling OpenAI API');
    console.log('[POWERS] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[POWERS] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[POWERS][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'powers',
        promptLength: finalPrompt.length,
        responseLength: responseText.length,
        characterPoints: powersData.characterPoints,
        unlockedCount: powersData.unlockedPowers.length
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
async function handleSpellsRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('🔮 SPELLS: Processing spells request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    // Get teammates
    const teammateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    teammates = teammateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Query spells data from database
    const learnedSpellsResult = await dbAdapter.query(`
      SELECT us.id, sd.name, sd.tier, us.proficiency_level, us.times_used, sd.description, sd.school
      FROM user_spells us
      JOIN spell_definitions sd ON us.spell_id = sd.id
      WHERE us.user_id = $1 AND us.is_learned = true
      ORDER BY sd.tier, sd.name
    `, [actualUserId]);

    const availableSpellsResult = await dbAdapter.query(`
      SELECT sd.id, sd.name, sd.tier, sd.unlock_cost, sd.unlock_level, sd.school, sd.description
      FROM spell_definitions sd
      WHERE sd.id NOT IN (
        SELECT spell_id FROM user_spells WHERE user_id = $1 AND is_learned = true
      )
      AND (sd.unlock_level IS NULL OR sd.unlock_level <= $2)
      ORDER BY sd.tier, sd.unlock_level, sd.name
      LIMIT 20
    `, [actualUserId, character?.level || 1]);

    const spellsData = {
      characterPoints: character?.character_points || 0,
      level: character?.level || 1,
      learnedSpells: learnedSpellsResult.rows,
      availableSpells: availableSpellsResult.rows
    };

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['spells', 'magic', 'battle'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[SPELLS][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleSpellsPromptUniversal(
      agentKey,
      roommates,
      teammates,
      memorySection,
      conversationHistory,
      message,
      'spells',
      wallet,
      debt,
      actualUserId,
      usercharId,
      spellsData
    );

    const stopTokens = ["\n\n", "Spells:", "Scene:"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    console.log('[SPELLS] Calling OpenAI API');
    console.log('[SPELLS] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[SPELLS] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[SPELLS][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'spells',
        promptLength: finalPrompt.length,
        responseLength: responseText.length,
        characterPoints: spellsData.characterPoints,
        learnedCount: spellsData.learnedSpells.length
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

// PROGRESSION DOMAIN HANDLER
async function handleProgressionRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('📈 PROGRESSION: Processing progression request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    const { assembleProgressionPromptUniversal } = require('../services/promptAssemblyService');
    const { executeProgressionIntent } = require('../services/progressionIntentService');

    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const teammateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    teammates = teammateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Query progression-specific data
    const progressionData = {
      level: character?.level || 1,
      experience: character?.experience || 0,
      totalBattles: character?.total_battles || 0,
      totalWins: character?.total_wins || 0,
      bondLevel: character?.bond_level || 0,
      acquiredAt: character?.acquired_at,
      recentDecisions: character?.recentDecisions || []
    };

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['progression', 'journey', 'goals'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[PROGRESSION][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleProgressionPromptUniversal(
      agentKey,
      roommates,
      teammates,
      memorySection,
      conversationHistory,
      message,
      'progression',
      wallet,
      debt,
      actualUserId,
      usercharId,
      progressionData
    );

    const stopTokens = ["\n\n", "Progression:", "Scene:"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    console.log('[PROGRESSION] Calling OpenAI API');
    console.log('[PROGRESSION] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      response_format: { type: "json_object" },
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[PROGRESSION] OpenAI response length:', responseText.length);

    // Parse structured response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      console.warn('[PROGRESSION] JSON parse failed, treating as pure dialogue');
      parsedResponse = { dialogue: responseText, intent: null };
    }

    // Execute intent if present
    if (parsedResponse.intent) {
      console.log('[PROGRESSION] Intent detected:', parsedResponse.intent.type);
      try {
        await executeProgressionIntent(usercharId, parsedResponse.intent, {
          userId: actualUserId,
          characterName: agentKey
        });
      } catch (intentError: any) {
        console.error('[PROGRESSION] Intent execution failed:', intentError.message);
      }
    }

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[PROGRESSION][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    return res.json({
      ok: true,
      text: parsedResponse.dialogue || parsedResponse.text || responseText,
      intent: parsedResponse.intent || null,
      turnNumber,
      metadata: {
        domain: 'progression',
        promptLength: finalPrompt.length,
        responseLength: responseText.length,
        level: progressionData.level,
        experience: progressionData.experience
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
async function handleRealEstateRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string }) {
  const { sid, agentKey, effectiveCharacterId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('🏠 REAL_ESTATE: Processing real estate request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roster: string[] = [];
    let coachWallet = 0;
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get coach's wallet from users table
    const coachResult = await dbAdapter.query(
      'SELECT coins FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    coachWallet = coachResult.rows[0]?.coins || 0;

    // Get coach's roster (all their characters)
    const rosterResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1',
      [userId]
    );
    roster = rosterResult.rows.map((row: any) => row.name);

    // Memory context for coach's real estate consultations
    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: userId,
          partnerCharacterId: agentKey,
          domains: ['real_estate', 'financial', 'social'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[REAL_ESTATE][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleRealEstatePromptUniversal(
      agentKey,
      roster,
      memorySection,
      conversationHistory,
      message,
      'real_estate',
      coachWallet,
      0,
      userId
    );

    const stopTokens = ["\n\n"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[REAL_ESTATE] Calling OpenAI API');
    console.log('[REAL_ESTATE] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[REAL_ESTATE] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[REAL_ESTATE][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'real_estate',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handleSocialLoungeRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('🎭 SOCIAL_LOUNGE: Processing social lounge request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['social', 'conflict'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[SOCIAL_LOUNGE][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleSocialLoungePromptUniversal(
      agentKey,
      roommates,
      memorySection,
      conversationHistory,
      message,
      'social_lounge',
      wallet,
      debt,
      actualUserId
    );

    const stopTokens = ["\n\n"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[SOCIAL_LOUNGE] Calling OpenAI API');
    console.log('[SOCIAL_LOUNGE] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[SOCIAL_LOUNGE] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[SOCIAL_LOUNGE][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'social_lounge',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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

// 8. MESSAGE_BOARD DOMAIN HANDLER
async function handleMessageBoardRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('📋 MESSAGE_BOARD: Processing message board request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['message_board', 'social', 'battle'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[MESSAGE_BOARD][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleMessageBoardPromptUniversal(
      agentKey,
      roommates,
      memorySection,
      conversationHistory,
      message,
      'message_board',
      wallet,
      debt,
      actualUserId
    );

    const stopTokens = ["\n\n"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[MESSAGE_BOARD] Calling OpenAI API');
    console.log('[MESSAGE_BOARD] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[MESSAGE_BOARD] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[MESSAGE_BOARD][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'message_board',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handleGroupActivitiesRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('👥 GROUP_ACTIVITIES: Processing group activities request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['group_activities', 'social'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[GROUP_ACTIVITIES][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleGroupActivitiesPromptUniversal(
      agentKey,
      roommates,
      memorySection,
      conversationHistory,
      message,
      'group_activities',
      wallet,
      debt,
      actualUserId
    );

    const stopTokens = ["\n\n"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[GROUP_ACTIVITIES] Calling OpenAI API');
    console.log('[GROUP_ACTIVITIES] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[GROUP_ACTIVITIES] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[GROUP_ACTIVITIES][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'group_activities',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handlePerformanceRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  const t0 = Date.now();
    console.log('⭐ PERFORMANCE: Processing performance request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['performance', 'battle', 'training'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[PERFORMANCE][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assemblePerformancePromptUniversal(
      agentKey,
      roommates,
      memorySection,
      conversationHistory,
      message,
      'performance',
      wallet,
      debt,
      actualUserId,
      usercharId
    );

    const stopTokens = [
      "\n\n",
      "Performance:",
      "Scene:"
    ];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[PERFORMANCE] Calling OpenAI API');
    console.log('[PERFORMANCE] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[PERFORMANCE] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[PERFORMANCE][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

  log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

  return res.json({
    ok: true,
    text: responseText,
    turnNumber,
    metadata: {
      domain: 'performance',
      promptLength: finalPrompt.length,
      responseLength: responseText.length
    }
  });
}

// 11. PERSONAL_PROBLEMS DOMAIN HANDLER
async function handlePersonalProblemsRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('💭 PERSONAL_PROBLEMS: Processing personal problems request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['personal_problems', 'social', 'therapy'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[PERSONAL_PROBLEMS][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    // Extract and validate personalProblem from request
    const personalProblem = req.body?.meta?.personalProblem || req.body?.personalProblem;
    if (!personalProblem || !personalProblem.problem || !personalProblem.intro) {
      console.error('[PERSONAL_PROBLEMS] Missing required personalProblem in request');
      return res.status(400).json({
        ok: false,
        error: 'Personal problem context is required. Problem must include both problem and intro fields.'
      });
    }

    const finalPrompt = await assemblePersonalProblemsPromptUniversal(
      agentKey,
      roommates,
      memorySection,
      conversationHistory,
      message,
      'personal_problems',
      wallet,
      debt,
      actualUserId,
      personalProblem
    );

    const stopTokens = [
      "\n\n",
      "Personal Problems:",
      "Scene:"
    ];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[PERSONAL_PROBLEMS] Calling OpenAI API');
    console.log('[PERSONAL_PROBLEMS] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[PERSONAL_PROBLEMS] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[PERSONAL_PROBLEMS][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'personal_problems',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handleBattleRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('⚔️ BATTLE: Processing battle request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let teammates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Get user's active team from teams table
    const teamResult = await dbAdapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actualUserId]
    );
    const actualTeamId = teamResult.rows[0]?.id;
    if (!actualTeamId) {
      throw new Error(`No active team set for user: ${actualUserId}`);
    }
    console.log('⚔️ [BATTLE-TEAM-FETCH] Using team_id:', actualTeamId);

    // Get teammates from the active team (now stored in teams table, not team_context)
    const teamSlotsResult = await dbAdapter.query(
      'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
      [actualTeamId]
    );
    if (teamSlotsResult.rows.length > 0) {
      const teammateIds = [
        teamSlotsResult.rows[0].character_slot_1,
        teamSlotsResult.rows[0].character_slot_2,
        teamSlotsResult.rows[0].character_slot_3
      ].filter(id => id && id !== usercharId); // Exclude current character and null slots

      if (teammateIds.length > 0) {
        const teammateResult = await dbAdapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
          [teammateIds]
        );
        teammates = teammateResult.rows.map((row: any) => row.name);
      }
    }

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['battle', 'training', 'equipment'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[BATTLE][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleBattlePromptUniversal(
      agentKey,
      roommates,
      teammates,
      memorySection,
      conversationHistory,
      message,
      'battle',
      wallet,
      debt,
      actualTeamId, // Pass actual team_id, not userId
      usercharId // Pass usercharId for sleeping arrangement lookup
    );

    const stopTokens = [
      "\n\n",
      "Battle:",
      "Scene:"
    ];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[BATTLE] Calling OpenAI API');
    console.log('[BATTLE] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[BATTLE] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[BATTLE][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'battle',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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
async function handleDramaBoardRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;

  try {
    const t0 = Date.now();
    console.log('🎬 DRAMA_BOARD: Processing drama board request with dedicated handler');

    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
    }

    // Get user's active team from teams table
    const teamResult = await dbAdapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actualUserId]
    );
    const actualTeamId = teamResult.rows[0]?.id;
    if (!actualTeamId) {
      throw new Error(`No active team set for user: ${actualUserId}`);
    }
    console.log('🎬 [DRAMA_BOARD-TEAM-FETCH] Using team_id:', actualTeamId);

    let memorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: usercharId,
          domains: ['drama_board', 'social', 'conflict'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      memorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[DRAMA_BOARD][MEMORY] timeout', e?.message);
    }

    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    const message = String(req.body?.message ?? '');

    const finalPrompt = await assembleDramaBoardPromptUniversal(
      agentKey,
      roommates,
      memorySection,
      conversationHistory,
      message,
      'drama_board',
      wallet,
      debt,
      actualTeamId, // Pass actual team_id, not userId
      usercharId // Pass usercharId for sleeping arrangement lookup
    );

    const stopTokens = [
      "\n\n",
      "Drama Board:",
      "Scene:"
    ];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('[DRAMA_BOARD] Calling OpenAI API');
    console.log('[DRAMA_BOARD] Prompt length:', finalPrompt.length);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[DRAMA_BOARD] OpenAI response length:', responseText.length);

    try {
      const store = new PgMemoryStore();
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
    } catch (e) {
      console.warn('[DRAMA_BOARD][memory] patch failed (non-fatal):', e);
    }

    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0];
    const { query } = require('../database/postgres');

    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count)
      VALUES ($1, 1)
      ON CONFLICT (chat_id)
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);

    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;

    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);

    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );

    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });

    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      metadata: {
        domain: 'drama_board',
        promptLength: finalPrompt.length,
        responseLength: responseText.length
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

async function handleGroupTherapyRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  console.log('🟢 HANDLEGROUPTHERAPYREQUEST ENTRY');
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;
  const speakerId = agentKey;

  try {
    const t0 = Date.now();
    console.log('🎭 GROUP_THERAPY: Processing group therapy request with dedicated handler');

    const therapistId = req.body?.therapistId;
    const role = (speakerId === therapistId) ? 'therapist' : 'patient';

    console.log('🔥 [GROUP-THERAPY-DEBUG] speaker=', speakerId, ' canonical=', canonicalId, ' therapist=', therapistId, ' role=', role);

    const sessionId = req.body?.sessionId || sid;
    if (sessionId && sessions.has(sessionId)) {
      console.log('🧹 [SESSION-CLEANUP] Clearing stale session state for:', sessionId);
      sessions.delete(sessionId);
    }

    const { dbAdapter } = require('../services/databaseAdapter');
    const participantIds = req.body?.participantIds;

    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      throw new Error('Group therapy requires at least 2 participantIds');
    }

    console.log('🎭 GROUP_THERAPY: Querying data for', participantIds.length, 'participants');

    // Get userId from first participant
    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [participantIds[0]]
    );
    const actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for participant: ${participantIds[0]}`);
    }

    // Get roommates
    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1',
      [actualUserId]
    );
    const roommates = roommateResult.rows.map((row: any) => row.name);

    // Get team data
    const teamResult = await dbAdapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actualUserId]
    );
    const actualTeamId = teamResult.rows[0]?.id;
    if (!actualTeamId) {
      throw new Error(`No active team set for user: ${actualUserId}`);
    }

    // Get teammates
    let teammates: string[] = [];
    const teamSlotsResult = await dbAdapter.query(
      'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
      [actualTeamId]
    );
    if (teamSlotsResult.rows.length > 0) {
      const teammateIds = [
        teamSlotsResult.rows[0].character_slot_1,
        teamSlotsResult.rows[0].character_slot_2,
        teamSlotsResult.rows[0].character_slot_3
      ].filter((id: string) => id);

      if (teammateIds.length > 0) {
        const teammateResult = await dbAdapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
          [teammateIds]
        );
        teammates = teammateResult.rows.map((row: any) => row.name);
      }
    }

    // Query ALL participants' data
    const participantsData = await Promise.all(
      participantIds.map(async (pid: string) => {
        const char = await dbAdapter.userCharacters.findById(pid);
        if (!char) throw new Error(`Character not found: ${pid}`);

        // Get character template data
        const charTemplateResult = await dbAdapter.query(
          'SELECT name, archetype, species FROM characters WHERE id = $1',
          [char.character_id]
        );
        const charTemplate = charTemplateResult.rows[0];

        // Get battle record for this specific character (not coach's overall record)
        // Use the character's stored stats instead of querying battles table
        const wins = char.total_wins || 0;
        const losses = char.total_losses || 0;

        // Get conflicts
        let conflicts: string[] = [];
        try {
          const ConflictDatabaseService = require('../services/ConflictDatabaseService').default;
          const conflictService = ConflictDatabaseService.getInstance();
          const conflictData = conflictService.getConflictsByCharacter(pid);
          conflicts = conflictData.map((c: any) => c.target_name);
        } catch (e) {
          console.warn('Could not load conflicts for', pid);
        }

        return {
          id: pid,
          name: charTemplate?.name || char.name,
          archetype: charTemplate?.archetype,
          species: charTemplate?.species,
          level: char.level,
          wallet: char.wallet || 0,
          debt: char.debt || 0,
          monthlyEarnings: char.monthly_earnings || 0,
          financialStress: char.financial_stress || 50,
          wins: wins,
          losses: losses,
          conflicts: conflicts
        };
      })
    );

    console.log('🎭 GROUP_THERAPY DATA LOADED:', participantsData.map(p => `${p.name}: $${p.wallet}, ${p.wins}W-${p.losses}L`).join(' | '));

    // Get memory context
    let therapyMemorySection = '';
    try {
      const ecs = EventContextService.getInstance();
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: usercharId,
          partnerCharacterId: therapistId || usercharId,
          domains: ['therapy', 'group_therapy'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      therapyMemorySection = (result as any)?.text || '';
    } catch (e: any) {
      console.warn('[GROUP_THERAPY][MEMORY] timeout', e?.message);
    }

    // Build conversation history
    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
    }

    // Get patient name for prompt
    let patientName = '';
    let patientCharacterId = '';
    if (role === 'patient') {
      patientName = agentKey;
      const patientChar = await dbAdapter.userCharacters.findById(usercharId);
      patientCharacterId = patientChar?.character_id;
    } else {
      const character = await dbAdapter.userCharacters.findById(usercharId);
      if (character) {
        patientName = character.name;
        patientCharacterId = character.character_id;
      }
    }

    // Get patient species for therapist role
    let patientSpecies: string | undefined;
    if (role === 'therapist' && patientCharacterId) {
      const speciesResult = await query(
        'SELECT species FROM characters WHERE id = $1',
        [patientCharacterId]
      );
      patientSpecies = speciesResult.rows?.[0]?.species;
    }

    const intensityStrategy = req.body?.intensityStrategy as 'soft' | 'medium' | 'hard' | undefined;

    // Assemble group therapy prompt
    const finalPrompt = await assembleGroupTherapyPromptUniversal(
      agentKey,
      role as 'patient' | 'therapist',
      roommates,
      teammates,
      actualTeamId,
      usercharId,
      {
        therapistName: therapistId,
        patientName,
        patientCharacterId,
        patientSpecies,
        memory: therapyMemorySection,
        conversationHistory,
        intensityStrategy,
        groupParticipants: participantsData
      }
    );

    console.log('🎭 GROUP_THERAPY: Assembled prompt length:', finalPrompt.length);

    // Call OpenAI
    const safeUserMessage = finalPrompt;
    const stopTokens = ["\n\n", "Group Session:"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    console.log('[GROUP_THERAPY] Calling OpenAI API');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: safeUserMessage }],
      temperature: 0.7,
      max_tokens: 150,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = response.choices[0].message.content?.trim() || '';

    // Sanitize response
    responseText = sanitizeTherapyReply(responseText);

    console.log('🎭 GROUP_THERAPY: Response generated, length:', responseText.length);
    console.log('🎭 GROUP_THERAPY: Total time:', Date.now() - t0, 'ms');

    return res.json({ ok: true, text: responseText });

  } catch (err: any) {
    console.error('[GROUP_THERAPY_ERROR]', err?.stack || err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

async function handleTherapyRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  console.log('🟢 HANDLETHERAPYREQUEST ENTRY - This should ALWAYS appear');
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  const canonicalId = effectiveCharacterId;       // canonical character ID for this speaker
  const speakerId = agentKey;                     // who speaks THIS turn (the only model call)

  try {
    const t0 = Date.now(); // Start timing
    console.log('🎭 THERAPY: Processing therapy request with dedicated handler');
    console.log('🔥 [ID-DEBUG] canonicalId:', canonicalId);
    console.log('🔥 [ID-DEBUG] usercharId:', usercharId);
    console.log('🔥 [ID-DEBUG] speakerId:', speakerId);
    
    // Get therapistId from request body (sent by frontend)  
    const therapistId = req.body?.therapistId;
    
    // Determine role simply for prompt assembly (not for complex logic)
    const role = (speakerId === therapistId) ? 'therapist' : 'patient';
    
    console.log('🔥 [THERAPY-DEBUG] speaker=', speakerId, ' canonical=', canonicalId, ' therapist=', therapistId, ' role=', role);
    
    // DEBUG: Check what message and messages are being sent for therapist calls
    if (role === 'therapist') {
      console.log('🔍 [THERAPIST-PAYLOAD-DEBUG] message field length:', (req.body?.message || '').length);
      console.log('🔍 [THERAPIST-PAYLOAD-DEBUG] messages array length:', Array.isArray(req.body?.messages) ? req.body.messages.length : 'NOT_ARRAY');
      console.log('🔍 [THERAPIST-PAYLOAD-DEBUG] messages content (first 3):', req.body?.messages?.slice(0, 3));
    }
    
    // Session isolation - clear any stale session state 
    const sessionId = req.body?.sessionId || sid;
    if (sessionId && sessions.has(sessionId)) {
      console.log('🧹 [SESSION-CLEANUP] Clearing stale session state for:', sessionId);
      sessions.delete(sessionId);
    }
    
    // Fetch ALL character data from DB (no more frontend meta!)
    const { dbAdapter } = require('../services/databaseAdapter');
    let roommates: string[] = [];
    let therapistName = therapistId;
    let wallet = 0;
    let debt = 0;
    let actualUserId: string;

    try {
      // Get userId from usercharId since req.body.userId is undefined in therapy requests
      const userIdResult = await dbAdapter.query(
        'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
        [usercharId]
      );
      actualUserId = userIdResult.rows[0]?.user_id;
      
      if (!actualUserId) {
        throw new Error(`No user found for usercharId: ${usercharId}`);
      }
      
      console.log('🔍 [ROOMMATE DEBUG] Looking up roommates for usercharId:', usercharId, 'resolved userId:', actualUserId);
      
      if (actualUserId) {
        const roommateResult = await dbAdapter.query(
          'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
        );
        console.log('🔍 [ROOMMATE DEBUG] Query result:', roommateResult.rows);
        roommates = roommateResult.rows.map((row: any) => row.name);
      } else {
        console.log('🔍 [ROOMMATE DEBUG] Could not resolve userId from usercharId');
      }

      // Get financial data for the character
      const character = await dbAdapter.userCharacters.findById(usercharId);
      if (character) {
        wallet = character.wallet || 0;
        debt = character.debt || 0;
      }

      console.log('🔥 [DB-FETCH] Character data:', {
        roommates: roommates.length,
        roommateNames: roommates,
        wallet,
        debt
      });
    } catch (error) {
      console.error('🔥 [DB-FETCH] Error fetching character data:', error);
    }

    // Get user's active team from teams table
    let actualTeamId: string | null = null;
    let teammates: string[] = [];
    try {
      const teamResult = await dbAdapter.query(
        'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
        [actualUserId]
      );
      actualTeamId = teamResult.rows[0]?.id;
      console.log('🔥 [TEAM-FETCH] Resolved team_id:', actualTeamId, 'for user:', actualUserId);

      if (!actualTeamId) {
        console.error('🚨 STRICT MODE: No active team found for user:', actualUserId);
        throw new Error(`STRICT MODE: No active team set for user: ${actualUserId}`);
      }

      // Get teammates from the active team
      const teamSlotsResult = await dbAdapter.query(
        'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
        [actualTeamId]
      );
      if (teamSlotsResult.rows.length > 0) {
        const teammateIds = [
          teamSlotsResult.rows[0].character_slot_1,
          teamSlotsResult.rows[0].character_slot_2,
          teamSlotsResult.rows[0].character_slot_3
        ].filter(id => id && id !== usercharId); // Exclude current character and null slots

        if (teammateIds.length > 0) {
          const teammateResult = await dbAdapter.query(
            'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
            [teammateIds]
          );
          teammates = teammateResult.rows.map((row: any) => row.name);
        }
      }
    } catch (error) {
      console.error('🔥 [TEAM-FETCH] Error fetching team:', error);
      throw error; // NO FALLBACK - fail loudly
    }

    // Get therapy-specific memory context (USER-SCOPED: this user's therapy relationship with this therapist)
    let therapyMemorySection = '';
    // Create a unique therapy relationship ID to prevent cross-user contamination
    // Format: "therapy_relationship_{usercharId}_{therapistCanonicalId}"
    const therapyRelationshipId = `therapy_relationship_${usercharId}_${canonicalId}`;
    console.log(`🔍 [THERAPY-MEMORY] Using scoped relationship ID: ${therapyRelationshipId}`);
    
    try {
      const ecs = EventContextService.getInstance();
      
      const result = await Promise.race([
        ecs.buildMemoryContext({
          subjectCharacterId: therapyRelationshipId,  // Unique per user-therapist pairing
          partnerCharacterId: usercharId,            // For relevance filtering
          domains: ['therapy', 'social'],
          maxItems: 20,
          maxBytes: 2400,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10000)
        ),
      ]);
      therapyMemorySection = (result as any)?.text || '';
      console.log(`🔍 [THERAPY-MEMORY-DEBUG] buildMemoryContext returned ${therapyMemorySection.length} chars`);
    } catch (e: any) {
      console.warn('[THERAPY][MEMORY] timeout', e?.message);
    }

    // Build clean conversation history without quotes or stage directions
    let conversationHistory = '';
    if (Array.isArray(req.body?.messages)) {
      conversationHistory = buildCleanHistory(req.body.messages);
      console.log('🔍 [DEBUG] CONVERSATION HISTORY LENGTH:', conversationHistory.length);
      console.log('🔍 [DEBUG] MESSAGES ARRAY LENGTH:', req.body.messages.length);
      if (req.body.messages.length === 0) {
        console.log('🔍 [DEBUG] EMPTY MESSAGES ARRAY - Session start');
      }
    } else {
      console.log('🔍 [DEBUG] NO MESSAGES ARRAY PROVIDED');
      console.log('🔍 [DEBUG] agentKey:', req.body?.agentKey);
      console.log('🔍 [DEBUG] chatType:', req.body?.chatType);
    }

    // Assemble therapy prompt using single source of truth
    console.log('🔥 [ASSEMBLY-DEBUG] About to call assembleTherapyPromptUniversal');
    console.log('🔥 [ASSEMBLY-DEBUG] Parameters: agentKey=' + agentKey + ', role=' + role);

    // Get patient name from the character data we already fetched
    let patientName = '';
    if (role === 'patient') {
      patientName = agentKey; // When generating patient response, agentKey is the patient
    } else {
      // When generating therapist response, get patient name from DB
      try {
        const character = await dbAdapter.userCharacters.findById(usercharId);
        if (character && character.name) {
          patientName = character.name;
        } else if (character && character.character_id) {
          patientName = character.character_id;
        } else {
          // Extract name from usercharId as last resort
          patientName = usercharId.split('_').pop() || usercharId;
        }
      } catch (error) {
        console.error('🔥 [DB-FETCH] Error getting patient name:', error);
        patientName = usercharId; // Fallback to usercharId
      }
    }
    console.log('🔥 [PATIENT-NAME] Resolved patient name:', patientName);
    
    // Get patient's character ID from usercharId for species lookup
    let patientCharacterId = null;
    try {
      const patientCharResult = await dbAdapter.query(
        'SELECT character_id FROM user_characters WHERE id = $1',
        [usercharId]
      );
      patientCharacterId = patientCharResult.rows[0]?.character_id;
      console.log('🔥 [PATIENT-CHAR-ID] Resolved patient character ID:', patientCharacterId);
    } catch (error) {
      console.error('🔥 [PATIENT-CHAR-ID] Error getting patient character ID:', error);
    }
    
    // Extract intensity strategy from request body (passed by frontend)
    const intensityStrategy = req.body?.intensityStrategy as 'soft' | 'medium' | 'hard' | undefined;
    console.log('🎯 [INTENSITY-STRATEGY] Received from frontend:', intensityStrategy);
    
    const finalTherapyPrompt = await assembleTherapyPromptUniversal(
      agentKey,
      role as 'patient' | 'therapist', // Cast role for now, judges will be handled separately
      roommates,
      teammates, // Fetched from active team
      wallet,
      debt,
      actualTeamId, // Pass actual team_id, not userId
      usercharId, // Pass usercharId for sleeping arrangement lookup
      {
        therapistName,
        patientName,
        patientCharacterId,
        memory: therapyMemorySection,
        conversationHistory,
        intensityStrategy
      }
    );
    
    console.log('🔥 [ASSEMBLY-DEBUG] assembleTherapyPromptUniversal returned, length: ' + finalTherapyPrompt.length);
    console.log('🎭 THERAPY: Assembled prompt length (FROM HANDLETHERAPYREQUEST):', finalTherapyPrompt.length);
    console.log('🎭 THERAPY: Full prompt content:', JSON.stringify(finalTherapyPrompt));

    // Put the full prompt in the user message for LocalAI (not split between system + empty user)
    const safeUserMessage = finalTherapyPrompt;

    // Build dynamic stop tokens based on actual characters in conversation
    const stopTokens = [
      "\n\n",
      "Group Session:",
      `${agentKey}:`,           // Current speaker shouldn't label themselves
      `${therapistName}:`,      // Therapist name
      `${patientName}:`         // Patient name
    ];
    // Remove duplicates and filter out empty strings
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    // COMMENTED OUT - LocalAI (for restoration when scale justifies GPU ~200 daily users)
    // const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';
    // const localaiEndpoint = `${LOCALAI_URL}/v1/chat/completions`;
    // console.log('🚀 [LOCALAI] Making call to LocalAI server:', localaiEndpoint);
    // console.log('🚀 [LOCALAI] Prompt length:', finalTherapyPrompt.length);
    // console.log('🚀 [LOCALAI] User message:', safeUserMessage);
    // console.log('🚀 [LOCALAI] Stop tokens:', uniqueStopTokens);
    // console.log('🚀 [LOCALAI] FULL PROMPT CONTENT:');
    // console.log(finalTherapyPrompt);
    // console.log('🚀 [LOCALAI] END PROMPT CONTENT');
    // const requestPayload = {
    //   model: process.env.LOCALAI_MODEL || 'llama-3.2-3b-instruct',
    //   messages: [
    //     { role: 'user', content: safeUserMessage }
    //   ],
    //   // No max_tokens - let limitSentences() handle response length
    //   temperature: 0.7,
    //   frequency_penalty: 0.4, // reduce repetition
    //   stop: uniqueStopTokens
    // };
    // console.log('🚀 [LOCALAI] Full request payload:', JSON.stringify(requestPayload, null, 2));
    // const llamaResponse = await axios.post(localaiEndpoint, requestPayload, {
    //   timeout: 300000, // 5 minutes - LocalAI on CPU can be slow
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // console.log('🚨 [TEST] Got llama response, about to extract content');
    // let responseText;
    // try {
    //   responseText = llamaResponse.data.choices[0].message.content.trim();
    //   console.log('🚨 [TEST] Successfully extracted response text');
    // } catch (error) {
    //   console.error('🚨 [ERROR] Failed to extract response text:', error);
    //   console.error('🚨 [ERROR] Llama response structure:', JSON.stringify(llamaResponse.data, null, 2));
    //   throw error;
    // }
    // console.log('🚨 [DEBUG] Raw response from llama:', responseText.substring(0, 100));

    // PRODUCTION - OpenAI API
    console.log('🚀 [THERAPY] Calling OpenAI API');
    console.log('🚀 [THERAPY] Prompt length:', finalTherapyPrompt.length);
    console.log('🚀 [THERAPY] User message:', safeUserMessage);
    console.log('🚀 [THERAPY] Stop tokens:', uniqueStopTokens);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: safeUserMessage }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('✅ [THERAPY] OpenAI response received, length:', responseText.length);
    console.log('🚨 [DEBUG] Raw response from OpenAI:', responseText.substring(0, 100));
    
    // Apply comprehensive reply sanitizer
    responseText = sanitizeTherapyReply(responseText);
    console.log('🚨 [DEBUG] After sanitizeTherapyReply:', responseText.substring(0, 100));
    
    
    console.log('🎭 THERAPY: Direct llama-server response length:', responseText.length);
    console.log('🎯 EXECUTION PATH FOUND - This line definitely executes');
    console.log('🎭 THERAPY: Direct llama-server response content:', JSON.stringify(responseText));
    
    // Performance logging
    log.llmTiming({ sid, ms: Date.now() - t0, max_out: 100 });
    
    // Memory patching - save conversation to memory system
    try {
      const store = new PgMemoryStore();
      // Pre-write row so legacy NOT NULL passes
      await store.savePatch(sid, { usercharId, canonicalId }, { characterId: canonicalId });
      
      // Save therapy conversation to memory
      await writeTherapyPatch({ sid, modelText: responseText, state: store, characterId: canonicalId });
    } catch (e) {
      console.warn('[THERAPY][memory] patch failed (non-fatal):', e);
    }
    
    // ====================================================================
    // ANALYST + JUDGE WORKFLOW INTEGRATION
    // ====================================================================
    
    // After therapy response, analyze the patient's message for this turn
    const userMessage = req.body?.messages?.[req.body.messages.length - 1]?.content || req.body?.message || '';
    
    // Universal turn counting - dedicated counter system
    const chatId = req.body?.chatId || 'default_chat';
    const userId = req.user?.id || 'system';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const { query } = require('../database/postgres');
    
    // Increment chat session turn count
    await query(`
      INSERT INTO chat_sessions (chat_id, current_turn_count) 
      VALUES ($1, 1) 
      ON CONFLICT (chat_id) 
      DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1, 
                    updated_at = CURRENT_TIMESTAMP
    `, [chatId]);
    
    // Get the new turn number for this chat
    const chatTurnResult = await query(
      'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
      [chatId]
    );
    const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;
    
    // Update daily stats
    await query(`
      INSERT INTO user_daily_stats (user_id, date, daily_turn_count) 
      VALUES ($1, $2, 1) 
      ON CONFLICT (user_id, date) 
      DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                    updated_at = CURRENT_TIMESTAMP
    `, [userId, today]);
    
    // Update lifetime turn count
    await query(
      'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
      [userId]
    );
    
    console.log(`🔄 [TURN] Turn ${turnNumber} complete - judges will handle analysis internally`);
    
    // JUDGE EVALUATION NOW HANDLED SEQUENTIALLY BY FRONTEND - NO CONCURRENT JUDGE CALLS
    console.log(`🔄 [TURN] Turn ${turnNumber} complete - judge evaluation handled by frontend on turn 7`);
    let judgeResults = null;
    
    // Return successful therapy response with analyst/judge data
    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      sessionComplete: turnNumber >= 6,
      judgeResults,
      metadata: {
        domain: 'therapy',
        promptLength: finalTherapyPrompt.length,
        responseLength: responseText.length,
        memoryLength: therapyMemorySection.length
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
async function handleConfessionalRequest(req: AuthRequest, res: express.Response, params: { sid: string, agentKey: string, effectiveCharacterId: string, usercharId: string }) {
  console.log('🟢 HANDLECONFESSIONALREQUEST ENTRY - This should ALWAYS appear');
  const { sid, agentKey, effectiveCharacterId, usercharId } = params;
  let canonicalId = effectiveCharacterId; // Will be updated with actual character_id from DB
  const speakerId = agentKey;
  
  const message = req.body?.message || '';
  
  console.log('🔥 [CONFESSIONAL-DEBUG] speaker=', speakerId, ' canonical=', canonicalId);

  // Initialize database adapter and fetch character data
  const { dbAdapter } = require('../services/databaseAdapter');
  let roommates: string[] = [];
  let teammates: string[] = [];
  let wallet = 0;
  let debt = 0;
  let actualUserId: string;
  let actualTeamId: string;
  let contestantName = '';

  try {
    // Get userId from usercharId
    const userIdResult = await dbAdapter.query(
      'SELECT user_id FROM user_characters WHERE id = $1 LIMIT 1',
      [usercharId]
    );
    actualUserId = userIdResult.rows[0]?.user_id;

    if (!actualUserId) {
      throw new Error(`No user found for usercharId: ${usercharId}`);
    }

    console.log('🔍 [CONFESSIONAL-DEBUG] Looking up data for usercharId:', usercharId, 'resolved userId:', actualUserId);

    // Get user's active team from teams table
    const teamResult = await dbAdapter.query(
      'SELECT id FROM teams WHERE user_id = $1 AND is_active = true LIMIT 1',
      [actualUserId]
    );
    actualTeamId = teamResult.rows[0]?.id;
    if (!actualTeamId) {
      throw new Error(`No active team set for user: ${actualUserId}`);
    }
    console.log('🔥 [CONFESSIONAL-TEAM-FETCH] Using team_id:', actualTeamId);

    // Get roommates (exclude the current character)
    const roommateResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.user_id = $1 AND uc.id != $2',
      [actualUserId, usercharId]
    );
    roommates = roommateResult.rows.map((row: any) => row.name);

    // Get teammates from the active team (now stored in teams table, not team_context)
    if (actualTeamId) {
      const teamSlotsResult = await dbAdapter.query(
        'SELECT character_slot_1, character_slot_2, character_slot_3 FROM teams WHERE id = $1',
        [actualTeamId]
      );

      if (teamSlotsResult.rows.length > 0) {
        const teammateIds = [
          teamSlotsResult.rows[0].character_slot_1,
          teamSlotsResult.rows[0].character_slot_2,
          teamSlotsResult.rows[0].character_slot_3
        ].filter(id => id && id !== usercharId); // Exclude current character and null slots

        if (teammateIds.length > 0) {
          const teammateResult = await dbAdapter.query(
            'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = ANY($1)',
            [teammateIds]
          );
          teammates = teammateResult.rows.map((row: any) => row.name);
        }
      }
    }

    // Get financial data for the character
    const character = await dbAdapter.userCharacters.findById(usercharId);
    if (character) {
      wallet = character.wallet || 0;
      debt = character.debt || 0;
      // Update canonicalId to use the character's canonical ID for LocalAGI
      // BUT only if speaker is contestant (not hostmaster)
      if (character.character_id && speakerId !== 'hostmaster_v8_72') {
        canonicalId = character.character_id;
        console.log('🎭 [CONFESSIONAL-FIX] Updated canonicalId from DB:', canonicalId);
      }
    }

    // Get contestant name for stop tokens
    const contestantResult = await dbAdapter.query(
      'SELECT c.name FROM user_characters uc JOIN characters c ON uc.character_id = c.id WHERE uc.id = $1',
      [usercharId]
    );
    contestantName = contestantResult.rows[0]?.name || 'Contestant';

    console.log('🔥 [CONFESSIONAL-DB-FETCH] Character data:', {
      roommates: roommates.length,
      roommateNames: roommates,
      teammates: teammates.length,
      teammateNames: teammates,
      wallet,
      debt,
      contestantName
    });
  } catch (error) {
    console.error('🔥 [CONFESSIONAL-DB-FETCH] Error fetching character data:', error);
  }

  // Universal turn counting - dedicated counter system (copied from therapy)
  const chatId = req.body?.chatId || 'default_chat';
  const userId = req.user?.id || 'system';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const { query } = require('../database/postgres');
  
  // Increment chat session turn count
  await query(`
    INSERT INTO chat_sessions (chat_id, current_turn_count) 
    VALUES ($1, 1) 
    ON CONFLICT (chat_id) 
    DO UPDATE SET current_turn_count = chat_sessions.current_turn_count + 1, 
                  updated_at = CURRENT_TIMESTAMP
  `, [chatId]);
  
  // Get the new turn number for this chat
  const chatTurnResult = await query(
    'SELECT current_turn_count FROM chat_sessions WHERE chat_id = $1',
    [chatId]
  );
  const turnNumber = chatTurnResult.rows[0]?.current_turn_count || 1;
  
  // Update daily stats
  await query(`
    INSERT INTO user_daily_stats (user_id, date, daily_turn_count) 
    VALUES ($1, $2, 1) 
    ON CONFLICT (user_id, date) 
    DO UPDATE SET daily_turn_count = user_daily_stats.daily_turn_count + 1,
                  updated_at = CURRENT_TIMESTAMP
  `, [userId, today]);
  
  // Update lifetime turn count
  await query(
    'UPDATE users SET lifetime_turn_count = COALESCE(lifetime_turn_count, 0) + 1 WHERE id = $1',
    [userId]
  );
  
  console.log(`🔄 [CONFESSIONAL-TURN] Turn ${turnNumber} for chat ${chatId}`);

  // Build clean conversation history without quotes or stage directions (copied from therapy)
  let conversationHistory = '';
  if (Array.isArray(req.body?.messages)) {
    conversationHistory = buildCleanHistory(req.body.messages);
    console.log('🔍 [CONFESSIONAL-DEBUG] CONVERSATION HISTORY LENGTH:', conversationHistory.length);
    console.log('🔍 [CONFESSIONAL-DEBUG] MESSAGES ARRAY LENGTH:', req.body.messages.length);
    if (req.body.messages.length === 0) {
      console.log('🔍 [CONFESSIONAL-DEBUG] EMPTY MESSAGES ARRAY - Session start');
    }
  } else {
    console.log('🔍 [CONFESSIONAL-DEBUG] NO MESSAGES ARRAY PROVIDED');
    console.log('🔍 [CONFESSIONAL-DEBUG] agentKey:', req.body?.agentKey);
    console.log('🔍 [CONFESSIONAL-DEBUG] chatType:', req.body?.chatType);
  }

  // Extract confessional-specific parameters
  const hostmasterStyle = ['gentle', 'probing', 'confrontational'].includes(req.body.meta?.hostmasterStyle) 
    ? req.body.meta.hostmasterStyle 
    : 'probing';

  let prompt: string;
  
  // Role detection logic based on agentKey
  if (speakerId === 'hostmaster_v8_72') {
    // HOSTMASTER FLOW: Generating questions using contestant's data for informed questioning
    console.log('🔥 [CONFESSIONAL-DEBUG] HOSTMASTER FLOW - About to call assembleHostmasterPromptUniversal');

    prompt = await assembleHostmasterPromptUniversal(
      usercharId, // contestant's ID for their data
      roommates,
      teammates,
      wallet,
      debt,
      actualTeamId, // Pass actual team_id, not userId
      usercharId, // Pass usercharId for sleeping arrangement lookup
      {
        turnNumber,
        hostmasterStyle,
        conversationHistory
      }
    );
  } else {
    // CONTESTANT FLOW: Generating candid responses
    console.log('🔥 [CONFESSIONAL-DEBUG] CONTESTANT FLOW - About to call assembleConfessionalPromptUniversal');

    prompt = await assembleConfessionalPromptUniversal(
      agentKey,
      roommates,
      teammates,
      wallet,
      debt,
      actualTeamId, // Pass actual team_id, not userId
      usercharId, // Pass usercharId for sleeping arrangement lookup
      {
        turnNumber,
        hostmasterStyle,
        conversationHistory
      }
    );
  }

  console.log('🔥 [CONFESSIONAL-DEBUG] Prompt assembled, length: ' + prompt.length);
  console.log('🔥🔥🔥 [CONFESSIONAL-FULL-PROMPT]', prompt);

  // Build dynamic stop tokens based on role to prevent excessive generation
  const stopTokens = [
    "\n\n",  // Prevent rambling with double line breaks
    "Hostmaster:",  // Prevent role-playing both sides
    `${contestantName}:`,  // Prevent speaking for contestant
    "Interview:"  // Prevent meta-commentary
  ];
  // Remove duplicates and filter out empty strings
  const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

  try {
    // PRODUCTION - OpenAI API (matching therapy pattern)
    console.log('🚀 [CONFESSIONAL] Calling OpenAI API');
    console.log('🚀 [CONFESSIONAL] Prompt length:', prompt.length);
    console.log('🚀 [CONFESSIONAL] Stop tokens:', uniqueStopTokens);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('✅ [CONFESSIONAL] OpenAI response received, length:', responseText.length);

    // Return successful confessional response with turnNumber like therapy
    return res.json({
      ok: true,
      text: responseText,
      turnNumber,
      sessionComplete: turnNumber >= 6,
      metadata: {
        domain: 'confessional',
        promptLength: prompt.length,
        responseLength: responseText.length,
        speaker: canonicalId,
        timestamp: new Date().toISOString(),
        sessionId: sid
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
    // accept both session_id and sessionId
    const rawSid = (req.body?.session_id ?? req.body?.sessionId) as string | undefined;
    const sid = normalizeSessionId(String(rawSid || ''));

    // accept characterId, character, or meta.characterIdCanonical
    const bodyCharacterId = req.body?.characterId as string | undefined;
    const bodyCharacter   = req.body?.character as string | undefined;
    const metaCanon       = req.body?.meta?.characterIdCanonical as string | undefined;
    // For therapy requests, use therapistId as the character ID
    const therapistId = req.body?.therapistId as string | undefined;
    const usercharId = (req.body?.usercharId || req.body?.meta?.usercharId) as string | undefined;
    
    // Set effectiveCharacterId to match the speaker (agentKey's canonical ID)
    // The speaker could be patient or therapist, but we need their canonical character ID
    const effectiveCharacterId = String(bodyCharacterId || bodyCharacter || metaCanon || usercharId || '');

    // Resolve character ID to canonical agent key - STRICT MODE (NO FALLBACKS)
    const { agentKey: rawAgentKey } = req.body;
    
    if (!rawAgentKey) {
      return res.status(400).json({ error: 'agentKey required' });
    }
    
    let agentKey: string;
    console.log('🔍 [AGENT-KEY-RESOLVE] About to resolve rawAgentKey:', rawAgentKey);
    try {
      agentKey = await mustResolveAgentKey(rawAgentKey); // throws if unknown
      console.log('✅ [AGENT-KEY-RESOLVE] Success, resolved to:', agentKey);
    } catch (e) {
      console.error('❌ [AGENT-KEY-RESOLVE] Failed:', String(e));
      return res.status(400).json({ error: 'Unknown agentKey', detail: String(e) });
    }
    const message   = String(req.body?.message ?? '');

    if (process.env.AGI_DEBUG) {
      console.log('[NEW-ROUTE] Memory-aware chat handler', JSON.stringify({
        rawSid, sid, effectiveCharacterId, agentKey, hasUserchar: !!usercharId
      }, null, 2));
    }

    console.log('🔍 [MEMORY-HANDLER-DEBUG] sid:', sid, 'effectiveCharacterId:', effectiveCharacterId, 'usercharId:', usercharId);

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
    console.warn('[ROUTE-DEBUG]', { sid, agentKey, domain, chatType: req.body?.chatType });
    console.warn('[ROUTE-DEBUG] Domain detected:', domain);

    // Validate required fields (real_estate doesn't need usercharId - it's coach-level)
    if (!sid || !effectiveCharacterId) {
      console.error('❌ [MEMORY-HANDLER-VALIDATION-FAIL]', { sid, effectiveCharacterId, usercharId });
      return res.status(400).json({
        ok: false, error: 'ID_MISSING',
        detail: { haveSid: !!sid, haveCanonicalCharacterId: !!effectiveCharacterId, haveUsercharId: !!usercharId }
      });
    }

    // usercharId required for all domains except real_estate
    if (domain !== 'real_estate' && !usercharId) {
      console.error('❌ [MEMORY-HANDLER-VALIDATION-FAIL] usercharId required for domain:', domain);
      return res.status(400).json({
        ok: false, error: 'ID_MISSING',
        detail: { haveSid: !!sid, haveCanonicalCharacterId: !!effectiveCharacterId, haveUsercharId: !!usercharId, domain }
      });
    }
    
    // ===== THERAPY DOMAIN - HANDLE FIRST AND RETURN IMMEDIATELY =====
    if (domain === 'therapy') {
      console.log('✅ Correct therapy branch hit - processing therapy request completely');

      // Judges go to evaluation; therapists/patients go to therapy chat.
      const JUDGES = new Set(['king_solomon','eleanor_roosevelt','anubis']);
      if (JUDGES.has(agentKey)) {
        if (req.body.therapistId !== undefined) {
          return res.status(400).json({ error: 'therapistId not allowed for judge' });
        }
        return handleTherapyEvaluation(req, res);
      }
      return await handleTherapyRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    if (domain === 'group_therapy') {
      console.log('✅ Group therapy branch hit - processing group therapy request');

      // Judges go to evaluation; therapists/patients go to group therapy chat.
      const JUDGES = new Set(['king_solomon','eleanor_roosevelt','anubis']);
      if (JUDGES.has(agentKey)) {
        if (req.body.therapistId !== undefined) {
          return res.status(400).json({ error: 'therapistId not allowed for judge' });
        }
        return handleTherapyEvaluation(req, res);
      }
      return await handleGroupTherapyRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    if (domain === 'confessional') {
      console.log('✅ Correct confessional branch hit - processing confessional request completely');
      return await handleConfessionalRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== FINANCIAL DOMAIN =====
    if (domain === 'financial') {
      console.log('✅ Financial branch hit - processing financial request');
      return await handleFinancialRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== EQUIPMENT DOMAIN =====
    if (domain === 'equipment') {
      console.log('✅ Equipment branch hit - processing equipment request');
      return await handleEquipmentRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== SKILLS DOMAIN =====
    if (domain === 'skills') {
      console.log('✅ Skills branch hit - processing skills request');
      return await handleSkillsRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== KITCHEN_TABLE DOMAIN =====
    if (domain === 'kitchen_table') {
      console.log('✅ Kitchen Table branch hit - processing kitchen table request');
      return await handleKitchenTableRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== TRAINING DOMAIN =====
    if (domain === 'training') {
      console.log('✅ Training branch hit - processing training request');
      return await handleTrainingRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== POWERS DOMAIN =====
    if (domain === 'powers') {
      console.log('✅ Powers branch hit - processing powers request');
      return await handlePowersRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== SPELLS DOMAIN =====
    if (domain === 'spells') {
      console.log('✅ Spells branch hit - processing spells request');
      return await handleSpellsRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== PROGRESSION DOMAIN =====
    if (domain === 'progression') {
      console.log('✅ Progression branch hit - processing progression request');
      return await handleProgressionRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== REAL_ESTATE DOMAIN =====
    if (domain === 'real_estate') {
      console.log('✅ Real Estate branch hit - processing real estate request');
      return await handleRealEstateRequest(req, res, { sid, agentKey, effectiveCharacterId });
    }

    // ===== SOCIAL_LOUNGE DOMAIN =====
    if (domain === 'social_lounge') {
      console.log('✅ Social Lounge branch hit - processing social lounge request');
      return await handleSocialLoungeRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== MESSAGE_BOARD DOMAIN =====
    if (domain === 'message_board') {
      console.log('✅ Message Board branch hit - processing message board request');
      return await handleMessageBoardRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== GROUP_ACTIVITIES DOMAIN =====
    if (domain === 'group_activities') {
      console.log('✅ Group Activities branch hit - processing group activities request');
      return await handleGroupActivitiesRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== PERFORMANCE DOMAIN =====
    if (domain === 'performance') {
      console.log('✅ Performance branch hit - processing performance request');
      return await handlePerformanceRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== PERSONAL_PROBLEMS DOMAIN =====
    if (domain === 'personal_problems') {
      console.log('✅ Personal Problems branch hit - processing personal problems request');
      return await handlePersonalProblemsRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== BATTLE DOMAIN =====
    if (domain === 'battle') {
      console.log('✅ Battle branch hit - processing battle request');
      return await handleBattleRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // ===== DRAMA_BOARD DOMAIN =====
    if (domain === 'drama_board') {
      console.log('✅ Drama Board branch hit - processing drama board request');
      return await handleDramaBoardRequest(req, res, { sid, agentKey, effectiveCharacterId, usercharId });
    }

    // Observability: always tie logs to chatId
    console.log('[AI ROUTE] chat context', {
      chatId: req.body?.chatId,
      domain,
      usercharId: req.body?.meta?.usercharId
    });

    // Deterministic shortcut for money questions (guarded)
    const rawMsg =
      typeof req.body?.message === 'string' ? req.body.message : '';
    const userMsg =
      typeof req.body?.meta?.userMessage === 'string'
        ? req.body.meta.userMessage.trim()
        : '';

    // Prefer a short human utterance; fall back to raw
    const msgForShortcut =
      rawMsg && rawMsg.length <= 180 && !/^you are\b/i.test(rawMsg)
        ? rawMsg
        : (userMsg || rawMsg);

    const askMoney = /\bhow\s+much\s+(money|cash)\b/i;
    if (askMoney.test(msgForShortcut)) {
      // Query the actual wallet value from the database
      try {
        const character = await dbAdapter.userCharacters.findById(usercharId);
        const walletAmount = character?.wallet ?? 0;
        const wUSD = walletAmount.toFixed(2);
        console.log(
          `[MONEY_SHORTCUT] q="${msgForShortcut.slice(0,80)}" -> $${wUSD} (from DB wallet: ${walletAmount})`
        );
        return res.json({ ok: true, text: `$${wUSD}` });
      } catch (error) {
        console.error('[MONEY_SHORTCUT] Database error:', error);
        return res.json({ ok: true, text: '$0.00' }); // Safe fallback
      }
    }
    
    // systemFor call removed - will be replaced with domain-specific prompt builders
    const ctxMax = modelCtx(agentKey);
    const reserveOutput = 8000; // Increased for full therapy prompts (4000+ chars)
    
    
    // Financial domain only (therapy returns early at line 314)
    let prompt: string;
    let sessionBlockBytes = 0;
    let usageShare = 0;
    let stateJSON = null;
    
    // Continue to proper domain handlers below...

    console.log('[MEMORY DEBUG] reinject:', { sid, domain, session_bytes: sessionBlockBytes, usage: Number(usageShare.toFixed(2)), ctxMax, reserveOutput });
    log.reinject({ sid, domain, session_bytes: sessionBlockBytes, usage: Number(usageShare.toFixed(2)), ctxMax, reserveOutput });

    // Role guard (financial only)
    if (domain === 'financial') {
      const { role } = req.body?.meta || {};
      if (!role) {
        return res.status(400).json({ error: 'role required in meta for financial domain' });
      }
      if (role !== 'patient') {
        return res.status(400).json({ 
          ok: false, 
          error: 'role_mismatch_expected_patient',
          detail: `Expected role='patient' for financial domain, got '${role}'`
        });
      }
    }

    // stats + refresh
    const stats: SessionStats = stateJSON?.stats ?? { turn_idx: 0, last_refresh_turn: 0, high_pressure_streak: 0 };
    const nextStats = nextStatsBeforeRefresh(stats, usageShare);
    const store = new PgMemoryStore();
    const base = { usercharId, canonicalId: effectiveCharacterId };

    // LEGACY FINANCIAL DECISION BLOCKER
    const persist = req.body?.meta?.persist;
    if (persist?.kind === 'financial.decision') {
      console.warn('[FINANCIAL] Legacy financial.decision attempted – blocked. Use REST /characters/:id/decisions/commit');
      // do NOT mutate DB; optionally attach an assistant message telling UI to show the proper buttons
    }

    if (shouldRefresh(stats, usageShare, sessionBlockBytes)) {
      const ss: any = stateJSON || {};
      if (domain === 'financial' && ss.financial) ss.financial = rebalanceCard(ss.financial);
      else if (domain === 'therapy' && ss.therapy) ss.therapy = rebalanceCard(ss.therapy);
      else ss.generic = rebalanceCard(ss.generic ?? {});
      await store.savePatch(
        sid, 
        { ...ss, ...base, stats: markRefreshed(nextStats, sessionBlockBytes) },
        { characterId: effectiveCharacterId }
      );
    } else {
      await store.savePatch(
        sid, 
        { ...base, stats: nextStats },
        { characterId: effectiveCharacterId }
      );
    }

    // Generate AI response for non-therapy domains
    const t0 = Date.now();
    prompt = '';
    let responseText = '';
    const domainReserveOutput = 2000;
    
    // Get userId from authenticated request
    const userId = req.user?.id || usercharId;
    
    try {
      // GENERIC DOMAIN HANDLING DISABLED - USE DEDICATED HANDLERS ONLY
      // if (domain === 'therapy') {
      //   prompt = await assembleTherapyPromptUniversal(
      //     agentKey, 'patient', [], [], 0, 0, userId, {
      //       therapistName: 'therapist',
      //       patientName: 'patient',
      //       conversationHistory: message
      //     }
      //   );
      // } else if (domain === 'financial') {
      //   prompt = await assembleFinancialPromptUniversal(
      //     agentKey, [], '', '', message, 'financial', 0, 0, userId, {}
      //   );
      // } else if (domain === 'equipment') {
      //   prompt = await assembleEquipmentPromptUniversal(
      //     agentKey, [], [], '', '', message, 'equipment_consultation', 0, 0, userId
      //   );
      // } else if (domain === 'skills') {
      //   prompt = await assembleSkillsPromptUniversal(
      //     agentKey, [], [], '', '', message, 'skills_development', 0, 0, userId
      //   );
      // } else if (domain === 'kitchen_table') {
      //   prompt = await assembleKitchenTablePromptUniversal(
      //     agentKey, [], '', '', message, 'kitchen_table', 0, 0, userId
      //   );
      // } else if (domain === 'training') {
      //   prompt = await assembleTrainingPromptUniversal(
      //     agentKey, [], '', '', message, 'training', 0, 0, userId
      //   );
      // } else if (domain === 'real_estate') {
      //   prompt = await assembleRealEstatePromptUniversal(
      //     agentKey, [], '', '', message, 'real_estate', 0, 0, userId
      //   );
      // } else if (domain === 'confessional') {
      //   // Extract confessional-specific parameters - NO FALLBACKS
      //   const questionCount = typeof req.body.meta?.questionCount === 'number' ? req.body.meta.questionCount : 1;
      //   const hostmasterStyle = ['gentle', 'probing', 'confrontational'].includes(req.body.meta?.hostmasterStyle) 
      //     ? req.body.meta.hostmasterStyle 
      //     : 'probing';
      //   
      //   prompt = await assembleConfessionalPromptUniversal(
      //     agentKey, [], [], 0, 0, userId, {
      //       questionCount,
      //       hostmasterStyle,
      //       conversationHistory: message
      //     }
      //   );
      // } else if (domain === 'social_lounge') {
      //   prompt = await assembleSocialLoungePromptUniversal(
      //     agentKey, [], '', '', message, 'social_lounge', 0, 0, userId
      //   );
      // } else if (domain === 'message_board') {
      //   prompt = await assembleMessageBoardPromptUniversal(
      //     agentKey, [], '', '', message, 'message_board', 0, 0, userId
      //   );
      // } else if (domain === 'group_activities') {
      //   prompt = await assembleGroupActivitiesPromptUniversal(
      //     agentKey, [], '', '', message, 'group_activities', 0, 0, userId
      //   );
      // } else if (domain === 'performance') {
      //   prompt = await assemblePerformancePromptUniversal(
      //     agentKey, [], '', '', message, 'performance', 0, 0, userId
      //   );
      // } else if (domain === 'personal_problems') {
      //   prompt = await assemblePersonalProblemsPromptUniversal(
      //     agentKey, [], '', '', message, 'personal_problems', 0, 0, userId
      //   );
      // } else if (domain === 'battle') {
      //   prompt = await assembleBattlePromptUniversal(
      //     agentKey, [], '', '', message, 'battle', 0, 0, userId
      //   );
      // } else if (domain === 'drama_board') {
      //   prompt = await assembleDramaBoardPromptUniversal(
      //     agentKey, [], '', '', message, 'drama_board', 0, 0, userId
      //   );
      // } else {
        throw new Error(`Unsupported domain: ${domain}`);
      // }

      // Generate AI response using OpenAI
      const stopTokens = [
        "\n\n",
        "Therapist:",
        "Patient:"
      ];
      const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

      console.log('[AI] Calling OpenAI API');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        frequency_penalty: 0.4,
        stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
      });

      responseText = response.choices[0].message.content.trim();
    } catch (error) {
      console.error('[AI Generation Error]:', error);
      // NO FALLBACKS - throw error immediately to expose missing implementations
      throw error;
    }

    // LOG THE EXACT FINAL PROMPT (skip for therapy - it logs its own)
    if (domain !== 'therapy') {
      console.error(`\n🔴🔴🔴 FINAL PROMPT FOR ${agentKey} 🔴🔴🔴`);
      console.error('Length:', prompt.length);
      console.error('COMPLETE PROMPT:');
      console.error(prompt);
      console.error('🔴🔴🔴 END PROMPT 🔴🔴🔴\n');
    }
    
    
    log.llmTiming({ sid, ms: Date.now() - t0, max_out: domainReserveOutput });

    // Stage-direction & internal-markers sanitizer (financial only)
    if (domain === 'financial' && typeof responseText === 'string') {
      responseText = responseText
        // strip theatrical asides like *groan*
        .replace(/\*[^*]+\*/g, ' ')
        // strip accidental FACTS/RULES echoes
        .replace(/^\s*facts(?:\s*\(internal\))?:.*$/gim, '')   // FACTS… lines (any case)
        .replace(/^\s*wallet[_\s]*usd\s*:\s*\$?\d+(?:\.\d{2})?\s*$/gim, '')
        .replace(/^\s*monthly[_\s]*income[_\s]*usd:.*$/gim, '')
        .replace(/^\s*employed:.*$/gim, '')
        .replace(/^\s*rules[^\n]*$/gim, '')                       // RULES… headers
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    // success-only domain patches
    try {
      // Pre-write row so legacy NOT NULL passes
      await store.savePatch(sid, { usercharId, canonicalId: effectiveCharacterId }, { characterId: effectiveCharacterId });
      
      if (domain === 'financial') {
        console.log('[MEMORY DEBUG] Calling writeFinancialPatch for sid:', sid);
        await writeFinancialPatch({ sid, modelText: responseText, state: store, characterId: effectiveCharacterId });
      } else if (domain === 'therapy') {
        await writeTherapyPatch({ sid, modelText: responseText, state: store, characterId: effectiveCharacterId });
      }
    } catch (e) {
      console.warn('[memory] patch failed (non-fatal):', e);
    }

    return res.json({ ok: true, text: responseText });
  } catch (err: any) {
    console.error('[AI_CHAT_ERROR]', err?.stack || err);
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ ok: false, error: String(err?.message || err), stack: String(err?.stack || '') });
    }
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

/** ---------- IMAGE GENERATION (OpenAI-compatible-ish) ----------
 * Request: { prompt, size?, n?, negative_prompt?, seed?, format? }
 * Response: { images: [{ mime, dataUrl }] }
 */
router.post('/image', async (req, res) => {
  res.setTimeout(65_000);
  try {
    const { prompt, size = '1024x1024', n = 1 } = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });

    console.log('[IMAGE] Generating with OpenAI DALL-E:', { prompt, size, n });

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size === '1024x1024' ? '1024x1024' : '1024x1024',
      response_format: 'url'
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return res.json({
      images: [{
        mime: 'image/png',
        dataUrl
      }]
    });
  } catch (err: any) {
    console.error('AI image error:', err);
    return res.status(500).json({ error: 'Failed to generate image', message: err?.message || 'Unknown error' });
  }
});

// ========== THERAPIST HANDLER ==========
async function handleTherapistChat(req: AuthRequest, res: express.Response) {
  try {
    console.log('[THERAPIST-HANDLER] Therapist route activated');
    
    // Extract therapist info
    const therapistKey = req.body?.meta?.characterIdCanonical || req.body?.meta?.characterDisplayName;
    if (!therapistKey) {
      return res.status(400).json({ error: 'therapistKey required in meta.characterIdCanonical or meta.characterDisplayName' });
    }
    const chatId = req.body?.chatId;
    const domain = 'therapy';
    const role = 'therapist';
    
    // Use chatId directly as session ID (LocalAGI will handle agent prefixing)
    const sessionId = chatId;
    
    console.log('[THERAPIST-HANDLER] Config:', {
      therapistKey,
      chatId,
      sessionId,
      role
    });
    
    // Get unified therapist persona
    const { getUnifiedTherapistPersona } = require('../services/promptBlocks/therapistPersonas');
    // TODO: Remove this legacy therapy handler - replaced by dedicated therapy system
    
    // TODO: This legacy handler should be replaced with the dedicated therapy system
    const basePersonality = "Legacy therapy handler - use dedicated system instead";
    
    // Get unified therapist persona with all anti-repetition rules
    const unifiedPersona = getUnifiedTherapistPersona(therapistKey, basePersonality);
    
    console.log('[THERAPIST-HANDLER] Unified persona loaded, length:', unifiedPersona.length);
    
    // Get therapist's memory context
    const eventBus = GameEventBus.getInstance();
    const memories = eventBus.getCharacterMemories(therapistKey, { limit: 10 });
    console.log('[THERAPIST-HANDLER] Loaded', memories.length, 'memories for', therapistKey);
    
    // Build memory context string
    let memoryContext = '';
    if (memories.length > 0) {
      memoryContext = '\n\nRECENT MEMORY CONTEXT:\n' + 
        memories.map(m => `• ${m.content}`).join('\n');
    }
    
    // Get conversation history for anti-repetition (short-term memory)
    let conversationHistory = '';
    
    // Extract recent exchanges from request context to show what was just said
    const recentContext = req.body?.messages?.slice(-4) || [];
    console.log('[THERAPIST-HANDLER] req.body.messages:', req.body?.messages?.length || 0, 'messages received');
    
    if (recentContext.length > 0) {
      console.log('[THERAPIST-HANDLER] Found', recentContext.length, 'recent messages in context');
      
      const contextExchanges = recentContext.map((msg: any) => {
        const role = msg.role === 'assistant' ? 'You recently said' : 'Patient said';
        const content = (msg.content || '').substring(0, 200).replace(/\*\*[^*]+\*\*/g, ''); // Remove debug markers
        return `${role}: "${content}${content.length > 200 ? '...' : ''}"`;
      });
      
      conversationHistory = '\n\nCONVERSATION HISTORY SOP:\n' +
        '1. FIRST: Check the conversation below to see if you are responding to another character or if there is any relevant context\n' +
        '2. THEN: Make a point not to repeat anything from the last 4 turns in your output\n' +
        '3. Think of it like a fun, creative game - always find NEW ways to express yourself\n\n' +
        'RECENT CONVERSATION:\n' + contextExchanges.join('\n');
      
      console.log('🔍 [DEBUG] THERAPIST CONVERSATION HISTORY LENGTH:', conversationHistory.length);
      console.log('🔍 [DEBUG] THERAPIST CONVERSATION HISTORY CONTENT:', conversationHistory);
    }
    
    // Construct final prompt with unified persona + memory + history
    const userMessage = req.body?.messages?.[req.body.messages.length - 1]?.content || req.body?.message || '';
    
    const finalPrompt = `${unifiedPersona}${memoryContext}${conversationHistory}`;
    
    console.log('[THERAPIST-HANDLER] Final prompt constructed, length:', finalPrompt.length);
    console.log('[THERAPIST-HANDLER] First 500 chars:', finalPrompt.substring(0, 500));

    // Call OpenAI with the unified prompt (using standard pattern from other handlers)
    const stopTokens = ["\n\n"];
    const uniqueStopTokens = [...new Set(stopTokens)].filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: finalPrompt }],
      temperature: 0.7,
      frequency_penalty: 0.4,
      stop: uniqueStopTokens.length > 0 ? uniqueStopTokens : undefined
    });

    let responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('[THERAPIST-HANDLER] OpenAI response received, length:', responseText?.length || 0);

    let finalResponse = responseText || 'Therapeutic connection temporarily unavailable.';

    // Return response (response is a string from OpenAI)
    return res.json({
      choices: [{
        message: {
          role: 'assistant',
          content: finalResponse
        }
      }]
    });
    
  } catch (error) {
    console.error('[THERAPIST-HANDLER] Error:', error);
    return res.status(500).json({
      error: 'therapist_handler_error',
      detail: error.message
    });
  }
}

/** ---------- CHAT COMPLETIONS (OpenAI-compatible) ----------
 * Request: { model?, messages, temperature?, max_tokens?, response_format? }
 * Response: { choices: [{ message: { content, role:'assistant' } }], usage:{...} }
 */
router.post('/chat', authenticateToken, async (req: AuthRequest, res) => {
  const timestamp = new Date().toISOString();
  const callId = Math.random().toString(36).substr(2, 9);
  
  console.error(`🚨 [${timestamp}] [CALL-${callId}] AI CHAT ROUTE HIT: agentKey="${req.body?.agentKey}"`);
  console.error(`🚨 [CALL-${callId}] Request origin: ${req.headers['user-agent']}`);
  console.error(`🚨 [CALL-${callId}] Stack trace:`);
  console.trace();
  
  console.log(`[DEBUG] [CALL-${callId}] Full req.body:`, JSON.stringify(req.body));
  console.log(`[DEBUG] [CALL-${callId}] req.body keys:`, req.body ? Object.keys(req.body) : 'undefined');
  console.log(`[DEBUG] [CALL-${callId}] chatId specifically:`, req.body?.chatId);
  try {
    console.log('[AI ROUTE] /api/ai/chat hit with body:', JSON.stringify(req.body?.meta));
    
    // Entry tripwire - log all requests before any routing decisions
    try {
      const ak = String(req.body?.agentKey ?? '');
      const ct = String(req.body?.chatType ?? '');
      const hasMsg = !!req.body?.message;
      const msgCount = Array.isArray(req.body?.messages) ? req.body.messages.length : 0;
      const isJudge = ['eleanor_roosevelt','king_solomon','anubis'].includes(ak);
      console.log('[ROUTE][ENTRY]', { agentKey: ak, chatType: ct, isJudge, hasMsg, msgCount });
    } catch (e) {
      console.error('[ROUTE][ENTRY][ERROR]', String(e));
    }


    // ────────────────────────────────────────────────────────────────
    // REQUIRED: chatId is the thread key for memory and routing
    // Do not autogenerate; force clients to send a stable value
    // ────────────────────────────────────────────────────────────────
    if (!req.body?.chatId) {
      console.warn('[AI ROUTE] missing chatId', {
        hasMessages: !!req.body?.messages,
        domain: req.body?.meta?.domain,
        usercharId: req.body?.meta?.usercharId
      });
      return res.status(400).json({
        error: 'chatId_required',
        hint: 'Provide a stable chatId per thread, e.g. chat:<domain>:<usercharId>[:<uuid>]'
      });
    }

  // Strict boundary validation - no aliases allowed
  const {
    agentKey,
    chatType,       // use existing values
    sessionId,
    usercharId,
    characterId,
    message,
    therapistId     // only for therapist chats
  } = req.body;

  // Debug validation failures
  console.log('🔍 [VALIDATION] agentKey:', agentKey, 'sessionId:', sessionId, 'usercharId:', usercharId, 'characterId:', characterId);
  
  if (!agentKey?.trim())   return res.status(400).json({ error: 'agentKey required' });
  if (!sessionId?.trim())  return res.status(400).json({ error: 'sessionId required' });
  // Detect domain early for validation
  const domain = detectDomain(req.body);

  // Real estate doesn't need usercharId or characterId (coach-level, not character-level)
  if (domain !== 'real_estate') {
    if (!usercharId?.trim()) return res.status(400).json({ error: 'usercharId required' });
    if (!characterId?.trim()) return res.status(400).json({ error: 'characterId required' });
  }
  
  // Message validation - allow undefined message for confessional hostmaster requests
  if (domain !== 'confessional' && typeof message !== 'string') {
    return res.status(400).json({ error: 'message required' });
  }
  // For confessional, message can be undefined (hostmaster) or string (contestant)
  if (domain === 'confessional' && message !== undefined && typeof message !== 'string') {
    return res.status(400).json({ error: 'message must be string if provided' });
  }

  // Hard-fail legacy aliases (no compatibility fallbacks)
  if (req.body.session_id !== undefined)
    return res.status(400).json({ error: 'Use sessionId (camelCase). session_id not allowed.' });
  // Note: character field is now REQUIRED by new memory-aware system (therapy, confessional)
  // Removed validation that rejected it - was blocking new routing logic

  // Domain already detected above for validation
  console.log('--- RAW REQUEST BODY ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('------------------------');

  // Real estate domain routing - coach-level, no usercharId required
  if (domain === 'real_estate') {
    console.log('🏠 [REAL-ESTATE-ROUTE] Routing to handleMemoryChat for real estate');
    return await handleMemoryChat(req, res);
  }

  // Check if this should use the new memory-aware system (includes therapy)
  // Get usercharId from either direct field or meta (for backwards compatibility)
  const hasUsercharId = req.body?.usercharId || req.body?.meta?.usercharId;
  const hasMemoryFields = hasUsercharId && 
                          (req.body?.session_id || req.body?.sessionId) &&
                          (req.body?.character || req.body?.characterId || req.body?.meta?.characterIdCanonical);
  
  // COMMENTED OUT - Second handler was broken, routing therapy to wrong handler
  // if (domain === 'therapy') {
  //   console.log('🔥🔥🔥 [THERAPY-ROUTE-HIT] Domain detected as therapy');
  //   const _len = Array.isArray(req.body?.messages)
  //     ? req.body.messages.reduce((n, m) => n + (m?.content?.length || 0), 0)
  //     : (req.body?.message?.length || 0);
  //   const _count = Array.isArray(req.body?.messages) ? req.body.messages.length : (req.body?.message ? 1 : 0);
  //   console.log('🔥🔥🔥 [PAYLOAD-DEBUG] length:', _len, 'count:', _count);
  //   console.log('🔥🔥🔥 [PAYLOAD-DEBUG] Frontend message preview:', req.body.message?.substring(0, 200) || 'EMPTY');
  //   console.log('🔥🔥🔥 [PAYLOAD-DEBUG] Full request body keys:', Object.keys(req.body));
  //   // Ignore any FE message for therapy - server assembles everything
  //   req.body.message = '';
  //   return handleMemoryChat(req, res);
  // }
  
  if (hasMemoryFields) {
    // Use new memory-aware handler
    console.log('[ROUTE-PROXY] Using memory-aware handler with fields:', {
      usercharId: req.body?.usercharId || req.body?.meta?.usercharId,
      session_id: req.body?.session_id,
      sessionId: req.body?.sessionId,
      character: req.body?.character,
      characterId: req.body?.characterId
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
      usercharId: !!(req.body?.usercharId || req.body?.meta?.usercharId),
      session_id: !!(req.body?.session_id || req.body?.sessionId),
      character: !!(req.body?.character || req.body?.characterId)
    });
  }
  
  // NO FALLBACK - All requests must go through memory-aware handler
  console.error('[ROUTE-ERROR] Request missing required fields for memory-aware handler');
  return res.status(400).json({ 
    error: 'missing_required_fields',
    required: {
      'meta.usercharId': 'User character ID',
      'sessionId': 'Session identifier', 
      'characterId': 'Character identifier'
    },
    received: {
      usercharId: !!req.body?.meta?.usercharId,
      sessionId: !!(req.body?.session_id || req.body?.sessionId),
      characterId: !!(req.body?.character || req.body?.characterId)
    }
  });
  } catch (error: any) {
    console.error('[AI ROUTE] Error in chat route:', error);
    return res.status(500).json({ error: 'internal_server_error' });
  }
});

// End session endpoint for clearing session state
router.post('/end-session', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    
    const s = sessions.get(sessionId);
    if (s) {
      sessions.delete(sessionId); // Hard reset - remove entire session state
      console.log(`🧠 Session cleared: ${sessionId}`);
    }
    
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error ending session:', error);
    return res.status(500).json({ error: 'Failed to end session' });
  }
});

// DISABLED - Memory endpoints removed
// router.post('/memory/set', async (req, res) => {
// router.get('/memory/:characterId/:sessionId/:key', async (req, res) => {
// router.delete('/session/:sessionId', async (req, res) => {

// Test OpenAI connection
router.get('/test', async (req, res) => {
  try {
    const response = await openai.models.list();
    const models = response.data;

    res.json({
      success: true,
      connected: true,
      message: 'OpenAI API is connected and working',
      models: models.slice(0, 5).map(m => m.id)
    });
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint for OpenAI
router.get('/localai/health', async (req, res) => {
  try {
    const response = await openai.models.retrieve('gpt-4o-mini');

    res.json({
      ok: true,
      provider: 'OpenAI',
      model: response.id,
      created: response.created
    });
  } catch (err: any) {
    console.error('OpenAI health check failed:', err);
    res.status(500).json({
      ok: false,
      error: 'OpenAI health check failed',
      details: err?.message
    });
  }
});

// --- webhook receiver (LocalAGI → our server)
// Accepts a variety of shapes; must include a message id + text
router.post('/webhook/response', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const b = req.body || {};
    const messageId = b.message_id || b.id || b.messageId;
    const text =
      b.text ??
      b.output ??
      b.content ??
      b.choices?.[0]?.message?.content ??
      null;
    if (!messageId || !text) return res.status(400).json({ error: 'missing message_id or text' });
    deliverMessage(String(messageId), String(text));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});


export default router;