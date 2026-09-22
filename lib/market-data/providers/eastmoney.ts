import { fetchJson } from '../http';
import type {
    AShareKlineBar,
    AShareProvider,
    AShareProfile,
    AShareQuote,
    AShareSearchResult,
    CanonicalAShareSymbol,
    ProviderContext,
} from '../types';

const SEARCH_URL = 'https://searchapi.eastmoney.com/api/suggest/get';
const SEARCH_TOKEN = 'D43BF722C8E33BDC906FB84D85E326E8';
const QUOTE_URL = 'https://push2.eastmoney.com/api/qt/stock/get';
const KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const EASTMONEY_HEADERS = {
    Accept: 'application/json,text/plain,*/*',
    Referer: 'https://quote.eastmoney.com/',
    'User-Agent': 'Mozilla/5.0',
};

interface EastmoneySearchItem {
    Code?: string;
    Name?: string;
    QuoteID?: string;
    Classify?: string;
    SecurityTypeName?: string;
}

interface EastmoneySearchResponse {
    QuotationCodeTable?: { Data?: EastmoneySearchItem[] };
}

interface EastmoneyQuoteResponse {
    data?: Record<string, string | number | null>;
}

interface EastmoneyKlineResponse {
    data?: { name?: string; klines?: string[] };
}

function numberValue(value: unknown, divisor = 1): number | undefined {
    if (value === null || value === undefined || value === '' || value === '-') return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed / divisor;
}

function canonicalFromQuoteId(quoteId?: string, code?: string): string | null {
    if (quoteId?.startsWith('1.') && code) return `${code}.SH`;
    if (quoteId?.startsWith('0.') && code) return `${code}.SZ`;
    return null;
}

function parseQuote(data: Record<string, string | number | null>): Omit<AShareQuote, 'symbol' | 'provider'> | null {
    const price = numberValue(data.f43, 100);
    const previousClose = numberValue(data.f60, 100);
    const change = numberValue(data.f169, 100);
    const changePercent = numberValue(data.f170, 100);
    const name = typeof data.f58 === 'string' ? data.f58 : '';
    const ticker = typeof data.f57 === 'string' ? data.f57 : '';

    if (!ticker || !name || price === undefined || previousClose === undefined) return null;

    return {
        name,
        c: price,
        d: change ?? Number((price - previousClose).toFixed(4)),
        dp: changePercent ?? Number((((price - previousClose) / previousClose) * 100).toFixed(4)),
        price,
        change: change ?? Number((price - previousClose).toFixed(4)),
        changePercent: changePercent ?? Number((((price - previousClose) / previousClose) * 100).toFixed(4)),
        previousClose,
        currency: 'CNY',
        timestamp: Date.now(),
        marketCap: numberValue(data.f116),
        peRatio: numberValue(data.f162, 100),
        pbRatio: numberValue(data.f167, 100),
    };
}

async function getQuoteData(symbol: CanonicalAShareSymbol, context: ProviderContext) {
    const fields = 'f43,f57,f58,f60,f116,f162,f167,f169,f170';
    const url = `${QUOTE_URL}?secid=${encodeURIComponent(symbol.eastmoneySecid)}&fields=${fields}`;
    const payload = await fetchJson<EastmoneyQuoteResponse>(url, context, { headers: EASTMONEY_HEADERS });
    return payload.data ? parseQuote(payload.data) : null;
}

export const eastmoneyProvider: AShareProvider = {
    name: 'eastmoney',

    async search(query: string, context: ProviderContext): Promise<AShareSearchResult[]> {
        const url = `${SEARCH_URL}?input=${encodeURIComponent(query)}&type=14&token=${SEARCH_TOKEN}&count=20`;
        const payload = await fetchJson<EastmoneySearchResponse>(url, context, { headers: EASTMONEY_HEADERS });
        if (!payload.QuotationCodeTable) {
            throw new Error('Eastmoney search returned an unexpected payload');
        }
        const items = payload.QuotationCodeTable.Data ?? [];

        return items.flatMap((item) => {
            if (item.Classify !== 'AStock' || !item.Code || !item.Name) return [];
            const symbol = canonicalFromQuoteId(item.QuoteID, item.Code);
            if (!symbol) return [];
            return [{
                symbol,
                name: item.Name,
                exchange: symbol.endsWith('.SH') ? 'SSE' : 'SZSE',
                type: item.SecurityTypeName || 'A股',
                currency: 'CNY' as const,
                provider: 'eastmoney' as const,
            }];
        });
    },

    async quote(symbol: CanonicalAShareSymbol, context: ProviderContext): Promise<AShareQuote> {
        const data = await getQuoteData(symbol, context);
        if (!data) throw new Error('Eastmoney quote payload was empty');
        return { ...data, symbol: symbol.symbol, provider: 'eastmoney' };
    },

    async profile(symbol: CanonicalAShareSymbol, context: ProviderContext): Promise<AShareProfile> {
        const data = await getQuoteData(symbol, context);
        if (!data) throw new Error('Eastmoney profile payload was empty');
        return {
            symbol: symbol.symbol,
            name: data.name,
            exchange: symbol.exchange,
            currency: 'CNY',
            marketCapitalization: data.marketCap,
            peRatio: data.peRatio,
            pbRatio: data.pbRatio,
            provider: 'eastmoney',
        };
    },

    async kline(
        symbol: CanonicalAShareSymbol,
        options: { limit?: number; start?: string; end?: string },
        context: ProviderContext,
    ): Promise<AShareKlineBar[]> {
        const limit = Math.max(1, Math.min(options.limit ?? 120, 1000));
        const fields1 = 'f1,f2,f3,f4,f5,f6';
        const fields2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61';
        const startDate = (options.start || '1990-01-01').replace(/-/g, '');
        const endDate = (options.end || '2099-12-31').replace(/-/g, '');
        const url = `${KLINE_URL}?secid=${encodeURIComponent(symbol.eastmoneySecid)}&klt=101&fqt=1&beg=${startDate}&end=${endDate}&fields1=${fields1}&fields2=${fields2}`;
        const payload = await fetchJson<EastmoneyKlineResponse>(url, context, { headers: EASTMONEY_HEADERS });
        const rows = payload.data?.klines ?? [];

        return rows.slice(-limit).flatMap((row) => {
            const [date, open, close, high, low, volume, amount, , changePercent, , turnover] = row.split(',');
            if (!date || options.start && date < options.start || options.end && date > options.end) return [];
            const bar: AShareKlineBar = {
                date,
                symbol: symbol.symbol,
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: Number(volume),
                amount: amount ? Number(amount) : undefined,
                changePercent: changePercent ? Number(changePercent) : undefined,
                turnover: turnover ? Number(turnover) : undefined,
                provider: 'eastmoney',
            };
            return Number.isFinite(bar.close) ? [bar] : [];
        });
    },
};
