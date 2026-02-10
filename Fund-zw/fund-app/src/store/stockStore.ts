import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserStockHolding, StockQuote, AppSettings } from '../models';
import { stockHoldingService } from '../services/db/stockHoldingService';
import { stockApiService } from '../services/api/stockApi';

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
    updateSettings: (settings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
    colorScheme: 'red-green',
    refreshInterval: 30000,
    lastSyncTime: null,
};

export const useStockStore = create<StockState>()(
    persist(
        (set, get) => ({
            holdings: [],
            quotes: new Map(),
            settings: defaultSettings,
            isLoading: false,

            loadHoldings: async () => {
                const holdings = await stockHoldingService.getAllHoldings();
                set({ holdings });
                // 加载后自动刷新行情
                await get().refreshQuotes();
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

            updateSettings: (newSettings) => {
                set((state) => ({
                    settings: { ...state.settings, ...newSettings },
                }));
            },
        }),
        {
            name: 'stock-storage',
            partialize: (state) => ({ settings: state.settings }),
        }
    )
);
