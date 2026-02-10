const UserData = require('../models/UserData');

/**
 * 持仓数据同步控制器
 * 
 * 支持增量同步、冲突检测和批量操作
 */

// 同步操作类型
const OperationType = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

/**
 * 应用变更到持仓数据
 */
function applyChanges(holdings, changes, type) {
  const holdingsMap = new Map(holdings.map(h => [h.id, h]));
  
  for (const change of changes) {
    const { id, operation, data, timestamp } = change;
    
    switch (operation) {
      case OperationType.CREATE:
        // 检查是否已存在（幂等性）
        if (!holdingsMap.has(id)) {
          holdingsMap.set(id, {
            ...data,
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
        break;
        
      case OperationType.UPDATE:
        const existing = holdingsMap.get(id);
        if (existing) {
          // 检查时间戳，避免覆盖更新的数据
          if (!existing.updatedAt || timestamp > existing.updatedAt) {
            holdingsMap.set(id, {
              ...existing,
              ...data,
              id,
              updatedAt: timestamp,
            });
          }
        } else {
          // 如果不存在，创建新记录
          holdingsMap.set(id, {
            ...data,
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
        break;
        
      case OperationType.DELETE:
        holdingsMap.delete(id);
        break;
    }
  }
  
  return Array.from(holdingsMap.values());
}

/**
 * 检测冲突
 */
function detectConflicts(localHoldings, serverHoldings, changes) {
  const conflicts = [];
  const serverMap = new Map(serverHoldings.map(h => [h.id, h]));
  
  for (const change of changes) {
    const serverItem = serverMap.get(change.id);
    
    if (serverItem && change.operation !== OperationType.CREATE) {
      const serverTime = serverItem.updatedAt || serverItem.createdAt || 0;
      
      // 如果服务器数据比客户端变更更新，则存在冲突
      if (serverTime > change.timestamp) {
        conflicts.push({
          id: change.id,
          type: change.operation,
          localData: change.data,
          serverData: serverItem,
          localTimestamp: change.timestamp,
          serverTimestamp: serverTime,
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * 增量同步用户数据
 */
const syncUserData = async (req, res, useMemoryStore, memoryStore) => {
  try {
    const {
      changes = [],
      fundHoldings: clientFundHoldings = [],
      stockHoldings: clientStockHoldings = [],
      accountGroups = [],
      settings = {},
      deviceId,
      timestamp,
    } = req.body;

    // 分离基金和股票的变更
    const fundChanges = changes.filter(c => c.data && (c.data.fundCode || c.id.startsWith('fund_')));
    const stockChanges = changes.filter(c => c.data && (c.data.stockCode || c.id.startsWith('stock_')));

    let userData;
    let serverFundHoldings = [];
    let serverStockHoldings = [];

    if (useMemoryStore) {
      // 使用内存存储
      userData = memoryStore.userData.find(data => data.userId === req.user.userId);
      
      if (!userData) {
        userData = {
          userId: req.user.userId,
          fundHoldings: [],
          stockHoldings: [],
          accountGroups: [],
          settings: {
            colorScheme: 'red-green',
            refreshInterval: 60000,
            lastSyncTime: null,
          },
          lastUpdated: new Date(),
        };
        memoryStore.userData.push(userData);
      }
      
      serverFundHoldings = userData.fundHoldings || [];
      serverStockHoldings = userData.stockHoldings || [];
    } else {
      // 使用 MongoDB
      userData = await UserData.findOne({ userId: req.user.userId });
      
      if (!userData) {
        userData = new UserData({ userId: req.user.userId });
      }
      
      serverFundHoldings = userData.fundHoldings || [];
      serverStockHoldings = userData.stockHoldings || [];
    }

    // 检测冲突
    const fundConflicts = detectConflicts(clientFundHoldings, serverFundHoldings, fundChanges);
    const stockConflicts = detectConflicts(clientStockHoldings, serverStockHoldings, stockChanges);
    const allConflicts = [...fundConflicts, ...stockConflicts];

    // 如果有冲突且不是强制同步，返回冲突信息
    if (allConflicts.length > 0 && !req.body.force) {
      return res.json({
        success: false,
        message: `检测到 ${allConflicts.length} 个数据冲突`,
        conflicts: allConflicts,
        requiresResolution: true,
      });
    }

    // 应用基金变更
    const updatedFundHoldings = applyChanges(serverFundHoldings, fundChanges, 'fund');
    
    // 应用股票变更
    const updatedStockHoldings = applyChanges(serverStockHoldings, stockChanges, 'stock');

    // 更新用户数据
    userData.fundHoldings = updatedFundHoldings;
    userData.stockHoldings = updatedStockHoldings;
    
    if (accountGroups && accountGroups.length > 0) {
      userData.accountGroups = accountGroups;
    }
    
    if (settings && Object.keys(settings).length > 0) {
      userData.settings = { ...userData.settings, ...settings };
    }
    
    userData.lastUpdated = new Date();
    userData.settings.lastSyncTime = Date.now();

    if (useMemoryStore) {
      // 内存存储已更新
    } else {
      await userData.save();
    }

    res.json({
      success: true,
      message: '同步成功',
      data: {
        fundHoldings: updatedFundHoldings,
        stockHoldings: updatedStockHoldings,
        accountGroups: userData.accountGroups,
        settings: userData.settings,
        lastUpdated: userData.lastUpdated,
      },
      conflicts: allConflicts,
      serverTimestamp: Date.now(),
    });
  } catch (error) {
    console.error('同步用户数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
    });
  }
};

/**
 * 获取同步状态
 */
const getSyncStatus = async (req, res, useMemoryStore, memoryStore) => {
  try {
    let userData;

    if (useMemoryStore) {
      userData = memoryStore.userData.find(data => data.userId === req.user.userId);
    } else {
      userData = await UserData.findOne({ userId: req.user.userId });
    }

    if (!userData) {
      return res.json({
        success: true,
        data: {
          lastSyncTime: null,
          fundHoldingsCount: 0,
          stockHoldingsCount: 0,
          accountGroupsCount: 0,
        },
      });
    }

    res.json({
      success: true,
      data: {
        lastSyncTime: userData.settings?.lastSyncTime || null,
        fundHoldingsCount: (userData.fundHoldings || []).length,
        stockHoldingsCount: (userData.stockHoldings || []).length,
        accountGroupsCount: (userData.accountGroups || []).length,
        lastUpdated: userData.lastUpdated,
      },
    });
  } catch (error) {
    console.error('获取同步状态失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

/**
 * 批量更新持仓数据
 */
const batchUpdateHoldings = async (req, res, useMemoryStore, memoryStore) => {
  try {
    const { fundHoldings = [], stockHoldings = [], replaceAll = false } = req.body;

    let userData;

    if (useMemoryStore) {
      userData = memoryStore.userData.find(data => data.userId === req.user.userId);
      
      if (!userData) {
        userData = {
          userId: req.user.userId,
          fundHoldings: [],
          stockHoldings: [],
          accountGroups: [],
          settings: {
            colorScheme: 'red-green',
            refreshInterval: 60000,
            lastSyncTime: null,
          },
          lastUpdated: new Date(),
        };
        memoryStore.userData.push(userData);
      }
    } else {
      userData = await UserData.findOne({ userId: req.user.userId });
      
      if (!userData) {
        userData = new UserData({ userId: req.user.userId });
      }
    }

    // 更新持仓数据
    if (replaceAll) {
      // 全量替换
      userData.fundHoldings = fundHoldings;
      userData.stockHoldings = stockHoldings;
    } else {
      // 增量更新 - 合并数据
      const existingFundMap = new Map((userData.fundHoldings || []).map(h => [h.id, h]));
      const existingStockMap = new Map((userData.stockHoldings || []).map(h => [h.id, h]));

      // 更新或添加基金持仓
      for (const holding of fundHoldings) {
        if (holding.id) {
          existingFundMap.set(holding.id, {
            ...existingFundMap.get(holding.id),
            ...holding,
            updatedAt: Date.now(),
          });
        }
      }

      // 更新或添加股票持仓
      for (const holding of stockHoldings) {
        if (holding.id) {
          existingStockMap.set(holding.id, {
            ...existingStockMap.get(holding.id),
            ...holding,
            updatedAt: Date.now(),
          });
        }
      }

      userData.fundHoldings = Array.from(existingFundMap.values());
      userData.stockHoldings = Array.from(existingStockMap.values());
    }

    userData.lastUpdated = new Date();

    if (!useMemoryStore) {
      await userData.save();
    }

    res.json({
      success: true,
      message: '批量更新成功',
      data: {
        fundHoldingsCount: userData.fundHoldings.length,
        stockHoldingsCount: userData.stockHoldings.length,
      },
    });
  } catch (error) {
    console.error('批量更新持仓失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

module.exports = {
  syncUserData,
  getSyncStatus,
  batchUpdateHoldings,
  applyChanges,
  detectConflicts,
};
