# 功能上下文：A 股多源数据与中文界面

## 用户目标
让本地 OpenStock 能搜索、查看、加入自选并查看 A 股行情，同时默认使用简体中文。
A 股数据不能依赖单一免费接口，必须具备多数据源 fallback，并在数据过期时明确标识。

## 原始需求与验收标准
- 支持典型 A 股代码：`600519`、`sh600519`、`600519.SH`、`000001.SZ`。
- 搜索“贵州茅台”能找到 `600519.SH`。
- 行情至少有一个可用数据源；单源失败时自动切换。
- 自选股页面能正确显示 A 股名称、价格、涨跌幅和 CNY。
- 所有源失败时明确报错，不能把失败当 0 元。
- 主要页面和操作默认简体中文。
- 保留现有美股/全球股票功能。

## 当前状态
已完成实现并通过验证，待推送到 GitHub fork。

## 关键决策与原因
- **独立数据层**：新增 `lib/market-data/`，页面与组件不再直接依赖 Finnhub。
  原因：Finnhub 免费 Key 对 A 股返回 403，换源不能影响上层页面。
- **符号规范化**：内部统一 `600519.SH` / `000001.SZ`，兼容 `600519.SS`、`sh600519`、
  `sh.600519` 等别名。原因：上游各源使用不同格式，页面不能各自猜交易所。
- **按操作拆分 fallback 链**，而不是单一全局顺序。原因：各源能力不均
  （腾讯无公司资料、新浪无复权 K 线、BaoStock 无实时）。
- **熔断 + stale 标识**：连续 3 次失败熔断 60s；全部失败时可返回带 `stale: true`
  的缓存，UI 显示“缓存数据”。原因：不能把过期数据伪装成实时。
- **失败不返回 0**：拿不到行情时抛错并在 UI 提示，避免 0 被当成有效价格。
- **中文采用轻量文案目录 + 直改**：只要求默认中文、无中英切换需求，
  不引入 `next-intl` 或路由级 i18n，降低复杂度。
- **非官方源加环境开关**：`ENABLE_UNOFFICIAL_MARKET_DATA`，公开部署可一键关闭。

## 需求调整
- 增加 GitHub fork 与提交要求：最终代码推送到 `mjnhmd/OpenStock`。

## Bug 根因与修复
1. **Inngest 工作流全部注册失败**
   - 现象：Inngest Dev Server 报 `sdk_version_denied`；降级 CLI 后报
     `A trigger must supply an event name or a cron schedule`。
   - 根因：项目 pin 的 `inngest@3.47.0` 与当时 `inngest-cli@latest` 不兼容，
     且 `createFunction` 使用了运行时无法解析的 trigger 签名。
   - 修复：升级 SDK 到 `inngest@3.54.2`，函数签名改为
     `createFunction({ id }, trigger, handler)`，CLI 固定 `1.19.1`。
   - 证据：修改前 `PUT /api/inngest 400`，修改后 `PUT /api/inngest 200`。

2. **东方财富搜索接口不稳定**
   - 现象：同一 URL，`curl` 返回正确 JSON，Node `fetch` 偶发返回 jQuery JSONP
     （内容是用户搜索而非股票搜索）。
   - 处理：`fetchJson` 增加 JSONP 解析；搜索链把东方财富降到第 3 位
     （腾讯 → 新浪 → 东方财富），并对空结果/异常结构抛出以便继续 fallback。

3. **自选股价格失败时显示 0**
   - 修复：`getWatchlistData` 返回 `null` 而非 0，并附带 `provider` / `stale`。

4. **构建与 dev server 同时运行导致 `.next` 损坏**
   - 处理：先停 dev server 再 `npm run build`，验证流程改为串行。

## 影响范围
- 新增：`lib/market-data/**`、`__tests__/a-share-*.test.ts`、
  `__tests__/market-data-fallback.test.ts`、`CLAUDE.md`、`.env.example`、本目录。
