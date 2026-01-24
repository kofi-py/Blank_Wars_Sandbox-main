// Hook for integrating battle events with financial decisions
// Demonstrates how the battle financial system works in practice

import { useState, useCallback, useEffect } from 'react';
import { BattleCharacter, BattleState, MoraleEvent } from '../data/battleFlow';
import BattleFinancialIntegration from '../services/battleFinancialIntegration';
import { WildcardDecision } from '../services/battleFinancialService';

export interface BattleFinancialState {
  pending_decisions: Map<string, WildcardDecision[]>;
  financial_modifiers: Map<string, any>;
  active_wildcards: WildcardDecision[];
  battle_earnings: Map<string, number>;
}

export const useBattleFinancialIntegration = () => {
  const [battleFinancialState, setBattleFinancialState] = useState<BattleFinancialState>({
    pending_decisions: new Map(),
    financial_modifiers: new Map(),
    active_wildcards: [],
    battle_earnings: new Map()
  });

  const [integration] = useState(() => BattleFinancialIntegration.getInstance());

  /**
   * Initialize financial integration for a battle
   */
  const initializeBattleFinancialIntegration = useCallback(async (battle_state: BattleState) => {
    try {
      await integration.initializeBattleFinancialState(battle_state);

      // Calculate initial financial modifiers for all characters
      const newModifiers = new Map();
      const allCharacters = [
        ...battle_state.teams.player.characters,
        ...battle_state.teams.opponent.characters
      ];

      for (const character of allCharacters) {
        const effects = integration.calculateFinancialStressEffects(character);
        newModifiers.set(character.id, effects);
      }

      setBattleFinancialState(prev => ({
        ...prev,
        financial_modifiers: newModifiers,
        pending_decisions: new Map(),
        active_wildcards: []
      }));

      console.log('Battle financial integration initialized for', allCharacters.length, 'characters');
    } catch (error) {
      console.error('Error initializing battle financial integration:', error);
    }
  }, [integration]);

  /**
   * Process a battle event that might trigger financial decisions
   */
  const processBattleEvent = useCallback(async (
    character: BattleCharacter,
    event: MoraleEvent,
    battle_state: BattleState
  ) => {
    try {
      // Process event through integration layer
      await integration.processBattleEvent(character, event, battle_state);

      // Get updated pending decisions
      const pendingDecisions = integration.getPendingWildcardDecisions(character.id);

      // Update state
      setBattleFinancialState(prev => {
        const newPending = new Map(prev.pending_decisions);
        newPending.set(character.id, pendingDecisions);

        return {
          ...prev,
          pending_decisions: newPending,
          active_wildcards: [...prev.active_wildcards, ...pendingDecisions.filter(d => d.urgency === 'immediate')]
        };
      });

      // Auto-execute immediate decisions
      if (pendingDecisions.some(d => d.urgency === 'immediate')) {
        await integration.executeImmediateWildcardDecisions(character.id);
      }

      console.log(`Processed ${event.event_type} for ${character.name}, ${pendingDecisions.length} decisions pending`);
    } catch (error) {
      console.error('Error processing battle event:', error);
    }
  }, [integration]);

  /**
   * Get enhanced AI ability selection for a character
   */
  const getEnhancedAIAbilitySelection = useCallback((
    character: BattleCharacter,
    available_abilities: any[],
    battle_state: BattleState
  ) => {
    try {
      return integration.enhanceAIAbilitySelection(character, available_abilities, battle_state);
    } catch (error) {
      console.error('Error enhancing AI ability selection:', error);
      return available_abilities[Math.floor(Math.random() * available_abilities.length)];
    }
  }, [integration]);

  /**
   * Apply financial stress modifiers to a character
   */
  const applyFinancialStressModifiers = useCallback((character: BattleCharacter): BattleCharacter => {
    try {
      return integration.applyFinancialStressModifiers(character);
    } catch (error) {
      console.error('Error applying financial stress modifiers:', error);
      return character;
    }
  }, [integration]);

  /**
   * Get pending wildcard decisions for a character
   */
  const getPendingWildcardDecisions = useCallback((character_id: string): WildcardDecision[] => {
    return battleFinancialState.pending_decisions.get(character_id) || [];
  }, [battleFinancialState.pending_decisions]);

  /**
   * Process a wildcard decision manually (for UI interaction)
   */
  const processWildcardDecision = useCallback(async (
    decision: WildcardDecision,
    selected_option: any
  ) => {
    try {
      await integration.processWildcardDecision(decision, selected_option);

      // Remove from pending decisions
      setBattleFinancialState(prev => {
        const newPending = new Map(prev.pending_decisions);
        const characterDecisions: any[] = newPending.get(decision.character_id) || [];
        const filteredDecisions = characterDecisions.filter(d => d.decision_id !== decision.decision_id);
        newPending.set(decision.character_id, filteredDecisions);

        return {
          ...prev,
          pending_decisions: newPending,
          active_wildcards: prev.active_wildcards.filter(d => d.decision_id !== decision.decision_id)
        };
      });

      console.log(`Processed wildcard decision ${decision.decision_type} for ${decision.character_id}`);
    } catch (error) {
      console.error('Error processing wildcard decision:', error);
    }
  }, [integration]);

  /**
   * Finalize battle financial state
   */
  const finalizeBattleFinancialState = useCallback(async (battle_state: BattleState) => {
    try {
      await integration.finalizeBattleFinancialState(battle_state);

      // Clear local state
      setBattleFinancialState({
        pending_decisions: new Map(),
        financial_modifiers: new Map(),
        active_wildcards: [],
        battle_earnings: new Map()
      });

      console.log('Battle financial integration finalized');
    } catch (error) {
      console.error('Error finalizing battle financial state:', error);
    }
  }, [integration]);

  /**
   * Get financial effects for a character
   */
  const getFinancialEffects = useCallback((character_id: string) => {
    return battleFinancialState.financial_modifiers.get(character_id);
  }, [battleFinancialState.financial_modifiers]);

  /**
   * Example usage demonstration
   */
  const demonstrateIntegration = useCallback(async () => {
    console.log('=== Battle Financial Integration Demo ===');

    // Mock battle state
    const mockBattleState: Partial<BattleState> = {
      teams: {
        player: {
          characters: [
            {
              character: {
                id: 'char1',
                name: 'Test Character',
                financial_personality: {
                  spending_style: 'impulsive',
                  risk_tolerance: 75,
                  financial_wisdom: 40
                },
                psych_stats: { mental_health: 60, ego: 70, team_player: 50 },
                monthly_earnings: 3000,
                wallet: 25000
              } as any,
              current_health: 100,
              mental_state: {
                current_mental_health: 60,
                stress: 0,
                confidence: 50,
                team_trust: 50
              },
              gameplan_adherence: 100,
              battle_performance: {
                damage_dealt: 0,
                damage_taken: 0,
                healing_done: 0,
                successful_hits: 0,
                abilities_used: 0,
                teamplay_actions: 0,
                strategy_deviations: 0
              }
            } as BattleCharacter
          ],
          team_chemistry: 75,
          current_morale: 75,
          coaching_credits: 3,
          status_effects: []
        },
        opponent: {
          characters: [],
          team_chemistry: 75,
          current_morale: 75,
          coaching_credits: 3,
          status_effects: []
        }
      }
    };
    await initializeBattleFinancialIntegration(mockBattleState as BattleState);

    // Simulate battle events
    const testCharacter = mockBattleState.teams!.player.characters[0];

    // Victory event
    const victoryEvent: MoraleEvent = {
      event_type: 'victory',
      description: 'Character achieved victory!',
      morale_impact: 30,
      affected_team: 'player',
      cascade_effects: []
    };

    await processBattleEvent(testCharacter, victoryEvent, mockBattleState as BattleState);

    // Critical hit event
    const criticalEvent: MoraleEvent = {
      event_type: 'critical_hit',
      description: 'Landed a critical hit!',
      morale_impact: 20,
      affected_team: 'player',
      cascade_effects: []
    };

    await processBattleEvent(testCharacter, criticalEvent, mockBattleState as BattleState);

    console.log('Demo completed - check console for integration results');
  }, [initializeBattleFinancialIntegration, processBattleEvent]);

  return {
    // State
    battleFinancialState,

    // Core functions
    initializeBattleFinancialIntegration,
    processBattleEvent,
    getEnhancedAIAbilitySelection,
    applyFinancialStressModifiers,
    finalizeBattleFinancialState,

    // Decision management
    getPendingWildcardDecisions,
    processWildcardDecision,

    // Utilities
    getFinancialEffects,
    demonstrateIntegration
  };
};

export default useBattleFinancialIntegration;