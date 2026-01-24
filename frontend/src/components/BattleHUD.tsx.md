'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Settings, Timer, CreditCard, Gift, Package, Zap, Heart, Shield } from 'lucide-react';
import { shopAPI, equipmentAPI } from '@/services/apiClient';

interface BattleItem {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  icon: string;
  effects: Array<{
    type: string;
    value: number;
    target?: string;
    duration?: number;
    percentage?: boolean;
  }>;
  usageContext: string;
  quantity: number;
  cooldown?: number;
}

interface BattleHUDProps {
  // Announcer state
  isAnnouncerEnabled: boolean;
  isAnnouncerSpeaking: boolean;
  currentAnnouncement: string;
  announcementRef: React.RefObject<HTMLDivElement>;
  
  // Connection state
  isConnected: boolean;
  isAuthenticated: boolean;
  currentUser: any;
  
  // Timer state
  timer: number | null;
  isTimerActive: boolean;
  
  // Currency and cards
  playerCurrency: number;
  
  // Battle state
  battlePhase?: string;
  activeCharacterId?: string;
  
  // Handlers
  toggleAnnouncer: (enabled: boolean) => void;
  onToggleAudioSettings: () => void;
  onShowCardCollection: () => void;
  onShowCardPacks: () => void;
  onUseItem?: (itemId: string, targetCharacterId?: string) => void;
}

