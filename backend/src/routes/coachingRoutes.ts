import express from 'express';
import { authenticate_token } from '../services/auth';
import { require_ticket } from '../middleware/ticketMiddleware';
import { ai_chat_service } from '../services/aiChatService';
import { db, query } from '../database/index';
import { recordBondActivity } from '../services/bondTrackingService';

// Character psychology data (same as social routes)
const character_psychology_data: Record<string, any> = {
  'sherlock_holmes': {
    name: 'Sherlock Holmes',
    personality: {
      traits: ['Analytical', 'Brilliant', 'Observant', 'Arrogant'],
      speech_style: 'Precise and condescending',
      motivations: ['Truth', 'Intellectual challenge', 'Justice'],
      fears: ['Boredom', 'Mediocrity', 'Unsolved mysteries']
    },
    historical_period: 'Victorian Era',
    mythology: 'Literary detective fiction'
  },
  'count_dracula': {
    name: 'Count Dracula',
    personality: {
      traits: ['Aristocratic', 'Manipulative', 'Charismatic', 'Ruthless'],
      speech_style: 'Formal and theatrical',
      motivations: ['Power', 'Survival', 'Domination'],
      fears: ['Holy symbols', 'Sunlight', 'Wooden stakes']
    },
    historical_period: 'Medieval/Victorian',
    mythology: 'Gothic horror'
  },
  'joan_of_arc': {
    name: 'Joan of Arc',
    personality: {
      traits: ['Devout', 'Courageous', 'Determined', 'Inspirational'],
      speech_style: 'Passionate and righteous',
      motivations: ['Divine mission', 'French victory', 'Faith'],
      fears: ['Failing God', 'English victory', 'Betrayal']
    },
    historical_period: 'Medieval France',
    mythology: 'Historical saint'
  },
  'achilles': {
    name: 'Achilles',
    personality: {
      traits: ['Prideful', 'Fierce', 'Loyal', 'Wrathful'],
      speech_style: 'Bold and dramatic',
      motivations: ['Glory', 'Honor', 'Revenge'],
      fears: ['Dishonor', 'Being forgotten', 'Cowardice']
    },
    historical_period: 'Ancient Greece',
    mythology: 'Greek mythology'
  },
  'genghis_khan': {
    name: 'Genghis Khan',
    personality: {
      traits: ['Strategic', 'Ruthless', 'Adaptive', 'Ambitious'],
      speech_style: 'Commanding and direct',
      motivations: ['Conquest', 'Empire building', 'Unity'],
      fears: ['Weakness', 'Betrayal', 'Defeat']
    },
    historical_period: 'Medieval Mongolia',
    mythology: 'Historical conqueror'
  },
  'nikola_tesla': {
    name: 'Nikola Tesla',
    personality: {
      traits: ['Brilliant', 'Eccentric', 'Visionary', 'Obsessive'],
      speech_style: 'Technical and passionate',
      motivations: ['Scientific discovery', 'Innovation', 'Progress'],
      fears: ['Failure', 'Theft of ideas', 'Mediocrity']
    },
    historical_period: 'Industrial Revolution',
    mythology: 'Historical inventor'
  },
  'cleopatra': {
    name: 'Cleopatra',
    personality: {
      traits: ['Intelligent', 'Charming', 'Cunning', 'Regal'],
      speech_style: 'Elegant and commanding',
      motivations: ['Power', 'Egypt\'s glory', 'Legacy'],
      fears: ['Rome\'s conquest', 'Betrayal', 'Obscurity']
    },
    historical_period: 'Ancient Egypt',
    mythology: 'Historical queen'
  },
  'merlin': {
    name: 'Merlin',
    personality: {
      traits: ['Wise', 'Mysterious', 'Powerful', 'Cryptic'],
      speech_style: 'Mystical and knowing',
      motivations: ['Knowledge', 'Guidance', 'Balance'],
      fears: ['Misuse of power', 'Prophecy', 'Corruption']
    },
    historical_period: 'Arthurian Legend',
    mythology: 'Celtic/Arthurian mythology'
  },
  'loki': {
    name: 'Loki',
    personality: {
      traits: ['Cunning', 'Charismatic', 'Unpredictable', 'Intelligent'],
      speech_style: 'Witty and mischievous',
      motivations: ['Change', 'Recognition', 'Freedom'],
      fears: ['Being bound', 'Rejection', 'Stagnation']
    },
    historical_period: 'Norse Mythology',
    mythology: 'Norse mythology'
  },
  'einstein': {
    name: 'Albert Einstein',
    personality: {
      traits: ['Brilliant', 'Curious', 'Imaginative', 'Pacifist'],
      speech_style: 'Thoughtful and philosophical',
      motivations: ['Understanding', 'Peace', 'Knowledge'],
      fears: ['Ignorance', 'Violence', 'Waste of potential']
    },
    historical_period: 'Modern Era',
    mythology: 'Historical scientist'
  }
};

