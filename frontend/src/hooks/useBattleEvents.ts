import { useCallback } from 'react';
import { type BattleStateData } from '@/hooks/temp/useBattleState';
import EventPublisher from '@/services/eventPublisher';

interface UseBattleEventsProps {
  state: BattleStateData;
  actions: {
    set_current_announcement: (announcement: string) => void;
    set_phase: (phase: string) => void;
    set_current_round: (round: number) => void;
    set_battle_rewards: (rewards: any) => void;
    set_show_rewards: (show: boolean) => void;
  };
  announce_battle_start: (userCharacter: string, opponent_character: string) => void;
  announce_round_start: (round: number) => void;
  announce_victory: (winner: string) => void;
  announce_defeat: (loser: string) => void;
  socket_ref: any;
  // CamelCase variants
  announceBattleStart?: (userCharacter: string, opponent_character: string) => void;
  announceRoundStart?: (round: number) => void;
  announceVictory?: (winner: string) => void;
  announceDefeat?: (loser: string) => void;
  socketRef?: any;
}

export const useBattleEvents = ({ 
  state, 
  actions,
  announceBattleStart,
  announceRoundStart,
  announceVictory,
  announceDefeat,
  socketRef
}: UseBattleEventsProps) => {
  const eventPublisher = EventPublisher.getInstance();

  // WebSocket event handler for battle start
  const handleBattleStart = useCallback((data: any) => {
    console.log('Battle starting:', data);
    // Note: WebSocket data may use player1/player2 or user_character/opponent_character depending on backend version
    const userChar = data.user_character?.username || data.player1?.username;
    const oppChar = data.opponent_character?.username || data.player2?.username;
    actions.set_current_announcement(`Battle begins! ${userChar} vs ${oppChar}`);
    actions.set_phase('pre_battle_huddle');
    announceBattleStart(userChar || 'User', oppChar || 'Opponent');
  }, [actions, announceBattleStart]);

  // WebSocket event handler for round start
  const handleRoundStart = useCallback((data: any) => {
    console.log('Round starting:', data);
    actions.set_current_round(data.round || 1);
    actions.set_current_announcement(`Round ${data.round || 1} begins!`);
    actions.set_phase('combat');
    announceRoundStart(data.round || 1);
  }, [actions, announceRoundStart]);

  // WebSocket event handler for battle end
  const handleBattleEnd = useCallback(async (result: any) => {
    console.log('Battle ended:', result);
    actions.set_current_announcement(result.message || 'Battle completed!');
    actions.set_phase('battle_complete');
    
    // Publish battle event to centralized system
    try {
      await eventPublisher.publishBattleEvent({
        winner_id: result.winner_id || result.winner || 'unknown',
        loser_id: result.loser_id || result.loser || 'unknown',
        participants: result.participants || [result.winner_id, result.loser_id].filter(Boolean),
        battle_duration: result.duration || 0,
        teamwork_rating: result.teamwork_rating || 50,
        mvp_player: result.mvp || result.winner_id,
        battle_type: result.battle_type || 'arena_battle',
        strategy_used: result.strategy || 'unknown'
      });
      console.log('✅ Battle event published to centralized system');
    } catch (error) {
      console.warn('❌ Failed to publish battle event:', error);
    }
    
    if (result.winner === socketRef.current?.currentUser?.id) {
      announceVictory(result.winnerName || 'You');
    } else {
      announceDefeat(result.loserName || 'You');
    }
    
    // Show rewards if available
    if (result.rewards) {
      actions.set_battle_rewards(result.rewards);
      actions.set_show_rewards(true);
    }
  }, [actions, socketRef, announceVictory, announceDefeat, eventPublisher]);

  return {
    handleBattleStart,
    handleRoundStart,
    handleBattleEnd,
  };
};