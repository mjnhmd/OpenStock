'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    heatColor,
    layoutTreemap,
    type HeatmapPayload,
    type HeatmapStock,
    type Rect,
    type TreemapItem,
    type TreemapRect,
} from '@/lib/market-data/heatmap-layout';

interface StockHeatmapProps {
    payload: HeatmapPayload;
    title: string;
    height?: number;
    emptyText?: string;
}

interface PlacedStock extends Rect {
    stock: HeatmapStock;
    industry: string;
}

const HEADER_HEIGHT = 16;
const GAP = 1;
const FONT_STACK = '"PingFang SC", "Microsoft YaHei", -apple-system, "Segoe UI", Arial, sans-serif';

function toIndustryGroups(payload: HeatmapPayload) {
    const grouped = new Map<number, HeatmapStock[]>();
    for (const stock of payload.stocks) {
        const list = grouped.get(stock[4]);
        if (list) list.push(stock);
        else grouped.set(stock[4], [stock]);
    }
    return [...grouped.entries()].map(([industryIndex, stocks]) => ({
        name: payload.industries[industryIndex] ?? '其他',
        stocks,
        value: stocks.reduce((sum, stock) => sum + stock[3], 0),
    }));
}

function buildLayout(payload: HeatmapPayload, width: number, height: number, showHeader: boolean) {
    const groups = toIndustryGroups(payload);
    const industryItems: TreemapItem<{ name: string; stocks: HeatmapStock[] }>[] = groups.map((group) => ({
        value: group.value,
        data: { name: group.name, stocks: group.stocks },
    }));

    const industryRects = layoutTreemap(industryItems, { x: 0, y: 0, width, height });
    const placed: PlacedStock[] = [];
    const industryBoxes: { name: string; rect: Rect }[] = [];

    for (const rect of industryRects) {
        const header = showHeader && rect.height > HEADER_HEIGHT + 8 ? HEADER_HEIGHT : 0;
        const inner: Rect = {
            x: rect.x + GAP,
            y: rect.y + header + GAP,
            width: Math.max(0, rect.width - GAP * 2),
            height: Math.max(0, rect.height - header - GAP * 2),
        };
        industryBoxes.push({ name: rect.data.name, rect });

        if (inner.width <= 1 || inner.height <= 1) continue;

        const stockItems: TreemapItem<HeatmapStock>[] = rect.data.stocks.map((stock) => ({
            value: stock[3],
            data: stock,
        }));
        for (const stockRect of layoutTreemap(stockItems, inner) as TreemapRect<HeatmapStock>[]) {
            placed.push({
                ...stockRect,
                stock: stockRect.data,
                industry: rect.data.name,
            });
        }
    }

    return { placed, industryBoxes };
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    if (maxWidth <= 0 || !text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let low = 1;
    let high = text.length;
    let best = '';
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = text.slice(0, mid);
        if (ctx.measureText(candidate).width <= maxWidth) {
            best = candidate;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    if (best) return `${best}…`;
    const first = text.slice(0, 1);
    return ctx.measureText(first).width <= maxWidth ? first : '';
}

export default function StockHeatmap({
    payload,
    title,
    height = 660,
    emptyText,
}: StockHeatmapProps) {
    const router = useRouter();
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [width, setWidth] = useState(0);
    const [hover, setHover] = useState<{ x: number; y: number; stock: PlacedStock } | null>(null);

    useEffect(() => {
        const element = wrapRef.current;
        if (!element) return;
        const observer = new ResizeObserver((entries) => {
            const next = entries[0]?.contentRect.width ?? 0;
            setWidth((current) => (Math.abs(current - next) > 1 ? next : current));
        });
        observer.observe(element);
        setWidth(element.clientWidth);
        return () => observer.disconnect();
    }, []);

    const showHeader = height >= 260;
    const layout = useMemo(
        () => (width > 0 ? buildLayout(payload, width, height, showHeader) : { placed: [], industryBoxes: [] }),
        [payload, width, height, showHeader],
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || width <= 0) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = '100%';
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        for (const box of layout.industryBoxes) {
            if (showHeader && box.rect.height > HEADER_HEIGHT + 8) {
                ctx.fillStyle = '#0b0b0b';
                ctx.fillRect(box.rect.x, box.rect.y, box.rect.width, HEADER_HEIGHT);
                ctx.font = `500 10px ${FONT_STACK}`;
                ctx.fillStyle = 'rgba(156,163,175,1)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    fitText(ctx, box.name, box.rect.width - 6),
                    box.rect.x + 3,
                    box.rect.y + HEADER_HEIGHT / 2,
                );
            }

            ctx.strokeStyle = 'rgba(0,0,0,0.55)';
            ctx.lineWidth = 1;
            ctx.strokeRect(box.rect.x + 0.5, box.rect.y + 0.5, box.rect.width - 1, box.rect.height - 1);
        }

        for (const item of layout.placed) {
            ctx.fillStyle = heatColor(item.stock[2]);
            ctx.fillRect(item.x, item.y, Math.max(0, item.width - 1), Math.max(0, item.height - 1));

            if (item.width < 34 || item.height < 20) continue;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const centerX = item.x + item.width / 2;
            const centerY = item.y + item.height / 2;
            const hasPercentRoom = item.height >= 32;

            ctx.font = `600 ${item.width >= 60 ? 11 : 10}px ${FONT_STACK}`;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.fillText(
                fitText(ctx, item.stock[1], item.width - 6),
                centerX,
                hasPercentRoom ? centerY - 6 : centerY,
            );

            if (hasPercentRoom) {
                const change = item.stock[2];
                const sign = change > 0 ? '+' : '';
                ctx.font = `500 10px ${FONT_STACK}`;
                ctx.fillStyle = 'rgba(255,255,255,0.78)';
                ctx.fillText(`${sign}${change.toFixed(2)}%`, centerX, centerY + 7);
            }
        }
    }, [layout, width, height, showHeader]);

    const findStockAt = useCallback((offsetX: number, offsetY: number) => {
        for (let index = layout.placed.length - 1; index >= 0; index -= 1) {
            const item = layout.placed[index];
            if (
                offsetX >= item.x
                && offsetX <= item.x + item.width
                && offsetY >= item.y
                && offsetY <= item.y + item.height
            ) {
                return item;
            }
        }
        return null;
    }, [layout.placed]);

    const handleMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const found = findStockAt(event.clientX - rect.left, event.clientY - rect.top);
        setHover(found ? { x: event.clientX - rect.left, y: event.clientY - rect.top, stock: found } : null);
    };

    const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const found = findStockAt(event.clientX - rect.left, event.clientY - rect.top);
        if (found) router.push(`/stocks/${found.stock[0]}`);
    };

    if (payload.stocks.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-sm text-gray-500">
                {emptyText ?? '暂无个股热力图数据'}
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
                <h3 className="font-semibold text-2xl text-gray-100">{title}</h3>
                <span className="text-xs text-gray-500">
                    共 {payload.totalCount} 只 · 面积按流通市值加权 · 红涨绿跌 · 点击色块进入个股
                </span>
            </div>
            <div ref={wrapRef} className="relative">
                <canvas
                    ref={canvasRef}
                    className="w-full rounded-xl border border-white/10 bg-black/60 cursor-pointer"
                    onMouseMove={handleMove}
                    onMouseLeave={() => setHover(null)}
                    onClick={handleClick}
                />
                {hover && (
                    <div
                        className="pointer-events-none absolute z-20 rounded-md border border-white/15 bg-black/95 px-3 py-2 text-xs text-gray-200 shadow-xl"
                        style={{
                            left: Math.min(Math.max(hover.x + 12, 0), Math.max(width - 220, 0)),
                            top: Math.max(hover.y - 68, 0),
                            minWidth: 180,
                        }}
                    >
                        <div className="font-semibold text-sm text-white">
                            {hover.stock.stock[1]}
                            <span className="ml-2 font-mono text-[11px] text-gray-400">{hover.stock.stock[0]}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                            <span
                                className={
                                    hover.stock.stock[2] > 0
                                        ? 'text-red-400'
                                        : hover.stock.stock[2] < 0
                                            ? 'text-green-400'
                                            : 'text-gray-400'
                                }
                            >
                                {hover.stock.stock[2] > 0 ? '+' : ''}
                                {hover.stock.stock[2].toFixed(2)}%
                            </span>
                            <span className="text-gray-500">
                                流通市值 {(hover.stock.stock[3] / 1e8).toFixed(0)} 亿
                            </span>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500">行业：{hover.stock.industry}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
