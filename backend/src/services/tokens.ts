// Lightweight token estimator; replace with your BPE when available
export function estimateTokens(s: string): number {
  if (!s) return 0;
  // ~4 chars/token heuristic
  return Math.ceil(Buffer.byteLength(s, 'utf8') / 4);
}

export const byte_size = (s: string) => Buffer.byteLength(s, 'utf8');