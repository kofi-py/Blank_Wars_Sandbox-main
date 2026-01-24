import { useCallback, useEffect } from 'react';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { generateAIResponse } from '@/utils/aiChatResponses';
import { formatCharacterName } from '@/utils/characterUtils';
import { type BattleStateData } from '@/hooks/useBattleState';

interface UseBattleChatProps {
  state: BattleStateData;
  actions: {
    set_chat_messages: (messages: string[]) => void;
    add_chat_message: (message: string) => void;
    set_custom_message: (message: string) => void;
    set_is_character_typing: (typing: boolean) => void;
    set_selected_chat_character: (character: TeamCharacter) => void;
  };
  ws_socket: any; // WebSocket connection from useBattleWebSocket
  timeout_manager: {
    setTimeout: typeof window.setTimeout;
    clearTimeout: typeof window.clearTimeout;
  };
}

export const useBattleChat = ({ 
  state, 
  actions, 
  ws_socket, 
  timeout_manager 
}: UseBattleChatProps) => {
  const { setTimeout: safeSetTimeout } = timeout_manager;

  // Set up WebSocket chat listeners (only once)
  useEffect(() => {
    if (ws_socket) {
      const handleChatResponse = (data: any) => {
        const formattedMessage = `${formatCharacterName(data.character)}: ${data.message}`;
        actions.add_chat_message(formattedMessage);
      };

      // Set up listener
      ws_socket.on('chat_response', handleChatResponse);

      // Cleanup listener on unmount or socket change
      return () => {
        ws_socket.off('chat_response', handleChatResponse);
      };
    }
  }, [ws_socket]);

  // Send custom message - FIXED: No longer creates new socket connections
  const handleCustomMessage = useCallback(async () => {
    if (!state.custom_message.trim() || !state.selected_chat_character) return;

    const messageToSend = state.custom_message.trim();
    actions.set_custom_message(''); // Clear input
    actions.set_is_character_typing(true);

    try {
      // Add user message to chat
      const user_message = `You: ${messageToSend}`;
      actions.add_chat_message(user_message);

      // Simulate thinking delay for realism
      await new Promise(resolve => safeSetTimeout(resolve, 1000 + Math.random() * 1500));
      
      // FIXED: Use existing WebSocket connection instead of creating new ones
      if (ws_socket) {
        ws_socket.emit('chat_message', {
          message: messageToSend,
          character: state.selected_chat_character.name.toLowerCase().replace(/\s+/g, '_'),
          character_data: {
            name: state.selected_chat_character.name,
            personality_traits: state.selected_chat_character.personality_traits,
            current_health: state.selected_chat_character.current_health,
            max_health: state.selected_chat_character.max_health,
            battle_phase: state.phase
          }
        });
      } else {
        // Fallback to local AI response if WebSocket is not available
        await generateLocalAIResponse(messageToSend);
      }
      
    } catch (error) {
      console.error('Error sending chat message:', error);
      actions.add_chat_message('Error: Could not send message. Please try again.');
    } finally {
      actions.set_is_character_typing(false);
    }
  }, [state.custom_message, state.selected_chat_character, state.phase, ws_socket]);

  // Generate local AI response as fallback
  const generateLocalAIResponse = useCallback(async (user_message: string) => {
    try {
      const response = await generateAIResponse(
        state.selected_chat_character.name,
        user_message,
        {
          round: state.current_round,
          player_health: state.selected_chat_character.current_health,
          enemy_health: state.opponent_character.current_health,
          strategy: state.selected_strategies,
          phase: state.phase
        }
      );

      const aiMessage = `${formatCharacterName(state.selected_chat_character.name)}: ${response}`;
      actions.add_chat_message(aiMessage);
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage = `${formatCharacterName(state.selected_chat_character.name)}: *seems distracted and doesn't respond*`;
      actions.add_chat_message(errorMessage);
    }
  }, [state.selected_chat_character, state.phase, state.current_round, state.opponent_character, state.selected_strategies, actions]);

  // Quick chat presets for common interactions
  const sendQuickMessage = useCallback(async (message_type: 'motivation' | 'strategy' | 'taunt' | 'encouragement') => {
    const quickMessages = {
      motivation: "Stay focused! We can do this!",
      strategy: "What's our game plan for this round?",
      taunt: "Is that the best you've got?",
      encouragement: "Great job out there! Keep it up!"
    };

    const message = quickMessages[message_type];
    actions.set_custom_message(message);
    await handleCustomMessage();
  }, [handleCustomMessage]);

  // Change chat character
  const selectChatCharacter = useCallback((character: TeamCharacter) => {
    actions.set_selected_chat_character(character);
    const selectionMessage = `Now chatting with ${formatCharacterName(character.name)}`;
    actions.add_chat_message(selectionMessage);
  }, []);

  // Clear chat history
  const clearChatHistory = useCallback(() => {
    actions.set_chat_messages([]);
  }, []);

  // Auto-generate team banter during battle phases
  const generateTeamBanter = useCallback(async (trigger: 'round_start' | 'victory' | 'defeat' | 'critical_hit') => {
    if (state.chat_messages.length > 20) return; // Don't spam if chat is already busy

    try {
      const randomCharacter = state.player_team.characters[Math.floor(Math.random() * state.player_team.characters.length)];
      
      const banterPrompts = {
        round_start: "Let's show them what we're made of!",
        victory: "Yes! That's how it's done!",
        defeat: "Don't worry, we'll get them next time.",
        critical_hit: "Did you see that move?!"
      };

      const response = await generateAIResponse(
        randomCharacter.name,
        banterPrompts[trigger],
        {
          round: state.current_round,
          player_health: randomCharacter.current_health,
          enemy_health: state.opponent_character.current_health,
          strategy: state.selected_strategies,
          phase: state.phase
        }
      );

      const banterMessage = `${formatCharacterName(randomCharacter.name)}: ${response}`;
      actions.add_chat_message(banterMessage);
      
    } catch (error) {
      console.error('Error generating team banter:', error);
    }
  }, [state.player_team, state.phase, state.current_round, state.player_morale, state.chat_messages.length]);

  // Get chat statistics
  const getChatStats = useCallback(() => {
    const totalMessages = state.chat_messages.length;
    const user_messages = state.chat_messages.filter(msg => msg.startsWith('You:')).length;
    const character_messages = totalMessages - user_messages;
    
    return {
      totalMessages,
      user_messages,
      character_messages,
      selected_characterName: state.selected_chat_character.name
    };
  }, [state.chat_messages, state.selected_chat_character]);

  return {
    // Core chat functions
    handleCustomMessage,
    sendQuickMessage,
    selectChatCharacter,
    clearChatHistory,
    generateTeamBanter,
    generateLocalAIResponse,
    
    // Chat state accessors
    getChatStats,
    
    // Computed values
    can_send_message: state.custom_message.trim().length > 0 && !state.is_character_typing,
    is_typing: state.is_character_typing,
    chat_history: state.chat_messages,
    current_message: state.custom_message,
    selected_character: state.selected_chat_character,
    available_characters: state.player_team.characters
  };
};