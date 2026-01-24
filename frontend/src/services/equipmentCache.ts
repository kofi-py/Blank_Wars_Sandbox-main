// Equipment Cache Service - Smart Memory Management with Persistent Storage
// Addresses memory concerns by loading equipment data on-demand and implementing LRU caching
// Uses localStorage for persistent caching across page refreshes

const BACKEND_URL = (() => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:4000';
    }
    throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set. Cannot initialize equipmentCache.');
  }
  return url;
})();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  access_count: number;
  last_accessed: number;
}

interface EquipmentCacheConfig {
  max_cache_size: number;
  max_age: number; // milliseconds
  preload_essentials: boolean;
  use_persistent_storage: boolean; // Enable localStorage persistence
  rate_limit_window: number; // Rate limiting window in milliseconds
  max_requests_per_window: number; // Max requests per window
  batch_request_delay: number; // Delay before sending batched requests
}

class EquipmentCacheService {
  private equipmentCache = new Map<string, CacheEntry<any>>();
  private characterEquipmentCache = new Map<string, CacheEntry<any[]>>();
  private items_cache: CacheEntry<any[]> | null = null;
  private generic_equipment_cache: CacheEntry<any[]> | null = null;
  
  private config: EquipmentCacheConfig = {
    max_cache_size: 50, // Max items in memory at once
    max_age: 5 * 60 * 1000, // 5 minutes
    preload_essentials: true,
    use_persistent_storage: true, // Enable persistent caching
    rate_limit_window: 60 * 1000, // 1 minute
    max_requests_per_window: 30, // Max 30 requests per minute
    batch_request_delay: 100 // 100ms delay for batching
  };

  // Request deduplication - prevents duplicate simultaneous requests
  private activeRequests = new Map<string, Promise<any>>();
  
  // Intelligent prefetching system
  private prefetchQueue: string[] = [];
  private prefetchInProgress = false;
  private prefetchConfig = {
    enabled: true,
    max_concurrent: 2,
    delay_between_requests: 300, // ms
    popular_characters: ['achilles', 'merlin', 'fenrir', 'holmes', 'dracula']
  };

  private readonly STORAGE_KEYS = {
    CHARACTER_EQUIPMENT: 'equipment_cache_character_',
    GENERIC_EQUIPMENT: 'equipment_cache_generic',
    ITEMS: 'equipment_cache_items',
    INDIVIDUAL_EQUIPMENT: 'equipment_cache_item_'
  };

  constructor(config?: Partial<EquipmentCacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Only initialize client-side features in the browser
    if (typeof window !== 'undefined') {
      // Load existing persistent cache data
      if (this.config.use_persistent_storage) {
        this.loadFromPersistentStorage();
      }
      
      // Preload essential data if enabled
      if (this.config.preload_essentials) {
        this.preloadEssentials();
      }
      
      // Cleanup old cache entries every 2 minutes
      setInterval(() => this.cleanupCache(), 2 * 60 * 1000);
    }
  }

  // REQUEST DEDUPLICATION - Prevents simultaneous identical requests
  private async deduplicatedRequest<T>(key: string, request_fn: () => Promise<T>): Promise<T> {
    // Check if identical request is already in progress
    if (this.activeRequests.has(key)) {
      console.log(`🔄 Joining existing request: ${key}`);
      return this.activeRequests.get(key) as Promise<T>;
    }

    // Create new request and track it
    const requestPromise = request_fn().finally(() => {
      // Clean up when request completes (success or failure)
      this.activeRequests.delete(key);
    });

    this.activeRequests.set(key, requestPromise);
    console.log(`🚀 New request started: ${key}`);
    
    return requestPromise;
  }

  // INTELLIGENT PREFETCHING - Background loading of likely-needed data
  private async startPrefetching() {
    if (!this.prefetchConfig.enabled || this.prefetchInProgress) {
      return;
    }

    this.prefetchInProgress = true;
    console.log(`🔮 Starting prefetch queue (${this.prefetchQueue.length} items)`);

    try {
      while (this.prefetchQueue.length > 0) {
        const item = this.prefetchQueue.shift()!;
        const [type, identifier] = item.split(':');

        // Only prefetch if not already cached or being fetched
        const cacheKey = this.getCacheKey(type, identifier);
        if (!this.isCached(cacheKey) && !this.activeRequests.has(cacheKey)) {
          console.log(`🔮 Prefetching: ${item}`);
          
          try {
            await this.loadItemByType(type, identifier);
          } catch (error) {
            console.warn(`⚠️ Prefetch failed for ${item}:`, error);
          }

          // Small delay between prefetch requests to avoid overwhelming
          await new Promise(resolve => setTimeout(resolve, this.prefetchConfig.delay_between_requests));
        }
      }
    } finally {
      this.prefetchInProgress = false;
      console.log(`✅ Prefetching complete`);
    }
  }

