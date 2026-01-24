// Smart Context Compression Service
// Generates concise, efficient context from the centralized event system

export const ECS_VERSION = '2025-08-22:memory-context:v1';

import GameEventBus, { GameEvent, CharacterMemory, CharacterRelationship, EventFilter, EventCategory } from './gameEventBus';
import ComedyTemplateService from './comedyTemplateService';
import { getEmotionalState, ContextType } from './emotionalStateService';

export interface ContextConfig {
  max_tokens: number;
  domain_focus: 'performance' | 'equipment' | 'skills' | 'therapy' | 'social' | 'general';
  include_living_context: boolean;
  include_relationships: boolean;
  include_recent_events: boolean;
  include_emotional_state: boolean;
  time_range: '1_hour' | '6_hours' | '1_day' | '3_days' | '1_week';
}

export interface CompressedContext {
  recent_events: string;
  relationships: string;
  emotional_state: string;
  domain_specific: string;
  token_count: number;
}

export interface RelationshipSummary {
  allies: Array<{ name: string; trust: number; note: string }>;
  rivals: Array<{ name: string; rivalry: number; note: string }>;
  neutral: Array<{ name: string; note: string }>;
}

export class EventContextService {
  private static instance: EventContextService;
  private event_bus: GameEventBus;
  private character_name_map: Map<string, string> = new Map();

  private constructor() {
    // Make initialization explicit & loud
    this.event_bus = GameEventBus.get_instance();
    this.initializeCharacterNames();
    console.log('[ECS][INIT]', { has_bus: !!this.event_bus });
  }

  private byteLen(s: string) {
    return Buffer.byteLength(s, 'utf8');
  }

  static get_instance(): EventContextService {
    if (!EventContextService.instance) {
      EventContextService.instance = new EventContextService();
    }
    return EventContextService.instance;
  }

  /**
   * Build a compact memory context string for a subject character.
   * Optionally includes partner (e.g., NPC) to filter/relevance-score.
   */
  async buildMemoryContext(opts: {
    subject_character_id: string;            // <-- userchar_id (player)
    partner_character_id?: string;           // <-- canonical/NPC (advisor)
    domains?: ('financial'|'therapy'|'group_therapy'|'social'|'battle'|'confessional'|'conflict'|'kitchen'|'equipment'|'skills'|'kitchen_table'|'training'|'real_estate'|'social_lounge'|'message_board'|'group_activities'|'performance'|'personal_problems'|'drama_board'|'progression'|'powers'|'spells'|'attributes'|'magic'|'journey'|'goals')[];
    max_items?: number;                     // soft cap items
    max_bytes?: number;                     // hard cap bytes
  }): Promise<{ text: string; items: number; bytes: number }> {
    const {
      subject_character_id,
      partner_character_id,
      domains = ['financial'],
      max_items = 20,
      max_bytes = 2500,
    } = opts;

    console.log('[ECS] buildMemoryContext start', { subject_character_id, partner_character_id, domains, max_items, max_bytes });

    if (!this.event_bus) {
      console.error('[ECS] event_bus not initialized');
      return { text: '', items: 0, bytes: 0 };
    }

    // Pull recent & important memories for the subject (player).
    // NOTE: we intentionally do not pull by NPC id; partner is used only for relevance filtering if metadata exists.
    console.log('[ECS] pulling memories for', subject_character_id);
    const memories = this.event_bus.getCharacterMemories(subject_character_id, {
      limit: max_items * 2
    });
    console.log('[ECS] pulled', memories?.length ?? 0, 'memories');

    // Simple relevance pass if partner provided
    const relevant = partner_character_id
      ? memories.filter(m => {
          const ac = (m.associated_characters || []) as string[];
          return !ac.length || ac.includes(partner_character_id);
        })
      : memories;

    // Format compact lines
    const lines: string[] = [];
    for (const m of relevant.slice(0, max_items)) {
      const when = new Date(m.created_at).toISOString();
      const val = (m.emotional_valence ?? 'neutral');
      const imp = (m.importance ?? 0);
      const tag = (m.tags && m.tags.length) ? ` tags:${m.tags.slice(0,3).join(',')}` : '';
      const line = `- [${when}] (valence:${val} imp:${imp}) ${m.content}${tag}`;
      const candidate = lines.length ? `${lines.join('\n')}\n${line}` : line;
      if (this.byteLen(candidate) > max_bytes) break;
      lines.push(line);
    }

    const text = lines.length
      ? `### Memory Context (subject=${subject_character_id}${partner_character_id ? `, partner=${partner_character_id}` : ''})\n${lines.join('\n')}\n`
      : '';
    const bytes = this.byteLen(text);
    console.log('[ECS] buildMemoryContext done', { items: lines.length, bytes });
    return { text, items: lines.length, bytes };
  }

