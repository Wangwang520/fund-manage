const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3001;

// 配置中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 内存存储（用于降级方案）
const memoryStore = {
  users: [],
  userData: []
};

let useMemoryStore = false;

// 尝试连接 MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fund-app')
  .then(() => {
    console.log('MongoDB 连接成功');
    useMemoryStore = false;
  })
  .catch((error) => {
    console.error('MongoDB 连接失败，使用内存存储:', error.message);
    useMemoryStore = true;
  })
  .finally(() => {
    // 导入路由
    const authRoutes = require('./routes/auth')(useMemoryStore, memoryStore);
    const dataRoutes = require('./routes/data')(useMemoryStore, memoryStore);

    // 注册路由
    app.use('/api/auth', authRoutes);
    app.use('/api/data', dataRoutes);

    // 根路径路由
    app.get('/', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: '后端服务运行正常',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth/*',
          data: '/api/data/*',
          health: '/api/health'
        },
        storage: useMemoryStore ? 'memory' : 'mongodb'
      });
    });

    // 健康检查路由
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: '服务运行正常',
        storage: useMemoryStore ? 'memory' : 'mongodb'
      });
    });

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`存储模式: ${useMemoryStore ? '内存存储' : 'MongoDB'}`);
    });
  });
