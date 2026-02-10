import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ConfigProvider from 'antd/es/config-provider';
import theme from 'antd/es/theme';
import AntdApp from 'antd/es/app';
import Spin from 'antd/es/spin';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import './components.css';

// 懒加载组件
const AppLayout = lazy(() => import('./components/AppLayout').then(module => ({ default: module.AppLayout })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Portfolio = lazy(() => import('./pages/Portfolio').then(module => ({ default: module.Portfolio })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Login = lazy(() => import('./pages/Login'));

function App() {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const { isDarkMode } = useThemeStore();
  const [appLoading, setAppLoading] = React.useState(true);

  React.useEffect(() => {
    // 应用初始化，检查认证状态
    const initApp = async () => {
      try {
        await checkAuth();
      } finally {
        setAppLoading(false);
      }
    };

    initApp();
  }, [checkAuth]);

  if (appLoading || isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <Spin size="large" />
        <div className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>应用加载中...</div>
      </div>
    );
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
          colorTextBase: '#000000',
          colorText: '#000000',
        },
        components: {
          Typography: {
            colorText: '#000000',
          },
          Form: {
            labelColor: '#000000',
          },
          Input: {
            colorText: '#000000',
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                <Spin size="large" />
                <div className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>页面加载中...</div>
              </div>
            }
          >
            <Routes>
              {/* 登录页面 */}
              <Route 
                path="/login" 
                element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
              />
              
              {/* 需要认证的页面 */}
              <Route 
                path="/" 
                element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" />} 
              >
                <Route index element={<Dashboard />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              
              {/* 其他路径重定向到登录 */}
              <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
