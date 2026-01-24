import { redis_service, CacheInterface } from './redisService';

// Fallback in-memory cache for development/testing
class InMemoryCache implements CacheInterface {
  private cache = new Map<string, { value: string; expires?: number }>();
  private hashes = new Map<string, Map<string, string>>();
  private sets = new Map<string, Set<string>>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ttl_seconds?: number): Promise<void> {
    const expires = ttl_seconds ? Date.now() + (ttl_seconds * 1000) : undefined;
    this.cache.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.hashes.delete(key);
    this.sets.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async expire(key: string, ttl_seconds: number): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      item.expires = Date.now() + (ttl_seconds * 1000);
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const current = await this.get(key);
    const value = (current ? parseInt(current, 10) : 0) + by;
    await this.set(key, value.toString());
    return value;
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    return this.increment(key, -by);
  }

  // Atomic set-if-not-exists (SETNX) - returns true if set, false if key already exists
  async setNX(key: string, value: string, ttl_seconds?: number): Promise<boolean> {
    // Check if key already exists
    const existing = this.cache.get(key);
    if (existing) {
      // Check if expired
      if (existing.expires && Date.now() > existing.expires) {
        this.cache.delete(key);
      } else {
        return false; // Key exists and not expired, lock not acquired
      }
    }

    // Key doesn't exist, set it
    const expires = ttl_seconds ? Date.now() + (ttl_seconds * 1000) : undefined;
    this.cache.set(key, { value, expires });
    return true; // Lock acquired
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    this.hashes.get(key)!.set(field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashes.get(key);
    return hash ? hash.get(field) || null : null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    if (!hash) return {};

    const result: Record<string, string> = {};
    for (const [field, value] of hash.entries()) {
      result[field] = value;
    }
    return result;
  }

  async hdel(key: string, field: string): Promise<void> {
    const hash = this.hashes.get(key);
    if (hash) {
      hash.delete(field);
    }
  }

  // Set operations
  async sadd(key: string, member: string): Promise<void> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    this.sets.get(key)!.add(member);
  }

  async srem(key: string, member: string): Promise<void> {
    const set = this.sets.get(key);
    if (set) {
      set.delete(member);
    }
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const set = this.sets.get(key);
    return set ? set.has(member) : false;
  }

  // Pub/Sub (no-op for in-memory)
  async publish(channel: string, message: string): Promise<void> {
    console.log(`[InMemory] Would publish to ${channel}: ${message}`);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    console.log(`[InMemory] Would subscribe to ${channel}`);
  }
}

class CacheService {
  private redis: CacheInterface;
  private fallback: CacheInterface;
  private use_redis: boolean = false;

