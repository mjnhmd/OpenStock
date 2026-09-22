import { fetchJson } from '../http';
import type {
    AShareBoard,
    AShareKlineBar,
    AShareMarketRow,
    AShareProvider,
    AShareProfile,
    AShareQuote,
    AShareSearchResult,
    BoardKind,
    CanonicalAShareSymbol,
    ProviderContext,
} from '../types';

const SEARCH_URL = 'https://searchapi.eastmoney.com/api/suggest/get';
const SEARCH_TOKEN = 'D43BF722C8E33BDC906FB84D85E326E8';
const QUOTE_URL = 'https://push2.eastmoney.com/api/qt/stock/get';
const LIST_URL = 'https://push2.eastmoney.com/api/qt/clist/get';
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

interface EastmoneyListRow {
    f2?: number | string;
    f3?: number | string;
    f4?: number | string;
    f5?: number | string;
    f6?: number | string;
    f8?: number | string;
    f12?: string;
    f13?: number | string;
    f14?: string;
    f104?: number | string;
    f105?: number | string;
    f128?: string;
    f136?: number | string;
    f140?: string;
    f141?: number | string;
}

interface EastmoneyListResponse {
    data?: { total?: number; diff?: EastmoneyListRow[] | Record<string, EastmoneyListRow> };
}

function toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '' || value === '-') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function listRows(payload: EastmoneyListResponse): EastmoneyListRow[] {
    const diff = payload.data?.diff;
    if (!diff) return [];
    return Array.isArray(diff) ? diff : Object.values(diff);
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

    async boards(kind: BoardKind, context: ProviderContext): Promise<AShareBoard[]> {
        const fs = kind === 'industry' ? 'm:90+t:2' : 'm:90+t:3';
        const fields = 'f2,f3,f6,f12,f14,f104,f105,f128,f136,f140,f141';
        const url = `${LIST_URL}?pn=1&pz=200&po=1&np=1&fltt=2&invt=2&fid=f3&fs=${encodeURIComponent(fs)}&fields=${fields}`;
        const payload = await fetchJson<EastmoneyListResponse>(url, context, { headers: EASTMONEY_HEADERS });

        return listRows(payload).flatMap((row) => {
            const code = row.f12;
            const name = row.f14;
            if (!code || !name) return [];
            const leaderCode = row.f140;
            const leaderMarket = String(row.f141 ?? '');
            const leaderSymbol = leaderCode
                ? `${leaderCode}.${leaderMarket === '1' ? 'SH' : 'SZ'}`
                : undefined;

            const board: AShareBoard = {
                code,
                name,
                changePercent: toNumber(row.f3) ?? 0,
                price: toNumber(row.f2),
                turnover: toNumber(row.f6),
                upCount: toNumber(row.f104),
                downCount: toNumber(row.f105),
                leaderName: row.f128,
                leaderSymbol,
                leaderChangePercent: toNumber(row.f136),
                kind,
                provider: 'eastmoney',
            };
            return [board];
        });
    },

    async marketSnapshot(context: ProviderContext, limit = 50): Promise<AShareMarketRow[]> {
        const size = Math.max(1, Math.min(limit, 200));
        // Shanghai main board + STAR + Shenzhen main board + ChiNext
        const fs = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23';
        const fields = 'f2,f3,f4,f5,f6,f8,f12,f13,f14';
        const url = `${LIST_URL}?pn=1&pz=${size}&po=1&np=1&fltt=2&invt=2&fid=f3&fs=${encodeURIComponent(fs)}&fields=${fields}`;
        const payload = await fetchJson<EastmoneyListResponse>(url, context, { headers: EASTMONEY_HEADERS });

        return listRows(payload).flatMap((row) => {
            const code = row.f12;
            const name = row.f14;
            const price = toNumber(row.f2);
            const market = String(row.f13 ?? '');
            if (!code || !name || price === undefined || price <= 0) return [];
            const rowMarket = market === '1' ? 'SH' : 'SZ';
            const item: AShareMarketRow = {
                symbol: `${code}.${rowMarket}`,
                name,
                price,
                changePercent: toNumber(row.f3) ?? 0,
                change: toNumber(row.f4) ?? 0,
                volume: toNumber(row.f5),
                amount: toNumber(row.f6),
                turnover: toNumber(row.f8),
                provider: 'eastmoney',
            };
            return [item];
        });
    },
};