- 修改：`lib/actions/finnhub.actions.ts`、`lib/actions/watchlist.actions.ts`、
  `lib/utils.ts`、`lib/constants.ts`、`app/layout.tsx`、auth 页面、
  `app/(root)/**`、`components/**`（导航、搜索、自选、提醒、新闻）、
  `lib/inngest/functions.ts`、`package.json`、`package-lock.json`、
  `.gitignore`、`README.md`、`MARKET_SUPPORT.md`。

## 验证证据
数据源实测（2026-09-22，盘中）：
- 东方财富 `push2`：`600519` 返回 `f43=1254.52`，昨收 `1252.57`，总市值 `f116`
  可用；一次可取全部 6010 根日线。
- 腾讯 `qt.gtimg.cn`：GBK 编码，`~` 分隔，`[3]`最新价 `[4]`昨收 `[30]`时间。
- 新浪 `hq.sinajs.cn`：需 `Referer: https://finance.sina.com.cn`，否则 403。
- 三源同一时刻价格一致（`1254.52 / 1252.57`），可用于互校。
- BaoStock/`astock`：裸 TCP，纯 EOD，`600519` 历史数据可查；搜索存在代码歧义
  （`000001` 会命中基金），因此置于最后。

自动化验证：
- `npm test` → 6 passed / 2 skipped，95 passed / 14 skipped。
- `npm run test:market` → 10 passed（真实网络，覆盖 search/quote/profile/kline、
  兼容 action、以及每个 provider 独立可用性）。
- `npm run build` → 通过，15 个路由全部生成。

真实交互验证（Better Auth 真实 session + curl SSR）：
- `/sign-in` 渲染：欢迎回来 / 邮箱 / 密码 / 忘记密码 / 登录 / 创建账号。
- `/sign-up` 渲染：注册并设置偏好 / 姓名 / 邮箱 / 国家地区 / 投资目标 / 风险偏好。
- `GET /` → 200，包含 `zh_CN`、`SSE:600519`、`SZSE:300750`、`A股热门`。
- `GET /stocks/600519`（无后缀别名）→ 200，证明路由层归一化生效。
- `GET /stocks/600519.SH` → 页头显示 `贵州茅台`、`600519.SH`、`¥1,255.98`、`加入自选`。
- `GET /stocks/000001.SZ` → 显示 `平安银行`、`¥11.73`。
- 写入自选后 `GET /watchlist` → 显示 `贵州茅台`、`600519.SH`、
  `创建价格提醒`、`移除自选`、`管理股票`。

未完成的验证门（需说明）：
- 浏览器图形化交互未完成：Computer Use 浏览器控制因
  `Codex auth token is unavailable` 不可用，改用真实 session + SSR HTML 断言。
  TradingView 组件为客户端渲染，其最终视觉需在浏览器中人工确认。
- 未在公网环境验证；非官方源仅限本地/个人使用。

## 已知边界
- 东方财富/腾讯/新浪为未公开接口，无 SLA、无再分发授权，公开部署必须关闭
  `ENABLE_UNOFFICIAL_MARKET_DATA` 或替换为持牌数据源。
- BaoStock 仅 EOD，不能作为实时行情源。
- 北交所代码（如 `920002`）在当前规范化规则下不支持，会返回无效符号。
- 新浪搜索一次仅返回 1 条；腾讯 `smartbox` 同样偏窄，精确匹配优先。
- 新闻仍走 Finnhub，A 股个股新闻未接入新源。

## 已完成
- `CLAUDE.md` 项目规则、`.env.example`、功能上下文文档。
- A 股 provider 抽象、符号规范化、fallback、熔断、缓存与 stale 标识。
- 4 个 provider：东方财富 / 腾讯 / 新浪 / astock。
- 搜索、行情、资料、K 线接入，并兼容现有 action 签名。
- 中文界面、CNY 格式化、TradingView `zh_CN`、A 股热门分组。
- Inngest 注册修复。
- 单元测试 + 集成测试 + 构建 + 真实 session SSR 验证。

## 待完成
- 提交并推送到 `fork/feature/a-share-zh-fallback`。

## 阻塞项
- 无。
