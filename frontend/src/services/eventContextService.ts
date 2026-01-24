// Smart Context Compression Service
// Generates concise, efficient context from the centralized event system

import GameEventBus, { GameEvent, CharacterMemory, CharacterRelationship, EventFilter, EventCategory } from './gameEventBus';
import ComedyTemplateService from './comedyTemplateService';

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
  tokenCount: number;
}

export interface RelationshipSummary {
  allies: Array<{ name: string; trust: number; note: string }>;
  rivals: Array<{ name: string; rivalry: number; note: string }>;
  neutral: Array<{ name: string; note: string }>;
}

export class EventContextService {
  private static instance: EventContextService;
  private eventBus: GameEventBus;
  private character_nameMap: Map<string, string> = new Map();

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
    this.initializeCharacterNames();
  }

  static getInstance(): EventContextService {
    if (!EventContextService.instance) {
      EventContextService.instance = new EventContextService();
    }
    return EventContextService.instance;
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
      this.character_nameMap.set(id, name);
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
    const fullContext = [recent_events, relationships, emotional_state, domain_specific].join('\n');
    const tokenCount = Math.ceil(fullContext.length / 4);

    // If over token limit, compress further
    if (tokenCount > config.max_tokens) {
      return await this.compressContext({
        recent_events,
        relationships,
        emotional_state,
        domain_specific,
        tokenCount
      }, config);
    }

    return {
      recent_events,
      relationships,
      emotional_state,
      domain_specific,
      tokenCount
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

    const events = this.eventBus.getEventHistory(character_id, filter);

    if (events.length === 0) return '';

    const eventStrings = events.map(event => this.formatEventForContext(event, character_id));

    return `RECENT EVENTS (last ${config.time_range.replace('_', ' ')}):\n${eventStrings.join('\n')}`;
  }

  // Generate relationships context
  private async generateRelationshipsContext(character_id: string, config: ContextConfig): Promise<string> {
    const relationshipMap = this.eventBus.getRelationshipSummary(character_id);

    if (relationshipMap.size === 0) return '';

    const summary = this.categorizeRelationships(relationshipMap);
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

  // Generate emotional state context
  private async generateEmotionalStateContext(character_id: string, config: ContextConfig): Promise<string> {
    const memories = this.eventBus.getCharacterMemories(character_id, {
      importance: 6,
      limit: 5
    });

    if (memories.length === 0) return '';

    // Calculate emotional state from recent memories
    let positiveIntensity = 0;
    let negativeIntensity = 0;
    let stress_level = 0;

    for (const memory of memories) {
      if (memory.emotional_valence === 'positive') {
        positiveIntensity += memory.emotional_intensity;
      } else if (memory.emotional_valence === 'negative') {
        negativeIntensity += memory.emotional_intensity;
        stress_level += memory.emotional_intensity;
      }
    }

    const overallMood = positiveIntensity > negativeIntensity ? 'positive' :
      negativeIntensity > positiveIntensity ? 'stressed' : 'neutral';

    const confidence = Math.max(0, Math.min(100, 50 + positiveIntensity - negativeIntensity));

    return `EMOTIONAL STATE: ${overallMood} (confidence: ${confidence}%, stress: ${Math.min(100, stress_level * 10)}%)`;
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
      case 'abilities' as any:
        return await this.generateAbilitiesContext(character_id);
      default:
        return '';
    }
  }

  // Domain-specific context generators
  private async generatePerformanceContext(character_id: string): Promise<string> {
    const battleEvents = this.eventBus.getEventHistory(character_id, {
      categories: ['battle'],
      time_range: '1_week',
      limit: 5
    });

    const victories = battleEvents.filter(e => e.type === 'battle_victory').length;
    const defeats = battleEvents.filter(e => e.type === 'battle_defeat').length;
    const total = victories + defeats;

    if (total === 0) return 'PERFORMANCE: No recent battles';

    const winRate = Math.round((victories / total) * 100);
    const trend = victories > defeats ? '📈 improving' : defeats > victories ? '📉 declining' : '➡️ stable';

    return `PERFORMANCE: ${victories}W/${defeats}L (${winRate}% win rate, ${trend})`;
  }

  private async generateEquipmentContext(character_id: string): Promise<string> {
    const equipmentEvents = this.eventBus.getEventHistory(character_id, {
      categories: ['progression'],
      time_range: '3_days'
    }).filter(e => e.type === 'equipment_equipped' || e.type === 'equipment_upgraded');

    if (equipmentEvents.length === 0) return 'EQUIPMENT: No recent changes';

    const recentChanges = equipmentEvents.slice(0, 2).map(e =>
      `${e.metadata.itemName} ${e.type === 'equipment_upgraded' ? 'upgraded' : 'equipped'}`
    ).join(', ');

    return `EQUIPMENT: Recent changes - ${recentChanges}`;
  }

  private async generateSkillsContext(character_id: string): Promise<string> {
    const skillEvents = this.eventBus.getEventHistory(character_id, {
      categories: ['training', 'progression'],
      time_range: '1_week'
    }).filter(e => e.type === 'skill_improvement' || e.type === 'new_technique_learned');

    if (skillEvents.length === 0) return 'SKILLS: No recent learning';

    const recentSkills = skillEvents.slice(0, 3).map(e =>
      e.metadata.skillName || e.description.split(' ')[0]
    ).join(', ');

    return `SKILLS: Recently learned - ${recentSkills}`;
  }

  private async generateAbilitiesContext(character_id: string): Promise<string> {
    const abilityEvents = this.eventBus.getEventHistory(character_id, {
      categories: ['training', 'progression', 'battle'],
      time_range: '1_week'
    }).filter(e =>
      e.type === 'ability_learned' ||
      e.type === 'power_unlocked' ||
      e.type === 'spell_learned' ||
      e.type === 'skill_improvement'
    );

    if (abilityEvents.length === 0) return 'ABILITIES: No recent developments';

    const recent = abilityEvents.slice(0, 3).map(e =>
      e.description.split(':')[0] || e.type.replace(/_/g, ' ')
    ).join(', ');

    return `ABILITIES: Recent developments - ${recent}`;
  }

  private async generateTherapyContext(character_id: string): Promise<string> {
    const therapyEvents = this.eventBus.getEventHistory(character_id, {
      categories: ['therapy'],
      time_range: '1_week'
    });

    const breakthroughs = therapyEvents.filter(e => e.type === 'therapy_breakthrough').length;
    const resistances = therapyEvents.filter(e => e.type === 'therapy_resistance').length;

    if (therapyEvents.length === 0) return 'THERAPY: No recent sessions';

    const progress = breakthroughs > resistances ? '🎯 making progress' :
      resistances > breakthroughs ? '🛡️ showing resistance' : '➡️ stable';

    return `THERAPY: ${therapyEvents.length} sessions this week, ${progress}`;
  }

  private async generateSocialContext(character_id: string): Promise<string> {
    const socialEvents = this.eventBus.getEventHistory(character_id, {
      categories: ['social'],
      time_range: '3_days'
    });

    const conflicts = socialEvents.filter(e => e.type.includes('conflict') || e.type.includes('argument')).length;
    const positive = socialEvents.filter(e => e.type.includes('conversation') || e.type.includes('activity')).length;

    if (socialEvents.length === 0) return 'SOCIAL: Quiet few days';

    const mood = conflicts > positive ? '⚡ tense household' :
      positive > conflicts ? '🤝 harmonious' : '😐 typical interactions';

    return `SOCIAL: ${socialEvents.length} interactions, ${mood}`;
  }

  // Helper methods
  private formatEventForContext(event: GameEvent, character_id: string): string {
    const timeAgo = this.getTimeAgo(event.timestamp);
    const severity = this.getSeverityEmoji(event.severity);
    const otherCharacters = [event.primary_character_id, ...(event.secondary_character_ids || [])]
      .filter(id => id !== character_id)
      .map(id => this.character_nameMap.get(id) || id)
      .slice(0, 2);

    let description = event.description;
    if (otherCharacters.length > 0) {
      description += ` (with ${otherCharacters.join(', ')})`;
    }

    return `• ${severity} ${description} (${timeAgo})`;
  }

  private categorizeRelationships(relationshipMap: Map<string, CharacterRelationship>): RelationshipSummary {
    const allies: RelationshipSummary['allies'] = [];
    const rivals: RelationshipSummary['rivals'] = [];
    const neutral: RelationshipSummary['neutral'] = [];

    for (const target_id of Array.from(relationshipMap.keys())) {
      const relationship = relationshipMap.get(target_id);
      if (!relationship) continue;
      const name = this.character_nameMap.get(target_id) || target_id;

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
    const categoryMap: Record<string, EventCategory[]> = {
      'performance': ['battle', 'training'],
      'equipment': ['progression', 'battle'],
      'skills': ['training', 'progression'],
      'therapy': ['therapy', 'social'],
      'social': ['social', 'communication'],
      'abilities': ['training', 'progression', 'battle']
    };

    return categoryMap[domain] || [];
  }

  private getSeverityEmoji(severity: string): string {
    const emojiMap = {
      'low': '🟨',
      'medium': '🟧',
      'high': '🟥',
      'critical': '💥'
    };
    return emojiMap[severity as keyof typeof emojiMap] || '•';
  }

  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
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

    let compressedContext = { ...context };
    let currentTokens = context.tokenCount;

    // Compress sections in order of priority
    for (const section of sections.sort((a, b) => a.priority - b.priority)) {
      if (currentTokens <= config.max_tokens) break;

      const compressed = this.compressSection(section.content);
      (compressedContext as any)[section.name] = compressed;

      const tokenReduction = Math.ceil((section.content.length - compressed.length) / 4);
      currentTokens -= tokenReduction;
    }

    compressedContext.tokenCount = currentTokens;
    return compressedContext;
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

  async getAbilitiesContext(character_id: string): Promise<string> {
    const config: ContextConfig = {
      max_tokens: 200,
      domain_focus: 'abilities' as any, // Cast to any because ContextConfig type might not be updated yet
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
    const config: ContextConfig = {
      max_tokens: 250,
      domain_focus: 'general',
      include_living_context: false,
      include_relationships: false,
      include_recent_events: true,
      include_emotional_state: true,
      time_range: '1_week'
    };

    // Get financial-specific memories
    const financialMemories = this.eventBus.getCharacterMemories(character_id, {
      memory_type: 'financial',
      limit: 5
    });

    // Get recent financial events
    const financialEvents = this.eventBus.getEventHistory(character_id, {
      categories: ['financial'],
      time_range: '1_week',
      limit: 10
    });

    const context = await this.generateCompressedContext(character_id, config);

    // Add financial-specific context
    let financialContext = '';

    if (financialMemories.length > 0) {
      const memoryStrings = financialMemories.map(memory => {
        const outcome = memory.financial_metadata?.outcome || 'unknown';
        const amount = memory.financial_metadata?.amount_involved || 0;
        const decision_type = memory.financial_metadata?.decision_type || 'unknown';
        const timeAgo = this.getTimeAgo(memory.created_at);

        return `• ${memory.content} (${decision_type}, $${amount.toLocaleString()}, ${outcome}, ${timeAgo})`;
      });

      financialContext += `FINANCIAL DECISION HISTORY:\n${memoryStrings.join('\n')}\n\n`;
    }

    if (financialEvents.length > 0) {
      const recent_events = financialEvents.slice(0, 5).map(event => {
        const timeAgo = this.getTimeAgo(event.timestamp);
        const severity = this.getSeverityEmoji(event.severity);
        return `• ${severity} ${event.description} (${timeAgo})`;
      });

      financialContext += `RECENT FINANCIAL EVENTS:\n${recent_events.join('\n')}\n\n`;
    }

    return financialContext + this.formatContextForPrompt(context);
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
    const financialMemories = this.eventBus.getCharacterMemories(character_id, {
      memory_type: 'financial',
      limit: 20
    });

    let successfulDecisions = 0;
    let failedDecisions = 0;
    let totalAmount = 0;
    const decision_types: string[] = [];
    const stress_impacts: number[] = [];
    const trustImpacts: number[] = [];

    for (const memory of financialMemories) {
      if (memory.financial_metadata) {
        const { outcome, amount_involved, decision_type, stress_impact, trust_impact } = memory.financial_metadata;

        if (outcome === 'success') successfulDecisions++;
        else if (outcome === 'failure') failedDecisions++;

        totalAmount += amount_involved;
        decision_types.push(decision_type);
        stress_impacts.push(stress_impact);
        trustImpacts.push(trust_impact);
      }
    }

    // Calculate trends
    const recentStressImpacts = stress_impacts.slice(-5);
    const recentTrustImpacts = trustImpacts.slice(-5);

    const stressTrend = this.calculateTrend(recentStressImpacts);
    const trustTrend = this.calculateTrend(recentTrustImpacts);

    // Get common decision types
    const decision_typeCount = decision_types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonDecisionTypes = Object.entries(decision_typeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    return {
      successful_decisions: successfulDecisions,
      failed_decisions: failedDecisions,
      total_amount: totalAmount,
      common_decision_types: commonDecisionTypes,
      stress_trend: stressTrend,
      trust_trend: trustTrend
    };
  }

  /**
   * Calculate trend from array of numbers
   */
  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 2) return 'improving';
    if (diff < -2) return 'declining';
    return 'stable';
  }

  /**
   * Get confessional context - Heavy on shame, secrets, guilt
   */
  async getConfessionalContext(character_id: string): Promise<string> {
    // Get memories from multiple types - we'll need to call multiple times since API only supports single memoryType
    const allMemories = this.eventBus.getCharacterMemories(character_id, { limit: 20 });
    const memories = allMemories.filter(m =>
      ['conflict', 'therapy', 'personal_problems', 'drama', 'confession'].includes(m.memory_type)
    ).slice(0, 8);

    const relevantMemories = memories.filter(memory => {
      const embarrassing = memory.cross_reference_data?.embarrassment_level >= 3;
      const secretive = memory.cross_reference_data?.secret_level >= 3;
      const emotional = memory.emotional_intensity >= 6;
      return embarrassing || secretive || emotional;
    });

    let context = `Recent memories weighing on ${character_id}:\n`;

    relevantMemories.forEach(memory => {
      const embarrassmentNote = memory.cross_reference_data?.embarrassment_level >= 5 ? " (deeply embarrassing)" : "";
      const secretNote = memory.cross_reference_data?.secret_level >= 5 ? " (secret shame)" : "";
      context += `- ${memory.content}${embarrassmentNote}${secretNote}\n`;
    });

    // Add cross-references to other chats
    const crossRefs = this.generateComedyReferences(character_id, 'confessional');
    if (crossRefs.length > 0) {
      context += `\nPotential contradictions to address:\n`;
      crossRefs.forEach(ref => context += `- ${ref}\n`);
    }

    return context;
  }

  /**
   * Get real estate context - Focus on living conditions, complaints
   */
  async getRealEstateContext(character_id: string): Promise<string> {
    const allMemories = this.eventBus.getCharacterMemories(character_id, { limit: 20 });
    const memories = allMemories.filter(m =>
      ['social', 'conflict', 'bonding', 'real_estate', 'therapy'].includes(m.memory_type)
    ).slice(0, 6);

    const livingRelevant = memories.filter(memory => {
      const socialConflict = memory.memory_type === 'conflict' && memory.associated_characters.length > 0;
      const privacyIssues = memory.tags.includes('privacy') || memory.tags.includes('space');
      const therapyRelated = memory.memory_type === 'therapy' && memory.tags.includes('boundaries');
      return socialConflict || privacyIssues || therapyRelated;
    });

    let context = `Living situation insights for ${character_id}:\n`;

    livingRelevant.forEach(memory => {
      const privacyNote = memory.tags.includes('privacy') ? " (privacy concern)" : "";
      const conflictNote = memory.associated_characters.length > 1 ? ` (involves ${memory.associated_characters.join(', ')})` : "";
      context += `- ${memory.content}${privacyNote}${conflictNote}\n`;
    });

    // Add therapy session references
    const therapyMemories = memories.filter(m => m.memory_type === 'therapy');
    if (therapyMemories.length > 0) {
      context += `\nTherapy insights affecting living preferences:\n`;
      therapyMemories.slice(0, 2).forEach(memory => {
        context += `- ${memory.content}\n`;
      });
    }

    return context;
  }

  /**
   * Get training context - Physical achievements, failures, progress
   */
  async getTrainingContext(character_id: string): Promise<string> {
    const allMemories = this.eventBus.getCharacterMemories(character_id, { limit: 20 });
    const memories = allMemories.filter(m =>
      ['training', 'battle', 'achievement', 'personal_problems', 'therapy'].includes(m.memory_type)
    ).slice(0, 8);

    const trainingRelevant = memories.filter(memory => {
      const physicalProgress = memory.tags.includes('physical') || memory.tags.includes('training');
      const mentalBlockage = memory.memory_type === 'therapy' && memory.tags.includes('confidence');
      const personalStruggles = memory.memory_type === 'personal_problems';
      return physicalProgress || mentalBlockage || personalStruggles;
    });

    let context = `Training history and mental state for ${character_id}:\n`;

    trainingRelevant.forEach(memory => {
      const progressNote = memory.emotional_valence === 'positive' ? " (progress)" : memory.emotional_valence === 'negative' ? " (setback)" : "";
      context += `- ${memory.content}${progressNote}\n`;
    });

    // Add cross-references for comedy
    const crossRefs = this.generateComedyReferences(character_id, 'training');
    if (crossRefs.length > 0) {
      context += `\nIronic contrasts with other areas:\n`;
      crossRefs.forEach(ref => context += `- ${ref}\n`);
    }

    return context;
  }

  /**
   * Get personal problems context - Emotional support and advice
   */
  async getPersonalProblemsContext(character_id: string): Promise<string> {
    const allMemories = this.eventBus.getCharacterMemories(character_id, { limit: 20 });
    const memories = allMemories.filter(m =>
      ['personal_problems', 'therapy', 'conflict', 'social'].includes(m.memory_type)
    ).slice(0, 10);

    const supportRelevant = memories.filter(memory => {
      const emotionallyIntense = memory.emotional_intensity >= 5;
      const recentConflict = memory.memory_type === 'conflict' && memory.created_at.getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000);
      return emotionallyIntense || recentConflict;
    });

    let context = `Personal struggles and emotional state for ${character_id}:\n`;

    supportRelevant.forEach(memory => {
      const intensityNote = memory.emotional_intensity >= 8 ? " (very intense)" : memory.emotional_intensity >= 6 ? " (significant)" : "";
      context += `- ${memory.content}${intensityNote}\n`;
    });

    // Add therapy session context
    const therapyMemories = memories.filter(m => m.memory_type === 'therapy');
    if (therapyMemories.length > 0) {
      context += `\nTherapy progress relevant to current problems:\n`;
      therapyMemories.slice(0, 2).forEach(memory => {
        context += `- ${memory.content}\n`;
      });
    }

    return context;
  }

  /**
   * Get kitchen context - Social conflicts and living arrangements
   */
  async getKitchenContext(character_id: string): Promise<string> {
    const allMemories = this.eventBus.getCharacterMemories(character_id, { limit: 20 });
    const memories = allMemories.filter(m =>
      ['social', 'conflict', 'drama', 'kitchen'].includes(m.memory_type)
    ).slice(0, 8);

    const kitchenRelevant = memories.filter(memory => {
      const livingConflict = memory.tags.includes('kitchen') || memory.tags.includes('living');
      const socialTension = memory.memory_type === 'conflict' && memory.associated_characters.length > 0;
      const dailyDrama = memory.tags.includes('daily') || memory.tags.includes('routine');
      return livingConflict || socialTension || dailyDrama;
    });

    let context = `Recent kitchen and living arrangement dynamics for ${character_id}:\n`;

    kitchenRelevant.forEach(memory => {
      const conflictNote = memory.associated_characters.length > 1 ? ` (tension with ${memory.associated_characters.join(', ')})` : "";
      const intensityNote = memory.emotional_intensity >= 7 ? " (heated)" : "";
      context += `- ${memory.content}${conflictNote}${intensityNote}\n`;
    });

    return context;
  }

  /**
   * Get group activities context - Team dynamics and social interactions
   */
  async getGroupActivitiesContext(character_id: string): Promise<string> {
    const allMemories = this.eventBus.getCharacterMemories(character_id, { limit: 20 });
    const memories = allMemories.filter(m =>
      ['group_activity', 'social', 'conflict', 'bonding'].includes(m.memory_type)
    ).slice(0, 8);

    const groupRelevant = memories.filter(memory => {
      const multipleParticipants = memory.associated_characters.length >= 2;
      const teamDynamics = memory.tags.includes('team') || memory.tags.includes('group');
      return multipleParticipants || teamDynamics;
    });

    let context = `Group dynamics and social patterns for ${character_id}:\n`;

    groupRelevant.forEach(memory => {
      const participantNote = memory.associated_characters.length > 0 ? ` (with ${memory.associated_characters.join(', ')})` : "";
      const roleNote = memory.tags.includes('leadership') ? " (leadership moment)" : memory.tags.includes('cooperation') ? " (cooperation)" : "";
      context += `- ${memory.content}${participantNote}${roleNote}\n`;
    });

    return context;
  }

  /**
   * Generate comedy references from past events for cross-chat humor using flexible templates
   */
  generateComedyReferences(character_id: string, current_chat_type: string, current_topic: string = ''): string[] {
    const allMemories = this.eventBus.getCharacterMemories(character_id, { limit: 20 });
    const comedyService = ComedyTemplateService.getInstance();

    const relevantMemories = allMemories.filter(memory => {
      const hasComedyPotential = memory.cross_reference_data?.comedy_potential >= 6;
      const canReference = memory.cross_reference_data?.can_referenced_in?.includes(current_chat_type);
      const hasContradiction = memory.cross_reference_data?.contradiction_potential >= 5;
      const hasEmbarrassment = memory.cross_reference_data?.embarrassment_level >= 5;
      const hasQuotability = memory.cross_reference_data?.quotability >= 5;

      return hasComedyPotential || canReference || hasContradiction || hasEmbarrassment || hasQuotability;
    });

    // Use flexible template system to generate comedy references
    return comedyService.generateMultipleReferences(relevantMemories, current_chat_type, current_topic, 3);
  }

  /**
   * Get comedy context for a specific chat interaction
   */
  getComedyContext(character_id: string, current_chat_type: string, current_topic: string = ''): string {
    const comedyReferences = this.generateComedyReferences(character_id, current_chat_type, current_topic);

    if (comedyReferences.length === 0) {
      return '';
    }

    let context = 'Recent moments that could create humor or tension:\n';
    comedyReferences.forEach((reference, index) => {
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
    const battleEvents = this.eventBus.getEventHistory(character_id, {
      categories: ['battle'],
      time_range: '1_day',
      limit: 3
    });

    if (battleEvents.length > 0) {
      const recentBattles = battleEvents.map(event => {
        const timeAgo = this.getTimeAgo(event.timestamp);
        const result = event.type.includes('victory') ? 'victory' : event.type.includes('defeat') ? 'defeat' : 'participation';
        return `• Recent ${result}: ${event.description} (${timeAgo})`;
      });

      battle_context += `RECENT BATTLE HISTORY:\n${recentBattles.join('\n')}\n\n`;
    }

    return battle_context + this.formatContextForPrompt(context);
  }
}

export default EventContextService;
