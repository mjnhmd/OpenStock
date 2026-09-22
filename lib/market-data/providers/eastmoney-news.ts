import { fetchJson } from '../http';
import type { AShareProvider, ProviderContext } from '../types';

const ARTICLE_URL = 'https://np-listapi.eastmoney.com/comm/web/getNewsByColumns';
const FLASH_URL = 'https://np-weblist.eastmoney.com/comm/web/getFastNewsList';
const HEADERS = {
    Accept: 'application/json,text/plain,*/*',
    Referer: 'https://finance.eastmoney.com/',
    'User-Agent': 'Mozilla/5.0',
};

interface EastmoneyArticle {
    code?: string;
    showTime?: string;
    title?: string;
    mediaName?: string;
    summary?: string;
    image?: string;
    url?: string;
    uniqueUrl?: string;
}

interface EastmoneyArticleResponse {
    code?: string;
    data?: { list?: EastmoneyArticle[] };
}

interface EastmoneyFlashItem {
    code?: string;
    showTime?: string;
    title?: string;
    summary?: string;
    image?: string[];
}

interface EastmoneyFlashResponse {
    code?: string;
    data?: { fastNewsList?: EastmoneyFlashItem[] };
}

/** Stable 32-bit FNV-1a hash: Eastmoney codes exceed Number.MAX_SAFE_INTEGER. */
export function stableNumericId(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function parseChinaTimeToUnix(value?: string): number {
    if (!value) return Math.floor(Date.now() / 1000);
    const parsed = Date.parse(`${value.replace(' ', 'T')}+08:00`);
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(Date.now() / 1000);
}

const toHttps = (url: string) => url.replace(/^http:\/\//, 'https://');

function mapArticle(article: EastmoneyArticle): MarketNewsArticle | null {
    if (!article.code || !article.title) return null;
    const url = article.uniqueUrl || article.url;
    if (!url) return null;
    return {
        id: stableNumericId(article.code),
        headline: article.title,
        summary: article.summary?.trim() || article.title,
        source: article.mediaName || '东方财富',
        url: toHttps(url),
        datetime: parseChinaTimeToUnix(article.showTime),
        category: 'A股',
        related: 'A股',
        image: article.image || undefined,
    };
}

function mapFlash(item: EastmoneyFlashItem): MarketNewsArticle | null {
    if (!item.code || !item.title) return null;
    return {
        id: stableNumericId(item.code),
        headline: item.title,
        summary: item.summary?.trim() || item.title,
        source: '东方财富7×24',
        url: `https://finance.eastmoney.com/a/${item.code}.html`,
        datetime: parseChinaTimeToUnix(item.showTime),
        category: 'A股',
        related: 'A股',
        image: Array.isArray(item.image) ? item.image[0] : undefined,
    };
}

async function fetchArticles(context: ProviderContext, limit: number): Promise<MarketNewsArticle[]> {
    const fields = 'code,showTime,title,mediaName,summary,image,url,uniqueUrl';
    const url = `${ARTICLE_URL}?client=web&biz=web_news_col&column=349&order=1&needInteractData=0`
        + `&page_index=1&page_size=${Math.min(limit, 50)}&req_trace=1&fields=${fields}&types=1,20`;
    const payload = await fetchJson<EastmoneyArticleResponse>(url, context, { headers: HEADERS });
    if (payload.code !== '1') throw new Error('Eastmoney news returned a non-success code');
    const list = payload.data?.list ?? [];
    return list.flatMap((article) => {
        const mapped = mapArticle(article);
        return mapped ? [mapped] : [];
    });
}

async function fetchFlash(context: ProviderContext, limit: number): Promise<MarketNewsArticle[]> {
    const url = `${FLASH_URL}?client=web&biz=web_724&fastColumn=104&sortEnd=&pageSize=${Math.min(limit, 50)}&pageIndex=1&req_trace=1`;
    const payload = await fetchJson<EastmoneyFlashResponse>(url, context, { headers: HEADERS });
    if (payload.code !== '1') throw new Error('Eastmoney flash news returned a non-success code');
    const list = payload.data?.fastNewsList ?? [];
    return list.flatMap((item) => {
        const mapped = mapFlash(item);
        return mapped ? [mapped] : [];
    });
}

export const eastmoneyNewsProvider: AShareProvider = {
    name: 'eastmoney',

    async news(context: ProviderContext, limit = 12): Promise<MarketNewsArticle[]> {
        try {
            const articles = await fetchArticles(context, limit);
            if (articles.length > 0) return articles;
        } catch (error) {
            console.warn('[market-data] eastmoney article feed failed, trying 7x24 flash', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return fetchFlash(context, limit);
    },
};

export const eastmoneyFlashProvider: AShareProvider = {
    name: 'eastmoney-flash',

    async news(context: ProviderContext, limit = 12): Promise<MarketNewsArticle[]> {
        return fetchFlash(context, limit);
    },
};
