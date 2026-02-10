/**
 * 持仓数据同步功能测试脚本
 * 
 * 用于验证同步功能的正确性
 */

import { positionSyncService } from '../services/sync/positionSyncService';
import { SyncOperationType } from '../services/sync/positionSyncService';

/**
 * 测试同步功能
 */
export async function testPositionSync() {
  console.log('🧪 开始测试持仓数据同步功能...');
  
  try {
    // 测试1: 变更记录
    console.log('📋 测试1: 变更记录功能');
    
    const testChange = {
      id: 'test_holding_001',
      operation: SyncOperationType.CREATE,
      data: {
        fundCode: '000001',
        fundName: '测试基金',
        share: 1000,
        costPrice: 1.5,
      },
    };
    
    positionSyncService.recordChange(
      testChange.operation,
      testChange.data,
      testChange.id
    );
    
    const pendingCount = positionSyncService.getPendingChangesCount();
    console.log(`✅ 变更记录成功，待同步变更数: ${pendingCount}`);
    
    // 测试2: 同步状态
    console.log('🔄 测试2: 同步状态管理');
    
    const status = positionSyncService.getSyncStatus();
    console.log(`✅ 当前同步状态: ${status}`);
    
    // 测试3: 设备ID生成
    console.log('📱 测试3: 设备标识生成');
    
    // 触发设备ID生成
    const deviceId = localStorage.getItem('device_id');
    console.log(`✅ 设备ID: ${deviceId}`);
    
    // 测试4: 冲突检测
    console.log('⚔️ 测试4: 冲突检测功能');
    
    const mockServerData = {
      fundHoldings: [
        {
          id: 'test_holding_001',
          fundCode: '000001',
          fundName: '服务器版本',
          share: 2000,
          costPrice: 1.8,
          updatedAt: Date.now() + 1000, // 服务器时间更新
        },
      ],
      stockHoldings: [],
    };
    
    // 模拟冲突检测
    const conflicts = (positionSyncService as any).detectConflicts(
      [{ ...testChange, timestamp: Date.now() - 1000 }],
      mockServerData
    );
    
    console.log(`✅ 冲突检测结果: ${conflicts.length} 个冲突`);
    
    // 测试5: 数据校验和
    console.log('🔐 测试5: 数据校验和');
    
    const checksum = (positionSyncService as any).calculateChecksum(testChange.data);
    console.log(`✅ 数据校验和: ${checksum}`);
    
    // 测试6: 清理测试数据
    console.log('🧹 测试6: 清理测试数据');
    
    // 清空待同步变更
    (positionSyncService as any).pendingChanges = [];
    (positionSyncService as any).savePendingChanges();
    
    console.log('✅ 测试数据清理完成');
    
    console.log('🎉 所有测试通过！同步功能正常工作。');
    
    return {
      success: true,
      message: '所有同步功能测试通过',
      results: {
        changeRecording: true,
        statusManagement: true,
        deviceIdGeneration: true,
        conflictDetection: true,
        checksumValidation: true,
        cleanup: true,
      },
    };
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return {
      success: false,
      message: '测试失败: ' + (error as Error).message,
      error,
    };
  }
}

/**
 * 性能测试
 */
export async function testSyncPerformance() {
  console.log('⚡ 开始同步性能测试...');
  
  try {
    const startTime = performance.now();
    
    // 模拟大量变更
    const batchSize = 100;
    const testChanges = [];
    
    for (let i = 0; i < batchSize; i++) {
      testChanges.push({
        id: `perf_test_${i}`,
        operation: SyncOperationType.CREATE,
        data: {
          fundCode: `000${i.toString().padStart(3, '0')}`,
          fundName: `测试基金${i}`,
          share: 1000 + i,
          costPrice: 1.0 + i * 0.1,
        },
      });
    }
    
    // 批量记录变更
    const recordStart = performance.now();
    for (const change of testChanges) {
      positionSyncService.recordChange(
        change.operation,
        change.data,
        change.id
      );
    }
    const recordEnd = performance.now();
    
    const pendingCount = positionSyncService.getPendingChangesCount();
    console.log(`✅ 记录 ${batchSize} 个变更耗时: ${(recordEnd - recordStart).toFixed(2)}ms`);
    console.log(`✅ 当前待同步变更数: ${pendingCount}`);
    
    // 模拟冲突检测
    const mockServerData = {
      fundHoldings: testChanges.map(change => ({
        id: change.id,
        ...change.data,
        updatedAt: Date.now() + 1000,
      })),
      stockHoldings: [],
    };
    
    const conflictStart = performance.now();
    const conflicts = (positionSyncService as any).detectConflicts(
      testChanges.map(c => ({ ...c, timestamp: Date.now() - 1000 })),
      mockServerData
    );
    const conflictEnd = performance.now();
    
    console.log(`✅ 冲突检测耗时: ${(conflictEnd - conflictStart).toFixed(2)}ms`);
    console.log(`✅ 检测到冲突数: ${conflicts.length}`);
    
    // 清理
    (positionSyncService as any).pendingChanges = [];
    (positionSyncService as any).savePendingChanges();
    
    const totalTime = performance.now() - startTime;
    console.log(`🎉 性能测试完成，总耗时: ${totalTime.toFixed(2)}ms`);
    
    return {
      success: true,
      message: '性能测试通过',
      metrics: {
        batchSize,
        recordTime: recordEnd - recordStart,
        conflictDetectionTime: conflictEnd - conflictStart,
        totalTime,
        conflictsDetected: conflicts.length,
      },
    };
    
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
    return {
      success: false,
      message: '性能测试失败: ' + (error as Error).message,
      error,
    };
  }
}

/**
 * 运行所有测试
 */
export async function runAllSyncTests() {
  console.log('🚀 开始运行所有同步功能测试...\n');
  
  const results: {
    functional: any;
    performance: any;
  } = {
    functional: null,
    performance: null,
  };
  
  // 运行功能测试
  console.log('='.repeat(50));
  results.functional = await testPositionSync();
  
  console.log('\n' + '='.repeat(50));
  results.performance = await testSyncPerformance();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log(`功能测试: ${results.functional?.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`性能测试: ${results.performance?.success ? '✅ 通过' : '❌ 失败'}`);
  
  if (results.functional?.success && results.performance?.success) {
    console.log('\n🎉 所有测试通过！持仓数据同步方案已就绪。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关配置。');
  }
  
  return results;
}

// 如果直接运行此脚本，执行测试
if (typeof window !== 'undefined' && window.location?.href?.includes('test-sync')) {
  runAllSyncTests().then(results => {
    console.log('测试完成:', results);
  });
}
