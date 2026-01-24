import { useCallback } from 'react';
import { type BattleStateData } from '@/hooks/temp/useBattleState';
import { createBattleStats } from '@/data/combatRewards';

interface UseBattleFlowProps {
  state: BattleStateData;
  actions: {
    set_current_round: (round: number) => void;
    set_current_match: (match: number) => void;
    set_player_match_wins: (wins: number) => void;
    set_opponent_match_wins: (wins: number) => void;
    set_player_round_wins: (wins: number) => void;
    set_opponent_round_wins: (wins: number) => void;
    set_selected_opponent: (opponent: any) => void;
    set_show_matchmaking: (show: boolean) => void;
    set_phase: (phase: string) => void;
    set_current_announcement: (announcement: string) => void;
    set_battle_cries: (cries: any) => void;
    set_timer?: (time: number | null) => void;
    set_is_timer_active?: (active: boolean) => void;
    set_coaching_messages: (messages: string[]) => void;
    set_character_response: (response: string) => void;
    set_show_disagreement: (show: boolean) => void;
    set_selected_strategies: (strategies: any) => void;
    set_pending_strategy: (strategy: any) => void;
    set_chat_messages: (messages: any[]) => void;
    set_custom_message: (message: string) => void;
    set_is_character_typing: (typing: boolean) => void;
    set_show_rewards: (show: boolean) => void;
    set_battle_rewards: (rewards: any) => void;
    set_show_skill_progression: (show: boolean) => void;
    set_combat_skill_reward: (reward: any) => void;
    set_player_team: (team: any) => void;
    set_user_character: (player: any) => void;
    set_opponent_character: (player: any) => void;
  };
}

export const useBattleFlow = ({ 
  state, 
  actions
}: UseBattleFlowProps) => {

  // Comprehensive battle reset - clears all state and returns to opponent selection
  const resetBattle = useCallback(() => {
    // Reset battle progression
    actions.set_current_round(1);
    actions.set_current_match(1);
    actions.set_player_match_wins(0);
    actions.set_opponent_match_wins(0);
    actions.set_player_round_wins(0);
    actions.set_opponent_round_wins(0);
    
    // Reset matchmaking and phase
    actions.set_selected_opponent(null);
    actions.set_show_matchmaking(true);
    actions.set_phase('matchmaking');
    actions.set_current_announcement('Welcome to the Arena! Choose your opponent to begin battle!');
    
    // Reset UI state
    actions.set_battle_cries({ player1: '', player2: '' });
    actions.set_timer(null);
    actions.set_is_timer_active(false);
    
    // Reset coaching and strategy state
    actions.set_coaching_messages([]);
    actions.set_character_response('');
    actions.set_show_disagreement(false);
    actions.set_selected_strategies({ attack: null, defense: null, special: null });
    actions.set_pending_strategy(null);
    
    // Reset chat state
    actions.set_chat_messages([]);
    actions.set_custom_message('');
    actions.set_is_character_typing(false);
    
    // Reset rewards
    actions.set_show_rewards(false);
    actions.set_battle_rewards(null);
    actions.set_show_skill_progression(false);
    actions.set_combat_skill_reward(null);
    
    // Reset character health, battle stats, and status
    actions.set_player_team((prevTeam: any) => ({
      ...prevTeam,
      characters: prevTeam.characters.map((char: any) => ({
        ...char,
        current_health: char.max_health,
        status_effects: [],
        temporary_stats: {
          strength: 0,
          defense: 0,
          speed: 0,
          dexterity: 0,
          intelligence: 0,
          charisma: 0,
          spirit: 0
        },
      })),
    }));
    
    actions.set_user_character((prev: any) => ({
      ...prev,
      hp: prev.max_health,
      status_effects: [],
      battle_stats: createBattleStats(),
      abilities: Array.isArray(prev.abilities) ? prev.abilities.map((a: any) => ({ ...a, current_cooldown: 0 })) : []
    }));

    actions.set_opponent_character((prev: any) => ({
      ...prev,
      hp: prev.max_health,
      status_effects: [],
      battle_stats: createBattleStats(),
      abilities: Array.isArray(prev.abilities) ? prev.abilities.map((a: any) => ({ ...a, current_cooldown: 0 })) : []
    }));
  }, [actions]);

  // Start strategy selection phase with announcement and timer
  const startStrategySelection = useCallback(() => {
    actions.set_phase('strategy-selection');
    const announcement = `Strategy Planning Phase - Choose each character's approach for battle!`;
    actions.set_current_announcement(announcement);
    
    // Initialize character-specific strategies - this needs to be passed from the coaching system
    actions.set_selected_strategies({ attack: null, defense: null, special: null });
    if (actions.set_timer) {
      actions.set_timer(60); // Increased to 60 seconds for better UX
    }
    if (actions.set_is_timer_active) {
      actions.set_is_timer_active(true);
    }
  }, [actions]);

  return {
    resetBattle,
    startStrategySelection,
  };
};