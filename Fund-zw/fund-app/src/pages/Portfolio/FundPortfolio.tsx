import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, App, Popconfirm, Spin, Tag, Tooltip, Select, Tabs, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, LoadingOutlined, WalletOutlined } from '@ant-design/icons';
import { useFundStore } from '../../store/fundStore';
import type { UserHolding, AccountGroup } from '../../models';
import { profitCalculator } from '../../services/calculator/profitCalculator';
import { fundApiService } from '../../services/api/fundApi';
import { groupService } from '../../services/db/groupService';

interface FormValues {
    fundCode: string;
    fundName: string;
    share: number;
    costPrice: number;
    notes?: string;
    groupId?: string;
}

interface GroupFormValues {
    name: string;
    color: string;
    description?: string;
}

export const FundPortfolio: React.FC = () => {
    const { message } = App.useApp();
    const { holdings, quotes, loadHoldings, addHolding, updateHolding, deleteHolding, settings } = useFundStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingHolding, setEditingHolding] = useState<UserHolding | null>(null);
    const [addForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [loadingFundName, setLoadingFundName] = useState(false);
    const [fundCodeDebounceTimer, setFundCodeDebounceTimer] = useState<number | null>(null);
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
        const ungrouped = holdings.filter(h => !h.groupId);
        const grouped = groups.map(group => ({
            group,
            holdings: holdings.filter(h => h.groupId === group.id),
        })).filter(g => g.holdings.length > 0);
        
        return { ungrouped, grouped };
    };

    const { ungrouped, grouped } = getHoldingsByGroup();

    const handleAddHolding = async (values: FormValues) => {
        try {
            await addHolding({
                fundCode: values.fundCode,
                fundName: values.fundName,
                share: values.share,
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

    const handleEditHolding = async (values: FormValues) => {
        if (!editingHolding?.id) return;
        try {
            await updateHolding(editingHolding.id, {
                fundName: values.fundName,
                share: values.share,
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

    const openEditModal = (record: UserHolding) => {
        setEditingHolding(record);
        editForm.setFieldsValue({
            fundCode: record.fundCode,
            fundName: record.fundName,
            share: record.share,
            costPrice: record.costPrice,
            notes: record.notes,
            groupId: record.groupId,
        });
        setIsEditModalOpen(true);
    };

    // 处理添加时基金代码变化（自动获取基金名称）
    const handleAddFundCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const code = e.target.value.trim();
        
        if (fundCodeDebounceTimer) {
            clearTimeout(fundCodeDebounceTimer);
        }

        if (code.length >= 6) {
            const timer = window.setTimeout(async () => {
                setLoadingFundName(true);
                try {
                    const fundInfo = await fundApiService.getFundDetail(code);
                    if (fundInfo) {
                        addForm.setFieldsValue({ fundName: fundInfo.name });
                    }
                } catch (error) {
                    console.error('获取基金信息失败:', error);
                } finally {
                    setLoadingFundName(false);
                }
            }, 500);
            setFundCodeDebounceTimer(timer);
        }
    };

    // 计算分组统计数据
    const calculateGroupStats = (data: UserHolding[]) => {
        let totalAsset = 0;
        let totalCost = 0;
        let dayProfit = 0;

        data.forEach(holding => {
            const quote = quotes.get(holding.fundCode);
            const currentPrice = quote?.price || holding.costPrice;
            const asset = currentPrice * holding.share;
            const cost = holding.costPrice * holding.share;
            
            totalAsset += asset;
            totalCost += cost;
            
            // 当日收益
            if (quote) {
                const dayChange = (quote.price - quote.preClose) * holding.share;
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
            title: '基金代码',
            dataIndex: 'fundCode',
            key: 'fundCode',
            width: isMobile ? 80 : 100,
        },
        {
            title: '基金名称',
            dataIndex: 'fundName',
            key: 'fundName',
            width: isMobile ? 120 : 200,
            render: (text: string) => (
                <Tooltip title={text}>
                    <span style={{ fontWeight: 500, fontSize: isMobile ? '12px' : '14px' }}>{text}</span>
                </Tooltip>
            ),
        },
        {
            title: '份额',
            dataIndex: 'share',
            key: 'share',
            width: isMobile ? 80 : 120,
            align: 'right' as const,
            render: (value: number) => value.toFixed(2),
        },
        {
            title: '成本',
            dataIndex: 'costPrice',
            key: 'costPrice',
            width: isMobile ? 80 : 100,
            align: 'right' as const,
            render: (value: number) => `¥${value.toFixed(4)}`,
        },
        {
            title: '当前',
            key: 'currentPrice',
            width: isMobile ? 80 : 100,
            align: 'right' as const,
            render: (_: unknown, record: UserHolding) => {
                const quote = quotes.get(record.fundCode);
                const price = quote?.price || record.costPrice;
                const isEst = quote?.isEst;
                return (
                    <span>
                        ¥{price.toFixed(4)}
                        {isEst && <Tag color="blue" style={{ marginLeft: 4, fontSize: 8 }}>估值</Tag>}
                    </span>
                );
            },
        },
        {
            title: '涨跌',
            key: 'change',
            width: isMobile ? 80 : 100,
            align: 'right' as const,
            render: (_: unknown, record: UserHolding) => {
                const quote = quotes.get(record.fundCode);
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
            render: (_: unknown, record: UserHolding) => {
                const quote = quotes.get(record.fundCode);
                const price = quote?.price || record.costPrice;
                const value = price * record.share;
                return <span style={{ fontWeight: 500, fontSize: isMobile ? '12px' : '14px' }}>¥{value.toFixed(2)}</span>;
            },
        },
        {
            title: '收益',
            key: 'profit',
            width: isMobile ? 90 : 120,
            align: 'right' as const,
            render: (_: unknown, record: UserHolding) => {
                const quote = quotes.get(record.fundCode);
                const currentPrice = quote?.price || record.costPrice;
                const profit = profitCalculator.calculateProfit(record, currentPrice);
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
            render: (_: unknown, record: UserHolding) => {
                const quote = quotes.get(record.fundCode);
                const currentPrice = quote?.price || record.costPrice;
                const profitRate = profitCalculator.calculateProfitRate(record, currentPrice);
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
            render: (_: unknown, record: UserHolding) => (
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
                    <WalletOutlined style={{ marginRight: 6 }} />
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
    const renderHoldingsTable = (data: UserHolding[], group?: AccountGroup) => {
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
                    基金持仓
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
                        label="基金代码"
                        name="fundCode"
                        rules={[{ required: true, message: '请输入基金代码' }]}
                    >
                        <Input
                            placeholder="例如: 000001"
                            onChange={handleAddFundCodeChange}
                        />
                    </Form.Item>
                    {loadingFundName && (
                        <div style={{ marginTop: -8, marginBottom: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
                            <Spin indicator={<LoadingOutlined spin />} size="small" style={{ marginRight: 8 }} />
                            正在获取基金信息...
                        </div>
                    )}
                    <Form.Item
                        label="基金名称"
                        name="fundName"
                        rules={[{ required: true, message: '请输入基金名称' }]}
                        tooltip="输入基金代码后将自动填充"
                    >
                        <Input
                            placeholder="输入代码后自动填充,也可手动输入"
                            disabled={loadingFundName}
                        />
                    </Form.Item>
                    <Form.Item
                        label="持有份额"
                        name="share"
                        rules={[{ required: true, message: '请输入持有份额' }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入持有份额" />
                    </Form.Item>
                    <Form.Item
                        label="成本净值"
                        name="costPrice"
                        rules={[{ required: true, message: '请输入成本净值' }]}
                    >
                        <InputNumber min={0} step={0.0001} style={{ width: '100%' }} placeholder="请输入平均买入价格" />
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
                        label="基金代码"
                        name="fundCode"
                    >
                        <Input disabled />
                    </Form.Item>
                    <Form.Item
                        label="基金名称"
                        name="fundName"
                        rules={[{ required: true, message: '请输入基金名称' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="持有份额"
                        name="share"
                        rules={[{ required: true, message: '请输入持有份额' }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        label="成本净值"
                        name="costPrice"
                        rules={[{ required: true, message: '请输入成本净值' }]}
                    >
                        <InputNumber min={0} step={0.0001} style={{ width: '100%' }} />
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
