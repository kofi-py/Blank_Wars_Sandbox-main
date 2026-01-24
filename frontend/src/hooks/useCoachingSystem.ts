import { useCallback, useEffect, SetStateAction } from 'react';
import { CoachingEngine, CoachingSession } from '@/data/coachingSystem';
import { TeamCharacter, Team } from '@/data/teamBattleSystem';
import { type BattleStateData } from '@/hooks/useBattleState';

interface UseCoachingSystemProps {
  state: BattleStateData;
  actions: {
    set_active_coaching_session: (session: CoachingSession | null) => void;
    set_show_coaching_modal: (show: boolean) => void;
    set_selected_character_for_coaching: (character: TeamCharacter | null) => void;
    set_coaching_messages: (messages: SetStateAction<string[]>) => void;
    set_character_response: (response: string) => void;
    set_show_disagreement: (show: boolean) => void;
    set_selected_strategies: (strategies: any) => void;
    set_pending_strategy: (strategy: any) => void;
    set_character_strategies: (strategies: Map<string, any>) => void;
    set_player_team: (team: Team | ((prev: Team) => Team)) => void;
    set_phase?: (phase: string) => void;
    set_current_announcement?: (announcement: string) => void;
    start_strategy_selection?: () => void;
  };
  timeout_manager: {
    setTimeout: (cb: () => void, delay: number) => any;
    clearTimeout: (id: any) => void;
  };
  speak: (text: string) => void;
}

