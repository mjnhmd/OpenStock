import { fetchJson } from '../http';
import { parseChinaTimeToUnix, stableNumericId } from './eastmoney-news';
import type { AShareProvider, ProviderContext } from '../types';

const INDEX_NEWS_URL = 'https://proxy.finance.qq.com/ifzqgtimg/appstock/news/info/search';
const CSI300 = 'sh000300';
const MAX_AGE_SECONDS = 24 * 60 * 60;

interface TencentNewsItem {
    id?: string;
    title?: string;
    time?: string;
    url?: string;
    summary?: string;
    src?: string;
    predictTimestamp?: number | string;
    newsThumbImage?: string;
}

interface TencentNewsResponse {
    code?: number;
    data?: {
        data?: TencentNewsItem[];
        symbolsName?: { symbol?: string; name?: string }[];
    };
}

export const tencentNewsProvider: AShareProvider = {
    name: 'tencent',

    async news(context: ProviderContext, limit = 12): Promise<MarketNewsArticle[]> {
        const size = Math.max(1, Math.min(limit, 50));
        const url = `${INDEX_NEWS_URL}?symbol=${CSI300}&type=2&page=1&n=${size}`;
        const payload = await fetchJson<TencentNewsResponse>(url, context);
        if (payload.code !== 0) throw new Error('Tencent index news returned a non-zero code');

        const items = payload.data?.data ?? [];
        const related = payload.data?.symbolsName?.[0]?.name || 'A股';
        const nowSeconds = Math.floor(Date.now() / 1000);

        return items.flatMap((item) => {
            if (!item.title || !item.url) return [];
            const datetime = Number(item.predictTimestamp)
                || parseChinaTimeToUnix(item.time);
            // Reject stale feeds so A-share mode never shows months-old news.
            if (nowSeconds - datetime > MAX_AGE_SECONDS) return [];

            const article: MarketNewsArticle = {
                id: stableNumericId(item.id || item.url),
                headline: item.title,
                summary: item.summary?.trim() || item.title,
                source: item.src || '腾讯财经',
                url: item.url,
                datetime,
                category: 'A股',
                related,
                image: item.newsThumbImage || undefined,
            };
            return [article];
        });
    },
};
