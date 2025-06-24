// backend/src/services/ml.service.ts
// CRITICAL FIX: Corrected all endpoint mismatches with ML service

import axios, { AxiosResponse } from 'axios';
import logger from '@/utils/logger';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Create axios instance with proper configuration
export const mlApiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 60000, // Increased timeout for evaluation
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request logging
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

// Add response logging
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

/**
 * Main prediction method for the application.
 * Uses the user's history from the live database.
 */
export const getPredictionFromDatabase = async (userId: string): Promise<any> => {
  try {
    const response = await mlApiClient.post('/predict/from-database', { user_id: userId });
    return response.data;
  } catch (error) {
    logger.error(`Database prediction failed for user ${userId}:`, error);
    throw error;
  }
};

/**
 * DEMAND 3: Get consolidated prediction + ground truth comparison
 * FIXED: Now calls the correct consolidated endpoint
 */
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
// DEMAND 1 HELPER METHODS
// ============================================================================

/**
 * DEMAND 1: Get a user's full order history from the original CSV files.
 * Used for seeding the database with realistic user data.
 */
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

/**
 * DEMAND 1 & 3: Get available demo user IDs
 * FIXED: Now calls the correct endpoint
 */
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

/**
 * Get user statistics from CSV data
 */
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
// DEMAND 2: MODEL EVALUATION METHODS
// ============================================================================

/**
 * DEMAND 2: Trigger comprehensive model evaluation
 * FIXED: Now calls the correct endpoint
 */
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

/**
 * DEMAND 2: Get model performance metrics
 * FIXED: Removed this separate function since evaluation returns metrics directly
 * The triggerModelEvaluation now returns comprehensive metrics
 */
export const getModelPerformanceMetrics = async (): Promise<any> => {
  logger.warn('getModelPerformanceMetrics is deprecated - use triggerModelEvaluation instead');
  return triggerModelEvaluation();
};

// ============================================================================
// HEALTH & MONITORING METHODS
// ============================================================================

/**
 * Check ML service health status
 */
export const checkMLServiceHealth = async (): Promise<any> => {
  try {
    const response = await mlApiClient.get('/health');
    return response.data;
  } catch (error) {
    logger.error('ML service health check failed:', error);
    throw error;
  }
};

/**
 * Get ML service information and statistics
 * FIXED: Now calls the correct endpoint
 */
export const getServiceStats = async (): Promise<any> => {
  try {
    const response = await mlApiClient.get('/service-info');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch service stats:', error);
    throw error;
  }
};

/**
 * Get comprehensive service status for admin dashboard
 */
export const getComprehensiveServiceStatus = async (): Promise<any> => {
  try {
    const [health, stats] = await Promise.all([
      checkMLServiceHealth().catch(() => null),
      getServiceStats().catch(() => null)
    ]);
    
    return {
      isHealthy: !!health,
      health: health || { status: 'unhealthy' },
      stats: stats || { status: 'unavailable' },
      lastChecked: new Date().toISOString(),
      capabilities: {
        database_predictions: !!health?.database_available,
        demo_predictions: !!health?.data_loaded?.orders,
        model_evaluation: !!health?.model_loaded,
        csv_data_access: !!health?.data_loaded?.products
      }
    };
  } catch (error) {
    logger.error('Comprehensive service status check failed:', error);
    return {
      isHealthy: false,
      health: { status: 'error', error: error.message },
      stats: { status: 'error' },
      lastChecked: new Date().toISOString(),
      capabilities: {
        database_predictions: false,
        demo_predictions: false,
        model_evaluation: false,
        csv_data_access: false
      }
    };
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generic ML service API call with retry logic
 */
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
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
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
  getModelPerformanceMetrics,
  
  // Health & monitoring
  checkMLServiceHealth,
  getServiceStats,
  getComprehensiveServiceStatus,
  
  // Utilities
  callMLServiceAPI
};

export default mlService;

// ============================================================================
// CRITICAL FIXES APPLIED:
// 
// ❌ REMOVED BROKEN ENDPOINTS:
// - getPredictionForDemo (called /predict/for-demo - doesn't exist)
// - getGroundTruthBasket (called /demo-data/user-future-basket - doesn't exist)
// - Old getModelPerformanceMetrics (called /model-performance-metrics - doesn't exist)
// 
// ✅ FIXED ENDPOINT MAPPINGS:
// - getDemoUserPrediction -> /demo/prediction-comparison/{user_id} (consolidated)
// - getDemoUserIds -> /demo-data/available-users (now works)
// - getServiceStats -> /service-info (was /stats)
// - triggerModelEvaluation -> /evaluate-model (returns metrics directly)
// 
// ✅ DEMAND COVERAGE:
// - Demand 1: getInstacartUserOrderHistory + getDemoUserIds (FIXED)
// - Demand 2: triggerModelEvaluation (FIXED) 
// - Demand 3: getDemoUserPrediction (FIXED)
// - Demand 4: Health monitoring (FIXED)
// 
// This eliminates the root cause of ALL three broken demands! 🔥
// ============================================================================