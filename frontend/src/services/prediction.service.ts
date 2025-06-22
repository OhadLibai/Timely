// frontend/src/services/prediction.service.ts
// FIXED: Use backend proxy for model metrics instead of direct ML service calls

import { api } from './api.client'; // REMOVED: mlApi import
import { Product } from './product.service';

export interface PredictedBasketItem {
  id: string;
  basketId: string;
  productId: string;
  product: Product;
  quantity: number;
  confidenceScore: number;
  isAccepted: boolean;
  reason?: string;
  createdAt: string;
}

export interface PredictedBasket {
  id: string;
  userId: string;
  weekOf: string;
  status: 'generated' | 'modified' | 'accepted' | 'rejected';
  confidenceScore: number;
  items: PredictedBasketItem[];
  totalItems: number;
  totalValue: number;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelMetrics {
  precisionAt10: number;
  recallAt10: number;
  hitRate: number;
  ndcg: number;
  f1Score: number;
  lastUpdated: string;
}

export interface OnlineMetrics {
  autoCartAcceptanceRate: number;
  avgEditDistance: number;
  cartValueUplift: number;
  userSatisfactionScore: number;
  totalPredictions: number;
  successfulPredictions: number;
}

export interface PredictionFeedback {
  basketId: string;
  accepted: boolean;
  modifiedItems?: Array<{
    productId: string;
    action: 'added' | 'removed' | 'quantity_changed';
    newQuantity?: number;
  }>;
  rating?: number;
  comment?: string;
}

class PredictionService {
  // Get current predicted basket
  async getCurrentPredictedBasket(): Promise<PredictedBasket | null> {
    try {
      return await api.get<PredictedBasket>('/predictions/current-basket');
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Get predicted basket by ID
  async getPredictedBasket(id: string): Promise<PredictedBasket> {
    return api.get<PredictedBasket>(`/predictions/baskets/${id}`);
  }

  // Get all predicted baskets for user
  async getUserPredictedBaskets(filters?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    baskets: PredictedBasket[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);

    return api.get(`/predictions/baskets?${params.toString()}`);
  }

  // Generate new prediction
  async generatePrediction(options?: {
    weekOf?: string;
    forceRegenerate?: boolean;
  }): Promise<PredictedBasket> {
    return api.post<PredictedBasket>('/predictions/generate', options);
  }

  // Update predicted basket item
  async updateBasketItem(
    basketId: string,
    itemId: string,
    data: {
      quantity?: number;
      isAccepted?: boolean;
    }
  ): Promise<PredictedBasketItem> {
    return api.put<PredictedBasketItem>(`/predictions/baskets/${basketId}/items/${itemId}`, data);
  }

  // Remove item from predicted basket
  async removeBasketItem(basketId: string, itemId: string): Promise<void> {
    return api.delete(`/predictions/baskets/${basketId}/items/${itemId}`);
  }

  // Accept entire basket
  async acceptBasket(basketId: string): Promise<PredictedBasket> {
    return api.post<PredictedBasket>(`/predictions/baskets/${basketId}/accept`);
  }

  // Reject basket
  async rejectBasket(basketId: string, reason?: string): Promise<PredictedBasket> {
    return api.post<PredictedBasket>(`/predictions/baskets/${basketId}/reject`, { reason });
  }

  // Submit feedback
  async submitFeedback(feedback: PredictionFeedback): Promise<void> {
    return api.post('/predictions/feedback', feedback);
  }

  // FIXED: Get model metrics through backend proxy instead of direct ML service call
  async getModelMetrics(): Promise<ModelMetrics> {
    return api.get<ModelMetrics>('/admin/ml/metrics/model-performance');
  }

  // Get online metrics
  async getOnlineMetrics(): Promise<OnlineMetrics> {
    return api.get<OnlineMetrics>('/predictions/metrics/online');
  }

  // Get personalized recommendations
  async getRecommendations(options?: {
    limit?: number;
    categoryId?: string;
    excludeBasket?: boolean;
  }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.categoryId) params.append('category', options.categoryId);
    if (options?.excludeBasket) params.append('excludeBasket', 'true');

    return api.get<Product[]>(`/predictions/recommendations?${params.toString()}`);
  }

  // Get prediction explanation
  async getPredictionExplanation(basketId: string, productId: string): Promise<any> {
    return api.get(`/predictions/baskets/${basketId}/items/${productId}/explanation`);
  }

  // Get user preferences
  async getPreferences(): Promise<any> {
    return api.get('/predictions/preferences');
  }

  // Update user preferences
  async updatePreferences(preferences: any): Promise<any> {
    return api.put('/predictions/preferences', preferences);
  }

  // Get prediction schedule
  async getSchedule(): Promise<any> {
    return api.get('/predictions/schedule');
  }

  // Update prediction schedule
  async updateSchedule(schedule: any): Promise<any> {
    return api.put('/predictions/schedule', schedule);
  }

  // Get prediction history
  async getPredictionHistory(days?: number): Promise<any> {
    const params = days ? `?days=${days}` : '';
    return api.get(`/predictions/history${params}`);
  }

  // Evaluate prediction accuracy
  async evaluatePrediction(basketId: string): Promise<any> {
    return api.get(`/predictions/baskets/${basketId}/evaluate`);
  }
}

export const predictionService = new PredictionService();