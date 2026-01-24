import { useCallback } from 'react';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { type BattleStateData } from '@/hooks/temp/useBattleState';

interface UseBattleCommunicationProps {
  state: BattleStateData;
  actions: {
    set_current_announcement: (announcement: string) => void;
    set_battle_cries: (cries: any) => void;
  };
  timeout_manager: {
    setTimeout: (cb: () => void, delay: number) => any;
    clearTimeout: (id: any) => void;
  };
  announce_battle_cry: () => void;
}

export const useBattleCommunication = ({ 
  state, 
  actions, 
  timeout_manager,
  announce_battle_cry
}: UseBattleCommunicationProps) => {

  // Fetch AI-generated battle cries with API integration and fallback logic
  const fetchBattleCries = useCallback(async () => {
    const { userCharacter, opponent_character } = state;

    // Ensure component is still mounted
    const controller = new AbortController();
    const timeoutId = timeout_manager.setTimeout(() => controller.abort(), 2000);

    const announcement = 'The warriors prepare to exchange battle cries...';
    actions.set_current_announcement(announcement);
    announce_battle_cry();

    // Set fallback battle cries immediately
    const currentUserCharacter = userCharacter;
    const currentOpponentCharacter = opponent_character;

    actions.set_battle_cries({
      player1: `${currentUserCharacter.name}: I'll show you the power of ${currentUserCharacter.personality || 'determination'}!`,
      player2: `${currentOpponentCharacter.name}: Prepare yourself for ${currentOpponentCharacter.personality || 'battle'}!`
    });
    
    // Try API if available, but don't crash if it fails
    try {
      const [cry1, cry2] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/battle-cry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character: currentUserCharacter }),
          signal: controller.signal
        }).catch(() => null),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/battle-cry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character: currentOpponentCharacter }),
          signal: controller.signal
        }).catch(() => null)
      ]);

      timeout_manager.clearTimeout(timeoutId);

      if (cry1?.ok && cry2?.ok) {
        const data1 = await cry1.json().catch(() => null);
        const data2 = await cry2.json().catch(() => null);
        if (data1 && data2) {
          actions.set_battle_cries({
            player1: data1.battleCry || `${currentUserCharacter.name}: For glory!`,
            player2: data2.battleCry || `${currentOpponentCharacter.name}: Victory will be mine!`
          });
        }
      }
    } catch (error) {
      console.warn('Battle cry API not available, using fallback cries');
      timeout_manager.clearTimeout(timeoutId);
    }
    
    return () => {
      controller.abort();
      timeout_manager.clearTimeout(timeoutId);
    };
  }, [state.user_character, state.opponent_character, actions, timeout_manager, announce_battle_cry]);

  return {
    fetchBattleCries,
  };
};