const router = express.Router();

// POST /api/coaching/performance - Character performance coaching
router.post('/performance', authenticate_token, require_ticket('coaching_performance'), async (req: any, res) => {
  try {
    const { character_id, user_message, context } = req.body;

    // Get character personality data
    const character_data = character_psychology_data[character_id];
    if (!character_data) {
      return res.status(400).json({ error: 'Character not found' });
    }

    // Build performance coaching prompt with character's perspective
    const coaching_prompt = `You are acting as a performance coach to help the user improve their abilities and mindset. The user said: "${user_message}"

    Based on your personality and experiences, provide coaching advice that:
    - Reflects your unique perspective and wisdom
    - Addresses their specific concern or question
    - Offers practical guidance they can apply
    - Shows your character's coaching style (analytical, inspiring, strategic, etc.)
    - Stays true to your historical background and personality traits
    
    Keep your response focused, actionable, and in character (2-3 sentences max).`;

    // Use existing AI service with coaching context
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality,
        historical_period: character_data.historical_period,
        mythology: character_data.mythology,
        current_bond_level: context?.bond_level || 50,
        previous_messages: context?.previous_messages || []
      },
      coaching_prompt,
      req.user.id,
      db,
      { is_in_battle: false }
    );

    res.json({
      message: response.message,
      character: character_data.name,
      character_id,
      timestamp: new Date().toISOString(),
      bond_increase: response.bond_increase
    });

  } catch (error) {
    console.error('Performance coaching error:', error);
    res.status(500).json({ error: 'Failed to generate coaching response' });
  }
});

// POST /api/coaching/individual - Individual coaching sessions
router.post('/individual', authenticate_token, async (req: any, res) => {
  try {
    const { character_id, message, type, intensity, context } = req.body;

    // Get character personality data
    const character_data = character_psychology_data[character_id];
    if (!character_data) {
      return res.status(400).json({ error: 'Character not found' });
    }

    // Build individual coaching prompt based on session type
    let coaching_prompt = '';
    switch (type) {
      case 'motivation':
        coaching_prompt = `The user needs motivational coaching. They said: "${message}". Provide encouragement and motivation that fits your personality and background. Be inspiring but authentic to your character.`;
        break;
      case 'strategy':
        coaching_prompt = `The user wants strategic advice. They said: "${message}". Share strategic insights based on your experience and personality. Give them tactical guidance they can use.`;
        break;
      case 'mindset':
        coaching_prompt = `The user needs mindset coaching. They said: "${message}". Help them develop the right mental approach using your unique perspective and wisdom.`;
        break;
      case 'skills':
        coaching_prompt = `The user wants to improve their skills. They said: "${message}". Provide specific guidance for skill development based on your expertise and character traits.`;
        break;
      default:
        coaching_prompt = `The user is seeking individual coaching guidance. They said: "${message}". Provide helpful coaching advice that reflects your personality and experience.`;
    }

    // Add intensity context
    if (intensity) {
      coaching_prompt += ` The coaching intensity should be ${intensity} - adjust your approach accordingly.`;
    }

    coaching_prompt += ` Keep your response conversational and practical (2-3 sentences).`;

    // Use existing AI service
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality,
        historical_period: character_data.historical_period,
        mythology: character_data.mythology,
        current_bond_level: context?.bond_level || 50,
        previous_messages: context?.previous_messages || []
      },
      coaching_prompt,
      req.user.id,
      db,
      { is_in_battle: false, skip_bond_tracking: true }
    );

    // Determine bond activity type based on session type
    const activity_type = (type === 'motivation' || type === 'mindset') ?
      'personal_problems_coaching' : 'performance_coaching';

    await recordBondActivity({
      user_character_id: character_id,
      activity_type: activity_type as any,
      context: {
        session_type: type,
        intensity: intensity
      },
      source: 'coaching_system'
    });

    res.json({
      message: response.message,
      character: character_data.name,
      character_id,
      type,
      intensity,
      timestamp: new Date().toISOString(),
      bond_increase: true
    });

  } catch (error) {
    console.error('Individual coaching error:', error);
    res.status(500).json({ error: 'Failed to generate individual coaching response' });
  }
});

