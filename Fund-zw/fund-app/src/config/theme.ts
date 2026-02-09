// 主题配置文件
// 集中管理所有颜色变量和主题设置

export interface ThemeColors {
  // 背景颜色
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  
  // 文本颜色
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  
  // 主色调
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // 语义颜色
  success: string;
  successDark: string;
  danger: string;
  dangerDark: string;
  warning: string;
  info: string;
  
  // 边框颜色
  border: string;
  borderLight: string;
  
  // 阴影
  shadow: string;
  shadowLight: string;
}

// 暗色主题
export const darkTheme: ThemeColors = {
  // 背景颜色
  bgPrimary: '#0a0e27',
  bgSecondary: '#1a1f3a',
  bgTertiary: '#252b4a',
  
  // 文本颜色
  textPrimary: '#ffffff',
  textSecondary: '#e5e7eb',
  textTertiary: '#d1d5db',
  
  // 主色调
  primary: '#667eea',
  primaryLight: '#764ba2',
  primaryDark: '#5a67d8',
  
  // 语义颜色
  success: '#10b981',
  successDark: '#059669',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // 边框颜色
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  
  // 阴影
  shadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  shadowLight: '0 4px 12px rgba(0, 0, 0, 0.2)'
};

// 亮色主题
export const lightTheme: ThemeColors = {
  // 背景颜色
  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  bgTertiary: '#f3f4f6',
  
  // 文本颜色
  textPrimary: '#111827',
  textSecondary: '#374151',
  textTertiary: '#6b7280',
  
  // 主色调
  primary: '#667eea',
  primaryLight: '#764ba2',
  primaryDark: '#5a67d8',
  
  // 语义颜色
  success: '#10b981',
  successDark: '#059669',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // 边框颜色
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  
  // 阴影
  shadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  shadowLight: '0 4px 12px rgba(0, 0, 0, 0.05)'
};

// 获取当前主题颜色
export const getThemeColors = (isDarkMode: boolean): ThemeColors => {
  return isDarkMode ? darkTheme : lightTheme;
};

// 生成CSS变量字符串
export const generateThemeCSS = (isDarkMode: boolean): string => {
  const colors = getThemeColors(isDarkMode);
  
  return `
    --bg-primary: ${colors.bgPrimary};
    --bg-secondary: ${colors.bgSecondary};
    --bg-tertiary: ${colors.bgTertiary};
    --text-primary: ${colors.textPrimary};
    --text-secondary: ${colors.textSecondary};
    --text-tertiary: ${colors.textTertiary};
    --primary: ${colors.primary};
    --primary-light: ${colors.primaryLight};
    --primary-dark: ${colors.primaryDark};
    --color-success: ${colors.success};
    --color-success-dark: ${colors.successDark};
    --color-danger: ${colors.danger};
    --color-danger-dark: ${colors.dangerDark};
    --color-warning: ${colors.warning};
    --color-info: ${colors.info};
    --border: ${colors.border};
    --border-light: ${colors.borderLight};
    --shadow: ${colors.shadow};
    --shadow-light: ${colors.shadowLight};
  `;
};

// 导出默认主题
export default {
  darkTheme,
  lightTheme,
  getThemeColors,
  generateThemeCSS
};
