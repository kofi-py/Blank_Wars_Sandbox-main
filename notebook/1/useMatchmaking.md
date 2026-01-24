import { useCallback } from 'react';
import { type BattleStateData } from '@/hooks/temp/useBattleState';
import { type MatchmakingResult } from '@/data/weightClassSystem';
// Team type doesn't exist - will be fixed by build errors

interface UseMatchmakingProps {
  state: BattleStateData;
  actions: {
    setSelectedOpponent: (opponent: MatchmakingResult | null) => void;
    setShowMatchmaking: (show: boolean) => void;
    setPhase: (phase: string) => void;
    setCurrentAnnouncement: (announcement: string) => void;
    setOpponentTeam: (team: Team) => void;
  };
}

export const useMatchmaking = ({ 
  state, 
  actions
}: UseMatchmakingProps) => {

  // Handler for selecting an opponent from matchmaking
  const handleOpponentSelection = useCallback((opponent: MatchmakingResult) => {
    actions.setSelectedOpponent(opponent);
    actions.setShowMatchmaking(false);
    actions.setPhase('pre-battle');
    actions.setCurrentAnnouncement(`Opponent selected: Level ${opponent.opponent.teamLevel} team. Prepare for battle!`);
    
    // Set opponent team with actual stats from database
    const adjustedOpponentTeam = {
      ...state.opponentTeam,
      characters: state.opponentTeam.characters.map(char => ({
        ...char,
        level: opponent.opponent.teamLevel
      }))
    };
    
    actions.setOpponentTeam(adjustedOpponentTeam);
  }, [actions, state.opponentTeam]);

  return {
    handleOpponentSelection,
  };
};