// timely/backend/src/services/ml.service.ts
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const mlApiClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 30000, // 30-second timeout for ML requests
});