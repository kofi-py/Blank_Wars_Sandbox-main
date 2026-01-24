// HexBattleArena - Main 3D hex grid battle component
// Dual-screen layout: Hex grid (left) + Battle Monitor (right)

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Zap } from 'lucide-react';
import { HexGrid } from './HexGrid';
import { CharacterToken } from './CharacterToken';
import { ActionOverlay } from './ActionOverlay';
import { CharacterActionPlanner, PlannedAction, ActionStep } from './CharacterActionPlanner';
import { PowersSpellsPanel } from './PowersSpellsPanel';
import { RadialMenu, ActionMode } from './RadialMenu';
import { RadialSubMenu, SubMenuType } from './RadialSubMenu';
import { BattleStatusBar, StatusBarCharacter } from './BattleStatusBar';
import { TurnOrderPanel, TurnOrderCharacter } from './TurnOrderPanel';
import { HexGridSystem, HexPosition, HexBattleGrid } from '@/systems/hexGridSystem';
import { HexLineOfSight } from '@/systems/hexLineOfSight';
import { HexMovementEngine, CharacterActionState, ExecutedAction } from '@/systems/hexMovementEngine';
import { TeamCharacter, Team } from '@/data/teamBattleSystem';
import { getWeaponRange } from '@/data/weaponRanges';
import { battleWebSocket } from '@/services/battleWebSocket';
import { performAdherenceCheckAPI } from '@/services/battleAPI';
import { type BattleCharacter } from '@/data/battleFlow';
import { generateActionSurvey, selectFromSurvey, type SurveyOption } from '@/systems/actionSurveyGenerator';
import { makeJudgeDecision, getRandomJudge, type JudgeDecision, type JudgePersonality } from '@/data/aiJudgeSystem';
import { convertToBattleCharacter } from '@/utils/battleCharacterUtils';
import { PowerDefinition, SpellDefinition } from '@/data/magic';
import { getColosseaumImagePath } from '@/utils/battleImageMapper';
import { DiceRoll, DiceRollData, DiceType } from './DiceRoll';
import { calculateBattleXP } from '@/data/experience';

interface PowerUsedData {
  powerName?: string;
  narrative?: string;
  healthChanges?: Record<string, number>;
  new_state?: {
    yourCharacter?: {
      power_cooldowns?: Map<string, number>;
    };
  };
}

interface SpellCastData {
  spellName?: string;
  narrative?: string;
  healthChanges?: Record<string, number>;
  new_state?: {
    yourCharacter?: {
      spell_cooldowns?: Map<string, number>;
    };
  };
}

interface PowerSpellError {
  error?: string;
}

interface HexBattleArenaProps {
  user_team: Team;
  opponent_team: Team;
  onBattleEnd?: (result: { winner: 'user' | 'opponent'; user_health: number; opponent_health: number }) => void;
  onExitBattle?: () => void;
}

// Battle-specific character state (tracks HP, status during battle without mutating original)
interface BattleCharacterState {
  id: string;
  current_health: number;
  max_health: number;
  status_effects: string[];
  is_knocked_out: boolean;
}

