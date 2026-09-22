import React from 'react';
import { getMarketTheme, type Market } from '@/lib/market-data/market';
import { formatChangePercent } from '@/lib/utils';
import type { AShareBoard } from '@/lib/market-data/types';

interface SectorHeatmapProps {
    title: string;
    boards: AShareBoard[];
    market: Market;
    emptyText?: string;
}

function cellStyle(changePercent: number, market: Market): React.CSSProperties {
    const theme = getMarketTheme(market);
    const intensity = Math.min(Math.abs(changePercent) / 5, 1);
    const alpha = 0.15 + intensity * 0.55;
    const positive = changePercent > 0;
    const negative = changePercent < 0;

    if (market === 'cn') {
        if (positive) return { backgroundColor: `rgba(239,68,68,${alpha})` };
        if (negative) return { backgroundColor: `rgba(34,197,94,${alpha})` };
    } else {
        if (positive) return { backgroundColor: `rgba(34,197,94,${alpha})` };
        if (negative) return { backgroundColor: `rgba(239,68,68,${alpha})` };
    }
    return { backgroundColor: 'rgba(107,114,128,0.18)', color: theme.flat };
}

export default function SectorHeatmap({ title, boards, market, emptyText }: SectorHeatmapProps) {
    if (!boards || boards.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-sm text-gray-500">
                {emptyText ?? '暂无板块数据'}
            </div>
        );
    }

    const maxTurnover = Math.max(...boards.map((board) => board.turnover ?? 0), 1);
    const visible = boards.slice(0, 60);

    return (
        <div>
            <h3 className="font-semibold text-2xl text-gray-100 mb-5">{title}</h3>
            <div
                className="flex flex-wrap gap-1 rounded-xl overflow-hidden border border-white/10 bg-black/40 p-1"
                style={{ minHeight: 520 }}
            >
                {visible.map((board) => {
                    const weight = Math.max(board.turnover ?? 0, maxTurnover * 0.04);
                    return (
                        <div
                            key={board.code}
                            title={`${board.name} ${formatChangePercent(board.changePercent)}${board.leaderName ? ` · 领涨 ${board.leaderName}` : ''}`}
                            className="rounded-md px-2 py-2 flex flex-col justify-center items-center text-center overflow-hidden"
                            style={{
                                ...cellStyle(board.changePercent, market),
                                flexGrow: weight,
                                flexBasis: 96,
                                minWidth: 84,
                                minHeight: 56,
                            }}
                        >
                            <span className="text-[13px] font-semibold text-white/90 leading-tight line-clamp-2">
                                {board.name}
                            </span>
                            <span className="text-xs font-mono mt-1 text-white/80">
                                {formatChangePercent(board.changePercent)}
                            </span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-2 text-xs text-gray-500">
                面积按成交额加权，颜色按涨跌幅{market === 'cn' ? '（红涨绿跌）' : ''}
            </p>
        </div>
    );
}
