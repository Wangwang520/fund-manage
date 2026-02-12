import { create } from 'zustand';
import type { AccountGroup } from '../models';
import { groupService } from '../services/db/groupService';

interface GroupState {
  // 状态
  groups: AccountGroup[];
  loading: boolean;
  
  // 动作
  addGroup: (group: Omit<AccountGroup, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGroup: (id: string, updates: Partial<AccountGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  getGroup: (id: string) => AccountGroup | undefined;
  loadGroups: () => Promise<void>;
}

const defaultGroups: AccountGroup[] = [];

export const useGroupStore = create<GroupState>()(
  (set, get) => ({
    groups: defaultGroups,
    loading: false,

    addGroup: async (group) => {
      await groupService.createGroup(group);
      // 重新加载分组数据
      await get().loadGroups();
    },

    updateGroup: async (id, updates) => {
      await groupService.updateGroup(id, updates);
      // 重新加载分组数据
      await get().loadGroups();
    },

    deleteGroup: async (id) => {
      await groupService.deleteGroup(id);
      // 重新加载分组数据
      await get().loadGroups();
    },

    getGroup: (id) => {
      return get().groups.find((group) => group.id === id);
    },

    loadGroups: async () => {
      set({ loading: true });
      try {
        const groups = await groupService.getAllGroups();
        set({ groups });
      } catch (error) {
        console.error('加载分组失败:', error);
      } finally {
        set({ loading: false });
      }
    }
  })
);
