import { useCallback } from 'react';
import { TeamCharacter, Team, BattleSetup } from '@/data/teamBattleSystem';
import { type BattleStateData } from '@/hooks/temp/useBattleState';
import { combatRewards } from '@/data/combatRewards';

interface PlayerRewards {
  coins: number;
  experience: number;
  items: string[];
}

interface Morale {
  team: number;
  opponent: number;
}

interface UseBattleSimulationProps {
  state: BattleStateData;
  actions: {
    set_current_announcement: (announcement: string) => void;
    set_phase: (phase: string) => void;
    set_current_match: (match: number | ((prev: number) => number)) => void;
    set_current_round: (round: number | ((prev: number) => number)) => void;
    set_player_match_wins: (wins: number) => void;
    set_opponent_match_wins: (wins: number) => void;
    set_player_round_wins: (wins: number) => void;
    set_opponent_round_wins: (wins: number) => void;
    set_battle_state: (state: any) => void;
    announce_message: (message: string, type?: string) => void;
    check_for_chaos: (attacker: TeamCharacter, defender: TeamCharacter, ability: any, is_attacker1: boolean) => any;
    calculate_team_power: (teamCharacters: TeamCharacter[]) => number;
    set_selected_strategies?: (strategies: any) => void;
    set_coaching_messages?: (messages: string[]) => void;
    set_timer?: (time: number | null) => void;
    set_is_timer_active?: (active: boolean) => void;
    set_is_fast_battle_mode: (mode: boolean) => void;
    set_fast_battle_consent: (consent: any) => void;
    set_user_character: (player: any) => void;
    set_opponent_character: (player: any) => void;
    set_battle_rewards: (rewards: any) => void;
  };
  timeout_manager: {
    setTimeout: (cb: () => void, delay: number) => any;
    clearTimeout: (id: any) => void;
  };
  calculate_battle_rewards: (playerWon: boolean, character: TeamCharacter) => void;
  announce_action: (text: string, delay?: number) => void;
}

