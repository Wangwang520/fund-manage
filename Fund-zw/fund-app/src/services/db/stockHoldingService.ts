import type { UserStockHolding } from '../../models';
import { v4 as uuidv4 } from 'uuid';
import { authApiService } from '../api/authApi';

/**
 * 股票持仓数据服务
 */
export class StockHoldingService {
    /**
     * 获取所有股票持仓
     */
    async getAllHoldings(): Promise<UserStockHolding[]> {
        const response = await authApiService.getUserData();
        if (response.success && response.data) {
            return response.data.stockHoldings || [];
        }
        return [];
    }

    /**
     * 根据ID获取持仓
     */
    async getHoldingById(id: string): Promise<UserStockHolding | undefined> {
        const response = await authApiService.getUserData();
        if (response.success && response.data) {
            const holdings = response.data.stockHoldings || [];
            return holdings.find(holding => holding.id === id);
        }
        return undefined;
    }

    /**
     * 添加股票持仓
     */
    async addHolding(holding: Omit<UserStockHolding, 'id'>): Promise<string> {
        const id = uuidv4();
        const newHolding = { ...holding, id };
        
        // 获取当前所有持仓
        const response = await authApiService.getUserData();
        const currentHoldings = response.success && response.data ? response.data.stockHoldings || [] : [];
        
        // 添加新持仓
        const updatedHoldings = [...currentHoldings, newHolding];
        
        // 保存到服务端
        await authApiService.saveUserData({ stockHoldings: updatedHoldings });
        
        return id;
    }

    /**
     * 更新股票持仓
     */
    async updateHolding(id: string, updates: Partial<UserStockHolding>): Promise<void> {
        // 获取当前所有持仓
        const response = await authApiService.getUserData();
        const currentHoldings = response.success && response.data ? response.data.stockHoldings || [] : [];
        
        // 更新指定持仓
        const updatedHoldings = currentHoldings.map(holding => 
            holding.id === id ? { ...holding, ...updates } : holding
        );
        
        // 保存到服务端
        await authApiService.saveUserData({ stockHoldings: updatedHoldings });
    }

    /**
     * 删除股票持仓
     */
    async deleteHolding(id: string): Promise<void> {
        // 获取当前所有持仓
        const response = await authApiService.getUserData();
        const currentHoldings = response.success && response.data ? response.data.stockHoldings || [] : [];
        
        // 删除指定持仓
        const updatedHoldings = currentHoldings.filter(holding => holding.id !== id);
        
        // 保存到服务端
        await authApiService.saveUserData({ stockHoldings: updatedHoldings });
    }

    /**
     * 根据分组获取持仓
     */
    async getHoldingsByGroup(groupId: string | null): Promise<UserStockHolding[]> {
        const response = await authApiService.getUserData();
        if (response.success && response.data) {
            const holdings = response.data.stockHoldings || [];
            if (groupId === null) {
                return holdings.filter(h => !h.groupId);
            }
            return holdings.filter(h => h.groupId === groupId);
        }
        return [];
    }
}

export const stockHoldingService = new StockHoldingService();
