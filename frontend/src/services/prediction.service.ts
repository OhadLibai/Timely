// frontend/src/services/prediction.service.ts
import { api, mlApi } from './api.client';
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
  ): Promise<PredictedBasket> {
    return api.put<PredictedBasket>(
      `/predictions/baskets/${basketId}/items/${itemId}`,
      data
    );
  }

  // Remove item from predicted basket
  async removeBasketItem(basketId: string, itemId: string): Promise<PredictedBasket> {
    return api.delete<PredictedBasket>(
      `/predictions/baskets/${basketId}/items/${itemId}`
    );
  }

  // Add item to predicted basket
  async addBasketItem(
    basketId: string,
    data: {
      productId: string;
      quantity: number;
    }
  ): Promise<PredictedBasket> {
    return api.post<PredictedBasket>(
      `/predictions/baskets/${basketId}/items`,
      data
    );
  }

  // Accept predicted basket
  async acceptBasket(basketId: string): Promise<{ orderId: string }> {
    return api.post<{ orderId: string }>(
      `/predictions/baskets/${basketId}/accept`
    );
  }

  // Reject predicted basket
  async rejectBasket(basketId: string, reason?: string): Promise<void> {
    return api.post(`/predictions/baskets/${basketId}/reject`, { reason });
  }

  // Submit feedback
  async submitFeedback(feedback: PredictionFeedback): Promise<void> {
    return api.post('/predictions/feedback', feedback);
  }

  // Get model metrics
  async getModelMetrics(): Promise<ModelMetrics> {
    return mlApi.get<ModelMetrics>('/metrics/model-performance');
  }

  // Get online metrics
  async getOnlineMetrics(): Promise<OnlineMetrics> {
    return api.get<OnlineMetrics>('/predictions/metrics/online');
  }

  // Get personalized recommendations
  async getRecommendations(options?: {
    limit?: number;
    category?: string;
    excludeBasket?: boolean;
  }): Promise<Array<{ product: Product; score: number; reason: string }>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.category) params.append('category', options.category);
    if (options?.excludeBasket) params.append('excludeBasket', 'true');

    return api.get(`/predictions/recommendations?${params.toString()}`);
  }

  // Get prediction explanation
  async getPredictionExplanation(
    basketId: string,
    productId: string
  ): Promise<{
    factors: Array<{ name: string; impact: number; description: string }>;
    historicalData: Array<{ date: string; purchased: boolean; quantity?: number }>;
    confidence: number;
  }> {
    return api.get(
      `/predictions/baskets/${basketId}/items/${productId}/explanation`
    );
  }

  // Schedule automatic basket generation
  async updateSchedule(schedule: {
    enabled: boolean;
    dayOfWeek: number; // 0-6, 0 = Sunday
    timeOfDay: string; // HH:MM format
  }): Promise<void> {
    return api.put('/predictions/schedule', schedule);
  }

  // Get user's prediction preferences
  async getPreferences(): Promise<{
    autoBasketEnabled: boolean;
    autoBasketDay: number;
    autoBasketTime: string;
    minConfidenceThreshold: number;
    excludeCategories: string[];
    maxBasketSize: number;
  }> {
    return api.get('/predictions/preferences');
  }

  // Update prediction preferences
  async updatePreferences(preferences: {
    autoBasketEnabled?: boolean;
    autoBasketDay?: number;
    autoBasketTime?: string;
    minConfidenceThreshold?: number;
    excludeCategories?: string[];
    maxBasketSize?: number;
  }): Promise<void> {
    return api.put('/predictions/preferences', preferences);
  }

  // Utility functions
  calculateAccuracy(basket: PredictedBasket): number {
    const acceptedItems = basket.items.filter(item => item.isAccepted).length;
    return basket.items.length > 0 ? (acceptedItems / basket.items.length) * 100 : 0;
  }

  getConfidenceLevel(score: number): {
    level: 'high' | 'medium' | 'low';
    color: string;
    description: string;
  } {
    if (score >= 0.8) {
      return {
        level: 'high',
        color: 'green',
        description: 'Very likely to be needed'
      };
    } else if (score >= 0.6) {
      return {
        level: 'medium',
        color: 'yellow',
        description: 'Likely to be needed'
      };
    } else {
      return {
        level: 'low',
        color: 'orange',
        description: 'Possibly needed'
      };
    }
  }
}

export const predictionService = new PredictionService();