export default function BattleHUD({
  isAnnouncerEnabled,
  isAnnouncerSpeaking,
  currentAnnouncement,
  announcementRef,
  isConnected,
  isAuthenticated,
  currentUser,
  timer,
  isTimerActive,
  playerCurrency,
  battlePhase,
  activeCharacterId,
  toggleAnnouncer,
  onToggleAudioSettings,
  onShowCardCollection,
  onShowCardPacks,
  onUseItem
}: BattleHUDProps) {
  const [battleItems, setBattleItems] = useState<BattleItem[]>([]);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Load user's battle-ready items
  useEffect(() => {
    const loadBattleItems = async () => {
      if (!isAuthenticated || !isConnected) return;
      
      try {
        setIsLoadingItems(true);
        const response = await equipmentAPI.getUserInventory();
        
        if (response.success && response.inventory?.items) {
          const items = response.inventory.items
            .filter((item: any) => 
              item.usageContext === 'anytime' || 
              item.usageContext === 'battle'
            )
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              type: item.type,
              rarity: item.rarity,
              icon: item.icon,
              effects: item.effects || [],
              usageContext: item.usageContext,
              quantity: item.quantity,
              cooldown: item.cooldown || 0
            }));
          
          setBattleItems(items);
        }
      } catch (error) {
        console.error('Failed to load battle items:', error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    loadBattleItems();
  }, [isAuthenticated, isConnected]);

  const handleUseItem = async (item: BattleItem) => {
    if (!onUseItem) return;
    
    try {
      // Call the battle handler to use the item
      onUseItem(item.id, activeCharacterId);
      
      // Call the API to consume the item
      await shopAPI.useItem(item.id, 1, activeCharacterId);
      
      // Refresh items
      const response = await equipmentAPI.getUserInventory();
      if (response.success && response.inventory?.items) {
        const items = response.inventory.items
          .filter((item: any) => 
            item.usageContext === 'anytime' || 
            item.usageContext === 'battle'
          )
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.type,
            rarity: item.rarity,
            icon: item.icon,
            effects: item.effects || [],
            usageContext: item.usageContext,
            quantity: item.quantity,
            cooldown: item.cooldown || 0
          }));
        
        setBattleItems(items);
      }
    } catch (error) {
      console.error('Failed to use item:', error);
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'healing': return <Heart className="w-4 h-4" />;
      case 'energy': return <Zap className="w-4 h-4" />;
      case 'buff': return <Shield className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'text-gray-400 border-gray-500';
      case 'uncommon': return 'text-green-400 border-green-500';
      case 'rare': return 'text-blue-400 border-blue-500';
      case 'epic': return 'text-purple-400 border-purple-500';
      case 'legendary': return 'text-orange-400 border-orange-500';
      default: return 'text-gray-400 border-gray-500';
    }
  };
  return (
    <motion.div 
      className="bg-gradient-to-br from-orange-900/60 via-red-900/60 to-purple-900/60 rounded-xl backdrop-blur-sm border-2 border-orange-500/50 shadow-2xl h-full flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between p-4 border-b border-orange-500/30">
        <div className="flex items-center gap-3">
          {isAnnouncerEnabled ? (
            <Volume2 className={`w-6 h-6 ${isAnnouncerSpeaking ? 'text-yellow-400 animate-pulse' : 'text-orange-300'}`} />
          ) : (
            <VolumeX className="w-6 h-6 text-gray-500" />
          )}
          <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
            🎤 BATTLE ANNOUNCER
          </h2>
        </div>

        {/* Compact Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAnnouncer(!isAnnouncerEnabled)}
            className={`p-2 rounded-lg transition-all ${
              isAnnouncerEnabled 
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg' 
                : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
            }`}
            title={isAnnouncerEnabled ? 'Disable Voice' : 'Enable Voice'}
          >
            {isAnnouncerEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={onToggleAudioSettings}
            className="p-2 bg-gray-600 hover:bg-gray-700 text-gray-300 rounded-lg transition-all"
            title="Audio Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {timer !== null && (
            <div className="flex items-center gap-2 ml-2">
              <Timer className="w-4 h-4 text-yellow-400" />
              <span className="text-lg font-mono text-yellow-400">{timer}s</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Announcement Display - Full Height */}
      <div 
        ref={announcementRef}
        className="relative p-4 flex-1 flex items-center justify-center"
      >
        {/* Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 rounded-b-xl" />
        
        {/* Announcement Text - Big, Bold, Engaging */}
        <motion.div
          key={currentAnnouncement}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, type: "spring", bounce: 0.3 }}
          className="relative z-10 text-center"
        >
          <div className={`font-extrabold leading-tight ${
            isAnnouncerSpeaking 
              ? 'text-lg md:text-xl text-yellow-300 animate-pulse drop-shadow-2xl' 
              : 'text-base md:text-lg text-white drop-shadow-lg'
          }`}>
            {currentAnnouncement || "🏟️ Welcome to the Arena! Prepare for epic battles where psychology and team chemistry determine victory!"}
          </div>
          
          {/* Speaking Indicator */}
          {isAnnouncerSpeaking && (
            <motion.div 
              className="flex justify-center gap-1 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-yellow-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ 
                    duration: 0.8, 
                    repeat: Infinity, 
                    delay: i * 0.2 
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Quick Access Bar */}
      <div className="flex items-center justify-between p-3 bg-black/20 rounded-b-xl border-t border-orange-500/20">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className={`text-xs ${isConnected ? 'text-green-300' : 'text-red-300'}`}>
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Battle Items Button */}
          <button
            onClick={() => setShowItemPanel(!showItemPanel)}
            className={`px-3 py-1 ${showItemPanel ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded text-xs transition-all`}
            title="Battle Items"
          >
            <Package className="w-3 h-3 inline mr-1" />
            Items ({battleItems.length})
          </button>
          
          <button
            onClick={onShowCardCollection}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-all"
            title="Card Collection"
          >
            <CreditCard className="w-3 h-3 inline mr-1" />
            Cards
          </button>
          
          <button
            onClick={onShowCardPacks}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-all"
            title="Buy Card Packs"
          >
            <Gift className="w-3 h-3 inline mr-1" />
            Packs
          </button>
          
          <div className="text-yellow-400 font-mono text-sm font-bold">
            {playerCurrency} 💰
          </div>
        </div>
      </div>

      {/* Battle Items Panel */}
      <AnimatePresence>
        {showItemPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-sm border-2 border-purple-500/50 rounded-xl shadow-2xl p-4 z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Battle Items
              </h3>
              <button
                onClick={() => setShowItemPanel(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {isLoadingItems ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400">Loading items...</p>
              </div>
            ) : battleItems.length === 0 ? (
              <div className="text-center py-4">
                <Package className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No battle items available</p>
                <p className="text-xs text-gray-500">Visit the shop to purchase healing potions and buffs</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {battleItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => handleUseItem(item)}
                    className={`p-3 rounded-lg border-2 ${getRarityColor(item.rarity)} bg-gray-800/50 hover:bg-gray-700/50 transition-all text-left`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={item.quantity <= 0}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.icon}</span>
                      {getItemTypeIcon(item.type)}
                      <span className="font-semibold text-sm text-white truncate">
                        {item.name}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-300 mb-1 line-clamp-2">
                      {item.description}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-400">
                        x{item.quantity}
                      </span>
                      {item.effects.length > 0 && (
                        <span className="text-xs text-green-400">
                          {item.effects[0].type}: +{item.effects[0].value}
                          {item.effects[0].percentage ? '%' : ''}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {battlePhase && (
              <div className="mt-3 text-xs text-gray-400 text-center">
                Battle Phase: <span className="text-purple-300">{battlePhase}</span>
                {activeCharacterId && (
                  <span> • Active: <span className="text-yellow-300">{activeCharacterId}</span></span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}