import Redis from 'ioredis';
import { config } from 'dotenv';

// Load environment variables
config();

export interface CacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl_seconds?: number): Promise<void>;
  setNX(key: string, value: string, ttl_seconds?: number): Promise<boolean>; // Set if not exists (atomic lock)
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl_seconds: number): Promise<void>;
  increment(key: string, by?: number): Promise<number>;
  decrement(key: string, by?: number): Promise<number>;
  hset(key: string, field: string, value: string): Promise<void>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string): Promise<void>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: string): Promise<boolean>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, callback: (message: string) => void): Promise<void>;
}

class RedisService implements CacheInterface {
  private redis: Redis | null = null;
  private subscriber: Redis | null = null;
  private is_connected = false;
  private subscribers = new Map<string, Set<(message: string) => void>>();

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    // TEMPORARILY DISABLED: Force in-memory cache for single-server deployment
    console.log('📝 Redis temporarily disabled - using in-memory cache for single-server deployment');
    this.is_connected = false;
    return;
    
    // Skip Redis entirely if no REDIS_URL is set (local development)
    if (!process.env.REDIS_URL) {
      console.log('📝 No REDIS_URL set - using in-memory cache for local development');
      this.is_connected = false;
      return;
    }

    try {
      const redis_url = process.env.REDIS_URL!;
      const redis_options = {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 3000,
        enableOfflineQueue: false,
      };

      console.log('🔄 Connecting to Redis...');
      
      this.redis = new Redis(redis_url, redis_options);
      this.subscriber = new Redis(redis_url, redis_options);

      // Comprehensive error handling to prevent unhandled errors
      const setup_error_handlers = (instance: Redis, name: string) => {
        instance.on('error', (error) => {
          console.warn(`⚠️ Redis ${name} error (falling back to in-memory cache):`, error.message);
          this.is_connected = false;
        });

        instance.on('close', () => {
          if (this.is_connected) {
            console.warn(`⚠️ Redis ${name} connection closed`);
          }
          this.is_connected = false;
        });

        instance.on('end', () => {
          this.is_connected = false;
        });

        instance.on('reconnecting', () => {
          console.log(`🔄 Redis ${name} reconnecting...`);
        });

        // Handle any other events that might throw
        instance.on('connect', () => {
          console.log(`✅ Redis ${name} connected`);
        });
      };

      setup_error_handlers(this.redis!, 'client');
      setup_error_handlers(this.subscriber!, 'subscriber');

      // Connect with timeout protection
      const connect_timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis connection timeout')), 3000);
      });

      await Promise.race([
        Promise.all([
          this.redis!.connect(),
          this.subscriber!.connect()
        ]),
        connect_timeout
      ]);

      this.is_connected = true;
      console.log('✅ Redis fully connected and ready');

      // Set up subscriber message handling
      this.subscriber!.on('message', (channel, message) => {
        const callbacks = this.subscribers.get(channel);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error(`Error in subscriber callback for channel ${channel}:`, error);
            }
          });
        }
      });

    } catch (error) {
      console.warn('⚠️ Redis connection failed:', (error as Error).message);
      this.is_connected = false;
      
      // Clean up failed connections
      if (this.redis) {
        this.redis!.disconnect();
      }
      if (this.subscriber) {
        this.subscriber!.disconnect();
      }
    }
  }

  private ensureConnection(): void {
    if (!this.is_connected || !this.redis) {
      throw new Error('Redis not connected. Using fallback cache.');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      this.ensureConnection();
      return await this.redis!.get(key);
    } catch (error) {
      console.warn(`Redis GET failed for key ${key}, falling back:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl_seconds?: number): Promise<void> {
    try {
      this.ensureConnection();
      if (ttl_seconds) {
        await this.redis!.setex(key, ttl_seconds, value);
      } else {
        await this.redis!.set(key, value);
      }
    } catch (error) {
      console.warn(`Redis SET failed for key ${key}:`, error);
      throw error;
    }
  }

  // Atomic SETNX - returns true if lock acquired, false if key already exists
  async setNX(key: string, value: string, ttl_seconds?: number): Promise<boolean> {
    try {
      this.ensureConnection();
      // Use SET with NX and EX options for atomic set-if-not-exists with TTL
      const result = await this.redis!.set(key, value, 'EX', ttl_seconds || 30, 'NX');
      return result === 'OK';
    } catch (error) {
      console.warn(`Redis SETNX failed for key ${key}:`, error);
      return false; // Conservative: assume lock not acquired on error
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.ensureConnection();
      await this.redis!.del(key);
    } catch (error) {
      console.warn(`Redis DEL failed for key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      this.ensureConnection();
      const result = await this.redis!.exists(key);
      return result === 1;
    } catch (error) {
      console.warn(`Redis EXISTS failed for key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl_seconds: number): Promise<void> {
    try {
      this.ensureConnection();
      await this.redis!.expire(key, ttl_seconds);
    } catch (error) {
      console.warn(`Redis EXPIRE failed for key ${key}:`, error);
      throw error;
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    try {
      this.ensureConnection();
      return await this.redis!.incrby(key, by);
    } catch (error) {
      console.warn(`Redis INCR failed for key ${key}:`, error);
      throw error;
    }
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      this.ensureConnection();
      return await this.redis!.decrby(key, by);
    } catch (error) {
      console.warn(`Redis DECR failed for key ${key}:`, error);
      throw error;
    }
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      this.ensureConnection();
      await this.redis!.hset(key, field, value);
    } catch (error) {
      console.warn(`Redis HSET failed for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      this.ensureConnection();
      return await this.redis!.hget(key, field);
    } catch (error) {
      console.warn(`Redis HGET failed for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      this.ensureConnection();
      return await this.redis!.hgetall(key);
    } catch (error) {
      console.warn(`Redis HGETALL failed for key ${key}:`, error);
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      this.ensureConnection();
      await this.redis!.hdel(key, field);
    } catch (error) {
      console.warn(`Redis HDEL failed for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  // Set operations
  async sadd(key: string, member: string): Promise<void> {
    try {
      this.ensureConnection();
      await this.redis!.sadd(key, member);
    } catch (error) {
      console.warn(`Redis SADD failed for key ${key}:`, error);
      throw error;
    }
  }

  async srem(key: string, member: string): Promise<void> {
    try {
      this.ensureConnection();
      await this.redis!.srem(key, member);
    } catch (error) {
      console.warn(`Redis SREM failed for key ${key}:`, error);
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      this.ensureConnection();
      return await this.redis!.smembers(key);
    } catch (error) {
      console.warn(`Redis SMEMBERS failed for key ${key}:`, error);
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      this.ensureConnection();
      const result = await this.redis!.sismember(key, member);
      return result === 1;
    } catch (error) {
      console.warn(`Redis SISMEMBER failed for key ${key}:`, error);
      return false;
    }
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<void> {
    try {
      this.ensureConnection();
      await this.redis!.publish(channel, message);
    } catch (error) {
      console.warn(`Redis PUBLISH failed for channel ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      if (!this.subscriber) {
        throw new Error('Redis subscriber not initialized');
      }

      // Add callback to subscribers map
      if (!this.subscribers.has(channel)) {
        this.subscribers.set(channel, new Set());
        await this.subscriber.subscribe(channel);
      }
      this.subscribers.get(channel)!.add(callback);

    } catch (error) {
      console.warn(`Redis SUBSCRIBE failed for channel ${channel}:`, error);
      throw error;
    }
  }

  // Battle-specific methods
  async setBattleState(battle_id: string, state: any, ttl_seconds: number = 3600): Promise<void> {
    await this.set(`battle:${battle_id}`, JSON.stringify(state), ttl_seconds);
  }

  async getBattleState(battle_id: string): Promise<any | null> {
    const data = await this.get(`battle:${battle_id}`);
    return data ? JSON.parse(data) : null;
  }

  async addPlayerToQueue(queue_name: string, player_id: string, player_data: any): Promise<void> {
    await this.hset(`queue:${queue_name}`, player_id, JSON.stringify(player_data));
    await this.sadd(`queue:${queue_name}:players`, player_id);
  }

  async removePlayerFromQueue(queue_name: string, player_id: string): Promise<void> {
    await this.hdel(`queue:${queue_name}`, player_id);
    await this.srem(`queue:${queue_name}:players`, player_id);
  }

  async getQueuePlayers(queue_name: string): Promise<Array<{ id: string; data: any }>> {
    const player_ids = await this.smembers(`queue:${queue_name}:players`);
    const players = [];
    
    for (const player_id of player_ids) {
      const player_dataString = await this.hget(`queue:${queue_name}`, player_id);
      if (player_dataString) {
        players.push({
          id: player_id,
          data: JSON.parse(player_dataString)
        });
      }
    }
    
    return players;
  }

  async getQueueSize(queue_name: string): Promise<number> {
    const player_ids = await this.smembers(`queue:${queue_name}:players`);
    return player_ids.length;
  }

  // Cleanup method
  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      this.is_connected = false;
      console.log('✅ Redis disconnected');
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }

  // Health check
  isHealthy(): boolean {
    return this.is_connected && this.redis !== null;
  }
}

// Export singleton instance
export const redis_service = new RedisService();