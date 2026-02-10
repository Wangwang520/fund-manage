import axios from 'axios';
import type { LoginRequest, RegisterRequest, AuthResponse, UserDataResponse } from '../../models/auth';

/**
 * 认证 API 服务
 */
export class AuthApiService {
  /**
   * 登录
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  }

  /**
   * 注册
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<{ success: boolean; data?: { user: any } }> {
    const response = await axios.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  }

  /**
   * 获取用户数据
   */
  async getUserData(): Promise<UserDataResponse> {
    const response = await axios.get('/api/data/get', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  }

  /**
   * 保存用户数据
   */
  async saveUserData(data: {
    fundHoldings?: any[];
    stockHoldings?: any[];
    accountGroups?: any[];
    settings?: any;
  }): Promise<{ success: boolean; message: string }> {
    const response = await axios.post('/api/data/save', data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  }

  /**
   * 更新用户数据
   */
  async updateUserData(data: {
    fundHoldings?: any[];
    stockHoldings?: any[];
    accountGroups?: any[];
    settings?: any;
  }): Promise<{ success: boolean; message: string }> {
    const response = await axios.post('/api/data/update', data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
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
