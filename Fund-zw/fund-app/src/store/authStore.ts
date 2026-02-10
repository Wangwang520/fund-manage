import { create } from 'zustand';
import { authApiService } from '../services/api/authApi';
import type { User, LoginRequest, RegisterRequest } from '../models/auth';

interface AuthState {
  // 状态
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 动作
  login: (data: LoginRequest) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 初始状态
  user: null,
  isAuthenticated: authApiService.isAuthenticated(),
  isLoading: false,
  error: null,

  // 登录
  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authApiService.login(data);
      
      if (response.success && response.data) {
        authApiService.storeAuthInfo(response.data.user, response.data.token);
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      } else {
        set({ error: response.message, isLoading: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '登录失败', isLoading: false });
      return false;
    }
  },

  // 注册
  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authApiService.register(data);
      
      if (response.success && response.data) {
        authApiService.storeAuthInfo(response.data.user, response.data.token);
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      } else {
        set({ error: response.message, isLoading: false });
        return false;
      }
    } catch (error: any) {
      set({ error: error.message || '注册失败', isLoading: false });
      return false;
    }
  },

  // 登出
  logout: () => {
    authApiService.logout();
    set({
      user: null,
      isAuthenticated: false
    });
  },

  // 检查认证状态
  checkAuth: async () => {
    if (!authApiService.isAuthenticated()) {
      set({ isAuthenticated: false, user: null });
      return false;
    }

    set({ isLoading: true });
    
    try {
      const storedUser = authApiService.getStoredUser();
      if (storedUser) {
        set({
          user: storedUser,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      }

      const response = await authApiService.getCurrentUser();
      if (response.success && response.data) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      } else {
        authApiService.logout();
        set({ isAuthenticated: false, user: null, isLoading: false });
        return false;
      }
    } catch (error) {
      authApiService.logout();
      set({ isAuthenticated: false, user: null, isLoading: false });
      return false;
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  }
}));
