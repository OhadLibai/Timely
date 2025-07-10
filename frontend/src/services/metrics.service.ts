// frontend/src/services/metrics.service.ts

import { api } from '@/services/api.client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ModelMetrics {
  precisionAt10: number;
  recallAt10: number;
  recallAt20: number;
  hitRate: number;
  NDCG: number;
  f1Score: number;
  sampleSize?: number;
}

// ============================================================================
// METRICS SERVICE CLASS
// ============================================================================

class MetricsService {
  /**
   * DEMAND 2: Get model performance metrics
   * Used by admin to evaluate ML model quality
   */
  async getModelMetricsScores(sampleSize?: number): Promise<ModelMetrics> {
    try {
      const response = await api.post<ModelMetrics>('/admin/ml/evaluate', {
        sampleSize: sampleSize || process.env.EVALUATION_SAMPLE_SIZE
      });
      return response;
    } catch (error) {
      console.error('Failed to get model metrics:', error);
      return null;
    }
  }
}

export const metricsService = new MetricsService();