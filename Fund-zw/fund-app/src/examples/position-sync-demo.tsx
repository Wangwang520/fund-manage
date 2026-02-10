import React, { useState } from 'react';
import { Card, Button, Space, Tag, message } from 'antd';
import { SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { usePositionSync } from '../hooks/usePositionSync';
import { SyncStatus } from '../services/sync/positionSyncService';
import { useEnhancedFundStore } from '../store/enhancedFundStore';

/**
 * 持仓数据同步方案演示组件
 * 
 * 展示优化后的同步功能：
 * - 增量同步
 * - 冲突检测
 * - 批量操作
 * - 状态管理
 */
export const PositionSyncDemo: React.FC = () => {
  const {
    status,
    isSyncing,
    sync,
    hasPendingChanges,
    pendingChangesCount,
    lastSyncTime,
  } = usePositionSync();

  const { addHolding } = useEnhancedFundStore();

  const [demoHoldings] = useState([
    {
      fundCode: '000001',
      fundName: '华夏成长混合',
      share: 1000,
      costPrice: 1.5,
      addTime: Date.now(),
      notes: '演示数据',
    },
    {
      fundCode: '000002',
      fundName: '华夏大盘精选',
      share: 2000,
      costPrice: 2.0,
      addTime: Date.now(),
      notes: '演示数据',
    },
  ]);

  const getStatusDisplay = () => {
    switch (status) {
      case SyncStatus.SYNCING:
        return {
          icon: <SyncOutlined spin />,
          color: 'blue',
          text: '同步中...',
        };
      case SyncStatus.SUCCESS:
        return {
          icon: <CheckCircleOutlined />,
          color: 'green',
          text: '同步成功',
        };
      case SyncStatus.ERROR:
        return {
          icon: <ExclamationCircleOutlined />,
          color: 'red',
          text: '同步失败',
        };
      case SyncStatus.CONFLICT:
        return {
          icon: <ExclamationCircleOutlined />,
          color: 'orange',
          text: '存在冲突',
        };
      default:
        return {
          icon: <SyncOutlined />,
          color: 'default',
          text: '未同步',
        };
    }
  };

  const handleAddDemoHolding = async () => {
    try {
      const randomHolding = demoHoldings[Math.floor(Math.random() * demoHoldings.length)];
      await addHolding(randomHolding);
      message.success('已添加演示持仓，变更将自动同步');
    } catch (error) {
      message.error('添加失败：' + (error as Error).message);
    }
  };

  const handleManualSync = async () => {
    try {
      const result = await sync();
      if (result.success) {
        message.success(`同步成功！应用了 ${result.changesApplied} 个变更`);
      } else {
        message.warning(result.message);
      }
    } catch (error) {
      message.error('同步失败：' + (error as Error).message);
    }
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div style={{ padding: 24 }}>
      <Card title="持仓数据同步演示" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 同步状态显示 */}
          <div>
            <h3>同步状态</h3>
            <Space>
              <Tag icon={statusDisplay.icon} color={statusDisplay.color}>
                {statusDisplay.text}
              </Tag>
              {hasPendingChanges && (
                <Tag color="blue">
                  {pendingChangesCount} 个变更待同步
                </Tag>
              )}
            </Space>
          </div>

          {/* 同步信息 */}
          <div>
            <h3>同步信息</h3>
            <p>上次同步时间: {formatTime(lastSyncTime)}</p>
            {hasPendingChanges && (
              <p style={{ color: '#1890ff' }}>
                有未同步的变更，将在下次同步时上传
              </p>
            )}
          </div>

          {/* 操作按钮 */}
          <div>
            <h3>操作演示</h3>
            <Space>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                onClick={handleManualSync}
                loading={isSyncing}
              >
                手动同步
              </Button>
              <Button
                onClick={handleAddDemoHolding}
                disabled={isSyncing}
              >
                添加演示持仓
              </Button>
            </Space>
          </div>

          {/* 功能说明 */}
          <div>
            <h3>功能特性</h3>
            <ul>
              <li>✅ <strong>增量同步</strong> - 只传输变更的数据，减少网络开销</li>
              <li>✅ <strong>冲突检测</strong> - 自动检测多设备同时修改的冲突</li>
              <li>✅ <strong>批量操作</strong> - 支持批量增删改，提高性能</li>
              <li>✅ <strong>离线支持</strong> - 本地缓存未同步的变更</li>
              <li>✅ <strong>自动同步</strong> - 定期自动同步或手动触发</li>
            </ul>
          </div>

          {/* 使用说明 */}
          <div>
            <h3>使用说明</h3>
            <ol>
              <li>点击"添加演示持仓"模拟本地数据变更</li>
              <li>系统会自动记录变更到本地队列</li>
              <li>点击"手动同步"将变更上传到服务器</li>
              <li>同步状态会实时显示在界面上</li>
            </ol>
          </div>
        </Space>
      </Card>
    </div>
  );
};

/**
 * 同步状态指示器组件
 * 可以集成到应用的导航栏或状态栏
 */
export const SimpleSyncIndicator: React.FC = () => {
  const { status, pendingChangesCount } = usePositionSync();

  const getIcon = () => {
    switch (status) {
      case SyncStatus.SYNCING:
        return <SyncOutlined spin />;
      case SyncStatus.SUCCESS:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case SyncStatus.ERROR:
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case SyncStatus.CONFLICT:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <SyncOutlined />;
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {getIcon()}
      {pendingChangesCount > 0 && (
        <span style={{ fontSize: 12, color: '#1890ff' }}>
          {pendingChangesCount}
        </span>
      )}
    </div>
  );
};

export default PositionSyncDemo;
