import TradingViewWidget from "@/components/TradingViewWidget";
import SectorHeatmap from "@/components/market/SectorHeatmap";
import MarketMovers from "@/components/market/MarketMovers";
import NewsGrid from "@/components/watchlist/NewsGrid";
import {
    HEATMAP_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
    TOP_STORIES_WIDGET_CONFIG,
} from "@/lib/constants";
import { getActiveMarket } from "@/lib/market-data/market-server";
import {
    getAShareBoards,
    getAShareMarketMovers,
    getAShareNews,
} from "@/lib/market-data/a-share";
import type { AShareBoard, AShareMarketRow } from "@/lib/market-data/types";

const SCRIPT_URL = "https://s3.tradingview.com/external-embedding/embed-widget-";

async function USMarketDashboard() {
    return (
        <div className="flex min-h-screen home-wrapper">
            <section className="grid w-full gap-8 home-section">
                <div className="md:col-span-1 xl:col-span-1">
                    <TradingViewWidget
                        title="市场概览"
                        scriptUrl={`${SCRIPT_URL}market-overview.js`}
                        config={MARKET_OVERVIEW_WIDGET_CONFIG}
                        className="custom-chart"
                        height={600}
                    />
                </div>
                <div className="md-col-span xl:col-span-2">
                    <TradingViewWidget
                        title="股票热力图"
                        scriptUrl={`${SCRIPT_URL}stock-heatmap.js`}
                        config={HEATMAP_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
            </section>
            <section className="grid w-full gap-8 home-section">
                <div className="h-full md:col-span-1 xl:col-span-2">
                    <TradingViewWidget
                        scriptUrl={`${SCRIPT_URL}market-quotes.js`}
                        config={MARKET_DATA_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
                <div className="h-full md:col-span-1 xl:col-span-1">
                    <TradingViewWidget
                        scriptUrl={`${SCRIPT_URL}timeline.js`}
                        config={TOP_STORIES_WIDGET_CONFIG}
                        height={600}
                    />
                </div>
            </section>
        </div>
    );
}

async function AShareDashboard() {
    const [industry, concept, movers, news] = await Promise.allSettled([
        getAShareBoards('industry'),
        getAShareBoards('concept'),
        getAShareMarketMovers(40),
        getAShareNews(9),
    ]);

    const industryBoards: AShareBoard[] = industry.status === 'fulfilled' ? industry.value.data : [];
    const conceptBoards: AShareBoard[] = concept.status === 'fulfilled' ? concept.value.data : [];
    const moverRows: AShareMarketRow[] = movers.status === 'fulfilled' ? movers.value.data : [];
    const newsItems = news.status === 'fulfilled' ? news.value.data : [];

    return (
        <div className="flex min-h-screen home-wrapper">
            <section className="grid w-full gap-8 home-section">
                <div className="md:col-span-1 xl:col-span-2">
                    <SectorHeatmap
                        title="行业板块热力图"
                        boards={industryBoards}
                        market="cn"
                        emptyText="暂时无法获取行业板块数据，请稍后重试"
                    />
                </div>
                <div className="md:col-span-1 xl:col-span-1">
                    <MarketMovers
                        title="涨幅榜"
                        rows={moverRows}
                        market="cn"
                        emptyText="暂时无法获取涨幅榜数据，请稍后重试"
                    />
                </div>
            </section>

            <section className="grid w-full gap-8 home-section">
                <div className="md:col-span-1 xl:col-span-3">
                    <SectorHeatmap
                        title="概念板块热力图"
                        boards={conceptBoards}
                        market="cn"
                        emptyText="暂时无法获取概念板块数据，请稍后重试"
                    />
                </div>
            </section>

            <section className="w-full">
                {newsItems.length > 0 ? (
                    <NewsGrid news={newsItems} />
                ) : (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-sm text-gray-500">
                        暂时无法获取 A 股资讯，请稍后重试
                    </div>
                )}
            </section>
        </div>
    );
}

const Home = async () => {
    const market = await getActiveMarket();
    return market === 'cn' ? <AShareDashboard /> : <USMarketDashboard />;
};

export default Home;
