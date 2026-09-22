import { astockProvider } from './providers/astock';
import { eastmoneyFlashProvider, eastmoneyNewsProvider } from './providers/eastmoney-news';
import { tencentNewsProvider } from './providers/tencent-news';
import { eastmoneyProvider } from './providers/eastmoney';
import { sinaProvider } from './providers/sina';
import { tencentProvider } from './providers/tencent';
import { withProviderFallback } from './fallback';
import { normalizeAShareSymbol } from './symbols';
import { POPULAR_A_SHARE_SYMBOLS } from '@/lib/constants';
import type {
    AShareBoard,
    AShareKlineBar,
    AShareMarketRow,
    BoardKind,
    AShareProvider,
    AShareProfile,
    AShareQuote,
    AShareSearchResult,
    ProviderContext,
    ProviderResult,
} from './types';

const unofficialProvidersEnabled = process.env.ENABLE_UNOFFICIAL_MARKET_DATA !== 'false';
if (!unofficialProvidersEnabled && process.env.NODE_ENV === 'production') {
    console.warn('[market-data] unofficial A-share providers are disabled');
}

const SEARCH_PROVIDERS: AShareProvider[] = unofficialProvidersEnabled
    ? [tencentProvider, sinaProvider, eastmoneyProvider]
    : [];
const QUOTE_PROVIDERS: AShareProvider[] = unofficialProvidersEnabled
    ? [eastmoneyProvider, tencentProvider, sinaProvider]
    : [];
const PROFILE_PROVIDERS: AShareProvider[] = unofficialProvidersEnabled
    ? [eastmoneyProvider, tencentProvider, sinaProvider]
    : [];
const KLINE_PROVIDERS: AShareProvider[] = unofficialProvidersEnabled
    ? [eastmoneyProvider, tencentProvider]
    : [];

if (process.env.ASTOCK_BIN && unofficialProvidersEnabled) {
    SEARCH_PROVIDERS.push(astockProvider);
    QUOTE_PROVIDERS.push(astockProvider);
    PROFILE_PROVIDERS.push(astockProvider);
    KLINE_PROVIDERS.push(astockProvider);
}

function dedupeSearchResults(results: AShareSearchResult[], query: string): AShareSearchResult[] {
    const normalizedQuery = normalizeAShareSymbol(query)?.symbol;
    const seen = new Set<string>();
    const deduped = results.filter((item) => {
        if (seen.has(item.symbol)) return false;
        seen.add(item.symbol);
        return true;
    });

    return deduped.sort((a, b) => {
        if (normalizedQuery) {
            if (a.symbol === normalizedQuery) return -1;
            if (b.symbol === normalizedQuery) return 1;
        }
        return a.symbol.localeCompare(b.symbol);
    });
}

export async function searchAShares(
    query: string,
    context: ProviderContext = {},
): Promise<ProviderResult<AShareSearchResult[]>> {
    const trimmed = query.trim();
    return withProviderFallback<AShareSearchResult[]>({
        namespace: 'a-share:search',
        cacheKey: trimmed.toLowerCase(),
        operation: 'search',
        symbolOrQuery: trimmed,
        providers: SEARCH_PROVIDERS,
        run: async (provider) => {
            if (!provider.search) throw new Error(`${provider.name} does not support search`);
            return provider.search(trimmed, context);
        },
        validate: (results) => Array.isArray(results) && results.length > 0,
        freshTtlMs: 10 * 60_000,
        staleTtlMs: 6 * 60 * 60_000,
    }).then((result) => ({
        ...result,
        data: dedupeSearchResults(result.data, trimmed),
    })).catch(() => {
        const exact = normalizeAShareSymbol(trimmed);
        if (!exact) throw new Error(`A-share search unavailable: ${trimmed}`);
        return {
            data: [{
                symbol: exact.symbol,
                name: exact.ticker,
                exchange: exact.exchange,
                type: 'A股',
                currency: 'CNY' as const,
                provider: SEARCH_PROVIDERS[0]?.name ?? 'eastmoney',
            }],
            provider: SEARCH_PROVIDERS[0]?.name ?? 'eastmoney',
            stale: true,
            fromCache: false,
            attemptedProviders: SEARCH_PROVIDERS.map((provider) => provider.name),
        };
    });
}

export async function getAShareQuote(
    input: string,
    context: ProviderContext = {},
): Promise<ProviderResult<AShareQuote>> {
    const symbol = normalizeAShareSymbol(input);
    if (!symbol) throw new Error(`Invalid A-share symbol: ${input}`);

    const result = await withProviderFallback<AShareQuote>({
        namespace: 'a-share:quote',
        cacheKey: symbol.symbol,
        operation: 'quote',
        symbolOrQuery: symbol.symbol,
        providers: QUOTE_PROVIDERS,
        run: async (provider) => {
            if (!provider.quote) throw new Error(`${provider.name} does not support quote`);
            return provider.quote(symbol, context);
        },
        validate: (quote) => Number.isFinite(quote.price) && quote.price > 0,
        freshTtlMs: 3_000,
        staleTtlMs: 10 * 60_000,
    });

    return {
        ...result,
        data: { ...result.data, stale: result.stale },
    };
}

