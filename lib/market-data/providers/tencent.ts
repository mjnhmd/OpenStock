import { fetchText } from '../http';
import type {
    AShareKlineBar,
    AShareProvider,
    AShareProfile,
    AShareQuote,
    AShareSearchResult,
    CanonicalAShareSymbol,
    ProviderContext,
} from '../types';

const SEARCH_URL = 'https://smartbox.gtimg.cn/s3/';
const QUOTE_URL = 'https://qt.gtimg.cn/q=';
const KLINE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get';

interface TencentKlineResponse {
    data?: Record<string, {
        qfqday?: string[][];
        day?: string[][];
        hfqday?: string[][];
    }>;
}

function decodeUnicodeEscapes(value: string): string {
    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function numberValue(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTencentTime(value?: string): number {
    if (!value || !/^\d{14}$/.test(value)) return Date.now();
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const hour = Number(value.slice(8, 10));
    const minute = Number(value.slice(10, 12));
    const second = Number(value.slice(12, 14));
    return new Date(year, month, day, hour, minute, second).getTime();
}

function parseQuoteFields(symbol: CanonicalAShareSymbol, fields: string[]): AShareQuote {
    const price = numberValue(fields[3]);
    const previousClose = numberValue(fields[4]);
    if (!price || previousClose === undefined) throw new Error('Tencent quote payload was incomplete');

    const change = numberValue(fields[31]) ?? Number((price - previousClose).toFixed(4));
    const changePercent = numberValue(fields[32]) ?? Number((((price - previousClose) / previousClose) * 100).toFixed(4));
    const totalMarketCapYi = numberValue(fields[45]);

    return {
        symbol: symbol.symbol,
        name: decodeUnicodeEscapes(fields[1] || symbol.ticker),
        c: price,
        d: change,
        dp: changePercent,
        price,
        change,
        changePercent,
        previousClose,
        currency: 'CNY',
        timestamp: parseTencentTime(fields[30]),
        marketCap: totalMarketCapYi === undefined ? undefined : totalMarketCapYi * 100_000_000,
        peRatio: numberValue(fields[39]),
        pbRatio: numberValue(fields[46]),
        provider: 'tencent',
    };
}

async function fetchQuote(symbol: CanonicalAShareSymbol, context: ProviderContext) {
    const text = await fetchText(`${QUOTE_URL}${symbol.quoteCode}`, 'gb18030', context);
    const match = text.match(/="([^"]*)"/);
    if (!match) throw new Error('Tencent quote response was invalid');
    return parseQuoteFields(symbol, decodeUnicodeEscapes(match[1]).split('~'));
}

export const tencentProvider: AShareProvider = {
    name: 'tencent',

    async search(query: string, context: ProviderContext): Promise<AShareSearchResult[]> {
        const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&t=all`;
        const text = await fetchText(url, 'utf-8', context);
        const match = text.match(/v_hint="([^"]*)"/);
        if (!match || match[1] === 'N') return [];

        return decodeUnicodeEscapes(match[1]).split(';').flatMap((entry) => {
            const [market, code, name, , type] = entry.split('~');
            if (!['sh', 'sz'].includes(market) || !/^\d{6}$/.test(code || '') || !name) return [];
            const symbol = `${code}.${market === 'sh' ? 'SH' : 'SZ'}`;
            return [{
                symbol,
                name,
                exchange: market === 'sh' ? 'SSE' : 'SZSE',
                type: type?.startsWith('GP') ? 'A股' : type || 'A股',
                currency: 'CNY' as const,
                provider: 'tencent' as const,
            }];
        });
    },

    async quote(symbol: CanonicalAShareSymbol, context: ProviderContext): Promise<AShareQuote> {
        return fetchQuote(symbol, context);
    },

    async profile(symbol: CanonicalAShareSymbol, context: ProviderContext): Promise<AShareProfile> {
        const quote = await fetchQuote(symbol, context);
        return {
            symbol: symbol.symbol,
            name: quote.name,
            exchange: symbol.exchange,
            currency: 'CNY',
            marketCapitalization: quote.marketCap,
            peRatio: quote.peRatio,
            pbRatio: quote.pbRatio,
            provider: 'tencent',
        };
    },

    async kline(
        symbol: CanonicalAShareSymbol,
        options: { limit?: number; start?: string; end?: string },
        context: ProviderContext,
    ): Promise<AShareKlineBar[]> {
        const limit = Math.max(1, Math.min(options.limit ?? 120, 1000));
        const url = `${KLINE_URL}?param=${symbol.quoteCode},day,,,${limit},qfq`;
        const payload = await fetchText(url, 'utf-8', context);
        const parsed = JSON.parse(payload) as TencentKlineResponse;
        const rows = parsed.data?.[symbol.quoteCode]?.qfqday
            ?? parsed.data?.[symbol.quoteCode]?.day
            ?? [];

        return rows.flatMap((row) => {
            const [date, open, close, high, low, volume] = row;
            if (!date || (options.start && date < options.start) || (options.end && date > options.end)) return [];
            const bar: AShareKlineBar = {
                date,
                symbol: symbol.symbol,
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: Number(volume),
                provider: 'tencent',
            };
            return Number.isFinite(bar.close) ? [bar] : [];
        });
    },
};