  // Helper methods for prefetching
  private getCacheKey(type: string, identifier: string): string {
    switch (type) {
      case 'contestant': return identifier;
      case 'generic': return 'generic_equipment';
      case 'items': return 'consumable_items';
      default: return `${type}_${identifier}`;
    }
  }

  private isCached(cacheKey: string): boolean {
    if (cacheKey === 'generic_equipment') {
      return this.generic_equipment_cache !== null && 
             Date.now() - this.generic_equipment_cache.timestamp < this.config.max_age;
    }
    if (cacheKey === 'consumable_items') {
      return this.items_cache !== null && 
             Date.now() - this.items_cache.timestamp < this.config.max_age;
    }
    const cached = this.characterEquipmentCache.get(cacheKey);
    return cached !== undefined && Date.now() - cached.timestamp < this.config.max_age;
  }

  private async loadItemByType(type: string, identifier: string): Promise<any> {
    switch (type) {
      case 'contestant':
        return this.getCharacterEquipment(identifier);
      case 'generic':
        return this.getGenericEquipment();
      case 'items':
        return this.getItems();
      default:
        console.warn(`Unknown prefetch type: ${type}`);
    }
  }

  // Public method to queue prefetch items
  public queuePrefetch(items: string[]) {
    if (!this.prefetchConfig.enabled) return;
    
    this.prefetchQueue.push(...items);
    console.log(`📋 Queued ${items.length} items for prefetch`);
    
    // Start prefetching after a short delay (let immediate requests finish first)
    setTimeout(() => this.startPrefetching(), 100);
  }

