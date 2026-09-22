import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMarketDataCache, setCache } from '@/lib/market-data/cache';
import { clearProviderHealth, withProviderFallback } from '@/lib/market-data/fallback';
import type { AShareProvider } from '@/lib/market-data/types';

function provider(name: AShareProvider['name'], search: AShareProvider['search']): AShareProvider {
    return { name, search };
}

describe('market data provider fallback', () => {
    afterEach(() => {
        clearMarketDataCache();
        clearProviderHealth();
        vi.restoreAllMocks();
    });

    it('falls back to the next provider when the primary fails', async () => {
        const primary = provider('eastmoney', vi.fn().mockRejectedValue(new Error('network failed')));
        const backup = provider('tencent', vi.fn().mockResolvedValue([{ symbol: '600519.SH' }]));

        const result = await withProviderFallback({
            namespace: 'test:fallback',
            cacheKey: '600519.SH',
            operation: 'search',
            symbolOrQuery: '600519',
            providers: [primary, backup],
            run: async (selected) => {
                if (!selected.search) throw new Error('missing search');
                return selected.search('600519', {});
            },
            validate: (data) => data.length > 0,
            freshTtlMs: 1000,
            staleTtlMs: 1000,
        });

        expect(result.provider).toBe('tencent');
        expect(result.attemptedProviders).toEqual(['eastmoney', 'tencent']);
        expect(result.data[0].symbol).toBe('600519.SH');
    });

    it('returns explicitly marked stale data when all providers fail', async () => {
        setCache('test:stale', '600519.SH', [{ symbol: '600519.SH' }], 'eastmoney', -1, 60_000);
        const primary = provider('eastmoney', vi.fn().mockRejectedValue(new Error('failed')));
        const backup = provider('tencent', vi.fn().mockRejectedValue(new Error('failed')));

        const result = await withProviderFallback({
            namespace: 'test:stale',
            cacheKey: '600519.SH',
            operation: 'search',
            symbolOrQuery: '600519',
            providers: [primary, backup],
            run: async (selected) => {
                if (!selected.search) throw new Error('missing search');
                return selected.search('600519', {});
            },
            validate: (data) => data.length > 0,
            freshTtlMs: 1000,
            staleTtlMs: 1000,
        });

        expect(result.stale).toBe(true);
        expect(result.fromCache).toBe(true);
        expect(result.provider).toBe('eastmoney');
    });

    it('opens a circuit after repeated failures and skips the unhealthy provider', async () => {
        const primarySearch = vi.fn().mockRejectedValue(new Error('down'));
        const primary = provider('eastmoney', primarySearch);
        const backup = provider('tencent', vi.fn().mockResolvedValue([{ symbol: '600519.SH' }]));

        for (let index = 0; index < 3; index += 1) {
            await withProviderFallback({
                namespace: 'test:circuit',
                cacheKey: `request-${index}`,
                operation: 'search',
                symbolOrQuery: `request-${index}`,
                providers: [primary, backup],
                run: async (selected) => {
                    if (!selected.search) throw new Error('missing search');
                    return selected.search('600519', {});
                },
                validate: (data) => data.length > 0,
                freshTtlMs: 1000,
                staleTtlMs: 1000,
            });
        }

        const result = await withProviderFallback({
            namespace: 'test:circuit',
            cacheKey: 'request-4',
            operation: 'search',
            symbolOrQuery: 'request-4',
            providers: [primary, backup],
            run: async (selected) => {
                if (!selected.search) throw new Error('missing search');
                return selected.search('600519', {});
            },
            validate: (data) => data.length > 0,
            freshTtlMs: 1000,
            staleTtlMs: 1000,
        });

        expect(primarySearch).toHaveBeenCalledTimes(3);
        expect(result.attemptedProviders).toEqual(['tencent']);
    });
});
