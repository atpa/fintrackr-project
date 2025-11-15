/**
 * API Response Caching Middleware
 * Implements in-memory caching with TTL and cache invalidation
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate cache key from request
   */
  generateKey(req) {
    const userId = req.user?.id || 'anonymous';
    const path = req.path;
    const query = JSON.stringify(req.query);
    return `${userId}:${path}:${query}`;
  }

  /**
   * Get cached response
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cache entry
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate user's cache
   */
  invalidateUser(userId) {
    this.invalidate(`^${userId}:`);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats() {
    let totalSize = 0;
    let expired = 0;
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      totalSize += JSON.stringify(value.data).length;
      if (now > value.expiresAt) {
        expired++;
      }
    }
    
    return {
      entries: this.cache.size,
      expired,
      totalSizeBytes: totalSize,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const cacheManager = new CacheManager();

// Cleanup every 5 minutes
setInterval(() => cacheManager.cleanup(), 5 * 60 * 1000);

/**
 * Cache middleware for GET requests
 */
function cacheMiddleware(options = {}) {
  const ttl = options.ttl || cacheManager.defaultTTL;
  
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = cacheManager.generateKey(req);
    const cached = cacheManager.get(key);
    
    if (cached) {
      // Add cache hit header
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cacheManager.set(key, data, ttl);
      }
      
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Cache invalidation middleware for write operations
 */
function invalidateCache(pattern) {
  return (req, res, next) => {
    // Store original send to invalidate after response
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    
    const invalidateAfterResponse = (data) => {
      // Only invalidate on successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (pattern) {
          cacheManager.invalidate(pattern);
        } else if (req.user) {
          cacheManager.invalidateUser(req.user.id);
        }
      }
      return data;
    };
    
    res.send = function (data) {
      invalidateAfterResponse(data);
      return originalSend(data);
    };
    
    res.json = function (data) {
      invalidateAfterResponse(data);
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Endpoint to get cache stats (admin only)
 */
function getCacheStats(req, res) {
  const stats = cacheManager.stats();
  res.json(stats);
}

/**
 * Endpoint to clear cache (admin only)
 */
function clearCache(req, res) {
  cacheManager.clear();
  res.json({ message: 'Cache cleared successfully' });
}

module.exports = {
  cacheManager,
  cacheMiddleware,
  invalidateCache,
  getCacheStats,
  clearCache,
};