export async function getAShareProfile(
    input: string,
    context: ProviderContext = {},
): Promise<ProviderResult<AShareProfile>> {
    const symbol = normalizeAShareSymbol(input);
    if (!symbol) throw new Error(`Invalid A-share symbol: ${input}`);

    return withProviderFallback<AShareProfile>({
        namespace: 'a-share:profile',
        cacheKey: symbol.symbol,
        operation: 'profile',
        symbolOrQuery: symbol.symbol,
        providers: PROFILE_PROVIDERS,
        run: async (provider) => {
            if (!provider.profile) throw new Error(`${provider.name} does not support profile`);
            return provider.profile(symbol, context);
        },
        validate: (profile) => Boolean(profile.name),
        freshTtlMs: 24 * 60 * 60_000,
        staleTtlMs: 7 * 24 * 60 * 60_000,
    });
}

export async function getAShareKline(
    input: string,
    options: { limit?: number; start?: string; end?: string } = {},
    context: ProviderContext = {},
): Promise<ProviderResult<AShareKlineBar[]>> {
    const symbol = normalizeAShareSymbol(input);
    if (!symbol) throw new Error(`Invalid A-share symbol: ${input}`);
    const cacheKey = `${symbol.symbol}:${options.limit ?? 120}:${options.start ?? ''}:${options.end ?? ''}`;

    return withProviderFallback<AShareKlineBar[]>({
        namespace: 'a-share:kline',
        cacheKey,
        operation: 'kline',
        symbolOrQuery: symbol.symbol,
        providers: KLINE_PROVIDERS,
        run: async (provider) => {
            if (!provider.kline) throw new Error(`${provider.name} does not support kline`);
            return provider.kline(symbol, options, context);
        },
        validate: (bars) => Array.isArray(bars) && bars.length > 0,
        freshTtlMs: 5 * 60_000,
        staleTtlMs: 24 * 60 * 60_000,
    });
}

export function getConfiguredAShareProviders() {
    return {
        search: SEARCH_PROVIDERS.map((provider) => provider.name),
        quote: QUOTE_PROVIDERS.map((provider) => provider.name),
        profile: PROFILE_PROVIDERS.map((provider) => provider.name),
        kline: KLINE_PROVIDERS.map((provider) => provider.name),
    };
}

const BOARD_PROVIDERS: AShareProvider[] = unofficialProvidersEnabled ? [eastmoneyProvider] : [];
const SNAPSHOT_PROVIDERS: AShareProvider[] = unofficialProvidersEnabled ? [eastmoneyProvider] : [];

export async function getAShareBoards(
    kind: BoardKind,
    context: ProviderContext = {},
): Promise<ProviderResult<AShareBoard[]>> {
    return withProviderFallback<AShareBoard[]>({
        namespace: `a-share:boards:${kind}`,
        cacheKey: kind,
        operation: `boards:${kind}`,
        symbolOrQuery: kind,
        providers: BOARD_PROVIDERS,
        run: async (provider) => {
            if (!provider.boards) throw new Error(`${provider.name} does not support boards`);
            return provider.boards(kind, context);
        },
        validate: (boards) => Array.isArray(boards) && boards.length > 0,
        freshTtlMs: 60_000,
        staleTtlMs: 30 * 60_000,
    });
}

export async function getAShareMarketMovers(
    limit = 40,
    context: ProviderContext = {},
): Promise<ProviderResult<AShareMarketRow[]>> {
    try {
        return await withProviderFallback<AShareMarketRow[]>({
            namespace: 'a-share:movers',
            cacheKey: String(limit),
            operation: 'marketSnapshot',
            symbolOrQuery: 'all',
            providers: SNAPSHOT_PROVIDERS,
            run: async (provider) => {
                if (!provider.marketSnapshot) throw new Error(`${provider.name} does not support marketSnapshot`);
                return provider.marketSnapshot(context, limit);
            },
            validate: (rows) => Array.isArray(rows) && rows.length > 0,
            freshTtlMs: 30_000,
            staleTtlMs: 30 * 60_000,
        });
    } catch (error) {
        // Degraded fallback: quote a curated blue-chip list one by one.
        const quotes = await Promise.allSettled(
            POPULAR_A_SHARE_SYMBOLS.map((symbol) => getAShareQuote(symbol, context)),
        );
        const rows: AShareMarketRow[] = quotes.flatMap((result) => {
            if (result.status !== 'fulfilled') return [];
            const quote = result.value.data;
            return [{
                symbol: quote.symbol,
                name: quote.name,
                price: quote.price,
                changePercent: quote.changePercent,
                change: quote.change,
                provider: quote.provider,
            } satisfies AShareMarketRow];
        });

        if (rows.length === 0) throw error;
        console.warn('[market-data] market snapshot fell back to curated quotes', {
            count: rows.length,
        });
        return {
            data: rows,
            provider: rows[0].provider,
            stale: false,
            fromCache: false,
            attemptedProviders: SNAPSHOT_PROVIDERS.map((provider) => provider.name),
        };
    }
}

const NEWS_PROVIDERS: AShareProvider[] = unofficialProvidersEnabled
    ? [eastmoneyNewsProvider, tencentNewsProvider, eastmoneyFlashProvider]
    : [];

export async function getAShareNews(
    limit = 12,
    context: ProviderContext = {},
): Promise<ProviderResult<MarketNewsArticle[]>> {
    return withProviderFallback<MarketNewsArticle[]>({
        namespace: 'a-share:news',
        cacheKey: String(limit),
        operation: 'news',
        symbolOrQuery: 'A股',
        providers: NEWS_PROVIDERS,
        run: async (provider) => {
            if (!provider.news) throw new Error(`${provider.name} does not support news`);
            return provider.news(context, limit);
        },
        validate: (articles) => Array.isArray(articles) && articles.length > 0,
        freshTtlMs: 5 * 60_000,
        staleTtlMs: 6 * 60 * 60_000,
    });
}
