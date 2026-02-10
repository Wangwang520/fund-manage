import { db } from './db';
import type { AccountGroup } from '../../models';
import { v4 as uuidv4 } from 'uuid';

/**
 * 分组管理服务
 */
export class GroupService {
    /**
     * 获取所有分组
     */
    async getAllGroups(): Promise<AccountGroup[]> {
        return await db.groups.toArray();
    }

    /**
     * 根据ID获取分组
     */
    async getGroupById(id: string): Promise<AccountGroup | undefined> {
        return await db.groups.get(id);
    }

    /**
     * 创建分组
     */
    async createGroup(group: Omit<AccountGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = uuidv4();
        const now = Date.now();
        await db.groups.add({
            ...group,
            id,
            createdAt: now,
            updatedAt: now,
        });
        return id;
    }

    /**
     * 更新分组
     */
    async updateGroup(id: string, updates: Partial<Omit<AccountGroup, 'id' | 'createdAt'>>): Promise<void> {
        await db.groups.update(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    }

    /**
     * 删除分组
     */
    async deleteGroup(id: string): Promise<void> {
        // 删除分组前，先将该分组下的持仓的 groupId 置空
        await db.holdings.where('groupId').equals(id).modify({ groupId: undefined });
        await db.groups.delete(id);
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
