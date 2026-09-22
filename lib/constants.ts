export const TRADINGVIEW_LOCALE = 'zh_CN';

export const NAV_ITEMS = [
    { href: '/', label: '行情中心' },
    { href: '/search', label: '股票搜索' },
    { href: '/watchlist', label: '自选股' },
    { href: '/api-docs', label: '接口文档' },
];

export const POPULAR_A_SHARE_SYMBOLS = [
    '600519.SH',
    '300750.SZ',
    '000001.SZ',
    '601318.SH',
    '600036.SH',
];

// Sign-up form select options
export const INVESTMENT_GOALS = [
    { value: 'Growth', label: '成长型' },
    { value: 'Income', label: '收益型' },
    { value: 'Balanced', label: '平衡型' },
    { value: 'Conservative', label: '保守型' },
];

export const RISK_TOLERANCE_OPTIONS = [
    { value: 'Low', label: '低风险' },
    { value: 'Medium', label: '中风险' },
    { value: 'High', label: '高风险' },
];

export const PREFERRED_INDUSTRIES = [
    { value: 'Technology', label: '科技' },
    { value: 'Healthcare', label: '医疗健康' },
    { value: 'Finance', label: '金融' },
    { value: 'Energy', label: '能源' },
    { value: 'Consumer Goods', label: '消费' },
];

export const ALERT_TYPE_OPTIONS = [
    { value: 'upper', label: '高于' },
    { value: 'lower', label: '低于' },
];

export const CONDITION_OPTIONS = [
    { value: 'greater', label: '大于 (>)' },
    { value: 'less', label: '小于 (<)' },
];

// TradingView Charts
export const MARKET_OVERVIEW_WIDGET_CONFIG = {
    colorTheme: 'dark', // dark mode
    dateRange: '12M', // last 12 months
    locale: 'en', // US market mode keeps the original English widgets
    largeChartUrl: '', // link to a large chart if needed
    isTransparent: true, // makes background transparent
    showFloatingTooltip: true, // show tooltip on hover
    plotLineColorGrowing: '#0FEDBE', // line color when price goes up
    plotLineColorFalling: '#0FEDBE', // line color when price falls
    gridLineColor: 'rgba(240, 243, 250, 0)', // grid line color
    scaleFontColor: '#DBDBDB', // font color for scale
    belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)', // fill under line when growing
    belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)', // fill under line when falling
    belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
    belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
    symbolActiveColor: 'rgba(15, 237, 190, 0.05)', // highlight color for active symbol
    tabs: [
        {
            title: 'Financial',
            symbols: [
                { s: 'NYSE:JPM', d: 'JPMorgan Chase' },
                { s: 'NYSE:WFC', d: 'Wells Fargo Co New' },
                { s: 'NYSE:BAC', d: 'Bank Amer Corp' },
                { s: 'NYSE:HSBC', d: 'Hsbc Hldgs Plc' },
                { s: 'NYSE:C', d: 'Citigroup Inc' },
                { s: 'NYSE:MA', d: 'Mastercard Incorporated' },
            ],
        },
        {
            title: 'Technology',
            symbols: [
                { s: 'NASDAQ:AAPL', d: 'Apple' },
                { s: 'NASDAQ:GOOGL', d: 'Alphabet' },
                { s: 'NASDAQ:MSFT', d: 'Microsoft' },
                { s: 'NASDAQ:META', d: 'Meta Platforms' },
                { s: 'NYSE:ORCL', d: 'Oracle Corp' },
                { s: 'NASDAQ:INTC', d: 'Intel Corp' },
            ],
        },
        {
            title: 'Services',
            symbols: [
                { s: 'NASDAQ:AMZN', d: 'Amazon' },
                { s: 'NYSE:BABA', d: 'Alibaba Group Hldg Ltd' },
                { s: 'NYSE:T', d: 'At&t Inc' },
                { s: 'NYSE:WMT', d: 'Walmart' },
                { s: 'NYSE:V', d: 'Visa' },
            ],
        },
    ],
    support_host: 'https://www.tradingview.com', // TradingView host
    backgroundColor: '#141414', // background color
    width: '100%', // full width
    height: 600, // height in px
    showSymbolLogo: true, // show logo next to symbols
    showChart: true, // display mini chart
};

export const HEATMAP_WIDGET_CONFIG = {
    dataSource: 'SPX500',
    blockSize: 'market_cap_basic',
    blockColor: 'change',
    grouping: 'sector',
    isTransparent: true,
    locale: 'en',
    symbolUrl: '',
    colorTheme: 'dark',
    exchanges: [],
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: '100%',
    height: '600',
};

export const TOP_STORIES_WIDGET_CONFIG = {
    displayMode: 'regular',
    feedMode: 'market',
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'en',
    market: 'stock',
    width: '100%',
    height: '600',
};

