// frontend/src/services/favorite.service.ts
import { api } from './api.client';
import { Product } from './product.service';

export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  createdAt: string;
}

export interface FavoritesResponse {
  favorites: Favorite[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FavoritesList {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isPublic: boolean;
  items: Favorite[];
  createdAt: string;
  updatedAt: string;
}

class FavoriteService {
  // Get all favorites
  async getFavorites(options: {
    page?: number;
    limit?: number;
    sort?: string;
  } = {}): Promise<FavoritesResponse> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.sort) params.append('sort', options.sort);

    return api.get<FavoritesResponse>(`/user/favorites?${params.toString()}`);
  }

  // Add product to favorites
  async addFavorite(productId: string): Promise<Favorite> {
    return api.post<Favorite>('/user/favorites/add', { productId });
  }

  // Remove product from favorites
  async removeFavorite(productId: string): Promise<void> {
    return api.delete(`/user/favorites/${productId}`);
  }

  // Check if product is favorited
  async isFavorited(productId: string): Promise<boolean> {
    try {
      const response = await api.get<{ isFavorited: boolean }>(`/user/favorites/check/${productId}`);
      return response.isFavorited;
    } catch {
      return false;
    }
  }

  // Get favorite product IDs (for bulk checking)
  async getFavoriteIds(): Promise<string[]> {
    try {
      const response = await api.get<{ productIds: string[] }>('/user/favorites/ids');
      return response.productIds;
    } catch {
      return [];
    }
  }

  // Create a favorites list
  async createList(data: {
    name: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<FavoritesList> {
    return api.post<FavoritesList>('/user/favorites/lists', data);
  }

  // Get all lists
  async getLists(): Promise<FavoritesList[]> {
    return api.get<FavoritesList[]>('/user/favorites/lists');
  }

  // Get a specific list
  async getList(listId: string): Promise<FavoritesList> {
    return api.get<FavoritesList>(`/user/favorites/lists/${listId}`);
  }

  // Update list
  async updateList(listId: string, data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<FavoritesList> {
    return api.put<FavoritesList>(`/user/favorites/lists/${listId}`, data);
  }

  // Delete list
  async deleteList(listId: string): Promise<void> {
    return api.delete(`/user/favorites/lists/${listId}`);
  }

  // Add product to list
  async addToList(listId: string, productId: string): Promise<FavoritesList> {
    return api.post<FavoritesList>(`/user/favorites/lists/${listId}/add`, { productId });
  }

  // Remove product from list
  async removeFromList(listId: string, productId: string): Promise<FavoritesList> {
    return api.delete<FavoritesList>(`/user/favorites/lists/${listId}/remove/${productId}`);
  }

  // Share list
  async shareList(listId: string): Promise<{ shareUrl: string; shareCode: string }> {
    return api.post<{ shareUrl: string; shareCode: string }>(`/user/favorites/lists/${listId}/share`);
  }

  // Get shared list
  async getSharedList(shareCode: string): Promise<FavoritesList> {
    return api.get<FavoritesList>(`/user/favorites/shared/${shareCode}`);
  }

  // Import shared list
  async importSharedList(shareCode: string): Promise<FavoritesList> {
    return api.post<FavoritesList>('/user/favorites/import', { shareCode });
  }

  // Get favorite statistics
  async getStats(): Promise<{
    totalFavorites: number;
    favoriteCategories: Array<{ category: string; count: number }>;
    favoriteBrands: Array<{ brand: string; count: number }>;
    priceRange: { min: number; max: number; avg: number };
    recentlyAdded: Favorite[];
  }> {
    return api.get('/user/favorites/stats');
  }

  // Get recommendations based on favorites
  async getRecommendations(limit: number = 10): Promise<Product[]> {
    return api.get<Product[]>(`/user/favorites/recommendations?limit=${limit}`);
  }

  // Bulk operations
  async addMultipleFavorites(productIds: string[]): Promise<{
    added: number;
    skipped: number;
    errors: string[];
  }> {
    return api.post('/user/favorites/bulk-add', { productIds });
  }

  async removeMultipleFavorites(productIds: string[]): Promise<{
    removed: number;
    errors: string[];
  }> {
    return api.post('/user/favorites/bulk-remove', { productIds });
  }

  // Export favorites
  async exportFavorites(format: 'csv' | 'json' = 'json'): Promise<Blob> {
    const response = await api.get(`/user/favorites/export?format=${format}`, {
      responseType: 'blob'
    });
    return response as Blob;
  }

  // Sync favorites across devices
  async syncFavorites(localFavorites: string[]): Promise<{
    added: string[];
    removed: string[];
    synced: string[];
  }> {
    return api.post('/user/favorites/sync', { localFavorites });
  }
}

export const favoriteService = new FavoriteService();