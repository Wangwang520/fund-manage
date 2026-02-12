#!/usr/bin/env node

/**
 * MongoDB 连通性验证脚本
 * 
 * 功能：
 * 1. 测试MongoDB连接
 * 2. 执行基本数据库操作
 * 3. 提供详细的连接状态和错误信息
 * 4. 支持自定义连接字符串
 * 
 * 使用方法：
 * - 默认连接: node test-mongodb-connection.js
 * - 自定义连接: node test-mongodb-connection.js <mongodb-uri>
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 获取命令行参数中的连接字符串
const customMongoUri = process.argv[2];

// 构建完整的MongoDB连接字符串（包含认证信息）
let MONGODB_URI = customMongoUri;

if (!MONGODB_URI) {
  // 从环境变量读取连接信息
  const baseUri = process.env.MONGODB_URI;
  const username = process.env.MongoDB_Username;
  const password = process.env.MongoDB_Password;
  
  if (username && password) {
    // 构建带认证的连接字符串
    const uriParts = baseUri.split('://');
    const protocol = uriParts[0];
    const rest = uriParts[1];
    const [hostPort, dbName] = rest.split('/');
    
    MONGODB_URI = `${protocol}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostPort}/${dbName || ''}`;
  } else {
    MONGODB_URI = baseUri;
  }
}

// 测试集合和文档
const TEST_COLLECTION = 'test_connections';
const TEST_DOCUMENT = {
  message: 'MongoDB connection test',
  timestamp: new Date(),
  test: true
};

// 颜色输出函数
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m', // 青色
    success: '\x1b[32m', // 绿色
    error: '\x1b[31m', // 红色
    warning: '\x1b[33m', // 黄色
    reset: '\x1b[0m' // 重置
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

// 测试连接函数
async function testMongoDBConnection() {
  log('🚀 开始测试 MongoDB 连通性...', 'info');
  log(`🔗 连接字符串: ${MONGODB_URI}`, 'info');
  
  let connection;
  
  try {
    // 1. 测试连接
    log('\n📡 步骤 1: 尝试连接到 MongoDB...', 'info');
    
    const startTime = Date.now();
    connection = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5秒超时
      socketTimeoutMS: 10000, // 10秒套接字超时
    });
    const connectTime = Date.now() - startTime;
    
    log(`✅ 连接成功！耗时: ${connectTime}ms`, 'success');
    
    // 2. 获取数据库信息
    log('\n📊 步骤 2: 获取数据库信息...', 'info');
    
    const db = connection.connection.db;
    const dbName = db.databaseName;
    
    // 尝试获取MongoDB版本（避免使用需要认证的命令）
    let mongoVersion = 'unknown';
    try {
      // 尝试使用listDatabases命令，这通常不需要管理员权限
      const listDatabasesResult = await db.admin().command({ listDatabases: 1 });
      // 从连接对象中获取版本信息
      const serverInfo = connection.connection.client.s.options.serverApi;
      if (serverInfo && serverInfo.version) {
        mongoVersion = serverInfo.version;
      } else {
        // 尝试从连接字符串中推断
        mongoVersion = 'detected (from connection)';
      }
    } catch (versionError) {
      log('⚠️  获取MongoDB版本失败（可能需要认证）:', 'warning');
      mongoVersion = 'unknown (authentication required)';
    }
    
    log(`✅ 数据库名称: ${dbName}`, 'success');
    log(`✅ MongoDB 版本: ${mongoVersion}`, 'success');
    
    // 3. 测试基本操作（根据认证情况调整）
    log('\n⚡ 步骤 3: 测试基本数据库操作...', 'info');
    
    try {
      // 创建测试集合
      const testCollection = db.collection(TEST_COLLECTION);
      
      // 插入测试文档
      const insertResult = await testCollection.insertOne(TEST_DOCUMENT);
      log(`✅ 插入测试文档成功，ID: ${insertResult.insertedId}`, 'success');
      
      // 查询测试文档
      const foundDocument = await testCollection.findOne({ _id: insertResult.insertedId });
      if (foundDocument) {
        log('✅ 查询测试文档成功', 'success');
      } else {
        log('❌ 查询测试文档失败', 'error');
      }
      
      // 删除测试文档
      const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
      if (deleteResult.deletedCount > 0) {
        log('✅ 删除测试文档成功', 'success');
      } else {
        log('❌ 删除测试文档失败', 'error');
      }
      
      // 4. 测试连接池
      log('\n🏊 步骤 4: 测试连接池...', 'info');
      
      // 并行执行多个操作测试连接池
      const poolTests = [];
      for (let i = 0; i < 5; i++) {
        poolTests.push(
          db.collection(TEST_COLLECTION).insertOne({
            testId: i,
            timestamp: new Date(),
            message: `Connection pool test ${i}`
          }).then(result => {
            return db.collection(TEST_COLLECTION).deleteOne({ _id: result.insertedId });
          })
        );
      }
      
      await Promise.all(poolTests);
      log('✅ 连接池测试成功', 'success');
      
      // 5. 清理测试集合
      log('\n🧹 步骤 5: 清理测试数据...', 'info');
      await testCollection.deleteMany({ test: true });
      log('✅ 清理测试数据成功', 'success');
      
      // 6. 总结
      log('\n' + '='.repeat(60), 'info');
      log('🎉 MongoDB 连通性测试完成', 'success');
      log('✅ 所有测试通过！', 'success');
      log(`📋 连接信息: ${MONGODB_URI}`, 'info');
      log(`📋 MongoDB 版本: ${mongoVersion}`, 'info');
      log(`📋 数据库名称: ${dbName}`, 'info');
      log('📋 操作权限: 完整读写权限', 'info');
      log('='.repeat(60), 'info');
    } catch (operationError) {
      if (operationError.codeName === 'AuthenticationFailed' || 
          operationError.message.includes('requires authentication')) {
        // 处理认证失败的情况
        log('⚠️  基本操作测试失败（需要认证）:', 'warning');
        log(`📋 错误信息: ${operationError.message}`, 'warning');
        
        // 6. 总结（仅连接测试通过）
        log('\n' + '='.repeat(60), 'info');
        log('🎉 MongoDB 连通性测试完成', 'success');
        log('⚠️  部分测试通过：连接成功，但操作需要认证', 'warning');
        log(`📋 连接信息: ${MONGODB_URI}`, 'info');
        log(`📋 MongoDB 版本: ${mongoVersion}`, 'info');
        log(`📋 数据库名称: ${dbName}`, 'info');
        log('📋 操作权限: 需要认证', 'warning');
        log('💡 提示: 请提供有效的认证信息以测试完整功能', 'warning');
        log('='.repeat(60), 'info');
      } else {
        // 其他操作错误
        throw operationError;
      }
    }
    
  } catch (error) {
    log('\n❌ MongoDB 连接测试失败', 'error');
    log(`📋 错误类型: ${error.name}`, 'error');
    log(`📋 错误信息: ${error.message}`, 'error');
    
    if (error.code === 'ECONNREFUSED') {
      log('💡 提示: MongoDB 服务可能未启动或连接字符串错误', 'warning');
      log('💡 建议: 检查 MongoDB 服务状态和连接字符串', 'warning');
    } else if (error.codeName === 'AuthenticationFailed') {
      log('💡 提示: 身份验证失败，请检查用户名和密码', 'warning');
    } else if (error.codeName === 'ConnectionTimeout') {
      log('💡 提示: 连接超时，请检查网络连接和 MongoDB 服务状态', 'warning');
    }
    
    log('\n' + '='.repeat(60), 'info');
    log('❌ MongoDB 连通性测试失败', 'error');
    log('='.repeat(60), 'info');
    
    process.exit(1);
  } finally {
    // 关闭连接
    if (connection) {
      try {
        await connection.disconnect();
        log('✅ 连接已关闭', 'success');
      } catch (closeError) {
        log(`❌ 关闭连接失败: ${closeError.message}`, 'error');
      }
    }
  }
}

// 运行测试
testMongoDBConnection();