// POST /api/coaching/team-management - Team conflict resolution
router.post('/team-management', authenticate_token, async (req: any, res) => {
  try {
    const { character_id, issue, choice, context } = req.body;

    // Get character personality data
    const character_data = character_psychology_data[character_id];
    if (!character_data) {
      return res.status(400).json({ error: 'Character not found' });
    }

    // Build team management coaching prompt
    let coaching_prompt = `You are helping with team management and conflict resolution. 

    Issue: ${issue?.title || 'Team dynamics challenge'}
    User's approach: "${choice}"
    
    Based on your leadership experience and personality, provide guidance on:
    - Whether this approach will be effective
    - What potential consequences to consider  
    - Alternative strategies that might work better
    - How to handle team dynamics based on your experience
    
    Give practical advice that reflects your leadership style and wisdom (2-3 sentences).`;

    // Use existing AI service with team management context
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality,
        historical_period: character_data.historical_period,
        mythology: character_data.mythology,
        current_bond_level: context?.bond_level || 50,
        previous_messages: context?.previous_messages || []
      },
      coaching_prompt,
      req.user.id,
      db,
      { is_in_battle: false, skip_bond_tracking: true }
    );

    await recordBondActivity({
      user_character_id: character_id,
      activity_type: 'performance_coaching',
      context: {
        issue: issue?.title,
        choice: choice
      },
      source: 'coaching_system'
    });

    res.json({
      message: response.message,
      character: character_data.name,
      character_id,
      issue: issue?.title,
      choice,
      timestamp: new Date().toISOString(),
      bond_increase: true
    });

  } catch (error) {
    console.error('Team management coaching error:', error);
    res.status(500).json({ error: 'Failed to generate team management response' });
  }
});

// POST /api/coaching/equipment - Equipment advisor coaching
router.post('/equipment', authenticate_token, async (req: any, res) => {
  try {
    const { character_id, user_message, context } = req.body;

    // Get character personality data
    const character_data = character_psychology_data[character_id];
    if (!character_data) {
      return res.status(400).json({ error: 'Character not found' });
    }

    // Build equipment advisor prompt with character's perspective
    const equipment_prompt = `You are acting as an equipment advisor to help the user choose and optimize their gear. The user said: "${user_message}"

    Context: 
    - Character Level: ${context?.level || 1}
    - Character Archetype: ${context?.archetype || 'warrior'}
    - Current Equipment: ${context?.currentEquipment ? JSON.stringify(context.currentEquipment) : 'None specified'}
    - Available Equipment: ${context?.available_equipment ? 'Multiple options available' : 'Standard options'}

    Based on your personality and expertise, provide equipment advice that:
    - Reflects your unique perspective on gear and combat
    - Addresses their specific equipment question or concern
    - Offers practical recommendations for their level and archetype
    - Shows your character's approach to equipment strategy
    - Stays true to your historical background and personality traits
    
    Keep your response focused, actionable, and in character (2-3 sentences max).`;

    // Use existing AI service with equipment context
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality,
        historical_period: character_data.historical_period,
        mythology: character_data.mythology,
        current_bond_level: context?.bond_level || 50,
        previous_messages: context?.previous_messages || []
      },
      equipment_prompt,
      req.user.id,
      db,
      { is_in_battle: false, skip_bond_tracking: true }
    );

    await recordBondActivity({
      user_character_id: character_id,
      activity_type: 'performance_coaching',
      context: {
        advice_type: 'equipment',
        message_length: user_message.length
      },
      source: 'coaching_system'
    });

    res.json({
      message: response.message,
      character: character_data.name,
      character_id,
      timestamp: new Date().toISOString(),
      bond_increase: true
    });

  } catch (error) {
    console.error('Equipment coaching error:', error);
    res.status(500).json({ error: 'Failed to generate equipment advice' });
  }
});

