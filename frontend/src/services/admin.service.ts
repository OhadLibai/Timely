// frontend/src/services/admin.service.ts
// UPDATED: Removed feature importance, maintained demo functionality, black box ML

import { api } from './api.client';
import { Product } from './product.service';

// Core admin interfaces (BLACK BOX - no feature importance)
export interface ModelMetrics {
  precisionAt10: number;
  recallAt10: number;
  hitRate: number;
  ndcg: number;
  f1Score: number;
  lastUpdated: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'healthy' | 'unhealthy';
    mlService: 'healthy' | 'unhealthy';
  };
  architecture: string;
  feature_engineering: string;
  timestamp: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  mlService: {
    status: string;
    architecture: string;
    feature_engineering: string;
  } | null;
  architecture: string;
  feature_engineering: string;
  timestamp: string;
}

// Demo interfaces (maintained functionality)
export interface DemoUserPrediction {
  userId: string;
  predictedBasket: DemoBasketItem[];
  trueFutureBasket: DemoBasketItem[];
  architecture: string;
  feature_engineering: string;
  comparisonMetrics: {
    predictedCount: number;
    actualCount: number;
    commonItems: number;
  };
}

export interface DemoBasketItem {
  id: string;
  sku: string;
  name: string;
  imageUrl: string;
  price: number;
  salePrice: number;
  category: string;
  confidenceScore?: number;
}

export interface DemoUserIds {
  userIds: string[];
  message: string;
  count: number;
  feature_engineering: string;
}

class AdminService {
  
  // ============================================================================
  // SYSTEM MONITORING (BLACK BOX)
  // ============================================================================
  
  /**
   * Get dashboard statistics without exposing ML internals
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return api.get<DashboardStats>('/admin/dashboard/stats');
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return api.get<SystemHealth>('/admin/system/health');
  }

  /**
   * Trigger BLACK BOX model evaluation (no feature importance)
   */
  async triggerModelEvaluation(): Promise<{
    message: string;
    metrics: ModelMetrics;
    architecture: string;
    feature_engineering: string;
    timestamp: string;
  }> {
    return api.post('/admin/ml/evaluate');
  }

  // ============================================================================
  // DEMO FUNCTIONALITY (MAINTAINED)
  // ============================================================================
  
  /**
   * Get available demo user IDs
   */
  async getDemoUserIds(): Promise<DemoUserIds> {
    return api.get<DemoUserIds>('/admin/demo/user-ids');
  }

  /**
   * Get demo prediction comparison (AI vs actual)
   */
  async getDemoUserPrediction(userId: string): Promise<DemoUserPrediction> {
    return api.get<DemoUserPrediction>(`/admin/demo/users/${userId}/prediction`);
  }

  /**
   * Seed demo user with Instacart order history
   */
  async seedDemoUser(instacartUserId: string): Promise<{
    message: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    ordersCreated: number;
    architecture: string;
    feature_engineering: string;
  }> {
    return api.post(`/admin/demo/seed-user/${instacartUserId}`);
  }

  // ============================================================================
  // PRODUCT MANAGEMENT
  // ============================================================================
  
  /**
   * Get all products with admin details
   */
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    return api.get(`/admin/products?${searchParams.toString()}`);
  }

  /**
   * Create new product
   */
  async createProduct(productData: Partial<Product>): Promise<Product> {
    return api.post<Product>('/admin/products', productData);
  }

  /**
   * Update existing product
   */
  async updateProduct(productId: string, productData: Partial<Product>): Promise<Product> {
    return api.put<Product>(`/admin/products/${productId}`, productData);
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string): Promise<{ message: string }> {
    return api.delete(`/admin/products/${productId}`);
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================
  
  /**
   * Get all users with admin details
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<{
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    return api.get(`/admin/users?${searchParams.toString()}`);
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, isActive: boolean): Promise<{ message: string }> {
    return api.patch(`/admin/users/${userId}/status`, { isActive });
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string): Promise<{ message: string }> {
    return api.patch(`/admin/users/${userId}/role`, { role });
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================
  
  /**
   * Get all orders with admin details
   */
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    orders: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    return api.get(`/admin/orders?${searchParams.toString()}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<{ message: string }> {
    return api.patch(`/admin/orders/${orderId}/status`, { status });
  }

  // ============================================================================
  // ANALYTICS (BLACK BOX)
  // ============================================================================
  
  /**
   * Get sales analytics without exposing ML internals
   */
  async getSalesAnalytics(dateRange: { start: string; end: string }): Promise<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    salesByDay: Array<{ date: string; sales: number; orders: number }>;
    topProducts: Array<{ productId: string; name: string; sales: number }>;
    feature_engineering: string;
  }> {
    return api.get(`/admin/analytics/sales?start=${dateRange.start}&end=${dateRange.end}`);
  }

  /**
   * Get user engagement analytics
   */
  async getUserAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    userGrowth: Array<{ month: string; newUsers: number }>;
    feature_engineering: string;
  }> {
    return api.get('/admin/analytics/users');
  }
}

export const adminService = new AdminService();
export default adminService;