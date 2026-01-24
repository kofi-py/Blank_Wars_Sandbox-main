'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import {
  Send,
  ShoppingCart,
  Coins,
  Sword,
  Shield,
  Heart,
  Zap,
  Package,
  Star,
  Crown,
  Sparkles,
  Filter,
  Search,
  Grid,
  List,
  Plus,
  Minus,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { characterAPI, apiClient } from '../services/apiClient';
import { Contestant as Character } from '@blankwars/types';
import ChatFeedback, { ChatFeedbackData } from './ChatFeedback';
import { ChatResponseData, isChatResponseData } from '@/types/socket';
import { getEquipmentImage } from '@/constants/equipmentImages';
import type { EquipmentEffect } from '@blankwars/types';

interface PurchaseCompletedData {
  item_id: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  item_type: 'equipment' | 'item';
}

interface APIItem {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  icon: string;
  price: number;
  effects?: EquipmentEffect[];
  usage_context?: string;
  stackable?: boolean;
  max_stack?: number;
  flavor?: string;
}

// Helper function to get item/equipment image path - returns empty if should use icon
const getItemImagePath = (item: ShopItem): string => {
  if (item.item_type === 'equipment') {
    // Use existing equipment image system
    const equipmentConfig = getEquipmentImage(item.name || item.id);
    return equipmentConfig.image_path; // May be empty to force icon usage
  } else {
    // For items, convert ID to image filename  
    const imageName = item.id.replace(/_/g, '_') + '.png';
    return `/images/Items/${imageName}`;
  }
};

// Get fallback icon for items/equipment
const getFallbackIcon = (item: ShopItem): string => {
  if (item.item_type === 'equipment') {
    return getEquipmentImage(item.name || item.id).fallback_icon;
  } else {
    // Default item icons by type
    if (item.name?.toLowerCase().includes('health')) return '❤️';
    if (item.name?.toLowerCase().includes('mana')) return '💙';
    if (item.name?.toLowerCase().includes('potion')) return '🧪';
    if (item.name?.toLowerCase().includes('feather')) return '🪶';
    return '📦';
  }
};

interface Message {
  id: number;
  type: 'player' | 'contestant' | 'system' | 'purchase';
  content: string;
  timestamp: Date;
  purchase?: {
    item_id: string;
    item_name: string;
    quantity: number;
    total_cost: number;
    item_type: 'equipment' | 'item';
  };
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  icon: string;
  price: number;
  effects?: EquipmentEffect[];
  usage_context?: string;
  stackable?: boolean;
  max_stack?: number;
  flavor?: string;
  item_type: 'equipment' | 'item';
}

interface CartItem {
  item: ShopItem;
  quantity: number;
}

interface EnhancedCharacter extends Omit<Character, 'financials'> {
  base_name: string;
  wallet: number; // REQUIRED - matches Contestant
  financials?: {
    wallet: number;
    financial_stress: number;
    coach_trust_level: number;
    spending_personality: string;
    recent_decisions: string[];
    monthly_earnings: number;
  };
  display_bond_level?: number;
}

interface CharacterShopProps {
  selected_characterId: string;
  selected_character: EnhancedCharacter | null;
  available_characters: EnhancedCharacter[];
  onCharacterChange: (character_id: string) => void;
  title?: string;
  description?: string;
}

// Helper function to get character ID following the pattern from other chats
const getCharacterId = (character: EnhancedCharacter): string => {
  return character.id;
};

// Get character wallet amount
const getCharacterWallet = (character: EnhancedCharacter | null): number => {
  if (!character) {
    throw new Error('Cannot get wallet from null character');
  }
  if (typeof character.wallet !== 'number') {
    throw new Error('wallet must be a number from database');
  }
  return character.wallet;
};

// Rarity colors
const getRarityColor = (rarity: string) => {
  const colors = {
    common: 'text-gray-400 border-gray-400',
    uncommon: 'text-green-400 border-green-400',
    rare: 'text-blue-400 border-blue-400',
    epic: 'text-purple-400 border-purple-400',
    legendary: 'text-orange-400 border-orange-400',
    mythic: 'text-red-400 border-red-400'
  };
  return colors[rarity as keyof typeof colors] || colors.common;
};

