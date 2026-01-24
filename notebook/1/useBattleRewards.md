import { useCallback } from 'react';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { type BattleStateData } from '@/hooks/useBattleState';
import { combatRewards } from '@/data/combatRewards';
import { calculateWeightClassXP } from '@/data/weightClassSystem';
import { createBattlePerformance, CombatSkillEngine } from '@/data/combatSkillProgression';
import { updateCoachingPointsAfterBattle } from '@/data/teamBattleSystem';
import { coachProgressionAPI } from '@/services/coachProgressionAPI';

// Define TeamCharacterSkills interface locally (should be moved to shared types)
interface TeamCharacterSkills {
  characterId: string;
  coreSkills: {
    combat: { level: number; experience: number; maxLevel: number };
    survival: { level: number; experience: number; maxLevel: number };
    mental: { level: number; experience: number; maxLevel: number };
    social: { level: number; experience: number; maxLevel: number };
    spiritual: { level: number; experience: number; maxLevel: number };
  };
  signatureSkills: any;
  archetypeSkills: any;
  passiveAbilities: any[];
  activeAbilities: any[];
  unlockedNodes: any[];
  skillPoints: number;
  lastUpdated: Date;
}

interface UseBattleRewardsProps {
  state: BattleStateData;
  actions: {
    setBattleRewards: (rewards: any) => void;
    setCombatSkillReward: (reward: any) => void;
    setShowRewards: (show: boolean) => void;
    setPlayerTeam: (team: any) => void;
    setUserCharacter: (player: any) => void;
  };
  timeoutManager: {
    setTimeout: (cb: () => void, delay: number) => any;
    clearTimeout: (id: any) => void;
  };
}

