import axios from 'axios';

/**
 * API 响应基础接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * API 服务基础类
 */
export class BaseApiService {
  protected axios: any;

  constructor() {
    this.axios = axios.create({
      baseURL: '', // 基础 URL，可根据环境配置
      timeout: 30000, // 超时时间
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.axios.interceptors.request.use(
      (config: any) => {
        // 添加认证 token
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.axios.interceptors.response.use(
      (response: any) => {
        return response;
      },
      (error: any) => {
        // 统一错误处理
        let errorMessage = '网络请求失败，请稍后重试';
        
        if (error.response) {
          // 服务器返回错误状态码
          const status = error.response.status;
          
          switch (status) {
            case 401:
              errorMessage = '未授权，请重新登录';
              // 处理登录过期的逻辑，跳转到登录页面
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              // 延迟重定向，确保错误处理完成
              setTimeout(() => {
                window.location.href = '/login';
              }, 100);
              break;
            case 403:
              errorMessage = '禁止访问';
              break;
            case 404:
              errorMessage = '请求的资源不存在';
              break;
            case 500:
              errorMessage = '服务器内部错误';
              break;
            default:
              errorMessage = error.response.data?.message || errorMessage;
          }
        } else if (error.request) {
          // 请求已发送但没有收到响应
          errorMessage = '服务器无响应，请检查网络连接';
        }
        
        console.error('API 请求错误:', errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  /**
   * 发送 GET 请求
   */
  async get<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.axios.get(url, config);
    return response.data;
  }

  /**
   * 发送 POST 请求
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.axios.post(url, data, config);
    return response.data;
  }

  /**
   * 发送 PUT 请求
   */
  async put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.axios.put(url, data, config);
    return response.data;
  }

  /**
   * 发送 DELETE 请求
   */
  async delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.axios.delete(url, config);
    return response.data;
  }
}

/**
 * 基础 API 服务实例
 */
export const baseApiService = new BaseApiService();
