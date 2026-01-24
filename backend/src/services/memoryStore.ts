// Compact session memory interface (≤16 KB per sid)
export type SessionJSON = Record<string, unknown>;

export interface MemoryStore {
  load(sid: string): Promise<SessionJSON | null>;
  save_patch(
    sid: string,
    patch: SessionJSON,
    opts?: { character_id?: string }   // ← optional to avoid friction
  ): Promise<void>;
}