/**
 * Simple in-memory TTL cache for heavy API queries.
 *
 * Each entry stores the value and an expiry timestamp.
 * Expired entries are lazily evicted on access.
 */

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function cacheInvalidate(key: string): void {
  store.delete(key);
}

export function cacheInvalidatePattern(pattern: string): void {
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
  );
  for (const key of store.keys()) {
    if (regex.test(key)) {
      store.delete(key);
    }
  }
}
