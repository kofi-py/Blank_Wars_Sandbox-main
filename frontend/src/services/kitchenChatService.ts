import { HeadquartersState } from '../types/headquarters';
import { Contestant } from '@blankwars/types';
import { kitchenChatService } from '../data/kitchenChatService';
import { PromptTemplateService } from '../services/promptTemplateService';
import { usageService, UsageStatus } from '../services/usageService';
import { calculateSleepingArrangement, calculateRoomCapacity } from '../utils/roomCalculations';
import GameEventBus from './gameEventBus';
import EventContextService from './eventContextService';

// Re-export the correct service from data/kitchenChatService
export { kitchenChatService };

export interface KitchenConversation {
  id: string;
  avatar: string;
  speaker: string;
  speaker_id: string;
  message: string;
  is_complaint: boolean;
  timestamp: Date;
  is_ai: boolean;
  round: number;
}

/**
 * Start a new kitchen scene with opening conversations
 */
export const startNewScene = async (
  headquarters: HeadquartersState,
  available_characters: Contestant[],
  set_is_generating_conversation: (generating: boolean) => void,
  set_current_scene_round: (round: number) => void,
  set_kitchen_conversations: (conversations: KitchenConversation[]) => void
) => {
  set_is_generating_conversation(true);
  set_current_scene_round(1);
  set_kitchen_conversations([]);

  try {
    // Wait for socket connection
    const isConnected = await kitchenChatService.waitForConnection();
    if (!isConnected) {
      console.warn('Could not establish socket connection for kitchen chat');
    }
    const sceneType = PromptTemplateService.selectSceneType();
    const allRoommates = available_characters.map(c => c.character_id);
    const participants = PromptTemplateService.selectSceneParticipants(allRoommates, 3);
    const trigger = PromptTemplateService.generateSceneTrigger(sceneType, headquarters.current_tier, headquarters);

    console.log('🎬 Starting new scene:', { sceneType, participants, trigger });

    const openingConversations = [];

    for (const charName of participants) {
      const character = available_characters.find(c => c.character_id === charName);
      if (!character) continue;

      const teammates = available_characters.filter(c =>
        allRoommates.includes(c.character_id) && c.character_id !== charName
      );

      // Import kitchen context for enhanced conversations
      let kitchenContext = '';
      let comedyContext = '';
      try {
        const contextService = EventContextService.getInstance();
        kitchenContext = await contextService.getKitchenContext(charName);
        comedyContext = contextService.getComedyContext(charName, 'kitchen_table', trigger);
      } catch (error) {
        console.error('Error getting kitchen context:', error);
      }

      // Calculate sleeping arrangement for this character
      const room = headquarters.rooms.find(r => r.assigned_characters.includes(charName)) || headquarters.rooms[0];
      const sleepingArrangement = calculateSleepingArrangement(room, charName);
      const roomCapacity = calculateRoomCapacity(room);
      const isOvercrowded = room.assigned_characters.length > roomCapacity;

      const context = {
        character,
        teammates,
        coach_name: 'Coach',
        living_conditions: {
          apartment_tier: headquarters.current_tier,
          room_theme: room.theme,
          sleeps_on_couch: sleepingArrangement.sleeps_on_couch,
          sleeps_on_floor: sleepingArrangement.sleeps_on_floor,
          sleeps_in_bed: sleepingArrangement.sleeps_in_bed,
          bed_type: sleepingArrangement.bed_type,
          comfort_bonus: sleepingArrangement.comfort_bonus,
          sleeps_under_table: charName === 'dracula' && headquarters.current_tier === 'spartan_apartment',
          room_overcrowded: isOvercrowded,
          floor_sleeper_count: Math.max(0, room.assigned_characters.length - roomCapacity),
          roommate_count: room.assigned_characters.length
        },
        recent_events: [trigger],
        kitchenContext, // Add imported context
        comedyContext // Add comedy cross-references for humor
      };

      try {
        const messages = openingConversations.slice(0, 5).map(convo => ({
          message: convo.message,
          speaker_name: convo.speaker,
          speaker_id: convo.speaker_id
        }));
        const response = await kitchenChatService.generateKitchenConversation(context, trigger, messages);
        openingConversations.push({
          id: `scene1_${Date.now()}_${charName}`,
          avatar: character.avatar,
          speaker: character.name.split(' ')[0],
          speaker_id: character.id,
          message: response,
          is_complaint: response.includes('!') || response.toLowerCase().includes('annoying'),
          timestamp: new Date(),
          is_ai: true,
          round: 1
        });

        // Publish kitchen conversation event
        try {
          const eventBus = GameEventBus.getInstance();
          const responseText = response.toLowerCase();
          let event_type = 'kitchen_conversation';
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

          if (responseText.includes('annoying') || responseText.includes('frustrating') || responseText.includes('!')) {
            event_type = 'social_conflict';
            severity = 'high';
          } else if (responseText.includes('tired') || responseText.includes('sleep') || responseText.includes('floor')) {
            event_type = 'living_complaint';
            severity = 'medium';
          } else if (responseText.includes('bathroom') || responseText.includes('privacy') || responseText.includes('space')) {
            event_type = 'privacy_concern';
            severity = 'high';
          }

          await eventBus.publish({
            type: event_type as any,
            source: 'kitchen_table',
            primary_character_id: charName,
            severity,
            category: 'social',
            description: `${character.name} in kitchen: "${response.substring(0, 100)}..."`,
            metadata: {
              scene_type: 'opening',
              round: 1,
              apartment_tier: headquarters.current_tier,
              room_overcrowded: isOvercrowded,
              is_complaint: response.includes('!') || response.toLowerCase().includes('annoying')
            },
            tags: ['kitchen', 'social', 'conversation']
          });
        } catch (error) {
          console.error('Error publishing kitchen event:', error);
        }
      } catch (error: any) {
        console.error(`Scene generation failed for ${charName}:`, error);
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    set_kitchen_conversations(openingConversations);
  } finally {
    set_is_generating_conversation(false);
  }
};

/**
 * Handle coach message input and generate character responses
 */
export const handleCoachMessage = async (
  coach_message: string,
  headquarters: HeadquartersState,
  available_characters: Contestant[],
  current_scene_round: number,
  set_kitchen_conversations: (fn: (prev: KitchenConversation[]) => KitchenConversation[]) => void,
  set_coach_message: (message: string) => void,
  set_is_generating_conversation: (generating: boolean) => void,
  set_current_scene_round: (round: number) => void,
  kitchen_conversations: KitchenConversation[]
) => {
  if (!coach_message.trim()) return;

  // Add coach message to conversation
  const coachConversation = {
    id: `coach_${Date.now()}`,
    avatar: '👨‍💼',
    speaker: 'Coach',
    speaker_id: 'coach',
    message: coach_message.trim(),
    is_complaint: false,
    timestamp: new Date(),
    is_ai: false,
    round: current_scene_round
  };

  set_kitchen_conversations(prev => [coachConversation, ...prev]);
  const user_message = coach_message.trim();
  set_coach_message('');

  // Wait a bit to ensure coach message is visible before generating responses
  await new Promise(resolve => setTimeout(resolve, 500));
  set_is_generating_conversation(true);

  try {
    // Get characters to respond to the coach's message
    const allRoommates = available_characters.map(c => c.character_id);
    const participants = PromptTemplateService.selectSceneParticipants(allRoommates, 2); // Just 2 characters respond

    const responses = [];

    for (const charName of participants) {
      const character = available_characters.find(c => c.character_id === charName);
      if (!character) continue;

      const teammates = available_characters.filter(c =>
        allRoommates.includes(c.character_id) && c.character_id !== charName
      );

      // Calculate sleeping arrangement for this character
      const room = headquarters.rooms.find(r => r.assigned_characters.includes(charName)) || headquarters.rooms[0];
      const sleepingArrangement = calculateSleepingArrangement(room, charName);
      const roomCapacity = calculateRoomCapacity(room);
      const isOvercrowded = room.assigned_characters.length > roomCapacity;

      const context = {
        character,
        teammates,
        coach_name: 'Coach',
        living_conditions: {
          apartment_tier: headquarters.current_tier,
          room_theme: room.theme,
          sleeps_on_couch: sleepingArrangement.sleeps_on_couch,
          sleeps_on_floor: sleepingArrangement.sleeps_on_floor,
          sleeps_in_bed: sleepingArrangement.sleeps_in_bed,
          bed_type: sleepingArrangement.bed_type,
          comfort_bonus: sleepingArrangement.comfort_bonus,
          sleeps_under_table: charName === 'dracula' && headquarters.current_tier === 'spartan_apartment',
          room_overcrowded: isOvercrowded,
          floor_sleeper_count: Math.max(0, room.assigned_characters.length - roomCapacity),
          roommate_count: room.assigned_characters.length
        },
        recent_events: [user_message]
      };

      try {
        const messages = kitchen_conversations.slice(0, 5).map(convo => ({
          message: convo.message,
          speaker_name: convo.speaker,
          speaker_id: convo.speaker_id
        }));
        const response = await kitchenChatService.generateKitchenConversation(
          context,
          `Your coach just said to everyone: "${user_message}". React and respond directly to them.`,
          messages
        );
        responses.push({
          id: `response_${Date.now()}_${charName}`,
          avatar: character.avatar,
          speaker: character.name.split(' ')[0],
          speaker_id: character.id,
          message: response,
          is_complaint: response.includes('!') || response.toLowerCase().includes('annoying'),
          timestamp: new Date(),
          is_ai: true,
          round: current_scene_round + 1
        });

        // Add delay between responses for natural flow
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Response generation failed for ${charName}:`, error);
        throw error;
      }
    }

    set_kitchen_conversations(prev => [...responses, ...prev]);
    set_current_scene_round(current_scene_round + 1);
  } finally {
    set_is_generating_conversation(false);
  }
};


// continueScene function - extracted from TeamHeadquarters.tsx (lines 232-374)
export const continueScene = async (
  is_generating_conversation: boolean,
  set_is_generating_conversation: React.Dispatch<React.SetStateAction<boolean>>,
  current_scene_round: number,
  set_current_scene_round: React.Dispatch<React.SetStateAction<number>>,
  kitchen_conversations: KitchenConversation[],
  set_kitchen_conversations: React.Dispatch<React.SetStateAction<KitchenConversation[]>>,
  headquarters: any,
  available_characters: any[],
  calculate_sleeping_arrangement: (room: any, char_name: string) => any,
  calculate_room_capacity: (room: any) => number,
  kitchen_chat_service: any,
  usage_service: any,
  set_usage_status: React.Dispatch<React.SetStateAction<any>>,
  PromptTemplateService: any
) => {
  if (is_generating_conversation) return;

  set_is_generating_conversation(true);
  set_current_scene_round(prev => prev + 1);

  try {
    const newRound = current_scene_round + 1;
    let trigger = '';
    let participants: string[] = [];
    const allRoommates = available_characters.map(c => c.character_id); // Use canonical ID not user instance ID

    if (newRound <= 3) {
      // Non-sequential response selection
      const lastParticipants = [...new Set(kitchen_conversations.slice(0, 3).map(c => c.speaker))];
      const availableResponders = allRoommates.filter(name => {
        const char = available_characters.find(c => c.character_id === name);
        return char && lastParticipants.includes(char.name.split(' ')[0]);
      });

      // Randomly select 1-2 characters (non-sequential)
      const numResponders = Math.min(Math.random() > 0.5 ? 2 : 1, availableResponders.length);
      participants = availableResponders.sort(() => Math.random() - 0.5).slice(0, numResponders);

      const lastMessage = kitchen_conversations[0];
      trigger = `Someone responds to ${lastMessage.speaker}'s comment: "${lastMessage.message}". Keep the conversation natural and build on what was said.`;
    } else if (newRound <= 6) {
      const currentParticipants = [...new Set(kitchen_conversations.map(c => c.speaker))];
      const availableNewChars = allRoommates.filter(name => {
        const char = available_characters.find(c => c.character_id === name);
        return char && !currentParticipants.includes(char.name.split(' ')[0]);
      });

      if (availableNewChars.length > 0) {
        // Random selection of new character
        participants = [availableNewChars[Math.floor(Math.random() * availableNewChars.length)]];
        trigger = `${available_characters.find(c => c.character_id === participants[0])?.name.split(' ')[0]} walks into the kitchen and reacts to what's happening`;
      } else {
        // Random selection from all characters
        participants = allRoommates.sort(() => Math.random() - 0.5).slice(0, 2);
        trigger = 'The conversation takes a new turn';
      }
    } else {
      participants = PromptTemplateService.selectSceneParticipants(allRoommates, 2);
      const chaos_events = [
        'Coach suddenly walks in and interrupts',
        'The fire alarm starts going off',
        'There is a loud crash from another room',
        'Someone spills something all over the floor'
      ];
      trigger = chaos_events[Math.floor(Math.random() * chaos_events.length)];
    }

    const newConversations = [];

    for (const charName of participants) {
      const character = available_characters.find(c => c.character_id === charName);
      if (!character) continue;

      // Calculate sleeping arrangement for this character
      const room = headquarters.rooms.find(r => r.assigned_characters.includes(charName)) || headquarters.rooms[0];
      const sleepingArrangement = calculateSleepingArrangement(room, charName);
      const roomCapacity = calculateRoomCapacity(room);
      const isOvercrowded = room.assigned_characters.length > roomCapacity;

      const context = {
        character,
        teammates: available_characters.filter(c =>
          allRoommates.includes(c.character_id) && c.character_id !== charName
        ),
        coach_name: 'Coach',
        living_conditions: {
          apartment_tier: headquarters.current_tier,
          room_theme: room.theme,
          sleeps_on_couch: sleepingArrangement.sleeps_on_couch,
          sleeps_on_floor: sleepingArrangement.sleeps_on_floor,
          sleeps_in_bed: sleepingArrangement.sleeps_in_bed,
          bed_type: sleepingArrangement.bed_type,
          comfort_bonus: sleepingArrangement.comfort_bonus,
          sleeps_under_table: charName === 'dracula' && headquarters.current_tier === 'spartan_apartment',
          room_overcrowded: isOvercrowded,
          floor_sleeper_count: Math.max(0, room.assigned_characters.length - roomCapacity),
          roommate_count: room.assigned_characters.length
        },
        recent_events: kitchen_conversations.slice(0, 3).map(c => `${c.speaker}: ${c.message}`)
      };

      try {
        // Enhanced context with conversation history
        const conversationHistory = kitchen_conversations.slice(0, 5).map(c => `${c.speaker}: ${c.message}`).join('\n');
        const enhancedContext = {
          ...context,
          conversationHistory,
          recent_events: [trigger, ...context.recent_events]
        };

        const messages = kitchen_conversations.slice(0, 5).map(convo => ({
          message: convo.message,
          speaker_name: convo.speaker,
          speaker_id: convo.speaker_id
        }));
        const response = await kitchenChatService.generateKitchenConversation(enhancedContext, trigger, messages);

        // Duplicate detection to prevent repetitive responses
        const recentMessages = kitchen_conversations.slice(0, 3).map(c => c.message.toLowerCase());
        const isUnique = response && response.length > 10 &&
          !recentMessages.some(msg => {
            const similarity = msg.includes(response.toLowerCase().substring(0, 15)) ||
              response.toLowerCase().includes(msg.substring(0, 15));
            return similarity;
          });

        if (isUnique) {
          newConversations.push({
            id: `scene${newRound}_${Date.now()}_${charName}`,
            avatar: character.avatar,
            speaker: character.name.split(' ')[0],
            speaker_id: character.id,
            message: response,
            is_complaint: response.includes('!') || response.toLowerCase().includes('annoying'),
            timestamp: new Date(),
            is_ai: true,
            round: newRound
          });
        }
      } catch (error) {
        console.error(`Failed to continue scene for ${charName}:`, error);
        if (error instanceof Error && error.message === 'USAGE_LIMIT_REACHED') {
          // Stop trying more characters and refresh usage status
          const loadUsageStatus = async () => {
            try {
              const status = await usageService.getUserUsageStatus();
              set_usage_status(status);
            } catch (error) {
              console.error('Failed to refresh usage status:', error);
            }
          };
          await loadUsageStatus();
        }
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    set_kitchen_conversations(prev => [...newConversations, ...prev].slice(0, 25));
  } finally {
    set_is_generating_conversation(false);
  }
};
