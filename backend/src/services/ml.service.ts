// backend/src/services/ml.service.ts - CLEANED VERSION

import axios, { AxiosResponse } from 'axios';
import logger from '@/utils/logger';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

export const mlApiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request/response logging
mlApiClient.interceptors.request.use(
  (config) => {
    logger.debug(`ML Service Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('ML Service Request Error:', error);
    return Promise.reject(error);
  }
);

mlApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.debug(`ML Service Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status || 'unknown';
    const url = error.config?.url || 'unknown';
    logger.error(`ML Service Error: ${status} ${url}`, error.response?.data);
    return Promise.reject(error);
  }
);

// ============================================================================
// CORE PREDICTION METHODS
// ============================================================================

export const getPredictionFromDatabase = async (userId: string): Promise<any> => {
  try {
    const response = await mlApiClient.post('/predict/from-database', { user_id: userId });
    return response.data;
  } catch (error) {
    logger.error(`Database prediction failed for user ${userId}:`, error);
    throw error;
  }
};

export const getDemoUserPrediction = async (userId: string): Promise<any> => {
  try {
    const response = await mlApiClient.post(`/demo/prediction-comparison/${userId}`);
    return response.data;
  } catch (error) {
    logger.error(`Demo prediction failed for user ${userId}:`, error);
    throw error;
  }
};

// ============================================================================
// DEMO FUNCTIONALITY METHODS (Demands 1 & 3)
// ============================================================================

export const getInstacartUserOrderHistory = async (userId: number): Promise<any> => {
  try {
    const response = await mlApiClient.get(`/demo-data/instacart-user-order-history/${userId}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to get Instacart order history for user ${userId}:`, error);
    throw error;
  }
};

export const getDemoUserIds = async (limit: number = 100): Promise<any> => {
  try {
    const response = await mlApiClient.get('/demo-data/available-users', {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to get demo user IDs:', error);
    throw error;
  }
};

export const getUserStats = async (userId: number): Promise<any> => {
  try {
    const response = await mlApiClient.get(`/demo-data/user-stats/${userId}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to get user stats for ${userId}:`, error);
    throw error;
  }
};

// ============================================================================
// MODEL EVALUATION METHOD (Demand 2)
// ============================================================================

export const triggerModelEvaluation = async (sampleSize?: number): Promise<any> => {
  try {
    const response = await mlApiClient.post('/evaluate-model', null, {
      params: sampleSize ? { sample_size: sampleSize } : {}
    });
    return response.data;
  } catch (error) {
    logger.error('Model evaluation failed:', error);
    throw error;
  }
};

// ============================================================================
// CONSOLIDATED HEALTH & MONITORING
// ============================================================================

export const getMLServiceStatus = async (): Promise<{
  isHealthy: boolean;
  health: any;
  capabilities: any;
  lastChecked: string;
  errors?: string[];
}> => {
  const errors: string[] = [];
  let health = null;

  try {
    // Single health check call
    const healthResponse = await mlApiClient.get('/health');
    health = healthResponse.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
    errors.push(`ML service unreachable: ${errorMessage}`);
    logger.error('ML service status check failed:', error);
  }

  // Determine overall health
  const isHealthy = health?.status === 'healthy' && errors.length === 0;

  // Extract capabilities from health response
  const capabilities = {
    database_predictions: health?.database_available && health?.model_loaded,
    demo_predictions: health?.model_loaded && health?.data_loaded?.orders > 0,
    model_evaluation: health?.model_loaded && health?.data_loaded?.future_baskets > 0,
    csv_data_access: health?.data_loaded?.products > 0
  };

  return {
    isHealthy,
    health: health || { status: 'unknown', error: 'Health check failed' },
    capabilities,
    lastChecked: new Date().toISOString(),
    ...(errors.length > 0 && { errors })
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const callMLServiceAPI = async (
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  retries: number = 2
): Promise<any> => {
  try {
    const config: any = { method, url: endpoint };
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await mlApiClient(config);
    return response.data;
  } catch (error) {
    if (retries > 0) {
      logger.warn(`ML service call failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callMLServiceAPI(endpoint, method, data, retries - 1);
    }
    throw error;
  }
};

// ============================================================================
// EXPORT DEFAULT INTERFACE
// ============================================================================

const mlService = {
  // Core predictions
  getPredictionFromDatabase,
  getDemoUserPrediction,
  
  // Demo functionality (Demands 1 & 3)
  getInstacartUserOrderHistory,
  getDemoUserIds,
  getUserStats,
  
  // Model evaluation (Demand 2)
  triggerModelEvaluation,
  
  // Health & monitoring
  getMLServiceStatus,
  
  // Utilities
  callMLServiceAPI
};

export default mlService;

// ============================================================================
// ARCHITECTURE CLEANUP COMPLETE:
// 
// ✅ REMOVED REDUNDANT METHODS:
// - checkMLServiceHealth (deprecated)
// - getServiceStats (deprecated)
// - getComprehensiveServiceStatus (deprecated)
// - getModelPerformanceMetrics (deprecated alias)
// 
// ✅ CONSOLIDATED:
// - Single health check method: getMLServiceStatus
// - Removed duplicate service info calls
// - Cleaner error handling
// 
// ✅ MAINTAINED:
// - All core functionality for Demands 1, 2, and 3
// - Proper logging and error handling
// - Retry logic for resilience
// 
// The service is now clean, focused, and maintains all required functionality
// while eliminating unnecessary redundancy.
// ============================================================================