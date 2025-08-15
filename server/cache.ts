import NodeCache from 'node-cache';
import { log } from './logger';

// In-memory cache for development/small scale
class CacheManager {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every minute
      useClones: false // For better performance
    });
    
    log('Cache manager initialized', 'cache');
  }

  // Get cached value
  get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        log(`Cache HIT: ${key}`, 'cache');
      } else {
        log(`Cache MISS: ${key}`, 'cache');
      }
      return value;
    } catch (error) {
      log(`Cache GET error for key ${key}: ${error}`, 'cache');
      return undefined;
    }
  }

  // Set cached value
  set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const success = this.cache.set(key, value, ttl || 300);
      if (success) {
        log(`Cache SET: ${key} (TTL: ${ttl || 300}s)`, 'cache');
      }
      return success;
    } catch (error) {
      log(`Cache SET error for key ${key}: ${error}`, 'cache');
      return false;
    }
  }

  // Delete cached value
  del(key: string): number {
    try {
      const deleted = this.cache.del(key);
      if (deleted > 0) {
        log(`Cache DEL: ${key}`, 'cache');
      }
      return deleted;
    } catch (error) {
      log(`Cache DEL error for key ${key}: ${error}`, 'cache');
      return 0;
    }
  }

  // Clear cache with pattern
  delPattern(pattern: string): void {
    try {
      const keys = this.cache.keys();
      const matchingKeys = keys.filter(key => key.includes(pattern));
      this.cache.del(matchingKeys);
      log(`Cache pattern DEL: ${pattern} (${matchingKeys.length} keys)`, 'cache');
    } catch (error) {
      log(`Cache pattern DEL error for pattern ${pattern}: ${error}`, 'cache');
    }
  }

  // Get cache statistics
  getStats() {
    return {
      keys: this.cache.getStats().keys,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      hitRatio: this.cache.getStats().hits / (this.cache.getStats().hits + this.cache.getStats().misses)
    };
  }

  // Flush all cache
  flushAll(): void {
    this.cache.flushAll();
    log('Cache flushed all keys', 'cache');
  }
}

// Cache key generators
export const CacheKeys = {
  // User-related
  user: (id: number) => `user:${id}`,
  userPeople: (userId: number) => `user:${userId}:people`,
  userSessions: (userId: number) => `user:${userId}:sessions`,
  
  // People-related
  person: (id: number) => `person:${id}`,
  personFaceImages: (personId: number) => `person:${personId}:faces`,
  personVoiceRecordings: (personId: number) => `person:${personId}:voices`,
  
  // Content-related
  videoTemplates: () => 'templates:all',
  videoTemplatesFeatured: () => 'templates:featured',
  videoTemplatesCategory: (category: string) => `templates:category:${category}`,
  animatedStories: () => 'stories:all',
  animatedStoriesCategory: (category: string) => `stories:category:${category}`,
  
  // Processing-related
  voiceCloneStatus: (voiceId: number) => `voice:${voiceId}:status`,
  processingStatus: (videoId: number) => `processing:${videoId}:status`,
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 900,        // 15 minutes
  HOUR: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
};

// Export singleton instance
export const cache = new CacheManager();