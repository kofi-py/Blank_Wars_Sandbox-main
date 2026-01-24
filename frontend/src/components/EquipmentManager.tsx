'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import {
  Sword,
  Shield,
  Gem,
  TrendingUp,
  Search,
  X,
  CheckCircle,
  Lock,
  MessageCircle,
  Send,
  User,
  Package
} from 'lucide-react';
import { Equipment, EquipmentSlot, EquipmentRarity } from '@/data/equipment';
import { equipmentCache } from '@/services/equipmentCache';
import { getEquipmentImage } from '@/constants/equipmentImages';
import { characterAPI } from '@/services/apiClient';
import GameEventBus from '@/services/gameEventBus';

interface EquippedItemResponse {
  equipment_id: string;
  name: string;
  description: string;
  slot: string;
  rarity: string;
  stats: string | object;
  effects: string | object;
}

interface RarityConfigItem {
  color: string;
  text_color: string;
  icon: string;
  name: string;
}

// Utility functions that work with database data
const rarityConfig: Record<EquipmentRarity, RarityConfigItem> = {
  common: { color: 'from-gray-400 to-gray-500', text_color: 'text-gray-600', icon: '⚪', name: 'Common' },
  uncommon: { color: 'from-green-400 to-green-500', text_color: 'text-green-600', icon: '🟢', name: 'Uncommon' },
  rare: { color: 'from-blue-400 to-blue-500', text_color: 'text-blue-600', icon: '🔵', name: 'Rare' },
  epic: { color: 'from-purple-400 to-purple-500', text_color: 'text-purple-600', icon: '🟣', name: 'Epic' },
  legendary: { color: 'from-orange-400 to-orange-500', text_color: 'text-orange-600', icon: '🟠', name: 'Legendary' },
  mythic: { color: 'from-red-400 to-red-500', text_color: 'text-red-600', icon: '🔴', name: 'Mythic' }
};

const canEquip = (equipment: Equipment, character_level: number, character_archetype: string): boolean => {
  const levelCheck = character_level >= equipment.required_level;
  const archetypeCheck = !equipment.required_archetype || equipment.required_archetype.length === 0 || equipment.required_archetype.includes(character_archetype);
  return levelCheck && archetypeCheck;
};

const calculateEquipmentStats = (equipment: Equipment[]): Record<string, number> => {
  return equipment.reduce((total, item) => {
    const stats = item.stats || {};
    Object.entries(stats).forEach(([key, value]) => {
      total[key] = (total[key] || 0) + (typeof value === 'number' ? value : 0);
    });
    return total;
  }, {} as Record<string, number>);
};

interface EquippedItems {
  weapon?: Equipment;
  armor?: Equipment;
  accessory?: Equipment;
}

interface EquipmentManagerProps {
  character_id: string;
  character_name: string;
  character_level: number;
  character_archetype: string;
  equipped_items?: EquippedItems;
  inventory?: Equipment[];
  on_equip: (equipment: Equipment) => void;
  on_unequip: (slot: EquipmentSlot) => void;
  adherence_score: number; // REQUIRED - Gameplan adherence level (0-100)
  bond_level: number; // REQUIRED - Bond/trust level with coach (0-100)
}

