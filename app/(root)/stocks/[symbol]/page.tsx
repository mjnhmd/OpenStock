import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import StockSentimentCard from "@/components/stocks/StockSentimentCard";
import {
    SYMBOL_INFO_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    BASELINE_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";

import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { isStockInWatchlist } from '@/lib/actions/watchlist.actions';
import { getStockSentimentInsights } from '@/lib/actions/adanos.actions';
import { getQuote, getCompanyProfile } from '@/lib/actions/finnhub.actions';
import { isAShareSymbol, normalizeAShareSymbol } from '@/lib/market-data/symbols';
import { formatPrice, formatSymbolForTradingView } from '@/lib/utils';

export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol } = await params;
    const canonicalSymbol = normalizeAShareSymbol(symbol)?.symbol ?? symbol.toUpperCase();
    const tvSymbol = formatSymbolForTradingView(canonicalSymbol);
    const isAShare = isAShareSymbol(canonicalSymbol);
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    const session = await auth.api.getSession({
        headers: await headers()
    });
    const userId = session?.user?.id;
    const [isInWatchlist, sentimentInsights, profile, quote] = await Promise.all([
        userId ? isStockInWatchlist(userId, canonicalSymbol) : Promise.resolve(false),
        isAShare ? Promise.resolve(null) : getStockSentimentInsights(canonicalSymbol),
        getCompanyProfile(canonicalSymbol),
        getQuote(canonicalSymbol),
    ]);

    const quotePrice = quote && 'price' in quote ? quote.price : quote?.c;
    const quoteCurrency = quote && 'currency' in quote && typeof quote.currency === 'string' ? quote.currency : 'USD';
    const quoteStale = Boolean(quote && 'stale' in quote && quote.stale);

    return (
        <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Left column */}
                <div className="flex flex-col gap-6">
                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}symbol-info.js`}
                        config={SYMBOL_INFO_WIDGET_CONFIG(tvSymbol)}
                        height={170}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={CANDLE_CHART_WIDGET_CONFIG(tvSymbol)}
                        className="custom-chart"
                        height={600}
                        allowExpand={true}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}advanced-chart.js`}
                        config={BASELINE_WIDGET_CONFIG(tvSymbol)}
                        className="custom-chart"
                        height={600}
                        allowExpand={true}
                    />
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-white">{profile?.name || canonicalSymbol}</h1>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                <span>{canonicalSymbol}</span>
                                {typeof quotePrice === 'number' && <span>{formatPrice(quotePrice, quoteCurrency)}</span>}
                                {quoteStale && <span className="text-yellow-500">缓存数据</span>}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <WatchlistButton
                                symbol={canonicalSymbol}
                                company={profile?.name || canonicalSymbol}
                                isInWatchlist={isInWatchlist}
                                userId={userId}
                            />
                        </div>
                    </div>

                    {!isAShare && <StockSentimentCard insight={sentimentInsights} />}

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}technical-analysis.js`}
                        config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(tvSymbol)}
                        height={400}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}company-profile.js`}
                        config={COMPANY_PROFILE_WIDGET_CONFIG(tvSymbol)}
                        height={440}
                    />

                    <TradingViewWidget
                        scriptUrl={`${scriptUrl}financials.js`}
                        config={COMPANY_FINANCIALS_WIDGET_CONFIG(tvSymbol)}
                        height={800}
                    />
                </div>
            </section>
        </div>
    );
}
