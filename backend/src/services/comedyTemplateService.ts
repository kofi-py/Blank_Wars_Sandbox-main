import { CharacterMemory } from './gameEventBus';

/**
 * Comedy Template Service - Creates flexible cross-chat humor references
 * Uses variable templates that adapt to actual memory content for authentic comedy
 */

export interface ComedyTemplate {
  id: string;
  template: string;
  required_fields: string[];
  min_embarrassment_level?: number;
  min_contradiction_potential?: number;
  min_quotability?: number;
  required_tags?: string[];
  category: 'contradiction' | 'embarrassing' | 'ironic' | 'callback';
}

export interface TemplateVariables {
  chat_system: string;
  time_reference: string;
  topic: string;
  action?: string;
  emotional_event?: string;
  character_name?: string;
  past_behavior?: string;
  severity?: string;
}

export class ComedyTemplateService {
  private static instance: ComedyTemplateService;

  public static get_instance(): ComedyTemplateService {
    if (!ComedyTemplateService.instance) {
      ComedyTemplateService.instance = new ComedyTemplateService();
    }
    return ComedyTemplateService.instance;
  }

  private comedy_templates: ComedyTemplate[] = [
    // Contradiction Templates
    {
      id: 'contradiction_past_action',
      template: "Funny, because in {chat_system} {time_reference} you were {action} about {topic}...",
      required_fields: ['chat_system', 'time_reference', 'action', 'topic'],
      min_contradiction_potential: 6,
      category: 'contradiction'
    },
    {
      id: 'contradiction_advice',
      template: "You're giving me advice, but in {chat_system} you said you struggle with {topic}.",
      required_fields: ['chat_system', 'topic'],
      min_contradiction_potential: 7,
      category: 'contradiction'
    },
    {
      id: 'contradiction_opposite',
      template: "The irony is that just {time_reference} in {chat_system} you were saying the opposite about {topic}...",
      required_fields: ['time_reference', 'chat_system', 'topic'],
      min_contradiction_potential: 8,
      category: 'contradiction'
    },

    // Embarrassing Callback Templates
    {
      id: 'embarrassing_meltdown',
      template: "Remember when you had that {emotional_event} in {chat_system} about {topic}?",
      required_fields: ['emotional_event', 'chat_system', 'topic'],
      min_embarrassment_level: 6,
      required_tags: ['embarrassing'],
      category: 'embarrassing'
    },
    {
      id: 'embarrassing_confession',
      template: "This reminds me of when you {past_behavior} in {chat_system} about {topic}.",
      required_fields: ['past_behavior', 'chat_system', 'topic'],
      min_embarrassment_level: 5,
      category: 'embarrassing'
    },
    {
      id: 'embarrassing_dramatic',
      template: "Just like when you got all {severity} during {chat_system} about {topic}...",
      required_fields: ['severity', 'chat_system', 'topic'],
      min_embarrassment_level: 7,
      required_tags: ['dramatic'],
      category: 'embarrassing'
    },

    // Ironic Reference Templates
    {
      id: 'ironic_advice_giver',
      template: "Of all people to give advice about {topic}, considering what happened in {chat_system}...",
      required_fields: ['topic', 'chat_system'],
      min_quotability: 6,
      category: 'ironic'
    },
    {
      id: 'ironic_focus_own_issues',
      template: "Maybe focus on your own {topic} first, like what happened in {chat_system} {time_reference}?",
      required_fields: ['topic', 'chat_system', 'time_reference'],
      min_quotability: 7,
      category: 'ironic'
    },

    // Callback Templates
    {
      id: 'callback_pattern',
      template: "Here we go again... just like in {chat_system} when you {past_behavior} about {topic}.",
      required_fields: ['chat_system', 'past_behavior', 'topic'],
      min_quotability: 5,
      category: 'callback'
    },
    {
      id: 'callback_history',
      template: "Your track record speaks for itself - remember {chat_system}? The whole {topic} situation?",
      required_fields: ['chat_system', 'topic'],
      min_quotability: 6,
      category: 'callback'
    }
  ];

  /**
   * Generate comedy reference from a memory and current context
   */
  public generateComedyReference(
    target_memory: CharacterMemory,
    current_context: string,
    current_topic: string
  ): string | null {
    // Find suitable templates based on memory metadata
    const suitable_templates = this.findSuitableTemplates(target_memory);

    if (suitable_templates.length === 0) {
      return null;
    }

    // Select best template (randomly from suitable ones for variety)
    const selected_template = suitable_templates[Math.floor(Math.random() * suitable_templates.length)];

    // Extract variables from memory
    const variables = this.extractVariables(target_memory, current_context, current_topic);

    // Generate the comedy reference
    return this.fillTemplate(selected_template, variables);
  }

