'use server';

import { getDateRange, validateArticle, formatArticle } from '@/lib/utils';
import { POPULAR_A_SHARE_SYMBOLS, POPULAR_STOCK_SYMBOLS } from '@/lib/constants';
import { cache } from 'react';
import { getAShareProfile, getAShareQuote, searchAShares } from '@/lib/market-data/a-share';
import { isAShareSymbol } from '@/lib/market-data/symbols';
import { fetchWithTimeout } from '@/lib/market-data/http';

const FINNHUB_BASE_URL = process.env.FINNHUB_BASE_URL ?? 'https://finnhub.io/api/v1';
const NEXT_PUBLIC_FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

type FinnhubQuote = {
    c?: number;
    d?: number;
    dp?: number;
};

type FinnhubCompanyProfile = {
    currency?: string;
    exchange?: string;
    logo?: string;
    marketCapitalization?: number;
    name?: string;
    ticker?: string;
};

type SearchStockCandidate = FinnhubSearchResult & {
    __exchange?: string;
};

const FINNHUB_EXCHANGE_SUFFIXES = new Set([
    'AS', 'AT', 'AX', 'BA', 'BK', 'BO', 'BR', 'CO', 'DE', 'F', 'HE', 'HK',
    'IL', 'IS', 'JK', 'JO', 'KL', 'KQ', 'KS', 'L', 'LS', 'MC', 'MI', 'MX',
    'NS', 'NZ', 'OL', 'PA', 'PR', 'SA', 'SI', 'SS', 'ST', 'SW', 'SZ', 'T',
    'TA', 'TO', 'TW', 'TWO', 'V', 'VI', 'WA',
]);

async function fetchJSON<T>(url: string, revalidateSeconds?: number): Promise<T> {
    const options: RequestInit & { next?: { revalidate?: number } } = revalidateSeconds
        ? { cache: 'force-cache', next: { revalidate: revalidateSeconds } }
        : { cache: 'no-store' };

    const res = await fetchWithTimeout(url, options, { timeoutMs: 5000 });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fetch failed ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
}

export { fetchJSON };

function getExchangeLabel(symbol: string, exchange?: string) {
    if (exchange?.trim()) {
        return exchange.trim();
    }

    const parts = symbol.split('.');
    const suffix = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';

    if (!suffix) {
        return 'US';
    }

    return FINNHUB_EXCHANGE_SUFFIXES.has(suffix) ? suffix : 'US';
}

export async function getQuote(symbol: string) {
    try {
        if (isAShareSymbol(symbol)) {
            return (await getAShareQuote(symbol)).data;
        }
        const token = NEXT_PUBLIC_FINNHUB_API_KEY;
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
        return await fetchJSON<FinnhubQuote>(url, 0);
    } catch (e) {
        console.error('Error fetching quote for', symbol, e);
        return null;
    }
}

export async function getCompanyProfile(symbol: string) {
    try {
        if (isAShareSymbol(symbol)) {
            return (await getAShareProfile(symbol)).data;
        }
        const token = NEXT_PUBLIC_FINNHUB_API_KEY;
        const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
        return await fetchJSON<FinnhubCompanyProfile>(url, 86400);
    } catch (e) {
        console.error('Error fetching profile for', symbol, e);
        return null;
    }
}

export async function getWatchlistData(symbols: string[]) {
    if (!symbols || symbols.length === 0) return [];

    // Fetch quotes and profiles in parallel
    const promises = symbols.map(async (sym) => {
        const [quote, profile] = await Promise.all([
            getQuote(sym),
            getCompanyProfile(sym)
        ]);

        const price = quote && 'price' in quote ? quote.price : quote?.c;
        const change = quote && 'change' in quote ? quote.change : quote?.d;
        const changePercent = quote && 'changePercent' in quote ? quote.changePercent : quote?.dp;
        const marketCap = profile && 'marketCapitalization' in profile
            ? profile.marketCapitalization
            : profile && 'marketCap' in profile
                ? profile.marketCap
                : undefined;

        return {
            symbol: sym,
            price: price ?? null,
            change: change ?? null,
            changePercent: changePercent ?? null,
            currency: profile?.currency || (isAShareSymbol(sym) ? 'CNY' : 'USD'),
            name: profile?.name || sym,
            logo: profile && 'logo' in profile ? profile.logo : undefined,
            marketCap,
            peRatio: profile && 'peRatio' in profile ? profile.peRatio : 0,
            provider: quote && 'provider' in quote ? quote.provider : 'finnhub',
            stale: quote && 'stale' in quote ? Boolean(quote.stale) : false,
        };
    });

    return await Promise.all(promises);
}