export const useBattleRewards = ({ 
  state, 
  actions, 
  timeoutManager
}: UseBattleRewardsProps) => {

  // Calculate and apply battle rewards, XP, level ups, and skill progression
  const calculateBattleRewards = useCallback((userCharacterWon: boolean, winningCharacter: TeamCharacter) => {
    const {
      currentRound,
      userCharacterBattleStats,
      opponentCharacterBattleStats,
      selectedOpponent,
      userCharacter,
      opponentCharacter
    } = state;

    // Get the winning character's battle stats
    const stats = userCharacterWon ? userCharacterBattleStats : opponentCharacterBattleStats;
    // Update battle stats with final round and total counts
    const updatedStats = {
      ...stats,
      roundsSurvived: currentRound,
      totalRounds: currentRound
    };
    
    // Calculate base rewards using the combat rewards system
    const baseRewards = combatRewards.calculateRewards(
      userCharacterWon,
      winningCharacter.level,
      updatedStats,
      userCharacterWon ? opponentCharacter.level : userCharacter.level, // opponent level
      1.0 // membership multiplier (could be dynamic)
    );
    
    // Enhanced XP calculation with weight class bonuses if opponent was selected via matchmaking
    let enhancedXP = baseRewards.xpGained;
    let xpBonusDescription = '';

    if (selectedOpponent && userCharacterWon) {
      const playerLevel = winningCharacter.level;
      const opponentLevel = selectedOpponent.opponent.teamLevel;
      const battleDuration = currentRound * 30; // Rough estimate
      
      const weightClassXP = calculateWeightClassXP(playerLevel, opponentLevel, true, battleDuration);
      enhancedXP = weightClassXP.amount;
      
      if (weightClassXP.weightClassBonus && weightClassXP.weightClassBonus > 1) {
        const bonusPercent = Math.round((weightClassXP.weightClassBonus - 1) * 100);
        xpBonusDescription = `Weight Class Bonus: +${bonusPercent}% XP for fighting above your level!`;
      }
    }
    
    const rewards = {
      ...baseRewards,
      xpGained: enhancedXP,
      xpBonusDescription
    };
    
    // Check for level up
    const newXP = winningCharacter.experience + rewards.xpGained;
    const leveledUp = newXP >= winningCharacter.experienceToNext;
    
    if (leveledUp) {
      rewards.leveledUp = true;
      rewards.newLevel = winningCharacter.level + 1;
    }
    
    actions.setBattleRewards({
      ...rewards,
      characterName: winningCharacter.name,
      characterAvatar: winningCharacter.avatar,
      isVictory: userCharacterWon,
      oldLevel: winningCharacter.level,
      newLevel: leveledUp ? winningCharacter.level + 1 : winningCharacter.level,
      oldXP: winningCharacter.experience,
      newXP: leveledUp ? newXP - winningCharacter.experienceToNext : newXP,
      xpToNext: leveledUp ? Math.floor(winningCharacter.experienceToNext * 1.2) : winningCharacter.experienceToNext
    });

    // Award coach battle XP for completing the battle
    if (state.battleId) {
      coachProgressionAPI.awardBattleXP(
        userCharacterWon, // isWin
        state.battleId
      ).catch(error => console.error('Failed to award coach battle XP:', error));
    }
    
    // Save battle results to database
    if (state.battleId && rewards.characterEarnings) {
      (async () => {
        try {
          const { default: GameEventBus } = await import('@/services/gameEventBus');
          const eventBus = GameEventBus.getInstance();

          // Create events for significant earnings
          const events = [];
          if (rewards.characterEarnings.totalEarnings >= 5000) {
            // Publish earnings event
            await eventBus.publishEarningsEvent(
              winningCharacter.id,
              rewards.characterEarnings.totalEarnings,
              'battle_victory'
            );

            // Generate financial decision event
            await eventBus.publishFinancialDecision(
              winningCharacter.id,
              'investment_opportunity',
              rewards.characterEarnings.totalEarnings,
              'Consider investing your battle winnings wisely'
            );

            // Get events to save
            const characterEvents = eventBus.getEventsByCharacter(winningCharacter.id);
            events.push(...characterEvents.slice(-2)); // Last 2 events (earnings + decision)
          }

          // Save battle completion to database with retry logic
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
          const battleData = {
            winnerId: userCharacterWon ? state.userCharacter?.id : state.opponentCharacter?.id,
            winningCharacterId: winningCharacter.id,
            losingCharacterId: userCharacterWon ? state.opponentCharacter?.id : state.userCharacter?.id,
            characterEarnings: rewards.characterEarnings.totalEarnings,
            coachEarnings: rewards.characterEarnings.coachEarnings,
            xpGained: rewards.xpGained,
            endReason: 'victory',
            events
          };

          // Retry up to 3 times with exponential backoff
          let attempt = 0;
          let lastError = null;

          while (attempt < 3) {
            try {
              const response = await fetch(`${backendUrl}/api/battles/${state.battleId}/complete`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(battleData)
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const result = await response.json();

              if (result.alreadyCompleted) {
                console.log(`ℹ️ Battle already completed (idempotent retry)`);
              } else {
                console.log(`✅ Battle results saved to database:`, result);
              }

              console.log(`💰 ${winningCharacter.name} earned $${rewards.characterEarnings.totalEarnings.toLocaleString()}`);
              console.log(`💡 Coach earned $${rewards.characterEarnings.coachEarnings.toLocaleString()} (25% of character earnings)`);

              // Success - exit retry loop
              break;

            } catch (error: any) {
              attempt++;
              lastError = error;

              if (attempt < 3) {
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
                console.warn(`⚠️ Failed to save battle results (attempt ${attempt}/3). Retrying in ${delay/1000}s...`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                console.error(`❌ Failed to save battle results after 3 attempts:`, error);
                throw error;
              }
            }
          }
        } catch (error) {
          console.error('❌ Error saving battle results:', error);
        }
      })();
    }

    // Apply coaching points progression based on win/loss
    if (userCharacterWon) {
      actions.setPlayerTeam((prev: any) => updateCoachingPointsAfterBattle(prev, true));
      actions.setUserCharacter((prev: any) => ({
        ...prev,
        experience: leveledUp ? newXP - prev.experienceToNext : newXP,
        level: leveledUp ? prev.level + 1 : prev.level,
        experienceToNext: leveledUp ? Math.floor(prev.experienceToNext * 1.2) : prev.experienceToNext,
        // Apply stat bonuses to traditionalStats
        traditionalStats: {
          ...prev.traditionalStats,
          strength: rewards.statBonuses.atk ? prev.traditionalStats.strength + rewards.statBonuses.atk : prev.traditionalStats.strength,
          stamina: rewards.statBonuses.def ? prev.traditionalStats.stamina + rewards.statBonuses.def : prev.traditionalStats.stamina,
          speed: rewards.statBonuses.spd ? prev.traditionalStats.speed + rewards.statBonuses.spd : prev.traditionalStats.speed
        },
        maxHp: rewards.statBonuses.hp ? prev.maxHp + rewards.statBonuses.hp : prev.maxHp
      }));
    } else {
      // Handle loss - apply coaching points degradation
      actions.setPlayerTeam((prev: any) => updateCoachingPointsAfterBattle(prev, false));
    }
    
    // Calculate combat skill progression
    const battlePerformance = createBattlePerformance(winningCharacter.name, {
      isVictory: userCharacterWon,
      battleDuration: currentRound * 30, // Estimate based on rounds
      playerLevel: winningCharacter.level,
      opponentLevel: userCharacterWon ? opponentCharacter.level : userCharacter.level,
      damageDealt: stats.damageDealt,
      damageTaken: stats.damageTaken,
      criticalHits: stats.criticalHits,
      abilitiesUsed: stats.skillsUsed,
      environment: 'arena'
    });

    // Mock character skills for demo
    const demoSkills: TeamCharacterSkills = {
      characterId: winningCharacter.name,
      coreSkills: {
        combat: { level: Math.floor(winningCharacter.level * 0.8), experience: 450, maxLevel: 100 },
        survival: { level: Math.floor(winningCharacter.level * 0.6), experience: 320, maxLevel: 100 },
        mental: { level: Math.floor(winningCharacter.level * 0.7), experience: 380, maxLevel: 100 },
        social: { level: Math.floor(winningCharacter.level * 0.5), experience: 210, maxLevel: 100 },
        spiritual: { level: Math.floor(winningCharacter.level * 0.4), experience: 150, maxLevel: 100 }
      },
      signatureSkills: {},
      archetypeSkills: {},
      passiveAbilities: [],
      activeAbilities: [],
      unlockedNodes: [],
      skillPoints: 5,
      lastUpdated: new Date()
    };

    const skillReward = CombatSkillEngine.calculateSkillProgression(battlePerformance, demoSkills);
    actions.setCombatSkillReward(skillReward);

    // Show rewards screen after a short delay
    timeoutManager.setTimeout(() => {
      actions.setShowRewards(true);
    }, 2000);
  }, [state, actions, timeoutManager]);

  return {
    calculateBattleRewards,
  };
};