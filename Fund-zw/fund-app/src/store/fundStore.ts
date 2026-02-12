import { create } from 'zustand';
import type { UserHolding, FundQuote, DashboardDTO, AppSettings } from '../models';
import { portfolioService } from '../services/db/portfolioService';
import { fundApiService } from '../services/api/fundApi';
import { profitCalculator } from '../services/calculator/profitCalculator';
import { authApiService } from '../services/api/authApi';

interface FundStore {
    // 状态
    holdings: UserHolding[];
    quotes: Map<string, FundQuote>;
    dashboard: DashboardDTO;
    loading: boolean;
    settings: AppSettings;

    // 操作
    loadHoldings: () => Promise<void>;
    addHolding: (holding: Omit<UserHolding, 'id'>) => Promise<void>;
    updateHolding: (id: string, updates: Partial<UserHolding>) => Promise<void>;
    deleteHolding: (id: string) => Promise<void>;
    refreshQuotes: () => Promise<void>;
    calculateDashboard: () => void;
    
    // 设置操作
    loadSettings: () => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
    
    // 数据导入导出
    exportData: () => string;
    importData: (jsonData: string) => Promise<{ success: boolean; message: string }>;
}

// 默认设置
const defaultSettings: AppSettings = {
    colorScheme: 'red-green', // 红涨绿跌
    refreshInterval: 60000, // 默认60秒
    lastSyncTime: null,
};

export const useFundStore = create<FundStore>((set, get) => ({
    holdings: [],
    quotes: new Map(),
    dashboard: {
        totalAsset: 0,
        totalProfit: 0,
        totalProfitRate: 0,
        dayProfit: 0,
    },
    loading: false,
    settings: defaultSettings,

    loadHoldings: async () => {
        set({ loading: true });
        try {
            const holdings = await portfolioService.getAllHoldings();
            set({ holdings });
            await get().refreshQuotes();
            await get().loadSettings(); // 同时加载设置
        } finally {
            set({ loading: false });
        }
    },

    addHolding: async (holding) => {
        await portfolioService.addHolding(holding);
        await get().loadHoldings();
    },

    updateHolding: async (id, updates) => {
        await portfolioService.updateHolding(id, updates);
        await get().loadHoldings();
    },

    deleteHolding: async (id) => {
        await portfolioService.deleteHolding(id);
        await get().loadHoldings();
    },

    refreshQuotes: async () => {
        const { holdings } = get();
        if (holdings.length === 0) return;

        const codes = holdings.map(h => h.fundCode);
        const quotes = await fundApiService.getRealTimeQuotes(codes);
        set({ quotes });
        get().calculateDashboard();
    },

    calculateDashboard: () => {
        const { holdings, quotes } = get();
        const dashboard = profitCalculator.calculateDashboardData(holdings, quotes);
        set({ dashboard });
    },

    // 加载设置
    loadSettings: async () => {
        try {
            const response = await authApiService.getUserData();
            if (response.success && response.data && response.data.settings) {
                set({ settings: response.data.settings });
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    },

    // 更新设置
    updateSettings: async (newSettings) => {
        const updated = { ...get().settings, ...newSettings };
        set({ settings: updated });
        // 保存到服务端
        try {
            await authApiService.saveUserData({ settings: updated });
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    },

    // 导出数据
    exportData: () => {
        const { holdings, settings } = get();
        const exportData = {
            version: '1.0',
            exportTime: Date.now(),
            holdings,
            settings,
        };
        return JSON.stringify(exportData, null, 2);
    },

    // 导入数据
    importData: async (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);
            
            // 验证数据格式
            if (!data.holdings || !Array.isArray(data.holdings)) {
                return { success: false, message: '数据格式错误：缺少持仓数据' };
            }

            // 验证持仓数据
            for (const holding of data.holdings) {
                if (!holding.fundCode || !holding.fundName || 
                    typeof holding.share !== 'number' || 
                    typeof holding.costPrice !== 'number') {
                    return { success: false, message: '持仓数据格式错误' };
                }
            }

            // 清空现有数据并导入新数据
            const existingHoldings = await portfolioService.getAllHoldings();
            for (const holding of existingHoldings) {
                if (holding.id) {
                    await portfolioService.deleteHolding(holding.id);
                }
            }

            // 导入新持仓
            for (const holding of data.holdings) {
                await portfolioService.addHolding({
                    fundCode: holding.fundCode,
                    fundName: holding.fundName,
                    share: holding.share,
                    costPrice: holding.costPrice,
                    addTime: holding.addTime || Date.now(),
                    notes: holding.notes || '',
                });
            }

            // 导入设置
            if (data.settings) {
                await get().updateSettings(data.settings);
            }

            // 重新加载数据
            await get().loadHoldings();

            return { 
                success: true, 
                message: `成功导入 ${data.holdings.length} 条持仓数据` 
            };
        } catch (error) {
            console.error('导入数据失败:', error);
            return { success: false, message: '导入失败：数据格式错误' };
        }
    },
}));
