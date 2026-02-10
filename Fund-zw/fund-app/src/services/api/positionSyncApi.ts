import axios from 'axios';
import type { PositionChange } from '../sync/positionSyncService';

/**
 * 持仓同步 API 响应类型
 */
export interface SyncResponse {
  success: boolean;
  message: string;
  data?: {
    fundHoldings: any[];
    stockHoldings: any[];
    accountGroups: any[];
    settings: any;
    lastUpdated: string;
  };
  conflicts?: any[];
  requiresResolution?: boolean;
  serverTimestamp?: number;
}

/**
 * 同步状态响应
 */
export interface SyncStatusResponse {
  success: boolean;
  data?: {
    lastSyncTime: number | null;
    fundHoldingsCount: number;
    stockHoldingsCount: number;
    accountGroupsCount: number;
    lastUpdated: string;
  };
}

/**
 * 批量更新响应
 */
export interface BatchUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    fundHoldingsCount: number;
    stockHoldingsCount: number;
  };
}

/**
 * 持仓同步 API 服务
 */
export class PositionSyncApiService {
  /**
   * 执行增量同步
   */
  async sync(data: {
    changes: PositionChange[];
    fundHoldings: any[];
    stockHoldings: any[];
    accountGroups: any[];
    settings: any;
    deviceId: string;
    timestamp: number;
    force?: boolean;
  }): Promise<SyncResponse> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录或登录已过期');
    }

    const response = await axios.post<SyncResponse>('/api/position-sync/sync', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<SyncStatusResponse> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录或登录已过期');
    }

    const response = await axios.get<SyncStatusResponse>('/api/position-sync/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  /**
   * 批量更新持仓数据
   */
  async batchUpdate(data: {
    fundHoldings?: any[];
    stockHoldings?: any[];
    replaceAll?: boolean;
  }): Promise<BatchUpdateResponse> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录或登录已过期');
    }

    const response = await axios.post<BatchUpdateResponse>('/api/position-sync/batch', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  /**
   * 强制同步（以服务器为准，忽略冲突）
   */
  async forceSync(data: {
    changes: PositionChange[];
    fundHoldings: any[];
    stockHoldings: any[];
    accountGroups: any[];
    settings: any;
    deviceId: string;
    timestamp: number;
  }): Promise<SyncResponse> {
    return this.sync({ ...data, force: true });
  }
}

export const positionSyncApiService = new PositionSyncApiService();
