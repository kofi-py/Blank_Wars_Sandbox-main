// Clubhouse and Social Features System for _____ Wars
// Community interactions, leaderboards, message boards, and graffiti walls

export type MessageType = 'general' | 'battle' | 'strategy' | 'trade' | 'guild' | 'announcement';
export type GraffitiType = 'tag' | 'character_art' | 'symbol' | 'text' | 'battle_scene' | 'meme';
export type LeaderboardType = 'global_power' | 'battle_wins' | 'win_streak' | 'character_collection' | 'guild_power' | 'monthly_battles';

export interface CommunityMessage {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  author_title?: string;
  author_level: number;
  content: string;
  type: MessageType;
  timestamp: Date;
  likes: number;
  replies: CommunityReply[];
  tags: string[];
  is_sticky?: boolean;
  is_pinned?: boolean;
  is_moderator?: boolean;
  attachments?: MessageAttachment[];
  character_mentions?: string[];
  guild_tag?: string;
}

export interface CommunityReply {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  author_level: number;
  content: string;
  timestamp: Date;
  likes: number;
  parent_reply_id?: string; // For nested replies
}

export interface MessageAttachment {
  type: 'image' | 'team_composition' | 'battle_replay' | 'character_showcase';
  data: any;
  preview?: string;
}

export interface GraffitiArt {
  id: string;
  artist_id: string;
  artist_name: string;
  artist_level: number;
  type: GraffitiType;
  title: string;
  description?: string;
  art_data: GraffitiCanvas;
  position: { x: number; y: number; width: number; height: number };
  timestamp: Date;
  likes: number;
  views: number;
  tags: string[];
  is_approved: boolean;
  is_feature: boolean;
  color_palette: string[];
  tools: string[];
  time_spent: number; // minutes
  guild_tag?: string;
}

export interface GraffitiCanvas {
  width: number;
  height: number;
  layers: GraffitiLayer[];
  background: string;
  effects: GraffitiEffect[];
}

export interface GraffitiLayer {
  id: string;
  name: string;
  strokes: GraffitiStroke[];
  opacity: number;
  blend_mode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
  visible: boolean;
}

export interface GraffitiStroke {
  id: string;
  tool: 'brush' | 'spray' | 'marker' | 'chalk' | 'stencil' | 'stamp' | 'eraser';
  color: string;
  size: number;
  opacity: number;
  points: { x: number; y: number; pressure?: number }[];
  texture?: string;
}

export interface GraffitiEffect {
  type: 'glow' | 'shadow' | 'outline' | 'drip' | 'fade' | 'distress';
  intensity: number;
  color?: string;
  offset?: { x: number; y: number };
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar: string;
  title?: string;
  guild_name?: string;
  guild_tag?: string;
  value: number;
  change: number; // change from last period
  trend: 'up' | 'down' | 'same';
  additional_stats: Record<string, any>;
}

export interface Guild {
  id: string;
  name: string;
  tag: string; // 3-4 character tag like [WAR]
  description: string;
  motto: string;
  emblem: string;
  founded_date: Date;
  leader_name: string;
  member_count: number;
  max_members: number;
  total_power: number;
  guild_level: number;
  is_recruiting: boolean;
  requirements: {
    min_level: number;
    min_power: number;
    application_required: boolean;
  };
  perks: GuildPerk[];
  achievements: string[];
  treasury: number;
  weekly_activity: number;
}

export interface GuildPerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  max_level: number;
  effect: {
    type: 'stat_boost' | 'resource_bonus' | 'access_unlock' | 'cosmetic';
    value: number;
    description: string;
  };
}

export interface SocialEvent {
  id: string;
  title: string;
  description: string;
  type: 'tournament' | 'art_contest' | 'guild_war' | 'community' | 'special';
  start_date: string;
  end_date: string;
  participants: number;
  max_participants?: number;
  rewards: EventReward[];
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

export interface EventReward {
  rank: string; // '1st', '2nd-5th', 'top 10%', 'participation'
  rewards: {
    type: 'contestant' | 'currency' | 'item' | 'cosmetic' | 'title';
    id: string;
    amount?: number;
  }[];
}

export interface CommunityStats {
  total_users: number;
  active_today: number;
  messages_posted: number;
  graffiti_created: number;
  guilds_active: number;
  battles_completed: number;
  top_guilds: string[];
  trending_tags: string[];
  featured_art: string[];
}

// Helper functions
export function getMessagesByType(messages: CommunityMessage[], type: MessageType): CommunityMessage[] {
  return messages.filter(msg => msg.type === type);
}

export function searchMessages(messages: CommunityMessage[], query: string): CommunityMessage[] {
  const lowercaseQuery = query.toLowerCase();
  return messages.filter(msg => 
    msg.content.toLowerCase().includes(lowercaseQuery) ||
    msg.author_name.toLowerCase().includes(lowercaseQuery) ||
    msg.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}

export function getTrendingTags(messages: CommunityMessage[], limit: number = 10): string[] {
  const tagCounts: Record<string, number> = {};
  
  messages.forEach(msg => {
    msg.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function getGraffitiByTag(graffiti: GraffitiArt[], tag: string): GraffitiArt[] {
  return graffiti.filter(art => art.tags.includes(tag));
}

export function getFeaturedGraffiti(graffiti: GraffitiArt[]): GraffitiArt[] {
  return graffiti
    .filter(art => art.is_feature)
    .sort((a, b) => b.likes - a.likes);
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export function calculateGuildRank(guild: Guild, all_guilds: Guild[]): number {
  const sortedGuilds = all_guilds.sort((a, b) => b.total_power - a.total_power);
  return sortedGuilds.findIndex(g => g.id === guild.id) + 1;
}