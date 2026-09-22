import { describe, expect, it } from 'vitest';
import {
    DEFAULT_MARKET,
    changeBadgeClass,
    changeToneClass,
    getMarketTheme,
    parseMarket,
} from '@/lib/market-data/market';

describe('market selection', () => {
    it('defaults to A-share mode when no cookie is present', () => {
        expect(DEFAULT_MARKET).toBe('cn');
        expect(parseMarket(undefined)).toBe('cn');
        expect(parseMarket(null)).toBe('cn');
        expect(parseMarket('')).toBe('cn');
    });

    it('only switches to US for an explicit us value', () => {
        expect(parseMarket('us')).toBe('us');
        expect(parseMarket('cn')).toBe('cn');
        expect(parseMarket('US')).toBe('cn');
        expect(parseMarket('garbage')).toBe('cn');
    });

    it('uses Chinese colour convention for A-shares and US convention for US', () => {
        expect(getMarketTheme('cn').up).toContain('red');
        expect(getMarketTheme('cn').down).toContain('green');
        expect(getMarketTheme('us').up).toContain('green');
        expect(getMarketTheme('us').down).toContain('red');
    });

    it('maps currency and locale per market', () => {
        expect(getMarketTheme('cn').currency).toBe('CNY');
        expect(getMarketTheme('cn').tradingViewLocale).toBe('zh_CN');
        expect(getMarketTheme('us').currency).toBe('USD');
        expect(getMarketTheme('us').tradingViewLocale).toBe('en');
    });

    it('classifies change values', () => {
        expect(changeToneClass('cn', 2.5)).toBe(getMarketTheme('cn').up);
        expect(changeToneClass('cn', -2.5)).toBe(getMarketTheme('cn').down);
        expect(changeToneClass('cn', 0)).toBe(getMarketTheme('cn').flat);
        expect(changeToneClass('us', 2.5)).toBe(getMarketTheme('us').up);
        expect(changeBadgeClass('cn', 2.5)).toContain('red');
        expect(changeBadgeClass('cn', -2.5)).toContain('green');
        expect(changeBadgeClass('cn', null)).toContain('gray');
    });
});
