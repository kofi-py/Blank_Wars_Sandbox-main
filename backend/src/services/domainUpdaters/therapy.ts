import type { MemoryStore } from '../memoryStore';
import { log } from '../log';

export async function writeTherapyPatch(opts: { sid: string; model_text: string; state: MemoryStore; character_id: string }) {
  const { sid, model_text, state, character_id } = opts;
  const patch = deriveTherapy(model_text);
  if (patch) {
    await state.save_patch(sid, { therapy: patch }, { character_id });
    log.patch({ sid, domain: 'therapy', fields: Object.keys(patch), bytes: JSON.stringify(patch).length });
  }
}

function deriveTherapy(text: string) {
  const callbacks = pickOneLiners(text, 1);
  const intent = pickIntent(text);
  const fresh = addFresh(text);
  if (!callbacks && !intent && fresh.length === 0) return null;
  return { 
    ...(callbacks ? { callbacks } : {}), 
    ...(intent ? { last_user_intent: intent } : {}), 
    ...(fresh.length ? { fresh } : {}) 
  };
}

function pickIntent(text: string): string | undefined {
  const m = text.match(/intent:\s*([^\n]+)/i);
  return m?.[1]?.trim();
}

function pickOneLiners(text: string, n = 1): string[] | undefined {
  const lines = text
    .split(/\n|\.|;|\*/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 120);
  return lines.length ? lines.slice(0, n) : undefined;
}

function addFresh(text: string): string[] {
  const bullets = text.split(/\n|\*/).map(s => s.trim()).filter(Boolean);
  return bullets.slice(0, 3);
}