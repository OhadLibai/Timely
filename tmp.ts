// frontend/src/services/product.service.ts
// CLEANED: Removed admin CRUD methods that backend doesn't support
// CLEANED: Removed price range filtering parameters

import { api } from '@/services/api.client';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  brand?: string;
  imageUrl?: string;
  categoryId: string;
  category?: Category;
  stock: number;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  categories?: string[];
  inStock?: boolean;
  // REMOVED: minPrice and maxPrice parameters
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

class ProductService {
  
  // ============================================================================
  // CORE PRODUCT BROWSING (Read-only operations)
  // ============================================================================

  // Get all products with filters - CLEANED: Removed price filtering
  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.order) params.append('order', filters.order);
    if (filters.search) params.append('search', filters.search);
    if (filters.categories?.length) {
      filters.categories.forEach(cat => params.append('categories[]', cat));
    }
    if (filters.inStock) params.append('inStock', 'true');
    
    // REMOVED: minPrice and maxPrice parameters
    // These lines were removed:
    // if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
    // if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());

    return api.get<ProductsResponse>(`/products?${params.toString()}`);
  }

  // Get single product
  async getProduct(id: string): Promise<Product> {
    return api.get<Product>(`/products/${id}`);
  }

  // Get products by category
  async getProductsByCategory(categoryId: string, filters: ProductFilters = {}): Promise<ProductsResponse> {
    return this.getProducts({ ...filters, categories: [categoryId] });
  }

  // Search products
  async searchProducts(query: string, filters: ProductFilters = {}): Promise<ProductsResponse> {
    return this.getProducts({ ...filters, search: query });
  }

  // ============================================================================
  // CATEGORY OPERATIONS (Read-only)
  // ============================================================================

  // Get categories
  async getCategories(): Promise<Category[]> {
    return api.get<Category[]>('/products/categories');
  }

  // Get category by ID
  async getCategory(id: string): Promise<Category> {
    return api.get<Category>(`/products/categories/${id}`);
  }

  // ============================================================================
  // PRODUCT RECOMMENDATIONS & ANALYTICS
  // ============================================================================

  // Get product recommendations
  async getRecommendations(productId: string, limit: number = 4): Promise<Product[]> {
    return api.get<Product[]>(`/products/${productId}/recommendations?limit=${limit}`);
  }

  // Track product view
  async trackView(productId: string): Promise<void> {
    try {
      await api.post(`/products/${productId}/view`);
    } catch (error) {
      // View tracking is optional - don't throw error
      console.warn('Product view tracking failed:', error);
    }
  }
}

export const productService = new ProductService();