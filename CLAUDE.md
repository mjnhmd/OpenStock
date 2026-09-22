# OpenStock Local Development Rules

## Project
- Next.js 15 / React 19 / TypeScript / MongoDB.
- Runtime: Node.js 20 LTS. Use `nvm use 20`.
- Package manager: npm with `package-lock.json`; use `npm ci` unless intentionally updating dependencies.
- Do not introduce a second package manager.

## Commands
- Dev: `npm run dev`
- Tests: `npm test`
- Build: `npm run build`
- DB check: `npm run test:db`
- Inngest dev: `npx inngest-cli@1.19.1 dev`

## Architecture Rules
- UI components must not call market-data providers directly.
- Market data is server-only unless a public browser-safe URL is explicitly required.
- All market-data access goes through provider adapters under `lib/market-data/providers/`.
- Provider selection and fallback live in `lib/market-data/`; do not duplicate fallback logic in pages/actions.
- Every provider must implement a shared TypeScript interface and return normalized domain types.
- Fallback must be observable through structured logs: requested operation, attempted provider, duration, success/failure and final provider.
- Provider calls require an AbortController timeout. Never allow an external request to hang an SSR request indefinitely.
- Cache quote data only for a short period. Historical/profile/news data may use longer TTLs.
- A stale cached result may be returned during provider failure only when it is explicitly marked `stale`; never label stale data as real-time.
- Unofficial/scraped providers must be centrally configurable and disabled for public deployment through environment configuration.
- Do not use a provider's free endpoint to redistribute exchange data without validating its terms.

## A-share Requirements
- Normalize A-share symbols to canonical form internally: `600519.SH`, `000001.SZ`.
- Accept aliases: `600519`, `sh600519`, `sh.600519`, `600519.SH`, `600519.SS`, `000001`, `sz000001`, `sz.000001`.
- TradingView mapping: Shanghai -> `SSE`, Shenzhen -> `SZSE`.
- UI currency for A-shares must be CNY, never USD.
- Search, quote, profile and history must each have independent fallback chains.
- If all providers fail, return an explicit typed failure; do not fabricate prices or show zero as a valid quote.
- TradingView charts may remain an embedded external dependency, but core stock search/watchlist data must not depend only on TradingView.

## Chinese UI
- Default UI language is Simplified Chinese.
- New user-visible text must not be hardcoded inline when it can live in the shared text catalog.
- Keep provider names and raw API error messages out of the primary user-facing UI.
- Preserve numeric/date formatting appropriate for China (`zh-CN`, CNY).

## Scope Discipline
- Do not refactor unrelated code.
- Do not translate provider data automatically unless explicitly part of the feature.
- Keep existing US/global behavior working while adding A-share support.
- Stage only files required by the requested feature.

## Verification Gates
- Unit tests for symbol normalization and fallback behavior.
- Integration smoke test for each enabled A-share provider where network permits.
- `npm test`, `npm run build`, and real interaction on `http://localhost:3000`.
- Report provider used, fallback used, stale status and final user-visible result.

## Multi-session Context
- Feature context: `docs/features/a-share-zh-fallback/context.md`.
- Update it after requirement changes, architecture decisions, provider changes and verification results.