const CharacterShop: React.FC<CharacterShopProps> = ({
  selected_characterId,
  selected_character,
  available_characters,
  onCharacterChange,
  title = "Character Shop",
  description = "A shop for the characters to buy their own items"
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Shop state
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCart, setShowCart] = useState(false);

  const MotionDiv = useMobileSafeMotion();

  // Load shop items and equipment
  useEffect(() => {
    const loadShopItems = async () => {
      try {
        setLoading(true);

        // Load items from shop API using apiClient (demo mode = true for now)
        const [itemsResponse, equipmentResponse] = await Promise.all([
          apiClient.get('/shop/items?demo_mode=true'),
          apiClient.get('/shop/equipment?demo_mode=true')
        ]);

        const itemsData = itemsResponse.data;
        const equipmentData = equipmentResponse.data;

        const allItems: ShopItem[] = [];

        if (itemsData.success && itemsData.items && Array.isArray(itemsData.items)) {
          const items: ShopItem[] = itemsData.items.map((item: APIItem) => ({
            ...item,
            item_type: 'item' as const
          }));
          allItems.push(...items);
        }

        if (equipmentData.success && equipmentData.equipment && Array.isArray(equipmentData.equipment)) {
          const equipment: ShopItem[] = equipmentData.equipment.map((item: APIItem) => ({
            ...item,
            item_type: 'equipment' as const
          }));
          allItems.push(...equipment);
        }

        setShopItems(allItems);
        setFilteredItems(allItems);
      } catch (error) {
        console.error('Failed to load shop items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShopItems();
  }, []);

  // Filter items based on search, category, and character restrictions
  useEffect(() => {
    let filtered = shopItems;

    // Character restrictions: No epic+ rarity items (but allow weapons now)
    filtered = filtered.filter(item => {
      // Block epic, legendary, mythic rarity items for characters
      const restrictedRarities = ['epic', 'legendary', 'mythic'];
      if (restrictedRarities.includes(item.rarity)) {
        return false;
      }

      // Allow weapons now - characters can buy weapons
      return true;
    });

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => {
        if (selectedCategory === 'equipment') return item.item_type === 'equipment';
        if (selectedCategory === 'consumables') return item.item_type === 'item';
        if (selectedCategory === 'weapons') return item.type === 'weapon'; // Will be empty due to weapon restriction above
        if (selectedCategory === 'armor') return item.type === 'armor';
        if (selectedCategory === 'potions') return item.type === 'health_potion' || item.type === 'mana_potion';
        return true;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  }, [shopItems, selectedCategory, searchTerm]);

  // Socket connection for chat
  useEffect(() => {
    if (!selected_character) return;

    // Determine correct socket URL based on environment
    let socketUrl = 'http://localhost:4000';
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      if (!isLocalhost) {
        // Deployed production
        socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.blankwars.com';
      }
    }

    console.log('🛒 [CharacterShop] Connecting to backend:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to chat server for Character Shop');
      setIsConnected(true);

      // Join character shop room
      if (selected_character) {
        newSocket.emit('join_character_shop', {
          character_id: getCharacterId(selected_character),
          character_name: selected_character.name
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from chat server');
      setIsConnected(false);
    });

    newSocket.on('character_shop_message', (data: ChatResponseData) => {
      if (isChatResponseData(data)) {
        const newMessage: Message = {
          id: Date.now(),
          type: 'contestant',
          content: data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
        setIsTyping(false);
      }
    });

    newSocket.on('purchase_completed', (data: PurchaseCompletedData) => {
      const newMessage: Message = {
        id: Date.now(),
        type: 'system',
        content: `✅ Successfully purchased ${data.quantity}x ${data.item_name} for ${data.total_cost} coins!`,
        timestamp: new Date(),
        purchase: {
          item_id: data.item_id,
          item_name: data.item_name,
          quantity: data.quantity,
          total_cost: data.total_cost,
          item_type: data.item_type
        }
      };
      setMessages(prev => [...prev, newMessage]);

      // Remove item from cart
      setCart(prev => prev.filter(cartItem => cartItem.item.id !== data.item_id));

      // Update character wallet (this would normally come from a character update)
      // For now, we'll optimistically update the display
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [selected_character]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selected_character || !socket || !isConnected) return;

    const messageToSend = newMessage.trim();

    const playerMessage: Message = {
      id: Date.now(),
      type: 'player',
      content: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, playerMessage]);
    setNewMessage('');
    setIsTyping(true);

    try {
      const character_id = getCharacterId(selected_character);
      const wallet = getCharacterWallet(selected_character);

      socket.emit('character_shop_chat', {
        message: messageToSend,
        character: character_id,
        character_data: {
          name: selected_character?.name,
          archetype: selected_character?.archetype,
          wallet: wallet,
          personality: selected_character?.personality || { traits: ['Shopping-curious'] },
          context: 'character_shop'
        },
        chat_context: {
          available_items: filteredItems.slice(0, 10), // Send sample items for context
          current_cart: cart || [],
          total_cart_value: (cart && Array.isArray(cart)) ? cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0) : 0
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  // Add item to cart
  const addToCart = (item: ShopItem, quantity: number = 1) => {
    setCart(prev => {
      if (!prev || !Array.isArray(prev)) return [];
      const existing = prev.find(cartItem => cartItem.item.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      } else {
        return [...prev, { item, quantity }];
      }
    });
  };

  // Remove item from cart
  const removeFromCart = (item_id: string) => {
    setCart(prev => {
      if (!prev || !Array.isArray(prev)) return [];
      return prev.filter(cartItem => cartItem.item.id !== item_id);
    });
  };

  // Update cart quantity
  const updateCartQuantity = (item_id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(item_id);
      return;
    }

    setCart(prev => {
      if (!prev || !Array.isArray(prev)) return [];
      return prev.map(cartItem =>
        cartItem.item.id === item_id
          ? { ...cartItem, quantity }
          : cartItem
      );
    });
  };

  // Purchase item with character's personal money
  const purchaseItem = async (item: ShopItem, quantity: number) => {
    if (!selected_character) return;

    try {
      const character_id = getCharacterId(selected_character);
      const data = await characterAPI.purchase_item(character_id, item.id, quantity);

      if (data.success) {
        // Purchase successful
        console.log('Character purchase successful:', data);

        const successMessage: Message = {
          id: Date.now(),
          type: 'system',
          content: `✅ ${data.character.name} purchased ${data.purchase.quantity}x ${data.purchase.itemName} for ${data.purchase.totalCost} coins! Wallet: ${data.character.wallet}`,
          timestamp: new Date(),
          purchase: data.purchase
        };
        setMessages(prev => [...prev, successMessage]);

        // Remove item from cart
        setCart(prev => (prev && Array.isArray(prev)) ? prev.filter(cartItem => cartItem.item.id !== item.id) : []);

        // Update character's displayed wallet (optimistic update)
        if (selected_character) {
          selected_character.wallet = data.character.wallet;
        }
      } else {
        // Purchase failed
        const errorMessage: Message = {
          id: Date.now(),
          type: 'system',
          content: `❌ Purchase failed: ${data.error}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Character purchase error:', error);
      const errorMessage: Message = {
        id: Date.now(),
        type: 'system',
        content: `❌ Purchase failed: Network error`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Purchase entire cart
  const purchaseCart = async () => {
    if (cart && Array.isArray(cart)) {
      for (const cartItem of cart) {
        await purchaseItem(cartItem.item, cartItem.quantity);
      }
    }
  };

  const categories = [
    { id: 'all', label: 'All Items', icon: Package },
    { id: 'consumables', label: 'Consumables', icon: Heart },
    { id: 'potions', label: 'Potions', icon: Zap },
    { id: 'equipment', label: 'Equipment', icon: Sword },
    { id: 'weapons', label: 'Weapons', icon: Sword },
    { id: 'armor', label: 'Armor', icon: Shield }
  ];

  const cartTotal = (cart && Array.isArray(cart)) ? cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0) : 0;
  const currentWallet = getCharacterWallet(selected_character || available_characters[0] || null);
  const canAffordCart = cartTotal <= currentWallet;

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-900 text-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading {title.toLowerCase()}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selected_character) {
    return (
      <div className="flex flex-col h-full bg-gray-900 text-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-white" />
            </div>
            <p className="text-gray-400">No character selected for shopping</p>
            <p className="text-gray-500 text-sm mt-2">Please select a character to access the shop</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
          </div>

          {/* Character Selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{currentWallet.toLocaleString()}</span>
            </div>

            <select
              value={selected_characterId}
              onChange={(e) => onCharacterChange(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
            >
              {(available_characters && Array.isArray(available_characters) ? available_characters : []).map(char => (
                <option key={char.id} value={char.id}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Shop Panel */}
        <div className="flex-1 flex flex-col">
          {/* Shop Controls */}
          <div className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search and View Controls */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-700 text-white pl-10 pr-4 py-2 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div className="flex bg-gray-700 rounded">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setShowCart(!showCart)}
                  className="relative bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Cart</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Shop Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No items found</p>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
              }>
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`bg-gray-800 border-2 ${getRarityColor(item.rarity)} rounded-lg p-4 hover:bg-gray-750 transition-colors ${viewMode === 'list' ? 'flex items-center space-x-4' : ''
                      }`}
                  >
                    <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'text-center mb-3'}`}>
                      <div className="w-16 h-16 mx-auto mb-2 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {getItemImagePath(item) ? (
                          <>
                            <img
                              src={getItemImagePath(item)}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                // Fallback to emoji icon if image doesn't exist
                                e.currentTarget.style.display = 'none';
                                const nextEl = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextEl) nextEl.style.display = 'flex';
                              }}
                            />
                            <div className="text-3xl hidden w-full h-full flex items-center justify-center">
                              {getFallbackIcon(item)}
                            </div>
                          </>
                        ) : (
                          // No image path - show icon directly
                          <div className="text-3xl w-full h-full flex items-center justify-center">
                            {getFallbackIcon(item)}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs uppercase tracking-wide ${getRarityColor(item.rarity).split(' ')[0]}`}>
                        {item.rarity}
                      </div>
                    </div>

                    <div className={viewMode === 'list' ? 'flex-1' : ''}>
                      <h3 className="font-bold text-white mb-1">{item.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">{item.description}</p>

                      {item.effects && item.effects.length > 0 && (
                        <div className="text-xs text-green-400 mb-3">
                          {item.effects.map((effect, i) => (
                            <div key={i}>
                              {effect.description || '✨ Effect'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`${viewMode === 'list' ? 'flex items-center space-x-2' : 'mt-auto'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-yellow-400 font-bold flex items-center">
                          <Coins className="w-4 h-4 mr-1" />
                          {item.price}
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(item)}
                        disabled={item.price > currentWallet}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-3 py-2 rounded flex items-center justify-center space-x-1 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Chat Header */}
          <div className="bg-gray-700 p-4 border-b border-gray-600">
            <h3 className="font-bold text-white">Shopping Chat</h3>
            <p className="text-sm text-gray-400">Discuss purchases with your character</p>
            <div className={`mt-2 flex items-center space-x-2 text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Start a conversation about shopping!</p>
                <p className="text-gray-500 text-sm mt-1">Ask your character what they'd like to buy</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'player' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${message.type === 'player'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'system'
                    ? 'bg-gray-600 text-gray-200'
                    : 'bg-gray-700 text-gray-200'
                  }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-200 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-600">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about items to buy..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
                disabled={!isConnected}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded flex items-center space-x-1"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Cart Sidebar */}
        {showCart && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="bg-gray-700 p-4 border-b border-gray-600 flex items-center justify-between">
              <h3 className="font-bold text-white">Shopping Cart</h3>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(cartItem => (
                    <div key={cartItem.item.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-white text-sm">{cartItem.item.name}</h4>
                        <button
                          onClick={() => removeFromCart(cartItem.item.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartQuantity(cartItem.item.id, cartItem.quantity - 1)}
                            className="bg-gray-600 hover:bg-gray-500 w-6 h-6 rounded flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-white">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(cartItem.item.id, cartItem.quantity + 1)}
                            className="bg-gray-600 hover:bg-gray-500 w-6 h-6 rounded flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-yellow-400 font-bold flex items-center">
                          <Coins className="w-4 h-4 mr-1" />
                          {cartItem.item.price * cartItem.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-600 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-white">Total:</span>
                  <div className="text-yellow-400 font-bold flex items-center">
                    <Coins className="w-5 h-5 mr-1" />
                    {cartTotal}
                  </div>
                </div>

                <button
                  onClick={purchaseCart}
                  disabled={!canAffordCart}
                  className={`w-full py-3 rounded font-bold flex items-center justify-center space-x-2 ${canAffordCart
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 cursor-not-allowed text-gray-200'
                    }`}
                >
                  <Check className="w-5 h-5" />
                  <span>{canAffordCart ? 'Purchase All' : 'Insufficient Coins'}</span>
                </button>

                {!canAffordCart && (
                  <p className="text-red-400 text-sm mt-2 text-center">
                    Need {(cartTotal - currentWallet).toLocaleString()} more coins
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterShop;