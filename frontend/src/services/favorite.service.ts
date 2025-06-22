// frontend/src/services/favorite.service.ts
// SIMPLIFIED: Basic favorite management only - removed complex features

import { api } from '@/services/api.client';
import { Product } from '@/services/product.service';

export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  createdAt: string;
}

class FavoriteService {
  
  // ============================================================================
  // CORE FAVORITE OPERATIONS (Essential functionality only)
  // ============================================================================

  /**
   * Get user's favorite products
   */
  async getFavorites(): Promise<Favorite[]> {
    return api.get<Favorite[]>('/user/favorites');
  }

  /**
   * Add product to favorites
   */
  async addFavorite(productId: string): Promise<Favorite> {
    return api.post<Favorite>('/user/favorites/add', { productId });
  }

  /**
   * Remove product from favorites
   */
  async removeFavorite(productId: string): Promise<void> {
    return api.delete(`/user/favorites/${productId}`);
  }

  /**
   * Check if product is favorited
   */
  async isProductFavorited(productId: string): Promise<boolean> {
    try {
      const response = await api.get<{ isFavorited: boolean }>(`/user/favorites/check/${productId}`);
      return response.isFavorited;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get favorite product IDs only (for quick lookups)
   */
  async getFavoriteIds(): Promise<string[]> {
    return api.get<string[]>('/user/favorites/ids');
  }

  // ============================================================================
  // REMOVED COMPLEX FEATURES:
  // - createFavoriteList
  // - getFavoriteLists
  // - updateFavoriteList
  // - deleteFavoriteList
  // - addToFavoriteList
  // - removeFromFavoriteList
  // - shareFavoriteList
  // - importFavorites
  // - exportFavorites
  // - getFavoriteStats
  // - getFavoriteRecommendations
  // - searchFavorites
  // - sortFavorites
  // - getFavoriteCategories
  // - bulkAddFavorites
  // - bulkRemoveFavorites
  // - moveFavorites
  // - copyFavorites
  // - mergeFavoriteLists
  //
  // These features added unnecessary complexity for a dev/test environment.
  // Simple add/remove favorites is sufficient for demonstration purposes.
  // ============================================================================
}

export const favoriteService = new FavoriteService();