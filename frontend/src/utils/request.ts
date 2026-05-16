import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type AxiosRequestConfig,
  InternalAxiosRequestConfig,
  type AxiosError,
} from 'axios';
import { getToken, isTokenValid } from './jwt';
import { useUserStore } from '@/store/useUserStore';
import { showToast } from './toast';

const service: AxiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/v1`,
  timeout: 5000,
});

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && isTokenValid(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

service.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;
    if (response.status === 200) {
      return data;
    }
    return Promise.reject(new Error(response.statusText || 'Error'));
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const { clearUser, isLoggedIn } = useUserStore.getState();
      if (isLoggedIn) {
        showToast.warning('登录已过期，请重新登录');
        clearUser();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    } else if (error.response?.status === 403) {
      showToast.error('没有权限访问');
    } else if (error.response?.status === 404) {
      showToast.error('请求的资源不存在');
    } else if (error.response?.status && error.response.status >= 500) {
      showToast.error('服务器异常，请稍后重试');
    } else if (error.code === 'ECONNABORTED') {
      showToast.error('请求超时，请检查网络');
    } else if (!error.response) {
      showToast.error('网络连接失败，请检查网络');
    }
    return Promise.reject(error);
  }
);

interface RequestMethods {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const request: RequestMethods = {
  get(url, config) {
    return service.get(url, config);
  },
  post(url, data, config) {
    return service.post(url, data, config);
  },
  put(url, data, config) {
    return service.put(url, data, config);
  },
  delete(url, config) {
    return service.delete(url, config);
  },
};

export default request;