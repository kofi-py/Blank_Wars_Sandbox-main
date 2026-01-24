import { byte_size } from './tokens';

export type Stats = {
  turn_idx: number;
  last_refresh_turn: number;
  high_pressure_streak: number;
  last_session_block_bytes?: number;
};

export type CardCommon = {
  callbacks?: string[];
  fresh?: string[];
  scene_digest?: string;
};

export const CAPS = Object.freeze({
  CARD_MAX: 2048,      // total bytes target for session block
  PINS_MAX: 5,
  PINS_FLOOR: 3,
  FRESH_CAP: 800,      // bytes reserved for fresh[]
  DIGEST_CAP: 1024,    // soft cap
});

export function shouldRefresh(
  stats: Stats,
  usage_share: number,
  session_blockBytes: number,
  N = 3,
  M = 12
) {
  const size_hit = session_blockBytes > CAPS.CARD_MAX;
  const streak_hit = usage_share >= 0.8 && (stats.high_pressure_streak + 1) >= N;
  const age_hit = (stats.turn_idx + 1) - (stats.last_refresh_turn || 0) >= M;
  return size_hit || streak_hit || age_hit;
}

export function nextStatsBeforeRefresh(stats: Stats, usage_share: number): Stats {
  const high = usage_share >= 0.8;
  return {
    ...stats,
    turn_idx: (stats.turn_idx ?? 0) + 1,
    high_pressure_streak: high ? (stats.high_pressure_streak ?? 0) + 1 : 0,
  };
}

export function markRefreshed(stats: Stats, session_blockBytes: number): Stats {
  return {
    ...stats,
    last_refresh_turn: stats.turn_idx,
    high_pressure_streak: 0,
    last_session_block_bytes: session_blockBytes,
  };
}

export function tightenDigest(digest: string): string {
  if (!digest) return '';
  const lines = digest.split('\n').map(l => l.trim()).filter(Boolean);
  const uniq = Array.from(new Set(lines.map(n => n.replace(/\s+/g, ' '))));
  return uniq.map(l => (l.length > 110 ? l.slice(0, 107) + '…' : l)).join('\n');
}

export function addBullet(digest: string, line: string): string {
  const clean = line.replace(/^[-•]\s*/, '');
  const bullet = clean.length > 120 ? clean.slice(0, 117) + '…' : clean;
  const base = digest ? digest + '\n' : '';
  return base + '- ' + bullet;
}

export function rebalanceCard(card: CardCommon): CardCommon {
  const out: CardCommon = { ...card };
  out.callbacks = (out.callbacks ?? []).slice(0, CAPS.PINS_MAX);

  out.fresh = out.fresh ?? [];
  while (byte_size((out.fresh as string[]).join('\n')) > CAPS.FRESH_CAP && out.fresh.length > 0) {
    const oldest = out.fresh.shift()!;
    out.scene_digest = addBullet(out.scene_digest ?? '', oldest);
  }

  out.scene_digest = tightenDigest(out.scene_digest ?? '');

  while (out.callbacks!.length > CAPS.PINS_FLOOR && byte_size(renderBlock(out)) > CAPS.CARD_MAX) {
    out.callbacks!.pop();
  }
  return out;
}

export function renderBlock(card: CardCommon): string {
  const L: string[] = [];
  if (card.scene_digest) L.push(card.scene_digest);
  if (card.fresh?.length) L.push(card.fresh.map(s => `• ${s}`).join('\n'));
  if (card.callbacks?.length) L.push(`callbacks=${JSON.stringify(card.callbacks.slice(0, CAPS.PINS_MAX))}`);
  return L.join('\n');
}