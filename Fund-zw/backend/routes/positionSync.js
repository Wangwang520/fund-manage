const express = require('express');
const positionSyncController = require('../controllers/positionSyncController');
const authMiddleware = require('../middleware/auth');

/**
 * 持仓数据同步路由
 * 
 * 提供增量同步、冲突检测和批量操作接口
 */
module.exports = (useMemoryStore, memoryStore) => {
  const router = express.Router();
  
  // 增量同步用户数据
  router.post('/sync', authMiddleware(useMemoryStore, memoryStore), (req, res) => {
    positionSyncController.syncUserData(req, res, useMemoryStore, memoryStore);
  });
  
  // 获取同步状态
  router.get('/status', authMiddleware(useMemoryStore, memoryStore), (req, res) => {
    positionSyncController.getSyncStatus(req, res, useMemoryStore, memoryStore);
  });
  
  // 批量更新持仓数据
  router.post('/batch', authMiddleware(useMemoryStore, memoryStore), (req, res) => {
    positionSyncController.batchUpdateHoldings(req, res, useMemoryStore, memoryStore);
  });
  
  return router;
};
