import { getFreshCache, getStaleCache, setCache } from './cache';
import type {
    AShareProvider,
    AShareProviderName,
    ProviderContext,
    ProviderResult,
} from './types';
import { MarketDataUnavailableError } from './types';

interface ProviderHealth {
    failures: number;
    openUntil: number;
}

const providerHealth = new Map<string, ProviderHealth>();
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;

function healthKey(namespace: string, provider: AShareProviderName) {
    return `${namespace}:${provider}`;
}

function isCircuitOpen(namespace: string, provider: AShareProviderName) {
    const health = providerHealth.get(healthKey(namespace, provider));
    return Boolean(health && health.openUntil > Date.now());
}

function recordProviderSuccess(namespace: string, provider: AShareProviderName) {
    providerHealth.delete(healthKey(namespace, provider));
}

function recordProviderFailure(namespace: string, provider: AShareProviderName) {
    const key = healthKey(namespace, provider);
    const current = providerHealth.get(key) ?? { failures: 0, openUntil: 0 };
    const failures = current.failures + 1;
    providerHealth.set(key, {
        failures,
        openUntil: failures >= FAILURE_THRESHOLD ? Date.now() + COOLDOWN_MS : 0,
    });
}

export function clearProviderHealth(namespace?: string) {
    if (!namespace) {
        providerHealth.clear();
        return;
    }
    for (const key of providerHealth.keys()) {
        if (key.startsWith(`${namespace}:`)) providerHealth.delete(key);
    }
}

interface FallbackOptions<T> {
    namespace: string;
    cacheKey: string;
    operation: string;
    symbolOrQuery: string;
    providers: AShareProvider[];
    run: (provider: AShareProvider) => Promise<T>;
    validate: (value: T) => boolean;
    freshTtlMs: number;
    staleTtlMs: number;
    context?: ProviderContext;
}

export async function withProviderFallback<T>({
    namespace,
    cacheKey,
    operation,
    symbolOrQuery,
    providers,
    run,
    validate,
    freshTtlMs,
    staleTtlMs,
}: FallbackOptions<T>): Promise<ProviderResult<T>> {
    const fresh = getFreshCache<T>(namespace, cacheKey);
    if (fresh) {
        return {
            data: fresh.value,
            provider: fresh.provider as AShareProviderName,
            stale: false,
            fromCache: true,
            attemptedProviders: [],
        };
    }

    const attemptedProviders: AShareProviderName[] = [];

    for (const provider of providers) {
        if (isCircuitOpen(namespace, provider.name)) {
            console.warn('[market-data] provider circuit open', {
                operation,
                symbolOrQuery,
                provider: provider.name,
            });
            continue;
        }

        attemptedProviders.push(provider.name);
        const startedAt = Date.now();

        try {
            const data = await run(provider);
            if (!validate(data)) {
                throw new Error('Provider returned invalid or empty data');
            }

            setCache(namespace, cacheKey, data, provider.name, freshTtlMs, staleTtlMs);
            recordProviderSuccess(namespace, provider.name);
            console.info('[market-data] provider succeeded', {
                operation,
                symbolOrQuery,
                provider: provider.name,
                durationMs: Date.now() - startedAt,
            });

            return {
                data,
                provider: provider.name,
                stale: false,
                fromCache: false,
                attemptedProviders,
            };
        } catch (error) {
            recordProviderFailure(namespace, provider.name);
            console.warn('[market-data] provider failed', {
                operation,
                symbolOrQuery,
                provider: provider.name,
                durationMs: Date.now() - startedAt,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    const stale = getStaleCache<T>(namespace, cacheKey);
    if (stale) {
        console.warn('[market-data] serving stale cache after provider failures', {
            operation,
            symbolOrQuery,
            provider: stale.provider,
            attemptedProviders,
        });
        return {
            data: stale.value,
            provider: stale.provider as AShareProviderName,
            stale: true,
            fromCache: true,
            attemptedProviders,
        };
    }

    throw new MarketDataUnavailableError(operation, symbolOrQuery, attemptedProviders);
}
