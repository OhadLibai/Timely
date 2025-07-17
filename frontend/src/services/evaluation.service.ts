// frontend/src/services/evaluation.service.ts

import { api } from '@/services/api.client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ModelMetrics {
  PrecisionAt: number;
  RecallAt: number;
  F1ScoreAt: number;
  NDCGAt: number;
  JaccardSimilarity: number;
  sampleSize?: number;
}

// Default paramater for evaluation sample
const DEFUALT_SAMPLE_SIZE = 10

// ============================================================================
// METRICS SERVICE CLASS
// ============================================================================

class EvaluationService {
  /**
   * DEMAND 2: Get model performance metrics
   * Used to evaluate ML model quality
   */
  async getModelMetricsScores(sampleSize: number = DEFUALT_SAMPLE_SIZE): Promise<ModelMetrics> {
    try {
      const response = await api.post<ModelMetrics>(`/evaluations/metrics/${sampleSize}`);
      return response;
    } catch (error) {
      console.error('Failed to get model metrics:', error);
      // Return fallback metrics if evaluation fails 
      return {
        PrecisionAt: 0.000,
        RecallAt: 0.000,
        F1ScoreAt: 0.000,
        NDCGAt: 0.000,
        JaccardSimilarity: 0.000,
      };
    }
  }
}

export const evaluationService = new EvaluationService();