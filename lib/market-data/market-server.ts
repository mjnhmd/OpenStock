import { cookies } from 'next/headers';
import { MARKET_COOKIE, parseMarket, type Market } from './market';

export async function getActiveMarket(): Promise<Market> {
    const store = await cookies();
    return parseMarket(store.get(MARKET_COOKIE)?.value);
}
