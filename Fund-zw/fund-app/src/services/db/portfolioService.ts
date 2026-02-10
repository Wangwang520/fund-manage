import { db } from './db';
import type { UserHolding } from '../../models';
import { v4 as uuidv4 } from 'uuid';

/**
 * 持仓管理服务
 */
export class PortfolioService {
    /**
     * 获取所有持仓
     */
    async getAllHoldings(): Promise<UserHolding[]> {
        return await db.holdings.toArray();
    }

    /**
     * 添加持仓
     */
    async addHolding(holding: Omit<UserHolding, 'id'>): Promise<string> {
        const id = uuidv4();
        await db.holdings.add({ ...holding, id });
        return id;
    }

    /**
     * 更新持仓
     */
    async updateHolding(id: string, updates: Partial<UserHolding>): Promise<void> {
        await db.holdings.update(id, updates);
    }

    /**
     * 删除持仓
     */
    async deleteHolding(id: string): Promise<void> {
        await db.holdings.delete(id);
    }

    /**
     * 根据基金代码查找持仓
     */
    async getHoldingByFundCode(fundCode: string): Promise<UserHolding | undefined> {
        return await db.holdings.where('fundCode').equals(fundCode).first();
    }
}

export const portfolioService = new PortfolioService();
