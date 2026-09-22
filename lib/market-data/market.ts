export type Market = 'cn' | 'us';

export const MARKET_COOKIE = 'openstock_market';
export const DEFAULT_MARKET: Market = 'cn';

export const MARKET_LABELS: Record<Market, string> = {
    cn: 'A股',
    us: '美股',
};

export interface MarketTheme {
    /** Chinese convention: red is up, green is down. US convention is inverted. */
    up: string;
    down: string;
    flat: string;
    currency: 'CNY' | 'USD';
    locale: string;
    tradingViewLocale: string;
}

export const MARKET_THEMES: Record<Market, MarketTheme> = {
    cn: {
        up: 'text-red-500',
        down: 'text-green-500',
        flat: 'text-gray-400',
        currency: 'CNY',
        locale: 'zh-CN',
        tradingViewLocale: 'zh_CN',
    },
    us: {
        up: 'text-green-500',
        down: 'text-red-500',
        flat: 'text-gray-400',
        currency: 'USD',
        locale: 'en-US',
        tradingViewLocale: 'en',
    },
};

export const MARKET_UP_BG: Record<Market, string> = {
    cn: 'bg-red-500/15 text-red-400 border-red-500/30',
    us: 'bg-green-500/15 text-green-400 border-green-500/30',
};

export const MARKET_DOWN_BG: Record<Market, string> = {
    cn: 'bg-green-500/15 text-green-400 border-green-500/30',
    us: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function parseMarket(value?: string | null): Market {
    return value === 'us' ? 'us' : DEFAULT_MARKET;
}

export function getMarketTheme(market: Market): MarketTheme {
    return MARKET_THEMES[market];
}

export function changeToneClass(market: Market, changePercent: number | null | undefined): string {
    const theme = getMarketTheme(market);
    if (changePercent === null || changePercent === undefined || !Number.isFinite(changePercent)) {
        return theme.flat;
    }
    if (changePercent > 0) return theme.up;
    if (changePercent < 0) return theme.down;
    return theme.flat;
}

export function changeBadgeClass(market: Market, changePercent: number | null | undefined): string {
    if (changePercent === null || changePercent === undefined || !Number.isFinite(changePercent)) {
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
    if (changePercent > 0) return MARKET_UP_BG[market];
    if (changePercent < 0) return MARKET_DOWN_BG[market];
    return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
}
