# 🌍 Market Support & Limitations

OpenStock supports stocks from multiple exchanges worldwide, but there are important limitations to be aware of based on our data providers (Finnhub & TradingView).

## ✅ Fully Supported Markets

### Americas
- **US**: NASDAQ, NYSE, AMEX (symbols like `AAPL`, `MSFT`)
- **Canada**: TSX (symbols like `RY.TO`)
- **Brazil**: BMFBOVESPA (symbols like `VALE3.SA`)
- **Mexico**: BMV (symbols like `ASUR.MX`)
- **Argentina**: BCBA (symbols like `BMA.BA`)

### Europe
- **UK**: LSE (symbols like `BARC.L`)
- **France**: EURONEXT (symbols like `AIR.PA`)
- **Germany**: XETRA (symbols like `SAP.DE`)
- **Sweden**: OMXSTO (symbols like `ERIC-B.ST`)
- **Spain**: BMAD (symbols like `REPSOL.MC`)
- **Italy**: EURONEXT Milan (symbols like `ENI.MI`)
- **Belgium**: EURONEXT (symbols like `GIB.BR`)
- **Denmark**: OMXCOPENHAGEN (symbols like `ISH.CO`)
- **Finland**: OMXHEX (symbols like `NOKIA.HE`)
- **Greece**: ATHEX (symbols like `ETE.ATH`)
- **Ireland**: ISE (symbols like `RY.IR`)
- **Netherlands**: EURONEXT (symbols like `ING.AS`)
- **Norway**: OMXOSLO (symbols like `EQNR.OL`)
- **Poland**: WSE (symbols like `PZU.WA`)
- **Portugal**: EURONEXT (symbols like `BCP.LI`)
- **Switzerland**: SIX (symbols like `NESN.SW`)

### Asia-Pacific
- **Taiwan**: TWSE (symbols like `2330.TW`), TPEX (symbols like `6488.TWO`)
- **Hong Kong**: HKEX (symbols like `0700.HK`)
- **Japan**: TSE (symbols like `7203.T`)
- **South Korea**: KRX (symbols like `005930.KS`), KOSDAQ (symbols like `010000.KQ`)
- **Singapore**: SGX (symbols like `U11.SI`)
- **Australia**: ASX (symbols like `CBA.AX`)
- **New Zealand**: NZX (symbols like `FBU.NZ`)
- **India**: NSE (symbols like `INFY.NS`), BSE (symbols like `INFY.BO`)
- **Thailand**: SET (symbols like `ADVANC.BK`)
- **Malaysia**: KLSE (symbols like `1023.KL`)
- **Philippines**: PSE (symbols like `JFC.PH`)
- **Indonesia**: IDX (symbols like `BBCA.JK`)

### Middle East & Africa
- **Israel**: TASE (symbols like `TEVA.TA`)
- **South Africa**: JSE (symbols like `NPN.JO`)
- **Saudi Arabia**: TASI (limited support)
- **UAE**: ADX (limited support)

## ⚠️ Known Limitations

### TradingView Widget Limitations

TradingView's free tier embeddable widgets have several restrictions:

1. **International Markets**: Some symbols, especially from emerging markets (India NSE, Vietnam, etc.), may show:
   - "This symbol is only available on TradingView" error
   - Missing charts or company profile data
   - Empty technical analysis indicators

2. **Affected Markets**:
   - India (NSE/BSE): Free tier support is limited
   - Vietnam, Philippines, Indonesia: Partial or no support
   - Emerging market stocks: Often require paid subscription

3. **Why This Happens**:
   - TradingView's free widget tier has limited symbol availability
   - Some exchanges require commercial licensing
   - High-volume markets get priority in free tier

### Finnhub API Limitations

1. **Free Tier**:
   - Supports basic quote and company data for most exchanges
   - Real-time data delayed by 15+ minutes for non-US stocks
   - Rate limited to 60 API calls per minute
   - No access to historical minute-level bars

2. **Market-Specific**:
   - India NSE/BSE: Available but with delays
   - Chinese A-shares: Not available on the free tier (verified: `/quote` returns
     `You don't have access to this resource.` for `600519.SS`)
   - Forex: Not available
   - Cryptocurrencies: Not available

## 🇨🇳 A-share Support

A-shares are served by a dedicated provider layer (`lib/market-data/`) instead of
Finnhub, because Finnhub's free tier has no A-share access. Each operation has its
own fallback chain, a circuit breaker and an explicit stale-cache path.

Symbols are normalized internally to `600519.SH` / `000001.SZ`. These aliases are
all accepted and collapse to the same canonical symbol:

```
600519    sh600519    sh.600519    600519.SH    600519.SS
000001    sz000001    sz.000001    000001.SZ
```

### Provider chains

