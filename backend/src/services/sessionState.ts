// backend/src/services/sessionState.ts
// Pool-based implementation using your project's `query(text, params)` helper.

import { query } from '../database'; // or '../database/index' if that's how it's exported
import { Buffer } from 'node:buffer';

export interface SessionState {
  sid: string;
  character_id: string;
  user_id?: string | null;
  session_flags: Record<string, unknown>;
  short_context: string;
  last_user_intent: string;
  slots: Record<string, string | number | boolean>;
  short_tool_result: Record<string, unknown>;
  digest_id?: string | null;
  ts_updated?: string;
  schema_version?: number;
}

/* -------------------- caps (write-time) -------------------- */
const MAX_TOTAL_SOFT = 8 * 1024;   // 8 KB -> sets degraded=true
const MAX_TOTAL_HARD = 16 * 1024;  // 16 KB -> skip write
const MAX_CONTEXT = 2048;          // bytes
const MAX_INTENT  = 256;           // bytes
const MAX_TOOL    = 2048;          // bytes
const SLOTS_MAX_KEYS = 32;
const SLOTS_KEY_MAX  = 32;   // bytes
const SLOTS_STR_MAX  = 128;  // bytes
const SLOTS_JSON_MAX = 1024; // bytes for final serialized slots

const byte_len = (s: string) => Buffer.byteLength(s ?? '', 'utf8');

function truncateUtf8(s: string, max_bytes: number): string {
  if (!s) return '';
  let bytes = 0, i = 0;
  while (i < s.length) {
    const cp = s.codePointAt(i)!;
    const inc = cp <= 0x7F ? 1 : cp <= 0x7FF ? 2 : cp <= 0xFFFF ? 3 : 4;
    if (bytes + inc > max_bytes) break;
    bytes += inc;
    i += cp > 0xFFFF ? 2 : 1;
  }
  return s.slice(0, i);
}

function sanitizeSlots(slots: Record<string, unknown> | undefined | null)
: Record<string, string | number | boolean> {
  if (!slots) return {};
  const keys = Object.keys(slots).sort().slice(0, SLOTS_MAX_KEYS);
  const out: Record<string, string | number | boolean> = {};
  for (const k of keys) {
    const kk = truncateUtf8(String(k), SLOTS_KEY_MAX);
    const v = (slots as any)[k];
    if (typeof v === 'string') out[kk] = truncateUtf8(v, SLOTS_STR_MAX);
    else if (typeof v === 'number' && Number.isFinite(v)) out[kk] = v;
    else if (typeof v === 'boolean') out[kk] = v;
    else out[kk] = truncateUtf8(String(v), Math.min(64, SLOTS_STR_MAX));
  }
  // cap final JSON size
  let json = JSON.stringify(out);
  if (byte_len(json) > SLOTS_JSON_MAX) {
    for (const k of Object.keys(out).reverse()) {
      delete out[k];
      json = JSON.stringify(out);
      if (byte_len(json) <= SLOTS_JSON_MAX) break;
    }
  }
  return out;
}

// Keep items until JSON byte cap; preserves valid JSON
function shrinkJsonToBytes(obj: any, max_bytes: number): any {
  if (!obj || typeof obj !== 'object') return obj;
  const is_arr = Array.isArray(obj);
  const out: any = is_arr ? [] : {};
  const entries = is_arr ? (obj as any[]).map((v, i) => [i, v] as [any, any]) : Object.entries(obj);
  for (const [k, v] of entries) {
    const trial = is_arr ? [...out, v] : { ...out, [k]: v };
    if (byte_len(JSON.stringify(trial)) > max_bytes) break;
    if (is_arr) out.push(v); else out[k] = v;
  }
  return out;
}

type SessionPatch = Partial<Omit<SessionState, 'ts_updated' | 'schema_version'>> & { sid: string };

