import React from 'react';
import { Spin, Badge, Tooltip, Button, Modal, List, Tag, Space } from 'antd';
import { SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useSyncIndicator, usePositionSync } from '../hooks/usePositionSync';
import { SyncStatus, type SyncConflict } from '../services/sync/positionSyncService';

/**
 * 同步状态指示器组件
 * 显示当前同步状态和待同步变更数量
 */
export const SyncStatusIndicator: React.FC = () => {
  const { status, isVisible, message } = useSyncIndicator();
  const { pendingChangesCount, sync, isSyncing } = usePositionSync();

  const getIcon = () => {
    switch (status) {
      case SyncStatus.SYNCING:
        return <Spin size="small" />;
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

  const getTooltipText = () => {
    if (message) return message;
    if (pendingChangesCount > 0) return `${pendingChangesCount} 个变更待同步`;
    return '点击同步';
  };

  if (!isVisible && pendingChangesCount === 0) {
    return (
      <Tooltip title={getTooltipText()}>
        <Button
          type="text"
          icon={<SyncOutlined />}
          onClick={sync}
          loading={isSyncing}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={getTooltipText()}>
      <Badge count={pendingChangesCount} size="small" offset={[-5, 5]}>
        <Button
          type="text"
          icon={getIcon()}
          onClick={sync}
          loading={isSyncing}
        />
      </Badge>
    </Tooltip>
  );
};

/**
 * 冲突解决对话框
 */
interface ConflictResolverProps {
  visible: boolean;
  conflicts: SyncConflict[];
  onResolve: (conflictId: string, useLocal: boolean) => void;
  onClose: () => void;
  onForceSync: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  visible,
  conflicts,
  onResolve,
  onClose,
  onForceSync,
}) => {
  return (
    <Modal
      title="数据冲突解决"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="force" onClick={onForceSync} danger>
          强制同步（以服务器为准）
        </Button>,
        <Button key="close" onClick={onClose}>
          稍后处理
        </Button>,
      ]}
      width={700}
    >
      <p>检测到 {conflicts.length} 个数据冲突，请选择保留哪个版本：</p>
      <List
        dataSource={conflicts}
        renderItem={(conflict) => (
          <List.Item
            actions={[
              <Button
                key="local"
                type="primary"
                size="small"
                onClick={() => onResolve(conflict.id, true)}
              >
                保留本地
              </Button>,
              <Button
                key="server"
                size="small"
                onClick={() => onResolve(conflict.id, false)}
              >
                使用服务器
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={`冲突 ID: ${conflict.id}`}
              description={
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <Tag color="blue">本地数据</Tag>
                    <pre style={{ margin: 0, fontSize: 12 }}>
                      {JSON.stringify(conflict.localData, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <Tag color="orange">服务器数据</Tag>
                    <pre style={{ margin: 0, fontSize: 12 }}>
                      {JSON.stringify(conflict.serverData, null, 2)}
                    </pre>
                  </div>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  );
};

/**
 * 同步控制面板
 * 提供完整的同步控制功能
 */
export const SyncControlPanel: React.FC = () => {
  const {
    status,
    isSyncing,
    hasConflicts,
    conflicts,
    pendingChangesCount,
    lastSyncTime,
    sync,
    forceSync,
    resolveConflict,
  } = usePositionSync();

  const [showConflicts, setShowConflicts] = React.useState(false);

  React.useEffect(() => {
    if (hasConflicts) {
      setShowConflicts(true);
    }
  }, [hasConflicts]);

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getStatusTag = () => {
    switch (status) {
      case SyncStatus.SYNCING:
        return <Tag icon={<SyncOutlined spin />} color="processing">同步中</Tag>;
      case SyncStatus.SUCCESS:
        return <Tag icon={<CheckCircleOutlined />} color="success">同步成功</Tag>;
      case SyncStatus.ERROR:
        return <Tag icon={<ExclamationCircleOutlined />} color="error">同步失败</Tag>;
      case SyncStatus.CONFLICT:
        return <Tag icon={<ExclamationCircleOutlined />} color="warning">存在冲突</Tag>;
      default:
        return <Tag>未同步</Tag>;
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>同步状态: {getStatusTag()}</span>
          <Space>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={sync}
              loading={isSyncing}
            >
              立即同步
            </Button>
            <Button onClick={() => setShowConflicts(true)} disabled={!hasConflicts}>
              解决冲突
            </Button>
          </Space>
        </div>

        <div>
          <p style={{ margin: '8px 0' }}>
            <strong>上次同步时间:</strong> {formatTime(lastSyncTime)}
          </p>
          <p style={{ margin: '8px 0' }}>
            <strong>待同步变更:</strong>{' '}
            {pendingChangesCount > 0 ? (
              <Badge count={pendingChangesCount} style={{ backgroundColor: '#1890ff' }} />
            ) : (
              '无'
            )}
          </p>
        </div>

        {pendingChangesCount > 0 && (
          <div style={{ background: '#f6ffed', padding: 12, borderRadius: 4, border: '1px solid #b7eb8f' }}>
            <Space>
              <CloudUploadOutlined style={{ color: '#52c41a' }} />
              <span>有 {pendingChangesCount} 个变更将在下次同步时上传</span>
            </Space>
          </div>
        )}
      </Space>

      <ConflictResolver
        visible={showConflicts}
        conflicts={conflicts}
        onResolve={async (id, useLocal) => {
          await resolveConflict(id, useLocal);
          if (conflicts.length <= 1) {
            setShowConflicts(false);
          }
        }}
        onClose={() => setShowConflicts(false)}
        onForceSync={async () => {
          await forceSync();
          setShowConflicts(false);
        }}
      />
    </div>
  );
};

export default SyncStatusIndicator;
