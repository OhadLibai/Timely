// backend/src/services/ml.service.ts - CRITICAL FIXES
import axios, { AxiosInstance } from 'axios';
import logger from '@/utils/logger';
import { User } from '@/models/user.model';

// Create axios instance for ML service
const mlApiClient: AxiosInstance = axios.create({
  baseURL: process.env.ML_SERVICE_URL || 'http://ml-service:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request/Response logging
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
  (response) => {
    logger.debug(`ML Service Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    logger.error('ML Service Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// ============================================================================
// CRITICAL FIX: Extract Instacart User ID from Metadata
// ============================================================================

const getInstacartUserId = async (internalUserId: string): Promise<string | null> => {
  try {
    const user = await User.findByPk(internalUserId, {
      attributes: ['id', 'metadata']
    });

    if (!user) {
      logger.error(`User not found: ${internalUserId}`);
      return null;
    }

    // Extract instacart_user_id from metadata
    const instacartUserId = user.metadata?.instacart_user_id;
    
    if (!instacartUserId) {
      logger.warn(`No instacart_user_id found in metadata for user ${internalUserId}`);
      return null;
    }

    logger.info(`Resolved user ${internalUserId} to Instacart ID: ${instacartUserId}`);
    return instacartUserId;
  } catch (error) {
    logger.error(`Failed to get Instacart user ID for ${internalUserId}:`, error);
    return null;
  }
};

// ============================================================================
// FIXED PREDICTION METHOD - Uses Instacart User ID
// ============================================================================

export const getPredictionFromDatabase = async (internalUserId: string): Promise<any> => {
  try {
    // CRITICAL: Get the Instacart user ID from metadata
    const instacartUserId = await getInstacartUserId(internalUserId);
    
    if (!instacartUserId) {
      // User is not a seeded demo user - return empty predictions
      logger.info(`User ${internalUserId} is not a demo user, returning empty predictions`);
      return {
        predicted_products: [],
        source: 'no_instacart_mapping',
        timestamp: new Date().toISOString(),
        message: 'This user was not seeded from Instacart data'
      };
    }

    // Call ML service with the Instacart user ID
    const response = await mlApiClient.post('/predict-from-db', {
      user_id: internalUserId, // Internal ID for reference
      instacart_user_id: instacartUserId // CRITICAL: Pass Instacart ID for prediction
    });

    logger.info(`ML prediction successful for user ${internalUserId} (Instacart: ${instacartUserId})`);
    return {
      predicted_products: response.data.products?.map((p: any) => p.productId) || [],
      source: response.data.source || 'ml_model',
      timestamp: response.data.generatedAt || new Date().toISOString(),
      raw_response: response.data
    };
  } catch (error: any) {
    logger.error(`ML prediction failed for user ${internalUserId}:`, error);
    
    // Return empty predictions on error
    return {
      predicted_products: [],
      source: 'error',
      timestamp: new Date().toISOString(),
      error: error.response?.data?.detail || error.message
    };
  }
};

// ============================================================================
// FIXED DEMO PREDICTION - Properly handles exclude_last_order
// ============================================================================

export const getDemoUserPrediction = async (instacartUserId: string): Promise<any> => {
  try {
    const response = await mlApiClient.get(`/demo-data/user-prediction/${instacartUserId}`);
    return response.data;
  } catch (error: any) {
    logger.error(`Demo prediction failed for Instacart user ${instacartUserId}:`, error);
    throw error;
  }
};

// ============================================================================
// NEW: Next Basket Prediction for Regular Users
// ============================================================================

export const getNextBasketPrediction = async (internalUserId: string): Promise<any> => {
  try {
    // Get Instacart user ID if available
    const instacartUserId = await getInstacartUserId(internalUserId);
    
    if (!instacartUserId) {
      // For non-demo users, return popular items or empty basket
      logger.info(`Generating fallback predictions for non-demo user ${internalUserId}`);
      
      // You could return popular items here
      return {
        products: [],
        confidence: 0,
        source: 'no_history',
        message: 'Please complete a few orders to get personalized predictions'
      };
    }

    // Call ML service for prediction
    const response = await mlApiClient.post('/predict', {
      user_id: instacartUserId,
      k: 20 // Top 20 recommendations
    });

    return {
      products: response.data.predicted_products || [],
      confidence: response.data.confidence_score || 0.5,
      source: 'tifu_knn',
      model_version: response.data.model_version
    };
  } catch (error) {
    logger.error(`Next basket prediction failed:`, error);
    throw error;
  }
};

// ============================================================================
// Other methods remain the same...
// ============================================================================

export const getInstacartUserOrderHistory = async (userId: string): Promise<any> => {
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
    const healthResponse = await mlApiClient.get('/health');
    health = healthResponse.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
    errors.push(`ML service unreachable: ${errorMessage}`);
    logger.error('ML service status check failed:', error);
  }

  const isHealthy = health?.status === 'healthy' && errors.length === 0;

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

const mlService = {
  // Core predictions
  getPredictionFromDatabase,
  getDemoUserPrediction,
  getNextBasketPrediction, // NEW
  
  // Demo functionality
  getInstacartUserOrderHistory,
  getDemoUserIds,
  getUserStats,
  
  // Model evaluation
  triggerModelEvaluation,
  
  // Health & monitoring
  getMLServiceStatus,
  
  // Utilities
  callMLServiceAPI,
  getInstacartUserId // Exposed for other services if needed
};

export default mlService;