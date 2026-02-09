import React, { useState, useEffect } from 'react';
import { Card, Button, Radio, Space, App, Typography, Divider, Modal, InputNumber, Alert } from 'antd';
import { DownloadOutlined, UploadOutlined, SettingOutlined, InfoCircleOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useFundStore } from '../store/fundStore';
import type { AppSettings } from '../models';

const { Text, Paragraph } = Typography;

export const Settings: React.FC = () => {
    const { message } = App.useApp();
    const { settings, updateSettings, exportData, importData, loadHoldings } = useFundStore();
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importText, setImportText] = useState('');
    const [clearModalVisible, setClearModalVisible] = useState(false);

    // 同步本地设置与全局设置
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // 处理颜色方案变更
    const handleColorSchemeChange = (value: 'red-green' | 'green-red') => {
        const newSettings = { ...localSettings, colorScheme: value };
        setLocalSettings(newSettings);
        updateSettings({ colorScheme: value });
        message.success('颜色方案已更新');
    };

    // 处理刷新间隔变更
    const handleRefreshIntervalChange = (value: number | null) => {
        if (value === null) return;
        const newSettings = { ...localSettings, refreshInterval: value * 1000 };
        setLocalSettings(newSettings);
        updateSettings({ refreshInterval: value * 1000 });
    };

    // 导出数据
    const handleExport = () => {
        const data = exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fund-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('数据导出成功');
    };

    // 导入数据
    const handleImport = async () => {
        if (!importText.trim()) {
            message.error('请输入要导入的数据');
            return;
        }
        const result = await importData(importText);
        if (result.success) {
            message.success(result.message);
            setImportModalVisible(false);
            setImportText('');
            loadHoldings();
        } else {
            message.error(result.message);
        }
    };

    // 清空所有数据
    const handleClearAll = async () => {
        try {
            const { holdings, deleteHolding } = useFundStore.getState();
            for (const holding of holdings) {
                if (holding.id) {
                    await deleteHolding(holding.id);
                }
            }
            message.success('所有数据已清空');
            setClearModalVisible(false);
            loadHoldings();
        } catch {
            message.error('清空数据失败');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">
                    <SettingOutlined style={{ marginRight: 12 }} />
                    设置
                </h1>
            </div>

            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                {/* 显示设置 */}
                <Card 
                    title="显示设置" 
                    variant="borderless"
                    className="settings-card"
                >
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                            <Text strong>涨跌颜色方案</Text>
                            <Paragraph type="secondary" style={{ marginTop: 8 }}>
                                选择涨跌幅显示的颜色方案
                            </Paragraph>
                            <Radio.Group 
                                value={localSettings.colorScheme}
                                onChange={(e) => handleColorSchemeChange(e.target.value)}
                            >
                                <Space orientation="vertical">
                                    <Radio value="red-green">
                                        <Space>
                                            <span style={{ color: '#ef4444' }}>红涨</span>
                                            <span>/</span>
                                            <span style={{ color: '#10b981' }}>绿跌</span>
                                            <Text type="secondary">(A股习惯)</Text>
                                        </Space>
                                    </Radio>
                                    <Radio value="green-red">
                                        <Space>
                                            <span style={{ color: '#10b981' }}>绿涨</span>
                                            <span>/</span>
                                            <span style={{ color: '#ef4444' }}>红跌</span>
                                            <Text type="secondary">(国际习惯)</Text>
                                        </Space>
                                    </Radio>
                                </Space>
                            </Radio.Group>
                        </div>

                        <Divider />

                        <div>
                            <Text strong>自动刷新间隔</Text>
                            <Paragraph type="secondary" style={{ marginTop: 8 }}>
                                设置行情数据的自动刷新频率
                            </Paragraph>
                            <Space.Compact>
                                <InputNumber
                                    min={10}
                                    max={300}
                                    value={Math.round(localSettings.refreshInterval / 1000)}
                                    onChange={handleRefreshIntervalChange}
                                />
                                <Button disabled>秒</Button>
                            </Space.Compact>
                            <Text type="secondary" style={{ marginLeft: 8 }}>建议设置为 30-60 秒</Text>
                        </div>
                    </Space>
                </Card>

                {/* 数据管理 */}
                <Card 
                    title="数据管理" 
                    variant="borderless"
                    className="settings-card"
                >
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        <Alert
                            title="数据安全提示"
                            description="所有数据仅存储在您的浏览器本地（IndexedDB），不会上传到任何服务器。建议定期备份数据。"
                            type="info"
                            showIcon
                            icon={<InfoCircleOutlined />}
                        />

                        <div>
                            <Text strong>数据备份与恢复</Text>
                            <Paragraph type="secondary" style={{ marginTop: 8 }}>
                                导出数据到本地文件，或从备份文件恢复数据
                            </Paragraph>
                            <Space>
                                <Button 
                                    type="primary" 
                                    icon={<DownloadOutlined />}
                                    onClick={handleExport}
                                >
                                    导出数据
                                </Button>
                                <Button 
                                    icon={<UploadOutlined />}
                                    onClick={() => setImportModalVisible(true)}
                                >
                                    导入数据
                                </Button>
                            </Space>
                        </div>

                        <Divider />

                        <div>
                            <Text strong type="danger">危险操作</Text>
                            <Paragraph type="secondary" style={{ marginTop: 8 }}>
                                清空所有持仓数据，此操作不可恢复
                            </Paragraph>
                            <Button 
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => setClearModalVisible(true)}
                            >
                                清空所有数据
                            </Button>
                        </div>
                    </Space>
                </Card>

                {/* 关于 */}
                <Card 
                    title="关于" 
                    variant="borderless"
                    className="settings-card"
                >
                    <Space orientation="vertical" size="small">
                        <Text>版本: v1.0.0</Text>
                        <Text>数据存储: 本地 IndexedDB</Text>
                        <Text type="secondary">
                            基金管家 - 个人投资基金管理工具
                        </Text>
                    </Space>
                </Card>
            </Space>

            {/* 导入数据弹窗 */}
            <Modal
                title="导入数据"
                open={importModalVisible}
                onOk={handleImport}
                onCancel={() => {
                    setImportModalVisible(false);
                    setImportText('');
                }}
                okText="确认导入"
                cancelText="取消"
            >
                <Alert
                    title="警告"
                    description="导入数据将覆盖现有的所有持仓数据，请确保已备份重要数据。"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <Typography>
                    <Paragraph>请粘贴之前导出的 JSON 数据：</Paragraph>
                </Typography>
                <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="在此粘贴 JSON 数据..."
                    style={{
                        width: '100%',
                        height: 200,
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--glass-border)',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        resize: 'vertical',
                    }}
                />
            </Modal>

            {/* 清空数据确认弹窗 */}
            <Modal
                title="确认清空数据"
                open={clearModalVisible}
                onOk={handleClearAll}
                onCancel={() => setClearModalVisible(false)}
                okText="确认清空"
                cancelText="取消"
                okButtonProps={{ danger: true }}
            >
                <Space orientation="vertical">
                    <ExclamationCircleOutlined style={{ fontSize: 48, color: '#ef4444' }} />
                    <Text strong>确定要清空所有数据吗？</Text>
                    <Text type="secondary">此操作将删除所有持仓数据，不可恢复。建议先导出备份。</Text>
                </Space>
            </Modal>
        </div>
    );
};