  // Enhanced fetch with better error handling
  private async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
      console.log(`🌐 API Request: ${url}`);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error(`❌ API request failed for ${url}:`, error);
      throw error;
    }
  }

  // Load cached data from localStorage on initialization
  private loadFromPersistentStorage() {
    // Skip during SSR
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Load generic equipment
      const genericData = localStorage.getItem(this.STORAGE_KEYS.GENERIC_EQUIPMENT);
      if (genericData) {
        const parsed = JSON.parse(genericData);
        if (Date.now() - parsed.timestamp < this.config.max_age) {
          this.generic_equipment_cache = parsed;
          console.log('📦 Loaded generic equipment from persistent storage');
        }
      }

      // Load items
      const itemsData = localStorage.getItem(this.STORAGE_KEYS.ITEMS);
      if (itemsData) {
        const parsed = JSON.parse(itemsData);
        if (Date.now() - parsed.timestamp < this.config.max_age) {
          this.items_cache = parsed;
          console.log('📦 Loaded items from persistent storage');
        }
      }

      // Load character equipment (check common characters)
      const commonCharacters = ['achilles', 'merlin', 'holmes', 'dracula', 'tesla'];
      for (const character_id of commonCharacters) {
        const key = this.STORAGE_KEYS.CHARACTER_EQUIPMENT + character_id;
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (Date.now() - parsed.timestamp < this.config.max_age) {
            this.characterEquipmentCache.set(character_id, parsed);
            console.log(`📦 Loaded ${character_id} equipment from persistent storage`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from persistent storage:', error);
    }
  }

  // Save cache entry to localStorage
  private saveToPersistentStorage(key: string, data: CacheEntry<any>) {
    if (!this.config.use_persistent_storage || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`⚠️ Failed to save to persistent storage (${key}):`, error);
      // If storage is full, try to clear some old equipment cache
      this.clearOldPersistentData();
    }
  }

  // Clear old persistent data to make room
  private clearOldPersistentData() {
    if (typeof window === 'undefined') return;
    
    try {
      const keys = Object.keys(localStorage);
      const equipmentKeys = keys.filter(key => 
        key.startsWith('equipment_cache_') && 
        key !== this.STORAGE_KEYS.GENERIC_EQUIPMENT && 
        key !== this.STORAGE_KEYS.ITEMS
      );
      
      // Remove oldest character equipment caches
      equipmentKeys.slice(0, 5).forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared old persistent cache: ${key}`);
      });
    } catch (error) {
      console.warn('⚠️ Failed to clear old persistent data:', error);
    }
  }

  // Smart cache management - removes least recently used items when cache is full
  private evictLeastRecentlyUsed() {
    if (this.equipmentCache.size <= this.config.max_cache_size) return;
    
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.equipmentCache.entries()) {
      if (entry.last_accessed < oldestTime) {
        oldestTime = entry.last_accessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.equipmentCache.delete(oldestKey);
      console.log(`🗑️ Evicted equipment cache entry: ${oldestKey}`);
    }
  }

  // Remove expired cache entries
  private cleanupCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Clean equipment cache
    for (const [key, entry] of this.equipmentCache.entries()) {
      if (now - entry.timestamp > this.config.max_age) {
        this.equipmentCache.delete(key);
        cleanedCount++;
      }
    }
    
    // Clean character equipment cache
    for (const [key, entry] of this.characterEquipmentCache.entries()) {
      if (now - entry.timestamp > this.config.max_age) {
        this.characterEquipmentCache.delete(key);
        cleanedCount++;
      }
    }
    
    // Clean items cache
    if (this.items_cache && now - this.items_cache.timestamp > this.config.max_age) {
      this.items_cache = null;
      cleanedCount++;
    }
    
    // Clean generic equipment cache
    if (this.generic_equipment_cache && now - this.generic_equipment_cache.timestamp > this.config.max_age) {
      this.generic_equipment_cache = null;
      cleanedCount++;
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  // Preload only essential equipment data
  private async preloadEssentials() {
    try {
      console.log('🔄 Preloading essential equipment data...');
      
      // Load generic equipment (always useful)
      await this.getGenericEquipment();
      
      // Load consumable items (frequently used)
      await this.getItems();
      
      console.log('✅ Essential equipment data preloaded');
    } catch (error) {
      console.error('❌ Failed to preload essential equipment:', error);
    }
  }

  // Get all equipment for a specific character (lazy loaded)
  async getCharacterEquipment(character_id: string): Promise<any[]> {
    const cacheKey = character_id;
    const cached = this.characterEquipmentCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.max_age) {
      cached.last_accessed = Date.now();
      cached.access_count++;
      console.log(`📦 Cache hit for ${character_id} equipment`);
      return cached.data;
    }
    
    // Use deduplication to prevent simultaneous identical requests
    return this.deduplicatedRequest(`character_${character_id}`, async () => {
      const response = await this.safeFetch(`${BACKEND_URL}/api/equipment/character/${encodeURIComponent(character_id)}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch character equipment');
      }
      
      const equipment = result.equipment || [];
      
      // Cache the result
      const cacheEntry: CacheEntry<any[]> = {
        data: equipment,
        timestamp: Date.now(),
        access_count: 1,
        last_accessed: Date.now()
      };
      
      this.characterEquipmentCache.set(cacheKey, cacheEntry);
      
      // Save to persistent storage
      this.saveToPersistentStorage(
        this.STORAGE_KEYS.CHARACTER_EQUIPMENT + character_id, 
        cacheEntry
      );
      console.log(`💾 Cached ${equipment.length} items for ${character_id}`);
      
      return equipment;
    });
  }

  // Get generic equipment (cached for all users)
  async getGenericEquipment(): Promise<any[]> {
    if (this.generic_equipment_cache && Date.now() - this.generic_equipment_cache.timestamp < this.config.max_age) {
      this.generic_equipment_cache.last_accessed = Date.now();
      this.generic_equipment_cache.access_count++;
      console.log('📦 Cache hit for generic equipment');
      return this.generic_equipment_cache.data;
    }
    
    return this.deduplicatedRequest('generic_equipment', async () => {
      const response = await this.safeFetch(`${BACKEND_URL}/api/equipment/generic`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch generic equipment');
      }
      
      const equipment = result.equipment || [];
      
      // Cache the result
      this.generic_equipment_cache = {
        data: equipment,
        timestamp: Date.now(),
        access_count: 1,
        last_accessed: Date.now()
      };
      
      // Save to persistent storage
      this.saveToPersistentStorage(
        this.STORAGE_KEYS.GENERIC_EQUIPMENT,
        this.generic_equipment_cache
      );
      
      console.log(`💾 Cached ${equipment.length} generic equipment items`);
      return equipment;
    });
  }

  // Get consumable items (cached for all users)
  async getItems(): Promise<any[]> {
    if (this.items_cache && Date.now() - this.items_cache.timestamp < this.config.max_age) {
      this.items_cache.last_accessed = Date.now();
      this.items_cache.access_count++;
      console.log('📦 Cache hit for consumable items');
      return this.items_cache.data;
    }
    
    try {
      console.log('🌐 Fetching consumable items...');
      const response = await fetch(`${BACKEND_URL}/api/equipment/items`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch items');
      }
      
      const items = result.items || [];
      
      // Cache the result
      this.items_cache = {
        data: items,
        timestamp: Date.now(),
        access_count: 1,
        last_accessed: Date.now()
      };
      
      // Save to persistent storage
      this.saveToPersistentStorage(
        this.STORAGE_KEYS.ITEMS,
        this.items_cache
      );
      
      console.log(`💾 Cached ${items.length} consumable items`);
      return items;
    } catch (error) {
      console.error('❌ Failed to fetch consumable items:', error);
      return [];
    }
  }

  // Get specific equipment by ID (with intelligent caching)
  async getEquipmentById(equipment_id: string): Promise<any | null> {
    const cached = this.equipmentCache.get(equipment_id);
    
    if (cached && Date.now() - cached.timestamp < this.config.max_age) {
      cached.last_accessed = Date.now();
      cached.access_count++;
      console.log(`📦 Cache hit for equipment ${equipment_id}`);
      return cached.data;
    }
    
    // If not in cache, try to find it in character equipment caches first
    for (const [character_id, characterCache] of this.characterEquipmentCache.entries()) {
      if (Date.now() - characterCache.timestamp < this.config.max_age) {
        const found = characterCache.data.find(item => item.id === equipment_id);
        if (found) {
          // Cache this individual item for faster future access
          this.evictLeastRecentlyUsed();
          this.equipmentCache.set(equipment_id, {
            data: found,
            timestamp: Date.now(),
            access_count: 1,
            last_accessed: Date.now()
          });
          console.log(`📦 Found ${equipment_id} in ${character_id} cache`);
          return found;
        }
      }
    }
    
    // Check generic equipment cache
    if (this.generic_equipment_cache && Date.now() - this.generic_equipment_cache.timestamp < this.config.max_age) {
      const found = this.generic_equipment_cache.data.find(item => item.id === equipment_id);
      if (found) {
        this.evictLeastRecentlyUsed();
        this.equipmentCache.set(equipment_id, {
          data: found,
          timestamp: Date.now(),
          access_count: 1,
          last_accessed: Date.now()
        });
        console.log(`📦 Found ${equipment_id} in generic equipment cache`);
        return found;
      }
    }
    
    console.log(`❓ Equipment ${equipment_id} not found in cache`);
    return null;
  }

  // Get multiple equipment items efficiently
  async getMultipleEquipment(equipment_ids: string[]): Promise<any[]> {
    const results: any[] = [];
    const notFound: string[] = [];
    
    // First, check cache for each item
    for (const id of equipment_ids) {
      const cached = await this.getEquipmentById(id);
      if (cached) {
        results.push(cached);
      } else {
        notFound.push(id);
      }
    }
    
    // TODO: If we have items not found, we could implement batch fetching
    // For now, return what we found
    
    return results;
  }

  // Clear specific cache entries
  clearCharacterCache(character_id: string) {
    this.characterEquipmentCache.delete(character_id);
    console.log(`🗑️ Cleared cache for ${character_id}`);
  }

  clearAllCache() {
    this.equipmentCache.clear();
    this.characterEquipmentCache.clear();
    this.items_cache = null;
    this.generic_equipment_cache = null;
    console.log('🗑️ Cleared all equipment cache');
  }

  // Get cache statistics for debugging
  getCacheStats() {
    const now = Date.now();
    
    return {
      equipment_cache: {
        size: this.equipmentCache.size,
        entries: Array.from(this.equipmentCache.entries()).map(([key, entry]) => ({
          key,
          age: now - entry.timestamp,
          access_count: entry.access_count,
          last_accessed: now - entry.last_accessed
        }))
      },
      character_equipment_cache: {
        size: this.characterEquipmentCache.size,
        entries: Array.from(this.characterEquipmentCache.entries()).map(([key, entry]) => ({
          character: key,
          item_count: entry.data.length,
          age: now - entry.timestamp,
          access_count: entry.access_count
        }))
      },
      items_cache: this.items_cache ? {
        item_count: this.items_cache.data.length,
        age: now - this.items_cache.timestamp,
        access_count: this.items_cache.access_count
      } : null,
      generic_equipment_cache: this.generic_equipment_cache ? {
        item_count: this.generic_equipment_cache.data.length,
        age: now - this.generic_equipment_cache.timestamp,
        access_count: this.generic_equipment_cache.access_count
      } : null
    };
  }

  // ===== DATABASE-BACKED UTILITY FUNCTIONS =====
  // These replace the hardcoded utility functions from items.ts
  
  /**
   * Get items filtered by type - database-backed version
   */
  async getItemsByType(type: string): Promise<any[]> {
    const allItems = await this.getItems();
    return allItems.filter(item => item.type === type);
  }

  /**
   * Get items filtered by rarity - database-backed version
   */
  async getItemsByRarity(rarity: string): Promise<any[]> {
    const allItems = await this.getItems();
    return allItems.filter(item => item.rarity === rarity);
  }

  /**
   * Get items filtered by usage context - database-backed version
   */
  async getItemsByUsage(usage: string): Promise<any[]> {
    const allItems = await this.getItems();
    return allItems.filter(item => item.usage_context === usage);
  }

  /**
   * Get random items for testing/demo purposes - database-backed version
   */
  async getRandomItems(count: number = 3, rarity?: string): Promise<any[]> {
    const allItems = await this.getItems();
    const filtered = rarity ? allItems.filter(item => item.rarity === rarity) : allItems;
    
    if (filtered.length === 0) return [];
    
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Create demo item inventory - database-backed version
   */
  async createDemoItemInventory(): Promise<any[]> {
    try {
      const [common, uncommon, rare] = await Promise.all([
        this.getRandomItems(3, 'common'),
        this.getRandomItems(2, 'uncommon'), 
        this.getRandomItems(1, 'rare')
      ]);
      return [...common, ...uncommon, ...rare];
    } catch (error) {
      console.error('Failed to create demo inventory:', error);
      return [];
    }
  }

  /**
   * Get crafting materials from database
   */
  async getCraftingMaterials(): Promise<any[]> {
    try {
      console.log('🧱 Fetching crafting materials from database...');
      const response = await fetch(`${BACKEND_URL}/api/equipment/crafting-materials`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch crafting materials: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.warn('⚠️ Crafting materials not available:', result.note || result.error);
        return [];
      }
      
      console.log(`✅ Loaded ${result.materials.length} crafting materials from database`);
      return result.materials || [];
    } catch (error) {
      console.warn('⚠️ Failed to fetch crafting materials from database, using fallback:', error);
      return [];
    }
  }

  /**
   * Get historical weapons from database
   */
  async getHistoricalWeapons(): Promise<any[]> {
    try {
      console.log('🏛️ Fetching historical weapons from database...');
      const response = await fetch(`${BACKEND_URL}/api/equipment/historical-weapons`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical weapons: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.warn('⚠️ Historical weapons not available:', result.note || result.error);
        return [];
      }
      
      console.log(`✅ Loaded ${result.weapons.length} historical weapons from database`);
      return result.weapons || [];
    } catch (error) {
      console.warn('⚠️ Failed to fetch historical weapons from database, using fallback:', error);
      return [];
    }
  }

  /**
   * Get crafting recipes from database
   */
  async getCraftingRecipes(): Promise<any[]> {
    try {
      console.log('🔨 Fetching crafting recipes from database...');
      const response = await fetch(`${BACKEND_URL}/api/equipment/crafting-recipes`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch crafting recipes: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.warn('⚠️ Crafting recipes not available:', result.note || result.error);
        return [];
      }
      
      console.log(`✅ Loaded ${result.recipes.length} crafting recipes from database`);
      return result.recipes || [];
    } catch (error) {
      console.warn('⚠️ Failed to fetch crafting recipes from database, using fallback:', error);
      return [];
    }
  }
}

// Create singleton instance
export const equipmentCache = new EquipmentCacheService();

// Export types for use in components
export type { EquipmentCacheConfig };
export { EquipmentCacheService };