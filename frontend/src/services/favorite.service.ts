// frontend/src/services/favorite.service.ts
// CONSISTENCY: All methods now follow userId in URL path pattern

import { api } from '@/services/api.client';
import { useAuthStore } from '@/stores/auth.store';
import { Product } from '@/services/product.service';
import { authService } from './auth.service';

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
    const userId = authService.getUser()?.id;
    return api.get<Favorite[]>(`/favorites/user/${userId}`);
  }

  /**
   * Add product to favorites
   */
  async addFavorite(productId: string): Promise<{message : string}> {
    const userId = authService.getUser()?.id;
    return api.post<{message : string}>(`/favorites/user/${userId}/add`, { productId });
  }

  /**
   * Remove product from favorites
   */
  async removeFavorite(productId: string): Promise<void> {
    const userId = authService.getUser()?.id;
    return api.delete(`/favorites/user/${userId}/${productId}`);
  }

  /**
   * Check if a product is favorited by the current user
   */
  async isProductFavorited(productId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some(favorite => favorite.product.id === productId);
  }
}

export const favoriteService = new FavoriteService();