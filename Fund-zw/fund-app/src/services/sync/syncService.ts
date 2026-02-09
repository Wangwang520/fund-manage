import { authApiService } from '../api/authApi';
import { useFundStore } from '../../store/fundStore';
import { useStockStore } from '../../store/stockStore';
import { useGroupStore } from '../../store/groupStore';
import { portfolioService } from '../db/portfolioService';
import { stockHoldingService } from '../db/stockHoldingService';

/**
 * 数据同步服务
 */
export class SyncService {
  /**
   * 上传本地数据到服务端
   */
  async uploadData(): Promise<boolean> {
    try {
      const fundStore = useFundStore.getState();
      const stockStore = useStockStore.getState();
      const groupStore = useGroupStore.getState();

      // 确保数据已加载
      await fundStore.loadHoldings();
      await stockStore.loadHoldings();

      const data = {
        fundHoldings: fundStore.holdings,
        stockHoldings: stockStore.holdings,
        accountGroups: groupStore.groups,
        settings: {
          ...fundStore.settings,
          ...stockStore.settings,
          lastSyncTime: Date.now()
        }
      };

      const response = await authApiService.saveUserData(data);
      
      if (response.success) {
        // 更新本地同步时间
        fundStore.updateSettings({ lastSyncTime: Date.now() });
        stockStore.updateSettings({ lastSyncTime: Date.now() });
      }
      
      return response.success;
    } catch (error) {
      console.error('上传数据失败:', error);
      return false;
    }
  }

  /**
   * 从服务端下载数据到本地
   */
  async downloadData(): Promise<boolean> {
    try {
      const response = await authApiService.getUserData();
      
      if (response.success && response.data) {
        const fundStore = useFundStore.getState();
        const stockStore = useStockStore.getState();
        const groupStore = useGroupStore.getState();

        // 更新账户分组
        if (response.data.accountGroups && Array.isArray(response.data.accountGroups)) {
          // 清空现有分组
          const existingGroups = groupStore.groups;
          for (const group of existingGroups) {
            groupStore.deleteGroup(group.id);
          }
          
          // 添加新分组
          for (const group of response.data.accountGroups) {
            groupStore.addGroup({
              name: group.name,
              color: group.color,
              description: group.description
            });
          }
        }

        // 更新基金持仓
        if (response.data.fundHoldings && Array.isArray(response.data.fundHoldings)) {
          // 清空现有持仓
          const existingFunds = fundStore.holdings;
          for (const holding of existingFunds) {
            if (holding.id) {
              await portfolioService.deleteHolding(holding.id);
            }
          }
          
          // 添加新持仓
          for (const holding of response.data.fundHoldings) {
            await portfolioService.addHolding({
              fundCode: holding.fundCode,
              fundName: holding.fundName,
              share: holding.share,
              costPrice: holding.costPrice,
              addTime: holding.addTime || Date.now(),
              notes: holding.notes || '',
              groupId: holding.groupId || ''
            });
          }
          
          // 重新加载基金持仓
          await fundStore.loadHoldings();
        }

        // 更新股票持仓
        if (response.data.stockHoldings && Array.isArray(response.data.stockHoldings)) {
          // 清空现有持仓
          const existingStocks = stockStore.holdings;
          for (const holding of existingStocks) {
            if (holding.id) {
              await stockHoldingService.deleteHolding(holding.id);
            }
          }
          
          // 添加新持仓
          for (const holding of response.data.stockHoldings) {
            await stockHoldingService.addHolding({
              stockCode: holding.stockCode,
              stockName: holding.stockName,
              quantity: holding.quantity,
              costPrice: holding.costPrice,
              addTime: holding.addTime || Date.now(),
              notes: holding.notes || '',
              groupId: holding.groupId || ''
            });
          }
          
          // 重新加载股票持仓
          await stockStore.loadHoldings();
        }

        // 更新设置
        if (response.data.settings) {
          fundStore.updateSettings(response.data.settings);
          stockStore.updateSettings(response.data.settings);
        }

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('下载数据失败:', error);
      return false;
    }
  }

  /**
   * 自动同步数据
   */
  async autoSync(): Promise<void> {
    if (authApiService.isAuthenticated()) {
      await this.uploadData();
    }
  }

  /**
   * 手动同步数据
   */
  async manualSync(): Promise<{ success: boolean; message: string }> {
    if (!authApiService.isAuthenticated()) {
      return { success: false, message: '请先登录' };
    }

    const uploadSuccess = await this.uploadData();
    const downloadSuccess = await this.downloadData();

    if (uploadSuccess && downloadSuccess) {
      return { success: true, message: '同步成功' };
    } else if (uploadSuccess) {
      return { success: true, message: '上传成功，下载失败' };
    } else {
      return { success: false, message: '同步失败' };
    }
  }
}

export const syncService = new SyncService();
