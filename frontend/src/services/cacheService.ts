/**
 * Advanced caching service with TTL, LRU eviction, and memory management
 * Caches frequently accessed data to improve performance
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  access_count: number;
  last_accessed: number;
  ttl?: number;
}

interface CacheConfig {
  max_size: number;
  default_ttl: number; // milliseconds
  cleanup_interval: number; // milliseconds
  memory_threshold: number; // bytes (rough estimate)
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder: string[] = []; // For LRU tracking
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  
  private config: CacheConfig = {
    max_size: 1000,
    default_ttl: 5 * 60 * 1000, // 5 minutes
    cleanup_interval: 60 * 1000, // 1 minute
    memory_threshold: 10 * 1024 * 1024 // 10MB
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config };
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.config.cleanup_interval);
  }

  public set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const finalTTL = ttl || this.config.default_ttl;
    
    // Remove from access order if it exists
    this.removeFromAccessOrder(key);
    
    // Add to cache
    this.cache.set(key, {
      value,
      timestamp: now,
      access_count: 0,
      last_accessed: now,
      ttl: finalTTL
    });
    
    // Add to front of access order (most recently used)
    this.accessOrder.unshift(key);
    
    // Enforce size limits
    this.enforceSize();
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    
    // Check if expired
    if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
      this.delete(key);
      return null;
    }
    
    // Update access tracking
    entry.access_count++;
    entry.last_accessed = now;
    
    // Move to front of access order (most recently used)
    this.removeFromAccessOrder(key);
    this.accessOrder.unshift(key);
    
    return entry.value;
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (entry.ttl && (Date.now() - entry.timestamp) > entry.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  public delete(key: string): boolean {
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private enforceSize(): void {
    // Remove expired entries first
    this.removeExpired();
    
    // If still over size limit, remove least recently used
    while (this.cache.size > this.config.max_size) {
      const lruKey = this.accessOrder.pop();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }

  private removeExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
  }

  private cleanup(): void {
    this.removeExpired();
    
    // Estimate memory usage and clean up if needed
    const estimatedMemory = this.estimateMemoryUsage();
    
    if (estimatedMemory > this.config.memory_threshold) {
      this.aggressiveCleanup();
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Estimate size based on JSON serialization
      try {
        const serialized = JSON.stringify({ key, value: entry.value });
        totalSize += serialized.length * 2; // UTF-16 characters are 2 bytes
      } catch {
        // If can't serialize, assume 1KB
        totalSize += 1024;
      }
    }
    
    return totalSize;
  }

  private aggressiveCleanup(): void {
    // Remove least frequently accessed items
    const entries = Array.from(this.cache.entries());
    
    // Sort by access count (ascending) and last accessed (ascending)
    entries.sort(([, a], [, b]) => {
      if (a.access_count !== b.access_count) {
        return a.access_count - b.access_count;
      }
      return a.last_accessed - b.last_accessed;
    });
    
    // Remove bottom 25% of entries
    const removeCount = Math.floor(entries.length * 0.25);
    
    for (let i = 0; i < removeCount; i++) {
      const [key] = entries[i];
      this.delete(key);
    }
  }

  public getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let averageAge = 0;
    let totalAccessCount = 0;
    
    for (const entry of this.cache.values()) {
      if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
        expiredCount++;
      }
      averageAge += (now - entry.timestamp);
      totalAccessCount += entry.access_count;
    }
    
    return {
      size: this.cache.size,
      max_size: this.config.max_size,
      expiredCount,
      average_age: this.cache.size > 0 ? averageAge / this.cache.size : 0,
      totalAccessCount,
      estimated_memory: this.estimateMemoryUsage(),
      memory_threshold: this.config.memory_threshold
    };
  }

  public destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.clear();
  }
}

// Create specialized cache instances
const generalCache = new CacheService();

const characterCache = new CacheService({
  max_size: 500,
  default_ttl: 10 * 60 * 1000, // 10 minutes
  memory_threshold: 5 * 1024 * 1024 // 5MB
});

const battleCache = new CacheService({
  max_size: 100,
  default_ttl: 2 * 60 * 1000, // 2 minutes
  memory_threshold: 2 * 1024 * 1024 // 2MB
});

// Export cache instances and utilities
export { CacheService };

export const cache = {
  general: generalCache,
  characters: characterCache,
  battles: battleCache,
  
  // Convenience methods for general cache
  set: <T>(key: string, value: T, ttl?: number) => generalCache.set(key, value, ttl),
  get: <T>(key: string) => generalCache.get<T>(key),
  has: (key: string) => generalCache.has(key),
  delete: (key: string) => generalCache.delete(key),
  clear: () => generalCache.clear(),
  get_stats: () => ({
    general: generalCache.getStats(),
    characters: characterCache.getStats(),
    battles: battleCache.getStats()
  })
};

export default cache;