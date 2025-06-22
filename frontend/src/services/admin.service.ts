// frontend/src/services/admin.service.ts
// FIXED: Updated to support ANY Instacart user ID instead of hardcoded list

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

// FIXED: Updated interface to reflect new backend response
export interface DemoUserIds {
  message: string;
  note: string;
  feature_engineering: string;
  restriction: string;
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
  
  /**
   * FIXED: Now returns metadata about the demo system instead of hardcoded user IDs
   */
  async getDemoUserIds(): Promise<DemoUserIds> {
    return api.get<DemoUserIds>('/admin/demo/user-ids');
  }

  /**
   * DEMAND 3: Get live demo prediction comparison
   * FIXED: Now accepts ANY user ID - no client-side validation
   */
  async getDemoUserPrediction(userId: string): Promise<DemoUserPrediction> {
    return api.get<DemoUserPrediction>(`/admin/demo/user-prediction/${userId}`);
  }

  /**
   * DEMAND 1: Seed a new demo user into the database
   * FIXED: Now accepts ANY Instacart user ID - no client-side validation
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
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.order) queryParams.append('order', params.order);

    return api.get(`/admin/products?${queryParams.toString()}`);
  }

  /**
   * Create new product
   */
  async createProduct(data: FormData): Promise<any> {
    return api.post('/admin/products', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Update existing product
   */
  async updateProduct(productId: string, data: FormData): Promise<any> {
    return api.put(`/admin/products/${productId}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string): Promise<any> {
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
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.order) queryParams.append('order', params.order);

    return api.get(`/admin/users?${queryParams.toString()}`);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: any): Promise<any> {
    return api.put(`/admin/users/${userId}`, data);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<any> {
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
    startDate?: string;
    endDate?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.order) queryParams.append('order', params.order);

    return api.get(`/admin/orders?${queryParams.toString()}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string, reason?: string): Promise<any> {
    return api.put(`/admin/orders/${orderId}/status`, { status, reason });
  }

  // ============================================================================
  // ANALYTICS & REPORTING
  // ============================================================================
  
  /**
   * Get comprehensive analytics data
   */
  async getAnalytics(params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
    metrics?: string[];
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.period) queryParams.append('period', params.period);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.metrics) params.metrics.forEach(metric => queryParams.append('metrics', metric));

    return api.get(`/admin/analytics?${queryParams.toString()}`);
  }

  /**
   * Get sales metrics
   */
  async getSalesMetrics(period: string = 'month'): Promise<any> {
    return api.get(`/admin/analytics/sales?period=${period}`);
  }

  /**
   * Get user engagement metrics
   */
  async getUserMetrics(period: string = 'month'): Promise<any> {
    return api.get(`/admin/analytics/users?period=${period}`);
  }

  /**
   * Get product performance metrics
   */
  async getProductMetrics(period: string = 'month'): Promise<any> {
    return api.get(`/admin/analytics/products?period=${period}`);
  }

  // ============================================================================
  // ML SERVICE MANAGEMENT
  // ============================================================================
  
  /**
   * Get ML service status and health
   */
  async getMLServiceStatus(): Promise<any> {
    return api.get('/admin/ml-service/status');
  }

  /**
   * Get architecture status
   */
  async getArchitectureStatus(): Promise<any> {
    return api.get('/admin/architecture/status');
  }

  /**
   * Retrain ML models (if implemented)
   */
  async retrainModel(config?: any): Promise<any> {
    return api.post('/admin/ml/retrain', config);
  }

  // ============================================================================
  // SYSTEM SETTINGS
  // ============================================================================
  
  /**
   * Get system settings
   */
  async getSettings(): Promise<any> {
    return api.get('/admin/settings');
  }

  /**
   * Update system settings
   */
  async updateSettings(settings: any): Promise<any> {
    return api.put('/admin/settings', settings);
  }

  /**
   * Get system logs
   */
  async getLogs(params?: {
    level?: string;
    service?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.level) queryParams.append('level', params.level);
    if (params?.service) queryParams.append('service', params.service);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return api.get(`/admin/logs?${queryParams.toString()}`);
  }

  // ============================================================================
  // BACKUP & MAINTENANCE
  // ============================================================================
  
  /**
   * Create system backup
   */
  async createBackup(): Promise<any> {
    return api.post('/admin/backup');
  }

  /**
   * Get backup status
   */
  async getBackupStatus(): Promise<any> {
    return api.get('/admin/backup/status');
  }

  /**
   * Run system maintenance
   */
  async runMaintenance(tasks: string[]): Promise<any> {
    return api.post('/admin/maintenance', { tasks });
  }
}

export const adminService = new AdminService();
export default adminService;