// frontend/src/services/product.service.ts
// CLEANED: Removed admin CRUD methods that backend doesn't support

import { api } from '@/services/api.client';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  brand?: string;
  imageUrl?: string;
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
  order?: string;
  search?: string;
  categories?: string[];
  inStock?: boolean;
}

class ProductService {
  
  // ============================================================================
  // CORE PRODUCT BROWSING (Read-only operations)
  // ============================================================================

  // Get all products with filters
  async getProducts(filters: any = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.search) params.append('search', filters.search);
    if (filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
      filters.categories.forEach((cat: string) => params.append('categories[]', cat));
    }
    if (filters.inStock) params.append('inStock', 'true');

    return api.get(`/products?${params.toString()}`);
  }

  // Get single product
  async getProduct(id: string): Promise<Product> {
    return api.get<Product>(`/products/${id}`);
  }

  // Get products by category
  async getProductsByCategory(categoryId: string, filters: ProductFilters = {}) {
    return this.getProducts({ ...filters, categories: [categoryId] });
  }

  // Search products
  async searchProducts(query: string, filters: ProductFilters = {}) {
    return this.getProducts({ ...filters, search: query });
  }

  // ============================================================================
  // CATEGORY OPERATIONS (Read-only)
  // ============================================================================

  // Get categories
  async getCategories(): Promise<Category[]> {
    return api.get<Category[]>('/products/categories');
  }
}

export const productService = new ProductService();