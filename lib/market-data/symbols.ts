import type { AShareMarket, CanonicalAShareSymbol } from './types';

const A_SHARE_CODE = /^([0-9]{6})$/;
const PREFIXED_CODE = /^(SH|SZ)[.]?([0-9]{6})$/;
const SUFFIXED_CODE = /^([0-9]{6})[.](SH|SS|SZ)$/;

function inferMarket(ticker: string): AShareMarket | null {
    if (/^(5|6|9)/.test(ticker)) return 'SH';
    if (/^(0|1|2|3)/.test(ticker)) return 'SZ';
    return null;
}

export function normalizeAShareSymbol(input: string): CanonicalAShareSymbol | null {
    const value = input.trim().toUpperCase().replace(/\s+/g, '');
    if (!value) return null;

    let ticker: string | undefined;
    let market: AShareMarket | undefined;

    const prefixed = value.match(PREFIXED_CODE);
    if (prefixed) {
        market = prefixed[1] as AShareMarket;
        ticker = prefixed[2];
    }

    const suffixed = value.match(SUFFIXED_CODE);
    if (!ticker && suffixed) {
        ticker = suffixed[1];
        market = suffixed[2] === 'SZ' ? 'SZ' : 'SH';
    }

    const plain = value.match(A_SHARE_CODE);
    if (!ticker && plain) {
        ticker = plain[1];
        market = inferMarket(ticker) ?? undefined;
    }

    if (!ticker || !market) return null;

    return {
        symbol: `${ticker}.${market}`,
        ticker,
        market,
        exchange: market === 'SH' ? 'SSE' : 'SZSE',
        quoteCode: `${market.toLowerCase()}${ticker}`,
        eastmoneySecid: `${market === 'SH' ? '1' : '0'}.${ticker}`,
    };
}

export function isAShareSymbol(input: string): boolean {
    return normalizeAShareSymbol(input) !== null;
}

export function toAShareTradingViewSymbol(symbol: CanonicalAShareSymbol): string {
    return `${symbol.exchange}:${symbol.ticker}`;
}
