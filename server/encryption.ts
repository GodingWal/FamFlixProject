import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import Redis from 'ioredis';
import { log } from './vite';

// Enhanced encryption with proper key management
// Use a fixed key for development to ensure consistency across restarts
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || Buffer.from('a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd', 'hex');
const ALGORITHM = 'aes-256-gcm';

// Redis client with connection handling
let redis: Redis | null = null;

export const initializeRedis = () => {
  try {
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
      
      redis.on('connect', () => log('Redis connected successfully', 'cache'));
      redis.on('error', (err) => log(`Redis error: ${err.message}`, 'error'));
      
      return redis;
    } else {
      log('Redis URL not provided, skipping Redis initialization', 'cache');
      return null;
    }
  } catch (error) {
    log(`Redis initialization failed: ${(error as Error).message}`, 'error');
    return null;
  }
};

// Enhanced encryption with authentication
export const encrypt = (text: string): { encrypted: string; iv: string; authTag: string } => {
  try {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    log(`Encryption error: ${(error as Error).message}`, 'error');
    throw new Error('Encryption failed');
  }
};

// Enhanced decryption with authentication verification
export const decrypt = (encryptedData: { encrypted: string; iv: string; authTag: string }): string => {
  try {
    const { encrypted, iv, authTag } = encryptedData;
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    log(`Decryption error: ${(error as Error).message}`, 'error');
    throw new Error('Decryption failed - data may be corrupted');
  }
};

// Generic cache operations with Redis fallback handling
export const cacheSet = async (key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> => {
  if (!redis) return false;
  
  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
    log(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`, 'cache');
    return true;
  } catch (error) {
    log(`Cache SET error for ${key}: ${(error as Error).message}`, 'error');
    return false;
  }
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redis) return null;
  
  try {
    const cached = await redis.get(key);
    if (cached) {
      log(`Cache HIT: ${key}`, 'cache');
      return JSON.parse(cached) as T;
    }
    
    log(`Cache MISS: ${key}`, 'cache');
    return null;
  } catch (error) {
    log(`Cache GET error for ${key}: ${(error as Error).message}`, 'error');
    return null;
  }
};

export const cacheDelete = async (key: string): Promise<boolean> => {
  if (!redis) return false;
  
  try {
    const result = await redis.del(key);
    log(`Cache DELETE: ${key}`, 'cache');
    return result > 0;
  } catch (error) {
    log(`Cache DELETE error for ${key}: ${(error as Error).message}`, 'error');
    return false;
  }
};

// Pattern-based cache deletion
export const cacheDeletePattern = async (pattern: string): Promise<number> => {
  if (!redis) return 0;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    
    const result = await redis.del(...keys);
    log(`Cache DELETE pattern ${pattern}: ${result} keys deleted`, 'cache');
    return result;
  } catch (error) {
    log(`Cache DELETE pattern error for ${pattern}: ${(error as Error).message}`, 'error');
    return 0;
  }
};

// Secure data storage with encryption and caching
export const storeSecureData = async (
  key: string, 
  data: any, 
  cacheKey?: string, 
  ttl: number = 3600
): Promise<{ encrypted: string; iv: string; authTag: string }> => {
  try {
    const serialized = JSON.stringify(data);
    const encryptedData = encrypt(serialized);
    
    // Cache the original data if Redis is available and cache key provided
    if (cacheKey && redis) {
      await cacheSet(cacheKey, data, ttl);
    }
    
    return encryptedData;
  } catch (error) {
    log(`Secure storage error for ${key}: ${(error as Error).message}`, 'error');
    throw error;
  }
};

// Retrieve and decrypt secure data with cache fallback
export const retrieveSecureData = async <T>(
  encryptedData: { encrypted: string; iv: string; authTag: string } | null,
  cacheKey?: string,
  fallbackData?: T
): Promise<T | null> => {
  try {
    // Try cache first if available
    if (cacheKey) {
      const cached = await cacheGet<T>(cacheKey);
      if (cached) return cached;
    }
    
    // Decrypt data if available
    if (encryptedData) {
      const decrypted = decrypt(encryptedData);
      const data = JSON.parse(decrypted) as T;
      
      // Update cache with decrypted data
      if (cacheKey) {
        await cacheSet(cacheKey, data);
      }
      
      return data;
    }
    
    return fallbackData || null;
  } catch (error) {
    log(`Secure retrieval error: ${(error as Error).message}`, 'error');
    return fallbackData || null;
  }
};

// Health check for Redis connection
export const checkCacheHealth = async (): Promise<{ redis: boolean; latency?: number }> => {
  if (!redis) return { redis: false };
  
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    return { redis: true, latency };
  } catch (error) {
    return { redis: false };
  }
};

// Initialize Redis on module load
initializeRedis();