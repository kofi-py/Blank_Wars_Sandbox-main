'use client';

import { useState, useEffect } from 'react';
import SafeMotion, { AnimatePresence } from './SafeMotion';
import {
  ShoppingCart,
  Star,
  Crown,
  Sparkles,
  Filter,
  Search,
  Grid,
  List,
  Heart,
  Eye,
  ShoppingBag,
  Package,
  Zap,
  Clock,
  Tag,
  Gift,
  Percent,
  CreditCard,
  Coins,
  Diamond,
  Badge,
  Shirt,
  Award,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Truck,
  Download
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  ProductType,
  CurrencyType,
  CartItem,
  getProductById,
  calculateProductPrice,
  calculateCartTotal,
  formatPrice,
  getProductRarityColor,
  isProductAvailable,
  ProductRarity
} from '@/data/merchandise';
import { apiClient } from '@/services/apiClient';
import { getEquipmentImage } from '@/constants/equipmentImages';

interface StoreItem {
  id: string;
  name: string;
  description?: string;
  flavor?: string;
  rarity?: string;
  price?: number;
  type?: string;
  equipment_type?: string;
  healAmount?: number;
}

// Helper function to get item/equipment image path - same as Character Shop
const getItemImagePath = (item: StoreItem, type: 'equipment' | 'items'): string => {
  if (type === 'equipment') {
    // Use existing equipment image system
    const equipmentConfig = getEquipmentImage(item.name || item.id);
    return equipmentConfig.image_path; // May be empty to force icon usage
  } else {
    // For items, convert ID to image filename  
    const imageName = item.id.replace(/_/g, '_') + '.png';
    return `/images/Items/${imageName}`;
  }
};

