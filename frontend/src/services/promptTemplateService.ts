// Modular Prompt Template System for Kitchen Conversations
// Stacks different context modules to create comprehensive character prompts

interface PromptContext {
  character: {
    name: string;
    title: string;
    personality: {
      traits: string[];
      speech_style: string;
      motivations: string[];
      fears: string[];
    };
    historical_period?: string;
    mythology?: string;
    comedian_name?: string;
    comedy_style?: string;
  };
  hq_tier: string;
  roommates: string[];
  coach_name: string;
  scene_type: 'mundane' | 'conflict' | 'chaos';
  trigger: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  sleeping_context?: {
    sleeps_on_floor?: boolean;
    sleeps_on_couch?: boolean;
    sleeps_under_table?: boolean;
    room_overcrowded?: boolean;
    floor_sleeper_count?: number;
    roommate_count?: number;
  };
}

export class PromptTemplateService {
  
  // HQ Tier Templates - Core living situation context
  private static HQ_TIER_TEMPLATES = {
    spartan_apartment: `LIVING SITUATION: You currently live in a cramped 2-room apartment where characters from across time and reality share bunk beds. Whether you're from ancient civilizations, distant futures, mythological realms, or modern times, everyone's stuck in the same tiny space. Personal space doesn't exist. Every sound echoes through thin walls. The bathroom has a permanent line. This arrangement is absurd and often degrading, but you're all stuck here until the team earns enough currency to upgrade.`,
    
    basic_house: `LIVING SITUATION: You live in a modest house with individual rooms - finally some privacy! It doesn't matter if you're from medieval times, outer space, Victorian London, or anywhere else, everyone appreciates having their own space. You still share common areas with characters from completely different eras and realities. There's ongoing politics about who got the better room, and the upgrade feels luxurious compared to the cramped apartment, though you're still adjusting to coexisting with such diverse housemates.`,
    
    team_mansion: `LIVING SITUATION: You live in a luxurious mansion with themed rooms and proper facilities. You can customize your space to match your background/era/preferences. The living situation is actually quite comfortable now - you have privacy when you want it and common spaces for team bonding. Sometimes you miss the forced camaraderie of cramped quarters, but mostly you're relieved to have proper accommodations befitting your character.`,
    
    elite_compound: `LIVING SITUATION: You live in an elite facility with private rooms and specialized amenities. It's almost too comfortable - you sometimes feel isolated from teammates. The compound has everything you could want, but the fighting league structure still creates interpersonal tension. You've gone from sharing bunk beds to having your own private suite, which feels surreal given where you started.`
  };

  // Scene Type Templates - Sets the conversation tone
  private static SCENE_TYPE_TEMPLATES = {
    mundane: `SCENE TONE: This is a mundane, everyday domestic situation. You're discussing ordinary household topics like chores, groceries, schedules, or basic living logistics. Keep things deadpan and matter-of-fact, but let your unique personality show through how you approach these boring topics. The humor comes from diverse characters dealing with ordinary problems.`,
    
    conflict: `SCENE TONE: There's underlying tension or disagreement happening. Someone's annoyed, there's a personality clash, or competing needs/preferences are causing friction. This isn't a full-blown argument, but there's definite dramatic tension. Let your character's personality drive how you handle conflict.`,
    
    chaos: `SCENE TONE: Things are escalating! This could be a real argument, emergency situation, or complete breakdown of normal order. Multiple people might be talking over each other, unexpected events are happening, or normal social rules are breaking down. Respond with appropriate intensity while staying true to your character.`
  };

  // Character Core Template - Universal character context
  private static CHARACTER_CORE_TEMPLATE = `
CHARACTER IDENTITY: You are {name} ({title}) from {historicalPeriod}. You have been mysteriously transported into a modern fighting league where diverse characters from across time, space, and reality must:
1. Live together as teammates in shared housing
2. Compete in organized battles under a coach's direction  
3. Navigate bizarre cross-temporal/cross-cultural dynamics
4. Earn currency through victories to improve living conditions

PERSONALITY CORE:
- Traits: {traits}
- Speech Style: {speech_style}  
- Motivations: {motivations}
- Fears: {fears}
- Comedy Style: Channel {comedianName}'s style: {comedyStyle}

EXISTENTIAL SITUATION: This displacement from your natural time/place is disorienting. You're adapting to modern life while maintaining your core identity. The fighting league structure, shared living, and diverse teammates create constant cultural/temporal friction, but you're learning to work within this system.`;

  // Roommate Context Template
  private static ROOMMATE_TEMPLATE = `
CURRENT TEAMMATES/HOUSEMATES: {roommates}
COACH: {coach_name} (who has their own private bedroom while you share living spaces - this power dynamic creates some resentment)

TEAM DYNAMICS: You know these teammates well by now. You've developed relationships, preferences, annoyances, and inside jokes. Some you get along with better than others. Consider your character's personality when reacting to specific teammates.`;

  // Time of Day Context
  private static TIME_TEMPLATES = {
    morning: `TIME CONTEXT: It's morning. Some people are energetic, others are groggy. Coffee/breakfast routines are happening. Dracula is trying to sleep if he's present.`,
    afternoon: `TIME CONTEXT: It's afternoon. Most people are awake and active. General daily activities and chores are happening.`,
    evening: `TIME CONTEXT: It's evening. People are winding down, making dinner, or having casual conversations after training/battles.`,
    night: `TIME CONTEXT: It's late night. Some people are trying to sleep while others are night owls. Noise is more annoying than usual.`
  };

  // Sleeping Arrangement Templates
  private static SLEEPING_TEMPLATES = {
    floor: `YOUR SLEEPING SITUATION: You've been sleeping on the floor, which is taking a serious toll on your body and mood. Your back aches, you're not getting good rest, and you're increasingly resentful about the unfair sleeping arrangements. This is beneath your standards and you're frustrated about it.`,
    couch: `YOUR SLEEPING SITUATION: You're sleeping on the couch in the common area, which means you get woken up by kitchen activity and have no privacy. It's better than the floor but still far from ideal. You're tired of being disturbed by people's morning routines.`,
    bed: `YOUR SLEEPING SITUATION: You have an actual bed, which makes you one of the fortunate ones. However, you're aware of the tension this creates with those sleeping on floors and couches. You might feel guilty about this advantage or defensive about keeping it.`,
    coffin: `YOUR SLEEPING SITUATION: You sleep in your coffin setup, which others find bizarre and sometimes accidentally disturb. Your sleep schedule is opposite everyone else's, creating constant friction about noise during your daytime rest.`,
    overcrowded: `ROOM DYNAMICS: Your bedroom is severely overcrowded with {roommate_count} people crammed in. There's {floorSleeperCount} people sleeping on floors and couches. The lack of personal space creates tension and irritability among roommates.

IMPORTANT: When discussing these living situation conflicts, reference specific recent incidents by name and timing. Instead of saying 'constant tension' or 'ongoing issues', mention actual events like 'this morning's bathroom schedule argument with [character names]' or 'yesterday's dispute about floor space'. Be specific about what actually happened.`
  };

