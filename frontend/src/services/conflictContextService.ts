// Service for generating kitchen table conflict context for AI chat
// Integrates with therapy system data to provide realistic living situations

import { ConflictData, TherapyContext } from './ConflictDatabaseService';
import ConflictDatabaseService from './ConflictDatabaseService';

export interface LivingContext {
  housing_tier: string;
  current_occupancy: number;
  room_capacity: number;
  roommates: Array<{
    id: string;
    name: string;
    relationship: 'ally' | 'rival' | 'neutral' | 'enemy';
  }>;
  team_chemistry: number;
  league_ranking: number;
  active_conflicts: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    involved_characters: string[];
  }>;
  recent_events?: Array<{
    type: 'conflict' | 'resolution' | 'tension';
    description: string;
    timestamp: Date;
  }>;
  // New headquarters theme effects
  room_theme_effects?: {
    current_theme: string | null;
    mood_bonus: number;
    energy_bonus: number;
    comfort_level: 'cramped' | 'basic' | 'comfortable' | 'luxurious';
    theme_compatibility: boolean;
  };
}

class ConflictContextService {
  private static instance: ConflictContextService;
  private conflictService: ConflictDatabaseService;

  constructor() {
    this.conflictService = ConflictDatabaseService.getInstance();
  }

  static getInstance(): ConflictContextService {
    if (!ConflictContextService.instance) {
      ConflictContextService.instance = new ConflictContextService();
    }
    return ConflictContextService.instance;
  }

  /**
   * Generate living context for a character using therapy system data
   */
  async generateLivingContext(character_id: string): Promise<LivingContext> {
    try {
      // Get therapy context which includes conflict data
      const therapyContext = await this.conflictService.getTherapyContextForCharacter(character_id);

      // Transform therapy context into living context format
      const livingContext: LivingContext = {
        housing_tier: therapyContext.housing_tier,
        current_occupancy: therapyContext.current_occupancy,
        room_capacity: therapyContext.room_capacity,
        team_chemistry: therapyContext.team_chemistry,
        league_ranking: therapyContext.league_ranking,
        roommates: therapyContext.roommates.map(roommate => ({
          id: roommate.id,
          name: roommate.name,
          relationship: this.determineRelationship(0) // Default relationship level
        })),
        active_conflicts: therapyContext.active_conflicts.map(conflict => ({
          category: conflict.category,
          severity: conflict.severity,
          description: conflict.description,
          involved_characters: conflict.characters_involved || []
        })),
        recent_events: this.generateRecentEvents(therapyContext.active_conflicts),
        room_theme_effects: await this.calculateRoomThemeEffects(character_id, therapyContext.housing_tier)
      };

      return livingContext;
    } catch (error) {
      console.error('Error generating living context:', error);
      // Return fallback context
      return this.getFallbackLivingContext(character_id);
    }
  }

  /**
   * Calculate room theme effects on character mood and energy
   */
  private async calculateRoomThemeEffects(character_id: string, housing_tier: string): Promise<{
    current_theme: string | null;
    mood_bonus: number;
    energy_bonus: number;
    comfort_level: 'cramped' | 'basic' | 'comfortable' | 'luxurious';
    theme_compatibility: boolean;
  }> {
    // Simulate getting headquarters data (in real implementation, would fetch from API)
    const simulatedHeadquarters = this.getSimulatedHeadquartersData(character_id);

    // Determine comfort level based on housing tier
    const comfortLevels = {
      'spartan_apartment': 'cramped' as const,
      'basic_house': 'basic' as const,
      'team_mansion': 'comfortable' as const,
      'elite_compound': 'luxurious' as const
    };

    const comfortLevel = comfortLevels[housing_tier] || 'basic';

    // Base mood/energy based on comfort level
    const comfort_bonuses = {
      'cramped': { mood: -15, energy: -20 },
      'basic': { mood: 0, energy: 0 },
      'comfortable': { mood: 20, energy: 15 },
      'luxurious': { mood: 35, energy: 30 }
    };

    let moodBonus = comfort_bonuses[comfortLevel].mood;
    let energyBonus = comfort_bonuses[comfortLevel].energy;
    let current_theme: string | null = null;
    let themeCompatibility = false;

    // Add room theme bonuses
    if (simulatedHeadquarters.assigned_room?.theme) {
      current_theme = simulatedHeadquarters.assigned_room.theme;

      // Check if character is compatible with theme
      const compatibleThemes = this.getCompatibleThemes(character_id);
      themeCompatibility = compatibleThemes.includes(current_theme);

      if (themeCompatibility) {
        moodBonus += 25; // Compatible theme gives significant mood boost
        energyBonus += 20;
      } else {
        moodBonus -= 10; // Incompatible theme causes some stress
        energyBonus -= 5;
      }
    }

    return {
      current_theme,
      mood_bonus: moodBonus,
      energy_bonus: energyBonus,
      comfort_level: comfortLevel,
      theme_compatibility: themeCompatibility
    };
  }