export const useBattleSimulation = ({
  state,
  actions,
  timeout_manager,
  calculate_battle_rewards,
  announce_action
}: UseBattleSimulationProps) => {

  // Core battle combat round execution
  const executeCombatRound = useCallback(() => {
    const {
      userCharacter,
      opponent_character, 
      current_round, 
      currentMatch, 
      playerMatchWins, 
      opponentMatchWins, 
      playerRoundWins, 
      opponentRoundWins,
      player_team,
      opponent_team,
      battle_state
    } = state;

    // Determine turn order based on speed (with defensive checks)
    const userSpeed = (userCharacter.speed || 50) + Math.random() * 20;
    const opponentSpeed = (opponent_character.speed || 50) + Math.random() * 20;

    const firstAttacker = userSpeed >= opponentSpeed ? userCharacter : opponent_character;
    const secondAttacker = userSpeed >= opponentSpeed ? opponent_character : userCharacter;
    const isUserFirst = userSpeed >= opponentSpeed;

    // First attack
    const ability1 = firstAttacker.abilities[Math.floor(Math.random() * firstAttacker.abilities.length)];
    const action1 = actions.check_for_chaos(firstAttacker, secondAttacker, ability1, isUserFirst);
    
    actions.set_current_announcement(action1.description);
    announce_action(action1.description, 500);
    
    // Check if battle is over using the returned HP value
    if (action1.new_defender_hp !== undefined && action1.new_defender_hp <= 0) {
      timeout_manager.setTimeout(() => {
        // Calculate battle rewards
        calculate_battle_rewards(firstAttacker.name === userCharacter.name, secondAttacker.name === userCharacter.name ? userCharacter : opponent_character);
        actions.set_phase('battle_complete');
        const victoryMessage = `Victory! ${firstAttacker.name} has defeated ${secondAttacker.name}!`;
        actions.set_current_announcement(victoryMessage);
        actions.announce_message(victoryMessage, 'victory');
      }, 3000);
      return;
    }
    
    // Second attack (if still alive)
    timeout_manager.setTimeout(() => {
      const ability2 = secondAttacker.abilities[Math.floor(Math.random() * secondAttacker.abilities.length)];
      const action2 = actions.check_for_chaos(secondAttacker, firstAttacker, ability2, !isUserFirst);
      
      actions.set_current_announcement(action2.description);
      announce_action(action2.description, 500);
      
      // Check if character dies - Death ends the MATCH immediately
      if (action2.new_defender_hp !== undefined && action2.new_defender_hp <= 0) {
        timeout_manager.setTimeout(() => {
          // Determine match winner (survivor wins the match)
          const matchWinner = secondAttacker.name === userCharacter.name ? 'player' : 'opponent';
          const newPlayerMatchWins = matchWinner === 'player' ? playerMatchWins + 1 : playerMatchWins;
          const newOpponentMatchWins = matchWinner === 'opponent' ? opponentMatchWins + 1 : opponentMatchWins;
          
          // Update match wins
          if (matchWinner === 'player') {
            actions.set_player_match_wins(newPlayerMatchWins);
          } else {
            actions.set_opponent_match_wins(newOpponentMatchWins);
          }
          
          const victoryMessage = `${secondAttacker.name} kills ${firstAttacker.name}! Match ${currentMatch} goes to ${matchWinner === 'player' ? 'Player' : 'Opponent'}!`;
          actions.set_current_announcement(victoryMessage);
          actions.announce_message(victoryMessage, 'victory');
          
          // Check if battle is over (2 out of 3 matches)
          if (newPlayerMatchWins >= 2) {
            calculate_battle_rewards(true, secondAttacker.name === userCharacter.name ? userCharacter : opponent_character);
            actions.set_phase('battle_complete');
            actions.set_current_announcement(`VICTORY! Player wins the battle ${newPlayerMatchWins}-${newOpponentMatchWins}!`);
          } else if (newOpponentMatchWins >= 2) {
            calculate_battle_rewards(false, secondAttacker.name === userCharacter.name ? userCharacter : opponent_character);
            actions.set_phase('battle_complete');
            actions.set_current_announcement(`DEFEAT! Opponent wins the battle ${newOpponentMatchWins}-${newPlayerMatchWins}!`);
          } else {
            // Start next match - reset round tracking, move to next match
            actions.set_current_match(prev => prev + 1);
            actions.set_current_round(1);
            actions.set_player_round_wins(0);
            actions.set_opponent_round_wins(0);
            actions.set_phase('pre_battle_huddle');
            actions.set_current_announcement(`Match ${currentMatch + 1} begins! Choose your strategy for the next fighters.`);
          }
        }, 3000);
        return;
      }
      
      // Round end (no death) - determine winner by HP comparison
      timeout_manager.setTimeout(() => {
        actions.set_phase('coaching_timeout');

        // Determine round winner based on remaining HP
        const roundWinner = userCharacter.current_health > opponent_character.current_health ? 'player' : userCharacter.current_health < opponent_character.current_health ? 'opponent' : 'tie';
        const roundWinnerName = userCharacter.current_health > opponent_character.current_health ? userCharacter.name : userCharacter.current_health < opponent_character.current_health ? opponent_character.name : 'Tie';
        
        // Calculate new round wins immediately
        const newPlayerRoundWins = roundWinner === 'player' ? playerRoundWins + 1 : playerRoundWins;
        const newOpponentRoundWins = roundWinner === 'opponent' ? opponentRoundWins + 1 : opponentRoundWins;
        
        // Update round wins state
        if (roundWinner === 'player') {
          actions.set_player_round_wins(newPlayerRoundWins);
        } else if (roundWinner === 'opponent') {
          actions.set_opponent_round_wins(newOpponentRoundWins);
        }
        // If tie, no round wins are awarded
        
        const roundResultText = roundWinner === 'tie' ? `Round ${current_round} ends in a tie!` : `Round ${current_round} complete! ${roundWinnerName} wins this round!`;
        actions.set_current_announcement(`${roundResultText} (Match ${currentMatch}: Player ${newPlayerRoundWins}-${newOpponentRoundWins} Opponent)`);
        
        timeout_manager.setTimeout(() => {
          // Check for 2-out-of-3 round victory (wins current match)
          if (newPlayerRoundWins >= 2) {
            // Player wins this match
            const newPlayerMatchWins = playerMatchWins + 1;
            actions.set_player_match_wins(newPlayerMatchWins);

            if (newPlayerMatchWins >= 2) {
              // Player wins entire battle
              calculate_battle_rewards(true, userCharacter);
              actions.set_phase('battle_complete');
              actions.set_current_announcement(`VICTORY! Player wins the battle ${newPlayerMatchWins}-${opponentMatchWins}!`);
            } else {
              // Start next match
              actions.set_current_match(prev => prev + 1);
              actions.set_current_round(1);
              actions.set_player_round_wins(0);
              actions.set_opponent_round_wins(0);
              actions.set_phase('pre_battle_huddle');
              actions.set_current_announcement(`Player wins Match ${currentMatch}! Match ${currentMatch + 1} begins - choose your strategy.`);
            }
          } else if (newOpponentRoundWins >= 2) {
            // Opponent wins this match
            const newOpponentMatchWins = opponentMatchWins + 1;
            actions.set_opponent_match_wins(newOpponentMatchWins);

            if (newOpponentMatchWins >= 2) {
              // Opponent wins entire battle
              calculate_battle_rewards(false, opponent_character);
              actions.set_phase('battle_complete');
              actions.set_current_announcement(`DEFEAT! Opponent wins the battle ${newOpponentMatchWins}-${playerMatchWins}!`);
            } else {
              // Start next match
              actions.set_current_match(prev => prev + 1);
              actions.set_current_round(1);
              actions.set_player_round_wins(0);
              actions.set_opponent_round_wins(0);
              actions.set_phase('pre_battle_huddle');
              actions.set_current_announcement(`Opponent wins Match ${currentMatch}! Match ${currentMatch + 1} begins - choose your strategy.`);
            }
          } else {
            // Next round - coaching phase
            actions.set_current_round(prev => {
              const newRound = prev + 1;
              // Update battle state with new fighters for team battle
              if (battle_state) {
                const nextPlayerIndex = (newRound - 1) % player_team.characters.length;
                const nextOpponentIndex = (newRound - 1) % opponent_team.characters.length;
                
                actions.set_battle_state((prevState: any) => {
                  if (!prevState) return null;
                  return {
                    ...prevState,
                    current_round: newRound,
                    current_fighters: {
                      player: player_team.characters[nextPlayerIndex],
                      opponent: opponent_team.characters[nextOpponentIndex]
                    }
                  };
                });
              }
              return newRound;
            });
            
            actions.set_phase('pre_battle_huddle');
            actions.set_current_announcement(`Round ${current_round + 1} Strategy Selection - Choose your warrior's approach for this round.`);
            
            // Optional strategy/timer setters
            if (actions.set_coaching_messages) {
              actions.set_coaching_messages([`Round ${current_round + 1} Preparation - Choose one strategy from each category!`]);
            }
            if (actions.set_selected_strategies) {
              actions.set_selected_strategies({ attack: null, defense: null, special: null });
            }
            if (actions.set_timer) {
              actions.set_timer(60); // Consistent 60 second timer
            }
            if (actions.set_is_timer_active) {
              actions.set_is_timer_active(true);
            }
          }
        }, 4000);
      }, 3000);
    }, 4000);
  }, [
    state,
    actions,
    timeout_manager,
    calculate_battle_rewards,
    announce_action
  ]);

  // Fast Battle System - instant battle resolution for PvC mode
  const isOpponentAI = useCallback(() => {
    // Check if opponent is AI-controlled (PvC) or human player (PvP)
    // For now, all opponents are AI-controlled (PvC mode)
    // TODO: Add PvP detection when multiplayer system is implemented
    return true;
  }, []);

  const calculateFastBattleResult = useCallback((battleSetup: BattleSetup) => {
    const { userCharacter, opponent_character } = state;

    // Simplified battle calculation for fast mode
    const playerPower = actions.calculate_team_power(battleSetup.player_team.characters);
    const opponentPower = actions.calculate_team_power(battleSetup.opponent_team.characters);
    
    // Add some randomness (±20%)
    const randomFactor = 0.8 + Math.random() * 0.4;
    const adjustedPlayerPower = playerPower * randomFactor;
    
    const winner = adjustedPlayerPower > opponentPower ? 'player' : 'opponent';
    
    // Calculate damage and final stats
    const damage_taken = Math.floor(Math.random() * 300) + 100;
    const final_player_stats = winner === 'player' ?
      { ...userCharacter, current_health: Math.max(1, userCharacter.current_health - damage_taken * 0.3) } :
      { ...userCharacter, current_health: Math.max(1, userCharacter.current_health - damage_taken) };

    const final_opponent_stats = winner === 'opponent' ?
      { ...opponent_character, current_health: Math.max(1, opponent_character.current_health - damage_taken * 0.3) } :
      { ...opponent_character, current_health: Math.max(1, opponent_character.current_health - damage_taken) };

    return {
      winner,
      final_battle_state: battleSetup,
      final_player_stats,
      final_opponent_stats
    };
  }, [state, actions]);

  const resolveFastBattle = useCallback((battleSetup: BattleSetup) => {
    const { player_team, opponent_team } = state;
    
    actions.set_current_announcement('⚡ Fast Battle Mode Activated! Calculating results...');
    
    // Simulate entire battle with AI strategies
    const battleResult = calculateFastBattleResult(battleSetup);
    
    // Apply results instantly
    timeout_manager.setTimeout(() => {
      actions.set_battle_state(battleResult.final_battle_state);
      actions.set_user_character(battleResult.final_player_stats);
      actions.set_opponent_character(battleResult.final_opponent_stats);
      actions.set_phase('battle-end');
      
      // Show results
      const winnerName = battleResult.winner === 'player' ? player_team.name : opponent_team.name;
      actions.set_current_announcement(`⚡ Fast Battle Complete! ${winnerName} Wins!`);
      
      // Apply rewards
      if (battleResult.winner === 'player') {
        calculate_battle_rewards(true, battleResult.final_player_stats);
      }
    }, 2000);
  }, [state, actions, timeout_manager, calculateFastBattleResult]);

  const startFastBattle = useCallback(() => {
    const { player_team, opponent_team, player_morale, opponent_morale } = state;
    
    actions.set_is_fast_battle_mode(true);
    
    // Skip strategy selection and use AI defaults
    const fastBattleSetup: BattleSetup = {
      player_team,
      opponent_team,
      player_morale: player_morale,
      current_fighters: {
        player: player_team.characters[0],
        opponent: opponent_team.characters[0]
      },
      battle_type: 'friendly',
      weight_class: 'rookie',
      stakes: 'normal'
    };

    actions.set_battle_state(fastBattleSetup);
    
    // Instantly resolve battle
    resolveFastBattle(fastBattleSetup);
  }, [state, actions, resolveFastBattle]);

  const handleFastBattleRequest = useCallback(() => {
    if (isOpponentAI()) {
      // PvC: Instantly start fast battle
      startFastBattle();
    } else {
      // PvP: Request consent from both players
      actions.set_fast_battle_consent((prev: any) => ({
        ...prev,
        player1: true
      }));
      // In real implementation, send request to opponent via WebSocket
    }
  }, [isOpponentAI, startFastBattle]);

  return {
    executeCombatRound,
    // Fast Battle System
    isOpponentAI,
    handleFastBattleRequest,
    startFastBattle,
    resolveFastBattle,
    calculateFastBattleResult,
  };
};
