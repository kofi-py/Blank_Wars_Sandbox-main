import type { SessionJSON, MemoryStore } from './memoryStore';
import { db as pool } from '../database/index';

const MAX_BYTES = 16 * 1024; // hard cap per sid

export class PgMemoryStore implements MemoryStore {
  async load(sid: string): Promise<SessionJSON | null> {
    const { rows } = await pool.query<{ payload: SessionJSON }>(
      'SELECT payload FROM session_state WHERE sid = $1',
      [sid]
    );
    const payload = rows[0]?.payload ?? null;
    if (payload) {
      console.log('[DB MEMORY LOAD] Loaded from session_state for sid:', sid, 'Keys:', Object.keys(payload));
    } else {
      console.log('[DB MEMORY LOAD] No existing session_state for sid:', sid);
    }
    return payload;
  }

  async save_patch(
    sid: string,
    patch: SessionJSON,
    opts?: { character_id?: string }
  ): Promise<void> {
    // character_id is no longer stored in session_state table

    const { rows } = await pool.query<{ bytes: number }>(
      `INSERT INTO session_state (sid, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (sid)
       DO UPDATE SET payload = session_state.payload || EXCLUDED.payload,
                     ts_updated = NOW()
       RETURNING octet_length(payload::text) AS bytes`,
      [sid, JSON.stringify(patch)]
    );
    const bytes = rows[0]?.bytes ?? 0;
    if (bytes > MAX_BYTES) {
      throw new Error(`session_state cap exceeded for sid=${sid}: ${bytes} > ${MAX_BYTES}`);
    }
  }
}