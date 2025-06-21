// frontend/src/services/admin.service.ts
// UPDATED: Removed feature importance, added ML monitoring capabilities

import { api, mlApi } from './api.client';
import { Product } from './product.service';
import { Order } from './order.service';
import { User } from './auth.service';

export interface DashboardStats {
  overview: {
    totalUsers: number;
    totalOrders: number;
    totalRevenue: string;
    totalProducts: number;
  };
  recentActivity: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  mlService: {
    feature_engineering: string;
    direct_database_access: boolean;
  };
  timestamp: string;
}

// REMOVED: FeatureImportance interface (feature engineering is now black box)
// export interface FeatureImportance {
//   feature: string;
//   importance: number;
//   category: string;
// }

export interface MLServiceStatus {
  mlService: {
    status: string;
    services?: {
      model: string;
      database: string;
      prediction_service: string;
    };
    configuration?: {
      use_database: boolean;
      feature_engineering: string;
    };
  };
  database: {
    status: string;
    user_count?: number;
    order_count?: number;
    product_count?: number;
  };
  stats?: {
    mode: string;
    total_predictions: number;
    successful_predictions: number;
    success_rate: number;
  };
  timestamp: string;
}

export interface ArchitectureStatus {
  deployment_version: string;
  architecture_type: string;
  feature_engineering: string;
  database_connected: boolean;
  model_loaded: boolean;
  prediction_service: string;
  endpoints: {
    primary: string;
    legacy_fallback: string;
    demo_data: string;
    health_check: string;
  };
  features: {
    direct_database_access: boolean;
    temporal_field_storage: boolean;
    backend_data_fetching: boolean;
    feature_importance_exposure: boolean;
  };
  performance: {
    eliminated_backend_queries: boolean;
    centralized_ml_logic: boolean;
    black_box_feature_engineering: boolean;
  };
}

export interface UserManagementData {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductManagementData {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DemoUserPrediction {
  userId: string;
  predictedBasket: Array<{
    id: string;
    sku: string;
    name: string;
    imageUrl?: string;
    price: number;
    salePrice: number;
    category?: string;
    confidenceScore?: number;
  }>;
  trueFutureBasket: Array<{
    id: string;
    sku: string;
    name: string;
    imageUrl?: string;
    price: number;
    salePrice: number;
    category?: string;
  }>;
  feature_engineering: string;
  comparisonMetrics: {
    predictedCount: number;
    actualCount: number;
    commonItems: number;
  };
}

class AdminService {
  
  // ============================================================================
  // DASHBOARD & ANALYTICS
  // ============================================================================
  
  async getDashboardStats(dateRange?: { start: Date; end: Date }): Promise<DashboardStats> {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.start.toISOString());
      params.append('endDate', dateRange.end.toISOString());
    }
    
    const url = `/admin/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`;
    return api.get<DashboardStats>(url);
  }

  // ============================================================================
  // MODEL EVALUATION (BLACK BOX - NO FEATURE IMPORTANCE)
  // ============================================================================
  
  async triggerModelEvaluation(): Promise<any> {
    return api.post('/admin/evaluation');
  }

  // REMOVED: Feature importance method (feature engineering is now black box)
  // async getFeatureImportance(): Promise<FeatureImportance[]> {
  //   // DELETED - feature engineering is now black box
  // }

  // ============================================================================
  // ML SERVICE MONITORING
  // ============================================================================
  
  async getMLServiceStatus(): Promise<MLServiceStatus> {
    return api.get<MLServiceStatus>('/admin/ml-service/status');
  }

  async getArchitectureStatus(): Promise<ArchitectureStatus> {
    return api.get<ArchitectureStatus>('/admin/architecture/status');
  }

  // ============================================================================
  // DEMO PREDICTION SYSTEM
  // ============================================================================
  
  async getDemoUserIds(): Promise<{ userIds: string[]; message: string; count: number }> {
    return api.get('/admin/demo/user-ids');
  }

  async getDemoUserPrediction(userId: string): Promise<DemoUserPrediction> {
    return api.get<DemoUserPrediction>(`/admin/demo/user-prediction/${userId}`);
  }

  async seedDemoUser(instacartUserId: string): Promise<any> {
    return api.post(`/admin/demo/seed-user/${instacartUserId}`);
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================
  
  async getUsers(filters: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sort?: string;
  }): Promise<UserManagementData> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    return api.get<UserManagementData>(`/admin/users?${params.toString()}`);
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    return api.patch(`/admin/users/${userId}/status`, { status });
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    return api.patch(`/admin/users/${userId}/role`, { role });
  }

  // ============================================================================
  // PRODUCT MANAGEMENT
  // ============================================================================
  
  async getProducts(filters: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
  }): Promise<ProductManagementData> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    return api.get<ProductManagementData>(`/admin/products?${params.toString()}`);
  }

  async updateProductStatus(productId: string, isActive: boolean): Promise<void> {
    return api.patch(`/admin/products/${productId}/status`, { isActive });
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    return api.patch(`/admin/products/${productId}`, updates);
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================
  
  async getOrders(filters: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    return api.get(`/admin/orders?${params.toString()}`);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    return api.patch(`/admin/orders/${orderId}/status`, { status });
  }

  // ============================================================================
  // SYSTEM UTILITIES
  // ============================================================================
  
  async exportData(type: 'users' | 'orders' | 'products', format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await fetch(`/api/admin/export/${type}?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  }

  async getSystemHealth(): Promise<any> {
    return api.get('/admin/system/health');
  }
}

export const adminService = new AdminService();
export default adminService;