export default function EquipmentManager({
  character_id = "",
  character_name = "Unknown Character",
  character_level = 1,
  character_archetype = "warrior",
  equipped_items = {},
  inventory = [],
  on_equip,
  on_unequip,
  adherence_score,
  bond_level
}: Partial<EquipmentManagerProps> = {}) {
  // STRICT VALIDATION - Fail loudly if required props missing
  if (adherence_score === undefined || adherence_score === null) {
    throw new Error(`[EquipmentManager] adherence_score is required for ${character_name} but got: ${adherence_score}`);
  }
  if (bond_level === undefined || bond_level === null) {
    throw new Error(`[EquipmentManager] bond_level is required for ${character_name} but got: ${bond_level}`);
  }
  const { isMobile } = useMobileSafeMotion();
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<EquipmentRarity | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'rarity' | 'stats'>('level');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showEquippedOnly, setShowEquippedOnly] = useState(false);

  // Equipment Chat State
  const [showEquipmentChat, setShowEquipmentChat] = useState(false);
  const [chat_messages, setChatMessages] = useState<Array<{
    id: number;
    sender: 'coach' | 'contestant';
    message: string;
    timestamp: Date;
    character_name?: string;
  }>>([]);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [is_loadingEquipment, setIsLoadingEquipment] = useState(true);
  const [currentEquippedItems, setCurrentEquippedItems] = useState<EquippedItems>(equipped_items);
  const [isEquipping, setIsEquipping] = useState(false);

  // Lock state for autonomous equipment decisions
  const ADHERENCE_THRESHOLD = 70;
  const isEquipmentLocked = adherence_score < ADHERENCE_THRESHOLD;
  const [isOverriding, setIsOverriding] = useState(false); // For animation state
  const [showRejectionNotification, setShowRejectionNotification] = useState(false);

  // Use ONLY the inventory prop provided by parent
  useEffect(() => {
    console.log(`📦 Using inventory with ${inventory?.length || 0} items for ${character_name}`);
    setAllEquipment(inventory || []);
    setIsLoadingEquipment(false);
  }, [character_name, inventory]);

  // Load equipped items from character's personal inventory
  useEffect(() => {
    const loadEquippedItems = async () => {
      if (!character_id) return;
      
      try {
        const result = await characterAPI.get_equipped_items(character_id);
        if (result.success && result.equippedItems) {
          // Convert array of equipped items to object format
          const equipped: EquippedItems = {};
          result.equippedItems.forEach((item: EquippedItemResponse) => {
            equipped[item.slot as EquipmentSlot] = {
              id: item.equipment_id,
              name: item.name,
              description: item.description,
              slot: item.slot,
              rarity: item.rarity,
              stats: typeof item.stats === 'string' ? JSON.parse(item.stats) : item.stats,
              effects: typeof item.effects === 'string' ? JSON.parse(item.effects) : item.effects,
              icon: '⚔️',
              required_level: 1,
              flavor: ''
            };
          });
          setCurrentEquippedItems(equipped);
          console.log(`✅ Loaded ${Object.keys(equipped).length} equipped items for character ${character_id}`);
        }
      } catch (error) {
        console.error('❌ Failed to load equipped items:', error);
      }
    };

    loadEquippedItems();
  }, [character_id]);

  // Handle equipment equipping
  const handleEquip = async (equipment: Equipment) => {
    if (!character_id || isEquipping) return;

    setIsEquipping(true);

    try {
      // Always call equipItem - backend handles adherence check
      const result = await characterAPI.equip_item(character_id, equipment.id);

      console.log(`🔍 [DEBUG] Equip result:`, result);

      // Check if character rebelled
      if (result.success && !result.adhered && result.aiResponse) {
        // Character rebelled - show dialogue
        const aiMessage = {
          id: Date.now(),
          sender: 'contestant' as const,
          message: result.aiResponse,
          timestamp: new Date(),
          character_name: character_name
        };
        setChatMessages(prev => [...prev, aiMessage]);
        setShowEquipmentChat(true);

        // Show rejection notification
        setShowRejectionNotification(true);
        setTimeout(() => setShowRejectionNotification(false), 5000);

        // Find what was actually equipped
        const actualEquipment = allEquipment.find(e => e.id === result.equippedChoice);
        if (actualEquipment) {
          setCurrentEquippedItems(prev => ({
            ...prev,
            [equipment.slot]: actualEquipment
          }));
          console.log(`🤖 ${character_name} chose ${actualEquipment.name} instead of ${equipment.name}`);
        }

        // Publish event
        const eventBus = GameEventBus.getInstance();
        eventBus.publish({
          type: 'equipment_equipped',
          source: 'equipment_room',
          primary_character_id: character_id,
          severity: 'low',
          category: 'equipment',
          description: `${character_name} rebelled and equipped ${actualEquipment.name}`,
          metadata: {
            rebellion: true,
            message: result.aiResponse,
            equipment_choice: actualEquipment.name
          },
          tags: ['equipment', 'character_rebellion']
        });
      } else if (result.success) {
        // Coach's choice accepted
        setCurrentEquippedItems(prev => ({
          ...prev,
          [equipment.slot]: equipment
        }));
        console.log(`✅ Successfully equipped ${equipment.name}`);

        on_equip(equipment);
      } else {
        console.error('❌ Failed to equip item:', result.error);
      }
    } catch (error) {
      console.error('❌ Error equipping item:', error);
    }

    setIsEquipping(false);
  };

  // Handle equipment unequipping
  const handleUnequip = async (slot: EquipmentSlot) => {
    if (!character_id || isEquipping) return;

    const currentItem = currentEquippedItems[slot];
    if (!currentItem) return;

    setIsEquipping(true);

    // Check adherence - if low, trigger autonomous decision for unequipping
    if (isEquipmentLocked) {
      console.log(`⚠️ Adherence check failed (${adherence_score}% < ${ADHERENCE_THRESHOLD}%) - triggering autonomous unequip decision`);

      try {
        // Show override animation
        setIsOverriding(true);
        setShowRejectionNotification(true);

        // Call autonomous equipment decision endpoint (AI decides whether to keep item equipped)
        const autonomousResult = await characterAPI.make_autonomous_equipment_decision(
          character_id,
          slot,
          currentItem.id, // Current item they want to unequip
          adherence_score,
          bond_level
        );

        if (autonomousResult.success && autonomousResult.aiChoice) {
          // AI decided what to do - could keep current item, switch to different item, or unequip
          if (autonomousResult.aiChoice === 'unequip' || !autonomousResult.aiChoice) {
            // AI agreed to unequip
            setCurrentEquippedItems(prev => {
              const updated = { ...prev };
              delete updated[slot];
              return updated;
            });
            console.log(`🤖 ${character_name} agreed to unequip ${currentItem.name}`);

            // Add AI's agreement to chat
            const aiMessage = {
              id: Date.now(),
              sender: 'contestant' as const,
              message: autonomousResult.reasoning || `You're right, coach. I don't need the ${currentItem.name} right now.`,
              timestamp: new Date(),
              character_name: character_name
            };
            setChatMessages(prev => [...prev, aiMessage]);
            setShowEquipmentChat(true);
          } else {
            // AI chose to keep item or switch to something else
            const aiEquipment = allEquipment.find(e => e.id === autonomousResult.aiChoice);
            if (aiEquipment) {
              setCurrentEquippedItems(prev => ({
                ...prev,
                [slot]: aiEquipment
              }));
              console.log(`🤖 ${character_name} refused to unequip - chose ${aiEquipment.name} instead`);

              // Add AI's refusal to chat
              const aiMessage = {
                id: Date.now(),
                sender: 'contestant' as const,
                message: autonomousResult.reasoning || `No, I'm keeping my equipment. ${aiEquipment.id === currentItem.id ? `The ${currentItem.name} stays on.` : `Actually, I prefer the ${aiEquipment.name}.`}`,
                timestamp: new Date(),
                character_name: character_name
              };
              setChatMessages(prev => [...prev, aiMessage]);
              setShowEquipmentChat(true);
            }
          }
        }

        // Hide notification after 5 seconds
        setTimeout(() => setShowRejectionNotification(false), 5000);
        setIsOverriding(false);
      } catch (error) {
        console.error('❌ Error in autonomous unequip decision:', error);
        setIsOverriding(false);
      }
    } else {
      // Normal flow - adherence is good, coach's unequip choice stands
      try {
        const result = await characterAPI.unequip_item(character_id, currentItem.id);
        if (result.success) {
          setCurrentEquippedItems(prev => {
            const updated = { ...prev };
            delete updated[slot];
            return updated;
          });
          console.log(`✅ Successfully unequipped ${currentItem.name}`);

          on_unequip(slot);
        } else {
          console.error('❌ Failed to unequip item:', result.error);
        }
      } catch (error) {
        console.error('❌ Error unequipping item:', error);
      }
    }

    setIsEquipping(false);
  };

  // Get all available equipment for this character
  const availableEquipment = allEquipment.filter(item =>
    canEquip(item, character_level, character_archetype)
  );

  // console.log('🎯 Equipment Manager Debug:', {
  //   character_name,
  //   character_level,
  //   character_archetype,
  //   totalEquipment: allEquipment.length,
  //   available_equipment: availableEquipment.length,
  //   equipped_items: currentEquippedItems,
  //   onEquip: !!onEquip,
  //   onUnequip: !!onUnequip,
  //   is_loadingEquipment
  // });

  // Show loading state while equipment is being fetched
  if (is_loadingEquipment) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading equipment data...</p>
        </div>
      </div>
    );
  }

  // Filter and sort equipment
  const filteredEquipment = availableEquipment
    .filter(item => {
      const slotMatch = selectedSlot === 'all' || item.slot === selectedSlot;
      const rarityMatch = selectedRarity === 'all' || item.rarity === selectedRarity;
      const searchMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const equippedMatch = !showEquippedOnly || Object.values(currentEquippedItems).some((equipped: Equipment | undefined) => equipped?.id === item.id);

      return slotMatch && rarityMatch && searchMatch && equippedMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'level':
          return b.required_level - a.required_level;
        case 'rarity':
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
          return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
        case 'stats':
          const aStats = (a.stats.atk || 0) + (a.stats.def || 0) + (a.stats.spd || 0);
          const bStats = (b.stats.atk || 0) + (b.stats.def || 0) + (b.stats.spd || 0);
          return bStats - aStats;
        default:
          return 0;
      }
    });

  // Calculate total equipment stats
  const totalStats = calculateEquipmentStats(Object.values(currentEquippedItems).filter(Boolean) as Equipment[]);

  const getSlotIcon = (slot: EquipmentSlot) => {
    switch (slot) {
      case 'weapon': return <Sword className="w-5 h-5" />;
      case 'armor': return <Shield className="w-5 h-5" />;
      case 'accessory': return <Gem className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const is_equipped = (equipment: Equipment): boolean => {
    return Object.values(currentEquippedItems).some((equipped: Equipment | undefined) => equipped?.id === equipment.id);
  };

  const getStatColor = (stat: string) => {
    const colors = {
      atk: 'text-red-400',
      def: 'text-blue-400',
      spd: 'text-green-400',
      hp: 'text-pink-400',
      crit_rate: 'text-yellow-400',
      crit_damage: 'text-orange-400',
      accuracy: 'text-purple-400',
      evasion: 'text-cyan-400',
      energy_regen: 'text-indigo-400',
      xp_bonus: 'text-emerald-400'
    };
    return colors[stat as keyof typeof colors] || 'text-gray-400';
  };

  const getStatIcon = (stat: string): string => {
    const icons = {
      atk: '⚔️',
      def: '🛡️',
      spd: '⚡',
      hp: '❤️',
      crit_rate: '💥',
      crit_damage: '🔥',
      accuracy: '🎯',
      evasion: '👤',
      energy_regen: '🔋',
      xp_bonus: '⭐'
    };
    return icons[stat as keyof typeof icons] || '📊';
  };

  // Equipment Chat Functions
  const sendEquipmentChatMessage = async () => {
    if (!currentChatMessage.trim() || isChatLoading) return;

    const user_message = {
      id: Date.now(),
      sender: 'coach' as const,
      message: currentChatMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, user_message]);
    setCurrentChatMessage('');
    setIsChatLoading(true);

    try {
      // Real API call to equipment coaching service
      const token = localStorage.getItem('accessToken');
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

      const response = await fetch(`${BACKEND_URL}/coaching/equipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character_id: character_id,
          user_message: currentChatMessage,
          context: {
            level: character_level,
            archetype: character_archetype,
            current_equipment: currentEquippedItems,
            available_equipment: inventory,
            bond_level: 50,
            previous_messages: chat_messages.slice(-5).map(msg => ({
              role: msg.sender === 'contestant' || msg.sender === 'coach' ? 'assistant' : 'user',
              content: msg.message
            }))
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const aiResponse = {
        id: Date.now() + 1,
        sender: 'contestant' as const,
        message: data.message,
        timestamp: new Date(),
        character_name: data.character || character_name
      };

      setChatMessages(prev => [...prev, aiResponse]);
      setIsChatLoading(false);
    } catch (error) {
      console.error('Equipment chat error:', error);
      const errorResponse = {
        id: Date.now() + 1,
        sender: 'contestant' as const,
        message: 'I apologize, but I\'m having trouble responding right now. Please try again.',
        timestamp: new Date(),
        character_name: character_name
      };
      setChatMessages(prev => [...prev, errorResponse]);
      setIsChatLoading(false);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendEquipmentChatMessage();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Sword className="w-8 h-8 text-orange-400" />
          Equipment Manager
        </h1>
        <p className="text-gray-400 text-lg">
          Equip {character_name} with the best gear for battle
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Equipment Slots */}
        <div className="lg:col-span-1">
          <div className={`bg-gray-900/50 rounded-xl border p-6 transition-all ${
            isEquipmentLocked
              ? 'border-red-500/50 shadow-lg shadow-red-500/20'
              : 'border-gray-700'
          }`}>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-400" />
              Equipped Items
              {isEquipmentLocked && (
                <Lock className="w-5 h-5 text-red-400 animate-pulse" />
              )}
            </h2>

            {/* Lock Status Message */}
            {isEquipmentLocked && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                <div className="text-red-300 text-sm font-semibold mb-1">
                  🔒 Equipment Locked
                </div>
                <div className="text-red-400 text-xs">
                  {character_name} doesn't trust your judgment right now (Adherence: {adherence_score}%)
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Regain control at {ADHERENCE_THRESHOLD}% adherence
                </div>
              </div>
            )}

            {/* Rejection Notification */}
            {showRejectionNotification && (
              <div className="mb-4 p-3 bg-orange-900/30 border border-orange-500/50 rounded-lg animate-pulse">
                <div className="text-orange-300 text-sm font-semibold">
                  ⚠️ {character_name} rejected your equipment choice and selected their own gear!
                </div>
              </div>
            )}

            {/* Equipment Slots */}
            <div className="space-y-4 mb-6">
              {['weapon', 'armor', 'accessory'].map((slot) => {
                const equipped = currentEquippedItems[slot as EquipmentSlot];
                const slotName = slot === 'armor' ? 'Armor' : slot.charAt(0).toUpperCase() + slot.slice(1);

                return (
                  <div
                    key={slot}
                    className={`border rounded-lg p-4 transition-all ${
                      isEquipmentLocked
                        ? 'border-red-500/30 bg-red-900/10 opacity-75 cursor-not-allowed'
                        : 'border-gray-600'
                    } ${isOverriding ? 'animate-pulse' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSlotIcon(slot as EquipmentSlot)}
                        <span className="text-white font-semibold">{slotName}</span>
                        {isEquipmentLocked && (
                          <Lock className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                      {equipped && (
                        <button
                          onClick={() => handleUnequip(slot as EquipmentSlot)}
                          disabled={isEquipping}
                          className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={isEquipmentLocked ? `${character_name} will decide for themselves...` : 'Unequip item'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {equipped ? (
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${rarityConfig[equipped.rarity].color}/20 border border-current`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{equipped.icon}</span>
                          <span className={`font-semibold ${rarityConfig[equipped.rarity].text_color}`}>
                            {equipped.name}
                          </span>
                          <span className="text-xs">{rarityConfig[equipped.rarity].icon}</span>
                        </div>
                        <div className="text-sm text-gray-400">{equipped.description}</div>

                        {/* Stats */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(equipped.stats).map(([stat, value]) => (
                            value && (
                              <span key={stat} className={`text-xs px-2 py-1 rounded bg-gray-700 ${getStatColor(stat)}`}>
                                {getStatIcon(stat)} +{value as number}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border-2 border-dashed border-gray-600 text-center text-gray-500">
                        <span className="text-2xl block mb-1">➕</span>
                        <span className="text-sm">No {slot} equipped</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Stats */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Total Equipment Bonuses
              </h3>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(totalStats).map(([stat, value]) => (
                  value && value > 0 && (
                    <div key={stat} className="flex items-center justify-between">
                      <span className="text-gray-400 capitalize">{stat.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={`font-semibold ${getStatColor(stat)}`}>
                        +{value}{stat.includes('Rate') || stat.includes('Bonus') ? '%' : ''}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Browser */}
        <div className="lg:col-span-3">
          <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Gem className="w-6 h-6 text-purple-400" />
                Available Equipment
              </h2>
              <div className="text-sm text-gray-400">
                Level {character_level} {character_archetype ? character_archetype.charAt(0).toUpperCase() + character_archetype.slice(1) : 'Unknown'}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search equipment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Slot Filter */}
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value as EquipmentSlot | 'all')}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Slots</option>
                <option value="weapon">Weapons</option>
                <option value="armor">Armor</option>
                <option value="accessory">Accessories</option>
              </select>

              {/* Rarity Filter */}
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value as EquipmentRarity | 'all')}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Rarities</option>
                {Object.entries(rarityConfig).map(([rarity, config]) => (
                  <option key={rarity} value={rarity}>{config.icon} {config.name}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'rarity' | 'level' | 'stats')}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="level">Sort by Level</option>
                <option value="name">Sort by Name</option>
                <option value="rarity">Sort by Rarity</option>
                <option value="stats">Sort by Stats</option>
              </select>
            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[650px] overflow-y-auto">
              {filteredEquipment.map((equipment) => {
                const equipped = is_equipped(equipment);
                const canEquipItem = canEquip(equipment, character_level, character_archetype);

                return (
                  <SafeMotion
                    as="div"
                    key={equipment.id}
                    class_name={`border rounded-lg p-4 transition-all cursor-pointer ${
                      equipped
                        ? 'border-green-500 bg-green-500/10'
                        : canEquipItem
                          ? `border-gray-600 hover:border-blue-500 bg-gradient-to-r ${rarityConfig[equipment.rarity].color}/5`
                          : 'border-gray-700 bg-gray-800/20 opacity-50'
                    }`}
                    while_hover={canEquipItem && !isMobile ? { scale: 1.02 } : {}}
                    transition={{ duration: isMobile ? 0.1 : 0.2, type: isMobile ? 'tween' : 'spring' }}
                    on_click={() => setSelectedEquipment(equipment)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{equipment.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${rarityConfig[equipment.rarity].text_color}`}>
                              {equipment.name}
                            </span>
                            <span className="text-xs">{rarityConfig[equipment.rarity].icon}</span>
                            {/* Team Equipment Indicator */}
                            {equipment.acquired_from === 'team_loan' && (
                              <span className="text-xs px-2 py-1 bg-blue-600/50 text-blue-300 rounded-full border border-blue-500 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Team
                              </span>
                            )}
                            {equipped && <CheckCircle className="w-4 h-4 text-green-400" />}
                            {!canEquipItem && <Lock className="w-4 h-4 text-red-400" />}
                          </div>
                          <div className="text-sm text-gray-400">
                            Level {equipment.required_level} • {equipment.slot}
                          </div>
                        </div>
                      </div>

                      {canEquipItem && !equipped && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquip(equipment);
                          }}
                          disabled={isEquipping}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={isEquipmentLocked ? `${character_name} will decide for themselves...` : ''}
                        >
                          {isEquipping ? 'Equipping...' : 'Equip'}
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-gray-400 mb-2">{equipment.description}</p>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(equipment.stats).map(([stat, value]) => (
                        value && (
                          <span key={stat} className={`text-xs px-2 py-1 rounded bg-gray-700 ${getStatColor(stat)}`}>
                            {getStatIcon(stat)} +{value}
                          </span>
                        )
                      ))}
                    </div>

                    {/* Effects */}
                    {equipment.effects.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-purple-400 font-semibold">Special Effects:</div>
                        {equipment.effects.map((effect, index) => (
                          <div key={effect.id} className="text-xs text-gray-400">
                            • {effect.name}: {effect.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </SafeMotion>
                );
              })}
            </div>

            {filteredEquipment.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Equipment Found</h3>
                <p className="text-gray-500">
                  Try adjusting your filters or search terms
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Equipment Detail Modal */}
      <AnimatePresence>
        {selectedEquipment && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isMobile ? 0.1 : 0.3 }}
            class_name="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            on_click={() => setSelectedEquipment(null)}
          >
            <SafeMotion
              as="div"
              initial={{ scale: isMobile ? 1 : 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: isMobile ? 1 : 0.9, opacity: 0 }}
              transition={{ duration: isMobile ? 0.1 : 0.3, type: isMobile ? 'tween' : 'spring' }}
              class_name="bg-gray-900 rounded-xl border border-gray-700 max-w-md w-full p-6"
              on_click={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">Equipment Details</h3>
                <button
                  onClick={() => setSelectedEquipment(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className={`p-4 rounded-lg bg-gradient-to-r ${rarityConfig[selectedEquipment.rarity].color}/20 border border-current mb-4`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{selectedEquipment.icon}</span>
                  <div>
                    <h4 className={`text-xl font-bold ${rarityConfig[selectedEquipment.rarity].text_color}`}>
                      {selectedEquipment.name}
                    </h4>
                    <div className="text-sm text-gray-400">
                      {rarityConfig[selectedEquipment.rarity].name} {selectedEquipment.slot}
                    </div>
                  </div>
                </div>

                <p className="text-gray-300 mb-3">{selectedEquipment.description}</p>
                <p className="text-sm text-gray-400 italic">&quot;{selectedEquipment.flavor}&quot;</p>
              </div>

              {/* Requirements */}
              <div className="mb-4">
                <h5 className="text-white font-semibold mb-2">Requirements</h5>
                <div className="space-y-1 text-sm">
                  <div className={`flex items-center gap-2 ${character_level >= selectedEquipment.required_level ? 'text-green-400' : 'text-red-400'}`}>
                    {character_level >= selectedEquipment.required_level ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    Level {selectedEquipment.required_level}
                  </div>
                  {selectedEquipment.required_archetype && (
                    <div className={`flex items-center gap-2 ${selectedEquipment.required_archetype.includes(character_archetype) ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedEquipment.required_archetype.includes(character_archetype) ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {selectedEquipment.required_archetype.join(', ')} only
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mb-4">
                <h5 className="text-white font-semibold mb-2">Stats</h5>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedEquipment.stats).map(([stat, value]) => (
                    value && (
                      <div key={stat} className="flex items-center justify-between">
                        <span className="text-gray-400 capitalize">{stat.replace(/([A-Z])/g, ' $1')}</span>
                        <span className={`font-semibold ${getStatColor(stat)}`}>
                          +{value}{stat.includes('Rate') || stat.includes('Bonus') ? '%' : ''}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Effects */}
              {selectedEquipment.effects.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-white font-semibold mb-2">Special Effects</h5>
                  <div className="space-y-2">
                    {selectedEquipment.effects.map((effect, index) => (
                      <div key={effect.id} className="bg-gray-800 rounded p-3">
                        <div className="text-purple-400 font-semibold">{effect.name}</div>
                        <div className="text-sm text-gray-300">{effect.description}</div>
                        <div className="text-xs text-gray-500 capitalize mt-1">
                          {effect.type} {effect.trigger && `• ${effect.trigger.replace(/_/g, ' ')}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {canEquip(selectedEquipment, character_level, character_archetype) && !is_equipped(selectedEquipment) && (
                  <button
                    onClick={() => {
                      handleEquip(selectedEquipment);
                      setSelectedEquipment(null);
                    }}
                    disabled={isEquipping}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isEquipmentLocked ? `${character_name} will decide for themselves...` : ''}
                  >
                    {isEquipping ? 'Equipping...' : 'Equip'}
                  </button>
                )}

                {is_equipped(selectedEquipment) && (
                  <button
                    onClick={() => {
                      handleUnequip(selectedEquipment.slot);
                      setSelectedEquipment(null);
                    }}
                    disabled={isEquipping}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isEquipmentLocked ? `${character_name} will decide for themselves...` : ''}
                  >
                    {isEquipping ? 'Unequipping...' : 'Unequip'}
                  </button>
                )}

                <button
                  onClick={() => setSelectedEquipment(null)}
                  className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
