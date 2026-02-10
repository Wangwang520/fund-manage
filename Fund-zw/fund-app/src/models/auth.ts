/**
 * 认证相关类型定义
 */

// 用户信息
export interface User {
  id: string;
  username: string;
  email: string;
}

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 认证响应
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
}

// 用户数据响应
export interface UserDataResponse {
  success: boolean;
  data?: {
    fundHoldings: any[];
    stockHoldings: any[];
    accountGroups: any[];
    settings: any;
  };
}