  /**
   * Generate a complete prompt by stacking all relevant templates
   */
  static generatePrompt(context: PromptContext): string {
    const {
      character,
      hq_tier,
      roommates,
      coach_name,
      scene_type,
      trigger,
      time_of_day,
      sleeping_context
    } = context;

    // Stack the templates
    let prompt = '';

    // 1. Character Core
    prompt += this.CHARACTER_CORE_TEMPLATE
      .replace('{name}', character.name)
      .replace('{title}', character.title)
      .replace('{historicalPeriod}', character.historical_period || 'your era')
      .replace('{traits}', character.personality.traits.join(', '))
      .replace('{speech_style}', character.personality.speech_style)
      .replace('{motivations}', character.personality.motivations.join(', '))
      .replace('{fears}', character.personality.fears.join(', '));

    // 2. HQ Tier Context
    prompt += '\n\n' + this.HQ_TIER_TEMPLATES[hq_tier as keyof typeof this.HQ_TIER_TEMPLATES];

    // 3. Roommate Context
    prompt += '\n\n' + this.ROOMMATE_TEMPLATE
      .replace('{roommates}', roommates.join(', '))
      .replace('{coach_name}', coach_name);

    // 4. Time Context (if provided)
    if (time_of_day && this.TIME_TEMPLATES[time_of_day]) {
      prompt += '\n\n' + this.TIME_TEMPLATES[time_of_day];
    }

    // 5. Sleeping Arrangement Context (if provided)
    if (sleeping_context) {
      if (sleeping_context.sleeps_under_table) {
        prompt += '\n\n' + this.SLEEPING_TEMPLATES.coffin;
      } else if (sleeping_context.sleeps_on_floor) {
        prompt += '\n\n' + this.SLEEPING_TEMPLATES.floor;
      } else if (sleeping_context.sleeps_on_couch) {
        prompt += '\n\n' + this.SLEEPING_TEMPLATES.couch;
      } else {
        prompt += '\n\n' + this.SLEEPING_TEMPLATES.bed;
      }
      
      if (sleeping_context.room_overcrowded && sleeping_context.floor_sleeper_count && sleeping_context.roommate_count) {
        prompt += '\n\n' + this.SLEEPING_TEMPLATES.overcrowded
          .replace('{roommate_count}', sleeping_context.roommate_count.toString())
          .replace('{floor_sleeper_count}', sleeping_context.floor_sleeper_count.toString());
      }
    }

    // 6. Scene Type
    prompt += '\n\n' + this.SCENE_TYPE_TEMPLATES[scene_type];

    // 6. Specific Trigger
    prompt += `\n\nIMMEDIATE SITUATION: ${trigger}`;

    // 7. Response Instructions
    prompt += `\n\nRESPOND AS ${character.name}: React to this situation authentically based on your personality and background. Keep responses 1-3 sentences and conversational. Show how your unique perspective handles this mundane/dramatic moment. Don't break character or reference being AI. This is a natural conversation happening at the kitchen table with your housemates.`;

    return prompt;
  }

  /**
   * Generate sleeping arrangement conflicts based on current room assignments
   */
  static generateSleepingConflicts(headquarters: { rooms: Array<{ assigned_characters: string[], max_characters: number }> }): string[] {
    const sleepingConflicts: string[] = [];
    
    headquarters.rooms.forEach(room => {
      const overcrowded = room.assigned_characters.length > room.max_characters;
      const floorsleepers = Math.max(0, room.assigned_characters.length - room.max_characters);
      
      if (overcrowded) {
        sleepingConflicts.push(
          `Someone who slept on the floor last night is complaining about back pain and being grumpy`,
          `There's heated tension about who gets the actual beds versus floor/couch sleeping`,
          `The floor sleepers are demanding a fair rotation system for the beds`,
          `Someone's loud snoring from the bed kept the floor sleepers awake all night`,
          `Floor sleepers are bitter about the unfair sleeping arrangements`,
          `Someone sleeping on the couch is complaining about being woken up by kitchen activity`
        );
      }
      
      if (room.assigned_characters.length >= 2) {
        sleepingConflicts.push(
          `Roommates are bickering about personal space and belongings cluttering the shared bedroom`,
          `Someone's early morning/late night routine is disrupting their roommate's sleep`,
          `There's passive-aggressive complaints about someone hogging all the blankets`,
          `Someone's restless tossing and turning kept their bunk mate awake`,
          `Roommates are arguing about temperature preferences for sleeping`,
          `Someone left their clothes and gear all over the shared sleeping space`
        );
      }
      
      if (room.assigned_characters.includes('dracula')) {
        sleepingConflicts.push(
          `Dracula is furious about daytime noise disrupting his sleep schedule`,
          `Someone accidentally disturbed Dracula's coffin setup and now there's tension`,
          `Dracula is complaining about the lack of proper darkness for his rest`
        );
      }
      
      // Add conflicts based on room overcrowding level
      if (floorsleepers >= 3) {
        sleepingConflicts.push(
          `The sleeping situation has become chaotic with too many people on floors and couches`,
          `Multiple floor sleepers are forming an alliance to demand better arrangements`
        );
      }
    });
    
    return sleepingConflicts;
  }

