// frontend/src/services/prediction.service.ts
// FINAL REFACTORED VERSION: Radically simplified to a single, powerful method.

import { api } from '@/services/api.client';
import { Product } from '@/services/product.service';

/**
 * Defines the structure of a single item within the AI's prediction.
 * This is the blueprint for the data received from the backend.
 */
export interface PredictedBasketItem {
  product: Product;
  quantity: number;
}

/**
 * Defines the structure for the entire predicted basket.
 */
export interface PredictedBasket {
  id: string; // The unique ID for this specific prediction.
  items: PredictedBasketItem[];
}

// NEW: Define the structured response interface
export interface PredictionResponse {
  basket: PredictedBasket | null;
  error?: string;
  success: boolean;
}

// ============================================================================
// PREDICTION SERVICE CLASS
// ============================================================================
class PredictionService {
  /**
   * Fetches the latest predicted basket for the user.
   *
   * This is the ONLY method needed for the entire prediction feature.
   * The backend endpoint '/predictions/get-predicted-basket-db' is responsible for:
   * 1. Returning a user's existing, active prediction if one is available.
   * 2. Automatically generating a NEW prediction if one does not exist 
   * 
   * This simplifies the frontend logic immensely—it just has to call one
   * function and display the result.
   */
  async getPredictedBasketDB(userID: string): Promise<PredictedBasket | null> {
    try {
      // This single endpoint handles both fetching and generation.
      const response = await api.post<PredictionResponse>('/predictions/get-predicted-basket');
      return response;
    } catch (error: any) {
      console.error('Failed to get or generate prediction:', error);
      // If the API fails for any reason, return null so the UI can show an error.
      return null;
    }
  }

  async getPredictedBasketCSV(userID: string): Promise<PredictedBasket | null> {
    try {
      // This single endpoint handles both fetching and generation.
      const response = await api.post<PredictionResponse>('/predictions/get-predicted-basket');
      return response;
    } catch (error: any) {
      console.error('Failed to get or generate prediction:', error);
      // If the API fails for any reason, return null so the UI can show an error.
      return null;
    }
  }
}

export const predictionService = new PredictionService();