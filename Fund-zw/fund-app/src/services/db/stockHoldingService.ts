import { db } from './db';
import type { UserStockHolding } from '../../models';

/**
 * 股票持仓数据服务
 */
export class StockHoldingService {
    /**
     * 获取所有股票持仓
     */
    async getAllHoldings(): Promise<UserStockHolding[]> {
        return await db.stockHoldings.toArray();
    }

    /**
     * 根据ID获取持仓
     */
    async getHoldingById(id: string): Promise<UserStockHolding | undefined> {
        return await db.stockHoldings.get(id);
    }

    /**
     * 添加股票持仓
     */
    async addHolding(holding: Omit<UserStockHolding, 'id'>): Promise<string> {
        const id = await db.stockHoldings.add(holding as UserStockHolding);
        return id as string;
    }

    /**
     * 更新股票持仓
     */
    async updateHolding(id: string, updates: Partial<UserStockHolding>): Promise<void> {
        await db.stockHoldings.update(id, updates);
    }

    /**
     * 删除股票持仓
     */
    async deleteHolding(id: string): Promise<void> {
        await db.stockHoldings.delete(id);
    }

    /**
     * 根据分组获取持仓
     */
    async getHoldingsByGroup(groupId: string | null): Promise<UserStockHolding[]> {
        if (groupId === null) {
            return await db.stockHoldings.filter(h => !h.groupId).toArray();
        }
        return await db.stockHoldings.where('groupId').equals(groupId).toArray();
    }
}

export const stockHoldingService = new StockHoldingService();
