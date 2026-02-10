# 持仓数据同步方案使用文档

## 概述

本文档介绍优化后的持仓数据同步方案，支持增量同步、冲突检测和批量操作。

## 核心特性

1. **增量同步** - 只传输变更的数据，减少网络开销
2. **冲突检测** - 自动检测多设备同时修改的冲突
3. **批量操作** - 支持批量增删改，提高性能
4. **离线支持** - 本地缓存未同步的变更
5. **版本控制** - 基于时间戳的数据一致性保证

## 快速开始

### 1. 使用同步 Hook

```tsx
import { usePositionSync, useAutoPositionSync } from '../hooks/usePositionSync';
import { SyncStatusIndicator, SyncControlPanel } from '../components/SyncStatusIndicator';

// 基础使用
function MyComponent() {
  const { 
    status, 
    isSyncing, 
    sync, 
    hasPendingChanges,
    pendingChangesCount 
  } = usePositionSync();

  return (
    <button onClick={sync} disabled={isSyncing}>
      {isSyncing ? '同步中...' : `同步 (${pendingChangesCount})`}
    </button>
  );
}

// 自动同步（每5分钟）
function AutoSyncComponent() {
  const { status } = useAutoPositionSync(5);
  return <div>同步状态: {status}</div>;
}
```

### 2. 同步状态指示器

```tsx
// 在 Header 或导航栏中使用
function Header() {
  return (
    <header>
      <h1>基金管理系统</h1>
      <SyncStatusIndicator />
    </header>
  );
}

// 完整的同步控制面板
function SettingsPage() {
  return (
    <div>
      <h2>同步设置</h2>
      <SyncControlPanel />
    </div>
  );
}
```

### 3. 在 Store 中使用

使用增强版 store 会自动追踪变更：

```tsx
import { useEnhancedFundStore } from '../store/enhancedFundStore';
import { useEnhancedStockStore } from '../store/enhancedStockStore';

function FundManager() {
  const { 
    addHolding, 
    updateHolding, 
    deleteHolding,
    batchAddHoldings,
    batchUpdateHoldings,
    batchDeleteHoldings 
  } = useEnhancedFundStore();

  // 添加持仓 - 自动记录变更
  const handleAdd = async (holding) => {
    await addHolding(holding);
    // 变更已自动记录，将在下次同步时上传
  };

  // 批量操作
  const handleBatchImport = async (holdings) => {
    const result = await batchAddHoldings(holdings);
    console.log(result.message);
  };

  return (
    // ...
  );
}
```

### 4. 手动记录变更

如果需要手动记录变更：

```tsx
import { usePositionSync } from '../hooks/usePositionSync';
import { SyncOperationType } from '../services/sync/positionSyncService';

function CustomComponent() {
  const { recordChange } = usePositionSync();

  const handleCustomUpdate = (id, data) => {
    // 执行自定义更新
    customUpdate(id, data);
    
    // 手动记录变更
    recordChange(SyncOperationType.UPDATE, { ...data, id }, id);
  };

  return (
    // ...
  );
}
```

## API 参考

### usePositionSync Hook

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `status` | `SyncStatus` | 当前同步状态 |
| `isSyncing` | `boolean` | 是否正在同步 |
| `hasConflicts` | `boolean` | 是否存在冲突 |
| `conflicts` | `SyncConflict[]` | 冲突列表 |
| `pendingChangesCount` | `number` | 待同步变更数量 |
| `sync()` | `() => Promise<SyncResult>` | 执行同步 |
| `forceSync()` | `() => Promise<SyncResult>` | 强制同步（以服务器为准） |
| `resolveConflict(id, useLocal)` | `(string, boolean) => Promise<boolean>` | 解决冲突 |
| `recordChange(op, data, id)` | 记录变更 | 手动记录变更 |

### SyncStatus 枚举

```typescript
enum SyncStatus {
  IDLE = 'idle',           // 空闲
  SYNCING = 'syncing',     // 同步中
  SUCCESS = 'success',     // 同步成功
  ERROR = 'error',         // 同步失败
  CONFLICT = 'conflict',   // 存在冲突
}
```

### SyncOperationType 枚举

```typescript
enum SyncOperationType {
  CREATE = 'CREATE',   // 创建
  UPDATE = 'UPDATE',   // 更新
  DELETE = 'DELETE',   // 删除
}
```

## 后端 API

### POST /api/position-sync/sync

执行增量同步

**请求体：**
```json
{
  "changes": [
    {
      "id": "holding_001",
      "operation": "UPDATE",
      "timestamp": 1704067200000,
      "data": { "share": 1000 },
      "checksum": "a1b2c3"
    }
  ],
  "fundHoldings": [...],
  "stockHoldings": [...],
  "accountGroups": [...],
  "settings": {...},
  "deviceId": "device_001",
  "timestamp": 1704067200000,
  "force": false
}
```

**响应：**
```json
{
  "success": true,
  "message": "同步成功",
  "data": {
    "fundHoldings": [...],
    "stockHoldings": [...],
    "settings": {...}
  },
  "conflicts": [],
  "serverTimestamp": 1704067200000
}
```

### GET /api/position-sync/status

获取同步状态

**响应：**
```json
{
  "success": true,
  "data": {
    "lastSyncTime": 1704067200000,
    "fundHoldingsCount": 10,
    "stockHoldingsCount": 5,
    "accountGroupsCount": 3
  }
}
```

### POST /api/position-sync/batch

批量更新持仓

**请求体：**
```json
{
  "fundHoldings": [...],
  "stockHoldings": [...],
  "replaceAll": false
}
```

## 最佳实践

1. **自动同步** - 使用 `useAutoPositionSync` 在应用启动时自动同步
2. **冲突处理** - 始终提供冲突解决 UI，让用户选择保留哪个版本
3. **批量操作** - 大量数据变更时使用批量操作 API
4. **错误处理** - 监听同步状态，在失败时提示用户
5. **离线支持** - 变更会自动缓存，网络恢复后自动同步

## 迁移指南

从旧版同步方案迁移：

1. 替换 `syncService` 为 `positionSyncService`
2. 使用 `useEnhancedFundStore` 和 `useEnhancedStockStore` 替换原有 store
3. 添加 `SyncStatusIndicator` 组件到导航栏
4. 在设置页面添加 `SyncControlPanel`

```tsx
// 旧代码
import { syncService } from '../services/sync/syncService';
await syncService.manualSync();

// 新代码
import { usePositionSync } from '../hooks/usePositionSync';
const { sync } = usePositionSync();
await sync();
```