export async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
    try {
        const range = getDateRange(5);
        const token = NEXT_PUBLIC_FINNHUB_API_KEY;
        if (!token) {
            throw new Error('FINNHUB API key is not configured');
        }
        const cleanSymbols = (symbols || [])
            .map((s) => s?.trim().toUpperCase())
            .filter((s): s is string => Boolean(s) && !isAShareSymbol(s));

        const maxArticles = 6;

        // If we have symbols, try to fetch company news per symbol and round-robin select
        if (cleanSymbols.length > 0) {
            const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

            await Promise.all(
                cleanSymbols.map(async (sym) => {
                    try {
                        const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(sym)}&from=${range.from}&to=${range.to}&token=${token}`;
                        const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
                        perSymbolArticles[sym] = (articles || []).filter(validateArticle);
                    } catch (e) {
                        console.error('Error fetching company news for', sym, e);
                        perSymbolArticles[sym] = [];
                    }
                })
            );

            const collected: MarketNewsArticle[] = [];
            // Round-robin up to 6 picks
            for (let round = 0; round < maxArticles; round++) {
                for (let i = 0; i < cleanSymbols.length; i++) {
                    const sym = cleanSymbols[i];
                    const list = perSymbolArticles[sym] || [];
                    if (list.length === 0) continue;
                    const article = list.shift();
                    if (!article || !validateArticle(article)) continue;
                    collected.push(formatArticle(article, true, sym, round));
                    if (collected.length >= maxArticles) break;
                }
                if (collected.length >= maxArticles) break;
            }

            if (collected.length > 0) {
                // Sort by datetime desc
                collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
                return collected.slice(0, maxArticles);
            }
            // If none collected, fall through to general news
        }

        // General market news fallback or when no symbols provided
        const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
        const general = await fetchJSON<RawNewsArticle[]>(generalUrl, 300);

        const seen = new Set<string>();
        const unique: RawNewsArticle[] = [];
        for (const art of general || []) {
            if (!validateArticle(art)) continue;
            const key = `${art.id}-${art.url}-${art.headline}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(art);
            if (unique.length >= 20) break; // cap early before final slicing
        }

        const formatted = unique.slice(0, maxArticles).map((a, idx) => formatArticle(a, false, undefined, idx));
        return formatted;
    } catch (err) {
        console.error('getNews error:', err);
        throw new Error('Failed to fetch news');
    }
}

export const searchStocks = cache(async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    try {
        const token = NEXT_PUBLIC_FINNHUB_API_KEY;
        if (!token) {
            console.warn('[stock-search] Finnhub key not configured; continuing with A-share providers only');
        }

        const trimmed = typeof query === 'string' ? query.trim() : '';
        let aShareResults: StockWithWatchlistStatus[] = [];
        let results: SearchStockCandidate[] = [];

        if (!trimmed) {
            const aShareProfiles = await Promise.allSettled(
                POPULAR_A_SHARE_SYMBOLS.slice(0, 5).map((sym) => getCompanyProfile(sym))
            );
            aShareResults = aShareProfiles.flatMap((result) => {
                if (result.status !== 'fulfilled' || !result.value) return [];
                const profile = result.value;
                const profileSymbol = 'symbol' in profile ? profile.symbol : profile.ticker;
                if (!profileSymbol || !isAShareSymbol(profileSymbol)) return [];
                return [{
                    symbol: profileSymbol,
                    name: profile.name || profileSymbol,
                    exchange: profile.exchange || 'A股',
                    type: 'A股',
                    isInWatchlist: false,
                }];
            }).filter((item) => Boolean(item.symbol));

            // Fetch top 10 popular US/global symbols' profiles when Finnhub is configured.
            const top = token ? POPULAR_STOCK_SYMBOLS.slice(0, 10) : [];
            const profiles = await Promise.all(
                top.map(async (sym) => {
                    try {
                        if (!token) return { sym, profile: null } as { sym: string; profile: FinnhubCompanyProfile | null };
                        const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${token}`;
                        // Revalidate every hour
                        const profile = await fetchJSON<FinnhubCompanyProfile>(url, 3600);
                        return { sym, profile } as { sym: string; profile: FinnhubCompanyProfile | null };
                    } catch (e) {
                        console.error('Error fetching profile2 for', sym, e);
                        return { sym, profile: null } as { sym: string; profile: FinnhubCompanyProfile | null };
                    }
                })
            );

            results = profiles
                .map(({ sym, profile }) => {
                    const symbol = sym.toUpperCase();
                    const name: string | undefined = profile?.name || profile?.ticker || undefined;
                    const exchange: string | undefined = profile?.exchange || undefined;
                    if (!name) return undefined;
                    const r: SearchStockCandidate = {
                        symbol,
                        description: name,
                        displaySymbol: symbol,
                        type: 'Common Stock',
                    };
                    r.__exchange = exchange;
                    return r;
                })
                .filter((x): x is SearchStockCandidate => Boolean(x));
        } else {
            const emptyResponse: FinnhubSearchResponse = { count: 0, result: [] };
            const [finhubResult, aShareResult] = await Promise.allSettled([
                token
                    ? fetchJSON<FinnhubSearchResponse>(
                        `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(trimmed)}&token=${token}`,
                        1800,
                    )
                    : Promise.resolve(emptyResponse),
                searchAShares(trimmed),
            ]);

            const data = finhubResult.status === 'fulfilled' ? finhubResult.value : emptyResponse;
            results = Array.isArray(data?.result) ? data.result : [];

            if (aShareResult.status === 'fulfilled') {
                aShareResults = aShareResult.value.data.map((item) => ({
                    symbol: item.symbol,
                    name: item.name,
                    exchange: item.exchange,
                    type: item.type,
                    isInWatchlist: false,
                }));
            }
        }

        const mapped: StockWithWatchlistStatus[] = aShareResults.concat(results
            .map((r) => {
                const upper = (r.symbol || '').toUpperCase();
                const name = r.description || upper;
                const exchangeFromProfile = r.__exchange;
                const exchange = getExchangeLabel(upper, exchangeFromProfile);
                const type = r.type || 'Stock';
                const item: StockWithWatchlistStatus = {
                    symbol: upper,
                    name,
                    exchange,
                    type,
                    isInWatchlist: false,
                };
                return item;
            }))
            .filter((item, index, all) => all.findIndex((candidate) => candidate.symbol === item.symbol) === index)
            .slice(0, 15);

        return mapped;
    } catch (err) {
        console.error('Error in stock search:', err);
        return [];
    }
});
