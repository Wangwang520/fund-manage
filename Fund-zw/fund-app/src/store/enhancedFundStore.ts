import { create } from 'zustand';
import type { UserHolding, FundQuote, DashboardDTO, AppSettings } from '../models';
import { portfolioService } from '../services/db/portfolioService';
import { fundApiService } from '../services/api/fundApi';
import { profitCalculator } from '../services/calculator/profitCalculator';
import { positionSyncService, SyncOperationType } from '../services/sync/positionSyncService';

interface EnhancedFundStore {
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
    loadSettings: () => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    
    // 数据导入导出
    exportData: () => string;
    importData: (jsonData: string) => Promise<{ success: boolean; message: string }>;
    
    // 批量操作
    batchAddHoldings: (holdings: Omit<UserHolding, 'id'>[]) => Promise<{ success: boolean; message: string }>;
    batchUpdateHoldings: (updates: { id: string; data: Partial<UserHolding> }[]) => Promise<{ success: boolean; message: string }>;
    batchDeleteHoldings: (ids: string[]) => Promise<{ success: boolean; message: string }>;
}

// 默认设置
const defaultSettings: AppSettings = {
    colorScheme: 'red-green',
    refreshInterval: 60000,
    lastSyncTime: null,
};

// 从 localStorage 加载设置
const loadSettingsFromStorage = (): AppSettings => {
    try {
        const saved = localStorage.getItem('fundManager_settings');
        if (saved) {
            return { ...defaultSettings, ...JSON.parse(saved) };
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
    return defaultSettings;
};

export const useEnhancedFundStore = create<EnhancedFundStore>((set, get) => ({
    holdings: [],
    quotes: new Map(),
    dashboard: {
        totalAsset: 0,
        totalProfit: 0,
        totalProfitRate: 0,
        dayProfit: 0,
    },
    loading: false,
    settings: loadSettingsFromStorage(),

    loadHoldings: async () => {
        set({ loading: true });
        try {
            const holdings = await portfolioService.getAllHoldings();
            set({ holdings });
            await get().refreshQuotes();
        } finally {
            set({ loading: false });
        }
    },

    addHolding: async (holding) => {
        const id = await portfolioService.addHolding(holding);
        
        // 记录变更用于同步
        positionSyncService.recordChange(SyncOperationType.CREATE, {
            ...holding,
            id,
        }, id);
        
        await get().loadHoldings();
    },

    updateHolding: async (id, updates) => {
        await portfolioService.updateHolding(id, updates);
        
        // 记录变更用于同步
        positionSyncService.recordChange(SyncOperationType.UPDATE, {
            ...updates,
            id,
        }, id);
        
        await get().loadHoldings();
    },

    deleteHolding: async (id) => {
        await portfolioService.deleteHolding(id);
        
        // 记录变更用于同步
        positionSyncService.recordChange(SyncOperationType.DELETE, { id }, id);
        
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

    loadSettings: () => {
        const settings = loadSettingsFromStorage();
        set({ settings });
    },

    updateSettings: (newSettings) => {
        const updated = { ...get().settings, ...newSettings };
        set({ settings: updated });
        try {
            localStorage.setItem('fundManager_settings', JSON.stringify(updated));
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    },

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

    importData: async (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.holdings || !Array.isArray(data.holdings)) {
                return { success: false, message: '数据格式错误：缺少持仓数据' };
            }

            for (const holding of data.holdings) {
                if (!holding.fundCode || !holding.fundName || 
                    typeof holding.share !== 'number' || 
                    typeof holding.costPrice !== 'number') {
                    return { success: false, message: '持仓数据格式错误' };
                }
            }

            // 批量导入
            const result = await get().batchAddHoldings(data.holdings.map((h: UserHolding) => ({
                fundCode: h.fundCode,
                fundName: h.fundName,
                share: h.share,
                costPrice: h.costPrice,
                addTime: h.addTime || Date.now(),
                notes: h.notes || '',
                groupId: h.groupId || '',
            })));

            if (result.success && data.settings) {
                get().updateSettings(data.settings);
            }

            return result;
        } catch (error) {
            console.error('导入数据失败:', error);
            return { success: false, message: '导入失败：数据格式错误' };
        }
    },

    // 批量添加持仓
    batchAddHoldings: async (holdings) => {
        try {
            const addedIds: string[] = [];
            
            for (const holding of holdings) {
                const id = await portfolioService.addHolding(holding);
                addedIds.push(id);
                
                // 记录变更
                positionSyncService.recordChange(SyncOperationType.CREATE, {
                    ...holding,
                    id,
                }, id);
            }
            
            await get().loadHoldings();
            
            return {
                success: true,
                message: `成功添加 ${holdings.length} 条持仓`,
            };
        } catch (error) {
            console.error('批量添加持仓失败:', error);
            return {
                success: false,
                message: '批量添加失败',
            };
        }
    },

    // 批量更新持仓
    batchUpdateHoldings: async (updates) => {
        try {
            for (const { id, data } of updates) {
                await portfolioService.updateHolding(id, data);
                
                // 记录变更
                positionSyncService.recordChange(SyncOperationType.UPDATE, {
                    ...data,
                    id,
                }, id);
            }
            
            await get().loadHoldings();
            
            return {
                success: true,
                message: `成功更新 ${updates.length} 条持仓`,
            };
        } catch (error) {
            console.error('批量更新持仓失败:', error);
            return {
                success: false,
                message: '批量更新失败',
            };
        }
    },

    // 批量删除持仓
    batchDeleteHoldings: async (ids) => {
        try {
            for (const id of ids) {
                await portfolioService.deleteHolding(id);
                
                // 记录变更
                positionSyncService.recordChange(SyncOperationType.DELETE, { id }, id);
            }
            
            await get().loadHoldings();
            
            return {
                success: true,
                message: `成功删除 ${ids.length} 条持仓`,
            };
        } catch (error) {
            console.error('批量删除持仓失败:', error);
            return {
                success: false,
                message: '批量删除失败',
            };
        }
    },
}));