// POST /api/coaching/skills - Skill development coaching
router.post('/skills', authenticate_token, async (req: any, res) => {
  try {
    const { character_id, user_message, context } = req.body;

    // Get character personality data
    const character_data = character_psychology_data[character_id];
    if (!character_data) {
      return res.status(400).json({ error: 'Character not found' });
    }

    // Build skill development prompt with character's perspective
    const skills_prompt = `You are acting as a skill development coach to help the user improve their abilities and combat techniques. The user said: "${user_message}"

    Context:
    - Character Level: ${context?.level || 1}
    - Current Skills: ${context?.currentSkills ? JSON.stringify(context.currentSkills) : 'Basic abilities'}
    - Skill Focus: ${context?.skillFocus || 'general development'}
    - Available Skill Points: ${context?.skill_points || 0}

    Based on your personality and combat experience, provide skill advice that:
    - Reflects your unique approach to abilities and skill development
    - Addresses their specific skill question or learning goal
    - Offers practical guidance for skill progression
    - Shows your character's philosophy on training and abilities
    - Stays true to your historical background and combat style
    
    Keep your response focused, actionable, and in character (2-3 sentences max).`;

    // Use existing AI service with skills context
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality,
        historical_period: character_data.historical_period,
        mythology: character_data.mythology,
        current_bond_level: context?.bond_level || 50,
        previous_messages: context?.previous_messages || []
      },
      skills_prompt,
      req.user.id,
      db,
      { is_in_battle: false, skip_bond_tracking: true }
    );

    await recordBondActivity({
      user_character_id: character_id,
      activity_type: 'performance_coaching',
      context: {
        advice_type: 'skills',
        message_length: user_message.length
      },
      source: 'coaching_system'
    });

    res.json({
      message: response.message,
      character: character_data.name,
      character_id,
      timestamp: new Date().toISOString(),
      bond_increase: true
    });

  } catch (error) {
    console.error('Skills coaching error:', error);
    res.status(500).json({ error: 'Failed to generate skill development advice' });
  }
});

// POST /api/coaching/powers - Power development coaching
router.post('/powers', authenticate_token, async (req: any, res) => {
  try {
    const { character_id, user_message, context } = req.body;

    if (!character_id) {
      return res.status(400).json({ error: 'character_id required' });
    }

    // Query database for character data (following working chat pattern)
    // Get character template data from database
    const char_result = await query(
      'SELECT name, archetype, species, personality_traits, backstory FROM characters WHERE id = $1',
      [character_id]
    );

    if (char_result.rows.length === 0) {
      return res.status(400).json({ error: `Character not found: ${character_id}` });
    }

    const character_data = char_result.rows[0];

    // Build power development prompt with character's perspective
    const powers_prompt = `You are ${character_data.name}, discussing power development with your coach. The coach said: "${user_message}"

    YOUR CHARACTER:
    - Name: ${character_data.name}
    - Archetype: ${character_data.archetype}
    - Species: ${character_data.species}
    - Personality: ${character_data.personality_traits}
    - Background: ${character_data.backstory}

    CURRENT STATUS:
    - Your Level: ${context?.level || 1}
    - Character Points Available: ${context?.ability_points || 0}
    - Current Powers: ${context?.currentPowers ? JSON.stringify(context.currentPowers) : 'Basic abilities'}
    - Unlocked Powers: ${context?.unlocked_count || 0}
    - Tier Focus: ${context?.tierFocus || 'general development'}

    Based on your personality and combat philosophy, respond to the coach's message about power choices:
    - Reflect your unique approach to combat and power development
    - Show your character's philosophy on abilities and strength
    - Stay true to your background and fighting style
    - If discussing specific powers, relate them to your personality and goals
    - If adherence is low, show independence in your power choices

    Keep your response focused, in character, and conversational (2-3 sentences max).`;

    // Use existing AI service with powers context
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality_traits,
        historical_period: character_data.backstory,
        mythology: character_data.species,
        current_bond_level: context?.bond_level || 50,
        previous_messages: context?.previous_messages || []
      },
      powers_prompt,
      req.user.id,
      db,
      { is_in_battle: false, skip_bond_tracking: true }
    );

    await recordBondActivity({
      user_character_id: character_id,
      activity_type: 'performance_coaching',
      context: {
        advice_type: 'powers',
        message_length: user_message.length
      },
      source: 'coaching_system'
    });

    res.json({
      message: response.message,
      character: character_data.name,
      character_id,
      timestamp: new Date().toISOString(),
      bond_increase: true
    });

  } catch (error) {
    console.error('Powers coaching error:', error);
    res.status(500).json({ error: 'Failed to generate power development advice' });
  }
});

