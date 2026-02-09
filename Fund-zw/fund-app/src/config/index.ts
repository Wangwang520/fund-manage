// API 配置
export const API_CONFIG = {
    // 天天基金网 JSONP 接口 (通过 Vite 代理)
    EASTMONEY_FUND_DETAIL: '/api/fund/',
    // 备用接口可在此添加
};

// 应用配置
export const APP_CONFIG = {
    REFRESH_INTERVAL: 60000, // 行情刷新间隔 (ms)
    TRADING_START: '09:30',
    TRADING_END: '15:00',
};
