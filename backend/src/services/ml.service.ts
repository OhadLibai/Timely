// backend/src/services/ml.service.ts
// COMPLETE IMPLEMENTATION: All ML service methods for the four demands

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
 * DEMAND 3: Get a temporary prediction for the live demo.
 * Uses the Instacart user ID to generate a prediction directly from CSVs.
 */
export const getPredictionForDemo = async (instacartUserId: string): Promise<any> => {
  try {
    logger.info(`Generating demo prediction for Instacart user ${instacartUserId}`);
    const response = await mlApiClient.post('/predict/for-demo', { user_id: instacartUserId });
    return response.data;
  } catch (error) {
    logger.error(`Demo prediction failed for user ${instacartUserId}:`, error);
    throw error;
  }
};

// ============================================================================
// DEMAND 1 & 3 HELPER METHODS
// ============================================================================

/**
 * DEMAND 1 & 3 HELPER: Get a user's full order history from the original CSV files.
 * Used for both seeding the database and for live demo comparisons.
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
 * DEMAND 3 HELPER: Get the ground truth (actual next basket) for a demo user from CSVs.
 */
export const getGroundTruthBasket = async (instacartUserId: string): Promise<any> => {
  try {
    logger.info(`Fetching ground truth basket for Instacart user ${instacartUserId}`);
    const response = await mlApiClient.get(`/demo-data/user-future-basket/${instacartUserId}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch ground truth for user ${instacartUserId}:`, error);
    throw error;
  }
};

/**
 * DEMAND 3: CONSOLIDATED - Get complete demo prediction comparison in single call
 * 
 * This function replaces the inefficient two-call pattern and consolidates
 * all demo prediction logic into a single, optimized API call.
 */
export const getDemoUserPrediction = async (instacartUserId: string): Promise<any> => {
  try {
    logger.info(`Fetching consolidated demo prediction for Instacart user ${instacartUserId}`);
    
    // Single API call to the new consolidated endpoint
    const response = await mlApiClient.post(`/demo/prediction-comparison/${instacartUserId}`);
    
    const result = response.data;
    
    // Log performance metrics for monitoring
    const metrics = result.comparison_metrics;
    logger.info(`Demo prediction completed - User: ${instacartUserId}, F1: ${metrics.f1_score?.toFixed(3)}, Match Quality: ${result.performance_summary?.match_quality}`);
    
    // Return the complete prediction comparison
    return {
      predictedBasket: result.predicted_basket,
      trueFutureBasket: result.true_future_basket,
      comparisonMetrics: {
        predictedCount: metrics.predicted_count,
        actualCount: metrics.actual_count,
        commonItems: metrics.common_items,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1_score,
        jaccardSimilarity: metrics.jaccard_similarity
      },
      performanceSummary: result.performance_summary,
      userId: instacartUserId,
      source: result.source,
      timestamp: result.timestamp
    };
    
  } catch (error) {
    logger.error(`Consolidated demo prediction failed for user ${instacartUserId}:`, error);
    
    // Enhanced error handling with specific error types
    if (error.response?.status === 404) {
      throw new Error(`User ${instacartUserId} not found in Instacart dataset. Please try a different user ID.`);
    } else if (error.response?.status === 503) {
      throw new Error('ML service is temporarily unavailable. Please try again in a moment.');
    } else {
      throw new Error(`Demo prediction failed: ${error.message || 'Unknown error occurred'}`);
    }
  }
};

/**
 * DEMAND 3 HELPER: Get available demo user IDs from ML service
 * 
 * This function was missing and causing the demo user ID flow to break.
 * It fetches the list of available Instacart user IDs for demonstration.
 */
export const getDemoUserIds = async (limit: number = 50): Promise<any> => {
  try {
    logger.info(`Fetching available demo user IDs (limit: ${limit})`);
    
    const response = await mlApiClient.get(`/demo-data/available-users?limit=${limit}`);
    
    const result = response.data;
    
    logger.info(`Retrieved ${result.available_users?.length || 0} demo user IDs`);
    
    return {
      message: result.message || "Demo user IDs retrieved successfully",
      note: result.note || "These are Instacart user IDs available for demonstration",
      feature_engineering: result.feature_engineering || "CSV-based",
      restriction: result.restriction || "Users with sufficient order history only",
      available_users: result.available_users || [],
      total_count: result.total_count || 0,
      limit: limit
    };
    
  } catch (error) {
    logger.error('Failed to fetch demo user IDs:', error);
    
    // Fallback response if ML service is unavailable
    return {
      message: "Demo user IDs temporarily unavailable",
      note: "Try common user IDs: 1, 7, 13, 25, 31, 42, 55, 60, 78, 92",
      feature_engineering: "fallback",
      restriction: "ML service unavailable",
      available_users: [1, 7, 13, 25, 31, 42, 55, 60, 78, 92],
      total_count: 10,
      limit: limit,
      fallback: true
    };
  }
};

/**
 * Get user statistics for demo purposes
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

/**
 * Get available demo user IDs (alias for backward compatibility)
 */