// POST /api/coaching/spells - Spell development coaching
router.post('/spells', authenticate_token, async (req: any, res) => {
  try {
    const { character_id, user_message, context } = req.body;

    if (!character_id) {
      return res.status(400).json({ error: 'character_id required' });
    }

    // Query database for character data (following working chat pattern)
    // Get character template data from database
    const char_result = await query(
      'SELECT name, archetype, species, personality_traits, backstory FROM characters WHERE id = $1',
      [character_id]
    );

    if (char_result.rows.length === 0) {
      return res.status(400).json({ error: `Character not found: ${character_id}` });
    }

    const character_data = char_result.rows[0];

    // Build spell development prompt with character's perspective
    const spells_prompt = `You are ${character_data.name}, discussing spell development with your coach. The coach said: "${user_message}"

    YOUR CHARACTER:
    - Name: ${character_data.name}
    - Archetype: ${character_data.archetype}
    - Species: ${character_data.species}
    - Personality: ${character_data.personality_traits}
    - Background: ${character_data.backstory}

    CURRENT STATUS:
    - Your Level: ${context?.level || 1}
    - Character Points Available: ${context?.ability_points || 0}
    - Current Spells: ${context?.currentSpells ? JSON.stringify(context.currentSpells) : 'Basic magic'}
    - Unlocked Spells: ${context?.unlocked_count || 0}
    - Tier Focus: ${context?.tierFocus || 'general development'}

    Based on your personality and magical philosophy, respond to the coach's message about spell choices:
    - Reflect your unique approach to magic and spell learning
    - Show your character's philosophy on magical power and knowledge
    - Stay true to your background and mystical traditions
    - If discussing specific spells, relate them to your personality and magical style
    - If adherence is low, show independence in your spell choices
    - Consider if magic fits your character archetype and background

    Keep your response focused, in character, and conversational (2-3 sentences max).`;

    // Use existing AI service with spells context
    const response = await ai_chat_service.generate_character_response(
      {
        character_id,
        character_name: character_data.name,
        personality: character_data.personality_traits,
        historical_period: character_data.backstory,
        mythology: character_data.species,
        current_bond_level: context?.bond_level || 50,
        previous_messages: context?.previous_messages || []
      },
      spells_prompt,
      req.user.id,
      db,
      { is_in_battle: false, skip_bond_tracking: true }
    );

    await recordBondActivity({
      user_character_id: character_id,
      activity_type: 'performance_coaching',
      context: {
        advice_type: 'spells',
        message_length: user_message.length
      },
      source: 'coaching_system'
    });

    res.json({
      message: response.message,
      character: character_data.name,
      character_id,
      timestamp: new Date().toISOString(),
      bond_increase: true
    });

  } catch (error) {
    console.error('Spells coaching error:', error);
    res.status(500).json({ error: 'Failed to generate spell development advice' });
  }
});

