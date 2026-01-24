import { useCallback } from 'react';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { type BattleStateData } from '@/hooks/temp/useBattleState';

interface UseUIPresentationProps {
  state: BattleStateData;
  actions: {
    set_current_announcement: (announcement: string) => void;
    set_is_character_typing: (typing: boolean) => void;
    set_selected_chat_character: (character: TeamCharacter | null) => void;
    set_show_rewards: (show: boolean) => void;
    set_show_skill_progression: (show: boolean) => void;
    set_show_audio_settings: (show: boolean) => void;
    set_show_card_collection: (show: boolean) => void;
    set_show_card_packs: (show: boolean) => void;
    set_show_coaching_modal: (show: boolean) => void;
    set_show_matchmaking: (show: boolean) => void;
    set_timer: (time: number | null) => void;
    set_is_timer_active: (active: boolean) => void;
    set_battle_cries: (cries: string[]) => void;
    set_phase: (phase: string) => void;
  };
  timeout_manager: {
    setTimeout: (cb: () => void, delay: number) => any;
    clearTimeout: (id: any) => void;
  };
  speak: (text: string) => void;
}

export const useUIPresentation = ({ 
  state, 
  actions, 
  timeout_manager,
  speak 
}: UseUIPresentationProps) => {

  // Generic message announcer with type handling
  const announceMessage = useCallback(async (message: string, type: string = 'general') => {
    actions.set_current_announcement(message);
    
    // Handle different message types with appropriate delays and effects
    switch (type) {
      case 'battle-start':
        speak(`${message} Let the battle begin!`);
        break;
      case 'round-start':
        speak(`Round ${state.current_round}: ${message}`);
        break;
      case 'victory':
        speak(`Victory! ${message}`);
        actions.set_battle_cries(['🎉 VICTORY! 🎉', 'Well fought!', 'Legendary battle!']);
        break;
      case 'defeat':
        speak(`Defeat... ${message}`);
        actions.set_battle_cries(['😔 Defeat...', 'Better luck next time', 'Learn and grow']);
        break;
      case 'phase-transition':
        speak(message);
        break;
      case 'strategy':
        speak(`Strategy time: ${message}`);
        break;
      case 'battle-cry':
        speak(message);
        actions.set_battle_cries([message]);
        break;
      case 'special-event':
        speak(`Special event: ${message}`);
        break;
      default:
        speak(message);
    }
  }, [actions, speak, state.current_round]);

  // Handle character selection for chat with visual feedback
  const handleSelectChatCharacter = useCallback((character: TeamCharacter) => {
    // Show typing indicator
    actions.set_is_character_typing(true);
    
    // Set selected character
    actions.set_selected_chat_character(character);
    
    // Clear typing indicator after a short delay
    timeout_manager.setTimeout(() => {
      actions.set_is_character_typing(false);
    }, 2000);
  }, [actions, timeout_manager]);

  // Get current player fighter for display
  const getCurrentPlayerFighter = useCallback((): TeamCharacter | null => {
    return state.user_character || (state.player_team.characters.length > 0 ? state.player_team.characters[0] : null);
  }, [state.user_character, state.player_team.characters]);

  // Get current opponent fighter for display
  const getCurrentOpponentFighter = useCallback((): TeamCharacter | null => {
    return state.opponent_character || (state.opponent_team.characters.length > 0 ? state.opponent_team.characters[0] : null);
  }, [state.opponent_character, state.opponent_team.characters]);

  // Calculate team power for display purposes
  const calculateTeamPower = useCallback((teamCharacters: TeamCharacter[]): number => {
    return teamCharacters.reduce((total, char) => {
      return total + char.level * 10 + char.strength + char.defense;
    }, 0);
  }, []);

  // Handle timer expiration with visual feedback
  const handleTimerExpired = useCallback(() => {
    if (state.phase === 'strategy_selection') {
      // Auto-proceed when strategy timer expires
      actions.set_timer(null);
      actions.set_is_timer_active(false);
      
      // Announce time's up
      announceMessage('Time\'s up! Proceeding with current strategies.', 'phase-transition');
      
      // Move to next phase after announcement
      timeout_manager.setTimeout(() => {
        actions.set_phase('pre_battle_huddle');
      }, 2000);
    } else if (state.phase === 'character_strategy_selection') {
      // Handle character strategy timeout
      actions.set_timer(null);
      actions.set_is_timer_active(false);
      
      announceMessage('Strategy selection time expired! Using default strategies.', 'phase-transition');
      
      timeout_manager.setTimeout(() => {
        actions.set_phase('pre_battle_huddle');
      }, 2000);
    }
  }, [state.phase, actions, announceMessage, timeout_manager]);

  // Modal management helpers
  const showModal = useCallback((modalType: string) => {
    switch (modalType) {
      case 'rewards':
        actions.set_show_rewards(true);
        break;
      case 'skillProgression':
        actions.set_show_skill_progression(true);
        break;
      case 'audioSettings':
        actions.set_show_audio_settings(true);
        break;
      case 'cardCollection':
        actions.set_show_card_collection(true);
        break;
      case 'cardPacks':
        actions.set_show_card_packs(true);
        break;
      case 'coaching':
        actions.set_show_coaching_modal(true);
        break;
      case 'matchmaking':
        actions.set_show_matchmaking(true);
        break;
    }
  }, [actions]);

  const hideModal = useCallback((modalType: string) => {
    switch (modalType) {
      case 'rewards':
        actions.set_show_rewards(false);
        break;
      case 'skillProgression':
        actions.set_show_skill_progression(false);
        break;
      case 'audioSettings':
        actions.set_show_audio_settings(false);
        break;
      case 'cardCollection':
        actions.set_show_card_collection(false);
        break;
      case 'cardPacks':
        actions.set_show_card_packs(false);
        break;
      case 'coaching':
        actions.set_show_coaching_modal(false);
        break;
      case 'matchmaking':
        actions.set_show_matchmaking(false);
        break;
    }
  }, [actions]);

  // Timer management functions
  const start_timer = useCallback((duration: number) => {
    actions.set_timer(duration);
    actions.set_is_timer_active(true);
  }, [actions]);

  const stopTimer = useCallback(() => {
    actions.set_timer(null);
    actions.set_is_timer_active(false);
  }, [actions]);

  // Visual feedback helpers
  const showBattleCries = useCallback((cries: string[]) => {
    actions.set_battle_cries(cries);
    
    // Clear battle cries after display time
    timeout_manager.setTimeout(() => {
      actions.set_battle_cries([]);
    }, 5000);
  }, [actions, timeout_manager]);

  // Phase transition with announcement
  const transitionToPhase = useCallback((newPhase: string, announcement?: string) => {
    actions.set_phase(newPhase);
    
    if (announcement) {
      announceMessage(announcement, 'phase-transition');
    }
  }, [actions, announceMessage]);

  // UI state getters for display calculations
  const getUIDisplayStats = useCallback(() => {
    const playerFighter = getCurrentPlayerFighter();
    const opponentFighter = getCurrentOpponentFighter();
    const player_teamPower = calculateTeamPower(state.player_team.characters);
    const opponent_teamPower = calculateTeamPower(state.opponent_team.characters);
    
    return {
      playerFighter,
      opponentFighter,
      player_teamPower,
      opponent_teamPower,
      has_active_timer: state.isTimerActive,
      current_phase: state.phase,
      is_typing: state.isCharacterTyping
    };
  }, [
    getCurrentPlayerFighter, 
    getCurrentOpponentFighter, 
    calculateTeamPower, 
    state.player_team.characters, 
    state.opponent_team.characters,
    state.isTimerActive,
    state.phase,
    state.isCharacterTyping
  ]);

  return {
    // Announcement functions
    announceMessage,
    
    // Character display functions
    handleSelectChatCharacter,
    getCurrentPlayerFighter,
    getCurrentOpponentFighter,
    calculateTeamPower,
    
    // Timer management
    handleTimerExpired,
    start_timer,
    stopTimer,
    
    // Modal management
    showModal,
    hideModal,
    
    // Visual effects
    showBattleCries,
    transitionToPhase,
    
    // UI state utilities
    getUIDisplayStats,
  };
};