  /**
   * Get compatible room themes for a character
   */
  private getCompatibleThemes(character_id: string): string[] {
    const themeCompatibility = {
      'achilles': ['medieval', 'spartan'],
      'joan': ['medieval', 'victorian'],
      'dracula': ['gothic', 'mystical'],
      'frankenstein_monster': ['gothic', 'mystical'],
      'holmes': ['victorian', 'modern'],
      'cleopatra': ['egyptian', 'luxurious'],
      'tesla': ['mystical', 'modern'],
      'robin_hood': ['medieval', 'saloon'],
      'space_cyborg': ['mystical', 'modern']
    };

    return themeCompatibility[character_id] || ['basic'];
  }

  /**
   * Simulate headquarters data (placeholder for real integration)
   */
  private getSimulatedHeadquartersData(character_id: string): {
    assigned_room: { theme: string | null } | null;
  } {
    // This would be replaced with actual API call to headquarters service
    const simulatedData = {
      'achilles': { assigned_room: { theme: 'medieval' } },
      'joan': { assigned_room: { theme: 'medieval' } },
      'dracula': { assigned_room: { theme: 'gothic' } },
      'holmes': { assigned_room: { theme: 'victorian' } },
      'cleopatra': { assigned_room: { theme: 'egyptian' } }
    };

    return simulatedData[character_id] || { assigned_room: null };
  }

  /**
   * Determine relationship type based on conflict level
   */
  private determineRelationship(conflictLevel: number): 'ally' | 'rival' | 'neutral' | 'enemy' {
    if (conflictLevel >= 80) return 'enemy';
    if (conflictLevel >= 60) return 'rival';
    if (conflictLevel >= 30) return 'neutral';
    return 'ally';
  }

