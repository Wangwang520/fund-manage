import type { LoginRequest, RegisterRequest, AuthResponse, UserDataResponse } from '../../models/auth';
import { baseApiService } from './baseApi';

/**
 * 认证 API 服务
 */
export class AuthApiService {
  /**
   * 登录
   */
  async login(data: LoginRequest): Promise<any> {
    const response = await baseApiService.post<AuthResponse>('/api/auth/login', data);
    return response;
  }

  /**
   * 注册
   */
  async register(data: RegisterRequest): Promise<any> {
    const response = await baseApiService.post<AuthResponse>('/api/auth/register', data);
    return response;
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<{ success: boolean; data?: { user: any } }> {
    try {
      const response = await baseApiService.get('/api/auth/me');
      return response;
    } catch (error) {
      // 捕获错误，不抛出异常，而是返回失败响应
      return { success: false };
    }
  }

  /**
   * 获取用户数据
   */
  async getUserData(): Promise<UserDataResponse> {
    const response = await baseApiService.get('/api/data/get');
    return response;
  }

  /**
   * 保存用户数据
   */
  async saveUserData(data: {
    fundHoldings?: any[];
    stockHoldings?: any[];
    accountGroups?: any[];
    settings?: any;
  }): Promise<any> {
    const response = await baseApiService.post('/api/data/save', data);
    return response;
  }

  /**
   * 更新用户数据
   */
  async updateUserData(data: {
    fundHoldings?: any[];
    stockHoldings?: any[];
    accountGroups?: any[];
    settings?: any;
  }): Promise<any> {
    const response = await baseApiService.post('/api/data/update', data);
    return response;
  }

  /**
   * 登出
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * 获取存储的用户信息
   */
  getStoredUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 存储认证信息
   */
  storeAuthInfo(user: any, token: string): void {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  }
}

export const authApiService = new AuthApiService();
