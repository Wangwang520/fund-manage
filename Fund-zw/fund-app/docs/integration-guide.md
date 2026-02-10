# 持仓数据同步方案集成指南

## 概述

本文档指导如何将优化后的持仓数据同步方案集成到现有的基金管理系统中。

## 集成步骤

### 第一步：更新依赖

确保安装了必要的依赖：

```bash
npm install uuid zustand
```

### 第二步：替换 Store

#### 1. 替换基金 Store

**旧代码：**
```tsx
import { useFundStore } from '../store/fundStore';

const { addHolding, updateHolding, deleteHolding } = useFundStore();
```

**新代码：**
```tsx
import { useEnhancedFundStore } from '../store/enhancedFundStore';

const { addHolding, updateHolding, deleteHolding } = useEnhancedFundStore();
```

#### 2. 替换股票 Store

**旧代码：**
```tsx
import { useStockStore } from '../store/stockStore';

const { addHolding, updateHolding, deleteHolding } = useStockStore();
```

**新代码：**
```tsx
import { useEnhancedStockStore } from '../store/enhancedStockStore';

const { addHolding, updateHolding, deleteHolding } = useEnhancedStockStore();
```

### 第三步：添加同步组件

#### 1. 添加同步状态指示器

在应用的头部或导航栏中添加同步状态指示器：

```tsx
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';

function AppHeader() {
  return (
    <header>
      <h1>基金管理系统</h1>
      <SyncStatusIndicator />
    </header>
  );
}
```

#### 2. 添加同步控制面板

在设置页面添加完整的同步控制面板：

```tsx
import { SyncControlPanel } from '../components/SyncStatusIndicator';

function SettingsPage() {
  return (
    <div>
      <h2>同步设置</h2>
      <SyncControlPanel />
    </div>
  );
}
```

### 第四步：配置自动同步

在应用的主组件中配置自动同步：

```tsx
import { useAutoPositionSync } from '../hooks/usePositionSync';

function App() {
  // 每5分钟自动同步一次
  const { status } = useAutoPositionSync(5);
  
  return (
    // ... 应用内容
  );
}
```

### 第五步：更新后端路由

确保后端服务器注册了新的同步路由：

```javascript
// server.js
const positionSyncRoutes = require('./routes/positionSync')(useMemoryStore, memoryStore);
app.use('/api/position-sync', positionSyncRoutes);
```

## 代码示例

### 完整的页面集成示例

```tsx
import React from 'react';
import { Layout, Menu, message } from 'antd';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator';
import { useEnhancedFundStore } from '../store/enhancedFundStore';
import { useAutoPositionSync } from '../hooks/usePositionSync';

const { Header, Content } = Layout;

function MainLayout() {
  // 自动同步
  const { status, hasPendingChanges } = useAutoPositionSync(5);
  
  // 使用增强版 store
  const { holdings, addHolding } = useEnhancedFundStore();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: 18, marginRight: 24 }}>
          基金管理系统
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          items={[
            { key: 'dashboard', label: '仪表盘' },
            { key: 'portfolio', label: '持仓管理' },
            { key: 'settings', label: '设置' },
          ]}
        />
        <div style={{ marginLeft: 'auto' }}>
          <SyncStatusIndicator />
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        {/* 页面内容 */}
        <div>
          <h2>持仓管理</h2>
          {/* 持仓列表和操作 */}
        </div>
      </Content>
    </Layout>
  );
}
```

### 持仓管理页面集成

```tsx
import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, message } from 'antd';
import { useEnhancedFundStore } from '../store/enhancedFundStore';

function FundPortfolio() {
  const { holdings, addHolding, updateHolding, deleteHolding } = useEnhancedFundStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = async (values) => {
    try {
      await addHolding({
        fundCode: values.fundCode,
        fundName: values.fundName,
        share: values.share,
        costPrice: values.costPrice,
        addTime: Date.now(),
        notes: values.notes || '',
      });
      message.success('持仓添加成功，将自动同步');
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('添加失败：' + error.message);
    }
  };

  const handleUpdate = async (id, values) => {
    try {
      await updateHolding(id, values);
      message.success('持仓更新成功，将自动同步');
    } catch (error) {
      message.error('更新失败：' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHolding(id);
      message.success('持仓删除成功，将自动同步');
    } catch (error) {
      message.error('删除失败：' + error.message);
    }
  };

  const columns = [
    {
      title: '基金代码',
      dataIndex: 'fundCode',
      key: 'fundCode',
    },
    {
      title: '基金名称',
      dataIndex: 'fundName',
      key: 'fundName',
    },
    {
      title: '持有份额',
      dataIndex: 'share',
      key: 'share',
    },
    {
      title: '成本价',
      dataIndex: 'costPrice',
      key: 'costPrice',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <span>
          <Button onClick={() => handleUpdate(record.id, { share: record.share + 100 })}>
            加仓
          </Button>
          <Button danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setModalVisible(true)}>
          添加持仓
        </Button>
      </div>
      
      <Table
        dataSource={holdings}
        columns={columns}
        rowKey="id"
      />

      <Modal
        title="添加持仓"
        visible={modalVisible}
        onOk={form.submit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} onFinish={handleAdd}>
          <Form.Item
            name="fundCode"
            label="基金代码"
            rules={[{ required: true, message: '请输入基金代码' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="fundName"
            label="基金名称"
            rules={[{ required: true, message: '请输入基金名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="share"
            label="持有份额"
            rules={[{ required: true, message: '请输入持有份额' }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item
            name="costPrice"
            label="成本价"
            rules={[{ required: true, message: '请输入成本价' }]}
          >
            <Input type="number" step="0.001" />
          </Form.Item>
          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
```

## 配置选项

### 自动同步间隔

```tsx
// 每10分钟自动同步
useAutoPositionSync(10);

// 每30分钟自动同步
useAutoPositionSync(30);
```

### 同步状态监听

```tsx
import { positionSyncService } from '../services/sync/positionSyncService';

// 监听同步状态变化
const unsubscribe = positionSyncService.onSyncStatusChange((status, message) => {
  console.log('同步状态:', status, message);
});

// 取消监听
unsubscribe();
```

## 迁移检查清单

- [ ] 替换所有 `useFundStore` 为 `useEnhancedFundStore`
- [ ] 替换所有 `useStockStore` 为 `useEnhancedStockStore`
- [ ] 添加 `SyncStatusIndicator` 到导航栏
- [ ] 添加 `SyncControlPanel` 到设置页面
- [ ] 配置自动同步
- [ ] 更新后端路由
- [ ] 测试同步功能
- [ ] 验证冲突处理

## 常见问题

### Q: 同步失败怎么办？
A: 检查网络连接，查看控制台错误信息，可以手动触发同步或强制同步。

### Q: 如何处理冲突？
A: 系统会自动检测冲突并提供解决界面，用户可以选择保留本地或服务器版本。

### Q: 离线时能否操作？
A: 可以，所有变更会缓存到本地，网络恢复后自动同步。

### Q: 同步频率如何设置？
A: 通过 `useAutoPositionSync(intervalMinutes)` 设置，建议5-30分钟。

## 最佳实践

1. **始终使用增强版 Store** - 自动追踪变更
2. **添加同步指示器** - 让用户了解同步状态
3. **配置合理同步间隔** - 平衡实时性和性能
4. **处理同步错误** - 提供友好的错误提示
5. **测试冲突场景** - 确保多设备使用正常
