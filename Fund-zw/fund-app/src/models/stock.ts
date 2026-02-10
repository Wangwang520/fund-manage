/**
 * 股票相关数据模型
 */

export interface StockInfo {
  code: string;           // 股票代码 (如: 000001.SZ)
  name: string;           // 股票名称
  market: 'SH' | 'SZ' | 'BJ' | 'HK' | 'US'; // 市场: 上海、深圳、北京、香港、美股
  type?: string;          // 股票类型
  industry?: string;      // 所属行业
  updateTime: number;     // 上次更新时间戳
}

export interface StockQuote {
  code: string;           // 股票代码
  name: string;           // 股票名称
  price: number;          // 当前价格
  preClose: number;       // 昨收价
  open: number;           // 开盘价
  high: number;           // 最高价
  low: number;            // 最低价
  increaseRate: number;   // 涨跌幅 (%)
  increaseAmount: number; // 涨跌额
  volume: number;         // 成交量
  amount: number;         // 成交额
  updateTime: string;     // 更新时间
}

export interface UserStockHolding {
  id?: string;            // UUID
  stockCode: string;      // 股票代码
  stockName: string;      // 股票名称（冗余）
  quantity: number;       // 持有数量（股）
  costPrice: number;      // 成本价
  addTime: number;        // 首次添加时间
  notes?: string;         // 备注
  groupId?: string;       // 所属分组ID
}

export interface StockHoldingProfit {
  stockCode: string;
  stockName: string;
  quantity: number;
  costPrice: number;
  currentPrice: number;
  totalCost: number;      // 总成本
  totalValue: number;     // 总市值
  profit: number;         // 盈亏金额
  profitRate: number;     // 盈亏率 (%)
  dayProfit: number;      // 当日盈亏
}