function buildCappedRow(patch: SessionPatch): { row: any; total_bytes: number; degraded: boolean } | { skip: true; reason: string; bytes: number } {
  const row: any = { sid: patch.sid };

  if (patch.character_id) row.character_id = patch.character_id;
  if (patch.user_id !== undefined) row.user_id = patch.user_id;

  if (patch.session_flags) row.session_flags = patch.session_flags;

  if (typeof patch.short_context === 'string') {
    row.short_context = truncateUtf8(patch.short_context, MAX_CONTEXT);
  }
  if (typeof patch.last_user_intent === 'string') {
    row.last_user_intent = truncateUtf8(patch.last_user_intent, MAX_INTENT);
  }
  if (patch.slots) {
    row.slots = sanitizeSlots(patch.slots as any);
  }
  if (patch.short_tool_result && typeof patch.short_tool_result === 'object') {
    row.short_tool_result = shrinkJsonToBytes(patch.short_tool_result, MAX_TOOL);
  }
  if (patch.digest_id !== undefined) row.digest_id = patch.digest_id;

  const payload = {
    session_flags: row.session_flags || {},
    short_context: row.short_context || '',
    last_user_intent: row.last_user_intent || '',
    slots: row.slots || {},
    short_tool_result: row.short_tool_result || {},
    digest_id: row.digest_id || ''
  };
  const total_bytes = byte_len(JSON.stringify(payload));

  if (total_bytes > MAX_TOTAL_HARD) {
    return { skip: true, reason: 'over_hard_cap', bytes: total_bytes };
  }
  let degraded = false;
  if (total_bytes > MAX_TOTAL_SOFT) {
    row.session_flags = { ...(row.session_flags || {}), degraded: true };
    degraded = true;
  }
  return { row, total_bytes, degraded };
}

/* -------------------- public API -------------------- */

export async function loadSessionState(sid: string): Promise<SessionState | null> {
  const sql = `
    SELECT sid, character_id, user_id, session_flags, short_context,
           last_user_intent, slots, short_tool_result, digest_id,
           ts_updated, schema_version
    FROM session_state
    WHERE sid = $1
  `;
  const { rows } = await query(sql, [sid]);
  return rows[0] ?? null;
}

export async function saveSessionState(patch: SessionPatch): Promise<void> {
  if (!patch?.sid) return;
  const built = buildCappedRow(patch) as any;
  if (built.skip) {
    console.warn('session_save_skip_over_budget', { sid: patch.sid, bytes: built.bytes, max: MAX_TOTAL_HARD });
    return;
  }
  const { row, total_bytes, degraded } = built;

  // Prepare columns/values for UPSERT. Only pass provided fields; others stay unchanged.
  const cols: string[] = ['sid'];
  const vals: any[]   = [row.sid];
  const updates: string[] = [];

  function add(col: string, val: any) {
    cols.push(col);
    vals.push(val);
    updates.push(`${col} = COALESCE(EXCLUDED.${col}, session_state.${col})`);
  }

  if (row.character_id !== undefined) add('character_id', row.character_id);
  if (row.user_id !== undefined)      add('user_id', row.user_id);
  if (row.session_flags !== undefined) add('session_flags', row.session_flags);
  if (row.short_context !== undefined) add('short_context', row.short_context);
  if (row.last_user_intent !== undefined) add('last_user_intent', row.last_user_intent);
  if (row.slots !== undefined) add('slots', row.slots);
  if (row.short_tool_result !== undefined) add('short_tool_result', row.short_tool_result);
  if (row.digest_id !== undefined) add('digest_id', row.digest_id);

  // Always bump ts_updated
  updates.push(`ts_updated = NOW()`);

  // Build parameter placeholders $1..$n
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `
    INSERT INTO session_state (${cols.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT (sid) DO UPDATE SET
      ${updates.join(', ')}
  `;

  await query(sql, vals);
  console.log('session_save', { sid: row.sid, total_bytes: total_bytes, degraded });
}