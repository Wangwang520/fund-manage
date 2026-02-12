import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, App, Popconfirm, Spin, Tooltip, Select, Tabs, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, LoadingOutlined, StockOutlined } from '@ant-design/icons';
import type { UserStockHolding, AccountGroup } from '../../models';

import { stockApiService } from '../../services/api/stockApi';
import { groupService } from '../../services/db/groupService';
import { useStockStore } from '../../store/stockStore';

interface StockFormValues {
    stockCode: string;
    stockName: string;
    quantity: number;
    costPrice: number;
    notes?: string;
    groupId?: string;
}

interface GroupFormValues {
    name: string;
    color: string;
    description?: string;
}

export const StockPortfolio: React.FC = () => {
    const { message } = App.useApp();
    const { holdings, quotes, loadHoldings, addHolding, updateHolding, deleteHolding, settings } = useStockStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingHolding, setEditingHolding] = useState<UserStockHolding | null>(null);
    const [addForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [loadingStockName, setLoadingStockName] = useState(false);
    const [stockCodeDebounceTimer, setStockCodeDebounceTimer] = useState<number | null>(null);
    const [groups, setGroups] = useState<AccountGroup[]>([]);
    const [selectedGroupTab, setSelectedGroupTab] = useState('all');
    
    // 新增分组相关状态
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupForm] = Form.useForm();
    const [selectedColor, setSelectedColor] = useState<string>('#1677ff');
    const colors = groupService.getDefaultColors();
    
    // 当前选中的分组（用于添加持仓时默认带出）
    const [currentGroupForAdd, setCurrentGroupForAdd] = useState<string | undefined>(undefined);

    useEffect(() => {
        loadHoldings();
        loadGroups();
    }, [loadHoldings]);

    const loadGroups = async () => {
        const data = await groupService.getAllGroups();
        setGroups(data);
    };

    // 根据设置获取涨跌颜色
    const getProfitColor = (value: number) => {
        if (settings?.colorScheme === 'green-red') {
            return value >= 0 ? '#10b981' : '#ef4444';
        }
        return value >= 0 ? '#ef4444' : '#10b981';
    };

    // 按分组组织持仓
    const getHoldingsByGroup = () => {
        const ungrouped = holdings.filter((h: UserStockHolding) => !h.groupId);
        const grouped = groups.map(group => ({
            group,
            holdings: holdings.filter((h: UserStockHolding) => h.groupId === group.id),
        })).filter(g => g.holdings.length > 0);
        
        return { ungrouped, grouped };
    };

    const { ungrouped, grouped } = getHoldingsByGroup();

    const handleAddHolding = async (values: StockFormValues) => {
        try {
            await addHolding({
                stockCode: values.stockCode,
                stockName: values.stockName,
                quantity: values.quantity,
                costPrice: values.costPrice,
                addTime: Date.now(),
                notes: values.notes,
                groupId: values.groupId,
            });
            message.success('添加成功');
            setIsAddModalOpen(false);
            addForm.resetFields();
            setCurrentGroupForAdd(undefined);
        } catch {
            message.error('添加失败');
        }
    };

    const handleEditHolding = async (values: StockFormValues) => {
        if (!editingHolding?.id) return;
        try {
            await updateHolding(editingHolding.id, {
                stockName: values.stockName,
                quantity: values.quantity,
                costPrice: values.costPrice,
                notes: values.notes,
                groupId: values.groupId,
            });
            message.success('更新成功');
            setIsEditModalOpen(false);
            setEditingHolding(null);
            editForm.resetFields();
        } catch {
            message.error('更新失败');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteHolding(id);
            message.success('删除成功');
        } catch {
            message.error('删除失败');
        }
    };

    const openEditModal = (record: UserStockHolding) => {
        setEditingHolding(record);
        editForm.setFieldsValue({
            stockCode: record.stockCode,
            stockName: record.stockName,
            quantity: record.quantity,
            costPrice: record.costPrice,
            notes: record.notes,
            groupId: record.groupId,
        });
        setIsEditModalOpen(true);
    };

    // 处理添加时股票代码变化（自动获取股票名称）
    const handleAddStockCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.trim();
        
        if (stockCodeDebounceTimer) {
            clearTimeout(stockCodeDebounceTimer);
        }

        if (code.length >= 6) {
            const timer = window.setTimeout(async () => {
                setLoadingStockName(true);
                try {
                    const stockInfo = await stockApiService.getRealTimeQuote(code);
                    if (stockInfo) {
                        addForm.setFieldsValue({ stockName: stockInfo.name });
                    }
                } catch (error) {
                    console.error('获取股票信息失败:', error);
                } finally {
                    setLoadingStockName(false);
                }
            }, 500);
            setStockCodeDebounceTimer(timer);
        }
    };

    // 计算分组统计数据
    const calculateGroupStats = (data: UserStockHolding[]) => {
        let totalAsset = 0;
        let totalCost = 0;
        let dayProfit = 0;

        data.forEach(holding => {
            const quote = quotes.get(holding.stockCode);
            const currentPrice = quote?.price || holding.costPrice;
            const asset = currentPrice * holding.quantity;
            const cost = holding.costPrice * holding.quantity;
            
            totalAsset += asset;
            totalCost += cost;
            
            // 当日收益
            if (quote) {
                const dayChange = (quote.price - quote.preClose) * holding.quantity;
                dayProfit += dayChange;
            }
        });

        const totalProfit = totalAsset - totalCost;
        const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

        return { totalAsset, totalProfit, totalProfitRate, dayProfit };
    };

    // 响应式列宽设置
    const isMobile = window.innerWidth < 768;
    
    // 表格列定义
    const columns = [
        {
            title: '股票代码',
            dataIndex: 'stockCode',
            key: 'stockCode',
            width: isMobile ? 80 : 100,
        },
        {
            title: '股票名称',
            dataIndex: 'stockName',
            key: 'stockName',
            width: isMobile ? 100 : 150,
            render: (text: string) => (
                <Tooltip title={text}>
                    <span style={{ fontWeight: 500, fontSize: isMobile ? '12px' : '14px' }}>{text}</span>
                </Tooltip>
            ),
        },
        {
            title: '数量',
            dataIndex: 'quantity',
            key: 'quantity',
            width: isMobile ? 70 : 100,
            align: 'right' as const,
            render: (value: number) => value.toFixed(0),
        },
        {
            title: '成本',
            dataIndex: 'costPrice',
            key: 'costPrice',
            width: isMobile ? 80 : 100,
            align: 'right' as const,
            render: (value: number) => `¥${value.toFixed(3)}`,
        },
        {
            title: '当前',
            key: 'currentPrice',
            width: isMobile ? 80 : 100,
            align: 'right' as const,
            render: (_: unknown, record: UserStockHolding) => {
                const quote = quotes.get(record.stockCode);
                const price = quote?.price || record.costPrice;
                return (
                    <span>¥{price.toFixed(3)}</span>
                );
            },
        },
        {
            title: '涨跌',
            key: 'change',
            width: isMobile ? 80 : 100,
            align: 'right' as const,
            render: (_: unknown, record: UserStockHolding) => {
                const quote = quotes.get(record.stockCode);
                if (!quote) return '-';
                const color = getProfitColor(quote.increaseRate);
                return (
                    <span style={{ color, fontWeight: 500, fontSize: isMobile ? '12px' : '14px' }}>
                        {quote.increaseRate >= 0 ? '+' : ''}{quote.increaseRate.toFixed(2)}%
                    </span>
                );
            },
        },
        {
            title: '市值',
            key: 'marketValue',
            width: isMobile ? 90 : 120,
            align: 'right' as const,
            render: (_: unknown, record: UserStockHolding) => {
                const quote = quotes.get(record.stockCode);
                const price = quote?.price || record.costPrice;
                const value = price * record.quantity;
                return <span style={{ fontWeight: 500, fontSize: isMobile ? '12px' : '14px' }}>¥{value.toFixed(2)}</span>;
            },
        },
        {
            title: '收益',
            key: 'profit',
            width: isMobile ? 90 : 120,
            align: 'right' as const,
            render: (_: unknown, record: UserStockHolding) => {
                const quote = quotes.get(record.stockCode);
                const currentPrice = quote?.price || record.costPrice;
                const profit = (currentPrice - record.costPrice) * record.quantity;
                const color = getProfitColor(profit);
                return (
                    <span style={{ color, fontWeight: 500, fontSize: isMobile ? '12px' : '14px' }}>
                        {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
                    </span>
                );
            },
        },
        {
            title: '收益率',
            key: 'profitRate',
            width: isMobile ? 80 : 100,
            align: 'right' as const,
            render: (_: unknown, record: UserStockHolding) => {
                const quote = quotes.get(record.stockCode);
                const currentPrice = quote?.price || record.costPrice;
                const profitRate = record.costPrice > 0 
                    ? ((currentPrice - record.costPrice) / record.costPrice) * 100 
                    : 0;
                const color = getProfitColor(profitRate);
                return (
                    <span style={{ color, fontWeight: 500, fontSize: isMobile ? '12px' : '14px' }}>
                        {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                    </span>
                );
            },
        },
        {
            title: '操作',
            key: 'action',
            width: isMobile ? 100 : 120,
            fixed: 'right' as const,
            render: (_: unknown, record: UserStockHolding) => (
                <Space size={isMobile ? 'small' : 'small'}>
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                    >
                        {isMobile ? '' : '编辑'}
                    </Button>
                    <Popconfirm
                        title="确认删除"
                        description="确定要删除这条持仓记录吗？"
                        onConfirm={() => record.id && handleDelete(record.id)}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            {isMobile ? '' : '删除'}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // 处理创建分组
    const handleCreateGroup = async (values: GroupFormValues) => {
        try {
            await groupService.createGroup({
                name: values.name,
                color: selectedColor,
                description: values.description,
            });
            message.success('创建分组成功');
            setIsGroupModalOpen(false);
            groupForm.resetFields();
            loadGroups();
        } catch {
            message.error('创建分组失败');
        }
    };

    // 打开新增分组弹窗
    const openCreateGroupModal = () => {
        setSelectedColor(colors[0]);
        groupForm.resetFields();
        setIsGroupModalOpen(true);
    };

    // 构建分组标签项
    const buildGroupTabs = () => {
        const tabs = [];
        
        // 全部持仓标签
        tabs.push({
            key: 'all',
            label: (
                <span>
                    <StockOutlined style={{ marginRight: 6 }} />
                    全部 ({holdings.length})
                </span>
            ),
            children: renderHoldingsTable(holdings),
        });
        
        // 各分组标签
        grouped.forEach(({ group, holdings: groupHoldings }) => {
            tabs.push({
                key: group.id,
                label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span 
                            style={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                backgroundColor: group.color,
                                display: 'inline-block'
                            }} 
                        />
                        {group.name} ({groupHoldings.length})
                    </span>
                ),
                children: renderHoldingsTable(groupHoldings, group),
            });
        });
        
        // 未分组标签
        if (ungrouped.length > 0) {
            tabs.push({
                key: 'ungrouped',
                label: `未分组 (${ungrouped.length})`,
                children: renderHoldingsTable(ungrouped),
            });
        }
        
        // 新增分组按钮标签（放在最右边）
        tabs.push({
            key: '__add_group__',
            label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PlusOutlined />
                    新增分组
                </span>
            ),
            children: null,
        });
        
        return tabs;
    };

    // 处理标签切换
    const handleGroupTabChange = (key: string) => {
        if (key === '__add_group__') {
            openCreateGroupModal();
        } else {
            setSelectedGroupTab(key);
        }
    };

    // 渲染持仓表格
    const renderHoldingsTable = (data: UserStockHolding[], group?: AccountGroup) => {
        if (data.length === 0) {
            return (
                <Empty
                    description="该分组暂无持仓"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            );
        }

        const stats = calculateGroupStats(data);

        return (
            <>
                {/* 分组统计信息 */}
                <div 
                    style={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? 12 : 24, 
                        marginBottom: 16,
                        padding: '12px 16px',
                        background: 'var(--glass-bg)',
                        borderRadius: 8,
                        border: '1px solid var(--glass-border)',
                        justifyContent: isMobile ? 'space-between' : 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>总资产: </span>
                            <span style={{ fontWeight: 600 }}>¥{stats.totalAsset.toFixed(2)}</span>
                        </span>
                        <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>总收益: </span>
                            <span style={{ fontWeight: 600, color: getProfitColor(stats.totalProfit) }}>
                                {stats.totalProfit >= 0 ? '+' : ''}¥{stats.totalProfit.toFixed(2)}
                            </span>
                        </span>
                        <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>收益率: </span>
                            <span style={{ fontWeight: 600, color: getProfitColor(stats.totalProfitRate) }}>
                                {stats.totalProfitRate >= 0 ? '+' : ''}{stats.totalProfitRate.toFixed(2)}%
                            </span>
                        </span>
                        <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>今日: </span>
                            <span style={{ fontWeight: 600, color: getProfitColor(stats.dayProfit) }}>
                                {stats.dayProfit >= 0 ? '+' : ''}¥{stats.dayProfit.toFixed(2)}
                            </span>
                        </span>
                    </div>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        size={isMobile ? 'small' : 'middle'}
                        onClick={() => {
                            setCurrentGroupForAdd(group?.id);
                            setIsAddModalOpen(true);
                            // 延迟设置表单值，等待弹窗打开
                            setTimeout(() => {
                                addForm.setFieldsValue({ groupId: group?.id });
                            }, 0);
                        }}
                    >
                        {isMobile ? '添加' : '添加持仓'}
                    </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    size={window.innerWidth < 768 ? 'small' : 'middle'}
                    className="portfolio-table"
                />
            </>
        );
    };

    return (
        <>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <h1 className="page-title" style={{ margin: 0 }}>
                    股票持仓
                </h1>
            </div>

            {holdings.length === 0 ? (
                <Empty
                    description="暂无持仓"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setCurrentGroupForAdd(undefined);
                            setIsAddModalOpen(true);
                            addForm.resetFields();
                        }}
                    >
                        添加持仓
                    </Button>
                </Empty>
            ) : (
                <Tabs
                    type="card"
                    size="small"
                    activeKey={selectedGroupTab}
                    onChange={handleGroupTabChange}
                    items={buildGroupTabs()}
                    style={{ 
                        '--ant-tabs-card-bg': 'var(--glass-bg)',
                    } as React.CSSProperties}
                />
            )}

            {/* 添加持仓弹窗 */}
            <Modal
                title="添加持仓"
                open={isAddModalOpen}
                onCancel={() => {
                    setIsAddModalOpen(false);
                    addForm.resetFields();
                    setCurrentGroupForAdd(undefined);
                }}
                onOk={() => addForm.submit()}
                afterOpenChange={(open) => {
                    if (open && currentGroupForAdd) {
                        addForm.setFieldsValue({ groupId: currentGroupForAdd });
                    }
                }}
            >
                <Form form={addForm} layout="vertical" onFinish={handleAddHolding}>
                    <Form.Item
                        label="股票代码"
                        name="stockCode"
                        rules={[{ required: true, message: '请输入股票代码' }]}
                    >
                        <Input
                            placeholder="例如: 000001 或 600000"
                            onChange={handleAddStockCodeChange}
                        />
                    </Form.Item>
                    {loadingStockName && (
                        <div style={{ marginTop: -8, marginBottom: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
                            <Spin indicator={<LoadingOutlined spin />} size="small" style={{ marginRight: 8 }} />
                            正在获取股票信息...
                        </div>
                    )}
                    <Form.Item
                        label="股票名称"
                        name="stockName"
                        rules={[{ required: true, message: '请输入股票名称' }]}
                        tooltip="输入股票代码后将自动填充"
                    >
                        <Input
                            placeholder="输入代码后自动填充,也可手动输入"
                            disabled={loadingStockName}
                        />
                    </Form.Item>
                    <Form.Item
                        label="持有数量"
                        name="quantity"
                        rules={[{ required: true, message: '请输入持有数量' }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入持有股数" />
                    </Form.Item>
                    <Form.Item
                        label="成本价"
                        name="costPrice"
                        rules={[{ required: true, message: '请输入成本价' }]}
                    >
                        <InputNumber min={0} step={0.001} style={{ width: '100%' }} placeholder="请输入平均买入价格" />
                    </Form.Item>
                    <Form.Item label="所属分组" name="groupId">
                        <Select
                            placeholder="选择分组（可选）"
                            allowClear
                            options={groups.map(g => ({ value: g.id, label: g.name }))}
                        />
                    </Form.Item>
                    <Form.Item label="备注" name="notes">
                        <Input.TextArea rows={3} placeholder="可选：添加备注信息" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 编辑持仓弹窗 */}
            <Modal
                title="编辑持仓"
                open={isEditModalOpen}
                onCancel={() => {
                    setIsEditModalOpen(false);
                    setEditingHolding(null);
                    editForm.resetFields();
                }}
                onOk={() => editForm.submit()}
            >
                <Form form={editForm} layout="vertical" onFinish={handleEditHolding}>
                    <Form.Item
                        label="股票代码"
                        name="stockCode"
                    >
                        <Input disabled />
                    </Form.Item>
                    <Form.Item
                        label="股票名称"
                        name="stockName"
                        rules={[{ required: true, message: '请输入股票名称' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="持有数量"
                        name="quantity"
                        rules={[{ required: true, message: '请输入持有数量' }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        label="成本价"
                        name="costPrice"
                        rules={[{ required: true, message: '请输入成本价' }]}
                    >
                        <InputNumber min={0} step={0.001} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item label="所属分组" name="groupId">
                        <Select
                            placeholder="选择分组（可选）"
                            allowClear
                            options={groups.map(g => ({ value: g.id, label: g.name }))}
                        />
                    </Form.Item>
                    <Form.Item label="备注" name="notes">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 新增分组弹窗 */}
            <Modal
                title="新增分组"
                open={isGroupModalOpen}
                onCancel={() => {
                    setIsGroupModalOpen(false);
                    groupForm.resetFields();
                }}
                onOk={() => groupForm.submit()}
            >
                <Form form={groupForm} layout="vertical" onFinish={handleCreateGroup}>
                    <Form.Item
                        label="分组名称"
                        name="name"
                        rules={[{ required: true, message: '请输入分组名称' }]}
                    >
                        <Input placeholder="例如：我的主账号" />
                    </Form.Item>
                    <Form.Item label="分组颜色">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {colors.map(color => (
                                <div
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 6,
                                        backgroundColor: color,
                                        cursor: 'pointer',
                                        border: selectedColor === color ? '3px solid #333' : '2px solid transparent',
                                        boxShadow: selectedColor === color ? '0 0 0 2px #fff' : 'none',
                                    }}
                                />
                            ))}
                        </div>
                    </Form.Item>
                    <Form.Item label="描述" name="description">
                        <Input.TextArea rows={3} placeholder="可选：添加分组描述" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};
