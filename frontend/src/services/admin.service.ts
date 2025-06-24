// frontend/src/services/admin.service.ts
// FIXED: Transform snake_case ML responses to camelCase in service layer

import { api } from '@/services/api.client';

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Transform ML service evaluation response from snake_case to camelCase
 */
function transformEvaluationMetrics(rawMetrics: any): any {
  if (!rawMetrics) return null;

  const transformed: any = {
    // Transform nested precision_at_k to camelCase with flat structure
    precisionAt5: rawMetrics.precision_at_k?.['5'] || 0,
    precisionAt10: rawMetrics.precision_at_k?.['10'] || 0,
    precisionAt20: rawMetrics.precision_at_k?.['20'] || 0,
    
    // Transform nested recall_at_k to camelCase with flat structure  
    recallAt5: rawMetrics.recall_at_k?.['5'] || 0,
    recallAt10: rawMetrics.recall_at_k?.['10'] || 0,
    recallAt20: rawMetrics.recall_at_k?.['20'] || 0,
    
    // Transform simple snake_case fields
    f1Score: rawMetrics.f1_score || 0,
    hitRate: rawMetrics.hit_rate || 0,
    ndcg: rawMetrics.ndcg || 0,
    
    // Keep metadata as-is
    timestamp: rawMetrics.timestamp,
    evaluationMetadata: rawMetrics.evaluation_metadata
  };

  // Preserve original raw data for debugging if needed
  transformed._raw = rawMetrics;
  
  return transformed;
}

/**
 * Transform demo prediction response from snake_case to camelCase
 */
function transformDemoUserPrediction(rawResponse: any): DemoUserPrediction {
  if (!rawResponse) throw new Error('Invalid demo prediction response');

  return {
    userId: rawResponse.user_id,
    predictedBasket: rawResponse.predicted_basket?.map((item: any) => ({
      id: item.product_id?.toString() || item.id,
      name: item.product_name || item.name,
      imageUrl: item.image_url,
      price: item.price || 0,
      category: item.category
    })) || [],
    trueFutureBasket: rawResponse.true_future_basket?.map((item: any) => ({
      id: item.product_id?.toString() || item.id,
      name: item.product_name || item.name,
      imageUrl: item.image_url,
      price: item.price || 0,
      category: item.category
    })) || [],
    comparisonMetrics: {
      predictedCount: rawResponse.comparison_metrics?.predicted_count || 0,
      actualCount: rawResponse.comparison_metrics?.actual_count || 0,
      commonItems: rawResponse.comparison_metrics?.common_items || 0
    }
  };
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DemoUserPrediction {
  userId: string;
  predictedBasket: Array<{ id: string; name: string; imageUrl?: string; price: number; category?: string; }>;
  trueFutureBasket: Array<{ id: string; name: string; imageUrl?: string; price: number; category?: string; }>;
  comparisonMetrics: { predictedCount: number; actualCount: number; commonItems: number; };
}

export interface DemoUserIds {
  message: string;
  note: string;
  feature_engineering: string;
  restriction: string;
}

export interface TransformedEvaluationMetrics {
  precisionAt5: number;
  precisionAt10: number;
  precisionAt20: number;
  recallAt5: number;
  recallAt10: number;
  recallAt20: number;
  f1Score: number;
  hitRate: number;
  ndcg: number;
  timestamp?: string;
  evaluationMetadata?: any;
  _raw?: any; // Original response for debugging
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
   * DEMAND 2: Trigger model evaluation with data transformation
   */
  async triggerModelEvaluation(): Promise<{ 
    message: string; 
    results: TransformedEvaluationMetrics; 
    timestamp: string 
  }> {
    const response = await api.post('/admin/ml/evaluate');
    
    // Transform the raw response to camelCase
    return {
      message: response.message,
      results: transformEvaluationMetrics(response.results?.metrics || response.metrics),
      timestamp: response.timestamp
    };
  }

  // ============================================================================
  // DEMO FUNCTIONALITY WITH DATA TRANSFORMATION
  // ============================================================================
  
  /**
   * Get demo user IDs - no transformation needed
   */
  async getDemoUserIds(): Promise<DemoUserIds> {
    return api.get<DemoUserIds>('/admin/demo/user-ids');
  }

  /**
   * DEMAND 3: Get live demo prediction comparison with data transformation
   */
  async getDemoUserPrediction(userId: string): Promise<DemoUserPrediction> {
    const rawResponse = await api.get(`/admin/demo/user-prediction/${userId}`);
    return transformDemoUserPrediction(rawResponse);
  }

  /**
   * DEMAND 1: Seed a new demo user into the database
   */
  async seedDemoUser(instacartUserId: string): Promise<any> {
    return api.post(`/admin/demo/seed-user/${instacartUserId}`);
  }

  // ============================================================================
  // PRODUCT MANAGEMENT (READ-ONLY)
  // ============================================================================
  
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: boolean;
    sort?: string;
    order?: string;
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

  // ============================================================================
  // USER MANAGEMENT (READ-ONLY)
  // ============================================================================
  
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    sort?: string;
    order?: string;
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

  // ============================================================================
  // ORDER MANAGEMENT (READ-ONLY)
  // ============================================================================
  
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    order?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.order) queryParams.append('order', params.order);

    return api.get(`/admin/orders?${queryParams.toString()}`);
  }

  // ============================================================================
  // LOGS & MONITORING
  // ============================================================================
  
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
  
  async createBackup(): Promise<any> {
    return api.post('/admin/backup');
  }

  async getBackupStatus(): Promise<any> {
    return api.get('/admin/backup/status');
  }

  async runMaintenance(tasks: string[]): Promise<any> {
    return api.post('/admin/maintenance', { tasks });
  }
}

export const adminService = new AdminService();
export default adminService;