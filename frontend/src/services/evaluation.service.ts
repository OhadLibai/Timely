// frontend/src/services/evaluation.service.ts

import { api } from '@/services/api.client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ModelMetrics {
  PrecisionAt20: number;
  RecallAt20: number;
  F1ScoreAt20: number;
  NDCGAt20: number;
  JaccardSimilarity: number;
  sampleSize?: number;
}

// ============================================================================
// METRICS SERVICE CLASS
// ============================================================================

class EvaluationService {
  /**
   * DEMAND 2: Get model performance metrics
   * Used to evaluate ML model quality
   */
  async getModelMetricsScores(sampleSize?: number): Promise<ModelMetrics> {
    try {
      const response = await api.post<ModelMetrics>(`/evaluations/metrics/${sampleSize||100}`);
      return response;
    } catch (error) {
      console.error('Failed to get model metrics:', error);
      return null;
    }
  }
}

export const evaluationService = new EvaluationService();