/**
 * 持仓数据同步系统健康检查
 * 
 * 验证前端、后端和同步功能是否正常工作
 */

/**
 * 检查后端服务状态
 */
async function checkBackendHealth(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();
    
    return {
      success: response.ok && data.status === 'ok',
      message: data.message || 'Backend service check failed',
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: `Backend service unavailable: ${(error as Error).message}`,
    };
  }
}

/**
 * 检查同步API端点
 */
async function checkSyncAPI(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // 测试同步状态端点（需要认证，会返回401但说明端点存在）
    const response = await fetch('http://localhost:3001/api/position-sync/status');
    
    if (response.status === 401) {
      return {
        success: true,
        message: 'Sync API endpoint is available (auth required)',
      };
    }
    
    const data = await response.json();
    return {
      success: response.ok,
      message: data.message || 'Sync API check completed',
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: `Sync API unavailable: ${(error as Error).message}`,
    };
  }
}

/**
 * 检查代理配置
 */
async function checkProxyConfig(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // 通过前端代理访问后端API
    const response = await fetch('http://localhost:5173/api/health');
    const data = await response.json();
    
    return {
      success: response.ok && data.status === 'ok',
      message: data.message || 'Proxy configuration check failed',
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: `Proxy configuration failed: ${(error as Error).message}`,
    };
  }
}

/**
 * 检查同步服务状态
 */
async function checkSyncService(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // 动态导入避免SSR问题
    const { positionSyncService } = await import('../services/sync/positionSyncService');
    
    const status = positionSyncService.getSyncStatus();
    const pendingCount = positionSyncService.getPendingChangesCount();
    
    return {
      success: true,
      message: 'Sync service is initialized and ready',
      data: {
        status,
        pendingChangesCount: pendingCount,
        hasPendingChanges: pendingCount > 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Sync service initialization failed: ${(error as Error).message}`,
    };
  }
}

/**
 * 检查存储服务
 */
async function checkStorageServices(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // 检查本地存储支持
    const testKey = 'sync_health_check_test';
    const testValue = 'test_value_' + Date.now();
    
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    const storageWorks = retrieved === testValue;
    
    return {
      success: storageWorks,
      message: storageWorks ? 'Local storage is working correctly' : 'Local storage test failed',
      data: {
        localStorageSupported: typeof localStorage !== 'undefined',
        testPassed: storageWorks,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Storage service check failed: ${(error as Error).message}`,
    };
  }
}

/**
 * 运行完整的健康检查
 */
export async function runHealthCheck(): Promise<{
  overall: boolean;
  timestamp: number;
  results: {
    backend: any;
    syncAPI: any;
    proxy: any;
    syncService: any;
    storage: any;
  };
}> {
  console.log('🔍 开始运行持仓数据同步系统健康检查...\n');
  
  const results = {
    backend: null,
    syncAPI: null,
    proxy: null,
    syncService: null,
    storage: null,
  } as any;
  
  // 检查后端服务
  console.log('1️⃣ 检查后端服务状态...');
  results.backend = await checkBackendHealth();
  console.log(`   ${results.backend.success ? '✅' : '❌'} ${results.backend.message}\n`);
  
  // 检查同步API
  console.log('2️⃣ 检查同步API端点...');
  results.syncAPI = await checkSyncAPI();
  console.log(`   ${results.syncAPI.success ? '✅' : '❌'} ${results.syncAPI.message}\n`);
  
  // 检查代理配置
  console.log('3️⃣ 检查前端代理配置...');
  results.proxy = await checkProxyConfig();
  console.log(`   ${results.proxy.success ? '✅' : '❌'} ${results.proxy.message}\n`);
  
  // 检查同步服务（仅在浏览器环境中）
  if (typeof window !== 'undefined') {
    console.log('4️⃣ 检查同步服务状态...');
    results.syncService = await checkSyncService();
    console.log(`   ${results.syncService.success ? '✅' : '❌'} ${results.syncService.message}\n`);
    
    console.log('5️⃣ 检查存储服务...');
    results.storage = await checkStorageServices();
    console.log(`   ${results.storage.success ? '✅' : '❌'} ${results.storage.message}\n`);
  } else {
    console.log('4️⃣ 跳过同步服务检查（非浏览器环境）\n');
    console.log('5️⃣ 跳过存储服务检查（非浏览器环境）\n');
    
    results.syncService = {
      success: true,
      message: 'Skipped in non-browser environment',
    };
    results.storage = {
      success: true,
      message: 'Skipped in non-browser environment',
    };
  }
  
  // 计算总体状态
  const overall = results.backend.success && 
                 results.syncAPI.success && 
                 results.proxy.success && 
                 results.syncService.success && 
                 results.storage.success;
  
  console.log('='.repeat(50));
  console.log('📊 健康检查汇总:');
  console.log(`后端服务: ${results.backend.success ? '✅ 正常' : '❌ 异常'}`);
  console.log(`同步API: ${results.syncAPI.success ? '✅ 正常' : '❌ 异常'}`);
  console.log(`代理配置: ${results.proxy.success ? '✅ 正常' : '❌ 异常'}`);
  console.log(`同步服务: ${results.syncService.success ? '✅ 正常' : '❌ 异常'}`);
  console.log(`存储服务: ${results.storage.success ? '✅ 正常' : '❌ 异常'}`);
  console.log('='.repeat(50));
  
  if (overall) {
    console.log('🎉 系统健康检查通过！所有服务运行正常。');
  } else {
    console.log('⚠️  发现一些问题，请查看上面的详细检查结果。');
  }
  
  return {
    overall,
    timestamp: Date.now(),
    results,
  };
}

/**
 * 创建健康检查UI组件
 */
import { useState } from 'react';

export function HealthCheckComponent() {
  const [healthStatus, setHealthStatus] = useState<{
    overall: boolean;
    timestamp: number;
    results: any;
  } | null>(null);
  
  const [checking, setChecking] = useState(false);
  
  const handleCheck = async () => {
    setChecking(true);
    try {
      const result = await runHealthCheck();
      setHealthStatus(result);
    } catch (error) {
      console.error('健康检查失败:', error);
      setHealthStatus({
        overall: false,
        timestamp: Date.now(),
        results: {
          error: (error as Error).message,
        },
      });
    } finally {
      setChecking(false);
    }
  };
  
  return {
    healthStatus,
    checking,
    runCheck: handleCheck,
  };
}

// 如果直接运行此脚本，执行健康检查
if (typeof window !== 'undefined' && window.location?.href?.includes('health-check')) {
  runHealthCheck().then(results => {
    console.log('健康检查完成:', results);
  });
}
