import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export interface LeaderboardRankEntry {
  member: string;
  score: number;
}

export class RedisService {
  private client: Redis | null = null;
  private isConnected = false;
  private memoryStore: Map<string, { value: string; expiresAt?: number }> = new Map();
  private memorySortedSets: Map<string, Map<string, number>> = new Map();

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    if (env.NODE_ENV === 'test' && !process.env.USE_REAL_REDIS) {
      // In test mode, default to in-memory fallback unless explicitly requested
      this.isConnected = true;
      return;
    }

    try {
      this.client = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy: () => null, // don't infinite retry if not running
        lazyConnect: true,
      });

      this.client
        .connect()
        .then(() => {
          this.isConnected = true;
        })
        .catch(() => {
          this.isConnected = false;
          // Keep in-memory fallback active
        });

      this.client.on('error', () => {
        this.isConnected = false;
      });
      this.client.on('connect', () => {
        this.isConnected = true;
      });
    } catch {
      this.isConnected = false;
    }
  }

  public isReady(): boolean {
    return this.isConnected || this.client === null;
  }

  public getRawClient(): Redis | null {
    return this.client;
  }

  // --- String Keys & Nonce / Session Ops ---

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // Fall back to memoryStore
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
  }

  public async get(key: string): Promise<string | null> {
    if (this.client && this.isConnected) {
      try {
        return await this.client.get(key);
      } catch {
        // Fall back to memoryStore
      }
    }

    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Atomically get and delete a key (e.g. for single-use SIWE nonces)
   */
  public async getdel(key: string): Promise<string | null> {
    if (this.client && this.isConnected) {
      try {
        if (typeof (this.client as any).getdel === 'function') {
          return await (this.client as any).getdel(key);
        } else {
          const val = await this.client.get(key);
          if (val !== null) {
            await this.client.del(key);
          }
          return val;
        }
      } catch {
        // Fall back to memoryStore
      }
    }

    const val = await this.get(key);
    if (val !== null) {
      this.memoryStore.delete(key);
    }
    return val;
  }

  public async del(key: string): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.del(key);
        return;
      } catch {
        // Fall back to memoryStore
      }
    }
    this.memoryStore.delete(key);
  }

  // --- Sorted Sets (Leaderboards) ---

  public async zadd(key: string, score: number, member: string): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.zadd(key, score, member);
        return;
      } catch {
        // Fall back to memoryStore
      }
    }

    let set = this.memorySortedSets.get(key);
    if (!set) {
      set = new Map();
      this.memorySortedSets.set(key, set);
    }
    set.set(member, score);
  }

  public async zscore(key: string, member: string): Promise<number | null> {
    if (this.client && this.isConnected) {
      try {
        const score = await this.client.zscore(key, member);
        return score !== null ? parseFloat(score) : null;
      } catch {
        // Fall back to memoryStore
      }
    }

    const set = this.memorySortedSets.get(key);
    if (!set || !set.has(member)) return null;
    return set.get(member) ?? null;
  }

  public async zrevrangeWithScores(
    key: string,
    start: number,
    stop: number,
  ): Promise<LeaderboardRankEntry[]> {
    if (this.client && this.isConnected) {
      try {
        const results = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
        const list: LeaderboardRankEntry[] = [];
        for (let i = 0; i < results.length; i += 2) {
          list.push({ member: results[i], score: parseFloat(results[i + 1]) });
        }
        return list;
      } catch {
        // Fall back to memoryStore
      }
    }

    const set = this.memorySortedSets.get(key);
    if (!set) return [];

    const sorted = Array.from(set.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]); // deterministic tie-breaker
    });

    const slice = sorted.slice(start, stop === -1 ? undefined : stop + 1);
    return slice.map(([member, score]) => ({ member, score }));
  }

  public async zrangeWithScores(
    key: string,
    start: number,
    stop: number,
  ): Promise<LeaderboardRankEntry[]> {
    if (this.client && this.isConnected) {
      try {
        const results = await this.client.zrange(key, start, stop, 'WITHSCORES');
        const list: LeaderboardRankEntry[] = [];
        for (let i = 0; i < results.length; i += 2) {
          list.push({ member: results[i], score: parseFloat(results[i + 1]) });
        }
        return list;
      } catch {
        // Fall back to memoryStore
      }
    }

    const set = this.memorySortedSets.get(key);
    if (!set) return [];

    const sorted = Array.from(set.entries()).sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[0].localeCompare(b[0]); // deterministic tie-breaker
    });

    const slice = sorted.slice(start, stop === -1 ? undefined : stop + 1);
    return slice.map(([member, score]) => ({ member, score }));
  }

  public async zrevrank(key: string, member: string): Promise<number | null> {
    if (this.client && this.isConnected) {
      try {
        return await this.client.zrevrank(key, member);
      } catch {
        // Fall back to memoryStore
      }
    }

    const set = this.memorySortedSets.get(key);
    if (!set || !set.has(member)) return null;

    const sorted = Array.from(set.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    const rank = sorted.findIndex(([m]) => m === member);
    return rank >= 0 ? rank : null;
  }

  public async zrank(key: string, member: string): Promise<number | null> {
    if (this.client && this.isConnected) {
      try {
        return await this.client.zrank(key, member);
      } catch {
        // Fall back to memoryStore
      }
    }

    const set = this.memorySortedSets.get(key);
    if (!set || !set.has(member)) return null;

    const sorted = Array.from(set.entries()).sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[0].localeCompare(b[0]);
    });

    const rank = sorted.findIndex(([m]) => m === member);
    return rank >= 0 ? rank : null;
  }

  public async flush(): Promise<void> {
    this.memoryStore.clear();
    this.memorySortedSets.clear();
    if (this.client && this.isConnected) {
      try {
        await this.client.flushdb();
      } catch {
        // ignore
      }
    }
  }

  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore
      }
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const redisService = new RedisService();
