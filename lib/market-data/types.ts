export type AShareProviderName = 'eastmoney' | 'eastmoney-flash' | 'tencent' | 'sina' | 'astock';
export type BoardKind = 'industry' | 'concept';
export type AShareMarket = 'SH' | 'SZ';
export type AShareExchange = 'SSE' | 'SZSE';

export interface CanonicalAShareSymbol {
    symbol: string;
    ticker: string;
    market: AShareMarket;
    exchange: AShareExchange;
    quoteCode: string;
    eastmoneySecid: string;
}

export interface AShareSearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
    currency: 'CNY';
    provider: AShareProviderName;
}

export interface AShareQuote {
    symbol: string;
    name: string;
    c: number;
    d: number;
    dp: number;
    price: number;
    change: number;
    changePercent: number;
    previousClose: number;
    currency: 'CNY';
    timestamp: number;
    marketCap?: number;
    peRatio?: number;
    pbRatio?: number;
    provider: AShareProviderName;
    stale?: boolean;
}

export interface AShareProfile {
    symbol: string;
    name: string;
    exchange: string;
    currency: 'CNY';
    marketCapitalization?: number;
    peRatio?: number;
    pbRatio?: number;
    provider: AShareProviderName;
}

export interface AShareKlineBar {
    date: string;
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount?: number;
    changePercent?: number;
    turnover?: number;
    provider: AShareProviderName;
}

export interface AShareBoard {
    code: string;
    name: string;
    changePercent: number;
    price?: number;
    turnover?: number;
    leaderName?: string;
    leaderSymbol?: string;
    leaderChangePercent?: number;
    upCount?: number;
    downCount?: number;
    kind: BoardKind;
    provider: AShareProviderName;
}

export interface AShareMarketRow {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    change: number;
    volume?: number;
    amount?: number;
    turnover?: number;
    provider: AShareProviderName;
}

export interface AShareHeatmapRow {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    marketCap: number;
    floatMarketCap: number;
    industry: string;
    provider: AShareProviderName;
}

export interface ProviderContext {
    signal?: AbortSignal;
    timeoutMs?: number;
}

export interface AShareProvider {
    name: AShareProviderName;
    search?: (query: string, context: ProviderContext) => Promise<AShareSearchResult[]>;
    quote?: (symbol: CanonicalAShareSymbol, context: ProviderContext) => Promise<AShareQuote>;
    profile?: (symbol: CanonicalAShareSymbol, context: ProviderContext) => Promise<AShareProfile>;
    kline?: (
        symbol: CanonicalAShareSymbol,
        options: { limit?: number; start?: string; end?: string },
        context: ProviderContext,
    ) => Promise<AShareKlineBar[]>;
    boards?: (kind: BoardKind, context: ProviderContext) => Promise<AShareBoard[]>;
    marketSnapshot?: (context: ProviderContext, limit?: number) => Promise<AShareMarketRow[]>;
    heatmapSnapshot?: (context: ProviderContext) => Promise<AShareHeatmapRow[]>;
    news?: (context: ProviderContext, limit?: number) => Promise<MarketNewsArticle[]>;
}

export interface ProviderResult<T> {
    data: T;
    provider: AShareProviderName;
    stale: boolean;
    fromCache: boolean;
    attemptedProviders: AShareProviderName[];
}

export class MarketDataUnavailableError extends Error {
    readonly operation: string;
    readonly symbolOrQuery: string;
    readonly attemptedProviders: AShareProviderName[];

    constructor(operation: string, symbolOrQuery: string, attemptedProviders: AShareProviderName[]) {
        super(`${operation} unavailable for ${symbolOrQuery} after trying: ${attemptedProviders.join(', ') || 'none'}`);
        this.name = 'MarketDataUnavailableError';
        this.operation = operation;
        this.symbolOrQuery = symbolOrQuery;
        this.attemptedProviders = attemptedProviders;
    }
}
