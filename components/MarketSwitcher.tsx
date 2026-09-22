'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MARKET_COOKIE, MARKET_LABELS, type Market } from '@/lib/market-data/market';
import { cn } from '@/lib/utils';

const ORDER: Market[] = ['cn', 'us'];

export default function MarketSwitcher({ market }: { market: Market }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [selected, setSelected] = useState<Market>(market);

    const select = (next: Market) => {
        if (next === selected) return;
        setSelected(next);
        document.cookie = `${MARKET_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <div className={cn('flex items-center gap-2', pending && 'opacity-70')}>
            <span className="hidden md:inline text-xs text-gray-500">市场</span>
            <div
                role="group"
                aria-label="市场切换"
                className="flex items-center rounded-full border border-gray-600 bg-gray-900/80 p-0.5 text-sm"
            >
                {ORDER.map((item) => {
                    const active = item === selected;
                    return (
                        <button
                            key={item}
                            type="button"
                            onClick={() => select(item)}
                            aria-pressed={active}
                            className={cn(
                                'px-3 py-1 rounded-full font-semibold transition-colors whitespace-nowrap',
                                active
                                    ? 'bg-teal-500 text-black shadow'
                                    : 'text-gray-400 hover:text-gray-100',
                            )}
                        >
                            {MARKET_LABELS[item]}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
