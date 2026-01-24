import type { MemoryStore } from '../memoryStore';
import { log } from '../log';

export async function writeFinancialPatch(opts: {
  sid: string; model_text: string; state: MemoryStore; character_id: string;
}) {
  const { sid, model_text, state, character_id } = opts;
  console.log('[FINANCIAL PATCH] Processing text length:', model_text?.length);
  const patch = deriveFinancial(model_text);
  if (patch) {
    console.log('[FINANCIAL PATCH] Found patch:', patch);
    await state.save_patch(sid, { financial: patch }, { character_id });
    log.patch({ sid, domain: 'financial', fields: Object.keys(patch), bytes: JSON.stringify(patch).length });
  } else {
    console.log('[FINANCIAL PATCH] No patch extracted from text');
  }
}

function deriveFinancial(text: string) {
  const callbacks = pickOneLiners(text, 1);
  const plan_id = pickPlanId(text);
  const goals = pickGoals(text);
  const fresh = addFreshFromText(text);
  if (!callbacks && !plan_id && !goals && fresh.length === 0) return null;
  return {
    ...(goals ? { goals } : {}),
    ...(plan_id ? { last_plan_id: plan_id } : {}),
    ...(callbacks ? { callbacks } : {}),
    ...(fresh.length ? { fresh } : {}),
  };
}

function pickOneLiners(text: string, n = 1): string[] | undefined {
  const lines = text.split(/\n|\.|;|•/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 120);
  return lines.length ? lines.slice(0, n) : undefined;
}

function pickPlanId(text: string): string | undefined {
  const m = text.match(/plan[_\- ]([A-Za-z0-9]+)/i);
  return m?.[1] ? `plan_${m[1]}` : undefined;
}

function pickGoals(text: string): string[] | undefined {
  const tags = [] as string[];
  if (/emergency fund/i.test(text)) tags.push('3mo_emergency_fund');
  if (/(pay off|snowball).*cc|credit/i.test(text)) tags.push('pay_off_loans');
  if (/(save|saving).*house|down.*payment/i.test(text)) tags.push('house_down_payment');
  if (/retirement|401k|ira/i.test(text)) tags.push('retirement_savings');
  return tags.length ? tags : undefined;
}

function addFreshFromText(text: string): string[] {
  const bullets = text.split(/\n|•/).map(s => s.trim()).filter(Boolean);
  return bullets.slice(0, 3);
}