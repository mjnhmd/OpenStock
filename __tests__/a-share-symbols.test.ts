import { describe, expect, it } from 'vitest';
import { isAShareSymbol, normalizeAShareSymbol } from '@/lib/market-data/symbols';
import { formatSymbolForTradingView } from '@/lib/utils';

describe('A-share symbol normalization', () => {
    it.each([
        ['600519', '600519.SH'],
        ['sh600519', '600519.SH'],
        ['sh.600519', '600519.SH'],
        ['600519.SH', '600519.SH'],
        ['600519.SS', '600519.SH'],
        ['000001', '000001.SZ'],
        ['sz000001', '000001.SZ'],
        ['sz.000001', '000001.SZ'],
        ['000001.SZ', '000001.SZ'],
        ['300750', '300750.SZ'],
    ])('normalizes %s to %s', (input, expected) => {
        expect(normalizeAShareSymbol(input)?.symbol).toBe(expected);
    });

    it('rejects invalid or ambiguous symbols', () => {
        expect(normalizeAShareSymbol('AAPL')).toBeNull();
        expect(normalizeAShareSymbol('12345')).toBeNull();
        expect(normalizeAShareSymbol('')).toBeNull();
    });

    it('recognizes canonical and alias symbols', () => {
        expect(isAShareSymbol('600519.SH')).toBe(true);
        expect(isAShareSymbol('sh600519')).toBe(true);
        expect(isAShareSymbol('000001.SZ')).toBe(true);
        expect(isAShareSymbol('AAPL')).toBe(false);
    });

    it('maps canonical symbols to TradingView exchanges', () => {
        expect(formatSymbolForTradingView('600519.SH')).toBe('SSE:600519');
        expect(formatSymbolForTradingView('000001.SZ')).toBe('SZSE:000001');
    });
});
