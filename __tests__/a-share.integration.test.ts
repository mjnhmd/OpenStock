import 'dotenv/config';
import { describe, expect, it } from 'vitest';
import {
    getAShareBoards,
    getAShareKline,
    getAShareMarketMovers,
    getAShareNews,
    getAShareProfile,
    getAShareQuote,
    searchAShares,
} from '@/lib/market-data/a-share';
import { getQuote, searchStocks } from '@/lib/actions/finnhub.actions';
import { normalizeAShareSymbol } from '@/lib/market-data/symbols';
import { eastmoneyProvider } from '@/lib/market-data/providers/eastmoney';
import { tencentProvider } from '@/lib/market-data/providers/tencent';
import { sinaProvider } from '@/lib/market-data/providers/sina';
import { astockProvider } from '@/lib/market-data/providers/astock';

const runIntegration = process.env.RUN_MARKET_INTEGRATION === '1';

describe.runIf(runIntegration)('A-share provider integration', () => {
    it('searches by Chinese company name', async () => {
        const result = await searchAShares('贵州茅台');
        expect(result.data.some((item) => item.symbol === '600519.SH')).toBe(true);
    });

    it('returns a normalized quote', async () => {
        const result = await getAShareQuote('600519.SH');
        expect(result.data.price).toBeGreaterThan(0);
        expect(result.data.currency).toBe('CNY');
    });

    it('returns a company profile', async () => {
        const result = await getAShareProfile('600519.SH');
        expect(result.data.name).toContain('茅台');
    });

    it('returns daily kline data', async () => {
        const result = await getAShareKline('600519.SH', { limit: 5 });
        expect(result.data.length).toBeGreaterThan(0);
    });

    it('returns industry boards for the A-share heatmap', async () => {
        const result = await getAShareBoards('industry');
        expect(result.data.length).toBeGreaterThan(10);
        expect(result.data.every((board) => board.code.startsWith('BK'))).toBe(true);
        expect(typeof result.data[0].changePercent).toBe('number');
    });

    it('returns concept boards', async () => {
        const result = await getAShareBoards('concept');
        expect(result.data.length).toBeGreaterThan(10);
    });

    it('returns a market-wide gainers snapshot', async () => {
        const result = await getAShareMarketMovers(20);
        expect(result.data.length).toBeGreaterThan(5);
        expect(result.data.every((row) => /^[0-9]{6}\.(SH|SZ)$/.test(row.symbol))).toBe(true);
        expect(result.data.every((row) => row.price > 0)).toBe(true);
    });

    it('returns an A-share market news feed', async () => {
        const result = await getAShareNews(8);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data.every((item) => item.category === 'A股')).toBe(true);
        expect(result.data.every((item) => item.datetime > 0)).toBe(true);
    });

    it('exposes A-shares through the existing search action', async () => {
        const results = await searchStocks('贵州茅台', 'cn');
        expect(results.some((item) => item.symbol === '600519.SH')).toBe(true);
    });

    it('keeps A-share mode free of US symbols', async () => {
        const results = await searchStocks('600519', 'cn');
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((item) => /^[0-9]{6}\.(SH|SZ)$/.test(item.symbol))).toBe(true);
        expect(results.some((item) => item.symbol === 'AAPL')).toBe(false);
    });

    it('keeps US mode free of A-share symbols', async () => {
        const results = await searchStocks('apple', 'us');
        expect(results.some((item) => /^[0-9]{6}\.(SH|SZ)$/.test(item.symbol))).toBe(false);
    });

    it('exposes A-share quotes through the compatibility action', async () => {
        const quote = await getQuote('600519.SH');
        expect(quote && 'c' in quote && typeof quote.c === 'number').toBe(true);
    });

    it.each([
        ['eastmoney', eastmoneyProvider],
        ['tencent', tencentProvider],
        ['sina', sinaProvider],
        ['astock', astockProvider],
    ])('provider %s independently returns a valid quote or search result', async (name, provider) => {
        const symbol = normalizeAShareSymbol('600519.SH');
        expect(symbol).not.toBeNull();
        if (!symbol) return;

        if (provider.quote) {
            const quote = await provider.quote(symbol, { timeoutMs: 6000 });
            expect(quote.price, name).toBeGreaterThan(0);
            expect(quote.currency, name).toBe('CNY');
        }

        if (name !== 'eastmoney' && provider.search) {
            const results = await provider.search('贵州茅台', { timeoutMs: 6000 });
            expect(results.some((item) => item.symbol === '600519.SH'), name).toBe(true);
        }
    });
});