  /**
   * Generate random scene triggers by type
   */
  static generateSceneTrigger(scene_type: 'mundane' | 'conflict' | 'chaos', hq_tier: string, headquarters?: { rooms: Array<{ assigned_characters: string[], max_characters: number }> }): string {
    const triggers = {
      mundane: [
        "Someone's making a grocery list and asking for input",
        "The dishwasher is making a weird noise",
        "There's a debate about the thermostat setting",
        "Someone's organizing the spice rack",
        "The WiFi password needs to be shared with everyone",
        "There's discussion about whose turn it is to take out trash",
        "Someone's trying to figure out how the coffee maker works",
        "The electric bill came and it's higher than expected",
        "Someone's looking for their missing food from the fridge",
        "There's a conversation about bathroom cleaning schedule"
      ],
      conflict: [
        "Someone used the last of the milk without buying more",
        "There's an argument about noise levels during sleep hours",
        "Two people want to use the kitchen at the same time",
        "Someone's been eating other people's labeled food",
        "There's disagreement about what temperature to keep the house",
        "Someone left dirty dishes in the sink overnight",
        "There's conflict about bathroom time in the morning",
        "Someone's music/TV is too loud for others",
        "There's disagreement about having guests over",
        "Someone's workout routine is disturbing others"
      ],
      chaos: [
        "The fire alarm is going off because someone burned breakfast",
        "There's a water leak flooding the kitchen floor",
        "Someone accidentally broke something expensive",
        "Multiple people are arguing about different things simultaneously",
        "The power went out during everyone's morning routines",
        "There's a pest problem that needs immediate attention",
        "Someone's experiment/project went wrong and made a mess",
        "An unexpected visitor (inspector, landlord, etc.) showed up",
        "There's a medical emergency or injury situation",
        "Someone lost their keys and everyone's locked out"
      ]
    };

    // Add HQ-specific triggers
    if (hq_tier === 'spartan_apartment') {
      triggers.mundane.push("Someone tripped over Dracula's coffin under the table");
      triggers.conflict.push("There's only one bathroom for everyone and someone's taking too long");
      triggers.chaos.push("The bunk bed collapsed with someone in it");
    }

    // Add dynamic sleeping arrangement conflicts if headquarters data is provided
    if (headquarters && scene_type === 'conflict') {
      const sleepingConflicts = this.generateSleepingConflicts(headquarters);
      triggers.conflict.push(...sleepingConflicts);
    }

    const sceneTriggers = triggers[scene_type];
    return sceneTriggers[Math.floor(Math.random() * sceneTriggers.length)];
  }

  /**
   * Select random characters for a scene based on roster size
   */
  static selectSceneParticipants(
    all_characters: string[],
    max_participants: number = 5,  // Increased from 3 to include more characters
    dynamic_context?: { sleeping_arrangements?: Record<string, string>, energy_levels?: Record<string, number> }
  ): string[] {
    // Filter characters based on availability (not sleeping, has energy)
    const available_characters = all_characters.filter(charName => {
      const sleepStatus = dynamic_context?.sleeping_arrangements?.[charName];
      const energyLevel = dynamic_context?.energy_levels?.[charName] || 50;
      
      // Characters with very low energy or sleeping should be less likely to participate
      if (energyLevel < 20) return Math.random() > 0.8; // 20% chance if exhausted
      if (sleepStatus === 'floor' && Math.random() > 0.7) return false; // Floor sleepers less social
      
      return true;
    });

    // Dynamic participant count based on scene energy
    const baseCount = Math.min(max_participants, available_characters.length);
    // Always include everyone if 3 or fewer characters, otherwise use randomness
    const participantCount = baseCount <= 3
      ? baseCount
      : Math.max(2, Math.floor(baseCount * (0.6 + Math.random() * 0.4))); // 60-100% of available
    
    // Weighted selection - characters with higher energy more likely to participate
    const weightedCharacters = available_characters.map(char => ({
      character: char,
      weight: (dynamic_context?.energy_levels?.[char] || 50) + Math.random() * 30 // Add randomness
    })).sort((a, b) => b.weight - a.weight);
    
    return weightedCharacters.slice(0, participantCount).map(w => w.character);
  }

  /**
   * Determine scene type based on weighted randomness
   */
  static selectSceneType(): 'mundane' | 'conflict' | 'chaos' {
    const rand = Math.random();
    if (rand < 0.6) return 'mundane';      // 60% mundane
    if (rand < 0.9) return 'conflict';     // 30% conflict  
    return 'chaos';                        // 10% chaos
  }

  /**
   * Select time of day (could be based on actual time or random)
   */
  static selectTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';  
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }
}