// frontend/src/services/admin.service.ts
// FIXED: Corrected API endpoint paths to match backend routes

import api from './api.client';

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
  predictedBasket: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    price: number;
    category?: string;
    predictedQuantity?: number;
    confidenceScore?: number;
  }>;
  trueFutureBasket: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    price: number;
    category?: string;
  }>;
  comparisonMetrics: {
    predictedCount: number;
    actualCount: number;
    commonItems: number;
  };
  architecture: string;
  feature_engineering: string;
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
  // DEMO FUNCTIONALITY (FIXED ENDPOINTS)
  // ============================================================================
  
  /**
   * Get available demo user IDs
   * FIXED: Correct endpoint path
   */
  async getDemoUserIds(): Promise<DemoUserIds> {
    return api.get<DemoUserIds>('/admin/demo/user-ids');
  }

  /**
   * Get demo prediction comparison (AI vs actual)
   * FIXED: Correct endpoint path to match backend route
   */
  async getDemoUserPrediction(userId: string): Promise<DemoUserPrediction> {
    return api.get<DemoUserPrediction>(`/admin/demo/user-prediction/${userId}`);
  }

  /**
   * Seed demo user with Instacart order history
   * FIXED: Correct endpoint path
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