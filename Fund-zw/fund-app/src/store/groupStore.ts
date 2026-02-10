import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccountGroup } from '../models';

interface GroupState {
  // 状态
  groups: AccountGroup[];
  
  // 动作
  addGroup: (group: Omit<AccountGroup, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGroup: (id: string, updates: Partial<AccountGroup>) => void;
  deleteGroup: (id: string) => void;
  getGroup: (id: string) => AccountGroup | undefined;
  loadGroups: () => void;
}

const defaultGroups: AccountGroup[] = [];

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: defaultGroups,

      addGroup: (group) => {
        const newGroup: AccountGroup = {
          ...group,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        set((state) => ({
          groups: [...state.groups, newGroup]
        }));
      },

      updateGroup: (id, updates) => {
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id
              ? {
                  ...group,
                  ...updates,
                  updatedAt: Date.now()
                }
              : group
          )
        }));
      },

      deleteGroup: (id) => {
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id)
        }));
      },

      getGroup: (id) => {
        return get().groups.find((group) => group.id === id);
      },

      loadGroups: () => {
        // 从持久化存储加载数据
        // 这里不需要额外操作，因为 persist 中间件会自动处理
      }
    }),
    {
      name: 'group-storage'
    }
  )
);
