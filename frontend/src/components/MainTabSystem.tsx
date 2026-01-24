'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
// Removed unused framer-motion import - SafeMotion used instead
import {
  Users, Dumbbell, Sword, Home, ShoppingBag,
  Database, TrendingUp, Package, MessageCircle,
  Sparkles, Crown, Building, Target, Brain,
  Trophy, ChevronDown, ChevronRight, Activity, Shield,
  User, Eye, EyeOff, BarChart3, DollarSign,
  AlertTriangle, Heart, Clock, Scale, Zap, Mail, MessageSquare, Flame, Wand2, Award, Coffee
} from 'lucide-react';
import type { Equipment } from '@/data/equipment';
import { convertCharactersToTeamCharacters } from '@/utils/characterConversion';
import type { Contestant } from '@blankwars/types';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';

interface InventoryItem {
  slot: string;
  is_equipped: boolean;
}

interface MatchOpponent {
  id: string;
  name: string;
}

interface MatchCriteria {
  level_range?: number;
  preferred_mode?: string;
}

interface UserTeam {
  id: string;
  name: string;
  members: Contestant[];
  // Additional Team properties
  coach_name: string;
  characters: Contestant[];  // Team characters from battle system
  coaching_points: number;
  consecutive_losses: number;
  team_chemistry: number;
  team_culture: 'family' | 'balanced' | 'military' | 'divas' | 'chaos' | 'brotherhood';
  average_level: number;
  total_power: number;
  psychology_score: number;
  wins: number;
  losses: number;
  battles_played: number;
  last_battle_date: Date;
}

import CoachProgressionPage from '@/app/coach/page';

// Import stable components
import TeamHeadquarters from './TeamHeadquarters';
import KitchenTablePage from './KitchenTablePage';
import PerformanceCoachingChatScene from './PerformanceCoachingChatScene';
import EquipmentAdvisorChat from './EquipmentAdvisorChat';
import AbilitiesDevelopmentChat from './AbilitiesDevelopmentChat';
import PowerDevelopmentChat from './PowerDevelopmentChat';
import SpellDevelopmentChat from './SpellDevelopmentChat';
import ProgressionChat from './ProgressionChat';
import { getCharacterImagePath, getCharacterImageSet } from '../utils/characterImageUtils';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';

import TeamBuildingActivities from './TeamBuildingActivities';

// Import components directly to fix crashes
import TrainingGrounds from './TrainingGrounds';
import ProgressionDashboard from './ProgressionDashboard';
import Clubhouse from './Clubhouse';
import SocialMessageBoard from './SocialMessageBoard';
import MerchStore from './MerchStore';
import CharacterShop from './CharacterShop';
import EquipmentManager from './EquipmentManager';
import TeamEquipmentManager from './TeamEquipmentManager';
import InventoryManager from './InventoryManager';
import InventoryManagerWrapper from './InventoryManagerWrapper';
import CombinedEquipmentManager from './CombinedEquipmentManager';
import PowerManager from './PowerManager';
import AttributesManagerWrapper from './AttributesManagerWrapper';
import ResourcesManagerWrapper from './ResourcesManagerWrapper';
import SpellManager from './SpellManager';
// ARCHIVED: import SpellManagerWrapper from './SpellManagerWrapper'; // Replaced by AbilitiesManagerWrapper
import MembershipSelection from './MembershipSelection';
import TrainingFacilitySelector from './TrainingFacilitySelector';
import RealEstateAgentChat from './RealEstateAgentChat';
import FacilitiesManager from './FacilitiesManager';
// import CharacterDatabase from './CharacterDatabase'; // ARCHIVED - not in use
// CoachingInterface is lazy-loaded below
import TeamManagementCoaching from './TeamManagementCoaching';
import TherapyModule from './TherapyModule';
import IndividualSessionsWrapper from './IndividualSessionsWrapper';
import CombinedGroupActivitiesWrapper from './CombinedGroupActivitiesWrapper';
import FinancialAdvisorChat from './FinancialAdvisorChat';
import CardPacksWrapper from './CardPacksWrapper';
import HealingCenter from './HealingCenter';
import { BattleErrorBoundary } from './ErrorBoundary';
import Mailbox from './Mailbox';
import TeamRoster from './TeamRoster';
import TeamRosterWrapper from './TeamRosterWrapper';
import EmployeeLounge from './EmployeeLounge';
import { characterAPI } from '@/services/apiClient';
import { mailApi } from '@/services/mailApi';
import { calculateBattleXP } from '@/data/experience';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

// Hook to preserve scroll position across re-renders
const useScrollPreservation = (key: string) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const saved_scroll_positions = useRef<Map<string, number>>(new Map());

  const saveScrollPosition = () => {
    if (scrollRef.current) {
      saved_scroll_positions.current.set(key, scrollRef.current.scrollTop);
    }
  };

  const restoreScrollPosition = () => {
    if (scrollRef.current) {
      const saved_position = saved_scroll_positions.current.get(key) || 0;
      scrollRef.current.scrollTop = saved_position;
    }
  };

  useEffect(() => {
    // Restore scroll position after component mounts/updates
    const timeout_id = setTimeout(restoreScrollPosition, 0);
    return () => clearTimeout(timeout_id);
  });

  return {
    scrollRef,
    saveScrollPosition,
    restoreScrollPosition
  };
};

// Lazy load non-critical components
const BattleMatchmaking = lazy(() => import('./CompetitiveMatchmaking'));
const HexBattleArena = lazy(() => import('./battle/HexBattleArena').then(module => ({ default: module.HexBattleArena })));
const TeamBuilder = lazy(() => import('./TeamBuilder'));

// Battle Setup Wrapper - Internal component for Battle Lobby
interface BattleSetupWrapperProps {
  user_team: UserTeam | null;
  global_selected_character_id: string | null;
  set_global_selected_character_id: (id: string) => void;
  isMobile: boolean;
}

