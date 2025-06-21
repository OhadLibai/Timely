// frontend/src/services/admin.service.ts
import { api, mlApi } from './api.client';
import { Product } from './product.service';
import { Order } from './order.service';
import { User } from './auth.service';

export interface DashboardStats {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    activeUsers: number;
    avgOrderValue: number;
    conversionRate: number;
    revenueGrowth: number;
    orderGrowth: number;
    userGrowth: number;
  };
  chartData: {
    salesOverTime: Array<{ date: string; revenue: number; orders: number }>;
    ordersByStatus: Array<{ name: string; value: number }>;
    topProducts: Array<{ name: string; sales: number; revenue: number }>;
    userActivity: Array<{ hour: number; active: number; orders: number }>;
    categoryDistribution: Array<{ category: string; count: number; revenue: number }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'order' | 'user' | 'prediction';
    description: string;
    timestamp: string;
    value?: string;
  }>;
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

export interface SystemHealth {
  services: {
    api: { status: 'healthy' | 'degraded' | 'down'; latency: number };
    database: { status: 'healthy' | 'degraded' | 'down'; connections: number };
    ml: { status: 'healthy' | 'degraded' | 'down'; lastPrediction: string };
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    requestsPerMinute: number;
    errorRate: number;
  };
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  reportType: 'sales' | 'users' | 'products' | 'predictions';
  format: 'pdf' | 'csv' | 'json';
}

class AdminService {
  // Dashboard
  async getDashboardStats(dateRange: { start: Date; end: Date }): Promise<DashboardStats> {
    const params = new URLSearchParams({
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString()
    });
    
    return api.get<DashboardStats>(`/admin/dashboard?${params.toString()}`);
  }

  // This is the new function we are adding
  async triggerModelEvaluation(): Promise<any> {
    // This calls the backend, which will then call the ml-service
    return api.post('/admin/evaluation');
  }

  // User Management
  async getUsers(filters: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sort?: string;
  } = {}): Promise<UserManagementData> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    return api.get<UserManagementData>(`/admin/users?${params.toString()}`);
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    return api.put<User>(`/admin/users/${userId}/status`, { isActive });
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User> {
    return api.put<User>(`/admin/users/${userId}/role`, { role });
  }

  async resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
    return api.post<{ temporaryPassword: string }>(`/admin/users/${userId}/reset-password`);
  }

  async getUserActivity(userId: string, days: number = 30): Promise<{
    orders: number;
    totalSpent: number;
    lastOrder?: string;
    favoriteCategories: string[];
    predictionAccuracy: number;
  }> {
    return api.get(`/admin/users/${userId}/activity?days=${days}`);
  }

  // Product Management
  async getProducts(filters: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
  } = {}): Promise<ProductManagementData> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    return api.get<ProductManagementData>(`/admin/products?${params.toString()}`);
  }

  async bulkUpdateProducts(updates: Array<{
    id: string;
    updates: Partial<Product>;
  }>): Promise<{ updated: number; errors: string[] }> {
    return api.post('/admin/products/bulk-update', { updates });
  }

  async importProducts(file: File): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/admin/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  async exportProducts(filters: any): Promise<Blob> {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/admin/products/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response as Blob;
  }

  // Order Management
  async getOrderAnalytics(period: 'day' | 'week' | 'month' | 'year'): Promise<{
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    topProducts: Array<{ product: Product; quantity: number; revenue: number }>;
    ordersByHour: Array<{ hour: number; count: number }>;
    ordersByDay: Array<{ day: string; count: number; revenue: number }>;
    fulfillmentRate: number;
    avgDeliveryTime: number;
  }> {
    return api.get(`/admin/orders/analytics?period=${period}`);
  }

  // Reports
  async generateReport(filters: ReportFilters): Promise<Blob> {
    const response = await api.post('/admin/reports/generate', filters, {
      responseType: 'blob'
    });
    return response as Blob;
  }

  async getScheduledReports(): Promise<Array<{
    id: string;
    name: string;
    type: string;
    schedule: string;
    recipients: string[];
    lastRun?: string;
    nextRun: string;
  }>> {
    return api.get('/admin/reports/scheduled');
  }

  async scheduleReport(data: {
    name: string;
    type: string;
    schedule: string; // cron expression
    recipients: string[];
    filters: any;
  }): Promise<{ id: string; message: string }> {
    return api.post('/admin/reports/schedule', data);
  }

  // System
  async getSystemHealth(): Promise<SystemHealth> {
    return api.get<SystemHealth>('/admin/system/health');
  }

  async getSystemLogs(filters: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    service?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<Array<{
    timestamp: string;
    level: string;
    service: string;
    message: string;
    metadata?: any;
  }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    
    return api.get(`/admin/system/logs?${params.toString()}`);
  }

  async runSystemMaintenance(type: 'cache_clear' | 'db_optimize' | 'logs_cleanup'): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    return api.post('/admin/system/maintenance', { type });
  }

  // Settings
  async getSettings(): Promise<{
    general: {
      siteName: string;
      siteUrl: string;
      contactEmail: string;
      timezone: string;
    };
    features: {
      predictionsEnabled: boolean;
      autoCartEnabled: boolean;
      reviewsEnabled: boolean;
      referralProgram: boolean;
    };
    delivery: {
      freeDeliveryThreshold: number;
      standardDeliveryFee: number;
      expressDeliveryFee: number;
      scheduledDeliveryFee: number;
    };
    ml: {
      predictionThreshold: number;
      maxPredictionsPerUser: number;
      retrainSchedule: string;
    };
  }> {
    return api.get('/admin/settings');
  }

  async updateSettings(section: string, settings: any): Promise<void> {
    return api.put(`/admin/settings/${section}`, settings);
  }

  // Metrics Export
  async exportMetrics(days: number): Promise<any> {
    return api.get(`/admin/metrics/export?days=${days}`);
  }

  // Notifications
  async sendBulkNotification(data: {
    userIds?: string[];
    segments?: string[];
    title: string;
    message: string;
    type: 'email' | 'push' | 'sms' | 'all';
  }): Promise<{ sent: number; failed: number }> {
    return api.post('/admin/notifications/send-bulk', data);
  }

  // A/B Testing
  async getExperiments(): Promise<Array<{
    id: string;
    name: string;
    status: 'draft' | 'running' | 'completed';
    variants: Array<{ name: string; allocation: number }>;
    metrics: any;
  }>> {
    return api.get('/admin/experiments');
  }

  async createExperiment(data: {
    name: string;
    description: string;
    variants: Array<{ name: string; allocation: number }>;
    metrics: string[];
    duration: number;
  }): Promise<{ id: string }> {
    return api.post('/admin/experiments', data);
  }
}

export const adminService = new AdminService();