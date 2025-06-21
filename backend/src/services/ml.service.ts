// backend/src/services/ml.service.ts
// UPDATED: New database prediction endpoints and removed feature importance

import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const mlApiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000,
});

// NEW: Direct database prediction (no data fetching required by backend)
export const getPredictionFromDatabase = async (userId: string): Promise<any> => {
  const response = await mlApiClient.post('/predict/from-database', {
    user_id: userId
  });
  return response.data;
};

// LEGACY: Backend-mediated prediction (for compatibility during transition)
export const getPredictionFromDbHistory = async (userId: string, orderHistory: number[][]): Promise<any> => {
  const response = await mlApiClient.post('/predict/from-db-history', {
    user_id: userId,
    order_history: orderHistory
  });
  return response.data;
};

// KEEP: Demo functions (unchanged)
export const getInstacartUserHistory = async (instacartUserId: string): Promise<any[]> => {
  const response = await mlApiClient.get(`/demo-data/instacart-user-order-history/${instacartUserId}`);
  return response.data;
};

export const getGroundTruthBasket = async (instacartUserId: string): Promise<any> => {
  const response = await mlApiClient.get(`/demo-data/user-future-basket/${instacartUserId}`);
  return response.data;
};

// NEW: ML service health and monitoring
export const checkMLServiceHealth = async (): Promise<any> => {
  const response = await mlApiClient.get('/health');
  return response.data;
};

export const checkDatabaseStatus = async (): Promise<any> => {
  const response = await mlApiClient.get('/database/status');
  return response.data;
};

export const getServiceStats = async (): Promise<any> => {
  const response = await mlApiClient.get('/service/stats');
  return response.data;
};

// KEEP: Model evaluation (no feature importance exposure)
export const triggerModelEvaluation = async (): Promise<any> => {
  const response = await mlApiClient.post('/evaluate');
  return response.data;
};

// REMOVED: Feature importance functions (black box approach)
// export const getFeatureImportance = async (): Promise<any> => {
//   // DELETED - feature engineering is now black box
// };

export default {
  getPredictionFromDatabase,
  getPredictionFromDbHistory,
  getInstacartUserHistory,
  getGroundTruthBasket,
  checkMLServiceHealth,
  checkDatabaseStatus,
  getServiceStats,
  triggerModelEvaluation
};