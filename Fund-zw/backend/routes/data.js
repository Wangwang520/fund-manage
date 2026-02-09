const express = require('express');
const dataController = require('../controllers/dataController');
const authMiddleware = require('../middleware/auth');

module.exports = (useMemoryStore, memoryStore) => {
  const router = express.Router();
  
  // 获取用户数据
  router.get('/get', authMiddleware(useMemoryStore, memoryStore), (req, res) => {
    dataController.getUserData(req, res, useMemoryStore, memoryStore);
  });
  
  // 保存用户数据
  router.post('/save', authMiddleware(useMemoryStore, memoryStore), (req, res) => {
    dataController.saveUserData(req, res, useMemoryStore, memoryStore);
  });
  
  // 增量更新用户数据
  router.post('/update', authMiddleware(useMemoryStore, memoryStore), (req, res) => {
    dataController.updateUserData(req, res, useMemoryStore, memoryStore);
  });
  
  return router;
};
