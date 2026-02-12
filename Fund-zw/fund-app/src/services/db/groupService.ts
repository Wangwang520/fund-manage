import type { AccountGroup } from '../../models';
import { v4 as uuidv4 } from 'uuid';
import { authApiService } from '../api/authApi';

/**
 * 分组管理服务
 */
export class GroupService {
    /**
     * 获取所有分组
     */
    async getAllGroups(): Promise<AccountGroup[]> {
        const response = await authApiService.getUserData();
        if (response.success && response.data) {
            return response.data.accountGroups || [];
        }
        return [];
    }

    /**
     * 根据ID获取分组
     */
    async getGroupById(id: string): Promise<AccountGroup | undefined> {
        const response = await authApiService.getUserData();
        if (response.success && response.data) {
            const groups = response.data.accountGroups || [];
            return groups.find(group => group.id === id);
        }
        return undefined;
    }

    /**
     * 创建分组
     */
    async createGroup(group: Omit<AccountGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = uuidv4();
        const now = Date.now();
        const newGroup = {
            ...group,
            id,
            createdAt: now,
            updatedAt: now,
        };
        
        // 获取当前所有分组
        const response = await authApiService.getUserData();
        const currentGroups = response.success && response.data ? response.data.accountGroups || [] : [];
        
        // 添加新分组
        const updatedGroups = [...currentGroups, newGroup];
        
        // 保存到服务端
        await authApiService.saveUserData({ accountGroups: updatedGroups });
        
        return id;
    }

    /**
     * 更新分组
     */
    async updateGroup(id: string, updates: Partial<Omit<AccountGroup, 'id' | 'createdAt'>>): Promise<void> {
        // 获取当前所有分组
        const response = await authApiService.getUserData();
        const currentGroups = response.success && response.data ? response.data.accountGroups || [] : [];
        
        // 更新指定分组
        const updatedGroups = currentGroups.map(group => 
            group.id === id ? { ...group, ...updates, updatedAt: Date.now() } : group
        );
        
        // 保存到服务端
        await authApiService.saveUserData({ accountGroups: updatedGroups });
    }

    /**
     * 删除分组
     */
    async deleteGroup(id: string): Promise<void> {
        // 获取当前所有数据
        const response = await authApiService.getUserData();
        if (!response.success || !response.data) {
            return;
        }
        
        // 更新分组
        const currentGroups = response.data.accountGroups || [];
        const updatedGroups = currentGroups.filter(group => group.id !== id);
        
        // 更新基金持仓
        const currentFundHoldings = response.data.fundHoldings || [];
        const updatedFundHoldings = currentFundHoldings.map(holding => 
            holding.groupId === id ? { ...holding, groupId: undefined } : holding
        );
        
        // 更新股票持仓
        const currentStockHoldings = response.data.stockHoldings || [];
        const updatedStockHoldings = currentStockHoldings.map(holding => 
            holding.groupId === id ? { ...holding, groupId: undefined } : holding
        );
        
        // 保存到服务端
        await authApiService.saveUserData({
            accountGroups: updatedGroups,
            fundHoldings: updatedFundHoldings,
            stockHoldings: updatedStockHoldings
        });
    }

    /**
     * 获取默认分组颜色
     */
    getDefaultColors(): string[] {
        return [
            '#1677ff', // 蓝色
            '#52c41a', // 绿色
            '#faad14', // 黄色
            '#f5222d', // 红色
            '#722ed1', // 紫色
            '#eb2f96', // 粉色
            '#13c2c2', // 青色
            '#fa8c16', // 橙色
        ];
    }
}

export const groupService = new GroupService();
