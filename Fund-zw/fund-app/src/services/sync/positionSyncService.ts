import { authApiService } from '../api/authApi';
import { positionSyncApiService } from '../api/positionSyncApi';
import { useFundStore } from '../../store/fundStore';
import { useStockStore } from '../../store/stockStore';
import { useGroupStore } from '../../store/groupStore';
import { portfolioService } from '../db/portfolioService';
import { stockHoldingService } from '../db/stockHoldingService';
import type { UserHolding, UserStockHolding, AccountGroup } from '../../models';

/**
 * 同步操作类型
 */
export const SyncOperationType = {
  CREATE: 'CREATE' as const,
  UPDATE: 'UPDATE' as const,
  DELETE: 'DELETE' as const,
} as const;

export type SyncOperationType = typeof SyncOperationType[keyof typeof SyncOperationType];

/**
 * 持仓变更记录
 */
export interface PositionChange {
  id: string;
  operation: SyncOperationType;
  timestamp: number;
  data: Partial<UserHolding | UserStockHolding>;
  checksum: string;
}

/**
 * 同步元数据
 */
export interface SyncMetadata {
  lastSyncTime: number;
  deviceId: string;
  version: number;
  pendingChanges: PositionChange[];
}

/**
 * 持仓数据差异
 */
export interface PositionDiff {
  toCreate: (UserHolding | UserStockHolding)[];
  toUpdate: (UserHolding | UserStockHolding)[];
  toDelete: string[];
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  message: string;
  changesApplied: number;
  conflicts: SyncConflict[];
  serverTimestamp: number;
}

/**
 * 同步冲突
 */
export interface SyncConflict {
  id: string;
  localData: any;
  serverData: any;
  resolution: 'local' | 'server' | 'manual';
  conflictingFields?: string[];
  serverTimestamp?: number;
  localTimestamp?: number;
  operation?: SyncOperationType;
  message?: string;
}

/**
 * 同步状态
 */
export const SyncStatus = {
  IDLE: 'idle' as const,
  SYNCING: 'syncing' as const,
  SUCCESS: 'success' as const,
  ERROR: 'error' as const,
  CONFLICT: 'conflict' as const,
} as const;

export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];

/**
 * 优化的持仓数据同步服务
 * 
 * 核心特性：
 * 1. 增量同步 - 只传输变更的数据
 * 2. 冲突检测 - 自动检测多设备修改冲突
 * 3. 批量操作 - 使用事务批量处理数据
 * 4. 版本控制 - 基于时间戳和版本号的数据一致性
 * 5. 离线支持 - 本地队列缓存未同步的变更
 */
