import { estimateTokens, byte_size } from './tokens';
import { renderBlock } from './sessionSummarizer';
import type { Domain } from './types';

export function renderSessionBlock(domain: Domain, ss: any): string {
  const L: string[] = [];
  if (domain === 'financial' && ss.financial) {
    const p = ss.financial;
    if (p.profile)       L.push(`profile=${JSON.stringify(p.profile)}`);
    if (p.snapshot)      L.push(`snapshot=${JSON.stringify(p.snapshot)}`);
    if (p.goals)         L.push(`goals=${JSON.stringify(p.goals)}`);
    if (p.constraints)   L.push(`constraints=${JSON.stringify(p.constraints)}`);
    if (p.risk)          L.push(`risk=${p.risk}`);
    if (p.last_plan_id)  L.push(`last_plan=${p.last_plan_id}`);
    L.push(renderBlock(p));
    return L.filter(Boolean).join('\n');
  }
  if (domain === 'therapy' && ss.therapy) {
    const t = ss.therapy;
    if (t.last_user_intent) L.push(`intent=${t.last_user_intent}`);
    L.push(renderBlock(t));
    return L.filter(Boolean).join('\n');
  }
  const g = ss.generic || {};
  L.push(renderBlock(g));
  return L.filter(Boolean).join('\n');
}

export function computeUsageShare({
  system_text,
  user_text,
  session_block,
  prev_assistant_text,
  ctx_max,
  reserve_output,
}: {
  system_text: string; user_text: string; session_block: string; prev_assistant_text?: string;
  ctx_max: number; reserve_output: number;
}) {
  const base = ctx_max - reserve_output;
  const budget = Math.max(1, base - estimateTokens(system_text) - estimateTokens(user_text));
  const used = estimateTokens(session_block) + (prev_assistant_text ? estimateTokens(prev_assistant_text) : 0);
  return used / budget;
}

export async function assembleFinancialPrompt(opts: {
  sid: string;
  domain: Domain;
  system_text: string;
  user_text: string;
  prev_assistant_text?: string;
  state: { load: (sid: string) => Promise<any> };
  ctx_max: number;
  reserve_output: number;
}) {
  const { sid, domain, system_text, user_text, prev_assistant_text, state, ctx_max, reserve_output } = opts;
  const ss = (await state.load(sid)) || {};
  const session_block = renderSessionBlock(domain, ss);
  const usage_share = computeUsageShare({ system_text, user_text, session_block, prev_assistant_text, ctx_max, reserve_output });
  const prompt = [system_text, session_block, prev_assistant_text, user_text]
    .filter(Boolean)
    .join('\n\n');
  
  // Debug logging to show exact prompt structure
  if (session_block) {
    console.log('[PROMPT ASSEMBLY] Session block included:', session_block.slice(0, 200));
  }
  
  return { prompt, session_blockBytes: byte_size(session_block), usage_share, state_json: ss };
}