export const useCoachingSystem = ({ 
  state, 
  actions, 
  timeout_manager, 
  speak 
}: UseCoachingSystemProps) => {
  const { setTimeout: safeSetTimeout } = timeout_manager;

  // Start a coaching session with a character
  const startCoachingSession = useCallback(async (character: TeamCharacter, session_type: 'strategy' | 'motivation' | 'skill_development') => {
    try {
      const session = await (CoachingEngine as any).startSession({
        character,
        session_type,
        battle_context: {
          phase: state.phase,
          current_round: state.current_round,
          player_morale: state.player_morale,
          team_chemistry: state.player_team.team_chemistry || 0,
          recent_performance: calculateRecentPerformance(character)
        }
      });

      actions.set_active_coaching_session(session);
      actions.set_selected_character_for_coaching(character);
      actions.set_coaching_messages(session.messages || []);
      actions.set_show_coaching_modal(true);

      // Announce coaching session start
      const announcement = `Starting ${session_type} session with ${character.name}`;
      speak(announcement);

    } catch (error) {
      console.error('Error starting coaching session:', error);
    }
  }, [state.phase, state.current_round, state.player_morale, state.player_team.team_chemistry]);

  // Calculate recent performance for coaching context
  const calculateRecentPerformance = useCallback((character: TeamCharacter) => {
    // This would typically analyze recent battle performance
    // For now, return basic performance metrics
    return {
      win_rate: 0.7, // 70% win rate
      average_damage: character.attack * 1.2,
      health_retention: character.health / character.max_health,
      teamwork_score: 0.8
    };
  }, []);

  // Send message in coaching session
  const sendCoachingMessage = useCallback(async (message: string) => {
    if (!state.active_coaching_session || !state.selected_characterForCoaching) return;

    try {
      // Add coach message to session
      const updatedMessages = [...state.coaching_messages, `Coach: ${message}`];
      actions.set_coaching_messages(updatedMessages);

      // Generate character response
      const response = await (CoachingEngine as any).generateCharacterResponse(
        state.selected_characterForCoaching,
        message,
        {
          session_history: state.coaching_messages,
          battle_context: {
            phase: state.phase,
            current_round: state.current_round,
            player_morale: state.player_morale
          }
        }
      );

      // Add character response
      const responseMessage = `${state.selected_characterForCoaching.name}: ${response.message}`;
      actions.set_coaching_messages([...updatedMessages, responseMessage]);
      actions.set_character_response(response.message);

      // Handle strategy suggestions if any
      if (response.strategySuggestion) {
        actions.set_pending_strategy({
          character_id: state.selected_characterForCoaching.id,
          strategy_type: response.strategySuggestion.type,
          strategy: response.strategySuggestion.strategy
        });
      }

      // Handle disagreement if character pushes back
      if (response.disagreementLevel > 0.7) {
        actions.set_show_disagreement(true);
        safeSetTimeout(() => actions.set_show_disagreement(false), 5000);
      }

    } catch (error) {
      console.error('Error sending coaching message:', error);
    }
  }, [state.active_coaching_session, state.selected_characterForCoaching, state.coaching_messages, state.phase, state.current_round, state.player_morale]);

  // Apply strategy from coaching session
  const applyCoachingStrategy = useCallback(async (strategy: any) => {
    if (!strategy || !state.selected_characterForCoaching) return;

    try {
      const character_id = state.selected_characterForCoaching.id;
      const updatedStrategies = new Map(state.character_strategies);

      const currentStrategy = updatedStrategies.get(character_id);

      if (!currentStrategy) {
        throw new Error(`Strategy not found for character ${character_id}. Character strategies should be initialized when battle starts.`);
      }

      if (strategy.strategyType === 'attack') {
        currentStrategy.attack = strategy.strategy;
      } else if (strategy.strategyType === 'defense') {
        currentStrategy.defense = strategy.strategy;
      } else if (strategy.strategyType === 'special') {
        currentStrategy.special = strategy.strategy;
      }
      currentStrategy.is_complete = !!(currentStrategy.attack && currentStrategy.defense && currentStrategy.special);

      updatedStrategies.set(character_id, currentStrategy);
      actions.set_character_strategies(updatedStrategies);

      // Update selected strategies for immediate use
      const updatedSelectedStrategies = { ...state.selected_strategies };
      if (strategy.strategyType === 'attack' || strategy.strategyType === 'defense' || strategy.strategyType === 'special') {
        updatedSelectedStrategies[strategy.strategyType] = strategy.strategy;
      }
      actions.set_selected_strategies(updatedSelectedStrategies);

      // Clear pending strategy
      actions.set_pending_strategy(null);

      const message = `Applied ${strategy.strategyType} strategy for ${state.selected_characterForCoaching.name}`;
      speak(message);

    } catch (error) {
      console.error('Error applying coaching strategy:', error);
    }
  }, [state.selected_characterForCoaching, state.character_strategies, state.selected_strategies, state.user_character.id, state.opponent_character.id]);

  // End coaching session
  const endCoachingSession = useCallback(async () => {
    if (!state.active_coaching_session) return;

    try {
      // Calculate session effectiveness using coach's overall skill
      const effectiveness = state.coach_skills.overall_skill / 100; // Normalize to 0-1 range

      // Apply coaching benefits to character
      if (state.selected_characterForCoaching && effectiveness > 0.5) {
        await applyCoachingBenefits(state.selected_characterForCoaching, effectiveness);
      }

      // Clean up session state
      actions.set_active_coaching_session(null);
      actions.set_selected_character_for_coaching(null);
      actions.set_coaching_messages([]);
      actions.set_character_response('');
      actions.set_show_coaching_modal(false);
      actions.set_show_disagreement(false);
      actions.set_pending_strategy(null);

      const message = `Coaching session completed. Effectiveness: ${Math.round(effectiveness * 100)}%`;
      speak(message);

    } catch (error) {
      console.error('Error ending coaching session:', error);
    }
  }, [state.active_coaching_session, state.coaching_messages, state.character_response, state.selected_characterForCoaching]);

  // Apply coaching benefits to character using CoachingEngine
  const applyCoachingBenefits = useCallback(async (character: TeamCharacter, effectiveness: number, focus_area: 'performance' | 'mental_health' | 'team_relations' | 'strategy' | 'financial_management' = 'performance') => {
    // Check if team has coaching points
    if (state.player_team.coaching_points <= 0) {
      const message = `No coaching points remaining! Win battles to restore points.`;
      speak(message);
      return;
    }

    // Use CoachingEngine to apply real stat boosts
    const session = CoachingEngine.conductIndividualCoaching(
      character,
      state.player_team,
      focus_area,
      75 // Coach skill level
    );

    // Update team coaching points
    const updatedTeam = {
      ...state.player_team,
      coaching_points: state.player_team.coaching_points - 1
    };
    actions.set_player_team(updatedTeam);

    // Update character in team with new temporary stats
    const updatedCharacters = state.player_team.characters.map(char =>
      char.id === character.id ? character : char
    );

    actions.set_player_team({
      ...updatedTeam,
      characters: updatedCharacters
    });

    // Announce the coaching outcome
    const message = `Coaching ${character.name} (${focus_area}): ${session.outcome.character_response}`;
    speak(message);

    console.log(`Applied coaching to ${character.name}:`, session.outcome);
  }, [state.player_team, actions, speak]);

  // Quick coaching actions
  const provideMotivation = useCallback(async (character: TeamCharacter) => {
    const motivationalMessages = [
      "You've got this! Trust your training!",
      "Remember why you're fighting - for the team!",
      "Focus on your strengths and stay confident!",
      "One round at a time. You're doing great!",
      "Your teammates believe in you!"
    ];
    
    const message = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    await startCoachingSession(character, 'motivation');
    await safeSetTimeout(() => sendCoachingMessage(message), 1000);
  }, [startCoachingSession, sendCoachingMessage]);

  const suggestStrategy = useCallback(async (character: TeamCharacter, strategy_type: 'aggressive' | 'defensive' | 'balanced') => {
    const strategies = {
      aggressive: "Focus on high-damage attacks and pressure your opponent early",
      defensive: "Prioritize blocking and counterattacks, wait for openings",
      balanced: "Mix offense and defense, adapt to your opponent's style"
    };

    await startCoachingSession(character, 'strategy');
    await safeSetTimeout(() => sendCoachingMessage(`I suggest a ${strategy_type} approach: ${strategies[strategy_type]}`), 1000);
  }, [startCoachingSession, sendCoachingMessage]);

  // Extracted functions from component
  const conductIndividualCoaching = useCallback((character: TeamCharacter) => {
    actions.set_selected_character_for_coaching(character);
    actions.set_show_coaching_modal(true);
  }, [actions]);

  const executeCoachingSession = useCallback((focus: 'performance' | 'mental_health' | 'team_relations' | 'strategy') => {
    if (!state.selected_characterForCoaching) return;

    const session = CoachingEngine.conductIndividualCoaching(
      state.selected_characterForCoaching,
      state.player_team,
      focus,
      75 // Coach skill level
    );

    actions.set_active_coaching_session(session);
    
    // Apply the coaching effects
    actions.set_player_team(prev => ({
      ...prev,
      characters: prev.characters.map(char => 
        char.id === state.selected_characterForCoaching!.id
          ? {
              ...char,
              psych_stats: {
                ...char.psych_stats,
                mental_health: Math.max(0, Math.min(100, char.psych_stats.mental_health + session.outcome.mental_healthChange)),
                training: Math.max(0, Math.min(100, char.psych_stats.training + session.outcome.training_change)),
                team_player: Math.max(0, Math.min(100, char.psych_stats.team_player + session.outcome.team_playerChange)),
                ego: Math.max(0, Math.min(100, char.psych_stats.ego + session.outcome.ego_change)),
                communication: Math.max(0, Math.min(100, char.psych_stats.communication + session.outcome.communication_change))
              }
            }
          : char
      )
    }));

    actions.set_coaching_messages(prev => [...prev, 
      `Coaching ${state.selected_characterForCoaching!.name} on ${focus}:`,
      `${state.selected_characterForCoaching!.name}: ${session.outcome.character_response}`,
      `Coach Notes: ${session.outcome.coach_notes}`
    ]);

    actions.set_show_coaching_modal(false);
  }, [state.selected_characterForCoaching, state.player_team, actions]);

  // Strategy Management Functions
  const handleStrategyRecommendation = useCallback(async (type: 'attack' | 'defense' | 'special', strategy: string) => {
    // Coach recommends a strategy
    actions.set_coaching_messages(prev => [...prev, `Coach: I recommend ${strategy} for ${type}!`]);
    actions.set_pending_strategy({ type, strategy });
    
    // Character may disagree based on training level
    const obedienceRoll = Math.random() * 100;
    const disagreementChance = 100 - (state.user_character?.training_level || 50);

    if (obedienceRoll < disagreementChance) {
      // Character disagrees
      actions.set_show_disagreement(true);
      const response = await getCharacterOpinion(type, strategy);
      actions.set_character_response(response);
      actions.set_coaching_messages(prev => [...prev, `${state.user_character?.name}: ${response}`]);
    } else {
      // Character agrees
      actions.set_selected_strategies(prev => ({ ...prev, [type]: strategy }));
      actions.set_coaching_messages(prev => [...prev, `${state.user_character?.name}: Understood, coach!`]);
      actions.set_pending_strategy(null);
    }
  }, [state.user_character, actions]);

  const getCharacterOpinion = useCallback(async (type: string, strategy: string): Promise<string> => {
    // Generate fallback response based on character personality
    const fallbackResponses = [
      `I think ${strategy} could work, but I prefer my own approach.`,
      `${strategy} for ${type}? I've got a better idea, coach.`,
      `Trust me coach, I know what I'm doing better than that ${strategy} plan.`,
      `I'll consider ${strategy}, but I might improvise based on what I see.`,
      `That ${strategy} strategy might work, but I'm feeling something different.`
    ];
    const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        timeout_manager.setTimeout(() => reject(new Error('API timeout')), 2000)
      );
        
      const response = await Promise.race([
        fetch('http://localhost:3006/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character: state.user_character?.name,
            message: `Coach wants me to use ${strategy} for ${type}. What do you think?`,
            battle_context: {
              round: state.current_round,
              player_health: Math.round(((state.user_character?.current_health || 0) / (state.user_character?.max_health || 1)) * 100),
              enemy_health: Math.round(((state.opponent_character?.current_health || 0) / (state.opponent_character?.max_health || 1)) * 100)
            }
          })
        }),
        timeoutPromise
      ]);

      if (response && (response as Response).ok) {
        const data = await (response as Response).json();
        return data.response;
      }
    } catch (error) {
      console.warn('Character opinion API not available, using fallback');
    }

    return fallback;
  }, [state.user_character, state.opponent_character, state.current_round, timeout_manager]);

  const insistOnStrategy = useCallback(() => {
    if (!state.pending_strategy) return;
    
    // Coach insists - another training check
    const insistRoll = Math.random() * 100;
    const coachingBonus = 20; // Insisting gives a bonus to adherence
    const adherenceBonus = 10; // Base adherence bonus

    if (insistRoll < (state.user_character?.training_level || 50) + adherenceBonus) {
      actions.set_coaching_messages(prev => [...prev,
        'Coach: I insist! Trust me on this!',
        `${state.user_character?.name}: Fine... I'll follow your lead, coach.`
      ]);
      actions.set_selected_strategies(prev => ({
        ...prev,
        [state.pending_strategy!.type]: state.pending_strategy!.strategy
      }));
      actions.set_show_disagreement(false);
      actions.set_pending_strategy(null);
    } else {
      // Character still refuses
      actions.set_coaching_messages(prev => [...prev,
        'Coach: You must listen to me!',
        `${state.user_character?.name}: No! I know what I'm doing!`
      ]);
      checkForBerserk();
    }
  }, [state.pending_strategy, state.user_character, actions]);

  const checkForBerserk = useCallback(() => {
    // Small chance of going berserk when refusing orders
    const berserkChance = (state.user_character?.training_level || 50) < 50 ? 10 : 2;
    const berserkRoll = Math.random() * 100;

    if (berserkRoll < berserkChance) {
      actions.set_coaching_messages(prev => [...prev,
        `⚠️ ${state.user_character?.name} has gone BERSERK! They're fighting on pure instinct!`
      ]);
      // Note: status effects modification would need to be handled in the component
      speak(`${state.user_character?.name} has entered a berserk rage!`);
    }
  }, [state.user_character, actions, speak]);

  const handleCharacterStrategyChange = useCallback((character_id: string, category: 'attack' | 'defense' | 'special', strategy: string) => {
    const newMap = new Map(state.character_strategies);
    const currentStrategy = newMap.get(character_id) || {
      character_id,
      attack: null,
      defense: null,
      special: null,
      is_complete: false
    };
    
    const updatedStrategy = {
      ...currentStrategy,
      [category]: strategy
    };
    
    // Check if all categories are selected
    updatedStrategy.is_complete = !!(updatedStrategy.attack && updatedStrategy.defense && updatedStrategy.special);
    
    newMap.set(character_id, updatedStrategy);
    actions.set_character_strategies(newMap);
  }, [actions, state.character_strategies]);

  const initializeCharacterStrategies = useCallback(() => {
    const newMap = new Map<string, any>();
    state.player_team.characters.forEach(character => {
      newMap.set(character.id, {
        character_id: character.id,
        attack: null,
        defense: null,
        special: null,
        is_complete: false
      });
    });
    actions.set_character_strategies(newMap);
  }, [state.player_team.characters, actions]);

  const areAllCharacterStrategiesComplete = useCallback(() => {
    return Array.from(state.character_strategies.values()).every(strategy => strategy.is_complete);
  }, [state.character_strategies]);

  const handleAllCharacterStrategiesComplete = useCallback(() => {
    if (areAllCharacterStrategiesComplete()) {
      // Timer management would need to be handled in the component or passed as an action
      // actions.set_timer(null);
      // actions.set_is_timer_active(false);
      // actions.handleTimerExpired();
      console.log('All character strategies complete');
    }
  }, [areAllCharacterStrategiesComplete]);

  // Team Chemistry & Communication Functions
  const handleTeamChatMessage = useCallback((message: string) => {
    // Add coach message to team chat log
    actions.set_coaching_messages(prev => [...prev, `Coach: ${message}`]);
    
    // Could trigger team chemistry changes based on message tone
    // TODO: Analyze message sentiment and adjust team morale
  }, [actions]);

  const conductTeamHuddle = useCallback(() => {
    // Set phase and announcement
    if (actions.set_phase) actions.set_phase('strategy-selection');
    if (actions.set_current_announcement) {
      actions.set_current_announcement('The teams gather for their pre-battle huddles! Team chemistry and psychology will be tested!');
    }
    
    // Show team chemistry and psychology info
    const huddleMessages = [
      `Team ${state.player_team.name} - Coach ${state.player_team.coach_name} is leading the huddle.`, 
      `Current Team Chemistry: ${Math.round(state.player_team.team_chemistry * 10) / 10}% | Team Morale: ${state.player_morale}%`,
      `Your starting lineup: ${state.player_team.characters.map(char => char.name).join(', ')}.`,
      `Review their strengths and weaknesses before battle.`
    ];

    const delay = 2000;
    huddleMessages.forEach((msg, index) => {
      const capturedMsg = msg;
      timeout_manager.setTimeout(() => {
        if (actions.set_current_announcement) actions.set_current_announcement(capturedMsg);
        speak(capturedMsg);
      }, delay * (index + 1));
    });

    const totalDelay = delay * huddleMessages.length + 2000;
    timeout_manager.setTimeout(() => {
      // Start strategy selection after huddle
      if (actions.start_strategy_selection) actions.start_strategy_selection();
    }, totalDelay);
  }, [state.player_team, state.player_morale, actions, timeout_manager, speak]);

  const buildTeamFromCards = useCallback((playerCards: any[], selected_team_cards: string[], set_show_card_collection: (show: boolean) => void, set_selected_team_cards: (cards: string[]) => void) => {
    const selectedCards = playerCards.filter(card => selected_team_cards.includes(card.id));
    if (selectedCards.length === 3) {
      const newTeam = {
        ...state.player_team,
        characters: selectedCards,
        team_chemistry: 50, // Will be recalculated
      };
      actions.set_player_team(newTeam);
      set_show_card_collection(false);
      set_selected_team_cards([]);
    }
  }, [state.player_team, actions]);

  // Get coaching statistics
  const getCoachingStats = useCallback(() => {
    const hasActiveSession = state.active_coaching_session !== null;
    const messageCount = state.coaching_messages.length;
    const characterResponsiveness = state.character_response ? 1 : 0;
    
    return {
      hasActiveSession,
      messageCount,
      characterResponsiveness,
      selected_character: state.selected_characterForCoaching?.name || 'None',
      has_pending_strategy: state.pending_strategy !== null,
      showing_disagreement: state.show_disagreement
    };
  }, [state.active_coaching_session, state.coaching_messages, state.character_response, state.selected_characterForCoaching, state.pending_strategy, state.show_disagreement]);

  return {
    // Core coaching functions
    startCoachingSession,
    sendCoachingMessage,
    applyCoachingStrategy,
    endCoachingSession,
    
    // Quick actions
    provideMotivation,
    suggestStrategy,
    
    // Extracted component functions
    conductIndividualCoaching,
    executeCoachingSession,
    
    // Strategy management functions
    handleStrategyRecommendation,
    getCharacterOpinion,
    insistOnStrategy,
    checkForBerserk,
    handleCharacterStrategyChange,
    initializeCharacterStrategies,
    areAllCharacterStrategiesComplete,
    handleAllCharacterStrategiesComplete,
    
    // Team chemistry & communication functions
    handleTeamChatMessage,
    conductTeamHuddle,
    buildTeamFromCards,
    
    // Utilities
    getCoachingStats,
    
    // Computed values
    is_coaching_active: state.active_coaching_session !== null,
    can_send_coaching_message: state.active_coaching_session !== null,
    has_selected_character: state.selected_characterForCoaching !== null,
    coaching_messages: state.coaching_messages,
    available_characters: state.player_team.characters,
    pending_strategy: state.pending_strategy,
    showing_disagreement: state.show_disagreement
  };
};