import { create } from 'zustand';
import type { UserStockHolding, StockQuote, AppSettings } from '../models';
import { stockHoldingService } from '../services/db/stockHoldingService';
import { stockApiService } from '../services/api/stockApi';
import { authApiService } from '../services/api/authApi';

interface StockState {
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
    loadSettings: () => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
    colorScheme: 'red-green',
    refreshInterval: 30000,
    lastSyncTime: null,
};

export const useStockStore = create<StockState>()(
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
                // 加载后自动刷新行情
                await get().refreshQuotes();
                // 同时加载设置
                await get().loadSettings();
            } finally {
                set({ isLoading: false });
            }
        },

        addHolding: async (holding) => {
            await stockHoldingService.addHolding(holding);
            await get().loadHoldings();
        },

        updateHolding: async (id, updates) => {
            await stockHoldingService.updateHolding(id, updates);
            await get().loadHoldings();
        },

        deleteHolding: async (id) => {
            await stockHoldingService.deleteHolding(id);
            await get().loadHoldings();
        },

        refreshQuotes: async () => {
            const { holdings } = get();
            if (holdings.length === 0) return;

            const codes = holdings.map(h => h.stockCode);
            const quotes = await stockApiService.getRealTimeQuotes(codes);
            
            set({ quotes });
        },

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
    })
);
