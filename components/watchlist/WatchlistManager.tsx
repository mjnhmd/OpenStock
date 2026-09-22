'use client';

import React, { useState, useMemo } from 'react';
import WatchlistStockChip from './WatchlistStockChip';
import TradingViewWatchlist from './TradingViewWatchlist';
import { Button } from '@/components/ui/button';
import { ArrowDownAZ, ArrowUpZA, ArrowUpDown } from 'lucide-react';
import { WatchlistItem } from '@/database/models/watchlist.model';

interface WatchlistManagerProps {
    initialItems: WatchlistItem[]; // Using the DB model type directly or a simplified version
    userId: string;
}

export default function WatchlistManager({ initialItems, userId }: WatchlistManagerProps) {
    // Sort state: 'asc' (A-Z), 'desc' (Z-A), or null (added order/default)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

    const toggleSort = () => {
        if (sortOrder === null) setSortOrder('asc');
        else if (sortOrder === 'asc') setSortOrder('desc');
        else setSortOrder(null);
    };

    const sortedItems = useMemo(() => {
        if (!sortOrder) return initialItems;

        return [...initialItems].sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.symbol.localeCompare(b.symbol);
            } else {
                return b.symbol.localeCompare(a.symbol);
            }
        });
    }, [initialItems, sortOrder]);

    const watchlistSymbols = sortedItems.map((item) => item.symbol);

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center">
                        <span className="mr-2">管理股票</span>
                        <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                            {watchlistSymbols.length}
                        </span>
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSort}
                        className="h-8 px-2 text-gray-400 hover:text-white hover:bg-white/10"
                        title={
                            sortOrder === 'asc'
                                ? '按代码升序'
                                : sortOrder === 'desc'
                                    ? '按代码降序'
                                    : '默认顺序'
                        }
                    >
                        {sortOrder === 'asc' && <ArrowDownAZ className="w-4 h-4 mr-2" />}
                        {sortOrder === 'desc' && <ArrowUpZA className="w-4 h-4 mr-2" />}
                        {sortOrder === null && <ArrowUpDown className="w-4 h-4 mr-2" />}
                        <span className="text-xs">
                            {sortOrder === 'asc'
                                ? '升序'
                                : sortOrder === 'desc'
                                    ? '降序'
                                    : '排序'}
                        </span>
                    </Button>
                </div>

                {watchlistSymbols.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {sortedItems.map((item) => (
                            <WatchlistStockChip
                                key={item.symbol}
                                symbol={item.symbol}
                                company={item.company}
                                userId={userId}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">自选股为空。</p>
                )}
            </div>

            <div className="min-h-[550px]">
                <TradingViewWatchlist symbols={watchlistSymbols} />
            </div>
        </div>
    );
}
