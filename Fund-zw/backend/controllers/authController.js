const User = require('../models/User');
const UserData = require('../models/UserData');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 注册
const register = async (req, res, useMemoryStore, memoryStore) => {
  try {
    const { username, email, password } = req.body;

    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '请填写所有必填字段' });
    }

    if (useMemoryStore) {
      // 使用内存存储
      const existingUser = memoryStore.users.find(
        user => user.username === username || user.email === email
      );
      
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户名或邮箱已被使用' });
      }

      // 密码加密
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 创建新用户
      const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      memoryStore.users.push(newUser);

      // 创建用户数据
      const userData = {
        userId: newUser.id,
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

      // 生成 token
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email
          },
          token
        }
      });
    } else {
      // 使用 MongoDB
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户名或邮箱已被使用' });
      }

      // 创建新用户
      const user = new User({ username, email, password });
      await user.save();

      // 创建用户数据记录
      const userData = new UserData({ userId: user._id });
      await userData.save();

      // 生成 token
      const token = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          },
          token
        }
      });
    }
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 登录
const login = async (req, res, useMemoryStore, memoryStore) => {
  try {
    const { email, password } = req.body;

    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ success: false, message: '请填写邮箱和密码' });
    }

    if (useMemoryStore) {
      // 使用内存存储
      const user = memoryStore.users.find(user => user.email === email);
      if (!user) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
      }

      // 验证密码
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
      }

      // 生成 token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          },
          token
        }
      });
    } else {
      // 使用 MongoDB
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
      }

      // 验证密码
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
      }

      // 生成 token
      const token = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          },
          token
        }
      });
    }
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 获取当前用户信息
const getMe = async (req, res, useMemoryStore, memoryStore) => {
  try {
    if (useMemoryStore) {
      // 使用内存存储
      const user = memoryStore.users.find(user => user.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      res.json({
        success: true,
        data: { 
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        }
      });
    } else {
      // 使用 MongoDB
      const user = await User.findById(req.user.userId).select('-password');
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }

      res.json({
        success: true,
        data: { user }
      });
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 登出
const logout = (req, res) => {
  // 前端清除 token 即可
  res.json({
    success: true,
    message: '登出成功'
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
