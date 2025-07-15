// frontend/src/services/favorite.service.ts
// CONSISTENCY: All methods now follow userId in URL path pattern

import { api } from '@/services/api.client';
import { useAuthStore } from '@/stores/auth.store';
import { Product } from '@/services/product.service';

export interface Favorite {
  id: string;
  userId: string;
  product: Product;
}

class FavoriteService {
  
  // ============================================================================
  // CORE FAVORITE OPERATIONS 
  // ============================================================================

  /**
   * Get user's favorite products
   * UPDATED: Uses userId in URL path for Option B consistency
   */
  async getFavorites(): Promise<Favorite[]> {
    const userId = useAuthStore.getState().getCurrentUserId();
    return api.get<Favorite[]>(`/favorites/user/${userId}`);
  }

  /**
   * Add product to favorites
   */
  async addFavorite(productId: string): Promise<{message : string}> {
    const userId = useAuthStore.getState().getCurrentUserId();
    return api.post<{message : string}>(`/favorites/user/${userId}/add`, { productId });
  }

  /**
   * Remove product from favorites
   */
  async removeFavorite(productId: string): Promise<void> {
    const userId = useAuthStore.getState().getCurrentUserId();
    return api.delete(`/favorites/user/${userId}/${productId}`);
  }

  /**
   * Check if product is favorited
   */
  async isProductFavorited(productId: string): Promise<boolean> {
    try {
      const userId = useAuthStore.getState().getCurrentUserId();
      const response = await api.get<{ isFavorited: boolean }>(`/favorites/user/${userId}/check/${productId}`);
      return response.isFavorited;
    } catch (error) {
      return false;
    }
  }
}

export const favoriteService = new FavoriteService();