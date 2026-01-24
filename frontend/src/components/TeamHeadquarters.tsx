'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import SafeMotion from "./SafeMotion";
import { AnimatePresence } from "framer-motion";
import {
  Home,
  Users,
  TrendingUp,
  Coins,
  Gem,
  Sword,
  Shield,
  Zap,
  Heart,
  Star,
  Crown,
  Bed as BedIcon,
  Sofa,
  ArrowUp,
  Building,
  Castle,
  Sparkles,
  Plus,
  User,
  Coffee,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Video,
  Mic
} from 'lucide-react';
import { Contestant as Character } from '@blankwars/types';
import { characterAPI } from '../services/apiClient';
import { PromptTemplateService } from '../data/promptTemplateService';
import { roomImageService } from '../data/roomImageService';
import { useTutorial } from '../data/useTutorial';
import { teamHeadquartersTutorialSteps } from '../data/tutorialSteps';
import Tutorial from './Tutorial';
import { getCharacterImagePath, getCharacter3DModelPath } from '../utils/characterImageUtils';
// Kitchen Table extracted to standalone component: KitchenTablePage.tsx
import ConfessionalChatScene from './ConfessionalChatScene';
import { WordBubbleSystemRef } from './WordBubbleSystem';
import { usageService, UsageStatus } from '../data/usageService';
import BedComponent from './BedComponent';
import CharacterSlotUpgrade from './CharacterSlotUpgrade';
import { PURCHASABLE_BEDS, HEADQUARTERS_TIERS, ROOM_THEMES, ROOM_ELEMENTS } from '../data/headquartersData';
import { HeadquartersTier, RoomTheme, RoomElement, PurchasableBed, Bed, Room, HeadquartersState } from '../types/headquarters';
import { calculateRoomCapacity, calculateSleepingArrangement } from '../utils/roomCalculations';
import { purchaseBed, loadHeadquarters, saveHeadquarters } from '../services/bedService';
import { setRoomTheme, addElementToRoom, removeElementFromRoom } from '../services/roomService';
import { generateRoomImage } from '../services/roomImageService';
import { assignCharacterToRoom, removeCharacterFromRoom, getUnassigned_characters } from '../services/characterService';
import RealEstateAgentBonusService from '@/services/realEstateAgentBonusService';
import { startConfessional, pauseConfessional, continueConfessional, ConfessionalData, ConfessionalMessage } from '../services/confessionalService';
import { getCharacterConflicts, getCharacterHappiness, getThemeCompatibility, getCharacterSuggestedThemes } from '../services/characterHappinessService';
import RealEstateAgentChat from './RealEstateAgentChat';
import { getRoomThemeWarnings, calculateMissedBonuses, calculateRoomBonuses } from '../services/roomAnalysisService';
import { calculateTeamChemistry, calculateBattleEffects } from '../services/teamPerformanceService';
import { getElementCapacity } from '../services/headquartersService';

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

// Bed types and sleep quality - imported from ./types/headquarters.ts

// Purchasable bed options - imported from ./types/headquarters.ts

// Room instance with bed system - imported from ./types/headquarters.ts

// User headquarters state - imported from ./types/headquarters.ts

// Available beds for purchase
// PURCHASABLE_BEDS imported from ./data/headquartersData.ts

// HEADQUARTERS_TIERS imported from ./data/headquartersData.ts

// ROOM_THEMES imported from ./data/headquartersData.ts

// Multi-element room decoration system
// ROOM_ELEMENTS imported from ./data/headquartersData.ts


