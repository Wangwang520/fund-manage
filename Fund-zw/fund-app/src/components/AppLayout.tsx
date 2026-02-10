import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Space, Drawer, App, message } from 'antd';
import { DashboardOutlined, WalletOutlined, SettingOutlined, UserOutlined, LogoutOutlined, SyncOutlined, SunOutlined, MoonOutlined, MenuOutlined, LoadingOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { syncService } from '../services/sync/syncService';

const { Header, Content, Sider } = Layout;

export const AppLayout: React.FC = () => {
    const { message: antdMessage } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const { isDarkMode, toggleTheme } = useThemeStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

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
        setIsSyncing(true);
        try {
            const result = await syncService.manualSync();
            if (result.success) {
                antdMessage.success(result.message);
            } else {
                antdMessage.error(result.message);
            }
        } catch (error) {
            console.error('同步失败:', error);
            antdMessage.error('同步失败，请稍后重试');
        } finally {
            setIsSyncing(false);
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
            icon: isSyncing ? <LoadingOutlined spin /> : <SyncOutlined />,
            label: isSyncing ? '同步中...' : '同步数据',
            onClick: handleSync,
            disabled: isSyncing,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: handleLogout,
        },
    ];

    const handleMenuClick = (key: string) => {
        navigate(key);
        setMobileMenuOpen(false);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 桌面端侧边栏 */}
            <Sider
                breakpoint="md"
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
                <div className="app-logo" style={{ padding: '16px', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
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
            
            {/* 移动端抽屉菜单 */}
            <Drawer
                title="菜单"
                placement="left"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
                className={isDarkMode ? 'dark-drawer' : ''}
            >
                <div className="app-logo" style={{ padding: '16px', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    💰 基金管家
                </div>
                <Menu
                    theme={isDarkMode ? "dark" : "light"}
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => handleMenuClick(key)}
                    style={{ marginTop: '16px' }}
                />
            </Drawer>
            
            <Layout style={{ marginLeft: { xs: 0, sm: 0, md: 200, lg: 200, xl: 200 }[String(location.pathname)] || 200 }}>
                <Header style={{
                    padding: { xs: '0 12px', sm: '0 16px', md: '0 24px' }[String(location.pathname)] || '0 24px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* 移动端菜单按钮 */}
                        <Button
                            type="text"
                            icon={<MenuOutlined />}
                            size="large"
                            onClick={() => setMobileMenuOpen(true)}
                            style={{ 
                                color: 'var(--text-primary)',
                                borderRadius: '8px',
                                display: { xs: 'flex', sm: 'flex', md: 'none', lg: 'none', xl: 'none' }[String(location.pathname)] || 'none'
                            }}
                        />
                        <h2 className="app-header-title" style={{ 
                            color: 'var(--text-primary)',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontSize: { xs: '18px', sm: '20px', md: '24px' }[String(location.pathname)] || '24px'
                        }}>基金管理应用</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    margin: { xs: '12px 8px', sm: '16px 12px', md: '24px 16px' }[String(location.pathname)] || '24px 16px',
                    padding: { xs: 12, sm: 16, md: 24 }[String(location.pathname)] || 24,
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