// POST /api/coaching/group-activity - Group activity chat responses
router.post('/group-activity', authenticate_token, async (req: any, res) => {
  try {
    const { character_id, character_name, coach_message, event_type, context } = req.body;

    // Get character personality data - try both direct match and name-based lookup
    let character_data = character_psychology_data[character_id];
    if (!character_data) {
      // Try to find by name if direct ID lookup fails
      const name_key = Object.keys(character_psychology_data).find(key =>
        character_psychology_data[key].name.toLowerCase() === character_name.toLowerCase()
      );
      if (name_key) {
        character_data = character_psychology_data[name_key];
      }
    }

    if (!character_data) {
      // Create a basic fallback for unknown characters
      character_data = {
        name: character_name,
        personality: {
          traits: ['Friendly', 'Cooperative', 'Team-oriented'],
          speech_style: 'Casual and collaborative',
          motivations: ['Team success', 'Personal growth', 'Friendship'],
          fears: ['Letting the team down', 'Conflict', 'Isolation']
        },
        historical_period: 'Modern Era',
        mythology: 'Contemporary character'
      };
    }

    // Build group activity prompt based on event type and coach message
    let activity_prompt = '';

    switch (event_type.toLowerCase()) {
      case 'team dinner':
      case 'dinner':
        activity_prompt = `You are participating in a team dinner event. The coach just said: "${coach_message}". 
        Respond as if you're having a casual meal with your teammates. Share personal thoughts, ask questions about others, 
        or comment on the food and atmosphere. Keep it friendly and team-bonding focused.`;
        break;

      case 'weekend retreat':
      case 'retreat':
        activity_prompt = `You are at a team weekend retreat. The coach just said: "${coach_message}". 
        Respond thoughtfully about team dynamics, personal growth, or the retreat activities. 
        This is a deeper bonding experience, so be more reflective and open.`;
        break;

      case 'board game night':
      case 'game_night':
        activity_prompt = `You are playing board games with the team. The coach just said: "${coach_message}". 
        Respond with enthusiasm about the games, strategy discussions, or friendly competitive banter. 
        Show your personality through how you approach games and teamwork.`;
        break;

      case 'group therapy session':
      case 'group_therapy':
        activity_prompt = `You are in a group therapy session with your teammates. The coach just said: "${coach_message}". 
        Respond with vulnerability and honesty appropriate for therapy. Share feelings, concerns, or insights 
        about team dynamics and personal challenges. Be supportive of others.`;
        break;

      case 'meditation & mindfulness':
      case 'meditation':
        activity_prompt = `You are in a group meditation and mindfulness session. The coach just said: "${coach_message}". 
        Respond with calm reflection, insights about inner peace, or observations about mindfulness. 
        Keep your tone peaceful and centered.`;
        break;

      case 'victory celebration':
      case 'celebration':
        activity_prompt = `You are celebrating a team victory! The coach just said: "${coach_message}". 
        Respond with joy, pride in the team's accomplishments, and celebration energy. 
        Share what the victory means to you and praise your teammates.`;
        break;

      default:
        activity_prompt = `You are participating in a team activity: ${event_type}. The coach just said: "${coach_message}". 
        Respond appropriately for this group activity, showing your personality and team spirit.`;
    }

    // Add character context
    activity_prompt += `
    
    Response Guidelines:
    - Stay true to your personality traits: ${character_data.personality.traits.join(', ')}
    - Use your characteristic speech style: ${character_data.personality.speech_style}
    - Consider recent conversation context if provided
    - Keep responses conversational and team-appropriate (1-2 sentences)
    - Show genuine engagement with the group activity
    - React to what the coach said in a natural way`;

    // Add recent conversation context if available
    if (context?.recentMessages && context.recentMessages.length > 0) {
      const recent_context = context.recentMessages.slice(-3).map((msg: any) =>
        `${msg.sender}: ${msg.message}`
      ).join('\n');
      activity_prompt += `\n\nRecent conversation:\n${recent_context}`;
    }

    // Use existing AI service with group activity context
    const response = await ai_chat_service.generate_character_response(
      {
        character_id: character_id || character_name.toLowerCase().replace(/\s+/g, '_'),
        character_name: character_data.name,
        personality: character_data.personality,
        historical_period: character_data.historical_period,
        mythology: character_data.mythology,
        current_bond_level: context?.bond_level || 60, // Slightly higher for group activities
        previous_messages: context?.recentMessages || []
      },
      activity_prompt,
      req.user.id,
      db,
      { is_in_battle: false, skip_bond_tracking: true }
    );

    // Determine bond activity type based on event type
    // Deeper events get higher bond value
    const deep_events = ['weekend retreat', 'retreat', 'group therapy session', 'group_therapy'];
    const activity_type = deep_events.includes(event_type.toLowerCase()) ?
      'group_activity_success' : 'group_activity_mediocre';

    // Only record if we have a valid character ID (not a fallback name)
    if (character_id && !character_id.includes(' ')) {
      await recordBondActivity({
        user_character_id: character_id,
        activity_type: activity_type as any,
        context: {
          event_type: event_type,
          coach_message_length: coach_message.length
        },
        source: 'group_activity'
      });
    }

    res.json({
      message: response.message,
      character: character_data.name,
      character_id: character_id || character_name.toLowerCase().replace(/\s+/g, '_'),
      event_type,
      timestamp: new Date().toISOString(),
      bond_increase: true
    });

  } catch (error: any) {
    console.error('Group activity coaching error:', error);

    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return res.status(408).json({
        error: 'Response timeout - the character is taking time to think. Please try again.',
        timeout: true
      });
    }

    // Handle other AI service errors
    if (error.message?.includes('rate limit') || error.status === 429) {
      return res.status(429).json({
        error: 'Too many requests - please wait a moment before trying again.',
        rate_limited: true
      });
    }

    res.status(500).json({ error: 'Failed to generate group activity response' });
  }
});

export default router;