export const MARKET_DATA_WIDGET_CONFIG = {
    title: 'Stocks',
    width: '100%',
    height: 600,
    locale: 'en',
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: false,
    backgroundColor: '#0F0F0F',
    symbolsGroups: [
        {
            name: 'Financial',
            symbols: [
                { name: 'NYSE:JPM', displayName: 'JPMorgan Chase' },
                { name: 'NYSE:WFC', displayName: 'Wells Fargo Co New' },
                { name: 'NYSE:BAC', displayName: 'Bank Amer Corp' },
                { name: 'NYSE:HSBC', displayName: 'Hsbc Hldgs Plc' },
                { name: 'NYSE:C', displayName: 'Citigroup Inc' },
                { name: 'NYSE:MA', displayName: 'Mastercard Incorporated' },
            ],
        },
        {
            name: 'Technology',
            symbols: [
                { name: 'NASDAQ:AAPL', displayName: 'Apple' },
                { name: 'NASDAQ:GOOGL', displayName: 'Alphabet' },
                { name: 'NASDAQ:MSFT', displayName: 'Microsoft' },
                { name: 'NASDAQ:FB', displayName: 'Meta Platforms' },
                { name: 'NYSE:ORCL', displayName: 'Oracle Corp' },
                { name: 'NASDAQ:INTC', displayName: 'Intel Corp' },
            ],
        },
        {
            name: 'Services',
            symbols: [
                { name: 'NASDAQ:AMZN', displayName: 'Amazon' },
                { name: 'NYSE:BABA', displayName: 'Alibaba Group Hldg Ltd' },
                { name: 'NYSE:T', displayName: 'At&t Inc' },
                { name: 'NYSE:WMT', displayName: 'Walmart' },
                { name: 'NYSE:V', displayName: 'Visa' },
            ],
        },
    ],
};

export const SYMBOL_INFO_WIDGET_CONFIG = (symbol: string, locale: string = TRADINGVIEW_LOCALE) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale,
    width: '100%',
    height: 170,
});

export const CANDLE_CHART_WIDGET_CONFIG = (symbol: string, locale: string = TRADINGVIEW_LOCALE) => ({
    allow_symbol_change: false,
    calendar: false,
    details: true,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale,
    save_image: false,
    style: 1,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'exchange',
    backgroundColor: '#141414',
    gridColor: '#141414',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const BASELINE_WIDGET_CONFIG = (symbol: string, locale: string = TRADINGVIEW_LOCALE) => ({
    allow_symbol_change: false,
    calendar: false,
    details: false,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale,
    save_image: false,
    style: 10,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'exchange',
    backgroundColor: '#141414',
    gridColor: '#141414',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const TECHNICAL_ANALYSIS_WIDGET_CONFIG = (symbol: string, locale: string = TRADINGVIEW_LOCALE) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale,
    width: '100%',
    height: 400,
    interval: '1h',
    largeChartUrl: '',
});

export const COMPANY_PROFILE_WIDGET_CONFIG = (symbol: string, locale: string = TRADINGVIEW_LOCALE) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale,
    width: '100%',
    height: 440,
});

export const COMPANY_FINANCIALS_WIDGET_CONFIG = (symbol: string, locale: string = TRADINGVIEW_LOCALE) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale,
    width: '100%',
    height: 464,
    displayMode: 'regular',
    largeChartUrl: '',
});

export const POPULAR_STOCK_SYMBOLS = [
    // Tech Giants (the big technology companies)
    'AAPL',
    'MSFT',
    'GOOGL',
    'AMZN',
    'TSLA',
    'META',
    'NVDA',
    'NFLX',
    'ORCL',
    'CRM',

    // Growing Tech Companies
    'ADBE',
    'INTC',
    'AMD',
    'PYPL',
    'UBER',
    'ZOOM',
    'SPOT',
    'SQ',
    'SHOP',
    'ROKU',

    // Newer Tech Companies
    'SNOW',
    'PLTR',
    'COIN',
    'RBLX',
    'DDOG',
    'CRWD',
    'NET',
    'OKTA',
    'TWLO',
    'ZM',

    // Consumer & Delivery Apps
    'DOCU',
    'PTON',
    'PINS',
    'SNAP',
    'LYFT',
    'DASH',
    'ABNB',
    'RIVN',
    'LCID',
    'NIO',

    // International Companies
    'XPEV',
    'LI',
    'BABA',
    'JD',
    'PDD',
    'TME',
    'BILI',
    'DIDI',
    'GRAB',
    'SE',
];

export const NO_MARKET_NEWS =
    '<p class="mobile-text" style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#4b5563;">今日暂无市场新闻，请明天再来查看。</p>';

export const WATCHLIST_TABLE_HEADER = [
    '公司',
    '代码',
    '价格',
    '涨跌',
    '市值',
    '市盈率',
    '提醒',
    '操作',
];

export const PASSWORD_RULES = [
    { label: '至少 8 个字符', test: (pw: string) => pw.length >= 8 },
    { label: '至少 1 个大写字母', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: '至少 1 个小写字母', test: (pw: string) => /[a-z]/.test(pw) },
    { label: '至少 1 个数字', test: (pw: string) => /[0-9]/.test(pw) },
] as const;

export const PASSWORD_VALIDATION = {
    required: '请输入密码',
    minLength: { value: 8, message: '密码至少需要 8 个字符' },
    pattern: {
        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        message: '密码必须包含大写字母、小写字母和数字',
    },
};
