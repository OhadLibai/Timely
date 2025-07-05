// frontend/src/hooks/api/useAdmin.ts
// UPDATED: Using existing services and direct API calls where needed
// CONSTRAINT: Cannot modify services in services directory

import { useQuery, useMutation, useQueryClient, UseQueryResult } from 'react-query';
import { adminService } from '@/services/admin.service';
import { metricsService } from '@/services/metrics.service';
import { api } from '@/services/api.client';
import { QUERY_CONFIGS } from '@/utils/queryConfig';

// ============================================================================
// DASHBOARD OVERVIEW HUB HOOKS
// ============================================================================

/**
 * Hook for Overview Hub Dashboard - uses existing services + direct API calls
 */
export const useDashboardOverview = (dateRange?: any) => {
  const dashboardStats = useQuery(
    ['admin-dashboard-stats', dateRange],
    () => api.get('/admin/dashboard/stats', { params: dateRange }),
    QUERY_CONFIGS.FREQUENT_DATA
  );

  const mlMetrics = useQuery(
    'admin-ml-metrics',
    () => metricsService.getModelPerformance(100),
    QUERY_CONFIGS.STABLE_DATA
  );

  const demoStats = useQuery(
    'admin-demo-stats',
    () => api.get('/admin/demo/user-ids'),
    QUERY_CONFIGS.ADMIN_DATA
  );

  return {
    dashboardStats,
    mlMetrics,
    demoStats,
    isLoading: dashboardStats.isLoading || mlMetrics.isLoading || demoStats.isLoading,
    error: dashboardStats.error || mlMetrics.error || demoStats.error
  };
};

// ============================================================================
// DEMAND 1: DEMO USER CREATION HOOKS
// ============================================================================

/**
 * Hook for demo user seeding functionality - uses existing adminService
 */
export const useDemoUserSeeding = () => {
  const queryClient = useQueryClient();

  const seedUser = useMutation(
    (instacartUserId: string) => adminService.seedDemoUser(instacartUserId),
    {
      onSuccess: () => {
        // Invalidate related queries
        queryClient.invalidateQueries('admin-demo-stats');
        queryClient.invalidateQueries('admin-dashboard-stats');
      }
    }
  );

  const demoUserStats = useQuery(
    'admin-demo-stats',
    () => api.get('/admin/demo/user-ids'),
    QUERY_CONFIGS.ADMIN_DATA
  );

  return {
    seedUser,
    demoUserStats,
    isSeeding: seedUser.isLoading,
    seedingError: seedUser.error
  };
};

// ============================================================================
// DEMAND 2: MODEL PERFORMANCE EVALUATION HOOKS
// ============================================================================

/**
 * Hook for ML model performance metrics - uses existing metricsService
 */
export const useModelPerformance = () => {
  const queryClient = useQueryClient();

  const metrics = useQuery(
    'admin-ml-metrics',
    () => metricsService.getModelPerformance(100),
    QUERY_CONFIGS.STABLE_DATA
  );

  const runEvaluation = useMutation(
    (sampleSize?: number) => metricsService.getModelPerformance(sampleSize || 100),
    {
      onSuccess: () => {
        // Invalidate metrics to refresh with new data
        queryClient.invalidateQueries('admin-ml-metrics');
      }
    }
  );

  return {
    metrics,
    runEvaluation,
    isEvaluating: runEvaluation.isLoading,
    evaluationError: runEvaluation.error
  };
};

// ============================================================================
// DEMAND 3: INDIVIDUAL USER PREDICTION HOOKS
// ============================================================================

/**
 * Hook for individual user prediction analysis - uses existing adminService
 */
export const useUserPredictionAnalysis = (userId?: string) => {
  const prediction = useQuery(
    ['admin-user-prediction', userId],
    () => adminService.getUserPredictionComparison(userId!),
    {
      enabled: !!userId,
      ...QUERY_CONFIGS.FREQUENT_DATA,
    }
  );

  return {
    prediction,
    isAnalyzing: prediction.isLoading,
    analysisError: prediction.error
  };
};

// ============================================================================
// SYSTEM STATUS HOOKS
// ============================================================================

/**
 * Hook for system health monitoring - direct API calls
 */
export const useSystemStatus = () => {
  const systemHealth = useQuery(
    'admin-system-health',
    () => api.get('/admin/system/health'),
    QUERY_CONFIGS.REALTIME
  );

  const architectureStatus = useQuery(
    'admin-architecture-status',
    () => api.get('/admin/architecture/status'),
    QUERY_CONFIGS.FREQUENT_DATA
  );

  return {
    systemHealth,
    architectureStatus,
    isHealthy: systemHealth.data?.status === 'healthy',
    isLoading: systemHealth.isLoading || architectureStatus.isLoading
  };
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for admin data views (products, users, orders) - direct API calls
 */
export const useAdminDataViews = () => {
  const getProducts = (filters?: any) => 
    useQuery(
      ['admin-products', filters],
      () => api.get('/admin/products', { params: filters }),
      { enabled: false }
    );

  const getUsers = (filters?: any) =>
    useQuery(
      ['admin-users', filters],
      () => api.get('/admin/users', { params: filters }),
      { enabled: false }
    );

  const getOrders = (filters?: any) =>
    useQuery(
      ['admin-orders', filters],
      () => api.get('/admin/orders', { params: filters }),
      { enabled: false }
    );

  return {
    getProducts,
    getUsers,
    getOrders
  };
};