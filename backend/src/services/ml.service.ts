// backend/src/services/ml.service.ts

import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const mlApiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000,
});

/**
 * Main prediction method for the application.
 * Uses the user's history from the live database.
 */
export const getPredictionFromDatabase = async (userId: string): Promise<any> => {
  const response = await mlApiClient.post('/predict/from-database', { user_id: userId });
  return response.data;
};

/**
 * DEMAND 3: Get a temporary prediction for the live demo.
 * Uses the Instacart user ID to generate a prediction directly from CSVs.
 */
export const getPredictionForDemo = async (instacartUserId: string): Promise<any> => {
  const response = await mlApiClient.post('/predict/for-demo', { user_id: instacartUserId });
  return response.data;
};

/**
 * DEMAND 1 & 3 HELPER: Get a user's full order history from the original CSV files.
 * Used for both seeding the database and for live demo comparisons.
 */
export const getInstacartUserOrderHistory = async (instacartUserId: string): Promise<any> => {
  const response = await mlApiClient.get(`/demo-data/instacart-user-order-history/${instacartUserId}`);
  return response.data;
};

/**
 * DEMAND 3 HELPER: Get the ground truth (actual next basket) for a demo user from CSVs.
 */
export const getGroundTruthBasket = async (instacartUserId: string): Promise<any> => {
  const response = await mlApiClient.get(`/demo-data/user-future-basket/${instacartUserId}`);
  return response.data;
};

/**
 * DEMAND 2: Trigger a full, black-box model evaluation.
 */
export const triggerModelEvaluation = async (): Promise<any> => {
  const response = await mlApiClient.post('/evaluate-model');
  return response.data;
};

// --- Monitoring & Health ---

export const checkMLServiceHealth = async (): Promise<any> => {
  const response = await mlApiClient.get('/health');
  return response.data;
};

export const getServiceStats = async (): Promise<any> => {
    // This endpoint might not exist, wrapping in try-catch.
    try {
        const response = await mlApiClient.get('/service-info'); // Assuming this endpoint exists for stats
        return response.data;
    } catch (e) {
        return { status: 'Not available' };
    }
};

export const checkDatabaseStatus = async (): Promise<any> => {
    // This is part of the health check in the new ML service
    return checkMLServiceHealth();
};