import { useState, useEffect, useCallback, useRef } from 'react';
import {
  positionSyncService,
  SyncStatus,
  type SyncResult,
  type SyncConflict,
  SyncOperationType,
} from '../services/sync/positionSyncService';
import type { UserHolding, UserStockHolding } from '../models';

/**
 * 同步状态钩子返回值
 */
export interface UsePositionSyncReturn {
  /** 当前同步状态 */
  status: SyncStatus;
  /** 同步状态消息 */
  message: string;
  /** 是否正在同步 */
  isSyncing: boolean;
  /** 是否有冲突 */
  hasConflicts: boolean;
  /** 冲突列表 */
  conflicts: SyncConflict[];
  /** 待同步变更数量 */
  pendingChangesCount: number;
  /** 是否有待同步的变更 */
  hasPendingChanges: boolean;
  /** 执行同步 */
  sync: () => Promise<SyncResult>;
  /** 强制同步（以服务器为准） */
  forceSync: () => Promise<SyncResult>;
  /** 解决冲突 */
  resolveConflict: (conflictId: string, useLocal: boolean) => Promise<boolean>;
  /** 记录变更 */
  recordChange: (operation: SyncOperationType, data: Partial<UserHolding | UserStockHolding>, id?: string) => void;
  /** 上次同步时间 */
  lastSyncTime: number | null;
}

/**
 * 持仓数据同步 Hook
 * 
 * 使用示例：
 * ```tsx
 * function MyComponent() {
 *   const { status, isSyncing, sync, hasPendingChanges } = usePositionSync();
 *   
 *   return (
 *     <button onClick={sync} disabled={isSyncing}>
 *       {isSyncing ? '同步中...' : '同步'}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePositionSync(): UsePositionSyncReturn {
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.IDLE);
  const [message, setMessage] = useState<string>('');
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 监听同步状态变化
  useEffect(() => {
    const unsubscribe = positionSyncService.onSyncStatusChange((newStatus, newMessage) => {
      setStatus(newStatus);
      setMessage(newMessage || '');
    });

    return unsubscribe;
  }, []);

  // 定期更新待同步变更数量
  useEffect(() => {
    const updatePendingCount = () => {
      setPendingChangesCount(positionSyncService.getPendingChangesCount());
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // 自动同步（当有待处理变更时）
  useEffect(() => {
    // 清除之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 设置自动同步定时器
    intervalRef.current = setInterval(() => {
      if (positionSyncService.hasPendingChanges() && status !== SyncStatus.SYNCING) {
        positionSyncService.autoSync();
      }
    }, 30000); // 每30秒检查一次

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status]);

  // 执行同步
  const sync = useCallback(async (): Promise<SyncResult> => {
    const result = await positionSyncService.sync();
    
    if (result.conflicts.length > 0) {
      setConflicts(result.conflicts);
    } else {
      setConflicts([]);
    }

    if (result.success) {
      setLastSyncTime(result.serverTimestamp);
    }

    return result;
  }, []);

  // 强制同步
  const forceSync = useCallback(async (): Promise<SyncResult> => {
    const result = await positionSyncService.forceSync();
    
    if (result.success) {
      setConflicts([]);
      setLastSyncTime(result.serverTimestamp);
    }

    return result;
  }, []);

  // 解决冲突
  const resolveConflict = useCallback(async (conflictId: string, useLocal: boolean): Promise<boolean> => {
    const success = await positionSyncService.resolveConflict(conflictId, useLocal);
    
    if (success) {
      // 重新同步以应用解决结果
      await sync();
    }

    return success;
  }, [sync]);

  // 记录变更
  const recordChange = useCallback((
    operation: SyncOperationType,
    data: Partial<UserHolding | UserStockHolding>,
    id?: string
  ): void => {
    positionSyncService.recordChange(operation, data, id);
    setPendingChangesCount(positionSyncService.getPendingChangesCount());
  }, []);

  return {
    status,
    message,
    isSyncing: status === SyncStatus.SYNCING,
    hasConflicts: conflicts.length > 0,
    conflicts,
    pendingChangesCount,
    hasPendingChanges: pendingChangesCount > 0,
    sync,
    forceSync,
    resolveConflict,
    recordChange,
    lastSyncTime,
  };
}

/**
 * 自动同步 Hook
 * 在组件挂载时自动执行同步
 */
export function useAutoPositionSync(intervalMinutes: number = 5): UsePositionSyncReturn {
  const syncState = usePositionSync();

  useEffect(() => {
    // 组件挂载时执行一次同步
    syncState.sync();

    // 设置定时同步
    const interval = setInterval(() => {
      syncState.sync();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes]);

  return syncState;
}

/**
 * 同步状态指示器组件使用的 Hook
 */
export function useSyncIndicator(): {
  status: SyncStatus;
  isVisible: boolean;
  message: string;
  showIndicator: () => void;
  hideIndicator: () => void;
} {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.IDLE);
  const [message, setMessage] = useState('');
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = positionSyncService.onSyncStatusChange((newStatus, newMessage) => {
      setStatus(newStatus);
      setMessage(newMessage || '');

      // 根据状态决定是否显示指示器
      if (newStatus === SyncStatus.SYNCING || newStatus === SyncStatus.ERROR || newStatus === SyncStatus.CONFLICT) {
        setIsVisible(true);
        
        // 清除之前的隐藏定时器
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      }

      // 成功后3秒自动隐藏
      if (newStatus === SyncStatus.SUCCESS) {
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }
    });

    return () => {
      unsubscribe();
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const showIndicator = useCallback(() => setIsVisible(true), []);
  const hideIndicator = useCallback(() => setIsVisible(false), []);

  return {
    status,
    isVisible,
    message,
    showIndicator,
    hideIndicator,
  };
}
