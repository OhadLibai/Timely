// frontend/src/services/api.client.ts

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';

const API_URL = (typeof process !== 'undefined' && process.env.API_URL) || 'http://localhost:5000/api';

// ============================================================================
// SINGLE API CLIENT - Backend Gateway Only
// ============================================================================

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60 * 1000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================================================
// REQUEST INTERCEPTOR - Add Authentication
// ============================================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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

// ============================================================================
// RESPONSE INTERCEPTOR - Handle Errors and Token Refresh
// ============================================================================

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

    // Handle specific error codes
    let errorMessage = 'An error occurred';
    
    if (error.response?.status === 400) {
      errorMessage = error.response?.data?.error || 'Invalid request data';
      // Don't show toast for cancelled requests
      if (error.code !== 'ERR_CANCELED') {
        toast.error(errorMessage);
      }
    } else if (error.response?.status === 404) {
      errorMessage = error.response?.data?.error || 'Resource not found';
      // For 404s, redirect to home or show appropriate page
      // Don't show toast for cancelled requests
      if (error.code !== 'ERR_CANCELED') {
        toast.error(errorMessage);
      }
      // Optional: redirect to 404 page or home
      // window.location.href = '/404';
    } else {
      errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      // Don't show toast for cancelled requests
      if (error.code !== 'ERR_CANCELED') {
        toast.error(errorMessage);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// GENERIC REQUEST FUNCTIONS - Backend Gateway Only
// ============================================================================

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