import { useCallback } from 'react';
import { type BattleStateData } from '@/hooks/temp/useBattleState';
import { type MatchmakingResult } from '@/data/weightClassSystem';
// Team type doesn't exist - will be fixed by build errors

interface UseMatchmakingProps {
  state: BattleStateData;
  actions: {
    set_selected_opponent: (opponent: MatchmakingResult | null) => void;
    set_show_matchmaking: (show: boolean) => void;
    set_phase: (phase: string) => void;
    set_current_announcement: (announcement: string) => void;
    set_opponent_team: (team: any) => void; // Team
  };
}

export const useMatchmaking = ({ 
  state, 
  actions
}: UseMatchmakingProps) => {

  // Handler for selecting an opponent from matchmaking
  const handleOpponentSelection = useCallback((opponent: MatchmakingResult) => {
    actions.set_selected_opponent(opponent);
    actions.set_show_matchmaking(false);
    actions.set_phase('pre-battle');
    actions.set_current_announcement(`Opponent selected: Level ${opponent.opponent.team_level} team. Prepare for battle!`);
    
    // Set opponent team with actual stats from database
    const adjustedOpponentTeam = {
      ...state.opponent_team,
      characters: state.opponent_team.characters.map(char => ({
        ...char,
        level: opponent.opponent.team_level
      }))
    };
    
    actions.set_opponent_team(adjustedOpponentTeam);
  }, [actions, state.opponent_team]);

  return {
    handleOpponentSelection,
  };
};