import { create } from 'zustand';
import { generateThemeCSS } from '../config/theme';

interface ThemeState {
  // 状态
  isDarkMode: boolean;
  
  // 动作
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
  applyTheme: (isDark: boolean) => void;
}

// 默认主题：明亮模式
export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false,

  toggleTheme: () => {
    set((state) => {
      const newDarkMode = !state.isDarkMode;
      // 应用主题
      const themeStore = useThemeStore.getState();
      themeStore.applyTheme(newDarkMode);
      return { isDarkMode: newDarkMode };
    });
  },

  setDarkMode: (isDark: boolean) => {
    set({ isDarkMode: isDark });
    // 应用主题
    const themeStore = useThemeStore.getState();
    themeStore.applyTheme(isDark);
  },

  applyTheme: (isDark: boolean) => {
    // 应用CSS变量
    const root = document.documentElement;
    const cssVariables = generateThemeCSS(isDark);
    
    // 清除现有的主题变量
    root.style.removeProperty('--bg-primary');
    root.style.removeProperty('--bg-secondary');
    root.style.removeProperty('--bg-tertiary');
    root.style.removeProperty('--text-primary');
    root.style.removeProperty('--text-secondary');
    root.style.removeProperty('--text-tertiary');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-light');
    root.style.removeProperty('--primary-dark');
    root.style.removeProperty('--color-success');
    root.style.removeProperty('--color-success-dark');
    root.style.removeProperty('--color-danger');
    root.style.removeProperty('--color-danger-dark');
    root.style.removeProperty('--color-warning');
    root.style.removeProperty('--color-info');
    root.style.removeProperty('--border');
    root.style.removeProperty('--border-light');
    root.style.removeProperty('--shadow');
    root.style.removeProperty('--shadow-light');
    
    // 设置新的主题变量
    cssVariables.trim().split('\n').forEach((variable) => {
      const [name, value] = variable.trim().split(': ');
      if (name && value) {
        root.style.setProperty(name, value.replace(';', ''));
      }
    });
  },
}));

// 初始化主题
const themeStore = useThemeStore.getState();
themeStore.applyTheme(themeStore.isDarkMode);


