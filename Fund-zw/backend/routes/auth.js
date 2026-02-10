const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

module.exports = (useMemoryStore, memoryStore) => {
  const router = express.Router();
  
  // 注册
  router.post('/register', (req, res) => {
    authController.register(req, res, useMemoryStore, memoryStore);
  });
  
  // 登录
  router.post('/login', (req, res) => {
    authController.login(req, res, useMemoryStore, memoryStore);
  });
  
  // 获取当前用户信息
  router.get('/me', authMiddleware(useMemoryStore, memoryStore), (req, res) => {
    authController.getMe(req, res, useMemoryStore, memoryStore);
  });
  
  // 登出
  router.post('/logout', authMiddleware(useMemoryStore, memoryStore), (req, res) => {
    authController.logout(req, res);
  });
  
  return router;
};
