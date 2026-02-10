const UserData = require('../models/UserData');

// 获取用户数据
const getUserData = async (req, res, useMemoryStore, memoryStore) => {
  try {
    if (useMemoryStore) {
      // 使用内存存储
      let userData = memoryStore.userData.find(data => data.userId === req.user.userId);
      
      if (!userData) {
        // 如果用户数据不存在，创建一个新的
        userData = {
          userId: req.user.userId,
          fundHoldings: [],
          stockHoldings: [],
          accountGroups: [],
          settings: {
            colorScheme: 'red-green',
            refreshInterval: 60000,
            lastSyncTime: null
          },
          lastUpdated: new Date()
        };
        memoryStore.userData.push(userData);
      }

      res.json({
        success: true,
        data: userData
      });
    } else {
      // 使用 MongoDB
      const userData = await UserData.findOne({ userId: req.user.userId });
      
      if (!userData) {
        // 如果用户数据不存在，创建一个新的
        const newUserData = new UserData({ userId: req.user.userId });
        await newUserData.save();
        return res.json({
          success: true,
          data: newUserData
        });
      }

      res.json({
        success: true,
        data: userData
      });
    }
  } catch (error) {
    console.error('获取用户数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 保存用户数据
const saveUserData = async (req, res, useMemoryStore, memoryStore) => {
  try {
    const { fundHoldings, stockHoldings, accountGroups, settings } = req.body;

    if (useMemoryStore) {
      // 使用内存存储
      let userData = memoryStore.userData.find(data => data.userId === req.user.userId);
      
      if (!userData) {
        userData = {
          userId: req.user.userId,
          fundHoldings: [],
          stockHoldings: [],
          accountGroups: [],
          settings: {
            colorScheme: 'red-green',
            refreshInterval: 60000,
            lastSyncTime: null
          },
          lastUpdated: new Date()
        };
        memoryStore.userData.push(userData);
      }

      // 更新数据
      if (fundHoldings) userData.fundHoldings = fundHoldings;
      if (stockHoldings) userData.stockHoldings = stockHoldings;
      if (accountGroups) userData.accountGroups = accountGroups;
      if (settings) userData.settings = settings;
      
      userData.lastUpdated = new Date();

      res.json({
        success: true,
        message: '数据保存成功',
        data: userData
      });
    } else {
      // 使用 MongoDB
      let userData = await UserData.findOne({ userId: req.user.userId });
      
      if (!userData) {
        userData = new UserData({ userId: req.user.userId });
      }

      // 更新数据
      if (fundHoldings) userData.fundHoldings = fundHoldings;
      if (stockHoldings) userData.stockHoldings = stockHoldings;
      if (accountGroups) userData.accountGroups = accountGroups;
      if (settings) userData.settings = settings;
      
      userData.lastUpdated = new Date();

      await userData.save();

      res.json({
        success: true,
        message: '数据保存成功',
        data: userData
      });
    }
  } catch (error) {
    console.error('保存用户数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 增量更新用户数据
const updateUserData = async (req, res, useMemoryStore, memoryStore) => {
  try {
    const { fundHoldings, stockHoldings, accountGroups, settings } = req.body;

    if (useMemoryStore) {
      // 使用内存存储
      let userData = memoryStore.userData.find(data => data.userId === req.user.userId);
      
      if (!userData) {
        userData = {
          userId: req.user.userId,
          fundHoldings: [],
          stockHoldings: [],
          accountGroups: [],
          settings: {
            colorScheme: 'red-green',
            refreshInterval: 60000,
            lastSyncTime: null
          },
          lastUpdated: new Date()
        };
        memoryStore.userData.push(userData);
      }

      // 增量更新数据
      if (fundHoldings) userData.fundHoldings = fundHoldings;
      if (stockHoldings) userData.stockHoldings = stockHoldings;
      if (accountGroups) userData.accountGroups = accountGroups;
      if (settings) userData.settings = settings;
      
      userData.lastUpdated = new Date();

      res.json({
        success: true,
        message: '数据更新成功',
        data: userData
      });
    } else {
      // 使用 MongoDB
      let userData = await UserData.findOne({ userId: req.user.userId });
      
      if (!userData) {
        userData = new UserData({ userId: req.user.userId });
      }

      // 增量更新数据
      if (fundHoldings) userData.fundHoldings = fundHoldings;
      if (stockHoldings) userData.stockHoldings = stockHoldings;
      if (accountGroups) userData.accountGroups = accountGroups;
      if (settings) userData.settings = settings;
      
      userData.lastUpdated = new Date();

      await userData.save();

      res.json({
        success: true,
        message: '数据更新成功',
        data: userData
      });
    }
  } catch (error) {
    console.error('更新用户数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = {
  getUserData,
  saveUserData,
  updateUserData
};
