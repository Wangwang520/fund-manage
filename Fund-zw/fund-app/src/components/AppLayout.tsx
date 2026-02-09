import React from 'react';
import { Layout, Menu, Button, Dropdown, Space } from 'antd';
import { DashboardOutlined, WalletOutlined, SettingOutlined, UserOutlined, LogoutOutlined, SyncOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { syncService } from '../services/sync/syncService';

const { Header, Content, Sider } = Layout;

export const AppLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const { isDarkMode, toggleTheme } = useThemeStore();

    const menuItems = [
        {
            key: '/',
            icon: <DashboardOutlined />,
            label: '仪表盘',
        },
        {
            key: '/portfolio',
            icon: <WalletOutlined />,
            label: '我的持仓',
        },
        {
            key: '/settings',
            icon: <SettingOutlined />,
            label: '设置',
        },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSync = async () => {
        const success = await syncService.uploadData();
        if (success) {
            // 显示同步成功提示
            console.log('数据同步成功');
        } else {
            console.log('数据同步失败');
        }
    };

    const userMenu = [
        {
            key: 'theme',
            icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />,
            label: isDarkMode ? '切换到亮色模式' : '切换到暗色模式',
            onClick: toggleTheme,
        },
        {
            key: 'sync',
            icon: <SyncOutlined />,
            label: '同步数据',
            onClick: handleSync,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: handleLogout,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                breakpoint="lg"
                collapsedWidth="0"
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                }}
            >
                <div className="app-logo">
                    💰 基金管家
                </div>
                <Menu
                    theme={isDarkMode ? "dark" : "light"}
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>
            <Layout style={{ marginLeft: 200 }}>
                <Header style={{
                    padding: '0 24px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-secondary)',
                    boxShadow: 'var(--shadow-light)',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <h2 className="app-header-title" style={{ 
                        color: 'var(--text-primary)',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>基金管理应用</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* 主题切换按钮 */}
                        <Button
                            type="text"
                            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                            size="large"
                            onClick={toggleTheme}
                            style={{ 
                                color: 'var(--text-primary)',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                transition: 'all 0.3s ease'
                            }}
                            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
                        />
                        
                        {/* 用户下拉菜单 */}
                        <Dropdown menu={{ items: userMenu }}>
                            <Button
                                type="text"
                                icon={<UserOutlined />}
                                size="large"
                                style={{ 
                                    color: 'var(--text-primary)',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Space>
                                    {user?.username || '用户'}
                                </Space>
                            </Button>
                        </Dropdown>
                    </div>
                </Header>
                <Content style={{
                    margin: '24px 16px',
                    padding: 24,
                    minHeight: 280,
                    background: 'var(--bgTertiary, var(--bg-secondary))',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-light)',
                    border: '1px solid var(--border)'
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};