export const HexBattleArena: React.FC<HexBattleArenaProps> = ({
  user_team,
  opponent_team,
  onBattleEnd,
  onExitBattle
}) => {
  // Extract characters from teams with safety checks
  const user_characters = user_team?.characters || [];
  const opponent_characters = opponent_team?.characters || [];

  // Battle state - tracks HP and status during battle
  const [battleCharacterStates, setBattleCharacterStates] = useState<Map<string, BattleCharacterState>>(new Map());

  // Round tracking state (declare early for use in checkBattleEnd)
  const [currentRound, setCurrentRound] = useState(1); // Track current round (1-based)
  const [turnsInRound, setTurnsInRound] = useState(0); // Track turns completed in current round
  const [isSkippingBattle, setIsSkippingBattle] = useState(false); // Auto-battle mode

  // Battle end state (declare early for use in checkBattleEnd and handleSkipBattle)
  const [battleEnded, setBattleEnded] = useState(false);
  const [battleResult, setBattleResult] = useState<{ winner: 'user' | 'opponent'; user_health: number; opponent_health: number } | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(true); // Show victory/defeat overlay
  const [xpRewards, setXpRewards] = useState<Array<{ characterName: string; xpGained: number }>>([]);
  const [battleStartTime] = useState(Date.now()); // Track battle duration for XP calculation

  // Battle log state (declare early for addLogMessage)
  interface BattleLogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: 'attack' | 'damage' | 'crit' | 'dodge' | 'knockout' | 'turn' | 'system' | 'item';
  }
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);

  // Battle Status State
  const [battleStatus, setBattleStatus] = useState<'preparing' | 'active' | 'ended'>('preparing');
  const [countdown, setCountdown] = useState(3);

  // Battle Settings State
  const [enablePlanningMode, setEnablePlanningMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Mobile UI overlay states
  const [showMobileLog, setShowMobileLog] = useState(false);
  const [showMobileQueue, setShowMobileQueue] = useState(false);
  const [showMobilePowers, setShowMobilePowers] = useState(false);

  // Visual effects states
  const [screenShake, setScreenShake] = useState<{ intensity: number; duration: number } | null>(null);
  const [hitFlashCharacter, setHitFlashCharacter] = useState<string | null>(null);
  const [attackingCharacterId, setAttackingCharacterId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; type: 'spark' | 'explosion' | 'heal'; color: string }>>([]);
  const [comboTracker, setComboTracker] = useState<Map<string, { count: number; lastAttacker: string }>>(new Map());
  const [diceRolls, setDiceRolls] = useState<DiceRollData[]>([]);

  // Responsive hex size for mobile - larger hexes for touch screens
  const [hexSize, setHexSize] = useState(30);
  useEffect(() => {
    const updateHexSize = () => {
      // On mobile (< 768px), use larger hexes for better touch targets
      // On tablet (768-1024px), use medium size
      // On desktop (> 1024px), use default size
      const width = window.innerWidth;
      if (width < 768) {
        setHexSize(45); // Much larger for phone screens
      } else if (width < 1024) {
        setHexSize(38); // Medium for tablets
      } else {
        setHexSize(30); // Default for desktop
      }
    };
    updateHexSize();
    window.addEventListener('resize', updateHexSize);
    return () => window.removeEventListener('resize', updateHexSize);
  }, []);

  // Mobile zoom state for hex grid
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastTouchRef = useRef<{ x: number; y: number; distance: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two finger touch - start pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      lastTouchRef.current = { x: centerX, y: centerY, distance };
      setIsPanning(true);
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      // Single finger on zoomed grid - start pan
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, distance: 0 };
      setIsPanning(true);
    }
  }, [zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!lastTouchRef.current) return;

    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      // Guard against division by zero (can happen if started with 1 finger then added second)
      if (lastTouchRef.current.distance === 0) {
        lastTouchRef.current.distance = distance;
        return;
      }

      const scale = distance / lastTouchRef.current.distance;

      setZoomLevel(prev => Math.min(Math.max(prev * scale, 0.5), 3));
      lastTouchRef.current.distance = distance;
    } else if (e.touches.length === 1 && isPanning && zoomLevel > 1) {
      // Pan when zoomed
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;

      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      lastTouchRef.current.x = e.touches[0].clientX;
      lastTouchRef.current.y = e.touches[0].clientY;
    }
  }, [isPanning, zoomLevel]);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
    setIsPanning(false);
  }, []);

  // Mouse wheel zoom for desktop
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Ctrl + wheel = zoom
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.min(Math.max(prev + delta, 0.5), 3));
    }
  }, []);

  // Mouse drag for panning when zoomed
  const [isMousePanning, setIsMousePanning] = useState(false);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button or left click when zoomed
    if (e.button === 1 || (e.button === 0 && zoomLevel > 1 && e.shiftKey)) {
      e.preventDefault();
      setIsMousePanning(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [zoomLevel]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMousePanning && lastMouseRef.current) {
      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [isMousePanning]);

  const handleMouseUp = useCallback(() => {
    setIsMousePanning(false);
    lastMouseRef.current = null;
  }, []);

  // Rebellion notification state (includes judge ruling)
  const [rebellionNotification, setRebellionNotification] = useState<{
    characterName: string;
    action: string;
    judgeRuling?: string;
    judgeName?: string;
  } | null>(null);

  // Track actions taken during current turn (for adherence check)
  const [currentTurnActions, setCurrentTurnActions] = useState<ActionStep[]>([]);

  // Prevent AI from executing multiple times for the same turn
  const aiExecutingRef = useRef<string | null>(null);
  // Keep track of AI timer to prevent cleanup from clearing in-progress turns
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track floating damage number timers for cleanup on unmount
  const floatingNumberTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  // Keep actionStates in a ref to avoid stale closures in AI turn handler
  const actionStatesRef = useRef<Map<string, CharacterActionState>>(new Map());

  // Cleanup AI timer on unmount (prevents memory leak if unmount during AI turn)
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, []);

  // Add message to battle log (declare early for use in checkBattleEnd)
  const addLogMessage = useCallback((message: string, type: BattleLogEntry['type']) => {
    const entry: BattleLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      message,
      type
    };
    setBattleLog(prev => [...prev, entry]);
  }, []);



  // Handle Battle Start Countdown
  useEffect(() => {
    if (battleStatus === 'preparing') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setBattleStatus('active');
        addLogMessage('⚔️ Battle begins!', 'system');
      }
    }
  }, [battleStatus, countdown, addLogMessage]);

  // Initialize battle character states immediately
  useEffect(() => {
    if (user_characters.length === 0 || opponent_characters.length === 0) return;

    const new_states = new Map<string, BattleCharacterState>();

    // Initialize user team battle states
    user_characters.forEach(char => {
      new_states.set(char.id, {
        id: char.id,
        current_health: char.current_health || char.max_health,
        max_health: char.max_health,
        status_effects: [],
        is_knocked_out: false
      });
    });

    // Initialize opponent team battle states
    opponent_characters.forEach(char => {
      new_states.set(char.id, {
        id: char.id,
        current_health: char.current_health || char.max_health,
        max_health: char.max_health,
        status_effects: [],
        is_knocked_out: false
      });
    });

    setBattleCharacterStates(new_states);
    console.log('⚔️ Battle states initialized for', new_states.size, 'characters');
  }, [user_characters.length, opponent_characters.length]);



  // Keep a ref to battleCharacterStates to avoid cascading re-renders
  const battleCharacterStatesRef = useRef(battleCharacterStates);
  battleCharacterStatesRef.current = battleCharacterStates;

  // Helper: Get battle state for character - uses ref to avoid dependency changes
  const getBattleState = useCallback((character_id: string): BattleCharacterState | undefined => {
    return battleCharacterStatesRef.current.get(character_id);
  }, []); // Empty deps - uses ref

  // Helper: Update battle state for character
  const updateBattleState = useCallback((character_id: string, updates: Partial<BattleCharacterState>) => {
    setBattleCharacterStates(prev => {
      const new_states = new Map(prev);
      const current_state = new_states.get(character_id);
      if (current_state) {
        new_states.set(character_id, { ...current_state, ...updates });
      }
      return new_states;
    });
  }, []);

  // Check victory/defeat conditions
  const checkBattleEnd = useCallback(() => {
    // Count alive characters on each team
    let user_alive = 0;
    let opponent_alive = 0;
    let user_total_hp = 0;
    let opponent_total_hp = 0;

    user_characters.forEach(char => {
      const battle_state = getBattleState(char.id);
      if (battle_state && !battle_state.is_knocked_out) {
        user_alive++;
        user_total_hp += battle_state.current_health;
      }
    });

    opponent_characters.forEach(char => {
      const battle_state = getBattleState(char.id);
      if (battle_state && !battle_state.is_knocked_out) {
        opponent_alive++;
        opponent_total_hp += battle_state.current_health;
      }
    });

    // Check for 3-round limit FIRST
    if (currentRound > 3) {
      console.log('⏰ BATTLE ENDED - 3 ROUND LIMIT REACHED!');
      // Determine winner by remaining HP
      const winner = user_total_hp > opponent_total_hp ? 'user' :
        opponent_total_hp > user_total_hp ? 'opponent' :
          'user'; // Tie defaults to user
      const result = {
        winner: winner as 'user' | 'opponent',
        user_health: user_total_hp,
        opponent_health: opponent_total_hp
      };
      setBattleEnded(true);
      setBattleResult(result);
      if (onBattleEnd) {
        onBattleEnd(result);
      }
      addLogMessage(`Battle ended after 3 rounds! Winner: ${winner === 'user' ? 'You' : 'Opponent'}`, 'system');
      return true;
    }

    // Check for victory/defeat by knockout
    if (user_alive === 0 && opponent_alive === 0) {
      // Draw (both teams eliminated simultaneously - rare but possible)
      console.log('⚔️ BATTLE ENDED IN A DRAW!');
      const result = {
        winner: (user_total_hp >= opponent_total_hp ? 'user' : 'opponent') as 'user' | 'opponent',
        user_health: 0,
        opponent_health: 0
      };
      setBattleEnded(true);
      setBattleResult(result);
      if (onBattleEnd) {
        onBattleEnd(result);
      }
      return true;
    } else if (user_alive === 0) {
      // Defeat
      console.log('💀 DEFEAT! All your characters have been knocked out!');
      const result = {
        winner: 'opponent' as const,
        user_health: 0,
        opponent_health: opponent_total_hp
      };
      setBattleEnded(true);
      setBattleResult(result);
      if (onBattleEnd) {
        onBattleEnd(result);
      }
      return true;
    } else if (opponent_alive === 0) {
      // Victory
      console.log('🎉 VICTORY! All enemy characters have been defeated!');
      const result = {
        winner: 'user' as const,
        user_health: user_total_hp,
        opponent_health: 0
      };
      setBattleEnded(true);
      setBattleResult(result);
      if (onBattleEnd) {
        onBattleEnd(result);
      }
      return true;
    }

    return false;
  }, [user_characters, opponent_characters, getBattleState, onBattleEnd, currentRound, addLogMessage]);

  // Watch currentRound for 3-round limit (separate effect to avoid stale closure issues)
  useEffect(() => {
    if (!battleEnded && currentRound > 3) {
      checkBattleEnd();
    }
  }, [currentRound, battleEnded, checkBattleEnd]);

  // Calculate XP rewards when battle ends
  useEffect(() => {
    if (battleEnded && battleResult && xpRewards.length === 0) {
      const isVictory = battleResult.winner === 'user';
      const battleDuration = Math.floor((Date.now() - battleStartTime) / 1000); // seconds
      const opponentAvgLevel = opponent_characters.reduce((sum, c) => sum + ((c as any).level || 1), 0) / opponent_characters.length || 1;

      const rewards: Array<{ characterName: string; xpGained: number }> = [];

      user_characters.forEach(char => {
        const charLevel = (char as any).level || 1;
        const xpGain = calculateBattleXP(charLevel, Math.round(opponentAvgLevel), isVictory, battleDuration);
        rewards.push({
          characterName: char.name,
          xpGained: xpGain.amount
        });
      });

      setXpRewards(rewards);
      console.log('🎮 XP Rewards calculated:', rewards);
    }
  }, [battleEnded, battleResult, user_characters, opponent_characters, battleStartTime, xpRewards.length]);

  // Skip Battle - auto-simulate the entire battle
  const handleSkipBattle = useCallback(() => {
    if (battleEnded || isSkippingBattle) return;

    setIsSkippingBattle(true);
    addLogMessage('⚡ Auto-battle started...', 'system');

    // Clone battle states for simulation
    const simStates = new Map<string, { hp: number; attack: number; defense: number; isUser: boolean; name: string }>();

    user_characters.forEach(char => {
      const battleState = getBattleState(char.id);
      simStates.set(char.id, {
        hp: battleState?.current_health || char.current_health || char.max_health,
        attack: char.attack || 50,
        defense: char.defense || 30,
        isUser: true,
        name: char.name
      });
    });

    opponent_characters.forEach(char => {
      const battleState = getBattleState(char.id);
      simStates.set(char.id, {
        hp: battleState?.current_health || char.current_health || char.max_health,
        attack: char.attack || 50,
        defense: char.defense || 30,
        isUser: false,
        name: char.name
      });
    });

    const log: string[] = [];
    let round = currentRound;
    const MAX_ROUNDS = 3;

    // Simulate rounds
    while (round <= MAX_ROUNDS) {
      log.push(`--- Round ${round} ---`);

      // Get all alive characters sorted by a simple initiative (attack stat)
      const aliveChars = Array.from(simStates.entries())
        .filter(([_, state]) => state.hp > 0)
        .sort((a, b) => b[1].attack - a[1].attack);

      // Each character attacks once per round
      for (const [attackerId, attacker] of aliveChars) {
        if (attacker.hp <= 0) continue;

        // Find a target from the opposite team
        const targets = Array.from(simStates.entries())
          .filter(([_, state]) => state.hp > 0 && state.isUser !== attacker.isUser);

        if (targets.length === 0) break; // No targets left

        // Pick lowest HP target (smart strategy)
        targets.sort((a, b) => a[1].hp - b[1].hp);
        const [targetId, target] = targets[0];

        // Calculate damage (simplified: attack - defense/2, min 5)
        const damage = Math.max(5, Math.floor(attacker.attack - target.defense / 2 + Math.random() * 10 - 5));
        target.hp = Math.max(0, target.hp - damage);

        log.push(`${attacker.name} attacks ${target.name} for ${damage} damage!`);

        if (target.hp <= 0) {
          log.push(`💀 ${target.name} has been knocked out!`);
        }
      }

      // Check if battle is over
      const userAlive = Array.from(simStates.values()).filter(s => s.isUser && s.hp > 0).length;
      const opponentAlive = Array.from(simStates.values()).filter(s => !s.isUser && s.hp > 0).length;

      if (userAlive === 0 || opponentAlive === 0) {
        break;
      }

      round++;
    }

    // Determine winner
    const userTotalHp = Array.from(simStates.values()).filter(s => s.isUser).reduce((sum, s) => sum + Math.max(0, s.hp), 0);
    const opponentTotalHp = Array.from(simStates.values()).filter(s => !s.isUser).reduce((sum, s) => sum + Math.max(0, s.hp), 0);
    const winner: 'user' | 'opponent' = userTotalHp >= opponentTotalHp ? 'user' : 'opponent';

    log.push(`--- Battle Complete ---`);
    log.push(`Winner: ${winner === 'user' ? 'Your Team' : 'Opponent Team'}`);
    log.push(`Your HP: ${userTotalHp} | Opponent HP: ${opponentTotalHp}`);

    // Update real battle states to match simulation (single state update to avoid race conditions)
    setBattleCharacterStates(prev => {
      const newStates = new Map(prev);
      simStates.forEach((simState, charId) => {
        const existing = newStates.get(charId);
        if (existing) {
          newStates.set(charId, {
            ...existing,
            current_health: Math.max(0, simState.hp),
            is_knocked_out: simState.hp <= 0
          });
        }
      });
      return newStates;
    });

    // Log all results
    log.forEach(msg => {
      const type = msg.includes('💀') ? 'knockout' :
        msg.includes('attacks') ? 'attack' :
          msg.includes('---') ? 'turn' : 'system';
      addLogMessage(msg, type);
    });

    // Set final result
    const result = {
      winner,
      user_health: userTotalHp,
      opponent_health: opponentTotalHp
    };
    setBattleEnded(true);
    setBattleResult(result);
    setIsSkippingBattle(false);

    if (onBattleEnd) {
      onBattleEnd(result);
    }
  }, [battleEnded, isSkippingBattle, user_characters, opponent_characters, getBattleState, currentRound, addLogMessage, onBattleEnd]);

  // Debug logging
  useEffect(() => {
    console.log('🎮 HexBattleArena mounted');
    console.log('User characters:', user_characters.length, user_characters.map(c => c.name));
    console.log('Opponent characters:', opponent_characters.length, opponent_characters.map(c => c.name));
  }, []);

  // Internal state for turn management
  const [currentTurn, setCurrentTurn] = useState<'user' | 'opponent'>('user');
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);

  // Action planning state
  const [showActionPlanner, setShowActionPlanner] = useState(false);
  const [characterPlans, setCharacterPlans] = useState<Map<string, PlannedAction>>(new Map());

  // Judge system state
  const [currentJudge, setCurrentJudge] = useState<JudgePersonality>(() => getRandomJudge());

  // Powers & Spells state
  const [equipped_powers, setEquippedPowers] = useState<PowerDefinition[]>([]);
  const [equipped_spells, setEquippedSpells] = useState<SpellDefinition[]>([]);
  const [power_cooldowns, setPowerCooldowns] = useState<Record<string, number>>({});
  const [spell_cooldowns, setSpellCooldowns] = useState<Record<string, number>>({});
  const [selectedPower, setSelectedPower] = useState<PowerDefinition | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<SpellDefinition | null>(null);

  // Defensive buff state - tracks which characters are defending this turn
  const [defendingCharacters, setDefendingCharacters] = useState<Set<string>>(new Set());

  // Turn start notification state
  const [turnStartNotification, setTurnStartNotification] = useState<string | null>(null);

  // Track if user has taken their first action (to hide "Click to Act" tutorial hint after)
  const [hasActedOnce, setHasActedOnce] = useState(false);

  // Auto-scroll battle log to bottom
  const battle_log_ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (battle_log_ref.current) {
      battle_log_ref.current.scrollTop = battle_log_ref.current.scrollHeight;
    }
  }, [battleLog]);

  // Socket integration for powers/spells
  useEffect(() => {
    const handlers = {
      onPowerUsed: (data: PowerUsedData) => {
        console.log('⚡ Power used response:', data);
        // Update HP based on server response via battle state
        if (data.healthChanges) {
          Object.entries(data.healthChanges).forEach(([character_id, change]) => {
            const battle_state = getBattleState(character_id);
            if (battle_state) {
              const new_hp = Math.max(0, Math.min(battle_state.max_health, battle_state.current_health + (change as number)));
              updateBattleState(character_id, {
                current_health: new_hp,
                is_knocked_out: new_hp <= 0
              });
            }
          });
        }
        // Update cooldowns from server - convert Map to Record
        if (data.new_state?.yourCharacter?.power_cooldowns) {
          const cooldownMap = data.new_state.yourCharacter.power_cooldowns;
          setPowerCooldowns(Object.fromEntries(cooldownMap));
        }
        // Add to battle log
        addLogMessage(data.narrative || `Power ${data.powerName} used!`, 'attack');
      },
      onSpellCast: (data: SpellCastData) => {
        console.log('✨ Spell cast response:', data);
        // Update HP based on server response via battle state
        if (data.healthChanges) {
          Object.entries(data.healthChanges).forEach(([character_id, change]) => {
            const battle_state = getBattleState(character_id);
            if (battle_state) {
              const new_hp = Math.max(0, Math.min(battle_state.max_health, battle_state.current_health + (change as number)));
              updateBattleState(character_id, {
                current_health: new_hp,
                is_knocked_out: new_hp <= 0
              });
            }
          });
        }
        // Update cooldowns from server - convert Map to Record
        if (data.new_state?.yourCharacter?.spell_cooldowns) {
          const cooldownMap = data.new_state.yourCharacter.spell_cooldowns;
          setSpellCooldowns(Object.fromEntries(cooldownMap));
        }
        // Add to battle log
        addLogMessage(data.narrative || `Spell ${data.spellName} cast!`, 'attack');
      },
      onPowerFailed: (error: PowerSpellError) => {
        console.error('❌ Power failed:', error);
        addLogMessage(error.error || 'Power failed!', 'system');
      },
      onSpellFailed: (error: PowerSpellError) => {
        console.error('❌ Spell failed:', error);
        addLogMessage(error.error || 'Spell failed!', 'system');
      }
    };

    battleWebSocket.setEventHandlers(handlers);

    return () => {
      // Cleanup handlers on unmount
      battleWebSocket.clearEventHandlers();
    };
  }, [getBattleState, updateBattleState, addLogMessage]);

  // Floating damage numbers state
  interface FloatingDamageNumber {
    id: string;
    damage: number;
    position: HexPosition;
    type: 'normal' | 'crit' | 'dodge' | 'heal';
    timestamp: number;
  }
  const [floating_numbers, setFloatingNumbers] = useState<FloatingDamageNumber[]>([]);

  // Add floating damage number
  const addFloatingNumber = useCallback((damage: number, position: HexPosition, type: FloatingDamageNumber['type']) => {
    const floating_num: FloatingDamageNumber = {
      id: `${Date.now()}-${Math.random()}`,
      damage,
      position,
      type,
      timestamp: Date.now()
    };

    // Cap max floating numbers to prevent memory issues during rapid attacks
    const MAX_FLOATING_NUMBERS = 20;
    setFloatingNumbers(prev => {
      const updated = [...prev, floating_num];
      // If over cap, remove oldest entries
      if (updated.length > MAX_FLOATING_NUMBERS) {
        return updated.slice(-MAX_FLOATING_NUMBERS);
      }
      return updated;
    });

    // Remove after animation completes (1.5 seconds)
    // Track timer for cleanup on unmount
    const timer = setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(n => n.id !== floating_num.id));
      floatingNumberTimersRef.current.delete(timer);
    }, 1500);
    floatingNumberTimersRef.current.add(timer);
  }, []);

  // Cleanup floating number timers on unmount
  useEffect(() => {
    return () => {
      floatingNumberTimersRef.current.forEach(timer => clearTimeout(timer));
      floatingNumberTimersRef.current.clear();
    };
  }, []);

  // Trigger screen shake effect
  const triggerScreenShake = useCallback((intensity: 'light' | 'medium' | 'heavy' | 'crit') => {
    const intensityMap = { light: 2, medium: 5, heavy: 10, crit: 15 };
    const durationMap = { light: 150, medium: 250, heavy: 400, crit: 500 };
    setScreenShake({ intensity: intensityMap[intensity], duration: durationMap[intensity] });
    setTimeout(() => setScreenShake(null), durationMap[intensity]);
  }, []);

  // Trigger hit flash on character
  const triggerHitFlash = useCallback((characterId: string) => {
    setHitFlashCharacter(characterId);
    setTimeout(() => setHitFlashCharacter(null), 200);
  }, []);

  // Add particle effect at position
  const addParticles = useCallback((x: number, y: number, type: 'spark' | 'explosion' | 'heal', count: number = 5) => {
    const colors = {
      spark: ['#FFD700', '#FFA500', '#FF6347'],
      explosion: ['#FF4500', '#FF6347', '#FFD700', '#FF0000'],
      heal: ['#00FF7F', '#32CD32', '#7CFC00']
    };
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      type,
      color: colors[type][Math.floor(Math.random() * colors[type].length)]
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  }, []);

  // Track combo hits on same target
  const trackCombo = useCallback((targetId: string, attackerId: string): number => {
    setComboTracker(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(targetId);
      if (existing && existing.lastAttacker !== attackerId) {
        // Different attacker = combo continues
        newMap.set(targetId, { count: existing.count + 1, lastAttacker: attackerId });
        return newMap;
      } else if (!existing) {
        newMap.set(targetId, { count: 1, lastAttacker: attackerId });
      }
      return newMap;
    });
    const current = comboTracker.get(targetId);
    return current ? current.count : 1;
  }, [comboTracker]);

  // Calculate combo damage bonus (10% per combo hit, max 50%)
  const getComboBonus = useCallback((targetId: string): number => {
    const combo = comboTracker.get(targetId);
    if (!combo || combo.count <= 1) return 0;
    return Math.min(0.5, (combo.count - 1) * 0.1); // 10% per hit, max 50%
  }, [comboTracker]);

  // Show dice roll animation
  const showDiceRoll = useCallback((
    roll: number,
    type: DiceRollData['type'],
    label?: string,
    options?: {
      isCrit?: boolean;
      isFail?: boolean;
      diceType?: DiceRollData['diceType'];
      threshold?: number;
    }
  ) => {
    const diceData: DiceRollData = {
      id: `${Date.now()}-${Math.random()}`,
      roll,
      type,
      label,
      isCrit: options?.isCrit,
      isFail: options?.isFail,
      diceType: options?.diceType,
      threshold: options?.threshold
    };
    setDiceRolls(prev => [...prev, diceData]);
    // Remove after animation (longer for D100)
    const duration = options?.diceType === 'd100' ? 2000 : 1500;
    setTimeout(() => {
      setDiceRolls(prev => prev.filter(d => d.id !== diceData.id));
    }, duration);
  }, []);

  // Initialize turn order based on speed - must re-run when characters change
  useEffect(() => {
    if (user_characters.length === 0 || opponent_characters.length === 0) {
      console.warn('⚠️ Cannot initialize turn order - teams not loaded yet');
      return;
    }

    const all_characters = [...user_characters, ...opponent_characters];
    const sorted = all_characters
      .map(char => ({
        id: char.id,
        // Use initiative if available, otherwise fallback to speed
        // Initiative is speed + dexterity (calculated in DB)
        initiative: char.initiative ?? char.speed
      }))
      .sort((a, b) => b.initiative - a.initiative)
      .map(c => c.id);

    console.log('✅ Turn order initialized:', sorted);
    setTurnOrder(sorted);
    setActiveCharacterId(sorted[0] || null);

    // Set currentTurn based on which team the first character belongs to
    const first_char_id = sorted[0];
    if (first_char_id) {
      const is_first_user = user_characters.some(c => c.id === first_char_id);
      setCurrentTurn(is_first_user ? 'user' : 'opponent');
      console.log(`🎯 First turn goes to: ${is_first_user ? 'user' : 'opponent'} team`);
    }

    // Initialize action states for ALL characters synchronously with turn order
    const initial_action_states = new Map();
    sorted.forEach(char_id => {
      initial_action_states.set(char_id, HexMovementEngine.initializeActionState(char_id));
    });
    setActionStates(initial_action_states);
    console.log('✅ Action states initialized synchronously for', sorted.length, 'characters');
  }, [user_characters.length, opponent_characters.length, addLogMessage]);

  // Show coaching modal when a user character's turn begins
  useEffect(() => {
    if (!activeCharacterId) return;
    if (battleCharacters.size === 0) return;

    const active_char = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
    if (!active_char) return;

    const is_user_character = user_characters.some(c => c.id === activeCharacterId);

    // Load character's powers/spells
    // Check both equipped_* (preferred) and unlocked_* (fallback) properties
    const charPowers = active_char.equipped_powers
      || (active_char as any).unlocked_powers
      || [];
    setEquippedPowers(charPowers);

    const charSpells = active_char.equipped_spells
      || (active_char as any).unlocked_spells
      || [];
    setEquippedSpells(charSpells);

    // Add turn announcement to log
    addLogMessage(`${active_char.name}'s turn`, 'turn');

    if (is_user_character) {
      if (enablePlanningMode) {
        console.log('📋 User character turn - Planning Mode ENABLED. Showing planner.');
        // Small delay to ensure clean state transition visuals
        setTimeout(() => {
          setShowActionPlanner(true);
        }, 500);
      } else {
        console.log('⚡ User character turn - Live Mode (Planner Disabled). Ready for input.');
        // User plays directly on grid
      }
    } else {
      console.log('🤖 Opponent character turn - AI will play (handled by separate effect)');
      // AI logic is handled by a separate useEffect after executePlannedActions and onEndTurn are defined
    }
  }, [activeCharacterId, user_characters, opponent_characters, addLogMessage, enablePlanningMode]);

  // Generate flavorful rebellion message based on action type
  const generateRebellionMessage = useCallback((
    characterName: string,
    action: SurveyOption,
    gridSize: number = 10
  ): string => {
    const label = action.label.toLowerCase();

    // Check if it's a move action (potential flee)
    const moveMatch = action.label.match(/Move to \((-?\d+),\s*(-?\d+)\)/);
    if (moveMatch) {
      const q = parseInt(moveMatch[1]);
      const r = parseInt(moveMatch[2]);
      // If moving toward edge (high q, r, or s values), it's fleeing
      const isEdge = Math.abs(q) >= gridSize - 2 || Math.abs(r) >= gridSize - 2 || Math.abs(-(q+r)) >= gridSize - 2;
      if (isEdge) {
        const fleeMessages = [
          `${characterName} has had enough and storms toward the arena exit!`,
          `${characterName} turns their back on the battle and heads for the edge!`,
          `"I'm done with this!" ${characterName} breaks ranks and flees!`,
          `${characterName} refuses to continue fighting and retreats!`,
        ];
        return fleeMessages[Math.floor(Math.random() * fleeMessages.length)];
      }
      // Regular move during rebellion - repositioning defiantly
      const moveMessages = [
        `${characterName} ignores orders and moves to a position of their choosing!`,
        `${characterName} defiantly repositions without permission!`,
      ];
      return moveMessages[Math.floor(Math.random() * moveMessages.length)];
    }

    // Attack actions
    if (label.includes('attack') || action.type === 'attack') {
      if (label.includes('friendly') || label.includes('ally') || label.includes('teammate')) {
        return `In a fit of rage, ${characterName} turns on their own teammate!`;
      }
      const attackMessages = [
        `${characterName} lashes out at the nearest target in frustration!`,
        `${characterName} attacks recklessly, ignoring the battle plan!`,
        `"I'll do this MY way!" ${characterName} strikes without orders!`,
      ];
      return attackMessages[Math.floor(Math.random() * attackMessages.length)];
    }

    // Defend/refuse actions
    if (label.includes('refuse') || label.includes('nothing') || action.type === 'defend') {
      const refuseMessages = [
        `${characterName} crosses their arms and refuses to follow orders!`,
        `${characterName} stands defiantly still, ignoring all commands!`,
        `"No." ${characterName} flatly refuses to act!`,
        `${characterName} shakes their head and won't budge!`,
      ];
      return refuseMessages[Math.floor(Math.random() * refuseMessages.length)];
    }

    // Power/spell usage
    if (label.includes('power') || label.includes('spell') || label.includes('ability')) {
      return `${characterName} uses their abilities without authorization!`;
    }

    // Default fallback
    return `${characterName} rebels: ${action.label}`;
  }, []);

  // Apply psychology-based weighting to chaos actions
  const applyRebellionWeighting = useCallback((
    survey: ReturnType<typeof generateActionSurvey>,
    character: BattleCharacter
  ): ReturnType<typeof generateActionSurvey> => {
    const weighted_options = survey.options.map(option => {
      let weight = option.priority_weight;

      // Chaos actions get boosted based on psychology
      if (option.id.startsWith('chaos_')) {
        const stress = character.psych_stats.stress_level;
        const team_trust = character.psych_stats.team_trust;
        const mental_health = character.psych_stats.mental_health;

        // High stress increases chaos likelihood
        if (stress > 70) {
          weight += 50;
        } else if (stress > 50) {
          weight += 20;
        }

        // Low team trust increases betrayal likelihood
        if (team_trust < 30 && option.id.includes('friendly_fire')) {
          weight += 40;
        }

        // Low mental health increases flee/refuse likelihood
        if (mental_health < 30) {
          if (option.id === 'chaos_flee' || option.id === 'chaos_refuse') {
            weight += 60;
          }
        }
      }

      return { ...option, priority_weight: weight };
    });

    return { ...survey, options: weighted_options };
  }, []);

  // Initialize hex grid (moved here to fix hoisting)
  const [grid, setGrid] = useState<HexBattleGrid>(() => HexGridSystem.initializeBattleGrid());

  // Keep a ref to grid to avoid stale closure in async loops
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Character action states (moved here to fix hoisting)
  const [actionStates, setActionStates] = useState<Map<string, CharacterActionState>>(new Map());
  actionStatesRef.current = actionStates; // Keep ref in sync for AI turn handler

  // BattleCharacter records built from real data and DB-backed status effects
  const [battleCharacters, setBattleCharacters] = useState<Map<string, BattleCharacter>>(new Map());

  // Selection state (moved here to fix hoisting)
  const [selectedHex, setSelectedHex] = useState<HexPosition | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexPosition | null>(null);
  const [actionMode, setActionMode] = useState<'move' | 'attack' | 'power' | 'spell' | 'item' | null>(null);

  // Radial menu state
  const [radialMenuOpen, setRadialMenuOpen] = useState(false);
  const [radialMenuPosition, setRadialMenuPosition] = useState({ x: 0, y: 0 });
  const [radialSubMenu, setRadialSubMenu] = useState<SubMenuType | null>(null);

  // Get active character position and action state (moved here to fix hoisting)
  const active_character_pos = activeCharacterId ? grid.character_positions.get(activeCharacterId) : null;
  const active_action_state = activeCharacterId ? actionStates.get(activeCharacterId) : null;

  // Calculate damage for basic attack (moved here to fix hoisting)
  const calculateBasicDamage = useCallback((attacker: TeamCharacter, defender: TeamCharacter) => {
    // Base damage from attacker's strength stat (flat)
    // Use strength (guaranteed) instead of attack (optional property that may be undefined)
    const base_attack = attacker.strength || 0;
    const base_damage = Math.floor(base_attack * 0.5);

    // Defense reduces damage (flat)
    const defense = defender.defense || 0;
    const defense_reduction = Math.floor(defense * 0.3);

    // Critical hit chance (based on attack stat)
    const crit_chance = base_attack * 0.2; // 0-20% crit chance
    const is_crit = Math.random() * 100 < crit_chance;

    // Calculate final damage
    let final_damage = Math.max(1, base_damage - defense_reduction);
    if (is_crit) {
      final_damage = Math.floor(final_damage * 2);
    }

    // Dodge chance (based on defender's speed - flat)
    const defender_speed = defender.speed || 0;
    const dodge_chance = defender_speed * 0.15; // 0-15% dodge chance
    const dodged = Math.random() * 100 < dodge_chance;

    return {
      damage: dodged ? 0 : final_damage,
      is_crit,
      dodged,
      breakdown: {
        base_attack,
        base_damage,
        defense_reduction,
        crit_multiplier: is_crit ? 2 : 1
      }
    };
  }, []);

  // Handle attack character (moved here to fix hoisting)
  const handleAttackCharacter = useCallback((
    attacker_id: string,
    defender_id: string,
    provided_action_state?: CharacterActionState
  ): { success: boolean; new_state?: CharacterActionState } => {
    const attacker = [...user_characters, ...opponent_characters].find(c => c.id === attacker_id);
    const defender = [...user_characters, ...opponent_characters].find(c => c.id === defender_id);

    if (!attacker || !defender) {
      console.error('❌ Could not find attacker or defender');
      return { success: false };
    }

    const attacker_battle_state = getBattleState(attacker_id);
    const defender_battle_state = getBattleState(defender_id);
    const attacker_action_state = provided_action_state || actionStates.get(attacker_id);

    if (!attacker_battle_state || !defender_battle_state || !attacker_action_state) {
      console.error('❌ Battle states not initialized');
      return { success: false };
    }

    // Check if defender is already knocked out
    if (defender_battle_state.is_knocked_out) {
      console.log('⚠️ Target is already knocked out');
      return { success: false };
    }

    // Deduct AP for attack (2 AP)
    const attack_action = {
      type: 'attack' as const,
      ap_cost: 2
    };

    const result = HexMovementEngine.executeAction(attacker_action_state, attack_action);
    if (!result.success) {
      console.log('❌ Not enough AP to attack');
      return { success: false };
    }

    // Update action state only if not provided (UI flow)
    if (!provided_action_state) {
      const new_states = new Map(actionStates);
      new_states.set(attacker_id, result.new_state);
      setActionStates(new_states);
    }

    // Calculate damage (using strength stat for attack power)
    console.log(`🎯 Attack stats - Attacker: ${attacker.name} (strength: ${attacker.strength}), Defender: ${defender.name} (defense: ${defender.defense})`);
    const damage_result = calculateBasicDamage(attacker, defender);

    // Get defender's position for floating number
    const defender_pos = grid.character_positions.get(defender_id);

    if (damage_result.dodged) {
      console.log(`💨 ${defender.name} dodged ${attacker.name}'s attack!`);
      addLogMessage(`${defender.name} dodged ${attacker.name}'s attack!`, 'dodge');

      // Show "DODGE" floating text
      if (defender_pos) {
        addFloatingNumber(0, defender_pos, 'dodge');
      }
      return { success: true, new_state: result.new_state };
    }

    // Apply defensive buff if defender is defending (50% damage reduction)
    let damage = damage_result.damage;
    const is_defending = defendingCharacters.has(defender_id);
    if (is_defending) {
      damage = Math.round(damage * 0.5);
      addLogMessage(`${defender.name}'s defense reduces damage to ${damage}!`, 'system');
      console.log(`🛡️ Defense active! Damage reduced: ${damage_result.damage} → ${damage}`);
    }

    const new_hp = Math.max(0, defender_battle_state.current_health - damage);
    const is_knocked_out = new_hp <= 0;

    // Apply damage
    updateBattleState(defender_id, {
      current_health: new_hp,
      is_knocked_out
    });

    // Trigger attacker animation
    setAttackingCharacterId(attacker_id);
    setTimeout(() => setAttackingCharacterId(null), 400);

    // Show D20 dice roll for attack
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const isCritRoll = attackRoll === 20 || damage_result.is_crit;
    const isFumble = attackRoll === 1;
    showDiceRoll(
      isCritRoll ? 20 : attackRoll,
      'attack',
      `${attacker.name} Attack`,
      { isCrit: isCritRoll, isFail: isFumble, diceType: 'd20' }
    );

    // Show D6 dice roll for damage (with slight delay)
    setTimeout(() => {
      // Simulate damage as sum of d6 rolls (show representative value 1-6)
      const damageRollDisplay = Math.min(6, Math.max(1, Math.ceil(damage / 5)));
      showDiceRoll(
        damageRollDisplay,
        'damage',
        `${damage} Damage`,
        { diceType: 'd6', isCrit: damage_result.is_crit }
      );
    }, 300);

    // Sync visual effects with dice animation completion (~900ms after damage dice starts at 300ms)
    if (defender_pos) {
      const pixel_pos = HexGridSystem.toPixel(defender_pos, hexSize);
      const damagePercent = (damage / defender.max_health) * 100;

      // Delay floating number and effects to sync with damage dice animation
      setTimeout(() => {
        addFloatingNumber(damage, defender_pos, damage_result.is_crit ? 'crit' : 'normal');
        triggerHitFlash(defender_id);
        addParticles(pixel_pos.x, pixel_pos.y, damage_result.is_crit ? 'explosion' : 'spark', damage_result.is_crit ? 12 : 6);

        // Screen shake intensity based on damage percentage of target's max HP
        if (damage_result.is_crit) {
          triggerScreenShake('crit');
        } else if (damagePercent > 40) {
          triggerScreenShake('heavy');
        } else if (damagePercent > 20) {
          triggerScreenShake('medium');
        } else {
          triggerScreenShake('light');
        }

        // Track combo
        const comboCount = trackCombo(defender_id, attacker.id);
        if (comboCount > 1) {
          addLogMessage(`🔥 ${comboCount}x COMBO!`, 'crit');
        }
      }, 900); // Sync with dice animation (d6 starts at 300ms, rolls for ~600ms)
    }

    // Log combat result
    if (damage_result.is_crit) {
      console.log(`💥 CRITICAL! ${attacker.name} hits ${defender.name} for ${damage} damage!`);
      addLogMessage(`${attacker.name} attacks ${defender.name}`, 'attack');
      addLogMessage(`CRITICAL HIT for ${damage} damage!`, 'crit');
    } else {
      console.log(`⚔️ ${attacker.name} attacks ${defender.name} for ${damage} damage`);
      addLogMessage(`${attacker.name} attacks ${defender.name} for ${damage} damage`, 'damage');
    }

    if (is_knocked_out) {
      console.log(`💀 ${defender.name} has been knocked out!`);
      addLogMessage(`${defender.name} has been knocked out!`, 'knockout');
      // Extra explosion on knockout
      if (defender_pos) {
        const pixel_pos = HexGridSystem.toPixel(defender_pos, hexSize);
        addParticles(pixel_pos.x, pixel_pos.y, 'explosion', 20);
        triggerScreenShake('heavy');
      }
    }

    console.log(`   HP: ${defender_battle_state.current_health} → ${new_hp}`);
    console.log(`   AP remaining: ${result.new_state.action_points_remaining}`);

    // Check for battle end immediately (state is already updated synchronously)
    checkBattleEnd();

    return { success: true, new_state: result.new_state };
  }, [user_characters, opponent_characters, getBattleState, updateBattleState, calculateBasicDamage, actionStates, checkBattleEnd, addLogMessage, grid.character_positions, addFloatingNumber, defendingCharacters]);

  // Execute power on target (moved here to fix hoisting)
  const executePowerOnTarget = useCallback((
    target_character_id: string,
    provided_power?: PowerDefinition,
    provided_character_id?: string,
    provided_action_state?: CharacterActionState
  ): { success: boolean; new_state?: CharacterActionState } => {
    const power = provided_power || selectedPower;
    const char_id = provided_character_id || activeCharacterId;
    const char_action_state = provided_action_state || active_action_state;

    if (!power || !char_id || !char_action_state) {
      return { success: false };
    }

    const ap_cost = power.current_rank;

    // If called from UI (no provided_action_state), QUEUE instead of execute
    if (!provided_action_state) {
      // Check if we have enough AP (simulate, don't execute)
      const used_ap = currentTurnActions.reduce((sum, a) => sum + a.ap_cost, 0);
      if (used_ap + ap_cost > char_action_state.max_action_points) {
        addLogMessage(`Not enough AP to queue ${power.name}!`, 'system');
        return { success: false };
      }

      // Queue the action
      const power_action: ActionStep = {
        type: 'power',
        ap_cost,
        target_id: target_character_id,
        ability_id: power.id,
        ability_type: 'power',
        ability_name: power.name
      };

      setCurrentTurnActions(prev => [...prev, power_action]);
      addLogMessage(`Queued: ${power.name} on target`, 'system');
      console.log('🗓️ Queued power action:', power.name);

      setSelectedPower(null);
      setActionMode(null);
      return { success: true };
    }

    // EXECUTE mode (called from plan execution)
    console.log(`⚡ Executing ${power.name} on ${target_character_id}`);

    // Deduct AP through HexMovementEngine
    const powerAction: ExecutedAction = {
      type: 'power',
      ap_cost,
      target_character_id,
      ability_id: power.id
    };

    const result = HexMovementEngine.executeAction(char_action_state, powerAction);
    if (!result.success) {
      console.log(`❌ Failed to execute power: ${result.reason}`);
      return { success: false };
    }

    // Set cooldown
    setPowerCooldowns(prev => ({
      ...prev,
      [power.id]: power.cooldown_turns
    }));

    // Send socket event to backend
    battleWebSocket.usePower(power.id, target_character_id);

    // Local simulation for immediate feedback (server will override)
    addLogMessage(`${char_id} uses ${power.name}!`, 'attack');

    return { success: true, new_state: result.new_state };
  }, [selectedPower, activeCharacterId, active_action_state, actionStates, currentTurnActions, addLogMessage]);

  // Execute spell on target (moved here to fix hoisting)
  const executeSpellOnTarget = useCallback((
    target_character_id: string,
    provided_spell?: SpellDefinition,
    provided_character_id?: string,
    provided_action_state?: CharacterActionState
  ): { success: boolean; new_state?: CharacterActionState } => {
    const spell = provided_spell || selectedSpell;
    const char_id = provided_character_id || activeCharacterId;
    const char_action_state = provided_action_state || active_action_state;

    if (!spell || !char_id || !char_action_state) {
      return { success: false };
    }

    const ap_cost = spell.current_rank;

    // If called from UI (no provided_action_state), QUEUE instead of execute
    if (!provided_action_state) {
      // Check if we have enough AP (simulate, don't execute)
      const used_ap = currentTurnActions.reduce((sum, a) => sum + a.ap_cost, 0);
      if (used_ap + ap_cost > char_action_state.max_action_points) {
        addLogMessage(`Not enough AP to queue ${spell.name}!`, 'system');
        return { success: false };
      }

      // Check if we have enough mana
      const caster = [...user_characters, ...opponent_characters].find(c => c.id === char_id);
      if (caster && spell.mana_cost && (caster.current_mana || 0) < spell.mana_cost) {
        addLogMessage(`Not enough mana for ${spell.name}!`, 'system');
        return { success: false };
      }

      // Queue the action
      const spell_action: ActionStep = {
        type: 'spell',
        ap_cost,
        target_id: target_character_id,
        ability_id: spell.id,
        ability_type: 'spell',
        ability_name: spell.name
      };

      setCurrentTurnActions(prev => [...prev, spell_action]);
      addLogMessage(`Queued: ${spell.name} on target`, 'system');
      console.log('🗓️ Queued spell action:', spell.name);

      setSelectedSpell(null);
      setActionMode(null);
      return { success: true };
    }

    // EXECUTE mode (called from plan execution)
    console.log(`✨ Executing ${spell.name} on ${target_character_id}`);

    // Deduct AP through HexMovementEngine
    const spellAction: ExecutedAction = {
      type: 'spell',
      ap_cost,
      target_character_id,
      ability_id: spell.id
    };

    const result = HexMovementEngine.executeAction(char_action_state, spellAction);
    if (!result.success) {
      console.log(`❌ Failed to execute spell: ${result.reason}`);
      return { success: false };
    }

    // Set cooldown
    setSpellCooldowns(prev => ({
      ...prev,
      [spell.id]: spell.cooldown_turns
    }));

    // Send socket event to backend
    battleWebSocket.castSpell(spell.id, target_character_id);

    // Local simulation for immediate feedback (server will override)
    addLogMessage(`${char_id} casts ${spell.name}!`, 'attack');

    return { success: true, new_state: result.new_state };
  }, [selectedSpell, activeCharacterId, active_action_state, actionStates, currentTurnActions, addLogMessage]);

  // Execute rebellious action selected by psychology system
  const executeRebellionAction = useCallback((
    character_id: string,
    rebellion_action: SurveyOption,
    character: BattleCharacter
  ) => {
    console.log('💀 Executing rebellion action:', rebellion_action.label);
    const flavorMessage = generateRebellionMessage(character.character.name, rebellion_action);
    addLogMessage(`💀 ${flavorMessage}`, 'attack');

    // Get judge ruling on the rebellion
    const judge_decision = makeJudgeDecision(
      {
        type: 'strategy_override',
        description: `${character.character.name} rebels: ${rebellion_action.label}`,
        severity: 'major',
        character_id: character.character.id,
        gameplay_effect: `Character overrides coach strategy and performs independent action: ${rebellion_action.label}`,
        start_round: Math.floor(turnOrder.indexOf(character_id) / turnOrder.length) + 1,
        duration: 1, // 1 round duration for temporary rebellion
        timestamp: new Date()
      },
      character.character as TeamCharacter,
      {
        current_round: Math.floor(turnOrder.indexOf(character_id) / turnOrder.length) + 1,
        opponent_character: opponent_characters[0], // Use first opponent as reference
        arena_condition: 'pristine'
      },
      currentJudge,
      rebellion_action.label
    );

    // Display judge ruling
    addLogMessage(`⚖️ ${currentJudge.name}: ${judge_decision.ruling}`, 'system');
    addLogMessage(judge_decision.narrative, 'attack');

    // FIRST: Check if this is a move action and execute it BEFORE judge effects
    const move_match = rebellion_action.label.match(/Move to \((-?\d+),\s*(-?\d+)\)/);
    if (move_match) {
      const target_q = parseInt(move_match[1]);
      const target_r = parseInt(move_match[2]);
      const target_hex = { q: target_q, r: target_r, s: -(target_q + target_r) };

      // Use gridRef.current for latest grid state
      const currentGrid = gridRef.current;

      // Check for hex collision
      let hex_occupied = false;
      for (const [other_char_id, other_pos] of currentGrid.character_positions) {
        if (other_char_id !== character_id &&
            other_pos.q === target_hex.q &&
            other_pos.r === target_hex.r &&
            other_pos.s === target_hex.s) {
          hex_occupied = true;
          console.warn(`⚠️ COLLISION: Cannot move ${character.character.name} to occupied hex`, target_hex);
          addLogMessage(`${character.character.name} cannot move there - hex occupied!`, 'system');
          break;
        }
      }

      if (!hex_occupied) {
        console.log(`🚶 REBELLION MOVE: ${character.character.name} moving to`, JSON.stringify(target_hex));

        // Update grid with new position - create new Map instances
        const new_grid = {
          ...currentGrid,
          character_positions: new Map(currentGrid.character_positions),
          terrain: new Map(currentGrid.terrain),
          perimeter_attempts: new Map(currentGrid.perimeter_attempts),
          perimeter_effects: new Map(currentGrid.perimeter_effects)
        };
        new_grid.character_positions.set(character_id, target_hex);

        console.log(`🗺️  REBELLION: Setting grid with new position for ${character.character.name}`);
        // Update both ref and state
        gridRef.current = new_grid;
        setGrid(new_grid);
      }
    }

    // Apply mechanical effect
    const effect = judge_decision.mechanical_effect;
    const char_state = getBattleState(character_id);
    if (!char_state) return;

    switch (effect.type) {
      case 'damage':
        if (effect.target === 'self') {
          const new_hp = Math.max(0, char_state.current_health - (effect.amount || 0));
          updateBattleState(character_id, {
            current_health: new_hp,
            is_knocked_out: new_hp === 0
          });
          addLogMessage(`${character.character.name} takes ${effect.amount} damage!`, 'damage');
        } else if (effect.target === 'opponent') {
          // Find closest enemy within attack range (melee = 1-2 hexes)
          const attacker_pos = gridRef.current.character_positions.get(character_id);
          const MELEE_RANGE = 2;

          let closest_enemy: { id: string; name: string; distance: number } | null = null;

          for (const enemy of opponent_characters) {
            const enemy_pos = gridRef.current.character_positions.get(enemy.id);
            if (attacker_pos && enemy_pos) {
              const dist = HexGridSystem.distance(attacker_pos, enemy_pos);
              if (dist <= MELEE_RANGE && (!closest_enemy || dist < closest_enemy.distance)) {
                closest_enemy = { id: enemy.id, name: enemy.name, distance: dist };
              }
            }
          }

          if (closest_enemy) {
            const target_state = getBattleState(closest_enemy.id);
            if (target_state) {
              const new_hp = Math.max(0, target_state.current_health - (effect.amount || 0));
              updateBattleState(closest_enemy.id, {
                current_health: new_hp,
                is_knocked_out: new_hp === 0
              });
              addLogMessage(`${closest_enemy.name} takes ${effect.amount} damage!`, 'damage');
            }
          } else {
            addLogMessage(`${character.character.name}'s attack misses - no enemies in range!`, 'system');
          }
        }
        break;

      case 'skip_turn':
        addLogMessage(`${character.character.name} loses their turn!`, 'system');
        // Turn will end naturally
        break;

      case 'redirect_attack':
        if (effect.target === 'teammate') {
          // Find a random teammate to hit
          const teammates = user_characters.filter(c => c.id !== character_id);
          if (teammates.length > 0) {
            const victim = teammates[Math.floor(Math.random() * teammates.length)];
            const victim_state = getBattleState(victim.id);
            if (victim_state) {
              const new_hp = Math.max(0, victim_state.current_health - (effect.amount || 0));
              updateBattleState(victim.id, {
                current_health: new_hp,
                is_knocked_out: new_hp === 0
              });
              addLogMessage(`💥 Friendly fire! ${victim.name} takes ${effect.amount} damage!`, 'damage');
            }
          }
        }
        break;

      default:
        addLogMessage(`Chaotic effect: ${effect.special_effect || 'unpredictable consequences'}`, 'system');
    }

    // Check if battle ended due to rebellion
    checkBattleEnd();
  }, [user_characters, opponent_characters, currentJudge, turnOrder, getBattleState, updateBattleState, addLogMessage, checkBattleEnd, generateRebellionMessage]);

  // Execute planned actions when adherence check passes
  const executePlannedActions = useCallback(async (character_id: string, plan: PlannedAction) => {
    console.log('🎬 Executing planned actions for', character_id);

    const character = [...user_characters, ...opponent_characters].find(c => c.id === character_id);
    if (!character) {
      console.error('❌ Character not found for plan execution');
      return;
    }

    let current_action_state = actionStates.get(character_id);
    if (!current_action_state) {
      console.error('❌ Action state not found for character');
      return;
    }

    console.log(`🔋 Starting AP: ${current_action_state.action_points_remaining}/${current_action_state.max_action_points}`);

    // Execute each action step in sequence with delays
    for (const [index, step] of plan.action_sequence.entries()) {
      console.log(`  Step ${index + 1}/${plan.action_sequence.length}:`, step.type, `(${step.ap_cost} AP)`);
      
      // Delay between steps for visual clarity
      await new Promise(resolve => setTimeout(resolve, 800));

      switch (step.type) {
        case 'move':
          if (step.target_hex) {
            // Use gridRef.current to get latest grid state in async loop
            const currentGrid = gridRef.current;
            console.log(`🚶 BEFORE MOVE: ${character.name} position:`, JSON.stringify(currentGrid.character_positions.get(character_id)));
            console.log(`🎯 TARGET position:`, JSON.stringify(step.target_hex));

            // Check for collision - is target hex already occupied?
            // This is a safety check - ideally moves to occupied hexes shouldn't be planned
            let hex_occupied = false;
            let occupying_char_name = '';
            for (const [other_id, other_pos] of currentGrid.character_positions) {
              if (other_id !== character_id &&
                  other_pos.q === step.target_hex.q &&
                  other_pos.r === step.target_hex.r) {
                hex_occupied = true;
                // Find the occupying character's name
                const occupier = [...user_characters, ...opponent_characters].find(c => c.id === other_id);
                occupying_char_name = occupier?.name || 'another character';
                break;
              }
            }

            if (hex_occupied) {
              console.warn(`⚠️ COLLISION BLOCKED: ${character.name} tried to move to hex occupied by ${occupying_char_name}`, step.target_hex);
              addLogMessage(`${character.name}'s path blocked by ${occupying_char_name}!`, 'turn');
              // Don't deduct AP for blocked move - continue to next action
              continue;
            }

            // Update grid position - create new Map instances to trigger React re-render
            const new_grid = {
              ...currentGrid,
              character_positions: new Map(currentGrid.character_positions),
              terrain: new Map(currentGrid.terrain),
              perimeter_attempts: new Map(currentGrid.perimeter_attempts),
              perimeter_effects: new Map(currentGrid.perimeter_effects)
            };
            new_grid.character_positions.set(character_id, step.target_hex);

            console.log(`🚶 AFTER SET: ${character.name} position in new grid:`, JSON.stringify(new_grid.character_positions.get(character_id)));
            console.log(`🗺️  Grid state being set with ${new_grid.character_positions.size} characters`);

            // Update both the ref (for next iteration) and state (for React re-render)
            gridRef.current = new_grid;
            setGrid(new_grid);

            // Deduct AP
            const move_action = { type: 'move' as const, ap_cost: step.ap_cost, target_hex: step.target_hex };
            const result = HexMovementEngine.executeAction(current_action_state!, move_action);
            if (result.success) {
              current_action_state = result.new_state;
              const new_states = new Map(actionStates);
              new_states.set(character_id, result.new_state);
              setActionStates(new_states);
            }

            addLogMessage(`${character.name} moves to new position (${step.ap_cost} AP)`, 'system');
            console.log(`    ✅ Moved to`, step.target_hex);
          }
          break;

        case 'attack':
          if (step.target_id) {
            const attack_result = handleAttackCharacter(character_id, step.target_id, current_action_state);
            if (attack_result.success && attack_result.new_state) {
              current_action_state = attack_result.new_state;
              const new_states = new Map(actionStates);
              new_states.set(character_id, attack_result.new_state);
              setActionStates(new_states);
            }
            console.log(`    ⚔️ Attacked ${step.target_id}`);
          }
          break;

        case 'power':
          if (step.target_id && step.ability_id) {
            // Find the power
            const power = equipped_powers.find(p => p.id === step.ability_id);
            if (power) {
              const power_result = executePowerOnTarget(step.target_id, power, character_id, current_action_state);
              if (power_result.success && power_result.new_state) {
                current_action_state = power_result.new_state;
                const new_states = new Map(actionStates);
                new_states.set(character_id, power_result.new_state);
                setActionStates(new_states);
              }
              console.log(`    ⚡ Used power ${step.ability_name} on ${step.target_id}`);
            } else {
              console.warn(`    ⚠️ Power ${step.ability_id} not found in equipped powers`);
            }
          }
          break;

        case 'spell':
          if (step.target_id && step.ability_id) {
            // Find the spell
            const spell = equipped_spells.find(s => s.id === step.ability_id);
            if (spell) {
              const spell_result = executeSpellOnTarget(step.target_id, spell, character_id, current_action_state);
              if (spell_result.success && spell_result.new_state) {
                current_action_state = spell_result.new_state;
                const new_states = new Map(actionStates);
                new_states.set(character_id, spell_result.new_state);
                setActionStates(new_states);
              }
              console.log(`    ✨ Cast spell ${step.ability_name} on ${step.target_id}`);
            } else {
              console.warn(`    ⚠️ Spell ${step.ability_id} not found in equipped spells`);
            }
          }
          break;

        case 'defend':
          // Execute defend for the specific character
          const defend_action = {
            type: 'defend' as const,
            ap_cost: 1
          };
          const defend_result = HexMovementEngine.executeAction(current_action_state, defend_action);
          if (defend_result.success) {
            current_action_state = defend_result.new_state;
            const new_states = new Map(actionStates);
            new_states.set(character_id, defend_result.new_state);
            setActionStates(new_states);
            setDefendingCharacters(prev => new Set(prev).add(character_id));
            addLogMessage(`${character.name} takes a defensive stance!`, 'system');
            console.log(`    🛡️ Taking defensive stance`);
          }
          break;

        default:
          console.warn(`    ⚠️ Unknown action type: ${step.type}`);
      }
    }

    console.log('✅ Plan execution complete');
  }, [user_characters, opponent_characters, actionStates, handleAttackCharacter, executePowerOnTarget, executeSpellOnTarget, addLogMessage, equipped_powers, equipped_spells, defendingCharacters]); // grid removed - using gridRef

  // Action plan submission handler
  const handlePlanSubmit = useCallback(async (plan: PlannedAction) => {
    if (!activeCharacterId) return;

    console.log('✅ Action plan submitted:', plan);

    // Store the plan for this character
    const new_plans = new Map(characterPlans);
    new_plans.set(activeCharacterId, plan);
    setCharacterPlans(new_plans);

    setShowActionPlanner(false);

    // Get active character
    const active_char = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
    if (!active_char) {
      console.error('❌ Could not find active character for adherence check');
      return;
    }

    // Check if this is a user character or opponent character
    const is_user_character = user_characters.some(c => c.id === activeCharacterId);

    // Skip adherence check for opponent characters
    // Opponent characters (PVE AI or other players) don't have user_character records in our DB
    // They auto-execute their plans
    if (!is_user_character) {
      console.log('⏭️ Opponent character auto-executes plan:', active_char.name);
      await executePlannedActions(activeCharacterId, plan);
      onEndTurn?.();
      return;
    }

    // Calculate battle context for adherence check (only for user characters)
    const user_alive = user_characters.filter(c => {
      const state = getBattleState(c.id);
      return !state?.is_knocked_out;
    }).length;

    const opponent_alive = opponent_characters.filter(c => {
      const state = getBattleState(c.id);
      return !state?.is_knocked_out;
    }).length;

    const user_total_hp = (user_characters || []).reduce((sum, c) => {
      const state = getBattleState(c.id);
      return sum + (state?.current_health ?? c.current_health);
    }, 0);

    const opponent_total_hp = (opponent_characters || []).reduce((sum, c) => {
      const state = getBattleState(c.id);
      return sum + (state?.current_health ?? c.current_health);
    }, 0);

    // is_user_character already checked above (we return early if not user character)
    const team_winning = user_total_hp > opponent_total_hp;

    // Convert TeamCharacter to BattleCharacter for adherence check
    const battle_char = battleCharacters.get(active_char.id);
    if (!battle_char) {
      throw new Error(`BattleCharacter not built for ${active_char.id} (${active_char.name})`);
    }

    // Battle context for rebellion flow (used at line 1118)
    // Since we return early for opponent characters, this is always for user characters
    const battle_context = {
      team_winning,
      round_number: currentTurn === 'user' ? Math.floor(turnOrder.indexOf(activeCharacterId) / turnOrder.length) + 1 : 1,
      teammates_alive: user_alive,
      teammates_total: user_characters.length
    };

    // Build battle state for adherence API
    const char_battle_state = getBattleState(active_char.id);
    const battle_state_input = {
      current_hp: char_battle_state?.current_health ?? active_char.current_health,
      max_hp: active_char.max_health,
      team_winning,
      teammates_alive: user_alive,
      teammates_total: user_characters.length
    };

    // Perform adherence check via backend API
    console.log('🎲 Performing adherence check for', active_char.name);
    let adherence_result;

    try {
      console.log('📤 Sending adherence check request:', {
        user_character_id: active_char.id,
        character_name: active_char.name,
        battle_state_input
      });
      console.log('📤 Battle state details:', JSON.stringify(battle_state_input, null, 2));
      adherence_result = await performAdherenceCheckAPI(
        active_char.id,
        battle_state_input
      );
      console.log(`${adherence_result.passed ? '✅' : '❌'} Adherence check result:`, adherence_result.reasoning);
      addLogMessage(adherence_result.reasoning, adherence_result.passed ? 'system' : 'turn');
    } catch (error: any) {
      console.error('⚠️ Adherence check API failed:', error);
      console.error('⚠️ Error message:', error?.message);
      console.error('⚠️ Request data was:', {
        user_character_id: active_char.id,
        character_id: active_char.character_id,
        character_name: active_char.name,
        battle_state_input
      });
      // Fallback: Auto-pass in dev mode when API fails
      adherence_result = {
        passed: true,
        reasoning: `${active_char.name} follows the coach's plan (API unavailable - auto-passed)`,
        roll: 75,
        threshold: 50
      };
      addLogMessage(adherence_result.reasoning, 'system');
    }

    // Show D100 dice roll for adherence check
    showDiceRoll(
      adherence_result.roll,
      'adherence',
      `${active_char.name} Adherence`,
      {
        diceType: 'd100',
        threshold: adherence_result.threshold
      }
    );

    // Wait for dice animation before continuing
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (adherence_result.passed) {
      // Character follows the plan
      console.log('✅ Character follows plan - executing planned actions');
      addLogMessage(`${active_char.name} follows the coach's plan!`, 'system');

      // Execute the planned actions
      try {
        await executePlannedActions(activeCharacterId, plan);
      } catch (error) {
        console.error('❌ Error executing planned actions:', error);
        addLogMessage(`Error executing actions for ${active_char.name}`, 'system');
      }
    } else {
      // Character rebels!
      console.log('⚠️ Character rebels - triggering rebellion flow');
      addLogMessage(`⚠️ REBELLION! ${active_char.name} refuses to follow the plan!`, 'turn');
      addLogMessage(`${active_char.name} is acting independently...`, 'system');

      // Generate action survey with all possible actions (including chaos)
      const active_char_pos = grid.character_positions.get(activeCharacterId);
      const active_action_state = actionStates.get(activeCharacterId);

      if (!active_char_pos || !active_action_state) {
        console.error('❌ Missing position or action state for rebellion');
        return;
      }

      // Build minimal BattleState for action survey
      const battle_state = {
        teams: {
          player: {
            characters: user_characters.map(c => {
              const battleChar = battleCharacters.get(c.id);
              if (!battleChar) {
                throw new Error(`BattleCharacter not built for user char ${c.id} (${c.name})`);
              }
              return battleChar;
            })
          },
          opponent: {
            characters: opponent_characters.map(c => {
              const battleChar = battleCharacters.get(c.id);
              if (!battleChar) {
                throw new Error(`BattleCharacter not built for opponent char ${c.id} (${c.name})`);
              }
              return battleChar;
            })
          }
        },
        current_round: battle_context.round_number
      };

      // Generate action survey - PASS GRID REF for accurate position lookups (avoid stale closure)
      let survey = generateActionSurvey(battle_char, battle_state as any, active_action_state.action_points_remaining, gridRef.current);

      // Apply psychology-based weighting to chaos actions
      survey = applyRebellionWeighting(survey, battle_char);

      // Select rebellious action
      const rebellion_action = selectFromSurvey(survey);

      console.log('💀 Rebellion action selected:', rebellion_action);

      // Show rebellion notification BEFORE any other state changes
      setRebellionNotification({
        characterName: active_char.name,
        action: rebellion_action.label
      });

      // Execute the rebellious action through judge system
      executeRebellionAction(activeCharacterId, rebellion_action, battle_char);

      // IMPORTANT: Wait for notification to render before advancing turn
      // This prevents React batching from hiding the notification
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Auto-hide after total 3 seconds (1.5s already waited)
      setTimeout(() => setRebellionNotification(null), 1500);
    }

    // After executing actions or rebellion, progress to next turn
    // This matches the behavior from onEndTurn
    setShowActionPlanner(false);

    // Move to next character in turn order, skipping knocked-out characters
    const current_index = turnOrder.indexOf(activeCharacterId || '');
    let next_index = (current_index + 1) % turnOrder.length;
    let next_character_id = turnOrder[next_index];

    // Skip knocked-out characters (loop through turn order until we find an alive character)
    let attempts = 0;
    while (attempts < turnOrder.length) {
      const char_state = getBattleState(next_character_id);
      if (char_state && !char_state.is_knocked_out) {
        break; // Found an alive character
      }
      console.log(`⏭️ Skipping knocked-out character: ${next_character_id}`);
      next_index = (next_index + 1) % turnOrder.length;
      next_character_id = turnOrder[next_index];
      attempts++;
    }

    console.log(`Next character: ${next_character_id} (index ${next_index}/${turnOrder.length})`);

    // ALWAYS reset action state for next character (gives them fresh 3 AP)
    if (next_character_id) {
      const new_states = new Map(actionStates);
      new_states.set(next_character_id, HexMovementEngine.initializeActionState(next_character_id));
      setActionStates(new_states);
    }

    setActiveCharacterId(next_character_id);

    // Update currentTurn based on which team the next character belongs to
    const is_next_user_char = user_characters.some(c => c.id === next_character_id);
    setCurrentTurn(is_next_user_char ? 'user' : 'opponent');

    // Track round progression (same logic as onEndTurn)
    if (next_index === 0) {
      console.log('🔄 New round starting');

      // Reset AP for all characters at the start of the round
      const new_states = new Map(actionStates);
      turnOrder.forEach(char_id => {
        const current_state = new_states.get(char_id);
        if (current_state) {
          new_states.set(char_id, {
            ...current_state,
            action_points_remaining: current_state.max_action_points,
            actions_this_turn: [],
            can_move: true,
            can_attack: true,
            can_defend: true
          });
        } else {
          // Initialize if somehow missing
          new_states.set(char_id, HexMovementEngine.initializeActionState(char_id));
        }
      });
      setActionStates(new_states);
      console.log('✅ AP reset for all characters at round start');

      // Increment round counter and track turns
      // Note: Round limit check is handled by useEffect watching currentRound
      setTurnsInRound(0);
      setCurrentRound(prev => {
        const newRound = prev + 1;
        console.log(`📊 Round ${newRound} beginning`);
        addLogMessage(`Round ${newRound} begins!`, 'turn');
        return newRound;
      });
    } else {
      setTurnsInRound(prev => prev + 1);
    }
  }, [activeCharacterId, characterPlans, user_characters, opponent_characters, getBattleState, currentTurn, turnOrder, addLogMessage, executePlannedActions, grid, actionStates, applyRebellionWeighting, executeRebellionAction, battleCharacters]);

  // Character action handlers
  const onMoveCharacter = useCallback((character_id: string, to: HexPosition) => {
    console.log(`Moving character ${character_id} to`, to);
    // Update will happen through grid state
  }, []);

  const onEndTurn = useCallback(async () => {
    console.log('Turn ended for', activeCharacterId);

    if (!activeCharacterId) return;

    const is_user_character = user_characters.some(c => c.id === activeCharacterId);

    // For user characters with queued actions, perform adherence check
    if (is_user_character && currentTurnActions.length > 0) {
      console.log('🎲 User character has queued actions, performing adherence check...');

      // Convert queued actions to PlannedAction format
      const plan: PlannedAction = {
        action_sequence: currentTurnActions,
        plan_b: 'tactical'
      };

      // Clear the queue
      setCurrentTurnActions([]);

      // Call the existing plan submit handler which does adherence check
      await handlePlanSubmit(plan);

      // handlePlanSubmit will handle turn progression, so we return here
      return;
    }

    // For user characters with NO actions, trigger automatic rebellion (character takes matters into own hands)
    if (is_user_character) {
      console.log('😤 User ended turn with no actions - character rebels out of frustration!');

      const active_char = user_characters.find(c => c.id === activeCharacterId);
      if (active_char) {
        const battle_char = battleCharacters.get(active_char.id);
        if (battle_char) {
          // Generate rebellion action
          const action_state = actionStates.get(activeCharacterId);
          // Build proper battle_state structure for generateActionSurvey
          const mockBattleState = {
            teams: {
              player: {
                characters: user_characters.map(c => battleCharacters.get(c.id)).filter(Boolean) as BattleCharacter[]
              },
              opponent: {
                characters: opponent_characters.map(c => battleCharacters.get(c.id)).filter(Boolean) as BattleCharacter[]
              }
            }
          } as any;
          let survey = generateActionSurvey(
            battle_char,
            mockBattleState,
            action_state?.action_points_remaining || 3,
            gridRef.current
          );
          survey = applyRebellionWeighting(survey, battle_char);
          const rebellion_action = selectFromSurvey(survey);

          // Show notification
          addLogMessage(`😤 ${active_char.name} is frustrated by the lack of direction!`, 'system');
          setRebellionNotification({
            characterName: active_char.name,
            action: rebellion_action.label
          });

          // Execute rebellion after brief delay, then progress turn
          setTimeout(() => {
            executeRebellionAction(activeCharacterId, rebellion_action, battle_char);
            setRebellionNotification(null);

            // Progress to next turn after rebellion completes
            const current_index = turnOrder.indexOf(activeCharacterId || '');
            let next_index = (current_index + 1) % turnOrder.length;
            let next_character_id = turnOrder[next_index];

            // Skip knocked-out characters
            let attempts = 0;
            while (attempts < turnOrder.length) {
              const char_state = getBattleState(next_character_id);
              if (char_state && !char_state.is_knocked_out) break;
              next_index = (next_index + 1) % turnOrder.length;
              next_character_id = turnOrder[next_index];
              attempts++;
            }

            // Reset action state for next character
            if (next_character_id) {
              const new_states = new Map(actionStates);
              new_states.set(next_character_id, HexMovementEngine.initializeActionState(next_character_id));
              setActionStates(new_states);
            }

            setActiveCharacterId(next_character_id);
            const is_next_user = user_characters.some(c => c.id === next_character_id);
            setCurrentTurn(is_next_user ? 'user' : 'opponent');

            console.log('⏭️ Turn progressed after rebellion to:', next_character_id);
          }, 2000);

          return; // Turn progression happens in setTimeout above
        }
      }
    }

    // For AI characters, progress turn normally
    console.log('⏭️ AI turn or fallback, progressing turn normally');

    // Clear any queued actions
    setCurrentTurnActions([]);

    // Decrement cooldowns for active character
    setPowerCooldowns(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(powerId => {
        if (updated[powerId] > 0) {
          updated[powerId]--;
        }
      });
      return updated;
    });

    setSpellCooldowns(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(spellId => {
        if (updated[spellId] > 0) {
          updated[spellId]--;
        }
      });
      return updated;
    });

    // Clear action mode
    setActionMode(null);

    // Clear AI execution lock when ANY turn ends (not just matching character)
    // This prevents stale locks from blocking future AI turns
    aiExecutingRef.current = null;

    // Clear defensive buffs for the character whose turn just ended
    if (activeCharacterId) {
      setDefendingCharacters(prev => {
        const updated = new Set(prev);
        updated.delete(activeCharacterId);
        return updated;
      });
    }

    // Move to next character in turn order, skipping knocked-out characters
    const current_index = turnOrder.indexOf(activeCharacterId || '');
    let next_index = (current_index + 1) % turnOrder.length;
    let next_character_id = turnOrder[next_index];

    // Skip knocked-out characters (loop through turn order until we find an alive character)
    let attempts = 0;
    while (attempts < turnOrder.length) {
      const char_state = getBattleState(next_character_id);
      if (char_state && !char_state.is_knocked_out) {
        break; // Found an alive character
      }
      console.log(`⏭️ Skipping knocked-out character: ${next_character_id}`);
      next_index = (next_index + 1) % turnOrder.length;
      next_character_id = turnOrder[next_index];
      attempts++;
    }

    console.log(`Next character: ${next_character_id} (index ${next_index}/${turnOrder.length})`);

    // ALWAYS reset action state for next character (gives them fresh 3 AP)
    if (next_character_id) {
      const new_states = new Map(actionStates);
      new_states.set(next_character_id, HexMovementEngine.initializeActionState(next_character_id));
      setActionStates(new_states);
    }

    setActiveCharacterId(next_character_id);

    // Update currentTurn based on which team the next character belongs to
    const is_next_user_char = user_characters.some(c => c.id === next_character_id);
    setCurrentTurn(is_next_user_char ? 'user' : 'opponent');

    // Track round progression
    if (next_index === 0) {
      console.log('🔄 New round starting');

      // Reset AP for all characters at the start of the round
      const new_states = new Map(actionStates);
      turnOrder.forEach(char_id => {
        const current_state = new_states.get(char_id);
        if (current_state) {
          new_states.set(char_id, {
            ...current_state,
            action_points_remaining: current_state.max_action_points,
            actions_this_turn: [],
            can_move: true,
            can_attack: true,
            can_defend: true
          });
        } else {
          // Initialize if somehow missing
          new_states.set(char_id, HexMovementEngine.initializeActionState(char_id));
        }
      });
      setActionStates(new_states);
      console.log('✅ AP reset for all characters at round start');

      // Increment round counter and track turns
      // Note: Round limit check is handled by useEffect watching currentRound
      setTurnsInRound(0);
      setCurrentRound(prev => {
        const newRound = prev + 1;
        console.log(`📊 Round ${newRound} beginning`);
        addLogMessage(`Round ${newRound} begins!`, 'turn');
        return newRound;
      });
    } else {
      setTurnsInRound(prev => prev + 1);
    }
  }, [activeCharacterId, user_characters, opponent_characters, currentTurnActions, handlePlanSubmit, turnOrder, actionStates, addLogMessage, battleCharacters, applyRebellionWeighting, executeRebellionAction]);

  // AI Opponent Turn Handler - runs when it's an opponent character's turn
  useEffect(() => {
    if (!activeCharacterId || battleEnded) return;

    const is_user_character = user_characters.some(c => c.id === activeCharacterId);
    if (is_user_character) return; // Only handle opponent turns

    const active_char = opponent_characters.find(c => c.id === activeCharacterId);
    if (!active_char) return;

    // Prevent multiple executions for the same character turn
    // CRITICAL: Check and set ref ATOMICALLY to prevent race condition
    if (aiExecutingRef.current === activeCharacterId) {
      console.log('🤖 AI already executing for', active_char.name, '- skipping duplicate');
      return;
    }
    // Mark as executing IMMEDIATELY after guard check to prevent duplicate runs
    aiExecutingRef.current = activeCharacterId;

    console.log('🤖 AI opponent turn starting for', active_char.name);
    console.log('🤖 DEBUG: user_characters count:', user_characters.length);
    console.log('🤖 DEBUG: battleCharacterStates size:', battleCharacterStates.size);
    console.log('🤖 DEBUG: battleCharacterStates keys:', Array.from(battleCharacterStates.keys()));

    // Clear any existing timer before setting new one
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
    }

    // Delay AI action for visual feedback
    aiTimerRef.current = setTimeout(async () => {
      // Find alive user characters to target
      const alive_targets = user_characters.filter(c => {
        const state = getBattleState(c.id);
        console.log(`🤖 DEBUG: Checking ${c.name} (${c.id}), state:`, state);
        return state && !state.is_knocked_out && state.current_health > 0;
      });

      console.log('🤖 DEBUG: alive_targets count:', alive_targets.length);

      if (alive_targets.length === 0) {
        console.log('🤖 No targets available, ending turn');
        onEndTurn();
        return;
      }

      // Sort by HP (lowest first) - AI targets weakest
      alive_targets.sort((a, b) => {
        const state_a = getBattleState(a.id);
        const state_b = getBattleState(b.id);
        return (state_a?.current_health || 0) - (state_b?.current_health || 0);
      });

      const target = alive_targets[0];
      console.log(`🤖 AI targeting ${target.name} (HP: ${getBattleState(target.id)?.current_health})`);
      addLogMessage(`${active_char.name} targets ${target.name}!`, 'system');

      // Create AI action plan
      const ai_plan: PlannedAction = {
        action_sequence: [],
        plan_b: 'aggressive'
      };

      const ai_pos = grid.character_positions.get(activeCharacterId);
      const target_pos = grid.character_positions.get(target.id);

      if (ai_pos && target_pos) {
        // Simple distance check (range 1 for melee) - TO DO: use actual weapon range
        const dist = HexGridSystem.distance(ai_pos, target_pos);
        const weapon_range = 1;

        // Get actual AP from action state, not hardcoded
        const ai_action_state = actionStates.get(activeCharacterId);
        let current_ap = ai_action_state?.action_points_remaining || 3;
        let current_pos = ai_pos;
        console.log(`🤖 AI has ${current_ap} AP available`);

        // Move if out of range
        if (dist > weapon_range) {
          console.log(`🤖 Target out of range (${dist} > ${weapon_range}). Moving closer...`);

          // Find path to target
          const path = HexMovementEngine.findStraightPath(ai_pos, target_pos);

          // Find furthest reachable hex on path that allows attacking (need 2 AP for attack)
          // So we can spend at most (current_ap - 2) on movement if we want to attack
          // Or all AP if we just want to close gap

          const max_move_ap = Math.max(0, current_ap - 2); // Reserve 2 for attack
          const reachable_for_attack = HexMovementEngine.getReachableHexes(
            activeCharacterId, ai_pos, max_move_ap, grid
          );

          // Find a hex in the path that is also in reachable set
          // We want the one closest to target
          let best_move_hex: HexPosition | null = null;
          let min_dist_to_target = dist;

          for (const hex of reachable_for_attack) {
            const d = HexGridSystem.distance(hex, target_pos);
            if (d < min_dist_to_target) {
              min_dist_to_target = d;
              best_move_hex = hex;
            }
          }

          // If we can't move to attack, try moving as far as possible (spend all AP)
          if (!best_move_hex) {
            console.log('🤖 Cannot move to attack range. moving as far as possible.');
            const max_reach = HexMovementEngine.getReachableHexes(
              activeCharacterId, ai_pos, current_ap, grid
            );
            for (const hex of max_reach) {
              const d = HexGridSystem.distance(hex, target_pos);
              if (d < min_dist_to_target) {
                min_dist_to_target = d;
                best_move_hex = hex;
              }
            }
          }

          if (best_move_hex) {
            const move_cost = HexGridSystem.distance(ai_pos, best_move_hex);
            ai_plan.action_sequence.push({
              type: 'move',
              ap_cost: move_cost,
              target_hex: best_move_hex
            });
            current_ap -= move_cost;
            current_pos = best_move_hex; // Update logical position
            console.log(`🤖 Planned move to`, best_move_hex, `(cost: ${move_cost})`);
          }
        }

        // Check range again from new position
        const new_dist = HexGridSystem.distance(current_pos, target_pos);

        // RE-VERIFY target is still alive before attacking (fix for stale closure)
        const target_state_fresh = getBattleState(target.id);
        const target_still_valid = target_state_fresh && !target_state_fresh.is_knocked_out && target_state_fresh.current_health > 0;

        if (new_dist <= weapon_range && current_ap >= 2 && target_still_valid) {
          ai_plan.action_sequence.push({
            type: 'attack',
            ap_cost: 2,
            target_id: target.id,
            ability_type: 'basic_attack'
          });
          console.log('🤖 Planned attack on', target.id);
        } else if (current_ap >= 1) {
          // If can't attack, defend
          ai_plan.action_sequence.push({
            type: 'defend',
            ap_cost: 1
          });
          console.log('🤖 Planned defend (AP low or out of range)');
        }
      }

      // Execute the AI's action
      if (ai_plan.action_sequence.length > 0) {
        try {
          await executePlannedActions(activeCharacterId, ai_plan);
        } catch (error) {
          console.error('❌ Error executing AI actions:', error);
          addLogMessage(`Error during ${active_char.name}'s turn`, 'system');
        }
      } else {
        console.warn('🤖 AI could not formulate a plan!');
      }

      // End turn after a short delay for visual feedback
      setTimeout(() => {
        aiExecutingRef.current = null; // Clear ref when turn completes
        aiTimerRef.current = null; // Clear timer ref
        onEndTurn();
      }, 500); // Short delay just for visual feedback since executePlannedActions already has delays
    }, 800);

    // Cleanup: Only clear timer if switching to a DIFFERENT character
    // Don't clear if effect re-runs due to other dependency changes (like grid)
    const cleanup_char_id = activeCharacterId;
    return () => {
      // Only clear timer if we're switching away from this character
      // This prevents dependency changes from canceling an in-progress AI turn
      if (aiExecutingRef.current !== cleanup_char_id && aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [activeCharacterId, battleEnded, user_characters, opponent_characters, getBattleState, addLogMessage, executePlannedActions, onEndTurn, grid]);

  // Handle move character
  const handleMoveCharacter = useCallback((character_id: string, to: HexPosition) => {
    console.log(`Moving ${character_id} to`, to);
    // Movement logic handled by HexMovementEngine
  }, []);

  // Handle defend action - QUEUE instead of execute
  // Radial menu handlers
  const openRadialMenu = useCallback((screenX: number, screenY: number) => {
    // Radial menu extends ~120px from center in all directions
    // Adjust position to keep menu fully visible
    const MENU_RADIUS = 120;
    const padding = 20;

    let adjustedX = screenX;
    let adjustedY = screenY;

    // Only apply bounds checking if window is available (client-side)
    if (typeof window !== 'undefined') {
      // Keep within horizontal bounds
      if (screenX < MENU_RADIUS + padding) {
        adjustedX = MENU_RADIUS + padding;
      } else if (screenX > window.innerWidth - MENU_RADIUS - padding) {
        adjustedX = window.innerWidth - MENU_RADIUS - padding;
      }

      // Keep within vertical bounds (account for close button at bottom)
      if (screenY < MENU_RADIUS + padding) {
        adjustedY = MENU_RADIUS + padding;
      } else if (screenY > window.innerHeight - MENU_RADIUS - padding - 30) {
        adjustedY = window.innerHeight - MENU_RADIUS - padding - 30;
      }
    }

    setRadialMenuPosition({ x: adjustedX, y: adjustedY });
    setRadialMenuOpen(true);
    setRadialSubMenu(null);
    // User has interacted - hide "Click to Act" tutorial hint
    setHasActedOnce(true);
  }, []);

  const closeRadialMenu = useCallback(() => {
    setRadialMenuOpen(false);
    setRadialSubMenu(null);
  }, []);

  // Track which character we've already shown the turn notification for
  const lastNotifiedCharacterId = useRef<string | null>(null);

  // Turn start notification and auto-open radial menu for user characters
  useEffect(() => {
    if (!activeCharacterId || currentTurn !== 'user' || battleEnded) return;

    // Don't re-trigger if we already notified for this character
    if (lastNotifiedCharacterId.current === activeCharacterId) return;
    lastNotifiedCharacterId.current = activeCharacterId;

    const activeChar = user_characters.find(c => c.id === activeCharacterId);
    if (!activeChar) return;

    // Show turn notification
    setTurnStartNotification(`${activeChar.name}'s Turn!`);

    // Hide notification after 2 seconds (don't clear this timer - let it run)
    setTimeout(() => {
      setTurnStartNotification(null);
    }, 2000);

    // Auto-open radial menu after 1 second
    const menuTimer = setTimeout(() => {
      // Get character's screen position to open menu there
      const charPos = grid.character_positions.get(activeCharacterId);
      if (charPos) {
        const pixel = HexGridSystem.toPixel(charPos, hexSize);

        // Convert to screen coordinates (approximate - menu will adjust bounds)
        const screenX = window.innerWidth / 2 + pixel.x;
        const screenY = window.innerHeight / 2 + pixel.y;

        openRadialMenu(screenX, screenY);
      }
    }, 1000);

    return () => {
      clearTimeout(menuTimer);
    };
  }, [activeCharacterId, currentTurn, battleEnded, user_characters, grid.character_positions, hexSize, openRadialMenu]);

  const handleRadialMove = useCallback(() => {
    setActionMode(actionMode === 'move' ? null : 'move');
    closeRadialMenu();
  }, [actionMode, closeRadialMenu]);

  const handleRadialAttack = useCallback(() => {
    setActionMode(actionMode === 'attack' ? null : 'attack');
    closeRadialMenu();
  }, [actionMode, closeRadialMenu]);

  const handleRadialPowers = useCallback(() => {
    setRadialSubMenu('powers');
  }, []);

  const handleRadialSpells = useCallback(() => {
    setRadialSubMenu('spells');
  }, []);

  const handleRadialItems = useCallback(() => {
    setActionMode(actionMode === 'item' ? null : 'item');
    closeRadialMenu();
  }, [actionMode, closeRadialMenu]);

  const handleRadialBack = useCallback(() => {
    setRadialSubMenu(null);
  }, []);

  // Handle defend from radial menu (calls existing handleDefend and closes menu)
  const handleRadialDefend = useCallback(() => {
    // Will call handleDefend below after it's defined
  }, []);

  // Handle power selection from radial sub-menu
  const handleRadialSelectPower = useCallback((powerId: string) => {
    const power = equipped_powers.find(p => p.id === powerId);
    if (!power) return;

    setSelectedPower(power);
    setActionMode('power');
    closeRadialMenu();
    addLogMessage(`Select a target for ${power.name}`, 'system');
  }, [equipped_powers, closeRadialMenu, addLogMessage]);

  // Handle spell selection from radial sub-menu
  const handleRadialSelectSpell = useCallback((spellId: string) => {
    const spell = equipped_spells.find(s => s.id === spellId);
    if (!spell) return;

    setSelectedSpell(spell);
    setActionMode('spell');
    closeRadialMenu();
    addLogMessage(`Select a target for ${spell.name}`, 'system');
  }, [equipped_spells, closeRadialMenu, addLogMessage]);

  const handleDefend = useCallback(() => {
    if (!activeCharacterId || !active_action_state) return;

    const defend_action: ActionStep = {
      type: 'defend',
      ap_cost: 1
    };

    // Check if we have enough AP (simulate, don't execute)
    const used_ap = currentTurnActions.reduce((sum, a) => sum + a.ap_cost, 0);
    if (used_ap + defend_action.ap_cost > active_action_state.max_action_points) {
      addLogMessage('Not enough AP to queue this action!', 'system');
      return;
    }

    // Queue the action instead of executing
    setCurrentTurnActions(prev => [...prev, defend_action]);
    addLogMessage(`Queued: Defensive stance`, 'system');
    console.log('🗓️ Queued defend action');
  }, [activeCharacterId, active_action_state, currentTurnActions, addLogMessage]);

  // Handle power selection
  const handleUsePower = useCallback((powerId: string) => {
    const power = equipped_powers.find(p => p.id === powerId);
    if (!power) return;

    console.log(`⚡ Selected power: ${power.name}`);
    setSelectedPower(power);
    setSelectedSpell(null);
    setActionMode('power');
    addLogMessage(`Select target for ${power.name}`, 'system');
  }, [equipped_powers, addLogMessage]);

  // Handle spell selection
  const handleCastSpell = useCallback((spellId: string) => {
    const spell = equipped_spells.find(s => s.id === spellId);
    if (!spell) return;

    console.log(`✨ Selected spell: ${spell.name}`);
    setSelectedSpell(spell);
    setSelectedPower(null);
    setActionMode('spell');
    addLogMessage(`Select target for ${spell.name}`, 'system');
  }, [equipped_spells, addLogMessage]);

  // Initialize character positions - must re-run when characters change
  useEffect(() => {
    if (user_characters.length === 0 || opponent_characters.length === 0) {
      console.warn('⚠️ Cannot initialize positions - teams not loaded yet');
      return;
    }

    // Create new grid with new Map instances to trigger React re-render
    const new_grid = {
      ...grid,
      character_positions: new Map(grid.character_positions),
      terrain: new Map(grid.terrain),
      perimeter_attempts: new Map(grid.perimeter_attempts),
      perimeter_effects: new Map(grid.perimeter_effects)
    };
    const team1_positions = HexGridSystem.getTeam1StartPositions();
    const team2_positions = HexGridSystem.getTeam2StartPositions();

    console.log('📍 Setting character positions...');
    user_characters.forEach((char, index) => {
      new_grid.character_positions.set(char.id, team1_positions[index]);
      console.log(`  User ${char.name} at`, team1_positions[index]);
    });

    opponent_characters.forEach((char, index) => {
      new_grid.character_positions.set(char.id, team2_positions[index]);
      console.log(`  Opponent ${char.name} at`, team2_positions[index]);
    });

    setGrid(new_grid);
    console.log('✅ Grid initialized with', new_grid.character_positions.size, 'characters');
  }, [user_characters.length, opponent_characters.length]);

  // Build BattleCharacter records from live data + DB status effects
  useEffect(() => {
    if (user_characters.length === 0 || opponent_characters.length === 0) return;

    // Wait until grid has positions for all characters
    const allCharacters = [...user_characters, ...opponent_characters];
    const allHavePositions = allCharacters.every(c => grid.character_positions.has(c.id));
    if (!allHavePositions) {
      console.log('⏳ Waiting for grid positions before building battle characters...');
      return;
    }

    const buildBattleCharacters = async () => {
      const entries: Array<[string, BattleCharacter]> = [];

      for (const char of allCharacters) {
        const position = grid.character_positions.get(char.id) || char.position;
        if (!position) {
          throw new Error(`Missing hex position for character ${char.id} (${char.name})`);
        }

        const state = getBattleState(char.id);
        const isUserChar = user_characters.some(c => c.id === char.id);
        const teamMorale = isUserChar
          ? (user_team.current_morale ?? user_team.team_chemistry ?? 50)
          : (opponent_team.current_morale ?? opponent_team.team_chemistry ?? 50);

        const enrichedCharacter = {
          ...char,
          position,
          current_health: state?.current_health ?? char.current_health,
          current_mana: char.current_mana
        } as TeamCharacter;

        const battleChar = await convertToBattleCharacter(enrichedCharacter, teamMorale);
        entries.push([char.id, battleChar]);
      }

      setBattleCharacters(new Map(entries));
      console.log('✅ Battle characters built:', entries.length);
    };

    buildBattleCharacters().catch(error => {
      console.error('Failed to build battle characters from live data:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_characters.length, opponent_characters.length, user_team.current_morale, user_team.team_chemistry, opponent_team.current_morale, opponent_team.team_chemistry, grid.character_positions.size]);

  // Initialize action state for active character if somehow missing (fallback safety)
  useEffect(() => {
    if (activeCharacterId && !actionStates.has(activeCharacterId)) {
      const new_states = new Map(actionStates);
      new_states.set(activeCharacterId, HexMovementEngine.initializeActionState(activeCharacterId));
      setActionStates(new_states);
      console.warn('⚠️ Action state was missing for', activeCharacterId, '- initialized on demand');
    }
  }, [activeCharacterId]);

  // Calculate reachable hexes for movement (accounting for queued actions AP)
  const queued_ap_cost = currentTurnActions.reduce((sum, a) => sum + a.ap_cost, 0);
  const available_ap = active_action_state ? Math.max(0, active_action_state.action_points_remaining - queued_ap_cost) : 0;

  // If there's a queued move, calculate reachable hexes from the queued destination, not original position
  const last_queued_move = currentTurnActions.filter(a => a.type === 'move').pop();
  const effective_position = last_queued_move?.target_hex || active_character_pos;

  const reachable_hexes = effective_position && active_action_state && actionMode === 'move' && available_ap > 0
    ? HexMovementEngine.getReachableHexes(
      activeCharacterId!,
      effective_position,
      available_ap,
      grid
    )
    : [];

  // Calculate attackable characters using weapon range
  const attackable_characters = active_character_pos && active_action_state && actionMode === 'attack'
    ? (() => {
      // Get active character's weapon range
      const active_char = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
      const weapon_equipment = active_char?.equipped_items?.weapon;
      const weapon_type = weapon_equipment?.type || 'sword';
      const weapon_range = getWeaponRange(weapon_type as string, weapon_equipment?.range);

      return HexLineOfSight.getVisibleCharacters(
        active_character_pos,
        weapon_range, // Use character's actual weapon range!
        grid,
        [activeCharacterId!]
      ).filter(visible => {
        // Only allow attacks on opponent team
        const is_opponent_team = currentTurn === 'user'
          ? opponent_characters.some(c => c.id === visible.character_id)
          : user_characters.some(c => c.id === visible.character_id);
        return is_opponent_team;
      });
    })()
    : [];

  // Handle hex click
  const handleHexClick = useCallback((hexPos: HexPosition) => {
    if (battleStatus !== 'active') return;
    if (!activeCharacterId || !active_character_pos || !active_action_state) return;
    // Only allow user to interact during their turn
    if (currentTurn !== 'user') return;

    if (actionMode === 'move') {
      // Check if hex is reachable
      console.log('🔍 Clicking hex:', hexPos);
      console.log('  Active Char:', activeCharacterId);
      console.log('  Reachable Hexes:', reachable_hexes);

      // Use manual comparison to avoid potential object identity/method issues in HexGridSystem.equals
      const is_reachable = reachable_hexes.some(hex =>
        hex.q === hexPos.q && hex.r === hexPos.r && hex.s === hexPos.s
      );

      console.log('  Is Reachable?', is_reachable);

      if (is_reachable) {
        // Use effective position (queued destination or current position)
        const last_move = currentTurnActions.filter(a => a.type === 'move').pop();
        const from_pos = last_move?.target_hex || active_character_pos;
        const used_ap = currentTurnActions.reduce((sum, a) => sum + a.ap_cost, 0);
        const remaining_ap = active_action_state.action_points_remaining - used_ap;

        const validation = HexMovementEngine.canMoveTo(
          activeCharacterId,
          from_pos,
          hexPos,
          grid,
          remaining_ap
        );

        if (validation.valid) {
          const move_action: ActionStep = {
            type: 'move',
            ap_cost: validation.ap_cost,
            target_hex: hexPos
          };

          // Check if we have enough AP
          if (used_ap + move_action.ap_cost > active_action_state.max_action_points) {
            addLogMessage('Not enough AP to queue this action!', 'system');
            setActionMode(null);
            return;
          }

          // Queue the action instead of executing
          setCurrentTurnActions(prev => [...prev, move_action]);
          addLogMessage(`Queued: Move to (${hexPos.q}, ${hexPos.r})`, 'system');
          console.log('🗓️ Queued move action to', hexPos);

          setActionMode(null);
        }
      }
    } else if (actionMode === 'attack') {
      // Check if clicking on a character hex
      for (const [char_id, char_pos] of grid.character_positions) {
        if (HexGridSystem.equals(char_pos, hexPos)) {
          const can_attack = attackable_characters.some(a => a.character_id === char_id);

          if (can_attack) {
            const attack_action: ActionStep = {
              type: 'attack',
              ap_cost: 2,
              target_id: char_id,
              ability_type: 'basic_attack'
            };

            // Check if we have enough AP (simulate, don't execute)
            const used_ap = currentTurnActions.reduce((sum, a) => sum + a.ap_cost, 0);
            if (used_ap + attack_action.ap_cost > active_action_state.max_action_points) {
              addLogMessage('Not enough AP to queue this action!', 'system');
              setActionMode(null);
              return;
            }

            // Queue the action instead of executing
            const target_char = [...user_characters, ...opponent_characters].find(c => c.id === char_id);
            setCurrentTurnActions(prev => [...prev, attack_action]);
            addLogMessage(`Queued: Attack ${target_char?.name || char_id}`, 'system');
            console.log('🗓️ Queued attack action on', char_id);

            setActionMode(null);
          }
        }
      }
    }

    setSelectedHex(hexPos);
  }, [activeCharacterId, active_character_pos, active_action_state, actionMode, reachable_hexes, attackable_characters, grid, currentTurn, battleStatus, addLogMessage, currentTurnActions, user_characters, opponent_characters]);

  // Handle character token click
  const handleCharacterClick = useCallback((character_id: string, event?: React.MouseEvent) => {
    // Only allow user to interact during their turn
    if (currentTurn !== 'user') return;

    // If clicking on the active character (and not in an action mode), open radial menu
    if (character_id === activeCharacterId && !actionMode && event) {
      openRadialMenu(event.clientX, event.clientY);
      return;
    }

    if (actionMode === 'attack' && activeCharacterId && active_action_state) {
      const can_attack = attackable_characters.some(a => a.character_id === character_id);
      if (can_attack) {
        const attack_action: ActionStep = {
          type: 'attack',
          ap_cost: 2,
          target_id: character_id,
          ability_type: 'basic_attack'
        };

        // Check if we have enough AP (simulate, don't execute)
        const used_ap = currentTurnActions.reduce((sum, a) => sum + a.ap_cost, 0);
        if (used_ap + attack_action.ap_cost > active_action_state.max_action_points) {
          addLogMessage('Not enough AP to queue this action!', 'system');
          setActionMode(null);
          return;
        }

        // Queue the action instead of executing
        const target_char = [...user_characters, ...opponent_characters].find(c => c.id === character_id);
        setCurrentTurnActions(prev => [...prev, attack_action]);
        addLogMessage(`Queued: Attack ${target_char?.name || character_id}`, 'system');
        console.log('🗓️ Queued attack action on', character_id);

        setActionMode(null);
      }
    } else if (actionMode === 'power' && activeCharacterId) {
      // Use power on clicked character
      executePowerOnTarget(character_id);
    } else if (actionMode === 'spell' && activeCharacterId) {
      // Cast spell on clicked character
      executeSpellOnTarget(character_id);
    }
  }, [actionMode, activeCharacterId, active_action_state, attackable_characters, currentTurnActions, user_characters, opponent_characters, addLogMessage, currentTurn, openRadialMenu]);

  // Debug render state (disabled to reduce console spam - uncomment to debug)
  // console.log('🎨 Rendering HexBattleArena:', {
  //   user_count: user_characters.length,
  //   opponent_count: opponent_characters.length,
  //   grid_characters: grid.character_positions.size,
  //   activeCharacterId,
  //   currentTurn,
  //   turn_order_length: turnOrder.length
  // });

  // Prepare status bar character data
  const statusBarUserChars: StatusBarCharacter[] = user_characters.map(char => {
    const battleState = battleCharacterStates.get(char.id);
    return {
      id: char.id,
      name: char.name,
      current_health: battleState?.current_health ?? char.current_health,
      max_health: battleState?.max_health ?? char.max_health,
      is_knocked_out: battleState?.is_knocked_out ?? false,
    };
  });

  const statusBarOpponentChars: StatusBarCharacter[] = opponent_characters.map(char => {
    const battleState = battleCharacterStates.get(char.id);
    return {
      id: char.id,
      name: char.name,
      current_health: battleState?.current_health ?? char.current_health,
      max_health: battleState?.max_health ?? char.max_health,
      is_knocked_out: battleState?.is_knocked_out ?? false,
    };
  });

  // Prepare turn order characters for TurnOrderPanel
  const turnOrderCharacters: TurnOrderCharacter[] = turnOrder.map(charId => {
    const userChar = user_characters.find(c => c.id === charId);
    const oppChar = opponent_characters.find(c => c.id === charId);
    const char = userChar || oppChar;
    const battleState = battleCharacterStates.get(charId);
    const actionState = actionStates.get(charId);

    return {
      id: charId,
      name: char?.name || 'Unknown',
      isUserTeam: !!userChar,
      isActive: charId === activeCharacterId,
      isKnockedOut: battleState?.is_knocked_out ?? false,
      initiative: (char as any)?.initiative ?? (char as any)?.speed ?? 0,
      isDefending: false, // TODO: Track defending state if needed
    };
  });

  // Current character index in turn order
  const currentTurnIndex = turnOrder.indexOf(activeCharacterId || '');

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Top Status Bar - Team HP */}
      <BattleStatusBar
        userCharacters={statusBarUserChars}
        opponentCharacters={statusBarOpponentChars}
        activeCharacterId={activeCharacterId}
        currentTurn={currentTurn}
        roundNumber={currentRound}
      />

      {/* Turn Order Panel - Left side (hidden on mobile) */}
      <div className="hidden md:block">
        <TurnOrderPanel
          characters={turnOrderCharacters}
          currentCharacterIndex={currentTurnIndex}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* Left Panel: Execute Button + Battle Log - hidden on mobile, shown in bottom bar */}
      <div className="hidden md:flex w-52 bg-gray-900 border-r border-gray-700 p-3 flex-col">
        {/* Execute/End Turn Button - with top spacing to align with action buttons */}
        <div className="mt-8"></div>
        <button
          onClick={onEndTurn}
          disabled={battleStatus !== 'active'}
          className={`w-full py-3 rounded-lg font-bold text-sm mb-3 ${battleStatus === 'active'
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            } ${currentTurnActions.length > 0 ? 'ring-2 ring-purple-400 animate-pulse bg-purple-600 hover:bg-purple-700' : ''}`}
        >
          {currentTurnActions.length > 0 ? `⚡ Execute (${currentTurnActions.length})` : 'End Turn'}
        </button>

        {/* Queued actions display */}
        {currentTurnActions.length > 0 && (
          <div className="bg-purple-900/30 border border-purple-500 rounded-lg p-2 mb-3">
            <div className="text-xs text-purple-300 space-y-1">
              {currentTurnActions.map((a, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate">
                    {a.type === 'move' && `Move → (${a.target_hex?.q},${a.target_hex?.r})`}
                    {a.type === 'attack' && 'Attack'}
                    {a.type === 'defend' && 'Defend'}
                    {a.type === 'power' && (a.ability_name || 'Power')}
                    {a.type === 'spell' && (a.ability_name || 'Spell')}
                    {a.type === 'item' && 'Item'}
                  </span>
                  <span className="text-purple-400 ml-1">{a.ap_cost}AP</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCurrentTurnActions([])}
              className="mt-2 w-full text-xs py-1 bg-red-600/40 hover:bg-red-600 rounded text-red-200"
            >
              Clear
            </button>
          </div>
        )}

        {/* Battle Log - Takes remaining vertical space */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-purple-400">Battle Log</h3>
            <span className="text-xs text-gray-500">{battleLog.length}</span>
          </div>
          <div ref={battle_log_ref} className="flex-1 bg-gray-800 rounded-lg p-2 overflow-y-auto">
            {battleLog.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-4">
                Log appears here...
              </div>
            ) : (
              <div className="space-y-1">
                {battleLog.map(entry => (
                  <div
                    key={entry.id}
                    className={`text-xs p-1.5 rounded ${entry.type === 'crit' ? 'bg-yellow-900/30 text-yellow-300 font-bold' :
                      entry.type === 'dodge' ? 'bg-blue-900/30 text-blue-300' :
                        entry.type === 'knockout' ? 'bg-red-900/30 text-red-300 font-bold' :
                          entry.type === 'turn' ? 'bg-purple-900/30 text-purple-300 font-semibold' :
                            entry.type === 'attack' ? 'bg-orange-900/30 text-orange-300' :
                              'text-gray-300'
                      }`}
                  >
                    {entry.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Panel: Hex Grid */}
      <div
        className="flex-1 relative bg-gray-800 p-4 pb-20 md:pb-4 flex items-center justify-center overflow-hidden"
        ref={gridContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Zoom Controls - Visible on both mobile and desktop */}
        <div className="absolute top-2 right-2 z-30 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 bg-gray-700 text-white rounded-lg flex items-center justify-center text-lg font-bold"
          >
            +
          </button>
          <div className="text-xs text-gray-400 text-center">{Math.round(zoomLevel * 100)}%</div>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 bg-gray-700 text-white rounded-lg flex items-center justify-center text-lg font-bold"
          >
            −
          </button>
          {zoomLevel !== 1 && (
            <button
              onClick={handleResetZoom}
              className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs"
            >
              Reset
            </button>
          )}
          {/* Desktop zoom hint */}
          <div className="hidden md:block text-[8px] text-gray-500 text-center mt-1 leading-tight">
            Ctrl+Scroll<br/>Shift+Drag
          </div>
        </div>

        {/* Wrapper that matches canvas aspect ratio (1200x900 = 4:3) and scales together */}
        <div
          className="relative w-full transition-transform duration-100"
          style={{
            maxWidth: '1200px',
            aspectRatio: '4/3',
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)${screenShake ? ` translate(${(Math.random() - 0.5) * screenShake.intensity * 2}px, ${(Math.random() - 0.5) * screenShake.intensity * 2}px)` : ''}`,
            transformOrigin: 'center center',
            animation: screenShake ? `shake ${screenShake.duration}ms ease-in-out` : 'none'
          }}
        >
          <HexGrid
            grid={grid}
            hex_size={hexSize}
            onHexClick={handleHexClick}
            onHexHover={setHoveredHex}
            selected_hex={selectedHex}
            hovered_hex={hoveredHex}
          />

          {/* Character Tokens - positioned relative to the scaled container */}
          {[...user_characters, ...opponent_characters].map(character => {
            const position = grid.character_positions.get(character.id);
            if (!position) {
              console.warn(`⚠️ No position found for ${character.name} (${character.id})`);
              return null;
            }

            // Debug: Position logging disabled to reduce spam
            // console.log(`📍 Rendering ${character.name} at position:`, JSON.stringify(position));

            return (
              <CharacterToken
                key={character.id}
                character={character}
                position={position}
                hex_size={hexSize}
                is_active={character.id === activeCharacterId}
                is_user_team={user_characters.some(c => c.id === character.id)}
                onClick={(e) => handleCharacterClick(character.id, e)}
                clickable={actionMode !== 'move'} // Disable token clicks in move mode so hex clicks pass through
                show_tutorial_hint={!hasActedOnce}
                facing={user_characters.some(c => c.id === character.id) ? 0 : 3}
                is_hit={hitFlashCharacter === character.id}
                is_attacking={attackingCharacterId === character.id}
                combo_count={comboTracker.get(character.id)?.count || 0}
              />
            );
          })}

          {/* Action Overlay */}
          <ActionOverlay
            grid={grid}
            hex_size={hexSize}
            reachable_hexes={actionMode === 'move' ? reachable_hexes : []}
            attackable_positions={actionMode === 'attack' ? attackable_characters.map(a => a.position) : []}
            hovered_hex={hoveredHex}
            active_character_pos={active_character_pos}
          />

          {/* Floating Damage Numbers */}
          <AnimatePresence>
            {floating_numbers.map(floating_num => {
              const pixel_pos = HexGridSystem.toPixel(floating_num.position, hexSize);
              // Canvas center scales with hex size
              const canvas_center_x = hexSize * 20;
              const canvas_center_y = hexSize * 15;
              const canvas_width = hexSize * 40;
              const canvas_height = hexSize * 30;
              // Use percentages for responsive scaling
              const x_percent = ((pixel_pos.x + canvas_center_x) / canvas_width) * 100;
              const y_percent = ((pixel_pos.y + canvas_center_y) / canvas_height) * 100;
              // Random horizontal offset for variety
              const randomOffset = ((floating_num.id.charCodeAt(0) % 10) - 5) * 2;

              return (
                <motion.div
                  key={floating_num.id}
                  className="absolute pointer-events-none z-50"
                  style={{
                    left: `calc(${x_percent}% + ${randomOffset}px)`,
                    top: `${y_percent}%`,
                  }}
                  initial={{
                    opacity: 1,
                    y: 0,
                    scale: floating_num.type === 'crit' ? 1.5 : 1
                  }}
                  animate={{
                    opacity: 0,
                    y: -80,
                    scale: floating_num.type === 'crit' ? 1.2 : 0.8
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.2,
                    ease: "easeOut"
                  }}
                >
                  <div
                    className={`font-bold drop-shadow-lg transform -translate-x-1/2 -translate-y-1/2 ${
                      floating_num.type === 'crit' ? 'text-3xl text-yellow-300' :
                      floating_num.type === 'dodge' ? 'text-xl text-blue-300 italic' :
                      floating_num.type === 'heal' ? 'text-2xl text-green-400' :
                      'text-2xl text-red-400'
                    }`}
                    style={{
                      textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    {floating_num.type === 'dodge' ? 'MISS!' :
                     floating_num.type === 'crit' ? `CRIT! -${floating_num.damage}` :
                     floating_num.type === 'heal' ? `+${floating_num.damage}` :
                     `-${floating_num.damage}`}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Particle Effects */}
          <AnimatePresence>
            {particles.map(particle => {
              const canvas_center_x = hexSize * 20;
              const canvas_center_y = hexSize * 15;
              const canvas_width = hexSize * 40;
              const canvas_height = hexSize * 30;
              const x_percent = ((particle.x + canvas_center_x) / canvas_width) * 100;
              const y_percent = ((particle.y + canvas_center_y) / canvas_height) * 100;

              return (
                <motion.div
                  key={particle.id}
                  className="absolute pointer-events-none z-50"
                  style={{
                    left: `${x_percent}%`,
                    top: `${y_percent}%`,
                  }}
                  initial={{
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    y: 0
                  }}
                  animate={{
                    opacity: 0,
                    scale: particle.type === 'explosion' ? 2 : 0.5,
                    x: (Math.random() - 0.5) * 80,
                    y: (Math.random() - 0.5) * 80 - 30
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut"
                  }}
                >
                  <div
                    className={`rounded-full ${particle.type === 'explosion' ? 'w-4 h-4' : 'w-2 h-2'}`}
                    style={{
                      backgroundColor: particle.color,
                      boxShadow: `0 0 ${particle.type === 'explosion' ? '12px' : '6px'} ${particle.color}`
                    }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Bottom Control Bar - Only visible on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-40">
        {/* Row 1: Round/Turn indicator + Character HP */}
        <div className="flex items-center justify-between px-3 py-1 border-b border-gray-800">
          {/* Round & Turn */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">R{currentRound}</span>
            <span className={`text-xs font-bold ${currentTurn === 'user' ? 'text-blue-400' : 'text-red-400'}`}>
              {currentTurn === 'user' ? 'YOUR TURN' : 'ENEMY'}
            </span>
          </div>

          {/* Active Character HP Bar */}
          {activeCharacterId && (() => {
            const char = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
            const battleState = getBattleState(activeCharacterId);
            if (!char || !battleState) return null;
            const hpPercent = Math.max(0, (battleState.current_health / battleState.max_health) * 100);
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 truncate max-w-[80px]">{char.name}</span>
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{active_action_state?.action_points_remaining || 0}AP</span>
              </div>
            );
          })()}
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex gap-1 justify-center items-center p-2">
          {/* Log Button */}
          <button
            onClick={() => setShowMobileLog(!showMobileLog)}
            className={`px-2 py-2 rounded-lg text-sm ${showMobileLog ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            📜
          </button>

          {/* Queue Button (shows count if queued) */}
          <button
            onClick={() => setShowMobileQueue(!showMobileQueue)}
            className={`px-2 py-2 rounded-lg text-sm relative ${
              currentTurnActions.length > 0 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            📋
            {currentTurnActions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {currentTurnActions.length}
              </span>
            )}
          </button>

          {/* Execute/End Turn */}
          <button
            onClick={onEndTurn}
            disabled={battleStatus !== 'active'}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              currentTurnActions.length > 0
                ? 'bg-green-600 text-white animate-pulse'
                : battleStatus === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-500'
            }`}
          >
            {currentTurnActions.length > 0 ? '▶ GO' : '✓ End'}
          </button>

          {/* Move */}
          <button
            onClick={() => setActionMode(actionMode === 'move' ? null : 'move')}
            disabled={!activeCharacterId || currentTurn !== 'user'}
            className={`px-3 py-2 rounded-lg text-sm ${
              actionMode === 'move' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            🚶
          </button>

          {/* Attack */}
          <button
            onClick={() => setActionMode(actionMode === 'attack' ? null : 'attack')}
            disabled={!activeCharacterId || currentTurn !== 'user'}
            className={`px-3 py-2 rounded-lg text-sm ${
              actionMode === 'attack' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            ⚔️
          </button>

          {/* Defend */}
          <button
            onClick={handleDefend}
            disabled={!active_action_state?.can_defend || battleStatus !== 'active'}
            className="px-3 py-2 rounded-lg text-sm bg-gray-700 text-gray-300"
          >
            🛡️
          </button>

          {/* Powers/Spells */}
          <button
            onClick={() => setShowMobilePowers(!showMobilePowers)}
            disabled={!activeCharacterId || currentTurn !== 'user'}
            className={`px-2 py-2 rounded-lg text-sm ${showMobilePowers ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            ✨
          </button>

          {/* Skip Battle */}
          {!battleEnded && (
            <button
              onClick={handleSkipBattle}
              disabled={isSkippingBattle}
              className="px-2 py-2 rounded-lg text-sm bg-yellow-600 text-white"
            >
              ⏩
            </button>
          )}
        </div>
      </div>

      {/* Mobile Battle Log Overlay */}
      {showMobileLog && (
        <div className="md:hidden fixed bottom-24 left-2 right-2 max-h-48 bg-gray-900 border border-gray-700 rounded-lg z-50 overflow-hidden">
          <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <span className="text-sm font-bold text-purple-400">Battle Log</span>
            <button onClick={() => setShowMobileLog(false)} className="text-gray-400 text-lg">×</button>
          </div>
          <div className="p-2 overflow-y-auto max-h-36">
            {battleLog.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-2">No events yet...</div>
            ) : (
              <div className="space-y-1">
                {battleLog.slice(-15).map(entry => (
                  <div
                    key={entry.id}
                    className={`text-xs p-1 rounded ${
                      entry.type === 'crit' ? 'bg-yellow-900/30 text-yellow-300' :
                      entry.type === 'knockout' ? 'bg-red-900/30 text-red-300' :
                      entry.type === 'turn' ? 'bg-purple-900/30 text-purple-300' :
                      'text-gray-300'
                    }`}
                  >
                    {entry.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Queued Actions Overlay */}
      {showMobileQueue && (
        <div className="md:hidden fixed bottom-24 left-2 right-2 bg-gray-900 border border-purple-500 rounded-lg z-50 overflow-hidden">
          <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <span className="text-sm font-bold text-purple-400">Queued Actions</span>
            <button onClick={() => setShowMobileQueue(false)} className="text-gray-400 text-lg">×</button>
          </div>
          <div className="p-2 space-y-1">
            {currentTurnActions.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-2">No actions queued. Use Move/Attack/etc to queue actions.</div>
            ) : (
              currentTurnActions.map((a, i) => (
                <div key={i} className="flex justify-between text-xs bg-purple-900/30 p-1.5 rounded">
                  <span>
                    {a.type === 'move' && `🚶 Move → (${a.target_hex?.q},${a.target_hex?.r})`}
                    {a.type === 'attack' && '⚔️ Attack'}
                    {a.type === 'defend' && '🛡️ Defend'}
                    {a.type === 'power' && `✨ ${a.ability_name || 'Power'}`}
                    {a.type === 'spell' && `🔮 ${a.ability_name || 'Spell'}`}
                  </span>
                  <span className="text-purple-400">{a.ap_cost}AP</span>
                </div>
              ))
            )}
          </div>
          {currentTurnActions.length > 0 && (
            <div className="p-2 border-t border-gray-700">
              <button
                onClick={() => { setCurrentTurnActions([]); setShowMobileQueue(false); }}
                className="w-full text-xs py-1.5 bg-red-600/40 hover:bg-red-600 rounded text-red-200"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Powers/Spells Overlay */}
      {showMobilePowers && activeCharacterId && (
        <div className="md:hidden fixed bottom-24 left-2 right-2 max-h-64 bg-gray-900 border border-indigo-500 rounded-lg z-50 overflow-hidden">
          <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <span className="text-sm font-bold text-indigo-400">Powers & Spells</span>
            <button onClick={() => setShowMobilePowers(false)} className="text-gray-400 text-lg">×</button>
          </div>
          <div className="p-2 overflow-y-auto max-h-48">
            {(() => {
              const char = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
              if (!char) return <div className="text-gray-500 text-xs">No character selected</div>;

              const powers = char.powers || [];
              const spells = char.spells || [];

              return (
                <div className="space-y-2">
                  {powers.length > 0 && (
                    <div>
                      <div className="text-xs text-orange-400 font-bold mb-1">Powers</div>
                      {powers.map((power: any) => (
                        <button
                          key={power.id}
                          onClick={() => {
                            setSelectedPower(power);
                            setActionMode('power');
                            setShowMobilePowers(false);
                          }}
                          className="w-full text-left p-2 mb-1 bg-orange-900/30 hover:bg-orange-900/50 rounded text-xs"
                        >
                          <div className="font-bold text-orange-300">{power.name}</div>
                          <div className="text-gray-400">{power.ap_cost}AP • {power.description?.slice(0, 50)}...</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {spells.length > 0 && (
                    <div>
                      <div className="text-xs text-blue-400 font-bold mb-1">Spells</div>
                      {spells.map((spell: any) => (
                        <button
                          key={spell.id}
                          onClick={() => {
                            setSelectedSpell(spell);
                            setActionMode('spell');
                            setShowMobilePowers(false);
                          }}
                          className="w-full text-left p-2 mb-1 bg-blue-900/30 hover:bg-blue-900/50 rounded text-xs"
                        >
                          <div className="font-bold text-blue-300">{spell.name}</div>
                          <div className="text-gray-400">{spell.mana_cost}MP • {spell.description?.slice(0, 50)}...</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {powers.length === 0 && spells.length === 0 && (
                    <div className="text-gray-500 text-xs text-center py-4">No abilities available</div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Radial Menu - Click on active character to open */}
      <RadialMenu
        isOpen={radialMenuOpen && !radialSubMenu}
        position={radialMenuPosition}
        onClose={closeRadialMenu}
        canMove={active_action_state?.can_move ?? false}
        canAttack={active_action_state?.can_attack ?? false}
        canDefend={active_action_state?.can_defend ?? false}
        currentAP={active_action_state?.action_points_remaining ?? 0}
        activeMode={actionMode}
        onMoveClick={handleRadialMove}
        onAttackClick={handleRadialAttack}
        onDefendClick={() => {
          handleDefend();
          closeRadialMenu();
        }}
        onPowersClick={handleRadialPowers}
        onSpellsClick={handleRadialSpells}
        onItemsClick={handleRadialItems}
        powersCount={equipped_powers.length}
        spellsCount={equipped_spells.length}
        itemsCount={(() => {
          const active_char = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
          return ((active_char as any)?.consumable_items || []).length;
        })()}
        isPlayerTurn={currentTurn === 'user' && battleStatus === 'active'}
      />

      {/* Radial Sub-Menu for Powers */}
      <RadialSubMenu
        isOpen={radialMenuOpen && radialSubMenu === 'powers'}
        type="powers"
        position={radialMenuPosition}
        onClose={closeRadialMenu}
        onBack={handleRadialBack}
        powers={equipped_powers}
        powerCooldowns={power_cooldowns}
        onSelectPower={handleRadialSelectPower}
        currentAP={active_action_state?.action_points_remaining ?? 0}
      />

      {/* Radial Sub-Menu for Spells */}
      <RadialSubMenu
        isOpen={radialMenuOpen && radialSubMenu === 'spells'}
        type="spells"
        position={radialMenuPosition}
        onClose={closeRadialMenu}
        onBack={handleRadialBack}
        spells={equipped_spells}
        spellCooldowns={spell_cooldowns}
        onSelectSpell={handleRadialSelectSpell}
        currentAP={active_action_state?.action_points_remaining ?? 0}
        currentMana={(() => {
          const active_char = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
          return active_char?.current_mana ?? 100;
        })()}
        maxMana={(() => {
          const active_char = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
          return active_char?.max_mana ?? 100;
        })()}
      />

      {/* Settings button (floating) */}
      <div className="fixed top-20 right-4 z-30 flex gap-2">
        {!battleEnded && (
          <button
            onClick={handleSkipBattle}
            disabled={isSkippingBattle}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors shadow-lg ${isSkippingBattle
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
          >
            {isSkippingBattle ? 'Simulating...' : '⚡ Skip'}
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors shadow-lg"
            title="Battle Settings"
          >
            <Settings size={20} />
          </button>

          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-4">
              <h3 className="text-sm font-bold text-white mb-3">Battle Settings</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Enable Turn Planning</span>
                <button
                  onClick={() => setEnablePlanningMode(!enablePlanningMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${enablePlanningMode ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${enablePlanningMode ? 'translate-x-6' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {enablePlanningMode
                  ? "Plan your moves carefully before executing."
                  : "Moves happen immediately (Live Mode)."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Active Character Portrait Panel - Right Side */}
      {activeCharacterId && !battleEnded && (() => {
        const activeChar = [...user_characters, ...opponent_characters].find(c => c.id === activeCharacterId);
        if (!activeChar) return null;
        const battleState = getBattleState(activeCharacterId);
        const isUserChar = user_characters.some(c => c.id === activeCharacterId);
        const hpPercent = battleState ? Math.max(0, (battleState.current_health / battleState.max_health) * 100) : 100;

        let imagePath = '/images/placeholder.png';
        try {
          imagePath = getColosseaumImagePath(activeChar);
        } catch (e) {
          // Fallback if image path fails
        }

        return (
          <div className="fixed top-36 right-4 z-30 w-48 bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl overflow-hidden hidden sm:block">
            {/* Character Image */}
            <div className="relative h-48 bg-gradient-to-b from-gray-800 to-gray-900">
              <img
                src={imagePath}
                alt={activeChar.name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder.png';
                }}
              />
              {/* Turn indicator overlay */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${
                isUserChar ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {isUserChar ? 'YOUR TURN' : 'ENEMY'}
              </div>
            </div>

            {/* Character Info */}
            <div className="p-3">
              <h3 className={`font-bold text-lg truncate ${isUserChar ? 'text-blue-400' : 'text-red-400'}`}>
                {activeChar.name}
              </h3>

              {/* HP Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>HP</span>
                  <span>{battleState?.current_health ?? activeChar.current_health}/{battleState?.max_health ?? activeChar.max_health}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>

              {/* AP Display */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">AP</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(ap => (
                    <div
                      key={ap}
                      className={`w-4 h-4 rounded-full border-2 ${
                        (active_action_state?.action_points_remaining ?? 0) >= ap
                          ? 'bg-yellow-500 border-yellow-400'
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hint text when it's player's turn - only show as tutorial (first time) */}
      {currentTurn === 'user' && battleStatus === 'active' && !radialMenuOpen && activeCharacterId && !hasActedOnce && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 bg-gray-800/90 px-4 py-2 rounded-lg border border-gray-600 text-sm text-gray-300 shadow-lg">
          Click on your active character to open the action menu
        </div>
      )}

      {/* Character Action Planner */}
      {showActionPlanner && activeCharacterId && (() => {
        if (battleCharacters.size === 0) return null;

        const active_char = user_characters.find(c => c.id === activeCharacterId);
        if (!active_char) return null;

        const active_char_pos = grid.character_positions.get(activeCharacterId);
        if (!active_char_pos) return null;

        // Get reachable hexes for planning (3 AP max)
        const planning_reachable_hexes = HexMovementEngine.getReachableHexes(
          activeCharacterId,
          active_char_pos,
          3,
          grid
        );

        const baseBattleChar = battleCharacters.get(active_char.id);
        if (!baseBattleChar) {
          throw new Error(`BattleCharacter not built for ${active_char.id} (${active_char.name})`);
        }

        // Apply live cooldown state
        const battle_char: BattleCharacter = {
          ...baseBattleChar,
          power_cooldowns: new Map(Object.entries(power_cooldowns)),
          spell_cooldowns: new Map(Object.entries(spell_cooldowns))
        };

        const enemy_battle_chars = opponent_characters.map(opp => {
          const bc = battleCharacters.get(opp.id);
          if (!bc) {
            throw new Error(`BattleCharacter not built for opponent ${opp.id} (${opp.name})`);
          }
          return bc;
        });

        const ally_battle_chars = user_characters
          .filter(c => c.id !== activeCharacterId)
          .map(ally => {
            const bc = battleCharacters.get(ally.id);
            if (!bc) {
              throw new Error(`BattleCharacter not built for ally ${ally.id} (${ally.name})`);
            }
            return bc;
          });

        return (
          <CharacterActionPlanner
            character={battle_char}
            enemy_characters={enemy_battle_chars}
            ally_characters={ally_battle_chars}
            current_hex={active_char_pos}
            reachable_hexes={planning_reachable_hexes}
            grid={grid}
            onClose={() => setShowActionPlanner(false)}
            onSavePlan={handlePlanSubmit}
            onTimeout={() => {
              // Timer expired - character acts autonomously
              console.log('⏰ Timer expired - character will act autonomously');
              addLogMessage(`${battle_char.character.name}'s decision time expired! Acting independently...`, 'system');
              setShowActionPlanner(false);
              // Character will use autonomous action (no plan submitted)
            }}
            existing_plan={characterPlans.get(activeCharacterId) || undefined}
            team_morale={user_team.current_morale || 75}
          />
        );
      })()}



      {/* Battle Start Countdown Overlay */}
      {battleStatus === 'preparing' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-pulse">
          <div className="text-8xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-bounce">
            {countdown > 0 ? countdown : 'FIGHT!'}
          </div>
          <div className="text-2xl font-bold text-gray-200 mt-4 tracking-widest uppercase">
            Battle Starting
          </div>
        </div>
      )}

      {/* Turn Start Notification - don't show if battle ended */}
      <AnimatePresence>
        {turnStartNotification && !battleEnded && (
          <motion.div
            className="fixed top-1/4 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none"
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 border-2 border-yellow-300 rounded-xl px-8 py-4 shadow-2xl shadow-yellow-500/50">
              <div className="text-center">
                <div className="text-3xl font-bold text-white drop-shadow-lg">
                  ⚔️ {turnStartNotification} ⚔️
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rebellion Notification Overlay - MUST be visible! */}
      {rebellionNotification && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]">
          <div className="bg-red-900 border-4 border-red-500 rounded-xl px-10 py-6 shadow-2xl shadow-red-500/70 animate-pulse">
            <div className="text-center">
              <div className="text-5xl mb-2">💀 REBELLION! 💀</div>
              <div className="text-2xl font-bold text-red-300">{rebellionNotification.characterName}</div>
              <div className="text-lg text-red-200 mt-2">REFUSES your orders!</div>
              <div className="text-xl font-bold text-yellow-300 mt-2 bg-black/50 px-4 py-2 rounded">{rebellionNotification.action}</div>
            </div>
          </div>
        </div>
      )}

      {/* Victory/Defeat Screen */}
      {battleEnded && battleResult && showResultOverlay && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border-4 p-8 max-w-md w-full text-center"
            style={{
              borderColor: battleResult.winner === 'user' ? '#10b981' : '#ef4444'
            }}>
            {/* Result Header */}
            <div className="text-6xl mb-4">
              {battleResult.winner === 'user' ? '🎉' : '💀'}
            </div>
            <h2 className={`text-4xl font-bold mb-4 ${battleResult.winner === 'user' ? 'text-green-400' : 'text-red-400'
              }`}>
              {battleResult.winner === 'user' ? 'VICTORY!' : 'DEFEAT!'}
            </h2>

            {/* Stats */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Your Team HP:</span>
                <span className={`font-bold ${battleResult.user_health > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {battleResult.user_health}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Enemy Team HP:</span>
                <span className={`font-bold ${battleResult.opponent_health > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {battleResult.opponent_health}
                </span>
              </div>
            </div>

            {/* XP Rewards */}
            {xpRewards.length > 0 && (
              <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-lg p-4 mb-6 border border-purple-500/30">
                <div className="text-sm font-semibold text-purple-300 mb-2 flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  Experience Gained
                </div>
                <div className="space-y-1">
                  {xpRewards.map((reward, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-300">{reward.characterName}</span>
                      <span className="text-yellow-400 font-bold">+{reward.xpGained} XP</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-purple-500/30 flex justify-between text-sm font-semibold">
                  <span className="text-gray-300">Total</span>
                  <span className="text-yellow-300">+{xpRewards.reduce((sum, r) => sum + r.xpGained, 0)} XP</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setShowResultOverlay(false)}
                className="w-full py-3 rounded-lg font-semibold bg-gray-700 text-white hover:bg-gray-600 border border-gray-600"
              >
                Review Battle Log
              </button>

              <button
                onClick={() => onExitBattle ? onExitBattle() : window.location.reload()}
                className={`w-full py-3 rounded-lg font-semibold text-white ${battleResult.winner === 'user'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-open Results Button (only visible when battle ended but overlay hidden) */}
      {battleEnded && !showResultOverlay && (
        <div className="absolute top-4 right-4 z-40">
          <button
            onClick={() => setShowResultOverlay(true)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 hover:bg-gray-700 font-semibold shadow-lg"
          >
            Show Results
          </button>
        </div>
      )}

      {/* D20 Dice Roll Display */}
      <DiceRoll diceRolls={diceRolls} />
      </div>{/* End Main content area */}
    </div>
  );
};
