// frontend/src/services/prediction.service.ts
// MINIMAL CHANGES: Only necessary fixes for error handling and missing method

import { api } from '@/services/api.client';
import { Product } from '@/services/product.service';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Defines the structure of a single item within the AI's prediction.
 */
export interface PredictedBasketItem {
  product: Product;
  quantity: number;
}

/**
 * Defines the structure for the entire predicted basket.
 */
export interface PredictedBasket {
  id: string;
  items: PredictedBasketItem[];
}

/**
 * Backend response structure - UPDATED: basket can be empty object for business logic errors
 */
export interface PredictionResponse {
  basket: PredictedBasket | {}; // Empty object for prediction faults (< 3 orders)
  error?: string;
  success: boolean;
}

// ============================================================================
// PREDICTION SERVICE CLASS
// ============================================================================
class PredictionService {
  /**
   * ADDED: Missing method that components actually call
   * Normal user flow for predictions (Demand 1)
   */
  async getPredictedBasket(): Promise<PredictionResponse> {
    try {
      const userId = useAuthStore.getState().getCurrentUserId();
      const response = await api.post<PredictionResponse>(`/predictions/get-predicted-basket/${userId}`);
      return response;
    } catch (error: any) {
      console.error('Failed to get or generate prediction:', error);
      
      // MINIMAL FIX: Extract error message before returning
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate predictions';
      return { 
        basket: {}, // Empty object for errors
        error: errorMessage, 
        success: false 
      };
    }
  }

  /**
   * UPDATED: Admin function for Demand 3 - CSV-based predictions
   * Return type changed to PredictionResponse for consistency
   */
  async getPredictedBasketCSV(userID: string): Promise<PredictionResponse> {
    try {
      const response = await api.post<PredictionResponse>(`/predictions/get-predicted-basket-csv/${userID}`);
      return response;
    } catch (error: any) {
      console.error('Failed to get or generate prediction:', error);
      
      // MINIMAL FIX: Extract error message before returning
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate predictions';
      return { 
        basket: {}, // Empty object for errors
        error: errorMessage, 
        success: false 
      };
    }
  }

  // REMOVED: getPredictedBasketDB - overlaps with getPredictedBasket
}

export const predictionService = new PredictionService();

// ============================================================================
// MINIMAL CHANGES SUMMARY:
// 
// ✅ ADDED: Missing getPredictedBasket() method that components call
// ✅ UPDATED: PredictionResponse interface - basket can be empty object {}
// ✅ UPDATED: Return types from PredictedBasket|null to PredictionResponse  
// ✅ ADDED: Option B implementation - userId in URL path
// ✅ FIXED: Error message extraction before returning structured response
// ✅ REMOVED: getPredictedBasketDB to avoid overlap with getPredictedBasket
// ✅ PRESERVED: All existing patterns and minimal code changes only
// 
// Now components will receive both basket data and error messages cleanly
// ============================================================================