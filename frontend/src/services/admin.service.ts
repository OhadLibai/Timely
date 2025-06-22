// frontend/src/services/admin.service.ts
// FIXED: Corrected API endpoint paths to match backend routes

import { api } from './api.client';

export interface ModelMetrics {
  precision_at_k: Record<string, number>;
  recall_at_k: Record<string, number>;
  hit_rate: number;
  ndcg: number;
  f1_score: number;
}

export interface SystemHealth {
  status: string;
  database: string;
  mlService: string;
  timestamp: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCategories: Array<{
    name: string;
    count: number;
  }>;
  recentOrders: Array<{
    id: string;
    user: string;
    total: number;
    createdAt: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

export interface DemoUserPrediction {
  userId: string;
  predictedBasket: Array<{ id: string; name: string; imageUrl?: string; price: number; category?: string; }>;
  trueFutureBasket: Array<{ id: string; name: string; imageUrl?: string; price: number; category?: string; }>;
  comparisonMetrics: { predictedCount: number; actualCount: number; commonItems: number; };
}

export interface DemoUserIds {
  userIds: string[];
  count: number;
}

class AdminService {
  
  // ============================================================================
  // SYSTEM MONITORING & EVALUATION
  // ============================================================================
  
  async getDashboardStats(): Promise<any> {
    return api.get('/admin/dashboard/stats');
  }

  async getSystemHealth(): Promise<any> {
    return api.get('/admin/system/health');
  }

  /**
   * DEMAND 2: Trigger model evaluation
   */
  async triggerModelEvaluation(): Promise<any> {
    return api.post('/admin/ml/evaluate');
  }

  // ============================================================================
  // DEMO FUNCTIONALITY
  // ============================================================================
  
  async getDemoUserIds(): Promise<DemoUserIds> {
    return api.get<DemoUserIds>('/admin/demo/user-ids');
  }

  /**
   * DEMAND 3: Get live demo prediction comparison
   */
  async getDemoUserPrediction(userId: string): Promise<DemoUserPrediction> {
    return api.get<DemoUserPrediction>(`/admin/demo/user-prediction/${userId}`);
  }

  /**
   * DEMAND 1: Seed a new demo user into the database
   */
  async seedDemoUser(instacartUserId: string): Promise<any> {
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
    products: Array<any>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return api.get('/admin/products', { params });
  }

  /**
   * Create new product
   */
  async createProduct(productData: any): Promise<any> {
    return api.post('/admin/products', productData);
  }

  /**
   * Update existing product
   */
  async updateProduct(productId: string, productData: any): Promise<any> {
    return api.put(`/admin/products/${productId}`, productData);
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string): Promise<void> {
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
    users: Array<any>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return api.get('/admin/users', { params });
  }

  /**
   * Update user status/role
   */
  async updateUser(userId: string, userData: any): Promise<any> {
    return api.put(`/admin/users/${userId}`, userData);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    return api.delete(`/admin/users/${userId}`);
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
    search?: string;
    status?: string;
  }): Promise<{
    orders: Array<any>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return api.get('/admin/orders', { params });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    return api.put(`/admin/orders/${orderId}/status`, { status });
  }
}

const adminService = new AdminService();
export { adminService };