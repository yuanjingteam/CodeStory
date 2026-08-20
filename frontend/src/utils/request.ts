import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosError,
} from 'axios';
import { getToken } from './jwt';
import { showToast } from './toast';
import {
  handleAuthenticationFailure,
  isRefreshSessionExpired,
  refreshAccessToken,
} from './auth-session';

type AuthErrorResponse = {
  code?: string | number;
  message?: string;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const publicAuthPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forget-password',
  '/auth/email-captcha',
  '/auth/image-captcha',
];

function isPublicAuthRequest(url?: string): boolean {
  return Boolean(url && publicAuthPaths.some((path) => url.endsWith(path)));
}

const service: AxiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`,
  timeout: 5000,
  withCredentials: true,
});

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
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
  async (error: AxiosError<AuthErrorResponse>) => {
    if (isPublicAuthRequest(error.config?.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      const originalRequest = error.config as
        | RetryableRequestConfig
        | undefined;
      const errorCode = error.response.data?.code;

      if (
        (errorCode === 'ACCESS_TOKEN_EXPIRED' ||
          errorCode === 'ACCESS_TOKEN_MISSING') &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        try {
          const refreshed = await refreshAccessToken();
          originalRequest.headers.Authorization =
            `Bearer ${refreshed.accessToken}`;
          return service(originalRequest);
        } catch (refreshError) {
          if (isRefreshSessionExpired(refreshError)) {
            handleAuthenticationFailure();
          }
          return Promise.reject(refreshError);
        }
      }

      handleAuthenticationFailure();
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
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T>;
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T>;
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