| Operation | Primary | Fallback 1 | Fallback 2 | Final fallback |
| --- | --- | --- | --- | --- |
| Search | Tencent `smartbox` | Sina `suggest` | Eastmoney `suggest` | local `astock` |
| Quote | Eastmoney `push2` | Tencent `qt.gtimg.cn` | Sina `hq.sinajs.cn` | local `astock` |
| Profile | Eastmoney `push2` | Tencent `qt.gtimg.cn` | Sina `hq.sinajs.cn` | local `astock` |
| Daily K-line | Eastmoney `push2his` | Tencent `fqkline` | local `astock` (BaoStock, EOD) | — |
| Whole-market stock heatmap | Eastmoney `clist` (56 paginated pages) | served from stale cache | — | — |
| Industry/concept boards | Eastmoney `clist` | served from stale cache | — | — |
| Market gainers snapshot | Eastmoney `clist` | curated blue-chip quotes | — | — |
| A-share news | Eastmoney `getNewsByColumns` (col 349) | Tencent CSI300 feed (`type=2`) | Eastmoney 7x24 `getFastNewsList` | stale cache |

Behavior guarantees:

- Every provider call has an `AbortController` timeout; a slow provider cannot hang
  an SSR request.
- After 3 consecutive failures a provider's circuit opens for 60s and is skipped.
- If every provider fails, a stale cached value may be served **only** with
  `stale: true`. The UI renders it as `缓存数据` instead of pretending it is live.
- If no provider and no cache is available the operation fails loudly; it never
  returns `0` as a price.

### Verification

```bash
npx astock search 贵州茅台 --format json     # local BaoStock/A-share CLI
RUN_MARKET_INTEGRATION=1 npm run test:market # live provider smoke test
```

Expected: search resolves `贵州茅台` → `600519.SH`, quote returns a positive CNY
price, profile returns the company name, and daily K-line returns bars.

### Market switch

A toggle in the header switches the whole app between A-share and US mode. The
choice is persisted in the `openstock_market` cookie and applies to:

- the dashboard (heatmap, boards, movers and news all swap source)
- search results (A-share mode returns A-share symbols only, US mode the reverse)
- news on the watchlist page
- TradingView locale and the up/down colour convention

A-share mode renders its own heatmap, board lists, movers table and news grid
from the providers above, so it does not depend on TradingView's China coverage.
The stock heatmap pulls the whole market (~5,200 tradable names) in 56 paginated
`clist` requests with a concurrency of 8, measured at ~600ms end to end, then
caches for 5 minutes. It is drawn on a Canvas as a binary-split treemap: area is
weighted by float market cap, colour by daily change, grouped by industry, and
the tiles are clickable through to the stock page.
TradingView is still used for an individual A-share symbol's chart, which is
addressable as `SSE:600519` / `SZSE:000001`.

A-share mode follows the Chinese convention of red for gains and green for
losses; US mode keeps the Western convention.

### ⚠️ Licensing and deployment boundary

The Eastmoney, Tencent and Sina endpoints are **undocumented public endpoints**.
They carry no SLA, grant no redistribution rights, and may rate-limit or change
without notice. They are wired for **local / personal use only**.

Before any public deployment you must either:

1. Set `ENABLE_UNOFFICIAL_MARKET_DATA=false` and plug in a licensed provider
   (Tushare Pro with the relevant permissions, Wind, Choice, iFinD, or a licensed
   cloud market-data service), or
2. obtain explicit redistribution rights for each upstream source.

BaoStock (used by `astock`) is EOD-only and equally not licensed for redistribution,
so it is a historical-data fallback, never a real-time source.

## 🔧 Troubleshooting

### "This symbol is only available on TradingView"

**What this means**: TradingView's embedded widgets don't support this symbol.

**What you can still do**:
- ✅ Search for the stock using Finnhub data
- ✅ View company profile from Finnhub
- ✅ Add to watchlist (data updates available)
- ✅ See market news from Finnhub
- ❌ View interactive TradingView charts
- ❌ See technical analysis indicators from TradingView

**Solutions**:
1. **For Personal Use**: Upgrade to Finnhub/TradingView paid plans
2. **For Self-Hosted Deployments**: 
   - Upgrade API keys in your `.env` file
   - Consider alternative chart libraries (e.g., Lightweight Charts, Chart.js)

### Charts Don't Load

**Possible causes**:
- Symbol not supported on TradingView
- Network connectivity issue
- TradingView API rate limiting

**Troubleshooting**:
1. Check browser console for errors (F12)
2. Verify symbol exists on Finnhub search
3. Try a US stock (e.g., AAPL) to confirm basic functionality
4. Check your internet connection

## 🚀 Future Improvements

The OpenStock community is working on:

- [ ] Fallback chart libraries for unsupported symbols
- [ ] Market availability checker before displaying widgets
- [ ] Alternative data sources for emerging markets
- [ ] Forex support
- [ ] Cryptocurrency support
- [ ] Custom indicators and drawing tools
- [ ] Paper trading features

## 💡 Contributing

If you discover:
- A market that should be supported
- An exchange with incorrect symbol mapping
- Alternative data providers we should consider

Please [open an issue](https://github.com/Open-Dev-Society/OpenStock/issues) with:
- Exchange name and country
- Example stock symbols
- Expected vs. actual behavior
- Links to Finnhub/TradingView documentation

## 📚 References

- [Finnhub API Documentation](https://finnhub.io/docs/api)
- [TradingView Widget Documentation](https://www.tradingview.com/pine-script-docs/)
- [Supported Finnhub Exchanges](https://finnhub.io/docs/api/symbol-lookup)

---

**Disclaimer**: Nothing here is financial advice. Market data availability depends on provider terms and your subscription tier. Always verify current data before making investment decisions. OpenStock is community-built and not a brokerage.