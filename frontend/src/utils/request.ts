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

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：自动返回后端数据
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;
    if (response.status === 200) {
      return data;
    }
    return Promise.reject(new Error(response.statusText || 'Error'));
  },
  (error) => Promise.reject(error)
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