  /**
   * Find templates that match the memory's comedy potential
   */
  private findSuitableTemplates(memory: CharacterMemory): ComedyTemplate[] {
    return this.comedy_templates.filter(template => {
      // Check embarrassment level requirement
      if (template.min_embarrassment_level &&
          (!memory.cross_reference_data?.embarrassment_level ||
           memory.cross_reference_data.embarrassment_level < template.min_embarrassment_level)) {
        return false;
      }

      // Check contradiction potential requirement
      if (template.min_contradiction_potential &&
          (!memory.cross_reference_data?.contradiction_potential ||
           memory.cross_reference_data.contradiction_potential < template.min_contradiction_potential)) {
        return false;
      }

      // Check quotability requirement
      if (template.min_quotability &&
          (!memory.cross_reference_data?.quotability ||
           memory.cross_reference_data.quotability < template.min_quotability)) {
        return false;
      }

      // Check required tags
      if (template.required_tags &&
          !template.required_tags.some(tag => memory.cross_reference_data?.comedy_tags?.includes(tag))) {
        return false;
      }

      return true;
    });
  }

  /**
   * Extract variables from memory for template filling
   */
  private extractVariables(
    memory: CharacterMemory,
    current_context: string,
    current_topic: string
  ): TemplateVariables {
    const chat_systemMap: { [key: string]: string } = {
      'kitchen_table': 'kitchen',
      'therapy_session': 'therapy',
      'real_estate': 'real estate',
      'training_session': 'training',
      'equipment_advice': 'equipment consultation',
      'confessional_booth': 'confessional',
      'clubhouse_lounge': 'clubhouse',
      'group_activities': 'group activities',
      'ai_drama_board': 'message board',
      'team_battle_chat': 'team chat',
      'combat_coaching': 'coaching',
      'financial_advisor': 'financial planning'
    };

    const time_reference = this.getTimeReference(memory.created_at);
    const chat_system = chat_systemMap[memory.memory_type] || memory.memory_type;
    const topic = this.extractTopic(memory.content);

    return {
      chat_system,
      time_reference,
      topic,
      action: this.extractAction(memory),
      emotional_event: this.extractEmotionalEvent(memory),
      character_name: memory.character_id,
      past_behavior: this.extractPastBehavior(memory),
      severity: this.extractSeverity(memory)
    };
  }

  /**
   * Fill template with variables
   */
  private fillTemplate(template: ComedyTemplate, variables: TemplateVariables): string {
    let result = template.template;

    // Replace all variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      if (value) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
      }
    });

    return result;
  }

  /**
   * Convert timestamp to natural time reference
   */
  private getTimeReference(timestamp: Date): string {
    const now = new Date();
    const diff_hours = Math.abs(now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    if (diff_hours < 2) return 'just now';
    if (diff_hours < 12) return 'earlier today';
    if (diff_hours < 24) return 'yesterday';
    if (diff_hours < 48) return 'the other day';
    if (diff_hours < 168) return 'this week';
    return 'recently';
  }

  /**
   * Extract main topic from memory content
   */
  private extractTopic(content: string): string {
    // Simple topic extraction - take key phrases from content
    const words = content.toLowerCase().split(' ');
    const key_topics = ['bathroom', 'kitchen', 'money', 'training', 'battle', 'relationship', 'therapy', 'living', 'housing'];

    for (const topic of key_topics) {
      if (content.toLowerCase().includes(topic)) {
        return topic;
      }
    }

    // Fallback to first few words
    return words.slice(0, 3).join(' ');
  }

  /**
   * Extract action from memory type and content
   */
  private extractAction(memory: CharacterMemory): string {
    const action_map: { [key: string]: string } = {
      'conflict': 'arguing',
      'complaint': 'complaining',
      'celebration': 'bragging',
      'confession': 'admitting',
      'struggle': 'struggling'
    };

    return action_map[memory.memory_type] || 'talking';
  }

  /**
   * Extract emotional event description
   */
  private extractEmotionalEvent(memory: CharacterMemory): string {
    const intensity = memory.emotional_intensity;
    const emotional_tags = memory.cross_reference_data?.comedy_tags || [];

    if (emotional_tags.includes('dramatic')) return 'breakdown';
    if (intensity >= 8) return 'meltdown';
    if (intensity >= 6) return 'outburst';
    if (emotional_tags.includes('embarrassing')) return 'moment';

    return 'situation';
  }

  /**
   * Extract past behavior description
   */
  private extractPastBehavior(memory: CharacterMemory): string {
    const behavior_map: { [key: string]: string } = {
      'conflict': 'got all worked up',
      'confession': 'opened up',
      'complaint': 'vented',
      'celebration': 'celebrated',
      'drama': 'caused drama'
    };

    return behavior_map[memory.memory_type] || 'made a scene';
  }

  /**
   * Extract severity description
   */
  private extractSeverity(memory: CharacterMemory): string {
    const intensity_map: { [key: number]: string } = {
      10: 'dramatic',
      9: 'dramatic',
      8: 'emotional',
      7: 'emotional',
      6: 'worked up',
      5: 'worked up',
      4: 'upset',
      3: 'upset',
      2: 'upset',
      1: 'upset'
    };

    return intensity_map[memory.emotional_intensity] || 'intense';
  }

  /**
   * Get multiple comedy references for variety
   */
  public generateMultipleReferences(
    memories: CharacterMemory[],
    current_context: string,
    current_topic: string,
    max_references: number = 3
  ): string[] {
    const references: string[] = [];

    for (const memory of memories) {
      if (references.length >= max_references) break;

      const reference = this.generateComedyReference(memory, current_context, current_topic);
      if (reference) {
        references.push(reference);
      }
    }

    return references;
  }
}

export default ComedyTemplateService;