export default function TeamHeadquarters() {
  // Scroll preservation for character lists
  const confessional_character_scroll = useScrollPreservation('confessional-characters');

  const [available_characters, setAvailableCharacters] = useState<any[]>([]);
  const [characters_loading, setCharactersLoading] = useState(true);
  const [selected_living_quarters_character, setSelectedLivingQuartersCharacter] = useState<string | null>(null);

  // Auto-assign all characters to rooms when they're loaded
  const autoAssignCharactersToRooms = (characters: Character[], current_headquarters: HeadquartersState) => {
    if (!characters.length || !current_headquarters.rooms.length) return current_headquarters;

    // Create a new headquarters state with auto-assigned characters
    const new_headquarters = { ...current_headquarters };
    const characters_to_assign = [...characters];

    // Clear existing assignments first
    new_headquarters.rooms = new_headquarters.rooms.map(room => ({
      ...room,
      assigned_characters: []
    }));

    // Distribute characters evenly across all rooms
    let room_index = 0;
    characters_to_assign.forEach((char) => {
      const room = new_headquarters.rooms[room_index];
      if (room) {
        room.assigned_characters.push(char.base_name);
        room_index = (room_index + 1) % new_headquarters.rooms.length;
      }
    });

    console.log('🏠 Auto-assigned characters to rooms:', new_headquarters.rooms.map(r => ({
      name: r.name,
      assigned: r.assigned_characters.length
    })));

    return new_headquarters;
  };

  // Load characters from database API instead of demo collection
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        setCharactersLoading(true);
        const characters = await characterAPI.get_user_characters();

        // Map database characters to expected format
        const mapped_characters = characters.map((char: Character) => {
          console.log('🔍 Processing character:', char.name, {
            personality_traits: char.personality_traits,
            conversation_topics: char.conversation_topics
          });

          try {
            return {
              ...char,
              base_name: char.character_id
            };
          } catch (parseError) {
            console.error('❌ Error parsing character data for:', char.name, parseError);
            // If error, throw it up - don't mask with fake fallback data
            throw parseError;
          }
        });

        console.log('📊 Loaded database characters for kitchen chat:', mapped_characters);
        setAvailableCharacters(mapped_characters);

        // Auto-assign all characters to rooms
        setHeadquarters(prev => autoAssignCharactersToRooms(mapped_characters, prev));
      } catch (error) {
        console.error('❌ Error loading characters for kitchen chat:', error);
        setAvailableCharacters([]);
      } finally {
        setCharactersLoading(false);
      }
    };

    loadCharacters();
  }, []);

  // Usage tracking state
  const [usage_status, setUsageStatus] = useState<UsageStatus | null>(null);

  // Tutorial system
  const { isFirstTimeUser, startTutorial, is_active: isTutorialActive, resetTutorial } = useTutorial();

  // Debug helper for testing (remove in production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).resetTutorial = resetTutorial;
      (window as any).startTutorial = () => startTutorial(teamHeadquartersTutorialSteps);
    }
  }, [resetTutorial, startTutorial]);

  // Load usage status on component mount
  useEffect(() => {
    const loadUsageStatus = async () => {
      try {
        const status = await usageService.getUserUsageStatus();
        setUsageStatus(status);
      } catch (error) {
        console.error('Failed to load usage status:', error);
      }
    };

    loadUsageStatus();

    // Refresh usage status every 5 minutes
    const interval = setInterval(loadUsageStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const [headquarters, setHeadquarters] = useState<HeadquartersState>({
    current_tier: 'spartan_apartment',
    rooms: [
      {
        id: 'room_1',
        name: 'Master Bedroom',
        theme: null,
        elements: [],
        assigned_characters: [], // Only 1 character gets the master bed (status symbol)
        max_characters: 1, // Calculated from beds: 1 master bed only
        beds: [
          {
            id: 'master_bed_1',
            type: 'bed',
            position: { x: 0, y: 0 },
            capacity: 1,
            comfort_bonus: 15 // Best sleep quality - prestigious master bed
          }
        ]
      },
      {
        id: 'room_2',
        name: 'Bunk Room',
        theme: null,
        elements: [],
        assigned_characters: [], // 2 characters share the bunk bed
        max_characters: 2, // Calculated from beds: 1 bunk bed = 2
        beds: [
          {
            id: 'bunk_1',
            type: 'bunk_bed',
            position: { x: 0, y: 0 },
            capacity: 2,
            comfort_bonus: 10 // Decent sleep quality
          }
        ]
      }
    ],
    currency: { coins: 50000, gems: 100 },
    unlocked_themes: []
  });

  const [selected_room, setSelectedRoom] = useState<string | null>(null);
  const [view_mode, setViewMode] = useState<'overview' | 'room_detail' | 'upgrade_shop' | 'confessionals'>('overview');
  // Kitchen Table state removed - now in standalone KitchenTablePage.tsx
  const [selected_room_for_beds, setSelectedRoomForBeds] = useState<string | null>(null);
  const [show_bed_shop, setShowBedShop] = useState(false);

  // calculateRoomCapacity and calculateSleepingArrangement imported from ./utils/roomCalculations.ts

  // purchaseBed function imported from ./services/bedService.ts

  // Calculate battle bonuses from room themes
  const battle_bonuses = headquarters?.rooms?.reduce((bonuses: Record<string, number>, room) => {
    if (room.theme) {
      const theme = ROOM_THEMES.find(t => t.id === room.theme);
      if (theme && room.assigned_characters.length > 0) {
        bonuses[theme.bonus] = (bonuses[theme.bonus] || 0) + theme.bonus_value;
      }
    }
    return bonuses;
  }, {}) || {};
  const [current_scene_round, setCurrentSceneRound] = useState(0);
  const [scene_initialized, setSceneInitialized] = useState(false);
  const [coach_message, setCoachMessage] = useState('');
  const [dragged_character, setDraggedCharacter] = useState<string | null>(null);

  // Enhanced visual feedback states
  const [move_notification, setMoveNotification] = useState<{ message: string, type: 'success' | 'warning' } | null>(null);
  const [highlighted_room, setHighlightedRoom] = useState<string | null>(null);
  const notification_timeout = useRef<NodeJS.Timeout | null>(null);

  // Confessional 3D bubble system ref
  const confessional_bubble_ref = useRef<WordBubbleSystemRef>(null);

  // Confessional Interview State
  const [confessional_data, setConfessionalData] = useState<ConfessionalData>({
    active_character: null,
    messages: [],
    is_interviewing: false,
    is_paused: false,
    turn_number: 0,
    is_loading: false,
    session_complete: false
  });

  // Track which messages have had bubbles added to prevent duplicates
  const [bubbled_message_ids, setBubbledMessageIds] = useState<Set<number>>(new Set());

  // Clear all bubbles and reset tracking when character changes or confessional ends
  useEffect(() => {
    if (!confessional_data.is_interviewing) {
      // Confessional ended - clear everything
      if (confessional_bubble_ref.current) {
        confessional_bubble_ref.current.clear_all_bubbles();
      }
      setBubbledMessageIds(new Set());
    }
  }, [confessional_data.is_interviewing]);

  // Clear bubbles when active character changes (new confessional starting)
  useEffect(() => {
    if (confessional_data.active_character && confessional_bubble_ref.current) {
      confessional_bubble_ref.current.clear_all_bubbles();
      setBubbledMessageIds(new Set());
    }
  }, [confessional_data.active_character]);

  // Trigger 3D speech bubbles when new character messages arrive
  useEffect(() => {
    if (!confessional_data.active_character || confessional_data.messages.length === 0) return;

    // Get the most recent character message
    const character_messages = confessional_data.messages.filter(m => m.type === 'contestant');
    if (character_messages.length === 0) return;

    const latest_message = character_messages[character_messages.length - 1];

    // Only add bubble if we haven't already added one for this message ID
    if (confessional_bubble_ref.current && latest_message.content && !bubbled_message_ids.has(latest_message.id)) {
      // Use replace: true to ensure we only have one bubble at a time (fixes stacking)
      // This avoids the race condition of calling clear_all_bubbles() immediately before add_bubble()
      confessional_bubble_ref.current.add_bubble(
        confessional_data.active_character,
        latest_message.content,
        {
          type: 'speech',
          emotion: 'neutral',
          duration: 20000, // 20 seconds
          replace: true
        }
      );
      // Mark this message as bubbled
      setBubbledMessageIds(prev => new Set(prev).add(latest_message.id));
    }
  }, [confessional_data.messages, confessional_data.active_character]);

  const [selected_element_category, setSelectedElementCategory] = useState<'wallDecor' | 'furniture' | 'lighting' | 'accessories' | 'flooring' | null>(null);
  const [is_generating_room_image, setIsGeneratingRoomImage] = useState(false);

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (isFirstTimeUser() && !isTutorialActive) {
      // Small delay to let the component render first
      const timer = setTimeout(() => {
        startTutorial(teamHeadquartersTutorialSteps);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser, isTutorialActive, startTutorial]);

  const current_tier = HEADQUARTERS_TIERS.find(tier => tier.id === headquarters.current_tier)!;
  const next_tier = HEADQUARTERS_TIERS.find(tier => HEADQUARTERS_TIERS.indexOf(tier) === HEADQUARTERS_TIERS.indexOf(current_tier) + 1);

  // Get character conflicts (for humor)
  // getCharacterConflicts function imported from ./services/characterHappinessService.ts

  // getCharacterHappiness function imported from ./services/characterHappinessService.ts

  // getThemeCompatibility function imported from ./services/characterHappinessService.ts

  // getRoomThemeWarnings function imported from ./services/roomAnalysisService.ts

  // getCharacterSuggestedThemes function imported from ./services/characterHappinessService.ts

  // calculateMissedBonuses function imported from ./services/roomAnalysisService.ts

  // Calculate team chemistry penalties from overcrowding
  // calculateTeamChemistry function imported from ./services/teamPerformanceService.ts

  // calculateBattleEffects function imported from ./services/teamPerformanceService.ts

  const battle_effects = calculateBattleEffects(headquarters);

  const upgradeHeadquarters = async (tierId: string) => {
    const tier = HEADQUARTERS_TIERS.find(t => t.id === tierId);
    if (!tier) return;

    // Apply real estate agent discount
    const bonus_service = RealEstateAgentBonusService.getInstance();
    const discounted_cost = bonus_service.applyFacilityCostReduction(tier.cost);

    if (headquarters.currency.coins >= discounted_cost.coins && headquarters.currency.gems >= discounted_cost.gems) {
      const new_headquarters = {
        ...headquarters,
        current_tier: tierId,
        currency: {
          coins: headquarters.currency.coins - discounted_cost.coins,
          gems: headquarters.currency.gems - discounted_cost.gems
        },
        rooms: Array.from({ length: tier.max_rooms }, (_, i): Room => ({
          id: `room_${i + 1}`,
          name: `Room ${i + 1}`,
          theme: null,
          elements: [],
          assigned_characters: [],
          max_characters: tier.characters_per_room,
          beds: [
            {
              id: `bed_${i + 1}_1`,
              type: 'bed' as const,
              position: { x: 0, y: 0 },
              capacity: 1,
              comfort_bonus: 10
            }
          ]
        }))
      };

      // Update local state first for immediate UI feedback
      setHeadquarters(new_headquarters);

      // Save to backend database
      try {
        await saveHeadquarters(new_headquarters);
        console.log('✅ Headquarters upgrade saved successfully');
      } catch (error) {
        console.error('❌ Failed to save headquarters upgrade:', error);
        // Revert local state if save failed
        setHeadquarters(headquarters);
        alert('Failed to save upgrade. Please try again.');
      }
    }
  };

  // setRoomTheme function imported from ./services/roomService.ts

  // addElementToRoom function imported from ./services/roomService.ts

  // removeElementFromRoom function imported from ./services/roomService.ts

  // Calculate bonuses from room elements (including synergy bonuses)
  // calculateRoomBonuses function imported from ./services/roomAnalysisService.ts

  // Get element capacity for current tier
  // getElementCapacity function imported from ./services/headquartersService.ts

  // generateRoomImage function imported from ./services/roomService.ts

  // Character assignment functions imported from ./services/characterService.ts

  // removeCharacterFromRoom function imported from ./services/characterService.ts

  // getUnassigned_characters function imported from ./services/characterService.ts

  // clearAllConfessionalTimeouts function imported from ./services/confessionalService.ts

  // Confessional Interview Functions
  // startConfessional function imported from ./services/confessionalService.ts

  // generateCharacterResponse function imported from ./services/confessionalService.ts

  // pauseConfessional function imported from ./services/confessionalService.ts

  // continueConfessional function imported from ./services/confessionalService.ts

  const endConfessional = () => {
    console.log('🏁 Ending confessional interview');
    setConfessionalData({
      active_character: null,
      is_interviewing: false,
      is_paused: false,
      turn_number: 0,
      messages: [],
      is_loading: false,
      session_complete: false
    });
  };

  // Add null check for headquarters to prevent runtime errors
  if (!headquarters || !headquarters.rooms) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center text-gray-400">
          Loading headquarters...
        </div>
      </div>
    );
  }

  // Kitchen Table now lives in standalone component: KitchenTablePage.tsx
  // Accessible via Headquarters tab -> Kitchen Table sub_tab

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <SafeMotion
        as="div"
        class_name="bg-gray-800/80 rounded-xl p-6 border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏠</div>
            <div>
              <h1 className="text-2xl font-bold text-white">{current_tier.name}</h1>
              <p className="text-gray-400">{current_tier.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Active Agent Bonus Display */}
            {(() => {
              const agent_service = RealEstateAgentBonusService.getInstance();
              const selected_agent_id = agent_service.getSelectedAgent();
              if (!selected_agent_id) return null;

              const agent_data = {
                'barry': { name: 'Barry', icon: '⚡', color: 'text-yellow-400' },
                'lmb_3000': { name: 'LMB-3000', icon: '👑', color: 'text-purple-400' },
                'zyxthala': { name: 'Zyxthala', icon: '🦎', color: 'text-green-400' }
              }[selected_agent_id];

              return agent_data ? (
                <div className="bg-black/30 rounded-lg px-3 py-2 border border-gray-600">
                  <div className={`flex items-center gap-2 text-sm font-semibold ${agent_data.color}`}>
                    <span>{agent_data.icon}</span>
                    <span>Agent: {agent_data.name}</span>
                  </div>
                  <div className="text-xs text-gray-400">Bonuses Active</div>
                </div>
              ) : null;
            })()}

            {/* Battle Effects Display */}
            {Object.keys(battle_effects).length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Object.values(battle_effects).some(v => v > 0) && <Sword className="w-4 h-4 text-green-400" />}
                  {Object.values(battle_effects).some(v => v < 0) && <Shield className="w-4 h-4 text-red-400" />}
                </div>
                <div className="text-sm space-y-1">
                  {Object.entries(battle_effects).map(([effect, value]) => (
                    <div key={effect} className={value > 0 ? 'text-green-400' : 'text-red-400'}>
                      {value > 0 ? '+' : ''}{value}% {effect.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Coins className="w-5 h-5" />
                <span className="font-semibold">{headquarters.currency.coins.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-purple-400">
                <Gem className="w-5 h-5" />
                <span className="font-semibold">{headquarters.currency.gems}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Battle Bonuses */}
        {Object.keys(battle_bonuses).length > 0 && (
          <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-500/30">
            <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Active Battle Bonuses
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(battle_bonuses).map(([bonus, value]) => (
                <div key={bonus} className="flex items-center gap-1 text-sm text-green-300">
                  <Star className="w-3 h-3" />
                  +{value}% {bonus}
                </div>
              ))}
            </div>
          </div>
        )}
      </SafeMotion>

      {/* Navigation - Mobile Optimized */}
      <div className="flex gap-1 sm:gap-2 items-center overflow-x-auto pb-2 scrollbar-none">
        {['overview', 'confessionals', 'upgrade_shop'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            className={`px-2 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${view_mode === mode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            data-tutorial={mode === 'upgrade_shop' ? 'upgrade-tab' : mode === 'confessionals' ? 'confessional-tab' : undefined}
          >
            {mode === 'overview' ? 'Living Quarters' :
              mode === 'confessionals' ? 'Confessionals' :
                'Facilities'}
          </button>
        ))}
        <button
          onClick={() => startTutorial(teamHeadquartersTutorialSteps)}
          className="px-4 py-2 rounded-lg transition-all bg-purple-600 text-white hover:bg-purple-500"
          title="Restart Tutorial"
        >
          <HelpCircle className="w-4 h-4 inline mr-2" />
          Tutorial
        </button>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {view_mode === 'overview' && (
          <>
            {/* Team Dashboard */}
            <SafeMotion
              as="div"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              class_name="bg-gray-800/80 rounded-xl p-6 border border-gray-700 mb-6"
              data-tutorial="team-dashboard"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Fighter Status Monitor
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Team Chemistry */}
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-red-400" />
                    <h3 className="font-semibold text-red-400">Team Performance</h3>
                  </div>
                  <div className="text-2xl font-bold text-red-300 mb-1">
                    {calculateTeamChemistry(headquarters).team_coordination}%
                  </div>
                  <div className="text-sm text-red-200">
                    DRAMA OVERLOAD - Viewers love conflict but battles suffer!
                  </div>
                </div>

                {/* Personal Stress */}
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <h3 className="font-semibold text-orange-400">Living Conditions</h3>
                  </div>
                  <div className="text-2xl font-bold text-orange-300 mb-1">
                    CRAMPED
                  </div>
                  <div className="text-sm text-orange-200">
                    {headquarters.rooms.reduce((sum, room) => sum + room.assigned_characters.length, 0)} team members sharing {headquarters.rooms.reduce((sum, room) => sum + calculateRoomCapacity(room), 0)} beds
                  </div>
                </div>

                {/* Next Action */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUp className="w-4 h-4 text-blue-400" />
                    <h3 className="font-semibold text-blue-400">Coach's Note</h3>
                  </div>
                  <div className="text-lg font-bold text-blue-300 mb-1">
                    Upgrade Set
                  </div>
                  <div className="text-sm text-blue-200">
                    Need {Math.max(0, 25000 - headquarters.currency.coins).toLocaleString()} more prize money
                  </div>
                </div>
              </div>
            </SafeMotion>

            {/* Set Design Opportunities Summary */}
            {(() => {
              const all_warnings = headquarters.rooms.flatMap(room => getRoomThemeWarnings(room.id, headquarters));
              const all_missed_bonuses = headquarters.rooms.flatMap(room => calculateMissedBonuses(room.id, headquarters));
              const incompatible_count = headquarters.rooms.reduce((count, room) => {
                return count + room.assigned_characters.filter(char => {
                  const compat = getThemeCompatibility(char, room.theme);
                  return compat.type === 'incompatible';
                }).length;
              }, 0);

              if (all_warnings.length === 0 && all_missed_bonuses.length === 0) return null;

              return (
                <SafeMotion
                  as="div"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  class_name="bg-amber-900/20 rounded-xl p-4 border border-amber-500/30 mb-6"
                >
                  <h3 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
                    🏋️ Training Environment Opportunities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-amber-200 font-medium mb-1">Team Issues:</div>
                      <div className="text-amber-100">
                        • {incompatible_count} fighter(s) in mismatched sets
                        • {all_warnings.length} room(s) with poor theme synergy
                      </div>
                    </div>
                    <div>
                      <div className="text-amber-200 font-medium mb-1">Ratings Boost Available:</div>
                      <div className="text-amber-100">
                        • {all_missed_bonuses.length} unused character-set synergies
                        • Up to +{all_missed_bonuses.length > 0 ? Math.max(...all_missed_bonuses.map(b => parseInt(b.bonus.replace(/[^\d]/g, '')) || 0)) : 0}% performance bonus possible
                      </div>
                    </div>
                  </div>
                </SafeMotion>
              );
            })()}

            {/* Move Notification */}
            {move_notification && (
              <SafeMotion
                as="div"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                class_name={`p-4 rounded-lg border-2 flex items-center gap-3 ${move_notification.type === 'success'
                  ? 'bg-green-900/50 border-green-500 text-green-200'
                  : 'bg-orange-900/50 border-orange-500 text-orange-200'
                  }`}
              >
                <div className="text-2xl">
                  {move_notification.type === 'success' ? '✅' : '⚠️'}
                </div>
                <div className="font-medium">
                  {move_notification.message}
                </div>
              </SafeMotion>
            )}

            {/* Front Door & Room Grid */}
            <SafeMotion
              as="div"
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              class_name="space-y-6"
            >
              {/* Living Quarters Layout */}
              <div className="flex gap-6 mb-6">
                {/* Character Selector - Left Side */}
                <div className="w-80 bg-gray-800/80 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Character Selector
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {characters_loading ? (
                      <div className="text-gray-400 text-center py-4">
                        Loading characters...
                      </div>
                    ) : available_characters.length > 0 ? (
                      available_characters.map((character) => {
                        const is_selected = selected_living_quarters_character === character.id;

                        return (
                          <button
                            key={character.id}
                            onClick={() => setSelectedLivingQuartersCharacter(character.id)}
                            className={`w-full p-3 rounded-lg border transition-all text-left ${is_selected
                              ? 'border-blue-500 bg-blue-500/20 text-white'
                              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 text-gray-300'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{character.avatar}</div>
                              <div className="flex-1">
                                <div className="font-semibold">{character.name}</div>
                                <div className="text-xs opacity-75">Lv.{character.level} {character.archetype}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-gray-400 text-center py-4">
                        No characters found. Check API connection.
                      </div>
                    )}
                  </div>
                </div>

                {/* Character Image Window - Center */}
                <div className="flex-1 bg-gray-800/80 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BedIcon className="w-5 h-5" />
                    Sleeping Arrangement
                  </h4>
                  <div className="bg-gray-900 rounded-lg h-[300px] md:h-[600px] flex items-center justify-center overflow-hidden">
                    {selected_living_quarters_character ? (
                      <img
                        src={(() => {
                          const selected_char = (available_characters && Array.isArray(available_characters))
                            ? available_characters.find(c => c.id === selected_living_quarters_character)
                            : null;

                          if (!selected_char) return getCharacterImagePath('achilles', 'furniture_bunk');

                          // Find which room this character is in
                          const character_room = headquarters.rooms.find(room =>
                            room.assigned_characters.includes(selected_char.base_name)
                          );

                          if (!character_room) {
                            console.warn('⚠️ Character not assigned to any room:', selected_char.name);
                            return getCharacterImagePath(selected_char, 'furniture_bed');
                          }

                          // Calculate sleeping arrangement
                          const sleeping_arrangement = calculateSleepingArrangement(character_room, selected_char.base_name);

                          console.log('🛏️ Sleeping arrangement for', selected_char.name, ':', sleeping_arrangement);

                          // Only 3 image types available: bed, bunk_bed, floor
                          let image_url: string;
                          if (sleeping_arrangement.sleeps_on_floor) {
                            image_url = getCharacterImagePath(selected_char, 'furniture_floor');
                          } else if (sleeping_arrangement.bed_type === 'bunk_bed') {
                            image_url = getCharacterImagePath(selected_char, 'furniture_bunk');
                          } else {
                            // 'bed', 'couch', or any other type → use bed image
                            image_url = getCharacterImagePath(selected_char, 'furniture_bed');
                          }
                          console.log('🖼️ Image URL:', image_url);
                          return image_url;
                        })()}
                        alt={`${(available_characters && Array.isArray(available_characters))
                          ? available_characters.find(c => c.id === selected_living_quarters_character)?.name
                          : 'Character'} Sleeping Arrangement`}
                        key={selected_living_quarters_character}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onLoad={(e) => {
                          (e.target as HTMLImageElement).style.display = 'block';
                        }}
                        onError={(e) => {
                          console.error(`Failed to load bed image for ${selected_living_quarters_character}`);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 text-center">
                        <BedIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <div>Select a character to view their bunk bed</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Entrance Door - Right Side */}
                <div className="w-64">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Entrance
                  </h4>
                  <div className="relative">
                    <img
                      src="/images/front-door.png"
                      alt="Blank Wars Team Housing Entrance"
                      className="w-full h-[600px] object-cover rounded-xl border border-gray-600 shadow-lg"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      🏠 Team Housing Entrance
                    </div>
                  </div>
                </div>
              </div>

              {/* Living Quarters Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Living Quarters</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/headquarters/auto-assign', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          }
                        });

                        if (response.ok) {
                          // Refresh headquarters to show new assignments
                          const hq_response = await fetch('/api/headquarters', {
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                          });
                          const hq_data = await hq_response.json();
                          if (hq_data.success) {
                            setHeadquarters(hq_data.headquarters);
                            setMoveNotification({ message: '✨ Characters optimally assigned!', type: 'success' });
                          }
                        }
                      } catch (error) {
                        console.error('Auto-assign error:', error);
                        setMoveNotification({ message: 'Error optimizing arrangements', type: 'warning' });
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-white text-sm font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Optimize Arrangements
                  </button>
                  <div className="text-sm text-gray-400">
                    All characters auto-assigned to rooms
                  </div>
                </div>
              </div>

              {/* Living Quarters Grid */}
              <div
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                data-tutorial="room-grid"
              >
                {headquarters.rooms.map((room) => {
                  const theme = room.theme ? ROOM_THEMES.find(t => t.id === room.theme) : null;
                  const conflicts = getCharacterConflicts(room.id, headquarters);
                  const room_capacity = calculateRoomCapacity(room);

                  return (
                    <SafeMotion
                      as="div"
                      key={room.id}
                      class_name={`p-4 rounded-xl border transition-all cursor-pointer ${theme
                        ? `${theme.background_color} border-gray-600`
                        : 'bg-gray-800/50 border-gray-700'
                        } ${dragged_character ? 'border-blue-400 border-dashed' : ''} ${highlighted_room === room.id ? 'ring-2 ring-green-400 border-green-400 bg-green-900/20' : ''
                        }`}
                      while_hover={{ scale: 1.02 }}
                      onClick={() => setSelectedRoom(room.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-green-400');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('border-green-400');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-green-400');
                        if (dragged_character) {
                          assignCharacterToRoom(dragged_character, room.id, available_characters, headquarters, setHeadquarters, setMoveNotification, setHighlightedRoom, notification_timeout);
                          // Update selected character to show new sleeping arrangement image
                          const character = available_characters.find(c => c.base_name === dragged_character);
                          if (character) {
                            console.log('🎯 Setting selected character for image update:', character.name, 'ID:', character.id);
                            setSelectedLivingQuartersCharacter(character.id);
                          }
                          setDraggedCharacter(null);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4" />
                          <h3 className="font-semibold text-white">{room.name}</h3>
                          {theme && <span className="text-lg">{theme.icon}</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {room.assigned_characters.length}/{calculateRoomCapacity(room)}
                        </div>
                      </div>

                      {theme && (
                        <div className={`text-xs ${theme.text_color} mb-2`}>
                          {theme.name} (+{theme.bonus_value}% {theme.bonus})
                        </div>
                      )}

                      {/* Room Beds */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-400 mb-2">Beds & Furniture:</div>
                        <div className="flex flex-wrap gap-2">
                          {room.beds.map((bed) => {
                            // Find character assigned to this specific bed
                            const assigned_char_id = bed.character_id;
                            const assigned_character = assigned_char_id
                              ? available_characters.find(c => c.id === assigned_char_id)
                              : null;

                            // Fallback for legacy room-based assignment (visual only)
                            const bed_start_index = room.beds.slice(0, room.beds.indexOf(bed)).reduce((sum, b) => sum + b.capacity, 0);
                            const occupied_slots = Math.max(0, Math.min(bed.capacity, room.assigned_characters.length - bed_start_index));

                            return (
                              <BedComponent
                                key={bed.id}
                                bed={bed}
                                occupied_slots={occupied_slots}
                                show_details={false}
                                assigned_character={assigned_character}
                                is_selectable={!!dragged_character} // Highlight when moving
                                onAssign={() => {
                                  if (dragged_character) {
                                    // Assign specific character to this bed
                                    // TODO: Update assignCharacterToRoom to handle specific bed_id
                                    assignCharacterToRoom(dragged_character, room.id, available_characters, headquarters, setHeadquarters, setMoveNotification, setHighlightedRoom, notification_timeout);
                                    setDraggedCharacter(null);
                                  }
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Character Avatars with Status */}
                      <div className="flex flex-wrap gap-3 mb-3">
                        {room.assigned_characters.map(char_name => {
                          const character = (available_characters && Array.isArray(available_characters))
                            ? available_characters.find(c => c.base_name === char_name)
                            : null;
                          const happiness = getCharacterHappiness(char_name, room.id, headquarters);
                          const theme_compatibility = getThemeCompatibility(char_name, room.theme);

                          return character ? (
                            <div
                              key={char_name}
                              className={`flex flex-col items-center group relative cursor-move ${theme_compatibility.type === 'incompatible' ? 'ring-2 ring-amber-400/50 rounded-lg p-1' : ''
                                } ${dragged_character === char_name ? 'opacity-50' : ''}`}
                              draggable
                              onClick={(e) => {
                                e.stopPropagation();
                                // Click-to-select for mobile
                                if (dragged_character === char_name) {
                                  setDraggedCharacter(null); // Deselect
                                } else {
                                  setDraggedCharacter(char_name); // Select
                                  setMoveNotification({ message: `Select a room or bed to move ${character.name}`, type: 'success' });
                                }
                              }}
                              onDragStart={(e) => {
                                setDraggedCharacter(char_name);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => setDraggedCharacter(null)}
                              data-tutorial="character-avatar"
                            >
                              <div className="relative">
                                <div className="text-xl">{character.avatar}</div>
                                <div className="absolute -top-1 -right-1 text-xs">{happiness.emoji}</div>
                                {/* Theme compatibility indicator */}
                                {theme_compatibility.type === 'incompatible' && (
                                  <div className="absolute -bottom-1 -left-1 text-xs">⚠️</div>
                                )}
                                {theme_compatibility.type === 'compatible' && (
                                  <div className="absolute -bottom-1 -left-1 text-xs">✨</div>
                                )}
                                {/* Selection Indicator */}
                                {dragged_character === char_name && (
                                  <div className="absolute inset-0 ring-2 ring-blue-400 rounded-full animate-pulse"></div>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 truncate max-w-16">
                                {character.name.split(' ')[0]}
                              </div>
                              {/* Enhanced tooltip with theme info */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 max-w-48">
                                <div>{happiness.status}</div>
                                {theme_compatibility.type === 'incompatible' && (
                                  <div className="text-amber-300 mt-1">
                                    ⚠️ Set mismatch (-1 mood level)
                                  </div>
                                )}
                                {theme_compatibility.type === 'compatible' && (
                                  <div className="text-green-300 mt-1">
                                    ✨ Perfect set match (+{theme_compatibility.bonus_value}% {theme_compatibility.theme?.bonus})
                                  </div>
                                )}
                              </div>
                              {/* Remove button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCharacterFromRoom(char_name, room.id, setHeadquarters);
                                }}
                                className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                              >
                                ×
                              </button>
                            </div>
                          ) : null;
                        })}
                        {/* Empty beds or overcrowding indicator */}
                        {room.assigned_characters.length <= calculateRoomCapacity(room) ? (
                          Array.from({ length: calculateRoomCapacity(room) - room.assigned_characters.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="flex flex-col items-center opacity-30 hover:opacity-50 transition-opacity cursor-pointer">
                              <BedIcon className="w-6 h-6 text-gray-500" />
                              <div className="text-xs text-gray-500">Available</div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center text-red-400">
                            <div className="text-xs">🛏️ {calculateRoomCapacity(room)} in beds</div>
                            <div className="text-xs">🌗 {room.assigned_characters.length - calculateRoomCapacity(room)} on floor</div>
                          </div>
                        )}
                      </div>

                      {/* Conflicts and Overcrowding Status */}
                      {room.assigned_characters.length > calculateRoomCapacity(room) && (
                        <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-2 mb-2">
                          <div className="text-sm text-red-300 font-semibold flex items-center gap-2">
                            🛏️ OVERCROWDED ROOM
                          </div>
                          <div className="text-xs text-red-200">
                            {room.assigned_characters.length - calculateRoomCapacity(room)} fighters sleeping on floor
                          </div>
                          <div className="text-xs text-red-200 mt-1">
                            Capacity: {room.assigned_characters.length}/{calculateRoomCapacity(room)} (-{Math.round((room.assigned_characters.length - calculateRoomCapacity(room)) * 10)}% team morale)
                          </div>
                        </div>
                      )}
                      {conflicts.length > 0 && (
                        <div className="text-xs text-orange-400 italic mb-1">
                          😤 {conflicts[0]}
                        </div>
                      )}

                      {/* Theme Compatibility Warnings */}
                      {(() => {
                        const warnings = getRoomThemeWarnings(room.id, headquarters);
                        const missed_bonuses = calculateMissedBonuses(room.id, headquarters);

                        if (warnings.length === 0 && missed_bonuses.length === 0) return null;

                        return (
                          <div className="space-y-1">
                            {warnings.map((warning, index) => (
                              <div key={index} className="text-xs text-amber-400 italic">
                                ⚠️ {warning.message}
                              </div>
                            ))}

                            {/* Suggestions for better assignments */}
                            {missed_bonuses.length > 0 && (
                              <div className="text-xs text-blue-300 italic">
                                💡 Available bonuses: {missed_bonuses.slice(0, 2).map(bonus => bonus.bonus).join(', ')}
                                {missed_bonuses.length > 2 && ` +${missed_bonuses.length - 2} more`}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {!theme && headquarters.current_tier !== 'spartan_apartment' && (
                        <div className="text-xs text-blue-400 flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          Click to add theme
                        </div>
                      )}

                      {/* Buy Beds Button */}
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomForBeds(room.id);
                            setShowBedShop(true);
                          }}
                          className="w-full px-3 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded-lg transition-all text-green-300 text-sm flex items-center justify-center gap-2"
                        >
                          <BedIcon className="w-4 h-4" />
                          Buy Beds ({room.beds.length} beds)
                        </button>
                      </div>
                    </SafeMotion>
                  );
                })}
              </div>
            </SafeMotion>
          </>
        )}

        {view_mode === 'upgrade_shop' && (
          <SafeMotion
            as="div"
            key="upgrade_shop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="space-y-6"
          >
            {/* Headquarters Upgrades */}
            <div className="bg-gray-800/80 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Headquarters Upgrades
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {HEADQUARTERS_TIERS.map((tier) => {
                  const is_current_tier = headquarters.current_tier === tier.id;
                  const is_upgrade = HEADQUARTERS_TIERS.indexOf(tier) > HEADQUARTERS_TIERS.indexOf(current_tier);

                  // Apply real estate agent discount for display
                  const bonus_service = RealEstateAgentBonusService.getInstance();
                  const discounted_cost = bonus_service.applyFacilityCostReduction(tier.cost);
                  const has_discount = discounted_cost.coins < tier.cost.coins || discounted_cost.gems < tier.cost.gems;

                  const can_afford = headquarters.currency.coins >= discounted_cost.coins &&
                    headquarters.currency.gems >= discounted_cost.gems;

                  return (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-lg border transition-all ${is_current_tier
                        ? 'border-green-500 bg-green-900/20'
                        : is_upgrade && can_afford
                          ? 'border-blue-500 bg-blue-900/20 cursor-pointer hover:bg-blue-900/30'
                          : 'border-gray-600 bg-gray-700/30'
                        }`}
                      onClick={() => is_upgrade && can_afford && upgradeHeadquarters(tier.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{tier.name}</h3>
                        {is_current_tier ? (
                          <span className="text-green-400 text-sm font-semibold">✓ Current</span>
                        ) : is_upgrade && can_afford ? (
                          <span className="text-blue-400 text-sm font-semibold">Click to Upgrade</span>
                        ) : is_upgrade && !can_afford ? (
                          <span className="text-red-400 text-sm">Cannot Afford</span>
                        ) : (
                          <span className="text-gray-500 text-sm">Locked</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{tier.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="text-gray-300">
                          {tier.max_rooms} rooms, {tier.characters_per_room} per room
                        </div>
                        {tier.cost.coins > 0 && (
                          <div className="flex flex-col gap-1">
                            {has_discount ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-gray-500 line-through text-[10px]">
                                  <span>💰 {tier.cost.coins.toLocaleString()}</span>
                                  <span>💎 {tier.cost.gems}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-400">💰 {discounted_cost.coins.toLocaleString()}</span>
                                  <span className="text-green-400">💎 {discounted_cost.gems}</span>
                                </div>
                                <div className="text-yellow-400 text-[9px]">Agent Discount!</div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-400">💰 {tier.cost.coins.toLocaleString()}</span>
                                <span className="text-purple-400">💎 {tier.cost.gems}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room Themes */}
            <div className="bg-gray-800/80 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Room Themes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROOM_THEMES.map((theme) => {
                  // Apply real estate agent discount for display  
                  const bonus_service = RealEstateAgentBonusService.getInstance();
                  const discounted_cost = bonus_service.applyFacilityCostReduction(theme.cost);
                  const has_discount = discounted_cost.coins < theme.cost.coins || discounted_cost.gems < theme.cost.gems;

                  const can_afford = headquarters.currency.coins >= discounted_cost.coins &&
                    headquarters.currency.gems >= discounted_cost.gems;
                  const is_unlocked = headquarters.unlocked_themes.includes(theme.id);

                  const handleThemePurchase = async () => {
                    if (!is_unlocked && can_afford) {
                      // Apply real estate agent discount
                      const bonus_service = RealEstateAgentBonusService.getInstance();
                      const discounted_cost = bonus_service.applyFacilityCostReduction(theme.cost);

                      const new_headquarters = {
                        ...headquarters,
                        currency: {
                          coins: headquarters.currency.coins - discounted_cost.coins,
                          gems: headquarters.currency.gems - discounted_cost.gems
                        },
                        unlocked_themes: [...headquarters.unlocked_themes, theme.id]
                      };

                      // Update local state first for immediate UI feedback
                      setHeadquarters(new_headquarters);

                      // Save to backend database
                      try {
                        await saveHeadquarters(new_headquarters);
                        console.log('✅ Room theme purchase saved successfully');
                      } catch (error) {
                        console.error('❌ Failed to save room theme purchase:', error);
                        // Revert local state if save failed
                        setHeadquarters(headquarters);
                        alert('Failed to save theme purchase. Please try again.');
                      }
                    }
                  };

                  return (
                    <div
                      key={theme.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${is_unlocked
                        ? 'border-green-500 bg-green-900/20'
                        : can_afford
                          ? 'border-blue-500 bg-blue-900/20 hover:bg-blue-900/30'
                          : 'border-gray-600 bg-gray-700/30 opacity-60'
                        }`}
                      onClick={handleThemePurchase}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{theme.icon}</span>
                        <h3 className="font-semibold text-white">{theme.name}</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{theme.description}</p>
                      <div className="text-sm text-blue-400 mb-2">
                        +{theme.bonus_value}% {theme.bonus}
                      </div>
                      <div className="text-xs text-gray-300 mb-3">
                        Best for: {theme.suitable_characters.map(name => {
                          const char = (available_characters && Array.isArray(available_characters))
                            ? available_characters.find(c => c.base_name === name)
                            : null;
                          return char?.name.split(' ')[0];
                        }).join(', ')}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1 text-xs">
                          {has_discount ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-500 line-through text-[10px]">
                                <span>💰 {theme.cost.coins.toLocaleString()}</span>
                                <span>💎 {theme.cost.gems}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-400">💰 {discounted_cost.coins.toLocaleString()}</span>
                                <span className="text-green-400">💎 {discounted_cost.gems}</span>
                              </div>
                              <div className="text-yellow-400 text-[9px]">Agent Discount!</div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-yellow-400">💰 {theme.cost.coins.toLocaleString()}</span>
                              <span className="text-purple-400">💎 {theme.cost.gems}</span>
                            </div>
                          )}
                        </div>
                        {is_unlocked ? (
                          <span className="text-green-400 text-xs font-semibold">✓ Owned</span>
                        ) : can_afford ? (
                          <span className="text-blue-400 text-xs font-semibold">Click to Purchase</span>
                        ) : (
                          <span className="text-red-400 text-xs">Cannot Afford</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Character Slot Capacity Upgrade Component */}
            <CharacterSlotUpgrade
              currency={headquarters.currency}
              onCurrencyUpdate={(coins, gems) => {
                setHeadquarters(prev => ({
                  ...prev,
                  currency: { coins, gems }
                }));
              }}
            />

            {/* Real Estate Agent Chat */}
            <RealEstateAgentChat />
          </SafeMotion>
        )}

        {view_mode === 'confessionals' && (
          <SafeMotion
            as="div"
            key="confessionals"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="w-full h-[calc(100vh-200px)] min-h-[600px] rounded-xl overflow-hidden"
          >
            {/* Full-screen immersive Confessional Scene - UI is INSIDE the 3D world */}
            <ConfessionalChatScene
              availableCharacters={available_characters}
              headquarters={headquarters}
              onClose={() => setViewMode('overview')}
            />
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Bed Shop Modal */}
      <AnimatePresence>
        {show_bed_shop && selected_room_for_beds && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowBedShop(false)}
          >
            <SafeMotion
              as="div"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-800 rounded-xl p-6 max-w-lg w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BedIcon className="w-5 h-5" />
                  Buy Beds for {headquarters.rooms.find(r => r.id === selected_room_for_beds)?.name}
                </h3>
                <button
                  onClick={() => setShowBedShop(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Your Currency:</span>
                  <span className="text-yellow-400">
                    {headquarters.currency.coins.toLocaleString()} coins, {headquarters.currency.gems} gems
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {PURCHASABLE_BEDS.map((bed) => {
                  const can_afford = headquarters.currency.coins >= bed.cost.coins &&
                    headquarters.currency.gems >= bed.cost.gems;

                  return (
                    <div key={bed.id} className="border border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{bed.icon}</span>
                          <div>
                            <h4 className="text-white font-semibold">{bed.name}</h4>
                            <p className="text-sm text-gray-400">{bed.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-300">
                            Sleeps: {bed.capacity} | Comfort: +{bed.comfort_bonus}
                          </div>
                          <div className="text-sm text-yellow-400">
                            {bed.cost.coins} coins, {bed.cost.gems} gems
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          await purchaseBed(selected_room_for_beds, bed, headquarters, setHeadquarters, setMoveNotification);
                          setShowBedShop(false);
                        }}
                        disabled={!can_afford}
                        className={`w-full py-2 px-4 rounded-lg transition-all ${can_afford
                          ? 'bg-green-600 hover:bg-green-500 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                      >
                        {can_afford ? 'Purchase' : 'Not enough currency'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Multi-Element Room Theming Modal */}
      <AnimatePresence>
        {selected_room && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedRoom(null)}
          >
            <SafeMotion
              as="div"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const room = headquarters.rooms.find(r => r.id === selected_room);
                if (!room) return null;

                const element_capacity = getElementCapacity(headquarters.current_tier);
                const room_bonuses = calculateRoomBonuses(selected_room, headquarters);

                return (
                  <>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-white">{room.name}</h2>
                        <p className="text-gray-400">Multi-Element Training Environment</p>
                      </div>
                      <button
                        onClick={() => setSelectedRoom(null)}
                        className="text-gray-400 hover:text-white text-2xl"
                      >
                        ×
                      </button>
                    </div>

                    {/* Room Preview */}
                    <div className="bg-gradient-to-b from-blue-900/20 to-blue-800/10 rounded-xl p-6 mb-6 border border-blue-700/30">
                      <div className="text-center mb-4">
                        {room.custom_image_url ? (
                          <img
                            src={room.custom_image_url}
                            alt={`${room.name} custom design`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-600 shadow-lg"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-gray-600">
                            <div className="text-center">
                              <div className="text-6xl mb-2">🏠</div>
                              <div className="text-gray-400">Preview Room Design</div>
                              <button
                                onClick={async () => {
                                  if (is_generating_room_image || room.elements.length === 0) return;

                                  setIsGeneratingRoomImage(true);
                                  try {
                                    const elementNames = room.elements.map(elementId => {
                                      const element = ROOM_ELEMENTS.find(el => el.id === elementId);
                                      return element?.name || elementId;
                                    }).join(', ');
                                    const description = `A ${room.theme || 'modern'} style ${room.name} with ${elementNames}`;

                                    const imageUrl = await generateRoomImage({
                                      description,
                                      size: "512x512",
                                      n: 1,
                                      style: room.theme || undefined
                                    });

                                    setHeadquarters(prev => ({
                                      ...prev,
                                      rooms: prev.rooms.map(r =>
                                        r.id === selected_room
                                          ? { ...r, custom_image_url: imageUrl }
                                          : r
                                      )
                                    }));
                                  } catch (error) {
                                    console.error('Failed to generate room image:', error);
                                  } finally {
                                    setIsGeneratingRoomImage(false);
                                  }
                                }}
                                disabled={is_generating_room_image || room.elements.length === 0}
                                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                              >
                                {is_generating_room_image ? 'Generating...' :
                                  room.elements.length === 0 ? 'Add elements first' :
                                    '🎨 Generate Custom Image'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Element Capacity */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-300 font-semibold">Element Capacity</span>
                          <span className="text-blue-200">{room.elements.length}/{element_capacity}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(room.elements.length / element_capacity) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Active Bonuses */}
                      {Object.keys(room_bonuses).length > 0 && (
                        <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
                          <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Active Set Bonuses
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(room_bonuses).map(([bonus, value]) => (
                              <div key={bonus} className="text-sm text-green-300 bg-green-900/30 px-2 py-1 rounded">
                                +{value}% {bonus}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Current Elements */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Current Set Elements</h3>
                      {room.elements.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {room.elements.map(elementId => {
                            const element = ROOM_ELEMENTS.find(e => e.id === elementId);
                            if (!element) return null;

                            return (
                              <div
                                key={elementId}
                                className={`p-3 rounded-lg border ${element.background_color} ${element.text_color}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{element.icon}</span>
                                    <div>
                                      <div className="font-semibold">{element.name}</div>
                                      <div className="text-xs opacity-80">{element.category}</div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeElementFromRoom(selected_room, elementId, setHeadquarters)}
                                    className="text-red-400 hover:text-red-300 text-lg"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-600 rounded-lg">
                          No elements selected. Choose from categories below to start designing!
                        </div>
                      )}
                    </div>

                    {/* Element Categories */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Add Elements by Category</h3>
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {(['wallDecor', 'furniture', 'lighting', 'accessories', 'flooring'] as const).map(category => (
                          <button
                            key={category}
                            onClick={() => setSelectedElementCategory(category)}
                            className={`px-3 py-2 rounded-lg text-sm transition-all ${selected_element_category === category
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                          >
                            {category === 'wallDecor' ? 'Wall Decor' :
                              category === 'furniture' ? 'Furniture' :
                                category === 'lighting' ? 'Lighting' :
                                  category === 'accessories' ? 'Accessories' : 'Flooring'}
                          </button>
                        ))}
                      </div>

                      {/* Elements for Selected Category */}
                      {selected_element_category && (
                        <div className="bg-gray-700/30 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-3 capitalize">{selected_element_category} Options</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ROOM_ELEMENTS
                              .filter(element => element.category === selected_element_category)
                              .map(element => {
                                const is_owned = room.elements.includes(element.id);
                                const can_afford = headquarters.currency.coins >= element.cost.coins &&
                                  headquarters.currency.gems >= element.cost.gems;
                                const at_capacity = room.elements.length >= element_capacity;

                                return (
                                  <div
                                    key={element.id}
                                    className={`p-3 rounded-lg border transition-all ${is_owned
                                      ? 'border-green-500 bg-green-900/20'
                                      : can_afford && !at_capacity
                                        ? 'border-blue-500 bg-blue-900/20 cursor-pointer hover:bg-blue-900/30'
                                        : 'border-gray-600 bg-gray-700/30'
                                      }`}
                                    onClick={() => {
                                      if (!is_owned && can_afford && !at_capacity) {
                                        addElementToRoom(selected_room, element.id, headquarters, setHeadquarters);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="text-2xl">{element.icon}</span>
                                      <div className="flex-1">
                                        <div className="font-semibold text-white">{element.name}</div>
                                        <div className="text-sm text-gray-400">{element.description}</div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                      <div className="text-blue-400">
                                        +{element.bonus_value}% {element.bonus}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-yellow-400">{element.cost.coins}</span>
                                        <span className="text-purple-400">{element.cost.gems}</span>
                                      </div>
                                    </div>

                                    {is_owned && (
                                      <div className="mt-2 text-green-400 text-sm font-semibold">✓ Owned</div>
                                    )}
                                    {!can_afford && !is_owned && (
                                      <div className="mt-2 text-red-400 text-sm">Cannot afford</div>
                                    )}
                                    {at_capacity && !is_owned && (
                                      <div className="mt-2 text-orange-400 text-sm">Room at capacity</div>
                                    )}
                                  </div>
                                );
                              })
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setSelectedRoom(null)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-lg transition-colors font-semibold"
                    >
                      Save Training Setup
                    </button>
                  </>
                );
              })()}
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Tutorial System */}
      <Tutorial />
      {/* Real Estate Agent removed - now in Facilities tab */}
    </div>
  );
}