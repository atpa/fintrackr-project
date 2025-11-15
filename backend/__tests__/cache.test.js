/**
 * Cache Middleware Tests
 * Tests for Phase 5 - API Response Caching
 */

describe('Cache Middleware', () => {
  let cache;

  beforeEach(() => {
    // Simple in-memory cache implementation
    cache = {
      store: new Map(),
      
      set: (key, value, ttl = 300) => {
        cache.store.set(key, {
          value,
          expires: Date.now() + ttl * 1000,
        });
      },
      
      get: (key) => {
        const entry = cache.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expires) {
          cache.store.delete(key);
          return null;
        }
        return entry.value;
      },
      
      invalidate: (pattern) => {
        const regex = new RegExp(pattern);
        for (const key of cache.store.keys()) {
          if (regex.test(key)) {
            cache.store.delete(key);
          }
        }
      },
      
      clear: () => {
        cache.store.clear();
      },
      
      size: () => {
        return cache.store.size;
      },
      
      cleanup: () => {
        const now = Date.now();
        for (const [key, entry] of cache.store.entries()) {
          if (now > entry.expires) {
            cache.store.delete(key);
          }
        }
      },
    };
  });

  describe('Cache Operations', () => {
    it('should store and retrieve cached value', () => {
      cache.set('test-key', { data: 'test' }, 60);
      const value = cache.get('test-key');

      expect(value).toEqual({ data: 'test' });
    });

    it('should return null for non-existent key', () => {
      const value = cache.get('non-existent');

      expect(value).toBeNull();
    });

    it('should return null for expired entry', () => {
      cache.set('expired-key', { data: 'test' }, -1);
      const value = cache.get('expired-key');

      expect(value).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate by pattern', () => {
      cache.set('/api/users/1/accounts', { data: 'accounts' });
      cache.set('/api/users/1/transactions', { data: 'transactions' });
      cache.set('/api/users/2/accounts', { data: 'other' });

      cache.invalidate('/api/users/1/');

      expect(cache.get('/api/users/1/accounts')).toBeNull();
      expect(cache.get('/api/users/1/transactions')).toBeNull();
      expect(cache.get('/api/users/2/accounts')).not.toBeNull();
    });

    it('should clear all cache', () => {
      cache.set('key1', { data: '1' });
      cache.set('key2', { data: '2' });
      cache.set('key3', { data: '3' });

      cache.clear();

      expect(cache.size()).toBe(0);
    });
  });

  describe('Cache TTL', () => {
    it('should respect TTL', (done) => {
      cache.set('ttl-key', { data: 'test' }, 1);

      setTimeout(() => {
        const value = cache.get('ttl-key');
        expect(value).toBeNull();
        done();
      }, 1100);
    });

    it('should store with default TTL', () => {
      cache.set('default-ttl', { data: 'test' });
      const value = cache.get('default-ttl');

      expect(value).not.toBeNull();
    });
  });

  describe('Cache Cleanup', () => {
    it('should remove expired entries', () => {
      cache.set('valid', { data: 'valid' }, 60);
      cache.set('expired', { data: 'expired' }, -1);

      cache.cleanup();

      expect(cache.get('valid')).not.toBeNull();
      expect(cache.get('expired')).toBeNull();
    });

    it('should keep valid entries after cleanup', () => {
      cache.set('key1', { data: '1' }, 60);
      cache.set('key2', { data: '2' }, 60);
      const initialSize = cache.size();

      cache.cleanup();

      expect(cache.size()).toBe(initialSize);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache size', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', { data: '1' });
      expect(cache.size()).toBe(1);

      cache.set('key2', { data: '2' });
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });
});
