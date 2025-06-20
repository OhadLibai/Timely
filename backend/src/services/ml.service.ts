// timely/backend/src/services/ml.service.ts
import axios from 'axios';
import { mlApiClient } from './apiClient'; // Or however your client is set up

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// This function will be called by the seedDemoUser method
export const getInstacartUserHistory = async (instacartUserId: string): Promise<any[]> => {
  const response = await mlApiClient.get(`/demo-data/instacart-user-order-history/${instacartUserId}`);
  return response.data;
};

// This function is used in the original admin demo for comparison
export const getGroundTruthBasket = async (instacartUserId: string): Promise<any> => {
  const response = await mlApiClient.get(`/demo-data/user-future-basket/${instacartUserId}`);
  return response.data;
}

export const getFeatureImportance = async (): Promise<{ feature: string; importance: number }[]> => {
  const response = await mlServiceApiClient.get('/feature-importance');
  return response.data;
};

export const mlApiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000, // 30-second timeout for ML requests
});