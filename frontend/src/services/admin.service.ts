// frontend/src/services/admin.service.ts
// FIXED: Updated to support ANY Instacart user ID instead of hardcoded list

import { api } from '@/services/api.client';

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
  // READ-ONLY DATA VIEWS (Matching backend routes)
  // ============================================================================
  
  /**
   * Get all products (read-only - seeded via database only)
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
   * Get all users (read-only - includes demo users)
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
   * Get all orders (read-only - includes seeded demo orders)
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
}

export const adminService = new AdminService();
export default adminService;