import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 5000
})

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => { 
    return config
  },
  (error: Error) => { 
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    if (response.status === 200) {
      return data
    }
    return Promise.reject(new Error(response.statusText || 'Error'))
  },
  (error: Error) => { 
    return Promise.reject(error)
  }
)

export default service