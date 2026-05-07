import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

const service: AxiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/v1`,
  timeout: 5000,
});

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
  (error: Error) => {
    return Promise.reject(error);
  }
);

interface RequestMethods {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const request: RequestMethods = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.get<T>(url, config) as Promise<T>;
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.post<T>(url, data, config) as Promise<T>;
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.put<T>(url, data, config) as Promise<T>;
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.delete<T>(url, config) as Promise<T>;
  },
};

export default request;
