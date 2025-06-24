// backend/src/services/ml.service.ts - CONSOLIDATED HEALTH CHECK METHODS

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

export const getDemoUserPrediction = async (instacartUserId: string): Promise<any> => {
  try {
    logger.info(`Getting demo prediction comparison for Instacart user ${instacartUserId}`);
    const response = await mlApiClient.post(`/demo/prediction-comparison/${instacartUserId}`);
    return response.data;
  } catch (error) {
    logger.error(`Demo prediction comparison failed for user ${instacartUserId}:`, error);
    throw error;
  }
};

// ============================================================================
// DEMO FUNCTIONALITY (Demands 1 & 3)
// ============================================================================

export const getInstacartUserOrderHistory = async (instacartUserId: string): Promise<any> => {
  try {
    logger.info(`Fetching order history for Instacart user ${instacartUserId}`);
    const response = await mlApiClient.get(`/demo-data/instacart-user-order-history/${instacartUserId}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch order history for user ${instacartUserId}:`, error);
    throw error;
  }
};

export const getDemoUserIds = async (): Promise<any> => {
  try {
    logger.info('Fetching available demo user IDs');
    const response = await mlApiClient.get('/demo-data/available-users');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch demo user IDs:', error);
    throw error;
  }
};

export const getUserStats = async (instacartUserId: string): Promise<any> => {
  try {
    const response = await mlApiClient.get(`/demo-data/user-stats/${instacartUserId}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch user stats for ${instacartUserId}:`, error);
    throw error;
  }
};

// ============================================================================
// MODEL EVALUATION (Demand 2)
// ============================================================================

export const triggerModelEvaluation = async (): Promise<any> => {
  try {
    logger.info('Triggering model evaluation on ML service');
    const response = await mlApiClient.post('/evaluate-model');
    return response.data;
  } catch (error) {
    logger.error('Model evaluation failed:', error);
    throw error;
  }
};

// Deprecated - use triggerModelEvaluation instead
export const getModelPerformanceMetrics = async (): Promise<any> => {
  logger.warn('getModelPerformanceMetrics is deprecated - use triggerModelEvaluation instead');
  return triggerModelEvaluation();
};

// ============================================================================
// CONSOLIDATED HEALTH & MONITORING
// ============================================================================

/**
 * CONSOLIDATED: Single comprehensive health check method
 * Replaces: checkMLServiceHealth, getServiceStats, getComprehensiveServiceStatus
 */
export const getMLServiceStatus = async (): Promise<{
  isHealthy: boolean;
  health: any;
  serviceInfo: any;
  capabilities: {
    database_predictions: boolean;
    demo_predictions: boolean;
    model_evaluation: boolean;
    csv_data_access: boolean;
  };
  lastChecked: string;
  errors?: string[];
}> => {
  const errors: string[] = [];
  let health: any = null;
  let serviceInfo: any = null;

  try {
    // Parallel health and service info requests
    const [healthResponse, serviceInfoResponse] = await Promise.allSettled([
      mlApiClient.get('/health'),
      mlApiClient.get('/service-info')
    ]);

    // Process health response
    if (healthResponse.status === 'fulfilled') {
      health = healthResponse.value.data;
      logger.debug('ML service health check successful');
    } else {
      errors.push(`Health check failed: ${healthResponse.reason.message}`);
      logger.error('ML service health check failed:', healthResponse.reason);
    }

    // Process service info response
    if (serviceInfoResponse.status === 'fulfilled') {
      serviceInfo = serviceInfoResponse.value.data;
      logger.debug('ML service info retrieval successful');
    } else {
      errors.push(`Service info failed: ${serviceInfoResponse.reason.message}`);
      logger.error('ML service info retrieval failed:', serviceInfoResponse.reason);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    serviceInfo: serviceInfo || { status: 'unknown', error: 'Service info unavailable' },
    capabilities,
    lastChecked: new Date().toISOString(),
    ...(errors.length > 0 && { errors })
  };
};

// Legacy compatibility methods (deprecated)
export const checkMLServiceHealth = async (): Promise<any> => {
  logger.warn('checkMLServiceHealth is deprecated - use getMLServiceStatus instead');
  const status = await getMLServiceStatus();
  return status.health;
};

export const getServiceStats = async (): Promise<any> => {
  logger.warn('getServiceStats is deprecated - use getMLServiceStatus instead');
  const status = await getMLServiceStatus();
  return status.serviceInfo;
};

export const getComprehensiveServiceStatus = async (): Promise<any> => {
  logger.warn('getComprehensiveServiceStatus is deprecated - use getMLServiceStatus instead');
  return getMLServiceStatus();
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
  getModelPerformanceMetrics, // Deprecated
  
  // CONSOLIDATED health & monitoring
  getMLServiceStatus, // New consolidated method
  
  // Legacy methods (deprecated)
  checkMLServiceHealth, // Deprecated
  getServiceStats, // Deprecated
  getComprehensiveServiceStatus, // Deprecated
  
  // Utilities
  callMLServiceAPI
};

export default mlService;