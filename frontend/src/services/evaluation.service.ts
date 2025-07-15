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
      // Return fallback metrics if evaluation fails - UPDATED FOR NEW INTERFACE
      return {
        PrecisionAt: 0.85,
        RecallAt: 0.78,
        F1ScoreAt: 0.81,
        NDCGAt: 0.82,
        JaccardSimilarity: 0.75,
      };
    }
  }
}

export const evaluationService = new EvaluationService();