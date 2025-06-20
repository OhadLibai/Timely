// frontend/src/services/api.client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ML_API_URL = import.meta.env.VITE_ML_URL || 'http://localhost:8000/api';

// Create axios instances
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const mlApiClient: AxiosInstance = axios.create({
  baseURL: ML_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = authService.getAccessToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

mlApiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = authService.getAccessToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      try {
        await authService.refreshToken();
        // Retry original request
        const originalRequest = error.config;
        const token = authService.getAccessToken();
        if (token && originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        authService.logout();
        window.location.href = '/login';
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    
    // Don't show toast for cancelled requests
    if (error.code !== 'ERR_CANCELED') {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

mlApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const errorMessage = error.response?.data?.detail || error.message || 'ML Service error';
    
    if (error.code !== 'ERR_CANCELED') {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

// Generic request functions
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.get(url, config).then(response => response.data),
    
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.post(url, data, config).then(response => response.data),
    
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.put(url, data, config).then(response => response.data),
    
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.patch(url, data, config).then(response => response.data),
    
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.delete(url, config).then(response => response.data),
};

export const mlApi = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    mlApiClient.get(url, config).then(response => response.data),
    
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    mlApiClient.post(url, data, config).then(response => response.data),
};