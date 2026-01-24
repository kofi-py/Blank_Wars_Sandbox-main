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

  public static getInstance(): ComedyTemplateService {
    if (!ComedyTemplateService.instance) {
      ComedyTemplateService.instance = new ComedyTemplateService();
    }
    return ComedyTemplateService.instance;
  }

  private comedyTemplates: ComedyTemplate[] = [
    // Contradiction Templates
    {
      id: 'contradiction_past_action',
      template: "Funny, because in {chatSystem} {timeReference} you were {action} about {topic}...",
      required_fields: ['chatSystem', 'timeReference', 'action', 'topic'],
      min_contradiction_potential: 6,
      category: 'contradiction'
    },
    {
      id: 'contradiction_advice',
      template: "You're giving me advice, but in {chatSystem} you said you struggle with {topic}.",
      required_fields: ['chatSystem', 'topic'],
      min_contradiction_potential: 7,
      category: 'contradiction'
    },
    {
      id: 'contradiction_opposite',
      template: "The irony is that just {timeReference} in {chatSystem} you were saying the opposite about {topic}...",
      required_fields: ['timeReference', 'chatSystem', 'topic'],
      min_contradiction_potential: 8,
      category: 'contradiction'
    },

    // Embarrassing Callback Templates
    {
      id: 'embarrassing_meltdown',
      template: "Remember when you had that {emotionalEvent} in {chatSystem} about {topic}?",
      required_fields: ['emotionalEvent', 'chatSystem', 'topic'],
      min_embarrassment_level: 6,
      required_tags: ['embarrassing'],
      category: 'embarrassing'
    },
    {
      id: 'embarrassing_confession',
      template: "This reminds me of when you {pastBehavior} in {chatSystem} about {topic}.",
      required_fields: ['pastBehavior', 'chatSystem', 'topic'],
      min_embarrassment_level: 5,
      category: 'embarrassing'
    },
    {
      id: 'embarrassing_dramatic',
      template: "Just like when you got all {severity} during {chatSystem} about {topic}...",
      required_fields: ['severity', 'chatSystem', 'topic'],
      min_embarrassment_level: 7,
      required_tags: ['dramatic'],
      category: 'embarrassing'
    },

    // Ironic Reference Templates
    {
      id: 'ironic_advice_giver',
      template: "Of all people to give advice about {topic}, considering what happened in {chatSystem}...",
      required_fields: ['topic', 'chatSystem'],
      min_quotability: 6,
      category: 'ironic'
    },
    {
      id: 'ironic_focus_own_issues',
      template: "Maybe focus on your own {topic} first, like what happened in {chatSystem} {timeReference}?",
      required_fields: ['topic', 'chatSystem', 'timeReference'],
      min_quotability: 7,
      category: 'ironic'
    },

    // Callback Templates
    {
      id: 'callback_pattern',
      template: "Here we go again... just like in {chatSystem} when you {pastBehavior} about {topic}.",
      required_fields: ['chatSystem', 'pastBehavior', 'topic'],
      min_quotability: 5,
      category: 'callback'
    },
    {
      id: 'callback_history',
      template: "Your track record speaks for itself - remember {chatSystem}? The whole {topic} situation?",
      required_fields: ['chatSystem', 'topic'],
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
    const suitableTemplates = this.findSuitableTemplates(target_memory);

    if (suitableTemplates.length === 0) {
      return null;
    }

    // Select best template (randomly from suitable ones for variety)
    const selectedTemplate = suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)];

    // Extract variables from memory
    const variables = this.extractVariables(target_memory, current_context, current_topic);

    // Generate the comedy reference
    return this.fillTemplate(selectedTemplate, variables);
  }

  /**
   * Find templates that match the memory's comedy potential
   */
  private findSuitableTemplates(memory: CharacterMemory): ComedyTemplate[] {
    return this.comedyTemplates.filter(template => {
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
    const chatSystemMap: { [key: string]: string } = {
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

    const timeReference = this.getTimeReference(memory.created_at);
    const chatSystem = chatSystemMap[memory.memory_type] || memory.memory_type;
    const topic = this.extractTopic(memory.content);

    return {
      chat_system: chatSystem,
      time_reference: timeReference,
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
    const diffHours = Math.abs(now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    if (diffHours < 2) return 'just now';
    if (diffHours < 12) return 'earlier today';
    if (diffHours < 24) return 'yesterday';
    if (diffHours < 48) return 'the other day';
    if (diffHours < 168) return 'this week';
    return 'recently';
  }

  /**
   * Extract main topic from memory content
   */
  private extractTopic(content: string): string {
    // Simple topic extraction - take key phrases from content
    const words = content.toLowerCase().split(' ');
    const keyTopics = ['bathroom', 'kitchen', 'money', 'training', 'battle', 'relationship', 'therapy', 'living', 'housing'];

    for (const topic of keyTopics) {
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
    const actionMap: { [key: string]: string } = {
      'conflict': 'arguing',
      'complaint': 'complaining',
      'celebration': 'bragging',
      'confession': 'admitting',
      'struggle': 'struggling'
    };

    return actionMap[memory.memory_type] || 'talking';
  }

  /**
   * Extract emotional event description
   */
  private extractEmotionalEvent(memory: CharacterMemory): string {
    const intensity = memory.emotional_intensity;
    const emotionalTags = memory.cross_reference_data?.comedy_tags || [];

    if (emotionalTags.includes('dramatic')) return 'breakdown';
    if (intensity >= 8) return 'meltdown';
    if (intensity >= 6) return 'outburst';
    if (emotionalTags.includes('embarrassing')) return 'moment';

    return 'situation';
  }

  /**
   * Extract past behavior description
   */
  private extractPastBehavior(memory: CharacterMemory): string {
    const behaviorMap: { [key: string]: string } = {
      'conflict': 'got all worked up',
      'confession': 'opened up',
      'complaint': 'vented',
      'celebration': 'celebrated',
      'drama': 'caused drama'
    };

    return behaviorMap[memory.memory_type] || 'made a scene';
  }

  /**
   * Extract severity description
   */
  private extractSeverity(memory: CharacterMemory): string {
    const intensityMap: { [key: number]: string } = {
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

    return intensityMap[memory.emotional_intensity] || 'intense';
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
