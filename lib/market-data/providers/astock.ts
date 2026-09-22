import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
    AShareKlineBar,
    AShareProvider,
    AShareProfile,
    AShareQuote,
    AShareSearchResult,
    CanonicalAShareSymbol,
    ProviderContext,
} from '../types';

const execFileAsync = promisify(execFile);
const ASTOCK_BIN = process.env.ASTOCK_BIN;

interface AstockSearchRow {
    code: string;
    name: string;
}

interface AstockKlineRow {
    date: string;
    code: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount?: number | null;
    pctChg?: number | null;
    turn?: number | null;
    preclose?: number | null;
    quoteTime?: string;
    isRealtime?: boolean;
}

async function runAstock(args: string[], context: ProviderContext, timeoutMs = 6000): Promise<string> {
    if (!ASTOCK_BIN) throw new Error('ASTOCK_BIN is not configured');
    const { stdout } = await execFileAsync(ASTOCK_BIN, args, {
        timeout: timeoutMs,
        signal: context.signal,
        maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
}

function parseJson<T>(value: string): T {
    return JSON.parse(value) as T;
}

function toStartDate(days = 10): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
}

async function getLatestBar(symbol: CanonicalAShareSymbol, context: ProviderContext) {
    const rows = parseJson<AstockKlineRow[]>(await runAstock([
        'kline', symbol.symbol,
        '--start', toStartDate(),
        '--end', 'today',
        '--adjust', 'qfq',
        '--format', 'json',
        '--limit', '1',
    ], context));
    const row = rows.at(-1);
    if (!row) throw new Error('Astock returned no quote rows');
    return row;
}

export const astockProvider: AShareProvider = {
    name: 'astock',

    async search(query: string, context: ProviderContext): Promise<AShareSearchResult[]> {
        const rows = parseJson<AstockSearchRow[]>(await runAstock([
            'search', query,
            '--limit', '20',
            '--format', 'json',
        ], context));
        return rows.flatMap((row) => {
            const match = row.code.match(/^(sh|sz)\.(\d{6})$/i);
            if (!match || !row.name) return [];
            const market = match[1].toLowerCase();
            return [{
                symbol: `${match[2]}.${market === 'sh' ? 'SH' : 'SZ'}`,
                name: row.name,
                exchange: market === 'sh' ? 'SSE' : 'SZSE',
                type: 'A股',
                currency: 'CNY' as const,
                provider: 'astock' as const,
            }];
        });
    },

    async quote(symbol: CanonicalAShareSymbol, context: ProviderContext): Promise<AShareQuote> {
        const row = await getLatestBar(symbol, context);
        const previousClose = row.preclose ?? row.close;
        const change = Number((row.close - previousClose).toFixed(4));
        const changePercent = row.pctChg ?? (previousClose === 0 ? 0 : Number(((change / previousClose) * 100).toFixed(4)));
        return {
            symbol: symbol.symbol,
            name: symbol.ticker,
            c: row.close,
            d: change,
            dp: changePercent,
            price: row.close,
            change,
            changePercent,
            previousClose,
            currency: 'CNY',
            timestamp: row.quoteTime ? Date.parse(`${row.quoteTime}+08:00`) : Date.now(),
            provider: 'astock',
        };
    },

    async profile(symbol: CanonicalAShareSymbol, context: ProviderContext): Promise<AShareProfile> {
        const results = await this.search?.(symbol.ticker, context) ?? [];
        const result = results.find((item) => item.symbol === symbol.symbol);
        return {
            symbol: symbol.symbol,
            name: result?.name || symbol.ticker,
            exchange: symbol.exchange,
            currency: 'CNY',
            provider: 'astock',
        };
    },

    async kline(
        symbol: CanonicalAShareSymbol,
        options: { limit?: number; start?: string; end?: string },
        context: ProviderContext,
    ): Promise<AShareKlineBar[]> {
        const rows = parseJson<AstockKlineRow[]>(await runAstock([
            'kline', symbol.symbol,
            '--start', options.start || toStartDate((options.limit ?? 120) * 2),
            '--end', options.end || 'today',
            '--adjust', 'qfq',
            '--format', 'json',
            '--limit', String(options.limit ?? 120),
        ], context));
        return rows.map((row) => ({
            date: row.date,
            symbol: symbol.symbol,
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            volume: row.volume,
            amount: row.amount ?? undefined,
            changePercent: row.pctChg ?? undefined,
            turnover: row.turn ?? undefined,
            provider: 'astock',
        }));
    },
};
