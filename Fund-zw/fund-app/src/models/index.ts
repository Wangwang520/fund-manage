export interface FundInfo {
  code: string;       // 基金代码 (Primary Key)
  name: string;       // 基金名称
  type: string;       // 类型
  manager?: string;   // 基金经理
  company?: string;   // 基金公司
  updateTime: number; // 上次更新时间戳
}

export interface FundQuote {
  code: string;           // 基金代码
  price: number;          // 当前估值/净值
  increaseRate: number;   // 涨跌幅 (%)
  increaseAmount: number; // 涨跌额
  navTime: string;        // 净值时间
  preClose: number;       // 昨日净值
  isEst: boolean;         // 是否为估值 (true=估值, false=实际净值)
}

export interface UserHolding {
    id?: string;            // UUID (IndexedDB 自动生成或手动指定)
    fundCode: string;       // 关联基金代码
    fundName: string;       // 冗余名称，减少查询
    share: number;          // 持有份额
    costPrice: number;      // 成本净值 (平均买入价)
    addTime: number;        // 首次添加时间
    notes?: string;         // 备注
    groupId?: string;       // 所属分组ID
}

export interface DashboardDTO {
  totalAsset: number;     // 总资产
  totalProfit: number;    // 总收益
  totalProfitRate: number; // 总收益率
  dayProfit: number;      // 今日收益
}

export interface AppSettings {
  colorScheme: 'red-green' | 'green-red'; // 涨跌颜色方案
  refreshInterval: number; // 自动刷新间隔 (毫秒)
  lastSyncTime: number | null; // 上次同步时间
}

export interface AccountGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

// 导出股票相关类型
export * from './stock';