const BattleSetupWrapper: React.FC<BattleSetupWrapperProps> = ({
  user_team,
  global_selected_character_id,
  set_global_selected_character_id,
  isMobile
}) => {
  const [isInBattle, setIsInBattle] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
  const [characters_loading, setCharactersLoading] = useState(true);
  const battle_character_scroll_preservation = useScrollPreservation('battle-characters');

  // Function to reload characters (used after XP awards)
  const loadUserCharacters = async () => {
    try {
      const characters = await characterAPI.get_user_characters();
      const enhanced_characters = characters.map((char: Contestant) => ({
        ...char,
        base_name: char.character_id || char.name.toLowerCase(),
        display_bond_level: char.bond_level || 0
      }));
      setAvailableCharacters(enhanced_characters);
    } catch (error) {
      console.error('Error reloading characters:', error);
    }
  };

  // WebSocket hook for battle matchmaking
  const { findMatch, isConnected, isAuthenticated, endBattle } = useBattleWebSocket({
    onMatchFound: (data: any) => {
      console.log('Match found:', data);
      if (data.status === 'found' && data.battle_id) {
        setIsSearching(false);
        setIsInBattle(true);
      } else if (data.error) {
        console.error('Match error:', data.error);
        setIsSearching(false);
      }
    },
    onBattleStart: (data) => {
      console.log('Battle starting:', data);
      setIsSearching(false);
      setIsInBattle(true);
    },
    onError: (error) => {
      console.error('Battle error:', error);
      setIsSearching(false);
    }
  });

  // Debug WebSocket state
  console.log('🔍 WebSocket Debug:', { isConnected, isAuthenticated });

  // Listen for match result via window event (workaround for handler issue)
  useEffect(() => {
    const handleMatchResult = (event: CustomEvent) => {
      const data = event.detail;
      console.log('🎯 Match result received via event:', data);
      console.log('🎯 Status:', data.status, 'Battle ID:', data.battle_id);
      if (data.status === 'found') {
        console.log('🎯 Starting battle!');
        setMatchData(data); // Store the match data including opponent info
        setIsSearching(false);
        setShowModeSelection(false);
        setIsInBattle(true);
      } else if (data.error) {
        console.error('Match error:', data.error);
        setIsSearching(false);
      }
    };

    window.addEventListener('battle_match_result', handleMatchResult as EventListener);
    return () => {
      window.removeEventListener('battle_match_result', handleMatchResult as EventListener);
    };
  }, []);

  // Load characters for the lobby sidebar
  useEffect(() => {
    let cancelled = false; // Cleanup flag to prevent state updates after unmount

    const loadCharacters = async () => {
      try {
        const characters = await characterAPI.get_user_characters();
        if (cancelled) return; // Don't update state if component unmounted

        const enhanced_characters = characters.map((char: Contestant) => ({
          ...char,
          base_name: char.character_id || char.name.toLowerCase(),
          display_bond_level: char.bond_level || 0
        }));
        setAvailableCharacters(enhanced_characters);
        setCharactersLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading battle characters:', error);
        setCharactersLoading(false);
      }
    };
    loadCharacters();

    return () => { cancelled = true; }; // Cleanup on unmount
  }, []);

  const selected_character = useMemo(() => {
    if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
    return available_characters.find(c => c && c.base_name === global_selected_character_id) || available_characters[0];
  }, [available_characters, global_selected_character_id]);

  if (isInBattle) {
    console.log('🎮 Battle loading with matchData:', matchData);
    console.log('🎮 opponent_team in matchData:', matchData?.opponent_team);

    // Wait for matchData with valid opponent_team before rendering battle
    // This prevents race condition where battle UI mounts before match data arrives
    if (!matchData?.opponent_team?.characters?.length) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white text-xl">Loading battle...</p>
            <p className="text-gray-400 text-sm mt-2">Waiting for opponent data</p>
          </div>
        </div>
      );
    }

    return (
      <BattleErrorBoundary>
        {user_team && user_team.characters.length >= 3 ? (
          <HexBattleArena
            user_team={{
              ...user_team,
              characters: convertCharactersToTeamCharacters(user_team.characters)
            }}
            opponent_team={matchData?.opponent_team ? {
              id: matchData.opponent_team.id,
              name: matchData.opponent_team.name,
              coach_name: matchData.opponent_team.coach_name,
              characters: (matchData.opponent_team.characters || []).map((c: any) => ({
                id: c.id,
                character_id: c.character_id,
                name: c.name,
                title: c.title,
                nickname: c.nickname || c.name,
                level: c.level || 1,
                current_health: c.current_health || 100, // Default to 100 if missing
                max_health: c.max_health || c.current_max_health || 100, // Default to 100 if both missing
                current_max_health: c.current_max_health || c.max_health || 100,
                // Map combat stats to TeamCharacter interface fields
                strength: c.attack || 50,  // Used for damage calculation
                defense: c.defense || 50,
                speed: c.speed || 50,
                dexterity: c.dexterity || 50,
                intelligence: c.intelligence || 50,
                wisdom: c.wisdom || 50,
                charisma: c.charisma || 50,
                spirit: c.spirit || 50,
                // Legacy fields for backward compatibility
                attack: c.attack,
                abilities: c.abilities || [],
                avatar: c.avatar_emoji,
                avatar_emoji: c.avatar_emoji,
                archetype: c.archetype,
                status_effects: [],
                injuries: [],
                equipment_bonuses: { hp: 0, atk: 0, def: 0, spd: 0, accuracy: 0, crit_rate: 0 }
              })),
              coaching_points: 10,
              consecutive_losses: 0,
              team_chemistry: 75,
              team_culture: 'balanced',
              average_level: 1,
              total_power: 0,
              psychology_score: 50,
              wins: 0,
              losses: 0,
              battles_played: 0,
              last_battle_date: null
            } : {
              id: 'fallback-opponent',
              name: 'Loading...',
              coach_name: 'AI Coach',
              characters: [],
              coaching_points: 0,
              consecutive_losses: 0,
              team_chemistry: 0,
              team_culture: 'balanced',
              average_level: 0,
              total_power: 0,
              psychology_score: 0,
              wins: 0,
              losses: 0,
              battles_played: 0,
              last_battle_date: null
            }}
            onBattleEnd={async (result) => {
              console.log('Battle ended:', result);
              const isVictory = result.winner === 'user';

              // FIRST: Unlock characters from battle (so XP can be awarded)
              if (matchData?.battle_id) {
                console.log('🏁 Calling endBattle for:', matchData.battle_id);
                endBattle(matchData.battle_id, result);
              }

              // Small delay to ensure backend processes the unlock
              await new Promise(resolve => setTimeout(resolve, 500));

              // THEN: Calculate and award XP to each character in user's team
              if (user_team?.characters && user_team.characters.length > 0) {
                const opponentAvgLevel = matchData?.opponent_team?.characters?.reduce(
                  (sum: number, c: any) => sum + (c.level || 1), 0
                ) / (matchData?.opponent_team?.characters?.length || 1) || 1;

                // Estimate battle duration (could be passed from battle arena in future)
                const battleDuration = 120; // seconds, placeholder

                console.log('🎮 Awarding XP to team characters...');

                for (const character of user_team.characters) {
                  try {
                    const xpGain = calculateBattleXP(
                      character.level || 1,
                      Math.round(opponentAvgLevel),
                      isVictory,
                      battleDuration
                    );

                    console.log(`📊 ${character.name}: +${xpGain.amount} XP (${isVictory ? 'Victory' : 'Defeat'})`);

                    // Send XP to backend
                    await characterAPI.award_battle_xp(character.id, {
                      xp_amount: xpGain.amount,
                      is_victory: isVictory,
                      opponent_level: Math.round(opponentAvgLevel),
                      battle_duration: battleDuration,
                      bonuses: xpGain.bonuses
                    });
                  } catch (error) {
                    console.error(`Failed to award XP to ${character.name}:`, error);
                  }
                }

                // Reload characters to get updated XP/levels
                console.log('🔄 Reloading characters after XP award...');
                loadUserCharacters();
              }
              // Don't exit battle immediately - let user see the victory/defeat overlay
              // User will click "Return to Menu" to exit
            }}
            onExitBattle={() => {
              console.log('🚪 Exiting battle');
              setIsInBattle(false);
              setMatchData(null);
            }}
          />
        ) : (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-orange-400">No Team Found</h2>
            <p className="text-gray-400">You need 3 characters to form a team.</p>
            <p className="text-sm text-gray-500 mt-2">Go to the Characters tab to unlock more characters.</p>
          </div>
        )}
      </BattleErrorBoundary>
    );
  }

  // Battle Lobby UI
  return (
    <div className="space-y-6">
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
        {/* Character Sidebar */}
        <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sword className="w-5 h-5 text-red-400" />
            Battle Roster
          </h3>
          <div ref={battle_character_scroll_preservation.scrollRef} className={`${isMobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
            {(available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
              <button
                key={character.id}
                onClick={() => {
                  battle_character_scroll_preservation.saveScrollPosition();
                  set_global_selected_character_id(character.base_name);
                }}
                className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left ${global_selected_character_id === character.base_name
                  ? 'border-red-500 bg-red-500/20 text-white'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                  }`}
              >
                <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'}`}>
                  <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                  <div className={isMobile ? 'character-info' : ''}>
                    <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                    <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>Lv.{character.level} {character.archetype}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Colosseaum Image & Start Button */}
        <div className="flex-1 space-y-8">
          <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 sm:rounded-xl p-2 sm:p-8 text-center mb-8 border border-red-900/30">
            <div className="flex flex-col items-center gap-6">
              {/* Character Image */}
              <div className="w-full sm:max-w-md md:max-w-lg lg:w-72 h-[90vh] sm:h-[90vh] md:h-[90vh] lg:h-72 sm:rounded-xl overflow-hidden sm:border-4 border-red-600/50 shadow-2xl shadow-red-900/20">
                <img
                  src={selected_character ? getCharacterImagePath({ name: selected_character.name, scene_image_slug: (selected_character as any).scene_image_slug }, 'colosseaum') : ''}
                  alt={selected_character?.name || 'Character'}
                  className="w-full h-full object-contain bg-gray-900"
                  onError={(e) => {
                    console.error('❌ Colosseaum image failed to load:', e.currentTarget.src);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>

              {/* Character Info */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">{selected_character?.name || 'Select a Fighter'}</h2>
                <p className="text-red-300 text-lg mb-6">{selected_character?.archetype || 'Unknown Class'}</p>

                {/* Enter Arena Button */}
                <button
                  onClick={() => setShowModeSelection(true)}
                  disabled={!user_team || user_team.characters.length < 3 || user_team.characters.some(c => c.current_health <= 0)}
                  className={`
                    px-12 py-4 rounded-full font-bold text-xl tracking-wider transition-all transform hover:scale-105
                    ${(!user_team || user_team.characters.length < 3 || user_team.characters.some(c => c.current_health <= 0))
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/50 hover:shadow-red-600/50'
                    }
                  `}
                >
                  ENTER THE ARENA
                </button>
                {(!user_team || user_team.characters.length < 3) && (
                  <p className="text-red-400 text-sm mt-3">
                    Team incomplete (Need 3 fighters)
                  </p>
                )}
                {user_team && user_team.characters.length >= 3 && user_team.characters.some(c => c.current_health <= 0) && (
                  <p className="text-red-400 text-sm mt-3">
                    Injured: {user_team.characters.filter(c => c.current_health <= 0).map(c => c.name).join(', ')} — Visit Medical Center
                  </p>
                )}

                {/* Mode Selection Modal */}
                {showModeSelection && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border-2 border-red-600 rounded-xl p-8 max-w-md w-full mx-4">
                      <h3 className="text-2xl font-bold text-white text-center mb-6">Choose Battle Mode</h3>

                      {/* PvE Option - Arena Champions */}
                      <button
                        onClick={() => {
                          console.log('🎮 Button clicked, WS state:', { isConnected, isAuthenticated });
                          setIsSearching(true);
                          findMatch(null, 'pve');
                        }}
                        disabled={isSearching}
                        className={`w-full mb-4 p-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg text-white font-bold text-lg transition-all ${isSearching ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-500 hover:to-orange-500'}`}
                      >
                        <div className="text-xl mb-1">
                          {isSearching ? 'Summoning Opponent...' : 'Arena Champions'}
                        </div>
                        <div className="text-sm font-normal opacity-80">
                          {isSearching ? 'Scanning the multiverse...' : 'Random Team Battle'}
                        </div>
                      </button>

                      {/* PvP Option - Under Construction */}
                      <button
                        disabled
                        className="w-full mb-4 p-4 bg-gray-700 rounded-lg text-gray-400 font-bold text-lg cursor-not-allowed"
                      >
                        <div className="text-xl mb-1">Multiplayer</div>
                        <div className="text-sm font-normal opacity-80">Under Construction</div>
                      </button>

                      {/* Cancel */}
                      <button
                        onClick={() => setShowModeSelection(false)}
                        className="w-full p-3 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for debugging
const PlaceholderComponent = () => (
  <div className="p-8 text-center">
    <h2 className="text-2xl font-bold mb-4">Component Placeholder</h2>
    <p className="text-gray-400">This component is temporarily disabled for debugging.</p>
  </div>
);

// Keep essential types as regular imports
import { OwnedCharacter } from '@/data/userAccount';
import { TeamComposition } from '@/data/teamBuilding';
import { FinancialDecision } from '@/services/apiClient';
import type { ConflictData } from '@/services/ConflictDatabaseService';

// Loading component for Suspense fallback
const ComponentLoader = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-400">Loading {name}...</p>
    </div>
  </div>
);

// Dynamic imports for psychology battle components
const CoachingInterface = lazy(() => import('./CoachingInterface'));
const GameplanTracker = lazy(() => import('./GameplanTracker'));

interface SubTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  component: React.ComponentType;
  description?: string;
  badge?: number | string;
}

interface MainTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  sub_tabs: SubTab[];
}

interface MainTabSystemProps {
  initial_tab?: string;
  initial_sub_tab?: string;
}

export default function MainTabSystem({ initial_tab = 'characters', initial_sub_tab }: MainTabSystemProps) {
  const { user } = useAuth();
  const [active_main_tab, setActiveMainTab] = useState(initial_tab);
  const [active_sub_tab, setActiveSubTab] = useState(initial_sub_tab || (initial_tab === 'coach' ? 'front-office' : 'progression'));
  const [is_main_tab_expanded, setIsMainTabExpanded] = useState(true);
  const [global_selected_character_id, set_global_selected_character_id] = useState('');

  // Global character state for components that need it
  const [available_characters, setAvailableCharacters] = useState<Contestant[]>([]);
  const [characters_loading, setCharactersLoading] = useState(true);

  // Team state for battle
  const [user_team, setUserTeam] = useState<UserTeam | null>(null);
  const [team_loading, setTeamLoading] = useState(false);

  // Mailbox state
  const [unreadMailCount, setUnreadMailCount] = useState(0);

  // Poll for unread mail
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;
      try {
        const response = await mailApi.getMail({ limit: 1, unread_only: true });
        setUnreadMailCount(response.unread_count);
      } catch (error) {
        console.error('Error fetching unread mail count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute

    return () => clearInterval(interval);
  }, [user]);

  // Battle matchmaking handlers
  const handleMatchFound = (opponent: MatchOpponent, criteria: MatchCriteria) => {
    console.log('Match found:', opponent, criteria);
    // TODO: Navigate to battle arena with opponent
  };

  const handleMatchCancel = () => {
    console.log('Match cancelled');
    // Could navigate back or clear selection
  };

  // Mobile detection for responsive layout
  const { isMobile } = useMobileSafeMotion();

  // Load user characters for global access
  const loadUserCharacters = async () => {
    try {
      setCharactersLoading(true);
      const characters = await characterAPI.get_user_characters();

      const enhanced_characters = characters.map((char: Contestant) => {
        const base_name = char.name.toLowerCase();
        return {
          ...char,
          base_name,
          display_bond_level: char.bond_level || Math.floor((char.base_health || 80) / 10),
        };
      });

      setAvailableCharacters(enhanced_characters);
    } catch (error) {
      console.error('Error loading user characters:', error);
      setAvailableCharacters([]);
    } finally {
      setCharactersLoading(false);
    }
  };

  // Load characters on component mount
  useEffect(() => {
    loadUserCharacters();
  }, []);

  // Load user's active team when characters are loaded
  useEffect(() => {
    const loadTeam = async () => {
      console.log('🔍 Team loading check:', {
        has_characters: available_characters.length > 0,
        character_count: available_characters.length,
        has_user: !!user
      });

      if (available_characters.length === 0 || !user) {
        console.warn('⏭️ Skipping team load - no characters or user');
        return;
      }

      console.log('📡 Fetching team roster...');
      setTeamLoading(true);
      try {
        const response = await apiClient.get('/team/roster', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const team_data = response.data;
        console.log('📥 Team roster response:', team_data);

        if (team_data.team_id && team_data.active_teammates && team_data.active_teammates.length > 0) {
          // Load full character data for team slots and transform to TeamCharacter interface
          const team_characters = available_characters
            .filter(char => team_data.active_teammates.includes(char.id))
            .map(char => {
              console.log('🔍 RAW CHAR FROM BACKEND:', char);
              return {
                ...char,
                // Health fields from database (base 50 + archetype + species + individual modifiers)
                // These are NOT NULL in database, no fallbacks needed
                current_max_health: char.current_max_health,
                current_health: char.current_health,

                // Experience progression
                experience_to_next: Math.floor(100 * Math.pow(1.5, char.level || 1)),

                // Avatar
                avatar: char.avatar_emoji || char.avatar || '⚔️',

                // Battle state arrays - initialize empty, populated during battle
                status_effects: [],
                injuries: [],

                // Abilities - use from DB or default empty
                abilities: Array.isArray(char.abilities) ? char.abilities : [],
                special_powers: [],

                // Equipment structure - convert inventory array to equipped items
                equipped_items: {
                  weapon: char.inventory?.find((item: Equipment) => item.slot === 'weapon' && item.is_equipped),
                  armor: char.inventory?.find((item: Equipment) => item.slot === 'armor' && item.is_equipped),
                  accessory: char.inventory?.find((item: Equipment) => item.slot === 'accessory' && item.is_equipped)
                },

                // Equipment bonuses - calculate from equipped items or default to empty
                equipment_bonuses: {
                  hp: 0,
                  atk: 0,
                  def: 0,
                  spd: 0,
                  accuracy: 0,
                  crit_rate: 0
                },

                // Core skills - default structure
                core_skills: {
                  combat: { level: 1, experience: 0, max_level: 100 },
                  survival: { level: 1, experience: 0, max_level: 100 },
                  mental: { level: 1, experience: 0, max_level: 100 },
                  social: { level: 1, experience: 0, max_level: 100 },
                  spiritual: { level: 1, experience: 0, max_level: 100 }
                },

                // Personality fields - use from DB or defaults
                personality_traits: char.personality_traits || [],
                speaking_style: 'casual' as const,
                decision_making: 'logical' as const,
                conflict_response: 'aggressive' as const,

                // Rest/recovery fields
                rest_days_needed: 0,

                // Temporary stats - initialized at battle start
                temporary_stats: {
                  strength: 0,
                  dexterity: 0,
                  defense: 0,
                  speed: 0,
                  intelligence: 0,
                  wisdom: 0,
                  charisma: 0,
                  spirit: 0
                }
              };
            });

          console.log('🔍 TRANSFORMED TEAM CHARACTERS (full objects):', JSON.stringify(team_characters, null, 2));

          console.log('🔍 Filtered team characters:', {
            expected_ids: team_data.active_teammates,
            found_count: team_characters.length,
            found_names: team_characters.map(c => c.name),
            health_values: team_characters.map(c => ({
              name: c.name,
              current: c.current_health,
              max: c.current_max_health
            }))
          });

          setUserTeam({
            id: team_data.team_id,
            name: team_data.team_name || 'My Team',
            members: team_characters,
            coach_name: user?.username || 'Coach',
            characters: team_characters,
            coaching_points: 10,
            consecutive_losses: 0,
            team_chemistry: 75,
            team_culture: 'balanced',
            // Calculate derived stats from characters
            average_level: team_characters.reduce((sum, c) => sum + (c.level || 1), 0) / team_characters.length || 1,
            total_power: team_characters.reduce((sum, c) => sum + c.current_attack + c.current_health, 0),
            psychology_score: team_characters.reduce((sum, c) => sum + (c.current_mental_health || 50), 0) / team_characters.length || 50,
            // Battle history from backend
            wins: team_data.wins,
            losses: team_data.losses,
            battles_played: team_data.battles_played,
            last_battle_date: team_data.last_battle_date ? new Date(team_data.last_battle_date) : new Date()
          });
          console.log('✅ Loaded team:', team_data.team_name, 'with', team_characters.length, 'characters');
        } else {
          console.warn('⚠️ No active team found for user:', team_data);
        }
      } catch (error) {
        console.error('❌ Error loading team:', error);
      } finally {
        setTeamLoading(false);
      }
    };

    loadTeam();
  }, [available_characters, user]);

  // Component wrappers
  const ProgressionDashboardWrapper = () => {
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [characters_loading, setCharactersLoading] = useState(true);
    const progression_character_scroll_preservation = useScrollPreservation('progression-characters');

    // Load real characters from API
    useEffect(() => {
      const loadCharacters = async () => {
        try {
          const characters = await characterAPI.get_user_characters();

          const enhanced_characters = characters.map((char: Contestant) => ({
            ...char,
            base_name: char.character_id,
            display_bond_level: char.bond_level
          }));

          setAvailableCharacters(enhanced_characters);
          setCharactersLoading(false);
        } catch (error) {
          console.error('Error loading characters:', error);
          setCharactersLoading(false);
        }
      };

      loadCharacters();
    }, []);

    const selected_character = useMemo(() => {
      if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
      return available_characters.find(c => c && c.base_name === global_selected_character_id) || available_characters[0];
    }, [available_characters, global_selected_character_id]);

    // Debug logging only when data is actually loaded (prevents undefined spam)
    // These logs are now conditional to reduce console noise

    if (characters_loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-600/30 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading real character data...</p>
          </div>
        </div>
      );
    }

    if (!selected_character) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-gray-400">No character data available.</p>
            <p className="text-sm text-gray-500 mt-2">Please make sure you have characters in your roster.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
          {/* Character Sidebar */}
          <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Characters
            </h3>
            <div ref={progression_character_scroll_preservation.scrollRef} className={`${isMobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
              {(available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
                <button
                  key={character.id}
                  onClick={() => {
                    console.log('Progression - Clicking character:', character.name, character.base_name);
                    progression_character_scroll_preservation.saveScrollPosition();
                    set_global_selected_character_id(character.base_name);
                  }}
                  className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left ${global_selected_character_id === character.base_name
                    ? 'border-green-500 bg-green-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                    }`}
                >
                  <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'}`}>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                    <div className={isMobile ? 'character-info' : ''}>
                      <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                      <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>Lv.{character.level} {character.archetype}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Character Image Display */}
            <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 sm:rounded-xl p-2 sm:p-8 text-center mb-8">
              <div className="flex flex-col items-center gap-6">
                {/* Character Image */}
                <div className="w-full sm:max-w-md md:max-w-lg lg:w-72 h-[90vh] sm:h-[90vh] md:h-[90vh] lg:h-72 sm:rounded-xl overflow-hidden sm:border-4 border-gray-600 shadow-2xl">
                  <img
                    src={getCharacterImagePath(selected_character?.name || '', 'progression')}

                    alt={selected_character?.name || 'Character'}
                    className="w-full h-full object-contain bg-gray-900"
                    onError={(e) => {
                      console.error('❌ Image failed to load:', e.currentTarget.src);
                      // Hide the image element instead of showing wrong character
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Character Info */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                    <div className="text-3xl">{selected_character?.avatar || '⚔️'}</div>
                    <div>
                      <div>{selected_character?.name || 'Loading...'}</div>
                      <div className="text-sm text-gray-400">Level {selected_character?.level || 1} {selected_character?.archetype || 'Unknown Class'}</div>
                    </div>
                  </h2>
                </div>
              </div>
            </div>

            <ProgressionDashboard
              character={selected_character}
              onAllocateSkillPoint={(skill) => console.log(`${selected_character?.name || 'Character'} allocated skill point to ${skill}`)}
              onAllocateStatPoint={(stat) => console.log(`${selected_character?.name || 'Character'} allocated stat point to ${stat}`)}
              onViewDetails={(section) => console.log(`${selected_character?.name || 'Character'} viewing details for ${section}`)}
            />

            {/* Progression Chat - Journey & Relationship Coaching */}
            <div className="mt-6">
              <ProgressionChat
                selected_characterId={global_selected_character_id}
                selected_character={selected_character}
                available_characters={available_characters}
                coach_name={user.coach_name}
              />
            </div>

            {/* Training Enhancement Banner */}
            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-4 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className="w-5 h-5 text-orange-400" />
                <span className="text-orange-300 font-semibold">Training Enhanced Stats for {selected_character?.name || 'Character'}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-red-400 font-bold">+{selected_character?.training_bonuses?.strength || 0}</div>
                  <div className="text-gray-400">Strength</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400 font-bold">+{selected_character?.training_bonuses?.defense || 0}</div>
                  <div className="text-gray-400">Defense</div>
                </div>
                <div className="text-center">
                  <div className="text-green-400 font-bold">+{selected_character?.training_bonuses?.speed || 0}</div>
                  <div className="text-gray-400">Speed</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-400 font-bold">+{selected_character?.training_bonuses?.special || 0}</div>
                  <div className="text-gray-400">Special</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-orange-200">
                Training Points Available: {selected_character?.training_points || ((selected_character?.level || 1) * 2)} • Training Level: {selected_character?.training_level || 75}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EquipmentManagerWrapper = () => {
    const [character_equipment, setCharacterEquipment] = useState<Record<string, Record<string, Equipment>>>({});
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [characters_loading, setCharactersLoading] = useState(true);
    const equipment_character_scroll_preservation = useScrollPreservation('equipment-characters');

    // Load real characters from API
    const loadCharacters = async () => {
      try {
        const characters = await characterAPI.get_user_characters();

        const enhanced_characters = characters.map((char: Contestant) => ({
          ...char,
          base_name: char.character_id,
          display_bond_level: char.bond_level
        }));

        setAvailableCharacters(enhanced_characters);

        // Initialize character_equipment state with existing equipment
        const initialEquipment: Record<string, Record<string, Equipment>> = {};
        enhanced_characters.forEach((char) => {
          if (char.equipment && Array.isArray(char.equipment)) {
            const equipped_items: Record<string, Equipment> = {};
            char.equipment.forEach((item: Equipment) => {
              if (item.slot) {
                equipped_items[item.slot] = item;
              }
            });
            if (Object.keys(equipped_items).length > 0) {
              initialEquipment[char.base_name] = equipped_items;
              console.log(`🎯 Initialized equipment for ${char.name}:`, equipped_items);
            }
          }
        });
        setCharacterEquipment(initialEquipment);

        // Auto-select first character if none selected
        if (!global_selected_character_id && enhanced_characters.length > 0) {
          set_global_selected_character_id(enhanced_characters[0].base_name);
          console.log(`🎯 Auto-selected character: ${enhanced_characters[0].name}`);
        }

        setCharactersLoading(false);
      } catch (error) {
        console.error('Error loading characters:', error);
        setCharactersLoading(false);
      }
    };

    useEffect(() => {
      loadCharacters();
    }, []);

    const selected_character = useMemo(() => {
      if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
      return available_characters.find(c => c && c.base_name === global_selected_character_id) || available_characters[0];
    }, [available_characters, global_selected_character_id]);
    console.log('Equipment - Real character data:', selected_character?.name, 'Inventory count:', selected_character?.inventory?.length, 'Equipment:', selected_character?.equipment);
    console.log('🔧 Equipment slot debug:', {
      global_selected_character_id,
      selected_characterBaseName: selected_character?.base_name,
      character_equipment_keys: Object.keys(character_equipment),
      matching_equipment: character_equipment[global_selected_character_id],
      alternative_match: character_equipment[selected_character?.base_name]
    });

    if (characters_loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading real character data...</p>
          </div>
        </div>
      );
    }

    // Handle equipment changes
    const handleEquip = async (equipment: Equipment) => {
      console.log('🔧 handleEquip called:', equipment);
      console.log('🔧 Current character:', global_selected_character_id);
      console.log('🔧 Current equipment state:', character_equipment);

      // Find the actual character by global_selected_character_id
      const character = (available_characters && Array.isArray(available_characters))
        ? available_characters.find(c => c && c.base_name === global_selected_character_id)
        : null;
      if (!character) {
        console.error('❌ Character not found for equipping:', global_selected_character_id);
        return;
      }

      // Update local state first for immediate UI feedback
      setCharacterEquipment(prev => {
        const updated = {
          ...prev,
          [global_selected_character_id]: {
            ...prev[global_selected_character_id],
            [equipment.slot]: equipment
          }
        };
        console.log('🔧 Updated equipment state:', updated);
        return updated;
      });

      // Save to backend
      try {
        const current_equipped = character_equipment[global_selected_character_id] || {};
        const new_equipment = {
          ...current_equipped,
          [equipment.slot]: equipment
        };

        // Convert to array format expected by backend
        const equipment_array = Object.values(new_equipment).filter((item): item is Equipment => Boolean(item));

        console.log('💾 Saving equipment to backend:', equipment_array);

        const result = await characterAPI.update_equipment(character.id, equipment_array);
        console.log('✅ Equipment saved successfully:', result);

        // Reload character data to show updated equipment
        await loadCharacters();
        console.log('🔄 Character data refreshed after equipment save');

      } catch (error) {
        console.error('❌ Failed to save equipment to backend:', error);
        // Revert local state on error
        setCharacterEquipment(prev => {
          const reverted = { ...prev };
          if (reverted[global_selected_character_id]) {
            delete reverted[global_selected_character_id][equipment.slot];
          }
          return reverted;
        });
      }
    };

    const handleUnequip = async (slot: string) => {
      console.log('🔧 handleUnequip called:', slot);
      console.log('🔧 Current character:', global_selected_character_id);

      // Find the actual character by global_selected_character_id
      const character = (available_characters && Array.isArray(available_characters))
        ? available_characters.find(c => c && c.base_name === global_selected_character_id)
        : null;
      if (!character) {
        console.error('❌ Character not found for unequipping:', global_selected_character_id);
        return;
      }

      // Update local state first for immediate UI feedback
      setCharacterEquipment(prev => ({
        ...prev,
        [global_selected_character_id]: {
          ...prev[global_selected_character_id],
          [slot]: undefined
        }
      }));

      // Save to backend
      try {
        const current_equipped = character_equipment[global_selected_character_id] || {};
        const new_equipment = { ...current_equipped };
        delete new_equipment[slot];

        // Convert to array format expected by backend
        const equipment_array = Object.values(new_equipment).filter((item): item is Equipment => Boolean(item));

        console.log('💾 Removing equipment from backend:', equipment_array);

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.blankwars.com'}/api/characters/${character.id}/equipment`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ equipment: equipment_array })
        });

        if (!response.ok) {
          throw new Error(`Failed to save equipment: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Equipment unequipped successfully:', result);

        // Reload character data to show updated equipment
        await loadCharacters();
        console.log('🔄 Character data refreshed after equipment unequip');

      } catch (error) {
        console.error('❌ Failed to save equipment changes to backend:', error);
        // Revert local state on error - restore the item
        setCharacterEquipment(prev => {
          const current_equipped = prev[global_selected_character_id] || {};
          // We can't easily restore the exact item, so just log the error
          console.warn('Manual refresh may be needed to restore equipment state');
          return prev;
        });
      }
    };

    // Helper functions for image paths
    const getEquipmentCharacterImages = (character_id: string): string[] => {
      return getCharacterImageSet(character_id, 'equipment', 3);
    };

    const getSkillsCharacterImages = (character_id: string): string[] => {
      return getCharacterImageSet(character_id, 'skills', 3);
    };

    return (
      <div className="space-y-6">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
          {/* Character Sidebar */}
          <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Characters
            </h3>
            <div ref={equipment_character_scroll_preservation.scrollRef} className={`${isMobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
              {(available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
                <button
                  key={character.id}
                  onClick={() => {
                    console.log('Clicking character:', character.name, character.base_name);
                    equipment_character_scroll_preservation.saveScrollPosition();
                    set_global_selected_character_id(character.base_name);
                  }}
                  className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left cursor-pointer ${global_selected_character_id === character.base_name
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                    }`}
                  style={{ pointerEvents: 'auto', zIndex: 10 }}
                >
                  <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'}`}>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                    <div className={isMobile ? 'character-info' : ''}>
                      <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                      <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>Lv.{character.level} {character.archetype}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Character Image Display */}
            <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 sm:rounded-xl p-2 sm:p-8 text-center mb-8">
              <div className="flex flex-col items-center gap-6">
                {/* Character Equipment Image Display - Triangle Layout */}
                {selected_character && (
                  <div className="w-full sm:max-w-md md:max-w-lg lg:w-[40rem] h-[90vh] sm:h-[90vh] md:h-[90vh] lg:h-[86rem] sm:rounded-xl sm:border-4 border-orange-600 shadow-2xl bg-gray-800 sm:p-1 sm:p-2">
                    <div className="flex flex-col h-full gap-2">
                      {/* Top image - image 2 (middle/unique image) displayed larger */}
                      <div className="h-[65%] rounded-lg overflow-hidden border-2 border-orange-500/30">
                        <img
                          src={getEquipmentCharacterImages(selected_character.character_id)[1]}
                          alt={`${selected_character.name} equipment showcase`}
                          className="w-full h-full object-contain bg-gray-900 object-top"
                          onError={(e) => {
                            console.error(`❌ Equipment character showcase image failed to load:`, e.currentTarget.src);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      {/* Bottom row - images 1 and 3 (matching series) side by side */}
                      <div className="h-[35%] grid grid-cols-2 gap-2">
                        {[0, 2].map((imageIndex, gridIndex) => (
                          <div key={gridIndex} className="rounded-lg overflow-hidden border-2 border-orange-500/30">
                            <img
                              src={getEquipmentCharacterImages(selected_character.character_id)[imageIndex]}
                              alt={`${selected_character.name} equipment ${imageIndex + 1}`}
                              className="w-full h-full object-contain bg-gray-900"
                              onError={(e) => {
                                console.error(`❌ Equipment character image ${imageIndex + 1} failed to load:`, e.currentTarget.src);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Character Info */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                    <div className="text-3xl">{selected_character?.avatar || '⚔️'}</div>
                    <div>
                      <div>{selected_character?.name || 'Loading...'}</div>
                      <div className="text-sm text-gray-400">Level {selected_character?.level || 1} {selected_character?.archetype || 'Unknown Class'}</div>
                    </div>
                  </h2>
                </div>
              </div>
            </div>

            {/* Equipment Advisor Chat */}
            <EquipmentAdvisorChat
              selected_characterId={global_selected_character_id}
              onCharacterChange={set_global_selected_character_id}
              selected_character={selected_character}
              available_characters={available_characters}
            />

            <EquipmentManager
              character_id={selected_character?.id || global_selected_character_id}
              character_name={selected_character?.name || "Unknown"}
              character_level={selected_character?.level || 1}
              character_archetype={selected_character?.archetype || "warrior"}
              equipped_items={character_equipment[global_selected_character_id] || character_equipment[selected_character?.base_name] || {}}
              inventory={selected_character?.inventory || []}
              adherence_score={(() => {
                console.log('🔍 EQUIPMENT DEBUG - selected_character:', {
                  name: selected_character?.name,
                  gameplan_adherence: selected_character?.gameplan_adherence,
                  bond_level: selected_character?.bond_level,
                  all_keys: selected_character ? Object.keys(selected_character) : []
                });
                return selected_character?.gameplan_adherence ?? (() => {
                  throw new Error(`Missing gameplan_adherence for ${selected_character?.name}`);
                })();
              })()}
              bond_level={selected_character?.bond_level ?? (() => {
                throw new Error(`Missing bond_level for ${selected_character?.name}`);
              })()}
              on_equip={handleEquip}
              on_unequip={handleUnequip}
            />

            {/* Training Equipment Synergy Display */}
            <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl p-4 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-blue-400" />
                <span className="text-blue-300 font-semibold">Training-Enhanced Equipment Effectiveness for {selected_character?.name || 'Character'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-red-300 font-semibold">⚔️ Weapon Mastery</div>
                  <div className="text-gray-400">Training Bonus: +{selected_character?.training_bonuses?.strength || 0}</div>
                  <div className="text-red-200">Enhanced weapon damage scaling</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-blue-300 font-semibold">🛡️ Armor Proficiency</div>
                  <div className="text-gray-400">Training Bonus: +{selected_character?.training_bonuses?.defense || 0}</div>
                  <div className="text-blue-200">Improved defense effectiveness</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-green-300 font-semibold">💨 Agility Training</div>
                  <div className="text-gray-400">Training Bonus: +{selected_character?.training_bonuses?.speed || 0}</div>
                  <div className="text-green-200">Faster attack speed with all weapons</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-200">
                💡 {selected_character?.name || 'Character'}'s equipment stats are enhanced by training bonuses
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CombinedEquipmentManagerWrapper = () => {
    return (
      <CombinedEquipmentManager
        global_selected_character_id={global_selected_character_id}
        set_global_selected_character_id={set_global_selected_character_id}
        isMobile={isMobile}
      />
    );
  };

  const AttributesManagerWrapperComponent = () => {
    return (
      <AttributesManagerWrapper
        global_selected_character_id={global_selected_character_id}
        set_global_selected_character_id={set_global_selected_character_id}
        isMobile={isMobile}
      />
    );
  };

  // Combined Abilities Manager (Powers + Spells in one tab with toggle)
  const AbilitiesManagerWrapper = () => {
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [characters_loading, setCharactersLoading] = useState(true);
    const [activeAbilityTab, setActiveAbilityTab] = useState<'powers' | 'spells'>('powers');
    const abilities_character_scroll_preservation = useScrollPreservation('abilities-characters');

    // Load real characters from API
    useEffect(() => {
      const loadCharacters = async () => {
        try {
          const characters = await characterAPI.get_user_characters();

          const enhanced_characters = characters.map((char: Contestant) => ({
            ...char,
            base_name: char.character_id,
            display_bond_level: char.bond_level
          }));

          setAvailableCharacters(enhanced_characters);
          setCharactersLoading(false);
        } catch (error) {
          console.error('Error loading characters:', error);
          setCharactersLoading(false);
        }
      };

      loadCharacters();
    }, []);

    const selected_character = useMemo(() => {
      if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
      return available_characters.find(c => c && c.base_name === global_selected_character_id) || available_characters[0];
    }, [available_characters, global_selected_character_id]);

    console.log('Abilities - Real character data:', selected_character?.name, 'Level:', selected_character?.level, 'Tab:', activeAbilityTab);

    // Dynamic colors based on active tab
    const accentColor = activeAbilityTab === 'powers' ? 'blue' : 'purple';
    const borderColor = activeAbilityTab === 'powers' ? 'border-blue-600' : 'border-purple-600';
    const borderColorLight = activeAbilityTab === 'powers' ? 'border-blue-500/30' : 'border-purple-500/30';

    // Helper function for abilities images
    const getAbilitiesCharacterImages = (character_id: string): string[] => {
      return getCharacterImageSet(character_id, 'skills', 3);
    };

    if (characters_loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading real character data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
          {/* Character Sidebar */}
          <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Characters
            </h3>
            <div ref={abilities_character_scroll_preservation.scrollRef} className={`${isMobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
              {(available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
                <button
                  key={character.id}
                  onClick={() => {
                    console.log('Abilities - Clicking character:', character.name, character.base_name);
                    abilities_character_scroll_preservation.saveScrollPosition();
                    set_global_selected_character_id(character.base_name);
                  }}
                  className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left ${global_selected_character_id === character.base_name
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                    }`}
                >
                  <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'}`}>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                    <div className={isMobile ? 'character-info' : ''}>
                      <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                      <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>Lv.{character.level} {character.archetype}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Character Image Display (Shared - doesn't change with toggle) */}
            <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 sm:rounded-xl p-2 sm:p-8 text-center mb-8">
              <div className="flex flex-col items-center gap-6">
                {/* Character Abilities Image Display - Triangle Layout */}
                {selected_character && (
                  <div className={`w-full sm:max-w-md md:max-w-lg lg:w-[40rem] h-[90vh] sm:h-[90vh] md:h-[90vh] lg:h-[86rem] sm:rounded-xl sm:border-4 ${borderColor} shadow-2xl bg-gray-800 sm:p-1 sm:p-2 transition-colors duration-300`}>
                    <div className="flex flex-col h-full gap-2">
                      {/* Top image - image 2 (middle/unique image) displayed larger */}
                      <div className={`h-[65%] rounded-lg overflow-hidden border-2 ${borderColorLight} transition-colors duration-300`}>
                        <img
                          src={getAbilitiesCharacterImages(selected_character.character_id)[1]}
                          alt={`${selected_character.name} abilities showcase`}
                          className="w-full h-full object-contain bg-gray-900 object-top mobile-image-fix"
                        />
                      </div>
                      {/* Bottom row - images 1 and 3 (matching series) side by side */}
                      <div className="h-[35%] grid grid-cols-2 gap-2">
                        {[0, 2].map((imageIndex, gridIndex) => (
                          <div key={gridIndex} className={`rounded-lg overflow-hidden border-2 ${borderColorLight} transition-colors duration-300`}>
                            <img
                              src={getAbilitiesCharacterImages(selected_character.character_id)[imageIndex]}
                              alt={`${selected_character.name} abilities ${imageIndex + 1}`}
                              className="w-full h-full object-contain bg-gray-900 mobile-image-fix"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Character Info */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                    <div className="text-3xl">{selected_character.avatar}</div>
                    <div>
                      <div>{selected_character.name}</div>
                      <div className="text-sm text-gray-400">Level {selected_character.level} {selected_character.archetype}</div>
                    </div>
                  </h2>
                </div>
              </div>
            </div>

            {/* Powers/Spells Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg bg-gray-800 p-1 border border-gray-700">
                <button
                  onClick={() => setActiveAbilityTab('powers')}
                  className={`px-6 py-3 rounded-md font-semibold transition-all duration-200 flex items-center gap-2 ${activeAbilityTab === 'powers'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                  <Zap className="w-5 h-5" />
                  Powers
                </button>
                <button
                  onClick={() => setActiveAbilityTab('spells')}
                  className={`px-6 py-3 rounded-md font-semibold transition-all duration-200 flex items-center gap-2 ${activeAbilityTab === 'spells'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                  <Wand2 className="w-5 h-5" />
                  Spells
                </button>
              </div>
            </div>

            {/* Unified Abilities Chat */}
            <AbilitiesDevelopmentChat
              selected_characterId={global_selected_character_id}
              onCharacterChange={set_global_selected_character_id}
              selected_character={selected_character}
              available_characters={available_characters}
            />

            {/* Manager Component - switches based on toggle */}
            {activeAbilityTab === 'powers' ? (
              <PowerManager
                character_id={selected_character.id}
                character_name={selected_character.name}
              />
            ) : (
              <SpellManager
                character_id={selected_character.id}
                character_name={selected_character.name}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // ARCHIVED: SpellManagerWrapperComponent - replaced by AbilitiesManagerWrapper
  // const SpellManagerWrapperComponent = () => {
  //   return (
  //     <SpellManagerWrapper
  //       global_selected_character_id={global_selected_character_id}
  //       set_global_selected_character_id={set_global_selected_character_id}
  //       isMobile={isMobile}
  //     />
  //   );
  // };

  const ClubhouseWrapper = () => {
    try {
      console.log('Loading Clubhouse component...');
      return (
        <Clubhouse
          current_user_id={user?.id}
          current_user_name={user?.username}
          current_user_avatar="🎯"
          current_user_level={25}
          available_characters={available_characters}
        />
      );
    } catch (error) {
      console.error('Clubhouse component error:', error);
      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Social Tab Error</h2>
          <p className="text-gray-400">The social features are temporarily unavailable.</p>
          <p className="text-sm text-gray-500 mt-2">Error: {(error as Error)?.message || 'Unknown error'}</p>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-blue-400">Error Details</summary>
            <pre className="text-xs text-gray-300 mt-2 overflow-auto">
              {(error as Error)?.stack || JSON.stringify(error, null, 2)}
            </pre>
          </details>
        </div>
      );
    }
  };

  const UnifiedSocialBoardWrapper = () => {
    return (
      <SocialMessageBoard
        current_user_id={user?.id || 'guest'}
        selected_characterId={global_selected_character_id}
        available_characters={available_characters}
      />
    );
  };


  // New Coach Section Components

  const TeamDashboardWrapper = () => {
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [teamStats, setTeamStats] = useState<{ team_size: number; average_level: number; total_team_power: number } | null>(null);
    const [active_conflicts, setActiveConflicts] = useState<ConflictData[]>([]);

    // Load team data
    useEffect(() => {
      const loadTeamData = async () => {
        const characters = await characterAPI.get_user_characters();

        if (!characters || characters.length === 0) {
          throw new Error('No characters available for team dashboard');
        }

        characters.forEach(char => {
          if (typeof char.level !== 'number') {
            throw new Error(`Character ${char.id} missing level`);
          }
          if (!char.current_attack || !char.current_health) {
            throw new Error(`Character ${char.id} missing current_attack or current_health`);
          }
        });

        const enhanced_characters = characters.map((char: Contestant) => ({
          ...char,
          base_name: char.character_id,
          display_bond_level: char.bond_level
        }));

        setAvailableCharacters(enhanced_characters);

        const stats = {
          team_size: characters.length,
          average_level: characters.reduce((sum: number, char: Contestant) => sum + char.level, 0) / characters.length,
          total_team_power: characters.reduce((sum: number, char: Contestant) => sum + char.current_attack + char.current_health, 0)
        };
        setTeamStats(stats);
      };

      loadTeamData();
    }, []);

    return (
      <div className="space-y-6">
        {/* Team Overview Stats */}
        {teamStats && (
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{teamStats.team_size}</div>
                <div className="text-gray-400">Team Members</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{Math.round(teamStats.average_level)}</div>
                <div className="text-gray-400">Average Level</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{teamStats.total_team_power}</div>
                <div className="text-gray-400">Total Power</div>
              </div>
            </div>
          </div>
        )}

        {/* Active Issues & Alerts */}
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-6 border border-red-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Team Issues & Alerts</h3>
          <div className="text-gray-300">
            <p>• No critical conflicts detected</p>
            <p>• Team morale: Stable</p>
            <p>• Financial health: Good</p>
            <p>• Recommended action: Continue current training regimen</p>
          </div>
        </div>

        {/* Character Status Grid */}
        <div className="bg-gray-800/50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Character Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
              <div key={character.id} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">{character.avatar}</div>
                  <div>
                    <div className="font-semibold text-white">{character.name}</div>
                    <div className="text-sm text-gray-400">Level {character.level}</div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Health:</span>
                    <span className="text-green-400">{character.current_health}/{character.current_max_health}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mood:</span>
                    <span className="text-blue-400">Good</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const PerformanceCoachingWrapper = () => {
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [characters_loading, setCharactersLoading] = useState(true);
    const performance_character_scroll_preservation = useScrollPreservation('performance-characters');

    // Function to get multiple performance character images for triangle layout
    const getPerformanceCharacterImages = (character_name: string): string[] => {
      // Use the centralized utility with algorithmic path generation
      // We pass the character name which the utility handles.
      return getCharacterImageSet(character_name, 'performance', 3);
    };


    // Load characters
    useEffect(() => {
      const loadCharacters = async () => {
        try {
          const characters = await characterAPI.get_user_characters();

          const enhanced_characters = characters.map((char: Contestant) => ({
            ...char,
            base_name: char.character_id,
            display_bond_level: char.bond_level
          }));

          setAvailableCharacters(enhanced_characters);
          setCharactersLoading(false);
        } catch (error) {
          console.error('Error loading characters:', error);
          setCharactersLoading(false);
        }
      };

      loadCharacters();
    }, []);

    const selected_character = useMemo(() => {
      if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
      return available_characters.find(c => c && c.base_name === global_selected_character_id) || available_characters[0];
    }, [available_characters, global_selected_character_id]);

    if (characters_loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading characters...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
          {/* Character Sidebar */}
          <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Characters
            </h3>
            <div ref={performance_character_scroll_preservation.scrollRef} className={`${isMobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
              {(available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
                <button
                  key={character.id}
                  onClick={() => {
                    console.log('Performance - Clicking character:', character.name, character.base_name);
                    performance_character_scroll_preservation.saveScrollPosition();
                    set_global_selected_character_id(character.base_name);
                  }}
                  className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left ${global_selected_character_id === character.base_name
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                    }`}
                >
                  <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'}`}>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                    <div className={isMobile ? 'character-info' : ''}>
                      <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                      <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>Lv.{character.level} {character.archetype}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Character Image Display - TOP CENTER */}
            <div className="bg-gradient-to-b from-gray-800/80 to-gray-900/80 sm:rounded-xl p-2 sm:p-8 text-center mb-8">
              <div className="flex flex-col items-center gap-6">
                {/* Character Performance Image Display - Triangle Layout */}
                {selected_character && (
                  <div className="w-full sm:max-w-md md:max-w-lg lg:w-[40rem] h-[90vh] sm:h-[90vh] md:h-[90vh] lg:h-[86rem] sm:rounded-xl sm:border-4 border-green-600 shadow-2xl bg-gray-800 sm:p-2">
                    <div className="flex flex-col h-full gap-2">
                      {/* Top image - image 2 (middle/unique image) displayed larger */}
                      <div className="h-[65%] rounded-lg overflow-hidden border-2 border-green-500/30">
                        <img
                          src={getPerformanceCharacterImages(selected_character.name)[1]}
                          alt={`${selected_character.name} performance showcase`}
                          className="w-full h-full object-contain bg-gray-900 object-top mobile-image-fix"
                          onError={(e) => {
                            console.error(`❌ Performance character showcase image failed to load:`, e.currentTarget.src);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      {/* Bottom row - images 1 and 3 (matching series) side by side */}
                      <div className="h-[35%] grid grid-cols-2 gap-2">
                        {[0, 2].map((imageIndex, gridIndex) => (
                          <div key={gridIndex} className="rounded-lg overflow-hidden border-2 border-green-500/30">
                            <img
                              src={getPerformanceCharacterImages(selected_character.name)[imageIndex]}
                              alt={`${selected_character.name} performance ${imageIndex + 1}`}
                              className="w-full h-full object-contain bg-gray-900 mobile-image-fix"
                              onError={(e) => {
                                console.error(`❌ Performance character image ${imageIndex + 1} failed to load:`, e.currentTarget.src);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {/* Character Info */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                    <div className="text-3xl">{selected_character?.avatar || '⚔️'}</div>
                    <div>
                      <div>{selected_character?.name || 'Loading...'}</div>
                      <div className="text-sm text-gray-400">Level {selected_character?.level || 1} {selected_character?.archetype || 'Unknown Class'}</div>
                    </div>
                  </h2>
                </div>
              </div>
            </div>

            {/* Performance Coaching Chat - MIDDLE - Full 3D Scene */}
            <div style={{ height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
              <PerformanceCoachingChatScene
                availableCharacters={available_characters}
              />
            </div>

            {/* Performance Analytics - BOTTOM */}
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-xl p-6 border border-green-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-semibold">Performance Analytics for {selected_character?.name}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-green-300 font-semibold">Battle Performance</div>
                  <div className="text-2xl font-bold text-green-400">85%</div>
                  <div className="text-gray-400 text-sm">Win rate this week</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-blue-300 font-semibold">Coaching Response</div>
                  <div className="text-2xl font-bold text-blue-400">92%</div>
                  <div className="text-gray-400 text-sm">Advice compliance</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-purple-300 font-semibold">Improvement Trend</div>
                  <div className="text-2xl font-bold text-purple-400">+12%</div>
                  <div className="text-gray-400 text-sm">Since last month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // AI Judge Evaluations Section Component
  const AIJudgeEvaluationsSection = ({ character_id }: { character_id: string }) => {
    const [judgeEvaluations, setJudgeEvaluations] = useState<any[]>([]);

    useEffect(() => {
      const loadGameEventBus = async () => {
        const { default: GameEventBus } = await import('@/services/gameEventBus');
        const game_event_bus = GameEventBus.getInstance();

        // Fetch recent judge evaluations for this character
        const fetchJudgeEvaluations = async () => {
          try {
            const recent_events = game_event_bus.getEventHistory(character_id, {
              categories: ['financial'],
              event_types: ['judge_financial_evaluation', 'judge_financial_outcome_assessment', 'judge_intervention_recommendation'],
              limit: 5,
              time_range: '1_day' // Last 24 hours
            });

            const evaluations = recent_events
              .filter(event => event.metadata?.type === 'judge_evaluation')
              .map(event => ({
                id: event.id,
                judge_name: event.metadata.judgeRuling?.split(' ')[0] || 'Unknown Judge',
                ruling: event.metadata.judgeRuling,
                commentary: event.metadata.judgeCommentary,
                risk_assessment: event.metadata.risk_assessment,
                coach_evaluation: event.metadata.coach_evaluation,
                intervention_recommendation: event.metadata.intervention_recommendation,
                wildcard_type: event.metadata.wildcardType,
                trigger_event: event.metadata.trigger_event,
                timestamp: event.timestamp,
                severity: event.severity
              }));

            setJudgeEvaluations(evaluations);
          } catch (error) {
            console.error('Error fetching judge evaluations:', error);
            setJudgeEvaluations([]);
          }
        };

        fetchJudgeEvaluations();

        // Subscribe to new judge evaluation events
        const unsubscribe = game_event_bus.subscribe('judge_financial_evaluation', (event) => {
          if (event.primary_character_id === character_id) {
            fetchJudgeEvaluations();
          }
        });

        return unsubscribe;
      };

      loadGameEventBus();
    }, [character_id]);

    const getRiskColor = (risk: string) => {
      switch (risk?.toLowerCase()) {
        case 'excellent': return 'text-green-400';
        case 'good': return 'text-green-400';
        case 'questionable': return 'text-yellow-400';
        case 'poor': return 'text-red-400';
        case 'catastrophic': return 'text-red-500';
        default: return 'text-gray-400';
      }
    };

    const getCoachEvaluationText = (evaluation: string) => {
      switch (evaluation) {
        case 'excellent_guidance': return 'Excellent Guidance';
        case 'good_advice': return 'Good Advice';
        case 'missed_opportunity': return 'Missed Opportunity';
        case 'poor_advice': return 'Poor Advice';
        case 'harmful_guidance': return 'Harmful Guidance';
        default: return 'No Evaluation';
      }
    };

    const formatTimeAgo = (timestamp: Date) => {
      const now = new Date();
      const diff_ms = now.getTime() - new Date(timestamp).getTime();
      const diff_mins = Math.floor(diff_ms / 60000);

      if (diff_mins < 1) return 'Just now';
      if (diff_mins < 60) return `${diff_mins}m ago`;
      const diff_hours = Math.floor(diff_mins / 60);
      if (diff_hours < 24) return `${diff_hours}h ago`;
      const diff_days = Math.floor(diff_hours / 24);
      return `${diff_days}d ago`;
    };

    return (
      <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-6 border border-yellow-500/30">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-300 font-semibold">AI Judge Financial Evaluations</span>
        </div>

        {judgeEvaluations.length > 0 ? (
          <div className="space-y-3">
            {judgeEvaluations.map((evaluation) => (
              <div key={evaluation.id} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-300 font-semibold">{evaluation.judgeName}</span>
                  <span className={`text-sm ${getRiskColor(evaluation.risk_assessment)}`}>
                    Risk: {evaluation.risk_assessment || 'Unknown'}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  "{evaluation.commentary || evaluation.ruling}"
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>Coach: {getCoachEvaluationText(evaluation.coach_evaluation)}</span>
                  {evaluation.trigger_event && (
                    <span>Trigger: {evaluation.trigger_event.replace('_', ' ')}</span>
                  )}
                  {evaluation.intervention_recommendation && (
                    <span className="text-orange-400">Intervention: Recommended</span>
                  )}
                  <span>{formatTimeAgo(evaluation.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            <p>No recent AI Judge evaluations</p>
            <p className="text-sm mt-2">AI Judges will evaluate financial decisions as they occur</p>
          </div>
        )}

        <div className="mt-4 text-sm text-yellow-200">
          ⚖️ AI Judges evaluate all financial decisions and provide real-time commentary on risk levels and coaching effectiveness
        </div>
      </div>
    );
  };

  const FinancialAdvisoryWrapper = () => {
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [characters_loading, setCharactersLoading] = useState(true);
    const [pendingDecisions, setPendingDecisions] = useState<any[]>([]);
    const financial_character_scroll_preservation = useScrollPreservation('financial-characters');

    // Function to get multiple finance character images for triangle layout
    const getFinanceCharacterImages = (character_name: string): string[] => {
      // Use the centralized utility with algorithmic path generation
      return getCharacterImageSet(character_name, 'finance', 3);
    };

    // Load characters and their financial data
    useEffect(() => {
      const loadCharacters = async () => {
        try {
          const characters = await characterAPI.get_user_characters();

          const enhanced_characters = await Promise.all(characters.map(async (char: Contestant) => {
            const base_name = char.name.toLowerCase();

            // Use real financial data from DB only
            const wallet = char.wallet;
            const monthly_earnings = char.monthly_earnings;
            const recent_decisions = char.recent_decisions;
            const financial_personality = char.financial_personality || {
              spending_style: ['conservative', 'moderate', 'impulsive', 'strategic'][Math.floor(Math.random() * 4)],
              financial_wisdom: 50,
              risk_tolerance: 50,
              luxury_desire: 50,
              generosity: 50,
              money_motivations: ['security'],
              financial_traumas: [],
              money_beliefs: ['Money provides security']
            };

            // Calculate real financial stress and spiral state using the psychology service
            let calculated_stress = Math.floor(Math.random() * 30); // Fallback
            let spiral_state = null;
            try {
              const { default: FinancialPsychologyService } = await import('@/services/financialPsychologyService');
              const psych_service = FinancialPsychologyService.getInstance();
              const stress_analysis = psych_service.calculateFinancialStress(
                char.id || base_name,
                wallet,
                monthly_earnings,
                recent_decisions,
                financial_personality
              );
              calculated_stress = Math.round(stress_analysis.stress);

              // Calculate spiral state
              spiral_state = psych_service.calculateSpiralState(recent_decisions, calculated_stress);

              // Calculate financial trust
              const base_trust = char.coach_financial_trust;
              const trust_analysis = psych_service.calculateFinancialTrust(
                char.id || base_name,
                recent_decisions,
                base_trust,
                financial_personality,
                wallet,
                monthly_earnings
              );

              // Update financial trust
              char.coach_financial_trust = trust_analysis.financial_trust;

            } catch (error) {
              console.warn('Could not calculate financial stress:', error);
            }

            const mock_financial_data = {
              wallet,
              monthly_earnings,
              financial_stress: calculated_stress,
              coach_trust_level: char.coach_financial_trust,
              spending_personality: financial_personality.spending_style,
              recent_decisions,
              financial_personality,
              spiral_state
            };

            return {
              ...char,
              base_name,
              display_bond_level: char.bond_level,
              name: char.name,
              level: char.level || 1,
              archetype: char.archetype, // No fallback - must be from DB
              avatar: char.avatar || '⚔️',
              financials: mock_financial_data
            };
          }));

          setAvailableCharacters(enhanced_characters);

          // Generate some mock pending decisions
          const mock_decisions = [
            {
              id: 'decision_1',
              character_id: enhanced_characters[0]?.id,
              character_name: enhanced_characters[0]?.name,
              amount: 15000,
              reason: 'Battle victory bonus',
              deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
              options: [
                { id: 'investment', name: 'Index Fund Investment', risk: 'low', coach_approval: 'positive' },
                { id: 'real_estate', name: 'Real Estate Down Payment', risk: 'medium', coach_approval: 'positive' },
                { id: 'sports_car', name: 'Luxury Sports Car', risk: 'high', coach_approval: 'negative' },
                { id: 'party', name: 'Throw Epic Party', risk: 'high', coach_approval: 'negative' },
                { id: 'wildcard', name: 'Let me think of something unique...', risk: 'unknown', coach_approval: 'unknown' }
              ]
            }
          ];
          setPendingDecisions(mock_decisions);
          setCharactersLoading(false);
        } catch (error) {
          console.error('Error loading characters for financial advisory:', error);
          setCharactersLoading(false);
        }
      };

      loadCharacters();
    }, []);

    const selected_character = useMemo(() => {
      if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
      return available_characters.find(c => c && c.base_name === global_selected_character_id) || available_characters[0];
    }, [available_characters, global_selected_character_id]);

    const handleAdviceGiven = async (decision_id: string, advice: string) => {
      console.log(`Coach advised ${advice} for decision ${decision_id}`);

      // Find the pending decision and character
      const decision = pendingDecisions.find(d => d.id === decision_id);
      const character = (available_characters && Array.isArray(available_characters))
        ? available_characters.find(c => c && c.id === decision?.character_id)
        : null;

      if (decision && character) {
        try {
          // Record advice in the event system
          const { default: GameEventBus } = await import('@/services/gameEventBus');
          const event_bus = GameEventBus.getInstance();

          await event_bus.publishFinancialEvent(
            'coach_financial_advice',
            character.id,
            `Coach advised ${advice} for ${decision.reason}`,
            { decision_id, advice, amount: decision.amount, type: 'advice' },
            'medium'
          );

          console.log(`Financial advice recorded for ${character.name}`);
        } catch (error) {
          console.error('Error recording financial advice:', error);
        }
      }
    };

    const handleDecisionMade = async (decision_id: string, choice: string) => {
      console.log(`Character made decision: ${choice} for ${decision_id}`);

      // Find the decision and character
      const decision = pendingDecisions.find(d => d.id === decision_id);
      const character = (available_characters && Array.isArray(available_characters))
        ? available_characters.find(c => c && c.id === decision?.character_id)
        : null;

      if (decision && character) {
        try {
          // Use financial psychology service to simulate decision outcome
          const { default: FinancialPsychologyService } = await import('@/services/financialPsychologyService');
          const psych_service = FinancialPsychologyService.getInstance();

          // Calculate current decision quality
          const decision_quality = psych_service.calculateDecisionQuality(
            character.financial_stress,
            character.financial_personality,
            character.coach_financial_trust,
            character.recent_decisions
          );

          // Create a financial decision object
          const financial_decision: FinancialDecision = {
            id: decision_id,
            character_id: character.id,
            amount: decision.amount,
            category: choice as any,
            description: decision.reason,
            options: ['investment', 'real_estate', 'luxury_purchase', 'party', 'wildcard', 'other'],
            character_reasoning: decision.reason,
            urgency: 'medium' as const,
            is_risky: decision.amount > 1000, // Flag large amounts as risky
            status: 'pending' as const,
            coach_influence_attempts: 0,
            timestamp: new Date(),
            coach_advice: 'Consider carefully', // This would come from the previous advice
            followed_advice: choice === 'investment' || choice === 'real_estate', // Assume good options were advised
            outcome: 'pending' as const,
            financial_impact: 0,
            stress_impact: 0,
            relationship_impact: 0
          };

          // Simulate the outcome
          const outcome = await psych_service.simulateDecisionOutcome(
            financial_decision,
            decision_quality,
            character.financial_personality
          );

          // Update character financial state
          const new_wallet = character.wallet + outcome.financial_impact;
          const new_stress = Math.max(0, Math.min(100,
            character.financial_stress + outcome.stress_impact
          ));
          const new_trust = Math.max(0, Math.min(100,
            character.coach_financial_trust + outcome.trust_impact
          ));

          // Publish outcome events
          const { default: GameEventBus } = await import('@/services/gameEventBus');
          const event_bus = GameEventBus.getInstance();

          await event_bus.publishFinancialEvent(
            'financial_decision_made',
            character.id,
            `${character.name} ${choice} decision: ${outcome.description}`,
            {
              decision_id,
              choice,
              outcome: outcome.outcome,
              financial_impact: outcome.financial_impact,
              new_wallet,
              type: 'decision_outcome'
            },
            outcome.outcome === 'negative' ? 'high' : 'medium'
          );

          // Update stress if significant change
          if (Math.abs(outcome.stress_impact) >= 5) {
            await psych_service.updateCharacterFinancialStress(
              character.id,
              character.financial_stress,
              new_stress,
              `${choice} decision outcome`
            );
          }

          // Update trust if significant change
          if (Math.abs(outcome.trust_impact) >= 3) {
            await event_bus.publishTrustChange(
              character.id,
              character.coach_financial_trust,
              new_trust,
              `${choice} decision advice outcome`
            );
          }

          // Update financial trust based on decision outcome
          const new_financial_trust = await psych_service.updateFinancialTrust(
            character.id,
            financial_decision,
            outcome.outcome,
            character.coach_financial_trust
          );

          // Update character financial trust in state
          setAvailableCharacters(prev => prev.map(c =>
            c.id === character.id ? {
              ...c,
              coach_financial_trust: new_financial_trust
            } : c
          ));

          console.log(`Decision processed: ${character.name} chose ${choice}, outcome: ${outcome.outcome}`);
          console.log(`Financial impact: $${outcome.financial_impact.toLocaleString()}, Stress: ${outcome.stress_impact >= 0 ? '+' : ''}${outcome.stress_impact}, Trust: ${outcome.trust_impact >= 0 ? '+' : ''}${outcome.trust_impact}`);

          // Remove decision from pending list
          setPendingDecisions(prev => prev.filter(d => d.id !== decision_id));

        } catch (error) {
          console.error('Error processing financial decision:', error);
        }
      }
    };

    const handleIntervention = async (character_id: string, intervention_type: 'coach_therapy' | 'team_support' | 'cooling_period' | 'emergency_fund') => {
      const character = (available_characters && Array.isArray(available_characters))
        ? available_characters.find(c => c && c.id === character_id)
        : null;
      if (!character) return;

      try {
        const { default: FinancialPsychologyService } = await import('@/services/financialPsychologyService');
        const psych_service = FinancialPsychologyService.getInstance();

        const result = await psych_service.applyIntervention(
          character_id,
          intervention_type,
          character.financial_stress,
          character.spiralState?.spiral_intensity
        );

        // Update character state (in a real app, this would be persisted)
        setAvailableCharacters(prev => prev.map(c =>
          c.id === character_id ? {
            ...c,
            financial_stress: result.new_stress,
            spiral_state: {
              ...c.spiralState,
              spiral_intensity: result.new_spiral_intensity,
              is_in_spiral: result.new_spiral_intensity > 60
            }
          } : c
        ));

        console.log(`Intervention ${intervention_type} applied to ${character.name}: ${result.description}`);

      } catch (error) {
        console.error('Error applying intervention:', error);
      }
    };

    const handleFinancialCoaching = async (character_id: string) => {
      const character = (available_characters && Array.isArray(available_characters))
        ? available_characters.find(c => c && c.id === character_id)
        : null;
      if (!character) return;

      try {
        // Import the coaching system
        const { CoachingEngine } = await import('@/data/coachingSystem');

        // Create a mock team for the coaching session
        const mock_team = {
          characters: [character],
          coaching_points: 3,
          coach_name: 'Coach'
        };

        // Conduct financial coaching session
        const session = CoachingEngine.conductIndividualCoaching(
          character as any, // Type assertion for now
          mock_team as any,
          'financial_management',
          75 // Coach skill level
        );

        // Apply the coaching outcome
        if (session.outcome.financial_trust_change) {
          const new_financial_trust = Math.max(0, Math.min(100,
            character.coach_financial_trust + session.outcome.financial_trust_change
          ));

          // Update character state
          setAvailableCharacters(prev => prev.map(c =>
            c.id === character_id ? {
              ...c,
              coach_financial_trust: new_financial_trust
            } : c
          ));

          // Publish trust change event
          const { default: GameEventBus } = await import('@/services/gameEventBus');
          const event_bus = GameEventBus.getInstance();

          if (Math.abs(session.outcome.financial_trust_change) >= 3) {
            await event_bus.publishTrustChange(
              character_id,
              character.coach_financial_trust,
              new_financial_trust,
              'Financial coaching session outcome'
            );
          }
        }

        console.log(`Financial coaching session completed for ${character.name}`);
        console.log(`Character response: ${session.outcome.character_response}`);
        console.log(`Financial trust change: ${session.outcome.financial_trust_change || 0}`);

      } catch (error) {
        console.error('Error conducting financial coaching:', error);
      }
    };

    if (characters_loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading financial data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
          {/* Character Financial Status Sidebar */}
          <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Financial Status
            </h3>
            <div ref={financial_character_scroll_preservation.scrollRef} className={`${isMobile ? 'character-cards-mobile' : 'space-y-3 max-h-96 overflow-y-auto'}`}>
              {(available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
                <button
                  key={character.id}
                  onClick={() => {
                    console.log('Financial - Clicking character:', character.name, character.base_name);
                    financial_character_scroll_preservation.saveScrollPosition();
                    set_global_selected_character_id(character.base_name);
                  }}
                  className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left ${global_selected_character_id === character.base_name
                    ? 'border-green-500 bg-green-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                    }`}
                >
                  <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'} ${isMobile ? '' : 'mb-2'}`}>
                    <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                    <div className={isMobile ? 'character-info' : ''}>
                      <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                      <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>Lv.{character.level} {character.archetype}</div>
                    </div>
                  </div>
                  <div className={`space-y-1 text-xs ${isMobile ? 'text-center' : ''}`}>
                    <div className={`flex ${isMobile ? 'flex-col gap-0' : 'justify-between'}`}>
                      <span className="text-gray-400">Wallet:</span>
                      <span className="text-green-400">${character.wallet?.toLocaleString()}</span>
                    </div>
                    <div className={`flex ${isMobile ? 'flex-col gap-0' : 'justify-between'}`}>
                      <span className="text-gray-400">Stress:</span>
                      <span className={`${character.financial_stress > 50 ? 'text-red-400' : 'text-blue-400'}`}>
                        {character.financial_stress}%
                      </span>
                    </div>
                    <div className={`flex ${isMobile ? 'flex-col gap-0' : 'justify-between'}`}>
                      <span className="text-gray-400">Trust:</span>
                      <span className="text-purple-400">{character.coach_financial_trust}%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Financial Advisory Content */}
          <div className="flex-1 space-y-6">
            {/* Financial Advisory Header */}
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-xl p-6 border border-green-500/30">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Financial Advisory Center</h2>
              </div>
              <p className="text-green-100">
                Guide your team members through important financial decisions. Build trust through good advice,
                but be careful - poor guidance can damage relationships and lead to financial stress spirals.
              </p>
            </div>

            {/* Character Finance Image Display - Triangle Layout */}
            {selected_character && (
              <div className="flex justify-center items-center mb-6">
                <div className="w-full sm:max-w-md md:max-w-lg lg:w-[40rem] h-[90vh] sm:h-[90vh] md:h-[90vh] lg:h-[86rem] sm:rounded-xl sm:border-4 border-green-600 shadow-2xl bg-gray-800 sm:p-1 sm:p-2">
                  <div className="flex flex-col h-full gap-2">
                    {/* Top image - image 2 (middle/unique image) displayed larger */}
                    <div className="h-[65%] rounded-lg overflow-hidden border-2 border-green-500/30">
                      <img
                        src={getFinanceCharacterImages(selected_character.name)[1]}
                        alt={`${selected_character.name} finance showcase`}
                        className="w-full h-full object-contain bg-gray-900 object-top"
                        onError={(e) => {
                          console.error(`❌ Finance character showcase image failed to load:`, e.currentTarget.src);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Bottom row - images 1 and 3 (matching series) side by side */}
                    <div className="h-[35%] grid grid-cols-2 gap-2">
                      {[0, 2].map((imageIndex, gridIndex) => (
                        <div key={gridIndex} className="rounded-lg overflow-hidden border-2 border-green-500/30">
                          <img
                            src={getFinanceCharacterImages(selected_character.name)[imageIndex]}
                            alt={`${selected_character.name} finance ${imageIndex + 1}`}
                            className="w-full h-full object-contain bg-gray-900"
                            onError={(e) => {
                              console.error(`❌ Finance character image ${imageIndex + 1} failed to load:`, e.currentTarget.src);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Advisor Chat Interface */}
            <FinancialAdvisorChat
              selected_characterId={global_selected_character_id}
              selected_character={selected_character}
              available_characters={available_characters}
              onCharacterChange={set_global_selected_character_id}
            />

            {/* Financial Stress Analysis */}
            {selected_character && (
              <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-xl p-6 border border-red-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-red-400" />
                  <h3 className="text-lg font-bold text-white">Psychological State Analysis</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-red-300 font-semibold">Financial Stress Level</div>
                    <div className={`text-2xl font-bold ${selected_character.financial_stress > 70 ? 'text-red-500' :
                      selected_character.financial_stress > 40 ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                      {selected_character.financial_stress}%
                    </div>
                    <div className="text-gray-400 text-sm">
                      {selected_character.financial_stress > 70 ? 'Critical - Poor decisions likely' :
                        selected_character.financial_stress > 40 ? 'Elevated - Monitor closely' : 'Healthy - Good decision capacity'}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-blue-300 font-semibold">Decision Quality</div>
                    <div className={`text-2xl font-bold ${selected_character.financial_stress > 70 ? 'text-red-500' :
                      selected_character.financial_stress > 40 ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                      {selected_character.financial_stress > 70 ? 'Poor' :
                        selected_character.financial_stress > 40 ? 'Fair' : 'Good'}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Based on stress and personality
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-purple-300 font-semibold">Spending Style</div>
                    <div className="text-2xl font-bold text-purple-400 capitalize">
                      {selected_character.financial_personality?.spending_style}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Core financial personality
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-green-300 font-semibold">Coach Financial Trust</div>
                    <div className={`text-2xl font-bold ${selected_character.coach_financial_trust > 70 ? 'text-green-500' :
                      selected_character.coach_financial_trust > 40 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                      {selected_character.coach_financial_trust}%
                    </div>
                    <div className="text-gray-400 text-sm">
                      Trust in financial advice
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-300">
                  💡 <strong>Psychology Tip:</strong> High financial stress leads to impulsive decisions.
                  {selected_character.financial_stress > 50 &&
                    ' Consider stress-reduction activities before major financial choices.'
                  }
                </div>

                {/* Financial Coaching Session Button */}
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-blue-300 font-semibold">Financial Coaching Available</span>
                      <div className="text-blue-200/80 text-xs mt-1">
                        {selected_character.coach_financial_trust > 70 ?
                          'High trust - ready for advanced strategies' :
                          selected_character.coach_financial_trust > 40 ?
                            'Moderate trust - building confidence' :
                            'Low trust - needs trust-building exercises'
                        }
                      </div>
                    </div>
                    <button
                      onClick={() => handleFinancialCoaching(selected_character.id)}
                      className="px-3 py-2 bg-blue-600/40 hover:bg-blue-600/60 border border-blue-500 rounded text-sm text-blue-200 transition-all"
                    >
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Financial Session
                    </button>
                  </div>
                </div>

                {/* Spiral State Warning */}
                {selected_character.spiralState?.is_in_spiral && (
                  <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                      <span className="text-red-300 font-bold">FINANCIAL SPIRAL DETECTED</span>
                    </div>
                    <div className="text-sm text-red-200 mb-3">
                      {selected_character.name} has made {selected_character.spiralState.consecutive_poor_decisions} consecutive
                      poor decisions. Spiral intensity: {selected_character.spiralState.spiral_intensity}%
                    </div>

                    {/* Intervention Buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        onClick={() => handleIntervention(selected_character.id, 'coach_therapy')}
                        className="p-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500 rounded text-xs text-blue-200 transition-all"
                      >
                        <Heart className="w-4 h-4 mb-1 mx-auto" />
                        Coach Therapy
                      </button>
                      <button
                        onClick={() => handleIntervention(selected_character.id, 'team_support')}
                        className="p-2 bg-green-600/30 hover:bg-green-600/50 border border-green-500 rounded text-xs text-green-200 transition-all"
                      >
                        <Users className="w-4 h-4 mb-1 mx-auto" />
                        Team Support
                      </button>
                      <button
                        onClick={() => handleIntervention(selected_character.id, 'cooling_period')}
                        className="p-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500 rounded text-xs text-purple-200 transition-all"
                      >
                        <Clock className="w-4 h-4 mb-1 mx-auto" />
                        Cool Down
                      </button>
                      <button
                        onClick={() => handleIntervention(selected_character.id, 'emergency_fund')}
                        className="p-2 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500 rounded text-xs text-yellow-200 transition-all"
                      >
                        <Shield className="w-4 h-4 mb-1 mx-auto" />
                        Emergency Fund
                      </button>
                    </div>

                    <div className="mt-3 text-xs text-red-200/80">
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {selected_character.spiralState.recommendations?.slice(0, 3).map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pending Financial Decisions */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Pending Financial Decisions
              </h3>

              {pendingDecisions.length > 0 ? (
                <div className="space-y-4">
                  {pendingDecisions.map((decision) => (
                    <div key={decision.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{(available_characters && Array.isArray(available_characters)) ? available_characters.find(c => c.id === decision.character_id)?.avatar || '⚔️' : '⚔️'}</div>
                          <div>
                            <div className="font-semibold text-white">{decision.character_name}</div>
                            <div className="text-sm text-gray-400">{decision.reason}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">${decision.amount.toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Needs decision in 3 days</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        {decision.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleAdviceGiven(decision.id, option.id)}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${option.coachApproval === 'positive'
                              ? 'border-green-500 bg-green-500/20 text-green-300 hover:bg-green-500/30'
                              : option.coachApproval === 'negative'
                                ? 'border-red-500 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                : 'border-purple-500 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                              }`}
                          >
                            <div className="font-semibold">{option.name}</div>
                            <div className="text-xs opacity-75">Risk: {option.risk}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <p>No pending financial decisions</p>
                  <p className="text-sm mt-2">Characters will come to you when they need financial guidance</p>
                </div>
              )}
            </div>

            {/* Financial Influence Progress */}
            {selected_character && (
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-300 font-semibold">Financial Influence with {selected_character.name}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-purple-300 font-semibold">Coach Trust Level</div>
                    <div className="text-2xl font-bold text-purple-400">{selected_character.coach_financial_trust}%</div>
                    <div className="text-gray-400 text-sm">Financial advice compliance</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-green-300 font-semibold">Financial Health</div>
                    <div className="text-2xl font-bold text-green-400">Good</div>
                    <div className="text-gray-400 text-sm">${selected_character.wallet?.toLocaleString()} saved</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-blue-300 font-semibold">Spending Style</div>
                    <div className="text-2xl font-bold text-blue-400 capitalize">{selected_character.financial_personality?.spending_style}</div>
                    <div className="text-gray-400 text-sm">Decision pattern</div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-purple-200">
                  💡 Build trust through therapy sessions and good advice to increase financial influence
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Psychology Battle Component Wrappers - Removed legacy component


  // New Training Progress component for distinguishing from progression dashboard
  const TrainingProgressComponent = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-6 h-6" />
          Training Progress
        </h2>

        {/* Daily Training Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-semibold">Activities Remaining</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">7/10</div>
            <div className="text-sm text-gray-400">Resets in 14h 32m</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">Training Points</span>
            </div>
            <div className="text-3xl font-bold text-blue-400">23</div>
            <div className="text-sm text-gray-400">Earned today: +8</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">Membership</span>
            </div>
            <div className="text-xl font-bold text-purple-400">Pro Tier</div>
            <div className="text-sm text-gray-400">+50% XP bonus</div>
          </div>
        </div>

        {/* Character Training Progress */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Character Training Status</h3>

          {['Achilles', 'Merlin', 'Loki'].map((name, index) => (
            <div key={name} className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {name === 'Achilles' ? '⚔️' : name === 'Merlin' ? '🔮' : '🎭'}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{name}</div>
                    <div className="text-sm text-gray-400">Level {18 - index}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-semibold">{3 - index} sessions today</div>
                  <div className="text-sm text-gray-400">+{120 + index * 30} XP gained</div>
                </div>
              </div>

              {/* Training progress bar */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all"
                  style={{ width: `${70 + index * 10}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Training Efficiency: {70 + index * 10}%</span>
                <span>Fatigue: {20 - index * 5}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );


  const FacilitiesManagerWrapper = () => {
    // Demo facilities state
    const [demoFacilities, setDemoFacilities] = useState([
      { id: 'gym', level: 2, purchase_date: new Date(), maintenance_paid: true, bonuses_active: true },
      { id: 'medical_bay', level: 1, purchase_date: new Date(), maintenance_paid: false, bonuses_active: false }
    ]);

    const demo_currency = { coins: 50000, gems: 100 };
    const demo_team_level = 12;
    const demo_achievements = ['team_harmony', 'inner_peace', 'tech_pioneer'];

    const handlePurchaseFacility = (facility_id: string) => {
      console.log('Purchasing facility:', facility_id);
      setDemoFacilities(prev => [...prev, {
        id: facility_id,
        level: 1,
        purchase_date: new Date(),
        maintenance_paid: true,
        bonuses_active: true
      }]);
    };

    const handleUpgradeFacility = (facility_id: string) => {
      console.log('Upgrading facility:', facility_id);
      setDemoFacilities(prev => prev.map(f =>
        f.id === facility_id ? { ...f, level: f.level + 1 } : f
      ));
    };

    const handlePayMaintenance = (facility_id: string) => {
      console.log('Paying maintenance for facility:', facility_id);
      setDemoFacilities(prev => prev.map(f =>
        f.id === facility_id ? { ...f, maintenance_paid: true, bonuses_active: true } : f
      ));
    };

    return (
      <FacilitiesManager
        team_level={demo_team_level}
        currency={demo_currency}
        unlocked_achievements={demo_achievements}
        owned_facilities={demoFacilities}
        onPurchaseFacility={handlePurchaseFacility}
        onUpgradeFacility={handleUpgradeFacility}
        onPayMaintenance={handlePayMaintenance}
      />
    );
  };

  const TrainingGroundsWrapper = () => {
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [characters_loading, setCharactersLoading] = useState(true);
    const training_character_scroll_preservation = useScrollPreservation('training-characters');

    // Load characters on component mount
    useEffect(() => {
      const loadCharacters = async () => {
        setCharactersLoading(true);
        try {
          console.log('🔄 Loading characters from API...');
          console.log('🔄 API URL:', '/api/user/characters');
          const characters = await characterAPI.get_user_characters();
          console.log('📊 API Response - Characters count:', characters.length);

          if (characters.length === 0) {
            console.error('🚨 NO CHARACTERS FOUND - TRAINING REQUIRES REAL API CHARACTERS');
            setAvailableCharacters([]);
            setCharactersLoading(false);
            return;
          }

          console.log('👥 Characters received:', characters.length);

          const mapped_characters = characters.map((char: Contestant) => {
            const base_name = char.name.toLowerCase();
            return {
              ...char, // All stats already here from backend
              base_name,
              display_bond_level: char.bond_level,
              abilities: char.abilities,
              archetype: char.archetype,
              avatar: char.avatar_emoji,
              name: char.name,
              training_bonuses: {
                strength: Math.floor(char.level / 3),
                defense: Math.floor(char.level / 4),
                speed: Math.floor(char.level / 3.5),
                special: Math.floor(char.level / 2.5)
              }
            };
          });

          setAvailableCharacters(mapped_characters);
        } catch (error) {
          console.error('❌ Failed to load characters:', error);
          console.error('❌ Error details:', error.response?.data || error.message);
          setAvailableCharacters([]);
        } finally {
          setCharactersLoading(false);
        }
      };

      loadCharacters();
    }, []);

    const selected_character = useMemo(() => {
      if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
      return available_characters.find(c => c && c.base_name === global_selected_character_id) || available_characters[0];
    }, [available_characters, global_selected_character_id]);

    return (
      <div className="space-y-6">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'gap-6'}`}>
          {/* Character Sidebar */}
          <div className={`${isMobile ? 'w-full mb-4' : 'w-full md:w-80'} ${isMobile ? 'bg-gray-800/80 rounded-xl p-2' : 'bg-gray-800/80 rounded-xl p-4'} h-fit`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Characters
            </h3>
            <div ref={training_character_scroll_preservation.scrollRef} className={`${isMobile ? 'character-cards-mobile' : 'space-y-2 max-h-96 overflow-y-auto'}`}>
              {characters_loading ? (
                <div className="text-center text-gray-400 py-4">Loading characters...</div>
              ) : available_characters.length === 0 ? (
                <div className="text-center text-red-400 py-4">
                  <p>❌ No characters loaded from API</p>
                  <p className="text-sm mt-2">Check authentication and backend connection</p>
                </div>
              ) : (
                (available_characters && Array.isArray(available_characters) ? available_characters : []).map((character) => (
                  <button
                    key={character.id}
                    onClick={() => {
                      console.log('Training - Clicking character:', character.name, character.base_name);
                      training_character_scroll_preservation.saveScrollPosition();
                      set_global_selected_character_id(character.base_name);
                    }}
                    className={`${isMobile ? 'character-card-mobile' : 'w-full p-3'} rounded-lg border transition-all text-left ${global_selected_character_id === character.base_name
                      ? 'border-green-500 bg-green-500/20 text-white'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                      }`}
                  >
                    <div className={`flex ${isMobile ? 'flex-col items-center text-center gap-1' : 'items-center gap-3'}`}>
                      <div className={`${isMobile ? 'text-lg' : 'text-2xl'}`}>{character.avatar}</div>
                      <div className={isMobile ? 'character-info' : ''}>
                        <div className={`font-semibold ${isMobile ? 'character-name' : ''}`}>{character.name}</div>
                        <div className={`text-xs opacity-75 ${isMobile ? 'character-details' : ''}`}>Lv.{character.level} {character.archetype}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Training Interface */}
          <div className="flex-1">
            {selected_character ? (
              <TrainingGrounds
                global_selected_character_id={global_selected_character_id}
                setGlobalSelectedCharacterId={set_global_selected_character_id}
                selected_character={selected_character}
                available_characters={available_characters}
              />
            ) : (
              <div className="text-center text-gray-400 py-8">
                No character selected or available
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Store and inventory wrapper components that need access to selected_character
  const CharacterShopWrapper = () => {
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [characters_loading, setCharactersLoading] = useState(true);

    // Load characters safely with proper error handling
    useEffect(() => {
      const loadCharacters = async () => {
        try {
          setCharactersLoading(true);
          const characters = await characterAPI.get_user_characters();

          // Filter out null/invalid characters before processing
          const valid_characters = (characters || []).filter(char => char && char.name);

          const enhanced_characters = valid_characters.map((char: Contestant) => ({
            ...char,
            base_name: char.character_id,
            display_bond_level: char.bond_level
          }));

          setAvailableCharacters(enhanced_characters);
        } catch (error) {
          console.error('Error loading shop characters:', error);
          setAvailableCharacters([]);
        } finally {
          setCharactersLoading(false);
        }
      };

      loadCharacters();
    }, []);

    const selected_character = useMemo(() => {
      if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
      const safe_characters = available_characters.filter(c => c && c.base_name);
      if (safe_characters.length === 0) return null;
      return safe_characters.find(c => c.base_name === global_selected_character_id) || safe_characters[0];
    }, [available_characters, global_selected_character_id]);

    if (characters_loading) {
      return <div className="text-center py-8 text-gray-400">Loading characters...</div>;
    }

    return (
      <CharacterShop
        selected_characterId={global_selected_character_id}
        selected_character={selected_character}
        available_characters={available_characters}
        onCharacterChange={set_global_selected_character_id}
      />
    );
  };

  const CoachStoreWrapper = () => {
    // Use EXACT same approach as working CharacterShopWrapper
    const [available_characters, setAvailableCharacters] = useState<(Contestant & { base_name: string; display_bond_level: number })[]>([]);
    const [characters_loading, setCharactersLoading] = useState(true);

    // Load characters safely with proper error handling (same as CharacterShopWrapper)
    useEffect(() => {
      const loadCharacters = async () => {
        try {
          setCharactersLoading(true);
          const characters = await characterAPI.get_user_characters();

          // Filter out null/invalid characters before processing
          const valid_characters = (characters || []).filter(char => char && char.name);

          const enhanced_characters = valid_characters.map((char: Contestant) => ({
            ...char,
            base_name: char.character_id,
            display_bond_level: char.bond_level
          }));

          setAvailableCharacters(enhanced_characters);
        } catch (error) {
          console.error('Error loading coach store characters:', error);
          setAvailableCharacters([]);
        } finally {
          setCharactersLoading(false);
        }
      };

      loadCharacters();
    }, []);

    const selected_character = useMemo(() => {
      if (!available_characters || !Array.isArray(available_characters) || available_characters.length === 0) return null;
      const safe_characters = available_characters.filter(c => c && c.base_name);
      if (safe_characters.length === 0) return null;
      return safe_characters.find(c => c.base_name === global_selected_character_id) || safe_characters[0];
    }, [available_characters, global_selected_character_id]);

    if (characters_loading) {
      return <div className="text-center py-8 text-gray-400">Loading coach store...</div>;
    }

    // Use MerchStore component for coach store (fixed crash issues)
    return (
      <MerchStore
        current_user_id={global_selected_character_id}
        userCurrencies={{ gems: 1500, coins: 25000, usd: 50, premium_currency: 100 }}
        userInventory={[]}
        demoMode={true}
        available_characters={available_characters}
        selected_character={selected_character}
      />
    );
  };

  const TeamEquipmentWrapper = () => (
    <TeamEquipmentManager
      available_characters={available_characters}
      selected_characterId={global_selected_character_id}
    />
  );

  const InventoryWrapper = () => (
    <InventoryManagerWrapper
      global_selected_character_id={global_selected_character_id}
      set_global_selected_character_id={set_global_selected_character_id}
    />
  );

  // Import and use Challenges page directly
  const ChallengesPage = lazy(() => import('@/app/challenges/page'));

  const ChallengesWrapper = () => (
    <Suspense fallback={<ComponentLoader name="Challenges" />}>
      <ChallengesPage />
    </Suspense>
  );

  const EmployeeLoungeWrapper = () => {
    if (!user) {
      return <ComponentLoader name="Employee Lounge" />;
    }
    if (!user.coach_name && !user.username) {
      throw new Error('User missing both coach_name and username');
    }
    const coachName = user.coach_name ? user.coach_name : user.username;
    return <EmployeeLounge coach_name={coachName} />;
  };

  const mainTabs: MainTab[] = [
    {
      id: 'coach',
      label: 'Coach',
      icon: User,
      color: 'purple',
      sub_tabs: [
        { id: 'front-office', label: 'Front Office', icon: User, component: CoachProgressionPage, description: 'View your coaching career progression' },
        { id: 'team-dashboard', label: 'Dashboard', icon: BarChart3, component: TeamDashboardWrapper, description: 'Overview of team stats, conflicts, and alerts' },
        { id: 'performance-coaching', label: '1-on-1 Combat', icon: Target, component: PerformanceCoachingWrapper, description: 'Combat training, strategy development, and gameplan adherence boost' },
        { id: 'individual-sessions', label: 'Personal Problems', icon: MessageCircle, component: IndividualSessionsWrapper, description: 'Personalized life coaching sessions' },
        { id: 'financial-advisory', label: 'Finance', icon: DollarSign, component: FinancialAdvisoryWrapper, description: 'Guide your team\'s financial decisions and build trust through money management' },
        { id: 'character-shopping', label: 'Character Shop', icon: ShoppingBag, component: CharacterShopWrapper, description: 'Characters buy equipment & items with coins' },
        { id: 'therapy', label: 'Therapy', icon: Brain, component: TherapyModule, description: 'Individual and group therapy sessions with legendary therapists' },
        { id: 'team-equipment', label: 'Team Equipment', icon: Crown, component: TeamEquipmentWrapper, description: 'Manage team equipment pool and lending system' },
        { id: 'group-events', label: 'Group Activities', icon: Users, component: CombinedGroupActivitiesWrapper, description: 'Team building, group activities & live multi-participant chat' },
        { id: 'mailbox', label: 'Mailbox', icon: Mail, component: Mailbox, description: 'System messages, notifications, rewards, and team updates', badge: unreadMailCount > 0 ? unreadMailCount : undefined },
      ]
    },
    {
      id: 'characters',
      label: 'Characters',
      icon: Users,
      color: 'blue',
      sub_tabs: [
        { id: 'progression', label: 'Progression', icon: TrendingUp, component: ProgressionDashboardWrapper, description: 'Level up, stats, and experience tracking' },
        { id: 'equipment', label: 'Equipment', icon: Crown, component: CombinedEquipmentManagerWrapper, description: 'Weapons, armor, and items with equipment advisor chat' },
        { id: 'attributes', label: 'Attributes', icon: Activity, component: AttributesManagerWrapperComponent, description: 'Core stats, point allocation, and adherence flow' },
        { id: 'resources', label: 'Resources', icon: Heart, component: ResourcesManagerWrapper, description: 'Health, Energy, and Mana pool allocation' },
        { id: 'abilities', label: 'Abilities', icon: Sparkles, component: AbilitiesManagerWrapper, description: 'Character powers and spells with skill tree development' },
      ]
    },
    {
      id: 'team',
      label: 'Team',
      icon: Shield,
      color: 'orange',
      sub_tabs: [
        { id: 'roster', label: 'Roster', icon: Users, component: TeamRosterWrapper, description: 'Manage your active 3-person team roster for tactical gameplay' },
      ]
    },
    {
      id: 'headquarters',
      label: 'Headquarters',
      icon: Home,
      color: 'amber',
      sub_tabs: [
        { id: 'overview', label: 'Team Base', icon: Home, component: TeamHeadquarters, description: 'Manage your team living space and facilities' },
        { id: 'medical', label: 'Medical Center', icon: Heart, component: HealingCenter, description: 'Heal injured characters and resurrect fallen ones using percentage-based healing system' },
      ]
    },
    {
      id: 'kitchen',
      label: 'Kitchen Table',
      icon: Coffee,
      color: 'amber',
      sub_tabs: [
        { id: 'chat', label: 'Kitchen Chat', icon: Coffee, component: KitchenTablePage, description: 'Raw, unfiltered fighter conversations in immersive 3D environment' },
      ]
    },
    {
      id: 'training',
      label: 'Training',
      icon: Dumbbell,
      color: 'green',
      sub_tabs: [
        { id: 'activities', label: 'Activities', icon: Target, component: TrainingGroundsWrapper, description: 'Daily training sessions' },
        { id: 'progress', label: 'Progress', icon: Trophy, component: TrainingProgressComponent, description: 'Training limits & daily progress' },
        { id: 'membership', label: 'Membership', icon: Crown, component: MembershipSelection, description: 'Training tier subscriptions' },
      ]
    },
    {
      id: 'battle',
      label: 'Battle',
      icon: Sword,
      color: 'red',
      sub_tabs: [
        { id: 'team-arena', label: 'The ColosSEAum', icon: Sword, component: HexBattleArena, description: 'The main 3v3 combat arena with PvE and PvP modes, where psychology and team chemistry impact battles.' },
      ]
    },
    {
      id: 'challenges',
      label: 'Challenges',
      icon: Trophy,
      color: 'yellow',
      sub_tabs: [
        { id: 'reality-shows', label: 'Reality Shows', icon: Trophy, component: ChallengesWrapper, description: 'Compete in Survivor-style reality show challenges for rewards and glory' },
      ]
    },
    {
      id: 'social',
      label: 'Social',
      icon: MessageCircle,
      color: 'purple',
      sub_tabs: [
        { id: 'clubhouse', label: 'Clubhouse', icon: Home, component: ClubhouseWrapper, description: 'Social hub with message board, lounge chat, graffiti wall' },
      ]
    },
    {
      id: 'store',
      label: 'Store',
      icon: ShoppingBag,
      color: 'yellow',
      sub_tabs: [
        { id: 'coach_store', label: 'Coach Store', icon: ShoppingBag, component: CoachStoreWrapper, description: 'Coaches buy cosmetics & premium content' },
        { id: 'packs', label: 'Card Packs', icon: Package, component: CardPacksWrapper, description: 'Open card packs and manage echoes from duplicate characters.' },
      ]
    },
    {
      id: 'employee-lounge',
      label: 'Staff',
      icon: Coffee,
      color: 'amber',
      sub_tabs: [
        { id: 'break-room', label: 'Break Room', icon: Coffee, component: EmployeeLoungeWrapper, description: 'Chat with your Blank Wars support staff in the break room' },
      ]
    }
  ];


  const current_main_tab = (mainTabs && Array.isArray(mainTabs)) ? mainTabs.find(tab => tab.id === active_main_tab) : null;
  const current_sub_tab = (current_main_tab?.sub_tabs && Array.isArray(current_main_tab.sub_tabs))
    ? current_main_tab.sub_tabs.find(tab => tab.id === active_sub_tab)
    : null;
  const ActiveComponent = current_sub_tab?.component;

  console.log('🔍 Tab Debug:', {
    active_main_tab,
    active_sub_tab,
    main_tabs_length: mainTabs ? mainTabs.length : 'undefined',
    current_main_tab: current_main_tab ? current_main_tab.id : 'null',
    current_sub_tab: current_sub_tab ? current_sub_tab.id : 'null',
    has_component: !!current_sub_tab?.component,
    available_sub_tabs: current_main_tab?.sub_tabs ? current_main_tab.sub_tabs.filter(s => s && s.id).map(s => s.id) : []
  });

  const getColorClasses = (color: string, is_active: boolean) => {
    const colors = {
      blue: is_active ? 'bg-blue-600 text-white' : 'text-blue-400 hover:bg-blue-600/20',
      green: is_active ? 'bg-green-600 text-white' : 'text-green-400 hover:bg-green-600/20',
      red: is_active ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-red-600/20',
      purple: is_active ? 'bg-purple-600 text-white' : 'text-purple-400 hover:bg-purple-600/20',
      yellow: is_active ? 'bg-yellow-600 text-white' : 'text-yellow-400 hover:bg-yellow-600/20',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Main Tab Navigation */}
      <div className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className={`flex items-center gap-4 ${isMobile ? 'main-tabs-mobile' : 'ml-32 overflow-x-auto'}`}>
              <div className={isMobile ? 'main-tabs-container-mobile' : 'flex gap-2 flex-nowrap'}>
                {mainTabs.map((tab) => {
                  const Icon = tab.icon;
                  const is_active = active_main_tab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveMainTab(tab.id);
                        setActiveSubTab(tab.sub_tabs[0].id);
                      }}
                      className={`flex items-center gap-2 ${isMobile ? 'main-tab-button-mobile' : 'px-4 py-2 flex-shrink-0'} rounded-lg transition-all ${getColorClasses(tab.color, is_active)}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      {current_main_tab && (
        <div className="border-b border-gray-700 bg-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className={`flex gap-2 overflow-x-auto ${isMobile ? 'subtab-navigation-mobile' : ''}`}>
              {current_main_tab.sub_tabs.map((subTab) => {
                const Icon = subTab.icon;
                const is_active = active_sub_tab === subTab.id;

                return (
                  <button
                    key={subTab.id}
                    onClick={() => setActiveSubTab(subTab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${is_active
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{subTab.label}</span>
                    {subTab.badge && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                        {subTab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-tab description */}
            {current_sub_tab?.description && (
              <div className="mt-2 text-sm text-gray-400">
                {current_sub_tab.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Colosseum Header for Battle Tab */}
      {active_main_tab === 'battle' && active_sub_tab === 'team-arena' && (
        <>
          {/* Banner Text */}
          <div className="w-full bg-gray-900 py-6">
            <h1 className="text-4xl md:text-6xl font-bold text-white text-center tracking-wide">
              THE ColosSEAum
            </h1>
          </div>
          {/* Full Screen Image */}
          <div className="w-full h-screen">
            <img
              src="/images/Battle/colosseum%20header.png"
              alt="The ColosSEAum"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center' }}
            />
          </div>
        </>
      )}

      {/* Training Grounds Header */}
      {active_main_tab === 'training' && (
        <>
          {/* Banner Text */}
          <div className="w-full bg-gray-900 py-6">
            <h1 className="text-4xl md:text-6xl font-bold text-white text-center tracking-wide">
              TRAINING GROUNDS
            </h1>
          </div>
          {/* Full Screen Image */}
          <div className="w-full h-screen">
            <img
              src="/images/Training/training_header.png"
              alt="Training Grounds"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center' }}
            />
          </div>
        </>
      )}

      {/* Active Component */}
      <div className={`${(active_main_tab === 'battle' && active_sub_tab === 'team-arena') || active_main_tab === 'kitchen' ? 'w-full' : 'max-w-7xl mx-auto'} ${active_main_tab === 'kitchen' ? 'h-[calc(100vh-140px)]' : 'px-4 py-6'}`}>
        {ActiveComponent ? (
          <Suspense fallback={<ComponentLoader name={current_sub_tab?.label || 'Component'} />}>
            {active_main_tab === 'battle' && active_sub_tab === 'team-arena' ? (
              <BattleSetupWrapper
                key="battle-arena"
                user_team={user_team}
                global_selected_character_id={global_selected_character_id}
                set_global_selected_character_id={set_global_selected_character_id}
                isMobile={isMobile}
              />
            ) : (
              <ActiveComponent key={`${active_main_tab}-${active_sub_tab}`} />
            )}
          </Suspense>
        ) : (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-orange-400">Component Not Found</h2>
            <p className="text-gray-400">The component for "{current_sub_tab?.label}" is not available.</p>
            <p className="text-sm text-gray-500 mt-2">Tab: {active_main_tab} / {active_sub_tab}</p>
          </div>
        )}
      </div>
    </div>
  );
}