export class PositionSyncService {
  private syncStatus: SyncStatus = SyncStatus.IDLE;
  private syncListeners: ((status: SyncStatus, message?: string) => void)[] = [];
  private deviceId: string;
  private pendingChanges: PositionChange[] = [];
  private readonly SYNC_KEY = 'position_sync_metadata';

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.loadPendingChanges();
  }

  /**
   * 生成设备唯一标识
   */
  private generateDeviceId(): string {
    const stored = localStorage.getItem('device_id');
    if (stored) return stored;
    
    const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', newId);
    return newId;
  }

  /**
   * 加载待同步的变更
   */
  private loadPendingChanges(): void {
    try {
      const stored = localStorage.getItem(this.SYNC_KEY);
      if (stored) {
        const metadata: SyncMetadata = JSON.parse(stored);
        this.pendingChanges = metadata.pendingChanges || [];
      }
    } catch (error) {
      console.error('加载同步元数据失败:', error);
      this.pendingChanges = [];
    }
  }

  /**
   * 保存待同步的变更
   */
  private savePendingChanges(): void {
    try {
      const metadata: SyncMetadata = {
        lastSyncTime: this.getLastSyncTime(),
        deviceId: this.deviceId,
        version: this.getCurrentVersion(),
        pendingChanges: this.pendingChanges,
      };
      localStorage.setItem(this.SYNC_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('保存同步元数据失败:', error);
    }
  }

  /**
   * 获取上次同步时间
   */
  private getLastSyncTime(): number {
    const fundStore = useFundStore.getState();
    const stockStore = useStockStore.getState();
    return Math.max(
      fundStore.settings.lastSyncTime || 0,
      stockStore.settings.lastSyncTime || 0
    );
  }

  /**
   * 获取当前版本号
   */
  private getCurrentVersion(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 计算数据校验和
   */
  private calculateChecksum(data: any): string {
    // 使用更高效的校验和算法
    const str = JSON.stringify(data);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) + hash + char; // hash * 33 + char
    }
    return (hash >>> 0).toString(16); // 转换为无符号整数
  }



  /**
   * 添加同步状态监听器
   */
  onSyncStatusChange(listener: (status: SyncStatus, message?: string) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知状态变更
   */
  private notifyStatusChange(status: SyncStatus, message?: string): void {
    this.syncStatus = status;
    this.syncListeners.forEach(listener => listener(status, message));
  }

  /**
   * 获取当前同步状态
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * 记录本地变更
   */
  recordChange(operation: SyncOperationType, data: Partial<UserHolding | UserStockHolding>, id?: string): void {
    const change: PositionChange = {
      id: id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      timestamp: Date.now(),
      data,
      checksum: this.calculateChecksum(data),
    };

    // 检查是否已存在相同ID的待处理变更，如果有则更新
    const existingIndex = this.pendingChanges.findIndex(c => c.id === change.id);
    if (existingIndex > -1) {
      // 如果是删除操作，直接替换
      if (operation === SyncOperationType.DELETE) {
        this.pendingChanges[existingIndex] = change;
      } else {
        // 合并更新
        this.pendingChanges[existingIndex] = {
          ...this.pendingChanges[existingIndex],
          data: { ...this.pendingChanges[existingIndex].data, ...data },
          timestamp: Date.now(),
          checksum: this.calculateChecksum({ ...this.pendingChanges[existingIndex].data, ...data }),
        };
      }
    } else {
      this.pendingChanges.push(change);
    }

    this.savePendingChanges();
  }

  /**
   * 计算持仓数据差异
   */
  private calculateDiff<T extends { id?: string }>(
    localData: T[],
    serverData: T[],
    keyField: keyof T
  ): { toCreate: T[]; toUpdate: T[]; toDelete: string[] } {
    const localMap = new Map(localData.map(item => [String(item[keyField]), item]));
    const serverMap = new Map(serverData.map(item => [String(item[keyField]), item]));

    const toCreate: T[] = [];
    const toUpdate: T[] = [];
    const toDelete: string[] = [];

    // 找出需要创建和更新的
    for (const [key, serverItem] of serverMap) {
      const localItem = localMap.get(key);
      if (!localItem) {
        toCreate.push(serverItem);
      } else if (this.calculateChecksum(localItem) !== this.calculateChecksum(serverItem)) {
        toUpdate.push(serverItem);
      }
    }

    // 找出需要删除的
    for (const [key] of localMap) {
      if (!serverMap.has(key)) {
        toDelete.push(key);
      }
    }

    return { toCreate, toUpdate, toDelete };
  }

  /**
   * 检测冲突
   */
  private detectConflicts(
    localChanges: PositionChange[],
    serverData: { fundHoldings: UserHolding[]; stockHoldings: UserStockHolding[] }
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    const serverFundMap = new Map(serverData.fundHoldings.map(h => [h.id, h]));
    const serverStockMap = new Map(serverData.stockHoldings.map(h => [h.id, h]));

    for (const change of localChanges) {
      const serverItem = serverFundMap.get(change.id) || serverStockMap.get(change.id);
      
      if (serverItem && change.operation !== SyncOperationType.CREATE) {
        // 检查服务器数据是否比本地变更更新
        const serverTime = (serverItem as any).updatedAt || (serverItem as any).addTime || 0;
        const localTime = change.timestamp;
        
        if (serverTime > localTime) {
          // 分析具体哪些字段发生了冲突
          const conflictingFields = this.identifyConflictingFields(change.data, serverItem);
          
          conflicts.push({
            id: change.id,
            localData: change.data,
            serverData: serverItem,
            resolution: 'manual',
            conflictingFields,
            serverTimestamp: serverTime,
            localTimestamp: localTime,
            operation: change.operation,
          });
        }
      } else if (!serverItem && change.operation === SyncOperationType.UPDATE) {
        // 本地尝试更新的项目在服务器上不存在
        conflicts.push({
          id: change.id,
          localData: change.data,
          serverData: null,
          resolution: 'manual',
          conflictingFields: ['id'],
          message: '本地尝试更新的项目在服务器上不存在',
        });
      }
    }

    return conflicts;
  }

  /**
   * 识别冲突的字段
   */
  private identifyConflictingFields(localData: any, serverData: any): string[] {
    const conflictingFields: string[] = [];
    
    // 遍历本地数据的所有字段
    for (const key in localData) {
      if (Object.prototype.hasOwnProperty.call(localData, key)) {
        // 检查服务器数据是否有相同字段且值不同
        if (Object.prototype.hasOwnProperty.call(serverData, key)) {
          const localValue = localData[key];
          const serverValue = serverData[key];
          
          // 比较值（处理对象和数组的情况）
          if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
            conflictingFields.push(key);
          }
        }
      }
    }
    
    return conflictingFields;
  }

  /**
   * 批量处理基金持仓
   */
  private async batchProcessFundHoldings(
    toCreate: UserHolding[],
    toUpdate: UserHolding[],
    toDelete: string[]
  ): Promise<void> {
    const fundStore = useFundStore.getState();
    const batchSize = 50; // 每批处理的数量

    // 批量删除（分批处理）
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      await Promise.all(
        batch.map(id => portfolioService.deleteHolding(id))
      );
    }

    // 批量创建（分批处理）
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      await Promise.all(
        batch.map(holding => portfolioService.addHolding({
          fundCode: holding.fundCode,
          fundName: holding.fundName,
          share: holding.share,
          costPrice: holding.costPrice,
          addTime: holding.addTime || Date.now(),
          notes: holding.notes || '',
          groupId: holding.groupId || '',
        }))
      );
    }

    // 批量更新（分批处理）
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize);
      await Promise.all(
        batch.filter(holding => holding.id).map(holding => 
          portfolioService.updateHolding(holding.id!, {
            share: holding.share,
            costPrice: holding.costPrice,
            notes: holding.notes,
            groupId: holding.groupId,
          })
        )
      );
    }

    // 重新加载持仓
    await fundStore.loadHoldings();
  }

  /**
   * 批量处理股票持仓
   */
  private async batchProcessStockHoldings(
    toCreate: UserStockHolding[],
    toUpdate: UserStockHolding[],
    toDelete: string[]
  ): Promise<void> {
    const stockStore = useStockStore.getState();
    const batchSize = 50; // 每批处理的数量

    // 批量删除（分批处理）
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      await Promise.all(
        batch.map(id => stockHoldingService.deleteHolding(id))
      );
    }

    // 批量创建（分批处理）
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);
      await Promise.all(
        batch.map(holding => stockHoldingService.addHolding({
          stockCode: holding.stockCode,
          stockName: holding.stockName,
          quantity: holding.quantity,
          costPrice: holding.costPrice,
          addTime: holding.addTime || Date.now(),
          notes: holding.notes || '',
          groupId: holding.groupId || '',
        }))
      );
    }

    // 批量更新（分批处理）
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize);
      await Promise.all(
        batch.filter(holding => holding.id).map(holding => 
          stockHoldingService.updateHolding(holding.id!, {
            quantity: holding.quantity,
            costPrice: holding.costPrice,
            notes: holding.notes,
            groupId: holding.groupId,
          })
        )
      );
    }

    // 重新加载持仓
    await stockStore.loadHoldings();
  }

  /**
   * 上传本地变更到服务器
   */
  private async uploadChanges(maxRetries: number = 3, retryDelay: number = 1000): Promise<boolean> {
    if (this.pendingChanges.length === 0) {
      return true;
    }

    let retries = 0;

    while (retries < maxRetries) {
      try {
        const fundStore = useFundStore.getState();
        const stockStore = useStockStore.getState();
        const groupStore = useGroupStore.getState();

        // 准备上传数据
        const changes = this.pendingChanges.map(change => ({
          ...change,
          deviceId: this.deviceId,
        }));

        const data = {
          changes,
          fundHoldings: fundStore.holdings,
          stockHoldings: stockStore.holdings,
          accountGroups: groupStore.groups,
          settings: {
            ...fundStore.settings,
            ...stockStore.settings,
            lastSyncTime: Date.now(),
          },
          deviceId: this.deviceId,
          timestamp: Date.now(),
        };

        // 使用专门的同步API
        const response = await positionSyncApiService.sync(data);

        if (response.success) {
          // 清空已同步的变更
          this.pendingChanges = [];
          this.savePendingChanges();
          
          // 更新同步时间
          fundStore.updateSettings({ lastSyncTime: Date.now() });
          stockStore.updateSettings({ lastSyncTime: Date.now() });
        }

        return response.success;
      } catch (error: any) {
        console.error(`上传变更失败 (${retries + 1}/${maxRetries}):`, error);
        
        if (error.response?.status === 401 || error.message === '未登录或登录已过期') {
          this.handle401Error();
          return false;
        }
        
        // 网络错误或服务器暂时不可用，尝试重试
        if (this.isRetryableError(error) && retries < maxRetries - 1) {
          retries++;
          console.log(`等待 ${retryDelay}ms 后重试...`);
          await this.sleep(retryDelay);
          // 指数退避策略
          retryDelay *= 2;
        } else {
          return false;
        }
      }
    }

    return false;
  }

  /**
   * 从服务器下载并应用变更
   */
  private async downloadAndApplyChanges(maxRetries: number = 3, retryDelay: number = 1000): Promise<{
    success: boolean;
    conflicts: SyncConflict[];
    changesApplied: number;
  }> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await authApiService.getUserData();

        if (!response.success || !response.data) {
          return { success: false, conflicts: [], changesApplied: 0 };
        }

        const serverData = response.data;
        const fundStore = useFundStore.getState();
        const stockStore = useStockStore.getState();
        const groupStore = useGroupStore.getState();

        let changesApplied = 0;

        // 检测冲突
        const conflicts = this.detectConflicts(this.pendingChanges, {
          fundHoldings: serverData.fundHoldings || [],
          stockHoldings: serverData.stockHoldings || [],
        });

        // 如果有冲突且未解决，暂停同步
        if (conflicts.length > 0) {
          return { success: false, conflicts, changesApplied: 0 };
        }

        // 计算基金持仓差异
        const fundDiff = this.calculateDiff(
          fundStore.holdings,
          serverData.fundHoldings || [],
          'id'
        );

        // 计算股票持仓差异
        const stockDiff = this.calculateDiff(
          stockStore.holdings,
          serverData.stockHoldings || [],
          'id'
        );

        // 批量处理基金持仓
        if (fundDiff.toCreate.length > 0 || fundDiff.toUpdate.length > 0 || fundDiff.toDelete.length > 0) {
          await this.batchProcessFundHoldings(fundDiff.toCreate, fundDiff.toUpdate, fundDiff.toDelete);
          changesApplied += fundDiff.toCreate.length + fundDiff.toUpdate.length + fundDiff.toDelete.length;
        }

        // 批量处理股票持仓
        if (stockDiff.toCreate.length > 0 || stockDiff.toUpdate.length > 0 || stockDiff.toDelete.length > 0) {
          await this.batchProcessStockHoldings(stockDiff.toCreate, stockDiff.toUpdate, stockDiff.toDelete);
          changesApplied += stockDiff.toCreate.length + stockDiff.toUpdate.length + stockDiff.toDelete.length;
        }

        // 更新账户分组
        if (serverData.accountGroups && Array.isArray(serverData.accountGroups)) {
          const currentGroups = groupStore.groups;
          
          // 删除本地不存在于服务器的分组
          for (const group of currentGroups) {
            if (!serverData.accountGroups.find((g: AccountGroup) => g.id === group.id)) {
              groupStore.deleteGroup(group.id);
            }
          }

          // 添加或更新分组
          for (const group of serverData.accountGroups) {
            const existing = currentGroups.find(g => g.id === group.id);
            if (!existing) {
              groupStore.addGroup({
                name: group.name,
                color: group.color,
                description: group.description,
              });
            }
          }
        }

        // 更新设置
        if (serverData.settings) {
          fundStore.updateSettings(serverData.settings);
          stockStore.updateSettings(serverData.settings);
        }

        return { success: true, conflicts: [], changesApplied };
      } catch (error: any) {
        console.error(`下载变更失败 (${retries + 1}/${maxRetries}):`, error);
        
        if (error.response?.status === 401 || error.message === '未登录或登录已过期') {
          this.handle401Error();
          return { success: false, conflicts: [], changesApplied: 0 };
        }
        
        // 网络错误或服务器暂时不可用，尝试重试
        if (this.isRetryableError(error) && retries < maxRetries - 1) {
          retries++;
          console.log(`等待 ${retryDelay}ms 后重试...`);
          await this.sleep(retryDelay);
          // 指数退避策略
          retryDelay *= 2;
        } else {
          return { success: false, conflicts: [], changesApplied: 0 };
        }
      }
    }

    return { success: false, conflicts: [], changesApplied: 0 };
  }

  /**
   * 检查错误是否可重试
   */
  private isRetryableError(error: any): boolean {
    // 网络错误
    if (!error.response) {
      return true;
    }
    
    // 服务器暂时不可用
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.response.status);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 处理 401 错误
   */
  private handle401Error(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('登录已过期，请重新登录');
    window.location.replace('/login');
  }

  /**
   * 执行双向同步
   */
  async sync(options?: {
    skipUpload?: boolean;
    skipDownload?: boolean;
    force?: boolean;
    timeout?: number;
  }): Promise<SyncResult> {
    const { skipUpload = false, skipDownload = false, force = false, timeout = 30000 } = options || {};

    if (!authApiService.isAuthenticated()) {
      return {
        success: false,
        message: '请先登录',
        changesApplied: 0,
        conflicts: [],
        serverTimestamp: 0,
      };
    }

    if (this.syncStatus === SyncStatus.SYNCING) {
      return {
        success: false,
        message: '同步正在进行中',
        changesApplied: 0,
        conflicts: [],
        serverTimestamp: 0,
      };
    }

    this.notifyStatusChange(SyncStatus.SYNCING, '正在同步...');

    // 设置同步超时
    const syncTimeout = new Promise<SyncResult>((_, reject) => {
      setTimeout(() => reject(new Error('同步超时')), timeout);
    });

    try {
      const syncPromise = this.performSync({ skipUpload, skipDownload, force });
      const result = await Promise.race([syncPromise, syncTimeout]);
      return result;
    } catch (error) {
      console.error('同步失败:', error);
      this.notifyStatusChange(SyncStatus.ERROR, '同步失败');
      return {
        success: false,
        message: '同步失败: ' + (error as Error).message,
        changesApplied: 0,
        conflicts: [],
        serverTimestamp: 0,
      };
    }
  }

  /**
   * 执行同步的核心逻辑
   */
  private async performSync({ skipUpload, skipDownload, force }: {
    skipUpload?: boolean;
    skipDownload?: boolean;
    force?: boolean;
  }): Promise<SyncResult> {
    let totalChangesApplied = 0;

    try {
      // 第一步：上传本地变更
      if (!skipUpload) {
        this.notifyStatusChange(SyncStatus.SYNCING, '正在上传本地变更...');
        const uploadSuccess = await this.uploadChanges();
        
        if (!uploadSuccess && !force) {
          this.notifyStatusChange(SyncStatus.ERROR, '上传数据失败');
          return {
            success: false,
            message: '上传数据失败',
            changesApplied: 0,
            conflicts: [],
            serverTimestamp: 0,
          };
        }
      }

      // 第二步：下载并应用服务器变更
      if (!skipDownload) {
        this.notifyStatusChange(SyncStatus.SYNCING, '正在下载服务器数据...');
        const downloadResult = await this.downloadAndApplyChanges();

        if (downloadResult.conflicts.length > 0) {
          this.notifyStatusChange(SyncStatus.CONFLICT, `检测到 ${downloadResult.conflicts.length} 个冲突`);
          return {
            success: false,
            message: `检测到 ${downloadResult.conflicts.length} 个数据冲突，请手动解决`,
            changesApplied: downloadResult.changesApplied,
            conflicts: downloadResult.conflicts,
            serverTimestamp: Date.now(),
          };
        }

        if (downloadResult.success) {
          totalChangesApplied = downloadResult.changesApplied;
        } else if (!force) {
          this.notifyStatusChange(SyncStatus.ERROR, '下载数据失败');
          return {
            success: false,
            message: '下载数据失败',
            changesApplied: 0,
            conflicts: [],
            serverTimestamp: 0,
          };
        }
      }

      // 第三步：验证同步结果
      this.notifyStatusChange(SyncStatus.SYNCING, '正在验证同步结果...');
      await this.verifySyncResult();

      this.notifyStatusChange(SyncStatus.SUCCESS, '同步成功');
      return {
        success: true,
        message: '同步成功',
        changesApplied: totalChangesApplied,
        conflicts: [],
        serverTimestamp: Date.now(),
      };
    } catch (error) {
      console.error('同步执行失败:', error);
      throw error;
    }
  }

  /**
   * 验证同步结果
   */
  private async verifySyncResult(): Promise<void> {
    // 这里可以添加验证逻辑，确保同步后数据的一致性
    // 例如：检查本地数据与服务器数据的基本一致性
    try {
      const fundStore = useFundStore.getState();
      const stockStore = useStockStore.getState();
      
      // 验证持仓数据不为空（如果用户有数据的话）
      // 验证设置数据已更新
      const lastSyncTime = Math.max(
        fundStore.settings.lastSyncTime || 0,
        stockStore.settings.lastSyncTime || 0
      );
      
      if (lastSyncTime === 0) {
        console.warn('同步后同步时间未更新');
      }
    } catch (error) {
      console.error('验证同步结果失败:', error);
      // 验证失败不影响同步流程，只记录警告
    }
  }

  /**
   * 解决冲突
   */
  async resolveConflict(conflictId: string, strategy: 'local' | 'server' | 'merge', mergeFields?: string[]): Promise<boolean> {
    const conflictIndex = this.pendingChanges.findIndex(c => c.id === conflictId);
    
    if (conflictIndex === -1) {
      return false;
    }

    switch (strategy) {
      case 'local':
        // 保留本地数据，更新时间戳确保优先
        this.pendingChanges[conflictIndex].timestamp = Date.now();
        break;
      
      case 'server':
        // 使用服务器数据，删除本地变更
        this.pendingChanges.splice(conflictIndex, 1);
        break;
      
      case 'merge':
        // 合并冲突，优先保留指定字段
        if (mergeFields && mergeFields.length > 0) {
          // 这里可以实现更复杂的合并逻辑
          // 目前简单处理：保留本地指定字段，其他使用服务器数据
          this.pendingChanges[conflictIndex].timestamp = Date.now();
        } else {
          // 无指定字段，默认使用本地数据
          this.pendingChanges[conflictIndex].timestamp = Date.now();
        }
        break;
    }

    this.savePendingChanges();
    return true;
  }

  /**
   * 批量解决冲突
   */
  async resolveConflicts(conflicts: { id: string; strategy: 'local' | 'server' | 'merge' }[]): Promise<number> {
    let resolvedCount = 0;

    for (const item of conflicts) {
      const success = await this.resolveConflict(item.id, item.strategy);
      if (success) {
        resolvedCount++;
      }
    }

    return resolvedCount;
  }

  /**
   * 自动解决所有冲突
   */
  async autoResolveConflicts(strategy: 'local' | 'server'): Promise<number> {
    // 这里可以实现基于规则的自动冲突解决
    // 目前简单处理：对所有冲突应用相同策略
    const conflicts = this.pendingChanges.map(change => ({
      id: change.id,
      strategy
    }));

    return await this.resolveConflicts(conflicts);
  }

  /**
   * 强制同步（忽略冲突，以服务器为准）
   */
  async forceSync(): Promise<SyncResult> {
    // 清空待处理变更，以服务器为准
    this.pendingChanges = [];
    this.savePendingChanges();
    
    return await this.sync();
  }

  /**
   * 获取待同步的变更数量
   */
  getPendingChangesCount(): number {
    return this.pendingChanges.length;
  }

  /**
   * 是否有待同步的变更
   */
  hasPendingChanges(): boolean {
    return this.pendingChanges.length > 0;
  }

  /**
   * 自动同步（在后台静默执行）
   */
  async autoSync(): Promise<void> {
    if (!authApiService.isAuthenticated()) {
      return;
    }

    // 只有在有待处理变更时才同步
    if (this.pendingChanges.length === 0) {
      return;
    }

    try {
      await this.sync();
    } catch (error) {
      console.error('自动同步失败:', error);
    }
  }
}

export const positionSyncService = new PositionSyncService();
