import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserStockHolding, StockQuote, AppSettings } from '../models';
import { stockHoldingService } from '../services/db/stockHoldingService';
import { stockApiService } from '../services/api/stockApi';
import { positionSyncService, SyncOperationType } from '../services/sync/positionSyncService';

interface EnhancedStockState {
    holdings: UserStockHolding[];
    quotes: Map<string, StockQuote>;
    settings: AppSettings;
    isLoading: boolean;
    
    // Actions
    loadHoldings: () => Promise<void>;
    addHolding: (holding: Omit<UserStockHolding, 'id'>) => Promise<void>;
    updateHolding: (id: string, updates: Partial<UserStockHolding>) => Promise<void>;
    deleteHolding: (id: string) => Promise<void>;
    refreshQuotes: () => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => void;
    
    // 批量操作
    batchAddHoldings: (holdings: Omit<UserStockHolding, 'id'>[]) => Promise<{ success: boolean; message: string }>;
    batchUpdateHoldings: (updates: { id: string; data: Partial<UserStockHolding> }[]) => Promise<{ success: boolean; message: string }>;
    batchDeleteHoldings: (ids: string[]) => Promise<{ success: boolean; message: string }>;
}

const defaultSettings: AppSettings = {
    colorScheme: 'red-green',
    refreshInterval: 30000,
    lastSyncTime: null,
};

export const useEnhancedStockStore = create<EnhancedStockState>()(
    persist(
        (set, get) => ({
            holdings: [],
            quotes: new Map(),
            settings: defaultSettings,
            isLoading: false,

            loadHoldings: async () => {
                set({ isLoading: true });
                try {
                    const holdings = await stockHoldingService.getAllHoldings();
                    set({ holdings });
                    await get().refreshQuotes();
                } finally {
                    set({ isLoading: false });
                }
            },

            addHolding: async (holding) => {
                const id = await stockHoldingService.addHolding(holding);
                
                // 记录变更用于同步
                positionSyncService.recordChange(SyncOperationType.CREATE, {
                    ...holding,
                    id,
                } as UserStockHolding, id);
                
                await get().loadHoldings();
            },

            updateHolding: async (id, updates) => {
                await stockHoldingService.updateHolding(id, updates);
                
                // 记录变更用于同步
                positionSyncService.recordChange(SyncOperationType.UPDATE, {
                    ...updates,
                    id,
                } as UserStockHolding, id);
                
                await get().loadHoldings();
            },

            deleteHolding: async (id) => {
                await stockHoldingService.deleteHolding(id);
                
                // 记录变更用于同步
                positionSyncService.recordChange(SyncOperationType.DELETE, { id }, id);
                
                await get().loadHoldings();
            },

            refreshQuotes: async () => {
                const { holdings } = get();
                if (holdings.length === 0) return;

                const codes = holdings.map(h => h.stockCode);
                const quotes = await stockApiService.getRealTimeQuotes(codes);
                
                set({ quotes });
            },

            updateSettings: (newSettings) => {
                set((state) => ({
                    settings: { ...state.settings, ...newSettings },
                }));
            },
            
            // 批量添加持仓
            batchAddHoldings: async (holdings) => {
                try {
                    const addedIds: string[] = [];
                    
                    for (const holding of holdings) {
                        const id = await stockHoldingService.addHolding(holding);
                        addedIds.push(id);
                        
                        // 记录变更
                        positionSyncService.recordChange(SyncOperationType.CREATE, {
                            ...holding,
                            id,
                        } as UserStockHolding, id);
                    }
                    
                    await get().loadHoldings();
                    
                    return {
                        success: true,
                        message: `成功添加 ${holdings.length} 条股票持仓`,
                    };
                } catch (error) {
                    console.error('批量添加股票持仓失败:', error);
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
                        await stockHoldingService.updateHolding(id, data);
                        
                        // 记录变更
                        positionSyncService.recordChange(SyncOperationType.UPDATE, {
                            ...data,
                            id,
                        } as UserStockHolding, id);
                    }
                    
                    await get().loadHoldings();
                    
                    return {
                        success: true,
                        message: `成功更新 ${updates.length} 条股票持仓`,
                    };
                } catch (error) {
                    console.error('批量更新股票持仓失败:', error);
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
                        await stockHoldingService.deleteHolding(id);
                        
                        // 记录变更
                        positionSyncService.recordChange(SyncOperationType.DELETE, { id }, id);
                    }
                    
                    await get().loadHoldings();
                    
                    return {
                        success: true,
                        message: `成功删除 ${ids.length} 条股票持仓`,
                    };
                } catch (error) {
                    console.error('批量删除股票持仓失败:', error);
                    return {
                        success: false,
                        message: '批量删除失败',
                    };
                }
            },
        }),
        {
            name: 'stock-storage',
            partialize: (state) => ({ settings: state.settings }),
        }
    )
);
