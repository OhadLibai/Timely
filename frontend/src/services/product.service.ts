// frontend/src/services/product.service.ts
// CLEANED: Removed admin CRUD methods that backend doesn't support

import { api } from '@/services/api.client';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  unit?: string;
  unitValue?: number;
  brand?: string;
  tags: string[];
  imageUrl?: string;
  additionalImages: string[];
  categoryId: string;
  category?: Category;
  stock: number;
  trackInventory: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  salePercentage: number;
  salePrice: number;
  inStock: boolean;
  nutritionalInfo: Record<string, any>;
  metadata: Record<string, any>;
  viewCount: number;
  purchaseCount: number;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  isActive: boolean;
  productCount?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
}

class ProductService {
  
  // ============================================================================
  // CORE PRODUCT BROWSING (Read-only operations)
  // ============================================================================

  // Get all products with filters
  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.search) params.append('search', filters.search);
    if (filters.categories?.length) {
      filters.categories.forEach(cat => params.append('categories[]', cat));
    }
    if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.inStock) params.append('inStock', 'true');
    if (filters.onSale) params.append('onSale', 'true');
    if (filters.featured) params.append('featured', 'true');

    return api.get<ProductsResponse>(`/products?${params.toString()}`);
  }

  // Get single product
  async getProduct(id: string): Promise<Product> {
    return api.get<Product>(`/products/${id}`);
  }

  // Get featured products
  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    const response = await this.getProducts({ featured: true, limit });
    return response.products;
  }

  // Get products by category
  async getProductsByCategory(categoryId: string, filters: ProductFilters = {}): Promise<ProductsResponse> {
    return this.getProducts({ ...filters, categories: [categoryId] });
  }

  // Search products
  async searchProducts(query: string, filters: ProductFilters = {}): Promise<ProductsResponse> {
    return this.getProducts({ ...filters, search: query });
  }

  // Get product recommendations
  async getRecommendations(productId: string, limit: number = 4): Promise<Product[]> {
    return api.get<Product[]>(`/products/${productId}/recommendations?limit=${limit}`);
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
  // UTILITY FUNCTIONS
  // ============================================================================

  // Get price range for filters
  async getPriceRange(): Promise<{ min: number; max: number }> {
    return api.get<{ min: number; max: number }>('/products/price-range');
  }

  // Format price for display
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  // Calculate discount percentage
  calculateDiscount(price: number, compareAtPrice?: number): number {
    if (!compareAtPrice || compareAtPrice <= price) return 0;
    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  }
}

export const productService = new ProductService();

// ============================================================================
// REMOVED DEAD CODE:
// 
// DELETED ADMIN METHODS:
// - createProduct(data: Partial<Product>): Promise<Product>
// - updateProduct(id: string, data: Partial<Product>): Promise<Product>
// - deleteProduct(id: string): Promise<void>
//
// REASON FOR REMOVAL:
// The backend product controller is read-only and doesn't implement these CRUD
// operations. Products are managed solely through database seeding scripts.
// Keeping these methods would result in 404 errors when called.
//
// ALIGNMENT WITH BACKEND:
// This service now perfectly aligns with the backend's read-only product API,
// providing all necessary functionality for:
// - Demand 1: Product browsing for seeded users
// - Demand 4: Good shopping user experience
// 
// While eliminating dead endpoints that would cause runtime errors.
// ============================================================================