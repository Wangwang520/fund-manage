import { db } from '../db/db';
import { authApiService } from '../api/authApi';
import type { UserHolding, UserStockHolding, AccountGroup } from '../../models';

/**
 * 数据迁移状态
 */
export const MigrationStatus = {
  IDLE: 'idle' as const,
  MIGRATING: 'migrating' as const,
  SUCCESS: 'success' as const,
  ERROR: 'error' as const,
  COMPLETED: 'completed' as const,
} as const;

export type MigrationStatus = typeof MigrationStatus[keyof typeof MigrationStatus];

/**
 * 数据迁移结果
 */
export interface MigrationResult {
  success: boolean;
  message: string;
  migratedData: {
    fundHoldings: number;
    stockHoldings: number;
    accountGroups: number;
  };
  error?: string;
}

/**
 * 数据迁移服务
 * 用于将本地 Dexie 数据库中的数据迁移到服务端
 */
export class MigrationService {
  private status: MigrationStatus = MigrationStatus.IDLE;
  private listeners: ((status: MigrationStatus, message?: string) => void)[] = [];

  /**
   * 添加状态监听器
   */
  onStatusChange(listener: (status: MigrationStatus, message?: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知状态变更
   */
  private notifyStatusChange(status: MigrationStatus, message?: string): void {
    this.status = status;
    this.listeners.forEach(listener => listener(status, message));
  }

  /**
   * 获取当前状态
   */
  getStatus(): MigrationStatus {
    return this.status;
  }

  /**
   * 检查是否有本地数据需要迁移
   */
  async hasLocalData(): Promise<boolean> {
    try {
      // 检查是否有本地基金持仓
      const fundHoldings = await db.holdings.toArray();
      if (fundHoldings.length > 0) {
        return true;
      }

      // 检查是否有本地股票持仓
      const stockHoldings = await db.stockHoldings.toArray();
      if (stockHoldings.length > 0) {
        return true;
      }

      // 检查是否有本地分组
      const groups = await db.groups.toArray();
      if (groups.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('检查本地数据失败:', error);
      return false;
    }
  }

  /**
   * 执行数据迁移
   */
  async migrate(): Promise<MigrationResult> {
    this.notifyStatusChange(MigrationStatus.MIGRATING, '正在准备迁移数据...');

    try {
      // 检查是否已登录
      if (!authApiService.isAuthenticated()) {
        this.notifyStatusChange(MigrationStatus.ERROR, '请先登录');
        return {
          success: false,
          message: '请先登录',
          migratedData: {
            fundHoldings: 0,
            stockHoldings: 0,
            accountGroups: 0,
          },
        };
      }

      // 读取本地数据
      this.notifyStatusChange(MigrationStatus.MIGRATING, '正在读取本地数据...');
      const localData = await this.readLocalData();

      // 检查本地数据是否为空
      if (
        localData.fundHoldings.length === 0 &&
        localData.stockHoldings.length === 0 &&
        localData.accountGroups.length === 0
      ) {
        this.notifyStatusChange(MigrationStatus.COMPLETED, '没有本地数据需要迁移');
        return {
          success: true,
          message: '没有本地数据需要迁移',
          migratedData: {
            fundHoldings: 0,
            stockHoldings: 0,
            accountGroups: 0,
          },
        };
      }

      // 获取服务端现有数据
      this.notifyStatusChange(MigrationStatus.MIGRATING, '正在检查服务端数据...');
      const serverResponse = await authApiService.getUserData();
      const serverData = serverResponse.success && serverResponse.data ? serverResponse.data : null;

      // 合并数据
      this.notifyStatusChange(MigrationStatus.MIGRATING, '正在合并数据...');
      const mergedData = this.mergeData(localData, serverData);

      // 上传到服务端
      this.notifyStatusChange(MigrationStatus.MIGRATING, '正在上传数据到服务端...');
      const uploadResponse = await authApiService.saveUserData(mergedData);

      if (!uploadResponse.success) {
        this.notifyStatusChange(MigrationStatus.ERROR, '上传数据失败');
        return {
          success: false,
          message: '上传数据失败',
          migratedData: {
            fundHoldings: 0,
            stockHoldings: 0,
            accountGroups: 0,
          },
          error: uploadResponse.message,
        };
      }

      // 标记迁移完成
      this.notifyStatusChange(MigrationStatus.SUCCESS, '数据迁移成功');
      
      // 清理本地数据（可选）
      // await this.clearLocalData();

      return {
        success: true,
        message: '数据迁移成功',
        migratedData: {
          fundHoldings: localData.fundHoldings.length,
          stockHoldings: localData.stockHoldings.length,
          accountGroups: localData.accountGroups.length,
        },
      };
    } catch (error) {
      console.error('数据迁移失败:', error);
      this.notifyStatusChange(MigrationStatus.ERROR, '数据迁移失败');
      return {
        success: false,
        message: '数据迁移失败',
        migratedData: {
          fundHoldings: 0,
          stockHoldings: 0,
          accountGroups: 0,
        },
        error: (error as Error).message,
      };
    }
  }

  /**
   * 读取本地 Dexie 数据库中的数据
   */
  private async readLocalData(): Promise<{
    fundHoldings: UserHolding[];
    stockHoldings: UserStockHolding[];
    accountGroups: AccountGroup[];
  }> {
    try {
      const fundHoldings = await db.holdings.toArray();
      const stockHoldings = await db.stockHoldings.toArray();
      const accountGroups = await db.groups.toArray();

      return {
        fundHoldings,
        stockHoldings,
        accountGroups,
      };
    } catch (error) {
      console.error('读取本地数据失败:', error);
      return {
        fundHoldings: [],
        stockHoldings: [],
        accountGroups: [],
      };
    }
  }

  /**
   * 合并本地数据和服务端数据
   */
  private mergeData(
    localData: {
      fundHoldings: UserHolding[];
      stockHoldings: UserStockHolding[];
      accountGroups: AccountGroup[];
    },
    serverData: any
  ): {
    fundHoldings: UserHolding[];
    stockHoldings: UserStockHolding[];
    accountGroups: AccountGroup[];
  } {
    // 服务端现有数据
    const existingFundHoldings = serverData?.fundHoldings || [];
    const existingStockHoldings = serverData?.stockHoldings || [];
    const existingAccountGroups = serverData?.accountGroups || [];

    // 合并基金持仓（去重）
    const fundHoldingsMap = new Map<string, UserHolding>();
    
    // 先添加服务端数据
    existingFundHoldings.forEach((holding: UserHolding) => {
      if (holding.fundCode) {
        fundHoldingsMap.set(holding.fundCode, holding);
      }
    });

    // 再添加本地数据（如果服务端没有）
    localData.fundHoldings.forEach((holding: UserHolding) => {
      if (holding.fundCode && !fundHoldingsMap.has(holding.fundCode)) {
        fundHoldingsMap.set(holding.fundCode, holding);
      }
    });

    // 合并股票持仓（去重）
    const stockHoldingsMap = new Map<string, UserStockHolding>();
    
    // 先添加服务端数据
    existingStockHoldings.forEach((holding: UserStockHolding) => {
      if (holding.stockCode) {
        stockHoldingsMap.set(holding.stockCode, holding);
      }
    });

    // 再添加本地数据（如果服务端没有）
    localData.stockHoldings.forEach((holding: UserStockHolding) => {
      if (holding.stockCode && !stockHoldingsMap.has(holding.stockCode)) {
        stockHoldingsMap.set(holding.stockCode, holding);
      }
    });

    // 合并分组（去重）
    const accountGroupsMap = new Map<string, AccountGroup>();
    
    // 先添加服务端数据
    existingAccountGroups.forEach((group: AccountGroup) => {
      if (group.id) {
        accountGroupsMap.set(group.id, group);
      }
    });

    // 再添加本地数据（如果服务端没有）
    localData.accountGroups.forEach((group: AccountGroup) => {
      if (group.id && !accountGroupsMap.has(group.id)) {
        accountGroupsMap.set(group.id, group);
      }
    });

    return {
      fundHoldings: Array.from(fundHoldingsMap.values()),
      stockHoldings: Array.from(stockHoldingsMap.values()),
      accountGroups: Array.from(accountGroupsMap.values()),
    };
  }

  /**
   * 清理本地数据
   */
  private async clearLocalData(): Promise<void> {
    try {
      await db.holdings.clear();
      await db.stockHoldings.clear();
      await db.groups.clear();
      console.log('本地数据已清理');
    } catch (error) {
      console.error('清理本地数据失败:', error);
    }
  }

  /**
   * 手动触发清理本地数据
   */
  async clearLocalDataManually(): Promise<boolean> {
    try {
      await this.clearLocalData();
      return true;
    } catch (error) {
      console.error('清理本地数据失败:', error);
      return false;
    }
  }
}

/**
 * 数据迁移服务实例
 */
export const migrationService = new MigrationService();
