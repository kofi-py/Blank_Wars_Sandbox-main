import { useCallback } from 'react';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { type BattleStateData } from '@/hooks/temp/useBattleState';

interface UseCardCollectionSystemProps {
  state: BattleStateData;
  actions: {
    set_player_cards: (cards: TeamCharacter[]) => void;
    set_selected_team_cards: (cards: string[]) => void;
    set_player_currency: (currency: number) => void;
    set_show_card_collection: (show: boolean) => void;
  };
}

export const useCardCollectionSystem = ({ 
  state, 
  actions 
}: UseCardCollectionSystemProps) => {

  // Initialize card collection with current team characters
  const initializeCardCollection = useCallback(() => {
    const availableCards = [
      ...state.player_team.characters,
      ...state.opponent_team.characters
    ];
    actions.set_player_cards(availableCards);
  }, [state.player_team.characters, state.opponent_team.characters, actions]);

  // Handle selecting a character card for team building
  const handleCardSelect = useCallback((character_id: string) => {
    if (state.selectedTeamCards.length < 3 && !state.selectedTeamCards.includes(character_id)) {
      actions.set_selected_team_cards([...state.selectedTeamCards, character_id]);
    }
  }, [state.selectedTeamCards, actions]);

  // Handle deselecting a character card
  const handleCardDeselect = useCallback((character_id: string) => {
    actions.set_selected_team_cards(state.selectedTeamCards.filter(id => id !== character_id));
  }, [state.selectedTeamCards, actions]);

  // Handle receiving new cards from card pack opening
  const handleCardsReceived = useCallback((newCards: TeamCharacter[]) => {
    actions.set_player_cards([...state.playerCards, ...newCards]);
    // Grant bonus currency for new cards
    actions.set_player_currency(state.playerCurrency + 100);
  }, [actions, state.playerCards, state.playerCurrency]);

  // Handle spending in-game currency
  const handleCurrencySpent = useCallback((amount: number) => {
    actions.set_player_currency(Math.max(0, state.playerCurrency - amount));
  }, [actions, state.playerCurrency]);

  // Build team from selected cards (integrates with coaching system)
  const buildTeamFromCards = useCallback(() => {
    const selectedCards = state.playerCards.filter(card => 
      state.selectedTeamCards.includes(card.id)
    );
    if (selectedCards.length === 3) {
      const newTeam = {
        ...state.player_team,
        characters: selectedCards,
        team_chemistry: 50, // Will be recalculated
      };
      // This would need to be passed as an action or handled through parent
      console.log('Building team from cards:', newTeam);
      actions.set_show_card_collection(false);
      actions.set_selected_team_cards([]);
      return newTeam;
    }
    return null;
  }, [state.playerCards, state.selectedTeamCards, state.player_team, actions]);

  // Get card collection statistics
  const getCardCollectionStats = useCallback(() => {
    const totalCards = state.playerCards.length;
    const selectedCards = state.selectedTeamCards.length;
    const isTeamComplete = selectedCards === 3;
    const availableCurrency = state.playerCurrency;

    return {
      totalCards,
      selectedCards,
      isTeamComplete,
      availableCurrency,
      can_build_team: isTeamComplete
    };
  }, [state.playerCards.length, state.selectedTeamCards.length, state.playerCurrency]);

  return {
    // Card selection functions
    initializeCardCollection,
    handleCardSelect,
    handleCardDeselect,
    
    // Card pack functions
    handleCardsReceived,
    handleCurrencySpent,
    
    // Team building functions
    buildTeamFromCards,
    
    // Utilities
    getCardCollectionStats,
  };
};