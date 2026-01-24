// Brevity control system for all chat types
// Provides backend tags + frontend sentence capping

export const BREVITY_TAGS = {
  therapy: '[THERAPY_ENHANCED_MIN]',
  finance: '[FINANCE_ENHANCED_MIN]',
  coaching: '[COACH_ENHANCED_MIN]',
  realty: '[REALTY_ENHANCED_MIN]',
  equipment: '[EQUIP_ENHANCED_MIN]',
  team: '[TEAM_ENHANCED_MIN]',
  monologue: '[MONO_ENHANCED_MIN]',
  confessional: '[CONFESSIONAL_ENHANCED_MIN]',
  general: '[ENHANCED_MIN]'
} as const;

export function ensureBrevityTag(prompt: string, tag: string): string {
  // Check if any brevity tag is already present
  if (/\[.*ENHANCED_MIN\]/.test(prompt)) {
    return prompt;
  }
  return `${prompt}\n\n${tag}`;
}

export function twoSentenceCap(text: string): string {
  if (!text) return '';
  
  // Split on sentence endings, handling quotes and dialogue properly
  const sentences = text.split(/(?<=[.!?]["']?)\s+/).filter(s => s.trim().length);
  const capped = sentences.slice(0, 2).join(' ');
  
  return capped;
}

export function threeSentenceCap(text: string): string {
  if (!text) return '';
  
  // For special cases that need slightly more room
  const sentences = text.split(/(?<=[.!?]["']?)\s+/).filter(s => s.trim().length);
  const capped = sentences.slice(0, 3).join(' ');
  
  return capped;
}