  constructor() {
    this.redis = redis_service;
    this.fallback = new InMemoryCache();

    // Start with in-memory cache for development
    this.use_redis = false;

    // Skip Redis health check for development
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      setTimeout(() => {
        this.checkRedisHealth();
      }, 100);
    }
  }

  private async checkRedisHealth(): Promise<void> {
    try {
      // Add timeout to prevent hanging
      const health_check_promise = (async () => {
        await this.redis.set('health_check', 'ok', 10);
        const result = await this.redis.get('health_check');
        return result === 'ok';
      })();

      const timeout_promise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Redis health check timeout')), 5000);
      });

      this.use_redis = await Promise.race([health_check_promise, timeout_promise]);

      if (this.use_redis) {
        console.log('✅ Redis health check passed - using Redis cache');
      } else {
        console.warn('⚠️ Redis health check failed - falling back to in-memory cache');
      }
    } catch (error) {
      console.warn('⚠️ Redis unavailable - using in-memory cache:', error instanceof Error ? error.message : String(error));
      this.use_redis = false;
    }
  }

  private getCache(): CacheInterface {
    return this.use_redis ? this.redis : this.fallback;
  }

  // Basic cache operations
  async get(key: string): Promise<string | null> {
    try {
      return await this.getCache().get(key);
    } catch (error) {
      if (this.use_redis) {
        console.warn('Redis operation failed, falling back to in-memory:', error instanceof Error ? error.message : String(error));
        return await this.fallback.get(key);
      }
      throw error;
    }
  }

  async set(key: string, value: string, ttl_seconds?: number): Promise<void> {
    try {
      await this.getCache().set(key, value, ttl_seconds);
    } catch (error) {
      if (this.use_redis) {
        console.warn('Redis operation failed, falling back to in-memory:', error instanceof Error ? error.message : String(error));
        await this.fallback.set(key, value, ttl_seconds);
      } else {
        throw error;
      }
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.getCache().del(key);
    } catch (error) {
      if (this.use_redis) {
        console.warn('Redis operation failed, falling back to in-memory:', error instanceof Error ? error.message : String(error));
        await this.fallback.del(key);
      } else {
        throw error;
      }
    }
  }

  // Battle-specific methods
  async setBattleState(battle_id: string, state: any): Promise<void> {
    await this.set(`battle:${battle_id}`, JSON.stringify(state), 3600); // 1 hour TTL
  }

  async getBattleState(battle_id: string): Promise<any | null> {
    const data = await this.get(`battle:${battle_id}`);
    return data ? JSON.parse(data) : null;
  }

  async addUserToMatchmaking(user_id: string, user_data: any, mode: string = 'casual'): Promise<void> {
    const queue_key = `matchmaking:${mode}`;
    console.log(`[CacheService] Adding user ${user_id} to ${queue_key} (Redis: ${this.use_redis})`);
    try {
      if (this.use_redis) {
        await this.redis.hset(queue_key, user_id, JSON.stringify(user_data));
        await this.redis.sadd(`${queue_key}:players`, user_id);
        await this.redis.expire(queue_key, 600); // 10 minutes
        await this.redis.expire(`${queue_key}:players`, 600);
      } else {
        await this.fallback.hset(queue_key, user_id, JSON.stringify(user_data));
        await this.fallback.sadd(`${queue_key}:players`, user_id);
        const members = await this.fallback.smembers(`${queue_key}:players`);
        console.log(`[CacheService] In-memory queue ${queue_key} now has members:`, members);
      }
    } catch (error) {
      console.error('Failed to add user to matchmaking:', error);
      throw error;
    }
  }

  async removeUserFromMatchmaking(user_id: string, mode: string = 'casual'): Promise<void> {
    const queue_key = `matchmaking:${mode}`;
    console.log(`[CacheService] Removing user ${user_id} from ${queue_key}`);
    try {
      if (this.use_redis) {
        await this.redis.hdel(queue_key, user_id);
        await this.redis.srem(`${queue_key}:players`, user_id);
      } else {
        await this.fallback.hdel(queue_key, user_id);
        await this.fallback.srem(`${queue_key}:players`, user_id);
      }
    } catch (error) {
      console.error('Failed to remove user from matchmaking:', error);
      throw error;
    }
  }

  async getMatchmakingQueue(mode: string = 'casual'): Promise<Array<{ id: string; data: any }>> {
    const queue_key = `matchmaking:${mode}`;
    console.log(`[CacheService] Getting queue ${queue_key} (Redis: ${this.use_redis})`);
    try {
      const cache = this.getCache();
      const player_ids = await cache.smembers(`${queue_key}:players`);
      console.log(`[CacheService] Found player IDs:`, player_ids);
      const players = [];

      for (const player_id of player_ids) {
        const player_dataString = await cache.hget(queue_key, player_id);
        if (player_dataString) {
          players.push({
            id: player_id,
            data: JSON.parse(player_dataString)
          });
        }
      }

      return players;
    } catch (error) {
      console.error('Failed to get matchmaking queue:', error);
      return [];
    }
  }

  async getMatchmakingQueueSize(mode: string = 'casual'): Promise<number> {
    try {
      const queue_key = `matchmaking:${mode}:players`;
      const player_ids = await this.getCache().smembers(queue_key);
      return player_ids.length;
    } catch (error) {
      console.error('Failed to get queue size:', error);
      return 0;
    }
  }

  // Battle coordination methods
  async publishBattleEvent(battle_id: string, event: any): Promise<void> {
    try {
      const channel = `battle:${battle_id}:events`;
      const message = JSON.stringify(event);

      if (this.use_redis) {
        await this.redis.publish(channel, message);
      } else {
        // For in-memory cache, we can't really publish between servers
        console.log(`[InMemory] Battle event for ${battle_id}:`, event);
      }
    } catch (error) {
      console.error('Failed to publish battle event:', error);
    }
  }

  async subscribeToBattleEvents(battle_id: string, callback: (event: any) => void): Promise<void> {
    try {
      const channel = `battle:${battle_id}:events`;

      if (this.use_redis) {
        await this.redis.subscribe(channel, (message: string) => {
          try {
            const event = JSON.parse(message);
            callback(event);
          } catch (error) {
            console.error('Failed to parse battle event:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to subscribe to battle events:', error);
    }
  }

  // Server coordination
  async registerServer(server_id: string, server_info: any): Promise<void> {
    try {
      await this.set(`server:${server_id}`, JSON.stringify(server_info), 60); // 1 minute heartbeat
    } catch (error) {
      console.error('Failed to register server:', error);
    }
  }

  async getActiveServers(): Promise<Array<{ id: string; info: any }>> {
    try {
      // This would require scanning in Redis, which is expensive
      // For now, return empty array for in-memory cache
      return [];
    } catch (error) {
      console.error('Failed to get active servers:', error);
      return [];
    }
  }

  // Health and debugging
  isUsingRedis(): boolean {
    return this.use_redis;
  }

  async getStats(): Promise<{ provider: string; health: boolean }> {
    return {
      provider: this.use_redis ? 'Redis' : 'InMemory',
      health: this.use_redis ? (redis_service as any).isHealthy() : true
    };
  }
}

// Export singleton instance
export const cache_service = new CacheService();