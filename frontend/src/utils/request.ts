import axios, {
  type AxiosInstance,
  type AxiosResponse,
  InternalAxiosRequestConfig,
  type AxiosError,
} from 'axios';
import { getToken, isTokenValid } from './jwt';
import { useUserStore } from '@/store/useUserStore';

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
  (error: Error) => {
    return Promise.reject(error);
  }
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
        clearUser();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default service;
