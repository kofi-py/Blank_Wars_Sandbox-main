// Simple, explicit, in-memory gate for single-turn injections.
const key = (u: string, c: string) => `${u}::${c}`;

const pending = new Map<string, { branch_id?: string }>();

export function markForNextTurn(user_id: string, character_id: string, branch_id?: string) {
  pending.set(key(user_id, character_id), { branch_id });
}

export function consumeIfPresent(user_id: string, character_id: string) {
  const k = key(user_id, character_id);
  const v = pending.get(k);
  if (v) pending.delete(k);
  return v; // undefined if nothing pending
}