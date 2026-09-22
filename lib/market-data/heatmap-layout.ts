import type { AShareHeatmapRow } from './types';

/**
 * Compact wire format: the heatmap renders every listed A-share (~5000), so the
 * server sends tuples rather than objects and the industry name only once.
 */
export type HeatmapStock = [
    symbol: string,
    name: string,
    changePercent: number,
    floatMarketCap: number,
    industryIndex: number,
];

export interface HeatmapPayload {
    industries: string[];
    stocks: HeatmapStock[];
    totalCount: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TreemapItem<T> {
    value: number;
    data: T;
}

export interface TreemapRect<T> extends Rect {
    data: T;
}

/** 银行Ⅱ / 白酒Ⅲ -> 银行 / 白酒, approximating a level-1 industry grouping. */
export function normalizeIndustryName(raw: string): string {
    const trimmed = (raw || '').trim();
    if (!trimmed || trimmed === '-') return '其他';
    return trimmed.replace(/[ⅠⅡⅢ]+$/, '') || '其他';
}

export function buildHeatmapPayload(rows: AShareHeatmapRow[]): HeatmapPayload {
    const industries: string[] = [];
    const indexByIndustry = new Map<string, number>();
    const stocks: HeatmapStock[] = [];

    for (const row of rows) {
        const value = row.floatMarketCap > 0 ? row.floatMarketCap : row.marketCap;
        if (!row.symbol || !row.name || !Number.isFinite(value) || value <= 0) continue;

        const industry = normalizeIndustryName(row.industry);
        let industryIndex = indexByIndustry.get(industry);
        if (industryIndex === undefined) {
            industryIndex = industries.length;
            indexByIndustry.set(industry, industryIndex);
            industries.push(industry);
        }

        stocks.push([
            row.symbol,
            row.name,
            Number.isFinite(row.changePercent) ? row.changePercent : 0,
            value,
            industryIndex,
        ]);
    }

    return { industries, stocks, totalCount: stocks.length };
}

export function totalValue<T>(items: TreemapItem<T>[]): number {
    let sum = 0;
    for (const item of items) sum += item.value;
    return sum;
}

/** Split point where the cumulative value is closest to half of the total. */
export function findBalancedSplit<T>(items: TreemapItem<T>[]): number {
    if (items.length <= 1) return items.length;

    const target = totalValue(items) / 2;
    let cumulative = 0;
    let bestIndex = 1;
    let bestDiff = Number.POSITIVE_INFINITY;

    for (let index = 1; index < items.length; index += 1) {
        cumulative += items[index - 1].value;
        const diff = Math.abs(target - cumulative);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestIndex = index;
        }
    }
    return bestIndex;
}

/** Always cut the longer edge so the tiles stay as square as possible. */
export function splitBounds(bounds: Rect, ratio: number): [Rect, Rect] {
    if (bounds.width >= bounds.height) {
        const leftWidth = bounds.width * ratio;
        return [
            { x: bounds.x, y: bounds.y, width: leftWidth, height: bounds.height },
            {
                x: bounds.x + leftWidth,
                y: bounds.y,
                width: Math.max(0, bounds.width - leftWidth),
                height: bounds.height,
            },
        ];
    }

    const topHeight = bounds.height * ratio;
    return [
        { x: bounds.x, y: bounds.y, width: bounds.width, height: topHeight },
        {
            x: bounds.x,
            y: bounds.y + topHeight,
            width: bounds.width,
            height: Math.max(0, bounds.height - topHeight),
        },
    ];
}

/**
 * Binary-split treemap: recursively halve the sorted list by cumulative value,
 * cutting along whichever edge is longer.
 */
export function layoutTreemap<T>(items: TreemapItem<T>[], bounds: Rect): TreemapRect<T>[] {
    const sorted = [...items].filter((item) => item.value > 0).sort((a, b) => b.value - a.value);

    function recurse(entries: TreemapItem<T>[], area: Rect): TreemapRect<T>[] {
        if (entries.length === 0 || area.width <= 1 || area.height <= 1) return [];
        if (entries.length === 1) {
            return [{ ...area, data: entries[0].data }];
        }

        const splitIndex = findBalancedSplit(entries);
        const first = entries.slice(0, splitIndex);
        const second = entries.slice(splitIndex);
        const total = totalValue(entries);

        if (first.length === 0 || second.length === 0 || total <= 0) {
            return entries.map((entry, index) => ({
                ...area,
                y: area.y + (area.height / entries.length) * index,
                height: area.height / entries.length,
                data: entry.data,
            }));
        }

        const [firstArea, secondArea] = splitBounds(area, totalValue(first) / total);
        return [...recurse(first, firstArea), ...recurse(second, secondArea)];
    }

    return recurse(sorted, bounds);
}

/** Chinese convention: red for gains, green for losses. Saturates around 5%. */
export function heatColor(changePercent: number): string {
    const intensity = Math.min(Math.abs(changePercent) / 5, 1);
    const alpha = 0.22 + intensity * 0.62;
    if (changePercent > 0.001) return `rgba(214,45,45,${alpha.toFixed(3)})`;
    if (changePercent < -0.001) return `rgba(23,158,79,${alpha.toFixed(3)})`;
    return 'rgba(110,116,128,0.35)';
}
