import React, { useState, useMemo } from 'react';
import { Layout, Menu, Button, Dropdown, Space, Drawer, App } from 'antd';
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

    // 使用 useMemo 缓存菜单配置，避免每次渲染都重新创建
    const menuItems = useMemo(() => [
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
    ], []);

    // 使用 useMemo 缓存响应式布局配置
    const isMobile = useMemo(() => {
        return typeof window !== 'undefined' && window.innerWidth < 768;
    }, []);

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

    // 使用 useMemo 缓存用户菜单配置
    const userMenu = useMemo(() => [
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
    ], [isDarkMode, isSyncing, toggleTheme, handleSync, handleLogout]);

    const handleMenuClick = (key: string) => {
        navigate(key);
        setMobileMenuOpen(false);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 桌面端侧边栏 */}
            {!isMobile && (
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
                        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
                        zIndex: 10,
                    }}
                >
                    <div className="app-logo" style={{ 
                        padding: '16px', 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        color: 'var(--text-primary)',
                        textAlign: 'center'
                    }}>
                        💰 基金管家
                    </div>
                    <Menu
                        theme={isDarkMode ? "dark" : "light"}
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={({ key }) => navigate(key)}
                        style={{ borderRight: 0 }}
                    />
                </Sider>
            )}
            
            {/* 移动端抽屉菜单 */}
            <Drawer
                title={
                    <div style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        💰 基金管家
                    </div>
                }
                placement="left"
                onClose={() => setMobileMenuOpen(false)}
                open={mobileMenuOpen}
                className={isDarkMode ? 'dark-drawer' : ''}
                styles={{
                    body: {
                        padding: 0,
                        backgroundColor: isDarkMode ? 'var(--bg-primary)' : '#fff'
                    }
                }}
                style={{
                    zIndex: 1000
                }}
            >
                <Menu
                    theme={isDarkMode ? "dark" : "light"}
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => handleMenuClick(key)}
                    style={{ 
                        marginTop: '16px',
                        borderRight: 0 
                    }}
                />
            </Drawer>
            
            <Layout style={{ 
                marginLeft: isMobile ? 0 : 200,
                transition: 'margin-left 0.3s ease'
            }}>
                <Header style={{
                    padding: isMobile ? '0 12px' : '0 24px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-secondary)',
                    boxShadow: 'var(--shadow-light)',
                    borderBottom: '1px solid var(--border)',
                    height: isMobile ? 56 : 64,
                    transition: 'all 0.3s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* 移动端菜单按钮 */}
                        {isMobile && (
                            <Button
                                type="text"
                                icon={<MenuOutlined />}
                                size="large"
                                onClick={() => setMobileMenuOpen(true)}
                                style={{ 
                                    color: 'var(--text-primary)',
                                    borderRadius: '8px',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            />
                        )}
                        <h2 className="app-header-title" style={{ 
                            color: 'var(--text-primary)',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontSize: isMobile ? '16px' : '24px',
                            margin: 0,
                            fontWeight: 'bold'
                        }}>基金管理应用</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* 主题切换按钮 */}
                        <Button
                            type="text"
                            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                            size={isMobile ? 'middle' : 'large'}
                            onClick={toggleTheme}
                            style={{ 
                                color: 'var(--text-primary)',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                transition: 'all 0.3s ease',
                                padding: isMobile ? '4px' : '8px'
                            }}
                            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
                        />
                        
                        {/* 用户下拉菜单 */}
                        <Dropdown 
                            menu={{ items: userMenu }} 
                            placement={isMobile ? 'bottomRight' : 'bottom'}
                        >
                            <Button
                                type="text"
                                icon={<UserOutlined />}
                                size={isMobile ? 'middle' : 'large'}
                                style={{ 
                                    color: 'var(--text-primary)',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    transition: 'all 0.3s ease',
                                    padding: isMobile ? '4px' : '8px'
                                }}
                            >
                                <Space size={isMobile ? 'small' : 'middle'}>
                                    {!isMobile && (user?.username || '用户')}
                                </Space>
                            </Button>
                        </Dropdown>
                    </div>
                </Header>
                <Content style={{
                    margin: isMobile ? '12px 8px' : '24px 16px',
                    padding: isMobile ? 16 : 24,
                    minHeight: 280,
                    background: 'var(--bgTertiary, var(--bg-secondary))',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-light)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.3s ease'
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};
