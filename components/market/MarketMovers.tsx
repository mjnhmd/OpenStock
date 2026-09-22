import React from 'react';
import Link from 'next/link';
import { changeBadgeClass, getMarketTheme, type Market } from '@/lib/market-data/market';
import { formatChangePercent, formatPrice } from '@/lib/utils';
import type { AShareMarketRow } from '@/lib/market-data/types';

interface MarketMoversProps {
    title: string;
    rows: AShareMarketRow[];
    market: Market;
    emptyText?: string;
}

export default function MarketMovers({ title, rows, market, emptyText }: MarketMoversProps) {
    if (!rows || rows.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-sm text-gray-500">
                {emptyText ?? '暂无行情数据'}
            </div>
        );
    }

    const theme = getMarketTheme(market);

    return (
        <div>
            <h3 className="font-semibold text-2xl text-gray-100 mb-5">{title}</h3>
            <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-white/5 text-gray-400">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">名称</th>
                            <th className="px-4 py-3 text-left font-medium">代码</th>
                            <th className="px-4 py-3 text-right font-medium">最新价</th>
                            <th className="px-4 py-3 text-right font-medium">涨跌幅</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row) => (
                            <tr key={row.symbol} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3">
                                    <Link
                                        href={`/stocks/${row.symbol}`}
                                        className="text-gray-100 hover:text-teal-400 transition-colors"
                                    >
                                        {row.name}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.symbol}</td>
                                <td className="px-4 py-3 text-right text-gray-200 font-mono">
                                    {formatPrice(row.price, theme.currency)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span
                                        className={`inline-block rounded-md border px-2 py-0.5 font-mono text-xs ${changeBadgeClass(market, row.changePercent)}`}
                                    >
                                        {formatChangePercent(row.changePercent)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
