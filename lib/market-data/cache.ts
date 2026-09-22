interface CacheEntry<T> {
    value: T;
    provider: string;
    cachedAt: number;
    freshUntil: number;
    staleUntil: number;
}

const caches = new Map<string, Map<string, CacheEntry<unknown>>>();

function getStore(namespace: string) {
    let store = caches.get(namespace);
    if (!store) {
        store = new Map();
        caches.set(namespace, store);
    }
    return store;
}

export function getFreshCache<T>(namespace: string, key: string): CacheEntry<T> | null {
    const entry = getStore(namespace).get(key) as CacheEntry<T> | undefined;
    if (!entry || entry.freshUntil <= Date.now()) return null;
    return entry;
}

export function getStaleCache<T>(namespace: string, key: string): CacheEntry<T> | null {
    const entry = getStore(namespace).get(key) as CacheEntry<T> | undefined;
    if (!entry || entry.staleUntil <= Date.now()) return null;
    return entry;
}

export function setCache<T>(
    namespace: string,
    key: string,
    value: T,
    provider: string,
    freshTtlMs: number,
    staleTtlMs: number,
) {
    const now = Date.now();
    getStore(namespace).set(key, {
        value,
        provider,
        cachedAt: now,
        freshUntil: now + freshTtlMs,
        staleUntil: now + freshTtlMs + staleTtlMs,
    });
}

export function clearMarketDataCache(namespace?: string) {
    if (namespace) caches.delete(namespace);
    else caches.clear();
}
