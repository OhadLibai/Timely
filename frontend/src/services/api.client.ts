// frontend/src/services/api.client.ts
// FIXED: Removed mlApiClient - Frontend only communicates with backend gateway

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { authService } from './auth.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ============================================================================
// SINGLE API CLIENT - Backend Gateway Only
// ============================================================================

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================================================
// REQUEST INTERCEPTOR - Add Authentication
// ============================================================================

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

    // Handle other errors
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    
    // Don't show toast for cancelled requests
    if (error.code !== 'ERR_CANCELED') {
      toast.error(errorMessage);
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

// ============================================================================
// ARCHITECTURE CLEANUP:
// 
// REMOVED:
// - mlApiClient: Direct ML service communication
// - mlApi: ML service request functions
// 
// REASON:
// The frontend should ONLY communicate with the backend API gateway.
// The backend handles all ML service communication, providing:
// - Centralized authentication
// - Request/response logging
// - Error handling
// - Business logic validation
// - Security isolation
// 
// This eliminates architectural inconsistencies and maintains proper
// separation of concerns in the microservices architecture.
// ============================================================================