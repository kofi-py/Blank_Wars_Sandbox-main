'use client';

import { useState } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import { 
  User, 
  Users, 
  Package,
  Crown,
  Sparkles
} from 'lucide-react';
import CharacterCollection from './CharacterCollection';
import UserProfile from './UserProfile';
import {
  UserProfile as IUserProfile,
  OwnedCharacter,
  SubscriptionTier,
  UserPreferences,
  subscriptionTiers
} from '@/data/userAccount';

interface AccountManagerProps {
  initial_user_profile?: IUserProfile;
  onCharacterSelect?: (character: OwnedCharacter) => void;
  onProfileUpdate?: (profile: IUserProfile) => void;
}

export default function AccountManager({
  initial_user_profile,
  onCharacterSelect,
  onProfileUpdate
}: AccountManagerProps) {
  const [activeTab, setActiveTab] = useState<'collection' | 'profile' | 'packs'>('collection');

  // Mock user profile data - in real app this would come from backend
  const [userProfile, setUserProfile] = useState<IUserProfile>(initial_user_profile || {
    id: 'user_001',
    username: 'WarriorMaster',
    email: 'player@example.com',
    avatar: '⚔️',
    title: 'Champion of the Arena',
    player_level: 25,
    total_xp: 15000,
    join_date: new Date('2024-01-15'),
    last_active: new Date(),
    character_slot_capacity: 8,
    subscription_tier: 'silver',
    subscription_expiry: new Date('2025-06-01'),
    is_active: true,
    currency: {
      gold: 7000,
      gems: 150,
      training_points: 45,
      battle_tokens: 12,
      pack_credits: 3,
      event_currency: 0
    },
    preferences: {
      battle_animation_speed: 'normal',
      sound_enabled: true,
      music_enabled: true,
      notifications_enabled: true,
      theme: 'dark',
      language: 'en',
      time_zone: 'UTC',
      auto_save_enabled: true,
      tutorial_completed: true,
      expert_mode: false,
      profile_public: true,
      show_online_status: true,
      allow_friend_requests: true,
      default_sort_order: 'recent',
      show_duplicates: false,
      compact_view: false
    },
    stats: {
      battles_won: 147,
      battles_lost: 23,
      battles_draw: 5,
      total_battles: 175,
      win_rate: 84,
      win_streak: 8,
      best_win_streak: 25,
      training_sessions_completed: 89,
      total_training_time: 1240,
      skill_pointsEarned: 156,
      training_pointsEarned: 89,
      characters_unlocked: 8,
      total_character_levels: 234,
      highest_character_level: 45,
      gold_earned: 25000,
      gold_spent: 18000,
      items_used: 67,
      equipment_crafted: 12,
      perfect_battles: 23,
      critical_hit_streak: 15,
      abilities_unlocked: 34,
      total_play_time: 2100,
      daily_play_streak: 12,
      longest_play_streak: 30
    },
    achievements: [
      {
        id: 'first_victory',
        name: 'First Victory',
        description: 'Win your first battle',
        icon: '🏆',
        rarity: 'common',
        category: 'battle',
        progress: 1,
        max_progress: 1,
        is_completed: true,
        completed_date: new Date('2024-01-16'),
        rewards: [{ type: 'gold', amount: 100 }]
      },
      {
        id: 'win_streak_10',
        name: 'Unstoppable',
        description: 'Win 10 battles in a row',
        icon: '🔥',
        rarity: 'rare',
        category: 'battle',
        progress: 10,
        max_progress: 10,
        is_completed: true,
        completed_date: new Date('2024-02-01'),
        rewards: [{ type: 'gold', amount: 1000 }]
      },
      {
        id: 'collector_10',
        name: 'Character Collector',
        description: 'Collect 10 different characters',
        icon: '👥',
        rarity: 'uncommon',
        category: 'collection',
        progress: 8,
        max_progress: 10,
        is_completed: false,
        rewards: [{ type: 'gold', amount: 500 }]
      }
    ],
    characters_owned: [
      {
        character_id: 'achilles',
        character_name: 'Achilles',
        archetype: 'warrior',
        rarity: 'legendary',
        acquisition_method: 'starter',
        acquisition_date: new Date('2024-01-15'),
        level: 45,
        xp: 2800,
        total_xp: 25000,
        wins: 89,
        losses: 12,
        draws: 3,
        training_level: 85,
        skills_learned: ['power_strike', 'defensive_stance', 'berserker_rage'],
        abilities_unlocked: ['achilles_wrath', 'shield_bash', 'warrior_instinct'],
        ability_progress: [
          { ability_id: 'achilles_wrath', rank: 3, experience: 450 },
          { ability_id: 'shield_bash', rank: 2, experience: 200 }
        ],
        equipped_items: {
          weapon: 'excalibur',
          armor: 'plate_mail',
          accessory: 'power_ring'
        },
        nickname: 'The Invincible',
        is_favorite: true,
        is_starter: true,
        last_used: new Date(),
        total_battle_time: 560,
        total_training_time: 240
      },
      {
        character_id: 'merlin',
        character_name: 'Merlin',
        archetype: 'mage',
        rarity: 'epic',
        acquisition_method: 'pack',
        acquisition_date: new Date('2024-01-20'),
        level: 38,
        xp: 1600,
        total_xp: 18000,
        wins: 34,
        losses: 8,
        draws: 1,
        training_level: 72,
        skills_learned: ['elemental_mastery', 'mana_shield'],
        abilities_unlocked: ['arcane_mastery', 'elemental_bolt'],
        ability_progress: [
          { ability_id: 'arcane_mastery', rank: 2, experience: 300 }
        ],
        equipped_items: {
          weapon: 'elemental_orb',
          armor: 'archmage_robes'
        },
        is_favorite: true,
        is_starter: false,
        last_used: new Date(Date.now() - 86400000), // 1 day ago
        total_battle_time: 420,
        total_training_time: 180
      },
      {
        character_id: 'loki',
        character_name: 'Loki',
        archetype: 'trickster',
        rarity: 'rare',
        acquisition_method: 'quest',
        acquisition_date: new Date('2024-02-10'),
        level: 28,
        xp: 800,
        total_xp: 8000,
        wins: 24,
        losses: 3,
        draws: 1,
        training_level: 45,
        skills_learned: ['stealth', 'illusion'],
        abilities_unlocked: ['shadow_clone', 'cunning'],
        ability_progress: [],
        equipped_items: {
          weapon: 'shadow_dagger',
          armor: 'assassin_garb'
        },
        is_favorite: false,
        is_starter: false,
        last_used: new Date(Date.now() - 172800000), // 2 days ago
        total_battle_time: 280,
        total_training_time: 120
      }
    ]
  });

  const [selected_character, setSelectedCharacter] = useState<OwnedCharacter | null>(null);
  const [showPackOpening, setShowPackOpening] = useState(false);

  // Handle profile updates
  const handleProfileUpdate = (updates: Partial<IUserProfile>) => {
    const updatedProfile = { ...userProfile, ...updates };
    setUserProfile(updatedProfile);
    onProfileUpdate?.(updatedProfile);
  };

  // Handle subscription upgrade
  const handleUpgradeSubscription = (tier: SubscriptionTier) => {
    const tierConfig = subscriptionTiers[tier];
    const updatedProfile = {
      ...userProfile,
      subscription_tier: tier,
      character_slot_capacity: tierConfig.character_slots,
      subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
    setUserProfile(updatedProfile);
    console.log(`Upgraded to ${tierConfig.display_name} for $${tierConfig.price}/month`);
  };

  // Handle character selection
  const handleCharacterSelect = (character: OwnedCharacter) => {
    setSelectedCharacter(character);
    onCharacterSelect?.(character);

    // Update last used time
    const updatedCharacters = userProfile.characters_owned.map(c =>
      c.character_id === character.character_id
        ? { ...c, last_used: new Date() }
        : c
    );

    handleProfileUpdate({ characters_owned: updatedCharacters });
  };

  // Handle pack opening
  const handleOpenPack = () => {
    if (userProfile.currency.pack_credits > 0) {
      setShowPackOpening(true);
      // Simulate pack opening logic here
      // This would normally involve API calls and complex reward generation
      console.log('Opening character pack...');

      // Deduct pack credit
      const updatedCurrency = {
        ...userProfile.currency,
        pack_credits: userProfile.currency.pack_credits - 1
      };

      handleProfileUpdate({ currency: updatedCurrency });
    } else {
      console.log('No pack credits available');
    }
  };

  // Handle character management
  const handleManageCharacter = (character: OwnedCharacter) => {
    setSelectedCharacter(character);
    // Could open a detailed management modal or navigate to character details
    console.log('Managing character:', character.character_name);
  };

  // Handle preference updates
  const handleUpdatePreferences = (preferences: UserPreferences) => {
    handleProfileUpdate({ preferences });
  };

  const maxSlots = subscriptionTiers[userProfile.subscription_tier].character_slots;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Crown className="w-8 h-8 text-yellow-400" />
          Account Dashboard
        </h1>
        <p className="text-gray-400 text-lg">
          Manage your warriors, track progress, and customize your experience
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-yellow-400">{userProfile.currency.gold.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Gold</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-400">{userProfile.currency.gems}</div>
            <div className="text-xs text-gray-400">Gems</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-400">{userProfile.characters_owned.length}/{maxSlots}</div>
            <div className="text-xs text-gray-400">Characters</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">{userProfile.stats.win_streak}</div>
            <div className="text-xs text-gray-400">Win Streak</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-400">{userProfile.player_level}</div>
            <div className="text-xs text-gray-400">Player Level</div>
          </div>
          <div>
            <div className="text-xl font-bold text-pink-400">{userProfile.currency.pack_credits}</div>
            <div className="text-xs text-gray-400">Pack Credits</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-gray-800/50 rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setActiveTab('collection')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'collection'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Collection</span>
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {userProfile.characters_owned.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('packs')}
            className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'packs'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Packs</span>
            {userProfile.currency.pack_credits > 0 && (
              <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                {userProfile.currency.pack_credits}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'collection' && (
          <SafeMotion.div
            key="collection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CharacterCollection
              characters={userProfile.characters_owned}
              subscription_tier={userProfile.subscription_tier}
              max_slots={maxSlots}
              onSelectCharacter={handleCharacterSelect}
              onUpgradeSubscription={() => handleUpgradeSubscription('gold')}
              onOpenPack={handleOpenPack}
              onManageCharacter={handleManageCharacter}
              active_character_id={selected_character?.character_id}
            />
          </SafeMotion.div>
        )}

        {activeTab === 'profile' && (
          <SafeMotion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <UserProfile
              user_profile={userProfile}
              onUpdateProfile={handleProfileUpdate}
              onUpgradeSubscription={handleUpgradeSubscription}
              onUpdatePreferences={handleUpdatePreferences}
            />
          </SafeMotion.div>
        )}

        {activeTab === 'packs' && (
          <SafeMotion.div
            key="packs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            class_name="text-center py-12"
          >
            <Package className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Character Packs</h2>
            <p className="text-gray-400 mb-6">
              Open packs to discover new legendary warriors!
            </p>

            {userProfile.currency.pack_credits > 0 ? (
              <div className="space-y-4">
                <div className="text-lg text-white">
                  You have <span className="text-purple-400 font-bold">{userProfile.currency.pack_credits}</span> pack credits available
                </div>
                <button
                  onClick={handleOpenPack}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors flex items-center gap-3 mx-auto"
                >
                  <Sparkles className="w-6 h-6" />
                  Open Character Pack
                  <Sparkles className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400">No pack credits available</p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Pack credits can be earned through:</p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Daily login rewards</li>
                    <li>• Completing achievements</li>
                    <li>• Special events</li>
                    <li>• Subscription benefits</li>
                  </ul>
                </div>
              </div>
            )}
          </SafeMotion.div>
        )}
      </AnimatePresence>

      {/* Pack Opening Modal */}
      <AnimatePresence>
        {showPackOpening && (
          <SafeMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPackOpening(false)}
          >
            <SafeMotion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              class_name="bg-gray-900 rounded-xl border border-gray-700 p-8 max-w-md w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-white mb-4">Pack Opened!</h2>
              <p className="text-gray-400 mb-6">
                Pack opening system would be implemented here with animations and rewards
              </p>
              <button
                onClick={() => setShowPackOpening(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Continue
              </button>
            </SafeMotion.div>
          </SafeMotion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