// Get fallback icon for items/equipment - same as Character Shop
const getFallbackIcon = (item: StoreItem, type: 'equipment' | 'items'): string => {
  if (type === 'equipment') {
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

interface Character {
  id: string;
  name: string;
  wallet?: number;
}

interface MerchStoreProps {
  current_user_id: string;
  user_currencies?: Record<CurrencyType, number>;
  user_inventory?: string[];
  demo_mode?: boolean;
  available_characters?: Character[];
  selected_character?: Character | null;
  // CamelCase variants
  userCurrencies?: Record<CurrencyType, number>;
  userInventory?: string[];
  demoMode?: boolean;
}

export default function MerchStore({
  current_user_id,
  userCurrencies = { gems: 1500, coins: 25000, usd: 50, premium_currency: 100 },
  userInventory = [],
  demoMode = false,
  available_characters = [],
  selected_character = null
}: MerchStoreProps) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'featured' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>(demoMode ? 'coins' : 'gems');
  const [databaseItems, setDatabaseItems] = useState<any[]>([]);
  const [databaseEquipment, setDatabaseEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load database items from backend when in demo mode
  useEffect(() => {
    if (demoMode) {
      loadDatabaseItems();
      setSelectedCurrency('coins');
    }
  }, [demoMode]);

  const loadDatabaseItems = async () => {
    setLoading(true);
    try {
      // Load shop items, equipment, and character-specific equipment
      const [itemsResponse, equipmentResponse] = await Promise.all([
        apiClient.get('/shop/items?demo_mode=true'),
        apiClient.get('/shop/equipment?demo_mode=true')
      ]);

      const itemsData = itemsResponse.data;
      const equipmentData = equipmentResponse.data;

      console.log('🔍 Shop API responses:', { itemsData, equipmentData });

      // Use SAME success checking as Character Shop
      if (itemsData.success && itemsData.items && Array.isArray(itemsData.items)) {
        console.log(`📦 Loaded ${itemsData.items.length} items from shop`);
        setDatabaseItems(itemsData.items);
      }

      if (equipmentData.success && equipmentData.equipment && Array.isArray(equipmentData.equipment)) {
        console.log(`⚔️ Loaded ${equipmentData.equipment.length} equipment items from shop`);
        setDatabaseEquipment(equipmentData.equipment);
      }
    } catch (error) {
      console.error('Failed to load database items:', error);
      setDatabaseEquipment([]);
      setDatabaseItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Convert backend items to Product format
  const convertBackendItemsToProducts = (items: StoreItem[], type: 'equipment' | 'items'): Product[] => {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => {
      // Determine category based on equipment type or item type
      let category: ProductCategory | 'premium' = 'premium';
      if (type === 'equipment') {
        // Map equipment types to categories
        const equipType = item.equipment_type.toLowerCase();
        const itemName = item.name.toLowerCase();

        // Debug logging
        console.log(`🔧 Equipment categorization: ${item.name} | type: "${item.type}" | equipment_type: "${item.equipment_type}" | equipType: "${equipType}"`);

        // Check for weapons (broader patterns)
        if (equipType.includes('weapon') || equipType.includes('sword') || equipType.includes('staff') ||
          equipType.includes('bow') || equipType.includes('club') || equipType.includes('revolver') ||
          equipType.includes('bat') || equipType.includes('mace') || itemName.includes('weapon') ||
          itemName.includes('sword') || itemName.includes('staff') || itemName.includes('bow') ||
          itemName.includes('club') || itemName.includes('revolver')) {
          category = 'premium'; // Use premium for weapons
          console.log(`⚔️ Categorized as weapon (premium): ${item.name}`);
        }
        // Check for armor/clothing (broader patterns)
        else if (equipType.includes('armor') || equipType.includes('vest') || equipType.includes('robe') ||
          equipType.includes('boots') || equipType.includes('gauntlets') || equipType.includes('leather') ||
          equipType.includes('mail') || itemName.includes('armor') || itemName.includes('boots') ||
          itemName.includes('robe') || itemName.includes('vest')) {
          category = 'apparel';
          console.log(`🛡️ Categorized as armor (apparel): ${item.name}`);
        }
        // Default equipment to premium
        else {
          category = 'premium';
          console.log(`💎 Categorized as default equipment (premium): ${item.name}`);
        }
      } else {
        category = 'boosts'; // Items go to boosts
        console.log(`⚡ Categorized as item (boosts): ${item.name}`);
      }

      return {
        id: item.id,
        name: item.name,
        description: item.description ?? item.flavor,
        category,
        type: 'digital' as ProductType,
        rarity: (item.rarity || 'common') as ProductRarity,
        prices: [{
          currency: 'coins' as CurrencyType,
          amount: item.price || 0
        }],
        image: getItemImagePath(item, type),
        release_date: new Date(),
        tags: [category, type, item.rarity],
        effects: item.type === 'healing' ? [{ type: 'special', description: `Restores ${item.healAmount} health` }] : undefined,
        is_new: false,
        is_on_sale: false,
        is_limited: true,
        is_premium: true,
        is_featured: item.rarity === 'legendary' || item.rarity === 'mythic'
      };
    });
  };

  // Filter products based on active category and search
  const getFilteredProducts = (): Product[] => {
    // Coach Store: Show ONLY database items, no hardcoded merchandise
    if (demoMode) {
      const databaseProducts = [
        ...convertBackendItemsToProducts(databaseEquipment, 'equipment'),
        ...convertBackendItemsToProducts(databaseItems, 'items')
      ];

      let filtered = databaseProducts;

      // Apply category filter (similar to CharacterShop but allow all rarities)
      if (activeCategory === 'featured') {
        filtered = databaseProducts.filter(product => product.is_featured);
      } else if (activeCategory === 'all') {
        filtered = databaseProducts; // Show everything
      } else {
        // Filter by specific category
        filtered = databaseProducts.filter(product => product.category === activeCategory);
      }

      // Apply search filter if needed
      if (searchTerm) {
        const lowercaseQuery = searchTerm.toLowerCase();
        filtered = filtered.filter(product =>
          product.name.toLowerCase().includes(lowercaseQuery) ||
          product.description.toLowerCase().includes(lowercaseQuery)
        );
      }

      return filtered;
    }

    // Non-demo mode (shouldn't be used but fallback)
    return [];
  };

  const filteredProducts = getFilteredProducts();

  // Cart functions
  const addToCart = (product: Product, variant_id?: string) => {
    if (!cart || !Array.isArray(cart)) {
      setCart([{ product_id: product.id, variant_id, quantity: 1, added_at: new Date() }]);
      return;
    }

    const existingItem = (cart && Array.isArray(cart)) ? cart.find(item =>
      item.product_id === product.id && item.variant_id === variant_id
    ) : null;

    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id && item.variant_id === variant_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        variant_id,
        quantity: 1,
        added_at: new Date()
      }]);
    }
  };

  const removeFromCart = (productId: string, variant_id?: string) => {
    if (!cart || !Array.isArray(cart)) return;
    setCart(cart.filter(item =>
      !(item.product_id === productId && item.variant_id === variant_id)
    ));
  };

  const updateCartQuantity = (productId: string, variant_id: string | undefined, new_quantity: number) => {
    if (new_quantity <= 0) {
      removeFromCart(productId, variant_id);
      return;
    }

    if (!cart || !Array.isArray(cart)) return;
    setCart(cart.map(item =>
      item.product_id === productId && item.variant_id === variant_id
        ? { ...item, quantity: new_quantity }
        : item
    ));
  };

  const getCartItemCount = () => {
    if (!cart || !Array.isArray(cart)) return 0;
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartTotal = () => {
    return calculateCartTotal(cart, selectedCurrency);
  };

  // UI helper functions
  const getCategoryIcon = (category: ProductCategory | 'featured' | 'all') => {
    const icons = {
      featured: <Star className="w-5 h-5" />,
      all: <Grid className="w-5 h-5" />,
      cosmetics: <Sparkles className="w-5 h-5" />,
      apparel: <Shirt className="w-5 h-5" />,
      collectibles: <Award className="w-5 h-5" />,
      boosts: <Zap className="w-5 h-5" />,
      characters: <Crown className="w-5 h-5" />,
      bundles: <Package className="w-5 h-5" />,
      premium: <Diamond className="w-5 h-5" />
    };
    return icons[category] || <Grid className="w-5 h-5" />;
  };

  const getCurrencyIcon = (currency: CurrencyType) => {
    const icons = {
      gems: <Diamond className="w-4 h-4 text-blue-400" />,
      coins: <Coins className="w-4 h-4 text-yellow-400" />,
      usd: <CreditCard className="w-4 h-4 text-green-400" />,
      premium_currency: <Star className="w-4 h-4 text-purple-400" />
    };
    return icons[currency];
  };

  const isOwned = (productId: string) => {
    return userInventory.includes(productId);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <ShoppingBag className="w-8 h-8 text-green-400" />
          {demoMode ? 'Coach Store (Demo Mode)' : 'Merch Store'}
        </h1>
        <p className="text-gray-400 text-lg">
          {demoMode
            ? 'Premium items available with coins in demo mode'
            : 'Legendary gear for legendary warriors'
          }
        </p>
        {demoMode && selected_character && (
          <div className="mt-2 text-yellow-400 font-semibold">
            {selected_character.name}: {selected_character.wallet?.toLocaleString() || 0} coins
          </div>
        )}
      </div>

      {/* Currency Display & Cart */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h3 className="text-white font-semibold">
              {demoMode ? 'Demo Balance:' : 'Your Balance:'}
            </h3>
            <div className="flex gap-4">
              {demoMode ? (
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-bold">{userCurrencies.coins?.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm">(demo coins)</span>
                </div>
              ) : (
                Object.entries(userCurrencies || {}).map(([currency, amount]) => (
                  <div key={currency} className="flex items-center gap-2">
                    {getCurrencyIcon(currency as CurrencyType)}
                    <span className="text-white font-bold">{amount.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => setShowCart(true)}
            className="relative bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Cart
            {getCartItemCount() > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {getCartItemCount()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Category Navigation & Controls */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Category Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-2 lg:pb-0">
            {[
              { id: 'featured', label: 'Featured' },
              { id: 'all', label: 'All Items' },
              { id: 'premium', label: 'Weapons' },
              { id: 'apparel', label: 'Armor' },
              { id: 'boosts', label: 'Consumables' },
              { id: 'characters', label: 'Character Gear' },
              { id: 'cosmetics', label: 'Cosmetics' },
              { id: 'collectibles', label: 'Collectibles' },
              { id: 'bundles', label: 'Bundles' }
            ].map((category: { id: ProductCategory; label: string }) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeCategory === category.id
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
              >
                {getCategoryIcon(category.id)}
                <span className="hidden sm:inline">{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
            />
          </div>

          {demoMode ? (
            <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
              🪙 Coins (Demo Mode)
            </div>
          ) : (
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as CurrencyType)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
            >
              <option value="gems">💎 Gems</option>
              <option value="coins">🪙 Coins</option>
              <option value="usd">💵 USD</option>
              <option value="premium_currency">⭐ Premium</option>
            </select>
          )}

          <div className="flex items-center justify-between">
            <span className="text-gray-400">{filteredProducts.length} products</span>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Banner */}
      {activeCategory === 'featured' && (
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                {demoMode ? 'Premium Items Available with Coins' : 'Limited Time Offers'}
              </h3>
              <p className="text-gray-300">
                {demoMode
                  ? 'Experience legendary equipment and Phoenix Feathers with demo coins!'
                  : 'Exclusive deals that won\'t last long!'
                }
              </p>
            </div>
            {!demoMode && (
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Sale ends in:</div>
                <div className="text-xl font-bold text-white">23:45:12</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-green-500"></div>
            Loading premium items...
          </div>
        </div>
      )}

      {/* Product Grid/List */}
      <div className={`grid gap-6 ${viewMode === 'grid'
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-1'
        }`}>
        {filteredProducts.map((product) => {
          const price = calculateProductPrice(product, selectedCurrency);
          const owned = isOwned(product.id);
          const rarity_color = getProductRarityColor(product.rarity);

          return (
            <SafeMotion
              as="div"
              key={product.id}
              layout
              class_name={`bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden hover:border-green-500 transition-all cursor-pointer ${viewMode === 'list' ? 'flex gap-4 p-4' : ''
                }`}
              while_hover={{ scale: viewMode === 'grid' ? 1.02 : 1 }}
              onClick={() => setSelectedProduct(product)}
            >
              {/* Product Image */}
              <div className={`${viewMode === 'list' ? 'w-32 h-32' : 'aspect-square'} bg-gradient-to-br ${rarity_color}/20 flex items-center justify-center relative overflow-hidden rounded-lg`}>
                {product.image ? (
                  <>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        // Fallback to emoji icon if image doesn't exist
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <div className="text-6xl opacity-50 hidden w-full h-full flex items-center justify-center">
                      {product.category === 'cosmetics' && '✨'}
                      {product.category === 'apparel' && '👕'}
                      {product.category === 'collectibles' && '🏆'}
                      {product.category === 'boosts' && '⚡'}
                      {product.category === 'characters' && '👑'}
                      {product.category === 'bundles' && '📦'}
                      {product.category === 'premium' && '💎'}
                    </div>
                  </>
                ) : (
                  // No image path - show category icon directly
                  <div className="text-6xl opacity-50 w-full h-full flex items-center justify-center">
                    {product.category === 'cosmetics' && '✨'}
                    {product.category === 'apparel' && '👕'}
                    {product.category === 'collectibles' && '🏆'}
                    {product.category === 'boosts' && '⚡'}
                    {product.category === 'characters' && '👑'}
                    {product.category === 'bundles' && '📦'}
                    {product.category === 'premium' && '💎'}
                  </div>
                )}

                {/* Product Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.is_new && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      NEW
                    </span>
                  )}
                  {product.is_on_sale && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      SALE
                    </span>
                  )}
                  {product.is_limited && (
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      LIMITED
                    </span>
                  )}
                </div>

                {/* Owned Badge */}
                {owned && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-6 h-6 text-green-400 bg-gray-900 rounded-full p-1" />
                  </div>
                )}

                {/* Rarity Badge */}
                <div className={`absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-bold bg-gradient-to-r ${rarity_color} text-white`}>
                  {product.rarity.toUpperCase()}
                </div>
              </div>

              {/* Product Info */}
              <div className={`${viewMode === 'grid' ? 'p-4' : 'flex-1'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg leading-tight">{product.name}</h3>
                    <p className="text-sm text-gray-400 capitalize">{product.category} • {product.type}</p>
                  </div>

                  {product.is_limited && product.remaining !== undefined && (
                    <div className="text-right ml-2">
                      <div className="text-xs text-orange-400 font-semibold">
                        {product.remaining} left
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{product.description}</p>

                {/* Effects */}
                {product.effects && product.effects.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 mb-1">Effects:</div>
                    <div className="space-y-1">
                      {product.effects.slice(0, 2).map((effect, index) => (
                        <div key={index} className="text-xs text-blue-400">
                          • {effect.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price and Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    {price ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {getCurrencyIcon(selectedCurrency)}
                          <span className="text-lg font-bold text-white">
                            {formatPrice(price)}
                          </span>
                          {price.original_price && price.discount && (
                            <span className="text-sm text-gray-400 line-through">
                              {formatPrice({ ...price, amount: price.original_price })}
                            </span>
                          )}
                        </div>
                        {demoMode && product.is_premium && (
                          <div className="text-xs text-orange-400">
                            ⚠️ Production: Real money required (${(price.amount / 100).toFixed(2)} USD)
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">Not available in {selectedCurrency}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!owned && price && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-semibold transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </SafeMotion>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Products Found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'No products available in this category'
            }
          </p>
        </div>
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <SafeMotion
              as="div"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">{selectedProduct.name}</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className={`aspect-square bg-gradient-to-br ${getProductRarityColor(selectedProduct.rarity)}/20 rounded-lg flex items-center justify-center relative overflow-hidden`}>
                  {selectedProduct.image ? (
                    <>
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          // Fallback to emoji icon if image doesn't exist
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <div className="text-8xl opacity-50 hidden w-full h-full flex items-center justify-center">
                        {selectedProduct.category === 'cosmetics' && '✨'}
                        {selectedProduct.category === 'apparel' && '👕'}
                        {selectedProduct.category === 'collectibles' && '🏆'}
                        {selectedProduct.category === 'boosts' && '⚡'}
                        {selectedProduct.category === 'characters' && '👑'}
                        {selectedProduct.category === 'bundles' && '📦'}
                        {selectedProduct.category === 'premium' && '💎'}
                      </div>
                    </>
                  ) : (
                    // No image path - show category icon directly
                    <div className="text-8xl opacity-50 w-full h-full flex items-center justify-center">
                      {selectedProduct.category === 'cosmetics' && '✨'}
                      {selectedProduct.category === 'apparel' && '👕'}
                      {selectedProduct.category === 'collectibles' && '🏆'}
                      {selectedProduct.category === 'boosts' && '⚡'}
                      {selectedProduct.category === 'characters' && '👑'}
                      {selectedProduct.category === 'bundles' && '📦'}
                      {selectedProduct.category === 'premium' && '💎'}
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Description</h4>
                    <p className="text-gray-300">{selectedProduct.description}</p>
                  </div>

                  {selectedProduct.effects && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Effects</h4>
                      <div className="space-y-2">
                        {selectedProduct.effects.map((effect, index) => (
                          <div key={index} className="text-blue-400">
                            • {effect.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.variants && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Variants</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProduct.variants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => setSelectedVariant(variant.id)}
                            className={`p-2 text-sm rounded border transition-colors ${selectedVariant === variant.id
                              ? 'border-green-500 bg-green-500/20 text-white'
                              : 'border-gray-600 text-gray-400 hover:border-gray-500'
                              }`}
                          >
                            {variant.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <div>
                      {calculateProductPrice(selectedProduct, selectedCurrency) ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {getCurrencyIcon(selectedCurrency)}
                            <span className="text-2xl font-bold text-white">
                              {formatPrice(calculateProductPrice(selectedProduct, selectedCurrency)!)}
                            </span>
                          </div>
                          {demoMode && selectedProduct.is_premium && (
                            <div className="text-sm text-orange-400">
                              ⚠️ In production, this premium item requires real money (${(calculateProductPrice(selectedProduct, selectedCurrency)!.amount / 100).toFixed(2)} USD)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Not available in {selectedCurrency}</span>
                      )}
                    </div>

                    {!isOwned(selectedProduct.id) && calculateProductPrice(selectedProduct, selectedCurrency) && (
                      <button
                        onClick={() => {
                          addToCart(selectedProduct, selectedVariant || undefined);
                          setSelectedProduct(null);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {showCart && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            class_name="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowCart(false)}
          >
            <SafeMotion
              as="div"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              class_name="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6" />
                  Shopping Cart ({getCartItemCount()})
                </h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {(cart && Array.isArray(cart) && cart.length > 0) ? (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const product = getProductById(item.product_id);
                    if (!product) return null;

                    const price = calculateProductPrice(product, selectedCurrency);
                    if (!price) return null;

                    return (
                      <div key={`${item.product_id}-${item.variant_id}`} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                          {product.image ? (
                            <>
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                  // Fallback to emoji icon if image doesn't exist
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                }}
                              />
                              <span className="text-2xl hidden w-full h-full flex items-center justify-center">
                                {product.category === 'cosmetics' && '✨'}
                                {product.category === 'apparel' && '👕'}
                                {product.category === 'collectibles' && '🏆'}
                                {product.category === 'boosts' && '⚡'}
                                {product.category === 'characters' && '👑'}
                                {product.category === 'bundles' && '📦'}
                                {product.category === 'premium' && '💎'}
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl w-full h-full flex items-center justify-center">
                              {product.category === 'cosmetics' && '✨'}
                              {product.category === 'apparel' && '👕'}
                              {product.category === 'collectibles' && '🏆'}
                              {product.category === 'boosts' && '⚡'}
                              {product.category === 'characters' && '👑'}
                              {product.category === 'bundles' && '📦'}
                              {product.category === 'premium' && '💎'}
                            </span>
                          )}
                        </div>

                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{product.name}</h4>
                          <p className="text-sm text-gray-400">{product.category}</p>
                          {item.variant_id && (
                            <p className="text-xs text-blue-400">
                              {(product.variants && Array.isArray(product.variants))
                                ? product.variants.find(v => v.id === item.variant_id)?.name
                                : 'Variant'}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.product_id, item.variant_id, item.quantity - 1)}
                              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4 text-white" />
                            </button>
                            <span className="w-8 text-center text-white font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.product_id, item.variant_id, item.quantity + 1)}
                              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              {getCurrencyIcon(selectedCurrency)}
                              <span className="font-bold text-white">
                                {formatPrice({ currency: selectedCurrency, amount: price.amount * item.quantity })}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.product_id, item.variant_id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xl font-bold text-white">Total:</span>
                      <div className="flex items-center gap-2">
                        {getCurrencyIcon(selectedCurrency)}
                        <span className="text-2xl font-bold text-white">
                          {formatPrice({ currency: selectedCurrency, amount: getCartTotal() })}
                        </span>
                      </div>
                    </div>

                    <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Checkout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-gray-400 mb-2">Your cart is empty</h4>
                  <p className="text-gray-500 mb-4">Add some amazing items to get started!</p>
                  <button
                    onClick={() => setShowCart(false)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              )}
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>
    </div>
  );
}