  private initializeCharacterNames(): void {
    // Map character IDs to display names
    const names = {
      'achilles': 'Achilles',
      'joan': 'Joan of Arc',
      'holmes': 'Sherlock Holmes',
      'dracula': 'Dracula',
      'sun_wukong': 'Sun Wukong',
      'cleopatra': 'Cleopatra',
      'tesla': 'Nikola Tesla',
      'merlin': 'Merlin',
      'billy_the_kid': 'Billy the Kid',
      'genghis_khan': 'Genghis Khan',
      'fenrir': 'Fenrir',
      'frankenstein': 'Frankenstein'
    };

    for (const [id, name] of Object.entries(names)) {
      this.character_name_map.set(id, name);
    }
  }

  // Main context generation method
  async generateCompressedContext(character_id: string, config: ContextConfig): Promise<CompressedContext> {
    const recent_events = config.include_recent_events ?
      await this.generateRecentEventsContext(character_id, config) : '';

    const relationships = config.include_relationships ?
      await this.generateRelationshipsContext(character_id, config) : '';

    const emotional_state = config.include_emotional_state ?
      await this.generateEmotionalStateContext(character_id, config) : '';

    const domain_specific = await this.generateDomainSpecificContext(character_id, config);

    // Calculate token count (rough estimate: 1 token ≈ 4 characters)
    const full_context = [recent_events, relationships, emotional_state, domain_specific].join('\n');
    const token_count = Math.ceil(full_context.length / 4);

    // If over token limit, compress further
    if (token_count > config.max_tokens) {
      return await this.compressContext({
        recent_events,
        relationships,
        emotional_state,
        domain_specific,
        token_count
      }, config);
    }

    return {
      recent_events,
      relationships,
      emotional_state,
      domain_specific,
      token_count
    };
  }

  // Generate recent events context
  private async generateRecentEventsContext(character_id: string, config: ContextConfig): Promise<string> {
    const filter: EventFilter = {
      time_range: config.time_range,
      limit: 5
    };

    // Domain-specific event filtering
    if (config.domain_focus !== 'general') {
      filter.categories = this.getDomainCategories(config.domain_focus);
    }

    const events = this.event_bus.getEventHistory(character_id, filter);

    if (events.length === 0) return '';

    const event_strings = events.map(event => this.formatEventForContext(event, character_id));

    return `RECENT EVENTS (last ${config.time_range.replace('_', ' ')}):\n${event_strings.join('\n')}`;
  }

  // Generate relationships context
  private async generateRelationshipsContext(character_id: string, config: ContextConfig): Promise<string> {
    const relationship_map = this.event_bus.getRelationshipSummary(character_id);

    if (relationship_map.size === 0) return '';

    const summary = this.categorizeRelationships(relationship_map);
    const parts: string[] = [];

    if (summary.allies.length > 0) {
      const allies = summary.allies.slice(0, 3).map(a => `${a.name} (+${a.trust})`).join(', ');
      parts.push(`Allies: ${allies}`);
    }

    if (summary.rivals.length > 0) {
      const rivals = summary.rivals.slice(0, 2).map(r => `${r.name} (rivalry ${r.rivalry})`).join(', ');
      parts.push(`Rivals: ${rivals}`);
    }

    if (summary.neutral.length > 0 && parts.length < 2) {
      const neutral = summary.neutral.slice(0, 2).map(n => n.name).join(', ');
      parts.push(`Neutral: ${neutral}`);
    }

    return parts.length > 0 ? `RELATIONSHIPS:\n• ${parts.join('\n• ')}` : '';
  }

  // Generate emotional state context using centralized EmotionalStateService
  private async generateEmotionalStateContext(character_id: string, config: ContextConfig): Promise<string> {
    // Map domain_focus to ContextType - all valid values must be mapped
    const context_type_map: Record<ContextConfig['domain_focus'], ContextType> = {
      'performance': 'battle',
      'equipment': 'general',
      'skills': 'training',
      'therapy': 'therapy',
      'social': 'social',
      'general': 'general'
    };

    const context_type = context_type_map[config.domain_focus];
    if (!context_type) {
      throw new Error(`STRICT MODE: Unknown domain_focus "${config.domain_focus}" has no context_type mapping`);
    }

    const result = await getEmotionalState({
      user_character_id: character_id,
      context_type
    });

    return `EMOTIONAL STATE (mood: ${result.current_mood}, ${result.summary}):\n${result.prose}`;
  }

  // Generate domain-specific context
  private async generateDomainSpecificContext(character_id: string, config: ContextConfig): Promise<string> {
    switch (config.domain_focus) {
      case 'performance':
        return await this.generatePerformanceContext(character_id);
      case 'equipment':
        return await this.generateEquipmentContext(character_id);
      case 'skills':
        return await this.generateSkillsContext(character_id);
      case 'therapy':
        return await this.generateTherapyContext(character_id);
      case 'social':
        return await this.generateSocialContext(character_id);
      default:
        return '';
    }
  }

  // Domain-specific context generators
  private async generatePerformanceContext(character_id: string): Promise<string> {
    const battle_events = this.event_bus.getEventHistory(character_id, {
      categories: ['battle'],
      time_range: '1_week',
      limit: 5
    });

    const victories = battle_events.filter(e => e.type === 'battle_victory').length;
    const defeats = battle_events.filter(e => e.type === 'battle_defeat').length;
    const total = victories + defeats;

    if (total === 0) return 'PERFORMANCE: No recent battles';

    const win_rate = Math.round((victories / total) * 100);
    const trend = victories > defeats ? '📈 improving' : defeats > victories ? '📉 declining' : '➡️ stable';

    return `PERFORMANCE: ${victories}W/${defeats}L (${win_rate}% win rate, ${trend})`;
  }

  private async generateEquipmentContext(character_id: string): Promise<string> {
    const equipment_events = this.event_bus.getEventHistory(character_id, {
      categories: ['progression'],
      time_range: '3_days'
    }).filter(e => e.type === 'equipment_equipped' || e.type === 'equipment_upgraded');

    if (equipment_events.length === 0) return 'EQUIPMENT: No recent changes';

    const recent_changes = equipment_events.slice(0, 2).map(e =>
      `${e.metadata.item_name} ${e.type === 'equipment_upgraded' ? 'upgraded' : 'equipped'}`
    ).join(', ');

    return `EQUIPMENT: Recent changes - ${recent_changes}`;
  }

  private async generateSkillsContext(character_id: string): Promise<string> {
    const skill_events = this.event_bus.getEventHistory(character_id, {
      categories: ['training', 'progression'],
      time_range: '1_week'
    }).filter(e => e.type === 'skill_improvement' || e.type === 'new_technique_learned');

    if (skill_events.length === 0) return 'SKILLS: No recent learning';

    const recent_skills = skill_events.slice(0, 3).map(e =>
      e.metadata.skill_name || e.description.split(' ')[0]
    ).join(', ');

    return `SKILLS: Recently learned - ${recent_skills}`;
  }

  private async generateTherapyContext(character_id: string): Promise<string> {
    const therapy_events = this.event_bus.getEventHistory(character_id, {
      categories: ['therapy'],
      time_range: '1_week'
    });

    const breakthroughs = therapy_events.filter(e => e.type === 'therapy_breakthrough').length;
    const resistances = therapy_events.filter(e => e.type === 'therapy_resistance').length;

    if (therapy_events.length === 0) return 'THERAPY: No recent sessions';

    const progress = breakthroughs > resistances ? '🎯 making progress' :
                    resistances > breakthroughs ? '🛡️ showing resistance' : '➡️ stable';

    return `THERAPY: ${therapy_events.length} sessions this week, ${progress}`;
  }

  private async generateSocialContext(character_id: string): Promise<string> {
    const social_events = this.event_bus.getEventHistory(character_id, {
      categories: ['social'],
      time_range: '3_days'
    });

    const conflicts = social_events.filter(e => e.type.includes('conflict') || e.type.includes('argument')).length;
    const positive = social_events.filter(e => e.type.includes('conversation') || e.type.includes('activity')).length;

    if (social_events.length === 0) return 'SOCIAL: Quiet few days';

    const mood = conflicts > positive ? '⚡ tense household' :
                positive > conflicts ? '🤝 harmonious' : '😐 typical interactions';

    return `SOCIAL: ${social_events.length} interactions, ${mood}`;
  }

  // Helper methods
  private formatEventForContext(event: GameEvent, character_id: string): string {
    const time_ago = this.getTimeAgo(event.timestamp);
    const severity = this.getSeverityEmoji(event.severity);
    const other_characters = event.userchar_ids
      .filter(id => id !== character_id)
      .map(id => {
        const name = this.character_name_map.get(id);
        if (!name) {
          throw new Error(`Character name not found in map for ID: ${id}`);
        }
        return name;
      })
      .slice(0, 2);

    let description = event.description;
    if (other_characters.length > 0) {
      description += ` (with ${other_characters.join(', ')})`;
    }

    return `• ${severity} ${description} (${time_ago})`;
  }

  private categorizeRelationships(relationship_map: Map<string, CharacterRelationship>): RelationshipSummary {
    const allies: RelationshipSummary['allies'] = [];
    const rivals: RelationshipSummary['rivals'] = [];
    const neutral: RelationshipSummary['neutral'] = [];

    for (const target_id of Array.from(relationship_map.keys())) {
      const relationship = relationship_map.get(target_id);
      if (!relationship) continue;
      const name = this.character_name_map.get(target_id) || target_id;

      if (relationship.trust_level > 20 || relationship.affection_level > 20) {
        allies.push({
          name,
          trust: relationship.trust_level,
          note: relationship.relationship_trajectory
        });
      } else if (relationship.rivalry_intensity > 30 || relationship.trust_level < -20) {
        rivals.push({
          name,
          rivalry: relationship.rivalry_intensity,
          note: `${relationship.conflicts.length} conflicts`
        });
      } else {
        neutral.push({
          name,
          note: relationship.relationship_trajectory
        });
      }
    }

    // Sort by strength
    allies.sort((a, b) => b.trust - a.trust);
    rivals.sort((a, b) => b.rivalry - a.rivalry);

    return { allies, rivals, neutral };
  }

  private getDomainCategories(domain: string): EventCategory[] {
    const category_map: Record<string, EventCategory[]> = {
      'performance': ['battle', 'training'],
      'equipment': ['progression', 'battle'],
      'skills': ['training', 'progression'],
      'therapy': ['therapy', 'social'],
      'social': ['social', 'communication']
    };

    return category_map[domain] || [];
  }

  private getSeverityEmoji(severity: string): string {
    const emoji_map = {
      'low': '🟨',
      'medium': '🟧',
      'high': '🟥',
      'critical': '💥'
    };
    return emoji_map[severity as keyof typeof emoji_map] || '•';
  }

  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff_ms = now.getTime() - timestamp.getTime();
    const diff_mins = Math.floor(diff_ms / 60000);
    const diff_hours = Math.floor(diff_ms / 3600000);
    const diff_days = Math.floor(diff_ms / 86400000);

