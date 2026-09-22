import React from 'react';
import { MARKET_LABELS, type Market } from '@/lib/market-data/market';

const DESCRIPTIONS: Record<Market, string> = {
    cn: '行业板块 / 概念板块 / 涨幅榜 / A股资讯',
    us: '市场概览 / 股票热力图 / 行情列表 / Top Stories',
};

export default function MarketContextBar({ market }: { market: Market }) {
    return (
        <div className="w-full flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
            <span className="text-xs text-gray-500">当前市场</span>
            <span
                className={
                    market === 'cn'
                        ? 'rounded-full bg-red-500/15 border border-red-500/30 px-3 py-0.5 text-sm font-semibold text-red-400'
                        : 'rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-0.5 text-sm font-semibold text-teal-400'
                }
            >
                {MARKET_LABELS[market]}
            </span>
            <span className="text-xs text-gray-500">{DESCRIPTIONS[market]}</span>
            <span className="ml-auto text-xs text-gray-600">在右上角切换市场</span>
        </div>
    );
}
