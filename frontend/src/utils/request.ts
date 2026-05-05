import axios, {
  type AxiosInstance,
  type AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

const service: AxiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:4523/m1/8211038-7971129-default',
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

export default service;
