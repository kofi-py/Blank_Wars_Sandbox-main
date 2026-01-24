import { estimateTokens, byteSize } from './tokens';
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
  systemText,
  userText,
  sessionBlock,
  prevAssistantText,
  ctxMax,
  reserveOutput,
}: {
  systemText: string; userText: string; sessionBlock: string; prevAssistantText?: string;
  ctxMax: number; reserveOutput: number;
}) {
  const base = ctxMax - reserveOutput;
  const budget = Math.max(1, base - estimateTokens(systemText) - estimateTokens(userText));
  const used = estimateTokens(sessionBlock) + (prevAssistantText ? estimateTokens(prevAssistantText) : 0);
  return used / budget;
}

export async function assembleFinancialPrompt(opts: {
  sid: string;
  domain: Domain;
  systemText: string;
  userText: string;
  prevAssistantText?: string;
  state: { load: (sid: string) => Promise<any> };
  ctxMax: number;
  reserveOutput: number;
}) {
  const { sid, domain, systemText, userText, prevAssistantText, state, ctxMax, reserveOutput } = opts;
  const ss = (await state.load(sid)) || {};
  const sessionBlock = renderSessionBlock(domain, ss);
  const usageShare = computeUsageShare({ systemText, userText, sessionBlock, prevAssistantText, ctxMax, reserveOutput });
  const prompt = [systemText, sessionBlock, prevAssistantText, userText]
    .filter(Boolean)
    .join('\n\n');
  
  // Debug logging to show exact prompt structure
  if (sessionBlock) {
    console.log('[PROMPT ASSEMBLY] Session block included:', sessionBlock.slice(0, 200));
  }
  
  return { prompt, sessionBlockBytes: byteSize(sessionBlock), usageShare, stateJSON: ss };
}