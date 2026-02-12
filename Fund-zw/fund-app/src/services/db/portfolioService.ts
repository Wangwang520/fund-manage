import type { UserHolding } from '../../models';
import { v4 as uuidv4 } from 'uuid';
import { authApiService } from '../api/authApi';

/**
 * 持仓管理服务
 */
export class PortfolioService {
    /**
     * 获取所有持仓
     */
    async getAllHoldings(): Promise<UserHolding[]> {
        const response = await authApiService.getUserData();
        if (response.success && response.data) {
            return response.data.fundHoldings || [];
        }
        return [];
    }

    /**
     * 添加持仓
     */
    async addHolding(holding: Omit<UserHolding, 'id'>): Promise<string> {
        const id = uuidv4();
        const newHolding = { ...holding, id };
        
        // 获取当前所有持仓
        const response = await authApiService.getUserData();
        const currentHoldings = response.success && response.data ? response.data.fundHoldings || [] : [];
        
        // 添加新持仓
        const updatedHoldings = [...currentHoldings, newHolding];
        
        // 保存到服务端
        await authApiService.saveUserData({ fundHoldings: updatedHoldings });
        
        return id;
    }

    /**
     * 更新持仓
     */
    async updateHolding(id: string, updates: Partial<UserHolding>): Promise<void> {
        // 获取当前所有持仓
        const response = await authApiService.getUserData();
        const currentHoldings = response.success && response.data ? response.data.fundHoldings || [] : [];
        
        // 更新指定持仓
        const updatedHoldings = currentHoldings.map(holding => 
            holding.id === id ? { ...holding, ...updates } : holding
        );
        
        // 保存到服务端
        await authApiService.saveUserData({ fundHoldings: updatedHoldings });
    }

    /**
     * 删除持仓
     */
    async deleteHolding(id: string): Promise<void> {
        // 获取当前所有持仓
        const response = await authApiService.getUserData();
        const currentHoldings = response.success && response.data ? response.data.fundHoldings || [] : [];
        
        // 删除指定持仓
        const updatedHoldings = currentHoldings.filter(holding => holding.id !== id);
        
        // 保存到服务端
        await authApiService.saveUserData({ fundHoldings: updatedHoldings });
    }

    /**
     * 根据基金代码查找持仓
     */
    async getHoldingByFundCode(fundCode: string): Promise<UserHolding | undefined> {
        const response = await authApiService.getUserData();
        if (response.success && response.data) {
            const holdings = response.data.fundHoldings || [];
            return holdings.find(holding => holding.fundCode === fundCode);
        }
        return undefined;
    }
}

export const portfolioService = new PortfolioService();