    if (diff_mins < 60) return `${diff_mins}m ago`;
    if (diff_hours < 24) return `${diff_hours}h ago`;
    if (diff_days === 1) return 'yesterday';
    if (diff_days < 7) return `${diff_days}d ago`;
    return 'last week';
  }

  // Context compression when over token limit
  private async compressContext(context: CompressedContext, config: ContextConfig): Promise<CompressedContext> {
    // Priority order for compression
    const sections = [
      { name: 'domain_specific', content: context.domain_specific, priority: 1 },
      { name: 'recent_events', content: context.recent_events, priority: 2 },
      { name: 'relationships', content: context.relationships, priority: 3 },
      { name: 'emotional_state', content: context.emotional_state, priority: 4 }
    ];

    let compressed_context = { ...context };
    let current_tokens = context.token_count;

    // Compress sections in order of priority
    for (const section of sections.sort((a, b) => a.priority - b.priority)) {
      if (current_tokens <= config.max_tokens) break;

      const compressed = this.compressSection(section.content);
      (compressed_context as any)[section.name] = compressed;

      const token_reduction = Math.ceil((section.content.length - compressed.length) / 4);
      current_tokens -= token_reduction;
    }

    compressed_context.token_count = current_tokens;
    return compressed_context;
  }

  private compressSection(content: string): string {
    if (!content) return content;

    // Remove extra details in parentheses
    let compressed = content.replace(/\([^)]*\)/g, '');

    // Shorten time references
    compressed = compressed.replace(/\d+h ago/g, 'recent');
    compressed = compressed.replace(/\d+d ago/g, 'recent');
    compressed = compressed.replace(/yesterday/g, 'recent');

    // Remove extra whitespace
    compressed = compressed.replace(/\s+/g, ' ').trim();

    return compressed;
  }

  // Public API for easy integration
  async getPerformanceContext(character_id: string): Promise<string> {
    const config: ContextConfig = {
      max_tokens: 200,
      domain_focus: 'performance',
      include_living_context: true,
      include_relationships: true,
      include_recent_events: true,
      include_emotional_state: true,
      time_range: '3_days'
    };

    const context = await this.generateCompressedContext(character_id, config);
    return this.formatContextForPrompt(context);
  }

  async getEquipmentContext(character_id: string): Promise<string> {
    const config: ContextConfig = {
      max_tokens: 150,
      domain_focus: 'equipment',
      include_living_context: false,
      include_relationships: false,
      include_recent_events: true,
      include_emotional_state: false,
      time_range: '1_week'
    };

    const context = await this.generateCompressedContext(character_id, config);
    return this.formatContextForPrompt(context);
  }

  async getSkillsContext(character_id: string): Promise<string> {
    const config: ContextConfig = {
      max_tokens: 180,
      domain_focus: 'skills',
      include_living_context: false,
      include_relationships: false,
      include_recent_events: true,
      include_emotional_state: true,
      time_range: '1_week'
    };

    const context = await this.generateCompressedContext(character_id, config);
    return this.formatContextForPrompt(context);
  }

  async getTherapyContext(character_id: string): Promise<string> {
    const config: ContextConfig = {
      max_tokens: 300,
      domain_focus: 'therapy',
      include_living_context: true,
      include_relationships: true,
      include_recent_events: true,
      include_emotional_state: true,
      time_range: '1_week'
    };

    const context = await this.generateCompressedContext(character_id, config);
    return this.formatContextForPrompt(context);
  }

  private formatContextForPrompt(context: CompressedContext): string {
    const sections = [
      context.recent_events,
      context.relationships,
      context.emotional_state,
      context.domain_specific
    ].filter(Boolean);

    return sections.join('\n\n');
  }

  // Alias methods for compatibility
  async getSkillContext(character_id: string): Promise<string> {
    return this.getSkillsContext(character_id);
  }

  async getSocialContext(character_id: string): Promise<string> {
    const config: ContextConfig = {
      max_tokens: 150,
      domain_focus: 'social',
      include_living_context: true,
      include_relationships: true,
      include_recent_events: true,
      include_emotional_state: false,
      time_range: '3_days'
    };

    const context = await this.generateCompressedContext(character_id, config);
    return this.formatContextForPrompt(context);
  }

  async getComprehensiveContext(character_id: string, config: ContextConfig): Promise<string> {
    const context = await this.generateCompressedContext(character_id, config);
    return this.formatContextForPrompt(context);
  }

  /**
   * Get financial decision history context for a character
   */
  async getFinancialContext(character_id: string): Promise<string> {
    console.log('[ECS] getFinancialContext called for character_id:', character_id);
    
    // Get ALL character memories from event system (not just financial)
    const all_memories = this.event_bus.getCharacterMemories(character_id, {
      limit: 10
    });
    
    console.log('[ECS] Found all memories:', all_memories.length);
    console.log('[ECS] All memories details:', all_memories.map(m => ({
      id: m.id,
      type: m.memory_type,
      content: m.content?.slice(0, 100),
      financial_meta: m.financial_metadata
    })));

    // Get recent financial events
    const financial_events = this.event_bus.getEventHistory(character_id, {
      categories: ['financial'],
      time_range: '1_week',
      limit: 10
    });

    // Build context only from real data sources
    let financial_context = '';

    if (all_memories.length > 0) {
      const memory_strings = all_memories.map(memory => {
        const time_ago = this.getTimeAgo(memory.created_at);
        console.log('[ECS] Memory content debug:', memory.content);
        return `• ${memory.content} (${time_ago})`;
      });

      financial_context += `CHARACTER MEMORY HISTORY:\n${memory_strings.join('\n')}\n\n`;
    }

    if (financial_events.length > 0) {
      const recent_events = financial_events.slice(0, 5).map(event => {
        const time_ago = this.getTimeAgo(event.timestamp);
        const severity = this.getSeverityEmoji(event.severity);
        return `• ${severity} ${event.description} (${time_ago})`;
      });

      financial_context += `RECENT FINANCIAL EVENTS:\n${recent_events.join('\n')}\n\n`;
    }

    // Add compressed context if we have financial data
    if (financial_context) {
      const config: ContextConfig = {
        max_tokens: 150,
        domain_focus: 'general',
        include_living_context: false,
        include_relationships: false,
        include_recent_events: true,
        include_emotional_state: true,
        time_range: '1_week'
      };
      
      const context = await this.generateCompressedContext(character_id, config);
      financial_context += this.formatContextForPrompt(context);
    }

    console.log(`[ECS] financial_context bytes=${financial_context.length} memories=${all_memories.length} events=${financial_events.length}`);

    // Return empty string if no real financial data found - triggers 503
    return financial_context;
  }

  /**
   * Get financial context for a specific user's character instance
   */
  async get_character_financial_context(user_id: string, character_id: string): Promise<string> {
    console.log('[ECS] get_character_financial_context called for user_id:', user_id, 'character_id:', character_id);
    const { pg_pool } = require('../database/pg');
    
    type UCRow = { wallet: number|null; financial_stress: number|null; coach_trust_level: number|null; name: string };
    
    try {
      const result = await pg_pool.query(`
        SELECT uc.wallet, uc.financial_stress, uc.coach_trust_level, c.name
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.id
        WHERE uc.user_id = $1 AND uc.character_id = $2
      `, [user_id, character_id]);
      
      if (result.rows.length === 0) {
        console.log(`[ECS] No user_character found for user ${user_id}, character ${character_id}`);
        return '';
      }
      
      const char = result.rows[0] as UCRow;
      
      // Null safety on DB fields
      const wallet = Number(char.wallet ?? 0);
      const stress = Number(char.financial_stress ?? 0);
      const trust = Number(char.coach_trust_level ?? 0);
      
      const financial_context = [
        'CURRENT FINANCIAL STATUS:',
        `• Wallet (coins): ${wallet}`,
        `• Financial Stress (0–100): ${stress}`,
        `• Coach Trust (0–100): ${trust}`,
        ''
      ].join('\n');
      
      console.log(`[ECS] financial_context character=${character_id} bytes=${financial_context.length} wallet=${wallet} stress=${stress} trust=${trust}`);
      
      return financial_context;
      
    } catch (error) {
      console.error('[ECS] Database error in get_character_financial_context:', error);
      return '';
    }
  }

  /**
   * Get financial patterns and trends for a character
   */
  async getFinancialPatterns(character_id: string): Promise<{
    successful_decisions: number;
    failed_decisions: number;
    total_amount: number;
    common_decision_types: string[];
    stress_trend: 'improving' | 'declining' | 'stable';
    trust_trend: 'improving' | 'declining' | 'stable';
  }> {
    const financial_memories = this.event_bus.getCharacterMemories(character_id, {
      memory_type: 'financial',
      limit: 20
    });

    let successful_decisions = 0;
    let failed_decisions = 0;
    let total_amount = 0;
    const decision_types: string[] = [];
    const stress_impacts: number[] = [];
    const trust_impacts: number[] = [];

    for (const memory of financial_memories) {
      if (memory.financial_metadata) {
        const { outcome, amount_involved, decision_type, stress_impact, trust_impact } = memory.financial_metadata;

        if (outcome === 'success') successful_decisions++;
        else if (outcome === 'failure') failed_decisions++;

        total_amount += amount_involved;
        decision_types.push(decision_type);
        stress_impacts.push(stress_impact);
        trust_impacts.push(trust_impact);
      }
    }

    // Calculate trends
    const recent_stress_impacts = stress_impacts.slice(-5);
    const recent_trust_impacts = trust_impacts.slice(-5);

    const stress_trend = this.calculateTrend(recent_stress_impacts);
    const trust_trend = this.calculateTrend(recent_trust_impacts);

    // Get common decision types
    const decision_typeCount = decision_types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const common_decision_types = Object.entries(decision_typeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    return {
      successful_decisions,
      failed_decisions,
      total_amount,
      common_decision_types,
      stress_trend,
      trust_trend
    };
  }

  /**
   * Calculate trend from array of numbers
   */
  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';

    const first_half = values.slice(0, Math.floor(values.length / 2));
    const second_half = values.slice(Math.floor(values.length / 2));

    const first_avg = first_half.reduce((a, b) => a + b, 0) / first_half.length;
    const second_avg = second_half.reduce((a, b) => a + b, 0) / second_half.length;

    const diff = second_avg - first_avg;

    if (diff > 2) return 'improving';
    if (diff < -2) return 'declining';
    return 'stable';
  }

  /**
   * Get confessional context - Heavy on shame, secrets, guilt
   */
  async getConfessionalContext(character_id: string): Promise<string> {
    // Get memories from multiple types - we'll need to call multiple times since API only supports single memory_type
    const all_memories = this.event_bus.getCharacterMemories(character_id, { limit: 20 });
    const memories = all_memories.filter(m =>
      ['conflict', 'therapy', 'personal_problems', 'drama', 'confession'].includes(m.memory_type)
    ).slice(0, 8);

    const relevant_memories = memories.filter(memory => {
      const embarrassing = memory.cross_reference_data.embarrassment_level >= 3;
      const secretive = memory.cross_reference_data.secret_level >= 3;
      const emotional = memory.emotional_intensity >= 6;
      return embarrassing || secretive || emotional;
    });

    let context = `Recent memories weighing on ${character_id}:\n`;

    relevant_memories.forEach(memory => {
      const embarrassment_note = memory.cross_reference_data.embarrassment_level >= 5 ? " (deeply embarrassing)" : "";
      const secret_note = memory.cross_reference_data.secret_level >= 5 ? " (secret shame)" : "";
      context += `- ${memory.content}${embarrassment_note}${secret_note}\n`;
    });

    // Add cross-references to other chats
    const cross_refs = this.generateComedyReferences(character_id, 'confessional');
    if (cross_refs.length > 0) {
      context += `\nPotential contradictions to address:\n`;
      cross_refs.forEach(ref => context += `- ${ref}\n`);
    }

    return context;
  }

  /**
   * Get real estate context - Focus on living conditions, complaints
   */
  async getRealEstateContext(character_id: string): Promise<string> {
    const all_memories = this.event_bus.getCharacterMemories(character_id, { limit: 20 });
    const memories = all_memories.filter(m =>
      ['social', 'conflict', 'bonding', 'real_estate', 'therapy'].includes(m.memory_type)
    ).slice(0, 6);

    const living_relevant = memories.filter(memory => {
      const social_conflict = memory.memory_type === 'conflict' && memory.associated_characters.length > 0;
      const privacy_issues = memory.tags.includes('privacy') || memory.tags.includes('space');
      const therapy_related = memory.memory_type === 'therapy' && memory.tags.includes('boundaries');
      return social_conflict || privacy_issues || therapy_related;
    });

    let context = `Living situation insights for ${character_id}:\n`;

    living_relevant.forEach(memory => {
      const privacy_note = memory.tags.includes('privacy') ? " (privacy concern)" : "";
      const conflict_note = memory.associated_characters.length > 1 ? ` (involves ${memory.associated_characters.join(', ')})` : "";
      context += `- ${memory.content}${privacy_note}${conflict_note}\n`;
    });

    // Add therapy session references
    const therapy_memories = memories.filter(m => m.memory_type === 'therapy');
    if (therapy_memories.length > 0) {
      context += `\n_therapy insights affecting living preferences:\n`;
      therapy_memories.slice(0, 2).forEach(memory => {
        context += `- ${memory.content}\n`;
      });
    }

    return context;
  }

  /**
   * Get training context - Physical achievements, failures, progress
   */
  async getTrainingContext(character_id: string): Promise<string> {
    const all_memories = this.event_bus.getCharacterMemories(character_id, { limit: 20 });
    const memories = all_memories.filter(m =>
      ['training', 'battle', 'achievement', 'personal_problems', 'therapy'].includes(m.memory_type)
    ).slice(0, 8);

    const training_relevant = memories.filter(memory => {
      const physical_progress = memory.tags.includes('physical') || memory.tags.includes('training');
      const mental_blockage = memory.memory_type === 'therapy' && memory.tags.includes('confidence');
      const personal_struggles = memory.memory_type === 'personal_problems';
      return physical_progress || mental_blockage || personal_struggles;
    });

    let context = `Training history and mental state for ${character_id}:\n`;

    training_relevant.forEach(memory => {
      const progress_note = memory.emotional_valence === 'positive' ? " (progress)" : memory.emotional_valence === 'negative' ? " (setback)" : "";
      context += `- ${memory.content}${progress_note}\n`;
    });

    // Add cross-references for comedy
    const cross_refs = this.generateComedyReferences(character_id, 'training');
    if (cross_refs.length > 0) {
      context += `\nIronic contrasts with other areas:\n`;
      cross_refs.forEach(ref => context += `- ${ref}\n`);
    }

    return context;
  }

  /**
   * Get personal problems context - Emotional support and advice
   */
  async getPersonalProblemsContext(character_id: string): Promise<string> {
    const all_memories = this.event_bus.getCharacterMemories(character_id, { limit: 20 });
    const memories = all_memories.filter(m =>
      ['personal_problems', 'therapy', 'conflict', 'social'].includes(m.memory_type)
    ).slice(0, 10);

    const support_relevant = memories.filter(memory => {
      const emotionally_intense = memory.emotional_intensity >= 5;
      const recent_conflict = memory.memory_type === 'conflict' && memory.created_at.getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000);
      return emotionally_intense || recent_conflict;
    });

    let context = `Personal struggles and emotional state for ${character_id}:\n`;

    support_relevant.forEach(memory => {
      const intensity_note = memory.emotional_intensity >= 8 ? " (very intense)" : memory.emotional_intensity >= 6 ? " (significant)" : "";
      context += `- ${memory.content}${intensity_note}\n`;
    });

    // Add therapy session context
    const therapy_memories = memories.filter(m => m.memory_type === 'therapy');
    if (therapy_memories.length > 0) {
      context += `\n_therapy progress relevant to current problems:\n`;
      therapy_memories.slice(0, 2).forEach(memory => {
        context += `- ${memory.content}\n`;
      });
    }

    return context;
  }

  /**
   * Get kitchen context - Social conflicts and living arrangements
   */
  async getKitchenContext(character_id: string): Promise<string> {
    const all_memories = this.event_bus.getCharacterMemories(character_id, { limit: 20 });
    const memories = all_memories.filter(m =>
      ['social', 'conflict', 'drama', 'kitchen'].includes(m.memory_type)
    ).slice(0, 8);

    const kitchen_relevant = memories.filter(memory => {
      const living_conflict = memory.tags.includes('kitchen') || memory.tags.includes('living');
      const social_tension = memory.memory_type === 'conflict' && memory.associated_characters.length > 0;
      const daily_drama = memory.tags.includes('daily') || memory.tags.includes('routine');
      return living_conflict || social_tension || daily_drama;
    });

    let context = `Recent kitchen and living arrangement dynamics for ${character_id}:\n`;

    kitchen_relevant.forEach(memory => {
      const conflict_note = memory.associated_characters.length > 1 ? ` (tension with ${memory.associated_characters.join(', ')})` : "";
      const intensity_note = memory.emotional_intensity >= 7 ? " (heated)" : "";
      context += `- ${memory.content}${conflict_note}${intensity_note}\n`;
    });

    return context;
  }

  /**
   * Get group activities context - Team dynamics and social interactions
   */
  async getGroupActivitiesContext(character_id: string): Promise<string> {
    const all_memories = this.event_bus.getCharacterMemories(character_id, { limit: 20 });
    const memories = all_memories.filter(m =>
      ['group_activity', 'social', 'conflict', 'bonding'].includes(m.memory_type)
    ).slice(0, 8);

    const group_relevant = memories.filter(memory => {
      const multiple_participants = memory.associated_characters.length >= 2;
      const team_dynamics = memory.tags.includes('team') || memory.tags.includes('group');
      return multiple_participants || team_dynamics;
    });

    let context = `Group dynamics and social patterns for ${character_id}:\n`;

    group_relevant.forEach(memory => {
      const participant_note = memory.associated_characters.length > 0 ? ` (with ${memory.associated_characters.join(', ')})` : "";
      const role_note = memory.tags.includes('leadership') ? " (leadership moment)" : memory.tags.includes('cooperation') ? " (cooperation)" : "";
      context += `- ${memory.content}${participant_note}${role_note}\n`;
    });

    return context;
  }

  /**
   * Generate comedy references from past events for cross-chat humor using flexible templates
   */
  generateComedyReferences(character_id: string, current_chat_type: string, current_topic: string = ''): string[] {
    const all_memories = this.event_bus.getCharacterMemories(character_id, { limit: 20 });
    const comedy_service = ComedyTemplateService.get_instance();

    const relevant_memories = all_memories.filter(memory => {
      const has_comedy_potential = memory.cross_reference_data.comedy_potential >= 6;
      const can_reference = memory.cross_reference_data.can_referenced_in.includes(current_chat_type);
      const has_contradiction = memory.cross_reference_data.contradiction_potential >= 5;
      const has_embarrassment = memory.cross_reference_data.embarrassment_level >= 5;
      const has_quotability = memory.cross_reference_data.quotability >= 5;

      return has_comedy_potential || can_reference || has_contradiction || has_embarrassment || has_quotability;
    });

    // Use flexible template system to generate comedy references
    return comedy_service.generateMultipleReferences(relevant_memories, current_chat_type, current_topic, 3);
  }

  /**
   * Get comedy context for a specific chat interaction
   */
  getComedyContext(character_id: string, current_chat_type: string, current_topic: string = ''): string {
    const comedy_references = this.generateComedyReferences(character_id, current_chat_type, current_topic);

    if (comedy_references.length === 0) {
      return '';
    }

    let context = 'Recent moments that could create humor or tension:\n';
    comedy_references.forEach((reference, index) => {
      context += `${index + 1}. ${reference}\n`;
    });

    return context;
  }

  /**
   * Get team battle context for battle communications
   */
  async getTeamBattleContext(character_id: string): Promise<string> {
    const config: ContextConfig = {
      max_tokens: 250,
      domain_focus: 'performance',
      include_living_context: false,
      include_relationships: true,
      include_recent_events: true,
      include_emotional_state: true,
      time_range: '1_day'
    };

    const context = await this.generateCompressedContext(character_id, config);

    // Add battle-specific context
    let battle_context = '';

    // Get recent battle events
    const battle_events = this.event_bus.getEventHistory(character_id, {
      categories: ['battle'],
      time_range: '1_day',
      limit: 3
    });

    if (battle_events.length > 0) {
      const recent_battles = battle_events.map(event => {
        const time_ago = this.getTimeAgo(event.timestamp);
        const result = event.type.includes('victory') ? 'victory' : event.type.includes('defeat') ? 'defeat' : 'participation';
        return `• Recent ${result}: ${event.description} (${time_ago})`;
      });

      battle_context += `RECENT BATTLE HISTORY:\n${recent_battles.join('\n')}\n\n`;
    }

    return battle_context + this.formatContextForPrompt(context);
  }

  // Branch factsheet for controlled cold-open injection
  async getBranchFactsheet(user_id: string, character_id: string, branch_id?: string): Promise<string> {
    // Placeholder implementation - returns empty for now
    // In the future, this will retrieve from LocalAGI vectorstore or pgvector
    console.log('[branch] getBranchFactsheet called but not implemented yet:', { user_id, character_id, branch_id });
    return '';
  }
}

export default EventContextService;
