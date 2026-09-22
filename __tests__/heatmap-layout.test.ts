import { describe, expect, it } from 'vitest';
import {
    buildHeatmapPayload,
    findBalancedSplit,
    heatColor,
    layoutTreemap,
    normalizeIndustryName,
    splitBounds,
    type TreemapItem,
} from '@/lib/market-data/heatmap-layout';
import type { AShareHeatmapRow } from '@/lib/market-data/types';

function row(overrides: Partial<AShareHeatmapRow> = {}): AShareHeatmapRow {
    return {
        symbol: '600519.SH',
        name: '贵州茅台',
        price: 1255,
        changePercent: 1.2,
        marketCap: 1.5e12,
        floatMarketCap: 1.5e12,
        industry: '白酒Ⅱ',
        provider: 'eastmoney',
        ...overrides,
    };
}

describe('normalizeIndustryName', () => {
    it('collapses level-2/3 markers to a level-1 style name', () => {
        expect(normalizeIndustryName('白酒Ⅱ')).toBe('白酒');
        expect(normalizeIndustryName('银行Ⅲ')).toBe('银行');
        expect(normalizeIndustryName('半导体')).toBe('半导体');
    });

    it('falls back to 其他 for empty or dash values', () => {
        expect(normalizeIndustryName('')).toBe('其他');
        expect(normalizeIndustryName('-')).toBe('其他');
    });
});

describe('buildHeatmapPayload', () => {
    it('deduplicates industry names into an index list', () => {
        const payload = buildHeatmapPayload([
            row({ symbol: '600519.SH', industry: '白酒Ⅱ' }),
            row({ symbol: '000858.SZ', name: '五粮液', industry: '白酒Ⅱ' }),
            row({ symbol: '601398.SH', name: '工商银行', industry: '银行Ⅱ' }),
        ]);
        expect(payload.industries).toEqual(['白酒', '银行']);
        expect(payload.stocks).toHaveLength(3);
        expect(payload.stocks[0][4]).toBe(0);
        expect(payload.stocks[2][4]).toBe(1);
    });

    it('drops rows without a usable float market cap', () => {
        const payload = buildHeatmapPayload([
            row({ symbol: '600519.SH' }),
            row({ symbol: 'BAD.SH', floatMarketCap: 0, marketCap: 0 }),
        ]);
        expect(payload.stocks).toHaveLength(1);
    });
});

describe('treemap layout', () => {
    it('finds the split point closest to half of the total value', () => {
        // [6,4,2] sums to 12; cutting after the first item gives exactly 6.
        expect(findBalancedSplit([
            { value: 6, data: 1 },
            { value: 4, data: 2 },
            { value: 2, data: 3 },
        ])).toBe(1);

        // [2,2,4] sums to 8; cutting after two items gives exactly 4.
        expect(findBalancedSplit([
            { value: 2, data: 1 },
            { value: 2, data: 2 },
            { value: 4, data: 3 },
        ])).toBe(2);
    });

    it('cuts the longer edge', () => {
        const [first, second] = splitBounds({ x: 0, y: 0, width: 200, height: 100 }, 0.5);
        expect(first.width).toBe(100);
        expect(first.height).toBe(100);
        expect(second.x).toBe(100);

        const [top] = splitBounds({ x: 0, y: 0, width: 100, height: 200 }, 0.25);
        expect(top.height).toBe(50);
        expect(top.width).toBe(100);
    });

    it('fills the bounds with non-overlapping rectangles proportional to value', () => {
        const items: TreemapItem<string>[] = [
            { value: 50, data: 'a' },
            { value: 30, data: 'b' },
            { value: 20, data: 'c' },
        ];
        const rects = layoutTreemap(items, { x: 0, y: 0, width: 400, height: 200 });
        expect(rects).toHaveLength(3);

        const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
        expect(area).toBeCloseTo(400 * 200, 3);

        const byData = new Map(rects.map((rect) => [rect.data, rect]));
        const biggest = byData.get('a')!;
        const smallest = byData.get('c')!;
        expect(biggest.width * biggest.height).toBeGreaterThan(smallest.width * smallest.height);
    });

    it('returns nothing for empty input', () => {
        expect(layoutTreemap([], { x: 0, y: 0, width: 100, height: 100 })).toEqual([]);
    });
});

describe('heatColor', () => {
    it('uses red for gains and green for losses (Chinese convention)', () => {
        expect(heatColor(3)).toContain('214,45,45');
        expect(heatColor(-3)).toContain('23,158,79');
        expect(heatColor(0)).toContain('110,116,128');
    });

    it('saturates alpha as the move grows', () => {
        const small = Number(heatColor(0.2).match(/,([0-9.]+)\)$/)?.[1]);
        const large = Number(heatColor(9).match(/,([0-9.]+)\)$/)?.[1]);
        expect(large).toBeGreaterThan(small);
    });
});
