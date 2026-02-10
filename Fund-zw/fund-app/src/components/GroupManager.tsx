import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, App, Modal, Popconfirm, Space, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import { groupService } from '../services/db/groupService';
import type { AccountGroup } from '../models';

interface GroupFormValues {
    name: string;
    color: string;
    description?: string;
}

interface GroupManagerProps {
    onGroupsChange?: () => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({ onGroupsChange }) => {
    const { message } = App.useApp();
    const [groups, setGroups] = useState<AccountGroup[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);
    const [form] = Form.useForm();
    const [selectedColor, setSelectedColor] = useState<string>('#1677ff');

    const colors = groupService.getDefaultColors();

    const loadGroups = async () => {
        const data = await groupService.getAllGroups();
        setGroups(data);
    };

    useEffect(() => {
        loadGroups();
    }, []);

    const handleCreate = async (values: GroupFormValues) => {
        try {
            await groupService.createGroup({
                name: values.name,
                color: selectedColor,
                description: values.description,
            });
            message.success('创建分组成功');
            setIsModalOpen(false);
            form.resetFields();
            loadGroups();
            onGroupsChange?.();
        } catch {
            message.error('创建分组失败');
        }
    };

    const handleUpdate = async (values: GroupFormValues) => {
        if (!editingGroup?.id) return;
        try {
            await groupService.updateGroup(editingGroup.id, {
                name: values.name,
                color: selectedColor,
                description: values.description,
            });
            message.success('更新分组成功');
            setIsModalOpen(false);
            setEditingGroup(null);
            form.resetFields();
            loadGroups();
            onGroupsChange?.();
        } catch {
            message.error('更新分组失败');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await groupService.deleteGroup(id);
            message.success('删除分组成功');
            loadGroups();
            onGroupsChange?.();
        } catch {
            message.error('删除分组失败');
        }
    };

    const openCreateModal = () => {
        setIsEdit(false);
        setEditingGroup(null);
        setSelectedColor(colors[0]);
        form.resetFields();
        setIsModalOpen(true);
    };

    const openEditModal = (group: AccountGroup) => {
        setIsEdit(true);
        setEditingGroup(group);
        setSelectedColor(group.color);
        form.setFieldsValue({
            name: group.name,
            description: group.description,
        });
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        setEditingGroup(null);
        form.resetFields();
    };

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>
                    <FolderOutlined style={{ marginRight: 8 }} />
                    账号分组
                </h3>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    新建分组
                </Button>
            </div>

            <Space wrap>
                {groups.map(group => (
                    <Card
                        key={group.id}
                        size="small"
                        style={{ width: 240, borderTop: `3px solid ${group.color}` }}
                        actions={[
                            <Tooltip title="编辑">
                                <EditOutlined key="edit" onClick={() => openEditModal(group)} />
                            </Tooltip>,
                            <Popconfirm
                                title="确认删除"
                                description="删除分组后，该分组下的持仓将变为未分组状态"
                                onConfirm={() => handleDelete(group.id)}
                                okText="删除"
                                cancelText="取消"
                            >
                                <Tooltip title="删除">
                                    <DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} />
                                </Tooltip>
                            </Popconfirm>,
                        ]}
                    >
                        <Card.Meta
                            title={
                                <Space>
                                    <Tag color={group.color}>{group.name}</Tag>
                                </Space>
                            }
                            description={
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    {group.description || '暂无描述'}
                                </div>
                            }
                        />
                    </Card>
                ))}
                {groups.length === 0 && (
                    <div style={{ color: 'var(--text-tertiary)', padding: '20px 0' }}>
                        暂无分组，点击右上角按钮创建
                    </div>
                )}
            </Space>

            <Modal
                title={isEdit ? '编辑分组' : '新建分组'}
                open={isModalOpen}
                onOk={() => form.submit()}
                onCancel={handleCancel}
                okText={isEdit ? '更新' : '创建'}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={isEdit ? handleUpdate : handleCreate}
                >
                    <Form.Item
                        name="name"
                        label="分组名称"
                        rules={[{ required: true, message: '请输入分组名称' }]}
                    >
                        <Input placeholder="例如：我的主账号" maxLength={20} showCount />
                    </Form.Item>

                    <Form.Item label="分组颜色" required>
                        <Space wrap>
                            {colors.map(color => (
                                <div
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        backgroundColor: color,
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        border: selectedColor === color ? '3px solid #000' : '2px solid transparent',
                                        boxShadow: selectedColor === color ? '0 0 0 2px #fff inset' : 'none',
                                    }}
                                />
                            ))}
                        </Space>
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="分组描述"
                    >
                        <Input.TextArea
                            placeholder="可选：添加分组描述"
                            rows={2}
                            maxLength={100}
                            showCount
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};