  /**
   * Generate recent events based on active conflicts
   */
  private generateRecentEvents(conflicts: ConflictData[]): Array<{
    type: 'conflict' | 'resolution' | 'tension';
    description: string;
    timestamp: Date;
  }> {
    const events: Array<{
      type: 'conflict' | 'resolution' | 'tension';
      description: string;
      timestamp: Date;
    }> = [];

    // Generate events from conflicts
    conflicts.slice(0, 3).forEach((conflict, index) => {
      const daysAgo = Math.random() * 7; // Events within last week
      const timestamp = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));

      let event_type: 'conflict' | 'resolution' | 'tension';
      let description: string;

      if (conflict.severity === 'critical' || conflict.severity === 'high') {
        event_type = 'conflict';
        description = this.generateConflictEventDescription(conflict);
      } else if (Math.random() > 0.7) {
        event_type = 'resolution';
        description = this.generateResolutionEventDescription(conflict);
      } else {
        event_type = 'tension';
        description = this.generateTensionEventDescription(conflict);
      }

      events.push({ type: event_type, description, timestamp });
    });

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate conflict event descriptions
   */
  private generateConflictEventDescription(conflict: ConflictData): string {
    const conflictDescriptions: Record<string, string[]> = {
      kitchen_disputes: [
        "Heated argument over someone leaving dirty dishes for three days",
        "Shouting match about who ate the last of someone's labeled food",
        "Major fight over kitchen cleaning responsibilities"
      ],
      sleeping_arrangements: [
        "Loud argument about snoring disrupting everyone's sleep",
        "Conflict over bedroom temperature and window preferences",
        "Dispute about overnight guests and noise levels"
      ],
      bathroom_schedule: [
        "Tense confrontation about excessive shower time during peak hours",
        "Argument over bathroom cleanliness and hair in the drain",
        "Conflict about personal items taking up all the counter space"
      ],
      common_areas: [
        "Major disagreement about living room furniture arrangement",
        "Heated debate over TV show choices during shared viewing time",
        "Argument about workout equipment left in common areas"
      ],
      personal_space: [
        "Confrontation about respecting personal belongings and boundaries",
        "Argument over noise levels during training and personal time",
        "Dispute about privacy and knocking before entering rooms"
      ]
    };

    const descriptions = conflictDescriptions[conflict.category] || [
      `Significant disagreement about ${conflict.category.replace('_', ' ')}`
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Generate resolution event descriptions
   */
  private generateResolutionEventDescription(conflict: ConflictData): string {
    const resolutionDescriptions: Record<string, string[]> = {
      kitchen_disputes: [
        "Successful house meeting established new kitchen cleaning schedule",
        "Compromise reached on food labeling and refrigerator space",
        "Agreement made on shared meal preparation and cleanup duties"
      ],
      sleeping_arrangements: [
        "Worked out sleeping arrangements and quiet hours that everyone can live with",
        "Found solution for room temperature issues with fans and blankets",
        "Established guest policies that respect everyone's sleep schedule"
      ],
      bathroom_schedule: [
        "Created bathroom schedule that works for everyone's training routine",
        "Agreed on cleaning responsibilities and personal space boundaries",
        "Set up morning routine timing that reduces conflicts"
      ]
    };

    const descriptions = resolutionDescriptions[conflict.category] || [
      `Reached understanding about ${conflict.category.replace('_', ' ')} issues`
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Generate tension event descriptions
   */
  private generateTensionEventDescription(conflict: ConflictData): string {
    const tensionDescriptions: Record<string, string[]> = {
      kitchen_disputes: [
        "Awkward silence during breakfast after yesterday's kitchen argument",
        "Passive-aggressive note left about dirty dishes in the sink",
        "Tension over someone finishing the coffee without making more"
      ],
      sleeping_arrangements: [
        "Uncomfortable conversation about sleep schedule differences",
        "Subtle tension over thermostat settings at bedtime",
        "Awkward moment when discussing overnight training partners"
      ],
      bathroom_schedule: [
        "Mild frustration expressed about bathroom availability during peak times",
        "Tense exchange about bathroom tidiness after morning routines",
        "Slight irritation over hot water usage during consecutive showers"
      ]
    };

    const descriptions = tensionDescriptions[conflict.category] || [
      `Underlying tension about ${conflict.category.replace('_', ' ')} continues`
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Get fallback living context when therapy data isn't available
   */
  private getFallbackLivingContext(character_id: string): LivingContext {
    // Generate realistic fallback data
    const commonRoommates = ['achilles', 'joan', 'holmes', 'dracula', 'sun_wukong'];
    const roommates = commonRoommates
      .filter(id => id !== character_id)
      .slice(0, 2 + Math.floor(Math.random() * 2))
      .map(id => ({
        id,
        name: this.getCharacterDisplayName(id),
        relationship: (['ally', 'rival', 'neutral'] as const)[Math.floor(Math.random() * 3)]
      }));

    // NO FALLBACKS - throw if no real conflicts exist
    throw new Error('No conflicts available - fallback generation disabled in development');

    const fallback_conflicts: any[] = []; // Unreachable code, just for type safety
    return {
      housing_tier: 'standard',
      current_occupancy: 4,
      room_capacity: 3,
      team_chemistry: 60 + Math.floor(Math.random() * 30),
      league_ranking: 15 + Math.floor(Math.random() * 20),
      roommates,
      active_conflicts: fallback_conflicts,
      recent_events: this.generateRecentEvents(fallback_conflicts.map((c, index) => ({
        id: `fallback_${Date.now()}_${index}`,
        category: c.category,
        severity: c.severity,
        source: 'team' as const,
        characters_involved: [],
        description: c.description,
        therapy_priority: 1,
        resolution_difficulty: 'moderate' as const,
        timestamp: new Date(),
        resolved: false
      })))
    };
  }

  /**
   * Generate fallback conflicts when therapy data isn't available
   */
  private generateFallbackConflicts() {
    const possibleConflicts = [
      {
        category: 'kitchen_disputes',
        severity: 'medium' as const,
        description: 'Ongoing disagreements about kitchen cleanup responsibilities and dirty dishes',
        involved_characters: ['achilles', 'joan']
      },
      {
        category: 'sleeping_arrangements',
        severity: 'low' as const,
        description: 'Tension over different sleep schedules affecting training routines',
        involved_characters: ['holmes', 'dracula']
      },
      {
        category: 'bathroom_schedule',
        severity: 'high' as const,
        description: 'Conflicts over bathroom time during peak morning training hours',
        involved_characters: ['sun_wukong', 'achilles', 'joan']
      }
    ];

    // Return 1-2 random conflicts
    const numConflicts = 1 + Math.floor(Math.random() * 2);
    return possibleConflicts.slice(0, numConflicts);
  }

  /**
   * Get display name for character ID
   */
  private getCharacterDisplayName(character_id: string): string {
    const nameMap: Record<string, string> = {
      'achilles': 'Achilles',
      'joan': 'Joan of Arc',
      'holmes': 'Sherlock Holmes',
      'dracula': 'Dracula',
      'sun_wukong': 'Sun Wukong',
      'cleopatra': 'Cleopatra',
      'tesla': 'Nikola Tesla',
      'merlin': 'Merlin'
    };

    return nameMap[character_id] || character_id.charAt(0).toUpperCase() + character_id.slice(1);
  }
}

export default ConflictContextService;