export const getAvailableUsers = async (limit: number = 20): Promise<any> => {
  try {
    const response = await mlApiClient.get(`/demo-data/available-users?limit=${limit}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch available users:', error);
    throw error;
  }
};

// ============================================================================
// DEMAND 2: MODEL EVALUATION
// ============================================================================

/**
 * DEMAND 2: Trigger a full, comprehensive model evaluation.
 * This generates precision, recall, F1, NDCG, and hit rate metrics.
 */
export const triggerModelEvaluation = async (): Promise<any> => {
  try {
    logger.info('Triggering comprehensive model evaluation...');
    const response = await mlApiClient.post('/evaluate-model');
    
    const result = response.data;
    logger.info(`Model evaluation completed - Overall F1: ${result.metrics?.f1_score_at_10?.toFixed(3)}`);
    
    return result;
  } catch (error) {
    logger.error('Model evaluation failed:', error);
    throw error;
  }
};

/**
 * DEMAND 2: Get model performance metrics from the last evaluation.
 */
export const getModelPerformanceMetrics = async (): Promise<any> => {
  try {
    const response = await mlApiClient.get('/model-performance-metrics');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch model performance metrics:', error);
    throw error;
  }
};

// ============================================================================
// HEALTH CHECK & MONITORING
// ============================================================================

/**
 * Check if the ML service is healthy and operational.
 */
export const checkMLServiceHealth = async (): Promise<any> => {
  try {
    const response = await mlApiClient.get('/health');
    return response.data;
  } catch (error) {
    logger.error('ML service health check failed:', error);
    return { status: 'unhealthy', error: error.message };
  }
};

/**
 * Get comprehensive service statistics and status.
 */
export const getServiceStats = async (): Promise<any> => {
  try {
    const response = await mlApiClient.get('/stats');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch service stats:', error);
    throw error;
  }
};

/**
 * Get dashboard statistics for admin monitoring.
 */
export const getDashboardStats = async (): Promise<any> => {
  try {
    const [health, stats] = await Promise.all([
      checkMLServiceHealth().catch(() => ({ status: 'unknown' })),
      getServiceStats().catch(() => ({ predictions: 0 }))
    ]);

    return {
      mlService: {
        status: health.status || 'unknown',
        modelLoaded: health.model_loaded || false,
        databaseConnected: health.database_available || false
      },
      performance: {
        totalPredictions: stats.total_predictions || 0,
        successfulPredictions: stats.successful_predictions || 0,
        successRate: stats.success_rate || 0
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to fetch dashboard stats:', error);
    return {
      mlService: { status: 'error' },
      performance: { totalPredictions: 0 },
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Get architecture status for system monitoring.
 */
export const getArchitectureStatus = async (): Promise<any> => {
  try {
    const response = await mlApiClient.get('/');
    return {
      ...response.data,
      connection_status: 'connected'
    };
  } catch (error) {
    logger.error('Architecture status check failed:', error);
    return {
      mode: 'unknown',
      architecture: 'unavailable',
      connection_status: 'disconnected',
      error: error.message
    };
  }
};

/**
 * Test database connectivity from ML service.
 */
export const checkDatabaseStatus = async (): Promise<any> => {
  try {
    const health = await checkMLServiceHealth();
    return {
      database_available: health.database_available || false,
      connection_status: health.database_available ? 'connected' : 'disconnected'
    };
  } catch (error) {
    logger.error('Database status check failed:', error);
    return {
      database_available: false,
      connection_status: 'error'
    };
  }
};

// ============================================================================
// UTILITY FUNCTIONS FOR ENHANCED INTEGRATION
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

/**
 * Batch prediction for multiple users (for evaluation)
 */
export const getBatchPredictions = async (userIds: string[]): Promise<any[]> => {
  const predictions = [];
  const batchSize = 10; // Process in batches to avoid overwhelming the service
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const batchPromises = batch.map(async (userId) => {
      try {
        const prediction = await getPredictionForDemo(userId);
        return { userId, prediction, success: true };
      } catch (error) {
        logger.warn(`Batch prediction failed for user ${userId}:`, error);
        return { userId, error: error.message, success: false };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    predictions.push(...batchResults);
    
    // Add a small delay between batches
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return predictions;
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
// EXPORT DEFAULT INTERFACE
// ============================================================================

const mlService = {
  // Core predictions
  getPredictionFromDatabase,
  getPredictionForDemo,
  
  // Demo functionality (Demands 1 & 3)
  getInstacartUserOrderHistory,
  getGroundTruthBasket,
  getDemoUserPrediction,  // NEW: Consolidated function
  getDemoUserIds,         // NEW: Missing function
  getUserStats,
  getAvailableUsers,
  
  // Model evaluation (Demand 2)
  triggerModelEvaluation,
  getModelPerformanceMetrics,
  
  // Health & monitoring
  checkMLServiceHealth,
  getServiceStats,
  getDashboardStats,
  getArchitectureStatus,
  checkDatabaseStatus,
  
  // Utilities
  callMLServiceAPI,
  getBatchPredictions,
  getComprehensiveServiceStatus
};

export default mlService;

// ============================================================================
// COMPLETED FUNCTION IMPLEMENTATIONS:
// 
// ✅ getDemoUserPrediction() - Consolidated prediction + ground truth + metrics
// ✅ getDemoUserIds() - Fetch available demo user IDs  
// 
// This completes the missing function implementations identified in the 
// analysis document. All admin controller methods now have corresponding
// service functions, eliminating the broken call chains.
// 
// DEMAND 3 FLOW NOW COMPLETE:
// Frontend -> Backend -> ML Service (single consolidated endpoint)
// 
// The project sanitization is now 100% complete! 🔥
// ============================================================================