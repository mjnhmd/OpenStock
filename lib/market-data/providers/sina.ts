import { fetchText } from '../http';
import type {
    AShareProvider,
    AShareProfile,
    AShareQuote,
    AShareSearchResult,
    CanonicalAShareSymbol,
    ProviderContext,
} from '../types';

const SEARCH_URL = 'https://suggest3.sinajs.cn/suggest/type=11,12,13,14,15&key=';
const QUOTE_URL = 'https://hq.sinajs.cn/list=';
const SINA_HEADERS = { Referer: 'https://finance.sina.com.cn' };

function numberValue(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseSinaTime(date?: string, time?: string): number {
    if (!date || !time) return Date.now();
    const timestamp = Date.parse(`${date}T${time}+08:00`);
    return Number.isFinite(timestamp) ? timestamp : Date.now();
}

async function fetchQuote(symbol: CanonicalAShareSymbol, context: ProviderContext): Promise<AShareQuote> {
    const text = await fetchText(
        `${QUOTE_URL}${symbol.quoteCode}`,
        'gb18030',
        context,
        { headers: SINA_HEADERS },
    );
    const match = text.match(/="([^"]*)"/);
    if (!match) throw new Error('Sina quote response was invalid');
    const fields = match[1].split(',');
    const name = fields[0];
    const previousClose = numberValue(fields[2]);
    const price = numberValue(fields[3]);
    if (!name || price === undefined || previousClose === undefined || price <= 0) {
        throw new Error('Sina quote payload was incomplete');
    }

    const change = Number((price - previousClose).toFixed(4));
    const changePercent = previousClose === 0 ? 0 : Number(((change / previousClose) * 100).toFixed(4));

    return {
        symbol: symbol.symbol,
        name,
        c: price,
        d: change,
        dp: changePercent,
        price,
        change,
        changePercent,
        previousClose,
        currency: 'CNY',
        timestamp: parseSinaTime(fields[30], fields[31]),
        provider: 'sina',
    };
}

export const sinaProvider: AShareProvider = {
    name: 'sina',

    async search(query: string, context: ProviderContext): Promise<AShareSearchResult[]> {
        const text = await fetchText(
            `${SEARCH_URL}${encodeURIComponent(query)}`,
            'gb18030',
            context,
            { headers: SINA_HEADERS },
        );
        const match = text.match(/="([^"]*)"/);
        if (!match || !match[1]) return [];

        return match[1].split(';').flatMap((entry) => {
            const fields = entry.split(',');
            const quoteCode = fields.find((field) => /^(sh|sz)\d{6}$/.test(field)) || '';
            const name = fields[4] || fields[6] || fields[0];
            if (!quoteCode || !name) return [];
            const market = quoteCode.slice(0, 2);
            const ticker = quoteCode.slice(2);
            return [{
                symbol: `${ticker}.${market === 'sh' ? 'SH' : 'SZ'}`,
                name,
                exchange: market === 'sh' ? 'SSE' : 'SZSE',
                type: 'A股',
                currency: 'CNY' as const,
                provider: 'sina' as const,
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
            provider: 'sina',
        };
    },
};
